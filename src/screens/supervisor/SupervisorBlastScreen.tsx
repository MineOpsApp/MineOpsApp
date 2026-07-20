import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { scheduleBlast, getAllBlasts, cancelBlast, executeBlast, parseApiError } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type BlastSchedule = {
  id: number;
  zone: string;
  site: string;
  scheduledByName: string;
  notes: string | null;
  status: string;
  blastTime: string;
  createdAt: string;
};

type Props = { session: AuthSession };

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Processing Area'];
const ADVANCE_MINUTES = [15, 30, 60, 120, 240];

export function SupervisorBlastScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [blasts, setBlasts] = useState<BlastSchedule[]>([]);
  const [zone, setZone] = useState('Zone A');
  const [minutesAhead, setMinutesAhead] = useState(30);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setRefreshing(true);
    try { setBlasts(await getAllBlasts()); } catch {} finally { setRefreshing(false); }
  }

  async function handleSchedule() {
    setLoading(true);
    try {
      const blastTime = new Date(Date.now() + minutesAhead * 60000).toISOString().slice(0, 19);
      const blast = await scheduleBlast({ zone, blastTime, notes: notes.trim() || undefined });
      setBlasts((c) => [blast, ...c]);
      setNotes('');
      Alert.alert('Blast scheduled', `Blasting in ${zone} in ${minutesAhead} minutes. All site users have been notified.`);
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    } finally { setLoading(false); }
  }

  async function handleCancel(blast: BlastSchedule) {
    Alert.alert('Cancel blast?', `Cancel the scheduled blast in ${blast.zone}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Blast', style: 'destructive', onPress: async () => {
          try {
            const updated = await cancelBlast(blast.id);
            setBlasts((c) => c.map((b) => b.id === updated.id ? updated : b));
            Alert.alert('Cancelled', 'Blast cancelled. All site users have been notified.');
          } catch { Alert.alert('Failed', 'Could not cancel blast.'); }
        }
      }
    ]);
  }

  async function handleExecute(blast: BlastSchedule) {
    Alert.alert('Mark as executed?', `Confirm blast in ${blast.zone} has been executed.`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Confirm Executed', onPress: async () => {
          try {
            const updated = await executeBlast(blast.id);
            setBlasts((c) => c.map((b) => b.id === updated.id ? updated : b));
          } catch { Alert.alert('Failed', 'Could not update blast status.'); }
        }
      }
    ]);
  }

  function formatTime(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  function getMinutesUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    const mins = Math.floor(diff / 60000);
    if (mins < 0) return 'Past';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  const scheduled = blasts.filter((b) => b.status === 'SCHEDULED');
  const past = blasts.filter((b) => b.status !== 'SCHEDULED');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Blast Management</Text>

      {/* Schedule form */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💥 Schedule Blast</Text>

        <Text style={styles.fieldLabel}>Zone</Text>
        <View style={styles.pillRow}>
          {ZONES.map((z) => (
            <Pressable key={z} onPress={() => setZone(z)} style={[styles.pill, zone === z && styles.pillActive]}>
              <Text style={[styles.pillText, zone === z && styles.pillActiveText]}>{z}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Time Until Blast</Text>
        <View style={styles.pillRow}>
          {ADVANCE_MINUTES.map((m) => (
            <Pressable key={m} onPress={() => setMinutesAhead(m)} style={[styles.pill, minutesAhead === m && styles.pillActive]}>
              <Text style={[styles.pillText, minutesAhead === m && styles.pillActiveText]}>
                {m < 60 ? `${m}m` : `${m / 60}h`}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠ All workers on site will receive an immediate push notification to clear {zone}.
          </Text>
        </View>

        <ActionButton label={loading ? 'Scheduling...' : `Schedule Blast in ${zone}`} onPress={handleSchedule} tone="danger" disabled={loading} />
      </View>

      {/* Active blasts */}
      {scheduled.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Active Schedules</Text>
          {scheduled.map((blast) => (
            <View key={blast.id} style={styles.blastCard}>
              <View style={styles.blastHeader}>
                <View>
                  <Text style={styles.blastZone}>💥 {blast.zone}</Text>
                  <Text style={styles.blastTime}>{formatTime(blast.blastTime)}</Text>
                </View>
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{getMinutesUntil(blast.blastTime)}</Text>
                </View>
              </View>
              <Text style={styles.blastMeta}>Scheduled by {blast.scheduledByName}</Text>
              {blast.notes ? <Text style={styles.blastNotes}>{blast.notes}</Text> : null}
              <View style={styles.blastActions}>
                <Pressable onPress={() => handleExecute(blast)} style={styles.executeBtn}>
                  <Text style={styles.executeBtnText}>✓ Mark Executed</Text>
                </Pressable>
                <Pressable onPress={() => handleCancel(blast)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>✕ Cancel</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {/* History */}
      {past.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>History</Text>
          {past.slice(0, 10).map((blast) => (
            <View key={blast.id} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyZone}>{blast.zone}</Text>
                <Text style={styles.historyTime}>{formatTime(blast.blastTime)}</Text>
              </View>
              <View style={[styles.statusPill,
                blast.status === 'EXECUTED' ? styles.statusExecuted : styles.statusCancelled]}>
                <Text style={styles.statusPillText}>{blast.status}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {blasts.length === 0 && !refreshing ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No blast schedules yet</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 16 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 14 },
    fieldLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    warningBox: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 12 },
    warningText: { color: theme.danger, fontSize: 12, fontWeight: '700' },
    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 10 },
    blastCard: { backgroundColor: theme.bgCard, borderColor: theme.danger, borderLeftColor: theme.danger, borderLeftWidth: 4, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
    blastHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    blastZone: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    blastTime: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    countdownBadge: { backgroundColor: theme.danger, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    countdownText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    blastMeta: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
    blastNotes: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    blastActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
    executeBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 1, paddingVertical: 8 },
    executeBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
    cancelBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 8 },
    cancelBtnText: { color: theme.danger, fontSize: 12, fontWeight: '800' },
    historyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, padding: 12 },
    historyLeft: {},
    historyZone: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    historyTime: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusExecuted: { backgroundColor: theme.accentLight },
    statusCancelled: { backgroundColor: theme.bgInput },
    statusPillText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: 20 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  });
}
