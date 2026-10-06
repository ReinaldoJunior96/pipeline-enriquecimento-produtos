import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './infrastructure/database/prisma.module.js';
import { ProcessingModule } from './modules/processing/processing.module.js';
import { WebhookModule } from './modules/webhook/webhook.module.js';

@Module({
  imports: [PrismaModule, ProcessingModule, WebhookModule],
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
