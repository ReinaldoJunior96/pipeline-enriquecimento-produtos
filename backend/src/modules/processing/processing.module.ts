import { Module } from '@nestjs/common';
import {
  PROCESSING_QUEUE,
  ProcessingQueue,
} from './application/queues/processing.queue.js';
import { ReceberItemProcessamentoUseCase } from './application/use-cases/receber-item-processamento.use-case.js';
import {
  PROCESS_ITEM_REPOSITORY,
  ProcessItemRepository,
} from './domain/repositories/process-item.repository.js';
import { InMemoryProcessItemRepository } from './infrastructure/in-memory/in-memory-process-item.repository.js';
import { InMemoryProcessingQueue } from './infrastructure/in-memory/in-memory-processing.queue.js';
import { ProcessingController } from './processing.controller.js';

@Module({
  controllers: [ProcessingController],
  providers: [
    {
      provide: PROCESS_ITEM_REPOSITORY,
      useClass: InMemoryProcessItemRepository,
    },
    {
      provide: PROCESSING_QUEUE,
      useClass: InMemoryProcessingQueue,
    },
    {
      provide: ReceberItemProcessamentoUseCase,
      inject: [PROCESS_ITEM_REPOSITORY, PROCESSING_QUEUE],
      useFactory: (repositorio: ProcessItemRepository, fila: ProcessingQueue) =>
        new ReceberItemProcessamentoUseCase(repositorio, fila),
    },
  ],
})
export class ProcessingModule {}
