import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SosButton } from '../../components/SosButton';
import { ActionButton } from '../../components/ActionButton';
import { getSiteCertifications, getSiteHazardAlerts, getNotices, getWorkerContactDirectory } from '../../services/api';
import type { HazardReport, Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorHomeScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [connectionError, setConnectionError] = useState(false);
  const [totalWorkers, setTotalWorkers] = useState(0);
  const [coveredWorkers, setCoveredWorkers] = useState(0);
  const [certExpired, setCertExpired] = useState(0);
  const [certExpiring, setCertExpiring] = useState(0);

  useEffect(() => {
    getSiteHazardAlerts().then(setHazards).catch(() => setConnectionError(true));
    getNotices().then(setNotices).catch(() => setConnectionError(true));
    getWorkerContactDirectory()
      .then((dir) => {
        setTotalWorkers(dir.length);
        setCoveredWorkers(dir.filter((w) => w.contactCount > 0).length);
      })
      .catch(() => {});
    getSiteCertifications().then((certs) => {
      setCertExpired(certs.filter((c) => c.status === 'EXPIRED').length);
      setCertExpiring(certs.filter((c) => c.status === 'EXPIRING_SOON').length);
    }).catch(() => {});
  }, []);


  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.greeting}>Operations Overview</Text>
            <Text style={styles.site}>{session.user.assignedSite ?? 'Obuasi Mine'}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Live</Text>
          </View>
        </View>
        {connectionError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠ Cannot reach server — check your connection</Text>
          </View>
        ) : null}

        {/* Stats */}
        <View style={styles.strip}>
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, hazards.length > 0 && { color: '#b42318' }]}>{hazards.length}</Text>
            <Text style={styles.stripLabel}>Active Alerts</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripValue}>{notices.length}</Text>
            <Text style={styles.stripLabel}>Notices</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>Active</Text>
            <Text style={styles.stripLabel}>Site</Text>
          </View>
        </View>

        {/* Emergency Contact Coverage */}
        {totalWorkers > 0 ? (() => {
          const pct = Math.round((coveredWorkers / totalWorkers) * 100);
          const isGood = pct >= 80;
          const isMid = pct >= 50 && pct < 80;
          const color = isGood ? '#15803d' : isMid ? '#92400e' : '#b42318';
          const bg = isGood ? '#f0fdf4' : isMid ? '#fffbeb' : '#fff5f5';
          const border = isGood ? '#86efac' : isMid ? '#fcd34d' : '#fca5a5';
          return (
            <View style={[styles.coverageCard, { backgroundColor: bg, borderColor: border }]}>
              <Text style={[styles.coverageValue, { color }]}>{coveredWorkers}/{totalWorkers}</Text>
              <View style={styles.coverageBody}>
                <Text style={[styles.coverageTitle, { color }]}>Emergency Contacts Coverage</Text>
                <Text style={[styles.coverageSub, { color }]}>{pct}% of personnel have contacts on file</Text>
              </View>
              <Text style={styles.coverageIcon}>📞</Text>
            </View>
          );
        })() : null}

        {/* Certification Alerts */}
        {(certExpired > 0 || certExpiring > 0) ? (
          <View style={[styles.coverageCard, {
            backgroundColor: certExpired > 0 ? '#fff5f5' : '#fffbeb',
            borderColor: certExpired > 0 ? '#fca5a5' : '#fcd34d',
            marginTop: 16,
          }]}>
            <Text style={{ fontSize: 22 }}>🎓</Text>
            <View style={styles.coverageBody}>
              <Text style={[styles.coverageTitle, { color: certExpired > 0 ? '#b42318' : '#92400e' }]}>
                Certification Alerts
              </Text>
              <Text style={[styles.coverageSub, { color: certExpired > 0 ? '#b42318' : '#92400e' }]}>
                {certExpired > 0 ? `${certExpired} expired` : ''}
                {certExpired > 0 && certExpiring > 0 ? ' · ' : ''}
                {certExpiring > 0 ? `${certExpiring} expiring within 30 days` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Hazards</Text>
            {hazards.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{hazards.length}</Text></View>}
          </View>
          {hazards.length === 0 ? (
            <View style={styles.clearCard}>
              <Text style={styles.clearIcon}>✓</Text>
              <View>
                <Text style={styles.clearTitle}>All Clear</Text>
                <Text style={styles.clearSub}>No active hazards</Text>
              </View>
            </View>
          ) : hazards.map((h) => (
            <View key={h.id} style={styles.alertCard}>
              <View style={[styles.alertBar, { backgroundColor: h.severity === 'Critical' ? '#7f1d1d' : h.severity === 'High' ? '#b42318' : '#a15c00' }]} />
              <View style={styles.alertBody}>
                <Text style={styles.alertType}>{h.hazardType}</Text>
                <Text style={styles.alertMeta}>{h.location} · {h.reportedByName}</Text>
              </View>
              <Text style={styles.alertStatus}>{h.status}</Text>
            </View>
          ))}
        </View>

        {/* Notices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Notices</Text>
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


      </ScrollView>
      <SosButton role={session.user.role} user={session.user} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0f2f5' },
  container: { paddingBottom: 110 },
  hero: { alignItems: 'center', backgroundColor: '#17212b', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  greeting: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  site: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  statusBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  statusDot: { backgroundColor: '#4ade80', borderRadius: 4, height: 7, width: 7 },
  statusText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  strip: { backgroundColor: '#ffffff', borderBottomColor: '#e5e9ef', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 12 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 18, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  sectionTitle: { color: '#17212b', flex: 1, fontSize: 15, fontWeight: '900' },
  badge: { backgroundColor: '#b42318', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  clearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  clearIcon: { color: '#16a34a', fontSize: 22 },
  clearTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  clearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 1 },
  alertCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: 8, overflow: 'hidden' },
  alertBar: { alignSelf: 'stretch', width: 4 },
  alertBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  alertType: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  alertMeta: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  alertStatus: { color: '#5d6875', fontSize: 11, fontWeight: '800', marginRight: 12, textTransform: 'uppercase' },
  noticeCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: 8, overflow: 'hidden' },
  noticeAccent: { backgroundColor: '#1f6f5b', width: 3 },
  noticeBody: { flex: 1, padding: 12 },
  noticeTitle: { color: '#17212b', fontSize: 13, fontWeight: '900', marginBottom: 3 },
  noticeMeta: { color: '#5d6875', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  guestLabel: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 10 },
  input: { backgroundColor: '#f4f6f8', borderColor: '#e5e9ef', borderRadius: 8, borderWidth: 1, color: '#17212b', fontSize: 14, marginBottom: 10, minHeight: 42, paddingHorizontal: 12 },
  hoursRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
 
  coverageCard: { alignItems: 'center', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 12, margin: 20, marginBottom: 0, padding: 14 },
  coverageValue: { fontSize: 22, fontWeight: '900' },
  coverageBody: { flex: 1 },
  coverageTitle: { fontSize: 13, fontWeight: '900', marginBottom: 2 },
  coverageSub: { fontSize: 12, fontWeight: '600' },
  coverageIcon: { fontSize: 22 },
  errorBanner: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderRadius: 8, borderWidth: 1, margin: 20, marginBottom: 0, padding: 12 },
  errorBannerText: { color: '#b42318', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});

