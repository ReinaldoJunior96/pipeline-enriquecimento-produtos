import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PendingRunInput } from '../../application/queues/pending-run.queue.js';
import { ProcessarItemAguardandoRunUseCase } from '../../application/use-cases/processar-item-aguardando-run.use-case.js';
import { RunNotAvailableError } from '../../domain/errors/run-not-available.error.js';
import {
  PENDING_RUN_QUEUE_NAME,
  WAIT_FOR_RUN_JOB_NAME,
} from '../queues/pending-run-queue.constants.js';

@Processor(PENDING_RUN_QUEUE_NAME)
export class PendingRunWorker extends WorkerHost {
  private readonly logger = new Logger(PendingRunWorker.name);

  constructor(
    private readonly processarItemAguardandoRun: ProcessarItemAguardandoRunUseCase,
  ) {
    super();
  }

  async process(job: Job<PendingRunInput>): Promise<void> {
    if (job.name !== WAIT_FOR_RUN_JOB_NAME) {
      throw new Error(`Job de espera desconhecido: ${job.name}`);
    }

    const tentativa = job.attemptsMade + 1;

    try {
      await this.processarItemAguardandoRun.execute(job.data, tentativa);
    } catch (error) {
      const totalDeTentativas = job.opts.attempts ?? 1;
      if (
        error instanceof RunNotAvailableError &&
        tentativa >= totalDeTentativas
      ) {
        this.logger.error({
          evento: 'process.espera_esgotada',
          ...job.data,
          tentativa,
        });
      }

      throw error;
    }
  }
}
