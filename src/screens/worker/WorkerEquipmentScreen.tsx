import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { getWorkerProfile, updateWorkerEquipmentStatus, reportEquipmentFault, requestEquipmentMaintenance, logEquipmentShift, getEquipmentShiftLogs, parseApiError } from '../../services/api';
import type { WorkerProfile } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type EquipmentStatus = 'Operational' | 'Idle' | 'Maintenance' | 'Flagged';
type ShiftCheckType = 'ShiftStart' | 'ShiftEnd' | 'MidShiftCheck';

type ShiftLog = {
  id: number;
  equipmentCode: string;
  status: string;
  checkType: string;
  notes: string;
  loggedAt: string;
};

const STATUS_CONFIG: Record<EquipmentStatus, { color: string; bg: string; icon: ComponentProps<typeof Ionicons>['name'] }> = {
  Operational: { color: '#15803d', bg: '#f0fdf4', icon: 'checkmark-circle' },
  Idle: { color: '#a15c00', bg: '#fffbeb', icon: 'pause-circle' },
  Maintenance: { color: '#1d5f99', bg: '#eff6ff', icon: 'construct' },
  Flagged: { color: '#b42318', bg: '#fff5f5', icon: 'flag' },
};

const CHECK_LABELS: Record<ShiftCheckType, string> = {
  ShiftStart: 'Shift Start',
  ShiftEnd: 'Shift End',
  MidShiftCheck: 'Mid-Shift',
};

type Props = { session: AuthSession };

export function WorkerEquipmentScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [shiftStatus, setShiftStatus] = useState<EquipmentStatus>('Operational');
  const [checkType, setCheckType] = useState<ShiftCheckType>('ShiftStart');
  const [shiftNotes, setShiftNotes] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [maintenanceDetails, setMaintenanceDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    await Promise.all([
      getWorkerProfile(session.user.email).then(setProfile).catch(() => {}),
      getEquipmentShiftLogs().then((logs: ShiftLog[]) => setShiftLogs(logs)).catch(() => {}),
    ]);
  }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const equipment = profile?.assignedEquipment[0];
  const currentStatus = equipment?.status ?? 'Unknown';
  const statusConfig = STATUS_CONFIG[currentStatus as EquipmentStatus] ?? { color: theme.textSub, bg: theme.bgInput, icon: 'help-circle' as ComponentProps<typeof Ionicons>['name'] };

  async function logShift() {
    if (!equipment) { Alert.alert('No equipment', 'No equipment assigned.'); return; }
    setSubmitting(true);
    try {
      const log = await logEquipmentShift({ equipmentCode: equipment.code, equipmentName: equipment.name, status: shiftStatus, checkType, notes: shiftNotes.trim() });
      setShiftLogs((c) => [log, ...c]);
      setShiftNotes('');
      Alert.alert('Logged', `${CHECK_LABELS[checkType]} — ${shiftStatus}`);
    } catch (e) { Alert.alert('Failed', parseApiError(e)); }
    finally { setSubmitting(false); }
  }

  async function reportFault() {
    if (!equipment) { Alert.alert('No equipment', 'Load profile first.'); return; }
    setSubmitting(true);
    try {
      await reportEquipmentFault({ description: faultDescription.trim() || 'Fault reported', equipmentCode: equipment.code, workerEmail: session.user.email, workerName: session.user.fullName });
      setFaultDescription('');
      Alert.alert('Fault reported', 'Your report has been submitted.');
    } catch (e) { Alert.alert('Failed', parseApiError(e)); }
    finally { setSubmitting(false); }
  }

  async function requestMaintenance() {
    if (!equipment) { Alert.alert('No equipment', 'Load profile first.'); return; }
    setSubmitting(true);
    try {
      await requestEquipmentMaintenance({ equipmentCode: equipment.code, requestDetails: maintenanceDetails.trim() || 'Maintenance requested', workerEmail: session.user.email, workerName: session.user.fullName });
      setMaintenanceDetails('');
      Alert.alert('Requested', 'Maintenance request submitted.');
    } catch (e) { Alert.alert('Failed', parseApiError(e)); }
    finally { setSubmitting(false); }
  }

  function formatTime(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.pageTitle}>Equipment</Text>

      {equipment ? (
        <View style={[styles.equipCard, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color }]}>
          <View style={styles.equipTop}>
            <View>
              <Text style={styles.equipName}>{equipment.name}</Text>
              <View style={styles.codeChip}><Text style={styles.codeChipText}>{equipment.code}</Text></View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.color }]}>
              <Ionicons name={statusConfig.icon} size={13} color="#ffffff" />
              <Text style={styles.statusPillText}>{currentStatus}</Text>
            </View>
          </View>
          <Text style={styles.equipInstructions}>{equipment.instructions}</Text>
        </View>
      ) : (
        <View style={styles.loadingCard}><Text style={styles.loadingText}>Loading equipment...</Text></View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shift Check</Text>
        <Text style={styles.fieldLabel}>Check Type</Text>
        <View style={styles.pillRow}>
          {(['ShiftStart', 'ShiftEnd', 'MidShiftCheck'] as ShiftCheckType[]).map((t) => (
            <Pressable key={t} onPress={() => setCheckType(t)} style={[styles.pill, checkType === t && styles.pillActive]}>
              <Text style={[styles.pillText, checkType === t && styles.pillActiveText]}>{CHECK_LABELS[t]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.statusGrid}>
          {(['Operational', 'Idle', 'Maintenance', 'Flagged'] as EquipmentStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = shiftStatus === s;
            return (
              <Pressable key={s} onPress={() => setShiftStatus(s)} style={[styles.statusBtn, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                <Ionicons name={cfg.icon} size={20} color={active ? cfg.color : theme.textMuted} style={{ marginBottom: 3 }} />
                <Text style={[styles.statusBtnText, active && { color: cfg.color }]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
        <InputField label="Notes (optional)" multiline onChangeText={setShiftNotes} value={shiftNotes} placeholder="Any observations..." />
        <ActionButton label={submitting ? 'Saving...' : 'Log Shift Check'} onPress={logShift} disabled={submitting} />
      </View>

      {shiftLogs.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Checks</Text>
          {shiftLogs.slice(0, 5).map((log) => {
            const cfg = STATUS_CONFIG[log.status as EquipmentStatus] ?? { color: theme.textSub, bg: theme.bgInput, icon: 'help-circle' as ComponentProps<typeof Ionicons>['name'] };
            return (
              <View key={log.id} style={styles.logRow}>
                <View style={[styles.logDot, { backgroundColor: cfg.color }]} />
                <View style={styles.logBody}>
                  <Text style={styles.logCheck}>{CHECK_LABELS[log.checkType as ShiftCheckType] ?? log.checkType}</Text>
                  <Text style={[styles.logStatus, { color: cfg.color }]}>{log.status}</Text>
                </View>
                <Text style={styles.logTime}>{formatTime(log.loggedAt)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Report Fault</Text>
        <InputField label="Fault details" multiline onChangeText={setFaultDescription} value={faultDescription} placeholder="Describe the fault..." />
        <ActionButton label={submitting ? 'Submitting...' : 'Report Fault'} onPress={reportFault} tone="danger" disabled={submitting} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Request Maintenance</Text>
        <InputField label="Details" multiline onChangeText={setMaintenanceDetails} value={maintenanceDetails} placeholder="What maintenance is needed?" />
        <ActionButton label={submitting ? 'Submitting...' : 'Request Service'} onPress={requestMaintenance} disabled={submitting} />
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageTitle: { ...typography.h1, color: theme.text, marginBottom: spacing.lg },
    equipCard: { borderRadius: 12, borderWidth: 2, marginBottom: spacing.lg, padding: spacing.lg },
    equipTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    equipName: { ...typography.h3, color: theme.text, marginBottom: 2 },
    codeChip: { alignSelf: 'flex-start', backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 4, borderWidth: 1, marginTop: 4, paddingHorizontal: 7, paddingVertical: 2 },
    codeChipText: { color: theme.textSub, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, fontWeight: '700' },
    statusPill: { alignItems: 'center', borderRadius: 20, flexDirection: 'row', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 5 },
    statusPillText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
    equipInstructions: { ...typography.caption, color: theme.textSub, lineHeight: 18 },
    loadingCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
    loadingText: { ...typography.caption, color: theme.textMuted },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
    cardTitle: { ...typography.bodyBold, color: theme.text, marginBottom: 14 },
    fieldLabel: { ...typography.label, color: theme.textSub, marginBottom: spacing.sm },
    pillRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 14 },
    pill: { alignItems: 'center', borderColor: theme.border, borderRadius: 20, borderWidth: 1, flex: 1, paddingVertical: spacing.sm },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { ...typography.caption, color: theme.textMuted, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    statusBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 10, borderWidth: 1, paddingVertical: 10, width: '48%' },
    statusBtnText: { ...typography.caption, color: theme.textMuted, fontWeight: '800' },
    logRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
    logDot: { borderRadius: 5, height: 10, marginRight: 10, width: 10 },
    logBody: { flex: 1 },
    logCheck: { ...typography.bodyBold, color: theme.text, fontSize: 13 },
    logStatus: { ...typography.caption, fontWeight: '700' },
    logTime: { ...typography.label, color: theme.textMuted, textTransform: 'none' as const },
  });
}
