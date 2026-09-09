import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { parseNetworkMode } from './common/network/network-mode';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: (
      process.env.CORS_ORIGIN ??
      'http://localhost:4200,http://localhost:3000,http://localhost:3001'
    )
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('BNB Agent Marketplace API')
    .setDescription('DeFi Agent Marketplace POC for BNB Chain')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  const network = parseNetworkMode(process.env.NETWORK);
  await app.listen(port);
  console.log(`API running on http://localhost:${port} [${network}]`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
