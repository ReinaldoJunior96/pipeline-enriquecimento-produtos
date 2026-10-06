import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { ENRICHMENT_CLIENT } from '../../../src/modules/processing/application/contracts/enrichment.client.js';
import { EnrichmentUnauthorizedError } from '../../../src/modules/processing/domain/errors/enrichment.errors.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PROCESSING_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';

describe('Erro definitivo no worker de enriquecimento', () => {
  const runId = 'run_worker_definitive';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    const cliente = new FakeEnrichmentClient();
    cliente.falharCom('sku-unauthorized', new EnrichmentUnauthorizedError());
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
        cid: 'cid_worker_definitive',
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

  it('deve marcar ERROR para credencial inválida', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-unauthorized' })
      .expect(202);

    await vi.waitFor(
      async () => {
        const item = await prisma.runItem.findUnique({
          where: { runId_seq: { runId, seq: 0 } },
        });
        expect(item).toEqual(
          expect.objectContaining({
            status: 'ERROR',
            attempts: 1,
            price: null,
            stock: null,
            errorCode: 'UNAUTHORIZED',
            errorMessage: 'Credencial inválida para enriquecimento',
          }),
        );
      },
      { timeout: 5_000, interval: 50 },
    );

    const job = await fila.getJob(`${runId}-0`);
    await expect(job?.getState()).resolves.toBe('completed');
  });
});
