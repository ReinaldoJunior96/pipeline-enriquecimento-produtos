import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  PendingRunInput,
  PendingRunQueue,
} from '../../application/queues/pending-run.queue.js';
import {
  PENDING_RUN_JOB_ATTEMPTS,
  PENDING_RUN_JOB_BACKOFF_MS,
  PENDING_RUN_QUEUE_NAME,
  WAIT_FOR_RUN_JOB_NAME,
} from './pending-run-queue.constants.js';

@Injectable()
export class BullMqPendingRunQueue implements PendingRunQueue {
  constructor(
    @InjectQueue(PENDING_RUN_QUEUE_NAME)
    private readonly fila: Queue<PendingRunInput>,
  ) {}

  async enqueue(input: PendingRunInput): Promise<void> {
    await this.fila.add(WAIT_FOR_RUN_JOB_NAME, input, {
      jobId: `wait-${input.runId}-${input.seq}`,
      attempts: PENDING_RUN_JOB_ATTEMPTS,
      backoff: { type: 'fixed', delay: PENDING_RUN_JOB_BACKOFF_MS },
      removeOnComplete: true,
    });
  }
}
