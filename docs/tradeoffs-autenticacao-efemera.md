# Autenticação efêmera com Redis

## Contexto

A plataforma externa retorna `cid` e `token` após o registro. Essas credenciais são necessárias para burst, enrich e callback. O token não deve ser persistido junto aos dados de negócio nem circular nos jobs BullMQ.

## Decisão

As credenciais são armazenadas temporariamente no Redis, associadas à run, na chave `platform:auth:run:<runId>`. O valor contém `{ "cid": "...", "token": "..." }` e expira pelo TTL configurável em `PLATFORM_AUTH_TTL_SECONDS`, cujo padrão é 300 segundos.

## Motivos

- Separa segredo dos dados de negócio.
- Permite que workers recuperem a credencial por `runId` sem incluí-la no payload BullMQ.
- O TTL elimina credenciais abandonadas e limita sua exposição.
- A aplicação remove a credencial após a confirmação do callback.

## Ciclo de vida

`register → burst → persistência da run → credencial no Redis → processamento → enrich → callback confirmado → DEL da credencial`

O TTL é uma proteção de fallback; a remoção explícita após confirmação do callback é o encerramento normal do ciclo.

## Trade-offs

### Vantagens

- O token não fica no PostgreSQL, nos jobs ou nos logs.
- O Redis combina com dados efêmeros e permite expiração e invalidação simples.
- Workers independentes conseguem resolver credenciais pelo identificador da run.

### Desvantagens

- Uma perda do Redis pode deixar a run e seus itens persistidos sem credencial.
- O estado de negócio continua salvo no PostgreSQL, mas a execução autenticada não consegue continuar sem credencial.
- Os dados persistidos permitem análise e uma futura estratégia de recuperação ou reprocessamento.
- A associação de uma nova credencial a uma run existente não é automatizada nesta implementação.
- Se o Redis falhar depois da persistência, o endpoint falha e a run pode permanecer sem contexto de autenticação; não há compensação automática.

## Considerações para produção

Segredos permanentes devem ficar em um gerenciador como AWS Secrets Manager, Parameter Store, Vault, GCP Secret Manager ou equivalente. Credenciais efêmeras geradas em runtime podem ficar no Redis, protegido por rede privada, TLS quando suportado, ACL/autenticação e sem exposição pública da porta. O TTL deve permanecer configurado.

## Alternativas consideradas

1. Token puro no PostgreSQL — rejeitado por misturar segredo com dados de negócio.
2. Token criptografado no PostgreSQL — viável se a recuperação após perda do Redis for requisito, mas acrescenta gestão e rotação de chaves.
3. Secret Manager por run — possível, porém mais complexo e potencialmente custoso para credenciais de alta rotatividade.
4. Token no payload BullMQ — rejeitado por expor o segredo na fila, em ferramentas de inspeção e em observabilidade.
5. Redis efêmero — escolhido pelo equilíbrio entre isolamento, ciclo de vida e simplicidade.
