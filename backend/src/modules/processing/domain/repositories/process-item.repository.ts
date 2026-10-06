export interface ProcessItemInput {
  runId: string;
  seq: number;
  sku: string;
}

export interface ProcessItemRepository {
  registerIfNew(item: ProcessItemInput): Promise<{ created: boolean }>;
}

export const PROCESS_ITEM_REPOSITORY = Symbol('PROCESS_ITEM_REPOSITORY');
