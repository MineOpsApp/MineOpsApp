# Safety & Hazard Intelligence — Implementation Brief

The buildable slice of the PRD's "AI Automation" section. The concept doc envisions real predictive ML over safety data — that needs a trained model and a real AI/data-science pipeline, which is its own external-dependency project (same category as real MoMo or real KYC). What's buildable right now with zero external dependency is a **rule-based intelligence layer**: deterministic aggregation over the hazard reports, incident reports, and danger zones that already exist in the database, surfaced as hotspots, trends, and templated recommendations. No calls to any AI/ML service — just counting, grouping, and threshold checks computed live from existing tables. A real ML model can replace the scoring logic later without changing the API shape, same pattern as the MoMo/insurance stubs.

## What it actually does

Three things, computed on request (no new tables, no background jobs — site-level data volumes are small enough to aggregate live):

1. **Hotspot detection** — groups OPEN/REVIEWED hazards and Open/Under Investigation incidents from the last 30 days by `location`/`zone` text (case-insensitive, trimmed), flags any location with 3+ reports as a hotspot, sorted by count descending.
2. **Trending hazard types** — compares hazard counts by `hazardType` in the last 30 days vs the prior 30 days; flags any type with count ≥ 3 this period whose count doubled or more (or that's brand-new).
3. **Templated recommendations** — a short deterministic list of strings generated from the two rules above, e.g. "3 hazards reported at Shaft A entrance in 30 days — recommend a supervisor inspection." No free-text generation, no NLG model — just string templates keyed to which rule fired.

## Decisions needed before starting

1. **Computed live vs cached?** Recommendation: compute live on every request. Even a busy site logs a handful of hazards/incidents a day — pulling the last 60 days and aggregating in-memory is trivial load. No new table, no scheduled job, no staleness to worry about.
2. **Are the thresholds (3+ reports, 30-day window, 2x growth) configurable per site?** Recommendation: no, not yet — hardcode them as constants in the service. If a site later wants different sensitivity, that's a one-line config addition, not worth a settings table for a first version.
3. **Who sees this?** Recommendation: Supervisor and Safety Officer only (matches who already reviews/closes hazards) — not workers, not guests.

---

## Backend

No migration needed — reads existing `hazard_reports`, `incident_reports` tables only.

**New `SafetyIntelligenceService`**:
- `getHotspots(site)` — pulls hazards via `findBySiteOrderByCreatedAtDesc(site)` and incidents via `findBySiteOrderByReportedAtDesc(site)`, filters to last 30 days and non-closed statuses, groups by normalized location/zone, returns list of `{ location, hazardCount, incidentCount, totalCount, mostRecentSeverity, mostRecentAt }` where `totalCount >= 3`, sorted descending.
- `getTrendingHazardTypes(site)` — groups hazards by `hazardType` for [now-30d, now] and [now-60d, now-30d], returns `{ hazardType, currentCount, priorCount, trend: "NEW"|"RISING"|"STABLE" }` for any type where `currentCount >= 3 && (priorCount == 0 || currentCount >= priorCount * 2)`.
- `getRecommendations(site)` — combines the two above into template strings: `"{totalCount} reports at {location} in the last 30 days — recommend a supervisor inspection."` and `"{hazardType} hazards are up {currentCount} vs {priorCount} in the prior period — consider a toolbox talk on this hazard type."`

**New `SafetyIntelligenceController`** (`/api/safety-intelligence`):
- `GET /hotspots` — `@PreAuthorize hasAnyAuthority ROLE_SUPERVISOR, ROLE_SAFETY_OFFICER` — calls `getHotspots(user.assignedSite())`.
- `GET /trends` — same auth — calls `getTrendingHazardTypes(user.assignedSite())`.
- `GET /recommendations` — same auth — calls `getRecommendations(user.assignedSite())`.
- `GET /summary` — same auth — combines all three into one payload for a single dashboard fetch (avoids 3 round trips from the screen).

All read-only, all site-scoped by `user.assignedSite()` exactly like every other supervisor/safety-officer endpoint — no new cross-site pattern here, this one's a straightforward extension of the existing model.

## Frontend

- **New `SafetyIntelligenceScreen`** (Supervisor + Safety Officer) — three sections: a hotspot list (location, combined count, severity badge), a trending hazard-types list (up-arrow badge + before/after counts), and a recommendations card list (plain templated text, dismissible client-side only — no need to persist dismissal server-side for v1).
- Wired into `SupervisorNavigator`'s More stack and `SafetyOfficerNavigator`, same pattern as every other screen added this session.
- `api.ts`: one new type (`SafetyIntelligenceSummary`) and one function `getSafetyIntelligenceSummary()` hitting `/safety-intelligence/summary`.

---

## Why this scope

This delivers the actual value the PRD is after — "which zones and hazard types need attention right now" — without pretending to have a trained model behind it. It's honest about being rule-based, not AI, and it's designed so a real ML scoring function could later replace `getHotspots`/`getTrendingHazardTypes` internals without touching the controller or the frontend at all. Left out deliberately: predictive risk scoring (needs a real model and historical data volume this app doesn't have yet), and any per-site threshold configuration (premature until someone actually asks for it).
