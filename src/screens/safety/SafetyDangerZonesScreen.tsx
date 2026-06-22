import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { createDangerZone, getDangerZones } from '../../services/api';
import type { DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SafetyDangerZonesScreen({ session }: Props) {
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    return getDangerZones().then(setZones).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function create() {
    try {
      const zone = await createDangerZone({ actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role, riskLevel: 'High', site: 'Obuasi Mine', zoneName: 'Zone B - Blasting Area' });
      setZones((c) => [zone, ...c]);
      Alert.alert('Created', `${zone.zoneName} is now active.`);
    } catch { Alert.alert('Action failed', 'Could not create danger zone.'); }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Danger Zones</Text>
      <ActionButton label="Create Danger Zone" onPress={create} tone="danger" />
      {zones.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No danger zones</Text></View>
      ) : null}
      {zones.map((z) => (
        <View key={z.id} style={styles.zoneCard}>
          <Text style={styles.zoneTitle}>⚠️ {z.zoneName}</Text>
          <Text style={styles.meta}>Risk: {z.riskLevel} · {z.site}</Text>
          <Text style={styles.meta}>Status: {z.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  zoneCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  zoneTitle: { color: '#a15c00', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginTop: 2 },
});