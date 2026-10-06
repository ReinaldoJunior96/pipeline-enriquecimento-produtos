import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { PrismaProcessItemRepository } from '../../../src/modules/processing/infrastructure/repositories/prisma-process-item.repository.js';

describe('PrismaProcessItemRepository', () => {
  const runId = 'run_abc123';
  const item = { runId, seq: 0, sku: 'sku-001' };
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
        cid: 'cid_teste',
        total: 1,
        startedAt: new Date('2026-10-06T12:00:00.000Z'),
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

  it('deve persistir um item novo com seu estado inicial', async () => {
    await expect(repositorio.registerIfNew(item)).resolves.toEqual({
      created: true,
    });

    const persistido = await prisma.runItem.findUniqueOrThrow({
      where: { runId_seq: { runId, seq: item.seq } },
    });

    expect(persistido).toEqual({
      id: expect.any(Number),
      runId,
      seq: 0,
      sku: 'sku-001',
      price: null,
      stock: null,
      status: 'PENDING',
      attempts: 0,
      errorCode: null,
      errorMessage: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('deve tratar a restrição de unicidade como item duplicado', async () => {
    await expect(repositorio.registerIfNew(item)).resolves.toEqual({
      created: true,
    });
    await expect(repositorio.registerIfNew(item)).resolves.toEqual({
      created: false,
    });

    await expect(
      prisma.runItem.count({ where: { runId, seq: item.seq } }),
    ).resolves.toBe(1);
  });
});
