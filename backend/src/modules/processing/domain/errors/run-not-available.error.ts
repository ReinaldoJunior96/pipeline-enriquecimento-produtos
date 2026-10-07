export class RunNotAvailableError extends Error {
  constructor(readonly runId: string) {
    super(`Lote ainda indisponível: ${runId}`);
    this.name = 'RunNotAvailableError';
  }
}
