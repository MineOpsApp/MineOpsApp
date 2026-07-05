# Live Site Map — Implementation Brief

From the MineOps concept doc, Section 07. Gives danger zones an actual visual home instead of a flat list, and lets tapping a zone surface its open hazards and any scheduled blasts. Deliberately scaled down from the concept doc: no GPS, no live worker location pins, no automatic vibration alerts on zone entry — that's consistent with the earlier, permanent decision to skip GPS tracking for underground sites. This is a supervisor-uploaded static map with tappable zone hotspots, not a live-tracked one.

## What this covers vs. doesn't

**Covered:** an uploaded site map image, named zones placed on it as tappable regions color-coded by risk level, tapping a zone to see its open hazards and any scheduled blasts, and a supervisor screen to define/edit zone positions.

**Not covered, and why:**
- *Zone Entry Warnings* (GPS-triggered vibration alerts) — depends on GPS tracking, which was already decided against for underground use.
- *True real-time propagation "in under 5 seconds"* — the app has no WebSocket/push-based live-update infrastructure; everything is REST polling today (the existing `BlastAlert` component already works this way — polls periodically). This brief follows that same pattern rather than introducing new real-time infrastructure. If sub-5-second propagation genuinely matters, that's a separate, bigger infrastructure discussion.
- *Offline map caching* — the app has no offline-first architecture anywhere today (confirmed during the earlier review). Standard image caching gets you casual reuse, not a guaranteed "view zones with zero connectivity" experience. Flagged as Phase 2.
- *Historical hazard heat-map overlay* — a data-visualization nice-to-have, not core. Phase 2.

## Decisions (final)

1. **Zone shapes: polygons**, not rectangles — free-form boundaries so irregular real-world zones can be traced accurately rather than approximated as boxes. This is a genuinely bigger UI lift than rectangles (a tap-to-place-vertex drawing tool, polygon hit-testing for taps, SVG rendering instead of plain positioned views) — worth knowing going in, but it's what was asked for.
2. **Extend the existing `danger_zones` table** rather than introducing a new one — it already represents exactly "a named zone with a risk level," it just gains map geometry now.

---

## Database — new migration `V40__add_site_map.sql`

```sql
CREATE TABLE site_map (
    id BIGSERIAL PRIMARY KEY,
    site VARCHAR(255) NOT NULL UNIQUE,
    image_data TEXT NOT NULL,        -- base64, same pattern as hazard/profile photos elsewhere in this app
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE danger_zones ADD COLUMN polygon_points TEXT;
-- JSON array of {x, y} objects, each 0.00–100.00 as a percentage of the image's width/height,
-- e.g. [{"x":12.5,"y":8.0},{"x":40.0,"y":10.0},{"x":35.0,"y":30.0}]
-- Stored as plain TEXT and parsed/serialized with Jackson's ObjectMapper (already a dependency,
-- already used this way elsewhere, e.g. MarketController) rather than a Postgres-native
-- polygon/json type, since nothing else in this codebase uses one and this keeps the pattern consistent.
```

Existing `danger_zones` rows keep working exactly as they do today (list view) — `polygon_points` is simply `NULL` until a supervisor traces that zone on the map. A zone with no polygon just doesn't render as a hotspot yet; it still shows in the existing list-based `SafetyDangerZonesScreen`.

## Backend

**`SiteMap.java` / `SiteMapRepository`** — one row per site, `findBySiteIgnoreCase`.

**`SiteMapController`** (`/api/site-map`), site-scoped throughout:
- `GET /api/site-map` — `@PreAuthorize isAuthenticated()` (every role including guests needs to see the map) — returns the current site's map image, or 404 if none uploaded yet (frontend shows an empty/upload-prompt state).
- `POST /api/site-map` — `@PreAuthorize hasAnyAuthority ROLE_SUPERVISOR` — upload/replace the site's map image. Reuse the existing size guard pattern from `ProfileController.updateProfile()` (rejects overly large base64 payloads) rather than introducing a new limit.

**`DangerZoneController`** — extend, don't replace:
- `PATCH /api/danger-zones/{id}/position` — `@PreAuthorize hasAnyAuthority ROLE_SUPERVISOR, ROLE_SAFETY_OFFICER`, site-checked with the same `findAndCheckSite` pattern used everywhere else in this codebase — request body is a list of `{x, y}` points; serialize to the `polygon_points` JSON string with Jackson before saving. Validate at least 3 points (a polygon needs a minimum of three vertices) and reject otherwise.
- `GET /api/danger-zones/{id}/detail` — site-checked — returns the zone plus: open hazards where `HazardReport.location` (case-insensitive) contains the zone name, and scheduled blasts where `BlastSchedule.zone` matches the zone name. This is a name-matching join, not a foreign key — `location`/`zone` are free-text strings across `HazardReport`, `BlastSchedule`, and `ShiftLog` throughout the existing codebase, and retrofitting all of them onto a shared zone foreign key would be a much bigger, riskier migration than this feature needs. Matching by name is a reasonable trade-off given how the data already looks.

## Frontend

- **New shared component, `SiteMapView`** — renders the uploaded image with an SVG overlay (`react-native-svg` is already a dependency, pulled in for the QR code feature — no new library needed) drawing each zone as a colored `<Polygon>` (Yellow/Orange/Red per `riskLevel`, matching the concept doc's color scheme), each tappable. Used from multiple places: worker home, supervisor home, safety officer's danger zones screen, and guest home (read-only, matching "visible to all users including guests" from the concept doc).
- **`SafetyDangerZonesScreen.tsx`** (safety officer, who already owns danger zone creation) — add a "Trace on Map" mode: shows the uploaded image, the safety officer taps to place each vertex in sequence, taps the first point again (or a "Close Shape" button) to finish, then saves via the new position endpoint. Needs basic validation in the UI too (minimum 3 points) mirroring the backend check.
- **Zone tap → detail sheet** — shows risk level, open hazard count/list (photo, severity, reported time — reusing the existing hazard card component already used elsewhere), and any scheduled blasts for that zone. Tap hit-testing against an arbitrary polygon (not just a bounding box) — a standard point-in-polygon check (ray casting) against the stored points, scaled to the rendered image size.
- **Supervisor "Upload Site Map"** action (More menu or within an existing screen) — image picker (reuse `expo-image-picker`, already a dependency) → uploads via the new endpoint.
- **`api.ts`** additions: `getSiteMap()`, `uploadSiteMap(imageBase64)`, `updateZonePosition(id, points)`, `getZoneDetail(id)`.
- Polling: the zone detail view and map screen should poll on an interval while open (e.g. every 20–30 seconds), following the same pattern as the existing `BlastAlert` component, rather than a one-time fetch — this is what approximates "real-time" here without new infrastructure.

---

## Why this scope

This reuses every piece of hazard/blast data that already exists — it doesn't ask for new report types or a restructured data model, just a visual layer and position data on top of what's already there. The pieces intentionally left out (GPS entry warnings, true real-time push, offline caching, heat-maps) each depend on infrastructure this app doesn't have yet, and bundling them in here would turn a two-week feature into a much larger infrastructure project.
