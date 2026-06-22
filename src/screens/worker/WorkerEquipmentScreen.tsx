import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import {
  getWorkerProfile,
  updateWorkerEquipmentStatus,
  reportEquipmentFault,
  requestEquipmentMaintenance,
  logEquipmentShift,
  getEquipmentShiftLogs,
} from '../../services/api';
import type { WorkerProfile } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type ShiftCheckType = 'ShiftStart' | 'ShiftEnd' | 'MidShiftCheck';
type EquipmentStatus = 'Operational' | 'Idle' | 'Maintenance' | 'Flagged';

type ShiftLog = {
  id: number;
  equipmentCode: string;
  equipmentName: string;
  status: string;
  checkType: string;
  notes: string;
  loggedAt: string;
};

type Props = { session: AuthSession };

export function WorkerEquipmentScreen({ session }: Props) {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [status, setStatus] = useState<EquipmentStatus>('Operational');
  const [checkType, setCheckType] = useState<ShiftCheckType>('ShiftStart');
  const [shiftNotes, setShiftNotes] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [maintenanceDetails, setMaintenanceDetails] = useState('');

  useEffect(() => {
    getWorkerProfile(session.user.email).then(setProfile).catch(() => {});
    getEquipmentShiftLogs().then(setShiftLogs).catch(() => {});
  }, []);

  const equipment = profile?.assignedEquipment[0];

  const STATUS_COLORS: Record<EquipmentStatus, string> = {
    Operational: '#1f6f5b',
    Idle: '#a15c00',
    Maintenance: '#1d5f99',
    Flagged: '#b42318',
  };

  const CHECK_LABELS: Record<ShiftCheckType, string> = {
    ShiftStart: 'Shift Start',
    ShiftEnd: 'Shift End',
    MidShiftCheck: 'Mid-Shift Check',
  };

  async function logShift() {
    if (!equipment) { Alert.alert('No equipment', 'No equipment assigned.'); return; }
    try {
      const log = await logEquipmentShift({
        equipmentCode: equipment.code,
        equipmentName: equipment.name,
        status,
        checkType,
        notes: shiftNotes.trim(),
      });
      setShiftLogs((c) => [log, ...c]);
      setShiftNotes('');
      Alert.alert('Logged', `${CHECK_LABELS[checkType]} recorded — ${status}`);
    } catch { Alert.alert('Action failed', 'Could not log equipment status.'); }
  }

  async function reportFault() {
    if (!equipment) { Alert.alert('No equipment', 'No equipment assigned.'); return; }
    try {
      await reportEquipmentFault({ description: faultDescription.trim() || 'Fault reported', equipmentCode: equipment.code, workerEmail: session.user.email, workerName: session.user.fullName });
      setFaultDescription('');
      Alert.alert('Fault reported', 'Your fault report has been submitted.');
    } catch { Alert.alert('Action failed', 'Could not report fault.'); }
  }

  async function requestMaintenance() {
    if (!equipment) { Alert.alert('No equipment', 'No equipment assigned.'); return; }
    try {
      await requestEquipmentMaintenance({ equipmentCode: equipment.code, requestDetails: maintenanceDetails.trim() || 'Maintenance requested', workerEmail: session.user.email, workerName: session.user.fullName });
      setMaintenanceDetails('');
      Alert.alert('Requested', 'Maintenance request submitted.');
    } catch { Alert.alert('Action failed', 'Could not request maintenance.'); }
  }

  function formatTime(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  }

  const statusColor = (s: string) => {
    const colors: Record<string, string> = { Operational: '#1f7a4d', Idle: '#a15c00', Maintenance: '#1d5f99', Flagged: '#b42318' };
    return colors[s] ?? '#5d6875';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Equipment</Text>

      {equipment ? (
        <View style={styles.equipmentCard}>
          <Text style={styles.equipmentName}>{equipment.name} — {equipment.code}</Text>
          <Text style={styles.meta}>Current status: {equipment.status}</Text>
          <Text style={styles.instructions}>{equipment.instructions}</Text>
        </View>
      ) : (
        <View style={styles.card}><Text style={styles.meta}>Loading equipment...</Text></View>
      )}

      <Text style={styles.sectionTitle}>Shift Check</Text>
      <Text style={styles.label}>Check Type</Text>
      <View style={styles.pillRow}>
        {(['ShiftStart', 'ShiftEnd', 'MidShiftCheck'] as ShiftCheckType[]).map((type) => (
          <Pressable
            key={type}
            onPress={() => setCheckType(type)}
            style={[styles.pill, checkType === type && styles.pillActive]}
          >
            <Text style={[styles.pillText, checkType === type && styles.pillActiveText]}>
              {CHECK_LABELS[type]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Equipment Status</Text>
      <View style={styles.statusGrid}>
        {(['Operational', 'Idle', 'Maintenance', 'Flagged'] as EquipmentStatus[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            style={[
              styles.statusButton,
              status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] },
            ]}
          >
            <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <InputField label="Notes (optional)" multiline onChangeText={setShiftNotes} value={shiftNotes} placeholder="Any observations for this check..." />
      <ActionButton label="Log Shift Check" onPress={logShift} />

      <Text style={styles.sectionTitle}>Shift Log History</Text>
      {shiftLogs.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No shift logs yet</Text></View>
      ) : null}
      {shiftLogs.slice(0, 10).map((log) => (
        <View key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logCheckType}>{CHECK_LABELS[log.checkType as ShiftCheckType] ?? log.checkType}</Text>
            <Text style={[styles.logStatus, { color: statusColor(log.status) }]}>{log.status}</Text>
          </View>
          <Text style={styles.logEquipment}>{log.equipmentName} ({log.equipmentCode})</Text>
          {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
          <Text style={styles.logTime}>{formatTime(log.loggedAt)}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Report Fault</Text>
      <InputField label="Fault details" multiline onChangeText={setFaultDescription} value={faultDescription} placeholder="Describe the fault..." />
      <ActionButton label="Report Fault" onPress={reportFault} tone="danger" />

      <Text style={styles.sectionTitle}>Request Maintenance</Text>
      <InputField label="Details" multiline onChangeText={setMaintenanceDetails} value={maintenanceDetails} placeholder="What maintenance is needed?" />
      <ActionButton label="Request Service" onPress={requestMaintenance} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 16 },
  label: { color: '#5d6875', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  equipmentCard: { backgroundColor: '#fff', borderColor: '#1f6f5b', borderRadius: 8, borderWidth: 2, marginBottom: 16, padding: 14 },
  equipmentName: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  instructions: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginTop: 6, lineHeight: 18 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginTop: 2 },
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  pill: { borderColor: '#dde3ea', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  pillActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  pillText: { color: '#5d6875', fontSize: 12, fontWeight: '800' },
  pillActiveText: { color: '#fff' },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusButton: { alignItems: 'center', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, width: '48%' },
  statusText: { color: '#5d6875', fontSize: 13, fontWeight: '800' },
  statusTextActive: { color: '#fff' },
  logCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  logHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logCheckType: { color: '#17212b', fontSize: 14, fontWeight: '800' },
  logStatus: { fontSize: 13, fontWeight: '900' },
  logEquipment: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  logNotes: { color: '#17212b', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  logTime: { color: '#9aa5b1', fontSize: 11, fontWeight: '700', marginTop: 4 },
});