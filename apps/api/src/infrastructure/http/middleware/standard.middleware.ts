import type { INestApplication, LoggerService } from '@nestjs/common';
import { createRequire } from 'node:module';
import { securityHeadersMiddleware } from './security-headers.middleware';

type MiddlewareFactory = (
  ...args: never[]
) => (req: unknown, res: unknown, next: () => void) => void;

const requireFromCwd = createRequire(__filename);

function loadOptionalMiddleware(packageName: string): MiddlewareFactory | null {
  try {
    const loaded = requireFromCwd(packageName) as unknown;
    if (typeof loaded === 'function') {
      return loaded as MiddlewareFactory;
    }

    if (
      loaded !== null &&
      typeof loaded === 'object' &&
      'default' in loaded &&
      typeof (loaded as { default: unknown }).default === 'function'
    ) {
      return (loaded as { default: MiddlewareFactory }).default;
    }
  } catch {
    return null;
  }

  return null;
}

export function applyStandardMiddleware(
  app: INestApplication,
  logger: LoggerService,
): void {
  const helmetFactory = loadOptionalMiddleware('helmet');
  if (helmetFactory !== null) {
    app.use(helmetFactory());
  } else {
    app.use(securityHeadersMiddleware);
    logger.warn(
      'helmet not installed, using fallback security headers middleware',
    );
  }

  const compressionFactory = loadOptionalMiddleware('compression');
  if (compressionFactory !== null) {
    app.use(compressionFactory());
  } else {
    logger.warn('compression not installed, response compression disabled');
  }
}
