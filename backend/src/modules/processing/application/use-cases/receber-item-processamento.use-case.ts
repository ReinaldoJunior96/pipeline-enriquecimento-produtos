import { Logger } from '@nestjs/common';
import { RunRepository } from '../../../runs/domain/repositories/run.repository.js';
import { PendingRunQueue } from '../queues/pending-run.queue.js';
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
  private readonly logger = new Logger(ReceberItemProcessamentoUseCase.name);

  constructor(
    private readonly repositorio: ProcessItemRepository,
    private readonly fila: ProcessingQueue,
    private readonly lotes: RunRepository,
    private readonly filaDeEspera: PendingRunQueue,
  ) {}

  async execute(
    input: ReceberItemProcessamentoInput,
  ): Promise<ItemProcessamentoAceito> {
    const item: ProcessItemInput = input;

    if (!(await this.lotes.exists(item.runId))) {
      this.logger.warn({ evento: 'process.run_ausente', ...item });
      await this.filaDeEspera.enqueue(item);
      this.logger.log({ evento: 'process.aguardando_run', ...item });
      return { status: 'accepted' };
    }

    const { created } = await this.repositorio.registerIfNew(item);

    if (!created) {
      return { status: 'accepted' };
    }

    await this.fila.enqueue(item);

    return { status: 'accepted' };
  }
}
