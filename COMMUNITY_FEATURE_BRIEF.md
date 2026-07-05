# MineOps Community — Implementation Brief

Section 12 of the concept doc, the largest remaining buildable piece. Four sub-systems — profiles/directory, forums, events/job board, and reputation/disputes — all buildable now with zero external dependency, and two of them (ratings, safety score) slot directly on top of Marketplace and Safety Intelligence, both already live. Every mine and buyer is automatically a member — no separate signup for this layer.

## Structural note: this extends the Marketplace's cross-site read precedent

Directory and forums are inherently industry-wide, not per-site — a supervisor needs to browse *other* mines' profiles and read forum posts from across the platform, not just their own site. This reuses the exact cross-site read pattern introduced for buyers in Marketplace: read access is open across sites, but every write (posting, editing, rating) is still tied to the authenticated user's own identity and site, exactly like a buyer can only ever touch their own offers. No new precedent, just the same pattern extended to a second read-heavy feature.

## Decisions needed before starting

1. **Verification badges** — the PRD lists four: Identity Verified, Business Registered, Safety Certified, Compliant Exporter. Two of these need a real certifying authority (safety certification body, export compliance body) that doesn't exist in this app. Recommendation: ship only the two that are honestly derivable from data already in the system — "Active Mine" (site status) and "Verified Buyer" (existing `buyerVerificationStatus == VERIFIED`) — and skip Safety Certified/Compliant Exporter for now rather than fake them. Easy to add later behind the same badge-list endpoint once a real certification path exists.
2. **Safety Record Score formula** — the PRD says a mine's "aggregate safety record" should produce a visible score but doesn't specify the math. Recommendation: a deterministic formula computed live (same style as `SafetyIntelligenceService`) — start at 100, subtract 5 per open/reviewed hazard and 10 per open/under-investigation incident from the trailing 90 days, floor at 0. Simple, explainable, and swappable later without changing the API shape.
3. **Who's in the two gated sub-forums?** Recommendation: Mine Operator forum gated to `ROLE_SUPERVISOR` (the role that already represents the site commercially, e.g. creates listings); Buyer forum gated to `ROLE_BUYER` with `VERIFIED` status. General topic forums, events, and the job board are open to every authenticated role except guest — guest mode is explicitly narrow-scope per the PRD ("no guest can post, edit, flag, or transact") and that holds here too.
4. **Job board messaging** — building a full new in-app messaging system is out of scope for this brief. Recommendation: applicants submit a simple "express interest" record (name, role, short message); the poster sees a list of interested applicants with their email, and follow-up happens outside the app for v1. A real chat thread can replace this later without touching the posting model.
5. **Dispute evidence** — the PRD says disputes should surface "the full evidence trail from the audit log." The audit log itself lives in the separate `MineOpsAuditService`, which requires supervisor/safety-officer auth for reads — plumbing a buyer-facing read through it would mean adding new internal-service surface area for one narrow use case. Recommendation: surface the evidence that's already sitting on the transaction itself — every offer's full status history (`createdAt`, `respondedAt`, `respondedBy` for each PENDING → COUNTERED/ACCEPTED/REJECTED step) and every transaction's batch-status history (`updatedBy`, `updatedAt`) — which is the actual dispute-relevant trail for a marketplace deal, without a new cross-service dependency.

---

## Database — new migration `V44__add_community.sql`

```sql
ALTER TABLE sites ADD COLUMN minerals_produced VARCHAR(500);
ALTER TABLE sites ADD COLUMN production_capacity VARCHAR(255);
ALTER TABLE sites ADD COLUMN established_year INTEGER;
ALTER TABLE sites ADD COLUMN profile_description VARCHAR(1000);
ALTER TABLE sites ADD COLUMN contact_email VARCHAR(255);

CREATE TABLE forum_post (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,        -- SAFETY_COMPLIANCE | EQUIPMENT_TECH | MARKET_PRICES | REGULATION_POLICY | TRAINING_SKILLS | OPEN_DISCUSSION
    subforum VARCHAR(20) NOT NULL DEFAULT 'GENERAL', -- GENERAL | MINE_OPERATOR | BUYER
    author_email VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body VARCHAR(3000) NOT NULL,
    reply_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_post_subforum ON forum_post(subforum);
CREATE INDEX idx_forum_post_category ON forum_post(category);

CREATE TABLE forum_reply (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES forum_post(id),
    author_email VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    author_role VARCHAR(20) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_forum_reply_post ON forum_reply(post_id);

CREATE TABLE community_event (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    event_type VARCHAR(30) NOT NULL,       -- TRADE_SHOW | REGULATORY_DEADLINE | CERTIFICATION_RENEWAL | AUCTION | OTHER
    event_date TIMESTAMP NOT NULL,
    created_by_email VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_event_date ON community_event(event_date);

CREATE TABLE job_posting (
    id BIGSERIAL PRIMARY KEY,
    site VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1500) NOT NULL,
    posted_by_email VARCHAR(255) NOT NULL,
    posted_by_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN | CLOSED
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_status ON job_posting(status);

CREATE TABLE job_interest (
    id BIGSERIAL PRIMARY KEY,
    job_posting_id BIGINT NOT NULL REFERENCES job_posting(id),
    applicant_email VARCHAR(255) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_role VARCHAR(20) NOT NULL,
    message VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_interest_posting ON job_interest(job_posting_id);

CREATE TABLE marketplace_rating (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES marketplace_transaction(id),
    rater_email VARCHAR(255) NOT NULL,
    rater_role VARCHAR(20) NOT NULL,        -- supervisor | buyer
    reliability INT NOT NULL,               -- 1-5, both directions
    communication INT NOT NULL,              -- 1-5, both directions
    product_quality INT,                     -- 1-5, buyer-rating-mine only
    listing_accuracy INT,                    -- 1-5, buyer-rating-mine only
    comment VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(transaction_id, rater_email)
);

CREATE TABLE transaction_dispute (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES marketplace_transaction(id),
    raised_by_email VARCHAR(255) NOT NULL,
    raised_by_role VARCHAR(20) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN | RESOLVED
    resolution_notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP
);
CREATE INDEX idx_dispute_transaction ON transaction_dispute(transaction_id);
```

## Backend

**`Site`** — add the 5 profile fields above; new `PATCH /api/community/mine-profile` on a new `CommunityDirectoryController`, `@PreAuthorize hasAuthority ROLE_SUPERVISOR`, updates only the calling supervisor's own `assignedSite()`.

**`CommunityDirectoryController`** (`/api/community`):
- `GET /mines` — `isAuthenticated()`, excludes guest — returns every site's profile fields + computed `safetyScore` + computed `badges` list (cross-site read, mirrors buyer listing browse).
- `GET /mines/{site}` — single mine detail, same access.
- `GET /buyers` — returns verified buyers only (`businessName`, badges) — no PII beyond what's already shown in Marketplace offer threads.

**`SafetyScoreService`** — `computeScore(site)`: 100 − (5 × open/reviewed hazards in last 90 days) − (10 × open/under-investigation incidents in last 90 days), floored at 0. Reuses `HazardReportRepository`/`IncidentReportRepository` exactly like `SafetyIntelligenceService`.

**`ForumController`** (`/api/community/forums`):
- `GET /posts?subforum=&category=` — filtered list, cross-site read, gated: `MINE_OPERATOR` results only returned if caller is supervisor, `BUYER` results only if caller is verified buyer (403 otherwise), `GENERAL` open to any non-guest role.
- `POST /posts` — creates a post; subforum is validated against the caller's role before insert (same gating as the read side).
- `GET /posts/{id}/replies`, `POST /posts/{id}/replies` — reply thread; increments `reply_count` on the parent post.

**`CommunityEventController`** (`/api/community/events`): `GET /` (all upcoming, cross-site), `POST /` (any non-guest authenticated role).

**`JobBoardController`** (`/api/community/jobs`): `GET /` (all OPEN postings, cross-site), `POST /` (`ROLE_SUPERVISOR`, tied to own site), `PATCH /{id}/close` (site-checked), `POST /{id}/interest` (any non-guest role, one record per applicant), `GET /{id}/interest` (site-checked, poster only).

**`MarketplaceRatingController`** (`/api/community/ratings`): `POST /transactions/{id}` — caller must be either the transaction's buyer or the transaction's site supervisor, one rating per party per transaction (unique constraint), fields validated by rater role (buyer can set `productQuality`/`listingAccuracy`, supervisor cannot). `GET /mines/{site}` and `GET /buyers/{email}` — public aggregate averages for profile display.

**`TransactionDisputeController`** (`/api/community/disputes`): `POST /transactions/{id}` — buyer or site supervisor only, one open dispute per transaction. `GET /transactions/{id}` — same two parties only, returns the dispute plus the transaction's full offer/status history described above. `PATCH /{id}/resolve` — either party can mark resolved with notes (no arbitration workflow — this is a shared record, not a judgment call by the platform).

## Frontend

- **New "Community" tab** added to Worker, Supervisor, SafetyOfficer, and Buyer navigators (not Guest — matches the narrow-scope rule).
- **Screens**: `DirectoryScreen` (mine/buyer list + profile detail with safety score and badges), `ForumScreen` (category list → post list → thread view, with the two gated sub-forums only appearing for eligible roles), `EventsScreen` (calendar list), `JobBoardScreen` (postings list, post/apply flows, supervisor's own postings management), and rating/dispute UI attached to the existing `BuyerTransactionsScreen`/`SupervisorTransactionsScreen` (a "Rate this transaction" and "Raise a dispute" action once a transaction is DELIVERED).
- **`api.ts`**: types for `MineProfile`, `BuyerProfile`, `ForumPost`, `ForumReply`, `CommunityEvent`, `JobPosting`, `JobInterest`, `MarketplaceRating`, `TransactionDispute`; roughly 20 new functions across the six endpoint groups.

---

## Why this scope

Every piece reuses a pattern already proven this session: cross-site read (Marketplace), live-computed scoring (Safety Intelligence), site-scoped writes with `findAndCheckSite`, and audit logging on state changes. The two honest simplifications — badges limited to what's actually derivable, and dispute evidence pulled from the transaction's own history instead of a new audit-service integration — keep this from overstating what the platform can verify. Left out deliberately: real certification-body integration for the other two badges, and a full in-app messaging system for the job board (both addable later without reshaping what's built here).
