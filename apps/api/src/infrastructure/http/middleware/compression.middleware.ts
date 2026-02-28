import { gzipSync } from 'node:zlib';
import type { NextFunction, Request, Response } from 'express';

const MIN_BYTES_TO_COMPRESS = 1024;

export function compressionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const acceptEncoding = req.headers['accept-encoding'] ?? '';

  if (typeof acceptEncoding !== 'string' || !acceptEncoding.includes('gzip')) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    const payload = Buffer.from(JSON.stringify(body));

    if (payload.byteLength < MIN_BYTES_TO_COMPRESS) {
      return originalJson(body);
    }

    const compressed = gzipSync(payload);

    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', compressed.byteLength);

    return res.send(compressed);
  }) as Response['json'];

  next();
}
