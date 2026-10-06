import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module.js';
import {
  PROCESSING_QUEUE,
  ProcessingQueue,
} from './application/queues/processing.queue.js';
import { ReceberItemProcessamentoUseCase } from './application/use-cases/receber-item-processamento.use-case.js';
import {
  PROCESS_ITEM_REPOSITORY,
  ProcessItemRepository,
} from './domain/repositories/process-item.repository.js';
import { BullMqProcessingQueue } from './infrastructure/queues/bullmq-processing.queue.js';
import { PROCESSING_QUEUE_NAME } from './infrastructure/queues/processing-queue.constants.js';
import { PrismaProcessItemRepository } from './infrastructure/repositories/prisma-process-item.repository.js';
import { ProcessingController } from './processing.controller.js';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: PROCESSING_QUEUE_NAME }),
  ],
  controllers: [ProcessingController],
  providers: [
    {
      provide: PROCESS_ITEM_REPOSITORY,
      useClass: PrismaProcessItemRepository,
    },
    {
      provide: PROCESSING_QUEUE,
      useClass: BullMqProcessingQueue,
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
