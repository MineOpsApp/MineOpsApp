# Worker Insurance — Implementation Brief

From the MineOps concept doc, Section 17. Same shape as the pay feature's MoMo dependency: there's no real insurance provider integration to build against yet, so this is designed the same way — a real interface with a stub implementation, so the whole feature (enrollment, status, premium deduction) is buildable and testable now, and swapping in a real provider later is a single class, not a redesign.

## Why this fits cleanly with what's already built

Checked `PayCalculationService.buildRecords()` directly: it already has an `insuranceDeduction` field on `WorkerPayRecord`, currently hardcoded to `BigDecimal.ZERO` with a comment-free placeholder — this feature was already anticipated and left a hook. This brief wires that hook up to something real instead of adding a parallel system.

## Decisions (final)

1. **Premium deduction mode: support both**, as a per-site setting (`DEDUCT_FROM_PAY` / `BILL_TO_MINE`) chosen by the supervisor. This maps directly onto the existing `insuranceDeduction` field on `WorkerPayRecord` — `DEDUCT_FROM_PAY` populates it, `BILL_TO_MINE` leaves it at zero and the premium is tracked separately for the mine's own accounting. Supporting both costs nothing extra given the field already exists for exactly this.
2. **Premium amount: a single fixed amount per site**, set by the supervisor when configuring insurance for that site. No real provider to quote a real premium yet, so manual entry now, same pattern already used for mineral pricing before `MarketController` was wired in — swappable for a provider-quoted amount later without touching anything else.
3. **Enrollment approval: the stub auto-approves immediately** — status goes straight to `INSURED` on Apply. There's no real provider to introduce a genuine pending state yet; a real integration later can add `PENDING` between `NOT_INSURED` and `INSURED` without changing anything else in this brief.

---

## Database — new migration `V42__add_worker_insurance.sql`

```sql
ALTER TABLE sites ADD COLUMN insurance_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sites ADD COLUMN insurance_provider_name VARCHAR(255);
ALTER TABLE sites ADD COLUMN insurance_premium DECIMAL(10,2);
ALTER TABLE sites ADD COLUMN insurance_deduction_mode VARCHAR(20) DEFAULT 'DEDUCT_FROM_PAY'; -- DEDUCT_FROM_PAY | BILL_TO_MINE

ALTER TABLE app_users ADD COLUMN insurance_status VARCHAR(20) DEFAULT 'NOT_INSURED'; -- NOT_INSURED | INSURED
ALTER TABLE app_users ADD COLUMN insurance_enrolled_at TIMESTAMP;

CREATE TABLE insurance_enrollment_history (
    id BIGSERIAL PRIMARY KEY,
    worker_email VARCHAR(255) NOT NULL,
    site VARCHAR(255) NOT NULL,
    action VARCHAR(20) NOT NULL,  -- ENROLLED | LAPSED
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

Insurance config lives on `Site` (matching how `inventory_visible_to_guests` was just added there) rather than a new table, since it's one row of settings per site. Enrollment gets its own small history table because — per the concept doc — coverage history is part of a worker's record, and a worker's status can change more than once over their employment.

## Backend

**`InsuranceProviderService`** (interface) + **`StubInsuranceProviderService`** (`@Service`, active by default) — mirrors the `MomoDisbursementService`/`StubMomoDisbursementService` pattern exactly:
- `void enroll(AppUser worker)` — stub marks the worker `INSURED` immediately and records an `ENROLLED` history row.
- `boolean checkStatus(AppUser worker)` — stub always returns `true` (still covered) since there's no real provider to lapse against; a real implementation would call the provider's status API here.

**`InsuranceController`** (`/api/insurance`):
- `GET /api/insurance/status` — `@PreAuthorize hasAuthority('ROLE_WORKER')` — returns `{ status, enrolledAt }` for the calling worker. If the site doesn't have insurance enabled at all, return a distinct `{ status: "NOT_AVAILABLE" }` rather than `NOT_INSURED`, so the worker profile can show "not offered at this site" instead of a misleading "Apply" button that would go nowhere.
- `POST /api/insurance/apply` — `@PreAuthorize hasAuthority('ROLE_WORKER')` — rejects if the site doesn't have insurance enabled, or if the worker is already `INSURED`. Otherwise calls `InsuranceProviderService.enroll()`, sets `insuranceStatus = INSURED`, `insuranceEnrolledAt = now`, inserts the history row, audits `INSURANCE_ENROLLED`.

**`SiteInsuranceConfigController`** (or extend the existing `SiteController`) — `PATCH /api/sites/insurance-config`, `@PreAuthorize hasAuthority('ROLE_SUPERVISOR')`, using the same "acts on `user.assignedSite()`, no site-ownership check needed by construction" pattern as the inventory-visibility toggle: sets `insuranceEnabled`, `insuranceProviderName`, `insurancePremium`, `insuranceDeductionMode` on the caller's own site.

**`PayCalculationService.buildRecords()`** — replace the hardcoded `BigDecimal insurance = BigDecimal.ZERO;` with: look up the worker's `AppUser`, check `insuranceStatus == INSURED` and the site's `insuranceDeductionMode == DEDUCT_FROM_PAY`; if both true, `insurance = site.getInsurancePremium()`, otherwise zero as today. This is the one place existing code changes rather than just gaining new files — worth a deliberate review of the diff there given it's payroll-adjacent code with tests already in place (`PayCalculationServiceTest`), so the existing equal-per-head/weighted-by-hours math tests should keep passing since insurance stays zero unless a site actually turns it on.

**`ProfileController`** — extend `getOwnProfile()`'s response to include `insuranceStatus`, matching how `momoNumber`/`momoNetwork` were added there for the pay feature.

## Frontend

- **Worker profile screen** — add an "Insurance" row: shows "Insured ✓" or an "Apply" button per the concept doc's deliberately minimal worker-facing design (no premium amounts or provider details shown by default — that's an intentional simplicity requirement from the concept doc, not something this brief is cutting for scope reasons). Tapping Apply calls the new endpoint and updates the display on success.
- **Supervisor "Insurance Settings"** (More menu, or a section within an existing site-settings area) — toggle to enable insurance for the site, fields for provider name and premium amount, and the deduction-mode choice (`DEDUCT_FROM_PAY` / `BILL_TO_MINE`).
- **`api.ts`** additions: `getInsuranceStatus()`, `applyForInsurance()`, `updateInsuranceConfig(payload)`.

---

## Why this scope

This wires up a hook that was already sitting unused in the pay calculation code, follows the exact pluggable-external-service pattern already proven with MoMo disbursement, and keeps the worker-facing side exactly as minimal as the concept doc asks for. The one piece intentionally left thin is real-time status verification against a live provider (the concept doc's "MineOps queries the provider's API at each pay cycle") — with only a stub provider that never lapses, there's nothing to verify yet; once a real provider exists, `checkStatus()` is where that logic plugs in, most naturally called from within `PayCalculationService` right before each pay cycle's insurance deduction is calculated.
