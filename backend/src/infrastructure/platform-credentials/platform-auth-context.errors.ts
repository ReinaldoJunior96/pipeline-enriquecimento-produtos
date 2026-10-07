export class PlatformAuthContextInvalidError extends Error {
  constructor() {
    super('O contexto de autenticação armazenado é inválido');
    this.name = PlatformAuthContextInvalidError.name;
  }
}

export class PlatformAuthContextStoreError extends Error {
  constructor(operacao: 'salvar' | 'consultar' | 'remover') {
    super(`Não foi possível ${operacao} o contexto de autenticação`);
    this.name = PlatformAuthContextStoreError.name;
  }
}
