import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';

export async function criarAplicacaoDeTeste(): Promise<INestApplication<App>> {
  const modulo: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const aplicacao = modulo.createNestApplication();
  await aplicacao.init();

  return aplicacao;
}
