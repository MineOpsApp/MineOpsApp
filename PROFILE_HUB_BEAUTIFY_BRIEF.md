# My Account (ProfileHubModal) — Fix Photo + Beautify

## Context

`ProfileHubModal.tsx` is the "My Account" screen (opened by tapping the avatar in `AppHeader.tsx`). Two things to fix:

1. **Bug**: the avatar circle at the top always shows initials, even when the user has uploaded a profile photo (via "My Profile & ID" → `WorkerProfileScreen.tsx`, which already stores it as `profilePhoto` on the `UserProfile` returned by `getMyProfile()`). The modal never fetches that data, so the photo never appears here even though it exists.
2. **Beautify**: this screen predates the warm/earthy redesign — still raw emoji icons, no `typography`/`spacing` tokens, flat bordered cards. Bring it in line with the pattern already shipped on `AuthScreen.tsx`/`WorkerHomeScreen.tsx`/`NotificationsScreen.tsx` (including the card elevation treatment from the notifications redesign).

---

## 1. Show the uploaded photo in the avatar circle

- Import `getMyProfile` and `type UserProfile` from `../services/api`.
- Add `const [profile, setProfile] = useState<UserProfile | null>(null);` and fetch it once when the modal becomes visible:
  ```ts
  useEffect(() => {
    if (visible) {
      getMyProfile().then(setProfile).catch(() => {});
    }
  }, [visible]);
  ```
- In the avatar render (currently always `<Text style={styles.avatarInitials}>{initials}</Text>` inside the `avatar` View), branch on `profile?.profilePhoto`:
  ```tsx
  <View style={styles.avatar}>
    {profile?.profilePhoto
      ? <Image source={{ uri: profile.profilePhoto }} style={styles.avatarImage} />
      : <Text style={styles.avatarInitials}>{initials}</Text>}
  </View>
  ```
  Import `Image` from `react-native`. Add `avatarImage: { borderRadius: 28, height: 56, width: 56 }` (matches the enlarged avatar size below) to `makeStyles`.
- This same `profile` state can be reused for nothing else in this pass — don't fetch anything beyond what's needed for the photo. If `getMyProfile()` fails (offline, etc.), silently fall back to initials — don't show an error state on this screen.

---

## 2. Beautify — icons

Replace every emoji icon in this file with `@expo/vector-icons` (`Ionicons`/`MaterialCommunityIcons`), matching the established mapping style used elsewhere in the app:

| Row | Old emoji | New icon |
|---|---|---|
| My Profile & ID | 🪪 | `Ionicons` `card-outline` |
| Emergency Contacts | 📞 | `Ionicons` `call-outline` |
| My Pay | 💰 | `Ionicons` `cash-outline` |
| My Certifications | 🎓 | `MaterialCommunityIcons` `certificate-outline` |
| My Profile (buyer) | 🪪 | `Ionicons` `card-outline` |
| Help & Support | ❓ | `Ionicons` `help-circle-outline` |
| Active Sessions | 🔐 | `Ionicons` `phone-portrait-outline` |
| Notifications | 🔔 | `Ionicons` `notifications-outline` |
| Display Mode | 🌙 / ☀️ / ⚙️ | `Ionicons` `moon` / `sunny` / `settings-outline` (keep the existing per-mode logic, just swap the emoji lookup for an icon lookup) |
| Terms of Service | 📜 | `Ionicons` `document-text-outline` |
| Privacy Policy | 🔏 | `Ionicons` `lock-closed-outline` |
| Data & Privacy | 🗑️ | `Ionicons` `trash-outline` |
| Sign Out | ↩ | `Ionicons` `log-out-outline` |
| Header close button | ✕ | `Ionicons` `close` (same pattern as the notifications modal header fix) |

Render icons at size 20 inside the existing `iconWrap` circles (same as `MoreScreen.tsx`'s icon pattern, if that's landed — otherwise just place the icon component where the emoji `<Text>` was, colored `theme.accent`). Header close icon: size 20, `rgba(255,255,255,0.6)`, same as the notifications modal.

---

## 3. Beautify — typography, spacing, elevation

- Apply `typography`/`spacing` tokens throughout `makeStyles` where they cleanly match: `headerTitle` → `typography.h2` (keep `color: '#ffffff'`), `avatarName` → `typography.h3`, `avatarSite` → `typography.caption`, `sectionLabel` → `typography.label`, `label` → `typography.bodyBold`, `desc` → `typography.caption`, `chipText` → `typography.label`, `backBtnText` → `typography.bodyBold`.
- Give `avatarCard` and both `list` containers the same elevation treatment shipped on the notification cards (subtle shadow instead of/alongside the flat border), so the screen doesn't feel flat:
  ```ts
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: isDark ? 0.3 : 0.08,
  shadowRadius: 4,
  elevation: 2,
  ```
  (`isDark` from `mode === 'dark'` — pass it into `makeStyles(theme, isDark)`, same pattern as `NotificationsScreen.tsx`.)
- Enlarge the avatar circle from 48×48 to 56×56 (`borderRadius: 28`) for a bit more presence, and give it a thin `theme.accent` border ring (`borderWidth: 2, borderColor: theme.accent`) — works for both the photo and the initials-fallback state.
- Apply `spacing` tokens to paddings/gaps/margins where they cleanly match (4/8/12/16/20/24/32).

## Do not change

Navigation logic between sub-screens, the theme-cycling behavior, sign-out behavior, or which items appear per role. Visual-only pass plus the one real bug fix (photo fetch/display).

---

## Files touched (1)

`src/components/ProfileHubModal.tsx`.

## Verification checklist

- If the signed-in user has an uploaded profile photo, it renders inside the avatar circle on "My Account"; if not, initials still show as before.
- No raw emoji remain anywhere in this file.
- Typography/spacing tokens applied; avatar card and both list sections have visible elevation.
- Avatar circle is 56×56 with an accent border ring.
- Header close button and all row icons use vector icons at consistent sizing/coloring.
- Dark mode renders correctly, including shadow opacity.
- No changes to navigation, sign-out, or theme-cycling logic.
