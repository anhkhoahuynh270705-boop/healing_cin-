# Donation Approval Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load donation bank details from Spring Boot, submit selected donation amounts for admin review, and credit the user's persisted donation balance only after approval.

**Architecture:** Reuse the persisted `payment_requests` queue with a distinct `DONATION` type and its existing STOMP admin notification path. Store transfer code, total confirmed donation, and usable balance on the PostgreSQL user entity with a Flyway migration; expose authenticated donation APIs and a public bank/tier config endpoint. Extend the existing admin review UI with a donation queue tab.

**Tech Stack:** Angular standalone components and fetch-based services; Spring Boot, JPA, Lombok, PostgreSQL, Flyway, STOMP.

**Spec:** User request in conversation: Techcombank, account name HUYNH ANH KHOA, account 1221868856; button submits selected amount for admin approval and only then credits the account.

## Global Constraints

- Bank details and donation tiers are served from backend configuration.
- Only approved donation requests update `donation_total_confirmed` and `donation_usable_balance`.
- Use the existing PostgreSQL/Flyway persistence and admin payment review flow.
- Keep the existing VIP and private-room payment behaviors intact.
- Authenticate donation summary and request endpoints with the current user session token.
- Prevent duplicate balance credit when the same request is decided more than once.

## Review Focus

- Unauthenticated or guest submissions are rejected.
- Amounts are restricted to 10,000 and configured tier values.
- Duplicate pending requests cannot be created for one account.
- Admin approve credits once; reject and repeated decisions do not credit.
- The UI uses backend config and reflects pending/approved/rejected states and refreshed balance.

### Task 1: Persistent donation account and backend config

**Files:**
- Modify: `backend/src/main/java/com/healingcinema/auth/entity/UserEntity.java`
- Modify: `backend/src/main/java/com/healingcinema/auth/service/AuthService.java`
- Modify: `backend/src/main/java/com/healingcinema/storage/DatabaseBootstrapRunner.java`
- Create: `backend/src/main/resources/db/migration/V6__donation_account_balances.sql`
- Modify: `backend/src/main/resources/application.properties`
- Create: `backend/src/main/java/com/healingcinema/donation/DonationConfigService.java`
- Create: `backend/src/main/java/com/healingcinema/donation/DonationDtos.java`

- [x] Persist unique transfer code and donation totals/balance; provide backend bank/tier configuration.

### Task 2: Donation request, status, and idempotent approval

**Files:**
- Modify: `backend/src/main/java/com/healingcinema/payment/service/PaymentApprovalService.java`
- Modify: `backend/src/main/java/com/healingcinema/payment/repository/PaymentRequestRepository.java`
- Modify: `backend/src/main/java/com/healingcinema/payment/controller/PaymentController.java`
- Create: `backend/src/main/java/com/healingcinema/payment/service/AdminPaymentNotifier.java`
- Create: `backend/src/main/java/com/healingcinema/donation/DonationController.java`

- [x] Submit validated donation requests, notify admins over existing STOMP queue, return user summary/status, and credit the wallet only inside an idempotent admin approval transaction.

### Task 3: Donation admin review

**Files:**
- Modify: `src/app/features/payment/models/vip-tier.model.ts`
- Modify: `src/app/features/admin/admin-page/admin-page.component.ts`
- Modify: `src/app/features/admin/admin-page/admin-page.component.html`
- Modify: `src/app/features/admin/payment-review/payment-review.component.ts`
- Modify: `src/app/features/admin/payment-review/payment-review.component.html`

- [x] Add a dedicated admin donation tab with distinct labels and shared approve/reject controls.

### Task 4: Donation modal API integration

**Files:**
- Modify: `src/app/features/donations/models/donation.model.ts`
- Modify: `src/app/features/donations/data-access/donation-ui.service.ts`
- Modify: `src/app/features/donations/donation-modal.component.ts`
- Modify: `src/app/features/donations/donation-modal.component.html`
- Modify: `src/app/features/cinema/cinema-page.component.html`

- [x] Load config and balance from backend, submit the chosen amount, poll only while pending, and update UI when an admin approves or rejects.

### Task 5: Verification

- [ ] Backend compile could not run: this environment has no Java executable and Maven reports `JAVA_HOME` is not defined. Frontend TypeScript and focused Angular template compilation completed successfully.
- [x] Review changes to confirm VIP and private-room payment flows remain intact.
