import { Logger } from '@nestjs/common';
import { EnrichmentClient } from '../contracts/enrichment.client.js';
import {
  EnrichmentError,
  EnrichmentNotFoundError,
  EnrichmentUnauthorizedError,
} from '../../domain/errors/enrichment.errors.js';
import {
  ProcessItemInput,
  ProcessItemRepository,
} from '../../domain/repositories/process-item.repository.js';

export class ProcessarItemUseCase {
  private readonly logger = new Logger(ProcessarItemUseCase.name);

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

    const tentativa = item.attempts + 1;
    const iniciou = await this.repositorio.markProcessing(
      input.runId,
      input.seq,
    );
    if (!iniciou) {
      throw new Error(`Item com status ${item.status} não pode ser processado`);
    }

    const contexto = {
      runId: input.runId,
      seq: input.seq,
      sku: input.sku,
      tentativa,
    };
    this.logger.log({ evento: 'enriquecimento.iniciado', ...contexto });

    try {
      const resultado = await this.cliente.enrich({
        sku: input.sku,
        runId: input.runId,
      });
      const concluiu = await this.repositorio.markSuccess({
        runId: input.runId,
        seq: input.seq,
        price: resultado.price,
        stock: resultado.stock,
      });

      if (!concluiu) {
        throw new Error('Não foi possível concluir o processamento do item');
      }
      this.logger.log({
        evento: 'enriquecimento.finalizado',
        status: 'SUCCESS',
        ...contexto,
      });
    } catch (error) {
      if (
        error instanceof EnrichmentUnauthorizedError ||
        error instanceof EnrichmentNotFoundError
      ) {
        await this.repositorio.markError({
          runId: input.runId,
          seq: input.seq,
          errorCode: error.code,
          errorMessage: error.message,
        });
        this.logger.warn({
          evento: 'enriquecimento.finalizado',
          status: 'ERROR',
          errorCode: error.code,
          ...contexto,
        });
        return;
      }

      this.logger.warn({
        evento: 'enriquecimento.falha_transitoria',
        errorCode: error instanceof EnrichmentError ? error.code : 'UNEXPECTED',
        ...contexto,
      });

      throw error;
    }
  }

  async marcarTentativasEsgotadas(input: ProcessItemInput): Promise<void> {
    const marcou = await this.repositorio.markError({
      runId: input.runId,
      seq: input.seq,
      errorCode: 'RETRY_EXHAUSTED',
      errorMessage: 'Tentativas de enriquecimento esgotadas',
    });

    if (!marcou) {
      throw new Error('Não foi possível marcar as tentativas como esgotadas');
    }

    this.logger.error({
      evento: 'enriquecimento.finalizado',
      status: 'ERROR',
      errorCode: 'RETRY_EXHAUSTED',
      runId: input.runId,
      seq: input.seq,
      sku: input.sku,
    });
  }
}
