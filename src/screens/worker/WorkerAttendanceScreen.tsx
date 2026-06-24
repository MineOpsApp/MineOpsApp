import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { clockIn, clockOut, getMyAttendanceStatus, getMyAttendanceHistory } from '../../services/api';
import type { AuthSession } from '../../types/auth';

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

  function getDuration(clockIn: string, clockOut: string | null) {
    const start = new Date(clockIn).getTime();
    const end = clockOut ? new Date(clockOut).getTime() : Date.now();
    const hours = Math.floor((end - start) / 3600000);
    const mins = Math.floor(((end - start) % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Attendance</Text>

      {/* Status card */}
      <View style={[styles.statusCard, onSite ? styles.statusCardGreen : styles.statusCardGrey]}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: onSite ? '#4ade80' : '#8fa3b8' }]} />
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

      {/* Clock in/out */}
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
          <ActionButton label={loading ? 'Clocking in...' : '✓ Clock In'} onPress={handleClockIn} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Currently On Site</Text>
          <Text style={styles.onSiteInfo}>Zone: {activeRecord?.zone}</Text>
          <Text style={styles.onSiteInfo}>Time on site: {activeRecord ? getDuration(activeRecord.clockInAt, null) : '—'}</Text>
          <Pressable onPress={handleClockOut} style={styles.clockOutBtn}>
            <Text style={styles.clockOutBtnText}>{loading ? 'Clocking out...' : '↩ Clock Out'}</Text>
          </Pressable>
        </View>
      )}

      {/* History */}
      <Text style={styles.sectionTitle}>Attendance History</Text>
      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No attendance records yet</Text>
        </View>
      ) : null}
      {history.map((r) => (
        <View key={r.id} style={styles.historyCard}>
          <View style={styles.historyLeft}>
            <View style={[styles.historyDot, { backgroundColor: r.status === 'ON_SITE' ? '#4ade80' : '#8fa3b8' }]} />
            <View>
              <Text style={styles.historyZone}>{r.zone}</Text>
              <Text style={styles.historyTime}>{formatTime(r.clockInAt)}</Text>
            </View>
          </View>
          <View style={styles.historyRight}>
            <Text style={styles.historyDuration}>{getDuration(r.clockInAt, r.clockOutAt)}</Text>
            <Text style={[styles.historyStatus, { color: r.status === 'ON_SITE' ? '#15803d' : '#8fa3b8' }]}>
              {r.status === 'ON_SITE' ? 'On Site' : 'Completed'}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  statusCard: { borderRadius: 12, borderWidth: 2, marginBottom: 16, padding: 16 },
  statusCardGreen: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  statusCardGrey: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef' },
  statusLeft: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  statusDot: { borderRadius: 8, height: 16, width: 16 },
  statusTitle: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  statusSub: { color: '#5d6875', fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 12 },
  fieldLabel: { color: '#5d6875', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pill: { borderColor: '#e5e9ef', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  pillActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  pillText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },
  pillActiveText: { color: '#ffffff' },
  onSiteInfo: { color: '#17212b', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  clockOutBtn: { alignItems: 'center', backgroundColor: '#b42318', borderRadius: 8, marginTop: 8, paddingVertical: 12 },
  clockOutBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  sectionTitle: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  emptyCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, padding: 16 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  historyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, padding: 12 },
  historyLeft: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  historyDot: { borderRadius: 5, height: 10, width: 10 },
  historyZone: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  historyTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  historyRight: { alignItems: 'flex-end' },
  historyDuration: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  historyStatus: { fontSize: 11, fontWeight: '700' },
});