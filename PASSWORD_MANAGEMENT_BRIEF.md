# Password Management — Forced Change on Temp Password + Self-Service Change

## Context

Two related gaps, fixed together:

1. **Auto-generated passwords are hard to remember, and nobody is ever prompted to replace them.** Guest accounts, admin-driven password resets, and the new staff-account creation flow (`STAFF_ACCOUNT_CREATION_BRIEF.md`) all generate a random temp password like `Guest7X2KQ9!` and just display it once — the person is expected to keep using that forever.
2. **There's no self-service "Change Password" at all**, for any role, even for someone who knows their current password and just wants to pick a new one.

This brief adds both: a `mustChangePassword` flag that forces a password change on next login when an account was given a system-generated password, and a general-purpose "Change Password" screen (knowing your current password) reachable any time from My Account.

---

## 1. Database migration

New file `V59__add_must_change_password.sql`:

```sql
ALTER TABLE app_users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
```

## 2. `AppUser.java`

Add the field and accessors:

```java
private Boolean mustChangePassword = false;

public Boolean getMustChangePassword() { return mustChangePassword; }
public void setMustChangePassword(Boolean v) { this.mustChangePassword = v; }
```

## 3. Set the flag wherever a system-generated password is created

- `AdminController.createGuestAccount` — after building the `guest` object, add `guest.setMustChangePassword(true);` before saving.
- `AdminController.resetPassword` — after generating `tempPassword`, add `user.setMustChangePassword(true);` before saving.
- (Staff account creation already covered — `STAFF_ACCOUNT_CREATION_BRIEF.md` was updated to call `staff.setMustChangePassword(true)`; make sure that lands too, in either order relative to this brief.)

Do **not** set it during normal self-registration (`AuthController.register`) — those users chose their own password, no need to force a change.

## 4. `AuthController.java` — surface the flag at login, add change-password endpoint

In `authResponseWithToken`, add to `userMap`:
```java
userMap.put("mustChangePassword", Boolean.TRUE.equals(user.getMustChangePassword()));
```

Add a new self-service endpoint:

```java
@PostMapping("/api/auth/change-password")
@PreAuthorize("isAuthenticated()")
public Map<String, Object> changePassword(
    @AuthenticationPrincipal AuthenticatedUser principal,
    @RequestBody Map<String, String> body
) {
    String currentPassword = body.get("currentPassword");
    String newPassword = body.get("newPassword");
    if (currentPassword == null || newPassword == null || newPassword.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current and new password are required");
    }
    if (newPassword.length() < 6) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters");
    }

    AppUser user = appUserRepository.findByEmailIgnoreCase(principal.email())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

    if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
    }

    user.setPasswordHash(passwordEncoder.encode(newPassword));
    user.setMustChangePassword(false);
    appUserRepository.save(user);

    return Map.of("success", true);
}
```

This works for every role, including supervisors and safety officers — it only requires knowing the current password, so it doesn't touch the separate `resetPassword` restriction that blocks *admin-driven* resets for those two roles. That restriction is about someone else resetting your password; this is you changing your own, which is always safe to allow.

---

## 5. Frontend — `src/services/api.ts`

```ts
export function changePassword(currentPassword: string, newPassword: string) {
  return post<{ success: boolean }>('/auth/change-password', { currentPassword, newPassword });
}
```

Also add `mustChangePassword: boolean` to the `AuthSession['user']` type wherever it's defined (`src/types/auth.ts`), and make sure it's read off the login response the same way other user fields are.

## 6. New screen `src/screens/shared/ChangePasswordScreen.tsx`

One screen, two contexts (forced vs. optional — see below), same UI: three fields (Current Password, New Password, Confirm New Password), each with the same show/hide toggle pattern used in `AuthScreen.tsx`. Validate: new password ≥ 6 characters, new/confirm match, new password different from current (client-side check is fine, don't need a server round-trip just for that). On submit, call `changePassword`. On `401` from the API, show "Current password is incorrect." On success, show a confirmation and call an `onDone` callback prop (caller decides what happens next — see below).

Match the visual style already established elsewhere in shared screens (`typography`/`spacing` tokens, theme colors, no emoji — use `Ionicons` `lock-closed-outline` type icons where relevant).

## 7. Forced-change flow

When `session.user.mustChangePassword` is `true` right after login, the app needs to show `ChangePasswordScreen` **before** the normal role navigator, with no way to skip or dismiss it. Find where `onAuthenticated`/session routing happens (likely `App.tsx` or `RootNavigator.tsx` — check how `pendingApproval` is currently gated in the auth flow for a similar "can't proceed past this" pattern) and add: if `session.user.mustChangePassword`, render `ChangePasswordScreen` full-screen instead of the normal navigator; its `onDone` callback should update the in-memory session's `mustChangePassword` to `false` and then proceed to the normal app. No back button, no way to dismiss without completing it.

## 8. Optional self-service entry point

In `ProfileHubModal.tsx`, add a new row under the SETTINGS section (between "Active Sessions" and "Notifications", or wherever fits) — "Change Password" / "Update your account password", icon `Ionicons` `key-outline`, navigating to a new `screen === 'changePassword'` state showing `ChangePasswordScreen` wrapped the same way other sub-screens in that file are (`SwipeBackView` + back button). This path's `onDone` can just pop back to the menu with a success message — no forced navigation needed since the user got here voluntarily.

---

## Files touched (7)

New: `V59__add_must_change_password.sql`, `ChangePasswordScreen.tsx`. Modified: `AppUser.java`, `AdminController.java`, `AuthController.java`, `src/services/api.ts`, `src/types/auth.ts`, `ProfileHubModal.tsx`, plus wherever post-login routing lives (`App.tsx`/`RootNavigator.tsx`).

## Verification checklist

- Creating a guest account, resetting a password, or creating a staff account all set `mustChangePassword: true`; normal self-registration does not.
- Logging in with an account that has `mustChangePassword: true` shows the forced change screen with no way to bypass it; completing it successfully proceeds into the normal app and the flag is cleared server-side.
- "Change Password" is reachable from My Account at any time, works with the correct current password, and correctly rejects an incorrect current password with a clear error (not a generic failure).
- Supervisors and safety officers can use self-service change password even though admin-driven reset is blocked for their roles — confirm these are genuinely independent code paths.
- New password must be ≥ 6 characters; mismatched confirm field is caught before hitting the API.
- No regression to existing login, guest creation, or admin reset flows.
