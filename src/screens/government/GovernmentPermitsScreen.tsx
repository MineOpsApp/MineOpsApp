import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGovernmentPermits, type MiningPermitStatus } from '../../services/api';
import { InputField } from '../../components/InputField';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

function Check({ done, theme }: { done: boolean | null; theme: Theme }) {
  return <Ionicons name={done ? 'checkmark-circle' : 'close-circle'} size={16} color={done ? theme.success : theme.danger} />;
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
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [permits, setPermits] = useState<MiningPermitStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    try { setPermits(await getGovernmentPermits()); } catch { /* best-effort */ }
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const visible = search.trim()
    ? permits.filter(p => p.site.toLowerCase().includes(search.trim().toLowerCase()))
    : permits;

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Mining Permit Status</Text>
      <Text style={styles.sub}>Self-reported Minerals Commission permit progress per site</Text>

      <InputField
        label=""
        value={search}
        onChangeText={setSearch}
        placeholder="Search by site name..."
      />

      {permits.length === 0 && <Text style={styles.empty}>No sites have reported permit status yet.</Text>}
      {permits.length > 0 && visible.length === 0 && (
        <Text style={styles.empty}>No sites match "{search.trim()}"</Text>
      )}
      {visible.map(p => (
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

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { padding: spacing.xl, paddingBottom: 40, backgroundColor: theme.bg },
    title: { ...typography.h2, color: theme.text, marginBottom: 2 },
    sub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: spacing.md },
    empty: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 40 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: spacing.md, padding: 14, ...cardShadow },
    siteName: { color: theme.accent, fontSize: 14, fontWeight: '900', marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
    gridItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '45%' },
    gridLabel: { color: theme.textSub, fontSize: 12, fontWeight: '600', flex: 1 },
    ministerial: { fontSize: 12, fontWeight: '900' },
    meta: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
  });
}
