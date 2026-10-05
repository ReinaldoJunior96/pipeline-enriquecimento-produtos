import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAplicacaoDeTeste } from '../support/criar-aplicacao-de-teste.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await criarAplicacaoDeTeste();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / deve informar que o serviço está em execução', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      service: 'pipeline-enriquecimento-produtos',
      status: 'running',
    });
  });
});
