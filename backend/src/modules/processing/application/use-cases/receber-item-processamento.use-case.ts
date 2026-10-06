import { ProcessingQueue } from '../queues/processing.queue.js';
import {
  ProcessItemInput,
  ProcessItemRepository,
} from '../../domain/repositories/process-item.repository.js';

export interface ReceberItemProcessamentoInput {
  runId: string;
  seq: number;
  sku: string;
}

export interface ItemProcessamentoAceito {
  status: 'accepted';
}

export class ReceberItemProcessamentoUseCase {
  constructor(
    private readonly repositorio: ProcessItemRepository,
    private readonly fila: ProcessingQueue,
  ) {}

  async execute(
    input: ReceberItemProcessamentoInput,
  ): Promise<ItemProcessamentoAceito> {
    const item: ProcessItemInput = input;
    const { created } = await this.repositorio.registerIfNew(item);

    if (!created) {
      return { status: 'accepted' };
    }

    await this.fila.enqueue(item);

    return { status: 'accepted' };
  }
}
