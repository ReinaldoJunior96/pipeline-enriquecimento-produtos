import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { ENRICHMENT_CLIENT } from '../../../src/modules/processing/application/contracts/enrichment.client.js';
import {
  EnrichmentRateLimitError,
  EnrichmentTransientError,
} from '../../../src/modules/processing/domain/errors/enrichment.errors.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PROCESSING_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';

describe('Erro transitório no worker de enriquecimento', () => {
  const runId = 'run_worker_transient';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    const cliente = new FakeEnrichmentClient();
    cliente.falharCom(
      'sku-error-500',
      new EnrichmentTransientError('Serviço de enriquecimento indisponível'),
    );
    cliente.falharCom('sku-rate-limit', new EnrichmentRateLimitError(2));
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENRICHMENT_CLIENT)
      .useValue(cliente)
      .compile();

    fila = modulo.get(getQueueToken(PROCESSING_QUEUE_NAME));
    await fila.obliterate({ force: true });
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_transient',
        total: 1,
        startedAt: new Date('2026-10-06T12:00:00.000Z'),
      },
    });
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({ where: { runId } });
    await prisma.run.deleteMany({ where: { runId } });
    await fila.obliterate({ force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve propagar erro 500 sem marcar o item como erro definitivo', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-error-500' })
      .expect(202);

    await vi.waitFor(
      async () => {
        const job = await fila.getJob(`${runId}-0`);
        await expect(job?.getState()).resolves.toBe('failed');
      },
      { timeout: 5_000, interval: 50 },
    );

    await expect(
      prisma.runItem.findUniqueOrThrow({
        where: { runId_seq: { runId, seq: 0 } },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'PROCESSING',
        attempts: 1,
        price: null,
        stock: null,
        errorCode: null,
        errorMessage: null,
      }),
    );
  });

  it('deve propagar rate limit preservando a informação de Retry-After', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 1, sku: 'sku-rate-limit' })
      .expect(202);

    let falha = '';
    await vi.waitFor(
      async () => {
        const job = await fila.getJob(`${runId}-1`);
        await expect(job?.getState()).resolves.toBe('failed');
        falha = job?.failedReason ?? '';
      },
      { timeout: 5_000, interval: 50 },
    );

    expect(falha).toContain('2 segundos');
    await expect(
      prisma.runItem.findUniqueOrThrow({
        where: { runId_seq: { runId, seq: 1 } },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'PROCESSING',
        attempts: 1,
        errorCode: null,
        errorMessage: null,
      }),
    );
  });
});
