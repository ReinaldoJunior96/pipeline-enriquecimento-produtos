import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CALLBACK_QUEUE } from './application/contracts/callback.queue.js';
import { BullMqCallbackQueue } from './infrastructure/queues/bullmq-callback.queue.js';
import { CALLBACK_QUEUE_NAME } from './infrastructure/queues/callback-queue.constants.js';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: CALLBACK_QUEUE_NAME })],
  providers: [
    {
      provide: CALLBACK_QUEUE,
      inject: [getQueueToken(CALLBACK_QUEUE_NAME)],
      useFactory: (fila: Queue) => new BullMqCallbackQueue(fila),
    },
  ],
  exports: [CALLBACK_QUEUE, BullModule],
})
export class CallbackQueueModule {}
