# Admin service

The admin API manages business and rider verification records in the shared `startup` MongoDB database.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `MONGO_URI` and the same `JWT_SECRET` used by the auth service.
3. Keep `ADMIN_EMAIL` identical to the auth service allowlist.
4. Run `npm install`, then `npm run dev` (port `5006` by default).

The auth service assigns the `admin` role only to the configured administrator email at login. All admin API routes also validate both the signed token role and the email allowlist.

## Endpoints

- `GET /api/admin/verification?status=pending|verified` — verification queue and summary counts.
- `PATCH /api/admin/businesses/:id/verification` — set `{ "isVerified": true|false }`.
- `PATCH /api/admin/riders/:id/verification` — set `{ "isVerified": true|false }`.

All endpoints require the auth service's bearer token.
