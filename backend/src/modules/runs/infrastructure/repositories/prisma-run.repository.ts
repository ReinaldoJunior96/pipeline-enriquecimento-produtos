import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { RunAlreadyExistsError } from '../../domain/errors/run-already-exists.error.js';
import {
  CreateRunInput,
  Run,
  RunRepository,
} from '../../domain/repositories/run.repository.js';

@Injectable()
export class PrismaRunRepository implements RunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(runId: string): Promise<boolean> {
    const run = await this.prisma.run.findUnique({
      where: { runId },
      select: { runId: true },
    });

    return run !== null;
  }

  async findById(runId: string): Promise<Run | null> {
    return this.prisma.run.findUnique({ where: { runId } });
  }

  async markCallbackSent(runId: string): Promise<boolean> {
    const run = await this.prisma.run.findUnique({
      where: { runId },
      select: { total: true },
    });
    if (!run) return false;

    const resultado = await this.prisma.run.updateMany({
      where: {
        runId,
        status: 'PROCESSING',
        callbackSent: false,
        finishedCount: run.total,
      },
      data: { callbackSent: true, status: 'COMPLETED' },
    });

    return resultado.count === 1;
  }

  async create(input: CreateRunInput): Promise<Run> {
    try {
      return await this.prisma.run.create({ data: input });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new RunAlreadyExistsError(input.runId);
      }
      throw error;
    }
  }
}
