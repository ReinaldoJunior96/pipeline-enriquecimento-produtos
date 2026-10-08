# Relatório da melhor execução

Este documento registra a melhor execução validada de ponta a ponta pela aplicação.

A plataforma externa também gera seu próprio relatório após receber o `/callback`. Como não há endpoint documentado para consultar esse relatório, os dados abaixo representam as evidências observadas localmente durante a execução.

## Execução

- `run_id`: `rdubt4zwze8glml4erb5vfph`
- total: 20
- `finished_count`: 20
- resultado: 20 `SUCCESS`, 0 `ERROR`
- estado final: `COMPLETED`
- `callback_sent`: `true`
- jobs de processamento concluídos: 20
- job de callback: `completed`
- autenticação efêmera no Redis: removida após confirmação do callback
- duração aproximada: 7 segundos

## Fluxo validado

```text
/register
→ /check
→ /burst
→ /process
→ ACK
→ processamento assíncrono
→ /enrich
→ consolidação
→ /callback
→ COMPLETED
```



Os dados acima são evidência local da aplicação para essa execução; a duração é aproximada e não constitui benchmark de desempenho. O benchmark local de ACK, medido separadamente com dependências fake, pode ser repetido com `npm run benchmark:ack` em `backend/`.

## Medição local de ACK

Foram executadas 100 chamadas locais ao endpoint `/process`, utilizando a aplicação Nest com repositórios e fila fake.

| Amostras |  Mínimo |   Média |     p95 |   Máximo | Limite |
| -------: | ------: | ------: | ------: | -------: | -----: |
|      100 | 0,46 ms | 0,96 ms | 1,35 ms | 22,05 ms | 600 ms |

O maior ACK observado ficou abaixo do limite de 600 ms.

Essa medição é local e não representa latência de produção, pois não inclui PostgreSQL, Redis ou chamadas à plataforma externa.

## E se o lote tivesse 20.000 SKUs?

A arquitetura principal poderia ser mantida, mas alguns pontos precisariam ser reforçados.

O processamento continuaria assíncrono, com ACK rápido no `/process`, persistência no PostgreSQL, idempotência por `(run_id, seq)` e workers consumindo a fila.

As principais mudanças seriam:

- controle de concorrência global entre múltiplos workers, já que o limite da API externa é de três requisições simultâneas;
- maior atenção a backpressure, tamanho das filas e tempo de espera dos jobs;
- revisão do TTL da credencial no Redis, porque a execução poderia durar muito mais;
- otimização da consolidação do resultado para evitar carregar milhares de itens desnecessariamente em memória;
- maior observabilidade sobre throughput, retries, respostas `429`, duração das runs e tamanho das filas.

Não seria necessário trocar automaticamente BullMQ por Kafka ou RabbitMQ. O principal gargalo continuaria sendo o limite de concorrência da API externa, e adicionar outra infraestrutura de mensageria aumentaria a complexidade sem necessariamente aumentar o throughput.

O trade-off atual foi priorizar simplicidade e previsibilidade para o cenário pedido de 20 SKUs, mantendo uma arquitetura que possa evoluir caso o volume aumente.
