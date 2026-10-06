import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { EnrichmentRateLimitError } from '../../../src/modules/processing/domain/errors/enrichment.errors.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';
import { criarAplicacaoWorkerDeTeste } from '../../support/criar-aplicacao-worker-de-teste.js';

describe('Retry-After no rate limit', () => {
  const runId = 'run_worker_rate_limit';
  const cliente = new FakeEnrichmentClient();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    cliente.responderEmSequencia('sku-rate-limit-retry', [
      new EnrichmentRateLimitError(0.1),
      { sku: 'sku-rate-limit-retry', price: 29.9, stock: 4 },
    ]);
    ({ app, prisma, fila } = await criarAplicacaoWorkerDeTeste(cliente));
  });

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_rate_limit',
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

  it('deve reagendar conforme Retry-After e obter sucesso', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-rate-limit-retry' })
      .expect(202);

    await vi.waitFor(
      async () => {
        const item = await prisma.runItem.findUnique({
          where: { runId_seq: { runId, seq: 0 } },
        });
        expect(item).toEqual(
          expect.objectContaining({ status: 'SUCCESS', attempts: 2, stock: 4 }),
        );
      },
      { timeout: 4_000, interval: 25 },
    );

    const intervalo =
      cliente.instantesDasChamadas[1] - cliente.instantesDasChamadas[0];
    expect(intervalo).toBeGreaterThanOrEqual(80);
    expect(intervalo).toBeLessThan(400);
    const job = await fila.getJob(`${runId}-0`);
    await expect(job?.getState()).resolves.toBe('completed');
  });
});
