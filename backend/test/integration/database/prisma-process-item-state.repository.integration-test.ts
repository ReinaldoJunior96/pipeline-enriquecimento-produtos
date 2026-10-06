import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { PrismaProcessItemRepository } from '../../../src/modules/processing/infrastructure/repositories/prisma-process-item.repository.js';

describe('Transições de estado do item no PostgreSQL', () => {
  const runId = 'run_item_state';
  let prisma: PrismaService;
  let repositorio: PrismaProcessItemRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repositorio = new PrismaProcessItemRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_item_state',
        total: 1,
        startedAt: new Date('2026-10-06T12:00:00.000Z'),
        items: { create: { seq: 0, sku: 'sku-state' } },
      },
    });
  });

  afterEach(async () => {
    await prisma.runItem.deleteMany({ where: { runId } });
    await prisma.run.deleteMany({ where: { runId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve passar de PENDING para PROCESSING e incrementar attempts', async () => {
    await repositorio.markProcessing(runId, 0);

    await expect(
      prisma.runItem.findUniqueOrThrow({
        where: { runId_seq: { runId, seq: 0 } },
      }),
    ).resolves.toEqual(
      expect.objectContaining({ status: 'PROCESSING', attempts: 1 }),
    );
  });

  it('deve passar de PROCESSING para SUCCESS com preço e estoque', async () => {
    await repositorio.markProcessing(runId, 0);
    await repositorio.markSuccess({
      runId,
      seq: 0,
      price: 99.9,
      stock: 12,
    });

    await expect(
      prisma.runItem.findUniqueOrThrow({
        where: { runId_seq: { runId, seq: 0 } },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'SUCCESS',
        attempts: 1,
        price: expect.objectContaining({ toString: expect.any(Function) }),
        stock: 12,
        errorCode: null,
        errorMessage: null,
      }),
    );
  });

  it('deve passar de PROCESSING para ERROR com código e mensagem', async () => {
    await repositorio.markProcessing(runId, 0);
    await repositorio.markError({
      runId,
      seq: 0,
      errorCode: 'UNAUTHORIZED',
      errorMessage: 'Credencial inválida para enriquecimento',
    });

    await expect(
      prisma.runItem.findUniqueOrThrow({
        where: { runId_seq: { runId, seq: 0 } },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'ERROR',
        attempts: 1,
        price: null,
        stock: null,
        errorCode: 'UNAUTHORIZED',
        errorMessage: 'Credencial inválida para enriquecimento',
      }),
    );
  });
});
