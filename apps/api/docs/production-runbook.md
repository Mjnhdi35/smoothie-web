# Production Runbook (API)

## Pre-deploy Checklist
- `pnpm --filter @smoothie/api lint`
- `pnpm --filter @smoothie/api tsc`
- `pnpm --filter @smoothie/api test`
- `pnpm --filter @smoothie/api build`

## Performance Guardrails
- HTTP benchmark:
  - `pnpm --filter @smoothie/api benchmark:http`
  - env: `BENCHMARK_URL`, `BENCHMARK_CONCURRENCY`, `BENCHMARK_DURATION_MS`
- Event loop lag:
  - `pnpm --filter @smoothie/api benchmark:event-loop`
- Heap snapshot:
  - `pnpm --filter @smoothie/api profile:heap`

## Database Guardrails
- Analyze slow query:
  - `pnpm --filter @smoothie/api db:explain -- "SELECT ..."`
- Validate no unexpected sequential scan in heavy read path.

## Runtime Safety
- `NODE_ENV=production`
- `NODE_OPTIONS=--no-source-maps`
- Confirm env:
  - `CORS_ORIGINS`
  - `JSON_BODY_LIMIT_BYTES`
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_MAX`
  - `LOG_LEVEL`

## Deployment Smoke
- `GET /health`
- `GET /health/readiness`
- Critical path:
  - `GET /users`
  - `GET /ecommerce/products`
  - `GET /bookings`

## Incident Quick Actions
- DB degraded: inspect Neon connections + long transactions.
- Redis degraded: check connectivity, fallback to DB path for cache misses.
- Latency spike: run `db:explain`, inspect p95/p99 and event-loop lag.
