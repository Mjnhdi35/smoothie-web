import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

interface LogPayload {
  level: LogLevel | 'fatal';
  message: string;
  context?: string;
  trace?: string;
  timestamp: string;
}

@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor(private readonly isProduction: boolean) {
    super();
  }

  override log(message: string, context?: string): void {
    this.writePayload({
      level: 'log',
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  override error(message: string, trace?: string, context?: string): void {
    this.writePayload({
      level: 'error',
      message,
      trace,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  override warn(message: string, context?: string): void {
    this.writePayload({
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  override debug(message: string, context?: string): void {
    this.writePayload({
      level: 'debug',
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  override verbose(message: string, context?: string): void {
    this.writePayload({
      level: 'verbose',
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  private writePayload(payload: LogPayload): void {
    if (
      this.isProduction &&
      (payload.level === 'debug' || payload.level === 'verbose')
    ) {
      return;
    }

    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }
}
