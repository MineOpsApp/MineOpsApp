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
  if (/^0\d{9}$/.test(p)) return { valid: true, isForeign: false };
  if (/^\+233\d{9}$/.test(p)) return { valid: true, isForeign: false };
  if (/^\+(?!233)\d{7,14}$/.test(p)) return { valid: true, isForeign: true };
  return {
    valid: false,
    isForeign: false,
    error: 'Enter a valid Ghana number (e.g. 0244 123 456 or +233 24 123 456)',
  };
}

import { Ionicons } from '@expo/vector-icons';
import { getMyEmergencyContacts, saveEmergencyContact, deleteEmergencyContact } from '../../services/api';
import type { EmergencyContact } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

type FormState = {
  name: string;
  relationship: string;
  phone: string;
};

const EMPTY_FORM: FormState = { name: '', relationship: '', phone: '' };

export function WorkerEmergencyContactsScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const primaryContact = contacts.find((c) => c.contactType === 'PRIMARY');
  const backupContact = contacts.find((c) => c.contactType === 'BACKUP');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
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
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, flex: 1 }}>
                <Ionicons
                  name={type === 'PRIMARY' ? 'star' : 'disc-outline'}
                  size={14}
                  color={type === 'PRIMARY' ? theme.accent : theme.textMuted}
                />
                <Text style={styles.sectionTitle}>
                  {type === 'PRIMARY' ? 'Primary Contact' : 'Backup Contact'}
                </Text>
              </View>
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
                  placeholderTextColor={theme.textMuted}
                />
                <Text style={styles.formLabel}>Relationship *</Text>
                <TextInput
                  style={styles.input}
                  value={form.relationship}
                  onChangeText={(t) => setForm((f) => ({ ...f, relationship: t }))}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  placeholderTextColor={theme.textMuted}
                />
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={form.phone}
                  onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
                  placeholder="e.g. 0244 123 456"
                  placeholderTextColor={theme.textMuted}
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
                  <Ionicons name="close" size={16} color={theme.danger} />
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageHeader: { marginBottom: spacing.lg },
    pageTitle: { ...typography.h1, color: theme.text },
    pageSub: { ...typography.caption, color: theme.textMuted, marginTop: 2 },
    infoCard: { backgroundColor: theme.infoLight, borderColor: theme.info, borderRadius: 10, borderWidth: 1, marginBottom: spacing.xl, padding: 14 },
    infoText: { color: theme.info, fontSize: 13, fontWeight: '600', lineHeight: 19 },
    section: { marginBottom: spacing.lg },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.sm },
    sectionTitle: { ...typography.bodyBold, color: theme.text },
    editBtn: { backgroundColor: theme.bgInput, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 5 },
    editBtnText: { ...typography.bodyBold, color: theme.accent, fontSize: 13 },
    contactCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: 14 },
    contactAvatar: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
    contactAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
    contactBody: { flex: 1 },
    contactName: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    contactMeta: { ...typography.caption, color: theme.textMuted, fontWeight: '700', marginBottom: 2 },
    contactPhone: { ...typography.bodyBold, color: theme.accent },
    deleteBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
    addCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1.5, flexDirection: 'row', gap: 10, padding: spacing.lg },
    addIcon: { color: theme.accent, fontSize: 22, fontWeight: '300' },
    addLabel: { ...typography.bodyBold, color: theme.accent },
    formCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: spacing.lg },
    formLabel: { ...typography.label, color: theme.text, marginBottom: 6, marginTop: 10 },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, fontWeight: '600', paddingHorizontal: spacing.md, paddingVertical: 10 },
    inputHint: { ...typography.label, color: theme.textMuted, marginTop: 4, textTransform: 'none' as const },
    errorText: { ...typography.bodyBold, color: theme.danger, marginTop: 10 },
    formActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
    cancelBtn: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 8, flex: 1, paddingVertical: spacing.md },
    cancelBtnText: { ...typography.bodyBold, color: theme.textSub },
    saveBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 2, paddingVertical: spacing.md },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { ...typography.bodyBold, color: '#ffffff' },
  });
}
