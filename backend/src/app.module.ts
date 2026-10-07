import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminRunsModule } from './infrastructure/admin/admin-runs.module.js';
import { PrismaModule } from './infrastructure/database/prisma.module.js';
import { BullBoardObservabilityModule } from './infrastructure/observability/bull-board.module.js';
import { BullmqInfrastructureModule } from './infrastructure/queue/bullmq-infrastructure.module.js';
import { PlatformCredentialsModule } from './infrastructure/platform-credentials/platform-credentials.module.js';
import { CallbackQueueModule } from './modules/callback/callback-queue.module.js';
import { ProcessingModule } from './modules/processing/processing.module.js';
import { PlatformModule } from './modules/platform/platform.module.js';
import { RunsModule } from './modules/runs/runs.module.js';
import { WebhookModule } from './modules/webhook/webhook.module.js';

@Module({
  imports: [
    PrismaModule,
    AdminRunsModule.register(),
    BullmqInfrastructureModule,
    PlatformCredentialsModule,
    CallbackQueueModule,
    ProcessingModule,
    PlatformModule,
    RunsModule,
    BullBoardObservabilityModule.register(),
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(),
    },
  ],
})
export class AppModule {}
