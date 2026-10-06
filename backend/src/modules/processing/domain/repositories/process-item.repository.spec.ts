import { FakeProcessItemRepository } from '../../../../../test/fakes/fake-process-item.repository.js';
import { ProcessItemRepository } from './process-item.repository.js';

describe('Contrato do repositório de itens de processamento', () => {
  const item = {
    runId: 'run_abc123',
    seq: 0,
    sku: 'sku-001',
  };

  it('deve registrar somente uma vez o mesmo runId e seq', async () => {
    const repositorio: ProcessItemRepository = new FakeProcessItemRepository();

    await expect(repositorio.registerIfNew(item)).resolves.toEqual({
      created: true,
    });
    await expect(repositorio.registerIfNew(item)).resolves.toEqual({
      created: false,
    });
  });
});
