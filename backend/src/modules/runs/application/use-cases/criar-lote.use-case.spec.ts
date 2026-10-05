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
});
