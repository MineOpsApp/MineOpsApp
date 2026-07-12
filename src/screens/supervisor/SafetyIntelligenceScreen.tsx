import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSafetyIntelligenceSummary, type SafetyIntelligenceSummary } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

const SEVERITY_COLORS: Record<string, string> = {
  High: '#dc2626', Critical: '#dc2626',
  Serious: '#d97706',
  Medium: '#d29922',
  Minor: '#1d5f99',
  Low: '#1f6f5b',
};

export function SafetyIntelligenceScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [data, setData] = useState<SafetyIntelligenceSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    return getSafetyIntelligenceSummary()
      .then(setData)
      .catch(() => setError(true));
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function dismissRec(idx: number) {
    setDismissed((prev) => new Set([...prev, idx]));
  }

  function formatDate(s: string | null) {
    if (!s) return '';
    try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch { return ''; }
  }

  const visibleRecs = data?.recommendations.filter((_, i) => !dismissed.has(i)) ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Safety Intelligence</Text>
      <Text style={styles.subtitle}>Rule-based analysis of the last 30 days — pull to refresh</Text>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>Could not load analysis. Pull to retry.</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>🔥 Hotspots</Text>
      {data && data.hotspots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No locations with 3+ active reports in the last 30 days.</Text>
        </View>
      ) : null}
      {(data?.hotspots ?? []).map((h, i) => {
        const sColor = SEVERITY_COLORS[h.mostRecentSeverity] ?? theme.textMuted;
        return (
          <View key={i} style={styles.hotspotCard}>
            <View style={styles.hotspotTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hotspotLocation}>{h.location}</Text>
                <Text style={styles.hotspotSub}>
                  {h.hazardCount > 0 ? `${h.hazardCount} hazard${h.hazardCount !== 1 ? 's' : ''}` : ''}
                  {h.hazardCount > 0 && h.incidentCount > 0 ? ' · ' : ''}
                  {h.incidentCount > 0 ? `${h.incidentCount} incident${h.incidentCount !== 1 ? 's' : ''}` : ''}
                  {h.mostRecentAt ? `  · Last: ${formatDate(h.mostRecentAt)}` : ''}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{h.totalCount}</Text>
              </View>
            </View>
            <View style={[styles.severityTag, { backgroundColor: sColor + '20', borderColor: sColor }]}>
              <Text style={[styles.severityTagText, { color: sColor }]}>{h.mostRecentSeverity}</Text>
            </View>
          </View>
        );
      })}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>📈 Trending Hazard Types</Text>
      {data && data.trends.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No hazard types showing a 2× increase in the last 30 days.</Text>
        </View>
      ) : null}
      {(data?.trends ?? []).map((t, i) => (
        <View key={i} style={styles.trendCard}>
          <View style={styles.trendRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.trendType}>{t.hazardType}</Text>
              <Text style={styles.trendCounts}>
                {t.trend === 'NEW'
                  ? `${t.currentCount} reports this period — none in the prior period`
                  : `${t.currentCount} this period vs ${t.priorCount} prior`}
              </Text>
            </View>
            <View style={[styles.trendBadge, t.trend === 'NEW' ? styles.trendBadgeNew : styles.trendBadgeRising]}>
              <Text style={[styles.trendBadgeText, t.trend === 'NEW' ? styles.trendBadgeTextNew : styles.trendBadgeTextRising]}>
                {t.trend === 'NEW' ? '🆕 NEW' : '↑ RISING'}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>💡 Recommendations</Text>
      {data && visibleRecs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {data.recommendations.length > 0
              ? 'All recommendations dismissed.'
              : 'No recommendations — site looks clean for the past 30 days.'}
          </Text>
        </View>
      ) : null}
      {(data?.recommendations ?? []).map((rec, i) => {
        if (dismissed.has(i)) return null;
        return (
          <View key={i} style={styles.recCard}>
            <Text style={styles.recText}>{rec}</Text>
            <Pressable onPress={() => dismissRec(i)} style={styles.dismissBtn}>
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </Pressable>
          </View>
        );
      })}

      {!data && !error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Loading analysis…</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    subtitle: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 20 },
    sectionTitle: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 10 },
    errorCard: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 10, borderWidth: 1, marginBottom: 16, padding: 14 },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700' },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 16 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    hotspotCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
    hotspotTop: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 8 },
    hotspotLocation: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    hotspotSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    countBadge: { alignItems: 'center', backgroundColor: theme.bgHero, borderRadius: 20, height: 36, justifyContent: 'center', width: 36 },
    countBadgeText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    severityTag: { alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    severityTagText: { fontSize: 11, fontWeight: '800' },
    trendCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
    trendRow: { alignItems: 'center', flexDirection: 'row' },
    trendType: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 2 },
    trendCounts: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    trendBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
    trendBadgeNew: { backgroundColor: theme.infoLight, borderColor: theme.info },
    trendBadgeRising: { backgroundColor: theme.amberLight, borderColor: theme.amber },
    trendBadgeText: { fontSize: 10, fontWeight: '900' },
    trendBadgeTextNew: { color: theme.info },
    trendBadgeTextRising: { color: theme.amber },
    recCard: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
    recText: { color: theme.amber, fontSize: 13, fontWeight: '700', marginBottom: 10 },
    dismissBtn: { alignSelf: 'flex-end', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
    dismissBtnText: { color: theme.textSub, fontSize: 12, fontWeight: '800' },
  });
}
