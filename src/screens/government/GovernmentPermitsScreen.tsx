import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getGovernmentPermits, type MiningPermitStatus } from '../../services/api';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

function Check({ done, theme }: { done: boolean | null; theme: Theme }) {
  return <Text style={{ color: done ? theme.success : theme.danger, fontWeight: '900', fontSize: 14 }}>{done ? '✓' : '✗'}</Text>;
}

function ministerialColor(s: string | null) {
  if (s === 'APPROVED') return '#15803d';
  if (s === 'REJECTED') return '#b42318';
  if (s === 'PENDING') return '#92400e';
  return '#8fa3b8';
}

export function GovernmentPermitsScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [permits, setPermits] = useState<MiningPermitStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try { setPermits(await getGovernmentPermits()); } catch { /* best-effort */ }
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Mining Permit Status</Text>
      <Text style={styles.sub}>Self-reported Minerals Commission permit progress per site</Text>
      {permits.length === 0 && <Text style={styles.empty}>No sites have reported permit status yet.</Text>}
      {permits.map(p => (
        <View key={p.id ?? p.site} style={styles.card}>
          <Text style={styles.siteName}>{p.site}</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}><Check done={p.applicationSubmitted} theme={theme} /><Text style={styles.gridLabel}>Application submitted</Text></View>
            <View style={styles.gridItem}><Check done={p.communityNotificationDone} theme={theme} /><Text style={styles.gridLabel}>Community notified</Text></View>
            <View style={styles.gridItem}><Check done={p.epaPermitObtained} theme={theme} /><Text style={styles.gridLabel}>EPA permit obtained</Text></View>
            <View style={styles.gridItem}>
              <Text style={[styles.ministerial, { color: ministerialColor(p.ministerialReviewStatus) }]}>
                {p.ministerialReviewStatus ?? 'Not set'}
              </Text>
              <Text style={styles.gridLabel}>Ministerial review</Text>
            </View>
          </View>
          {p.updatedByEmail && (
            <Text style={styles.meta}>Updated by {p.updatedByEmail}</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    sub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 16 },
    empty: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 40 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 14 },
    siteName: { color: theme.accent, fontSize: 14, fontWeight: '900', marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
    gridItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '45%' },
    gridLabel: { color: theme.textSub, fontSize: 12, fontWeight: '600', flex: 1 },
    ministerial: { fontSize: 12, fontWeight: '900' },
    meta: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
  });
}
