import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      service: 'pipeline-enriquecimento-produtos',
      status: 'running',
    };
  }
}
