import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMultiSiteDashboard, type MultiSiteDashboardEntry } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

function StatBox({ label, value, warn, theme }: { label: string; value: number; warn?: boolean; theme: Theme }) {
  const styles = makeStyles(theme);
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, warn && value > 0 && styles.statValueWarn]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SupervisorMultiSiteScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [entries, setEntries] = useState<MultiSiteDashboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMultiSiteDashboard();
        setEntries(data);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>All My Sites</Text>
      <Text style={styles.sub}>A combined view of every site you have access to. To manage or switch sites, use Site Access.</Text>

      {loading ? (
        <Text style={styles.meta}>Loading...</Text>
      ) : error ? (
        <Text style={styles.meta}>Could not load site data.</Text>
      ) : entries.length === 0 ? (
        <Text style={styles.meta}>No site data available.</Text>
      ) : (
        entries.map((entry) => (
          <View key={entry.site} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.siteName}>{entry.site}</Text>
              {entry.isHome && <View style={styles.tag}><Text style={styles.tagText}>HOME</Text></View>}
            </View>
            <View style={styles.statsGrid}>
              <StatBox label="Workers On Site" value={entry.summary.workersOnSite} theme={theme} />
              <StatBox label="Open Hazards" value={entry.summary.hazardCount} warn theme={theme} />
              <StatBox label="Pending Shift Logs" value={entry.summary.pendingShiftLogs} theme={theme} />
              <StatBox label="Safety Score" value={entry.summary.safetyScore} theme={theme} />
              <StatBox label="Certs Expired" value={entry.summary.certExpired} warn theme={theme} />
              <StatBox label="Unread Messages" value={entry.summary.unreadMessages} theme={theme} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    sub: { color: theme.textSub, fontSize: 13, fontWeight: '500', marginBottom: 16, lineHeight: 18 },
    meta: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: 14 },
    cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 10 },
    siteName: { color: theme.text, fontSize: 16, fontWeight: '900' },
    tag: { backgroundColor: theme.bgHero, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    tagText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statBox: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 8, minWidth: '30%', paddingVertical: 10 },
    statValue: { color: theme.text, fontSize: 20, fontWeight: '900' },
    statValueWarn: { color: theme.danger },
    statLabel: { color: theme.textSub, fontSize: 10, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  });
}
