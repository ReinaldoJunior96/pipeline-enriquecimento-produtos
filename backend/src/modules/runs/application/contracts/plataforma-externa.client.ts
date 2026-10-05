export interface CriarLoteNaPlataformaInput {
  cid: string;
  token: string;
}

export interface LoteCriadoNaPlataforma {
  runId: string;
  total: number;
  startedAt: Date;
}

export interface PlataformaExternaClient {
  criarLote(input: CriarLoteNaPlataformaInput): Promise<LoteCriadoNaPlataforma>;
}
