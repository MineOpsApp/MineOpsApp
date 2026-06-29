import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { submitShiftLog, getMyShiftLogs, getSiteEquipment } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type ShiftLog = {
  id: number;
  zone: string;
  shiftType: string;
  mineralType: string;
  volumeExtracted: number;
  unit: string;
  equipmentCode: string;
  equipmentName: string;
  notes: string;
  status: string;
  submittedAt: string;
};

type Props = { session: AuthSession };

const MINERALS = ['Gold', 'Silver', 'Copper', 'Cobalt', 'Lithium', 'Manganese', 'Bauxite'];
const SHIFT_TYPES = ['Morning', 'Afternoon', 'Night'];
const UNITS = ['kg', 'tonnes', 'oz', 'g'];
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

export function WorkerShiftScreen({ session }: Props) {
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [zone, setZone] = useState('Zone A');
  const [shiftType, setShiftType] = useState('Morning');
  const [mineralType, setMineralType] = useState('Gold');
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState('kg');
  const [equipmentCode, setEquipmentCode] = useState('EX-01');
  const [equipmentName, setEquipmentName] = useState('Excavator');
  const [notes, setNotes] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);

  useEffect(() => {
    getMyShiftLogs().then(setLogs).catch(() => {});
    getSiteEquipment().then(setEquipmentList).catch(() => {});
  }, []);

  async function submit() {
    const vol = parseFloat(volume);
    if (!volume || isNaN(vol) || vol <= 0) { Alert.alert('Invalid volume', 'Enter a valid volume greater than 0.'); return; }
    setSubmitting(true);
    try {
        const log = await submitShiftLog({
  zone, shiftType, mineralType,
  volumeExtracted: vol,
  unit, equipmentCode, equipmentName,
  notes: notes.trim(),
  shiftDate,
});

      setLogs((c) => [log, ...c]);
      setVolume('');
      setNotes('');
      Alert.alert('Shift logged', `${mineralType} — ${vol}${unit} recorded for ${shiftType} shift.`);
    } catch { Alert.alert('Action failed', 'Could not submit shift log.'); }
    finally { setSubmitting(false); }
  }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
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

      <Text style={styles.label}>Volume Extracted</Text>
      <View style={styles.volumeRow}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setVolume}
          placeholder="0.00"
          style={styles.volumeInput}
          value={volume}
        />
        <View style={styles.unitRow}>
          {UNITS.map((u) => (
            <Pressable key={u} onPress={() => setUnit(u)} style={[styles.unitPill, unit === u && styles.pillActive]}>
              <Text style={[styles.pillText, unit === u && styles.pillActiveText]}>{u}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={styles.label}>Equipment</Text>
{equipmentList.length > 0 ? (
  <View style={styles.pillRow}>
    {equipmentList.map((eq) => (
      <Pressable
        key={eq.id}
        onPress={() => { setEquipmentCode(eq.code); setEquipmentName(eq.name); }}
        style={[styles.pill, equipmentCode === eq.code && styles.pillActive]}
      >
        <Text style={[styles.pillText, equipmentCode === eq.code && styles.pillActiveText]}>{eq.code} — {eq.name}</Text>
      </Pressable>
    ))}
  </View>
) : (
  <View style={styles.equipRow}>
    <TextInput onChangeText={setEquipmentCode} placeholder="Code (e.g. EX-01)" style={[styles.input, { flex: 1, marginRight: 8 }]} value={equipmentCode} />
    <TextInput onChangeText={setEquipmentName} placeholder="Name" style={[styles.input, { flex: 2 }]} value={equipmentName} />
  </View>
)}

          <Text style={styles.label}>Shift Date</Text>
<TextInput
  onChangeText={setShiftDate}
  placeholder="YYYY-MM-DD"
  placeholderTextColor="#8fa3b8"
  style={styles.input}
  value={shiftDate}
  keyboardType="numbers-and-punctuation"
/>
<Text style={styles.label}>Notes (optional)</Text>
<TextInput multiline onChangeText={setNotes} placeholder="Any observations for this shift..." style={styles.textArea} value={notes} />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput multiline onChangeText={setNotes} placeholder="Any observations for this shift..." style={styles.textArea} value={notes} />

      <ActionButton label={submitting ? 'Submitting...' : 'Submit Shift Log'} onPress={submit} />

      <Text style={styles.sectionTitle}>My Shift History</Text>
      {logs.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No shift logs yet</Text></View>
      ) : null}
      {logs.map((log) => (
        <View key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logMineral}>{log.mineralType}</Text>
            <Text style={styles.logVolume}>{log.volumeExtracted}{log.unit}</Text>
          </View>
          <Text style={styles.logMeta}>{log.shiftType} shift · {log.zone}</Text>
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
  volumeRow: { marginBottom: 10 },
  volumeInput: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 20, fontWeight: '800', marginBottom: 8, minHeight: 50, paddingHorizontal: 14 },
  unitRow: { flexDirection: 'row', gap: 6 },
  unitPill: { borderColor: '#dde3ea', borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  equipRow: { flexDirection: 'row', marginBottom: 10 },
  input: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, minHeight: 44, paddingHorizontal: 12 },
  textArea: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 12, minHeight: 80, padding: 12 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  logCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  logHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logMineral: { color: '#17212b', fontSize: 15, fontWeight: '900' },
  logVolume: { color: '#1f6f5b', fontSize: 15, fontWeight: '900' },
  logMeta: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 1 },
  logNotes: { color: '#17212b', fontSize: 13, fontWeight: '600', marginTop: 4 },
  logTime: { color: '#9aa5b1', fontSize: 11, fontWeight: '700', marginTop: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});