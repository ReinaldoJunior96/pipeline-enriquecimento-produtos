import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { EnrichmentTransientError } from '../../../src/modules/processing/domain/errors/enrichment.errors.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';
import { criarAplicacaoWorkerDeTeste } from '../../support/criar-aplicacao-worker-de-teste.js';

describe('Liberação do worker durante o backoff', () => {
  const runId = 'run_worker_nonblocking_backoff';
  const skusComRetry = Array.from(
    { length: 3 },
    (_, indice) => `sku-delayed-${indice}`,
  );
  const cliente = new FakeEnrichmentClient();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    skusComRetry.forEach((sku, indice) => {
      cliente.responderEmSequencia(sku, [
        new EnrichmentTransientError(),
        { sku, price: 20 + indice, stock: indice },
      ]);
    });
    cliente.responderCom('sku-immediate', {
      sku: 'sku-immediate',
      price: 99.9,
      stock: 9,
    });
    ({ app, prisma, fila } = await criarAplicacaoWorkerDeTeste(cliente));
  });

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_nonblocking_backoff',
        total: 4,
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

  it('deve processar outro job enquanto os retries estão em delayed', async () => {
    for (const [seq, sku] of skusComRetry.entries()) {
      await request(app.getHttpServer())
        .post('/process')
        .send({ run_id: runId, seq, sku })
        .expect(202);
    }

    await vi.waitFor(
      async () => {
        const estados = await Promise.all(
          skusComRetry.map(async (_, seq) =>
            (await fila.getJob(`${runId}-${seq}`))?.getState(),
          ),
        );
        expect(estados).toEqual(['delayed', 'delayed', 'delayed']);
      },
      { timeout: 2_000, interval: 20 },
    );

    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 3, sku: 'sku-immediate' })
      .expect(202);

    await vi.waitFor(
      async () => {
        await expect(
          prisma.runItem.findUniqueOrThrow({
            where: { runId_seq: { runId, seq: 3 } },
          }),
        ).resolves.toEqual(expect.objectContaining({ status: 'SUCCESS' }));
      },
      { timeout: 400, interval: 20 },
    );

    expect(
      cliente.chamadas
        .slice(0, 3)
        .map(({ sku }) => sku)
        .sort(),
    ).toEqual([...skusComRetry].sort());
    expect(cliente.chamadas[3]).toEqual({
      sku: 'sku-immediate',
      runId: 'run_worker_nonblocking_backoff',
    });

    await vi.waitFor(
      async () => {
        await expect(
          prisma.runItem.count({ where: { runId, status: 'SUCCESS' } }),
        ).resolves.toBe(4);
      },
      { timeout: 4_000, interval: 25 },
    );
  });
});
