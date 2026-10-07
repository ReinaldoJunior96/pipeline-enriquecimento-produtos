# Relatório da melhor execução

Este documento registra a melhor execução validada de ponta a ponta pela aplicação.

A plataforma externa também gera seu próprio relatório após receber o `/callback`. Como não há endpoint documentado para consultar esse relatório, os dados abaixo representam as evidências observadas localmente durante a execução.

## Execução

- `run_id`: `rdubt4zwze8glml4erb5vfph`
- itens esperados: 20
- itens finalizados: 20
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



## Execução real do lote

- `run_id`: `rdubt4zwze8glml4erb5vfph`
- itens esperados: 20
- itens finalizados: 20
- resultado: 20 `SUCCESS`, 0 `ERROR`
- estado da run: `COMPLETED`
- `callback_sent`: `true`
- jobs de processamento concluídos: 20
- job de callback: `completed`
- autenticação efêmera no Redis: removida após callback confirmado
- duração local aproximada: 7 segundos

Os dados acima são evidência da aplicação para essa execução; a duração é aproximada e não constitui benchmark de desempenho. O benchmark local de ACK, medido separadamente com dependências fake, está no README e pode ser repetido com `npm run benchmark:ack` em `backend/`.

## Medição local de ACK

Foram executadas 100 chamadas locais ao endpoint `/process`, utilizando a aplicação Nest com repositórios e fila fake.

| Amostras |  Mínimo |   Média |     p95 |   Máximo | Limite |
| -------: | ------: | ------: | ------: | -------: | -----: |
|      100 | 0,46 ms | 0,96 ms | 1,35 ms | 22,05 ms | 600 ms |

O maior ACK observado ficou abaixo do limite de 600 ms.

Essa medição é local e não representa latência de produção, pois não inclui PostgreSQL, Redis ou chamadas à plataforma externa.
