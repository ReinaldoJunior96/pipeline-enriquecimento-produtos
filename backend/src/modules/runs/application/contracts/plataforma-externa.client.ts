export const PLATAFORMA_EXTERNA_CLIENT = Symbol('PLATAFORMA_EXTERNA_CLIENT');

export interface CriarLoteNaPlataformaInput {
  cid: string;
  token: string;
}

export interface RegistrarNaPlataformaInput {
  name: string;
  webhook: string;
}

export interface CredenciaisDaPlataforma {
  cid: string;
  token: string;
}

export interface LoteCriadoNaPlataforma {
  runId: string;
  cid: string;
  total: number;
  startedAt: Date;
}

export interface PlataformaExternaClient {
  registrar(
    input: RegistrarNaPlataformaInput,
  ): Promise<CredenciaisDaPlataforma>;
  criarLote(input: CriarLoteNaPlataformaInput): Promise<LoteCriadoNaPlataforma>;
}

export type PlataformaExternaErrorType =
  | 'VALIDACAO'
  | 'PLATAFORMA'
  | 'RESPOSTA_INVALIDA';

export class PlataformaExternaClientError extends Error {
  constructor(
    message: string,
    readonly tipo: PlataformaExternaErrorType,
    readonly status?: number,
  ) {
    super(message);
    this.name = PlataformaExternaClientError.name;
  }
}
