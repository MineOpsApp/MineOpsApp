import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { deleteMyAccount, exportMyData, parseApiError } from '../../services/api';
import { exportAndShareJson } from '../../utils/exportCsv';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { onAccountDeleted: () => void };

export function DataPrivacyScreen({ onAccountDeleted }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportMyData();
      await exportAndShareJson('mineops-my-data.json', JSON.stringify(data, null, 2));
    } catch (e) {
      Alert.alert('Export failed', parseApiError(e));
    } finally {
      setExporting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, contact details, and login access. Safety and operational records tied to your reports are kept for site compliance, as explained in the Privacy Policy. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => setShowDeleteModal(true) },
      ]
    );
  }

  async function handleDelete() {
    if (!password.trim()) { Alert.alert('Password required', 'Enter your password to confirm.'); return; }
    setDeleting(true);
    try {
      await deleteMyAccount(password);
      setShowDeleteModal(false);
      onAccountDeleted();
    } catch (e) {
      Alert.alert('Could not delete account', parseApiError(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Data & Privacy</Text>
      <Text style={styles.pageSub}>Export your data or delete your account</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Export Your Data</Text>
        <Text style={styles.cardDesc}>
          Download a copy of your profile and the reports, checklists, and records tied to your account.
        </Text>
        <Pressable onPress={handleExport} disabled={exporting} style={[styles.exportBtn, exporting && styles.btnDisabled]}>
          <Text style={styles.exportBtnText}>{exporting ? 'Preparing…' : 'Download My Data'}</Text>
        </Pressable>
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.dangerTitle}>⚠️ Delete Your Account</Text>
        <Text style={styles.cardDesc}>
          Permanently removes your profile, contact details, and login access. Safety and operational records tied to your past reports are retained for site compliance — see the Privacy Policy for details. This cannot be undone.
        </Text>
        <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </Pressable>
      </View>

      <Modal visible={showDeleteModal} animationType="slide" transparent onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalSub}>Enter your password to permanently delete your account.</Text>
            <TextInput
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              style={styles.modalInput}
              autoCapitalize="none"
            />
            <View style={styles.modalRow}>
              <Pressable onPress={() => { setShowDeleteModal(false); setPassword(''); }} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleDelete} disabled={deleting} style={[styles.modalDeleteBtn, deleting && styles.btnDisabled]}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalDeleteText}>Delete</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
    pageSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 20 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 8 },
    cardDesc: { color: theme.textSub, fontSize: 13, fontWeight: '500', lineHeight: 19, marginBottom: 14 },
    exportBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 12 },
    exportBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
    btnDisabled: { opacity: 0.6 },
    dangerCard: { borderColor: theme.danger },
    dangerTitle: { color: theme.danger, fontSize: 15, fontWeight: '900', marginBottom: 8 },
    deleteBtn: { alignItems: 'center', backgroundColor: theme.danger, borderRadius: 10, paddingVertical: 12 },
    deleteBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: theme.bgCard, borderRadius: 14, padding: 20, width: '100%' },
    modalTitle: { color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 6 },
    modalSub: { color: theme.textSub, fontSize: 13, fontWeight: '500', marginBottom: 16, lineHeight: 18 },
    modalInput: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, marginBottom: 16, minHeight: 46, paddingHorizontal: 12 },
    modalRow: { flexDirection: 'row', gap: 10 },
    modalCancelBtn: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 10, flex: 1, paddingVertical: 12 },
    modalCancelText: { color: theme.textSub, fontSize: 14, fontWeight: '800' },
    modalDeleteBtn: { alignItems: 'center', backgroundColor: theme.danger, borderRadius: 10, flex: 1, paddingVertical: 12 },
    modalDeleteText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  });
}
