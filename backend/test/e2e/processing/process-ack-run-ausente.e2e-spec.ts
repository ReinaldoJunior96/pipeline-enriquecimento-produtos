import { INestApplication } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { FakePendingRunQueue } from '../../fakes/fake-pending-run.queue.js';
import { criarAplicacaoProcessamentoDeTeste } from '../../support/criar-aplicacao-processamento-de-teste.js';

describe('ACK com lote ainda indisponível (e2e)', () => {
  let app: INestApplication<App>;
  let filaDeEspera: FakePendingRunQueue;

  beforeAll(async () => {
    const aplicacao = await criarAplicacaoProcessamentoDeTeste({
      runsExistentes: [],
    });
    app = aplicacao.app;
    filaDeEspera = aplicacao.filaDeEspera;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve aceitar em menos de 600 ms e enviar o item para espera', async () => {
    const inicio = performance.now();

    await request(app.getHttpServer())
      .post('/process')
      .send({
        run_id: 'run-ack-sem-lote',
        seq: 1,
        sku: 'sku-001',
      })
      .expect(202)
      .expect({ status: 'accepted' });

    expect(performance.now() - inicio).toBeLessThan(600);
    expect(filaDeEspera.itens).toEqual([
      { runId: 'run-ack-sem-lote', seq: 1, sku: 'sku-001' },
    ]);
  });
});
