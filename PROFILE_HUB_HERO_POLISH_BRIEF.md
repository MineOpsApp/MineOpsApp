# My Account — Hero Polish Pass

## Context

`ProfileHubModal.tsx` already has icons, typography tokens, and card elevation from an earlier pass, but the top of the screen is still a plain flat dark bar ("My Account" + close button) sitting above a separate plain white avatar card — two flat rectangles stacked on top of each other, which is why it reads as boring. Merge them into one cohesive hero banner, the same pattern already used on the Worker Home screen (rounded bottom corners, shadow, everything feels like one elevated unit instead of stacked boxes).

**Visual-only pass — don't change any navigation, data fetching, or menu item logic.**

---

## 1. Merge the header bar and avatar card into one hero

Replace the current separate `header` View + `avatarCard` View with a single taller hero section:

```tsx
<View style={styles.hero}>
  <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
    <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
  </Pressable>
  <View style={styles.heroAvatar}>
    {profile?.profilePhoto
      ? <Image source={{ uri: profile.profilePhoto }} style={styles.heroAvatarImage} />
      : <Text style={styles.heroAvatarInitials}>{initials}</Text>}
  </View>
  <Text style={styles.heroName}>{session.user.fullName}</Text>
  <Text style={styles.heroRole}>
    {ROLE_LABELS[role] ?? role}
    {session.user.assignedSite ? ` · ${session.user.assignedSite}` : ''}
  </Text>
  {profile?.createdAt ? (
    <Text style={styles.heroSince}>Member since {new Date(profile.createdAt).getFullYear()}</Text>
  ) : null}
</View>
```

Add the same `ROLE_LABELS` map already used in `AppHeader.tsx` (copy it in, or import/share it if that's cleaner — worker/supervisor/safetyOfficer/guest/buyer/government → display labels).

Styles:
```ts
hero: {
  alignItems: 'center',
  backgroundColor: theme.bgHero,
  borderBottomLeftRadius: 24,
  borderBottomRightRadius: 24,
  paddingTop: spacing.xl,
  paddingBottom: spacing.xxl,
  paddingHorizontal: spacing.xl,
  ...cardShadow,
  shadowOpacity: isDark ? 0.4 : 0.12,
},
closeBtn: { position: 'absolute', top: spacing.xl, right: spacing.xl, padding: spacing.xs, zIndex: 1 },
heroAvatar: {
  alignItems: 'center',
  backgroundColor: theme.bgCard,
  borderColor: theme.accent,
  borderRadius: 40,
  borderWidth: 2.5,
  height: 80,
  justifyContent: 'center',
  marginBottom: spacing.md,
  overflow: 'hidden',
  width: 80,
},
heroAvatarImage: { borderRadius: 40, height: 80, width: 80 },
heroAvatarInitials: { color: '#ffffff', fontSize: 28, fontWeight: '900' },
heroName: { ...typography.h1, color: '#ffffff', marginBottom: 4, textAlign: 'center' },
heroRole: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', textAlign: 'center' },
heroSince: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginTop: 6, textAlign: 'center' },
```

Remove the old `header`, `headerTitle`, `avatarCard`, `avatar`, `avatarImage`, `avatarInitials`, `avatarInfo`, `avatarName`, `avatarSite` styles — fully replaced by the above. Adjust `content`'s top padding since the hero now has its own bottom padding built in (avoid doubling up the gap before the first section).

## 2. Sign Out gets a tinted icon background

Small extra bit of visual variety and correctly signals "this one's different": give the Sign Out row's `iconWrap` a danger tint instead of the default neutral one:
```tsx
<Pressable onPress={() => { handleClose(); onLogout(); }} style={styles.row}>
  <View style={[styles.iconWrap, { backgroundColor: theme.dangerLight }]}>
    <Ionicons name="log-out-outline" size={20} color={theme.danger} />
  </View>
  ...
```
Leave every other row's `iconWrap` as the existing neutral `theme.bgInput` background — this one exception is enough to add variety without making the whole list feel busy.

## 3. Section spacing

Add a touch more breathing room between the hero and the first card (`profileItems`/`list`) — e.g. `marginTop: -spacing.lg` on the first list container so it slightly tucks under the hero's rounded bottom edge, similar to the floating-strip technique already used on Worker Home, rather than just sitting flush below it.

---

## Files touched (1)

`src/components/ProfileHubModal.tsx`.

## Verification checklist

- Hero reads as one cohesive rounded banner (avatar, name, role/site, member-since) instead of a flat title bar plus a separate card.
- Close button still works and sits cleanly in the top-right corner of the new hero.
- Role label displays correctly for every role (worker, supervisor, safety officer, buyer, guest, government if applicable).
- "Member since" only shows when `profile.createdAt` is available; doesn't break if it's missing.
- Sign Out row's icon has a red-tinted background; every other row unchanged.
- Dark mode hero shadow/contrast look correct.
- No changes to any navigation between sub-screens, theme cycling, or sign-out logic.
