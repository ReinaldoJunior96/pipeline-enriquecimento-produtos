import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAplicacaoProcessamentoDeTeste } from '../../support/criar-aplicacao-processamento-de-teste.js';

describe('Validação do processamento (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await criarAplicacaoProcessamentoDeTeste());
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /process deve aceitar um item válido', () => {
    return request(app.getHttpServer())
      .post('/process')
      .send({
        run_id: 'run_abc123',
        seq: 0,
        sku: 'sku-001',
      })
      .expect(202)
      .expect({ status: 'accepted' });
  });

  it('POST /process deve rejeitar um corpo sem run_id', () => {
    return request(app.getHttpServer())
      .post('/process')
      .send({ seq: 0, sku: 'sku-001' })
      .expect(400);
  });

  it('POST /process deve rejeitar um corpo sem seq', () => {
    return request(app.getHttpServer())
      .post('/process')
      .send({ run_id: 'run_abc123', sku: 'sku-001' })
      .expect(400);
  });

  it('POST /process deve rejeitar um corpo sem sku', () => {
    return request(app.getHttpServer())
      .post('/process')
      .send({ run_id: 'run_abc123', seq: 0 })
      .expect(400);
  });

  it('POST /process deve rejeitar run_id vazio', () => {
    return request(app.getHttpServer())
      .post('/process')
      .send({ run_id: '', seq: 0, sku: 'sku-001' })
      .expect(400);
  });

  it('POST /process deve rejeitar sku vazio', () => {
    return request(app.getHttpServer())
      .post('/process')
      .send({ run_id: 'run_abc123', seq: 0, sku: '' })
      .expect(400);
  });

  it('POST /process deve rejeitar seq com tipo inválido', () => {
    return request(app.getHttpServer())
      .post('/process')
      .send({ run_id: 'run_abc123', seq: '0', sku: 'sku-001' })
      .expect(400);
  });

  it('POST /process deve rejeitar seq negativo', () => {
    return request(app.getHttpServer())
      .post('/process')
      .send({ run_id: 'run_abc123', seq: -1, sku: 'sku-001' })
      .expect(400);
  });
});
