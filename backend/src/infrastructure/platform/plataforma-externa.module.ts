import { Module } from '@nestjs/common';
import { PLATAFORMA_EXTERNA_CLIENT } from '../../modules/runs/application/contracts/plataforma-externa.client.js';
import { HttpPlataformaExternaClient } from '../../modules/runs/infrastructure/clients/http-plataforma-externa.client.js';

@Module({
  providers: [
    {
      provide: PLATAFORMA_EXTERNA_CLIENT,
      useFactory: () =>
        new HttpPlataformaExternaClient({
          registerUrl: process.env.PLATAFORMA_REGISTER_URL ?? '',
          baseUrl: process.env.PLATAFORMA_BASE_URL ?? '',
        }),
    },
  ],
  exports: [PLATAFORMA_EXTERNA_CLIENT],
})
export class PlataformaExternaModule {}
