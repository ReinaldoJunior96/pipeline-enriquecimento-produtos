import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Queue } from 'bullmq';
import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { ProcessItemInput } from '../../../src/modules/processing/domain/repositories/process-item.repository.js';
import { PROCESSING_QUEUE_NAME } from '../../../src/modules/processing/infrastructure/queues/processing-queue.constants.js';
import { criarAplicacaoCompletaDeTeste } from '../../support/criar-aplicacao-de-teste.js';

describe('Tempo de ACK do processamento (e2e)', () => {
  const runId = 'run_ack_bullmq';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;
  let enrichmentModeAnterior: string | undefined;

  beforeAll(async () => {
    enrichmentModeAnterior = process.env.ENRICHMENT_MODE;
    process.env.ENRICHMENT_MODE = 'fake';
    app = await criarAplicacaoCompletaDeTeste();
    prisma = app.get(PrismaService);
    fila = app.get(getQueueToken(PROCESSING_QUEUE_NAME));
  });

  beforeEach(async () => {
    await fila.obliterate({ force: true });
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_ack_bullmq',
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
    if (enrichmentModeAnterior === undefined)
      delete process.env.ENRICHMENT_MODE;
    else process.env.ENRICHMENT_MODE = enrichmentModeAnterior;
  });

  it('deve confirmar o recebimento em menos de 600 ms', async () => {
    const inicio = performance.now();

    await request(app.getHttpServer())
      .post('/process')
      .send({
        run_id: runId,
        seq: 0,
        sku: 'sku-001',
      })
      .expect(202)
      .expect({ status: 'accepted' });

    const duracaoEmMilissegundos = performance.now() - inicio;

    expect(duracaoEmMilissegundos).toBeLessThan(600);

    await vi.waitFor(
      async () => {
        const job = await fila.getJob(`${runId}-0`);
        await expect(job?.getState()).resolves.toBe('completed');
      },
      { timeout: 2_000, interval: 20 },
    );
  });
});
