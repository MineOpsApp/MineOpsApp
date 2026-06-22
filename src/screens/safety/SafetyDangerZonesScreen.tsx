import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { createDangerZone, getDangerZones } from '../../services/api';
import type { DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  High: { color: '#b42318', bg: '#fff5f5', border: '#f5c6c6' },
  Medium: { color: '#a15c00', bg: '#fffbeb', border: '#fde68a' },
  Low: { color: '#1f6f5b', bg: '#f0fdf4', border: '#86efac' },
};

export function SafetyDangerZonesScreen({ session }: Props) {
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() { return getDangerZones().then(setZones).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function create() {
    try {
      const zone = await createDangerZone({ actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role, riskLevel: 'High', site: 'Obuasi Mine', zoneName: 'Zone B - Blasting Area' });
      setZones((c) => [zone, ...c]);
      Alert.alert('Created', `${zone.zoneName} is now active.`);
    } catch { Alert.alert('Failed', 'Could not create danger zone.'); }
  }

  const active = zones.filter((z) => z.status !== 'Cleared');
  const cleared = zones.filter((z) => z.status === 'Cleared');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Danger Zones</Text>
        {active.length > 0 && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>{active.length} active</Text></View>}
      </View>

      <View style={styles.createCard}>
        <Text style={styles.createTitle}>⚠️ Create Danger Zone</Text>
        <Text style={styles.createSub}>Mark an area as restricted for all site users</Text>
        <ActionButton label="Create Zone B — Blasting Area (High Risk)" onPress={create} tone="danger" />
      </View>

      {active.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>ACTIVE ZONES</Text>
          {active.map((z) => {
            const cfg = RISK_CONFIG[z.riskLevel] ?? RISK_CONFIG['Medium'];
            return (
              <View key={z.id} style={[styles.zoneCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <View style={styles.zoneTop}>
                  <Text style={styles.zoneName}>{z.zoneName}</Text>
                  <View style={[styles.riskPill, { backgroundColor: cfg.color }]}>
                    <Text style={styles.riskPillText}>{z.riskLevel}</Text>
                  </View>
                </View>
                <Text style={[styles.zoneMeta, { color: cfg.color }]}>⚠ Active · {z.site}</Text>
              </View>
            );
          })}
        </>
      ) : (
        <View style={styles.clearCard}>
          <Text style={styles.clearIcon}>✓</Text>
          <View>
            <Text style={styles.clearTitle}>No active danger zones</Text>
            <Text style={styles.clearSub}>All areas are accessible</Text>
          </View>
        </View>
      )}

      {cleared.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>CLEARED</Text>
          {cleared.map((z) => (
            <View key={z.id} style={styles.clearedCard}>
              <Text style={styles.clearedName}>{z.zoneName}</Text>
              <Text style={styles.clearedMeta}>Cleared · {z.site}</Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  pageTitle: { color: '#17212b', flex: 1, fontSize: 22, fontWeight: '900' },
  activeBadge: { backgroundColor: '#a15c00', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  createCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 20, padding: 16 },
  createTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  createSub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 14 },
  sectionLabel: { color: '#8fa3b8', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  zoneCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14 },
  zoneTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  zoneName: { color: '#17212b', flex: 1, fontSize: 14, fontWeight: '900', marginRight: 8 },
  riskPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  riskPillText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  zoneMeta: { fontSize: 12, fontWeight: '700' },
  clearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  clearIcon: { color: '#16a34a', fontSize: 22 },
  clearTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  clearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 2 },
  clearedCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 8, opacity: 0.6, padding: 12 },
  clearedName: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  clearedMeta: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
});