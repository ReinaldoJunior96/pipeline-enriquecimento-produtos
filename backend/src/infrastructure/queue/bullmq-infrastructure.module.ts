import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.forRoot({
      prefix: process.env.BULLMQ_PREFIX ?? 'bull',
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
  ],
})
export class BullmqInfrastructureModule {}
