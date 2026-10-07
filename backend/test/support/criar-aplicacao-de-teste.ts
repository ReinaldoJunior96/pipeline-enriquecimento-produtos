import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppController } from '../../src/app.controller.js';
import { AppModule } from '../../src/app.module.js';
import { AppService } from '../../src/app.service.js';
import { WebhookModule } from '../../src/modules/webhook/webhook.module.js';
import { configurarSwagger } from '../../src/infrastructure/openapi/swagger.js';

export async function criarAplicacaoDeTeste(): Promise<INestApplication<App>> {
  const modulo: TestingModule = await Test.createTestingModule({
    imports: [WebhookModule],
    controllers: [AppController],
    providers: [
      AppService,
      {
        provide: APP_PIPE,
        useValue: new ValidationPipe(),
      },
    ],
  }).compile();

  const aplicacao = modulo.createNestApplication();
  await aplicacao.init();

  return aplicacao;
}

export async function criarAplicacaoCompletaDeTeste(): Promise<
  INestApplication<App>
> {
  const modulo: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const aplicacao = modulo.createNestApplication();
  configurarSwagger(aplicacao);
  await aplicacao.init();
  return aplicacao;
}
