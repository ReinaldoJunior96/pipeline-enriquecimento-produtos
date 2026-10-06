import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PROCESSING_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { ProcessingWorker } from '../../../src/modules/processing/infrastructure/workers/processing.worker.js';

describe('Idempotência entre PostgreSQL e BullMQ', () => {
  const runId = 'run_queue_duplicate';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ProcessingWorker)
      .useValue({})
      .compile();
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    fila = app.get(getQueueToken(PROCESSING_QUEUE_NAME));
  });

  beforeEach(async () => {
    await fila.obliterate({ force: true });
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_queue_duplicate',
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

  it('deve criar uma linha e um job para duas chamadas simultâneas iguais', async () => {
    const item = { runId, seq: 5, sku: 'sku-005' };
    const payload = { run_id: item.runId, seq: item.seq, sku: item.sku };

    const respostas = await Promise.all([
      request(app.getHttpServer()).post('/process').send(payload),
      request(app.getHttpServer()).post('/process').send(payload),
    ]);

    expect(respostas).toEqual([
      expect.objectContaining({ status: 202, body: { status: 'accepted' } }),
      expect.objectContaining({ status: 202, body: { status: 'accepted' } }),
    ]);
    await expect(
      prisma.runItem.count({ where: { runId, seq: item.seq } }),
    ).resolves.toBe(1);

    const jobs = await fila.getJobs(['waiting']);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual(
      expect.objectContaining({
        id: 'run_queue_duplicate-5',
        name: 'process-item',
        data: item,
      }),
    );
  });
});
