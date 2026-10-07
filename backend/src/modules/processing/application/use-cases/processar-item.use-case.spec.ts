import { FakeEnrichmentClient } from '../../../../../test/fakes/fake-enrichment.client.js';
import { FakeProcessItemRepository } from '../../../../../test/fakes/fake-process-item.repository.js';
import { ProcessarItemUseCase } from './processar-item.use-case.js';
import { FakeCallbackQueue } from '../../../../../test/fakes/fake-callback.queue.js';
import { EnrichmentNotFoundError } from '../../domain/errors/enrichment.errors.js';

describe('Processar item', () => {
  it('deve agendar callback uma vez quando o item terminal conclui a run', async () => {
    const repositorio = new FakeProcessItemRepository();
    const cliente = new FakeEnrichmentClient();
    const callbackQueue = new FakeCallbackQueue();
    const item = { runId: 'run_callback_final', seq: 0, sku: 'sku-final' };
    await repositorio.registerIfNew(item);
    cliente.responderCom(item.sku, {
      sku: item.sku,
      price: 9.99,
      stock: 1,
    });
    const processarItem = new ProcessarItemUseCase(
      repositorio,
      cliente,
      callbackQueue,
    );

    await processarItem.execute(item);
    await expect(processarItem.execute(item)).rejects.toThrow(
      'Item com status SUCCESS não pode ser processado',
    );

    expect(callbackQueue.runIds).toEqual(['run_callback_final']);
  });

  it('deve agendar callback após todos os itens terminarem, inclusive com ERROR', async () => {
    const repositorio = new FakeProcessItemRepository();
    const cliente = new FakeEnrichmentClient();
    const callbackQueue = new FakeCallbackQueue();
    const sucesso = { runId: 'run_callback_error_item', seq: 0, sku: 'sku-ok' };
    const erro = { runId: 'run_callback_error_item', seq: 1, sku: 'sku-falha' };
    await repositorio.registerIfNew(sucesso);
    await repositorio.registerIfNew(erro);
    cliente.responderCom(sucesso.sku, {
      sku: sucesso.sku,
      price: 5,
      stock: 2,
    });
    cliente.falharCom(erro.sku, new EnrichmentNotFoundError());
    const processarItem = new ProcessarItemUseCase(
      repositorio,
      cliente,
      callbackQueue,
    );

    await processarItem.execute(sucesso);
    expect(callbackQueue.runIds).toEqual([]);
    await processarItem.execute(erro);

    expect(callbackQueue.runIds).toEqual(['run_callback_error_item']);
    expect(repositorio.finishedCountPorRun.get(sucesso.runId)).toBe(2);
  });

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
