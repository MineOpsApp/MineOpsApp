# Buyer-Facing Inventory Visibility — Implementation Brief

From the MineOps concept doc, Section 09. Lets a mine opt in to sharing its current stock levels with the "investor" guest sub-role, which already exists but currently shows nothing except a hazard count. This is scoped as the on-ramp to a future marketplace, not the marketplace itself.

## Key scoping call: reuse the existing investor guest, don't build a buyer account system

The concept doc describes "registered buyers" with persistent accounts, watch-lists, and push notifications that follow them across visits. That's a real gap between what exists and what's described — this app has no buyer account type at all, only temporary guest sessions (24-hour by default, or however long a guest-access code grants). Checked `GuestHomeScreen.tsx`'s investor branch directly: it currently only shows a hazard count (`clearedHazards`/`openHazards`) — no inventory data at all, despite the concept doc saying investor guests should see "approved inventory snapshot and mine profile."

**What this brief builds:** a read-only inventory snapshot added to the existing investor guest view, gated by a per-site opt-in toggle a supervisor controls.

**What this brief deliberately doesn't build, and why:** persistent buyer accounts, watch-lists, and price-alert push notifications. Notifications that "follow a buyer over time" need someone reachable across sessions — that's fundamentally a persistent-account feature, which is really the first piece of the eventual Marketplace (Section 10), not something that fits onto an expiring guest session. Bolting a fake version of it onto guest sessions now would mean throwing it away when the real Marketplace gets built. Recommendation: treat "watch-lists and notifications" as part of that future Marketplace brief instead.

## Decision (final)

**Visibility granularity: one simple per-site toggle** — "share inventory with investor guests: on/off," not the concept doc's fuller Public/Private/Internal-per-mineral-type control. A mine either shows investors its stock or it doesn't for now; per-mineral-type controls can be layered on later without touching anything this brief builds.

---

## Database — new migration `V41__add_inventory_visibility.sql`

```sql
ALTER TABLE sites ADD COLUMN inventory_visible_to_guests BOOLEAN NOT NULL DEFAULT FALSE;
```

Defaults to off — a mine has to actively opt in, not be opted in by default.

## Backend

**`Site.java`** — add `inventoryVisibleToGuests` field + getter/setter.

**`SiteController`** — extend the existing controller:
- `PATCH /api/sites/visibility` — `@PreAuthorize hasAnyAuthority ROLE_SUPERVISOR` — body `{ visible: boolean }`, updates the caller's own site (`user.assignedSite()`, no `siteId` param needed since a supervisor only ever manages their own site — avoids needing a site-ownership check entirely by construction rather than adding one that could be gotten wrong). Call `auditLogService.record("INVENTORY_VISIBILITY_CHANGED", ...)`.

**`MineralInventoryController`** — extend:
- `GET /api/inventory/public` — `@PreAuthorize hasAuthority('ROLE_GUEST')`. Look up the guest's site via `Site` repository; if `inventoryVisibleToGuests` is false, throw `403` with a clear message ("This site has not opted in to sharing inventory"). Otherwise return the same shape `getSiteInventory()` already returns for supervisors (`MineralInventoryRepository.findBySiteIgnoreCaseOrderByMineralTypeAsc`) — reuse the existing repository method and `MineralInventory` model as-is, no new DTO needed. Note this is intentionally available to any `ROLE_GUEST`, not just the `investor` sub-role specifically — matches how other guest-facing endpoints in this codebase already work (role-gated, not sub-role-gated at the API layer; sub-role gating happens in the frontend's screen routing, same pattern as the existing `GuestNavigator`).

## Frontend

- **`GuestHomeScreen.tsx`** (investor branch) — add an "Inventory Snapshot" section below the existing hazard count: calls the new `getPublicInventory()` function, shows mineral type / unit / total volume / last updated per row (same fields already shown in `SupervisorMineralInventoryScreen`, just read-only and without transaction history). If the call comes back `403`, show "This site hasn't shared its inventory" instead of an error state — that's an expected, normal outcome, not a failure.
- **Supervisor side** — add the visibility toggle to `SupervisorMineralInventoryScreen.tsx` (it already owns this data, no need for a new screen): a simple switch, "Share inventory with investor guests," calling the new `updateInventoryVisibility(visible)` function.
- **`api.ts`** additions: `getPublicInventory()`, `updateInventoryVisibility(visible: boolean)`.

---

## Why this scope

This reuses the investor guest sub-role that already exists rather than inventing a buyer account system, and reuses the existing `MineralInventory` data and repository method rather than building a parallel read model. The pieces left out — persistent buyer identity, watch-lists, price-alert notifications — all depend on having actual buyer accounts, which is a bigger, separate decision (effectively "when do we start the Marketplace") rather than something to smuggle into this smaller feature.
