import { useEffect, useState } from 'react';
import { getSiteIncidents, updateIncidentStatus } from '../../services/api';
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AuthSession } from '../../types/auth';

type Incident = {
  id: number;
  reportedByName: string;
  zone: string;
  category: string;
  severity: string;
  description: string;
  involvedPersons: string | null;
  firstAidGiven: boolean;
  hospitalRequired: boolean;
  immediateAction: string | null;
  status: string;
  reportedAt: string;
  photoData: string | null;
};

type Props = { session: AuthSession };

const SEVERITY_COLORS: Record<string, string> = {
  Minor: '#1f6f5b',
  Serious: '#a15c00',
  Critical: '#b42318',
};

const CATEGORY_ICONS: Record<string, string> = {
  'Injury': '🤕',
  'Near Miss': '⚠️',
  'Equipment Damage': '🔧',
  'Environmental': '🌿',
};

const STATUSES = ['Open', 'Under Investigation', 'Closed'];

function IncidentPhoto({ photoData }: { photoData: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)} style={{ marginBottom: 10 }}>
      {expanded ? (
        <Image source={{ uri: `data:image/jpeg;base64,${photoData}` }} style={{ borderRadius: 8, height: 180, width: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ alignItems: 'center', backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, paddingVertical: 10 }}>
          <Text style={{ color: '#5d6875', fontSize: 13, fontWeight: '700' }}>📷 Tap to view photo</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SupervisorIncidentScreen({ session: _ }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [investigationNotes, setInvestigationNotes] = useState<Record<number, string>>({});

  function load() { return getSiteIncidents().then(setIncidents).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleStatusChange(incident: Incident, status: string, notes?: string) {
  try {
    const updated = await updateIncidentStatus(incident.id, status, notes);
    setIncidents((c) => c.map((i) => i.id === updated.id ? updated : i));
  } catch { Alert.alert('Failed', 'Could not update incident status.'); }
}

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  const open = incidents.filter((i) => i.status === 'Open');
  const investigating = incidents.filter((i) => i.status === 'Under Investigation');
  const closed = incidents.filter((i) => i.status === 'Closed');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.pageTitle}>Incident Reports</Text>
      <Text style={styles.pageSub}>Pull to refresh</Text>

      {/* Summary strip */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, open.length > 0 && { color: '#b42318' }]}>{open.length}</Text>
          <Text style={styles.stripLabel}>Open</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#a15c00' }]}>{investigating.length}</Text>
          <Text style={styles.stripLabel}>Investigating</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>{closed.length}</Text>
          <Text style={styles.stripLabel}>Closed</Text>
        </View>
      </View>

      {incidents.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>No incidents reported</Text>
          <Text style={styles.emptySub}>Site is clear</Text>
        </View>
      ) : null}

      {incidents.map((inc) => (
        <Pressable key={inc.id} onPress={() => setExpanded(expanded === inc.id ? null : inc.id)} style={styles.incidentCard}>
          <View style={styles.incidentHeader}>
            <View style={styles.incidentLeft}>
              <Text style={styles.incidentCategory}>{CATEGORY_ICONS[inc.category]} {inc.category}</Text>
              <Text style={styles.incidentMeta}>{inc.zone} · {inc.reportedByName}</Text>
              <Text style={styles.incidentTime}>{formatDate(inc.reportedAt)}</Text>
            </View>
            <View style={styles.incidentRight}>
              <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[inc.severity] + '22', borderColor: SEVERITY_COLORS[inc.severity] }]}>
                <Text style={[styles.severityText, { color: SEVERITY_COLORS[inc.severity] }]}>{inc.severity}</Text>
              </View>
              <Text style={styles.expandHint}>{expanded === inc.id ? '▲' : '▼'}</Text>
            </View>
          </View>

          {expanded === inc.id ? (
            <View style={styles.expandedBody}>
              <Text style={styles.descriptionText}>{inc.description}</Text>
              {inc.photoData ? <IncidentPhoto photoData={inc.photoData} /> : null}
              {inc.involvedPersons ? <Text style={styles.detailText}>👥 {inc.involvedPersons}</Text> : null}
              {inc.immediateAction ? <Text style={styles.detailText}>⚡ {inc.immediateAction}</Text> : null}
              <View style={styles.medicalRow}>
                {inc.firstAidGiven ? <Text style={styles.medicalTag}>🩹 First Aid Given</Text> : null}
                {inc.hospitalRequired ? <Text style={[styles.medicalTag, { color: '#b42318' }]}>🏥 Hospital Required</Text> : null}
              </View>

              <Text style={styles.statusLabel}>Update Status</Text>
              <View style={styles.statusRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => handleStatusChange(inc, s)}
                    style={[styles.statusBtn, inc.status === s && styles.statusBtnActive]}
                  >
                    <Text style={[styles.statusBtnText, inc.status === s && styles.statusBtnTextActive]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  pageSub: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginBottom: 16 },
  strip: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingVertical: 14 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 32 },
  emptyIcon: { color: '#1f6f5b', fontSize: 28, marginBottom: 8 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  incidentCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 8, padding: 14 },
  incidentHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  incidentLeft: { flex: 1 },
  incidentCategory: { color: '#17212b', fontSize: 14, fontWeight: '900', marginBottom: 2 },
  incidentMeta: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  incidentTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  incidentRight: { alignItems: 'flex-end', gap: 6 },
  severityBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { fontSize: 11, fontWeight: '900' },
  expandHint: { color: '#8fa3b8', fontSize: 12 },
  expandedBody: { borderTopColor: '#f4f6f8', borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  descriptionText: { color: '#17212b', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  detailText: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  medicalRow: { flexDirection: 'row', gap: 10, marginBottom: 12, marginTop: 4 },
  medicalTag: { color: '#1f6f5b', fontSize: 12, fontWeight: '700' },
  statusLabel: { color: '#5d6875', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusBtn: { alignItems: 'center', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: 8 },
  statusBtnActive: { backgroundColor: '#17212b', borderColor: '#17212b' },
  statusBtnText: { color: '#8fa3b8', fontSize: 11, fontWeight: '800' },
  statusBtnTextActive: { color: '#ffffff' },
});
