import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import { useEffect, useState } from 'react';
import type { AuthSession } from '../types/auth';
import { getUnreadNotificationCount, getMySites, switchSite, type SiteAccess } from '../services/api';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { getQueue } from '../utils/offlineQueue';
import { ProfileHubModal } from './ProfileHubModal';

type AppHeaderProps = {
  session: AuthSession;
  onLogout: () => void;
};

const ROLE_LABELS: Record<string, string> = {
  worker: 'Field Worker',
  supervisor: 'Supervisor',
  safetyOfficer: 'Safety Officer',
  guest: 'Guest',
  buyer: 'Mineral Buyer',
  government: 'Government',
};

export function AppHeader({ session, onLogout }: AppHeaderProps) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifVisible, setNotifVisible] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [sitePickerVisible, setSitePickerVisible] = useState(false);
  const [accessibleSites, setAccessibleSites] = useState<SiteAccess[]>([]);
  const [switching, setSwitching] = useState(false);
  const [profileHubVisible, setProfileHubVisible] = useState(false);

  const isSupervisor = session.user.role === 'supervisor';

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

  useEffect(() => {
    if (!isSupervisor) return;
    getMySites().then(setAccessibleSites).catch(() => {});
  }, [isSupervisor]);

  const initials = session.user.fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.bgHero }]}>
      <View style={[styles.accentLine, { backgroundColor: theme.accent }]} />
      {queueLength > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>
            ⏳ {queueLength} action{queueLength !== 1 ? 's' : ''} waiting to sync
          </Text>
        </View>
      )}
      <View style={styles.header}>
        {/* Left: avatar + name — taps open Profile Hub */}
        <Pressable style={styles.left} onPress={() => setProfileHubVisible(true)} hitSlop={8}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{session.user.fullName}</Text>
              <Text style={styles.userRole}>
                {ROLE_LABELS[session.user.role] ?? session.user.role}
                {session.user.assignedSite ? ` · ${session.user.assignedSite}` : ''}
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Right: sites (supervisor only) + alerts */}
        <View style={styles.actions}>
          {isSupervisor && accessibleSites.length > 1 && (
            <>
              <Pressable onPress={() => setSitePickerVisible(true)} style={styles.actionBtn} hitSlop={10}>
                <Text style={styles.actionIcon}>🏭</Text>
                <Text style={styles.actionLabel}>Sites</Text>
              </Pressable>
              <View style={styles.divider} />
            </>
          )}
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
        </View>
      </View>

      {/* Site picker */}
      <Modal
        visible={sitePickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSitePickerVisible(false)}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.bgHero }]}>
          <View style={[styles.modalHeader, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={styles.modalTitle}>Switch Site</Text>
            <Pressable onPress={() => setSitePickerVisible(false)} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
            {accessibleSites.map((s, i) => (
              <Pressable
                key={i}
                disabled={s.isCurrent || switching}
                onPress={async () => {
                  setSwitching(true);
                  try {
                    await switchSite(s.site);
                    const updated = await getMySites();
                    setAccessibleSites(updated);
                    setSitePickerVisible(false);
                  } catch { /* ignore */ }
                  setSwitching(false);
                }}
                style={[styles.siteRow, s.isCurrent && styles.siteRowActive]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.siteName}>{s.site}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                    {s.isHome && <Text style={styles.siteTag}>HOME</Text>}
                    {s.isCurrent && <Text style={[styles.siteTag, { color: '#4ade80' }]}>ACTIVE</Text>}
                  </View>
                </View>
                {!s.isCurrent && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>→</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Notifications */}
      <Modal
        visible={notifVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotifVisible(false)}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.bgHero }]}>
          <View style={[styles.modalHeader, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Pressable onPress={() => setNotifVisible(false)} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>
          <NotificationsScreen onUnreadChange={setUnreadCount} />
        </SafeAreaView>
      </Modal>

      {/* Profile Hub */}
      <ProfileHubModal
        visible={profileHubVisible}
        session={session}
        onClose={() => setProfileHubVisible(false)}
        onLogout={onLogout}
      />
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {},
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
    avatarRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    avatarCircle: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 20, height: 38, justifyContent: 'center', width: 38 },
    avatarInitials: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
    userName: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
    userRole: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', marginTop: 1 },
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
    syncBanner: { alignItems: 'center', backgroundColor: '#7c4f00', paddingHorizontal: 16, paddingVertical: 5 },
    syncBannerText: { color: '#fde68a', fontSize: 12, fontWeight: '700' },
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
    siteRow: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, flexDirection: 'row', padding: 14 },
    siteRowActive: { backgroundColor: `${theme.accent}26`, borderColor: theme.accent, borderWidth: 1 },
    siteName: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
    siteTag: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  });
}
