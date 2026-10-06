import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { ProcessingQueue } from '../../src/modules/processing/application/queues/processing.queue.js';
import { ReceberItemProcessamentoUseCase } from '../../src/modules/processing/application/use-cases/receber-item-processamento.use-case.js';
import { ProcessItemRepository } from '../../src/modules/processing/domain/repositories/process-item.repository.js';
import { ProcessingController } from '../../src/modules/processing/processing.controller.js';
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
    controllers: [ProcessingController],
    providers: [
      {
        provide: ReceberItemProcessamentoUseCase,
        useFactory: (
          repositorioInjetado: ProcessItemRepository,
          filaInjetada: ProcessingQueue,
        ) =>
          new ReceberItemProcessamentoUseCase(
            repositorioInjetado,
            filaInjetada,
          ),
        inject: ['REPOSITORIO_DE_TESTE', 'FILA_DE_TESTE'],
      },
      { provide: 'REPOSITORIO_DE_TESTE', useValue: repositorio },
      { provide: 'FILA_DE_TESTE', useValue: fila },
      {
        provide: APP_PIPE,
        useValue: new ValidationPipe(),
      },
    ],
  }).compile();

  const app = modulo.createNestApplication();
  await app.init();

  return { app, repositorio, fila };
}
