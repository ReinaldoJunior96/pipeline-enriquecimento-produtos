import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PendingRunInput } from '../../application/queues/pending-run.queue.js';
import { ProcessarItemAguardandoRunUseCase } from '../../application/use-cases/processar-item-aguardando-run.use-case.js';
import {
  PENDING_RUN_QUEUE_NAME,
  WAIT_FOR_RUN_JOB_NAME,
} from '../queues/pending-run-queue.constants.js';

@Processor(PENDING_RUN_QUEUE_NAME)
export class PendingRunWorker extends WorkerHost {
  constructor(
    private readonly processarItemAguardandoRun: ProcessarItemAguardandoRunUseCase,
  ) {
    super();
  }

  async process(job: Job<PendingRunInput>): Promise<void> {
    if (job.name !== WAIT_FOR_RUN_JOB_NAME) {
      throw new Error(`Job de espera desconhecido: ${job.name}`);
    }

    await this.processarItemAguardandoRun.execute(
      job.data,
      job.attemptsMade + 1,
    );
  }
}
