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
      cid: 'cid_teste',
      total: 20,
      startedAt,
    });
  });

  it('deve registrar webhook e devolver cid e token', async () => {
    const cliente = new FakePlataformaExternaClient({
      runId: 'run_abc123',
      total: 1,
      startedAt: new Date('2026-10-07T13:20:54.872Z'),
    });
    cliente.definirRespostaDoRegistro({
      cid: 'cid_fake',
      token: 'token_fake',
    });

    await expect(
      cliente.registrar({
        name: 'Pessoa de Teste',
        webhook: 'https://webhook.example.test',
      }),
    ).resolves.toEqual({ cid: 'cid_fake', token: 'token_fake' });
    expect(cliente.registros).toEqual([
      {
        name: 'Pessoa de Teste',
        webhook: 'https://webhook.example.test',
      },
    ]);
  });
});
