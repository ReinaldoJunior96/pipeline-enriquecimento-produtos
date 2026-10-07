# Autenticação e registro

O fluxo começa pelo Swagger da aplicação:

```text
http://localhost:3000/docs
```

## Registro

Execute:

```http
POST /platform/register
```

Body:

```json
{
  "name": "Nome para o registro",
  "webhook": "https://seu-ngrok.ngrok-free.app"
}
```

A aplicação encaminha o registro para a plataforma externa.

Durante o registro, a plataforma valida o webhook chamando:

```http
POST <webhook>/check
```

O endpoint `/check` devolve o token recebido e conclui o handshake.

Em caso de sucesso, o registro retorna:

```json
{
  "cid": "...",
  "token": "..."
}
```

Esses valores são usados no `POST /runs/burst`.

## Credencial durante a execução

O token:

- não é persistido no PostgreSQL;
- não é enviado nos jobs BullMQ;
- não é registrado em logs.

Após a criação da run, `cid` e `token` ficam temporariamente no Redis associados ao `runId`.

```text
platform:auth:run:<runId>
```

O TTL é configurado por:

```text
PLATFORM_AUTH_TTL_SECONDS
```

Padrão:

```text
1800 segundos
```

A credencial é removida após o callback ser confirmado.

## Visão da arquitetura

O diagrama abaixo apresenta uma visão mais ampla do fluxo de autenticação e do ciclo da credencial:

![Arquitetura de autenticação](../Arquitetura-Autenticacao-usuario.jpg)

Para executar o fluxo completo, consulte:

[Teste real manual pelo Swagger](./teste-real-manual.md)
