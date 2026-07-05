# MineOps Bugfix Brief

Findings from a manual code review of MineOpsApp, MineOpsBackend, and MineOpsAuditService (July 2026). Ordered by severity. Each item has the file, the problem, and the fix. Suggested approach: work top to bottom, write a quick test or manual repro for each CRITICAL item before/after fixing it, since these are auth/safety-critical.

---

## CRITICAL — cross-site authorization bypasses (safety & security impact)

All of the following share the same root cause: an endpoint does `repository.findById(id)` (or a similar lookup) and then reads/mutates the record **without checking that the record's `site` matches the caller's `assignedSite()`**. The correct pattern already exists elsewhere in the codebase (e.g. `ProfileController.getWorkerProfile()`, `ShiftLogController.approveShiftLog()`) — these six/nine spots just never got it applied.

- [ ] **`HazardController.reviewHazard()` / `closeHazard()`** — `backend/src/main/java/MineOpsBackend/controller/HazardController.java` (lines ~128–188). Any supervisor/safety officer, from ANY site, can mark any hazard report REVIEWED or CLEARED, including hazards from other sites. Highest-severity finding — this is the flagship safety feature. **Fix:** add `if (!report.getSite().equalsIgnoreCase(user.assignedSite())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hazard belongs to a different site");` right after the `findById` in both methods.

- [ ] **`BlastController.cancelBlast()` / `executeBlast()`** — `BlastController.java` (lines ~108–167). Same pattern — a supervisor at one site can cancel or mark "EXECUTED" a blast scheduled at another site. Safety-critical: falsely marking a blast executed misrepresents whether an area is cleared. **Fix:** same site-check pattern.

- [ ] **`AdminController.resetPassword()` / `suspendUser()`** — `AdminController.java` (lines ~133–192). No check that the target account's site matches the admin's site — a supervisor can reset the password of, or suspend, a worker at a different site. Resetting a password is effectively account takeover. **Fix:** add `if (!user.getAssignedSite().equalsIgnoreCase(admin.assignedSite())) throw FORBIDDEN` before acting.

- [ ] **`IncidentController.updateStatus()`** — `IncidentController.java` (line ~117). No site check on the incident being updated.

- [ ] **`EquipmentController.updateStatus()`** — `EquipmentController.java` (line ~69). No site check on the equipment record.

- [ ] **`NoticeController.deleteNotice()`** — `NoticeController.java` (line ~170). No site check — any supervisor/safety officer can delete any notice system-wide.

- [ ] **`EmergencyContactController.getWorkerContactsById()` / `getWorkerContactsByEmail()`** — `EmergencyContactController.java` (lines ~136–148). No site check — leaks another site's worker's name, relationship, and phone number. Compare to `ProfileController.getWorkerProfile()`, which does this correctly.

- [ ] **`LoneWorkerAlertService.checkOverdueSessions()`** — `backend/src/main/java/MineOpsBackend/service/LoneWorkerAlertService.java` line 39: `findByRoleAndAssignedSiteIgnoreCase("ROLE_SUPERVISOR", session.getSite())`. `AppUser.role` is stored lowercase ("supervisor", not "ROLE_SUPERVISOR") — confirmed by `WorkerMessageController.java` line 69 using `"supervisor"` correctly against the same repository method. This query always returns zero rows, so **no supervisor has ever been pushed an overdue-lone-worker alert**. Worse: the code unconditionally sets `session.setAlerted(true)` afterward regardless of whether any token was found, so the session is marked "handled" and never retried. **Fix:** change the literal to `"supervisor"`; only set `alerted = true` once a push actually went out (or keep retrying while no supervisor token is found).

- [ ] **`CertificationController.getCertHistory()`** — `CertificationController.java` line 92: `if ("ROLE_WORKER".equals(user.role()) && ...)`. Same root cause as above — `user.role()` returns the raw lowercase value, so this check (meant to restrict workers to their own certification history) never triggers. **Any worker can currently view any other worker's certification renewal history** by iterating certification IDs. **Fix:** change to `"worker".equals(user.role())`.

**Do a global search for this pattern before considering the sweep done:** grep both repos for any comparison against a `"ROLE_..."` string literal that is *not* inside a `@PreAuthorize`/`hasAuthority` annotation — that's the exact signature of this bug class. Two backend instances and one frontend instance (see below) were found in this pass; there may be more in code not yet reviewed line-by-line.

---

## HIGH

- [ ] **`NoticeController.getNotices()`** — line 58. For any non-worker/non-guest role, calls `noticeRepository.findAllByOrderByCreatedAtDesc(pageable)` — every notice from every site, unfiltered, instead of scoping to `user.assignedSite()`.

- [ ] **`SupervisorDashboardController.getDashboard()`** — line 62: `noticeRepo.findAllByOrderByCreatedAtDesc().size()` — same bug, confirms the Notice feature specifically never got site-scoping. Every other stat in this same method (`hazardCount`, `workersOnSite`, etc.) is correctly scoped by `site`; this one isn't.

- [ ] **`MessageController`** (`/api/messages`, `backend/src/main/java/MineOpsBackend/controller/MessageController.java`) — `getMessages()` takes no user/site parameter at all and returns every message ever posted, from every site. Confirmed still live and called from `SupervisorNoticesScreen.tsx` via `createSupervisorMessage()`/`getMessages` in `api.ts` — not dead code. Looks superseded by the properly site-scoped `ShiftAnnouncementController`, which should probably replace it entirely; if kept, it needs the same site filter.

- [ ] **`SosController.createAlert()`** — line 49: `site` is taken directly from the client request body if provided, instead of always using `user.assignedSite()`. Any authenticated user (including a guest) can trigger a fake SOS alert attributed to a *different* site, which pushes a real "🚨 SOS ALERT" to that other site's supervisors. **Fix:** ignore `request.site()` entirely; always use the caller's own assigned site.

- [ ] **`DangerZoneController.createDangerZone()`** — line 37: same issue, `request.site()` trusted directly rather than derived from the authenticated user.

- [ ] **`JwtService.constantTimeEquals()`** — both `MineOpsBackend/service/JwtService.java` and `MineOpsAuditService/service/JwtService.java`. Implemented with `Arrays.equals(byte[], byte[])`, which is NOT constant-time (short-circuits on first mismatch/length difference) despite the method name. `InternalApiKeyService.java` in the audit service does this correctly with `MessageDigest.isEqual(...)`. **Fix:** replace both implementations with `MessageDigest.isEqual(...)`.

- [ ] **Duplicate `GlobalExceptionHandler` classes** — `MineOpsBackend.config.GlobalExceptionHandler` and `MineOpsBackend.controller.GlobalExceptionHandler`, both `@RestControllerAdvice`, both handling `MethodArgumentNotValidException` with different response shapes. **Fix:** delete the `config` package version; keep `controller.GlobalExceptionHandler` (it also handles `ResponseStatusException`).

---

## MEDIUM

- [ ] **Frontend token-refresh bypass** — in `MineOpsApp/src/services/api.ts`, six functions call `fetchWithTimeout` directly instead of the `request()/post()/patch()` wrappers everything else uses, so they skip proactive refresh and 401-retry-with-refresh: `reviewHazardReport`, `closeHazardReport`, `updateWorkerEquipmentStatus`, `getAuditLogs`, `searchAuditLogs`, `exportAuditLogsCsv`. **Fix:** route these through the same helper functions as the rest of the file.

- [ ] **`DashboardController.getDashboard()`** (`/api/dashboard`) — returns entirely hardcoded fake data (`equipmentCount: 18`, fictional equipment like "Dump Truck DT-12") regardless of caller or site. Looks like an early stub superseded by `SupervisorDashboardController`. **Fix:** wire to real data or remove the endpoint/screen using it.

- [ ] **Duplicate blast-history endpoints** — `BlastController.getAllBlasts()` (`/blasts/all`) and `getBlastHistory()` (`/blasts/history`) both call the identical `findBySiteOrderByBlastTimeDesc(user.assignedSite())` but with different `@PreAuthorize` rules (supervisor/safety-officer only vs. any authenticated user) — so `/blasts/history` is effectively a broader-access duplicate. Matching duplicate on the frontend: `getWorkerBlastHistory()` and `getAllBlasts()` in `api.ts` both hit `/blasts/all`. **Fix:** consolidate into one endpoint with the intended access level.

- [ ] **Frontend `roleLabel()` cosmetic bug** — `WorkerProfileScreen.tsx` line 27 and `WorkerProfileViewScreen.tsx`: checks `role === 'ROLE_WORKER'` etc., but the profile's `role` field is the raw lowercase value from the backend, so it always falls through to displaying the raw string ("worker", "safetyOfficer") instead of a formatted label. Same root cause as the backend `ROLE_` bugs above. **Fix:** compare against `'worker'`/`'supervisor'`/`'safetyOfficer'`, and de-duplicate this helper (plus `idNumber`, `getInitials`, `formatDate`, which are copy-pasted across both screens) into the existing `src/utils/time.ts`-style shared utils.

- [ ] **`MarketController` / `MarketScreen.tsx` / `getMarketPrices()`** — contradicts the stated project state ("removed"); still live, still calling a paid third-party commodities API on load. **Decide:** finish it properly (mining-specific minerals per the concept doc) or delete it end-to-end (controller, screen, api.ts function).

---

## LOW / structural improvements (not bugs, but worth doing)

- [ ] Move the hardcoded LAN IP (`172.20.10.4:8080`) in `api.ts` to an env-configurable value (Expo `extra` config or `EXPO_PUBLIC_` var).
- [ ] Split `api.ts` (~1,150 lines) into per-domain modules (`api/auth.ts`, `api/hazards.ts`, etc.) sharing one fetch/refresh core.
- [ ] Replace `request<any>(...)` typing on shift logs, drill operations, blasts, incidents, equipment with real TypeScript interfaces.
- [ ] Add automated tests, starting with `LoneWorkerAlertService`, `MineralInventoryService`, `RefreshTokenService`, and controller-level auth/site-scoping tests — the bugs above are exactly what unit tests would have caught.
- [ ] Bring `MineOpsAuditService` onto Flyway (currently `ddl-auto=update` against the same physical Postgres instance the main backend manages with Flyway).
- [ ] Add basic rate limiting to `/api/auth/login` and `/api/auth/register` (both fully public, no throttling).
- [ ] Tighten `server.error.include-message=always` / `include-binding-errors=always` in `application.properties` once error handling is finalized — currently leaks exception detail on any unhandled error.
- [ ] Standardize pagination — hazards/notices/SOS/danger-zones are paginated, shift logs/incidents/drill-ops/blasts are raw lists.
- [ ] Consider replacing the hand-rolled JWT implementation with a maintained library (e.g. `jjwt`) — the constant-time bug above is a direct consequence of rolling this by hand.
- [ ] Move photo storage (hazard photos, profile photos, incident photos — all base64 in Postgres `TEXT` columns) to object storage (S3/R2/GCS), storing just the URL.
- [ ] `PushNotificationService.sendToToken()` only logs Expo's HTTP status, never parses the per-message JSON body where actual delivery errors (e.g. `DeviceNotRegistered`) live — stale tokens are never pruned, failures go unnoticed. Also uses `System.out/err.println` instead of a real logger everywhere.
- [ ] `app_user.push_token` is a single column — logging in on a second device silently overwrites the first device's token. Consider a join table if multi-device matters.
- [ ] Add Spring Boot Actuator for health/metrics beyond the hand-rolled `/api/health`.
- [ ] `EmergencyContactController` hand-rolls validation instead of `@Valid` + Bean Validation (inconsistent with `CertificationController`); the "max 2 contacts" and PRIMARY/BACKUP constraints are enforced only in Java, not at the DB level — add a unique constraint on `(worker_id, contact_type)` and a CHECK constraint for defense in depth.

---

## Verified clean (no action needed)

`WorkerController`, `ShiftLogController` (approve/reject), `DrillController`, `FirstAidKitController`, `SafetyChecklistController`, `AttendanceController`, `WorkerMessageController` (reply/read), `MineralInventoryController`, `LoneWorkerController`, and `AdminController`'s guest/pending-worker endpoints all correctly check site ownership or self-ownership — reviewed and confirmed fine.
