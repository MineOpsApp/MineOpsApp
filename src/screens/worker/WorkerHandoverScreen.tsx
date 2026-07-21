import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getMyShiftLogs, getHazardReports, getNotices, getEquipmentShiftLogs } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

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
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  function load() {
    let anyFailed = false;
    return Promise.all([
      getMyShiftLogs().catch(() => { anyFailed = true; return []; }),
      getHazardReports(session.user.email).then((p: any) => p?.content ?? []).catch(() => { anyFailed = true; return []; }),
      getNotices().catch(() => { anyFailed = true; return []; }),
      getEquipmentShiftLogs().catch(() => { anyFailed = true; return []; }),
    ]).then(([s, h, n, e]) => {
      setShiftLogs(s as ShiftLog[]);
      setHazards(h as any[]);
      setNotices(n as any[]);
      setEquipmentLogs(e as EquipmentLog[]);
      setConnectionError(anyFailed);
    }).finally(() => setLoading(false));
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
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Shift Handover</Text>
        <Text style={styles.pageDate}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
      </View>

      <Text style={styles.handoverSub}>Summary of the last 24 hours for {session.user.fullName}</Text>
      {connectionError ? (
        <View style={styles.errorBanner}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            <Ionicons name="warning" size={14} color={theme.danger} />
            <Text style={styles.errorBannerText}>Cannot reach server — check your connection</Text>
          </View>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.loadingCard}><Text style={styles.loadingText}>Loading handover summary...</Text></View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="clipboard" size={16} color={theme.accent} />
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="warning" size={16} color={theme.accent} />
          <Text style={styles.sectionTitle}>Hazards Reported</Text>
          {recentHazards.length > 0 && <View style={styles.sectionBadgeRed}><Text style={styles.sectionBadgeText}>{recentHazards.length}</Text></View>}
        </View>
        {recentHazards.length === 0 ? (
          <View style={styles.clearRow}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
            <Text style={styles.clearRowText}>No hazards reported</Text>
          </View>
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="construct" size={16} color={theme.accent} />
          <Text style={styles.sectionTitle}>Equipment Checks</Text>
          <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{recentEquipment.length}</Text></View>
        </View>
        {recentEquipment.length === 0 ? (
          <View style={styles.emptyRow}><Text style={styles.emptyText}>No equipment checks logged</Text></View>
        ) : recentEquipment.slice(0, 3).map((e) => (
          <View key={e.id} style={styles.logRow}>
            <View style={[styles.logDot, { backgroundColor: e.status === 'Flagged' ? '#b42318' : e.status === 'Maintenance' ? '#1d5f99' : theme.accent }]} />
            <View style={styles.logBody}>
              <Text style={styles.logTitle}>{e.checkType} · {e.equipmentCode}</Text>
              <Text style={styles.logMeta}>{e.status}{e.notes ? ` — ${e.notes}` : ''}</Text>
            </View>
            <Text style={styles.logTime}>{formatTime(e.loggedAt)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="megaphone" size={16} color={theme.accent} />
          <Text style={styles.sectionTitle}>Unread Notices</Text>
          {unreadNotices.length > 0 && <View style={styles.sectionBadgeRed}><Text style={styles.sectionBadgeText}>{unreadNotices.length}</Text></View>}
        </View>
        {unreadNotices.length === 0 ? (
          <View style={[styles.clearRow, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <Ionicons name="checkmark-circle" size={14} color={theme.accent} />
            <Text style={styles.clearRowText}>All notices acknowledged</Text>
          </View>
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 4 },
    pageTitle: { ...typography.h1, color: theme.text, flex: 1 },
    pageDate: { ...typography.caption, color: theme.textMuted, fontWeight: '700' },
    handoverSub: { ...typography.caption, color: theme.textMuted, marginBottom: spacing.xl },
    loadingCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.lg },
    loadingText: { ...typography.caption, color: theme.textMuted },
    section: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: spacing.md, overflow: 'hidden' },
    sectionHeader: { alignItems: 'center', borderBottomColor: theme.bgInput, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: 14 },
    sectionTitle: { ...typography.bodyBold, color: theme.text, flex: 1, fontSize: 14 },
    sectionBadge: { backgroundColor: theme.bgInput, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    sectionBadgeRed: { backgroundColor: theme.dangerLight, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    sectionBadgeText: { ...typography.label, color: theme.textSub },
    summaryRow: { flexDirection: 'row', padding: 14, paddingBottom: spacing.sm },
    summaryItem: { flex: 1 },
    summaryValue: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 2 },
    summaryLabel: { ...typography.label, color: theme.textMuted },
    logRow: { alignItems: 'center', borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
    hazardRow: { alignItems: 'center', borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10 },
    noticeRow: { alignItems: 'center', borderTopColor: theme.bgInput, borderTopWidth: 1, flexDirection: 'row', overflow: 'hidden' },
    noticeAccent: { alignSelf: 'stretch', backgroundColor: theme.accent, width: 3 },
    logDot: { backgroundColor: theme.accent, borderRadius: 5, height: 10, marginRight: 10, width: 10 },
    severityDot: { borderRadius: 5, height: 10, marginRight: 10, width: 10 },
    logBody: { flex: 1, paddingLeft: 4 },
    logTitle: { ...typography.bodyBold, color: theme.text, fontSize: 13, marginBottom: 1 },
    logMeta: { ...typography.caption, color: theme.textMuted },
    logTime: { ...typography.label, color: theme.textMuted, marginLeft: spacing.sm, textTransform: 'none' as const },
    emptyRow: { padding: 14 },
    emptyText: { ...typography.caption, color: theme.textMuted },
    clearRow: { padding: 14 },
    clearRowText: { ...typography.bodyBold, color: theme.accent, fontSize: 13 },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, marginBottom: spacing.lg, padding: spacing.md },
    errorBannerText: { ...typography.bodyBold, color: theme.danger, textAlign: 'center' },
  });
}
