import type { NextFunction, Request, Response } from 'express';

interface RateLimitState {
  count: number;
  windowStartedAt: number;
}

const ipState = new Map<string, RateLimitState>();
const MAX_TRACKED_IPS = 20_000;
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

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
    if (now - lastSweepAt > SWEEP_INTERVAL_MS) {
      lastSweepAt = now;
      for (const [ip, state] of ipState) {
        if (now - state.windowStartedAt > windowMs) {
          ipState.delete(ip);
        }
      }
    }

    if (ipState.size > MAX_TRACKED_IPS) {
      const oldest = ipState.keys().next().value;
      if (oldest !== undefined) {
        ipState.delete(oldest);
      }
    }

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
