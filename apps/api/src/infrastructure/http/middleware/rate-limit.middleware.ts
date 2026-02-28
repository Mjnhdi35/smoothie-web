import type { NextFunction, Request, Response } from 'express';

interface RateLimitState {
  count: number;
  windowStartedAt: number;
}

const ipState = new Map<string, RateLimitState>();

export function createRateLimitMiddleware(
  maxRequests: number,
  windowMs: number,
) {
  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const current = ipState.get(key);

    if (current === undefined || now - current.windowStartedAt > windowMs) {
      ipState.set(key, { count: 1, windowStartedAt: now });
      next();
      return;
    }

    current.count += 1;

    if (current.count > maxRequests) {
      res.status(429).json({
        statusCode: 429,
        message: 'Rate limit exceeded',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
