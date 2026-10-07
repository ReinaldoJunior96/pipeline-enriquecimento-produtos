import { ProcessarItemUseCase } from '../../application/use-cases/processar-item.use-case.js';
import { GarantirCallbackDaRunUseCase } from '../../application/use-cases/garantir-callback-da-run.use-case.js';
import { EnrichmentTransportError } from '../../domain/errors/enrichment.errors.js';
import { FakeCallbackQueue } from '../../../../../test/fakes/fake-callback.queue.js';
import { FakeProcessItemRepository } from '../../../../../test/fakes/fake-process-item.repository.js';
import { ProcessingWorker } from './processing.worker.js';

describe('ProcessingWorker com erro de transporte', () => {
  const item = { runId: 'run-network-worker', seq: 0, sku: 'sku-network' };

  function criarWorker(
    repositorio: FakeProcessItemRepository,
    falhasAntesDoSucesso: number,
  ) {
    let chamadas = 0;
    const cliente = {
      enrich: vi.fn(async () => {
        chamadas += 1;
        if (chamadas <= falhasAntesDoSucesso) {
          throw new EnrichmentTransportError();
        }
        return { sku: item.sku, price: 5, stock: 1 };
      }),
    };
    const callbackQueue = new FakeCallbackQueue();
    const garantirCallback = new GarantirCallbackDaRunUseCase(
      {
        findById: async (runId) => ({
          runId,
          cid: 'cid-test',
          total: 1,
          finishedCount: 1,
          callbackSent: false,
          status: 'PROCESSING',
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      callbackQueue,
    );
    const processarItem = new ProcessarItemUseCase(
      repositorio,
      cliente,
      garantirCallback,
    );
    return {
      worker: new ProcessingWorker(processarItem),
      cliente,
      callbackQueue,
    };
  }

  function criarJob(attemptsMade: number) {
    return {
      name: 'process-item',
      data: item,
      opts: { attempts: 3 },
      attemptsMade,
    } as never;
  }

  it('deve repetir erro de rede e concluir quando uma tentativa posterior funciona', async () => {
    const repositorio = new FakeProcessItemRepository();
    repositorio.definirTotalDaRun(item.runId, 1);
    await repositorio.registerIfNew(item);
    const { worker, cliente } = criarWorker(repositorio, 1);

    await expect(worker.process(criarJob(0))).rejects.toBeInstanceOf(
      EnrichmentTransportError,
    );
    await worker.process(criarJob(1));

    await expect(
      repositorio.findByRunIdAndSeq(item.runId, item.seq),
    ).resolves.toMatchObject({ status: 'SUCCESS', attempts: 2 });
    expect(cliente.enrich).toHaveBeenCalledTimes(2);
    expect(repositorio.finishedCountPorRun.get(item.runId)).toBe(1);
  });

  it('deve marcar ERROR e incrementar finished_count uma vez após três falhas de rede', async () => {
    const repositorio = new FakeProcessItemRepository();
    repositorio.definirTotalDaRun(item.runId, 1);
    await repositorio.registerIfNew(item);
    const { worker, cliente, callbackQueue } = criarWorker(repositorio, 3);

    await expect(worker.process(criarJob(0))).rejects.toBeInstanceOf(
      EnrichmentTransportError,
    );
    await expect(worker.process(criarJob(1))).rejects.toBeInstanceOf(
      EnrichmentTransportError,
    );
    await expect(worker.process(criarJob(2))).rejects.toBeInstanceOf(
      EnrichmentTransportError,
    );

    await expect(
      repositorio.findByRunIdAndSeq(item.runId, item.seq),
    ).resolves.toMatchObject({
      status: 'ERROR',
      attempts: 3,
      errorCode: 'RETRY_EXHAUSTED',
    });
    expect(cliente.enrich).toHaveBeenCalledTimes(3);
    expect(repositorio.finishedCountPorRun.get(item.runId)).toBe(1);
    expect(callbackQueue.runIds).toEqual([item.runId]);
  });
});
