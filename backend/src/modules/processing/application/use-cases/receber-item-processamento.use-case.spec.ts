import { FakeProcessItemRepository } from '../../../../../test/fakes/fake-process-item.repository.js';
import { FakeProcessingQueue } from '../../../../../test/fakes/fake-processing.queue.js';
import { ReceberItemProcessamentoUseCase } from './receber-item-processamento.use-case.js';

describe('Receber item para processamento', () => {
  const item = {
    runId: 'run_abc123',
    seq: 0,
    sku: 'sku-001',
  };

  it('deve registrar e enfileirar um item novo uma única vez', async () => {
    const repositorio = new FakeProcessItemRepository();
    const fila = new FakeProcessingQueue();
    const receberItem = new ReceberItemProcessamentoUseCase(repositorio, fila);

    const resultado = await receberItem.execute(item);

    expect(resultado).toEqual({ status: 'accepted' });
    expect(repositorio.itens).toEqual([item]);
    expect(fila.itens).toEqual([item]);
  });

  it('não deve registrar novamente um item duplicado', async () => {
    const repositorio = new FakeProcessItemRepository();
    const fila = new FakeProcessingQueue();
    const receberItem = new ReceberItemProcessamentoUseCase(repositorio, fila);

    await receberItem.execute(item);
    const resultado = await receberItem.execute(item);

    expect(resultado).toEqual({ status: 'accepted' });
    expect(repositorio.itens).toEqual([item]);
  });

  it('não deve enfileirar novamente um item duplicado', async () => {
    const repositorio = new FakeProcessItemRepository();
    const fila = new FakeProcessingQueue();
    const receberItem = new ReceberItemProcessamentoUseCase(repositorio, fila);

    await receberItem.execute(item);
    const resultado = await receberItem.execute(item);

    expect(resultado).toEqual({ status: 'accepted' });
    expect(fila.itens).toEqual([item]);
  });
});
