import { FakeProcessItemRepository } from '../../../../../test/fakes/fake-process-item.repository.js';
import { ProcessItemRepository } from './process-item.repository.js';

describe('Contrato do repositório de itens de processamento', () => {
  const item = {
    runId: 'run_abc123',
    seq: 0,
    sku: 'sku-001',
  };

  it('deve identificar um item já registrado pelo runId e seq', async () => {
    const repositorio: ProcessItemRepository = new FakeProcessItemRepository();

    expect(await repositorio.exists(item.runId, item.seq)).toBe(false);

    await repositorio.register(item);

    expect(await repositorio.exists(item.runId, item.seq)).toBe(true);
    expect(await repositorio.exists(item.runId, 1)).toBe(false);
  });
});
