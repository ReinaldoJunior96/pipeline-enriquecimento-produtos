export interface ReceberItemProcessamentoInput {
  runId: string;
  seq: number;
  sku: string;
}

export interface ItemProcessamentoAceito {
  status: 'accepted';
}

export class ReceberItemProcessamentoUseCase {
  async execute(
    _input: ReceberItemProcessamentoInput,
  ): Promise<ItemProcessamentoAceito> {
    return { status: 'accepted' };
  }
}
