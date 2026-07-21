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

  // Extended buyer profile state
  const [editingExtended, setEditingExtended] = useState(false);
  const [companyRegNum, setCompanyRegNum] = useState('');
  const [countryOfIncorp, setCountryOfIncorp] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [exportLicenceNumber, setExportLicenceNumber] = useState('');
  const [operatingJurisdiction, setOperatingJurisdiction] = useState('');
  const [mineralsOfInterest, setMineralsOfInterest] = useState('');
  const [typicalOrderVolume, setTypicalOrderVolume] = useState('');
  const [preferredTxMethod, setPreferredTxMethod] = useState('');
  const [savingExtended, setSavingExtended] = useState(false);
  const [saveExtendedError, setSaveExtendedError] = useState('');
  const [saveExtendedSuccess, setSaveExtendedSuccess] = useState(false);

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

  function openExtendedEdit() {
    setCompanyRegNum((profile as any)?.companyRegistrationNumber ?? '');
    setCountryOfIncorp((profile as any)?.countryOfIncorporation ?? '');
    setBusinessType((profile as any)?.businessType ?? '');
    setPositionTitle((profile as any)?.positionTitle ?? '');
    setExportLicenceNumber((profile as any)?.exportLicenceNumber ?? '');
    setOperatingJurisdiction((profile as any)?.operatingJurisdiction ?? '');
    setMineralsOfInterest((profile as any)?.mineralsOfInterest ?? '');
    setTypicalOrderVolume((profile as any)?.typicalOrderVolume ?? '');
    setPreferredTxMethod((profile as any)?.preferredTransactionMethod ?? '');
    setSaveExtendedError('');
    setSaveExtendedSuccess(false);
    setEditingExtended(true);
  }

  async function saveExtended() {
    setSaveExtendedError('');
    setSavingExtended(true);
    try {
      const updated = await updateMyProfile({
        companyRegistrationNumber: companyRegNum.trim() || null,
        countryOfIncorporation: countryOfIncorp.trim() || null,
        businessType: businessType || null,
        positionTitle: positionTitle.trim() || null,
        exportLicenceNumber: exportLicenceNumber.trim() || null,
        operatingJurisdiction: operatingJurisdiction.trim() || null,
        mineralsOfInterest: mineralsOfInterest.trim() || null,
        typicalOrderVolume: typicalOrderVolume.trim() || null,
        preferredTransactionMethod: preferredTxMethod || null,
      } as any);
      setProfile(updated);
      setSaveExtendedSuccess(true);
      setEditingExtended(false);
    } catch (e) {
      setSaveExtendedError(parseApiError(e));
    } finally {
      setSavingExtended(false);
    }
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

          <Text style={styles.sectionTitle}>Extended Buyer Profile</Text>
          <View style={styles.card}>
            {!editingExtended ? (
              <>
                <Row label="Company Reg. Number" value={(profile as any)?.companyRegistrationNumber ?? 'Not provided'} theme={theme} />
                <Row label="Country of Incorporation" value={(profile as any)?.countryOfIncorporation ?? 'Not provided'} border theme={theme} />
                <Row label="Business Type" value={(profile as any)?.businessType ?? 'Not provided'} border theme={theme} />
                <Row label="Position / Title" value={(profile as any)?.positionTitle ?? 'Not provided'} border theme={theme} />
                <Row label="Export Licence Number" value={(profile as any)?.exportLicenceNumber ?? 'Not provided'} border theme={theme} />
                <Row label="Operating Jurisdiction" value={(profile as any)?.operatingJurisdiction ?? 'Not provided'} border theme={theme} />
                <Row label="Minerals of Interest" value={(profile as any)?.mineralsOfInterest ?? 'Not provided'} border theme={theme} />
                <Row label="Typical Order Volume" value={(profile as any)?.typicalOrderVolume ?? 'Not provided'} border theme={theme} />
                <Row label="Preferred Payment Method" value={(profile as any)?.preferredTransactionMethod ?? 'Not provided'} border theme={theme} />
                {saveExtendedSuccess && <Text style={styles.successText}>Saved.</Text>}
                <TouchableOpacity style={styles.editBtn} onPress={openExtendedEdit}>
                  <Text style={styles.editBtnText}>Edit Buyer Details</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ padding: 16 }}>
                {([
                  { label: 'Company Reg. Number', value: companyRegNum, setter: setCompanyRegNum, placeholder: 'e.g. GH-12345' },
                  { label: 'Country of Incorporation', value: countryOfIncorp, setter: setCountryOfIncorp, placeholder: 'e.g. Ghana' },
                  { label: 'Position / Title', value: positionTitle, setter: setPositionTitle, placeholder: 'e.g. Director' },
                  { label: 'Export Licence Number', value: exportLicenceNumber, setter: setExportLicenceNumber, placeholder: 'If applicable' },
                  { label: 'Operating Jurisdiction', value: operatingJurisdiction, setter: setOperatingJurisdiction, placeholder: 'Countries / regions' },
                  { label: 'Minerals of Interest', value: mineralsOfInterest, setter: setMineralsOfInterest, placeholder: 'e.g. Gold, Bauxite' },
                  { label: 'Typical Order Volume', value: typicalOrderVolume, setter: setTypicalOrderVolume, placeholder: 'e.g. 50–200 kg per order' },
                ] as { label: string; value: string; setter: (v: string) => void; placeholder: string }[]).map(f => (
                  <View key={f.label}>
                    <Text style={styles.inputLabel}>{f.label}</Text>
                    <TextInput style={styles.input} value={f.value} onChangeText={f.setter} placeholder={f.placeholder} placeholderTextColor={theme.textMuted} />
                  </View>
                ))}

                <Text style={styles.inputLabel}>Business Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {['MINING_COMPANY', 'TRADING_COMPANY', 'INDIVIDUAL_INVESTOR', 'EXPORT_COMPANY'].map(bt => (
                    <TouchableOpacity key={bt} onPress={() => setBusinessType(bt)}
                      style={{ borderColor: businessType === bt ? theme.accent : theme.border, borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: businessType === bt ? theme.accentLight : undefined }}>
                      <Text style={{ color: businessType === bt ? theme.accent : theme.textSub, fontSize: 12, fontWeight: '800' }}>{bt.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Preferred Payment Method</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  {['ESCROW', 'BANK_TRANSFER', 'OTHER'].map(m => (
                    <TouchableOpacity key={m} onPress={() => setPreferredTxMethod(m)}
                      style={{ borderColor: preferredTxMethod === m ? theme.accent : theme.border, borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: preferredTxMethod === m ? theme.accentLight : undefined }}>
                      <Text style={{ color: preferredTxMethod === m ? theme.accent : theme.textSub, fontSize: 12, fontWeight: '800' }}>{m.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {saveExtendedError ? <Text style={styles.errorText}>{saveExtendedError}</Text> : null}
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingExtended(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, savingExtended && { opacity: 0.5 }]} onPress={saveExtended} disabled={savingExtended}>
                    <Text style={styles.saveBtnText}>{savingExtended ? 'Saving…' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
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
