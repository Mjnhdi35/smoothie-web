import 'reflect-metadata';

import type { LogLevel } from '@nestjs/common';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { createRequire } from 'node:module';
import compression from 'compression';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './infrastructure/http/filters/global-exception.filter';
import { ResponseInterceptor } from './infrastructure/http/interceptors/response.interceptor';
import { requestIdMiddleware } from './infrastructure/http/middleware/request-id.middleware';
import { PinoLoggerService } from './infrastructure/logging/pino-logger.service';

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
    bufferLogs: true,
    logger: loggerLevels,
  });
  app.useLogger(app.get(PinoLoggerService));

  app.enableShutdownHooks();
  app.use(requestIdMiddleware);
  app.use(helmet());
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
  const corsOrigins = configService.get<string[]>('CORS_ORIGINS') ?? [];
  const jsonBodyLimitBytes =
    configService.get<number>('JSON_BODY_LIMIT_BYTES') ?? 1_048_576;
  const runtimeIsProduction =
    configService.get<string>('NODE_ENV') === 'production';
  app.use(json({ limit: jsonBodyLimitBytes }));
  app.use(urlencoded({ extended: true, limit: jsonBodyLimitBytes }));
  app.use(
    compression({
      level: runtimeIsProduction ? 6 : 1,
      threshold: 1024,
    }),
  );
  app.use(createPinoHttpMiddleware());
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });

  await app.listen(port);
  const server = app.getHttpServer() as {
    keepAliveTimeout?: number;
    headersTimeout?: number;
    requestTimeout?: number;
  };
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 10000;

  const shutdown = async (signal: 'SIGINT' | 'SIGTERM'): Promise<void> => {
    bootstrapLogger.warn(`Received ${signal}, shutting down gracefully`);
    await app.close();
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}
void bootstrap();

type PinoHttpRequestLike = {
  requestId?: string;
};

function createPinoHttpMiddleware(): (
  req: unknown,
  res: unknown,
  next: () => void,
) => void {
  const requireFromCwd = createRequire(__filename);

  try {
    const pinoHttpFactory = requireFromCwd('pino-http') as (options: {
      genReqId: (req: PinoHttpRequestLike) => string | undefined;
      customAttributeKeys: {
        req: string;
        res: string;
        err: string;
        responseTime: string;
      };
      redact: string[];
      quietReqLogger: boolean;
    }) => (req: unknown, res: unknown, next: () => void) => void;

    return pinoHttpFactory({
      genReqId: (req) => req.requestId,
      customAttributeKeys: {
        req: 'request',
        res: 'response',
        err: 'error',
        responseTime: 'latency',
      },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      quietReqLogger: true,
    });
  } catch {
    return (_req, _res, next): void => next();
  }
}
