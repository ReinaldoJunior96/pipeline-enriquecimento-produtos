import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ProcessingQueue } from '../../application/queues/processing.queue.js';
import { ProcessItemInput } from '../../domain/repositories/process-item.repository.js';
import {
  PROCESSING_JOB_BACKOFF_TYPE,
  PROCESSING_JOB_ATTEMPTS,
  PROCESSING_QUEUE_NAME,
  PROCESS_ITEM_JOB_NAME,
} from './processing-queue.constants.js';

@Injectable()
export class BullMqProcessingQueue implements ProcessingQueue {
  private readonly logger = new Logger(BullMqProcessingQueue.name);

  constructor(
    @InjectQueue(PROCESSING_QUEUE_NAME)
    private readonly fila: Queue<ProcessItemInput>,
  ) {}

  async enqueue(item: ProcessItemInput): Promise<void> {
    await this.fila.add(PROCESS_ITEM_JOB_NAME, item, {
      jobId: `${item.runId}-${item.seq}`,
      attempts: PROCESSING_JOB_ATTEMPTS,
      backoff: { type: PROCESSING_JOB_BACKOFF_TYPE },
    });
    this.logger.log({
      evento: 'process.job_enfileirado',
      runId: item.runId,
      seq: item.seq,
      sku: item.sku,
    });
  }
}
