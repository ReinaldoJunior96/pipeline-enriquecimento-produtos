import { Queue } from 'bullmq';
import { AddressInfo } from 'node:net';
import {
  createServer,
  IncomingMessage,
  Server,
  ServerResponse,
} from 'node:http';
import { RedisConnection } from 'bullmq';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { RedisPlatformAuthContextStore } from '../../../src/infrastructure/platform-credentials/redis-platform-auth-context.store.js';
import { PrismaProcessItemRepository } from '../../../src/modules/processing/infrastructure/repositories/prisma-process-item.repository.js';
import { PrismaRunRepository } from '../../../src/modules/runs/infrastructure/repositories/prisma-run.repository.js';
import { EnrichmentNotFoundError } from '../../../src/modules/processing/domain/errors/enrichment.errors.js';
import { ProcessarItemUseCase } from '../../../src/modules/processing/application/use-cases/processar-item.use-case.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';
import { BullMqCallbackQueue } from '../../../src/modules/callback/infrastructure/queues/bullmq-callback.queue.js';
import { ConsolidarResultadoRunUseCase } from '../../../src/modules/callback/application/use-cases/consolidar-resultado-run.use-case.js';
import { EnviarCallbackRunUseCase } from '../../../src/modules/callback/application/use-cases/enviar-callback-run.use-case.js';
import { HttpCallbackClient } from '../../../src/modules/callback/infrastructure/clients/http-callback.client.js';

describe('Fluxo integrado de conclusão e callback', () => {
  const token = 'token-do-callback-apenas-redis';
  const cid = 'cid-callback-integracao';
  let prisma: PrismaService;
  let runs: PrismaRunRepository;
  let items: PrismaProcessItemRepository;
  let redisConnection: RedisConnection;
  let authStore: RedisPlatformAuthContextStore;
  let queue: Queue<{ runId: string }>;
  let callbackQueue: BullMqCallbackQueue;
  let servidor: Server;
  let callbackBaseUrl: string;
  let callbackRequests: Array<{ token?: string; body: unknown }>;
  let runId: string;
  let callbackServerStatus = 204;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    runs = new PrismaRunRepository(prisma);
    items = new PrismaProcessItemRepository(prisma);
    redisConnection = new RedisConnection({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });
    authStore = new RedisPlatformAuthContextStore(redisConnection.client, 1800);
    queue = new Queue(`callback-integration-${crypto.randomUUID()}`, {
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 100 },
      },
    });
    await queue.waitUntilReady();
    callbackQueue = new BullMqCallbackQueue(queue);
    servidor = createServer((req, res) => void responderCallback(req, res));
    await new Promise<void>((resolve) =>
      servidor.listen(0, '127.0.0.1', resolve),
    );
    callbackBaseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await queue.close();
    await redisConnection.close();
    await prisma.$disconnect();
    await new Promise<void>((resolve, reject) =>
      servidor.close((erro) => (erro ? reject(erro) : resolve())),
    );
  });

  beforeEach(async () => {
    runId = `run_callback_integration_${crypto.randomUUID()}`;
    callbackRequests = [];
    callbackServerStatus = 204;
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({ where: { runId } });
    await prisma.run.deleteMany({ where: { runId } });
    await authStore.deleteForRun(runId);
    await queue.obliterate({ force: true });
  });

  async function responderCallback(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const partes: Buffer[] = [];
    for await (const parte of req) partes.push(Buffer.from(parte));
    callbackRequests.push({
      token: req.headers['x-token'],
      body: JSON.parse(Buffer.concat(partes).toString('utf8')),
    });
    res.writeHead(callbackServerStatus);
    res.end();
  }

  async function iniciarRun(total: number): Promise<void> {
    await runs.create({
      runId,
      cid,
      total,
      startedAt: new Date('2026-10-07T12:00:00.000Z'),
    });
    await authStore.saveForRun({ runId, cid, token });
  }

  function criarEnviarCallback(): EnviarCallbackRunUseCase {
    return new EnviarCallbackRunUseCase(
      runs,
      new ConsolidarResultadoRunUseCase(runs, items),
      authStore,
      new HttpCallbackClient({ baseUrl: callbackBaseUrl }),
    );
  }

  it('deve processar 20 SUCCESS, enviar um callback ordenado e remover a auth', async () => {
    const total = 20;
    await iniciarRun(total);
    const enrichment = new FakeEnrichmentClient();
    const processar = new ProcessarItemUseCase(
      items,
      enrichment,
      callbackQueue,
    );

    for (let seq = 0; seq < total; seq += 1) {
      const sku = `sku-${seq}`;
      await items.registerIfNew({ runId, seq, sku });
      enrichment.responderCom(sku, { sku, price: seq + 0.25, stock: seq });
    }
    await Promise.all(
      Array.from({ length: total }, (_, seq) =>
        processar.execute({ runId, seq, sku: `sku-${seq}` }),
      ),
    );

    const runAposItens = await runs.findById(runId);
    expect(runAposItens?.finishedCount).toBe(total);
    const finalizacoes = await Promise.all(
      Array.from({ length: total }, async (_, seq) =>
        prisma.runItem.findUniqueOrThrow({
          where: { runId_seq: { runId, seq } },
          select: { status: true },
        }),
      ),
    );
    expect(finalizacoes.every((item) => item.status === 'SUCCESS')).toBe(true);
    const jobs = await queue.getJobs(['waiting']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].data).toEqual({ runId });
    expect(JSON.stringify(jobs[0].data)).not.toContain(token);
    expect(JSON.stringify(jobs[0].data)).not.toContain(cid);

    await criarEnviarCallback().execute(runId);

    const runFinal = await runs.findById(runId);
    expect(runFinal).toEqual(
      expect.objectContaining({
        status: 'COMPLETED',
        finishedCount: 20,
        callbackSent: true,
      }),
    );
    expect(callbackRequests).toHaveLength(1);
    expect(callbackRequests[0]).toEqual({
      token,
      body: {
        cid,
        run_id: runId,
        result: Array.from({ length: total }, (_, seq) => ({
          seq,
          sku: `sku-${seq}`,
          price: seq + 0.25,
          stock: seq,
        })),
      },
    });
    await expect(authStore.getForRun(runId)).resolves.toBeNull();
  });

  it('deve enviar SUCCESS mesmo quando outro item terminou ERROR', async () => {
    await iniciarRun(3);
    const enrichment = new FakeEnrichmentClient();
    const processar = new ProcessarItemUseCase(
      items,
      enrichment,
      callbackQueue,
    );
    const skus = ['sku-0', 'sku-1', 'sku-2'];
    for (let seq = 0; seq < skus.length; seq += 1) {
      await items.registerIfNew({ runId, seq, sku: skus[seq] });
    }
    enrichment.responderCom(skus[0], {
      sku: skus[0],
      price: 10,
      stock: 1,
    });
    enrichment.falharCom(skus[1], new EnrichmentNotFoundError());
    enrichment.responderCom(skus[2], {
      sku: skus[2],
      price: 30,
      stock: 3,
    });

    await Promise.all(
      skus.map((sku, seq) => processar.execute({ runId, seq, sku })),
    );
    const job = await queue.getJob(`callback-${runId}`);
    expect(job?.data).toEqual({ runId });

    await criarEnviarCallback().execute(runId);

    expect(callbackRequests).toEqual([
      {
        token,
        body: {
          cid,
          run_id: runId,
          result: [
            { seq: 0, sku: skus[0], price: 10, stock: 1 },
            { seq: 2, sku: skus[2], price: 30, stock: 3 },
          ],
        },
      },
    ]);
    await expect(runs.findById(runId)).resolves.toEqual(
      expect.objectContaining({ finishedCount: 3, callbackSent: true }),
    );
  });
});
