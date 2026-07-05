# Worker Pay & Disbursement — Implementation Brief

Feature from the MineOps concept doc, Section 16. Turns data the app already collects (approved shift logs, attendance hours) into an actual worker paycheck, with dual sign-off before anything is disbursed. Designed to fit the existing codebase's conventions (Flyway migrations starting at V37, JPA entities with manual getters/setters, Spring Data repositories, `@PreAuthorize` + site-scoping on every endpoint, `AuditLogService` on every state change).

## Decisions needed before starting (answer these first — they change the design)

1. **Dual authorization — who are the two approvers?** The concept doc assumes a separate "Operations Manager" role plus "Supervisor." The app currently only has `ROLE_SUPERVISOR` as the site-management role (no Operations Manager portal exists). Recommendation: require sign-off from **two different `ROLE_SUPERVISOR` accounts** (enforced by checking the second approver's user ID differs from the first's) rather than introducing a new role right now. Confirm this is acceptable, or say if a distinct Operations Manager role should be added instead.

2. **Where does the mineral price come from?** The concept doc says pay is calculated from "the current Bank of Ghana Reference Rate." There's no BoG feed wired into the app — the existing `MarketController` only pulls general commodity prices (gold, silver, copper, etc.) from a third-party API, not an official Ghana rate. Recommendation for Phase 1: the approving supervisor manually enters the day's price per unit when generating a pay cycle (simple, no new external dependency, and it's a number they'd know anyway). A real BoG rate feed can replace manual entry later without changing anything else.

3. **Pay cycle frequency.** "At shift close" (per the concept doc) could mean calculating pay after every single shift log, which gets granular fast with multiple workers/shifts per day. Recommendation: a **daily pay cycle per site** that pulls in every approved-but-not-yet-paid shift log for that site since the last cycle. Confirm daily is right, or say if it should be per-shift or weekly.

4. **Insurance deduction** — skipped entirely for Phase 1, since Section 17 (Worker Insurance) isn't built yet. The data model below leaves a nullable field for it so adding it later doesn't require a schema rework.

5. **MoMo disbursement** — there's no real MTN MoMo / Telecel Cash / AirtelTigo Money merchant API access yet. Phase 1 builds the whole feature — calculation, dual sign-off, pay history — behind a disbursement interface with a stub implementation that logs and marks records "SENT (simulated)" without moving real money. Swapping in a real provider later is a single class, not a redesign. Confirm this phasing is fine.

---

## Phase 1 scope (buildable now, no external dependencies)

Everything except real money movement: calculation, dual authorization, audit trail, pay history for workers and supervisors, and MoMo *number capture* (so the data is there once real disbursement is wired in).

### Database — new migration `V37__add_worker_pay.sql`

```sql
ALTER TABLE app_users ADD COLUMN momo_number VARCHAR(20);
ALTER TABLE app_users ADD COLUMN momo_network VARCHAR(20); -- MTN | TELECEL | AIRTELTIGO

CREATE TABLE pay_split_config (
    id BIGSERIAL PRIMARY KEY,
    site VARCHAR(255) NOT NULL UNIQUE,
    formula_type VARCHAR(30) NOT NULL DEFAULT 'EQUAL_PER_HEAD', -- EQUAL_PER_HEAD | WEIGHTED_BY_ROLE | WEIGHTED_BY_HOURS
    updated_by VARCHAR(255),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE pay_cycle (
    id BIGSERIAL PRIMARY KEY,
    site VARCHAR(255) NOT NULL,
    pay_date DATE NOT NULL,
    mineral_type VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    total_volume DECIMAL(14,3) NOT NULL,
    price_per_unit DECIMAL(14,2) NOT NULL,
    gross_total DECIMAL(14,2) NOT NULL,
    formula_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT | MANAGER_APPROVED | SUPERVISOR_APPROVED | DISBURSED | FAILED
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    manager_approved_by VARCHAR(255),
    manager_approved_at TIMESTAMP,
    supervisor_approved_by VARCHAR(255),
    supervisor_approved_at TIMESTAMP
);
CREATE INDEX idx_pay_cycle_site ON pay_cycle(site);

CREATE TABLE worker_pay_record (
    id BIGSERIAL PRIMARY KEY,
    pay_cycle_id BIGINT NOT NULL REFERENCES pay_cycle(id),
    worker_email VARCHAR(255) NOT NULL,
    worker_name VARCHAR(255) NOT NULL,
    hours_worked DECIMAL(6,2),
    gross_share DECIMAL(14,2) NOT NULL,
    insurance_deduction DECIMAL(14,2) DEFAULT 0,
    net_pay DECIMAL(14,2) NOT NULL,
    momo_number VARCHAR(20),
    momo_network VARCHAR(20),
    disbursement_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | FAILED
    momo_transaction_ref VARCHAR(100),
    failure_reason VARCHAR(255),
    disbursed_at TIMESTAMP
);
CREATE INDEX idx_worker_pay_cycle ON worker_pay_record(pay_cycle_id);
CREATE INDEX idx_worker_pay_email ON worker_pay_record(worker_email);
```

### Backend — new files

**Models:** `PaySplitConfig.java`, `PayCycle.java`, `WorkerPayRecord.java` — plain JPA entities matching the existing style (manual getters/setters, `@PrePersist` for timestamps where relevant, no Lombok — none of the existing entities use it despite the dependency being in `pom.xml`).

**Repositories:** `PaySplitConfigRepository` (`findBySiteIgnoreCase`), `PayCycleRepository` (`findBySiteIgnoreCaseOrderByPayDateDesc`, `findBySiteIgnoreCaseAndPayDate`), `WorkerPayRecordRepository` (`findByPayCycleId`, `findByWorkerEmailIgnoreCaseOrderByIdDesc`).

**`PayCalculationService`** — the core logic:
- Given a site + pay date + mineral type/unit + manually-entered price, pull every `ShiftLog` with `status = APPROVED` for that site/date/mineral that isn't already attached to a `pay_cycle` (add a nullable `pay_cycle_id` FK to `shift_logs` in the same migration, or track via a join — simplest is adding the FK column directly to `shift_logs`).
- Sum volume → `gross_total = total_volume * price_per_unit`.
- Look up the site's `PaySplitConfig`. Apply the formula:
  - `EQUAL_PER_HEAD`: gross_total ÷ number of distinct workers with an approved log that day.
  - `WEIGHTED_BY_HOURS`: pull each worker's clocked hours from `AttendanceRecord` for that date/site, weight share proportionally.
  - `WEIGHTED_BY_ROLE`: needs a role multiplier table — simplest Phase 1 version: workers get 1x, a supervisor-configurable multiplier field can be added later; flag this as a stretch item, not blocking.
- Create one `WorkerPayRecord` per worker with `netPay = grossShare - insuranceDeduction` (deduction always 0 for now).

**`MomoDisbursementService`** (interface) + **`StubMomoDisbursementService`** (`@Service`, active by default): takes a `WorkerPayRecord`, logs the "disbursement," sets `disbursement_status = SENT`, `momo_transaction_ref = "SIMULATED-" + UUID`. A real implementation swaps in later via a Spring profile/conditional bean without touching `PayController`.

**`PayController`** (`/api/pay`) — every endpoint must site-scope like the recently-fixed controllers (`if (!cycle.getSite().equalsIgnoreCase(user.assignedSite())) throw FORBIDDEN`):
- `POST /api/pay/preview` — `@PreAuthorize ROLE_SUPERVISOR` — builds a DRAFT cycle + records via `PayCalculationService`, returns the full preview (matches concept doc's "Pay Summary Preview" — every worker's name, hours, gross, deduction, net, before anything is committed to disbursement).
- `POST /api/pay/{id}/approve-manager` — first sign-off. Reject if `user.email()` already used any prior approval slot on this cycle (enforces two distinct people).
- `POST /api/pay/{id}/approve-supervisor` — second sign-off; on success, loops the cycle's `WorkerPayRecord`s through `MomoDisbursementService`, sets cycle status `DISBURSED` (or `FAILED` if any record fails), and calls `auditLogService.record(...)` for the authorization event itself (concept doc: "logged with user ID, timestamp, and the exact pay summary that was approved").
- `GET /api/pay/mine` — worker's own pay history (`WorkerPayRecordRepository.findByWorkerEmailIgnoreCaseOrderByIdDesc`).
- `GET /api/pay/site` — supervisor's site history (`PayCycleRepository.findBySiteIgnoreCaseOrderByPayDateDesc`).
- `GET /api/pay/{id}` — single cycle detail, site-checked.

**`PaySplitConfigController`** (`/api/pay/config`) — `GET`/`PUT`, `ROLE_SUPERVISOR` only, site-scoped, lets a supervisor set the formula for their site.

**MoMo number capture** — fold into the existing `ProfileController.updateProfile()` rather than a new endpoint: accept optional `momoNumber`/`momoNetwork` fields in the request body alongside the existing `photo`/`bio` fields.

### Frontend — new screens (More menu)

- **Worker → "My Pay"**: pay history list (date, gross, deduction, net, status), plus a MoMo number/network field on the existing Profile screen.
- **Supervisor → "Pay Runs"**: list of pay cycles for the site with status; "Generate Pay Run" action (site, date, mineral, unit, price → preview); approve button that adapts based on whether the current user already gave the first sign-off (shows "Awaiting your co-sign" vs. "Give first approval").
- New `api.ts` functions: `previewPayCycle`, `approvePayCycleManager`, `approvePayCycleSupervisor`, `getMyPayHistory`, `getSitePayCycles`, `getPayCycle(id)`, `getPaySplitConfig`, `updatePaySplitConfig`, `updateMyMomoDetails`.

---

## Phase 2 (later, needs external access)

Swap `StubMomoDisbursementService` for a real implementation calling MTN MoMo / Telecel Cash / AirtelTigo Money merchant APIs, handle real failure modes (invalid number, insufficient merchant balance, network timeout) per the concept doc's "Failed Payment Handling" — hold the failed amount, notify the manager with the reason, allow retry. Also where a real BoG rate feed would replace the manual price entry from Phase 1.

---

## Why this order

Everything in Phase 1 is buildable today with data the app already has (shift logs, attendance) and follows patterns already proven in this codebase (site-scoped controllers, audit logging, a pluggable external-service pattern like `PushNotificationService`). Nothing here is blocked on a partner integration — the disbursement stub means the whole feature, including the dual sign-off workflow, is fully demoable and testable before a single MoMo API credential exists.
