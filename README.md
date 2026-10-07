# Pipeline de Enriquecimento de Produtos

Backend NestJS que recebe lotes de SKUs, confirma o recebimento rapidamente, enriquece os itens de forma assíncrona e envia o resultado consolidado à plataforma externa.

## Arquitetura

- NestJS + TypeScript;
- PostgreSQL/Prisma como fonte da verdade de runs e itens;
- Redis/BullMQ para filas `process-ingress`, `processing` e `callback`;
- workers com concorrência 3 por processo;
- Swagger/OpenAPI para o fluxo operacional e Bull Board local para observabilidade.

O limite de três chamadas simultâneas a `/enrich` é por processo. Com várias réplicas, seria necessário um limitador distribuído para manter um limite global. A escolha do BullMQ mantém o processamento assíncrono, retries e backoff usando o Redis já presente na arquitetura; Kafka ou RabbitMQ não são necessários para o escopo atual.

## Executar localmente

1. Configure `backend/.env` a partir de [`backend/.env.example`](backend/.env.example). Preencha `DATABASE_URL`, `ENRICHMENT_MODE=http`, `PLATAFORMA_REGISTER_URL` e `PLATAFORMA_BASE_URL`.
2. Suba os serviços: `docker compose up -d --build`.
3. Inicie `ngrok http 3000` para expor o webhook durante o registro. A URL atual do ngrok é informada no corpo de `POST /platform/register` pelo Swagger, não precisa ficar no `.env`.
4. Acesse [Swagger](http://localhost:3000/docs), registre o webhook informando nome e URL pública, copie `cid` e `token` e envie-os em `POST /runs/burst`.
5. A plataforma entrega os itens em `/process`; o pipeline processa, consolida e envia o callback automaticamente.

O Compose lê somente `backend/.env`. Os endereços de PostgreSQL e Redis são ajustados para os nomes dos serviços dentro da rede Docker. O CID/token retornados pelo registro não ficam no `.env`: o operador os envia no burst e a aplicação os mantém temporariamente no Redis associados à run. Depois de callback confirmado, a autenticação efêmera é removida.

O Swagger está em `/docs` e o Bull Board local em `/admin/queues`. Não exponha o Bull Board nem os endpoints administrativos pelo ngrok.

## Testes e qualidade

Execute em `backend/`:

```bash
npm test
npm run test:e2e
npm run test:integracao:banco
npm run benchmark:ack
npm run build
npm run lint
npx prettier --check "src/**/*.ts" "test/**/*.ts"
```

As suítes de integração que usam filas Redis compartilhadas devem ser executadas somente com Redis de teste isolado; algumas removem jobs da fila ao preparar e limpar o cenário. O benchmark é local e usa app, filas e repositórios fake: não mede produção.

`npm run test:integracao:autenticacao` chama `PLATAFORMA_REGISTER_URL` real e cria um registro na plataforma. Execute-o manualmente apenas quando quiser validar essa integração, fornecendo `WEBHOOK_PUBLIC_URL` e `NOME_REGISTRO` no ambiente temporário do comando; essas variáveis não são necessárias no fluxo via Swagger e não devem ser adicionadas ao `.env` principal.

## Documentação

- [Autenticação e registro](docs/autenticacao.md)
- [Criação do lote](docs/criacao-lote.md)
- [Processamento](docs/processamento.md)
- [Teste real pelo Swagger](docs/teste-real-manual.md)
- [Observabilidade das filas](docs/observabilidade-filas.md)
- [Trade-offs da autenticação efêmera](docs/tradeoffs-autenticacao-efemera.md)
- [Evidência da melhor execução local](docs/melhor-execucao.md)

## Escala para lotes maiores

Para 20.000 SKUs, manter ACK rápido, persistência/idempotência e processamento assíncrono. Escalar workers exige backpressure e limiter global compatível com o limite do downstream; medir lag e retries, consolidar com paginação/batching, evitar carregar o lote inteiro em memória e validar o tamanho máximo do callback. O TTL das credenciais deve cobrir a duração esperada. Essa estratégia está detalhada em [processamento](docs/processamento.md#e-se-o-lote-tivesse-20000-skus); não representa implementação de escala adicional.
