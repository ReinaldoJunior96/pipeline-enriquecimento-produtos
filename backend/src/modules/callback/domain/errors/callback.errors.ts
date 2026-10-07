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
