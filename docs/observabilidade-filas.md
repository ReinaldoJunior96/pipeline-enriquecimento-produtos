# Observabilidade das filas

O Bull Board fica disponível em `http://localhost:3000/admin/queues` quando `BULL_BOARD_ENABLED=true`.

O painel reutiliza a fila BullMQ `processing` já registrada pela aplicação e funciona em modo somente leitura. Ele não cria, consome, remove, promove nem repete jobs.

## Segurança

A rota é destinada exclusivamente ao ambiente local e de desenvolvimento. Ela não deve ser exposta publicamente em produção sem autenticação e autorização.

Não há credenciais do Redis ou de outros serviços no código do painel. Os detalhes da conexão Redis também ficam ocultos na interface.

Ao usar um túnel como ngrok para testar integrações externas, não exponha a rota do Bull Board. Mantenha o acesso ao painel restrito ao `localhost`.

Para desabilitar o painel, configure:

```env
BULL_BOARD_ENABLED=false
```
