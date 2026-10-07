import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { PendingRunInput } from '../../../src/modules/processing/application/queues/pending-run.queue.js';
import { PENDING_RUN_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/pending-run-queue.constants.js';
import { PendingRunWorker } from '../../../src/modules/processing/infrastructure/workers/pending-run.worker.js';
import { ProcessingWorker } from '../../../src/modules/processing/infrastructure/workers/processing.worker.js';

describe('Idempotência da espera pelo lote', () => {
  const runId = 'run_pending_idempotencia';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<PendingRunInput>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PendingRunWorker)
      .useValue({})
      .overrideProvider(ProcessingWorker)
      .useValue({})
      .compile();
    fila = modulo.get(getQueueToken(PENDING_RUN_QUEUE_NAME));
    await fila.obliterate({ force: true });
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.runItem.deleteMany({ where: { runId } });
    await prisma.run.deleteMany({ where: { runId } });
    await fila.obliterate({ force: true });
    await app.close();
  });

  it('deve manter somente um job para duas entregas iguais', async () => {
    const payload = { run_id: runId, seq: 1, sku: 'sku-001' };

    await request(app.getHttpServer())
      .post('/process')
      .send(payload)
      .expect(202);
    await request(app.getHttpServer())
      .post('/process')
      .send(payload)
      .expect(202);

    const jobs = await fila.getJobs(['waiting', 'active', 'delayed']);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual(
      expect.objectContaining({
        id: `wait-${runId}-1`,
        name: 'wait-for-run',
        data: { runId, seq: 1, sku: 'sku-001' },
      }),
    );
    await expect(
      prisma.runItem.findUnique({
        where: { runId_seq: { runId, seq: 1 } },
      }),
    ).resolves.toBeNull();
  });
});
