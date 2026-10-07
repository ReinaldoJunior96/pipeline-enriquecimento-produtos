import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../../src/app.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { PROCESSING_QUEUE } from '../../../src/modules/processing/application/queues/processing.queue.js';
import { FakeProcessingQueue } from '../../fakes/fake-processing.queue.js';

describe('Persistência do endpoint process', () => {
  const runId = 'run_process_persistencia';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: FakeProcessingQueue;

  beforeAll(async () => {
    fila = new FakeProcessingQueue();
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PROCESSING_QUEUE)
      .useValue(fila)
      .compile();

    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_process_persistencia',
        total: 1,
        startedAt: new Date('2026-10-06T12:00:00.000Z'),
      },
    });
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({ where: { runId } });
    await prisma.run.deleteMany({ where: { runId } });
    fila.itens.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve persistir uma ocorrência e manter um único job idempotente', async () => {
    const payload = { run_id: runId, seq: 0, sku: 'sku-001' };

    await request(app.getHttpServer())
      .post('/process')
      .send(payload)
      .expect(202)
      .expect({ status: 'accepted' });
    await request(app.getHttpServer())
      .post('/process')
      .send(payload)
      .expect(202)
      .expect({ status: 'accepted' });

    await expect(
      prisma.runItem.findMany({ where: { runId, seq: 0 } }),
    ).resolves.toEqual([
      expect.objectContaining({
        runId,
        seq: 0,
        sku: 'sku-001',
        status: 'PENDING',
      }),
    ]);
    expect(fila.itens).toEqual([{ runId, seq: 0, sku: 'sku-001' }]);
  });
});
