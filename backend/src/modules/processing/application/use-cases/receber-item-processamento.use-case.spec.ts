import { FakePendingRunQueue } from '../../../../../test/fakes/fake-pending-run.queue.js';
import { FakeProcessItemRepository } from '../../../../../test/fakes/fake-process-item.repository.js';
import { FakeProcessingQueue } from '../../../../../test/fakes/fake-processing.queue.js';
import { FakeRunRepository } from '../../../../../test/fakes/fake-run.repository.js';
import { ReceberItemProcessamentoUseCase } from './receber-item-processamento.use-case.js';

describe('Receber item para processamento', () => {
  const item = {
    runId: 'run_abc123',
    seq: 0,
    sku: 'sku-001',
  };

  async function criarCenario(runExiste: boolean) {
    const repositorio = new FakeProcessItemRepository();
    const fila = new FakeProcessingQueue();
    const lotes = new FakeRunRepository();
    const filaDeEspera = new FakePendingRunQueue();

    if (runExiste) {
      await lotes.create({
        runId: item.runId,
        cid: 'cid_teste',
        total: 1,
        startedAt: new Date('2026-10-07T12:00:00.000Z'),
      });
    }

    const receberItem = new ReceberItemProcessamentoUseCase(
      repositorio,
      fila,
      lotes,
      filaDeEspera,
    );

    return { repositorio, fila, filaDeEspera, receberItem };
  }

  it('deve registrar e enfileirar um item novo quando o lote existe', async () => {
    const { repositorio, fila, filaDeEspera, receberItem } =
      await criarCenario(true);

    const resultado = await receberItem.execute(item);

    expect(resultado).toEqual({ status: 'accepted' });
    expect(repositorio.itens).toEqual([item]);
    expect(fila.itens).toEqual([item]);
    expect(filaDeEspera.itens).toHaveLength(0);
  });

  it('deve aguardar sem registrar nem processar quando o lote não existe', async () => {
    const { repositorio, fila, filaDeEspera, receberItem } =
      await criarCenario(false);

    const resultado = await receberItem.execute(item);

    expect(resultado).toEqual({ status: 'accepted' });
    expect(repositorio.itens).toHaveLength(0);
    expect(fila.itens).toHaveLength(0);
    expect(filaDeEspera.itens).toEqual([item]);
  });

  it('deve manter a idempotência quando o lote existe e o item é duplicado', async () => {
    const { repositorio, fila, filaDeEspera, receberItem } =
      await criarCenario(true);

    await receberItem.execute(item);
    const resultado = await receberItem.execute(item);

    expect(resultado).toEqual({ status: 'accepted' });
    expect(repositorio.itens).toEqual([item]);
    expect(fila.itens).toEqual([item]);
    expect(filaDeEspera.itens).toHaveLength(0);
  });
});
