import 'reflect-metadata';

import type { LogLevel } from '@nestjs/common';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './infrastructure/http/filters/global-exception.filter';
import { ResponseInterceptor } from './infrastructure/http/interceptors/response.interceptor';
import { createRateLimitMiddleware } from './infrastructure/http/middleware/rate-limit.middleware';
import { applyStandardMiddleware } from './infrastructure/http/middleware/standard.middleware';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const loggerLevels: LogLevel[] = isProduction
    ? ['error', 'warn', 'log']
    : ['error', 'warn', 'log', 'debug', 'verbose'];
  const bootstrapLogger = new Logger('Bootstrap');

  process.on('unhandledRejection', (reason) => {
    bootstrapLogger.error(
      `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
    );
  });
  process.on('uncaughtException', (error) => {
    bootstrapLogger.error(`Uncaught exception: ${error.message}`, error.stack);
    process.exit(1);
  });

  const app = await NestFactory.create(AppModule, {
    logger: loggerLevels,
  });

  app.enableShutdownHooks();
  applyStandardMiddleware(app, bootstrapLogger);
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
