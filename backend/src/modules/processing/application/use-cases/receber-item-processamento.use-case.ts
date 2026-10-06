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
    const itemJaRegistrado = await this.repositorio.exists(
      input.runId,
      input.seq,
    );

    if (itemJaRegistrado) {
      return { status: 'accepted' };
    }

    const item: ProcessItemInput = input;

    await this.repositorio.register(item);
    await this.fila.enqueue(item);

    return { status: 'accepted' };
  }
}
