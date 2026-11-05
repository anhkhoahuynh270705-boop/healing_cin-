# Wardrobe Purchases Implementation Plan

> **For agentic workers:** Native implementation in this session; no subagents.

**Goal:** Replace wardrobe mock data with PostgreSQL catalog, ownership, donation totals, and safe balance purchases.

**Architecture:** Flyway seeds the tier catalog and stores bundle purchases. Spring endpoints expose public catalog, authenticated account, and transactional purchase; Angular renders API state and uses the supplied SVG-style VIP frame.

**Tech Stack:** Angular standalone/signals, TypeScript fetch service, Spring Boot/JPA/Lombok, PostgreSQL, Flyway.

**Spec:** User request in this conversation and `WARDROBE_MOCK` component UI already present in `hilling-movie/src/app/features/wardrobe`.

## Global Constraints

- No frontend mock catalog or API calls without the authenticated user token for account/purchase data.
- A tier purchase grants that tier's shirt and chat frame and all lower tiers, charging its displayed tier price once.
- `totalConfirmed` remains cumulative; purchase deducts only `usableBalance`.
- All monetary updates and ownership writes are transactional and persistent in PostgreSQL.

## Review Focus

- Guest access must show the catalog but never reveal account data or allow purchase.
- Concurrent purchases must not overdraw the user's balance.
- Duplicate or already-owned purchases must not charge twice.
- Donation approval and purchase must serialize updates to the same user balance.
- Insufficient balance must return an actionable error without creating ownership.

---

### Task 1: Persist catalog and tier bundle purchases

**Files:** Add Flyway V8, wardrobe catalog/purchase entities and repositories, authenticated controller/service, and a user-row lock query. Update donation approval to use the same user lock.

**Interfaces:** `GET /api/wardrobe/catalog`; authenticated `GET /api/wardrobe/me`; authenticated `POST /api/wardrobe/purchase` with `{userId, authToken, tier}`. Purchase returns the refreshed account and catalog ownership state.

- [x] Seed seven tiers and their frame/shirt colors, SVG gradient colors, price, and description.
- [x] Store unique `(user_id, tier)` purchases with amount paid and timestamp.
- [x] Lock the user row, check ownership and usable balance, deduct once, and persist the purchase atomically.

### Task 2: Connect wardrobe UI to backend

**Files:** Replace `wardrobe.mock.ts`; add wardrobe model/API service; update `wardrobe-modal.component.ts/html/scss`; pass user identity/token from cinema page.

**Interfaces:** Component inputs `userId`, `authToken`, `isLoggedIn`; outputs `closed`, `loginRequested`; signals for loading, catalog, selected preview tiers, purchase state, balance and errors.

- [x] Load catalog and authenticated account state from backend.
- [x] Render the supplied gold frame SVG with tier values from server catalog.
- [x] Keep frame/shirt preview selections independent and show purchase/login action for locked bundles.
- [x] Refresh balance and ownership after purchase; keep cumulative donation total unchanged.

## Validation

- TypeScript source check: `tsc -p tsconfig.app.json --noEmit` passed.
- Angular build could not start because the installed esbuild binary targets Windows while this environment is Linux.
- Angular template compiler invocation did not finish and was interrupted.
- Backend compile could not run because Java/JAVA_HOME is unavailable in this environment.
