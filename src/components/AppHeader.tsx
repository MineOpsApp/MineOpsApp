import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { AuthSession } from '../types/auth';

type AppHeaderProps = {
  session: AuthSession;
  onLogout: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  worker: 'Field Worker',
  supervisor: 'Supervisor',
  safetyOfficer: 'Safety Officer',
  guest: 'Guest',
};

export function AppHeader({ session, onLogout }: AppHeaderProps) {
  const { mode, setMode } = useThemeMode();
  const theme = useTheme(mode);

  function cycleTheme() {
    if (mode === 'system') setMode('light');
    else if (mode === 'light') setMode('dark');
    else setMode('system');
  }

  const themeLabel = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'Auto';
  const themeIcon = mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : '⚙️';
  const isDark = mode === 'dark' || (mode === 'system');

  const headerBg = isDark ? '#0d1117' : '#17212b';
  const accentLine = isDark ? '#3fb950' : '#4ade80';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: headerBg }]}>
      {/* Green accent line at very top */}
      <View style={[styles.accentLine, { backgroundColor: accentLine }]} />
      <View style={styles.header}>
        {/* Left: brand + user info */}
        <View style={styles.left}>
          <Text style={styles.brand}>MineOps</Text>
          <View style={styles.userRow}>
            <View style={[styles.statusDot, { backgroundColor: accentLine }]} />
            <Text style={styles.userName}>{session.user.fullName}</Text>
          </View>
          <Text style={styles.userRole}>
            {ROLE_LABELS[session.user.role] ?? session.user.role} · {session.user.assignedSite ?? 'Obuasi Mine'}
          </Text>
        </View>

        {/* Right: actions */}
        <View style={styles.actions}>
          <Pressable onPress={cycleTheme} style={styles.actionBtn} hitSlop={10}>
            <Text style={styles.actionIcon}>{themeIcon}</Text>
            <Text style={styles.actionLabel}>{themeLabel}</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={onLogout} style={styles.actionBtn} hitSlop={10}>
            <Text style={styles.actionIcon}>↩</Text>
            <Text style={styles.actionLabel}>Out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { },
  accentLine: { height: 3, width: '100%' },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  left: { flex: 1 },
  brand: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  userRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 2 },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  userName: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  userRole: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginLeft: 14 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  actionBtn: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  actionIcon: { color: '#ffffff', fontSize: 16, textAlign: 'center' },
  actionLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  divider: { backgroundColor: 'rgba(255,255,255,0.12)', height: 36, marginHorizontal: 4, width: 1 },
});