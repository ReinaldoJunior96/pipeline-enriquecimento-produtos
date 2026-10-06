import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
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
}
