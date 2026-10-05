import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAplicacaoDeTeste } from '../../support/criar-aplicacao-de-teste.js';

describe('Webhook check (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await criarAplicacaoDeTeste();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /check deve devolver o token recebido', () => {
    return request(app.getHttpServer())
      .post('/check')
      .send({ token: 'abc123' })
      .expect(200)
      .expect({ token: 'abc123' });
  });

  it('POST /check deve rejeitar um corpo sem token', () => {
    return request(app.getHttpServer()).post('/check').send({}).expect(400);
  });

  it('POST /check deve rejeitar um token vazio', () => {
    return request(app.getHttpServer())
      .post('/check')
      .send({ token: '' })
      .expect(400);
  });

  it('POST /check deve rejeitar um token que não seja texto', () => {
    return request(app.getHttpServer())
      .post('/check')
      .send({ token: 123 })
      .expect(400);
  });
});
