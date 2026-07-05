# Guest Access Improvements — Implementation Brief

From the MineOps concept doc, Section 06. Replaces the current admin-driven "type in a guest's email and password" flow with self-service QR code / 6-digit PIN redemption, adds group sessions for site tours (up to 50 guests off one code), and gives supervisors a live roster of who's joined. Follows this codebase's conventions: Flyway migration starting at `V39`, JPA entities with manual getters/setters, site-scoped `@PreAuthorize` controllers, `AuditLogService` on every state change.

## Already covered — no work needed

**Emergency Override (SOS alerts reaching guests)** — checked the current `SosController.createAlert()`: it gathers push tokens from `appUserRepository.findByAssignedSiteIgnoreCase(site)` with no role filter at all, only excluding the reporter themselves. That means active guests on a site already receive the "🚨 SOS ALERT" push today, the same as workers and supervisors, as a side effect of the existing broadcast logic — not something that needs building. Worth confirming this in a live test once the feature below ships (a guest's push token has to actually be registered via the same login flow every role uses), but no code change is needed here.

**Out of scope for this brief:** Guided Site Tours (Tour Mode) and the full "zones accessed" part of the Visitor Log both depend on the live site map feature, which hasn't been decided on yet. This brief covers issuance, group sessions, and a roster — not tour content or zone tracking.

## Decisions (final)

1. **What a guest provides to redeem a code:** full name **and** phone number — the phone number is required, not optional, and doubles as the emergency contact number for that visitor while they're on site. The system still auto-generates a placeholder email internally (needed because `AppUser.email` is a required unique column) and a random password the guest never sees, since they're logged in immediately after redeeming.
2. **Group code at its limit:** reject further redemptions with a clear "This code has reached its guest limit" error — no waitlist or auto-extension.

---

## Database — new migration `V39__add_guest_access_codes.sql`

```sql
CREATE TABLE guest_access_code (
    id BIGSERIAL PRIMARY KEY,
    site VARCHAR(255) NOT NULL,
    guest_sub_role VARCHAR(20) NOT NULL, -- visitor | inspector | investor
    code VARCHAR(10) NOT NULL UNIQUE,     -- 6-digit PIN, also encoded as the QR payload
    session_hours INT NOT NULL DEFAULT 24,
    max_redemptions INT NOT NULL DEFAULT 1,
    redemption_count INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    expires_at TIMESTAMP NOT NULL          -- the code itself stops being redeemable after this
);
CREATE INDEX idx_guest_code_site ON guest_access_code(site);

ALTER TABLE app_users ADD COLUMN redeemed_code_id BIGINT REFERENCES guest_access_code(id);
ALTER TABLE app_users ADD COLUMN induction_completed_at TIMESTAMP;
ALTER TABLE app_users ADD COLUMN phone VARCHAR(20);
```

`redeemed_code_id` links a guest account back to the code they joined through, so a supervisor can pull a live roster per code. `induction_completed_at` gets set the first time that guest completes the existing safety induction flow (`VisitorInductionController`) — one extra line there, not a new system. `phone` is a general-purpose column on `AppUser` (nullable for every other role), but required specifically for guest redemption — enforced in `GuestRedemptionController`'s request validation, not at the DB level, since workers/supervisors don't need it today.

## Backend — new files

**Model:** `GuestAccessCode.java` — plain JPA entity matching existing style.

**Repository:** `GuestAccessCodeRepository` — `findBySiteIgnoreCaseAndActiveOrderByCreatedAtDesc`, `findByCode`.

**`GuestAccessCodeController`** (`/api/admin/guest-codes`), all site-scoped like every other supervisor-facing controller:
- `POST /api/admin/guest-codes` — `@PreAuthorize hasAnyAuthority ROLE_SUPERVISOR, ROLE_SAFETY_OFFICER` — generates a random 6-digit code (retry on collision), creates the record with the caller's `assignedSite()`, `expiresAt = now + a supervisor-chosen window (e.g. same-day or next 7 days)`.
- `GET /api/admin/guest-codes` — list codes for the caller's site.
- `POST /api/admin/guest-codes/{id}/revoke` — site-checked (`if (!code.getSite().equalsIgnoreCase(user.assignedSite())) throw FORBIDDEN` — this is the exact pattern that was missing in several places during the security review, so get it right from the start here), sets `active = false`.
- `GET /api/admin/guest-codes/{id}/roster` — site-checked, returns every `AppUser` with `redeemedCodeId = id`: name, phone, joined time (`createdAt`), induction status (`inductionCompletedAt != null`), session status (`isExpired()`). The phone number showing up here is the point — it's what site staff can call if something happens to that visitor while they're on site.

**`GuestRedemptionController`** (`/api/guest/redeem`) — the one genuinely public, unauthenticated endpoint here (add `/api/guest/redeem` to `SecurityConfig`'s `permitAll()` list alongside `/api/auth/**`):
- `POST /api/guest/redeem` — body `{ code, fullName, phone }`, both `fullName` and `phone` required (`@NotBlank`) — reject with a validation error if either is missing. Look up the code by value; reject if not found, `active = false`, past `expiresAt`, or `redemptionCount >= maxRedemptions`. On success: create a new guest `AppUser` (auto-generated placeholder email, random password via the same `BCryptPasswordEncoder` pattern `AuthController` already uses, `role = "guest"`, `guestSubRole` and `assignedSite` from the code, `sessionExpiresAt = now + sessionHours`, `redeemedCodeId` set, `phone` set from the request), increment `redemptionCount` and save the code, call `auditLogService.record("GUEST_CODE_REDEEMED", ...)`, then return a full auth session — reuse `AuthController`'s existing `authResponseWithToken(user, refreshToken)` pattern so the guest is immediately logged in with a working JWT + refresh token, exactly like a normal login response.

**`VisitorInductionController`** — one-line addition: when `completeInduction()` succeeds, also set `inductionCompletedAt` on the calling user's `AppUser` record.

### Frontend

- **`AuthScreen.tsx`** — add a "Join as Guest" entry point alongside the existing login/register tabs: a form with a code input (typed PIN) and a "Scan QR" button, plus full name and phone number fields (both required — client-side validation should block submit until both are filled, matching the backend). On submit, calls the new `redeemGuestCode(code, fullName, phone)` API function, receives the same session shape as `loginUser()`, and routes into the app exactly like a normal login. Scanning can use `expo-camera`'s barcode scanning (already a dependency) to read the QR and fill the code field automatically.
- **New Supervisor screen, "Guest Codes"** (More menu): list of active codes for the site with redemption count (e.g. "12 / 50 joined"), a "Generate Code" form (sub-role, session hours, max redemptions — 1 for a single guest, higher for a group tour), each code rendered as both the raw PIN and a QR image (a lightweight client-side QR-rendering component), a "Revoke" action, and tapping into a code shows its live roster (name, phone, joined time, induction ✓/✗, session status).
- **`api.ts`** additions: `redeemGuestCode(code, fullName, phone)`, `createGuestCode(payload)`, `getGuestCodes()`, `revokeGuestCode(id)`, `getGuestCodeRoster(id)`.

---

## Why this scope

Issuance and group sessions are the two pieces of Section 06 that are genuinely unbuilt and don't depend on anything else. The emergency-override requirement turned out to already be satisfied by existing SOS logic, and Tour Mode / zone-based visitor logging are naturally blocked on the live-map feature — so this brief stays focused on what's both missing and buildable right now.
