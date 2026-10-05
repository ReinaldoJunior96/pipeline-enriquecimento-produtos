import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAplicacaoDeTeste } from '../support/criar-aplicacao-de-teste.js';

describe('Healthcheck (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await criarAplicacaoDeTeste();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health deve informar que a API está saudável', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    const body = response.body as { status: string; timestamp: string };

    expect(body).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
    });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
