import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HazardCard } from '../../components/HazardCard';
import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { createHazardReport, getHazardReports } from '../../services/api';
import type { HazardReport } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function WorkerHazardsScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [hazardType, setHazardType] = useState('Ground instability');
  const [hazardLocation, setHazardLocation] = useState('Zone A');
  const [hazardDescription, setHazardDescription] = useState('');

  useEffect(() => {
    getHazardReports(session.user.email).then(setHazards).catch(() => {});
  }, []);

  async function submit() {
    const description = hazardDescription.trim();
    if (!description) { Alert.alert('Missing details', 'Enter the hazard details.'); return; }
    try {
      const report = await createHazardReport({
        description,
        hazardType: hazardType.trim() || 'General',
        location: hazardLocation.trim() || 'Unspecified',
        reportedByEmail: session.user.email,
        reportedByName: session.user.fullName,
        reportedByRole: session.user.role,
        site: 'Obuasi Mine',
      });
      setHazards((c) => [report, ...c]);
      setHazardDescription('');
      Alert.alert('Hazard reported', `Report #${report.id} was sent to safety.`);
    } catch {
      Alert.alert('Action failed', 'Could not submit the hazard report.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Hazard Reports</Text>
      <InputField label="Type" onChangeText={setHazardType} value={hazardType} />
      <InputField label="Location" onChangeText={setHazardLocation} value={hazardLocation} />
      <InputField label="Details" multiline onChangeText={setHazardDescription} value={hazardDescription} placeholder="Describe the hazard..." />
      <ActionButton label="Submit Hazard" onPress={submit} tone="danger" />
      <Text style={styles.sectionTitle}>My Reports</Text>
      {hazards.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No reports yet</Text></View>
      ) : null}
      {hazards.map((h) => (
        <HazardCard key={h.id} hazard={h} canReview={false} canClear={false} onReview={() => {}} onClear={() => {}} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});