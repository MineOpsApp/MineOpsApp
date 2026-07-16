import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getCertificationHistory, getMyCertifications } from '../../services/api';
import type { Certification, CertificationHistory } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<number, CertificationHistory[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    try { setCerts(await getMyCertifications()); } catch { setLoadError(true); }
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setLoadError(false);
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
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
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

      {loadError && certs.length === 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Could not load certifications. Pull to refresh.</Text>
        </View>
      ) : certs.length === 0 ? (
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
                <ActivityIndicator size="small" color={theme.textSub} style={{ marginTop: 8 }} />
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    center: { alignItems: 'center', backgroundColor: theme.bg, flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    title: { ...typography.h1, color: theme.text, marginBottom: 2 },
    subtitle: { ...typography.caption, color: theme.textMuted, marginBottom: spacing.lg },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.lg, paddingVertical: spacing.md },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 20, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: spacing.xl },
    emptyTitle: { ...typography.bodyBold, color: theme.text, marginBottom: 6 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, marginBottom: spacing.md, padding: 14 },
    errorBannerText: { color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    certCard: { borderRadius: 10, borderWidth: 1.5, marginBottom: spacing.md, padding: 14 },
    certHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: spacing.sm },
    certName: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    certAuthority: { ...typography.caption, color: theme.textSub, fontWeight: '700' },
    statusBadge: { borderRadius: 5, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    statusText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    dateLabel: { ...typography.label, color: theme.textSub, textTransform: 'none' as const },
    dateValue: { color: theme.text, fontWeight: '800' },
    daysRow: { marginBottom: 6 },
    daysText: { fontSize: 12, fontWeight: '800' },
    notes: { ...typography.caption, color: theme.textSub, fontStyle: 'italic', marginBottom: spacing.sm },
    historyBtn: { paddingVertical: 6 },
    historyBtnText: { color: theme.textSub, fontSize: 12, fontWeight: '700' },
    noHistory: { ...typography.caption, color: theme.textMuted, marginTop: 4 },
    historyRow: { backgroundColor: theme.bgCard, borderRadius: 6, marginTop: 6, padding: 10 },
    historyTitle: { color: theme.text, fontSize: 12, fontWeight: '800', marginBottom: 2 },
    historyMeta: { color: theme.textSub, fontSize: 11, fontWeight: '700', marginBottom: 1 },
    historyBy: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  });
}
