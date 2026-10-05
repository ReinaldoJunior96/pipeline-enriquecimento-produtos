import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET / deve informar que o serviço está em execução', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      service: 'pipeline-enriquecimento-produtos',
      status: 'running',
    });
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

  afterEach(async () => {
    await app.close();
  });
});
