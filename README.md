# Pipeline de Enriquecimento de Produtos

Serviço backend para processamento assíncrono de lotes de SKUs, com idempotência, controle de concorrência, retries, persistência e consolidação de resultados.

## Arquitetura

A solução foi dividida em três fluxos principais:

- [1. Autenticação e registro do webhook](/docs/autenticacao.md)
- [2. Criação do lote](/docs/criacao-lote.md)
- [3. Processamento assíncrono](/docs/processamento.md)

## Visão geral

O fluxo completo considera:

- entrega `at-least-once`;
- mensagens duplicadas;
- ordem não garantida;
- ACK rápido;
- limite de 3 chamadas simultâneas ao `/enrich`;
- retries para falhas transitórias;
- persistência e acompanhamento do lote;
- callback ao final do processamento.

## Status

Arquitetura definida. Implementação em andamento.



=====================
### Validação da integração

O fluxo de registro do webhook foi validado contra a API externa real.

A chamada `POST /register` foi iniciada via `curl`, utilizando a URL pública do backend exposta por ngrok.

Durante o registro, a plataforma externa executou o handshake no endpoint `POST /check` e, após a validação, retornou com sucesso um `cid` e um `token`.

Isso confirmou o funcionamento do fluxo:

`/register → /check → cid + token`