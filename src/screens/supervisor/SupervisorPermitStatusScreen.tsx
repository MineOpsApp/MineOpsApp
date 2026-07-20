import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMyPermitStatus, updatePermitStatus, type MiningPermitStatus, parseApiError } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const MINISTERIAL_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED'];

function Toggle({ label, value, onChange, theme }: { label: string; value: boolean; onChange: (v: boolean) => void; theme: Theme }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={[
        { alignItems: 'center', backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 6, borderWidth: 1.5, height: 32, justifyContent: 'center', width: 32 },
        value && { backgroundColor: theme.accent, borderColor: theme.accent },
      ]}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>{value ? '✓' : '✗'}</Text>
      </View>
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700', flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function SupervisorPermitStatusScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [permit, setPermit] = useState<MiningPermitStatus | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyPermitStatus().then(setPermit).catch(() => {});
  }, []);

  async function handleSave() {
    if (!permit) return;
    setSaving(true);
    try {
      const updated = await updatePermitStatus({
        applicationSubmitted: permit.applicationSubmitted,
        communityNotificationDone: permit.communityNotificationDone,
        ministerialReviewStatus: permit.ministerialReviewStatus ?? undefined,
        epaPermitObtained: permit.epaPermitObtained,
      });
      setPermit(updated);
      Alert.alert('Saved', 'Permit status updated.');
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    } finally {
      setSaving(false);
    }
  }

  if (!permit) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mining Permit Status</Text>
        <Text style={styles.meta}>Loading…</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mining Permit Status</Text>
      <Text style={styles.sub}>Self-reported Minerals Commission permit progress for {permit.site}</Text>

      <View style={styles.card}>
        <Toggle
          label="Application submitted to Minerals Commission"
          value={!!permit.applicationSubmitted}
          onChange={v => setPermit(p => p ? { ...p, applicationSubmitted: v } : p)}
          theme={theme}
        />
        <Toggle
          label="Community / traditional authority notified"
          value={!!permit.communityNotificationDone}
          onChange={v => setPermit(p => p ? { ...p, communityNotificationDone: v } : p)}
          theme={theme}
        />
        <Toggle
          label="EPA environmental permit obtained"
          value={!!permit.epaPermitObtained}
          onChange={v => setPermit(p => p ? { ...p, epaPermitObtained: v } : p)}
          theme={theme}
        />

        <Text style={styles.fieldLabel}>Ministerial Review Decision</Text>
        <View style={styles.pillRow}>
          {MINISTERIAL_OPTIONS.map(opt => (
            <Pressable
              key={opt}
              onPress={() => setPermit(p => p ? { ...p, ministerialReviewStatus: opt } : p)}
              style={[styles.pill, permit.ministerialReviewStatus === opt && styles.pillActive]}
            >
              <Text style={[styles.pillText, permit.ministerialReviewStatus === opt && styles.pillActiveText]}>{opt}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setPermit(p => p ? { ...p, ministerialReviewStatus: null } : p)}
            style={[styles.pill, !permit.ministerialReviewStatus && styles.pillActive]}
          >
            <Text style={[styles.pillText, !permit.ministerialReviewStatus && styles.pillActiveText]}>Not set</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Status'}</Text>
      </Pressable>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          This is an internal self-reported record only. It does not automatically notify the Minerals Commission or EPA.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    sub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 16 },
    meta: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: 16, marginBottom: 16, gap: 14 },
    fieldLabel: { color: theme.textSub, fontSize: 12, fontWeight: '800', marginBottom: 6 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { borderColor: theme.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
    pillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    pillText: { color: theme.textSub, fontSize: 12, fontWeight: '800' },
    pillActiveText: { color: '#fff' },
    saveBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 14, marginBottom: 14 },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    infoBox: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 8, borderWidth: 1, padding: 12 },
    infoText: { color: theme.amber, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  });
}
