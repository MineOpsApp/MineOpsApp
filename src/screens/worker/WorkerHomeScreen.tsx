import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BlastAlert } from '../../components/BlastAlert';
import { SiteMapView } from '../../components/SiteMapView';
import { SosButton } from '../../components/SosButton';
import { getAllBlasts, getMyCertifications, getMyEmergencyContacts, getMyInventoryContributions, getNotices, getSiteAnnouncements, getSiteHazardAlerts, getLoneWorkerStatus, getDangerZones, type LoneWorkerStatus } from '../../services/api';
import type { InventoryTransaction } from '../../services/api';
import type { HazardReport, Notice, ShiftAnnouncement } from '../../types/actions';
import { formatAgo, formatDateTime } from '../../utils/time';
import type { AuthSession } from '../../types/auth';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession; onGoToLoneWorker?: () => void; onGoToSearch?: () => void };

const SEVERITY_COLOR: Record<string, string> = {
  Critical: '#7f1d1d',
  High: '#b42318',
  Medium: '#a15c00',
  Low: '#1f6f5b',
};

export function WorkerHomeScreen({ session, onGoToLoneWorker, onGoToSearch }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [announcements, setAnnouncements] = useState<ShiftAnnouncement[]>([]);
  const [loadingCore, setLoadingCore] = useState(true);
  const [hazardError, setHazardError] = useState(false);
  const [blastHistory, setBlastHistory] = useState<any[]>([]);
  const [hasContacts, setHasContacts] = useState(true);
  const [contributions, setContributions] = useState<InventoryTransaction[]>([]);
  const [expiredCerts, setExpiredCerts] = useState(0);
  const [expiringCerts, setExpiringCerts] = useState(0);
  const [loneWorker, setLoneWorker] = useState<LoneWorkerStatus | null>(null);
  const loneWorkerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mapZones, setMapZones] = useState<import('../../types/actions').DangerZone[]>([]);

  useEffect(() => {
    let done = 0;
    const finish = () => { if (++done === 3) setLoadingCore(false); };
    getSiteHazardAlerts().then(setHazards).catch(() => setHazardError(true)).finally(finish);
    getNotices().then(setNotices).catch(() => {}).finally(finish);
    getSiteAnnouncements().then(setAnnouncements).catch(() => {}).finally(finish);
    getAllBlasts().then(setBlastHistory).catch(() => {});
    getDangerZones().then(setMapZones).catch(() => {});
    getMyEmergencyContacts().then((c) => setHasContacts(c.length > 0)).catch(() => {});
    getMyInventoryContributions().then(setContributions).catch(() => {});
    getMyCertifications().then((certs) => {
      setExpiredCerts(certs.filter((c) => c.status === 'EXPIRED').length);
      setExpiringCerts(certs.filter((c) => c.status === 'EXPIRING_SOON').length);
    }).catch(() => {});
    const pollLW = () => getLoneWorkerStatus().then(setLoneWorker).catch(() => {});
    pollLW();
    loneWorkerPollRef.current = setInterval(pollLW, 30000);
    return () => { if (loneWorkerPollRef.current) clearInterval(loneWorkerPollRef.current); };
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>{greeting}, {session.user.fullName.split(' ')[0]}</Text>
            <Text style={styles.site}>{session.user.assignedSite ?? 'Obuasi Mine'}</Text>
          </View>
          <View style={styles.shiftBadge}>
            <View style={styles.shiftDot} />
            <Text style={styles.shiftText}>On Shift</Text>
          </View>
        </View>

        {onGoToSearch ? (
          <Pressable onPress={onGoToSearch} style={styles.searchPill}>
            <Ionicons name="search" size={15} color={theme.textMuted} />
            <Text style={styles.searchPillText}>Search workers, hazards, incidents...</Text>
            <Text style={styles.searchPillArrow}>›</Text>
          </Pressable>
        ) : null}

        {loneWorker?.active && (
          <Pressable
            style={[
              styles.loneWorkerBanner,
              loneWorker.deadline && new Date(loneWorker.deadline).getTime() < Date.now()
                ? styles.loneWorkerBannerRed : styles.loneWorkerBannerGreen,
            ]}
            onPress={onGoToLoneWorker}
          >
            <MaterialCommunityIcons name="shield-account" size={22} color={loneWorker.deadline && new Date(loneWorker.deadline).getTime() < Date.now() ? theme.danger : theme.success} />
            <View style={styles.loneWorkerBannerBody}>
              <Text style={styles.loneWorkerBannerTitle}>Lone Worker Active</Text>
              <Text style={styles.loneWorkerBannerSub}>
                {loneWorker.deadline && new Date(loneWorker.deadline).getTime() < Date.now()
                  ? 'OVERDUE — tap to check in now'
                  : `Next check-in due ${new Date(loneWorker.deadline ?? '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Tap to check in`}
              </Text>
            </View>
          </Pressable>
        )}

        {hazardError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={18} color={theme.danger} />
            <Text style={styles.errorBannerText}>Cannot reach server — check your connection</Text>
          </View>
        ) : null}

        {expiredCerts > 0 ? (
          <View style={styles.certExpiredBanner}>
            <MaterialCommunityIcons name="certificate-outline" size={16} color={theme.danger} />
            <Text style={styles.certBannerText}>{expiredCerts} certification{expiredCerts !== 1 ? 's' : ''} expired — visit More → My Certifications</Text>
          </View>
        ) : expiringCerts > 0 ? (
          <View style={styles.certExpiringBanner}>
            <MaterialCommunityIcons name="certificate-outline" size={16} color={theme.amber} />
            <Text style={styles.certBannerText}>{expiringCerts} certification{expiringCerts !== 1 ? 's' : ''} expiring within 30 days</Text>
          </View>
        ) : null}

        {!hasContacts && !loadingCore ? (
          <View style={styles.contactsWarning}>
            <Ionicons name="call" size={24} color={theme.amber} />
            <View style={styles.contactsWarningBody}>
              <Text style={styles.contactsWarningTitle}>No emergency contacts set</Text>
              <Text style={styles.contactsWarningSub}>Add contacts so supervisors can reach someone if you're in danger → My Account · Emergency Contacts</Text>
            </View>
          </View>
        ) : null}

        {/* Status strip */}
        <View style={styles.strip}>
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, hazards.length > 0 && { color: '#b42318' }]}>{hazards.length}</Text>
            <Text style={styles.stripLabel}>Alerts</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripValue}>{notices.length}</Text>
            <Text style={styles.stripLabel}>Notices</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, { color: theme.accent }]}>Active</Text>
            <Text style={styles.stripLabel}>Site Status</Text>
          </View>
        </View>

        <BlastAlert />

        {/* Site map */}
        <SiteMapView zones={mapZones} readOnly pollIntervalMs={25000} />

        {/* Shift Announcements */}
        {announcements.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Announcements</Text>
            {announcements.map((a) => (
              <View key={a.id} style={styles.announcementCard}>
                <Ionicons name="megaphone" size={16} color={theme.amber} />
                <View style={styles.announcementBody}>
                  <Text style={styles.announcementContent}>{a.content}</Text>
                  <Text style={styles.announcementMeta}>{a.createdByName} · {formatAgo(a.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Site Alerts</Text>
            {hazards.length > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{hazards.length}</Text>
              </View>
            )}
          </View>

          {loadingCore ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Loading...</Text></View>
          ) : hazards.length === 0 ? (
            <View style={styles.clearCard}>
              <Ionicons name="checkmark-circle" size={22} color={theme.success} />
              <View>
                <Text style={styles.clearTitle}>All Clear</Text>
                <Text style={styles.clearSub}>No active hazards on site</Text>
              </View>
            </View>
          ) : (
            hazards.slice(0, 5).map((h) => (
              <View key={h.id} style={styles.alertCard}>
                <View style={[styles.severityBar, { backgroundColor: SEVERITY_COLOR[h.severity ?? 'Medium'] ?? '#a15c00' }]} />
                <View style={styles.alertBody}>
                  <Text style={styles.alertType}>{h.hazardType}</Text>
                  <Text style={styles.alertLocation}>{h.location} · {h.status}</Text>
                </View>
                <View style={[styles.severityPill, { backgroundColor: SEVERITY_COLOR[h.severity ?? 'Medium'] ?? '#a15c00' }]}>
                  <Text style={styles.severityPillText}>{h.severity ?? 'Med'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Notices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notices</Text>
          {!loadingCore && notices.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>No notices posted</Text></View>
          ) : null}
          {notices.slice(0, 3).map((n) => (
            <View key={n.id} style={styles.noticeCard}>
              <View style={styles.noticeAccent} />
              <View style={styles.noticeBody}>
                <Text style={styles.noticeTitle}>{n.title}</Text>
                <Text style={styles.noticeMeta}>{n.message}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* My Contributions */}
        {contributions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Approved Contributions</Text>
            {(() => {
              const totals: Record<string, { volume: number; unit: string }> = {};
              contributions.forEach((tx) => {
                const key = tx.mineralType;
                if (!totals[key]) totals[key] = { volume: 0, unit: tx.unit };
                totals[key].volume += Number(tx.volumeAdded);
              });
              return Object.entries(totals).map(([mineral, { volume, unit }]) => (
                <View key={mineral} style={styles.contribCard}>
                  <Text style={styles.contribMineral}>{mineral}</Text>
                  <Text style={styles.contribVol}>{volume.toFixed(2)} <Text style={styles.contribUnit}>{unit}</Text></Text>
                </View>
              ));
            })()}
            <Text style={styles.contribSub}>{contributions.length} approved log{contributions.length !== 1 ? 's' : ''} total</Text>
          </View>
        ) : null}

        {/* Blast History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blast History</Text>
          {blastHistory.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>No blast history</Text></View>
          ) : blastHistory.slice(0, 5).map((b) => (
            <View key={b.id} style={styles.blastCard}>
              <View style={styles.blastLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <MaterialCommunityIcons name="bomb" size={14} color={theme.text} />
                  <Text style={styles.blastZone}>{b.zone}</Text>
                </View>
                <Text style={styles.blastTime}>{formatDateTime(b.blastTime)}</Text>
              </View>
              <View style={[styles.blastStatus,
                b.status === 'EXECUTED' ? styles.statusExecuted :
                b.status === 'CANCELLED' ? styles.statusCancelled : styles.statusScheduled]}>
                <Text style={styles.blastStatusText}>{b.status}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
      <SosButton role={session.user.role} user={session.user} />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.bg },
    container: { paddingBottom: 110 },
    hero: { alignItems: 'center', backgroundColor: theme.bgHero, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: 14 },
    heroLeft: {},
    greeting: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
    site: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
    shiftBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6 },
    shiftDot: { backgroundColor: '#4ade80', borderRadius: 4, height: 7, width: 7 },
    shiftText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    strip: { backgroundColor: theme.bgCard, borderBottomColor: theme.border, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: spacing.md },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { ...typography.h1, color: theme.text },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
    sectionTitle: { ...typography.h2, color: theme.text, flex: 1 },
    alertBadge: { backgroundColor: '#b42318', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    alertBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    clearCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: 14 },
    clearTitle: { color: theme.success, fontSize: 14, fontWeight: '900' },
    clearSub: { color: theme.success, fontSize: 12, fontWeight: '600', marginTop: 1 },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: 14 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    alertCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, overflow: 'hidden' },
    severityBar: { alignSelf: 'stretch', width: 4 },
    alertBody: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 10 },
    alertType: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    alertLocation: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    severityPill: { borderRadius: 6, marginRight: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    severityPillText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
    noticeCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.sm, overflow: 'hidden' },
    noticeAccent: { backgroundColor: theme.accent, width: 3 },
    noticeBody: { flex: 1, padding: spacing.md },
    noticeTitle: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 3 },
    noticeMeta: { color: theme.textSub, fontSize: 12, fontWeight: '600', lineHeight: 17 },
    searchPill: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, margin: spacing.lg, marginBottom: 0, paddingHorizontal: 14, paddingVertical: spacing.md },
    searchPillText: { color: theme.textMuted, flex: 1, fontSize: 13, fontWeight: '600' },
    searchPillArrow: { color: theme.textMuted, fontSize: 18 },
    loneWorkerBanner: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing.md, margin: spacing.lg, marginBottom: 0, padding: 14 },
    loneWorkerBannerGreen: { backgroundColor: theme.successLight, borderColor: theme.success },
    loneWorkerBannerRed: { backgroundColor: theme.dangerLight, borderColor: theme.danger },
    loneWorkerBannerBody: { flex: 1 },
    loneWorkerBannerTitle: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    loneWorkerBannerSub: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    errorBanner: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', margin: spacing.xl, marginBottom: 0, padding: spacing.md },
    errorBannerText: { color: theme.danger, fontSize: 13, fontWeight: '700' },
    contactsWarning: { alignItems: 'center', backgroundColor: theme.amberLight, borderColor: '#fcd34d', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing.md, margin: spacing.xl, marginBottom: 0, padding: 14 },
    contactsWarningBody: { flex: 1 },
    contactsWarningTitle: { color: theme.amber, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    contactsWarningSub: { color: theme.amber, fontSize: 12, fontWeight: '600', lineHeight: 17 },
    certExpiredBanner: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', margin: spacing.xl, marginBottom: 0, padding: spacing.md },
    certExpiringBanner: { alignItems: 'center', backgroundColor: theme.amberLight, borderColor: '#fcd34d', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', margin: spacing.xl, marginBottom: 0, padding: spacing.md },
    certBannerText: { color: theme.amber, fontSize: 12, fontWeight: '700' },
    blastCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, padding: spacing.md },
    blastLeft: {},
    blastZone: { color: theme.text, fontSize: 13, fontWeight: '800' },
    blastTime: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    blastStatus: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    statusExecuted: { backgroundColor: theme.successLight },
    statusCancelled: { backgroundColor: theme.bgInput },
    statusScheduled: { backgroundColor: theme.dangerLight },
    blastStatusText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
    contribCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 14, paddingVertical: 10 },
    contribMineral: { color: theme.text, fontSize: 13, fontWeight: '800' },
    contribVol: { color: theme.success, fontSize: 14, fontWeight: '900' },
    contribUnit: { color: theme.textSub, fontSize: 12, fontWeight: '700' },
    contribSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 },
    announcementCard: { alignItems: 'flex-start', backgroundColor: theme.amberLight, borderColor: '#fde68a', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: spacing.sm, padding: spacing.md },
    announcementBody: { flex: 1 },
    announcementContent: { color: theme.text, fontSize: 14, fontWeight: '600', lineHeight: 19, marginBottom: 3 },
    announcementMeta: { color: theme.amber, fontSize: 11, fontWeight: '600' },
  });
}
