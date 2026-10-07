import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { ENRICHMENT_CLIENT } from '../../../src/modules/processing/application/contracts/enrichment.client.js';
import { PendingRunInput } from '../../../src/modules/processing/application/queues/pending-run.queue.js';
import { PENDING_RUN_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/pending-run-queue.constants.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';

describe('Esgotamento da espera pelo lote', () => {
  const runId = 'run_pending_esgotado';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<PendingRunInput>;
  let cliente: FakeEnrichmentClient;

  beforeAll(async () => {
    cliente = new FakeEnrichmentClient();
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENRICHMENT_CLIENT)
      .useValue(cliente)
      .compile();
    fila = modulo.get(getQueueToken(PENDING_RUN_QUEUE_NAME));
    await fila.obliterate({ force: true });
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({ where: { runId } });
    await prisma.run.deleteMany({ where: { runId } });
    await fila.obliterate({ force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve falhar após as tentativas sem criar item ou chamar enrich', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 1, sku: 'sku-sem-lote' })
      .expect(202)
      .expect({ status: 'accepted' });

    await vi.waitFor(
      async () => {
        const job = await fila.getJob(`wait-${runId}-1`);
        await expect(job?.getState()).resolves.toBe('failed');
        expect(job?.attemptsMade).toBe(10);
      },
      { timeout: 12_000, interval: 100 },
    );

    await expect(
      prisma.runItem.findUnique({
        where: { runId_seq: { runId, seq: 1 } },
      }),
    ).resolves.toBeNull();
    expect(cliente.chamadas).toHaveLength(0);
  });
});
