import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { getMyShiftLogs, getSiteEquipment, parseApiError, submitShiftLog } from '../../services/api';
import { enqueue } from '../../utils/offlineQueue';
import NetInfo from '@react-native-community/netinfo';
import type { ShiftLog } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

const MINERALS = ['Gold', 'Silver', 'Copper', 'Cobalt', 'Lithium', 'Manganese', 'Bauxite'];
const SHIFT_TYPES = ['Morning', 'Afternoon', 'Night'];
const UNITS = ['kg', 'tonnes', 'oz', 'g', 'lb', 'carats'];
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

// Must match backend UNIT_LIMITS
const UNIT_LIMITS: Record<string, number> = {
  kg: 50000,
  tonnes: 500,
  t: 500,
  oz: 10000,
  g: 50000,
  lb: 100000,
  carats: 500000,
  ct: 500000,
};
const DEFAULT_LIMIT = 100000;

function getLimit(unit: string): number {
  return UNIT_LIMITS[unit.toLowerCase()] ?? DEFAULT_LIMIT;
}

function formatLimit(unit: string): string {
  return getLimit(unit).toLocaleString();
}

function validateVolume(vol: string, unit: string): string | null {
  if (!vol.trim()) return null; // empty is shown as placeholder, not error yet
  const n = parseFloat(vol);
  if (isNaN(n)) return 'Enter a valid number';
  if (n <= 0) return 'Volume must be greater than zero';
  const parts = vol.split('.');
  if (parts[1] && parts[1].length > 3) return 'Maximum 3 decimal places allowed';
  const limit = getLimit(unit);
  if (n > limit) return `Exceeds max of ${limit.toLocaleString()} ${unit} per shift`;
  return null;
}

function statusColor(s: string) {
  if (s === 'APPROVED') return '#15803d';
  if (s === 'REJECTED') return '#b42318';
  return '#92400e';
}
function statusBg(s: string) {
  if (s === 'APPROVED') return '#dcfce7';
  if (s === 'REJECTED') return '#fff5f5';
  return '#fef3c7';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export function WorkerShiftScreen({ session: _ }: Props) {
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [zone, setZone] = useState('Zone A');
  const [shiftType, setShiftType] = useState('Morning');
  const [mineralType, setMineralType] = useState('Gold');
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState('kg');
  const [equipmentCode, setEquipmentCode] = useState('');
  const [equipmentName, setEquipmentName] = useState('');
  const [notes, setNotes] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [volumeTouched, setVolumeTouched] = useState(false);

  useEffect(() => {
    getMyShiftLogs().then(setLogs).catch(() => {});
    getSiteEquipment().then((list) => {
      setEquipmentList(list);
      if (list.length > 0) {
        setEquipmentCode(list[0].code);
        setEquipmentName(list[0].name);
      }
    }).catch(() => {});
  }, []);

  const volumeError = volumeTouched ? validateVolume(volume, unit) : null;
  const isVolumeValid = volume.trim() !== '' && validateVolume(volume, unit) === null;

  // When unit changes, re-validate the current volume
  function changeUnit(u: string) {
    setUnit(u);
  }

  async function submit() {
    setVolumeTouched(true);
    const err = validateVolume(volume, unit);
    if (err) { Alert.alert('Invalid volume', err); return; }
    if (!equipmentCode.trim()) { Alert.alert('Required', 'Select or enter equipment.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        zone, shiftType, mineralType,
        volumeExtracted: parseFloat(volume),
        unit, equipmentCode, equipmentName,
        notes: notes.trim(),
        shiftDate,
      };

      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;
      if (!isOnline) {
        await enqueue('shiftLog', payload as Record<string, unknown>);
        setVolume('');
        setNotes('');
        setVolumeTouched(false);
        Alert.alert('Saved offline', 'Shift log queued — will send automatically when you reconnect.');
        return;
      }

      const log = await submitShiftLog(payload);
      setLogs((prev) => [log, ...prev]);
      setVolume('');
      setNotes('');
      setVolumeTouched(false);
      Alert.alert('Shift logged', `${mineralType} — ${parseFloat(volume)}${unit} recorded for ${shiftType} shift.`);
    } catch (e) {
      Alert.alert('Submission failed', parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Shift Production</Text>

      <Text style={styles.sectionTitle}>Log This Shift</Text>

      <Text style={styles.label}>Shift Type</Text>
      <View style={styles.pillRow}>
        {SHIFT_TYPES.map((s) => (
          <Pressable key={s} onPress={() => setShiftType(s)} style={[styles.pill, shiftType === s && styles.pillActive]}>
            <Text style={[styles.pillText, shiftType === s && styles.pillActiveText]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Zone</Text>
      <View style={styles.pillRow}>
        {ZONES.map((z) => (
          <Pressable key={z} onPress={() => setZone(z)} style={[styles.pill, zone === z && styles.pillActive]}>
            <Text style={[styles.pillText, zone === z && styles.pillActiveText]}>{z}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Mineral Extracted</Text>
      <View style={styles.pillRow}>
        {MINERALS.map((m) => (
          <Pressable key={m} onPress={() => setMineralType(m)} style={[styles.pill, mineralType === m && styles.pillActive]}>
            <Text style={[styles.pillText, mineralType === m && styles.pillActiveText]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Unit</Text>
      <View style={styles.pillRow}>
        {UNITS.map((u) => (
          <Pressable key={u} onPress={() => changeUnit(u)} style={[styles.pill, unit === u && styles.pillActive]}>
            <Text style={[styles.pillText, unit === u && styles.pillActiveText]}>{u}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.volumeLabelRow}>
        <Text style={styles.label}>Volume Extracted</Text>
        <Text style={styles.maxHint}>Max: {formatLimit(unit)} {unit}/shift</Text>
      </View>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={(v) => { setVolume(v); if (!volumeTouched) setVolumeTouched(true); }}
        onBlur={() => setVolumeTouched(true)}
        placeholder={`0.000 (max ${formatLimit(unit)})`}
        placeholderTextColor="#9aa5b1"
        style={[
          styles.volumeInput,
          volumeError ? styles.inputError : isVolumeValid ? styles.inputValid : null,
        ]}
        value={volume}
      />
      {volumeError ? (
        <Text style={styles.errorText}>⚠ {volumeError}</Text>
      ) : isVolumeValid ? (
        <Text style={styles.validText}>✓ Valid volume</Text>
      ) : null}

      <Text style={styles.label}>Equipment</Text>
      {equipmentList.length > 0 ? (
        <View style={styles.pillRow}>
          {equipmentList.map((eq) => (
            <Pressable
              key={eq.id}
              onPress={() => { setEquipmentCode(eq.code); setEquipmentName(eq.name); }}
              style={[styles.pill, equipmentCode === eq.code && styles.pillActive]}
            >
              <Text style={[styles.pillText, equipmentCode === eq.code && styles.pillActiveText]}>
                {eq.code} — {eq.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.equipRow}>
          <TextInput
            onChangeText={setEquipmentCode}
            placeholder="Code (e.g. EX-01)"
            placeholderTextColor="#9aa5b1"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={equipmentCode}
          />
          <TextInput
            onChangeText={setEquipmentName}
            placeholder="Name"
            placeholderTextColor="#9aa5b1"
            style={[styles.input, { flex: 2 }]}
            value={equipmentName}
          />
        </View>
      )}

      <Text style={styles.label}>Shift Date</Text>
      <TextInput
        onChangeText={setShiftDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9aa5b1"
        style={styles.input}
        value={shiftDate}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        multiline
        onChangeText={setNotes}
        placeholder="Any observations for this shift..."
        placeholderTextColor="#9aa5b1"
        style={styles.textArea}
        value={notes}
      />

      <ActionButton label={submitting ? 'Submitting...' : 'Submit Shift Log'} onPress={submit} />

      <Text style={styles.sectionTitle}>My Shift History</Text>
      {logs.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No shift logs yet</Text></View>
      ) : null}
      {logs.map((log) => (
        <View key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.logMineral}>{log.mineralType}</Text>
              <Text style={styles.logWorkerMeta}>{log.shiftType} shift · {log.zone}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.logVolume}>{log.volumeExtracted} {log.unit}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(log.status) }]}>
                <Text style={[styles.statusText, { color: statusColor(log.status) }]}>{log.status}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.logMeta}>{log.equipmentName} ({log.equipmentCode})</Text>
          {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
          <Text style={styles.logTime}>{formatDate(log.submittedAt)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 12 },
  label: { color: '#5d6875', fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: { borderColor: '#dde3ea', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  pillActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  pillText: { color: '#5d6875', fontSize: 12, fontWeight: '800' },
  pillActiveText: { color: '#fff' },
  volumeLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, marginTop: 4 },
  maxHint: { color: '#1f6f5b', fontSize: 12, fontWeight: '700' },
  volumeInput: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1.5, color: '#17212b', fontSize: 22, fontWeight: '800', marginBottom: 4, minHeight: 54, paddingHorizontal: 14 },
  inputError: { borderColor: '#b42318', backgroundColor: '#fff5f5' },
  inputValid: { borderColor: '#15803d' },
  errorText: { color: '#b42318', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  validText: { color: '#15803d', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  equipRow: { flexDirection: 'row', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, minHeight: 44, paddingHorizontal: 12, marginBottom: 10 },
  textArea: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 12, minHeight: 80, padding: 12 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  logCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  logHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logMineral: { color: '#17212b', fontSize: 15, fontWeight: '900' },
  logWorkerMeta: { color: '#5d6875', fontSize: 11, fontWeight: '700', marginTop: 2 },
  logVolume: { color: '#1f6f5b', fontSize: 15, fontWeight: '900' },
  statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  logMeta: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 1 },
  logNotes: { color: '#17212b', fontSize: 13, fontWeight: '600', marginTop: 4 },
  logTime: { color: '#9aa5b1', fontSize: 11, fontWeight: '700', marginTop: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});
