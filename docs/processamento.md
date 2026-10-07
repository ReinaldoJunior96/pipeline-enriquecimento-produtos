# Processamento assíncrono

A plataforma entrega cada SKU em `POST /process`:

```json
{ "run_id": "run_abc123", "seq": 0, "sku": "sku-001" }
```

`run_id + seq` é a chave idempotente. O item é persistido em PostgreSQL e enviado à fila BullMQ; o endpoint retorna `202 accepted` sem esperar o enrich. O SLA esperado para ACK é até 600 ms. A evidência local de 100 chamadas está em [melhor execução local](./melhor-execucao.md) e não representa medição de produção.

## Run ainda não persistida

O burst externo pode começar a entregar itens antes de a run ser persistida localmente. Nesse intervalo, `process-ingress` mantém a mensagem sem criar item órfão. O worker `wait-for-run` tenta localizar a run por até 10 tentativas, com backoff fixo de 500 ms. Quando ela aparece, o item é registrado e segue para `processing`; ao esgotar, registra o evento `process.espera_esgotada`.

## Idempotência e recuperação do enqueue

O banco mantém `UNIQUE (run_id, seq)` e a chave estrangeira para `runs`. Jobs da fila `processing` usam `jobId = <runId>-<seq>`.

- item novo: persistir como `PENDING` e enfileirar;
- duplicata `PENDING`: tentar enfileirar novamente com o mesmo ID determinístico, recuperando o caso de persistência bem-sucedida seguida de falha do enqueue;
- duplicata `PROCESSING`: não criar outro job;
- duplicata `SUCCESS` ou `ERROR`: ACK e no-op.

Se o primeiro enqueue falhar, `/process` retorna erro e deixa o item `PENDING`; a plataforma pode repetir a entrega e o backend tenta garantir o job novamente. A restrição única impede duplicação do item e o ID determinístico torna repetido o enqueue seguro no BullMQ.

## Filas e concorrência

As filas são:

- `process-ingress`: itens cuja run ainda não está visível no banco;
- `processing`: enrich e persistência de cada item;
- `callback`: consolidação e envio do resultado final.

O worker de `processing` tem concorrência 3 por processo. Isso atende o cenário atual de uma instância; não é limite global. Com várias réplicas, o total poderá ser três por réplica e será necessário um limitador distribuído para respeitar o downstream.

## Enriquecimento e retries

O worker chama `GET /enrich/:sku`, enviando `x-cid` e `x-token` recuperados do Redis por `runId`. O token não vai no payload BullMQ, banco ou logs.

HTTP 429 respeita `Retry-After`; falhas HTTP transitórias e erros de transporte (timeout, DNS, socket/conexão interrompida) são repetidos com backoff. Falhas de transporte recebem `NETWORK_ERROR` sem propagar a mensagem bruta da exceção. HTTP 401 e 404 são definitivos. Após três tentativas transitórias, o item termina em `ERROR` com `RETRY_EXHAUSTED`, incrementa `finished_count` uma vez e o pipeline pode continuar.

## Progresso, consolidação e callback

Uma transação finaliza cada item e incrementa `runs.finished_count` somente uma vez. Quando `finished_count == total`, é criado um job determinístico `callback-<runId>` na fila `callback`.

O agendamento é reentrante: se o enqueue falhar depois de o item se tornar terminal, o retry do job de processamento encontra o item terminal e tenta garantir novamente o callback. Se o callback já foi confirmado (`callback_sent=true`), não agenda outro. O callback só marca essa flag após resposta externa 2xx; falhas ambíguas não são repetidas cegamente.

O worker consolida os itens terminais em ordem de `seq` e envia `POST /callback` com `x-token`. Após confirmação externa, marca a run como `COMPLETED`, `callback_sent=true` e remove do Redis as credenciais efêmeras da run.

![Arquitetura de processamento](../Arquitetura-processamento-produtos.jpg)

## E se o lote tivesse 20.000 SKUs?

Não é uma escala implementada ou validada aqui. A estratégia seria:

- manter ACK rápido, persistência idempotente, processamento assíncrono e backpressure pela fila;
- escalar workers horizontalmente apenas junto de limiter global, métricas de lag, retries controlados e DLQ; mais workers não elevam indefinidamente a capacidade do downstream;
- manter `finished_count` incremental e índices por run/status; paginar ou processar em batches na consolidação, sem carregar 20.000 itens desnecessariamente em memória;
- validar o limite de tamanho do callback único da plataforma; usar streaming/batching interno se necessário, sem inventar callbacks em chunks sem suporte contratual;
- dimensionar o TTL da autenticação Redis para a duração maior da execução;
- considerar múltiplas réplicas, Postgres/Redis gerenciados e shutdown gracioso.

## Etapas relacionadas

- [Criação do lote](./criacao-lote.md)
- [Teste real pelo Swagger](./teste-real-manual.md)
- [Observabilidade das filas](./observabilidade-filas.md)
