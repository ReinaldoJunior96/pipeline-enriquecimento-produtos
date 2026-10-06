import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { PROCESSING_QUEUE } from '../../src/modules/processing/application/queues/processing.queue.js';
import { PROCESS_ITEM_REPOSITORY } from '../../src/modules/processing/domain/repositories/process-item.repository.js';
import { FakeProcessItemRepository } from '../fakes/fake-process-item.repository.js';
import { FakeProcessingQueue } from '../fakes/fake-processing.queue.js';

interface AplicacaoProcessamentoDeTeste {
  app: INestApplication<App>;
  repositorio: FakeProcessItemRepository;
  fila: FakeProcessingQueue;
}

export async function criarAplicacaoProcessamentoDeTeste(): Promise<AplicacaoProcessamentoDeTeste> {
  const repositorio = new FakeProcessItemRepository();
  const fila = new FakeProcessingQueue();
  const modulo: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PROCESS_ITEM_REPOSITORY)
    .useValue(repositorio)
    .overrideProvider(PROCESSING_QUEUE)
    .useValue(fila)
    .compile();

  const app = modulo.createNestApplication();
  await app.init();

  return { app, repositorio, fila };
}
