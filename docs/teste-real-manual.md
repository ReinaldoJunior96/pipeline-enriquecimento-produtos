# Teste real manual

Este procedimento é exclusivo para desenvolvimento local. Não use credenciais reais em commits, documentação, logs ou histórico compartilhado do terminal.

## Pré-requisitos

No `.env` local do backend, mantenha:

```env
ENRICHMENT_MODE=http
PLATAFORMA_BASE_URL=<base da plataforma>
PLATAFORMA_CID=<cid recebido no registro>
PLATAFORMA_TOKEN=<token recebido no registro>
WEBHOOK_PUBLIC_URL=<url pública temporária>
ADMIN_TEST_ENDPOINTS_ENABLED=true
```

O endpoint `POST /admin/runs` e o Bull Board são ferramentas locais. Configure `ADMIN_TEST_ENDPOINTS_ENABLED=false` e `BULL_BOARD_ENABLED=false` fora do desenvolvimento.

## 1. Subir os serviços

```bash
docker compose up -d --build
docker compose ps
```

Confirme que backend, PostgreSQL e Redis estão saudáveis.

## 2. Subir o ngrok manualmente

```bash
ngrok http 3000
```

Não exponha `/admin/queues` ou `/admin/runs` publicamente. Se o túnel encaminhar todas as rotas sem filtro, desabilite as rotas administrativas e use outro processo/porta exclusivamente local para administrá-las.

## 3. Registrar o webhook

```bash
curl -X POST "<PLATAFORMA_BASE_URL>/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<NOME>",
    "webhook": "<WEBHOOK_PUBLIC_URL>"
  }'
```

Guarde `cid` e `token` somente no `.env` local. Reinicie o backend depois de alterar as variáveis.

## 4. Solicitar o lote

Deixe o comando de cadastro local da próxima seção preparado antes desta chamada.

```bash
curl -X POST "<PLATAFORMA_BASE_URL>/burst/<CID>" \
  -H "x-token: <TOKEN>"
```

A resposta esperada contém `run_id`, `total` e `started_at`.

## 5. Cadastrar imediatamente o lote local

```bash
curl -X POST http://localhost:3000/admin/runs \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "<RUN_ID>",
    "cid": "<CID>",
    "total": <TOTAL>,
    "started_at": "<STARTED_AT>"
  }'
```

O endpoint retorna `201` no cadastro e `409` se o `run_id` já existir. Ele não recebe nem persiste token.

## 6. Acompanhar o processamento

- logs seguros do backend;
- Bull Board local em `http://localhost:3000/admin/queues`;
- tabela `runs`;
- tabela `run_items`.

Exemplo de consulta local:

```sql
SELECT run_id, cid, total, status, finished_count, callback_sent
FROM runs
WHERE run_id = '<RUN_ID>';

SELECT run_id, seq, sku, status, attempts, price, stock, error_code, error_message
FROM run_items
WHERE run_id = '<RUN_ID>'
ORDER BY seq;
```

## Risco de corrida

O fluxo manual não é atomicamente seguro. A plataforma pode chamar `POST /process` imediatamente após responder ao `/burst`, antes que `POST /admin/runs` seja concluído. Como `run_items.run_id` possui uma chave estrangeira para `runs.run_id`, o item pode falhar ao ser persistido.

Preparar previamente o comando e executá-lo logo após o `/burst` apenas reduz a janela; não elimina o risco.

Uma solução futura deve ser escolhida explicitamente, por exemplo:

- integrar a chamada ao `/burst` na aplicação e persistir sua resposta no mesmo fluxo;
- aceitar temporariamente itens pendentes até o `run` existir;
- permitir cadastro prévio somente se a plataforma fornecer o `run_id` antes do burst.

Nenhuma dessas alternativas foi implementada nesta etapa.

## Limitações atuais

- callback não implementado;
- `finished_count` não atualizado durante o processamento;
- endpoint admin sem autenticação, permitido somente quando a flag local está ativa;
- Bull Board e endpoint admin não devem ser publicados via ngrok.
