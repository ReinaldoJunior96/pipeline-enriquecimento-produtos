import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { CriarLoteUseCase } from '../../../src/modules/runs/application/use-cases/criar-lote.use-case.js';
import { FakePlatformAuthContextStore } from '../../fakes/fake-platform-auth-context.store.js';
import { RunsController } from '../../../src/modules/runs/runs.controller.js';
import { FakePlataformaExternaClient } from '../../fakes/fake-plataforma-externa.client.js';
import { FakeRunRepository } from '../../fakes/fake-run.repository.js';

describe('Criação de burst pela API (e2e)', () => {
  let app: INestApplication<App>;
  let cliente: FakePlataformaExternaClient;
  let repositorio: FakeRunRepository;

  beforeAll(async () => {
    cliente = new FakePlataformaExternaClient({
      runId: 'run_burst_e2e',
      cid: 'cid_burst_e2e',
      total: 20,
      startedAt: new Date('2026-10-07T13:20:54.872Z'),
    });
    repositorio = new FakeRunRepository();
    const modulo = await Test.createTestingModule({
      controllers: [RunsController],
      providers: [
        {
          provide: CriarLoteUseCase,
          useValue: new CriarLoteUseCase(
            cliente,
            repositorio,
            new FakePlatformAuthContextStore(),
          ),
        },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve solicitar burst, persistir a run e responder HTTP 201', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    try {
      await request(app.getHttpServer())
        .post('/runs/burst')
        .send({ cid: 'cid_burst_e2e', token: 'token_fake' })
        .expect(201)
        .expect({
          run_id: 'run_burst_e2e',
          cid: 'cid_burst_e2e',
          total: 20,
          started_at: '2026-10-07T13:20:54.872Z',
        });

      expect(log.mock.calls.flat().join(' ')).not.toContain('token_fake');
    } finally {
      log.mockRestore();
    }

    expect(cliente.chamadas).toEqual([
      { cid: 'cid_burst_e2e', token: 'token_fake' },
    ]);
    expect(repositorio.runs).toEqual([
      expect.objectContaining({
        runId: 'run_burst_e2e',
        cid: 'cid_burst_e2e',
        status: 'PROCESSING',
      }),
    ]);
  });

  it('deve rejeitar request sem token', async () => {
    await request(app.getHttpServer())
      .post('/runs/burst')
      .send({ cid: 'cid_burst_e2e' })
      .expect(400);

    expect(cliente.chamadas).toHaveLength(1);
  });

  it('deve responder conflito se a plataforma devolver uma run já persistida', async () => {
    await request(app.getHttpServer())
      .post('/runs/burst')
      .send({ cid: 'cid_burst_e2e', token: 'token_fake' })
      .expect(409);

    expect(repositorio.runs).toHaveLength(1);
  });
});
