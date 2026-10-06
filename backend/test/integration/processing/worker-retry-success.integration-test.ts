import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { EnrichmentTransientError } from '../../../src/modules/processing/domain/errors/enrichment.errors.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';
import { criarAplicacaoWorkerDeTeste } from '../../support/criar-aplicacao-worker-de-teste.js';

describe('Retry de erro transitório', () => {
  const runId = 'run_worker_retry_success';
  const cliente = new FakeEnrichmentClient();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    cliente.responderEmSequencia('sku-retry-success', [
      new EnrichmentTransientError(),
      new EnrichmentTransientError(),
      { sku: 'sku-retry-success', price: 49.9, stock: 7 },
    ]);
    ({ app, prisma, fila } = await criarAplicacaoWorkerDeTeste(cliente));
  });

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_retry_success',
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

  it('deve aplicar backoff e obter sucesso na terceira tentativa', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-retry-success' })
      .expect(202);

    await vi.waitFor(
      async () => {
        const item = await prisma.runItem.findUnique({
          where: { runId_seq: { runId, seq: 0 } },
        });
        expect(item).toEqual(
          expect.objectContaining({
            status: 'SUCCESS',
            attempts: 3,
            stock: 7,
          }),
        );
        expect(item?.price?.toNumber()).toBe(49.9);
      },
      { timeout: 8_000, interval: 50 },
    );

    expect(cliente.instantesDasChamadas).toHaveLength(3);
    expect(
      cliente.instantesDasChamadas[1] - cliente.instantesDasChamadas[0],
    ).toBeGreaterThanOrEqual(400);
    expect(
      cliente.instantesDasChamadas[2] - cliente.instantesDasChamadas[1],
    ).toBeGreaterThanOrEqual(900);
    const job = await fila.getJob(`${runId}-0`);
    await expect(job?.getState()).resolves.toBe('completed');
  });
});
