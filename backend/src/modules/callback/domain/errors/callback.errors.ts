export class CallbackHttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(`A plataforma rejeitou o callback com HTTP ${status}`);
    this.name = CallbackHttpError.name;
  }
}

export class CallbackOutcomeUnknownError extends Error {
  constructor() {
    super('Não foi possível confirmar o resultado do callback');
    this.name = CallbackOutcomeUnknownError.name;
  }
}

export class CallbackCredentialsMismatchError extends Error {
  constructor(runId: string) {
    super(`A autenticação armazenada não corresponde à run ${runId}`);
    this.name = CallbackCredentialsMismatchError.name;
  }
}

export class CallbackAuthContextNotFoundError extends Error {
  constructor(runId: string) {
    super(`Autenticação temporária indisponível para a run ${runId}`);
    this.name = CallbackAuthContextNotFoundError.name;
  }
}

export class CallbackStatePersistenceError extends Error {
  constructor() {
    super('O callback foi aceito, mas não foi possível persistir seu estado');
    this.name = CallbackStatePersistenceError.name;
  }
}
