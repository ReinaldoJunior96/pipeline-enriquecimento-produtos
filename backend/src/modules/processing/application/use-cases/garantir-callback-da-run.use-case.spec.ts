import { GarantirCallbackDaRunUseCase } from './garantir-callback-da-run.use-case.js';

describe('Garantir callback da run', () => {
  const runId = 'run-callback-recovery';

  function criarCenario({
    finishedCount = 1,
    total = 1,
    callbackSent = false,
  }: {
    finishedCount?: number;
    total?: number;
    callbackSent?: boolean;
  } = {}) {
    const runs = {
      findById: vi.fn(async () => ({
        runId,
        cid: 'cid-test',
        total,
        finishedCount,
        callbackSent,
        status: 'PROCESSING' as const,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };
    const callbackQueue = { enqueue: vi.fn(async () => undefined) };
    return {
      runs,
      callbackQueue,
      garantir: new GarantirCallbackDaRunUseCase(
        runs as never,
        callbackQueue,
      ),
    };
  }

  it('deve agendar callback quando todos os itens terminaram', async () => {
    const { garantir, callbackQueue } = criarCenario();

    await garantir.execute(runId);

    expect(callbackQueue.enqueue).toHaveBeenCalledWith(runId);
  });

  it('não deve agendar callback enquanto houver itens pendentes', async () => {
    const { garantir, callbackQueue } = criarCenario({
      finishedCount: 0,
      total: 1,
    });

    await garantir.execute(runId);

    expect(callbackQueue.enqueue).not.toHaveBeenCalled();
  });

  it('não deve agendar callback novamente depois da confirmação externa', async () => {
    const { garantir, callbackQueue } = criarCenario({ callbackSent: true });

    await garantir.execute(runId);

    expect(callbackQueue.enqueue).not.toHaveBeenCalled();
  });

  it('deve propagar falha de enqueue para permitir retry do job de processamento', async () => {
    const { garantir, callbackQueue } = criarCenario();
    callbackQueue.enqueue.mockRejectedValueOnce(new Error('Redis indisponível'));

    await expect(garantir.execute(runId)).rejects.toThrow('Redis indisponível');
  });

  it('deve rejeitar contador acima do total', async () => {
    const { garantir, callbackQueue } = criarCenario({
      finishedCount: 2,
      total: 1,
    });

    await expect(garantir.execute(runId)).rejects.toThrow(
      'Contador de itens finalizados inconsistente',
    );
    expect(callbackQueue.enqueue).not.toHaveBeenCalled();
  });
});
