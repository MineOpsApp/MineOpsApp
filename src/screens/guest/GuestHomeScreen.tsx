import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { SiteMapView } from '../../components/SiteMapView';
import { completeVisitorInduction, getNotices, getSiteHazardAlerts, getDangerZones, getPublicInventory } from '../../services/api';
import type { MineralInventory } from '../../services/api';
import type { Notice, HazardReport, DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import type { GuestSubRole } from '../../navigation/GuestNavigator';

type Props = { session: AuthSession; subRole: GuestSubRole };

export function GuestHomeScreen({ session, subRole }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [inventory, setInventory] = useState<MineralInventory[]>([]);
  const [inventoryShared, setInventoryShared] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getNotices().catch(() => []),
      getSiteHazardAlerts().catch(() => []),
      getDangerZones().catch(() => []),
    ]).then(([n, h, d]) => {
      setNotices(n as Notice[]);
      setHazards(h as HazardReport[]);
      setDangerZones(d as DangerZone[]);
    }).finally(() => setLoading(false));

    if (subRole === 'investor') {
      getPublicInventory()
        .then((data) => { setInventory(data); setInventoryShared(true); })
        .catch((err: Error) => {
          if (err.message?.startsWith('403')) {
            setInventoryShared(false);
          } else {
            setInventoryShared(false);
          }
        });
    }
  }, []);

  async function completeInduction() {
    try {
      const induction = await completeVisitorInduction({
        actorEmail: session.user.email,
        actorName: session.user.fullName,
        actorRole: session.user.role,
        site: session.user.assignedSite ?? 'Obuasi Mine',
        visitorType: subRole.charAt(0).toUpperCase() + subRole.slice(1),
      });
      Alert.alert('Induction complete', `Induction #${induction.id} recorded.`);
    } catch { Alert.alert('Action failed', 'Could not complete induction.'); }
  }

  if (subRole === 'visitor') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>{session.user.fullName} · Visitor</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Safety Induction Required</Text>
          <Text style={styles.infoText}>All visitors must complete a safety induction before entering the site.</Text>
        </View>
        <ActionButton label="Complete Safety Induction" onPress={completeInduction} />
        <Text style={styles.sectionTitle}>Site Notices</Text>
        {loading ? <Text style={styles.meta}>Loading...</Text> : null}
        {!loading && notices.length === 0 ? <View style={styles.card}><Text style={styles.meta}>No notices</Text></View> : null}
        {notices.slice(0, 5).map((n) => (
          <View key={n.id} style={styles.card}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.meta}>{n.message}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  if (subRole === 'inspector') {
    const openHazards = hazards.filter((h) => h.status.toUpperCase() === 'OPEN');
    const activeZones = dangerZones.filter((z) => z.status !== 'Cleared');
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Inspection</Text>
        <Text style={styles.subtitle}>{session.user.fullName} · Regulatory Inspector</Text>
        <ActionButton label="Log Inspector Induction" onPress={completeInduction} />
        <Text style={styles.sectionTitle}>Site Safety Status</Text>
        {loading ? <Text style={styles.meta}>Loading...</Text> : null}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, openHazards.length > 0 && styles.statCardRed]}>
            <Text style={[styles.statValue, openHazards.length > 0 && styles.statValueRed]}>{openHazards.length}</Text>
            <Text style={styles.statLabel}>Open Hazards</Text>
          </View>
          <View style={[styles.statCard, activeZones.length > 0 && styles.statCardAmber]}>
            <Text style={[styles.statValue, activeZones.length > 0 && styles.statValueAmber]}>{activeZones.length}</Text>
            <Text style={styles.statLabel}>Danger Zones</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{notices.length}</Text>
            <Text style={styles.statLabel}>Notices</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Site Map</Text>
        <SiteMapView zones={dangerZones} readOnly pollIntervalMs={25000} />
        <Text style={styles.sectionTitle}>Open Hazards</Text>
        {openHazards.length === 0 ? <View style={styles.clearCard}><Text style={styles.clearText}>✓ No open hazards</Text></View> : null}
        {openHazards.map((h) => (
          <View key={h.id} style={styles.alertCard}>
            <Text style={styles.alertTitle}>{h.hazardType} — {h.location}</Text>
            <Text style={styles.meta}>Severity: {h.severity ?? 'Medium'} · {h.site}</Text>
            <Text style={styles.meta}>Reported by {h.reportedByName}</Text>
          </View>
        ))}
        <Text style={styles.sectionTitle}>Active Danger Zones</Text>
        {activeZones.length === 0 ? <View style={styles.clearCard}><Text style={styles.clearText}>✓ No active danger zones</Text></View> : null}
        {activeZones.map((z) => (
          <View key={z.id} style={styles.zoneCard}>
            <Text style={styles.zoneTitle}>⚠️ {z.zoneName}</Text>
            <Text style={styles.meta}>Risk: {z.riskLevel} · {z.site}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // investor
  const clearedHazards = hazards.filter((h) => h.status.toUpperCase() === 'CLEARED').length;
  const openHazards = hazards.filter((h) => h.status.toUpperCase() === 'OPEN').length;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Overview</Text>
      <Text style={styles.subtitle}>{session.user.fullName} · Investor</Text>
      <Text style={styles.sectionTitle}>Operational Summary</Text>
      {loading ? <Text style={styles.meta}>Loading...</Text> : null}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{hazards.length}</Text>
          <Text style={styles.statLabel}>Total Hazards</Text>
        </View>
        <View style={[styles.statCard, openHazards > 0 && styles.statCardAmber]}>
          <Text style={[styles.statValue, openHazards > 0 && styles.statValueAmber]}>{openHazards}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statCard, styles.statCardGreen]}>
          <Text style={[styles.statValue, styles.statValueGreen]}>{clearedHazards}</Text>
          <Text style={styles.statLabel}>Cleared</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Inventory Snapshot</Text>
      {inventoryShared === null ? (
        <View style={styles.card}><Text style={styles.meta}>Loading...</Text></View>
      ) : inventoryShared === false ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Not shared</Text>
          <Text style={styles.infoText}>This site hasn't shared its inventory with guest investors.</Text>
        </View>
      ) : inventory.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No inventory recorded yet.</Text></View>
      ) : (
        inventory.map((item) => (
          <View key={item.id} style={styles.inventoryCard}>
            <View style={styles.inventoryRow}>
              <Text style={styles.inventoryMineral}>{item.mineralType}</Text>
              <Text style={styles.inventoryVolume}>
                {Number(item.totalVolume).toFixed(2)}<Text style={styles.inventoryUnit}> {item.unit}</Text>
              </Text>
            </View>
            {item.lastUpdatedAt ? (
              <Text style={styles.meta}>Updated {new Date(item.lastUpdatedAt).toLocaleDateString()}</Text>
            ) : null}
          </View>
        ))
      )}
      <Text style={styles.sectionTitle}>Recent Notices</Text>
      {notices.length === 0 ? <View style={styles.card}><Text style={styles.meta}>No notices</Text></View> : null}
      {notices.slice(0, 5).map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text style={styles.meta}>{n.message}</Text>
          <Text style={styles.roleMeta}>Posted by {n.postedByRole}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: '#5d6875', fontSize: 14, fontWeight: '700', marginBottom: 16 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  infoCard: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 14 },
  infoTitle: { color: '#0369a1', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  infoText: { color: '#0369a1', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  alertCard: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  zoneCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  clearCard: { backgroundColor: '#e7f6ef', borderColor: '#1f6f5b', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  clearText: { color: '#1f7a4d', fontSize: 14, fontWeight: '800' },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  alertTitle: { color: '#b42318', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  zoneTitle: { color: '#a15c00', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  roleMeta: { color: '#9aa5b1', fontSize: 12, fontWeight: '700', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, flex: 1, padding: 12, alignItems: 'center' },
  statCardRed: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6' },
  statCardAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  statCardGreen: { backgroundColor: '#e7f6ef', borderColor: '#bbf7d0' },
  statValue: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  statValueRed: { color: '#b42318' },
  statValueAmber: { color: '#a15c00' },
  statValueGreen: { color: '#1f7a4d' },
  statLabel: { color: '#5d6875', fontSize: 11, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  inventoryCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
  inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 2 },
  inventoryMineral: { color: '#17212b', fontSize: 15, fontWeight: '900', flex: 1 },
  inventoryVolume: { color: '#1f6f5b', fontSize: 18, fontWeight: '900' },
  inventoryUnit: { color: '#5d6875', fontSize: 12, fontWeight: '700' },
});