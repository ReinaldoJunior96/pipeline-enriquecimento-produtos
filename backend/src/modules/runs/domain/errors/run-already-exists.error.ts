export class RunAlreadyExistsError extends Error {
  constructor(readonly runId: string) {
    super(`O lote ${runId} já está cadastrado`);
    this.name = RunAlreadyExistsError.name;
  }
}
