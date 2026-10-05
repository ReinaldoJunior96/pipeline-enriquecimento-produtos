import { FakePlataformaExternaClient } from '../../../../../test/fakes/fake-plataforma-externa.client.js';
import { PlataformaExternaClient } from './plataforma-externa.client.js';

describe('Contrato do cliente da plataforma externa', () => {
  it('deve criar um lote sem depender de transporte HTTP', async () => {
    const startedAt = new Date('2026-10-05T20:00:00.000Z');
    const cliente: PlataformaExternaClient = new FakePlataformaExternaClient({
      runId: 'run_abc123',
      total: 20,
      startedAt,
    });

    const lote = await cliente.criarLote({
      cid: 'cid_teste',
      token: 'token_teste',
    });

    expect(lote).toEqual({
      runId: 'run_abc123',
      total: 20,
      startedAt,
    });
  });
});
