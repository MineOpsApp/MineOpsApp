import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HazardCard } from '../../components/HazardCard';
import { getHazardReports, reviewHazardReport, closeHazardReport, parseApiError } from '../../services/api';
import type { HazardReport } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SafetyHazardsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [actioning, setActioning] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function load() { getHazardReports().then((p) => setHazards(p?.content ?? [])).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function review(id: number, actionTaken: string) {
    if (actioning !== null) return;
    setActioning(id);
    try {
      const updated = await reviewHazardReport(id, { actionTaken: actionTaken.trim() || 'Reviewed', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch (e) { Alert.alert('Action failed', parseApiError(e)); }
    finally { setActioning(null); }
  }

  async function close(id: number, actionTaken: string) {
    if (actioning !== null) return;
    setActioning(id);
    try {
      const updated = await closeHazardReport(id, { actionTaken: actionTaken.trim() || 'Cleared', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch (e) { Alert.alert('Action failed', parseApiError(e)); }
    finally { setActioning(null); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Hazard Review</Text>
      {hazards.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No hazard reports</Text></View>
      ) : null}
      {hazards.map((h) => (
        <HazardCard key={h.id} hazard={h} canReview canClear onReview={review} onClear={close} />
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
    title: { ...typography.h1, color: theme.text, marginBottom: spacing.lg },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    meta: { color: theme.textSub, fontSize: 13, fontWeight: '600' },
  });
}
