import { Global, Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PLATFORM_AUTH_CONTEXT_STORE } from '../../modules/platform-auth/application/contracts/platform-auth-context.store.js';
import { PROCESSING_QUEUE_NAME } from '../../modules/processing/infrastructure/queues/processing-queue.constants.js';
import {
  RedisPlatformAuthContextStore,
  obterPlatformAuthTtlSeconds,
} from './redis-platform-auth-context.store.js';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: PROCESSING_QUEUE_NAME })],
  providers: [
    {
      provide: RedisPlatformAuthContextStore,
      inject: [getQueueToken(PROCESSING_QUEUE_NAME)],
      useFactory: (fila: Queue) =>
        new RedisPlatformAuthContextStore(
          fila.client,
          obterPlatformAuthTtlSeconds(),
        ),
    },
    {
      provide: PLATFORM_AUTH_CONTEXT_STORE,
      useExisting: RedisPlatformAuthContextStore,
    },
  ],
  exports: [PLATFORM_AUTH_CONTEXT_STORE, BullModule],
})
export class PlatformCredentialsModule {}
