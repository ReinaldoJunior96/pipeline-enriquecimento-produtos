import {
  CallbackClient,
  SendCallbackInput,
} from '../../application/contracts/callback.client.js';
import {
  CallbackHttpError,
  CallbackOutcomeUnknownError,
} from '../../domain/errors/callback.errors.js';

export interface HttpCallbackClientConfig {
  baseUrl: string;
  timeoutMs?: number;
}

const TIMEOUT_PADRAO_MS = 10_000;

export class HttpCallbackClient implements CallbackClient {
  constructor(private readonly config: HttpCallbackClientConfig) {}

  async sendCallback(input: SendCallbackInput): Promise<void> {
    let resposta: Response;
    try {
      resposta = await fetch(
        `${this.config.baseUrl.replace(/\/$/, '')}/callback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-token': input.token,
          },
          body: JSON.stringify(input.payload),
          signal: AbortSignal.timeout(
            this.config.timeoutMs ?? TIMEOUT_PADRAO_MS,
          ),
        },
      );
    } catch {
      throw new CallbackOutcomeUnknownError();
    }

    if (resposta.ok) return;

    const retryAfter = Number.parseFloat(
      resposta.headers.get('retry-after') ?? '',
    );
    throw new CallbackHttpError(
      resposta.status,
      Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined,
    );
  }
}
