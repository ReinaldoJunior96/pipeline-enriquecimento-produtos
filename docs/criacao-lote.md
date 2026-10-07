# Criação do lote

Depois do registro, o fluxo segue pelo Swagger:

```text
http://localhost:3000/docs
```

## Solicitar um lote

Execute:

```http
POST /runs/burst
```

Body:

```json
{
  "cid": "<cid>",
  "token": "<token>"
}
```

O backend chama a plataforma externa:

```http
POST /burst/:cid
x-token: <token>
```

Em caso de sucesso, a plataforma retorna os dados da execução:

```json
{
  "run_id": "run_abc123",
  "cid": "cid_exemplo",
  "total": 20,
  "started_at": "2026-08-03T12:00:00Z"
}
```

## Persistência

Antes de responder ao cliente, a aplicação salva a run no PostgreSQL.

Estado inicial:

```text
status = PROCESSING
finished_count = 0
callback_sent = false
```

O `run_id` é único e identifica toda a execução.

A credencial usada no burst não é salva no PostgreSQL. Após a criação da run, `cid` e `token` ficam temporariamente no Redis associados ao `runId`, com TTL configurado por:

```text
PLATFORM_AUTH_TTL_SECONDS
```

## Decisão arquitetural

A run retornada pelo `/burst` é persistida no PostgreSQL antes do processamento dos itens.

Essa decisão foi adotada para manter:

- rastreabilidade da execução;
- controle de estado do lote;
- progresso por `finished_count`;
- relação com os itens recebidos em `/process`;
- recuperação e auditoria em caso de falhas;
- controle do envio do callback final.

O trade-off é adicionar uma etapa de persistência antes de considerar a criação do lote concluída, aumentando ligeiramente a complexidade do fluxo.

Em contrapartida, o PostgreSQL passa a ser a fonte da verdade da execução, enquanto Redis/BullMQ ficam responsáveis por estado efêmero e processamento assíncrono.

## Próximo passo

Após a criação do lote, a plataforma começa a enviar os itens para:

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

A partir daí, o processamento é assíncrono.

Quando todos os itens forem finalizados:

```text
finished_count == total
```

a aplicação consolida o resultado e envia o `/callback`.

Após a confirmação do callback:

```text
status = COMPLETED
callback_sent = true
```

## Visão da arquitetura

O diagrama abaixo mostra o fluxo completo de criação da run e início do processamento:

![Arquitetura de criação de lote](../Arquitetura-Criacao-de-lote.jpg)

Para continuar:

[Processamento assíncrono](./processamento.md)
