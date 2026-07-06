import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { getWorkerProfile, updateWorkerEquipmentStatus, reportEquipmentFault, requestEquipmentMaintenance, logEquipmentShift, getEquipmentShiftLogs, parseApiError } from '../../services/api';
import type { WorkerProfile } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

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

const STATUS_CONFIG: Record<EquipmentStatus, { color: string; bg: string; icon: string }> = {
  Operational: { color: '#15803d', bg: '#f0fdf4', icon: '✓' },
  Idle: { color: '#a15c00', bg: '#fffbeb', icon: '⏸' },
  Maintenance: { color: '#1d5f99', bg: '#eff6ff', icon: '⚙' },
  Flagged: { color: '#b42318', bg: '#fff5f5', icon: '⚑' },
};

const CHECK_LABELS: Record<ShiftCheckType, string> = {
  ShiftStart: 'Shift Start',
  ShiftEnd: 'Shift End',
  MidShiftCheck: 'Mid-Shift',
};

type Props = { session: AuthSession };

export function WorkerEquipmentScreen({ session }: Props) {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [shiftStatus, setShiftStatus] = useState<EquipmentStatus>('Operational');
  const [checkType, setCheckType] = useState<ShiftCheckType>('ShiftStart');
  const [shiftNotes, setShiftNotes] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [maintenanceDetails, setMaintenanceDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getWorkerProfile(session.user.email).then(setProfile).catch(() => {});
    getEquipmentShiftLogs().then((logs: ShiftLog[]) => setShiftLogs(logs)).catch(() => {});
  }, []);

  const equipment = profile?.assignedEquipment[0];
  const currentStatus = equipment?.status ?? 'Unknown';
  const statusConfig = STATUS_CONFIG[currentStatus as EquipmentStatus] ?? { color: '#5d6875', bg: '#f4f6f8', icon: '?' };

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
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Equipment</Text>

      {/* Equipment status card */}
      {equipment ? (
        <View style={[styles.equipCard, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color }]}>
          <View style={styles.equipTop}>
            <View>
              <Text style={styles.equipName}>{equipment.name}</Text>
              <Text style={styles.equipCode}>{equipment.code}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.color }]}>
              <Text style={styles.statusPillText}>{statusConfig.icon} {currentStatus}</Text>
            </View>
          </View>
          <Text style={styles.equipInstructions}>{equipment.instructions}</Text>
        </View>
      ) : (
        <View style={styles.loadingCard}><Text style={styles.loadingText}>Loading equipment...</Text></View>
      )}

      {/* Shift check */}
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
                <Text style={[styles.statusBtnIcon, active && { color: cfg.color }]}>{cfg.icon}</Text>
                <Text style={[styles.statusBtnText, active && { color: cfg.color }]}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
        <InputField label="Notes (optional)" multiline onChangeText={setShiftNotes} value={shiftNotes} placeholder="Any observations..." />
        <ActionButton label={submitting ? 'Saving...' : 'Log Shift Check'} onPress={logShift} disabled={submitting} />
      </View>

      {/* Recent logs */}
      {shiftLogs.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Checks</Text>
          {shiftLogs.slice(0, 5).map((log) => {
            const cfg = STATUS_CONFIG[log.status as EquipmentStatus] ?? { color: '#5d6875', bg: '#f4f6f8', icon: '?' };
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

      {/* Fault report */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Report Fault</Text>
        <InputField label="Fault details" multiline onChangeText={setFaultDescription} value={faultDescription} placeholder="Describe the fault..." />
        <ActionButton label={submitting ? 'Submitting...' : 'Report Fault'} onPress={reportFault} tone="danger" disabled={submitting} />
      </View>

      {/* Maintenance */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Request Maintenance</Text>
        <InputField label="Details" multiline onChangeText={setMaintenanceDetails} value={maintenanceDetails} placeholder="What maintenance is needed?" />
        <ActionButton label={submitting ? 'Submitting...' : 'Request Service'} onPress={requestMaintenance} disabled={submitting} />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  equipCard: { borderRadius: 12, borderWidth: 2, marginBottom: 16, padding: 16 },
  equipTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  equipName: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  equipCode: { color: '#5d6875', fontSize: 13, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  statusPillText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  equipInstructions: { color: '#5d6875', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  loadingCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  loadingText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 14 },
  fieldLabel: { color: '#5d6875', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  pill: { borderColor: '#e5e9ef', borderRadius: 20, borderWidth: 1, flex: 1, alignItems: 'center', paddingVertical: 8 },
  pillActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  pillText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },
  pillActiveText: { color: '#ffffff' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBtn: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, paddingVertical: 10, width: '48%' },
  statusBtnIcon: { color: '#8fa3b8', fontSize: 16, marginBottom: 3 },
  statusBtnText: { color: '#8fa3b8', fontSize: 12, fontWeight: '800' },
  logRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  logDot: { borderRadius: 5, height: 10, marginRight: 10, width: 10 },
  logBody: { flex: 1 },
  logCheck: { color: '#17212b', fontSize: 13, fontWeight: '800' },
  logStatus: { fontSize: 12, fontWeight: '700' },
  logTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '700' },
});