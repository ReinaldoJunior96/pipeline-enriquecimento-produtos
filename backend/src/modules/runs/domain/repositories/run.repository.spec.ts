import { FakeRunRepository } from '../../../../../test/fakes/fake-run.repository.js';
import { RunRepository } from './run.repository.js';

describe('Contrato do repositório de lotes', () => {
  it('deve persistir um lote com seu estado inicial', async () => {
    const repositorio: RunRepository = new FakeRunRepository();
    const startedAt = new Date('2026-10-05T20:00:00.000Z');

    const lote = await repositorio.create({
      runId: 'run_abc123',
      cid: 'cid_teste',
      total: 20,
      startedAt,
    });

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
  });

  it('deve informar quando um lote existe', async () => {
    const repositorio = new FakeRunRepository();

    await repositorio.create({
      runId: 'run_existente',
      cid: 'cid_teste',
      total: 1,
      startedAt: new Date('2026-10-07T12:00:00.000Z'),
    });

    await expect(repositorio.exists('run_existente')).resolves.toBe(true);
  });

  it('deve informar quando um lote não existe', async () => {
    const repositorio = new FakeRunRepository();

    await expect(repositorio.exists('run_inexistente')).resolves.toBe(false);
  });
});
