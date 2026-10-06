export interface ProcessItemInput {
  runId: string;
  seq: number;
  sku: string;
}

export type ProcessItemStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export interface ProcessItem extends ProcessItemInput {
  status: ProcessItemStatus;
  attempts: number;
  price: number | null;
  stock: number | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface MarkProcessItemSuccessInput {
  runId: string;
  seq: number;
  price: number;
  stock: number;
}

export interface MarkProcessItemErrorInput {
  runId: string;
  seq: number;
  errorCode: string;
  errorMessage: string;
}

export interface ProcessItemRepository {
  registerIfNew(item: ProcessItemInput): Promise<{ created: boolean }>;
  findByRunIdAndSeq(runId: string, seq: number): Promise<ProcessItem | null>;
  markProcessing(runId: string, seq: number): Promise<boolean>;
  markSuccess(input: MarkProcessItemSuccessInput): Promise<boolean>;
  markError(input: MarkProcessItemErrorInput): Promise<boolean>;
}

export const PROCESS_ITEM_REPOSITORY = Symbol('PROCESS_ITEM_REPOSITORY');
