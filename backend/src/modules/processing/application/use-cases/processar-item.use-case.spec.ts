import { FakeEnrichmentClient } from '../../../../../test/fakes/fake-enrichment.client.js';
import { FakeProcessItemRepository } from '../../../../../test/fakes/fake-process-item.repository.js';
import { ProcessarItemUseCase } from './processar-item.use-case.js';

describe('Processar item', () => {
  it('deve enriquecer e marcar o item como SUCCESS', async () => {
    const repositorio = new FakeProcessItemRepository();
    const cliente = new FakeEnrichmentClient();
    const item = { runId: 'run_success', seq: 0, sku: 'sku-success' };
    await repositorio.registerIfNew(item);
    cliente.responderCom(item.sku, {
      sku: item.sku,
      price: 99.9,
      stock: 12,
    });
    const processarItem = new ProcessarItemUseCase(repositorio, cliente);

    await processarItem.execute(item);

    await expect(
      repositorio.findByRunIdAndSeq(item.runId, item.seq),
    ).resolves.toEqual({
      ...item,
      status: 'SUCCESS',
      attempts: 1,
      price: 99.9,
      stock: 12,
      errorCode: null,
      errorMessage: null,
    });
    expect(cliente.chamadas).toEqual([{ sku: 'sku-success' }]);
  });
});
