import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { ENRICHMENT_CLIENT } from '../../../src/modules/processing/application/contracts/enrichment.client.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PROCESSING_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';

describe('Enriquecimento bem-sucedido pelo worker', () => {
  const runId = 'run_worker_success';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    const cliente = new FakeEnrichmentClient();
    cliente.responderCom('sku-success', {
      sku: 'sku-success',
      price: 99.9,
      stock: 12,
    });
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
        cid: 'cid_worker_success',
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

  it('deve consumir o job e persistir o resultado no item', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-success' })
      .expect(202)
      .expect({ status: 'accepted' });

    await vi.waitFor(
      async () => {
        const item = await prisma.runItem.findUnique({
          where: { runId_seq: { runId, seq: 0 } },
        });
        expect(item).toEqual(
          expect.objectContaining({
            status: 'SUCCESS',
            attempts: 1,
            stock: 12,
            errorCode: null,
            errorMessage: null,
          }),
        );
        expect(item?.price?.toNumber()).toBe(99.9);
      },
      { timeout: 5_000, interval: 50 },
    );

    const job = await fila.getJob(`${runId}-0`);
    await vi.waitFor(
      async () => {
        await expect(job?.getState()).resolves.toBe('completed');
      },
      { timeout: 2_000, interval: 25 },
    );
  });
});
