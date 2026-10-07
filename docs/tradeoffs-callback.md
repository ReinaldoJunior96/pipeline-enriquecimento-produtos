# Trade-offs do callback

O callback externo não é idempotente: cada envio pode gerar um novo relatório. Sem uma chave de idempotência aceita pela plataforma ou uma consulta de estado, não é possível garantir `exactly-once` diante de uma interrupção entre a aceitação remota e a confirmação local.

## Como funciona

Quando todos os itens de uma run terminam, a aplicação consolida os resultados e envia:

```http
POST /callback
x-token: <token>
```

A run só é marcada como concluída depois que a plataforma responde com HTTP `2xx`. O corpo da resposta é ignorado, pois o contrato não define um formato.

Nesse momento:

```text
status = COMPLETED
callback_sent = true
```

e a credencial temporária da run é removida do Redis.

## Por que evitamos reenviar automaticamente

A documentação informa que cada chamada ao `/callback` gera um novo relatório.

Por isso, se houver erro de rede/conexão com resultado incerto, não é seguro simplesmente enviar novamente. A plataforma pode ter recebido o resultado mesmo que a aplicação não tenha recebido a resposta.

Nesses casos:

- `callback_sent` continua `false`;
- a credencial permanece no Redis;
- o envio não é repetido automaticamente;
- o caso precisa ser verificado antes de uma nova tentativa.

Essa decisão reduz o risco de gerar relatórios duplicados.

## Tratamento de erros

- `2xx`: callback confirmado;
- `429`: retry respeitando `Retry-After`;
- outros `4xx`: não repetir automaticamente;
- `5xx`: retry limitado;
- erro de rede/conexão com resultado incerto: não repetir automaticamente.

Se a plataforma confirmar o callback, mas a gravação local do sucesso falhar, também não há retry automático e a autenticação não é removida. Se a gravação local ocorrer, mas a remoção da autenticação falhar, o estado persistido impede novo envio e a chave efêmera expira pelo TTL configurado.

## Segurança

O job da fila de callback contém apenas:

```json
{
  "runId": "..."
}
```

O `cid` e o `token` são recuperados no momento do envio.

O token não é:

- persistido no PostgreSQL;
- enviado no payload BullMQ;
- registrado em logs.

## Resultado enviado

Os itens são enviados ordenados por `seq`.

Somente itens `SUCCESS` entram no resultado porque o contrato da plataforma define apenas:

```json
{
  "seq": 0,
  "sku": "sku-001",
  "price": 149.9,
  "stock": 42
}
```

Itens `ERROR` contam para o encerramento da run, mas não são enviados porque a documentação não define como representá-los.

## Trade-off

A escolha prioriza evitar callbacks duplicados.

Em uma falha de comunicação, pode ser necessário verificar manualmente se a plataforma gerou o relatório antes de reenviar o resultado.
