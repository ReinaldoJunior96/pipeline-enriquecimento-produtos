import { EnrichmentClient } from '../contracts/enrichment.client.js';
import {
  ProcessItemInput,
  ProcessItemRepository,
} from '../../domain/repositories/process-item.repository.js';

export class ProcessarItemUseCase {
  constructor(
    private readonly repositorio: ProcessItemRepository,
    private readonly cliente: EnrichmentClient,
  ) {}

  async execute(input: ProcessItemInput): Promise<void> {
    const item = await this.repositorio.findByRunIdAndSeq(
      input.runId,
      input.seq,
    );

    if (!item) {
      throw new Error('Item de processamento não encontrado');
    }

    const iniciou = await this.repositorio.markProcessing(
      input.runId,
      input.seq,
    );
    if (!iniciou) {
      throw new Error(`Item com status ${item.status} não pode ser processado`);
    }

    const resultado = await this.cliente.enrich({ sku: input.sku });
    const concluiu = await this.repositorio.markSuccess({
      runId: input.runId,
      seq: input.seq,
      price: resultado.price,
      stock: resultado.stock,
    });

    if (!concluiu) {
      throw new Error('Não foi possível concluir o processamento do item');
    }
  }
}
