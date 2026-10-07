import { Logger } from '@nestjs/common';
import { RunRepository } from '../../../runs/domain/repositories/run.repository.js';
import { RunNotAvailableError } from '../../domain/errors/run-not-available.error.js';
import { ProcessItemRepository } from '../../domain/repositories/process-item.repository.js';
import { PendingRunInput } from '../queues/pending-run.queue.js';
import { ProcessingQueue } from '../queues/processing.queue.js';

export class ProcessarItemAguardandoRunUseCase {
  private readonly logger = new Logger(ProcessarItemAguardandoRunUseCase.name);

  constructor(
    private readonly lotes: RunRepository,
    private readonly itens: ProcessItemRepository,
    private readonly fila: ProcessingQueue,
  ) {}

  async execute(input: PendingRunInput, tentativa: number): Promise<void> {
    if (!(await this.lotes.exists(input.runId))) {
      this.logger.warn({
        evento: 'process.run_ausente',
        ...input,
        tentativa,
      });
      throw new RunNotAvailableError(input.runId);
    }

    this.logger.log({
      evento: 'process.run_disponivel',
      ...input,
      tentativa,
    });

    const { created } = await this.itens.registerIfNew(input);
    if (!created) {
      const existente = await this.itens.findByRunIdAndSeq(
        input.runId,
        input.seq,
      );

      if (existente?.status === 'PENDING') {
        await this.fila.enqueue(input);
      }
      return;
    }

    await this.fila.enqueue(input);
    this.logger.log({
      evento: 'process.reprocessado',
      ...input,
      tentativa,
    });
  }
}
