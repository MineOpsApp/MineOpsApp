# Create Supervisor / Safety Officer Accounts In-App

## Context

Right now there is no way to create a supervisor or safety officer account except a direct database insert — `AuthController.ALLOWED_ROLES` only permits self-registration as `worker`/`guest`/`buyer`, and `AdminController` has no endpoint for staff accounts (only guests). This brief adds a proper in-app flow, modeled closely on the existing guest-account creation pattern (`AdminController.createGuestAccount` / `SupervisorGuestScreen.tsx`).

**Access decision (confirmed with Kumi): supervisors only.** Safety officers can create guest accounts today, but creating a *supervisor or safety officer* account is a higher-privilege action, so it's restricted to `ROLE_SUPERVISOR` only — not `ROLE_SAFETY_OFFICER`. This is a real security boundary, not a UI nicety — enforce it server-side via `@PreAuthorize`, don't just hide the screen client-side.

**Depends on `PASSWORD_MANAGEMENT_BRIEF.md`.** Build that brief first (or alongside this one) — it adds the `mustChangePassword` field this brief's `createStaffAccount` endpoint sets to `true` below. If `PASSWORD_MANAGEMENT_BRIEF.md` hasn't landed yet, `AppUser.setMustChangePassword` won't exist — implement that brief first.

---

## 1. Backend — new DTO

New file `MineOpsBackend/dto/CreateStaffAccountRequest.java`:

```java
package MineOpsBackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateStaffAccountRequest(
    @NotBlank String fullName,
    @NotBlank @Email String email,
    @NotBlank String password,
    @NotBlank @Pattern(regexp = "supervisor|safetyOfficer", message = "role must be supervisor or safetyOfficer") String role,
    @NotBlank String assignedSite
) {}
```

## 2. Backend — new endpoint in `AdminController.java`

Add, following the exact same structure as `createGuestAccount` (same class, same constructor-injected dependencies already available):

```java
@PostMapping("/api/admin/staff/create")
@PreAuthorize("hasAuthority('ROLE_SUPERVISOR')")
public Map<String, Object> createStaffAccount(
    @AuthenticationPrincipal AuthenticatedUser admin,
    @Valid @RequestBody CreateStaffAccountRequest request
) {
    String email = request.email().trim().toLowerCase();
    if (appUserRepository.existsByEmailIgnoreCase(email)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
    }

    AppUser staff = new AppUser(
        request.fullName().trim(),
        email,
        passwordEncoder.encode(request.password()),
        request.role(),
        request.assignedSite()
    );
    staff.setMustChangePassword(true);
    appUserRepository.save(staff);

    auditLogService.record(
        "STAFF_ACCOUNT_CREATED",
        admin.role(),
        admin.fullName(),
        admin.email(),
        "AppUser",
        staff.getId(),
        email + " as " + request.role() + " at " + request.assignedSite()
    );

    return Map.of(
        "id", staff.getId(),
        "email", staff.getEmail(),
        "fullName", staff.getFullName(),
        "role", staff.getRole(),
        "assignedSite", staff.getAssignedSite()
    );
}
```

Import `CreateStaffAccountRequest` at the top of `AdminController.java`. No changes needed to `AuthController.java` — self-registration stays restricted to worker/guest/buyer exactly as it is; this is a separate, admin-initiated path.

---

## 3. Frontend — `src/services/api.ts`

Add near `createGuestAccount`:

```ts
export function createStaffAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  role: 'supervisor' | 'safetyOfficer';
  assignedSite: string;
}) {
  return post<any>('/admin/staff/create', payload);
}
```

---

## 4. Frontend — new screen `src/screens/supervisor/SupervisorStaffScreen.tsx`

Mirror `SupervisorGuestScreen.tsx`'s "Create Account" tab structure and visual style exactly (same `card`/`fieldLabel`/`input`/`pillRow`/`successCard` pattern) — no need for the "Renew" or "List" tabs this screen doesn't need those concepts. Fields:

- Full Name, Email (same validation as the guest screen: required, basic email regex).
- Role selector: two options, Supervisor / Safety Officer, same radio-row visual pattern as `GUEST_TYPES` in the guest screen.
- Assigned Site: same `SITES` pill row as the guest screen.
- Generate a temp password the same way the guest screen does (`Staff${random}!` instead of `Guest${random}!`), call `createStaffAccount`, and show the same kind of `successCard` with the credentials to share with the new staff member (name, email, password, role, site) plus a "Create Another" button.

Handle the 409 conflict error the same way (`Email taken` alert).

## 5. Navigation — entry point, supervisor-only

Add an entry to reach this screen from the Supervisor role's menu (`SupervisorNavigator.tsx` / wherever `SupervisorGuestScreen` is currently linked from, likely a `MoreScreen` section or admin area) — **only for `role === 'supervisor'`**, not safety officer. Match whatever icon/menu-item pattern is already used for "Guest Access" in that navigator, label it "Staff Accounts" or similar.

---

## Files touched (5)

New: `CreateStaffAccountRequest.java`, `SupervisorStaffScreen.tsx`. Modified: `AdminController.java`, `src/services/api.ts`, `SupervisorNavigator.tsx`.

## Verification checklist

- A safety officer calling `POST /api/admin/staff/create` gets a 403 — only supervisors can reach this endpoint (test both server-side rejection and that the UI entry point doesn't even show for safety officers).
- Creating a supervisor or safety officer account works end-to-end: appears in the database with the correct role, `active: true`, `pending: false` (so they can log in immediately, no approval step needed).
- Duplicate email shows the "Email taken" alert, not a crash.
- The new account's credentials display correctly on the success screen, matching the same format as guest account creation.
- Audit log records `STAFF_ACCOUNT_CREATED` with the creating supervisor's identity.
- Self-registration (`/api/auth/register`) still rejects `supervisor`/`safetyOfficer` as before — this brief doesn't touch that endpoint.
