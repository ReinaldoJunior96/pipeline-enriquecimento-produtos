import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { criarAplicacaoCompletaDeTeste } from '../support/criar-aplicacao-de-teste.js';

describe('Documentação OpenAPI (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await criarAplicacaoCompletaDeTeste();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve disponibilizar a interface Swagger e o documento OpenAPI', async () => {
    await request(app.getHttpServer()).get('/docs').expect(200);

    const documento = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);

    expect(documento.body.info).toEqual(
      expect.objectContaining({
        title: 'Pipeline de Enriquecimento de Produtos',
        version: '1.0.0',
      }),
    );
    expect(Object.keys(documento.body.paths)).toEqual(
      expect.arrayContaining([
        '/health',
        '/platform/register',
        '/check',
        '/runs/burst',
        '/process',
      ]),
    );
  });

  it('deve documentar o health com a tag Health', async () => {
    const documento = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);

    expect(documento.body.paths['/health'].get).toEqual(
      expect.objectContaining({
        tags: ['Health'],
        summary: 'Verifica a saúde da aplicação',
        responses: expect.objectContaining({
          '200': expect.any(Object),
        }),
      }),
    );
  });
});
