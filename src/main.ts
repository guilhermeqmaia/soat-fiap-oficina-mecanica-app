import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers. CSP desabilitado para nao quebrar o Swagger UI em dev;
  // os demais headers (nosniff, frameguard, HSTS, etc.) permanecem ativos.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  const allowedOrigins = (process.env.WEB_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI expoe todo o surface da API e exemplos — desabilitado em
  // producao para evitar information disclosure.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Oficina Mecânica API')
      .setDescription('API do sistema integrado de oficina mecânica')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Encerra recursos (ex.: conexao Prisma via onModuleDestroy) ao receber
  // SIGTERM/SIGINT — essencial para rolling deploys sem cortar requests em voo.
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
