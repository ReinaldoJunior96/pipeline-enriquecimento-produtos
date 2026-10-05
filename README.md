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