import { Logger } from '@nestjs/common';
import { RedisClient } from 'bullmq';
import {
  PlatformAuthContext,
  PlatformAuthContextInput,
  PlatformAuthContextStore,
} from '../../modules/platform-auth/application/contracts/platform-auth-context.store.js';
import {
  PlatformAuthContextInvalidError,
  PlatformAuthContextStoreError,
} from './platform-auth-context.errors.js';

export const PLATFORM_AUTH_TTL_SECONDS_PADRAO = 300;

export function obterPlatformAuthTtlSeconds(
  valor = process.env.PLATFORM_AUTH_TTL_SECONDS,
): number {
  if (valor === undefined || valor.trim() === '') {
    return PLATFORM_AUTH_TTL_SECONDS_PADRAO;
  }

  const ttlSeconds = Number(valor);
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error(
      'PLATFORM_AUTH_TTL_SECONDS deve ser um inteiro maior que zero',
    );
  }

  return ttlSeconds;
}

export class RedisPlatformAuthContextStore implements PlatformAuthContextStore {
  private readonly logger = new Logger(RedisPlatformAuthContextStore.name);

  constructor(
    private readonly clienteRedis: Promise<RedisClient>,
    private readonly ttlSeconds = PLATFORM_AUTH_TTL_SECONDS_PADRAO,
  ) {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error(
        'PLATFORM_AUTH_TTL_SECONDS deve ser um inteiro maior que zero',
      );
    }
  }

  async saveForRun(input: PlatformAuthContextInput): Promise<void> {
    const key = this.chave(input.runId);
    try {
      const redis = await this.clienteRedis;
      await redis.set(
        key,
        JSON.stringify({ cid: input.cid, token: input.token }),
        { EX: this.ttlSeconds },
      );
    } catch {
      throw new PlatformAuthContextStoreError('salvar');
    }

    this.logger.log({
      evento: 'auth_context.salvo',
      runId: input.runId,
      cid: input.cid,
      ttlSeconds: this.ttlSeconds,
    });
  }

  async getForRun(runId: string): Promise<PlatformAuthContext | null> {
    let valor: string | null;
    try {
      const redis = await this.clienteRedis;
      valor = await redis.get(this.chave(runId));
    } catch {
      throw new PlatformAuthContextStoreError('consultar');
    }

    if (valor === null) {
      this.logger.warn({ evento: 'auth_context.ausente', runId });
      return null;
    }

    const contexto = this.parsearContexto(valor);
    this.logger.log({
      evento: 'auth_context.encontrado',
      runId,
      cid: contexto.cid,
    });
    return contexto;
  }

  async deleteForRun(runId: string): Promise<void> {
    try {
      const redis = await this.clienteRedis;
      await redis.del(this.chave(runId));
    } catch {
      throw new PlatformAuthContextStoreError('remover');
    }

    this.logger.log({ evento: 'auth_context.removido', runId });
  }

  private chave(runId: string): string {
    return `platform:auth:run:${runId}`;
  }

  private parsearContexto(valor: string): PlatformAuthContext {
    let contexto: unknown;
    try {
      contexto = JSON.parse(valor);
    } catch {
      throw new PlatformAuthContextInvalidError();
    }

    if (typeof contexto !== 'object' || contexto === null) {
      throw new PlatformAuthContextInvalidError();
    }

    const registro = contexto as Record<string, unknown>;
    if (
      typeof registro.cid !== 'string' ||
      registro.cid.trim() === '' ||
      typeof registro.token !== 'string' ||
      registro.token.trim() === ''
    ) {
      throw new PlatformAuthContextInvalidError();
    }

    return { cid: registro.cid, token: registro.token };
  }
}
