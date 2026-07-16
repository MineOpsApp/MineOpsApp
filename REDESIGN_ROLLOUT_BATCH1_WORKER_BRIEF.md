# Redesign Rollout — Batch 1: Worker Screens

## Context

`theme.ts` already has the new warm/earthy palette, `spacing`, and `typography` tokens (from the flagship preview, already shipped). `AuthScreen.tsx` and `WorkerHomeScreen.tsx` already show the target pattern in practice — **read both of those files first** before starting this batch; they are the reference for exactly how tokens and icons should be applied.

This batch covers: one shared-infrastructure fix (`MoreScreen.tsx`), `WorkerNavigator.tsx`'s icon set, and every remaining Worker-role screen.

---

## 1. `src/components/MoreScreen.tsx` — upgrade icon system

This component is shared by every role's "More" menu (Worker now, Supervisor and Safety Officer in later batches — don't touch those navigators' icon values yet, only `WorkerNavigator.tsx` in this batch, but the type change here needs to support all of them going forward).

Change `MoreItem.icon` from a raw emoji `string` to a typed icon spec, and update rendering to use `@expo/vector-icons`:

```tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconSpec =
  | { lib: 'ionicons'; name: ComponentProps<typeof Ionicons>['name'] }
  | { lib: 'material'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

type MoreItem = {
  icon: IconSpec;
  label: string;
  description: string;
  onPress: () => void;
};
```

Replace both places that currently render `<Text style={styles.icon}>{item.icon}</Text>` with:
```tsx
<View style={styles.iconWrap}>
  {item.icon.lib === 'ionicons'
    ? <Ionicons name={item.icon.name} size={20} color={theme.accent} />
    : <MaterialCommunityIcons name={item.icon.name} size={20} color={theme.accent} />}
</View>
```
(The `iconWrap` View already exists around the old `Text` — just swap what's inside it.) Remove the now-unused `icon: { fontSize: 20 }` style rule if nothing else references it.

This is a breaking type change — every place across the whole app that constructs a `MoreItem`/passes `sections`/`items` to `<MoreScreen>` needs its `icon: '✅'` strings updated to `icon: { lib: 'ionicons', name: '...' }`. **In this batch, only update `WorkerNavigator.tsx`'s usage** (section 2 below) — leave `SupervisorNavigator.tsx` and `SafetyOfficerNavigator.tsx` on the old string format for now; they'll be updated in their own batches. This means the app will not build cleanly until all three are updated — if that's a blocker for testing this batch in isolation, temporarily widen `MoreItem.icon` to accept `string | IconSpec` and handle both in the renderer (fall back to rendering the string as `<Text>` like before), then narrow it once all batches are done. Use your judgment on whichever keeps the app buildable throughout.

---

## 2. `src/navigation/WorkerNavigator.tsx`

### `TAB_ICONS` — currently emoji strings rendered directly as `<Text>{TAB_ICONS[route.name]}</Text>` in `tabBarIcon`. Change to the same icon-component pattern:

| Tab | Current | New |
|---|---|---|
| Home | ⌂ | `Ionicons` `home` |
| Hazards | ⚠ | `Ionicons` `warning` |
| Equipment | ⚙ | `Ionicons` `construct` |
| Notices | 📢 | `Ionicons` `megaphone` |
| More | ☰ | `Ionicons` `menu` |

Update the `tabBarIcon` render function accordingly (render the icon component directly instead of looking up a `Text` string).

### `WorkerMoreStack`'s `MoreScreen` `sections` — update each item's `icon` to the new `IconSpec` format:

| Label | Old emoji | New icon |
|---|---|---|
| Shift Production | 📋 | `{ lib: 'ionicons', name: 'clipboard' }` |
| Shift Handover | 🔄 | `{ lib: 'ionicons', name: 'sync' }` |
| Drill Operations | ⛏ | `{ lib: 'material', name: 'pickaxe' }` |
| Attendance | 🕐 | `{ lib: 'ionicons', name: 'time' }` |
| Report Incident | 🚨 | `{ lib: 'ionicons', name: 'alert-circle' }` |
| Safety Checklist | ✅ | `{ lib: 'ionicons', name: 'checkmark-circle' }` |
| Lone Worker | 🛡 | `{ lib: 'material', name: 'shield-account' }` |
| Report Illegal Mining | 🚨 | `{ lib: 'ionicons', name: 'alert-circle' }` |
| Message Supervisor | 💬 | `{ lib: 'ionicons', name: 'chatbubbles' }` |
| Community | 🌐 | `{ lib: 'ionicons', name: 'globe' }` |

---

## 3. Individual Worker screens — apply the established pattern

Apply exactly the same treatment already verified on `AuthScreen.tsx`/`WorkerHomeScreen.tsx`: replace emoji with `@expo/vector-icons` (`Ionicons`/`MaterialCommunityIcons`), replace ad hoc font sizes/weights with `typography` tokens where they match the scale (`display`/`h1`/`h2`/`h3`/`body`/`bodyBold`/`caption`/`label`), replace ad hoc spacing numbers with `spacing` tokens where they cleanly match (4/8/12/16/20/24/32). Do not change any data fetching, validation, or business logic — visual-only pass, same as the flagship screens.

Files in this batch:
- `src/screens/worker/WorkerHazardsScreen.tsx`
- `src/screens/worker/WorkerIncidentScreen.tsx`
- `src/screens/worker/WorkerSafetyChecklistScreen.tsx`
- `src/screens/worker/WorkerDrillScreen.tsx`
- `src/screens/worker/WorkerNoticesScreen.tsx`
- `src/screens/worker/WorkerEquipmentScreen.tsx`
- `src/screens/worker/WorkerShiftScreen.tsx`
- `src/screens/worker/WorkerHandoverScreen.tsx`
- `src/screens/worker/WorkerAttendanceScreen.tsx`
- `src/screens/worker/WorkerMessagesScreen.tsx`
- `src/screens/worker/WorkerLoneWorkerScreen.tsx`
- `src/screens/worker/WorkerEmergencyContactsScreen.tsx`
- `src/screens/worker/WorkerPayScreen.tsx`
- `src/screens/worker/WorkerCertificationsScreen.tsx`
- `src/screens/worker/WorkerProfileScreen.tsx`

### Icon selection guidelines

Reuse these exact mappings wherever the same emoji/concept appears in these files (for consistency with what's already shipped elsewhere in the app) — this list is a reference, not exhaustive; use judgment for anything not listed, picking the closest semantic match from `Ionicons` or `MaterialCommunityIcons`:

| Emoji | Icon |
|---|---|
| ⛏ | `MaterialCommunityIcons` `pickaxe` |
| 🎓 | `MaterialCommunityIcons` `certificate-outline` |
| 📢 | `Ionicons` `megaphone` |
| 💥 | `MaterialCommunityIcons` `bomb` |
| 🛡 | `MaterialCommunityIcons` `shield-account` |
| ⚠ | `Ionicons` `warning` |
| ✓ / ✅ | `Ionicons` `checkmark-circle` |
| 📞 | `Ionicons` `call` |
| 💬 | `Ionicons` `chatbubbles` |
| 🚨 | `Ionicons` `alert-circle` |
| 📷 | `Ionicons` `camera` |
| 📋 | `Ionicons` `clipboard` |
| 🕐 | `Ionicons` `time` |
| 👤 | `Ionicons` `person` |
| 🪪 | `Ionicons` `card` |
| 💰 | `Ionicons` `cash` |

Size icons to match the visual weight of the emoji they replace in context (typically 16-24px inline, larger for empty-state/hero icons). Use `theme.accent`, or the same contextual color the surrounding text/banner already uses (e.g. `theme.danger` for error states), for icon color — don't introduce new hardcoded colors.

---

## Files touched (17)

`MoreScreen.tsx`, `WorkerNavigator.tsx`, plus the 15 screen files listed in section 3.

## Verification checklist

- No emoji remain in any of the 17 files (check both inline UI text and `MoreScreen` item icons).
- App builds with no new TypeScript errors — if `MoreItem.icon`'s type change breaks `SupervisorNavigator.tsx`/`SafetyOfficerNavigator.tsx` (which still pass old-format strings), confirm you used the transitional `string | IconSpec` approach so the app still builds until those batches land.
- Tab bar icons render correctly for all 5 Worker tabs.
- Typography and spacing tokens applied consistently — spot check 3-4 of the 15 screens to confirm no leftover hardcoded font sizes/weights that clearly should have mapped to a `typography` token.
- No changes to any data fetching, form validation, offline queue logic, or business logic in any of these files.
- Dark mode still renders correctly on all touched screens.
