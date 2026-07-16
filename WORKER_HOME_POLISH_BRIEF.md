# Worker Home Screen — Elevation & Polish Pass

## Context

`WorkerHomeScreen.tsx` already has typography/spacing tokens and vector icons from the flagship redesign, but everything is still flat: bordered cards with no depth, a plain solid-color hero bar, and a status strip that's just a bar with dividers glued to the bottom of the hero. Give it the same elevation treatment already shipped on `NotificationsScreen.tsx` and `ProfileHubModal.tsx`, plus two small hero upgrades. **Same content, same section order, same data — visual polish only.**

---

## 1. Shared elevation style

Add the same `cardShadow` pattern used in `ProfileHubModal.tsx` at the top of `makeStyles`, and pass `isDark` into it (same pattern as that file — `makeStyles(theme, isDark)`, called with `mode === 'dark'`):

```ts
const cardShadow = {
  shadowColor: '#000' as const,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: isDark ? 0.3 : 0.08,
  shadowRadius: 4,
  elevation: 2,
};
```

Apply it to every plain card style: `alertCard`, `noticeCard`, `blastCard`, `emptyCard`, `searchPill`, `contribCard`. For these, drop the flat `borderWidth: 1, borderColor: theme.border` in favor of the shadow (same trade the notifications cards made) — background color, radius, and internal layout stay exactly as-is.

For the semantically-colored banners — `clearCard`, `loneWorkerBannerGreen`/`loneWorkerBannerRed`, `contactsWarning`, `certExpiredBanner`, `certExpiringBanner`, `announcementCard`, `errorBanner` — **keep their colored border** (it's carrying meaning, not just decoration) but add `...cardShadow` alongside it for a bit of lift. Don't remove those borders.

---

## 2. Hero — soften the bottom edge + add the profile photo

- Add `borderBottomLeftRadius: 20, borderBottomRightRadius: 20` to the `hero` style so it doesn't end in a hard rectangular edge, plus `...cardShadow` (with `shadowOpacity` bumped slightly, e.g. `isDark ? 0.4 : 0.12`, since it needs to read against the background below it, not just against a card surface).
- Add the user's profile photo to the hero, left of the greeting text (same fetch pattern already shipped in `AppHeader.tsx` and `ProfileHubModal.tsx`):
  ```ts
  import { getMyProfile, type UserProfile } from '../../services/api';
  // ...
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => {});
  }, []);
  ```
  Restructure `heroLeft` to a row: a 40×40 circle (accent border ring, `overflow: 'hidden'`) showing `profile.profilePhoto` via `<Image>` if present, else initials (derive the same way `AppHeader.tsx` does: `session.user.fullName.split(' ').filter(Boolean).map(n => n[0]).slice(0,2).join('').toUpperCase()`), then the existing greeting/site text stacked next to it. Keep `shiftBadge` on the right exactly as-is.

---

## 3. Status strip — make it a floating card

Currently `strip` is a full-width bar directly beneath the hero, flush with the screen edges. Turn it into a rounded card that overlaps the hero's bottom edge slightly, same floating-stats-card treatment common in polished dashboards:

```ts
strip: {
  backgroundColor: theme.bgCard,
  borderRadius: 14,
  flexDirection: 'row',
  marginHorizontal: spacing.lg,
  marginTop: -16,
  paddingVertical: spacing.md,
  ...cardShadow,
},
```
Remove the old `borderBottomColor`/`borderBottomWidth`. Keep `stripItem`/`stripValue`/`stripLabel`/`stripDivider` exactly as they are — only the outer `strip` container style changes. Since `strip` now has `marginTop: -16` to overlap the hero, make sure nothing between the hero and the strip in the JSX (the search pill / lone worker banner / error banners, which currently render between them conditionally) ends up looking wrong when the strip overlaps — check the render order and, if any of those conditional banners can render immediately above the strip, add enough top margin to the strip's container context that the overlap only happens against the hero itself, not against a banner. Use your judgment on the cleanest way to guarantee the overlap always lands on the hero.

---

## Do not change

Data fetching, section order and content, the `SosButton`, `SiteMapView`, `BlastAlert` components, or any business logic. This is a visual-only pass on top of what's already there.

---

## Files touched (1)

`src/screens/worker/WorkerHomeScreen.tsx`.

## Verification checklist

- All plain cards (alerts, notices, blasts, contributions, empty states, search pill) show a subtle shadow instead of a flat gray border.
- Colored banners (lone worker, contacts warning, cert warnings, announcements, clear/all-good state, error) keep their colored border AND now have a subtle shadow too.
- Hero has rounded bottom corners and a shadow that separates it from the content below.
- Hero shows the user's profile photo (or initials fallback) in a small circle next to the greeting — same source/pattern as `AppHeader.tsx`.
- Status strip is now a floating rounded card that slightly overlaps the hero's bottom edge, not a flush full-width bar.
- No layout looks broken when conditional banners (lone worker, hazard error, cert warnings, contacts warning) render between the hero and the strip.
- Dark mode shadow opacity looks correct (heavier than light mode, not invisible).
- No changes to data fetching, section content/order, or any of the embedded components.
