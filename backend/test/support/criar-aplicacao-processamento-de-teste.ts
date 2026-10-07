import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { PendingRunQueue } from '../../src/modules/processing/application/queues/pending-run.queue.js';
import { ProcessingQueue } from '../../src/modules/processing/application/queues/processing.queue.js';
import { ReceberItemProcessamentoUseCase } from '../../src/modules/processing/application/use-cases/receber-item-processamento.use-case.js';
import { ProcessItemRepository } from '../../src/modules/processing/domain/repositories/process-item.repository.js';
import { ProcessingController } from '../../src/modules/processing/processing.controller.js';
import { RunRepository } from '../../src/modules/runs/domain/repositories/run.repository.js';
import { FakePendingRunQueue } from '../fakes/fake-pending-run.queue.js';
import { FakeProcessItemRepository } from '../fakes/fake-process-item.repository.js';
import { FakeProcessingQueue } from '../fakes/fake-processing.queue.js';
import { FakeRunRepository } from '../fakes/fake-run.repository.js';

interface AplicacaoProcessamentoDeTeste {
  app: INestApplication<App>;
  repositorio: FakeProcessItemRepository;
  fila: FakeProcessingQueue;
  filaDeEspera: FakePendingRunQueue;
  lotes: FakeRunRepository;
}

interface OpcoesAplicacaoProcessamentoDeTeste {
  runsExistentes?: string[];
}

export async function criarAplicacaoProcessamentoDeTeste(
  opcoes: OpcoesAplicacaoProcessamentoDeTeste = {
    runsExistentes: ['run_abc123'],
  },
): Promise<AplicacaoProcessamentoDeTeste> {
  const repositorio = new FakeProcessItemRepository();
  const fila = new FakeProcessingQueue();
  const filaDeEspera = new FakePendingRunQueue();
  const lotes = new FakeRunRepository();

  for (const runId of opcoes.runsExistentes ?? []) {
    await lotes.create({
      runId,
      cid: 'cid_teste',
      total: 1,
      startedAt: new Date('2026-10-07T12:00:00.000Z'),
    });
  }

  const modulo: TestingModule = await Test.createTestingModule({
    controllers: [ProcessingController],
    providers: [
      {
        provide: ReceberItemProcessamentoUseCase,
        useFactory: (
          repositorioInjetado: ProcessItemRepository,
          filaInjetada: ProcessingQueue,
          lotesInjetados: RunRepository,
          filaDeEsperaInjetada: PendingRunQueue,
        ) =>
          new ReceberItemProcessamentoUseCase(
            repositorioInjetado,
            filaInjetada,
            lotesInjetados,
            filaDeEsperaInjetada,
          ),
        inject: [
          'REPOSITORIO_DE_TESTE',
          'FILA_DE_TESTE',
          'LOTES_DE_TESTE',
          'FILA_DE_ESPERA_DE_TESTE',
        ],
      },
      { provide: 'REPOSITORIO_DE_TESTE', useValue: repositorio },
      { provide: 'FILA_DE_TESTE', useValue: fila },
      { provide: 'LOTES_DE_TESTE', useValue: lotes },
      { provide: 'FILA_DE_ESPERA_DE_TESTE', useValue: filaDeEspera },
      {
        provide: APP_PIPE,
        useValue: new ValidationPipe(),
      },
    ],
  }).compile();

  const app = modulo.createNestApplication();
  await app.init();

  return { app, repositorio, fila, filaDeEspera, lotes };
}
