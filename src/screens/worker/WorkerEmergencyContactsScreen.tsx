import { useState, useEffect, useCallback } from 'react';
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

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

type PhoneCheck = { valid: boolean; isForeign: boolean; error?: string };

function validatePhone(raw: string): PhoneCheck {
  const p = normalizePhone(raw);
  // Ghana local: 0 + 9 digits
  if (/^0\d{9}$/.test(p)) return { valid: true, isForeign: false };
  // Ghana international: +233 + 9 digits
  if (/^\+233\d{9}$/.test(p)) return { valid: true, isForeign: false };
  // Foreign international: + country code (not +233) + 7–14 digits
  if (/^\+(?!233)\d{7,14}$/.test(p)) return { valid: true, isForeign: true };
  return {
    valid: false,
    isForeign: false,
    error: 'Enter a valid Ghana number (e.g. 0244 123 456 or +233 24 123 456)',
  };
}

import { getMyEmergencyContacts, saveEmergencyContact, deleteEmergencyContact } from '../../services/api';
import type { EmergencyContact } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

type FormState = {
  name: string;
  relationship: string;
  phone: string;
};

const EMPTY_FORM: FormState = { name: '', relationship: '', phone: '' };

export function WorkerEmergencyContactsScreen({ session: _ }: Props) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingType, setEditingType] = useState<'PRIMARY' | 'BACKUP' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() =>
    getMyEmergencyContacts()
      .then(setContacts)
      .catch(() => {}),
  []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function startEdit(type: 'PRIMARY' | 'BACKUP') {
    const existing = contacts.find((c) => c.contactType === type);
    setForm(existing ? { name: existing.name, relationship: existing.relationship, phone: existing.phone } : EMPTY_FORM);
    setEditingType(type);
    setError('');
  }

  function cancelEdit() {
    setEditingType(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function doSave() {
    if (!editingType) return;
    setSaving(true);
    setError('');
    try {
      await saveEmergencyContact({
        contactType: editingType,
        name: form.name.trim(),
        relationship: form.relationship.trim(),
        phone: form.phone.trim(),
      });
      await load();
      cancelEdit();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (!editingType) return;
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.relationship.trim()) { setError('Relationship is required'); return; }
    if (!form.phone.trim()) { setError('Phone number is required'); return; }

    const check = validatePhone(form.phone);
    if (!check.valid) { setError(check.error!); return; }

    if (check.isForeign) {
      Alert.alert(
        'Foreign Number Detected',
        `${normalizePhone(form.phone)} looks like an international number outside Ghana. Add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Anyway', onPress: doSave },
        ]
      );
      return;
    }

    doSave();
  }

  function handleDelete(contact: EmergencyContact) {
    Alert.alert(
      'Delete Contact',
      `Remove ${contact.name} as your ${contact.contactType.toLowerCase()} emergency contact?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmergencyContact(contact.id);
              await load();
            } catch {
              Alert.alert('Error', 'Could not delete contact. Try again.');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#1f6f5b" />
      </View>
    );
  }

  const primaryContact = contacts.find((c) => c.contactType === 'PRIMARY');
  const backupContact = contacts.find((c) => c.contactType === 'BACKUP');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Emergency Contacts</Text>
        <Text style={styles.pageSub}>Up to 2 contacts · Primary and Backup</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          These contacts will be accessible to your supervisor in case of an emergency on site.
        </Text>
      </View>

      {(['PRIMARY', 'BACKUP'] as const).map((type) => {
        const contact = type === 'PRIMARY' ? primaryContact : backupContact;
        const isEditing = editingType === type;

        return (
          <View key={type} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {type === 'PRIMARY' ? '★ Primary Contact' : '◎ Backup Contact'}
              </Text>
              {contact && !isEditing && (
                <Pressable onPress={() => startEdit(type)} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
              )}
            </View>

            {isEditing ? (
              <View style={styles.formCard}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                  placeholder="e.g. Jane Doe"
                  placeholderTextColor="#8fa3b8"
                />
                <Text style={styles.formLabel}>Relationship *</Text>
                <TextInput
                  style={styles.input}
                  value={form.relationship}
                  onChangeText={(t) => setForm((f) => ({ ...f, relationship: t }))}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  placeholderTextColor="#8fa3b8"
                />
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
                  placeholder="e.g. 0244 123 456"
                  placeholderTextColor="#8fa3b8"
                  keyboardType="phone-pad"
                />
                <Text style={styles.inputHint}>Ghana: 0244 123 456 or +233 24 123 456 · 10 digits max</Text>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <View style={styles.formActions}>
                  <Pressable onPress={cancelEdit} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleSave} style={[styles.saveBtn, saving && styles.saveBtnDisabled]} disabled={saving}>
                    <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Contact'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : contact ? (
              <View style={styles.contactCard}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.contactBody}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactMeta}>{contact.relationship}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <Pressable onPress={() => handleDelete(contact)} style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => startEdit(type)} style={styles.addCard}>
                <Text style={styles.addIcon}>+</Text>
                <Text style={styles.addLabel}>Add {type === 'PRIMARY' ? 'Primary' : 'Backup'} Contact</Text>
              </Pressable>
            )}
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
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  pageSub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginTop: 2 },
  infoCard: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderRadius: 10, borderWidth: 1, marginBottom: 20, padding: 14 },
  infoText: { color: '#1d4ed8', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  section: { marginBottom: 16 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  sectionTitle: { color: '#17212b', flex: 1, fontSize: 14, fontWeight: '900' },
  editBtn: { backgroundColor: '#f4f6f8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  editBtnText: { color: '#1f6f5b', fontSize: 13, fontWeight: '800' },
  contactCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  contactAvatar: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  contactAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  contactBody: { flex: 1 },
  contactName: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  contactMeta: { color: '#8fa3b8', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  contactPhone: { color: '#1f6f5b', fontSize: 14, fontWeight: '800' },
  deleteBtn: { alignItems: 'center', backgroundColor: '#fff5f5', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  deleteBtnText: { color: '#b42318', fontSize: 13, fontWeight: '900' },
  addCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1.5, flexDirection: 'row', gap: 10, padding: 16 },
  addIcon: { color: '#1f6f5b', fontSize: 22, fontWeight: '300' },
  addLabel: { color: '#1f6f5b', fontSize: 14, fontWeight: '800' },
  formCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 16 },
  formLabel: { color: '#17212b', fontSize: 12, fontWeight: '800', marginBottom: 6, marginTop: 10, textTransform: 'uppercase' },
  input: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10 },
  inputHint: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 4 },
  errorText: { color: '#b42318', fontSize: 13, fontWeight: '700', marginTop: 10 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { backgroundColor: '#f4f6f8', borderRadius: 8, flex: 1, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#5d6875', fontSize: 14, fontWeight: '800' },
  saveBtn: { backgroundColor: '#1f6f5b', borderRadius: 8, flex: 2, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
});
