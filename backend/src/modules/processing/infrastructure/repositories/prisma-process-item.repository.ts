import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  MarkProcessItemErrorInput,
  MarkProcessItemSuccessInput,
  ProcessItemFinalization,
  ProcessItem,
  ProcessItemInput,
  ProcessItemRepository,
} from '../../domain/repositories/process-item.repository.js';

@Injectable()
export class PrismaProcessItemRepository implements ProcessItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registerIfNew(item: ProcessItemInput): Promise<{ created: boolean }> {
    try {
      await this.prisma.runItem.create({ data: item });
      return { created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { created: false };
      }

      throw error;
    }
  }

  async findByRunIdAndSeq(
    runId: string,
    seq: number,
  ): Promise<ProcessItem | null> {
    const item = await this.prisma.runItem.findUnique({
      where: { runId_seq: { runId, seq } },
    });

    if (!item) return null;

    return {
      runId: item.runId,
      seq: item.seq,
      sku: item.sku,
      status: item.status,
      attempts: item.attempts,
      price: item.price?.toNumber() ?? null,
      stock: item.stock,
      errorCode: item.errorCode,
      errorMessage: item.errorMessage,
    };
  }

  async markProcessing(runId: string, seq: number): Promise<boolean> {
    const resultado = await this.prisma.runItem.updateMany({
      where: { runId, seq, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    return resultado.count === 1;
  }

  async markSuccess(
    input: MarkProcessItemSuccessInput,
  ): Promise<ProcessItemFinalization | null> {
    return this.finalizarItem(input.runId, input.seq, {
      status: 'SUCCESS',
      price: input.price,
      stock: input.stock,
      errorCode: null,
      errorMessage: null,
    });
  }

  async markError(
    input: MarkProcessItemErrorInput,
  ): Promise<ProcessItemFinalization | null> {
    return this.finalizarItem(input.runId, input.seq, {
      status: 'ERROR',
      price: null,
      stock: null,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
    });
  }

  private async finalizarItem(
    runId: string,
    seq: number,
    data: Prisma.RunItemUpdateManyMutationInput,
  ): Promise<ProcessItemFinalization | null> {
    return this.prisma.$transaction(async (transacao) => {
      const itemAtualizado = await transacao.runItem.updateMany({
        where: { runId, seq, status: 'PROCESSING' },
        data,
      });

      if (itemAtualizado.count === 0) return null;

      const run = await transacao.run.findUniqueOrThrow({
        where: { runId },
        select: { total: true },
      });

      const runAtualizada = await transacao.run.updateMany({
        where: { runId, finishedCount: { lt: run.total } },
        data: { finishedCount: { increment: 1 } },
      });

      if (runAtualizada.count !== 1) {
        throw new Error(
          `Contador de itens finalizados inconsistente para a run ${runId}`,
        );
      }

      const progresso = await transacao.run.findUniqueOrThrow({
        where: { runId },
        select: { finishedCount: true, total: true },
      });

      return {
        runId,
        finishedCount: progresso.finishedCount,
        total: progresso.total,
        completed: progresso.finishedCount === progresso.total,
      };
    });
  }
}
