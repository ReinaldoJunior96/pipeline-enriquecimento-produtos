export interface CredenciaisLote {
  cid: string;
  token: string;
}

export interface CredenciaisLoteStore {
  obter(runId: string): CredenciaisLote | undefined;
  definir(runId: string, credenciais: CredenciaisLote): void;
  remover(runId: string): void;
}

export const CREDENCIAIS_LOTE_STORE = Symbol('CREDENCIAIS_LOTE_STORE');
