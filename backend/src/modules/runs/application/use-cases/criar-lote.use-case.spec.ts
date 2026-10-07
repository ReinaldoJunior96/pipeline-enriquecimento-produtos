import { FakePlataformaExternaClient } from '../../../../../test/fakes/fake-plataforma-externa.client.js';
import { FakeRunRepository } from '../../../../../test/fakes/fake-run.repository.js';
import { CriarLoteUseCase } from './criar-lote.use-case.js';

describe('Criar lote', () => {
  it('deve solicitar a criação externa e persistir o lote', async () => {
    const startedAt = new Date('2026-10-05T20:00:00.000Z');
    const cliente = new FakePlataformaExternaClient({
      runId: 'run_abc123',
      total: 20,
      startedAt,
    });
    const repositorio = new FakeRunRepository();
    const criarLote = new CriarLoteUseCase(cliente, repositorio);

    const lote = await criarLote.execute({
      cid: 'cid_teste',
      token: 'token_teste',
    });

    expect(cliente.chamadas).toEqual([
      {
        cid: 'cid_teste',
        token: 'token_teste',
      },
    ]);
    expect(lote).toEqual({
      runId: 'run_abc123',
      cid: 'cid_teste',
      total: 20,
      startedAt,
      status: 'PROCESSING',
      finishedCount: 0,
      callbackSent: false,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(repositorio.runs).toEqual([lote]);
  });

  it('deve persistir o cid retornado junto com o lote externo', async () => {
    const cliente = new FakePlataformaExternaClient({
      runId: 'run_cid_externo',
      cid: 'cid_retornado',
      total: 2,
      startedAt: new Date('2026-10-07T13:20:54.872Z'),
    });
    const repositorio = new FakeRunRepository();
    const criarLote = new CriarLoteUseCase(cliente, repositorio);

    const lote = await criarLote.execute({
      cid: 'cid_solicitado',
      token: 'token_teste',
    });

    expect(lote.cid).toBe('cid_retornado');
    expect(repositorio.runs[0].cid).toBe('cid_retornado');
  });

  it('não deve persistir a run se a criação externa falhar', async () => {
    const cliente = new FakePlataformaExternaClient({
      runId: 'run_falha_externa',
      total: 1,
      startedAt: new Date('2026-10-07T13:20:54.872Z'),
    });
    cliente.falharBurstCom(new Error('falha externa'));
    const repositorio = new FakeRunRepository();
    const criarLote = new CriarLoteUseCase(cliente, repositorio);

    await expect(
      criarLote.execute({ cid: 'cid_teste', token: 'token_teste' }),
    ).rejects.toThrow('falha externa');
    expect(repositorio.runs).toHaveLength(0);
  });

  it('deve propagar falha de persistência após o burst externo', async () => {
    const cliente = new FakePlataformaExternaClient({
      runId: 'run_falha_persistencia',
      total: 1,
      startedAt: new Date('2026-10-07T13:20:54.872Z'),
    });
    const repositorio = {
      create: vi.fn().mockRejectedValue(new Error('falha no banco')),
      exists: vi.fn(),
    };
    const criarLote = new CriarLoteUseCase(cliente, repositorio);

    await expect(
      criarLote.execute({ cid: 'cid_teste', token: 'token_teste' }),
    ).rejects.toThrow('falha no banco');
    expect(repositorio.create).toHaveBeenCalledOnce();
  });
});
