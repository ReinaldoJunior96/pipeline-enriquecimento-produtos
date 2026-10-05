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
});
