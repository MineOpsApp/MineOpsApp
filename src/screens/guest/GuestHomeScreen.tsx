import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { completeVisitorInduction, getNotices, getSiteHazardAlerts, getDangerZones } from '../../services/api';
import type { Notice, HazardReport, DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type GuestSubRole = 'visitor' | 'inspector' | 'investor';

const SUB_ROLES: { id: GuestSubRole; label: string; description: string; icon: string }[] = [
  { id: 'visitor', label: 'Visitor', description: 'General site visit', icon: '👤' },
  { id: 'inspector', label: 'Inspector', description: 'Regulatory inspection', icon: '🔍' },
  { id: 'investor', label: 'Investor', description: 'Business overview', icon: '📊' },
];

type Props = { session: AuthSession };

export function GuestHomeScreen({ session }: Props) {
  const [subRole, setSubRole] = useState<GuestSubRole>('visitor');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
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
  }, []);

  async function completeInduction() {
    try {
      const induction = await completeVisitorInduction({
        actorEmail: session.user.email,
        actorName: session.user.fullName,
        actorRole: session.user.role,
        site: 'Obuasi Mine',
        visitorType: subRole.charAt(0).toUpperCase() + subRole.slice(1),
      });
      Alert.alert('Induction complete', `Induction #${induction.id} recorded for ${subRole}.`);
    } catch { Alert.alert('Action failed', 'Could not complete induction.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>{session.user.fullName}</Text>

      <Text style={styles.label}>I am visiting as</Text>
      <View style={styles.subRoleRow}>
        {SUB_ROLES.map((sr) => (
          <Pressable
            key={sr.id}
            onPress={() => setSubRole(sr.id)}
            style={[styles.subRoleCard, subRole === sr.id && styles.subRoleCardActive]}
          >
            <Text style={styles.subRoleIcon}>{sr.icon}</Text>
            <Text style={[styles.subRoleLabel, subRole === sr.id && styles.subRoleLabelActive]}>{sr.label}</Text>
            <Text style={styles.subRoleDesc}>{sr.description}</Text>
          </Pressable>
        ))}
      </View>

      {subRole === 'visitor' && (
        <VisitorView
          notices={notices}
          loading={loading}
          onCompleteInduction={completeInduction}
        />
      )}

      {subRole === 'inspector' && (
        <InspectorView
          hazards={hazards}
          dangerZones={dangerZones}
          notices={notices}
          loading={loading}
          onCompleteInduction={completeInduction}
        />
      )}

      {subRole === 'investor' && (
        <InvestorView
          notices={notices}
          hazards={hazards}
          loading={loading}
        />
      )}
    </ScrollView>
  );
}

function VisitorView({ notices, loading, onCompleteInduction }: {
  notices: Notice[];
  loading: boolean;
  onCompleteInduction: () => void;
}) {
  return (
    <>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Safety Induction Required</Text>
        <Text style={styles.infoText}>All visitors must complete a safety induction before entering the site. This records your acknowledgment of site safety rules.</Text>
      </View>
      <ActionButton label="Complete Safety Induction" onPress={onCompleteInduction} />
      <Text style={styles.sectionTitle}>Site Notices</Text>
      {loading ? <Text style={styles.meta}>Loading...</Text> : null}
      {!loading && notices.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No notices</Text></View>
      ) : null}
      {notices.slice(0, 5).map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text style={styles.meta}>{n.message}</Text>
        </View>
      ))}
    </>
  );
}

function InspectorView({ hazards, dangerZones, notices, loading, onCompleteInduction }: {
  hazards: HazardReport[];
  dangerZones: DangerZone[];
  notices: Notice[];
  loading: boolean;
  onCompleteInduction: () => void;
}) {
  const openHazards = hazards.filter((h) => h.status.toUpperCase() === 'OPEN');
  const activeZones = dangerZones.filter((z) => z.status !== 'Cleared');

  return (
    <>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Regulatory Inspection Mode</Text>
        <Text style={styles.infoText}>You have read-only access to site safety data. All views are logged in the audit trail.</Text>
      </View>
      <ActionButton label="Log Inspector Induction" onPress={onCompleteInduction} />

      <Text style={styles.sectionTitle}>Site Safety Status</Text>
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
          <Text style={styles.statLabel}>Site Notices</Text>
        </View>
      </View>

      {loading ? <Text style={styles.meta}>Loading...</Text> : null}

      <Text style={styles.sectionTitle}>Open Hazards</Text>
      {openHazards.length === 0 ? (
        <View style={styles.clearCard}><Text style={styles.clearText}>✓ No open hazards</Text></View>
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
        <View style={styles.clearCard}><Text style={styles.clearText}>✓ No active danger zones</Text></View>
      ) : null}
      {activeZones.map((z) => (
        <View key={z.id} style={styles.zoneCard}>
          <Text style={styles.zoneTitle}>⚠️ {z.zoneName}</Text>
          <Text style={styles.meta}>Risk: {z.riskLevel} · {z.site}</Text>
        </View>
      ))}
    </>
  );
}

function InvestorView({ notices, hazards, loading }: {
  notices: Notice[];
  hazards: HazardReport[];
  loading: boolean;
}) {
  const clearedHazards = hazards.filter((h) => h.status.toUpperCase() === 'CLEARED').length;
  const openHazards = hazards.filter((h) => h.status.toUpperCase() === 'OPEN').length;

  return (
    <>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Investor Overview</Text>
        <Text style={styles.infoText}>High-level operational summary for site review.</Text>
      </View>

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

      <Text style={styles.sectionTitle}>Recent Notices</Text>
      {notices.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No notices</Text></View>
      ) : null}
      {notices.slice(0, 5).map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text style={styles.meta}>{n.message}</Text>
          <Text style={styles.roleMeta}>Posted by {n.postedByRole}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: '#5d6875', fontSize: 14, fontWeight: '700', marginBottom: 16 },
  label: { color: '#5d6875', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  subRoleRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  subRoleCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, flex: 1, padding: 10 },
  subRoleCardActive: { backgroundColor: '#e7f6ef', borderColor: '#1f6f5b' },
  subRoleIcon: { fontSize: 20, marginBottom: 4 },
  subRoleLabel: { color: '#17212b', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  subRoleLabelActive: { color: '#1f6f5b' },
  subRoleDesc: { color: '#9aa5b1', fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  infoCard: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 14 },
  infoTitle: { color: '#0369a1', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  infoText: { color: '#0369a1', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
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
});