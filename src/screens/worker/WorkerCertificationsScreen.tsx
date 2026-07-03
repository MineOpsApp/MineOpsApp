import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getCertificationHistory, getMyCertifications } from '../../services/api';
import type { Certification, CertificationHistory } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

function statusColor(status: string) {
  if (status === 'EXPIRED') return '#b42318';
  if (status === 'EXPIRING_SOON') return '#92400e';
  return '#15803d';
}
function statusBg(status: string) {
  if (status === 'EXPIRED') return '#fff5f5';
  if (status === 'EXPIRING_SOON') return '#fef3c7';
  return '#f0fdf4';
}
function statusBorder(status: string) {
  if (status === 'EXPIRED') return '#fca5a5';
  if (status === 'EXPIRING_SOON') return '#fcd34d';
  return '#bbf7d0';
}

function daysLabel(days: number, status: string): string {
  if (status === 'EXPIRED') return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  return `${days}d remaining`;
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
}

export function WorkerCertificationsScreen({ session: _ }: Props) {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<number, CertificationHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<number | null>(null);

  async function load() {
    try { setCerts(await getMyCertifications()); } catch {}
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleHistory(cert: Certification) {
    if (expandedId === cert.id) { setExpandedId(null); return; }
    setExpandedId(cert.id);
    if (!historyCache[cert.id]) {
      setLoadingHistory(cert.id);
      try {
        const h = await getCertificationHistory(cert.id);
        setHistoryCache((prev) => ({ ...prev, [cert.id]: h }));
      } catch {}
      setLoadingHistory(null);
    }
  }

  const expired = certs.filter((c) => c.status === 'EXPIRED').length;
  const expiring = certs.filter((c) => c.status === 'EXPIRING_SOON').length;
  const valid = certs.filter((c) => c.status === 'VALID').length;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1f6f5b" /></View>;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>My Certifications</Text>
      <Text style={styles.subtitle}>Pull down to refresh</Text>

      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{certs.length}</Text>
          <Text style={styles.stripLabel}>Total</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#15803d' }]}>{valid}</Text>
          <Text style={styles.stripLabel}>Valid</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#92400e' }]}>{expiring}</Text>
          <Text style={styles.stripLabel}>Expiring</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#b42318' }]}>{expired}</Text>
          <Text style={styles.stripLabel}>Expired</Text>
        </View>
      </View>

      {certs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No certifications on file</Text>
          <Text style={styles.emptySub}>Your supervisor will add certifications to your profile.</Text>
        </View>
      ) : null}

      {certs.map((cert) => {
        const isExpanded = expandedId === cert.id;
        const history = historyCache[cert.id] ?? [];
        return (
          <View
            key={cert.id}
            style={[styles.certCard, { borderColor: statusBorder(cert.status), backgroundColor: statusBg(cert.status) }]}
          >
            <View style={styles.certHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.certName}>{cert.certificationName}</Text>
                <Text style={styles.certAuthority}>{cert.issuingAuthority}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(cert.status) }]}>
                <Text style={styles.statusText}>
                  {cert.status === 'EXPIRING_SOON' ? 'EXPIRING' : cert.status}
                </Text>
              </View>
            </View>

            <View style={styles.datesRow}>
              <Text style={styles.dateLabel}>Issued: <Text style={styles.dateValue}>{formatDate(cert.issueDate)}</Text></Text>
              <Text style={styles.dateLabel}>Expires: <Text style={styles.dateValue}>{formatDate(cert.expiryDate)}</Text></Text>
            </View>

            <View style={styles.daysRow}>
              <Text style={[styles.daysText, { color: statusColor(cert.status) }]}>
                {daysLabel(cert.daysUntilExpiry, cert.status)}
              </Text>
            </View>

            {cert.notes ? <Text style={styles.notes}>{cert.notes}</Text> : null}

            <TouchableOpacity style={styles.historyBtn} onPress={() => toggleHistory(cert)}>
              <Text style={styles.historyBtnText}>
                {isExpanded ? '▲ Hide Renewal History' : '▼ View Renewal History'}
              </Text>
            </TouchableOpacity>

            {isExpanded ? (
              loadingHistory === cert.id ? (
                <ActivityIndicator size="small" color="#5d6875" style={{ marginTop: 8 }} />
              ) : history.length === 0 ? (
                <Text style={styles.noHistory}>No renewal history yet.</Text>
              ) : (
                history.map((h) => (
                  <View key={h.id} style={styles.historyRow}>
                    <Text style={styles.historyTitle}>
                      Renewed {new Date(h.renewedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                    {h.previousExpiry ? (
                      <Text style={styles.historyMeta}>
                        {formatDate(h.previousExpiry)} → {formatDate(h.newExpiry)}
                      </Text>
                    ) : null}
                    {h.previousAuthority && h.previousAuthority !== h.newAuthority ? (
                      <Text style={styles.historyMeta}>Authority: {h.previousAuthority} → {h.newAuthority}</Text>
                    ) : null}
                    <Text style={styles.historyBy}>by {h.renewedBy}</Text>
                  </View>
                ))
              )
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' },
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 2 },
  subtitle: { color: '#9aa5b1', fontSize: 12, fontWeight: '600', marginBottom: 16 },
  strip: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#dde3ea', flexDirection: 'row', marginBottom: 16, paddingVertical: 12 },
  stripItem: { flex: 1, alignItems: 'center' },
  stripValue: { color: '#17212b', fontSize: 20, fontWeight: '900' },
  stripLabel: { color: '#9aa5b1', fontSize: 10, fontWeight: '700', marginTop: 2 },
  stripDivider: { width: 1, backgroundColor: '#dde3ea' },
  emptyCard: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 10, borderWidth: 1, padding: 20, alignItems: 'center' },
  emptyTitle: { color: '#17212b', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  emptySub: { color: '#9aa5b1', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  certCard: { borderRadius: 10, borderWidth: 1.5, marginBottom: 12, padding: 14 },
  certHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  certName: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  certAuthority: { color: '#5d6875', fontSize: 12, fontWeight: '700' },
  statusBadge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dateLabel: { color: '#5d6875', fontSize: 11, fontWeight: '700' },
  dateValue: { color: '#17212b', fontWeight: '800' },
  daysRow: { marginBottom: 6 },
  daysText: { fontSize: 12, fontWeight: '800' },
  notes: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
  historyBtn: { paddingVertical: 6 },
  historyBtnText: { color: '#5d6875', fontSize: 12, fontWeight: '700' },
  noHistory: { color: '#9aa5b1', fontSize: 12, fontWeight: '600', marginTop: 4 },
  historyRow: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 6, marginTop: 6, padding: 10 },
  historyTitle: { color: '#17212b', fontSize: 12, fontWeight: '800', marginBottom: 2 },
  historyMeta: { color: '#5d6875', fontSize: 11, fontWeight: '700', marginBottom: 1 },
  historyBy: { color: '#9aa5b1', fontSize: 10, fontWeight: '700', marginTop: 2 },
});
