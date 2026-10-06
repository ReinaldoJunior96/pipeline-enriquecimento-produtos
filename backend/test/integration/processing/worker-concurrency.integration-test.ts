import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';
import { criarAplicacaoWorkerDeTeste } from '../../support/criar-aplicacao-worker-de-teste.js';

describe('Concorrência do worker de processamento', () => {
  const runId = 'run_worker_concurrency';
  const total = 10;
  const cliente = new FakeEnrichmentClient();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    cliente.definirAtraso(100);
    for (let seq = 0; seq < total; seq += 1) {
      cliente.responderCom(`sku-concurrency-${seq}`, {
        sku: `sku-concurrency-${seq}`,
        price: 10 + seq,
        stock: seq,
      });
    }
    ({ app, prisma, fila } = await criarAplicacaoWorkerDeTeste(cliente));
  });

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_concurrency',
        total,
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

  it('deve processar dez jobs com no máximo três enrich simultâneos', async () => {
    await Promise.all(
      Array.from({ length: total }, (_, seq) =>
        request(app.getHttpServer())
          .post('/process')
          .send({ run_id: runId, seq, sku: `sku-concurrency-${seq}` })
          .expect(202),
      ),
    );

    await vi.waitFor(
      async () => {
        await expect(
          prisma.runItem.count({ where: { runId, status: 'SUCCESS' } }),
        ).resolves.toBe(total);
      },
      { timeout: 5_000, interval: 25 },
    );

    expect(cliente.chamadas).toHaveLength(total);
    expect(cliente.maiorQuantidadeSimultanea).toBe(3);
  });
});
