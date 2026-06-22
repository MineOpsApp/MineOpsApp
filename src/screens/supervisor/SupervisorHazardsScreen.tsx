import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HazardCard } from '../../components/HazardCard';
import { InputField } from '../../components/InputField';
import { getHazardReports, reviewHazardReport, closeHazardReport } from '../../services/api';
import type { HazardReport } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorHazardsScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [actionTaken, setActionTaken] = useState('Area isolated and assigned for follow-up');

  useEffect(() => {
    getHazardReports().then(setHazards).catch(() => {});
  }, []);

  async function review(id: number) {
    try {
      const updated = await reviewHazardReport(id, { actionTaken: actionTaken.trim() || 'Hazard reviewed', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch { Alert.alert('Action failed', 'Could not review the hazard.'); }
  }

  async function close(id: number) {
    try {
      const updated = await closeHazardReport(id, { actionTaken: actionTaken.trim() || 'Hazard cleared', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch { Alert.alert('Action failed', 'Could not close the hazard.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Hazard Reports</Text>
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

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});