import { AddressInfo } from 'node:net';
import { createServer, Server } from 'node:http';
import { HttpPlataformaExternaClient } from './http-plataforma-externa.client.js';

interface RespostaFake {
  status: number;
  corpo: unknown;
}

async function iniciarServidor(resposta: RespostaFake) {
  const chamadas: Array<{
    metodo: string;
    caminho: string;
    headers: Record<string, string | string[] | undefined>;
    corpo: string;
  }> = [];
  const servidor: Server = createServer((requisicao, respostaHttp) => {
    let corpo = '';
    requisicao.setEncoding('utf8');
    requisicao.on('data', (parte: string) => (corpo += parte));
    requisicao.on('end', () => {
      chamadas.push({
        metodo: requisicao.method ?? '',
        caminho: requisicao.url ?? '',
        headers: requisicao.headers,
        corpo,
      });
      respostaHttp.writeHead(resposta.status, {
        'content-type': 'application/json',
      });
      respostaHttp.end(JSON.stringify(resposta.corpo));
    });
  });

  await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const endereco = servidor.address() as AddressInfo;

  return {
    servidor,
    baseUrl: `http://127.0.0.1:${endereco.port}`,
    chamadas,
  };
}

async function fecharServidor(servidor: Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    servidor.close((erro) => (erro ? reject(erro) : resolve())),
  );
}

describe('HttpPlataformaExternaClient', () => {
  it('deve registrar webhook e validar cid e token sem registrar credenciais em URL', async () => {
    const servidor = await iniciarServidor({
      status: 200,
      corpo: { cid: 'cid_fake', token: 'token_fake' },
    });

    try {
      const cliente = new HttpPlataformaExternaClient({
        registerUrl: `${servidor.baseUrl}/register`,
        baseUrl: servidor.baseUrl,
      });
      const resposta = await cliente.registrar({
        name: 'Pessoa de Teste',
        webhook: 'https://webhook.example.test',
      });

      expect(resposta).toEqual({ cid: 'cid_fake', token: 'token_fake' });
      expect(servidor.chamadas[0]).toEqual(
        expect.objectContaining({
          metodo: 'POST',
          caminho: '/register',
          corpo: JSON.stringify({
            name: 'Pessoa de Teste',
            webhook: 'https://webhook.example.test',
          }),
        }),
      );
    } finally {
      await fecharServidor(servidor.servidor);
    }
  });

  it('deve chamar burst com cid no caminho e token somente no header', async () => {
    const servidor = await iniciarServidor({
      status: 200,
      corpo: {
        run_id: 'run_fake',
        cid: 'cid_fake',
        total: 4,
        started_at: '2026-10-07T13:20:54.872Z',
      },
    });

    try {
      const cliente = new HttpPlataformaExternaClient({
        registerUrl: `${servidor.baseUrl}/register`,
        baseUrl: servidor.baseUrl,
      });

      await expect(
        cliente.criarLote({ cid: 'cid fake', token: 'token_fake' }),
      ).resolves.toEqual({
        runId: 'run_fake',
        cid: 'cid_fake',
        total: 4,
        startedAt: new Date('2026-10-07T13:20:54.872Z'),
      });
      expect(servidor.chamadas[0]).toEqual(
        expect.objectContaining({
          metodo: 'POST',
          caminho: '/burst/cid%20fake',
          corpo: '',
        }),
      );
      expect(servidor.chamadas[0].headers['x-token']).toBe('token_fake');
      expect(servidor.chamadas[0].caminho).not.toContain('token_fake');
    } finally {
      await fecharServidor(servidor.servidor);
    }
  });

  it('deve classificar 400 e 422 como erros de validação externa', async () => {
    const servidor = await iniciarServidor({
      status: 422,
      corpo: { message: 'Webhook inválido' },
    });

    try {
      const cliente = new HttpPlataformaExternaClient({
        registerUrl: `${servidor.baseUrl}/register`,
        baseUrl: servidor.baseUrl,
      });

      await expect(
        cliente.registrar({ name: 'Teste', webhook: 'https://example.test' }),
      ).rejects.toMatchObject({ tipo: 'VALIDACAO', status: 422 });
    } finally {
      await fecharServidor(servidor.servidor);
    }
  });

  it('deve classificar resposta malformada como erro de integração', async () => {
    const servidor = await iniciarServidor({
      status: 200,
      corpo: { cid: '', token: 42 },
    });

    try {
      const cliente = new HttpPlataformaExternaClient({
        registerUrl: `${servidor.baseUrl}/register`,
        baseUrl: servidor.baseUrl,
      });

      await expect(
        cliente.registrar({ name: 'Teste', webhook: 'https://example.test' }),
      ).rejects.toMatchObject({ tipo: 'RESPOSTA_INVALIDA' });
    } finally {
      await fecharServidor(servidor.servidor);
    }
  });
});
