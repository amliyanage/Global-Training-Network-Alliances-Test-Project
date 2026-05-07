# MenteCart Backend

Production-ready TypeScript backend for the **MenteCart** service booking platform.

It provides authentication, service catalog browsing, cart-based slot reservation, checkout and bookings, payment webhook handling, and safety controls for concurrency and overbooking.

## Project Overview

MenteCart supports a service-booking flow where users:

1. Register/login with JWT authentication.
2. Browse service slots.
3. Add slot-based items to a cart (capacity is reserved on add).
4. Checkout bookings (cash/pay-on-arrival/online via PayHere).
5. Receive strong consistency protections (transactions, status guards, audit logs).

## Architecture

The project follows a layered backend structure:

- `routes`: HTTP route wiring.
- `controllers`: request parsing + response formatting.
- `services`: business logic.
- `repositories`: persistence abstraction for Mongoose operations.
- `models`: MongoDB schemas.
- `middleware`: auth, security, request context/logging, error handling.
- `validators`: request validation with Zod.
- `dtos/types/constants`: typed contracts and reusable enums/constants.

### Key Design Decisions

- **Transactional consistency**: MongoDB sessions are used for critical operations (cart reservation updates, checkout, cancellation, payment notification processing).
- **Overbooking prevention**: slot capacity is atomically decremented when cart items are added or quantities are increased.
- **Cart expiry recovery**: expired cart items are cleaned via background job and their reserved capacity is released.
- **Status governance**: booking status transitions are explicitly guarded and audited.
- **Observability**: structured Pino logging with request IDs and centralized error logging.

## Tech Stack

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT + bcrypt
- Zod validation
- Pino logging
- Helmet + CORS + Rate limiting
- Jest + Supertest (sample API tests)
- Docker + Docker Compose

## Environment Variables

Use `example.env` as template.

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API port | `6000` |
| `MONGODB_URI` | Mongo connection string | `mongodb://127.0.0.1:27017/mentecart` |
| `JWT_SECRET` | JWT signing secret (required) | - |
| `JWT_EXPIRES_IN` | JWT TTL | `24h` |
| `LOG_LEVEL` | Pino log level | env-based |
| `CORS_ORIGINS` | Allowed CORS origins (comma separated or `*`) | `*` |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window | `900000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `MAX_BOOKINGS_PER_DAY` | Daily booking limit per user | `3` |
| `CART_ITEM_EXPIRY_MINUTES` | Cart item expiration time | `15` |
| `CART_CLEANUP_INTERVAL_SECONDS` | Background cleanup interval | `60` |
| `PAYHERE_*` | PayHere checkout/webhook config | optional unless online checkout |

## Setup Instructions

### Local (without Docker)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `example.env`.
3. Start MongoDB with replica-set support (required for transactions).
4. Run development server:
   ```bash
   npm run dev
   ```

## Docker Instructions

### Development stack

```bash
make dev
```

### Production-style container stack

```bash
make up
```

### Detached mode

```bash
make up-f
```

### Stop containers

```bash
make down
```

## API Overview

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Services

- `GET /services`
- `GET /services/:id`

### Cart

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:itemId`
- `DELETE /cart/items/:itemId`

### Bookings

- `POST /bookings/checkout`
- `GET /bookings`
- `GET /bookings/:id`
- `POST /bookings/:id/cancel`
- `POST /bookings/payhere/notify`

### Response Format

Successful responses:

```json
{
  "status": "success",
  "data": {},
  "requestId": "...",
  "timestamp": "..."
}
```

Error responses:

```json
{
  "status": "error",
  "errorCode": "...",
  "message": "...",
  "requestId": "...",
  "path": "...",
  "timestamp": "..."
}
```

## Booking Rules Implemented

- Daily booking limit per user (`MAX_BOOKINGS_PER_DAY`, default 3).
- Cart item auto-expiry (`CART_ITEM_EXPIRY_MINUTES`, default 15).
- Expired cart item cleanup releases reserved capacity.
- Status transition guards:
  - `pending -> confirmed`
  - `confirmed -> completed`
  - `pending -> cancelled`
  - `pending -> failed`
- Invalid transitions return conflict errors.
- Every status change is logged in `BookingStatusAuditLog`.

## Testing

Run tests:

```bash
npm test
```

Current sample suite covers:

- Auth register/login route behavior
- Cart item addition route behavior
- Booking checkout route behavior
- Overbooking conflict behavior

## Postman Usage

1. Import `postman_collection.json`.
2. Set collection variables/environment values:
   - `baseUrl`
   - `token` (after login)
3. Run auth flow first, then cart/booking endpoints.

## Project Structure

```text
src/
  config/
  constants/
  controllers/
  dtos/
  jobs/
  middleware/
  models/
  repositories/
  routes/
  services/
  tests/
  types/
  utils/
  validators/
```

## Known Limitations

- No dedicated admin workflow for manually moving bookings to `completed` yet.
- No dedicated retry strategy for transient Mongo transaction errors.
- No OpenAPI/Swagger spec included yet.
- Sample tests focus on API route behavior; full E2E DB-backed suites can be expanded further.
