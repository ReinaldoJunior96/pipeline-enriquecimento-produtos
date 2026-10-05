interface RespostaRegistro {
  cid?: unknown;
  token?: unknown;
}

function obterVariavel(nome: string): string {
  const valor = process.env[nome]?.trim();

  if (!valor) {
    throw new Error(
      `Configure ${nome} no arquivo .env antes de executar o teste`,
    );
  }

  return valor;
}

describe('Autenticação com a plataforma externa', () => {
  it('deve registrar o webhook e receber cid e token', async () => {
    const urlRegistro = obterVariavel('PLATAFORMA_REGISTER_URL');
    const webhook = obterVariavel('WEBHOOK_PUBLIC_URL');
    const nome = obterVariavel('NOME_REGISTRO');

    const resposta = await fetch(urlRegistro, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: nome, webhook }),
    });

    expect(resposta.status).toBe(200);

    const registro = (await resposta.json()) as RespostaRegistro;

    expect(Object.keys(registro).sort()).toEqual(['cid', 'token']);
    expect(typeof registro.cid).toBe('string');
    expect(typeof registro.token).toBe('string');
    expect((registro.cid as string).trim().length).toBeGreaterThan(0);
    expect((registro.token as string).trim().length).toBeGreaterThan(0);
  });
});
