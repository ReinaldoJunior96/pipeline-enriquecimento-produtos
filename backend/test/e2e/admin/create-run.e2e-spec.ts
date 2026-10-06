import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AdminRunsModule } from '../../../src/infrastructure/admin/admin-runs.module.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';

describe('Cadastro manual de lote (e2e)', () => {
  const prefixoRunId = 'run_admin_e2e';
  let app: INestApplication<App>;
  let appDesabilitada: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AdminRunsModule.register(true)],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);

    const moduloDesabilitado = await Test.createTestingModule({
      imports: [AdminRunsModule.register(false)],
    }).compile();
    appDesabilitada = moduloDesabilitado.createNestApplication();
    await appDesabilitada.init();
  });

  afterEach(async () => {
    await prisma.run.deleteMany({
      where: { runId: { startsWith: prefixoRunId } },
    });
  });

  afterAll(async () => {
    await appDesabilitada.close();
    await app.close();
  });

  const payloadValido = {
    run_id: `${prefixoRunId}_valid`,
    cid: 'cid_admin_test',
    total: 20,
    started_at: '2026-10-06T19:00:00.000Z',
  };

  it('deve cadastrar o lote com os valores iniciais', async () => {
    await request(app.getHttpServer())
      .post('/admin/runs')
      .send(payloadValido)
      .expect(201)
      .expect({
        ...payloadValido,
        status: 'PROCESSING',
        finished_count: 0,
        callback_sent: false,
      });

    await expect(
      prisma.run.findUniqueOrThrow({
        where: { runId: payloadValido.run_id },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        runId: payloadValido.run_id,
        cid: payloadValido.cid,
        total: 20,
        status: 'PROCESSING',
        finishedCount: 0,
        callbackSent: false,
      }),
    );
  });

  it.each([
    [
      'run_id ausente',
      { cid: 'cid', total: 1, started_at: payloadValido.started_at },
    ],
    [
      'cid ausente',
      {
        run_id: `${prefixoRunId}_missing_cid`,
        total: 1,
        started_at: payloadValido.started_at,
      },
    ],
    [
      'total inválido',
      {
        run_id: `${prefixoRunId}_invalid_total`,
        cid: 'cid',
        total: 0,
        started_at: payloadValido.started_at,
      },
    ],
    [
      'started_at inválido',
      {
        run_id: `${prefixoRunId}_invalid_date`,
        cid: 'cid',
        total: 1,
        started_at: 'data-inválida',
      },
    ],
  ])('deve rejeitar %s', async (_cenario, payload) => {
    await request(app.getHttpServer())
      .post('/admin/runs')
      .send(payload)
      .expect(400);
  });

  it('deve responder 409 para run_id já cadastrado', async () => {
    await request(app.getHttpServer())
      .post('/admin/runs')
      .send(payloadValido)
      .expect(201);

    await request(app.getHttpServer())
      .post('/admin/runs')
      .send(payloadValido)
      .expect(409);
  });

  it('não deve expor o endpoint quando estiver desabilitado', async () => {
    await request(appDesabilitada.getHttpServer())
      .post('/admin/runs')
      .send(payloadValido)
      .expect(404);
  });
});
