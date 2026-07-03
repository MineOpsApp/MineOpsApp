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

type Props = { session: AuthSession; onGoToEmergencyContacts?: () => void; onGoToLoneWorker?: () => void };

const SEVERITY_COLOR: Record<string, string> = {
  Critical: '#7f1d1d',
  High: '#b42318',
  Medium: '#a15c00',
  Low: '#1f6f5b',
};

export function WorkerHomeScreen({ session, onGoToEmergencyContacts, onGoToLoneWorker }: Props) {
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
    // poll lone worker status every 30s
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

        {loneWorker?.active && (
          <Pressable
            style={[
              styles.loneWorkerBanner,
              loneWorker.deadline && new Date(loneWorker.deadline).getTime() < Date.now()
                ? styles.loneWorkerBannerRed : styles.loneWorkerBannerGreen,
            ]}
            onPress={onGoToLoneWorker}
          >
            <Text style={styles.loneWorkerBannerIcon}>🛡</Text>
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
            <Text style={styles.errorBannerText}>⚠ Cannot reach server — check your connection</Text>
          </View>
        ) : null}

        {expiredCerts > 0 ? (
          <View style={styles.certExpiredBanner}>
            <Text style={styles.certBannerText}>🎓 {expiredCerts} certification{expiredCerts !== 1 ? 's' : ''} expired — visit More → My Certifications</Text>
          </View>
        ) : expiringCerts > 0 ? (
          <View style={styles.certExpiringBanner}>
            <Text style={styles.certBannerText}>🎓 {expiringCerts} certification{expiringCerts !== 1 ? 's' : ''} expiring within 30 days</Text>
          </View>
        ) : null}

        {!hasContacts && !loadingCore ? (
          <Pressable style={styles.contactsWarning} onPress={onGoToEmergencyContacts}>
            <Text style={styles.contactsWarningIcon}>📞</Text>
            <View style={styles.contactsWarningBody}>
              <Text style={styles.contactsWarningTitle}>No emergency contacts set</Text>
              <Text style={styles.contactsWarningSub}>Add contacts so supervisors can reach someone if you're in danger {onGoToEmergencyContacts ? '→ Tap to add' : '→ More · Emergency Contacts'}</Text>
            </View>
          </Pressable>
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
            <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>Active</Text>
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
                <Text style={styles.announcementIcon}>📢</Text>
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
              <Text style={styles.clearIcon}>✓</Text>
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
                <Text style={styles.blastZone}>💥 {b.zone}</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0f2f5' },
  container: { paddingBottom: 110 },
  hero: { alignItems: 'center', backgroundColor: '#17212b', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  heroLeft: {},
  greeting: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  site: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  shiftBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  shiftDot: { backgroundColor: '#4ade80', borderRadius: 4, height: 7, width: 7 },
  shiftText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  strip: { backgroundColor: '#ffffff', borderBottomColor: '#e5e9ef', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 12 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 18, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  sectionTitle: { color: '#17212b', flex: 1, fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  alertBadge: { backgroundColor: '#b42318', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  alertBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  clearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  clearIcon: { color: '#16a34a', fontSize: 22 },
  clearTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  clearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 1 },
  emptyCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, padding: 14 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  alertCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, overflow: 'hidden' },
  severityBar: { alignSelf: 'stretch', width: 4 },
  alertBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  alertType: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  alertLocation: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  severityPill: { borderRadius: 6, marginRight: 12, paddingHorizontal: 8, paddingVertical: 3 },
  severityPillText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  noticeCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: 8, overflow: 'hidden' },
  noticeAccent: { backgroundColor: '#1f6f5b', width: 3 },
  noticeBody: { flex: 1, padding: 12 },
  noticeTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 3 },
  noticeMeta: { color: '#5d6875', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  loneWorkerBanner: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, margin: 16, marginBottom: 0, padding: 14 },
  loneWorkerBannerGreen: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  loneWorkerBannerRed: { backgroundColor: '#fff5f5', borderColor: '#fca5a5' },
  loneWorkerBannerIcon: { fontSize: 22 },
  loneWorkerBannerBody: { flex: 1 },
  loneWorkerBannerTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  loneWorkerBannerSub: { color: '#5d6875', fontSize: 12, fontWeight: '600' },
  errorBanner: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, margin: 20, marginBottom: 0, padding: 12 },
  errorBannerText: { color: '#b42318', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  contactsWarning: { alignItems: 'center', backgroundColor: '#fffbeb', borderColor: '#fcd34d', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, margin: 20, marginBottom: 0, padding: 14 },
  contactsWarningIcon: { fontSize: 24 },
  contactsWarningBody: { flex: 1 },
  contactsWarningTitle: { color: '#92400e', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  contactsWarningSub: { color: '#b45309', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  certExpiredBanner: { backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, margin: 20, marginBottom: 0, padding: 12 },
  certExpiringBanner: { backgroundColor: '#fffbeb', borderColor: '#fcd34d', borderRadius: 8, borderWidth: 1, margin: 20, marginBottom: 0, padding: 12 },
  certBannerText: { color: '#92400e', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  blastCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, padding: 12 },
  blastLeft: {},
  blastZone: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  blastTime: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  blastStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusExecuted: { backgroundColor: '#e7f6ef' },
  statusCancelled: { backgroundColor: '#f4f6f8' },
  statusScheduled: { backgroundColor: '#fff5f5' },
  blastStatusText: { color: '#5d6875', fontSize: 11, fontWeight: '800' },
  contribCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 14, paddingVertical: 10 },
  contribMineral: { color: '#17212b', fontSize: 13, fontWeight: '800' },
  contribVol: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  contribUnit: { color: '#5d6875', fontSize: 12, fontWeight: '700' },
  contribSub: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 4 },
  announcementCard: { alignItems: 'flex-start', backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 8, padding: 12 },
  announcementIcon: { fontSize: 16, marginTop: 1 },
  announcementBody: { flex: 1 },
  announcementContent: { color: '#17212b', fontSize: 14, fontWeight: '600', lineHeight: 19, marginBottom: 3 },
  announcementMeta: { color: '#a16207', fontSize: 11, fontWeight: '600' },
});