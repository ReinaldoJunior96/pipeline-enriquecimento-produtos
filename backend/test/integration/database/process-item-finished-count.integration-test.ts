import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { PrismaProcessItemRepository } from '../../../src/modules/processing/infrastructure/repositories/prisma-process-item.repository.js';

describe('Progresso dos itens finalizados no PostgreSQL', () => {
  let prisma: PrismaService;
  let repositorio: PrismaProcessItemRepository;
  let runId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repositorio = new PrismaProcessItemRepository(prisma);
  });

  beforeEach(async () => {
    runId = `run_finished_count_${crypto.randomUUID()}`;
    await prisma.run.create({
      data: {
        runId,
        cid: 'cid_finished_count_test',
        total: 20,
        startedAt: new Date('2026-10-07T12:00:00.000Z'),
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

  async function criarItem(seq: number): Promise<void> {
    await repositorio.registerIfNew({ runId, seq, sku: `sku-${seq}` });
    await repositorio.markProcessing(runId, seq);
  }

  async function obterFinishedCount(): Promise<number> {
    const run = await prisma.run.findUniqueOrThrow({ where: { runId } });
    return run.finishedCount;
  }

  it('deve incrementar uma vez quando o item termina SUCCESS', async () => {
    await criarItem(0);

    await repositorio.markSuccess({ runId, seq: 0, price: 10.5, stock: 3 });

    await expect(obterFinishedCount()).resolves.toBe(1);
  });

  it('deve incrementar uma vez quando o item termina ERROR', async () => {
    await criarItem(0);

    await repositorio.markError({
      runId,
      seq: 0,
      errorCode: 'SKU_NOT_FOUND',
      errorMessage: 'SKU não encontrado',
    });

    await expect(obterFinishedCount()).resolves.toBe(1);
  });

  it('não deve contar novamente um item SUCCESS já terminal', async () => {
    await criarItem(0);
    await repositorio.markSuccess({ runId, seq: 0, price: 10.5, stock: 3 });

    await expect(
      repositorio.markSuccess({ runId, seq: 0, price: 10.5, stock: 3 }),
    ).resolves.toBeNull();
    await expect(obterFinishedCount()).resolves.toBe(1);
  });

  it('não deve contar novamente um item ERROR já terminal', async () => {
    await criarItem(0);
    const erro = {
      runId,
      seq: 0,
      errorCode: 'SKU_NOT_FOUND',
      errorMessage: 'SKU não encontrado',
    };
    await repositorio.markError(erro);

    await expect(repositorio.markError(erro)).resolves.toBeNull();
    await expect(obterFinishedCount()).resolves.toBe(1);
  });

  it('não deve contar uma tentativa transitória antes do estado terminal', async () => {
    await criarItem(0);
    await repositorio.markProcessing(runId, 0);
    await expect(obterFinishedCount()).resolves.toBe(0);

    await repositorio.markSuccess({ runId, seq: 0, price: 10.5, stock: 3 });

    await expect(obterFinishedCount()).resolves.toBe(1);
  });

  it('deve contar corretamente dois itens que terminam concorrentemente', async () => {
    await criarItem(0);
    await criarItem(1);

    await Promise.all([
      repositorio.markSuccess({ runId, seq: 0, price: 10, stock: 1 }),
      repositorio.markError({
        runId,
        seq: 1,
        errorCode: 'SKU_NOT_FOUND',
        errorMessage: 'SKU não encontrado',
      }),
    ]);

    await expect(obterFinishedCount()).resolves.toBe(2);
  });

  it('deve contar 20 itens únicos finalizados', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, seq) => criarItem(seq)));

    await Promise.all(
      Array.from({ length: 20 }, (_, seq) =>
        repositorio.markSuccess({
          runId,
          seq,
          price: seq + 1,
          stock: seq,
        }),
      ),
    );

    await expect(obterFinishedCount()).resolves.toBe(20);
  });
});
