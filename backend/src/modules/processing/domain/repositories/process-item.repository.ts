export interface ProcessItemInput {
  runId: string;
  seq: number;
  sku: string;
}

export interface ProcessItemRepository {
  exists(runId: string, seq: number): Promise<boolean>;
  register(item: ProcessItemInput): Promise<void>;
}

export const PROCESS_ITEM_REPOSITORY = Symbol('PROCESS_ITEM_REPOSITORY');
