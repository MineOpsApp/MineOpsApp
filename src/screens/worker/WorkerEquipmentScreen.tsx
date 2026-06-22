import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { getWorkerProfile, updateWorkerEquipmentStatus, reportEquipmentFault, requestEquipmentMaintenance } from '../../services/api';
import type { WorkerProfile } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function WorkerEquipmentScreen({ session }: Props) {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [status, setStatus] = useState('Operational');
  const [faultDescription, setFaultDescription] = useState('');
  const [maintenanceDetails, setMaintenanceDetails] = useState('');

  useEffect(() => {
    getWorkerProfile(session.user.email).then(setProfile).catch(() => {});
  }, []);

  const equipment = profile?.assignedEquipment[0];

  async function updateStatus() {
    if (!equipment) { Alert.alert('No equipment', 'No equipment assigned.'); return; }
    try {
      const updated = await updateWorkerEquipmentStatus(equipment.id, status, session.user.fullName);
      setProfile((c) => c ? { ...c, assignedEquipment: c.assignedEquipment.map((e) => e.id === updated.id ? updated : e) } : c);
      Alert.alert('Updated', `${updated.code} is now ${updated.status}.`);
    } catch { Alert.alert('Action failed', 'Could not update equipment.'); }
  }

  async function reportFault() {
    if (!equipment) { Alert.alert('No equipment', 'No equipment assigned.'); return; }
    try {
      await reportEquipmentFault({ description: faultDescription.trim() || 'Fault reported', equipmentCode: equipment.code, workerEmail: session.user.email, workerName: session.user.fullName });
      setFaultDescription('');
      Alert.alert('Fault reported', 'Your fault report has been submitted.');
    } catch { Alert.alert('Action failed', 'Could not report fault.'); }
  }

  async function requestMaintenance() {
    if (!equipment) { Alert.alert('No equipment', 'No equipment assigned.'); return; }
    try {
      await requestEquipmentMaintenance({ equipmentCode: equipment.code, requestDetails: maintenanceDetails.trim() || 'Maintenance requested', workerEmail: session.user.email, workerName: session.user.fullName });
      setMaintenanceDetails('');
      Alert.alert('Requested', 'Maintenance request submitted.');
    } catch { Alert.alert('Action failed', 'Could not request maintenance.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Equipment</Text>
      {equipment ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{equipment.name} — {equipment.code}</Text>
          <Text style={styles.meta}>Status: {equipment.status}</Text>
          <Text style={styles.meta}>{equipment.instructions}</Text>
        </View>
      ) : (
        <View style={styles.card}><Text style={styles.meta}>Loading equipment...</Text></View>
      )}
      <Text style={styles.sectionTitle}>Update Status</Text>
      <InputField label="Status" onChangeText={setStatus} value={status} />
      <ActionButton label="Update Status" onPress={updateStatus} />
      <Text style={styles.sectionTitle}>Report Fault</Text>
      <InputField label="Fault details" multiline onChangeText={setFaultDescription} value={faultDescription} placeholder="Describe the fault..." />
      <ActionButton label="Report Fault" onPress={reportFault} tone="danger" />
      <Text style={styles.sectionTitle}>Request Maintenance</Text>
      <InputField label="Details" multiline onChangeText={setMaintenanceDetails} value={maintenanceDetails} placeholder="What maintenance is needed?" />
      <ActionButton label="Request Service" onPress={requestMaintenance} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginTop: 2 },
});