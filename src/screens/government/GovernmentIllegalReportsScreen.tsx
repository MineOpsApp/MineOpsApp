import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getGovernmentIllegalMineReports, reviewIllegalMineReport, type IllegalMineReport, parseApiError } from '../../services/api';

const STATUSES = ['UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'];

export function GovernmentIllegalReportsScreen() {
  const [reports, setReports] = useState<IllegalMineReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [acting, setActing] = useState(false);

  async function load() {
    try { setReports(await getGovernmentIllegalMineReports()); } catch { /* best-effort */ }
  }

  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleReview(report: IllegalMineReport, status: string) {
    setActing(true);
    try {
      const updated = await reviewIllegalMineReport(report.id, { status, reviewNotes: reviewNotes.trim() || undefined });
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
      setReviewingId(null);
      setReviewNotes('');
    } catch (e) { Alert.alert('Failed', parseApiError(e)); }
    setActing(false);
  }

  function statusColor(s: string) {
    if (s === 'CONFIRMED') return '#b42318';
    if (s === 'DISMISSED') return '#6b7280';
    if (s === 'UNDER_REVIEW') return '#92400e';
    return '#1d5f99';
  }

  function fmt(d: string) {
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Illegal Mining Reports</Text>
      <Text style={styles.sub}>Tips submitted by registered users</Text>
      {reports.length === 0 && <Text style={styles.empty}>No reports submitted yet.</Text>}
      {reports.map(r => (
        <View key={r.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.location}>{r.locationDescription}</Text>
              <Text style={styles.meta}>{r.reporterRole} · {r.reporterEmail} · {fmt(r.createdAt)}</Text>
            </View>
            <Text style={[styles.status, { color: statusColor(r.status) }]}>{r.status.replace('_', ' ')}</Text>
          </View>
          {r.details ? <Text style={styles.details}>{r.details}</Text> : null}
          {r.reviewNotes ? <Text style={styles.reviewNotes}>Review: {r.reviewNotes}</Text> : null}
          {reviewingId === r.id ? (
            <View style={styles.reviewPanel}>
              <TextInput
                style={styles.input}
                value={reviewNotes}
                onChangeText={setReviewNotes}
                placeholder="Review notes (optional)"
                placeholderTextColor="#8fa3b8"
                multiline
              />
              <View style={styles.statusRow}>
                {STATUSES.map(s => (
                  <Pressable key={s} onPress={() => handleReview(r, s)} disabled={acting} style={[styles.statusBtn, { borderColor: statusColor(s) }]}>
                    <Text style={[styles.statusBtnText, { color: statusColor(s) }]}>{s.replace('_', ' ')}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setReviewingId(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW' ? (
              <Pressable onPress={() => { setReviewingId(r.id); setReviewNotes(''); }} style={styles.reviewBtn}>
                <Text style={styles.reviewBtnText}>Review</Text>
              </Pressable>
            ) : null
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  sub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 16 },
  empty: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 12, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  location: { color: '#17212b', fontSize: 14, fontWeight: '800', marginBottom: 3 },
  meta: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  status: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  details: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginTop: 4 },
  reviewNotes: { color: '#1f6f5b', fontSize: 12, fontWeight: '700', marginTop: 6, fontStyle: 'italic' },
  reviewPanel: { marginTop: 10, gap: 8 },
  input: { backgroundColor: '#f0f2f5', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 13, padding: 10, minHeight: 60 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusBtn: { borderRadius: 6, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6 },
  statusBtnText: { fontSize: 11, fontWeight: '800' },
  cancelBtn: { alignSelf: 'flex-start' },
  cancelBtnText: { color: '#8fa3b8', fontSize: 12, fontWeight: '700' },
  reviewBtn: { alignSelf: 'flex-start', backgroundColor: '#eff6ff', borderColor: '#1d5f99', borderRadius: 6, borderWidth: 1, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6 },
  reviewBtnText: { color: '#1d5f99', fontSize: 12, fontWeight: '800' },
});
