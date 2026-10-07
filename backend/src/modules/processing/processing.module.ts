import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module.js';
import {
  ENRICHMENT_CLIENT,
  EnrichmentClient,
} from './application/contracts/enrichment.client.js';
import {
  PENDING_RUN_QUEUE,
  PendingRunQueue,
} from './application/queues/pending-run.queue.js';
import {
  PROCESSING_QUEUE,
  ProcessingQueue,
} from './application/queues/processing.queue.js';
import { ReceberItemProcessamentoUseCase } from './application/use-cases/receber-item-processamento.use-case.js';
import { ProcessarItemAguardandoRunUseCase } from './application/use-cases/processar-item-aguardando-run.use-case.js';
import { ProcessarItemUseCase } from './application/use-cases/processar-item.use-case.js';
import {
  PROCESS_ITEM_REPOSITORY,
  ProcessItemRepository,
} from './domain/repositories/process-item.repository.js';
import { BullMqProcessingQueue } from './infrastructure/queues/bullmq-processing.queue.js';
import { BullMqPendingRunQueue } from './infrastructure/queues/bullmq-pending-run.queue.js';
import { PENDING_RUN_QUEUE_NAME } from './infrastructure/queues/pending-run-queue.constants.js';
import { PROCESSING_QUEUE_NAME } from './infrastructure/queues/processing-queue.constants.js';
import { PrismaProcessItemRepository } from './infrastructure/repositories/prisma-process-item.repository.js';
import { DevelopmentEnrichmentClient } from './infrastructure/clients/development-enrichment.client.js';
import { criarEnrichmentClient } from './infrastructure/clients/enrichment-client.provider.js';
import { ProcessingWorker } from './infrastructure/workers/processing.worker.js';
import { PendingRunWorker } from './infrastructure/workers/pending-run.worker.js';
import { ProcessingController } from './processing.controller.js';
import { RunRepository } from '../runs/domain/repositories/run.repository.js';
import { PrismaRunRepository } from '../runs/infrastructure/repositories/prisma-run.repository.js';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: PROCESSING_QUEUE_NAME }),
    BullModule.registerQueue({ name: PENDING_RUN_QUEUE_NAME }),
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
    PrismaRunRepository,
    {
      provide: PENDING_RUN_QUEUE,
      useClass: BullMqPendingRunQueue,
    },
    DevelopmentEnrichmentClient,
    {
      provide: ENRICHMENT_CLIENT,
      inject: [DevelopmentEnrichmentClient],
      useFactory: (desenvolvimento: DevelopmentEnrichmentClient) =>
        criarEnrichmentClient(desenvolvimento),
    },
    {
      provide: ReceberItemProcessamentoUseCase,
      inject: [
        PROCESS_ITEM_REPOSITORY,
        PROCESSING_QUEUE,
        PrismaRunRepository,
        PENDING_RUN_QUEUE,
      ],
      useFactory: (
        repositorio: ProcessItemRepository,
        fila: ProcessingQueue,
        lotes: RunRepository,
        filaDeEspera: PendingRunQueue,
      ) =>
        new ReceberItemProcessamentoUseCase(
          repositorio,
          fila,
          lotes,
          filaDeEspera,
        ),
    },
    {
      provide: ProcessarItemAguardandoRunUseCase,
      inject: [PrismaRunRepository, PROCESS_ITEM_REPOSITORY, PROCESSING_QUEUE],
      useFactory: (
        lotes: RunRepository,
        itens: ProcessItemRepository,
        fila: ProcessingQueue,
      ) => new ProcessarItemAguardandoRunUseCase(lotes, itens, fila),
    },
    {
      provide: ProcessarItemUseCase,
      inject: [PROCESS_ITEM_REPOSITORY, ENRICHMENT_CLIENT],
      useFactory: (
        repositorio: ProcessItemRepository,
        cliente: EnrichmentClient,
      ) => new ProcessarItemUseCase(repositorio, cliente),
    },
    PendingRunWorker,
    ProcessingWorker,
  ],
})
export class ProcessingModule {}
