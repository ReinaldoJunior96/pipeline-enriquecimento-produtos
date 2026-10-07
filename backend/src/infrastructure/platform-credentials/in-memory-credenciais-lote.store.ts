import { CredenciaisLote, CredenciaisLoteStore } from '../../modules/runs/application/contracts/credenciais-lote.store.js';

const TEMPO_DE_VIDA_EM_MS = 24 * 60 * 60 * 1000;

export class InMemoryCredenciaisLoteStore implements CredenciaisLoteStore {
  private readonly credenciais = new Map<
    string,
    { valor: CredenciaisLote; expiraEm: number }
  >();

  obter(runId: string): CredenciaisLote | undefined {
    const registro = this.credenciais.get(runId);
    if (!registro) return undefined;

    if (registro.expiraEm <= Date.now()) {
      this.credenciais.delete(runId);
      return undefined;
    }

    return registro.valor;
  }

  definir(runId: string, credenciais: CredenciaisLote): void {
    this.credenciais.set(runId, {
      valor: { ...credenciais },
      expiraEm: Date.now() + TEMPO_DE_VIDA_EM_MS,
    });
  }

  remover(runId: string): void {
    this.credenciais.delete(runId);
  }
}
