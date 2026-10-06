import { ProcessItemInput } from '../../domain/repositories/process-item.repository.js';

export interface ProcessingQueue {
  enqueue(item: ProcessItemInput): Promise<void>;
}

export const PROCESSING_QUEUE = Symbol('PROCESSING_QUEUE');
