import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { CriarLoteUseCase } from '../../../src/modules/runs/application/use-cases/criar-lote.use-case.js';
import { FakePlatformAuthContextStore } from '../../fakes/fake-platform-auth-context.store.js';
import { PrismaRunRepository } from '../../../src/modules/runs/infrastructure/repositories/prisma-run.repository.js';
import { FakePlataformaExternaClient } from '../../fakes/fake-plataforma-externa.client.js';

describe('Fluxo mockado de criação de lote', () => {
  const runId = 'run_fluxo_mock_teste';
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterEach(async () => {
    await prisma.run.deleteMany({ where: { runId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve criar o lote pelo cliente fake e persistir no PostgreSQL', async () => {
    const startedAt = new Date('2026-10-05T20:00:00.000Z');
    const cliente = new FakePlataformaExternaClient({
      runId,
      total: 20,
      startedAt,
    });
    const repositorio = new PrismaRunRepository(prisma);
    const criarLote = new CriarLoteUseCase(
      cliente,
      repositorio,
      new FakePlatformAuthContextStore(),
    );

    const lote = await criarLote.execute({
      cid: 'cid_teste',
      token: 'token_teste',
    });
    const persistido = await prisma.run.findUniqueOrThrow({
      where: { runId },
    });

    expect(cliente.chamadas).toEqual([
      {
        cid: 'cid_teste',
        token: 'token_teste',
      },
    ]);
    expect(lote).toEqual(persistido);
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
});
