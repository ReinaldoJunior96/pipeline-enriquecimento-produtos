# Teste real manual pelo Swagger

Este fluxo usa o backend como interface para testar a aplicação.

## Pré-requisitos

Configure `backend/.env`:

```env
PLATAFORMA_BASE_URL=<url-base-da-plataforma>
PLATAFORMA_REGISTER_URL=<url-de-register-da-plataforma>/register
ENRICHMENT_MODE=http
```

O CID e o token não precisam ficar no `.env`: o Swagger retorna as credenciais do registro para uso no burst. Após persistir a run, o backend mantém CID/token no Redis associados ao `runId`, pelo TTL de `PLATFORM_AUTH_TTL_SECONDS` (padrão de 300 segundos). Eles não são gravados no PostgreSQL nem em logs.

## Fluxo

1. Suba os serviços com `docker compose up -d --build` e confirme com `docker compose ps`.
2. Inicie `ngrok http 3000` e copie a URL pública atual. Informe essa URL no corpo do registro; ela não precisa ser persistida no `.env`. O handshake `/check` precisa estar acessível pela plataforma.
3. Abra o Swagger em [http://localhost:3000/docs](http://localhost:3000/docs).
4. Execute `POST /platform/register` com nome e URL pública do ngrok. A resposta contém `cid` e `token` para copiar.
5. Execute `POST /runs/burst` com o `cid` e o `token` recebidos. O backend chama a plataforma externa, valida a resposta e persiste a run antes de responder `201`.
6. A plataforma envia os itens a `POST /process`; o backend aceita rapidamente e processa de forma assíncrona. `process-ingress` cobre a corrida entre a chegada do item e a persistência da run.
7. Acompanhe `process-ingress`, `processing` e `callback` no Bull Board em [http://localhost:3000/admin/queues](http://localhost:3000/admin/queues), e confirme o resultado no PostgreSQL.
8. Após todos os itens terminarem, confirme a run `COMPLETED` e `callback_sent=true`. O callback externo confirmado encerra o ciclo e remove a autenticação efêmera do Redis.

O fluxo normal não chama diretamente o `/register` ou o `/burst` externo e não cadastra a run manualmente. `POST /admin/runs` é um recurso temporário de desenvolvimento e não é necessário neste fluxo. Não exponha `/admin/queues` nem `/admin/runs` pelo ngrok.

Consulta para confirmar a persistência:

```sql
SELECT run_id, cid, total, status, finished_count, callback_sent
FROM runs
WHERE run_id = '<RUN_ID>';

SELECT run_id, seq, sku, status, attempts, price, stock, error_code, error_message
FROM run_items
WHERE run_id = '<RUN_ID>'
ORDER BY seq;
```
