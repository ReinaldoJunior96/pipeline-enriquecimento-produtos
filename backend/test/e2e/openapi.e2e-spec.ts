import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configurarSwagger } from '../../src/infrastructure/openapi/swagger.js';
import { AdminRunsController } from '../../src/infrastructure/admin/admin-runs.controller.js';
import { AppController } from '../../src/app.controller.js';
import { AppService } from '../../src/app.service.js';
import { PlatformController } from '../../src/modules/runs/platform.controller.js';
import { RunsController } from '../../src/modules/runs/runs.controller.js';
import { ProcessingController } from '../../src/modules/processing/processing.controller.js';
import { WebhookController } from '../../src/modules/webhook/webhook.controller.js';
import { PLATAFORMA_EXTERNA_CLIENT } from '../../src/modules/runs/application/contracts/plataforma-externa.client.js';
import { CriarLoteUseCase } from '../../src/modules/runs/application/use-cases/criar-lote.use-case.js';
import { CadastrarLoteManualUseCase } from '../../src/modules/runs/application/use-cases/cadastrar-lote-manual.use-case.js';
import { ReceberItemProcessamentoUseCase } from '../../src/modules/processing/application/use-cases/receber-item-processamento.use-case.js';

describe('Documentação OpenAPI (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [
        AppController,
        PlatformController,
        RunsController,
        ProcessingController,
        WebhookController,
        AdminRunsController,
      ],
      providers: [
        AppService,
        { provide: PLATAFORMA_EXTERNA_CLIENT, useValue: {} },
        { provide: CriarLoteUseCase, useValue: {} },
        { provide: ReceberItemProcessamentoUseCase, useValue: {} },
        { provide: CadastrarLoteManualUseCase, useValue: {} },
        { provide: APP_PIPE, useValue: new ValidationPipe() },
      ],
    }).compile();
    app = modulo.createNestApplication();
    configurarSwagger(app);
    await app.init();
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

  it('deve agrupar os endpoints e marcar o token do burst como write-only', async () => {
    const documento = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const caminhos = documento.body.paths;

    expect(caminhos['/platform/register'].post.tags).toEqual([
      'Plataforma Externa',
    ]);
    expect(caminhos['/check'].post.tags).toEqual(['Plataforma Externa']);
    expect(caminhos['/runs/burst'].post).toEqual(
      expect.objectContaining({
        tags: ['Lotes'],
        responses: expect.objectContaining({ '201': expect.any(Object) }),
      }),
    );
    expect(caminhos['/process'].post).toEqual(
      expect.objectContaining({
        tags: ['Processamento'],
        responses: expect.objectContaining({ '202': expect.any(Object) }),
      }),
    );
    expect(caminhos['/admin/runs'].post).toEqual(
      expect.objectContaining({ tags: ['Admin'], deprecated: true }),
    );
    expect(
      documento.body.components.schemas.CreateBurstDto.properties.token
        .writeOnly,
    ).toBe(true);
  });
});
