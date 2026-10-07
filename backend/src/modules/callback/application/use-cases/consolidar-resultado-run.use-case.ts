import { Logger } from '@nestjs/common';
import { ProcessItemRepository } from '../../../processing/domain/repositories/process-item.repository.js';
import { RunRepository } from '../../../runs/domain/repositories/run.repository.js';

export interface CallbackRunResultItem {
  seq: number;
  sku: string;
  price: number;
  stock: number;
}

export interface CallbackRunPayload {
  cid: string;
  run_id: string;
  result: CallbackRunResultItem[];
}

export class ConsolidarResultadoRunUseCase {
  private readonly logger = new Logger(ConsolidarResultadoRunUseCase.name);

  constructor(
    private readonly runs: RunRepository,
    private readonly processItems: ProcessItemRepository,
  ) {}

  async execute(runId: string): Promise<CallbackRunPayload> {
    const run = await this.runs.findById(runId);
    if (!run) throw new Error(`Run ${runId} não encontrada`);

    if (run.finishedCount > run.total) {
      this.logger.error({
        evento: 'run.finished_count_inconsistente',
        runId,
        finishedCount: run.finishedCount,
        total: run.total,
      });
      throw new Error(
        `Contador de itens finalizados inconsistente para a run ${runId}`,
      );
    }

    const itens = await this.processItems.findAllByRunId(runId);
    const terminais = itens.filter(
      (item) => item.status === 'SUCCESS' || item.status === 'ERROR',
    );
    if (run.finishedCount !== run.total || terminais.length !== run.total) {
      throw new Error('A run ainda não está pronta para callback');
    }

    const result = itens
      .filter((item) => item.status === 'SUCCESS')
      .sort((a, b) => a.seq - b.seq)
      .map((item) => {
        if (item.price === null || item.stock === null) {
          throw new Error(
            `Item SUCCESS sem resultado completo na run ${runId}`,
          );
        }
        return {
          seq: item.seq,
          sku: item.sku,
          price: item.price,
          stock: item.stock,
        };
      });

    this.logger.log({
      evento: 'callback.consolidado',
      runId,
      cid: run.cid,
      resultCount: result.length,
    });

    return { cid: run.cid, run_id: run.runId, result };
  }
}
