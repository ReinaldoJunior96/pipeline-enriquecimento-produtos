# Pipeline de Enriquecimento de Produtos

Backend NestJS para receber lotes de SKUs, confirmar o recebimento rapidamente, processar os itens de forma assíncrona, consolidar os resultados e enviar o callback final para a plataforma externa.

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- Swagger/OpenAPI
- Docker Compose
- Bull Board

## Como executar

### 1. Clone o projeto

```bash
git clone <url-do-repositorio>
cd pipeline-enriquecimento-produtos
```

### 2. Configure o ambiente

Crie o arquivo:

```bash
cp backend/.env.example backend/.env
```

Preencha as variáveis necessárias em `backend/.env`.

Principais configurações:

```env
PLATAFORMA_REGISTER_URL=
PLATAFORMA_BASE_URL=
ENRICHMENT_MODE=http
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pipeline_enriquecimento
PLATFORM_AUTH_TTL_SECONDS=300
```

### 3. Suba a aplicação

```bash
docker compose up -d --build
```

Verifique os serviços:

```bash
docker compose ps
```

O backend ficará disponível em:

```text
http://localhost:3000
```

### 4. Exponha o webhook

A plataforma externa precisa acessar os endpoints `/check` e `/process`.

Com ngrok:

```bash
ngrok http 3000
```

Copie a URL HTTPS gerada, por exemplo:

```text
https://xxxx.ngrok-free.app
```

### 5. Teste pelo Swagger

Acesse:

```text
http://localhost:3000/docs
```

Fluxo:

1. Execute `POST /platform/register`.
2. Informe `name` e a URL pública do ngrok em `webhook`.
3. Copie o `cid` e o `token` retornados.
4. Execute `POST /runs/burst`.
5. Informe `cid` e `token`.
6. A partir desse ponto o fluxo é automático.

A plataforma enviará os itens para `/process` e a aplicação executará:

```text
/process
→ ACK
→ fila
→ /enrich
→ consolidação
→ /callback
```

## Observabilidade

Swagger:

```text
http://localhost:3000/docs
```

Bull Board:

```text
http://localhost:3000/admin/queues
```

Health check:

```text
http://localhost:3000/health
```

## Testes

Execute dentro de `backend/`:

```bash
npm test
npm run test:e2e
npm run test:integracao:banco
npm run benchmark:ack
npm run build
npm run lint
```

O teste de integração real com a plataforma externa deve ser executado manualmente, pois cria um registro externo.

## Documentação

- [Autenticação e registro](docs/autenticacao.md)
- [Criação do lote](docs/criacao-lote.md)
- [Processamento assíncrono](docs/processamento.md)
- [Teste real pelo Swagger](docs/teste-real-manual.md)
- [Observabilidade das filas](docs/observabilidade-filas.md)
- [Trade-offs da autenticação efêmera](docs/tradeoffs-autenticacao-efemera.md)
- [Trade-offs do callback](docs/tradeoffs-callback.md)
- [Relatório da melhor execução](docs/melhor-execucao.md)

## Fluxo resumido

```text
/register
   ↓
/check
   ↓
/burst
   ↓
/process
   ↓
BullMQ
   ↓
/enrich
   ↓
consolidação
   ↓
/callback
```
