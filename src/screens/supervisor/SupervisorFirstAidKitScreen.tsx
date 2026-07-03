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

type Props = { session: AuthSession };

type ItemKey = 'hasBandages' | 'hasGloves' | 'hasAntiseptic' | 'hasOxygen' | 'hasStretcher';

const KIT_ITEMS: { key: ItemKey; label: string; icon: string }[] = [
  { key: 'hasBandages',   label: 'Bandages & Dressings', icon: '🩹' },
  { key: 'hasGloves',     label: 'Medical Gloves',        icon: '🧤' },
  { key: 'hasAntiseptic', label: 'Antiseptic Solution',   icon: '🧴' },
  { key: 'hasOxygen',     label: 'Oxygen Cylinder',       icon: '⚗️' },
  { key: 'hasStretcher',  label: 'Stretcher',             icon: '🛏️' },
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
    return <View style={styles.centered}><ActivityIndicator color="#1f6f5b" /></View>;
  }

  const stockedCount = kits.filter((k) => k.fullyStocked).length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
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
            <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>{stockedCount}</Text>
            <Text style={styles.stripLabel}>Fully Stocked</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, kits.length - stockedCount > 0 ? { color: '#b42318' } : {}]}>
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
            placeholderTextColor="#8fa3b8"
            editable={editingId === 'new'}
          />

          <Text style={styles.formLabel}>Kit Location *</Text>
          <TextInput
            style={styles.input}
            value={form.location}
            onChangeText={(t) => setForm((f) => ({ ...f, location: t }))}
            placeholder="e.g. Near blast office entrance"
            placeholderTextColor="#8fa3b8"
          />

          <Text style={styles.formLabel}>Items Present</Text>
          {KIT_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setForm((f) => ({ ...f, [item.key]: !f[item.key] }))}
              style={styles.checkRow}
            >
              <View style={[styles.checkbox, form[item.key] && styles.checkboxDone]}>
                {form[item.key] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>{item.icon} {item.label}</Text>
            </Pressable>
          ))}

          <Text style={styles.formLabel}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={form.notes}
            onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))}
            placeholder="e.g. Oxygen cylinder due for replacement next week"
            placeholderTextColor="#8fa3b8"
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
          <Text style={styles.emptyIcon}>🩺</Text>
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
                <Text style={styles.kitZone}>📍 {kit.zone}</Text>
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
                    <Text style={[styles.itemPillText, has ? styles.itemPillTextOk : styles.itemPillTextMissing]}>
                      {has ? '✓' : '✗'} {item.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {kit.notes ? <Text style={styles.kitNotes}>📝 {kit.notes}</Text> : null}

            <View style={styles.kitFooter}>
              <View style={[styles.checkedBadge, isOverdue && styles.checkedBadgeOverdue]}>
                <Text style={[styles.checkedBadgeText, isOverdue && styles.checkedBadgeTextOverdue]}>
                  {days === null
                    ? '⚠ Never checked'
                    : days === 0
                    ? '✓ Checked today'
                    : isOverdue
                    ? `⚠ Last checked ${days}d ago`
                    : `✓ Checked ${days}d ago`}
                </Text>
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
                      <Text style={styles.deleteBtnText}>✕</Text>
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

const styles = StyleSheet.create({
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { marginBottom: 16 },
  pageTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  addBtn: { backgroundColor: '#1f6f5b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  pageSub: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  strip: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingVertical: 14 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 24, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  formCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  formTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  formLabel: { color: '#17212b', fontSize: 11, fontWeight: '800', marginBottom: 6, marginTop: 12, textTransform: 'uppercase' },
  input: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10 },
  inputDisabled: { color: '#8fa3b8' },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  checkRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 8 },
  checkbox: { alignItems: 'center', borderColor: '#d1d5db', borderRadius: 5, borderWidth: 2, height: 24, justifyContent: 'center', width: 24 },
  checkboxDone: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  checkmark: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  checkLabel: { color: '#17212b', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#b42318', fontSize: 13, fontWeight: '700', marginTop: 10 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { alignItems: 'center', backgroundColor: '#f4f6f8', borderRadius: 8, flex: 1, paddingVertical: 12 },
  cancelBtnText: { color: '#5d6875', fontSize: 14, fontWeight: '800' },
  saveBtn: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 8, flex: 2, paddingVertical: 12 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  kitCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
  kitCardOverdue: { borderColor: '#fcd34d' },
  kitHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  kitZone: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 3 },
  kitLocation: { color: '#5d6875', fontSize: 12, fontWeight: '600' },
  kitHeaderRight: { alignItems: 'flex-end' },
  stockBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  stockBadgeOk: { backgroundColor: '#f0fdf4' },
  stockBadgeLow: { backgroundColor: '#fff5f5' },
  stockBadgeText: { fontSize: 10, fontWeight: '900', color: '#5d6875' },
  itemsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  itemPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  itemPillOk: { backgroundColor: '#f0fdf4' },
  itemPillMissing: { backgroundColor: '#fff5f5' },
  itemPillText: { fontSize: 11, fontWeight: '800' },
  itemPillTextOk: { color: '#15803d' },
  itemPillTextMissing: { color: '#b42318' },
  kitNotes: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginBottom: 10 },
  kitFooter: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  checkedBadge: { backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  checkedBadgeOverdue: { backgroundColor: '#fffbeb' },
  checkedBadgeText: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  checkedBadgeTextOverdue: { color: '#92400e' },
  checkedBy: { color: '#8fa3b8', flex: 1, fontSize: 11, fontWeight: '600' },
  kitActions: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  editBtn: { backgroundColor: '#f4f6f8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  editBtnText: { color: '#1f6f5b', fontSize: 12, fontWeight: '800' },
  deleteBtn: { alignItems: 'center', backgroundColor: '#fff5f5', borderRadius: 8, height: 30, justifyContent: 'center', width: 30 },
  deleteBtnText: { color: '#b42318', fontSize: 12, fontWeight: '900' },
});
