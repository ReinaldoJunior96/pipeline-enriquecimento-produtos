import { createServer, Server } from 'node:http';

export interface RespostaHttpDeTeste {
  status: number;
  body?: unknown;
  retryAfter?: number;
}

export interface ChamadaHttpDeTeste {
  sku: string;
  cid: string | undefined;
  token: string | undefined;
  instante: number;
}

export class ServidorEnriquecimentoHttpDeTeste {
  readonly chamadas: ChamadaHttpDeTeste[] = [];
  private readonly respostas = new Map<string, RespostaHttpDeTeste[]>();
  private servidor?: Server;

  responderEmSequencia(sku: string, respostas: RespostaHttpDeTeste[]): void {
    this.respostas.set(sku, [...respostas]);
  }

  async iniciar(): Promise<string> {
    this.servidor = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const sku = decodeURIComponent(url.pathname.replace('/enrich/', ''));
      this.chamadas.push({
        sku,
        cid: request.headers['x-cid'] as string | undefined,
        token: request.headers['x-token'] as string | undefined,
        instante: Date.now(),
      });

      const resposta = this.respostas.get(sku)?.shift() ?? { status: 500 };
      response.statusCode = resposta.status;
      response.setHeader('content-type', 'application/json');
      if (resposta.retryAfter !== undefined) {
        response.setHeader('retry-after', String(resposta.retryAfter));
      }
      response.end(JSON.stringify(resposta.body ?? {}));
    });

    await new Promise<void>((resolve, reject) => {
      this.servidor?.once('error', reject);
      this.servidor?.listen(0, '127.0.0.1', () => resolve());
    });

    const endereco = this.servidor.address();
    if (!endereco || typeof endereco === 'string') {
      throw new Error('Não foi possível iniciar o servidor HTTP de teste');
    }
    return `http://127.0.0.1:${endereco.port}`;
  }

  async encerrar(): Promise<void> {
    if (!this.servidor) return;
    await new Promise<void>((resolve, reject) =>
      this.servidor?.close((error) => (error ? reject(error) : resolve())),
    );
  }
}
