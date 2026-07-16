# Mapbox Migration + Live Worker Location Tracking

## Context & decisions made

Today's "site map" (`SiteMapView.tsx`) is not a real geographic map — it's an uploaded photo/diagram with danger zones drawn as percentage-based (0-100) polygon overlays on top of that image. There's no real GPS involved and no live worker positions.

Confirmed with Kumi:
- All current sites are surface/open-pit (not underground), so real GPS tracking is physically viable — this would NOT work underground since satellite GPS doesn't reach below ground.
- Provider: **Mapbox** (`@rnmapbox/maps`), not Google Maps/`react-native-maps` — chosen specifically for genuine offline map tile caching (important for spotty rural connectivity) and full custom styling control. Free tier covers 25,000 monthly active users/month, far more than this app needs, so cost isn't a near-term concern.
- Worker location updates **only while the app is open and in the foreground** — not background tracking. Simpler permission model, far better battery life, avoids the extra App Store/Play Store scrutiny background-location apps get.
- This is real workplace location monitoring — an **explicit in-app consent screen is required** before tracking activates for any worker, not just implied by installing the app.

## Critical infra callout — read before starting

`@rnmapbox/maps` requires native code. **This cannot run in Expo Go anymore once installed.** The team will need to build and install a custom development build via EAS (`eas build --profile development`) instead of scanning a QR code in the Expo Go app. This is a real workflow change for everyone on the team, not just a dependency install — flag this clearly to Kumi before starting, and update `SETUP.md` once this ships to reflect the new dev-client-based workflow instead of plain Expo Go.

**Kumi's own action required first**: create a Mapbox account at mapbox.com, and generate two tokens — a public access token (starts with `pk.`) for runtime map rendering, and a secret **downloads** token (starts with `sk.`, needs the `DOWNLOADS:READ` scope) used only to download the SDK during builds. These go into `app.json`'s Mapbox plugin config and a local `.netrc`/env setup for EAS builds respectively. Don't proceed with the actual build until these exist — ask Kumi for them if they're not provided.

---

## Recommended build order

This is the largest single feature attempted this session — build and verify it in phases, the same way the redesign rollout was done in batches. Don't try to ship all four phases in one pass.

### Phase 1 — Mapbox base map + convert danger zones to real GPS

1. `npx expo install @rnmapbox/maps`. Add the Mapbox config plugin to `app.json` (per `@rnmapbox/maps` install docs) with the public token, and set up the download token per their docs. Note this pins the project into needing `expo prebuild`/EAS builds going forward.
2. New migration (check the actual latest `V##` file at build time — likely `V60` or higher depending on whether `PASSWORD_MANAGEMENT_BRIEF.md` has landed yet — don't hardcode a number that might collide):
   ```sql
   ALTER TABLE danger_zones ADD COLUMN geo_polygon_points TEXT;
   ALTER TABLE danger_zones ADD COLUMN center_lat DOUBLE PRECISION;
   ALTER TABLE danger_zones ADD COLUMN center_lng DOUBLE PRECISION;
   ```
   Keep the old `polygon_points` column as-is — don't drop it or try to auto-convert existing zones (there's no reliable way to map old percentage-of-image coordinates to real GPS). Existing zones will need to be manually redrawn by a supervisor on the new map after this ships; note this to Kumi as a one-time cleanup task, not something to solve in code.
3. `DangerZone.java`: add `geoPolygonPoints` (TEXT, JSON array of `{lat, lng}`), `centerLat`, `centerLng` fields + accessors.
4. `UpdateZonePositionRequest.java`: add a new variant or new endpoint (`PATCH /api/danger-zones/{id}/geo-position`) accepting `List<GeoPoint>` where `GeoPoint(Double lat, Double lng)`, serializing to `geoPolygonPoints` the same way the existing endpoint serializes to `polygonPoints`.
5. New frontend component `src/components/MapboxSiteMapView.tsx` replacing `SiteMapView.tsx`'s usage where it's rendered (`WorkerHomeScreen.tsx`, `SupervisorSiteMapScreen.tsx`, etc. — check all current usages first): a real `@rnmapbox/maps` `MapView` centered on the site (need each site's real center lat/lng — ask Kumi for Obuasi/Tarkwa/Bogoso/Prestea Mine coordinates, or use approximate public coordinates for each as a starting point and let them correct later), rendering danger zones as `ShapeSource`/`FillLayer` polygons using `geoPolygonPoints`, same risk-level color coding as today (`RISK_COLOR` map). Zone tap-to-detail behavior (the existing popover with hazard/blast counts) should carry over.
6. Update the zone-drawing UI (wherever supervisors currently set `polygonPoints` by tapping the image) to instead let them tap points directly on the new Mapbox map to define a zone's real GPS boundary.

### Phase 2 — Consent screen

1. New migration: `ALTER TABLE app_users ADD COLUMN location_consent_at TIMESTAMP;`
2. `AppUser.java`: add `locationConsentAt` field + accessors.
3. New endpoint `POST /api/profile/location-consent` (authenticated, any role) that sets `locationConsentAt = now()` for the calling user.
4. New screen `src/screens/shared/LocationConsentScreen.tsx`: clear plain-language explanation that the app shares their live location with supervisors/safety officers at their site while the app is open during their shift, why (site safety, emergency response), and that it stops when the app isn't open. A single "I Understand — Continue" action calling the new endpoint. Show this once, after login, if `session.user.locationConsentAt` is null and role is `worker` (or whichever roles will actually be tracked — confirm scope is workers only, not supervisors/safety officers/buyers, before building this gate broadly). Same "can't skip" pattern as the forced password-change screen from `PASSWORD_MANAGEMENT_BRIEF.md` — full-screen, no dismiss.
5. Add `locationConsentAt` to the login response's `userMap` in `AuthController.java`, same as `mustChangePassword`.

### Phase 3 — Foreground location ping

1. New backend table via migration:
   ```sql
   CREATE TABLE worker_locations (
       id BIGSERIAL PRIMARY KEY,
       user_email VARCHAR(255) NOT NULL UNIQUE,
       site VARCHAR(255) NOT NULL,
       latitude DOUBLE PRECISION NOT NULL,
       longitude DOUBLE PRECISION NOT NULL,
       updated_at TIMESTAMP NOT NULL
   );
   ```
2. New `WorkerLocation` entity + repository (`findBySiteIgnoreCase`), new `LocationController.java`:
   - `POST /api/location/ping` (authenticated worker) — upsert the caller's row with current lat/lng and `updated_at = now()`.
   - `GET /api/location/site` (`ROLE_SUPERVISOR`/`ROLE_SAFETY_OFFICER` only) — return all `worker_locations` rows for `admin.assignedSite()`, joined with `AppUser` for full name. Filter out anything older than ~5 minutes server-side (stale = worker closed the app) rather than showing a frozen last-known dot indefinitely.
3. Frontend: a small hook (e.g. `useForegroundLocationPing`) started when a worker session is active and `locationConsentAt` is set — uses `expo-location`'s `watchPositionAsync` with a reasonable interval (e.g. every 30-60 seconds, `distanceInterval` a sensible threshold like 20m) to call a new `pingLocation(lat, lng)` API function. Must stop cleanly when the app backgrounds (use `AppState` to pause/resume) — this enforces the foreground-only decision at the client level too, not just by omitting background permissions.
4. Request only foreground location permission (`Location.requestForegroundPermissionsAsync`) — do not request background permission anywhere in this feature.

### Phase 4 — Live markers for supervisors/safety officers

1. `src/services/api.ts`: `pingLocation(lat, lng)`, `getSiteWorkerLocations()`.
2. In `MapboxSiteMapView.tsx`, when rendered for a supervisor/safety officer, poll `getSiteWorkerLocations()` (e.g. every 20-30s) and render a `PointAnnotation`/marker per worker with their name, refreshing position as new data comes in. Workers themselves should not see other workers' live positions on their own map view — keep this supervisor/safety-officer only, least-privilege.

---

## Files touched (approximate, spans both repos)

Backend: new migration(s), `DangerZone.java`, `UpdateZonePositionRequest.java` (or new geo variant), `AppUser.java`, `AuthController.java`, new `WorkerLocation.java` + repository + `LocationController.java`, `ProfileController.java` (consent endpoint) or wherever fits best.
Frontend: `app.json`, new `MapboxSiteMapView.tsx` (replacing `SiteMapView.tsx` usage), new `LocationConsentScreen.tsx`, new `useForegroundLocationPing` hook, `src/services/api.ts`, `src/types/auth.ts`, wherever `SiteMapView` is currently imported.

## Verification checklist (per phase — verify each before moving to the next)

- Phase 1: Mapbox map renders and pans/zooms correctly; a newly-drawn zone's real GPS polygon displays and its tap-to-detail popover still shows hazard/blast counts correctly; app now requires the EAS dev client to run, confirmed working on a real device.
- Phase 2: A worker who hasn't consented sees the consent screen on next login with no way to dismiss it; accepting it persists server-side and doesn't re-show on subsequent logins.
- Phase 3: Location pings only fire while the app is foregrounded (test by backgrounding the app and confirming pings stop); only foreground permission is requested, never background.
- Phase 4: A supervisor sees live-ish worker dots on the map that update on a poll interval and disappear/gray-out if a worker's last ping is stale (>5 min); workers do not see other workers' positions on their own map.
- No regression to existing hazard/blast/zone-detail functionality carried over from the old `SiteMapView.tsx`.
