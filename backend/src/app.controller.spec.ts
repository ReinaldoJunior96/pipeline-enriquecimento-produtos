import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('Controlador principal', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('raiz', () => {
    it('deve informar que o serviço está em execução', () => {
      expect(appController.getHello()).toEqual({
        service: 'pipeline-enriquecimento-produtos',
        status: 'running',
      });
    });
  });
});
