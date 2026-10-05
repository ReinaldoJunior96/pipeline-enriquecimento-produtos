import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  CreateRunInput,
  Run,
  RunRepository,
} from '../../domain/repositories/run.repository.js';

@Injectable()
export class PrismaRunRepository implements RunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRunInput): Promise<Run> {
    return this.prisma.run.create({ data: input });
  }
}
