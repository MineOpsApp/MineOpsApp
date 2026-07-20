import { type ComponentProps, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMySessions, revokeSession, parseApiError } from '../../services/api';
import type { ActiveSession } from '../../services/api';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

function platformIcon(platform: string | null): ComponentProps<typeof Ionicons>['name'] {
  if (platform === 'iOS') return 'phone-portrait-outline';
  if (platform === 'Android') return 'logo-android';
  return 'laptop-outline';
}

export function ActiveSessionsScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  async function load() {
    const data = await getMySessions().catch(() => []);
    setSessions(data);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmRevoke(session: ActiveSession) {
    Alert.alert(
      'Sign out this device?',
      `This will sign out "${session.deviceName}". You'll need to log in again on that device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => doRevoke(session.id) },
      ]
    );
  }

  async function doRevoke(id: number) {
    setRevokingId(id);
    try {
      await revokeSession(id);
      setSessions((c) => c.filter((s) => s.id !== id));
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    } finally {
      setRevokingId(null);
    }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
    >
      <Text style={styles.pageTitle}>Active Sessions</Text>
      <Text style={styles.pageSub}>Devices currently signed in to your account</Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active sessions found</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sessions.map((s, idx) => (
            <View key={s.id} style={[styles.row, idx < sessions.length - 1 && styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name={platformIcon(s.platform)} size={20} color={theme.textSub} /></View>
              <View style={styles.body}>
                <Text style={styles.deviceName}>{s.deviceName}</Text>
                <Text style={styles.lastUsed}>Last active {formatRelative(s.lastUsedAt)}</Text>
              </View>
              <Pressable
                onPress={() => confirmRevoke(s)}
                disabled={revokingId === s.id}
                style={styles.revokeBtn}
              >
                <Text style={styles.revokeBtnText}>{revokingId === s.id ? '...' : 'Sign Out'}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.disclaimer}>
        Signing out a device immediately ends that session. If it's the device you're using now, you'll be signed out too.
      </Text>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
    pageSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 20 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 24 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    list: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    row: { alignItems: 'center', flexDirection: 'row', padding: 14 },
    rowBorder: { borderBottomColor: theme.bgInput, borderBottomWidth: 1 },
    iconWrap: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 10, height: 40, justifyContent: 'center', marginRight: 12, width: 40 },
    icon: { fontSize: 18 },
    body: { flex: 1 },
    deviceName: { color: theme.text, fontSize: 14, fontWeight: '800' },
    lastUsed: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    revokeBtn: { backgroundColor: theme.dangerLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    revokeBtnText: { color: theme.danger, fontSize: 12, fontWeight: '800' },
    disclaimer: { color: theme.textMuted, fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 16, textAlign: 'center' },
  });
}
