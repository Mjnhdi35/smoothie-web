# Smoothie API - Modular Monolith (Production Baseline)

## Architecture

This codebase is a modular monolith with strict domain boundaries.

- No domain service imports another domain service directly.
- Cross-domain communication is done through `EventBus` abstraction.
- Domain modules are stateless and ready for future microservice extraction.

```
src/
  modules/
    users/
    auth/
    ecommerce/
    booking/
    blog/
    landing/
    chat/
    health/
  infrastructure/
    database/
    redis/
    events/
    http/
    logging/
  common/
  config/
  main.ts
```

## Runtime Stack

- Node.js 22
- NestJS 11.1.14
- Knex + PostgreSQL 17 (Neon)
- Redis (pub/sub + cache + idempotency)
- TypeScript strict + CommonJS

## Core Design Decisions

- `EventBus` abstraction allows replacing Redis with Kafka later without touching domain services.
- `RedisPublisher` / `RedisSubscriber` are separated for safer reconnect and cleaner responsibilities.
- Query filters are built dynamically with reusable `FilterBuilder` + cursor pagination helpers.
- No `SELECT *` in repositories.
- DB pool and timeout tuned for Neon free-tier.

## Environment

Copy `.env.example` to `.env`.

Required:
- `DATABASE_URL`
  - Use `sslmode=verify-full` for Neon production TLS verification.

Optional:
- `REDIS_URL`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `CHAT_WS_PORT`
- `CHAT_SOCKET_RATE_LIMIT_WINDOW_MS`
- `CHAT_SOCKET_RATE_LIMIT_MAX`
- `CHAT_SOCKET_MAX_BUFFER_BYTES`
- `CHAT_MAX_CONNECTIONS`
- `CHAT_MAX_INFLIGHT_MESSAGES_PER_SOCKET`

## Database Configuration (Neon Free Tier)

- SSL required
- pool: `min=0`, `max=5`
- `idleTimeoutMillis=30000`
- `statement_timeout=5000`
- `query_timeout=5000`
- bootstrap retry for cold start

## Migrations

```bash
pnpm --filter @smoothie/api migrate:latest
pnpm --filter @smoothie/api migrate:rollback
pnpm --filter @smoothie/api migrate:make -- migration_name
```

Tables include:
- users
- auth_sessions
- products, inventory, orders, order_items
- hotels, rooms, bookings
- blog_posts
- landing_pages
- chat_messages

3NF incremental migration set (split by domain) starts at:
- `20260301090000_create_roles_table.ts`
- `20260301090100_extend_users_for_rbac_and_auth.ts`
- `20260301090200_normalize_products_categories.ts`
- `20260301090300_harden_orders_and_order_items.ts`
- `20260301090400_create_addresses_and_extend_hotels_rooms.ts`
- `20260301090500_extend_bookings_for_date_range.ts`
- `20260301090600_create_blog_tags_tables.ts`
- `20260301090700_create_landing_sections_table.ts`
- `20260301090800_create_chat_rooms_and_participants.ts`
- `20260301090900_create_admin_logs_tables.ts`

## Seeds

Domain-split seed files:
- `src/database/seeds/001_roles.ts`
- `src/database/seeds/002_users.ts`
- `src/database/seeds/003_ecommerce.ts`
- `src/database/seeds/004_booking.ts`
- `src/database/seeds/005_blog.ts`
- `src/database/seeds/006_landing.ts`
- `src/database/seeds/007_chat.ts`

Run seed (non-production only):

```bash
pnpm --filter @smoothie/api seed:run -- --env=development
```

Seed runner blocks production by policy.

Default demo credentials:
- `admin@smoothie.local` / `Admin#2026!`
- `staff.ops@smoothie.local` / `Staff#2026!`
- `customer01@smoothie.local` / `User#2026!`

## Run

```bash
pnpm --filter @smoothie/api start:dev
pnpm --filter @smoothie/api start:prod
```

## API Examples

### Users

```bash
curl 'http://localhost:3000/users?email=john@example.com&limit=20&cursor=<cursor>'
```

### Ecommerce

```bash
curl 'http://localhost:3000/ecommerce/products?category=electronics&priceMin=100&priceMax=1000&limit=20'

curl -X POST 'http://localhost:3000/ecommerce/orders' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "8d7d9e37-31db-4389-b4de-58e55fe20e18",
    "idempotencyKey": "order-2026-0001",
    "items": [{"productId":"52a271f1-e0d5-46e0-bf01-0eca1457dd2f","quantity":1}]
  }'
```

### Booking

```bash
curl 'http://localhost:3000/bookings?hotelId=<hotelId>&dateFrom=2026-03-01&dateTo=2026-03-10&limit=20'

curl -X POST 'http://localhost:3000/bookings' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"<uuid>","roomId":"<uuid>","stayDate":"2026-03-01"}'
```

### Blog

```bash
curl 'http://localhost:3000/blog/posts?status=published&tag=tech&limit=20'
```

### Landing

```bash
curl 'http://localhost:3000/landing/pages?status=published&limit=20'
```

### Chat

HTTP send message:

```bash
curl -X POST 'http://localhost:3000/chat/messages' \
  -H 'Content-Type: application/json' \
  -d '{
    "roomId":"<uuid>",
    "senderId":"<uuid>",
    "message":"hello",
    "ackId":"ack-1"
  }'
```

WebSocket endpoint (raw ws): `ws://localhost:${CHAT_WS_PORT}`

Payload format:

```json
{
  "roomId": "<uuid>",
  "senderId": "<uuid>",
  "message": "hello",
  "ackId": "ack-1"
}
```

## Health

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/readiness
```

## Quality Checks

```bash
pnpm --filter @smoothie/api lint
pnpm --filter @smoothie/api tsc
pnpm --filter @smoothie/api test
```

## Tradeoffs

- Redis is currently the event transport for internal domain events and chat fan-out. Adapter boundary exists so Kafka can replace it later.
- Raw `ws` server is used due dependency/network constraints in this environment; gateway logic is isolated in module so migration to Nest WebSocket gateway is straightforward.
- Compression middleware is intentionally disabled to avoid sync CPU spikes on low-resource free tiers.
