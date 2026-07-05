import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import { useEffect, useState } from 'react';
import type { AuthSession } from '../types/auth';
import { getUnreadNotificationCount } from '../services/api';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { getQueue } from '../utils/offlineQueue';

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
  const [serverDown, setServerDown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifVisible, setNotifVisible] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

useEffect(() => {
  const check = async () => {
    try {
      setServerDown(false);
    } catch {
      setServerDown(true);
    }
  };
  check();
  const interval = setInterval(check, 30000);
  return () => clearInterval(interval);
}, []);

useEffect(() => {
  const fetchUnread = async () => {
    try {
      const res = await getUnreadNotificationCount();
      setUnreadCount(res.count);
    } catch { /* best-effort */ }
  };
  fetchUnread();
  const interval = setInterval(fetchUnread, 30000);
  return () => clearInterval(interval);
}, []);

useEffect(() => {
  const checkQueue = async () => {
    try {
      const q = await getQueue();
      setQueueLength(q.length);
    } catch { /* best-effort */ }
  };
  checkQueue();
  const interval = setInterval(checkQueue, 10000);
  return () => clearInterval(interval);
}, []);

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
      {queueLength > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            ⏳ {queueLength} action{queueLength !== 1 ? 's' : ''} waiting to sync
          </Text>
        </View>
      )}
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
          <Pressable onPress={() => setNotifVisible(true)} style={styles.actionBtn} hitSlop={10}>
            <View>
              <Text style={styles.actionIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionLabel}>Alerts</Text>
          </Pressable>
          <View style={styles.divider} />
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

      <Modal
        visible={notifVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotifVisible(false)}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: '#0d1117' }]}>
          <View style={[styles.modalHeader, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Pressable onPress={() => setNotifVisible(false)} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>
          <NotificationsScreen onUnreadChange={setUnreadCount} />
        </SafeAreaView>
      </Modal>
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
  badge: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -6,
    top: -4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  modalSafe: { flex: 1 },
  modalHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  closeBtn: { padding: 4 },
  closeIcon: { color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: '700' },
  syncBanner: {
    alignItems: 'center',
    backgroundColor: '#7c4f00',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  syncBannerText: { color: '#fde68a', fontSize: 12, fontWeight: '700' },
});