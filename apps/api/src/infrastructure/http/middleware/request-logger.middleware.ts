import type { NextFunction, Request, Response } from 'express';

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - startedAt;
    const elapsedMs = Number(elapsedNs) / 1_000_000;

    process.stdout.write(
      `${JSON.stringify({
        level: 'info',
        message: 'request_completed',
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        latencyMs: Number(elapsedMs.toFixed(2)),
        timestamp: new Date().toISOString(),
      })}\n`,
    );
  });

  next();
}
