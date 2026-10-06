import { INestApplication } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAplicacaoProcessamentoDeTeste } from '../../support/criar-aplicacao-processamento-de-teste.js';

describe('Tempo de ACK do processamento (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await criarAplicacaoProcessamentoDeTeste());
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve confirmar o recebimento em menos de 600 ms', async () => {
    const inicio = performance.now();

    await request(app.getHttpServer())
      .post('/process')
      .send({
        run_id: 'run_abc123',
        seq: 0,
        sku: 'sku-001',
      })
      .expect(202)
      .expect({ status: 'accepted' });

    const duracaoEmMilissegundos = performance.now() - inicio;

    expect(duracaoEmMilissegundos).toBeLessThan(600);
  });
});
