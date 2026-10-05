# Autenticação e registro do webhook

O fluxo começa com o registro do webhook na plataforma externa.

A aplicação envia:

```http
POST /register
{
  "name": "Reinaldo",
  "webhook": "https://..."
}

A plataforma realiza um handshake chamando:
POST <webhook>/check

O serviço devolve o mesmo token recebido.
Em caso de sucesso, o /register retorna:
{
  "cid": "...",
  "token": "..."
}
````
![Arquitetura de autenticação](../Arquitetura-Autenticacao-usuario.jpg)