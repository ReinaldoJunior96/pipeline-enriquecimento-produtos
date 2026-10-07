# Evidência da melhor execução local

Este documento registra as evidências locais relatadas para a execução real concluída. Não é o relatório oficial da plataforma externa: a plataforma gera o próprio relatório após receber `/callback`, e não há endpoint documentado para consultá-lo aqui.

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

Foram feitas 100 chamadas sequenciais ao endpoint `/process`, usando app Nest, repositórios e fila fake, sem PostgreSQL, Redis ou plataforma externa:

| Amostras |  Mínimo |   Média |     p95 |   Máximo | Limite |
| -------: | ------: | ------: | ------: | -------: | -----: |
|      100 | 0,46 ms | 0,96 ms | 1,35 ms | 22,05 ms | 600 ms |

Resultado: máximo abaixo do limite na medição local. Isso não estima latência de produção nem inclui I/O de banco ou Redis.
