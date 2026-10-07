import { FakeProcessItemRepository } from '../../../../../test/fakes/fake-process-item.repository.js';
import { FakeProcessingQueue } from '../../../../../test/fakes/fake-processing.queue.js';
import { FakeRunRepository } from '../../../../../test/fakes/fake-run.repository.js';
import { Logger } from '@nestjs/common';
import { RunNotAvailableError } from '../../domain/errors/run-not-available.error.js';
import { ProcessarItemAguardandoRunUseCase } from './processar-item-aguardando-run.use-case.js';

describe('Processar item aguardando lote', () => {
  const item = { runId: 'run_abc123', seq: 1, sku: 'sku-001' };

  it('deve registrar e enfileirar o item quando o lote estiver disponível', async () => {
    const lotes = new FakeRunRepository();
    const itens = new FakeProcessItemRepository();
    const fila = new FakeProcessingQueue();
    const casoDeUso = new ProcessarItemAguardandoRunUseCase(lotes, itens, fila);
    await lotes.create({
      runId: item.runId,
      cid: 'cid_teste',
      total: 1,
      startedAt: new Date('2026-10-07T12:00:00.000Z'),
    });

    await casoDeUso.execute(item, 2);

    expect(itens.itens).toEqual([item]);
    expect(fila.itens).toEqual([item]);
  });

  it('deve manter o item fora do pipeline enquanto o lote não existir', async () => {
    const lotes = new FakeRunRepository();
    const itens = new FakeProcessItemRepository();
    const fila = new FakeProcessingQueue();
    const casoDeUso = new ProcessarItemAguardandoRunUseCase(lotes, itens, fila);

    await expect(casoDeUso.execute(item, 1)).rejects.toBeInstanceOf(
      RunNotAvailableError,
    );
    expect(itens.itens).toHaveLength(0);
    expect(fila.itens).toHaveLength(0);
  });

  it('deve registrar a tentativa quando o lote ainda não estiver disponível', async () => {
    const lotes = new FakeRunRepository();
    const casoDeUso = new ProcessarItemAguardandoRunUseCase(
      lotes,
      new FakeProcessItemRepository(),
      new FakeProcessingQueue(),
    );
    const avisar = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(casoDeUso.execute(item, 4)).rejects.toBeInstanceOf(
      RunNotAvailableError,
    );

    expect(avisar).toHaveBeenCalledWith({
      evento: 'process.run_ausente',
      ...item,
      tentativa: 4,
    });
    avisar.mockRestore();
  });

  it('deve continuar idempotente quando o item já tiver sido registrado', async () => {
    const lotes = new FakeRunRepository();
    const itens = new FakeProcessItemRepository();
    const fila = new FakeProcessingQueue();
    const casoDeUso = new ProcessarItemAguardandoRunUseCase(lotes, itens, fila);
    await lotes.create({
      runId: item.runId,
      cid: 'cid_teste',
      total: 1,
      startedAt: new Date('2026-10-07T12:00:00.000Z'),
    });

    await casoDeUso.execute(item, 1);
    await casoDeUso.execute(item, 2);

    expect(itens.itens).toEqual([item]);
    expect(fila.itens).toEqual([item]);
  });

  it('deve reenfileirar item PENDING preexistente sem duplicá-lo', async () => {
    const lotes = new FakeRunRepository();
    const itens = new FakeProcessItemRepository();
    const fila = new FakeProcessingQueue();
    const casoDeUso = new ProcessarItemAguardandoRunUseCase(lotes, itens, fila);
    await lotes.create({
      runId: item.runId,
      cid: 'cid_teste',
      total: 1,
      startedAt: new Date('2026-10-07T12:00:00.000Z'),
    });
    await itens.registerIfNew(item);

    await casoDeUso.execute(item, 2);

    expect(itens.itens).toEqual([item]);
    expect(fila.itens).toEqual([item]);
  });

  it.each(['PROCESSING', 'SUCCESS', 'ERROR'] as const)(
    'não deve reenfileirar um item existente em estado %s',
    async (status) => {
      const lotes = new FakeRunRepository();
      const itens = new FakeProcessItemRepository();
      const fila = new FakeProcessingQueue();
      const casoDeUso = new ProcessarItemAguardandoRunUseCase(
        lotes,
        itens,
        fila,
      );
      await lotes.create({
        runId: item.runId,
        cid: 'cid_teste',
        total: 1,
        startedAt: new Date('2026-10-07T12:00:00.000Z'),
      });
      await itens.registerIfNew(item);

      if (status !== 'PENDING') {
        await itens.markProcessing(item.runId, item.seq);
      }
      if (status === 'SUCCESS') {
        await itens.markSuccess({
          runId: item.runId,
          seq: item.seq,
          price: 12.5,
          stock: 4,
        });
      }
      if (status === 'ERROR') {
        await itens.markError({
          runId: item.runId,
          seq: item.seq,
          errorCode: 'SKU_NOT_FOUND',
          errorMessage: 'SKU não encontrado',
        });
      }

      await casoDeUso.execute(item, 2);

      expect(fila.itens).toHaveLength(0);
      expect(itens.itens).toEqual([item]);
    },
  );
});
