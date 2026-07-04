import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getSites, updateInsuranceConfig } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type DeductionMode = 'DEDUCT_FROM_PAY' | 'BILL_TO_MINE';

type Props = { session: AuthSession };

export function SupervisorInsuranceSettingsScreen({ session }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [enabled, setEnabled] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [premium, setPremium] = useState('');
  const [deductionMode, setDeductionMode] = useState<DeductionMode>('DEDUCT_FROM_PAY');

  useEffect(() => {
    getSites()
      .then((sites) => {
        const mine = sites.find(
          (s) => s.name?.toLowerCase() === session.user.assignedSite?.toLowerCase()
        );
        if (mine) {
          setEnabled(mine.insuranceEnabled ?? false);
          setProviderName(mine.insuranceProviderName ?? '');
          setPremium(mine.insurancePremium != null ? String(mine.insurancePremium) : '');
          setDeductionMode((mine.insuranceDeductionMode as DeductionMode) ?? 'DEDUCT_FROM_PAY');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    const premiumNum = premium.trim() ? parseFloat(premium.trim()) : null;
    if (premium.trim() && (isNaN(premiumNum!) || premiumNum! < 0)) {
      setError('Premium must be a positive number.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateInsuranceConfig({
        insuranceEnabled: enabled,
        insuranceProviderName: providerName.trim() || undefined,
        insurancePremium: premiumNum,
        insuranceDeductionMode: deductionMode,
      });
      setSuccess('Insurance settings saved.');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1f6f5b" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Insurance Settings</Text>
      <Text style={styles.subtitle}>Configure worker insurance for {session.user.assignedSite}</Text>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Enable worker insurance</Text>
            <Text style={styles.toggleHint}>Workers can enrol once this is on</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: '#dde3ea', true: '#1f6f5b' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {enabled ? (
        <>
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Insurance Provider</Text>
            <TextInput
              style={styles.input}
              value={providerName}
              onChangeText={setProviderName}
              placeholder="e.g. SafeMine Insurance Ltd"
              placeholderTextColor="#9aa5b1"
            />
          </View>

          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Monthly Premium (GHS)</Text>
            <TextInput
              style={styles.input}
              value={premium}
              onChangeText={setPremium}
              placeholder="e.g. 25.00"
              placeholderTextColor="#9aa5b1"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Deduction Mode</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeBtn, deductionMode === 'DEDUCT_FROM_PAY' && styles.modeBtnActive]}
                onPress={() => setDeductionMode('DEDUCT_FROM_PAY')}
              >
                <Text style={[styles.modeBtnText, deductionMode === 'DEDUCT_FROM_PAY' && styles.modeBtnTextActive]}>
                  Deduct from pay
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, deductionMode === 'BILL_TO_MINE' && styles.modeBtnActive]}
                onPress={() => setDeductionMode('BILL_TO_MINE')}
              >
                <Text style={[styles.modeBtnText, deductionMode === 'BILL_TO_MINE' && styles.modeBtnTextActive]}>
                  Bill to mine
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modeHint}>
              {deductionMode === 'DEDUCT_FROM_PAY'
                ? 'Premium is deducted from each enrolled worker\'s net pay each cycle.'
                : 'Mine covers the premium — no deduction from worker pay.'}
            </Text>
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>{success}</Text> : null}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={save}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  container: { padding: 20, paddingBottom: 48, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 24, fontWeight: '900', marginBottom: 4 },
  subtitle: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 16 },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  toggleLabel: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  toggleHint: { color: '#9aa5b1', fontSize: 12, fontWeight: '600' },
  fieldCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 16 },
  fieldLabel: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: { backgroundColor: '#f4f6f8', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, padding: 12 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeBtn: { borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f4f6f8' },
  modeBtnActive: { backgroundColor: '#1f6f5b', borderColor: '#1f6f5b' },
  modeBtnText: { color: '#5d6875', fontSize: 13, fontWeight: '800' },
  modeBtnTextActive: { color: '#fff' },
  modeHint: { color: '#9aa5b1', fontSize: 12, fontWeight: '600' },
  errorText: { color: '#b42318', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  successText: { color: '#1f7a4d', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  saveBtn: { backgroundColor: '#1f6f5b', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
