import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HazardCard } from '../../components/HazardCard';
import { InputField } from '../../components/InputField';
import { getHazardReports, reviewHazardReport, closeHazardReport, parseApiError } from '../../services/api';
import type { HazardReport } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SafetyHazardsScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [actionTaken, setActionTaken] = useState('Area secured and safety protocols applied');
  const [actioning, setActioning] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function load() { getHazardReports().then((p) => setHazards(p?.content ?? [])).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function review(id: number) {
    if (actioning !== null) return;
    setActioning(id);
    try {
      const updated = await reviewHazardReport(id, { actionTaken: actionTaken.trim() || 'Reviewed', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch (e) { Alert.alert('Action failed', parseApiError(e)); }
    finally { setActioning(null); }
  }

  async function close(id: number) {
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
      <InputField label="Action taken" multiline onChangeText={setActionTaken} value={actionTaken} placeholder="Describe the action taken..." />
      {hazards.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No hazard reports</Text></View>
      ) : null}
      {hazards.map((h) => (
        <HazardCard key={h.id} hazard={h} canReview canClear onReview={review} onClear={close} />
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 16 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
    meta: { color: theme.textSub, fontSize: 13, fontWeight: '600' },
  });
}
