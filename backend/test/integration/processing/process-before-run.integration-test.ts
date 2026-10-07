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
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PENDING_RUN_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/pending-run-queue.constants.js';
import { PROCESSING_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';

describe('Corrida entre burst e process', () => {
  const runId = 'run_process_before_run';
  const item = { runId, seq: 1, sku: 'sku-race' };
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let filaDeEspera: Queue<PendingRunInput>;
  let filaDeProcessamento: Queue<ProcessItemInput>;
  let cliente: FakeEnrichmentClient;

  beforeAll(async () => {
    cliente = new FakeEnrichmentClient();
    cliente.responderCom(item.sku, {
      sku: item.sku,
      price: 49.9,
      stock: 7,
    });
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ENRICHMENT_CLIENT)
      .useValue(cliente)
      .compile();

    filaDeEspera = modulo.get(getQueueToken(PENDING_RUN_QUEUE_NAME));
    filaDeProcessamento = modulo.get(getQueueToken(PROCESSING_QUEUE_NAME));
    await filaDeEspera.obliterate({ force: true });
    await filaDeProcessamento.obliterate({ force: true });
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    cliente.chamadas.length = 0;
    cliente.instantesDasChamadas.length = 0;
    await prisma.runItem.deleteMany({ where: { runId } });
    await prisma.run.deleteMany({ where: { runId } });
    await filaDeEspera.obliterate({ force: true });
    await filaDeProcessamento.obliterate({ force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve aguardar a run e depois concluir o processamento normalmente', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: item.runId, seq: item.seq, sku: item.sku })
      .expect(202)
      .expect({ status: 'accepted' });

    await expect(
      prisma.runItem.findUnique({
        where: { runId_seq: { runId, seq: item.seq } },
      }),
    ).resolves.toBeNull();

    const jobAguardando = await filaDeEspera.getJob(
      `wait-${runId}-${item.seq}`,
    );
    expect(jobAguardando).toBeDefined();
    await expect(jobAguardando?.getState()).resolves.toMatch(
      /waiting|active|delayed/,
    );

    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_race_test',
        total: 1,
        startedAt: new Date('2026-10-07T12:00:00.000Z'),
      },
    });

    await vi.waitFor(
      async () => {
        const persistido = await prisma.runItem.findUnique({
          where: { runId_seq: { runId, seq: item.seq } },
        });
        expect(persistido).toEqual(
          expect.objectContaining({
            runId,
            seq: item.seq,
            status: 'SUCCESS',
            attempts: 1,
          }),
        );
      },
      { timeout: 8_000, interval: 50 },
    );

    expect(cliente.chamadas).toHaveLength(1);
    await expect(
      (await filaDeEspera.getJob(`wait-${runId}-${item.seq}`))?.getState(),
    ).resolves.toBe('completed');
    await expect(
      (await filaDeProcessamento.getJob(`${runId}-${item.seq}`))?.getState(),
    ).resolves.toBe('completed');
  });

  it('deve enfileirar no processing um item PENDING já existente quando a run aparece', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: item.runId, seq: item.seq, sku: item.sku })
      .expect(202);

    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_race_test',
        total: 1,
        startedAt: new Date('2026-10-07T12:00:00.000Z'),
        items: { create: { seq: item.seq, sku: item.sku } },
      },
    });

    await vi.waitFor(
      async () => {
        const persistido = await prisma.runItem.findUnique({
          where: { runId_seq: { runId, seq: item.seq } },
        });
        expect(persistido).toEqual(
          expect.objectContaining({ status: 'SUCCESS', attempts: 1 }),
        );
      },
      { timeout: 8_000, interval: 50 },
    );

    await expect(prisma.runItem.count({ where: { runId } })).resolves.toBe(1);
    expect(cliente.chamadas).toHaveLength(1);
    await expect(
      (await filaDeProcessamento.getJob(`${runId}-${item.seq}`))?.getState(),
    ).resolves.toBe('completed');
  });
});
