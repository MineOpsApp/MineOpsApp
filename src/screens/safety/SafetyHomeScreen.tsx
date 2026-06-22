import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { SosButton } from '../../components/SosButton';
import { getSiteHazardAlerts, getDangerZones } from '../../services/api';
import type { HazardReport, DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SafetyHomeScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [zones, setZones] = useState<DangerZone[]>([]);

  useEffect(() => {
    getSiteHazardAlerts().then(setHazards).catch(() => {});
    getDangerZones().then(setZones).catch(() => {});
  }, []);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Safety Overview</Text>
        <Text style={styles.subtitle}>{session.user.fullName} · Safety Officer</Text>

        <Text style={styles.sectionTitle}>Active Hazards</Text>
        {hazards.length === 0 ? (
          <View style={styles.card}><Text style={styles.meta}>No active hazards</Text></View>
        ) : null}
        {hazards.map((h) => (
          <View key={h.id} style={styles.alertCard}>
            <Text style={styles.alertTitle}>{h.hazardType} — {h.location}</Text>
            <Text style={styles.meta}>{h.status} · {h.site}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Danger Zones</Text>
        {zones.length === 0 ? (
          <View style={styles.card}><Text style={styles.meta}>No danger zones</Text></View>
        ) : null}
        {zones.slice(0, 3).map((z) => (
          <View key={z.id} style={styles.zoneCard}>
            <Text style={styles.zoneTitle}>⚠️ {z.zoneName}</Text>
            <Text style={styles.meta}>Risk: {z.riskLevel} · {z.status}</Text>
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
  zoneCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  alertTitle: { color: '#b42318', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  zoneTitle: { color: '#a15c00', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});
