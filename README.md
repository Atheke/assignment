# Orbit — full-stack SaaS starter

Production-style monorepo with a Node/Express API, Prisma/PostgreSQL, JWT access/refresh tokens, Stripe billing hooks, and a Next.js (App Router) frontend with a dark “mission/launch” visual system.

## Structure

```
backend        Express + Prisma + business logic (draw engine, scores, charities, admin)
frontend       Next.js + Tailwind + Framer Motion + Zustand
packages/utils Shared Zod schemas and numeric constants
packages/ui    Thin shared UI primitives (optional)
```

## Prerequisites

- Node.js 20+
- PostgreSQL (Render Postgres is supported)
- npm (workspaces; `pnpm` also works with `pnpm-workspace.yaml` if you prefer)

## Setup

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Create `backend/.env` using `.env.example` values. Set `DATABASE_URL` to your PostgreSQL URL.

3. Push the schema (first-time / prototyping):

   ```bash
   npm run db:push
   ```

   For ongoing environments, generate migrations locally with Prisma and deploy with:

   ```bash
   npm run db:migrate
   ```

4. Seed charities, an admin account, and the current month draw shell:

   ```bash
   npm run db:seed
   ```

   Default admin (override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`):  
   `admin@orbit.local` / `AdminAdmin123!`

5. Frontend env: create `frontend/.env.local`:

   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

6. Run API + web together:

   ```bash
   npm run dev
   ```

   - API: http://localhost:4000 (`/health`)
   - Web: http://localhost:3000

## Testing

```bash
npm test
```

Covers draw math, score windowing (requires `DATABASE_URL` for the DB-backed test), and CORS configuration surface.

## Security notes

- Passwords are hashed with bcrypt; access JWT is short-lived; refresh tokens are hashed at rest and rotated on refresh.
- CORS allows only `FRONTEND_URL` and `http://localhost:3000`, with `credentials: true` and restricted methods/headers per spec.
- Rate limiting is enabled globally (with stricter limits on `/api/auth`).
- **Rotate any database or API secrets** that were shared publicly and never commit real `.env` files.

## Stripe

Configure test keys and Price IDs (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`). Point Stripe webhooks to:

`https://<your-api-host>/api/stripe/webhook`

Use the signing secret as `STRIPE_WEBHOOK_SECRET`.

## Render deployment (summary)

1. Create a **PostgreSQL** instance and note `DATABASE_URL` (internal URL for the API service in the same region).
2. **Web Service (backend)**  
   - Root directory: repo root (or `backend` if you split builds).  
   - Build: `npm install && npm run db:migrate && npm run build -w backend`  
   - Start: `npm run start -w backend`  
   - Env: `DATABASE_URL`, JWT secrets, `FRONTEND_URL` (your static site URL), Stripe vars, `DRAW_SECRET`, etc.
3. **Static Site or Web Service (frontend)**  
   - Build: `npm install && npm run build -w frontend`  
   - Publish directory: `frontend/.next` for Next adapters, or use Render’s Next.js blueprint.  
   - Env: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`

Exact Render UI fields change over time; keep **one canonical `FRONTEND_URL` on the API** matching where users load the SPA.

## Refresh tokens & cross-domain UX

The API sets an httpOnly cookie **and** returns `refreshToken` in JSON so clients work when the UI and API use different origins (typical on Render). The SPA stores refresh tokens via Zustand `persist` and sends them on `/api/auth/refresh`.

## Product surface

- Landing, pricing (Stripe Checkout), signup with charity selection, dashboard (telemetry window, monthly draw picks, winnings + proof upload), charities listing, admin analytics / draw execution / winner verification.

---

If you have the PRD PDF in another path, align copy and edge rules with that document; this repo implements the functional brief from your specification when the PDF is unavailable in the workspace.
