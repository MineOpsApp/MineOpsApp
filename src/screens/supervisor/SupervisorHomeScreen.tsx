import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SosButton } from '../../components/SosButton';
import { BlastAlert } from '../../components/BlastAlert';
import { SiteMapView } from '../../components/SiteMapView';
import { getSupervisorDashboard, getDangerZones, type SupervisorDashboard } from '../../services/api';
import { formatAgo } from '../../utils/time';
import type { DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };
type Dashboard = SupervisorDashboard;

export function SupervisorHomeScreen({ session }: Props) {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mapZones, setMapZones] = useState<DangerZone[]>([]);

  async function load() {
    try {
      const data = await getSupervisorDashboard();
      setDash(data);
      setError(false);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    getDangerZones().then(setMapZones).catch(() => {});
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.greeting}>{greeting}, {session.user.fullName.split(' ')[0]}</Text>
            <Text style={styles.site}>{session.user.assignedSite ?? 'Mine Site'}</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ Cannot reach server — pull to retry</Text>
          </View>
        )}

        <BlastAlert />

        <SiteMapView zones={mapZones} readOnly pollIntervalMs={25000} />

        {loading ? (
          <ActivityIndicator color="#1f6f5b" style={{ marginTop: 40 }} />
        ) : dash ? (
          <>
            {/* Primary stats strip */}
            <View style={styles.strip}>
              <View style={styles.stripItem}>
                <Text style={[styles.stripValue, dash.workersOnSite > 0 && { color: '#1f6f5b' }]}>
                  {dash.workersOnSite}
                </Text>
                <Text style={styles.stripLabel}>On Site</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripItem}>
                <Text style={[styles.stripValue, dash.hazardCount > 0 && { color: '#b42318' }]}>
                  {dash.hazardCount}
                </Text>
                <Text style={styles.stripLabel}>Hazards</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripItem}>
                <Text style={[styles.stripValue, dash.pendingShiftLogs > 0 && { color: '#d29922' }]}>
                  {dash.pendingShiftLogs}
                </Text>
                <Text style={styles.stripLabel}>Pending Logs</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripItem}>
                <Text style={[styles.stripValue, dash.unreadMessages > 0 && { color: '#1f6f5b' }]}>
                  {dash.unreadMessages}
                </Text>
                <Text style={styles.stripLabel}>New Messages</Text>
              </View>
            </View>

            {/* Alert banners */}
            {(dash.certExpired > 0 || dash.certExpiringSoon > 0) && (
              <View style={[styles.alertBanner,
                dash.certExpired > 0 ? styles.alertBannerRed : styles.alertBannerYellow]}>
                <Text style={styles.alertBannerText}>
                  🎓 {dash.certExpired > 0
                    ? `${dash.certExpired} certification${dash.certExpired !== 1 ? 's' : ''} expired`
                    : `${dash.certExpiringSoon} certification${dash.certExpiringSoon !== 1 ? 's' : ''} expiring within 30 days`}
                  {' · More → Certifications'}
                </Text>
              </View>
            )}

            {/* Action cards */}
            <View style={styles.cardGrid}>
              {dash.pendingShiftLogs > 0 && (
                <View style={[styles.actionCard, styles.actionCardYellow]}>
                  <Text style={styles.actionCardIcon}>📋</Text>
                  <Text style={styles.actionCardValue}>{dash.pendingShiftLogs}</Text>
                  <Text style={styles.actionCardLabel}>Shift logs awaiting your approval</Text>
                  <Text style={styles.actionCardHint}>More → Shift Logs</Text>
                </View>
              )}
              {dash.unreadMessages > 0 && (
                <View style={[styles.actionCard, styles.actionCardGreen]}>
                  <Text style={styles.actionCardIcon}>💬</Text>
                  <Text style={styles.actionCardValue}>{dash.unreadMessages}</Text>
                  <Text style={styles.actionCardLabel}>Unread message{dash.unreadMessages !== 1 ? 's' : ''} from workers</Text>
                  <Text style={styles.actionCardHint}>More → Worker Messages</Text>
                </View>
              )}
              {dash.hazardCount > 0 && (
                <View style={[styles.actionCard, styles.actionCardRed]}>
                  <Text style={styles.actionCardIcon}>⚠</Text>
                  <Text style={styles.actionCardValue}>{dash.hazardCount}</Text>
                  <Text style={styles.actionCardLabel}>Active hazard{dash.hazardCount !== 1 ? 's' : ''} on site</Text>
                  <Text style={styles.actionCardHint}>Hazards tab</Text>
                </View>
              )}
            </View>

            {/* Lone workers */}
            {dash.activeLoneWorkers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lone Workers Active</Text>
                {dash.activeLoneWorkers.map((w) => {
                  const overdue = new Date(w.deadline).getTime() < Date.now();
                  return (
                    <View key={w.id} style={[styles.loneWorkerCard, overdue && styles.loneWorkerCardRed]}>
                      <Text style={styles.loneWorkerIcon}>{overdue ? '⚠' : '🛡'}</Text>
                      <View style={styles.loneWorkerBody}>
                        <Text style={styles.loneWorkerName}>{w.workerName}</Text>
                        <Text style={styles.loneWorkerMeta}>
                          {overdue
                            ? 'OVERDUE — missed check-in'
                            : `Next check-in by ${new Date(w.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          {' · '}{w.intervalMinutes}min interval
                        </Text>
                      </View>
                      {overdue && <Text style={styles.loneWorkerAlert}>ALERT</Text>}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Announcements */}
            {dash.announcements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Announcements</Text>
                {dash.announcements.map((a) => (
                  <View key={a.id} style={styles.announcementCard}>
                    <Text style={styles.announcementIcon}>📢</Text>
                    <View style={styles.announcementBody}>
                      <Text style={styles.announcementContent}>{a.content}</Text>
                      <Text style={styles.announcementMeta}>{a.createdByName} · {formatAgo(a.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Site summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Site Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Workers on site</Text>
                  <Text style={[styles.summaryValue, { color: '#1f6f5b' }]}>{dash.workersOnSite}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Active notices</Text>
                  <Text style={styles.summaryValue}>{dash.noticeCount}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shift logs pending approval</Text>
                  <Text style={[styles.summaryValue, dash.pendingShiftLogs > 0 && { color: '#d29922' }]}>
                    {dash.pendingShiftLogs}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Unread worker messages</Text>
                  <Text style={[styles.summaryValue, dash.unreadMessages > 0 && { color: '#1f6f5b' }]}>
                    {dash.unreadMessages}
                  </Text>
                </View>
              </View>
            </View>

            {/* All clear state */}
            {dash.pendingShiftLogs === 0 && dash.unreadMessages === 0 && dash.hazardCount === 0 && (
              <View style={styles.allClearCard}>
                <Text style={styles.allClearIcon}>✓</Text>
                <View>
                  <Text style={styles.allClearTitle}>All clear</Text>
                  <Text style={styles.allClearSub}>No pending actions · {dash.workersOnSite} worker{dash.workersOnSite !== 1 ? 's' : ''} on site</Text>
                </View>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
      <SosButton role={session.user.role} user={session.user} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0f2f5' },
  container: { paddingBottom: 110 },

  hero: { alignItems: 'center', backgroundColor: '#17212b', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  greeting: { color: '#fff', fontSize: 16, fontWeight: '800' },
  site: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  liveBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  liveDot: { backgroundColor: '#4ade80', borderRadius: 4, height: 7, width: 7 },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  errorBanner: { backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, margin: 16, padding: 12 },
  errorText: { color: '#b42318', fontSize: 13, fontWeight: '700', textAlign: 'center' },

  strip: { backgroundColor: '#fff', borderBottomColor: '#e5e9ef', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 14 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 20, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 9, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },

  alertBanner: { borderRadius: 8, borderWidth: 1, margin: 16, marginBottom: 0, padding: 12 },
  alertBannerRed: { backgroundColor: '#fff5f5', borderColor: '#fca5a5' },
  alertBannerYellow: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  alertBannerText: { color: '#92400e', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  cardGrid: { gap: 10, padding: 16 },
  actionCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
  actionCardYellow: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  actionCardGreen: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  actionCardRed: { backgroundColor: '#fff5f5', borderColor: '#fca5a5' },
  actionCardIcon: { fontSize: 22, marginBottom: 4 },
  actionCardValue: { color: '#17212b', fontSize: 28, fontWeight: '900', marginBottom: 2 },
  actionCardLabel: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
  actionCardHint: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 4 },

  section: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  sectionTitle: { color: '#17212b', fontSize: 14, fontWeight: '900', letterSpacing: -0.2, marginBottom: 10 },

  loneWorkerCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 8, padding: 12 },
  loneWorkerCardRed: { backgroundColor: '#fff5f5', borderColor: '#fca5a5' },
  loneWorkerIcon: { fontSize: 18 },
  loneWorkerBody: { flex: 1 },
  loneWorkerName: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  loneWorkerMeta: { color: '#5d6875', fontSize: 11, fontWeight: '600' },
  loneWorkerAlert: { color: '#b42318', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  announcementCard: { alignItems: 'flex-start', backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 8, padding: 12 },
  announcementIcon: { fontSize: 15, marginTop: 1 },
  announcementBody: { flex: 1 },
  announcementContent: { color: '#17212b', fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 3 },
  announcementMeta: { color: '#a16207', fontSize: 11, fontWeight: '600' },

  summaryCard: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1 },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  summaryDivider: { backgroundColor: '#f0f2f5', height: 1, marginHorizontal: 16 },
  summaryLabel: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
  summaryValue: { color: '#17212b', fontSize: 15, fontWeight: '900' },

  allClearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, margin: 16, padding: 16 },
  allClearIcon: { color: '#16a34a', fontSize: 24 },
  allClearTitle: { color: '#15803d', fontSize: 15, fontWeight: '900' },
  allClearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 2 },
});
