import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PLATAFORMA_EXTERNA_CLIENT } from '../../../src/modules/runs/application/contracts/plataforma-externa.client.js';
import { PlatformController } from '../../../src/modules/runs/platform.controller.js';

describe('Registro da plataforma pela API (e2e)', () => {
  let app: INestApplication<App>;
  const registrar = vi.fn();

  beforeAll(async () => {
    registrar.mockResolvedValue({ cid: 'cid_fake', token: 'token_fake' });
    const modulo = await Test.createTestingModule({
      controllers: [PlatformController],
      providers: [
        {
          provide: PLATAFORMA_EXTERNA_CLIENT,
          useValue: { registrar, criarLote: vi.fn() },
        },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => registrar.mockClear());

  it('deve devolver as credenciais recebidas sem persistir o token', async () => {
    await request(app.getHttpServer())
      .post('/platform/register')
      .send({
        name: 'Reinaldo Junior',
        webhook: 'https://webhook.example.test',
      })
      .expect(200)
      .expect({ cid: 'cid_fake', token: 'token_fake' });

    expect(registrar).toHaveBeenCalledWith({
      name: 'Reinaldo Junior',
      webhook: 'https://webhook.example.test',
    });
  });

  it.each([
    [{ webhook: 'https://webhook.example.test' }],
    [{ name: 'Teste', webhook: 'nao-e-url' }],
  ])('deve rejeitar request inválida', async (payload) => {
    await request(app.getHttpServer())
      .post('/platform/register')
      .send(payload)
      .expect(400);

    expect(registrar).not.toHaveBeenCalled();
  });
});
