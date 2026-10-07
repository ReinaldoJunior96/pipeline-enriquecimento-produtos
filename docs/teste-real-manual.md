# Teste real manual pelo Swagger

Este fluxo de desenvolvimento usa o próprio backend como interface para a plataforma externa. Não salve credenciais reais em commits, documentação, testes ou logs.

## Pré-requisitos

Configure no `.env` local:

```env
PLATAFORMA_BASE_URL=<url-base-da-plataforma>
PLATAFORMA_REGISTER_URL=<url-de-register-da-plataforma>
ENRICHMENT_MODE=http
ADMIN_TEST_ENDPOINTS_ENABLED=true
```

O CID e o token atuais não precisam ficar no `.env`: o Swagger retorna as credenciais do registro e você as copia para o burst. Após a resposta do burst, o backend mantém CID/token em memória, associados ao `runId`, por até 24 horas para autenticar os enrichments. Eles não são gravados no PostgreSQL nem em logs; reiniciar o backend apaga esse cache.

## Fluxo

1. Suba os serviços com `docker compose up -d --build` e confirme com `docker compose ps`.
2. Inicie `ngrok http 3000` e copie a URL pública atual. O handshake `/check` precisa estar acessível pela plataforma.
3. Abra o Swagger em [http://localhost:3000/docs](http://localhost:3000/docs).
4. Execute `POST /platform/register` com nome e URL pública do ngrok. A resposta contém `cid` e `token` para copiar.
5. Execute `POST /runs/burst` com o `cid` e o `token` recebidos. O backend chama a plataforma externa, valida a resposta e persiste a run antes de responder `201`.
6. A plataforma envia os itens a `POST /process`; o backend aceita rapidamente e processa de forma assíncrona. O `process-ingress` protege a corrida entre a chegada do item e a persistência da run.
7. Acompanhe as filas no Bull Board em [http://localhost:3000/admin/queues](http://localhost:3000/admin/queues) e os registros no PostgreSQL.

O fluxo normal não chama diretamente o `/register` ou `/burst` externo e não cadastra a run manualmente. `POST /admin/runs` é apenas um recurso temporário de desenvolvimento, não necessário neste fluxo.

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

Não exponha `/admin/queues` nem `/admin/runs` via ngrok. Fora do desenvolvimento, desabilite os endpoints administrativos e o Bull Board.

## Limitações atuais

- callback ainda não implementado;
- `finished_count` ainda não atualizado durante o processamento;
- o cache de credenciais é volátil e é perdido ao reiniciar o processo;
- `/admin/runs` não faz parte do fluxo oficial.
