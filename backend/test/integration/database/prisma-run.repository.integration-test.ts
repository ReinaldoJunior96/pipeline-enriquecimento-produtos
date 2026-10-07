import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { PrismaRunRepository } from '../../../src/modules/runs/infrastructure/repositories/prisma-run.repository.js';

describe('PrismaRunRepository', () => {
  const runId = 'run_repositorio_teste';
  let prisma: PrismaService;
  let repositorio: PrismaRunRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repositorio = new PrismaRunRepository(prisma);
  });

  afterEach(async () => {
    await prisma.run.deleteMany({ where: { runId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve persistir o lote no PostgreSQL com o estado inicial', async () => {
    const startedAt = new Date('2026-10-05T20:00:00.000Z');

    await repositorio.create({
      runId,
      cid: 'cid_teste',
      total: 20,
      startedAt,
    });

    const persistido = await prisma.run.findUniqueOrThrow({
      where: { runId },
    });

    expect(persistido).toEqual({
      runId,
      cid: 'cid_teste',
      total: 20,
      startedAt,
      status: 'PROCESSING',
      finishedCount: 0,
      callbackSent: false,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('deve consultar a existência do lote', async () => {
    await repositorio.create({
      runId,
      cid: 'cid_teste',
      total: 1,
      startedAt: new Date('2026-10-07T12:00:00.000Z'),
    });

    await expect(repositorio.exists(runId)).resolves.toBe(true);
    await expect(repositorio.exists('run_inexistente')).resolves.toBe(false);
  });
});
