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
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type DeductionMode = 'DEDUCT_FROM_PAY' | 'BILL_TO_MINE';

type Props = { session: AuthSession };

export function SupervisorInsuranceSettingsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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
        <ActivityIndicator size="large" color={theme.accent} />
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
            trackColor={{ false: theme.border, true: theme.accent }}
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
              placeholderTextColor={theme.textMuted}
            />
          </View>

          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Monthly Premium (GHS)</Text>
            <TextInput
              style={styles.input}
              value={premium}
              onChangeText={setPremium}
              placeholder="e.g. 25.00"
              placeholderTextColor={theme.textMuted}
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
                ? "Premium is deducted from each enrolled worker's net pay each cycle."
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
    container: { padding: 20, paddingBottom: 48, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 24, fontWeight: '900', marginBottom: 4 },
    subtitle: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: 20 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 16 },
    toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    toggleLabel: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
    toggleHint: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    fieldCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 16 },
    fieldLabel: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, padding: 12 },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    modeBtn: { borderColor: theme.border, borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: theme.bgInput },
    modeBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    modeBtnText: { color: theme.textSub, fontSize: 13, fontWeight: '800' },
    modeBtnTextActive: { color: '#fff' },
    modeHint: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700', marginBottom: 8 },
    successText: { color: theme.success, fontSize: 13, fontWeight: '700', marginBottom: 8 },
    saveBtn: { backgroundColor: theme.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  });
}
