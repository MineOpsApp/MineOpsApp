import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { scheduleBlast, getAllBlasts, cancelBlast, executeBlast, parseApiError } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, spacing, type Theme } from '../../theme/theme';
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
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

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
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <Ionicons name="flame-outline" size={16} color={theme.danger} />
          <Text style={styles.cardTitle}>Schedule Blast</Text>
        </View>

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

        <View style={[styles.warningBox, { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }]}>
          <Ionicons name="warning" size={15} color={styles.warningText.color} style={{ marginTop: 2 }} />
          <Text style={[styles.warningText, { flex: 1 }]}>
            All workers on site will receive an immediate push notification to clear {zone}.
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
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 2 }}>
                    <Ionicons name="flame-outline" size={15} color={theme.danger} />
                    <Text style={styles.blastZone}>{blast.zone}</Text>
                  </View>
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
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                    <Text style={styles.executeBtnText}>Mark Executed</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => handleCancel(blast)} style={styles.cancelBtn}>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                    <Ionicons name="close" size={14} color={theme.danger} />
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </View>
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

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: spacing.lg },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg, ...cardShadow },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900' },
    fieldLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm, textTransform: 'uppercase' },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    warningBox: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: spacing.md },
    warningText: { color: theme.danger, fontSize: 12, fontWeight: '700' },
    sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 10 },
    blastCard: { backgroundColor: theme.bgCard, borderColor: theme.danger, borderLeftColor: theme.danger, borderLeftWidth: 4, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    blastHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    blastZone: { color: theme.text, fontSize: 15, fontWeight: '900' },
    blastTime: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    countdownBadge: { backgroundColor: theme.danger, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    countdownText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    blastMeta: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
    blastNotes: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm },
    blastActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    executeBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 1, justifyContent: 'center', paddingVertical: spacing.sm },
    executeBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
    cancelBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: 'center', paddingVertical: spacing.sm },
    cancelBtnText: { color: theme.danger, fontSize: 12, fontWeight: '800' },
    historyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, padding: spacing.md, ...cardShadow },
    historyLeft: {},
    historyZone: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    historyTime: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    statusPill: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    statusExecuted: { backgroundColor: theme.accentLight },
    statusCancelled: { backgroundColor: theme.bgInput },
    statusPillText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: spacing.xl, ...cardShadow },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  });
}
