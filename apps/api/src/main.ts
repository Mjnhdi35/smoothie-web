import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './infrastructure/http/filters/global-exception.filter';
import { ResponseInterceptor } from './infrastructure/http/interceptors/response.interceptor';
import { compressionMiddleware } from './infrastructure/http/middleware/compression.middleware';
import { createRateLimitMiddleware } from './infrastructure/http/middleware/rate-limit.middleware';
import { requestLoggerMiddleware } from './infrastructure/http/middleware/request-logger.middleware';
import { securityHeadersMiddleware } from './infrastructure/http/middleware/security-headers.middleware';
import { AppLogger } from './infrastructure/logging/app-logger.service';

async function bootstrap() {
  const bootstrapLogger = new AppLogger(process.env.NODE_ENV === 'production');
  const app = await NestFactory.create(AppModule, {
    logger: bootstrapLogger,
  });

  app.enableShutdownHooks();
  app.useLogger(bootstrapLogger);
  app.use(requestLoggerMiddleware);
  app.use(securityHeadersMiddleware);
  app.use(compressionMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');
  const rateLimitWindowMs =
    configService.get<number>('RATE_LIMIT_WINDOW_MS') ?? 60000;
  const rateLimitMax = configService.get<number>('RATE_LIMIT_MAX') ?? 100;

  app.use(createRateLimitMiddleware(rateLimitMax, rateLimitWindowMs));

  await app.listen(port);
  const server = app.getHttpServer() as {
    keepAliveTimeout?: number;
    headersTimeout?: number;
    requestTimeout?: number;
  };
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 10000;
}
void bootstrap();
