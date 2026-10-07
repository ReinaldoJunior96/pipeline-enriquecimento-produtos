import { Queue } from 'bullmq';
import { CallbackQueue } from '../../application/contracts/callback.queue.js';
import { SEND_RESULT_JOB_NAME } from './callback-queue.constants.js';

export class BullMqCallbackQueue implements CallbackQueue {
  constructor(private readonly fila: Queue) {}

  async enqueue(runId: string): Promise<void> {
    await this.fila.add(
      SEND_RESULT_JOB_NAME,
      { runId },
      { jobId: `callback-${runId}` },
    );
  }
}
