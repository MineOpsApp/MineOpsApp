import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SosButton } from '../../components/SosButton';
import { getSiteHazardAlerts, getNotices } from '../../services/api';
import type { HazardReport, Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorHomeScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    getSiteHazardAlerts().then(setHazards).catch(() => {});
    getNotices().then(setNotices).catch(() => {});
  }, []);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Operations</Text>
        <Text style={styles.subtitle}>{session.user.fullName} · Supervisor</Text>

        <Text style={styles.sectionTitle}>Active Site Alerts</Text>
        {hazards.length === 0 ? (
          <View style={styles.card}><Text style={styles.meta}>No active hazards</Text></View>
        ) : null}
        {hazards.map((h) => (
          <View key={h.id} style={styles.alertCard}>
            <Text style={styles.alertTitle}>{h.hazardType} — {h.location}</Text>
            <Text style={styles.meta}>{h.status} · {h.site}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Recent Notices</Text>
        {notices.slice(0, 3).map((n) => (
          <View key={n.id} style={styles.card}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.meta}>{n.message}</Text>
          </View>
        ))}
      </ScrollView>
      <SosButton role={session.user.role} user={session.user} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f4f6f8' },
  container: { padding: 20, paddingBottom: 100 },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#5d6875', fontSize: 14, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  alertCard: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  alertTitle: { color: '#b42318', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});
