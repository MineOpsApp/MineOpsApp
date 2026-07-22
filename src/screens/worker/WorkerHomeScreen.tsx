import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

import { BlastAlert } from '../../components/BlastAlert';
import { LiveSiteMapView } from '../../components/LiveSiteMapView';
import { SiteMapView } from '../../components/SiteMapView';
import { SosButton } from '../../components/SosButton';
import { getAllBlasts, getMyCertifications, getMyEmergencyContacts, getMyInventoryContributions, getNotices, getSiteAnnouncements, getSiteHazardAlerts, getLoneWorkerStatus, getDangerZones, getMyAttendanceStatus, clockIn, notifyZoneEntry, type LoneWorkerStatus } from '../../services/api';
import type { InventoryTransaction } from '../../services/api';
import type { HazardReport, Notice, ShiftAnnouncement } from '../../types/actions';
import { formatAgo, formatDateTime } from '../../utils/time';
import type { AuthSession } from '../../types/auth';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession; onGoToLoneWorker?: () => void; onGoToSearch?: () => void; onGoToAttendance?: () => void; onGoToChecklist?: () => void };

type AttendanceRecord = { id: number; zone: string; clockInAt: string };
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Main Site', 'Processing Area'];

const SEVERITY_COLOR: Record<string, string> = {
  Critical: '#7f1d1d',
  High: '#b42318',
  Medium: '#a15c00',
  Low: '#1f6f5b',
};

// Distance in meters between two lat/lng points.
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function WorkerHomeScreen({ session, onGoToLoneWorker, onGoToSearch, onGoToAttendance, onGoToChecklist }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [announcements, setAnnouncements] = useState<ShiftAnnouncement[]>([]);
  const [loadingCore, setLoadingCore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hazardError, setHazardError] = useState(false);
  const [blastHistory, setBlastHistory] = useState<any[]>([]);
  const [hasContacts, setHasContacts] = useState(true);
  const [contributions, setContributions] = useState<InventoryTransaction[]>([]);
  const [expiredCerts, setExpiredCerts] = useState(0);
  const [expiringCerts, setExpiringCerts] = useState(0);
  const [loneWorker, setLoneWorker] = useState<LoneWorkerStatus | null>(null);
  const loneWorkerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mapZones, setMapZones] = useState<import('../../types/actions').DangerZone[]>([]);
  const zonesRef = useRef<import('../../types/actions').DangerZone[]>([]);
  const alertedZonesRef = useRef<Set<number>>(new Set());
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const [onSite, setOnSite] = useState(false);
  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null);
  const [selectedZone, setSelectedZone] = useState('Main Site');
  const [loadingClockIn, setLoadingClockIn] = useState(false);

  async function loadCore() {
    await Promise.all([
      getSiteHazardAlerts().then(setHazards).catch(() => setHazardError(true)),
      getNotices().then(setNotices).catch(() => {}),
      getSiteAnnouncements().then(setAnnouncements).catch(() => {}),
      getAllBlasts().then(setBlastHistory).catch(() => {}),
      getDangerZones().then(setMapZones).catch(() => {}),
      getMyEmergencyContacts().then((c) => setHasContacts(c.length > 0)).catch(() => {}),
      getMyInventoryContributions().then(setContributions).catch(() => {}),
      getMyCertifications().then((certs) => {
        setExpiredCerts(certs.filter((c) => c.status === 'EXPIRED').length);
        setExpiringCerts(certs.filter((c) => c.status === 'EXPIRING_SOON').length);
      }).catch(() => {}),
      getMyAttendanceStatus().then((s) => { setOnSite(s.onSite); setActiveRecord(s.onSite && s.record ? s.record : null); }).catch(() => {}),
    ]);
  }
  useEffect(() => {
    setLoadingCore(true);
    loadCore().finally(() => setLoadingCore(false));
    const pollLW = () => getLoneWorkerStatus().then(setLoneWorker).catch(() => {});
    pollLW();
    loneWorkerPollRef.current = setInterval(pollLW, 30000);
    return () => { if (loneWorkerPollRef.current) clearInterval(loneWorkerPollRef.current); };
  }, []);

  // Keep a ref of the latest zones so the location watcher's callback (set up once)
  // always checks against current data rather than a stale closure.
  useEffect(() => { zonesRef.current = mapZones; }, [mapZones]);

  // Foreground-only geofencing: while this screen is mounted and the app is open,
  // warn the worker (and alert supervisors/safety officers) the moment they enter a
  // GPS-mapped danger zone. Stops watching when the screen unmounts — this does not
  // track location in the background.
  useEffect(() => {
    let cancelled = false;
    async function startGeofenceWatch() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 15 },
        (pos) => {
          const { latitude, longitude } = pos.coords;
          for (const zone of zonesRef.current) {
            if (zone.latitude == null || zone.longitude == null) continue;
            const distance = haversineMeters(latitude, longitude, zone.latitude, zone.longitude);
            const radius = zone.radiusMeters ?? 50;
            const inside = distance <= radius;
            const alreadyAlerted = alertedZonesRef.current.has(zone.id);

            if (inside && !alreadyAlerted) {
              alertedZonesRef.current.add(zone.id);
              Alert.alert(
                `⚠️ Entering ${zone.riskLevel} Risk Zone`,
                `You've entered "${zone.zoneName}". Follow site safety protocols for this area.`
              );
              notifyZoneEntry(zone.id).catch(() => {});
            } else if (!inside && alreadyAlerted) {
              // Leaving the zone clears the flag so re-entering later alerts again.
              alertedZonesRef.current.delete(zone.id);
            }
          }
        }
      );
      if (cancelled) { sub.remove(); return; }
      locationSubRef.current = sub;
    }
    startGeofenceWatch().catch(() => {});
    return () => {
      cancelled = true;
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, []);
  async function refresh() { setRefreshing(true); await loadCore(); setRefreshing(false); }

  async function handleClockIn() {
    setLoadingClockIn(true);
    try {
      const record = await clockIn(selectedZone);
      setOnSite(true);
      setActiveRecord(record);
      Alert.alert(
        'Signed In',
        `You are now on site in ${selectedZone}.\n\nWould you like to complete your safety checklist now?`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open Checklist', onPress: () => onGoToChecklist?.() },
        ]
      );
    } catch (error: any) {
      const msg = error?.message ?? '';
      if (msg.includes('409')) {
        Alert.alert('Already Signed In', 'You are already on site. Sign out first.');
        setOnSite(true);
      } else {
        Alert.alert('Sign In Failed', 'Could not sign in. Please try again.');
      }
    } finally {
      setLoadingClockIn(false);
    }
  }

  function getElapsed(clockInAt: string) {
    const ms = Date.now() - new Date(clockInAt).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m on site` : `${m}m on site`;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>{greeting}, <Text style={styles.greetingName}>{session.user.fullName.split(' ')[0]}</Text></Text>
            <Text style={styles.site}>{session.user.assignedSite ?? 'Obuasi Mine'}</Text>
          </View>
          <View style={styles.shiftBadge}>
            <View style={styles.shiftDot} />
            <Text style={styles.shiftText}>On Shift</Text>
          </View>
        </View>

        {/* Status strip — floats over hero bottom edge */}
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
            <Text style={[styles.stripValue, onSite ? { color: theme.success } : { color: theme.textMuted }]}>
              {loadingCore ? '—' : onSite ? 'On Site' : 'Off Site'}
            </Text>
            <Text style={styles.stripLabel}>Attendance</Text>
          </View>
        </View>

        {/* Attendance sign-in / on-site status */}
        {!loadingCore && !onSite ? (
          <View style={styles.signInCard}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Ionicons name="enter-outline" size={17} color={theme.text} />
              <Text style={styles.signInTitle}>Sign In to Site</Text>
              <View style={styles.offSiteDot} />
            </View>
            <View style={styles.zonePillRow}>
              {ZONES.map((z) => (
                <Pressable key={z} onPress={() => setSelectedZone(z)} style={[styles.zonePill, selectedZone === z && styles.zonePillActive]}>
                  <Text style={[styles.zonePillText, selectedZone === z && styles.zonePillTextActive]}>{z}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable disabled={loadingClockIn} onPress={handleClockIn} style={styles.clockInBtn}>
              <Ionicons name={loadingClockIn ? 'time-outline' : 'enter-outline'} size={15} color="#fff" />
              <Text style={styles.clockInBtnText}>{loadingClockIn ? 'Signing in...' : 'Sign In'}</Text>
            </Pressable>
          </View>
        ) : !loadingCore && onSite ? (
          <Pressable onPress={onGoToAttendance} style={styles.onSiteCard}>
            <View style={styles.onSiteDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.onSiteTitle}>On Site{activeRecord?.zone ? ` — ${activeRecord.zone}` : ''}</Text>
              <Text style={styles.onSiteSub}>{activeRecord ? getElapsed(activeRecord.clockInAt) : 'Active session'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.success} />
          </Pressable>
        ) : null}

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

        <BlastAlert />

        {/* Live GPS map — your position, GPS-mapped danger zones, and hazard reports */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Site Map</Text>
          <View style={styles.liveMapWrap}>
            <LiveSiteMapView session={session} readOnly />
          </View>
        </View>

        {/* Uploaded floor plan — secondary reference for indoor/underground areas without GPS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site Floor Plan</Text>
          <SiteMapView zones={mapZones} readOnly pollIntervalMs={25000} />
        </View>

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

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.bg },
    container: { paddingBottom: 110 },
    hero: {
      alignItems: 'center',
      backgroundColor: theme.bgHero,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: 14,
      ...cardShadow,
      shadowOpacity: isDark ? 0.4 : 0.12,
    },
    heroLeft: { alignSelf: 'stretch', justifyContent: 'center', paddingBottom: 10 },
    greeting: { fontFamily: 'DancingScript_400Regular', fontSize: 28, color: 'rgba(255,255,255,0.85)' },
    greetingName: { fontFamily: 'DancingScript_700Bold', fontSize: 28, color: '#ffffff' },
    site: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', letterSpacing: 0.2, marginTop: 3 },
    shiftBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6 },
    shiftDot: { backgroundColor: '#4ade80', borderRadius: 4, height: 7, width: 7 },
    shiftText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    strip: { backgroundColor: theme.bgCard, borderRadius: 14, flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: -16, paddingVertical: spacing.md, ...cardShadow },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { ...typography.h1, color: theme.text },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
    liveMapWrap: { height: 320, borderRadius: 14, overflow: 'hidden', ...cardShadow },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
    sectionTitle: { ...typography.h2, color: theme.text, flex: 1 },
    alertBadge: { backgroundColor: '#b42318', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    alertBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    clearCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: 14, ...cardShadow },
    clearTitle: { color: theme.success, fontSize: 14, fontWeight: '900' },
    clearSub: { color: theme.success, fontSize: 12, fontWeight: '600', marginTop: 1 },
    emptyCard: { backgroundColor: theme.bgCard, borderRadius: 10, padding: 14, ...cardShadow },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    alertCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm, overflow: 'hidden', ...cardShadow },
    severityBar: { alignSelf: 'stretch', width: 4 },
    alertBody: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 10 },
    alertType: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    alertLocation: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    severityPill: { borderRadius: 6, marginRight: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    severityPillText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
    noticeCard: { backgroundColor: theme.bgCard, borderRadius: 10, flexDirection: 'row', marginBottom: spacing.sm, overflow: 'hidden', ...cardShadow },
    noticeAccent: { backgroundColor: theme.accent, width: 3 },
    noticeBody: { flex: 1, padding: spacing.md },
    noticeTitle: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 3 },
    noticeMeta: { color: theme.textSub, fontSize: 12, fontWeight: '600', lineHeight: 17 },
    signInCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 14, borderWidth: 1, margin: spacing.lg, marginBottom: 0, padding: spacing.lg, ...cardShadow },
    signInTitle: { color: theme.text, flex: 1, fontSize: 15, fontWeight: '900' },
    offSiteDot: { backgroundColor: theme.textMuted, borderRadius: 5, height: 8, width: 8 },
    zonePillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
    zonePill: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
    zonePillActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    zonePillText: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
    zonePillTextActive: { color: '#ffffff' },
    clockInBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 11 },
    clockInBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    onSiteCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: spacing.md, margin: spacing.lg, marginBottom: 0, padding: spacing.lg, ...cardShadow },
    onSiteDot: { backgroundColor: theme.success, borderRadius: 6, height: 12, width: 12 },
    onSiteTitle: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 2 },
    onSiteSub: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    searchPill: { alignItems: 'center', backgroundColor: theme.bgCard, borderRadius: 10, flexDirection: 'row', gap: 10, margin: spacing.lg, marginBottom: 0, paddingHorizontal: 14, paddingVertical: spacing.md, ...cardShadow },
    searchPillText: { color: theme.textMuted, flex: 1, fontSize: 13, fontWeight: '600' },
    searchPillArrow: { color: theme.textMuted, fontSize: 18 },
    loneWorkerBanner: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing.md, margin: spacing.lg, marginBottom: 0, padding: 14 },
    loneWorkerBannerGreen: { backgroundColor: theme.successLight, borderColor: theme.success, ...cardShadow },
    loneWorkerBannerRed: { backgroundColor: theme.dangerLight, borderColor: theme.danger, ...cardShadow },
    loneWorkerBannerBody: { flex: 1 },
    loneWorkerBannerTitle: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    loneWorkerBannerSub: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
    errorBanner: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', margin: spacing.xl, marginBottom: 0, padding: spacing.md, ...cardShadow },
    errorBannerText: { color: theme.danger, fontSize: 13, fontWeight: '700' },
    contactsWarning: { alignItems: 'center', backgroundColor: theme.amberLight, borderColor: '#fcd34d', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing.md, margin: spacing.xl, marginBottom: 0, padding: 14, ...cardShadow },
    contactsWarningBody: { flex: 1 },
    contactsWarningTitle: { color: theme.amber, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    contactsWarningSub: { color: theme.amber, fontSize: 12, fontWeight: '600', lineHeight: 17 },
    certExpiredBanner: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', margin: spacing.xl, marginBottom: 0, padding: spacing.md, ...cardShadow },
    certExpiringBanner: { alignItems: 'center', backgroundColor: theme.amberLight, borderColor: '#fcd34d', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', margin: spacing.xl, marginBottom: 0, padding: spacing.md, ...cardShadow },
    certBannerText: { color: theme.amber, fontSize: 12, fontWeight: '700' },
    blastCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, padding: spacing.md, ...cardShadow },
    blastLeft: {},
    blastZone: { color: theme.text, fontSize: 13, fontWeight: '800' },
    blastTime: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    blastStatus: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    statusExecuted: { backgroundColor: theme.successLight },
    statusCancelled: { backgroundColor: theme.bgInput },
    statusScheduled: { backgroundColor: theme.dangerLight },
    blastStatusText: { color: theme.textSub, fontSize: 11, fontWeight: '800' },
    contribCard: { alignItems: 'center', backgroundColor: theme.successLight, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 14, paddingVertical: 10, ...cardShadow },
    contribMineral: { color: theme.text, fontSize: 13, fontWeight: '800' },
    contribVol: { color: theme.success, fontSize: 14, fontWeight: '900' },
    contribUnit: { color: theme.textSub, fontSize: 12, fontWeight: '700' },
    contribSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 },
    announcementCard: { alignItems: 'flex-start', backgroundColor: theme.amberLight, borderColor: '#fde68a', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: spacing.sm, padding: spacing.md, ...cardShadow },
    announcementBody: { flex: 1 },
    announcementContent: { color: theme.text, fontSize: 14, fontWeight: '600', lineHeight: 19, marginBottom: 3 },
    announcementMeta: { color: theme.amber, fontSize: 11, fontWeight: '600' },
  });
}
