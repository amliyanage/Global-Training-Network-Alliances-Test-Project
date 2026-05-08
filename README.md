# Global Training Network Alliances Test Project (MenteCart Backend)

## Project Summary

This project is a TypeScript + Express backend for a slot-based service booking platform.

Main capabilities:
- JWT-based auth (`register`, `login`, `me`)
- Service catalog and slot listing
- Cart-based slot reservation with expiry cleanup
- Booking checkout (`cash`, `pay_on_arrival`, `online`)
- PayHere checkout payload generation + webhook verification
- Booking status transition guards + audit logging

## Tech Stack

- Node.js
- TypeScript
- Express 5
- MongoDB + Mongoose
- Zod (request validation)
- JWT + bcrypt
- Pino (structured logging)
- Jest + Supertest (configured, but see limitations)
- Docker + Docker Compose

## Prerequisites

- Node.js `20+` and npm
- MongoDB replica set support (transactions are used in cart/booking flows)
- Optional: Docker + Docker Compose (recommended for quick setup)
- Optional: PayHere sandbox merchant account for online payment testing

## Environment Variables

Copy `example.env` to `.env` and adjust values.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` / `test` / `production` |
| `PORT` | No | `6000` | API port |
| `MONGODB_URI` | No | `mongodb://127.0.0.1:27017/mentecart` | Use replica set URI for transaction support |
| `JWT_SECRET` | Yes | - | Minimum 10 chars |
| `JWT_EXPIRES_IN` | No | `24h` | JWT TTL |
| `LOG_LEVEL` | No | env-based | Auto defaults by env when not set |
| `CORS_ORIGINS` | No | `*` | Comma-separated origins supported |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | 15 min default |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `MAX_BOOKINGS_PER_DAY` | No | `3` | Per-user daily booking limit |
| `CART_ITEM_EXPIRY_MINUTES` | No | `15` | Cart reservation expiry |
| `CART_CLEANUP_INTERVAL_SECONDS` | No | `60` | Background cleanup job interval |
| `PAYHERE_SANDBOX` | No | `true` | Use sandbox unless set to `false` |
| `PAYHERE_MERCHANT_ID` | Conditional | - | Needed for online checkout |
| `PAYHERE_MERCHANT_SECRET` | Conditional | - | Needed for online checkout + signature checks |
| `PAYHERE_NOTIFY_URL` | Conditional | - | Must be publicly reachable by PayHere |
| `PAYHERE_RETURN_URL` | Conditional | - | Frontend return URL |
| `PAYHERE_CANCEL_URL` | Conditional | - | Frontend cancel URL |
| `PAYHERE_CURRENCY` | No | `LKR` | Uppercased internally |
| `PAYHERE_CHECKOUT_URL` | No | auto by sandbox/live | Override only if needed |

`PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_NOTIFY_URL`, `PAYHERE_RETURN_URL`, and `PAYHERE_CANCEL_URL` must be configured together if online checkout is enabled.

## Step-by-Step Run Instructions

### Option A: Local Node.js Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp example.env .env
   ```
3. Start MongoDB replica set (easiest via Docker):
   ```bash
   docker compose up -d mongo mongo-init
   ```
4. Seed sample services:
   ```bash
   npx tsx src/seed/seed.ts
   ```
5. Start API server:
   ```bash
   npm run dev
   ```
6. Verify health endpoint:
   ```bash
   curl http://localhost:6000/health
   ```

### Option B: Docker Full Stack

1. Start dev stack (hot reload):
   ```bash
   make dev
   ```
2. API: `http://localhost:6000`
3. Mongo Express: `http://localhost:6060` (`admin` / `pass`)
4. Stop services:
   ```bash
   make down
   ```

## Test Card Numbers Used

The backend never stores or processes raw card numbers directly; card input happens on PayHere-hosted checkout pages.  
For manual PayHere sandbox checkout testing, use PayHere’s published sandbox test cards:

Successful simulated payments:
- Visa: `4916217501611292`
- MasterCard: `5307732125531191`
- AMEX: `346781005510225`

Decline simulation cards (examples):
- Insufficient Funds (Visa): `4024007194349121`
- Limit Exceeded (Visa): `4929119799365646`
- Do Not Honor (Visa): `4929768900837248`
- Network Error (Visa): `4024007120869333`

For expiry date, CVV, and name fields, enter any valid values in sandbox mode.

Reference: https://support.payhere.lk/sandbox-and-testing

## Known Limitations

- `npm run seed` and `npm run seed:clear` currently point to non-existent paths (`src/seed.ts`, `src/seed.clear.ts`); use:
  - `npx tsx src/seed/seed.ts`
  - `npx tsx src/seed/seed.clear.ts`
- `npm test` currently fails because `jest.config.js` points to `src/tests`, but that directory is not present and no `*.test.ts` files exist.
- Online payment callback testing requires a public `PAYHERE_NOTIFY_URL` (localhost alone is not enough for live webhook delivery).
- No OpenAPI/Swagger spec is included yet.
