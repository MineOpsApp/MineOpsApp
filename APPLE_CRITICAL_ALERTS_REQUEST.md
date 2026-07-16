# Apple Critical Alerts Entitlement — Request Draft

## What this is

This is **not code** — it's a request you submit yourself to Apple, since it requires your Apple Developer account. Once (if) Apple approves it, come back and I'll write the iOS implementation brief for VS Code Claude.

## Where to submit

https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/

Submit from the Apple Developer account that owns the MineOps app / bundle identifier. You'll need a paid Apple Developer Program membership and the app's exact bundle ID (check `app.json` → currently no explicit `ios.bundleIdentifier` is set, so confirm/set that in your EAS/App Store Connect setup before or alongside this request).

## What to expect

- Reviewed manually by Apple — typically takes anywhere from a few days to a few weeks.
- Apple only grants this for genuine health, safety, security, or emergency use cases — it's common to be asked to resubmit with a clearer justification if the first pass is too vague.
- Approval is not guaranteed.

## Suggested justification text (copy/paste and adjust as needed)

> MineOps is a safety-critical operations app used by workers, supervisors, and safety officers at active mining sites in Ghana. Two alert types require guaranteed delivery regardless of the recipient's Do Not Disturb or silent settings, because a missed alert creates a direct physical safety risk:
>
> 1. **SOS alerts** — triggered by a field worker in a life-threatening emergency (injury, entrapment, immediate danger). These are sent to supervisors and safety officers responsible for that worker's site and require an immediate response.
> 2. **Danger Zone alerts** — sent when a supervisor or safety officer marks an active hazard zone (e.g. blasting area, unstable ground, gas risk) at a site. Workers and other staff at that site need to be alerted immediately so they can avoid the area, even if their device is silenced during a shift.
>
> Both alert types are sent only in genuine safety situations, are limited to users physically assigned to the affected site, and are never used for general engagement, marketing, or non-emergency purposes. We request the Critical Alerts entitlement so these two notification categories can sound and display even when a device is in silent mode or Do Not Disturb, consistent with Apple's guidance that this entitlement is reserved for health, safety, and emergency use cases.

## After approval

Once Apple grants the entitlement, it needs to be added to the app's entitlements file and the app needs a custom EAS development/production build (Expo Go can't carry custom entitlements). Send me the approval confirmation and I'll write that implementation brief — it'll involve `app.json`/EAS config changes, requesting `UNAuthorizationOptionCriticalAlert` at permission-request time, and updating the backend's Expo push payload for SOS/Danger Zone to include the critical-sound fields.
