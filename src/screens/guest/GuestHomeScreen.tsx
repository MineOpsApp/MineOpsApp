import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { SiteMapView } from '../../components/SiteMapView';
import { completeVisitorInduction, getNotices, getSiteHazardAlerts, getDangerZones, getPublicInventory } from '../../services/api';
import type { MineralInventory } from '../../services/api';
import type { Notice, HazardReport, DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import type { GuestSubRole } from '../../navigation/GuestNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession; subRole: GuestSubRole };

export function GuestHomeScreen({ session, subRole }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [inventory, setInventory] = useState<MineralInventory[]>([]);
  const [inventoryShared, setInventoryShared] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [n, h, d] = await Promise.all([
      getNotices().catch(() => [] as Notice[]),
      getSiteHazardAlerts().catch(() => [] as HazardReport[]),
      getDangerZones().catch(() => [] as DangerZone[]),
    ]);
    setNotices(n as Notice[]);
    setHazards(h as HazardReport[]);
    setDangerZones(d as DangerZone[]);
    if (subRole === 'investor') {
      getPublicInventory()
        .then((data) => { setInventory(data); setInventoryShared(true); })
        .catch(() => setInventoryShared(false));
    }
  }
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

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
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
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
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
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
        {openHazards.length === 0 ? (
          <View style={styles.clearCard}>
            <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
            <Text style={styles.clearText}>No open hazards</Text>
          </View>
        ) : null}
        {openHazards.map((h) => (
          <View key={h.id} style={styles.alertCard}>
            <Text style={styles.alertTitle}>{h.hazardType} — {h.location}</Text>
            <Text style={styles.meta}>Severity: {h.severity ?? 'Medium'} · {h.site}</Text>
            <Text style={styles.meta}>Reported by {h.reportedByName}</Text>
          </View>
        ))}
        <Text style={styles.sectionTitle}>Active Danger Zones</Text>
        {activeZones.length === 0 ? (
          <View style={styles.clearCard}>
            <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
            <Text style={styles.clearText}>No active danger zones</Text>
          </View>
        ) : null}
        {activeZones.map((z) => (
          <View key={z.id} style={styles.zoneCard}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              <Ionicons name="warning" size={15} color={theme.amber} />
              <Text style={styles.zoneTitle}>{z.zoneName}</Text>
            </View>
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

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { padding: spacing.xl, paddingBottom: 40, backgroundColor: theme.bg },
    title: { ...typography.h1, color: theme.text, marginBottom: 2 },
    subtitle: { color: theme.textSub, fontSize: 14, fontWeight: '700', marginBottom: spacing.lg },
    sectionTitle: { ...typography.h2, color: theme.text, marginBottom: 10, marginTop: spacing.sm },
    infoCard: { backgroundColor: theme.infoLight, borderColor: theme.info, borderRadius: 8, borderWidth: 1, marginBottom: spacing.md, padding: 14, ...cardShadow },
    infoTitle: { color: theme.info, fontSize: 14, fontWeight: '800', marginBottom: 4 },
    infoText: { color: theme.info, fontSize: 13, fontWeight: '600', lineHeight: 18 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    alertCard: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    zoneCard: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14, ...cardShadow },
    clearCard: { alignItems: 'center', backgroundColor: theme.accentLight, borderColor: theme.accent, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 10, padding: 14, ...cardShadow },
    clearText: { color: theme.accent, fontSize: 14, fontWeight: '800' },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    alertTitle: { color: theme.danger, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    zoneTitle: { color: theme.amber, fontSize: 15, fontWeight: '800' },
    meta: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: 2 },
    roleMeta: { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    statCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, flex: 1, padding: spacing.md, ...cardShadow },
    statCardRed: { backgroundColor: theme.dangerLight, borderColor: theme.danger },
    statCardAmber: { backgroundColor: theme.amberLight, borderColor: theme.amber },
    statCardGreen: { backgroundColor: theme.successLight, borderColor: theme.success },
    statValue: { color: theme.text, fontSize: 22, fontWeight: '900' },
    statValueRed: { color: theme.danger },
    statValueAmber: { color: theme.amber },
    statValueGreen: { color: theme.success },
    statLabel: { ...typography.label, color: theme.textSub, marginTop: 2, textAlign: 'center' },
    inventoryCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: spacing.sm, padding: spacing.md, ...cardShadow },
    inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 2 },
    inventoryMineral: { color: theme.text, fontSize: 15, fontWeight: '900', flex: 1 },
    inventoryVolume: { color: theme.accent, fontSize: 18, fontWeight: '900' },
    inventoryUnit: { color: theme.textSub, fontSize: 12, fontWeight: '700' },
  });
}
