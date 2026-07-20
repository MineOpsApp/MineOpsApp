import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { getSiteEquipment, addEquipment, updateEquipmentRegistryStatus } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Equipment = {
  id: number;
  code: string;
  name: string;
  type: string;
  site: string;
  status: string;
  notes: string | null;
};

type Props = { session: AuthSession };

const EQUIPMENT_TYPES = ['Excavator', 'Drill', 'Truck', 'Pump', 'Generator', 'Compressor', 'Other'];
const STATUSES = ['Operational', 'Idle', 'Maintenance', 'Flagged'];

const STATUS_COLORS: Record<string, string> = {
  Operational: '#1f6f5b',
  Idle: '#8fa3b8',
  Maintenance: '#a15c00',
  Flagged: '#b42318',
};

export function SupervisorEquipmentRegistryScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Excavator');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  function load() { return getSiteEquipment().then(setEquipment).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleAdd() {
    if (!code.trim()) { Alert.alert('Missing code', 'Enter equipment code.'); return; }
    if (!name.trim()) { Alert.alert('Missing name', 'Enter equipment name.'); return; }
    setLoading(true);
    try {
      const eq = await addEquipment({ code: code.trim(), name: name.trim(), type, notes: notes.trim() || undefined });
      setEquipment((c) => [...c, eq]);
      setCode(''); setName(''); setNotes('');
      setShowForm(false);
      Alert.alert('Added', `${eq.code} — ${eq.name} added to registry.`);
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('409')) Alert.alert('Duplicate', 'Equipment with this code already exists on this site.');
      else Alert.alert('Failed', 'Could not add equipment.');
    } finally { setLoading(false); }
  }

  async function handleStatusChange(eq: Equipment, status: string) {
    try {
      const updated = await updateEquipmentRegistryStatus(eq.id, status);
      setEquipment((c) => c.map((e) => e.id === updated.id ? updated : e));
    } catch { Alert.alert('Failed', 'Could not update equipment status.'); }
  }

  const operational = equipment.filter((e) => e.status === 'Operational');
  const issues = equipment.filter((e) => e.status !== 'Operational');
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Equipment Registry</Text>
        <Pressable onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? (
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
              <Ionicons name="close" size={14} color="#fff" />
              <Text style={styles.addBtnText}>Cancel</Text>
            </View>
          ) : (
            <Text style={styles.addBtnText}>+ Add</Text>
          )}
        </Pressable>
      </View>

      {/* Summary strip */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{equipment.length}</Text>
          <Text style={styles.stripLabel}>Total</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: theme.accent }]}>{operational.length}</Text>
          <Text style={styles.stripLabel}>Operational</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, issues.length > 0 ? { color: theme.danger } : {}]}>{issues.length}</Text>
          <Text style={styles.stripLabel}>Issues</Text>
        </View>
      </View>

      {/* Add form */}
      {showForm ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Equipment</Text>
          <Text style={styles.fieldLabel}>Code</Text>
          <TextInput autoCapitalize="characters" onChangeText={setCode} placeholder="e.g. EX-01" placeholderTextColor={theme.textMuted} style={styles.input} value={code} />
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput autoCapitalize="words" onChangeText={setName} placeholder="e.g. Komatsu Excavator" placeholderTextColor={theme.textMuted} style={styles.input} value={name} />
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.pillRow}>
            {EQUIPMENT_TYPES.map((t) => (
              <Pressable key={t} onPress={() => setType(t)} style={[styles.pill, type === t && styles.pillActive]}>
                <Text style={[styles.pillText, type === t && styles.pillActiveText]}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput multiline onChangeText={setNotes} placeholder="Any additional details..." placeholderTextColor={theme.textMuted} style={styles.textArea} value={notes} />
          <ActionButton label={loading ? 'Adding...' : 'Add to Registry'} onPress={handleAdd} />
        </View>
      ) : null}

      {/* Equipment list */}
      {equipment.length === 0 && !showForm ? (
        <View style={styles.emptyCard}>
          <Ionicons name="construct-outline" size={36} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No equipment registered</Text>
          <Text style={styles.emptySub}>Tap + Add to register site equipment</Text>
        </View>
      ) : null}

      {equipment.map((eq) => (
        <View key={eq.id} style={styles.equipCard}>
          <View style={styles.equipHeader}>
            <View style={styles.equipLeft}>
              <Text style={styles.equipCode}>{eq.code}</Text>
              <Text style={styles.equipName}>{eq.name}</Text>
              <Text style={styles.equipType}>{eq.type}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[eq.status] + '22', borderColor: STATUS_COLORS[eq.status] }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[eq.status] }]}>{eq.status}</Text>
            </View>
          </View>
          {eq.notes ? <Text style={styles.equipNotes}>{eq.notes}</Text> : null}
          <View style={styles.statusRow}>
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                onPress={() => eq.status !== s && handleStatusChange(eq, s)}
                style={[styles.statusBtn, eq.status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }]}
              >
                <Text style={[styles.statusBtnText, eq.status === s && { color: '#ffffff' }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
    </KeyboardAvoidingView>
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
    pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.lg },
    pageTitle: { color: theme.text, flex: 1, fontSize: 22, fontWeight: '900' },
    addBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: spacing.sm },
    addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.lg, paddingVertical: 14, ...cardShadow },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 22, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg, ...cardShadow },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 14 },
    fieldLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: 4, textTransform: 'uppercase' },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: spacing.md, minHeight: 44, paddingHorizontal: spacing.md },
    textArea: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: spacing.md, minHeight: 70, padding: spacing.md },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 7 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { color: theme.textMuted, fontSize: 12, fontWeight: '800' },
    pillActiveText: { color: '#ffffff' },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40, ...cardShadow },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    equipCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    equipHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    equipLeft: { flex: 1 },
    equipCode: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 2 },
    equipName: { color: theme.textSub, fontSize: 13, fontWeight: '700', marginBottom: 2 },
    equipType: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
    statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 12, fontWeight: '900' },
    equipNotes: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: spacing.sm },
    statusRow: { flexDirection: 'row', gap: 6 },
    statusBtn: { alignItems: 'center', borderColor: theme.border, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 7 },
    statusBtnText: { color: theme.textMuted, fontSize: 10, fontWeight: '800' },
  });
}
