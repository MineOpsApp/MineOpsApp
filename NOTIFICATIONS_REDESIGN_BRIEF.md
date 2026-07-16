# Notifications Redesign

## Context

`NotificationsScreen.tsx` (the "all notifications" list, opened as a modal from the bell icon in `AppHeader.tsx`) predates the warm/earthy redesign — still raw emoji icons, no `typography`/`spacing` tokens, flat uniform cards regardless of urgency. Bring it in line with the pattern already shipped on `AuthScreen.tsx`/`WorkerHomeScreen.tsx`, and add severity-based color coding so urgent alerts (SOS, incidents) visually stand out from routine ones (shift logs, messages).

`theme.ts` already has `danger`/`dangerLight`, `amber`/`amberLight`, `success`/`successLight`, `info`/`infoLight` — use these, don't introduce new colors.

---

## 1. `src/screens/NotificationsScreen.tsx`

### Severity/category mapping

Replace `TYPE_ICONS` with a lookup that maps each notification type to both an icon and a category color:

```ts
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconSpec =
  | { lib: 'ionicons'; name: ComponentProps<typeof Ionicons>['name'] }
  | { lib: 'material'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

const TYPE_META: Record<string, { icon: IconSpec; tone: 'danger' | 'amber' | 'success' | 'info' }> = {
  SOS: { icon: { lib: 'material', name: 'alert-octagon' }, tone: 'danger' },
  INCIDENT: { icon: { lib: 'ionicons', name: 'alert-circle' }, tone: 'danger' },
  HAZARD: { icon: { lib: 'ionicons', name: 'warning' }, tone: 'amber' },
  BLAST: { icon: { lib: 'material', name: 'bomb' }, tone: 'amber' },
  NOTICE: { icon: { lib: 'ionicons', name: 'megaphone' }, tone: 'info' },
  SHIFT_LOG: { icon: { lib: 'ionicons', name: 'clipboard' }, tone: 'info' },
  MESSAGE: { icon: { lib: 'ionicons', name: 'chatbubbles' }, tone: 'info' },
  OFFER: { icon: { lib: 'material', name: 'handshake' }, tone: 'success' },
  BUYER_VERIFICATION: { icon: { lib: 'ionicons', name: 'checkmark-circle' }, tone: 'success' },
};
const DEFAULT_META: { icon: IconSpec; tone: 'info' } = { icon: { lib: 'ionicons', name: 'notifications' }, tone: 'info' };
```

Add a small helper to resolve `tone` to actual theme colors:
```ts
function toneColors(theme: Theme, tone: 'danger' | 'amber' | 'success' | 'info') {
  const map = {
    danger: { fg: theme.danger, bg: theme.dangerLight },
    amber: { fg: theme.amber, bg: theme.amberLight },
    success: { fg: theme.success, bg: theme.successLight },
    info: { fg: theme.info, bg: theme.infoLight },
  };
  return map[tone];
}
```

### Card layout — make it read like a real OS notification

Right now the card is a generic list-item row. Restructure it to match the layout convention of iOS/Android notifications: icon, then a header line with a category label + relative timestamp, then a bold title, then a preview line — with real elevation instead of a flat bordered box.

For each item, look up `const meta = TYPE_META[item.type] ?? DEFAULT_META;` and `const { fg, bg } = toneColors(theme, meta.tone);`. Rebuild the card content as:

```
[icon badge]  NOTICE · 2m ago
              Shift Change Approved
              Your request to swap to the night shift on...
```

Specifics:
- **Timestamp**: replace the current `new Date(item.createdAt).toLocaleString()` with `formatAgo(item.createdAt)` from `src/utils/time.ts` (already exists, gives "Just now"/"5m ago"/"2h ago"/"3d ago"/short date after a week — this relative format is a big part of what makes it read as a real notification instead of a log entry).
- **Header row**: above the title, add a small row showing the category label (title-case the `item.type`, e.g. "Shift Log", or keep a short static label per type in `TYPE_META`) in `typography.label` colored `fg`, a middle dot separator, then the relative timestamp in `typography.caption`/`theme.textMuted`. This replaces the old bottom-of-card `cardTime` placement — real notifications put the time up near the top, not at the bottom.
- **Icon badge**: circular `View` (~36x36, `borderRadius: 18`, `backgroundColor: bg`) containing the `Ionicons`/`MaterialCommunityIcons` icon (size 18, `color: fg`), placed at top-left of the row, vertically aligned with the header line (not centered against the whole card).
- **Title**: `typography.bodyBold`, directly under the header row.
- **Preview text**: the existing `item.body`, `numberOfLines={2}`, `typography.body`, `theme.textSub` — directly under the title.
- **Card surface**: drop the flat `borderWidth: 1, borderColor: theme.border` look in favor of a subtle elevation so it reads as a floating card, not a bordered list row:
  ```ts
  card: {
    backgroundColor: isUnread ? theme.accentLight : theme.bgCard,
    borderRadius: 14,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  }
  ```
  (`isDark` from `mode === 'dark'`, same pattern as elsewhere in the app.)
- Keep a colored left accent for severity, but make it a slim inset bar rather than a full-height border — e.g. `borderLeftWidth: 3, borderLeftColor: fg` still works fine combined with the shadow above.
- Keep the existing unread accent dot next to the title — don't remove it, it's a separate signal from severity coloring.
- Apply `spacing` tokens to paddings/gaps/margins where they cleanly match (4/8/12/16/20/24/32).

### Mark-all-read bar

Keep the same structure but swap the plain text button for something with a bit more presence — e.g. add a small `Ionicons name="checkmark-done"` (size 14, white) before the "Mark all read" label inside `markAllBtn`. Apply `typography.label` to `unreadLabel` and `typography.bodyBold` (with white color, kept as-is) to `markAllText`.

### Empty state

Currently just plain gray text. Add a large muted icon above it (`Ionicons name="notifications-off-outline"`, size 40, `color: theme.textMuted`) with `spacing.md` gap, and apply `typography.body` to the "No notifications yet" text.

### Do not change

Data fetching (`getNotifications`, `markNotificationRead`, `markAllNotificationsRead`), the `onUnreadChange` callback logic, pagination/refresh logic, or the unread dot/background-tint logic — this is a visual-only pass.

---

## 2. `src/components/AppHeader.tsx` — notifications modal header

The modal wrapping `NotificationsScreen` (lines ~174-190) has its own header, styled the same as the other modals in this file (site picker, profile hub) — keep that overall dark-hero-bar pattern for consistency with those, just polish this specific instance:

- Replace the `✕` text close icon with `<Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />` in `closeBtn`.
- Apply `typography.h2` (with `color: '#ffffff'`, overriding just the color) to `modalTitle`.
- Optionally show unread count as a subtitle under "Notifications" (e.g. `{unreadCount > 0 ? \`${unreadCount} unread\` : 'All caught up'}` in a smaller muted white line) — nice-to-have, use judgment on whether it fits cleanly without restructuring the header layout.

Don't touch the site-picker modal or profile hub modal — this is scoped to the notifications modal header only.

---

## Files touched (2)

`src/screens/NotificationsScreen.tsx`, `src/components/AppHeader.tsx`.

## Verification checklist

- SOS and INCIDENT cards show a red left-edge and red-tinted icon badge; HAZARD/BLAST show amber; OFFER/BUYER_VERIFICATION show green; NOTICE/SHIFT_LOG/MESSAGE show the info/blue tone.
- Timestamps show relative format ("5m ago", "2h ago") via `formatAgo`, not the raw `toLocaleString()` output, and sit in the header row near the top of the card, not the bottom.
- Cards have visible elevation (shadow) rather than a flat bordered-box look, so the list reads like stacked notification cards.
- Unread cards still show the accent-tinted background + small accent dot, independent of severity color.
- No raw emoji remain in `NotificationsScreen.tsx`.
- Typography/spacing tokens applied, no leftover hardcoded font sizes that clearly should map to a token.
- Empty state and mark-all-read bar both updated.
- Notification modal header in `AppHeader.tsx` uses an icon-based close button and `typography.h2` title.
- Dark mode renders correctly — check that `dangerLight`/`amberLight`/`successLight`/`infoLight` (the dark-mode variants) still give enough contrast against `fg` icon color and card `borderLeftColor`.
- No changes to data fetching, mark-read logic, or pagination.
