import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  deleteFirstAidKit,
  getFirstAidKits,
  updateFirstAidKit,
  upsertFirstAidKit,
} from '../../services/api';
import type { FirstAidKit, FirstAidKitPayload } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

type ItemKey = 'hasBandages' | 'hasGloves' | 'hasAntiseptic' | 'hasOxygen' | 'hasStretcher';

const KIT_ITEMS: { key: ItemKey; label: string; icon: string }[] = [
  { key: 'hasBandages',   label: 'Bandages & Dressings', icon: 'bandage-outline' },
  { key: 'hasGloves',     label: 'Medical Gloves',        icon: 'hand-left-outline' },
  { key: 'hasAntiseptic', label: 'Antiseptic Solution',   icon: 'flask-outline' },
  { key: 'hasOxygen',     label: 'Oxygen Cylinder',       icon: 'fitness-outline' },
  { key: 'hasStretcher',  label: 'Stretcher',             icon: 'bed-outline' },
];

const EMPTY_FORM: FirstAidKitPayload = {
  zone: '',
  location: '',
  hasBandages: false,
  hasGloves: false,
  hasAntiseptic: false,
  hasOxygen: false,
  hasStretcher: false,
  notes: '',
};

function formatDate(dt: string | null) {
  if (!dt) return 'Never checked';
  try {
    return new Date(dt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dt; }
}

function daysSince(dt: string | null): number | null {
  if (!dt) return null;
  try {
    return Math.floor((Date.now() - new Date(dt).getTime()) / 86400000);
  } catch { return null; }
}

export function SupervisorFirstAidKitScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [kits, setKits] = useState<FirstAidKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<FirstAidKitPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => getFirstAidKits().then(setKits).catch(() => {}), []);
  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId('new');
    setError('');
  }

  function startEdit(kit: FirstAidKit) {
    setForm({
      zone: kit.zone,
      location: kit.location,
      hasBandages: kit.hasBandages,
      hasGloves: kit.hasGloves,
      hasAntiseptic: kit.hasAntiseptic,
      hasOxygen: kit.hasOxygen,
      hasStretcher: kit.hasStretcher,
      notes: kit.notes ?? '',
    });
    setEditingId(kit.id);
    setError('');
  }

  function cancel() { setEditingId(null); setForm(EMPTY_FORM); setError(''); }

  async function handleSave() {
    if (!form.zone.trim()) { setError('Zone name is required'); return; }
    if (!form.location.trim()) { setError('Kit location is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingId === 'new') {
        await upsertFirstAidKit(form);
      } else {
        await updateFirstAidKit(editingId as number, form);
      }
      await load();
      cancel();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(kit: FirstAidKit) {
    Alert.alert(
      'Remove Kit Record',
      `Remove the first aid kit record for ${kit.zone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFirstAidKit(kit.id);
              await load();
            } catch {
              Alert.alert('Error', 'Could not remove kit record. Try again.');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>;
  }

  const stockedCount = kits.filter((k) => k.fullyStocked).length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
    >
      <View style={styles.pageHeader}>
        <View style={styles.pageTitleRow}>
          <Text style={styles.pageTitle}>First Aid Kits</Text>
          {editingId === null && (
            <Pressable onPress={startNew} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add Kit</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.pageSub}>Per-zone inventory · Update weekly</Text>
      </View>

      {kits.length > 0 && (
        <View style={styles.strip}>
          <View style={styles.stripItem}>
            <Text style={styles.stripValue}>{kits.length}</Text>
            <Text style={styles.stripLabel}>Zones</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, { color: theme.accent }]}>{stockedCount}</Text>
            <Text style={styles.stripLabel}>Fully Stocked</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, kits.length - stockedCount > 0 ? { color: theme.danger } : {}]}>
              {kits.length - stockedCount}
            </Text>
            <Text style={styles.stripLabel}>Needs Restock</Text>
          </View>
        </View>
      )}

      {/* Add / Edit form */}
      {editingId !== null && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId === 'new' ? 'Add First Aid Kit' : 'Update Kit'}</Text>

          <Text style={styles.formLabel}>Zone Name *</Text>
          <TextInput
            style={[styles.input, editingId !== 'new' && styles.inputDisabled]}
            value={form.zone}
            onChangeText={(t) => setForm((f) => ({ ...f, zone: t }))}
            placeholder="e.g. Zone A, Blast Area, Control Room"
            placeholderTextColor={theme.textMuted}
            editable={editingId === 'new'}
          />

          <Text style={styles.formLabel}>Kit Location *</Text>
          <TextInput
            style={styles.input}
            value={form.location}
            onChangeText={(t) => setForm((f) => ({ ...f, location: t }))}
            placeholder="e.g. Near blast office entrance"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={styles.formLabel}>Items Present</Text>
          {KIT_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setForm((f) => ({ ...f, [item.key]: !f[item.key] }))}
              style={styles.checkRow}
            >
              <View style={[styles.checkbox, form[item.key] && styles.checkboxDone]}>
                {form[item.key] && <Ionicons name="checkmark" size={13} color="#ffffff" />}
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
                <Ionicons name={item.icon as any} size={16} color={theme.textSub} />
                <Text style={styles.checkLabel}>{item.label}</Text>
              </View>
            </Pressable>
          ))}

          <Text style={styles.formLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={form.notes}
            onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
            placeholder="e.g. Oxygen cylinder due for replacement next week"
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={3}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.formActions}>
            <Pressable onPress={cancel} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Kit'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {kits.length === 0 && editingId === null ? (
        <View style={styles.emptyCard}>
          <Ionicons name="medkit-outline" size={36} color={theme.textMuted} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyTitle}>No kits registered</Text>
          <Text style={styles.emptySub}>Tap "Add Kit" to register a first aid kit for a zone</Text>
        </View>
      ) : null}

      {kits.map((kit) => {
        const days = daysSince(kit.lastCheckedAt);
        const isOverdue = days === null || days >= 7;
        const isEditing = editingId === kit.id;

        return (
          <View key={kit.id} style={[styles.kitCard, isOverdue && styles.kitCardOverdue]}>
            <View style={styles.kitHeader}>
              <View>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 3 }}>
                <Ionicons name="location-outline" size={14} color={theme.textSub} />
                <Text style={styles.kitZone}>{kit.zone}</Text>
              </View>
                <Text style={styles.kitLocation}>{kit.location}</Text>
              </View>
              <View style={styles.kitHeaderRight}>
                <View style={[styles.stockBadge, kit.fullyStocked ? styles.stockBadgeOk : styles.stockBadgeLow]}>
                  <Text style={styles.stockBadgeText}>{kit.fullyStocked ? 'STOCKED' : 'MISSING ITEMS'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.itemsRow}>
              {KIT_ITEMS.map((item) => {
                const has = kit[item.key as keyof FirstAidKit] as boolean;
                return (
                  <View key={item.key} style={[styles.itemPill, has ? styles.itemPillOk : styles.itemPillMissing]}>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                      <Ionicons
                        name={has ? 'checkmark-circle' : 'close-circle'}
                        size={11}
                        color={has ? theme.success : theme.danger}
                      />
                      <Text style={[styles.itemPillText, has ? styles.itemPillTextOk : styles.itemPillTextMissing]}>
                        {item.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {kit.notes ? (
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                <Ionicons name="pencil-outline" size={12} color={theme.textSub} />
                <Text style={styles.kitNotes}>{kit.notes}</Text>
              </View>
            ) : null}

            <View style={styles.kitFooter}>
              <View style={[styles.checkedBadge, isOverdue && styles.checkedBadgeOverdue]}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                  <Ionicons
                    name={isOverdue || days === null ? 'warning-outline' : 'checkmark-circle'}
                    size={11}
                    color={isOverdue || days === null ? theme.amber : theme.success}
                  />
                  <Text style={[styles.checkedBadgeText, isOverdue && styles.checkedBadgeTextOverdue]}>
                    {days === null
                      ? 'Never checked'
                      : days === 0
                      ? 'Checked today'
                      : isOverdue
                      ? `Last checked ${days}d ago`
                      : `Checked ${days}d ago`}
                  </Text>
                </View>
              </View>
              {kit.lastCheckedBy ? (
                <Text style={styles.checkedBy}>by {kit.lastCheckedBy}</Text>
              ) : null}
              <View style={styles.kitActions}>
                {!isEditing && (
                  <>
                    <Pressable onPress={() => startEdit(kit)} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Update</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDelete(kit)} style={styles.deleteBtn}>
                      <Ionicons name="close" size={14} color={theme.danger} />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        );
      })}
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
    centered: { alignItems: 'center', backgroundColor: theme.bg, flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageHeader: { marginBottom: spacing.lg },
    pageTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900' },
    addBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
    pageSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.lg, paddingVertical: 14, ...cardShadow },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 24, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40, ...cardShadow },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    formCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg, ...cardShadow },
    formTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    formLabel: { color: theme.text, fontSize: 11, fontWeight: '800', marginBottom: 6, marginTop: spacing.md, textTransform: 'uppercase' },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, fontWeight: '600', paddingHorizontal: spacing.md, paddingVertical: 10 },
    inputDisabled: { color: theme.textMuted },
    inputMulti: { minHeight: 70, textAlignVertical: 'top' },
    checkRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
    checkbox: { alignItems: 'center', borderColor: theme.border, borderRadius: 5, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
    checkboxDone: { backgroundColor: theme.accent, borderColor: theme.accent },
    checkLabel: { color: theme.text, fontSize: 14, fontWeight: '600' },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700', marginTop: 10 },
    formActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
    cancelBtn: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 8, flex: 1, paddingVertical: spacing.md },
    cancelBtnText: { color: theme.textSub, fontSize: 14, fontWeight: '800' },
    saveBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 2, paddingVertical: spacing.md },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
    kitCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md, padding: 14, ...cardShadow },
    kitCardOverdue: { borderColor: theme.amber },
    kitHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
    kitZone: { color: theme.text, fontSize: 15, fontWeight: '900' },
    kitLocation: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    kitHeaderRight: { alignItems: 'flex-end' },
    stockBadge: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    stockBadgeOk: { backgroundColor: theme.successLight },
    stockBadgeLow: { backgroundColor: theme.dangerLight },
    stockBadgeText: { color: theme.textSub, fontSize: 10, fontWeight: '900' },
    itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    itemPill: { borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    itemPillOk: { backgroundColor: theme.successLight },
    itemPillMissing: { backgroundColor: theme.dangerLight },
    itemPillText: { fontSize: 11, fontWeight: '800' },
    itemPillTextOk: { color: theme.success },
    itemPillTextMissing: { color: theme.danger },
    kitNotes: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    kitFooter: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    checkedBadge: { backgroundColor: theme.successLight, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    checkedBadgeOverdue: { backgroundColor: theme.amberLight },
    checkedBadgeText: { color: theme.success, fontSize: 11, fontWeight: '800' },
    checkedBadgeTextOverdue: { color: theme.amber },
    checkedBy: { color: theme.textMuted, flex: 1, fontSize: 11, fontWeight: '600' },
    kitActions: { flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' },
    editBtn: { backgroundColor: theme.bgInput, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 5 },
    editBtnText: { color: theme.accent, fontSize: 12, fontWeight: '800' },
    deleteBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderRadius: 8, height: 30, justifyContent: 'center', width: 30 },
  });
}
