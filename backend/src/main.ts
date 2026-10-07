import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarSwagger } from './infrastructure/openapi/swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);

  configurarSwagger(app);
  await app.listen(port, '0.0.0.0');
}
await bootstrap();
