# SOS & Danger Zone Alerts Bypass Do Not Disturb (Android)

## Context

Goal: SOS and Danger Zone push notifications should cut through the device's Do Not Disturb / silent mode on Android. This is achievable today via Android's notification-channel `bypassDnd` flag — but it only takes effect once the *user* manually grants the app "Do Not Disturb access" in Android system settings (no app can silently grant itself this). So this needs three pieces: (1) the channel flag, (2) a UI path for the user to grant that OS permission, (3) — since Danger Zone currently sends no push notification at all — adding that push in the first place.

**iOS is explicitly out of scope for this brief.** True DND-bypass on iOS ("Critical Alerts") requires a special entitlement Apple grants per-app after a manual review, plus moving off Expo Go to a custom EAS build. That's a separate, non-code process — see `APPLE_CRITICAL_ALERTS_REQUEST.md` in this repo, which Kumi will submit directly to Apple. Don't add any iOS-specific critical-alert code in this brief; just make sure nothing here breaks iOS (Android-only branches should no-op cleanly on iOS).

---

## 1. `src/utils/notifications.ts` — channel changes

In the `Platform.OS === 'android'` block inside `registerForPushNotifications`:

- Add `bypassDnd: true` to the existing `'sos'` channel.
- Add a new `'danger-zone'` channel, same shape as `'sos'` but its own identity:
  ```ts
  await Notifications.setNotificationChannelAsync('danger-zone', {
    name: 'Danger Zone Alerts',
    importance: Notifications.AndroidImportance.MAX,
    bypassDnd: true,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#e0a83a',
    sound: 'default',
  });
  ```

Add a new exported helper at the bottom of the file to deep-link the user to Android's DND access settings screen (no-ops on iOS):

```ts
import * as IntentLauncher from 'expo-intent-launcher';

export async function openDndAccessSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
  } catch (error) {
    console.log('Could not open DND access settings:', error);
  }
}
```

Run `npx expo install expo-intent-launcher` to add the dependency (config-plugin-free, no native rebuild needed beyond the usual Expo install).

---

## 2. `src/screens/shared/NotificationPreferencesScreen.tsx` — explain + let the user grant access

- Add a fourth entry to the `ALWAYS_ON` array: `{ icon: '🚧', label: 'Danger Zone Alerts', desc: 'Active danger zones at your site. Cannot be muted.' }`. (This screen still uses raw emoji/hardcoded styles — leave it as-is for this brief, don't scope-creep into a redesign pass here.)

- Below the existing `ALWAYS_ON` list and above the `disclaimer` text, add a new Android-only section:
  ```tsx
  {Platform.OS === 'android' && (
    <>
      <Text style={styles.sectionLabel}>DO NOT DISTURB</Text>
      <View style={styles.list}>
        <View style={styles.row}>
          <View style={styles.body}>
            <Text style={styles.label}>Bypass Do Not Disturb</Text>
            <Text style={styles.desc}>
              Let SOS and Danger Zone alerts sound even when your phone is on silent or Do Not Disturb. Requires a one-time permission from Android.
            </Text>
          </View>
        </View>
        <Pressable onPress={openDndAccessSettings} style={styles.dndBtn}>
          <Text style={styles.dndBtnText}>Open Do Not Disturb Settings</Text>
        </Pressable>
      </View>
    </>
  )}
  ```
  Import `Platform`, `Pressable`, and `openDndAccessSettings` from `../../utils/notifications`. Add matching styles (`dndBtn`/`dndBtnText`) consistent with the existing `list`/`row` visual language in this file — solid `theme.accent` background button, white bold text, e.g.:
  ```ts
  dndBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, margin: 14, marginTop: 0, paddingVertical: 12 },
  dndBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  ```

This screen can't check whether the permission is actually granted (that requires a native module Expo doesn't expose) — don't try to fake a status indicator. The button always just opens the settings screen; the OS itself shows the current grant state there.

---

## 3. Backend — give Danger Zone a push notification

`DangerZoneController.java` currently saves the zone and writes an audit log, but sends nothing to devices. Fix that, following the same pattern as `BlastController.scheduleBlast` (constructor-inject `AppUserRepository`, `PushNotificationService`, `NotificationService`; already available as beans, see `BlastController` for the exact import/constructor shape).

In `createDangerZone`, after `DangerZone saved = dangerZoneRepository.save(zone);` and the existing audit log call, add:

```java
try {
    String notifTitle = "🚧 Danger Zone — " + saved.getZoneName();
    String notifBody = saved.getRiskLevel() + " risk zone active at " + saved.getSite() + ". Avoid this area.";

    List<AppUser> recipients = appUserRepository.findByAssignedSiteIgnoreCase(user.assignedSite())
        .stream()
        .filter(u -> !u.getEmail().equalsIgnoreCase(user.email()))
        .collect(Collectors.toList());

    List<String> tokens = recipients.stream()
        .map(AppUser::getPushToken)
        .filter(t -> t != null && !t.isBlank())
        .collect(Collectors.toList());
    pushNotificationService.sendToTokens(tokens, notifTitle, notifBody, "danger-zone");

    for (AppUser recipient : recipients) {
        notificationService.notify(recipient.getEmail(), "DANGER_ZONE", notifTitle, notifBody, "DangerZone", saved.getId());
    }
} catch (Exception e) {
    System.err.println("Push notification failed for danger zone: " + e.getMessage());
}
```

Add the necessary imports (`AppUser`, `AppUserRepository`, `PushNotificationService`, `NotificationService`, `Collectors` — `Collectors` is likely already imported in this file, check before duplicating). This fires on every `createDangerZone` call (zone creation = zone activation in this app's model — there's no separate "activate" step), to every worker/supervisor/safety officer on that site except the creator, same recipient logic as blasts.

Don't add a push notification to `updateZonePosition` — that's just repositioning an existing zone's boundary, not a new hazard; the initial creation push is the one that matters here.

---

## 4. Frontend — recognize the new notification type

In `src/screens/NotificationsScreen.tsx`, add to `TYPE_META` (this file already has the icon/tone/label system from the notifications redesign — just add one more entry):

```ts
DANGER_ZONE: { icon: { lib: 'material', name: 'alert-decagram' }, tone: 'danger', label: 'Danger Zone' },
```

---

## Files touched (4)

`src/utils/notifications.ts`, `src/screens/shared/NotificationPreferencesScreen.tsx`, `DangerZoneController.java`, `src/screens/NotificationsScreen.tsx`.

## Verification checklist

- `'sos'` and new `'danger-zone'` Android channels both have `bypassDnd: true`.
- `openDndAccessSettings()` opens Android's DND access screen on a physical Android device; no-ops (doesn't crash) on iOS.
- Notification Preferences screen shows "Danger Zone Alerts" under Always On, and the new Do Not Disturb section only renders on Android.
- Creating a danger zone (`POST /api/danger-zones`) now sends a push to every other user on that site via the `danger-zone` channel, and creates an in-app `DANGER_ZONE`-typed notification record.
- Danger Zone cards in the in-app notifications list show the red/danger icon badge (via the new `TYPE_META` entry), consistent with SOS/Incident.
- No iOS-specific critical-alert code was added anywhere in this pass.
- Backend compiles with no new errors; existing Blast/SOS/Hazard notification behavior unchanged.
