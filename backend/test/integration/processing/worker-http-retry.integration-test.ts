import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import {
  PLATFORM_AUTH_CONTEXT_STORE,
  PlatformAuthContextStore,
} from '../../../src/modules/platform-auth/application/contracts/platform-auth-context.store.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PROCESSING_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { ServidorEnriquecimentoHttpDeTeste } from '../../support/servidor-enriquecimento-http-de-teste.js';

describe('Retry do worker com respostas HTTP', () => {
  const prefixoRunId = 'run_worker_http_retry';
  const servidor = new ServidorEnriquecimentoHttpDeTeste();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;
  let authContext: PlatformAuthContextStore;

  beforeAll(async () => {
    process.env.ENRICHMENT_MODE = 'http';
    process.env.PLATAFORMA_BASE_URL = await servidor.iniciar();
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    fila = modulo.get(getQueueToken(PROCESSING_QUEUE_NAME));
    await fila.obliterate({ force: true });
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    authContext = app.get(PLATFORM_AUTH_CONTEXT_STORE);
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({
      where: { runId: { startsWith: prefixoRunId } },
    });
    await prisma.run.deleteMany({
      where: { runId: { startsWith: prefixoRunId } },
    });
    // Remove credenciais efêmeras dos casos deste arquivo.
    for (const runId of [`${prefixoRunId}_500`, `${prefixoRunId}_429`])
      await authContext.deleteForRun(runId);
    await fila.obliterate({ force: true });
  });

  afterAll(async () => {
    await app.close();
    await servidor.encerrar();
    delete process.env.ENRICHMENT_MODE;
    delete process.env.PLATAFORMA_BASE_URL;
  });

  async function criarRun(runId: string): Promise<void> {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_http_retry',
        total: 1,
        startedAt: new Date('2026-10-06T12:00:00.000Z'),
      },
    });
    await authContext.saveForRun({
      runId,
      cid: 'cid-http-retry',
      token: 'token-http-retry',
    });
  }

  it('deve tentar novamente após HTTP 500 e obter sucesso', async () => {
    const runId = `${prefixoRunId}_500`;
    await criarRun(runId);
    servidor.responderEmSequencia('sku-http-500', [
      { status: 500 },
      {
        status: 200,
        body: { sku: 'sku-http-500', price: 59.9, stock: 5 },
      },
    ]);

    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-http-500' })
      .expect(202);

    await vi.waitFor(
      async () => {
        await expect(
          prisma.runItem.findUniqueOrThrow({
            where: { runId_seq: { runId, seq: 0 } },
          }),
        ).resolves.toEqual(
          expect.objectContaining({ status: 'SUCCESS', attempts: 2, stock: 5 }),
        );
      },
      { timeout: 5_000, interval: 25 },
    );

    expect(
      servidor.chamadas.filter(({ sku }) => sku === 'sku-http-500'),
    ).toHaveLength(2);
    const job = await fila.getJob(`${runId}-0`);
    await vi.waitFor(
      async () => {
        await expect(job?.getState()).resolves.toBe('completed');
      },
      { timeout: 2_000, interval: 25 },
    );
  });

  it('deve respeitar Retry-After após HTTP 429 e obter sucesso', async () => {
    const runId = `${prefixoRunId}_429`;
    await criarRun(runId);
    servidor.responderEmSequencia('sku-http-429', [
      { status: 429, retryAfter: 0.1 },
      {
        status: 200,
        body: { sku: 'sku-http-429', price: 69.9, stock: 6 },
      },
    ]);

    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-http-429' })
      .expect(202);

    await vi.waitFor(
      async () => {
        await expect(
          prisma.runItem.findUniqueOrThrow({
            where: { runId_seq: { runId, seq: 0 } },
          }),
        ).resolves.toEqual(
          expect.objectContaining({ status: 'SUCCESS', attempts: 2, stock: 6 }),
        );
      },
      { timeout: 4_000, interval: 25 },
    );

    const chamadas = servidor.chamadas.filter(
      ({ sku }) => sku === 'sku-http-429',
    );
    expect(chamadas).toHaveLength(2);
    expect(chamadas[1].instante - chamadas[0].instante).toBeGreaterThanOrEqual(
      80,
    );
  });
});
