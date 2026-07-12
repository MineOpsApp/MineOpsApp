import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getMyProfile, updateMyProfile, parseApiError, type UserProfile } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const VERIF_STATUS: Record<string, { label: string; color: string }> = {
  VERIFIED: { label: 'Verified', color: '#1f6f5b' },
  PENDING_VERIFICATION: { label: 'Pending Review', color: '#a15c00' },
  REJECTED: { label: 'Rejected', color: '#b42318' },
};

function Row({ label, value, border, theme }: { label: string; value: string; border?: boolean; theme: Theme }) {
  return (
    <View style={[{ paddingHorizontal: 16, paddingVertical: 14 }, border && { borderTopColor: theme.bgInput, borderTopWidth: 1 }]}>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

export function BuyerProfileScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Business details edit state
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [goldbodLicense, setGoldbodLicense] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function load() {
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch { /* best-effort */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function openEdit() {
    setBusinessName(profile?.businessName ?? '');
    setGoldbodLicense(profile?.goldbodLicenseNumber ?? '');
    setSaveError('');
    setSaveSuccess(false);
    setEditingBusiness(true);
  }

  async function saveBusiness() {
    setSaveError('');
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        businessName: businessName.trim() || null,
        goldbodLicenseNumber: goldbodLicense.trim() || null,
      });
      setProfile(updated);
      setSaveSuccess(true);
      setEditingBusiness(false);
    } catch (e) {
      setSaveError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateStr; }
  }

  const verifKey = profile?.buyerVerificationStatus ?? '';
  const verif = VERIF_STATUS[verifKey] ?? (verifKey ? { label: verifKey, color: theme.textMuted } : null);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>My Profile</Text>

      {loading ? (
        <View style={styles.card}><Text style={styles.meta}>Loading...</Text></View>
      ) : (
        <>
          <View style={styles.card}>
            <Row label="Full Name" value={profile?.fullName ?? session.user.fullName} theme={theme} />
            <Row label="Email" value={profile?.email ?? session.user.email} border theme={theme} />
            <Row label="Account Type" value="Mineral Buyer" border theme={theme} />
            {profile?.createdAt ? <Row label="Member Since" value={formatDate(profile.createdAt)} border theme={theme} /> : null}
          </View>

          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.card}>
            {!editingBusiness ? (
              <>
                <Row label="Business Name" value={profile?.businessName ?? 'Not provided'} theme={theme} />
                <Row label="GoldBod License No." value={profile?.goldbodLicenseNumber ?? 'Not provided'} border theme={theme} />
                {saveSuccess && <Text style={styles.successText}>Saved.</Text>}
                <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
                  <Text style={styles.editBtnText}>Edit Business Details</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="e.g. Acme Minerals Ltd."
                  placeholderTextColor={theme.textMuted}
                />
                <Text style={styles.inputLabel}>GoldBod License Number</Text>
                <TextInput
                  style={styles.input}
                  value={goldbodLicense}
                  onChangeText={setGoldbodLicense}
                  placeholder="e.g. GB-T1-2025-00123"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="characters"
                />
                {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingBusiness(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={saveBusiness} disabled={saving}>
                    <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {verif ? (
            <>
              <Text style={styles.sectionTitle}>Verification Status</Text>
              <View style={[styles.verifCard, { borderColor: verif.color + '55' }]}>
                <View style={[styles.verifDot, { backgroundColor: verif.color }]} />
                <Text style={[styles.verifLabel, { color: verif.color }]}>{verif.label}</Text>
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 20 },
    sectionTitle: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, marginTop: 20, textTransform: 'uppercase' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    meta: { color: theme.textMuted, fontSize: 13, fontWeight: '600', padding: 16 },
    verifCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 16 },
    verifDot: { borderRadius: 6, height: 12, width: 12 },
    verifLabel: { fontSize: 15, fontWeight: '800' },
    editBtn: { margin: 16, marginTop: 4, alignSelf: 'flex-start', borderColor: theme.accent, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
    editBtnText: { color: theme.accent, fontSize: 13, fontWeight: '800' },
    inputLabel: { color: theme.textSub, fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 10, textTransform: 'uppercase' },
    input: { borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, fontWeight: '700', padding: 10 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, alignItems: 'center', borderColor: theme.border, borderRadius: 8, borderWidth: 1, padding: 12 },
    cancelBtnText: { color: theme.textSub, fontSize: 14, fontWeight: '800' },
    saveBtn: { flex: 1, alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, padding: 12 },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700', marginTop: 8 },
    successText: { color: theme.success, fontSize: 13, fontWeight: '700', marginHorizontal: 16, marginBottom: 4 },
  });
}
