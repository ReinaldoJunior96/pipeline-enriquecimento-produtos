# Observabilidade das filas

O Bull Board fica disponível em `http://localhost:3000/admin/queues`.

O painel mostra as filas BullMQ `process-ingress`, `processing` e `callback`, já registradas pela aplicação, e funciona em modo somente leitura. Ele não cria, consome, remove, promove nem repete jobs. A fila `process-ingress` contém itens aguardando a persistência da respectiva run; `callback` contém a consolidação e o envio do resultado ao final do lote.

