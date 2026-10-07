import { AddressInfo } from 'node:net';
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { CallbackOutcomeUnknownError } from '../../../src/modules/callback/domain/errors/callback.errors.js';
import { HttpCallbackClient } from '../../../src/modules/callback/infrastructure/clients/http-callback.client.js';

describe('Cliente HTTP do callback', () => {
  let servidor: Server;
  let baseUrl: string;
  let statusResposta = 204;
  let corpoResposta = '';
  let atrasarResposta = false;
  let requisicaoRecebida: {
    method?: string;
    url?: string;
    token?: string;
    body?: string;
  };

  beforeAll(async () => {
    servidor = createServer((req, res) => {
      void capturarRequisicao(req, res);
    });
    await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      servidor.close((erro) => (erro ? reject(erro) : resolve())),
    );
  });

  beforeEach(() => {
    statusResposta = 204;
    corpoResposta = '';
    atrasarResposta = false;
    requisicaoRecebida = {};
  });

  async function capturarRequisicao(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const partes: Buffer[] = [];
    for await (const parte of req) partes.push(Buffer.from(parte));
    requisicaoRecebida = {
      method: req.method,
      url: req.url,
      token: req.headers['x-token'],
      body: Buffer.concat(partes).toString('utf8'),
    };

    const responder = () => {
      if (res.destroyed) return;
      res.writeHead(statusResposta, { 'content-type': 'application/json' });
      res.end(corpoResposta);
    };
    if (atrasarResposta) setTimeout(responder, 100);
    else responder();
  }

  const payload = {
    cid: 'cid-callback',
    run_id: 'run-callback',
    result: [{ seq: 0, sku: 'sku-1', price: 14.99, stock: 5 }],
  };

  it.each([200, 201, 202, 204])(
    'deve aceitar HTTP %i mesmo sem body',
    async (status) => {
      statusResposta = status;
      await new HttpCallbackClient({ baseUrl }).sendCallback({
        token: 'token-secreto',
        payload,
      });
    },
  );

  it('deve ignorar body JSON arbitrário em resposta 2xx', async () => {
    statusResposta = 200;
    corpoResposta = JSON.stringify({ resposta: 'não documentada' });

    await expect(
      new HttpCallbackClient({ baseUrl }).sendCallback({
        token: 'token-secreto',
        payload,
      }),
    ).resolves.toBeUndefined();
  });

  it.each([400, 401, 500])('deve tratar HTTP %i como falha explícita', async (status) => {
    statusResposta = status;

    await expect(
      new HttpCallbackClient({ baseUrl }).sendCallback({
        token: 'token-secreto',
        payload,
      }),
    ).rejects.toMatchObject({ status });
  });

  it('deve enviar apenas o token no header e o payload documentado no body', async () => {
    await new HttpCallbackClient({ baseUrl }).sendCallback({
      token: 'token-secreto',
      payload,
    });

    expect(requisicaoRecebida).toEqual({
      method: 'POST',
      url: '/callback',
      token: 'token-secreto',
      body: JSON.stringify(payload),
    });
    expect(requisicaoRecebida.url).not.toContain('token-secreto');
    expect(requisicaoRecebida.body).not.toContain('token-secreto');
  });

  it('deve classificar timeout como resultado incerto', async () => {
    atrasarResposta = true;

    await expect(
      new HttpCallbackClient({ baseUrl, timeoutMs: 10 }).sendCallback({
        token: 'token-secreto',
        payload,
      }),
    ).rejects.toBeInstanceOf(CallbackOutcomeUnknownError);
  });
});
