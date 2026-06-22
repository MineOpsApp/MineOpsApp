import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSosAlerts } from '../../services/api';
import type { SosAlert } from '../../types/sos';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorSosScreen({ session: _ }: Props) {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    return getSosAlerts().then(setAlerts).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>SOS Alerts</Text>
      {alerts.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No SOS alerts</Text></View>
      ) : null}
      {alerts.map((a) => (
        <View key={a.id} style={styles.alertCard}>
          <Text style={styles.alertTitle}>🚨 {a.site}</Text>
          <Text style={styles.message}>{a.message}</Text>
          <Text style={styles.meta}>Status: {a.status} · {a.role}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  alertCard: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  alertTitle: { color: '#b42318', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  message: { color: '#17212b', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});