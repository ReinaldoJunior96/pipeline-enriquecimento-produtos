import { FakePlatformAuthContextStore } from '../../../../../test/fakes/fake-platform-auth-context.store.js';
import { CallbackOutcomeUnknownError } from '../../domain/errors/callback.errors.js';
import { EnviarCallbackRunUseCase } from './enviar-callback-run.use-case.js';

describe('EnviarCallbackRunUseCase', () => {
  const run = {
    runId: 'run-callback-use-case',
    cid: 'cid-callback',
    total: 1,
    startedAt: new Date('2026-10-07T12:00:00.000Z'),
    status: 'PROCESSING',
    finishedCount: 1,
    callbackSent: false,
    createdAt: new Date('2026-10-07T12:00:00.000Z'),
    updatedAt: new Date('2026-10-07T12:00:00.000Z'),
  } as const;
  const payload = {
    cid: run.cid,
    run_id: run.runId,
    result: [{ seq: 0, sku: 'sku-1', price: 10.5, stock: 2 }],
  };

  function criarDependencias(
    opcoes: {
      callbackSent?: boolean;
      cidAutenticacao?: string;
      enviar?: () => Promise<void>;
    } = {},
  ) {
    const eventos: string[] = [];
    const runs = {
      findById: vi.fn(async () => ({
        ...run,
        callbackSent: opcoes.callbackSent ?? false,
      })),
      markCallbackSent: vi.fn(async () => {
        eventos.push('run.completada');
        return true;
      }),
    };
    const items = { findAllByRunId: vi.fn(async () => []) };
    const auth = new FakePlatformAuthContextStore();
    const credencial = {
      cid: opcoes.cidAutenticacao ?? run.cid,
      token: 'token-nao-logar',
    };
    void auth.saveForRun({ runId: run.runId, ...credencial });
    const client = {
      sendCallback: vi.fn(async () => {
        eventos.push('callback.enviado');
        await opcoes.enviar?.();
      }),
    };
    const consolidar = {
      execute: vi.fn(async () => payload),
    };
    const authStore = {
      getForRun: vi.fn((runId: string) => auth.getForRun(runId)),
      deleteForRun: vi.fn(async (runId: string) => {
        eventos.push('auth.removida');
        await auth.deleteForRun(runId);
      }),
    };
    const useCase = new EnviarCallbackRunUseCase(
      runs as never,
      consolidar as never,
      authStore,
      client,
    );

    return {
      useCase,
      runs,
      items,
      auth,
      authStore,
      client,
      consolidar,
      eventos,
    };
  }

  it('deve enviar, marcar COMPLETED e remover auth somente após confirmação', async () => {
    const deps = criarDependencias();

    await deps.useCase.execute(run.runId);

    expect(deps.client.sendCallback).toHaveBeenCalledWith({
      token: 'token-nao-logar',
      payload,
    });
    expect(deps.eventos).toEqual([
      'callback.enviado',
      'run.completada',
      'auth.removida',
    ]);
  });

  it('não deve enviar novamente quando callback_sent já for true', async () => {
    const deps = criarDependencias({ callbackSent: true });

    await deps.useCase.execute(run.runId);

    expect(deps.client.sendCallback).not.toHaveBeenCalled();
    expect(deps.runs.markCallbackSent).not.toHaveBeenCalled();
    expect(deps.authStore.deleteForRun).not.toHaveBeenCalled();
  });

  it('não deve chamar a plataforma se a autenticação estiver ausente', async () => {
    const deps = criarDependencias();
    vi.mocked(deps.authStore.getForRun).mockResolvedValue(null);

    await expect(deps.useCase.execute(run.runId)).rejects.toThrow();

    expect(deps.client.sendCallback).not.toHaveBeenCalled();
    expect(deps.runs.markCallbackSent).not.toHaveBeenCalled();
    expect(deps.authStore.deleteForRun).not.toHaveBeenCalled();
  });

  it('não deve chamar a plataforma se o CID do Redis divergir da run', async () => {
    const deps = criarDependencias({ cidAutenticacao: 'cid-outro' });

    await expect(deps.useCase.execute(run.runId)).rejects.toThrow(
      'não corresponde à run',
    );

    expect(deps.client.sendCallback).not.toHaveBeenCalled();
    expect(deps.authStore.deleteForRun).not.toHaveBeenCalled();
  });

  it('deve manter callback_sent e auth em resultado ambíguo', async () => {
    const deps = criarDependencias({
      enviar: async () => {
        throw new CallbackOutcomeUnknownError();
      },
    });

    await expect(deps.useCase.execute(run.runId)).rejects.toBeInstanceOf(
      CallbackOutcomeUnknownError,
    );

    expect(deps.runs.markCallbackSent).not.toHaveBeenCalled();
    expect(deps.authStore.deleteForRun).not.toHaveBeenCalled();
  });
});
