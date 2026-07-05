# Mineral Marketplace — Implementation Brief

From the MineOps concept doc, Section 10. The biggest build yet this session — real buyer accounts, mine listings, an offer/counter-offer negotiation thread, and transaction records with batch-dispatch tracking. Fully buildable with no external dependency: the concept doc is explicit that "MineOps facilitates the deal without processing payments directly" — it only ever generates a transaction record for an external escrow/payment service to pick up, so there's no payment gateway to wait on here (unlike Revenue Model or the Pay feature's MoMo piece).

## The one structural departure from everything built so far: buyers aren't site-scoped

Every role in this app — worker, supervisor, safety officer, even guest — belongs to exactly one site, and every controller written this session (and fixed during the security review) enforces that. Buyers break that pattern by design: a buyer needs to browse listings across every mine on the platform, not just one. This brief introduces the first legitimate, deliberate cross-site read pattern in the app. To keep this safe, the rule throughout is: **buyers can only ever read public listing data and their own offers/transactions (scoped by their own email, never by site) — they never get access to any other site-scoped data** (hazards, shift logs, worker records, etc. all stay exactly as locked down as they are today). Every supervisor-facing endpoint in this feature still uses the same `findAndCheckSite` pattern as everything else.

## Decisions needed before starting

1. **How do buyer accounts get verified?** The concept doc describes real KYC (business registration, identity check, jurisdiction compliance) — there's no such verification service integrated, and building one is its own external-dependency project like MoMo or insurance. Recommendation: buyers self-register (similar to the existing worker registration flow) with a `PENDING_VERIFICATION` status, upload one supporting document (reusing the existing base64-photo pattern already used for hazard/profile/incident photos), and **any supervisor can manually verify or reject** — reusing the exact approve/reject pattern already built for pending worker registrations, rather than inventing a new "platform admin" role. A real KYC service can replace the manual step later without changing the account model.
2. **Does the "must be an active subscriber to list" gate apply?** Recommendation: no, not yet — that depends on the Revenue Model (subscription billing), which isn't built and is itself blocked on a real payment gateway, same as MoMo. All mines can list for now; add the subscription check as a one-line gate once Revenue Model exists.
3. **How are counter-offers modeled?** Recommendation: each counter-offer is a new `MarketplaceOffer` row referencing the previous one via `parentOfferId`, building a chain — the "current" state of a negotiation is always the row with no child yet. This keeps the full negotiation thread naturally queryable (walk the chain) without needing a separate messages table.

---

## Database — new migration `V43__add_marketplace.sql`

```sql
ALTER TABLE app_users ADD COLUMN business_name VARCHAR(255);
ALTER TABLE app_users ADD COLUMN buyer_verification_status VARCHAR(20); -- PENDING_VERIFICATION | VERIFIED | REJECTED
ALTER TABLE app_users ADD COLUMN verification_document TEXT; -- base64, same pattern as photos elsewhere

CREATE TABLE mineral_listing (
    id BIGSERIAL PRIMARY KEY,
    site VARCHAR(255) NOT NULL,
    mineral_type VARCHAR(100) NOT NULL,
    quantity DECIMAL(14,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    grade VARCHAR(100),
    asking_price DECIMAL(14,2) NOT NULL,
    location VARCHAR(255),
    available_from DATE,
    min_order_quantity DECIMAL(14,3),
    photo_data TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | WITHDRAWN | SOLD
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_site ON mineral_listing(site);
CREATE INDEX idx_listing_status ON mineral_listing(status);

CREATE TABLE marketplace_offer (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES mineral_listing(id),
    parent_offer_id BIGINT REFERENCES marketplace_offer(id),
    buyer_email VARCHAR(255) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    offer_price DECIMAL(14,2) NOT NULL,
    offer_quantity DECIMAL(14,3) NOT NULL,
    message VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | COUNTERED | ACCEPTED | REJECTED | WITHDRAWN
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    responded_at TIMESTAMP,
    responded_by VARCHAR(255)
);
CREATE INDEX idx_offer_listing ON marketplace_offer(listing_id);
CREATE INDEX idx_offer_buyer ON marketplace_offer(buyer_email);

CREATE TABLE marketplace_transaction (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES mineral_listing(id),
    offer_id BIGINT NOT NULL REFERENCES marketplace_offer(id),
    site VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    mineral_type VARCHAR(100) NOT NULL,
    quantity DECIMAL(14,3) NOT NULL,
    agreed_price DECIMAL(14,2) NOT NULL,
    batch_status VARCHAR(20) NOT NULL DEFAULT 'PREPARING', -- PREPARING | DISPATCHED | IN_TRANSIT | DELIVERED
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_by VARCHAR(255),
    updated_at TIMESTAMP
);
CREATE INDEX idx_transaction_site ON marketplace_transaction(site);
CREATE INDEX idx_transaction_buyer ON marketplace_transaction(buyer_email);
```

## Backend

**`AuthenticatedUser.authorityFor()`** — add `case "buyer" -> "ROLE_BUYER";` alongside the existing role mappings.

**`AuthController`** — extend `register()`: allow `"buyer"` in `ALLOWED_ROLES` alongside worker/guest. A buyer registration sets `buyerVerificationStatus = "PENDING_VERIFICATION"`, `assignedSite = null` (buyers aren't tied to a site), and returns the same `{ pending: true }` shape workers already get, reusing the existing pending-approval UX pattern on the frontend.

**`AdminController`** — extend the existing pending-worker approve/reject endpoints (or add sibling ones) to also handle pending buyers: `GET /api/admin/buyers/pending`, `POST /api/admin/buyers/approve`, `POST /api/admin/buyers/reject` — same shape as the worker versions, `@PreAuthorize hasAnyAuthority ROLE_SUPERVISOR, ROLE_SAFETY_OFFICER`, no site check needed since buyers aren't site-scoped and any supervisor can verify one.

**`MineralListingController`** (`/api/marketplace/listings`):
- `POST` — `@PreAuthorize hasAnyAuthority ROLE_SUPERVISOR` — creates a listing for `user.assignedSite()`.
- `GET` — `@PreAuthorize hasAnyAuthority ROLE_SUPERVISOR, ROLE_BUYER`. **This is the deliberate cross-site read**: if the caller is `ROLE_BUYER`, return all `status = 'ACTIVE'` listings across every site (`MineralListingRepository.findByStatusOrderByCreatedAtDesc("ACTIVE")`) — reject with `403` if the buyer's `buyerVerificationStatus != "VERIFIED"` first. If the caller is `ROLE_SUPERVISOR`, return only their own site's listings (`findBySiteIgnoreCaseOrderByCreatedAtDesc`), matching every other supervisor-facing list endpoint in this app.
- `PATCH /{id}/withdraw` — `@PreAuthorize hasAuthority ROLE_SUPERVISOR`, site-checked with `findAndCheckSite` — sets `status = WITHDRAWN`.

**`MarketplaceOfferController`** (`/api/marketplace/offers`):
- `POST /listings/{id}/offers` — `@PreAuthorize hasAuthority ROLE_BUYER`, requires `VERIFIED` status, requires the listing to be `ACTIVE` — creates a `PENDING` offer.
- `GET /mine` — `@PreAuthorize hasAuthority ROLE_BUYER` — the buyer's own offers, scoped by `buyerEmail = user.email()` (not site — this is correctly buyer-scoped, not cross-site, since it's always their own data).
- `GET /listings/{id}/offers` — `@PreAuthorize hasAuthority ROLE_SUPERVISOR`, site-checked against the listing's site — every offer in the thread for that listing.
- `POST /{id}/counter` — `@PreAuthorize hasAuthority ROLE_SUPERVISOR`, site-checked via the offer's listing — creates a new offer row with `parentOfferId` set, marks the prior offer `COUNTERED`.
- `POST /{id}/accept` — `@PreAuthorize hasAuthority ROLE_SUPERVISOR`, site-checked — marks the offer `ACCEPTED`, the listing `SOLD`, and creates the `MarketplaceTransaction` row. Audit-logged, matching every other state-changing action in this app.
- `POST /{id}/reject` — same shape, marks `REJECTED`.
- `POST /{id}/withdraw` — `@PreAuthorize hasAuthority ROLE_BUYER`, checked against `buyerEmail == user.email()` (the buyer-side equivalent of site-checking) — lets a buyer pull back their own pending offer.

**`MarketplaceTransactionController`** (`/api/marketplace/transactions`):
- `GET /mine` — `@PreAuthorize hasAuthority ROLE_BUYER` — scoped by `buyerEmail`.
- `GET /site` — `@PreAuthorize hasAuthority ROLE_SUPERVISOR` — scoped by `user.assignedSite()`.
- `PATCH /{id}/status` — `@PreAuthorize hasAuthority ROLE_SUPERVISOR`, site-checked — updates `batchStatus`, audit-logged.

## Frontend

- **New role in `AuthScreen.tsx`** — buyers register through the existing register flow with a new role card ("Buyer"), business name field, and a document upload (reuse `expo-image-picker`, same as profile photos). Shows the same pending-approval screen workers already see.
- **New `BuyerNavigator`** — a fourth role navigator alongside Worker/Supervisor/SafetyOfficer/Guest, following the exact same structure as `GuestNavigator`.
- **Buyer screens**: `BuyerListingsScreen` (browse all active listings, filter by mineral type), `BuyerListingDetailScreen` (photos, grade, price, an offer form), `BuyerOffersScreen` (their own offer threads with status), `BuyerTransactionsScreen` (purchase history with batch status).
- **Supervisor screens**: `SupervisorListingsScreen` (create/withdraw listings for their site), `SupervisorOffersScreen` (incoming offers per listing, accept/counter/reject actions), extend `SupervisorPendingApprovalsScreen` to also show pending buyer verifications alongside pending workers, `SupervisorTransactionsScreen` (site's transaction history, batch status updates).
- **`api.ts`** additions: listing CRUD, offer CRUD (including counter/accept/reject/withdraw), transaction endpoints, buyer verification endpoints — roughly 15 new functions given the scope, following the exact naming and wrapper conventions already established (`request`/`post`/`patch`).

---

## Why this scope

This is a large feature, but every individual piece reuses a pattern already proven in this codebase — pending-approval flows (worker registration), base64 document/photo upload, site-scoped CRUD with `findAndCheckSite`, and audit logging on every state change. The one genuinely new thing is the cross-site read for buyers, which is scoped as narrowly as possible: buyers only ever see public listing data and their own offers/transactions, never anything else. Left out deliberately: real KYC verification (external dependency, same shape as MoMo/insurance), subscription gating (depends on Revenue Model, not built), and any payment processing (the concept doc explicitly keeps this out of MineOps's scope entirely, not just this brief's).
