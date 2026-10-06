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

describe('Fluxo do endpoint process com BullMQ', () => {
  const runId = 'run_queue_flow';
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
        cid: 'cid_queue_flow',
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

  it('deve persistir o item e manter o job aguardando no BullMQ', async () => {
    const item = { runId, seq: 0, sku: 'sku-001' };

    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: item.runId, seq: item.seq, sku: item.sku })
      .expect(202)
      .expect({ status: 'accepted' });

    await expect(
      prisma.runItem.findUnique({
        where: { runId_seq: { runId, seq: item.seq } },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        runId,
        seq: 0,
        sku: 'sku-001',
        status: 'PENDING',
      }),
    );

    const jobs = await fila.getJobs(['waiting']);

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual(
      expect.objectContaining({
        id: 'run_queue_flow-0',
        name: 'process-item',
        data: item,
      }),
    );
  });
});
