# Smoothie API Architecture & Technical Decisions

Tài liệu kỹ thuật phải phản ánh chính xác kiến trúc và quyết định kỹ thuật của hệ thống, có phân tích trade-off, complexity và production constraint. Không viết tài liệu lý thuyết chung chung.

## 1. System Overview

### 1.1 Domain Scope
- `ecommerce`: products, inventory, orders, order_items.
- `booking`: hotels, rooms, bookings.
- `blog`: blog_posts, tags, post_tags.
- `landing`: landing_pages, sections.
- `chat realtime`: chat_messages + chat_rooms + chat_participants, publish event qua Redis.

### 1.2 Context Diagram
```text
[Client Web/Mobile]
        |
        v
[NestJS API - apps/api]
  |  Controller -> Service -> Repository
  |               |            |
  |               |            v
  |               |         [PostgreSQL 17 / Neon]
  |               v
  |          [Redis cache/idempotency/pubsub]
  v
[HTTP + WS responses]
```

### 1.3 Non-Functional Targets
- Latency target (read path có index): p95 < 100ms cho query list phổ biến.
- Concurrency target: phù hợp free-tier trước, scale ngang qua stateless API + Redis pub/sub.
- Cost constraint: Neon free-tier => pool nhỏ (`min:0`, `max:5`), timeout ngắn, tránh idle connection dài.

## 2. Architecture

### 2.1 Flow
```text
Controller -> Service -> Repository -> DB
```
- Không CQRS.
- Không Hexagonal phức tạp.
- Service phụ thuộc repository abstraction token (DIP), không phụ thuộc trực tiếp Knex implementation.

### 2.2 Why this Architecture
- Giảm độ phức tạp cho team nhỏ/phase đầu.
- Giữ testability tốt (mock repository ở service layer).
- Tối ưu tốc độ thay đổi business logic mà không tạo nhiều layer dư.

### 2.3 Dependency Graph (rút gọn)
```text
Controller
  -> Service
    -> RepositoryPort (token)
      -> KnexRepository (implementation)
        -> KNEX client
Service
  -> RedisCache/Idempotency/EventBus (khi cần)
```

## 3. Runtime Flow

### 3.1 Request Lifecycle
```text
Request
 -> requestId middleware
 -> helmet + compression middleware
 -> rate-limit middleware
 -> ValidationPipe
 -> RolesGuard (metadata cache)
 -> ResponseInterceptor
 -> Controller
 -> Service
 -> Repository
 -> DB/Redis
 -> ResponseInterceptor envelope
 -> Response
```

### 3.2 Event Loop Awareness
- Không dùng sync crypto/fs trong request path.
- Không xử lý nặng trong Redis subscriber callback.
- Dùng async I/O (Postgres/Redis).
- Tránh `await` tuần tự trong loop khi có thể batch (`insert([...])`, `Promise.all`).

### 3.3 Microtask/Macrotask
- Microtask chủ yếu từ `await/Promise` continuation.
- Macrotask từ I/O callbacks (HTTP/Redis/DB).
- Không dùng promise chain vô hạn; không loop microtask tự tạo.

## 4. Database Design

### 4.1 ERD (text)
```text
roles (1) ----< users >----(N) auth_sessions
users (1) ----< orders ----< order_items >---- products >---- categories
products (1) --1 inventory

addresses (1) ----< hotels (1) ----< rooms (1) ----< bookings >---- users

users (1) ----< blog_posts >----< post_tags >---- tags
landing_pages (1) ----< sections

chat_rooms >----< chat_participants >---- users
chat_rooms (1) ----< chat_messages >---- users

audit_logs, activity_logs -> users (nullable FK)
```

### 4.2 3NF Summary
- Không lưu thông tin user lặp lại trong orders/messages.
- M2M qua bảng trung gian (`post_tags`, `chat_participants`).
- Snapshot giá tại thời điểm order dùng `order_items.price_at_time` (denormalization có chủ đích cho tính đúng lịch sử giao dịch).

### 4.3 Index Strategy
- Index FK và cột filter thường dùng: 
  - users(email lower unique partial), name, created_at
  - orders(user_id, created_at), order_items(order_id, product_id)
  - bookings(room_id, stay_date/check_in), bookings(user_id)
  - blog_posts(status, created_at), tag
  - chat_messages(room_id, created_at)
- Không `SELECT *` trong repository production path.

### 4.4 Transaction & Concurrency
- Ecommerce order create dùng transaction: insert order + order_items + inventory decrement.
- Booking create lock/constraint để tránh double-booking (unique room/date hiện tại; mở rộng range lock theo `check_in/check_out` khi chuyển fully range booking).
- Multi-write luôn gom trong transaction ngắn.

## 5. Redis Strategy

### 5.1 Patterns
- Cache-aside: `get -> miss -> DB -> set TTL`.
- Idempotency key cho order endpoint.
- Pub/Sub cho internal events + chat broadcast.

### 5.2 Key Naming Convention
- `products:list:*`
- `blog:list:*`
- `landing:list:*`
- `auth:session:{sessionId}`
- `idempotency:orders:{key}`

### 5.3 TTL Policy
- Product list: 60s
- Blog list: 90s
- Landing list: 120s
- Session TTL theo `AUTH_SESSION_TTL_SECONDS`

### 5.4 Pub/Sub Flow
```text
Service -> EventBus.publish -> Redis channel
Subscriber -> lightweight dispatch -> module handler
```

## 6. Data Structure & Algorithm Decisions

### 6.1 Map over Array.find
- Dùng `Map` cho lookup category id trong seed/mapping (`O(1)` lookup) thay vì `Array.find` lặp (`O(n)`).
- Khi chạy nhiều lookup: từ `O(n*m)` giảm còn `O(n+m)`.

### 6.2 Complexity Notes
- Cursor pagination query: `O(limit)` data transfer, index-driven seek thay vì offset scan lớn.
- Cache metadata guard: `Map.get(handler)` `O(1)` mỗi request.

### 6.3 Memory Trade-offs
- Chọn cache TTL ngắn, không cache graph lớn.
- Redis thay vì in-memory global cache để an toàn multi-instance và tránh leak process memory.

### 6.4 Pagination Strategy
- Dùng cursor (`created_at`, `id`) để ổn định khi data lớn.
- Tránh `OFFSET` lớn vì cost tăng theo page depth.

## 7. Security Design

### 7.1 Auth Flow (current)
- `POST /auth/login`: tạo `sessionId` + `expiresAt`.
- Lưu session trong Postgres (`auth_sessions`) + cache Redis.
- `POST /auth/logout`: revoke session + xóa cache.

### 7.2 Password Hashing
- Seed dùng `pgcrypto` (`crypt + gen_salt('bf')`) async ở DB path.
- Dependency `bcrypt` đã khai báo để chuyển dần toàn bộ hash policy app-level.

### 7.3 API Protection
- ValidationPipe global (`whitelist`, `forbidNonWhitelisted`, `transform`).
- RolesGuard dùng metadata `@Roles(...)` + cache metadata bootstrap.
- Rate limit middleware hiện tại (sẽ thay bằng Nest Throttler khi package install hoàn chỉnh).

### 7.4 Error Safety
- Error envelope chuẩn, không trả stacktrace SQL/internal details ra client.

## 8. Production Considerations

### 8.1 Scaling
- Stateless app layer, scale ngang bằng nhiều instance.
- Redis pub/sub hỗ trợ multi-instance chat/event.

### 8.2 Pool Sizing
- Postgres pool: `min:0`, `max:5`, timeout ngắn phù hợp Neon free tier.

### 8.3 Logging & Monitoring
- Log level theo env.
- Có request id (`x-request-id`) để trace.
- Health + readiness endpoint có DB/Redis check + version.

### 8.4 Failure Scenarios
- Neon/Redis transient failure: health degraded/readiness fail.
- Cold start DNS/network failure: retry strategy ở DB bootstrap.
- Cache miss fallback DB luôn khả dụng nếu DB up.

## 9. Folder Structure (Actual)

```text
src/
  app.module.ts
  main.ts
  config/
  common/
    auth/
    events/
    query/
    repository/
  infrastructure/
    database/
    events/
    http/
    redis/
  modules/
    auth/
    users/
    ecommerce/
    booking/
    blog/
    landing/
    chat/
    health/
  database/
    migrations/
    seeds/
```

## 10. Technical Decisions Log (Why Not?)

### 10.1 Why not CQRS?
- Domain hiện tại chưa đủ phức tạp để tách command/query model.
- CQRS tăng số class/boilerplate, tăng cost maintain và cognitive load.

### 10.2 Why not Hexagonal?
- Với scope hiện tại, layered architecture + repository token đã đủ tách concern.
- Hexagonal full sẽ thêm abstraction cost lớn hơn lợi ích ngắn hạn.

### 10.3 Why not in-memory cache?
- Không an toàn khi scale multi-instance.
- Dễ memory leak/process restart mất dữ liệu.
- Redis TTL + eviction policy phù hợp production hơn.

### 10.4 Why not OFFSET pagination?
- OFFSET lớn buộc DB scan bỏ qua nhiều row, chi phí tăng theo trang.
- Cursor seek tốt hơn cho latency và cost.

### 10.5 Why custom middleware thay vì lib đầy đủ?
- Không chọn custom middleware cho security/rate-limit path.
- Hệ thống đang dùng battle-tested lib: `helmet`, `compression`, `@nestjs/throttler`.

---

## Appendix: Critical Endpoints
- `GET /health`, `GET /health/readiness`
- `POST /auth/login`, `POST /auth/logout`
- `GET/POST/PATCH/DELETE /users`
- `GET /ecommerce/products`, `POST /ecommerce/orders`
- `GET/POST /bookings`
- `GET/POST /blog/posts`
- `GET/POST /landing/pages`
- `POST /chat/messages`
