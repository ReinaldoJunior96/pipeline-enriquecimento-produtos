import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  MarkProcessItemErrorInput,
  MarkProcessItemSuccessInput,
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

  async markSuccess(input: MarkProcessItemSuccessInput): Promise<boolean> {
    const resultado = await this.prisma.runItem.updateMany({
      where: { runId: input.runId, seq: input.seq, status: 'PROCESSING' },
      data: {
        status: 'SUCCESS',
        price: input.price,
        stock: input.stock,
        errorCode: null,
        errorMessage: null,
      },
    });

    return resultado.count === 1;
  }

  async markError(input: MarkProcessItemErrorInput): Promise<boolean> {
    const resultado = await this.prisma.runItem.updateMany({
      where: { runId: input.runId, seq: input.seq, status: 'PROCESSING' },
      data: {
        status: 'ERROR',
        price: null,
        stock: null,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
      },
    });

    return resultado.count === 1;
  }
}
