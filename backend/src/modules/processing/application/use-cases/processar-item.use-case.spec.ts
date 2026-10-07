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
    expect(cliente.chamadas).toEqual([
      { sku: 'sku-success', runId: 'run_success' },
    ]);
  });

  it('não deve reprocessar um item com SUCCESS', async () => {
    const repositorio = new FakeProcessItemRepository();
    const cliente = new FakeEnrichmentClient();
    const item = { runId: 'run_success', seq: 1, sku: 'sku-success' };
    await repositorio.registerIfNew(item);
    await repositorio.markProcessing(item.runId, item.seq);
    await repositorio.markSuccess({
      runId: item.runId,
      seq: item.seq,
      price: 99.9,
      stock: 12,
    });
    const processarItem = new ProcessarItemUseCase(repositorio, cliente);

    await expect(processarItem.execute(item)).rejects.toThrow(
      'Item com status SUCCESS não pode ser processado',
    );
    expect(cliente.chamadas).toHaveLength(0);
  });

  it('não deve reprocessar um item com ERROR definitivo', async () => {
    const repositorio = new FakeProcessItemRepository();
    const cliente = new FakeEnrichmentClient();
    const item = { runId: 'run_error', seq: 0, sku: 'sku-error' };
    await repositorio.registerIfNew(item);
    await repositorio.markProcessing(item.runId, item.seq);
    await repositorio.markError({
      runId: item.runId,
      seq: item.seq,
      errorCode: 'SKU_NOT_FOUND',
      errorMessage: 'SKU não encontrado para enriquecimento',
    });
    const processarItem = new ProcessarItemUseCase(repositorio, cliente);

    await expect(processarItem.execute(item)).rejects.toThrow(
      'Item com status ERROR não pode ser processado',
    );
    expect(cliente.chamadas).toHaveLength(0);
  });

  it('não deve criar nem processar um item inexistente', async () => {
    const repositorio = new FakeProcessItemRepository();
    const cliente = new FakeEnrichmentClient();
    const processarItem = new ProcessarItemUseCase(repositorio, cliente);

    await expect(
      processarItem.execute({
        runId: 'run_inexistente',
        seq: 0,
        sku: 'sku-inexistente',
      }),
    ).rejects.toThrow('Item de processamento não encontrado');
    expect(repositorio.itens).toHaveLength(0);
    expect(cliente.chamadas).toHaveLength(0);
  });
});
