import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { EnrichmentTransientError } from '../../../src/modules/processing/domain/errors/enrichment.errors.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { FakeEnrichmentClient } from '../../fakes/fake-enrichment.client.js';
import { criarAplicacaoWorkerDeTeste } from '../../support/criar-aplicacao-worker-de-teste.js';

describe('Esgotamento de tentativas do worker', () => {
  const runId = 'run_worker_retry_exhausted';
  const cliente = new FakeEnrichmentClient();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    cliente.falharCom(
      'sku-always-fails',
      new EnrichmentTransientError('Serviço indisponível após três tentativas'),
    );
    ({ app, prisma, fila } = await criarAplicacaoWorkerDeTeste(cliente));
  });

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_retry_exhausted',
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

  it('deve marcar ERROR após três falhas sem realizar uma quarta tentativa', async () => {
    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku: 'sku-always-fails' })
      .expect(202);

    await vi.waitFor(
      async () => {
        const job = await fila.getJob(`${runId}-0`);
        await expect(job?.getState()).resolves.toBe('failed');
        expect(job?.attemptsMade).toBe(3);
      },
      { timeout: 8_000, interval: 50 },
    );

    expect(cliente.chamadas).toHaveLength(3);
    await expect(
      prisma.runItem.findUniqueOrThrow({
        where: { runId_seq: { runId, seq: 0 } },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'ERROR',
        attempts: 3,
        price: null,
        stock: null,
        errorCode: 'RETRY_EXHAUSTED',
        errorMessage: 'Tentativas de enriquecimento esgotadas',
      }),
    );
  });
});
