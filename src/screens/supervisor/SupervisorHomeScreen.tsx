import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SosButton } from '../../components/SosButton';
import { BlastAlert } from '../../components/BlastAlert';
import { SiteMapView } from '../../components/SiteMapView';
import { getSupervisorDashboard, getDangerZones, type SupervisorDashboard } from '../../services/api';
import { formatAgo } from '../../utils/time';
import type { DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession; onGoToSearch?: () => void };
type Dashboard = SupervisorDashboard;

export function SupervisorHomeScreen({ session, onGoToSearch }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.greeting}>{greeting}, {session.user.fullName.split(' ')[0]}</Text>
            <Text style={styles.site}>{session.user.assignedSite ?? 'Mine Site'}</Text>
          </View>
          <View style={styles.heroBadges}>
            {dash && (
              <View style={[styles.scoreBadge,
                dash.safetyScore >= 80 ? styles.scoreBadgeGreen
                  : dash.safetyScore >= 50 ? styles.scoreBadgeAmber
                  : styles.scoreBadgeRed]}>
                <Text style={styles.scoreText}>Safety {dash.safetyScore}</Text>
              </View>
            )}
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
        </View>

        {onGoToSearch ? (
          <Pressable onPress={onGoToSearch} style={styles.searchPill}>
            <Text style={styles.searchPillIcon}>🔍</Text>
            <Text style={styles.searchPillText}>Search workers, hazards, incidents...</Text>
            <Text style={styles.searchPillArrow}>›</Text>
          </Pressable>
        ) : null}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠ Cannot reach server — pull to retry</Text>
          </View>
        )}

        <BlastAlert />

        <SiteMapView zones={mapZones} readOnly pollIntervalMs={25000} />

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : dash ? (
          <>
            {/* Primary stats strip */}
            <View style={styles.strip}>
              <View style={styles.stripItem}>
                <Text style={[styles.stripValue, dash.workersOnSite > 0 && { color: theme.accent }]}>
                  {dash.workersOnSite}
                </Text>
                <Text style={styles.stripLabel}>On Site</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripItem}>
                <Text style={[styles.stripValue, dash.hazardCount > 0 && { color: theme.danger }]}>
                  {dash.hazardCount}
                </Text>
                <Text style={styles.stripLabel}>Hazards</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripItem}>
                <Text style={[styles.stripValue, dash.pendingShiftLogs > 0 && { color: theme.amber }]}>
                  {dash.pendingShiftLogs}
                </Text>
                <Text style={styles.stripLabel}>Pending Logs</Text>
              </View>
              <View style={styles.stripDivider} />
              <View style={styles.stripItem}>
                <Text style={[styles.stripValue, dash.unreadMessages > 0 && { color: theme.accent }]}>
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
              {dash.pendingBuyerVerifications > 0 && (
                <View style={[styles.actionCard, styles.actionCardYellow]}>
                  <Text style={styles.actionCardIcon}>👤</Text>
                  <Text style={styles.actionCardValue}>{dash.pendingBuyerVerifications}</Text>
                  <Text style={styles.actionCardLabel}>Pending buyer verification{dash.pendingBuyerVerifications !== 1 ? 's' : ''}</Text>
                  <Text style={styles.actionCardHint}>More → Pending Approvals</Text>
                </View>
              )}
              {dash.pendingMarketplaceOffers > 0 && (
                <View style={[styles.actionCard, styles.actionCardGreen]}>
                  <Text style={styles.actionCardIcon}>📦</Text>
                  <Text style={styles.actionCardValue}>{dash.pendingMarketplaceOffers}</Text>
                  <Text style={styles.actionCardLabel}>Offer{dash.pendingMarketplaceOffers !== 1 ? 's' : ''} awaiting response</Text>
                  <Text style={styles.actionCardHint}>Marketplace → Offers</Text>
                </View>
              )}
              {dash.openDisputes > 0 && (
                <View style={[styles.actionCard, styles.actionCardRed]}>
                  <Text style={styles.actionCardIcon}>⚑</Text>
                  <Text style={styles.actionCardValue}>{dash.openDisputes}</Text>
                  <Text style={styles.actionCardLabel}>Open dispute{dash.openDisputes !== 1 ? 's' : ''} on site transactions</Text>
                  <Text style={styles.actionCardHint}>Community → Transactions</Text>
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
                  <Text style={[styles.summaryValue, { color: theme.accent }]}>{dash.workersOnSite}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Active notices</Text>
                  <Text style={styles.summaryValue}>{dash.noticeCount}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Shift logs pending approval</Text>
                  <Text style={[styles.summaryValue, dash.pendingShiftLogs > 0 && { color: theme.amber }]}>
                    {dash.pendingShiftLogs}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Unread worker messages</Text>
                  <Text style={[styles.summaryValue, dash.unreadMessages > 0 && { color: theme.accent }]}>
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.bg },
    container: { paddingBottom: 110 },

    hero: { alignItems: 'center', backgroundColor: theme.bgHero, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
    greeting: { color: '#fff', fontSize: 16, fontWeight: '800' },
    site: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
    heroBadges: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    scoreBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    scoreBadgeGreen: { backgroundColor: 'rgba(74,222,128,0.18)' },
    scoreBadgeAmber: { backgroundColor: 'rgba(251,191,36,0.22)' },
    scoreBadgeRed: { backgroundColor: 'rgba(248,113,113,0.22)' },
    scoreText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    liveBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
    liveDot: { backgroundColor: theme.success, borderRadius: 4, height: 7, width: 7 },
    liveText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    searchPill: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, margin: 16, marginBottom: 0, paddingHorizontal: 14, paddingVertical: 12 },
    searchPillIcon: { fontSize: 15 },
    searchPillText: { color: theme.textMuted, flex: 1, fontSize: 13, fontWeight: '600' },
    searchPillArrow: { color: theme.textMuted, fontSize: 18 },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, margin: 16, padding: 12 },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },

    strip: { backgroundColor: theme.bgCard, borderBottomColor: theme.border, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 14 },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 20, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 9, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },

    alertBanner: { borderRadius: 8, borderWidth: 1, margin: 16, marginBottom: 0, padding: 12 },
    alertBannerRed: { backgroundColor: theme.dangerLight, borderColor: theme.danger },
    alertBannerYellow: { backgroundColor: theme.amberLight, borderColor: theme.amber },
    alertBannerText: { color: theme.amber, fontSize: 12, fontWeight: '700', textAlign: 'center' },

    cardGrid: { gap: 10, padding: 16 },
    actionCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
    actionCardYellow: { backgroundColor: theme.amberLight, borderColor: theme.amber },
    actionCardGreen: { backgroundColor: theme.successLight, borderColor: theme.success },
    actionCardRed: { backgroundColor: theme.dangerLight, borderColor: theme.danger },
    actionCardIcon: { fontSize: 22, marginBottom: 4 },
    actionCardValue: { color: theme.text, fontSize: 28, fontWeight: '900', marginBottom: 2 },
    actionCardLabel: { color: theme.textSub, fontSize: 13, fontWeight: '600' },
    actionCardHint: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 },

    section: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
    sectionTitle: { color: theme.text, fontSize: 14, fontWeight: '900', letterSpacing: -0.2, marginBottom: 10 },

    loneWorkerCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 8, padding: 12 },
    loneWorkerCardRed: { backgroundColor: theme.dangerLight, borderColor: theme.danger },
    loneWorkerIcon: { fontSize: 18 },
    loneWorkerBody: { flex: 1 },
    loneWorkerName: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    loneWorkerMeta: { color: theme.textSub, fontSize: 11, fontWeight: '600' },
    loneWorkerAlert: { color: theme.danger, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

    announcementCard: { alignItems: 'flex-start', backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 8, padding: 12 },
    announcementIcon: { fontSize: 15, marginTop: 1 },
    announcementBody: { flex: 1 },
    announcementContent: { color: theme.text, fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 3 },
    announcementMeta: { color: theme.amber, fontSize: 11, fontWeight: '600' },

    summaryCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1 },
    summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    summaryDivider: { backgroundColor: theme.bg, height: 1, marginHorizontal: 16 },
    summaryLabel: { color: theme.textSub, fontSize: 13, fontWeight: '600' },
    summaryValue: { color: theme.text, fontSize: 15, fontWeight: '900' },

    allClearCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, margin: 16, padding: 16 },
    allClearIcon: { color: theme.success, fontSize: 24 },
    allClearTitle: { color: theme.success, fontSize: 15, fontWeight: '900' },
    allClearSub: { color: theme.success, fontSize: 12, fontWeight: '600', marginTop: 2 },
  });
}
