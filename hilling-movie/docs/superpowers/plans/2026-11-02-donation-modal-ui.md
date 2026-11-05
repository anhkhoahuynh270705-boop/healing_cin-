# Donation Modal UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cinema support side panel with a responsive Vietnamese donation modal matching the supplied visual brief.

**Architecture:** Build a focused standalone Angular component under `features/donations`, backed by a typed presentation config service and model. The cinema page owns only modal visibility and login handoff. Do not modify payment APIs, database, webhook handling, or admin approval behavior.

**Tech Stack:** Angular standalone components, TypeScript, SCSS, Font Awesome already loaded by the app.

**Spec:** User-provided “Ủng hộ” modal spec in the conversation; narrowed by the follow-up to UI-only with existing admin review retained.

## Global Constraints

- Keep the page and component UI in Vietnamese.
- Do not add automatic crediting, payment submission, polling, webhook, or backend changes.
- Preserve existing admin approval behavior and payment screens.
- Use the supplied dark green-black palette and responsive 6/3/2 tier grid.
- Use Font Awesome icons, matching the existing project preference.

## Review Focus

- Opening/closing the modal must not alter other side panels.
- Escape and backdrop click close the modal; keyboard focus remains in the dialog.
- Selecting each amount updates both the highlight and VietQR URL.
- Logged-out users see a login action instead of transfer details.
- No UI state may claim a donation was confirmed without backend data.

### Task 1: Donation presentation model and service

**Files:**

- Create: `src/app/features/donations/models/donation.model.ts`
- Create: `src/app/features/donations/data-access/donation-ui.service.ts`

- [x] Define typed tier and bank UI config, format Vietnamese amounts, and build VietQR URLs from config.

### Task 2: Standalone donation modal

**Files:**

- Create: `src/app/features/donations/donation-modal.component.ts`
- Create: `src/app/features/donations/donation-modal.component.html`
- Create: `src/app/features/donations/donation-modal.component.scss`

- [x] Implement tier selection, copy feedback/toast, login state, close/backdrop/Escape, accessible dialog, responsive layout, and neutral pending/success slots that only render when supplied by a future real status source.

### Task 3: Cinema page integration

**Files:**

- Modify: `src/app/features/cinema/cinema-page.component.ts`
- Modify: `src/app/features/cinema/cinema-page.component.html`
- Modify: `src/app/features/cinema/cinema-page.component.scss`

- [x] Replace the support side-panel toggle with modal visibility, hand off login requests to the existing auth modal, remove obsolete support QR state/styles, and leave payment/admin code untouched.

### Task 4: Verification

- [ ] Angular production build: attempted; blocked before Angular compilation because the installed `@esbuild/win32-x64` binary does not match this Linux environment.
- [x] TypeScript project check, focused Angular template compilation for the new modal, whitespace check, and review confirming payment/admin/backend code is untouched.
