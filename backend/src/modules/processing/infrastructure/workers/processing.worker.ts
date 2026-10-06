import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ProcessarItemUseCase } from '../../application/use-cases/processar-item.use-case.js';
import { EnrichmentError } from '../../domain/errors/enrichment.errors.js';
import { ProcessItemInput } from '../../domain/repositories/process-item.repository.js';
import {
  PROCESSING_QUEUE_NAME,
  PROCESS_ITEM_JOB_NAME,
} from '../queues/processing-queue.constants.js';
import { processingBackoffStrategy } from './processing-backoff.strategy.js';

@Processor(PROCESSING_QUEUE_NAME, {
  settings: { backoffStrategy: processingBackoffStrategy },
})
export class ProcessingWorker extends WorkerHost {
  constructor(private readonly processarItem: ProcessarItemUseCase) {
    super();
  }

  async process(job: Job<ProcessItemInput>): Promise<void> {
    if (job.name !== PROCESS_ITEM_JOB_NAME) {
      throw new Error(`Job de processamento desconhecido: ${job.name}`);
    }

    try {
      await this.processarItem.execute(job.data);
    } catch (error) {
      const totalDeTentativas = job.opts.attempts ?? 1;
      const ultimaTentativa = job.attemptsMade + 1 >= totalDeTentativas;

      if (
        error instanceof EnrichmentError &&
        error.transient &&
        ultimaTentativa
      ) {
        await this.processarItem.marcarTentativasEsgotadas(job.data);
      }

      throw error;
    }
  }
}
