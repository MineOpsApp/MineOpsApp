import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { getMyShiftLogs, getSiteEquipment, parseApiError, submitShiftLog } from '../../services/api';
import { enqueue } from '../../utils/offlineQueue';
import NetInfo from '@react-native-community/netinfo';
import type { ShiftLog } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const MINERALS = ['Gold', 'Silver', 'Copper', 'Cobalt', 'Lithium', 'Manganese', 'Bauxite'];
const SHIFT_TYPES = ['Morning', 'Afternoon', 'Night'];
const UNITS = ['kg', 'tonnes', 'oz', 'g', 'lb', 'carats'];
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Main Site', 'Processing Area'];

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
  if (!vol.trim()) return null;
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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    await Promise.all([
      getMyShiftLogs().then(setLogs).catch(() => {}),
      getSiteEquipment().then((list) => {
        setEquipmentList(list);
        if (list.length > 0) { setEquipmentCode(list[0].code); setEquipmentName(list[0].name); }
      }).catch(() => {}),
    ]);
  }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const volumeError = volumeTouched ? validateVolume(volume, unit) : null;
  const isVolumeValid = volume.trim() !== '' && validateVolume(volume, unit) === null;

  function changeUnit(u: string) {
    setUnit(u);
  }

  async function submit() {
    setVolumeTouched(true);
    const err = validateVolume(volume, unit);
    if (err) { Alert.alert('Invalid volume', err); return; }
    if (!equipmentCode.trim()) { Alert.alert('Required', 'Select or enter equipment.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) { Alert.alert('Invalid date', 'Shift date must be in YYYY-MM-DD format (e.g. 2026-07-06).'); return; }

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
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
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
        placeholderTextColor={theme.textMuted}
        style={[
          styles.volumeInput,
          volumeError ? styles.inputError : isVolumeValid ? styles.inputValid : null,
        ]}
        value={volume}
      />
      {volumeError ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: 8 }}>
          <Ionicons name="warning" size={13} color={theme.danger} />
          <Text style={styles.errorText}>{volumeError}</Text>
        </View>
      ) : isVolumeValid ? (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: 8 }}>
          <Ionicons name="checkmark-circle" size={13} color={theme.success} />
          <Text style={styles.validText}>Valid volume</Text>
        </View>
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
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={equipmentCode}
          />
          <TextInput
            onChangeText={setEquipmentName}
            placeholder="Name"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { flex: 2 }]}
            value={equipmentName}
          />
        </View>
      )}

      <Text style={styles.label}>Shift Date</Text>
      <TextInput
        onChangeText={setShiftDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.textMuted}
        style={styles.input}
        value={shiftDate}
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        multiline
        onChangeText={setNotes}
        placeholder="Any observations for this shift..."
        placeholderTextColor={theme.textMuted}
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    title: { ...typography.h1, color: theme.text, marginBottom: 4 },
    sectionTitle: { ...typography.h2, color: theme.text, marginBottom: 10, marginTop: spacing.md },
    label: { ...typography.bodyBold, color: theme.textSub, marginBottom: 6, marginTop: spacing.xs, fontSize: 13 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { ...typography.caption, color: theme.textSub, fontWeight: '800' },
    pillActiveText: { color: '#fff' },
    volumeLabelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, marginTop: spacing.xs },
    maxHint: { ...typography.caption, color: theme.accent, fontWeight: '700' },
    volumeInput: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1.5, color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 4, minHeight: 54, paddingHorizontal: 14 },
    inputError: { borderColor: theme.danger, backgroundColor: theme.dangerLight },
    inputValid: { borderColor: theme.success },
    errorText: { ...typography.caption, color: theme.danger, fontWeight: '700' },
    validText: { ...typography.caption, color: theme.success, fontWeight: '700' },
    equipRow: { flexDirection: 'row', marginBottom: 10 },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 10, minHeight: 44, paddingHorizontal: spacing.md },
    textArea: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: spacing.md, minHeight: 80, padding: spacing.md },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
    logCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.md },
    logHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    logMineral: { color: theme.text, fontSize: 15, fontWeight: '900' },
    logWorkerMeta: { ...typography.label, color: theme.textSub, marginTop: 2, textTransform: 'none' as const },
    logVolume: { color: theme.accent, fontSize: 15, fontWeight: '900' },
    statusBadge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    logMeta: { ...typography.caption, color: theme.textSub, fontWeight: '700', marginBottom: 1 },
    logNotes: { color: theme.text, fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
    logTime: { ...typography.label, color: theme.textMuted, marginTop: spacing.xs, textTransform: 'none' as const },
    meta: { ...typography.caption, color: theme.textSub },
  });
}
