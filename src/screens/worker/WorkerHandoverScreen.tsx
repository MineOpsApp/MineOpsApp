import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyShiftLogs, getHazardReports, getNotices, getEquipmentShiftLogs } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

type ShiftLog = {
  id: number;
  zone: string;
  shiftType: string;
  mineralType: string;
  volumeExtracted: number;
  unit: string;
  equipmentCode: string;
  notes: string;
  submittedAt: string;
};

type EquipmentLog = {
  id: number;
  equipmentCode: string;
  equipmentName: string;
  status: string;
  checkType: string;
  notes: string;
  loggedAt: string;
};

export function WorkerHandoverScreen({ session }: Props) {
  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  function load() {
    return Promise.all([
      getMyShiftLogs().catch(() => []),
      getHazardReports(session.user.email).catch(() => []),
      getNotices().catch(() => []),
      getEquipmentShiftLogs().catch(() => []),
    ]).then(([s, h, n, e]) => {
      setShiftLogs(s as ShiftLog[]);
      setHazards(h as any[]);
      setNotices(n as any[]);
      setEquipmentLogs(e as EquipmentLog[]);
      setConnectionError(false);
    }).catch(() => setConnectionError(true))
    .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function formatTime(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  // Get last 24h data
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentShifts = shiftLogs.filter((s) => new Date(s.submittedAt) > yesterday);
  const recentHazards = hazards.filter((h) => new Date(h.createdAt) > yesterday);
  const recentEquipment = equipmentLogs.filter((e) => new Date(e.loggedAt) > yesterday);
  const unreadNotices = notices.filter((n) => !n.seenBy?.some((s: any) => s.email.toLowerCase() === session.user.email.toLowerCase()));

  const totalVolume = recentShifts.reduce((sum, s) => sum + Number(s.volumeExtracted || 0), 0);
  const minerals = [...new Set(recentShifts.map((s) => s.mineralType))];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Shift Handover</Text>
        <Text style={styles.pageDate}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
      </View>

      <Text style={styles.handoverSub}>Summary of the last 24 hours for {session.user.fullName}</Text>
      {connectionError ? (
  <View style={styles.errorBanner}>
    <Text style={styles.errorBannerText}>⚠ Cannot reach server — check your connection</Text>
  </View>
) : null}
      {loading ? (
        <View style={styles.loadingCard}><Text style={styles.loadingText}>Loading handover summary...</Text></View>
      ) : null}

      {/* Production summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📋</Text>
          <Text style={styles.sectionTitle}>Production</Text>
          <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{recentShifts.length} shifts</Text></View>
        </View>
        {recentShifts.length === 0 ? (
          <View style={styles.emptyRow}><Text style={styles.emptyText}>No shift logs in last 24h</Text></View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalVolume.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>Total Volume</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{minerals.join(', ') || '—'}</Text>
                <Text style={styles.summaryLabel}>Minerals</Text>
              </View>
            </View>
            {recentShifts.slice(0, 3).map((s) => (
              <View key={s.id} style={styles.logRow}>
                <View style={styles.logDot} />
                <View style={styles.logBody}>
                  <Text style={styles.logTitle}>{s.shiftType} · {s.zone}</Text>
                  <Text style={styles.logMeta}>{s.mineralType} — {s.volumeExtracted}{s.unit}</Text>
                </View>
                <Text style={styles.logTime}>{formatTime(s.submittedAt)}</Text>
              </View>
            ))}
          </>
        )}
      </View>

      {/* Hazards */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>⚠</Text>
          <Text style={styles.sectionTitle}>Hazards Reported</Text>
          {recentHazards.length > 0 && <View style={styles.sectionBadgeRed}><Text style={styles.sectionBadgeText}>{recentHazards.length}</Text></View>}
        </View>
        {recentHazards.length === 0 ? (
          <View style={styles.clearRow}>
            <Text style={styles.clearRowText}>✓ No hazards reported</Text>
          </View>
        ) : recentHazards.slice(0, 3).map((h) => (
          <View key={h.id} style={styles.hazardRow}>
            <View style={[styles.severityDot, { backgroundColor: h.severity === 'High' || h.severity === 'Critical' ? '#b42318' : '#a15c00' }]} />
            <View style={styles.logBody}>
              <Text style={styles.logTitle}>{h.hazardType} — {h.location}</Text>
              <Text style={styles.logMeta}>{h.status} · {h.severity ?? 'Medium'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Equipment checks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>⚙</Text>
          <Text style={styles.sectionTitle}>Equipment Checks</Text>
          <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{recentEquipment.length}</Text></View>
        </View>
        {recentEquipment.length === 0 ? (
          <View style={styles.emptyRow}><Text style={styles.emptyText}>No equipment checks logged</Text></View>
        ) : recentEquipment.slice(0, 3).map((e) => (
          <View key={e.id} style={styles.logRow}>
            <View style={[styles.logDot, { backgroundColor: e.status === 'Flagged' ? '#b42318' : e.status === 'Maintenance' ? '#1d5f99' : '#1f6f5b' }]} />
            <View style={styles.logBody}>
              <Text style={styles.logTitle}>{e.checkType} · {e.equipmentCode}</Text>
              <Text style={styles.logMeta}>{e.status}{e.notes ? ` — ${e.notes}` : ''}</Text>
            </View>
            <Text style={styles.logTime}>{formatTime(e.loggedAt)}</Text>
          </View>
        ))}
      </View>

      {/* Unread notices */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📢</Text>
          <Text style={styles.sectionTitle}>Unread Notices</Text>
          {unreadNotices.length > 0 && <View style={styles.sectionBadgeRed}><Text style={styles.sectionBadgeText}>{unreadNotices.length}</Text></View>}
        </View>
        {unreadNotices.length === 0 ? (
          <View style={styles.clearRow}><Text style={styles.clearRowText}>✓ All notices acknowledged</Text></View>
        ) : unreadNotices.slice(0, 3).map((n) => (
          <View key={n.id} style={styles.noticeRow}>
            <View style={styles.noticeAccent} />
            <View style={styles.logBody}>
              <Text style={styles.logTitle}>{n.title}</Text>
              <Text style={styles.logMeta}>{n.message}</Text>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pageTitle: { color: '#17212b', flex: 1, fontSize: 22, fontWeight: '900' },
  pageDate: { color: '#8fa3b8', fontSize: 12, fontWeight: '700' },
  handoverSub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', marginBottom: 20 },
  loadingCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  loadingText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  section: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  sectionHeader: { alignItems: 'center', borderBottomColor: '#f4f6f8', borderBottomWidth: 1, flexDirection: 'row', gap: 8, padding: 14 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { color: '#17212b', flex: 1, fontSize: 14, fontWeight: '900' },
  sectionBadge: { backgroundColor: '#f4f6f8', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  sectionBadgeRed: { backgroundColor: '#fff5f5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  sectionBadgeText: { color: '#5d6875', fontSize: 11, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', padding: 14, paddingBottom: 8 },
  summaryItem: { flex: 1 },
  summaryValue: { color: '#17212b', fontSize: 18, fontWeight: '900', marginBottom: 2 },
  summaryLabel: { color: '#8fa3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  logRow: { alignItems: 'center', borderTopColor: '#f4f6f8', borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
  hazardRow: { alignItems: 'center', borderTopColor: '#f4f6f8', borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
  noticeRow: { alignItems: 'center', borderTopColor: '#f4f6f8', borderTopWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  noticeAccent: { backgroundColor: '#1f6f5b', alignSelf: 'stretch', width: 3 },
  logDot: { backgroundColor: '#1f6f5b', borderRadius: 5, height: 10, marginRight: 10, width: 10 },
  severityDot: { borderRadius: 5, height: 10, marginRight: 10, width: 10 },
  logBody: { flex: 1, paddingLeft: 4 },
  logTitle: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 1 },
  logMeta: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  logTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '700', marginLeft: 8 },
  emptyRow: { padding: 14 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  clearRow: { padding: 14 },
  clearRowText: { color: '#1f6f5b', fontSize: 13, fontWeight: '700' },

  errorBanner: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 12 },
errorBannerText: { color: '#b42318', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});