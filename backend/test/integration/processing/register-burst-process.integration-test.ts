import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { AddressInfo } from 'node:net';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { ENRICHMENT_CLIENT } from '../../../src/modules/processing/application/contracts/enrichment.client.js';
import { CREDENCIAIS_LOTE_STORE, CredenciaisLoteStore } from '../../../src/modules/runs/application/contracts/credenciais-lote.store.js';
import { PendingRunInput } from '../../../src/modules/processing/application/queues/pending-run.queue.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PENDING_RUN_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/pending-run-queue.constants.js';
import { PROCESSING_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';

describe('Fluxo register, burst e process', () => {
  const cid = 'cid_fluxo_fake';
  const token = 'token_fluxo_fake';
  const sku = 'sku-fluxo-fake';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let credenciaisPorRun: CredenciaisLoteStore;
  let clienteEnrich: FakeEnrichmentClient;
  let filaDeEspera: Queue<PendingRunInput>;
  let filaDeProcessamento: Queue<ProcessItemInput>;
  let servidorExterno: Server;
  let baseUrlExterna: string;
  let runIdAtiva: string;
  let dispararProcessDuranteBurst = false;
  let statusProcessDuranteBurst: number | undefined;
  let urlBaseAnterior: string | undefined;
  let urlRegisterAnterior: string | undefined;

  function responderJson(
    resposta: ServerResponse<IncomingMessage>,
    status: number,
    corpo: unknown,
  ) {
    resposta.writeHead(status, { 'content-type': 'application/json' });
    resposta.end(JSON.stringify(corpo));
  }

  beforeAll(async () => {
    servidorExterno = createServer((requisicao, resposta) => {
      void (async () => {
        if (requisicao.method === 'POST' && requisicao.url === '/register') {
          responderJson(resposta, 200, { cid, token });
          return;
        }

        if (requisicao.method === 'POST' && requisicao.url === `/burst/${cid}`) {
          if (dispararProcessDuranteBurst) {
            const recebido = await request(app.getHttpServer())
              .post('/process')
              .send({ run_id: runIdAtiva, seq: 0, sku });
            statusProcessDuranteBurst = recebido.status;
          }

          responderJson(resposta, 200, {
            run_id: runIdAtiva,
            cid,
            total: 1,
            started_at: '2026-10-07T13:20:54.872Z',
          });
          return;
        }

        responderJson(resposta, 404, { message: 'Não encontrado' });
      })();
    });

    await new Promise<void>((resolve) =>
      servidorExterno.listen(0, '127.0.0.1', resolve),
    );
    const endereco = servidorExterno.address() as AddressInfo;
    baseUrlExterna = `http://127.0.0.1:${endereco.port}`;

    urlBaseAnterior = process.env.PLATAFORMA_BASE_URL;
    urlRegisterAnterior = process.env.PLATAFORMA_REGISTER_URL;
    process.env.PLATAFORMA_BASE_URL = baseUrlExterna;
    process.env.PLATAFORMA_REGISTER_URL = `${baseUrlExterna}/register`;

    clienteEnrich = new FakeEnrichmentClient();
    clienteEnrich.responderCom(sku, { sku, price: 49.9, stock: 7 });
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENRICHMENT_CLIENT)
      .useValue(clienteEnrich)
      .compile();

    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    credenciaisPorRun = app.get(CREDENCIAIS_LOTE_STORE);
    filaDeEspera = app.get(getQueueToken(PENDING_RUN_QUEUE_NAME));
    filaDeProcessamento = app.get(getQueueToken(PROCESSING_QUEUE_NAME));
    await filaDeEspera.obliterate({ force: true });
    await filaDeProcessamento.obliterate({ force: true });
  });

  beforeEach(async () => {
    runIdAtiva = `run_swagger_flow_${crypto.randomUUID()}`;
    dispararProcessDuranteBurst = false;
    statusProcessDuranteBurst = undefined;
    clienteEnrich.chamadas.length = 0;
    clienteEnrich.instantesDasChamadas.length = 0;
    await filaDeEspera.obliterate({ force: true });
    await filaDeProcessamento.obliterate({ force: true });
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({ where: { runId: runIdAtiva } });
    await prisma.run.deleteMany({ where: { runId: runIdAtiva } });
    await filaDeEspera.obliterate({ force: true });
    await filaDeProcessamento.obliterate({ force: true });
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve, reject) =>
      servidorExterno.close((erro) => (erro ? reject(erro) : resolve())),
    );
    if (urlBaseAnterior === undefined) delete process.env.PLATAFORMA_BASE_URL;
    else process.env.PLATAFORMA_BASE_URL = urlBaseAnterior;
    if (urlRegisterAnterior === undefined)
      delete process.env.PLATAFORMA_REGISTER_URL;
    else process.env.PLATAFORMA_REGISTER_URL = urlRegisterAnterior;
  });

  async function registrar() {
    const registro = await request(app.getHttpServer())
      .post('/platform/register')
      .send({ name: 'Pessoa de Teste', webhook: 'https://webhook.example.test' })
      .expect(200);

    expect(registro.body).toEqual({ cid, token });

    return registro.body as { cid: string; token: string };
  }

  it('deve registrar, criar a run, receber process e enriquecer o item', async () => {
    const credenciais = await registrar();
    await request(app.getHttpServer())
      .post('/runs/burst')
      .send(credenciais)
      .expect(201)
      .expect({
        run_id: runIdAtiva,
        cid,
        total: 1,
        started_at: '2026-10-07T13:20:54.872Z',
      });

    await expect(
      prisma.run.findUnique({ where: { runId: runIdAtiva } }),
    ).resolves.toEqual(
      expect.objectContaining({ runId: runIdAtiva, cid, total: 1 }),
    );

    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runIdAtiva, seq: 0, sku })
      .expect(202)
      .expect({ status: 'accepted' });

    expect(credenciaisPorRun.obter(runIdAtiva)).toEqual({ cid, token });

    await vi.waitFor(
      async () => {
        const item = await prisma.runItem.findUnique({
          where: { runId_seq: { runId: runIdAtiva, seq: 0 } },
        });
        expect(item).toEqual(
          expect.objectContaining({ status: 'SUCCESS', attempts: 1 }),
        );
      },
      { timeout: 5_000, interval: 50 },
    );

    expect(clienteEnrich.chamadas).toHaveLength(1);
  });

  it('deve segurar process recebido antes da persistência durante burst', async () => {
    dispararProcessDuranteBurst = true;

    const credenciais = await registrar();
    await request(app.getHttpServer())
      .post('/runs/burst')
      .send(credenciais)
      .expect(201)
      .expect({
        run_id: runIdAtiva,
        cid,
        total: 1,
        started_at: '2026-10-07T13:20:54.872Z',
      });

    expect(statusProcessDuranteBurst).toBe(202);
    expect(credenciaisPorRun.obter(runIdAtiva)).toEqual({ cid, token });
    await vi.waitFor(
      async () => {
        const item = await prisma.runItem.findUnique({
          where: { runId_seq: { runId: runIdAtiva, seq: 0 } },
        });
        expect(item).toEqual(
          expect.objectContaining({ status: 'SUCCESS', attempts: 1 }),
        );
      },
      { timeout: 5_000, interval: 50 },
    );

    expect(clienteEnrich.chamadas).toHaveLength(1);
    await expect(
      (
        await filaDeEspera.getJob(`wait-${runIdAtiva}-0`)
      )?.getState(),
    ).resolves.toBe('completed');
    await expect(
      (await filaDeProcessamento.getJob(`${runIdAtiva}-0`))?.getState(),
    ).resolves.toBe('completed');
  });
});
