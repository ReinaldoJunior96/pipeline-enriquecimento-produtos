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

describe('Fluxo integrado com cliente HTTP de enriquecimento', () => {
  const runId = 'run_worker_http_success';
  const servidor = new ServidorEnriquecimentoHttpDeTeste();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;
  let authContext: PlatformAuthContextStore;

  beforeAll(async () => {
    const baseUrl = await servidor.iniciar();
    servidor.responderEmSequencia('sku-real-test', [
      {
        status: 200,
        body: { sku: 'sku-real-test', price: 149.9, stock: 7 },
      },
    ]);
    process.env.ENRICHMENT_MODE = 'http';
    process.env.PLATAFORMA_BASE_URL = baseUrl;

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

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_http_success',
        total: 1,
        startedAt: new Date('2026-10-06T12:00:00.000Z'),
      },
    });
    await authContext.saveForRun({
      runId,
      cid: 'cid-http-test',
      token: 'token-http-test',
    });
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({ where: { runId } });
    await authContext.deleteForRun(runId);
    await prisma.run.deleteMany({ where: { runId } });
    await fila.obliterate({ force: true });
  });

  afterAll(async () => {
    await app.close();
    await servidor.encerrar();
    delete process.env.ENRICHMENT_MODE;
    delete process.env.PLATAFORMA_BASE_URL;
  });

  it('deve persistir o resultado retornado pelo servidor HTTP', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-real-test' })
      .expect(202);

    await vi.waitFor(
      async () => {
        const item = await prisma.runItem.findUnique({
          where: { runId_seq: { runId, seq: 0 } },
        });
        expect(item).toEqual(
          expect.objectContaining({
            status: 'SUCCESS',
            attempts: 1,
            stock: 7,
          }),
        );
        expect(item?.price?.toNumber()).toBe(149.9);
      },
      { timeout: 5_000, interval: 25 },
    );

    expect(servidor.chamadas).toEqual([
      {
        sku: 'sku-real-test',
        cid: 'cid-http-test',
        token: 'token-http-test',
        instante: expect.any(Number),
      },
    ]);
    const job = await fila.getJob(`${runId}-0`);
    await expect(job?.getState()).resolves.toBe('completed');
  });
});
