export abstract class EnrichmentError extends Error {
  protected constructor(
    message: string,
    readonly code: string,
    readonly transient: boolean,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EnrichmentRateLimitError extends EnrichmentError {
  constructor(readonly retryAfterSeconds: number) {
    super(
      `Limite de requisições excedido; tente novamente em ${retryAfterSeconds} segundos`,
      'RATE_LIMITED',
      true,
    );
  }
}

export class EnrichmentTransientError extends EnrichmentError {
  constructor(message = 'Falha transitória no enriquecimento') {
    super(message, 'TRANSIENT_ERROR', true);
  }
}

export class EnrichmentTransportError extends EnrichmentError {
  constructor() {
    super('Falha de comunicação com a plataforma de enriquecimento', 'NETWORK_ERROR', true);
  }
}

export class EnrichmentUnauthorizedError extends EnrichmentError {
  constructor(message = 'Credencial inválida para enriquecimento') {
    super(message, 'UNAUTHORIZED', false);
  }
}

export class EnrichmentNotFoundError extends EnrichmentError {
  constructor(message = 'SKU não encontrado para enriquecimento') {
    super(message, 'SKU_NOT_FOUND', false);
  }
}
