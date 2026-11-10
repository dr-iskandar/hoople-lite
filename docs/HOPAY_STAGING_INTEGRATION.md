# HoPay staging — checkout initiation only

**Status: integrated in code, NOT live/verified billing.** This stage is for controlled gateway tests; the repository does not host an active payment provider, production callback endpoint or plan-entitlement service.

## Integration path

1. User reviews the illustrative Lite plan on the public pricing section. Starter, Creator and Studio have a staging checkout action; Free never charges.
2. Browser `GET /v1/auth/session`, then `GET /v1/orgs`. The creator must sign in via OIDC and have an active, non-archived organization with `owner`, `admin` or `billing` role. React demo/local drafts remain unchanged.
3. Browser generates a UUID idempotency key and sends `POST /v1/orgs/:oid/billing/checkout` with `{ "planId": "starter", "idempotencyKey": "<uuid>" }`. Optional `customerPhone` and `paymentMethod` are supported by the API. **No client item list, quantity, price, amount, callback URL or finish URL is accepted.** API requires exact `Origin: WEB_ORIGIN`, HttpOnly creator session, organization membership and authorized role.
4. The API records the request in `billing_checkout_requests` (migration 0004, PostgreSQL FORCE RLS, unique creator/org/idempotency key), then sends one server-side request to the pinned staging endpoint `https://dev-api-payment.hoople.co.id/payment`. It uses server-only headers `x-client-id`, `x-api-key`, `Content-Type: application/json` and a 10-second timeout.
5. HoPay receives exactly one item with server-derived ID/name/quantity=1/IDR price, `amount` equal to the item subtotal, optional OIDC creator name/email, and configured public HTTPS callback and finish URLs. Allowed plan prices in code: Starter Rp29.900; Creator Rp69.900; Studio Rp99.900. **These are staging test amounts and not approved subscription pricing.**
6. The API accepts an HTTPS redirect URL only on `*.midtrans.com` or `*.hoople.co.id` (or the base host) and returns `{ checkoutId, checkoutUrl, amount, currency:"IDR", state:"awaiting_verification", staging:true }`. The browser navigates to that URL. A repeated identical idempotency key reuses a completed redirect; an in-flight or failed key is rejected for manual reconciliation.
7. HoPay may redirect the browser to configured `HOPAY_FINISH_URL`. The UI explicitly says that a redirect is not proof of payment.

## Environment and deployment

Read `apps/api/.env.example`. Set **all** variables in the backend secret manager (not in React, source code, PR or tickets):

| Variable | Requirement |
| --- | --- |
| `HOPAY_CLIENT_ID` | UUID from HoPay staging account |
| `HOPAY_API_KEY` | Secret from HoPay staging account, keep private and rotate if exposed |
| `HOPAY_ENDPOINT` | Optional; only accepts the exact staging endpoint above |
| `HOPAY_CALLBACK_URL` | Public **HTTPS** URL with path `/v1/billing/callback`, no query or fragment |
| `HOPAY_FINISH_URL` | HTTPS URL on `WEB_ORIGIN`, recommended `https://<studio-domain>/?payment=return` |
| `WEB_ORIGIN` | Exact frontend origin for CORS/CSRF checks and finish redirect |
| `VITE_API_BASE_URL` | Frontend-only **public** API base URL; contains no secret |

Node does not auto-load `.env`. In local dev use `node --env-file=.env --import tsx src/server.ts` from `apps/api` if files are prepared. However, HoPay callback requires a public HTTPS backend and cannot be tested end-to-end on localhost without an explicitly approved HTTPS tunnel/staging deployment.

Run `npm run db:migrate` with DDL owner credentials; apply `apps/api/ops/grant_runtime.sql` to the restricted `hoople_api` role. Do not use DB owner credentials for the API.

## Critical security boundaries

- **Unverified callback:** `POST /v1/billing/callback` currently returns `202 {accepted:false, reason:"WEBHOOK_VERIFICATION_NOT_CONFIGURED"}` and deliberately **does not write a paid status or grant access**. This is a secure placeholder. Never claim fulfillment or credit wallet/plan from the callback or from `finishUrl`.
- **Missing HoPay protocol:** The provided request specification has no *success response schema*, webhook authentication/signature protocol, stable transaction ID or payment-status inquiry endpoint. The adapter supports commonly named redirect URL keys (`redirect_url`, `redirectUrl`, `payment_url`, `paymentUrl`, `checkout_url`, `checkoutUrl`, `snapRedirectUrl`, `url` at top-level or inside `data`). If HoPay returns a Snap token only or another shape, initiation fails with a sanitized 502 and must be updated **after** seeing an official HoPay schema. Do not fabricate a redirect from a token.
- **No subscriptions yet:** A staging checkout is a one-off request; a `/bulan` price label does not create recurring billing. Production entitlement period, tax, fees, refunds, failed/expired/cancelled transactions and payout reconciliation require a separate design.
- **Ambiguous network outcomes:** The provider may have created an order even if the API timed out. A failed/pending idempotency key is not retried automatically to avoid accidental duplicate charges. Operations must reconcile it with HoPay before allowing another attempt.
- **Privacy:** The API sends only authenticated creator name/email plus optional validated phone to HoPay. The database records workspace, creator ID, plan, amount and redirect URL—no copied customer email or phone. Protect database backups and restrict read permissions. Do not put payment redirect URLs or API secrets in logs.
- **SSRF/redirect protection:** Upstream origin is pinned to the dev endpoint, browser redirect restricted to trusted payment domains, credentialed CORS only for configured web origin; status responses use `Cache-Control: no-store`.
- **Before public traffic:** confirm signed HoPay webhook or server-to-server status verification, deduplication by provider transaction ID, billing state machine, atomic entitlements, webhook replay defense and queue retries, audit logs, request rate limiting, retention, observability, and staging-to-production credential migration.

## Verification checklist

- `npm ci && npm test && npm run build`
- `npm ci --prefix apps/api && npm run api:build && npm run api:test`
- GitHub Actions PostgreSQL 16 ephemeral integration job applies migrations and asserts FORCE RLS/tenant isolation.
- Smoke test: unauthenticated user cannot purchase, wrong Origin rejected, viewer cannot purchase, forged price ignored, Free never charges, duplicate UUID prevents second charge, invalid redirect rejected, unsigned callback never activates, both Bahasa Indonesia and English UI usable, local `questpop-*` drafts retained.
- **External testing still required:** with a deployed staging backend, use a test account/HoPay-approved test transaction, confirm actual response shape, channel filter behavior, webhook sender/verifier, return UI, and cancellations. Never test by paying real money without authorization.
