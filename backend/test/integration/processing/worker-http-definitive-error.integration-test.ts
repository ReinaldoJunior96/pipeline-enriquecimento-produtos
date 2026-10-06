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
import { ServidorEnriquecimentoHttpDeTeste } from '../../support/servidor-enriquecimento-http-de-teste.js';

describe('Erros HTTP definitivos no worker', () => {
  const prefixoRunId = 'run_worker_http_definitive';
  const servidor = new ServidorEnriquecimentoHttpDeTeste();
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fila: Queue<ProcessItemInput>;

  beforeAll(async () => {
    process.env.ENRICHMENT_MODE = 'http';
    process.env.PLATAFORMA_BASE_URL = await servidor.iniciar();
    process.env.PLATAFORMA_CID = 'cid-http-definitive';
    process.env.PLATAFORMA_TOKEN = 'token-http-definitive';
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    fila = modulo.get(getQueueToken(PROCESSING_QUEUE_NAME));
    await fila.obliterate({ force: true });
    app = modulo.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({
      where: { runId: { startsWith: prefixoRunId } },
    });
    await prisma.run.deleteMany({
      where: { runId: { startsWith: prefixoRunId } },
    });
    await fila.obliterate({ force: true });
  });

  afterAll(async () => {
    await app.close();
    await servidor.encerrar();
    delete process.env.ENRICHMENT_MODE;
    delete process.env.PLATAFORMA_BASE_URL;
    delete process.env.PLATAFORMA_CID;
    delete process.env.PLATAFORMA_TOKEN;
  });

  async function validarErroDefinitivo(
    statusHttp: 401 | 404,
    errorCode: 'UNAUTHORIZED' | 'SKU_NOT_FOUND',
  ): Promise<void> {
    const runId = `${prefixoRunId}_${statusHttp}`;
    const sku = `sku-http-${statusHttp}`;
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_worker_http_definitive',
        total: 1,
        startedAt: new Date('2026-10-06T12:00:00.000Z'),
      },
    });
    servidor.responderEmSequencia(sku, [{ status: statusHttp }]);

    await request(app.getHttpServer())
      .post('/process')
      .send({ run_id: runId, seq: 0, sku })
      .expect(202);

    await vi.waitFor(
      async () => {
        await expect(
          prisma.runItem.findUniqueOrThrow({
            where: { runId_seq: { runId, seq: 0 } },
          }),
        ).resolves.toEqual(
          expect.objectContaining({
            status: 'ERROR',
            attempts: 1,
            errorCode,
          }),
        );
      },
      { timeout: 3_000, interval: 25 },
    );

    expect(
      servidor.chamadas.filter((chamada) => chamada.sku === sku),
    ).toHaveLength(1);
    const job = await fila.getJob(`${runId}-0`);
    await expect(job?.getState()).resolves.toBe('completed');
    expect(job?.attemptsMade).toBe(1);
  }

  it('deve marcar UNAUTHORIZED após HTTP 401 sem retry', async () => {
    await validarErroDefinitivo(401, 'UNAUTHORIZED');
  });

  it('deve marcar SKU_NOT_FOUND após HTTP 404 sem retry', async () => {
    await validarErroDefinitivo(404, 'SKU_NOT_FOUND');
  });
});
