import { FakeEnrichmentClient } from '../../../../../test/fakes/fake-enrichment.client.js';

describe('Contrato do cliente de enriquecimento', () => {
  it('deve devolver a resposta configurada para o SKU', async () => {
    const cliente = new FakeEnrichmentClient();
    cliente.responderCom('sku-success', {
      sku: 'sku-success',
      price: 99.9,
      stock: 12,
    });

    await expect(cliente.enrich({ sku: 'sku-success' })).resolves.toEqual({
      sku: 'sku-success',
      price: 99.9,
      stock: 12,
    });
  });

  it('deve lançar o erro configurado para o SKU', async () => {
    const cliente = new FakeEnrichmentClient();
    const erro = new Error('Falha simulada');
    cliente.falharCom('sku-error', erro);

    await expect(cliente.enrich({ sku: 'sku-error' })).rejects.toBe(erro);
  });
});
