import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configurarSwagger(app: INestApplication): void {
  const configuracao = new DocumentBuilder()
    .setTitle('Pipeline de Enriquecimento de Produtos')
    .setDescription(
      'API para integração com plataforma externa, recebimento assíncrono de itens, enriquecimento, retry, idempotência e processamento por filas.',
    )
    .setVersion('1.0.0')
    .addTag('Health')
    .addTag('Plataforma Externa')
    .addTag('Lotes')
    .addTag('Processamento')
    .addTag('Admin')
    .build();

  const documento = SwaggerModule.createDocument(app, configuracao);
  SwaggerModule.setup('docs', app, documento);
}
