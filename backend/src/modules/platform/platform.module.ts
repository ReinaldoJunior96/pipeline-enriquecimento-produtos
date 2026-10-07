import { Module } from '@nestjs/common';
import { PlataformaExternaModule } from '../../infrastructure/platform/plataforma-externa.module.js';
import { PlatformController } from '../runs/platform.controller.js';

@Module({
  imports: [PlataformaExternaModule],
  controllers: [PlatformController],
})
export class PlatformModule {}
