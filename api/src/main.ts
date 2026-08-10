import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Desafio Técnico - Backend')
    .setDescription(
      'API do desafio técnico de transações financeiras: autenticação JWT, categorias e movimentações.'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, swaggerDocument);

  app.enableCors({
    origin: '*',
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  const configService = app.get(ConfigService);
  const port = Number(configService.get('PORT', 3001));

  await app.listen(port, '0.0.0.0');
}
bootstrap();