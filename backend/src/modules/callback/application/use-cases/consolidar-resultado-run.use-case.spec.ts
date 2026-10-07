import { ProcessItem } from '../../../processing/domain/repositories/process-item.repository.js';
import { Run } from '../../../runs/domain/repositories/run.repository.js';
import { ConsolidarResultadoRunUseCase } from './consolidar-resultado-run.use-case.js';

describe('ConsolidarResultadoRunUseCase', () => {
  const run: Run = {
    runId: 'run-consolidar',
    cid: 'cid-run',
    total: 3,
    startedAt: new Date('2026-10-07T12:00:00.000Z'),
    status: 'PROCESSING',
    finishedCount: 3,
    callbackSent: false,
    createdAt: new Date('2026-10-07T12:00:00.000Z'),
    updatedAt: new Date('2026-10-07T12:00:00.000Z'),
  };

  it('deve ordenar por seq, incluir somente SUCCESS e preservar os valores', async () => {
    const itens: ProcessItem[] = [
      {
        runId: run.runId,
        seq: 2,
        sku: 'sku-2',
        status: 'SUCCESS',
        attempts: 1,
        price: 22.25,
        stock: 4,
        errorCode: null,
        errorMessage: null,
      },
      {
        runId: run.runId,
        seq: 1,
        sku: 'sku-1',
        status: 'ERROR',
        attempts: 3,
        price: null,
        stock: null,
        errorCode: 'SKU_NOT_FOUND',
        errorMessage: 'SKU ausente',
      },
      {
        runId: run.runId,
        seq: 0,
        sku: 'sku-0',
        status: 'SUCCESS',
        attempts: 1,
        price: 10.5,
        stock: 8,
        errorCode: null,
        errorMessage: null,
      },
    ];
    const runs = { findById: vi.fn().mockResolvedValue(run) };
    const processItems = {
      findAllByRunId: vi.fn().mockResolvedValue(itens),
    };
    const useCase = new ConsolidarResultadoRunUseCase(
      runs as never,
      processItems as never,
    );

    await expect(useCase.execute(run.runId)).resolves.toEqual({
      cid: 'cid-run',
      run_id: 'run-consolidar',
      result: [
        { seq: 0, sku: 'sku-0', price: 10.5, stock: 8 },
        { seq: 2, sku: 'sku-2', price: 22.25, stock: 4 },
      ],
    });
  });

  it('não deve consolidar enquanto nem todos os itens estiverem terminais', async () => {
    const runs = {
      findById: vi.fn().mockResolvedValue({ ...run, finishedCount: 2 }),
    };
    const processItems = {
      findAllByRunId: vi.fn().mockResolvedValue([]),
    };
    const useCase = new ConsolidarResultadoRunUseCase(
      runs as never,
      processItems as never,
    );

    await expect(useCase.execute(run.runId)).rejects.toThrow(
      'A run ainda não está pronta para callback',
    );
  });
});
