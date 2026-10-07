# Processamento assíncrono

A plataforma envia cada SKU para:

```http
POST /process
```

Exemplo:

```json
{
  "run_id": "run_abc123",
  "seq": 0,
  "sku": "sku-001"
}
```

A aplicação valida e registra a mensagem, responde rapidamente com `202 accepted` e deixa o processamento pesado para os workers.

O objetivo é não manter a requisição HTTP esperando pelo `/enrich` ou pelo callback final.

## Fluxo

```text
/process
   ↓
persistência + idempotência
   ↓
ACK 202
   ↓
BullMQ
   ↓
/enrich
   ↓
SUCCESS ou ERROR
   ↓
finished_count
   ↓
consolidação
   ↓
/callback
```

## Idempotência

A entrega da plataforma é considerada `at-least-once`, portanto uma mesma mensagem pode chegar mais de uma vez.

A chave lógica utilizada é:

```text
run_id + seq
```

O PostgreSQL mantém:

```text
UNIQUE (run_id, seq)
```

e os jobs de processamento utilizam um `jobId` determinístico:

```text
<runId>-<seq>
```

Com isso, uma entrega repetida não cria outro item nem gera processamento duplicado.

Se um item estiver `PENDING` após uma falha de enqueue, uma nova entrega pode garantir novamente sua entrada na fila.

## Run ainda não disponível

A plataforma pode começar a enviar `/process` imediatamente após o `/burst`, antes da persistência local da run terminar.

Nesse caso, a mensagem segue para a fila:

```text
process-ingress
```

O job `wait-for-run` faz até 10 tentativas, com backoff fixo de 500 ms. Enquanto a run não está no PostgreSQL, nenhum `run_item` órfão é criado. Quando a run fica disponível, o worker registra o item e o encaminha para `processing`. Ao esgotar as tentativas, o job falha e registra o evento seguro `process.espera_esgotada`.

Essa decisão preserva a chave estrangeira e evita criar itens órfãos apenas para contornar uma condição de corrida.

## Processamento

A fila:

```text
processing
```

executa o enriquecimento dos itens.

Cada job contém apenas:

```json
{
  "runId": "...",
  "seq": 0,
  "sku": "sku-001"
}
```

As credenciais não trafegam no BullMQ.

O worker recupera `cid` e `token` temporariamente do Redis usando o `runId` e chama:

```http
GET /enrich/:sku
x-cid: <cid>
x-token: <token>
```

## Concorrência

O worker de processamento utiliza:

```text
concurrency = 3
```

A escolha respeita o limite atual do serviço de enriquecimento sem disparar os 20 itens simultaneamente.

Com múltiplas réplicas, esse limite deixaria de ser global e seria necessário adicionar um mecanismo distribuído de rate limiting.

## Falhas e retries

Falhas transitórias são repetidas com backoff.

Tratamento atual:

- `429`: retry respeitando `Retry-After`;
- `5xx`: retry;
- erros de rede/conexão: retry como `NETWORK_ERROR`;
- `401`: erro definitivo;
- `404`: erro definitivo.

Após três tentativas transitórias sem sucesso:

```text
status = ERROR
error_code = RETRY_EXHAUSTED
```

Um item com erro não bloqueia o restante do lote.

## Conclusão da run

Cada item que entra pela primeira vez em um estado terminal:

```text
SUCCESS
ou
ERROR
```

incrementa `finished_count` de forma transacional.

Quando:

```text
finished_count == total
```

é agendado um único job:

```text
callback-<runId>
```

na fila `callback`.

O agendamento é reentrante. Se o enqueue falhar depois de o último item já ter sido finalizado, uma reexecução do processamento terminal verifica novamente se a run está completa. Se `callback_sent=false`, tenta garantir o job novamente com o ID determinístico `callback-<runId>`. Se `callback_sent=true`, não agenda outro callback.

O worker consolida os resultados em ordem de `seq` e envia:

```http
POST /callback
x-token: <token>
```

Somente itens `SUCCESS` entram em `result`, pois o contrato externo não define um formato para itens que terminaram em `ERROR`.

Após uma resposta HTTP `2xx`:

```text
status = COMPLETED
callback_sent = true
```

e a credencial efêmera da run é removida do Redis.

## Decisões arquiteturais

### Processamento assíncrono

BullMQ desacopla o ACK do trabalho pesado.

Isso permite responder rapidamente a `/process` enquanto enriquecimento, retries e callback continuam em segundo plano.

Kafka seria mais indicado para alto volume de eventos, múltiplos consumidores e streaming distribuído. RabbitMQ também resolveria o problema, mas adicionaria complexidade operacional desnecessária para este escopo, já que o Redis já faz parte da arquitetura.

### PostgreSQL como fonte da verdade

Estados de domínio como:

```text
run
run_items
status
finished_count
callback_sent
```

ficam persistidos no PostgreSQL.

Redis/BullMQ são usados para processamento e estado temporário, não como fonte definitiva da execução.

### Idempotência em mais de uma camada

A solução utiliza:

- restrição única no PostgreSQL;
- `jobId` determinístico no BullMQ;
- `callback_sent` para impedir reenvio automático após confirmação.

Essa combinação protege o pipeline contra entregas repetidas e retries internos.

### Callback separado

O callback possui uma fila própria.

Isso evita que uma falha na entrega final interfira no worker responsável pelo enriquecimento dos itens.

Como cada chamada ao `/callback` pode gerar um novo relatório, respostas `5xx` e falhas de rede/conexão são tratadas como resultado incerto e não recebem retry automático cego. A resposta `429` continua sujeita a retry, respeitando `Retry-After`.

## Arquitetura

O diagrama abaixo apresenta uma visão mais ampla do processamento:

![Arquitetura de processamento](../Arquitetura-processamento-produtos.jpg)

## Documentação relacionada

- [Criação do lote](./criacao-lote.md)
- [Teste real pelo Swagger](./teste-real-manual.md)
- [Observabilidade das filas](./observabilidade-filas.md)
- [Trade-offs do callback](./tradeoffs-callback.md)
