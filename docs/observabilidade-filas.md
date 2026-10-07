# Observabilidade das filas

O Bull Board fica disponível em `http://localhost:3000/admin/queues` quando `BULL_BOARD_ENABLED=true`.

O painel mostra as filas BullMQ `process-ingress`, `processing` e `callback`, já registradas pela aplicação, e funciona em modo somente leitura. Ele não cria, consome, remove, promove nem repete jobs. A fila `process-ingress` contém itens aguardando a persistência da respectiva run; `callback` contém a consolidação e o envio do resultado ao final do lote.

## Segurança

A rota é destinada ao ambiente local e de desenvolvimento. Não a exponha publicamente em produção sem autenticação e autorização.

Os detalhes da conexão Redis ficam ocultos na interface. O token não é incluído nos payloads BullMQ.

Ao usar um túnel como ngrok para testar integrações externas, não exponha a rota do Bull Board. Mantenha o acesso ao painel restrito ao `localhost`.

Para desabilitar o painel, configure:

```env
BULL_BOARD_ENABLED=false
```
