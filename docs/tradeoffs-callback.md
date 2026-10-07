# Decisões do callback de conclusão

O callback externo não é idempotente: a documentação informa que cada envio
gera um novo relatório. Sem uma chave de idempotência aceita pela plataforma ou
uma consulta de estado, não é possível garantir `exactly-once` diante de uma
interrupção entre a aceitação remota e a confirmação local.

Por isso, o backend grava `callback_sent=true` e `status=COMPLETED` somente após
receber qualquer resposta HTTP 2xx. O corpo da resposta é ignorado, pois o
contrato não define um formato. Depois da confirmação local, a autenticação
efêmera da run é removida do Redis.

Erros HTTP explícitos 429 e 5xx podem ser repetidos de forma limitada; para
429, o worker respeita `Retry-After` quando presente. Respostas 4xx diferentes
de 429, inclusive 401 e 403, são definitivas e não são repetidas. Timeout ou
conexão interrompida têm resultado ambíguo: a plataforma pode ter aceitado o
callback sem que a aplicação tenha recebido a resposta. Nesse caso, o job não
é repetido automaticamente, `callback_sent` permanece falso e a autenticação
é preservada para investigação.

Se a plataforma confirmou o callback, mas a gravação local do sucesso falhou,
também não há retry automático. A autenticação não é removida e o erro exige
investigação, pois repetir o envio pode criar outro relatório. Se a gravação
local ocorreu, mas a remoção da autenticação falhou, o estado persistido impede
um novo envio; a chave efêmera expira pelo TTL configurado.

A fila `callback` contém apenas `{ runId }`, identificada por
`callback-${runId}`. `cid` e token são recuperados do estado persistido e do
Redis no momento do envio; token nunca vai para PostgreSQL, payload BullMQ ou
logs. A comparação entre o CID de Redis e o CID da run é obrigatória.

O resultado é ordenado por `seq` crescente e inclui somente itens `SUCCESS`,
que são os únicos compatíveis com o schema documentado (`seq`, `sku`, `price`,
`stock`). Itens `ERROR` contam para a conclusão da run, mas são omitidos do
relatório porque o contrato externo não especifica como representá-los.

Este comportamento privilegia evitar relatórios duplicados em situações
ambíguas. Uma eventual recuperação manual deve primeiro confirmar com a
plataforma se o relatório foi criado antes de reenviar.
