import { Injectable, LoggerService, type LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRequire } from 'node:module';

interface StructuredLogger {
  info(bindings: object, message: unknown): void;
  error(bindings: object, message: unknown): void;
  warn(bindings: object, message: unknown): void;
  debug(bindings: object, message: unknown): void;
  trace(bindings: object, message: unknown): void;
}

interface PinoFactory {
  (options: object): StructuredLogger;
  stdTimeFunctions?: {
    isoTime?: () => string;
  };
}

function normalizeLevel(level: string | undefined): LogLevel {
  const normalized = (level ?? 'info').trim().toLowerCase();
  const allowed: LogLevel[] = [
    'fatal',
    'error',
    'warn',
    'log',
    'debug',
    'verbose',
  ];

  return allowed.includes(normalized as LogLevel)
    ? (normalized as LogLevel)
    : 'log';
}

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: StructuredLogger;
  private logLevels = new Set<LogLevel>([
    'fatal',
    'error',
    'warn',
    'log',
    'debug',
    'verbose',
  ]);

  constructor(configService: ConfigService) {
    const env = configService.get<string>('NODE_ENV') ?? 'development';
    const level = normalizeLevel(configService.get<string>('LOG_LEVEL'));

    const requireFromCwd = createRequire(__filename);

    try {
      const pinoFactory = requireFromCwd('pino') as PinoFactory;
      this.logger = pinoFactory({
        level: level === 'log' ? 'info' : level,
        messageKey: 'message',
        base: { service: 'smoothie-api', env },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.password_hash',
            '*.token',
            '*.secret',
          ],
          censor: '[REDACTED]',
        },
        timestamp: pinoFactory.stdTimeFunctions?.isoTime,
      });
    } catch {
      this.logger = createFallbackLogger();
    }
  }

  setLogLevels(levels: LogLevel[]): void {
    this.logLevels = new Set(levels);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.logLevels.has('log')) {
      return;
    }

    const [context] = optionalParams;
    this.logger.info({ context }, message);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.logLevels.has('error')) {
      return;
    }

    const [trace, context] = optionalParams;
    this.logger.error({ context, trace }, message);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.logLevels.has('warn')) {
      return;
    }

    const [context] = optionalParams;
    this.logger.warn({ context }, message);
  }

  debug?(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.logLevels.has('debug')) {
      return;
    }

    const [context] = optionalParams;
    this.logger.debug({ context }, message);
  }

  verbose?(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.logLevels.has('verbose')) {
      return;
    }

    const [context] = optionalParams;
    this.logger.trace({ context }, message);
  }
}

function createFallbackLogger(): StructuredLogger {
  const write = (level: string, bindings: object, message: unknown): void => {
    process.stdout.write(
      `${JSON.stringify({
        level,
        message,
        ...bindings,
        timestamp: new Date().toISOString(),
      })}\n`,
    );
  };

  return {
    info(bindings, message) {
      write('info', bindings, message);
    },
    error(bindings, message) {
      write('error', bindings, message);
    },
    warn(bindings, message) {
      write('warn', bindings, message);
    },
    debug(bindings, message) {
      write('debug', bindings, message);
    },
    trace(bindings, message) {
      write('trace', bindings, message);
    },
  };
}
