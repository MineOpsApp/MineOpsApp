import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { clockIn, clockOut, getMyAttendanceStatus, getMyAttendanceHistory } from '../../services/api';
import { enqueue } from '../../utils/offlineQueue';
import NetInfo from '@react-native-community/netinfo';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type AttendanceRecord = {
  id: number;
  zone: string;
  site: string;
  status: string;
  clockInAt: string;
  clockOutAt: string | null;
};

type Props = { session: AuthSession };

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Main Site', 'Processing Area'];

export function WorkerAttendanceScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [onSite, setOnSite] = useState(false);
  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [selectedZone, setSelectedZone] = useState('Main Site');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    setRefreshing(true);
    try {
      const [status, hist] = await Promise.all([
        getMyAttendanceStatus(),
        getMyAttendanceHistory(),
      ]);
      setOnSite(status.onSite);
      setActiveRecord(status.onSite ? status.record : null);
      setHistory(hist);
    } catch {} finally { setRefreshing(false); }
  }

  async function handleClockIn() {
    setLoading(true);
    try {
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) {
        await enqueue('clockIn', { zone: selectedZone });
        Alert.alert('Saved offline', `Clock-in for ${selectedZone} queued — will send when you reconnect.`);
        return;
      }
      const record = await clockIn(selectedZone);
      setOnSite(true);
      setActiveRecord(record);
      setHistory((c) => [record, ...c]);
      Alert.alert('Clocked in', `You are now on site in ${selectedZone}.`);
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('409')) {
        Alert.alert('Already clocked in', 'You are already on site. Clock out first.');
      } else {
        Alert.alert('Failed', 'Could not clock in.');
      }
    } finally { setLoading(false); }
  }

  async function handleClockOut() {
    Alert.alert('Clock out?', 'Confirm you are leaving the site.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clock Out', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            const netState = await NetInfo.fetch();
            const isOnline = netState.isConnected && netState.isInternetReachable !== false;
            if (!isOnline) {
              await enqueue('clockOut', {});
              setOnSite(false);
              setActiveRecord(null);
              Alert.alert('Saved offline', 'Clock-out queued — will send when you reconnect.');
              return;
            }
            const record = await clockOut();
            setOnSite(false);
            setActiveRecord(null);
            setHistory((c) => c.map((r) => r.id === record.id ? record : r));
            Alert.alert('Clocked out', 'You have left the site safely.');
          } catch {
            Alert.alert('Failed', 'Could not clock out.');
          } finally { setLoading(false); }
        }
      }
    ]);
  }

  function formatTime(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  function getDuration(clockInTime: string, clockOutTime: string | null) {
    const start = new Date(clockInTime).getTime();
    const end = clockOutTime ? new Date(clockOutTime).getTime() : Date.now();
    const hours = Math.floor((end - start) / 3600000);
    const mins = Math.floor(((end - start) % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadStatus} />}>
      <Text style={styles.pageTitle}>Attendance</Text>

      <View style={[styles.statusCard, onSite ? styles.statusCardGreen : styles.statusCardGrey]}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: onSite ? theme.success : theme.textMuted }]} />
          <View>
            <Text style={styles.statusTitle}>{onSite ? 'On Site' : 'Off Site'}</Text>
            {onSite && activeRecord ? (
              <>
                <Text style={styles.statusSub}>{activeRecord.zone} · {getDuration(activeRecord.clockInAt, null)}</Text>
                <Text style={styles.statusSub}>Since {formatTime(activeRecord.clockInAt)}</Text>
              </>
            ) : (
              <Text style={styles.statusSub}>Not currently on site</Text>
            )}
          </View>
        </View>
      </View>

      {!onSite ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clock In</Text>
          <Text style={styles.fieldLabel}>Select Zone</Text>
          <View style={styles.pillRow}>
            {ZONES.map((z) => (
              <Pressable key={z} onPress={() => setSelectedZone(z)} style={[styles.pill, selectedZone === z && styles.pillActive]}>
                <Text style={[styles.pillText, selectedZone === z && styles.pillActiveText]}>{z}</Text>
              </Pressable>
            ))}
          </View>
          <ActionButton label={loading ? 'Clocking in...' : 'Clock In'} onPress={handleClockIn} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Currently On Site</Text>
          <Text style={styles.onSiteInfo}>Zone: {activeRecord?.zone}</Text>
          <Text style={styles.onSiteInfo}>Time on site: {activeRecord ? getDuration(activeRecord.clockInAt, null) : '—'}</Text>
          <Pressable onPress={handleClockOut} style={styles.clockOutBtn}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
              {!loading && <Ionicons name="exit-outline" size={16} color="#ffffff" />}
              <Text style={styles.clockOutBtnText}>{loading ? 'Clocking out...' : 'Clock Out'}</Text>
            </View>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Attendance History</Text>
      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No attendance records yet</Text>
        </View>
      ) : null}
      {history.map((r) => (
        <View key={r.id} style={styles.historyCard}>
          <View style={styles.historyLeft}>
            <View style={[styles.historyDot, { backgroundColor: r.status === 'ON_SITE' ? theme.success : theme.textMuted }]} />
            <View>
              <Text style={styles.historyZone}>{r.zone}</Text>
              <Text style={styles.historyTime}>{formatTime(r.clockInAt)}</Text>
            </View>
          </View>
          <View style={styles.historyRight}>
            <Text style={styles.historyDuration}>{getDuration(r.clockInAt, r.clockOutAt)}</Text>
            <Text style={[styles.historyStatus, { color: r.status === 'ON_SITE' ? theme.success : theme.textMuted }]}>
              {r.status === 'ON_SITE' ? 'On Site' : 'Completed'}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageTitle: { ...typography.h1, color: theme.text, marginBottom: spacing.lg },
    statusCard: { borderRadius: 12, borderWidth: 2, marginBottom: spacing.lg, padding: spacing.lg },
    statusCardGreen: { backgroundColor: theme.successLight, borderColor: theme.success },
    statusCardGrey: { backgroundColor: theme.bgInput, borderColor: theme.border },
    statusLeft: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
    statusDot: { borderRadius: 8, height: 16, width: 16 },
    statusTitle: { ...typography.h3, color: theme.text, marginBottom: 2 },
    statusSub: { ...typography.caption, color: theme.textSub },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
    cardTitle: { ...typography.bodyBold, color: theme.text, marginBottom: spacing.md },
    fieldLabel: { ...typography.label, color: theme.textSub, marginBottom: spacing.sm },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.bgHero, borderColor: theme.bgHero },
    pillText: { ...typography.caption, color: theme.textMuted, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    onSiteInfo: { ...typography.bodyBold, color: theme.text, marginBottom: 6 },
    clockOutBtn: { alignItems: 'center', backgroundColor: theme.danger, borderRadius: 8, marginTop: spacing.sm, paddingVertical: spacing.md },
    clockOutBtnText: { ...typography.bodyBold, color: '#ffffff' },
    sectionTitle: { ...typography.h3, color: theme.text, marginBottom: spacing.md },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: spacing.lg },
    emptyText: { ...typography.caption, color: theme.textMuted, textAlign: 'center' },
    historyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, padding: spacing.md },
    historyLeft: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    historyDot: { borderRadius: 5, height: 10, width: 10 },
    historyZone: { ...typography.bodyBold, color: theme.text, fontSize: 13, marginBottom: 2 },
    historyTime: { ...typography.label, color: theme.textMuted, textTransform: 'none' as const },
    historyRight: { alignItems: 'flex-end' },
    historyDuration: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    historyStatus: { fontSize: 11, fontWeight: '700' },
  });
}
