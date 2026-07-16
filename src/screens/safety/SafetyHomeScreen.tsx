import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SosButton } from '../../components/SosButton';
import { getSiteHazardAlerts, getDangerZones, getSupervisorDashboard, type SupervisorDashboard } from '../../services/api';
import type { HazardReport, DangerZone } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession; onGoToSearch?: () => void };

export function SafetyHomeScreen({ session, onGoToSearch }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [dash, setDash] = useState<SupervisorDashboard | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [h, z, d] = await Promise.all([
        getSiteHazardAlerts(),
        getDangerZones(),
        getSupervisorDashboard(),
      ]);
      setHazards(h);
      setZones(z);
      setDash(d);
      setConnectionError(false);
    } catch {
      setConnectionError(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const openHazards = hazards.filter((h) => h.status.toUpperCase() === 'OPEN');
  const activeZones = zones.filter((z) => z.status !== 'Cleared');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
      >
        <View style={styles.hero}>
          <View>
            <Text style={styles.greeting}>{greeting}, <Text style={styles.greetingName}>{session.user.fullName.split(' ')[0]}</Text></Text>
            <Text style={styles.site}>{session.user.assignedSite ?? 'Obuasi Mine'}</Text>
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
            <View style={[styles.statusBadge, openHazards.length > 0 ? styles.statusBadgeRed : styles.statusBadgeGreen]}>
              <View style={[styles.statusDot, { backgroundColor: openHazards.length > 0 ? theme.danger : theme.success }]} />
              <Text style={styles.statusText}>{openHazards.length > 0 ? 'Alerts Active' : 'All Clear'}</Text>
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

        {connectionError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠ Cannot reach server — check your connection</Text>
          </View>
        ) : null}

        <View style={styles.strip}>
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, openHazards.length > 0 && { color: theme.danger }]}>{openHazards.length}</Text>
            <Text style={styles.stripLabel}>Open Hazards</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, activeZones.length > 0 && { color: theme.amber }]}>{activeZones.length}</Text>
            <Text style={styles.stripLabel}>Danger Zones</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.stripItem}>
            <Text style={styles.stripValue}>{hazards.length}</Text>
            <Text style={styles.stripLabel}>Total Reports</Text>
          </View>
        </View>

        {dash && dash.safetyRecommendationCount > 0 && (
          <View style={styles.recoCard}>
            <Text style={styles.recoIcon}>🛡</Text>
            <View style={styles.recoBody}>
              <Text style={styles.recoTitle}>{dash.safetyRecommendationCount} safety recommendation{dash.safetyRecommendationCount !== 1 ? 's' : ''}</Text>
              <Text style={styles.recoHint}>More → Safety Intelligence</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Open Hazards</Text>
        {openHazards.length === 0 ? (
          <View style={styles.clearCard}>
            <Text style={styles.clearIcon}>✓</Text>
            <View>
              <Text style={styles.clearTitle}>No open hazards</Text>
              <Text style={styles.clearSub}>Site is clear</Text>
            </View>
          </View>
        ) : openHazards.map((h) => (
          <View key={h.id} style={styles.alertCard}>
            <View style={[styles.alertBar, { backgroundColor: h.severity === 'Critical' ? '#7f1d1d' : h.severity === 'High' ? theme.danger : theme.amber }]} />
            <View style={styles.alertBody}>
              <Text style={styles.alertType}>{h.hazardType}</Text>
              <Text style={styles.alertMeta}>{h.location} · {h.severity ?? 'Medium'}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Active Danger Zones</Text>
        {activeZones.length === 0 ? (
          <View style={styles.clearCard}>
            <Text style={styles.clearIcon}>✓</Text>
            <View>
              <Text style={styles.clearTitle}>No active danger zones</Text>
              <Text style={styles.clearSub}>All zones clear</Text>
            </View>
          </View>
        ) : activeZones.map((z) => (
          <View key={z.id} style={styles.zoneCard}>
            <Text style={styles.zoneIcon}>⚠️</Text>
            <View style={styles.zoneBody}>
              <Text style={styles.zoneName}>{z.zoneName}</Text>
              <Text style={styles.zoneMeta}>Risk: {z.riskLevel} · {z.site}</Text>
            </View>
            <View style={[styles.riskPill, z.riskLevel === 'High' ? styles.riskHigh : z.riskLevel === 'Medium' ? styles.riskMed : styles.riskLow]}>
              <Text style={styles.riskPillText}>{z.riskLevel}</Text>
            </View>
          </View>
        ))}
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
    greeting: { fontFamily: 'DancingScript_400Regular', fontSize: 28, color: 'rgba(255,255,255,0.85)' },
    greetingName: { fontFamily: 'DancingScript_700Bold', fontSize: 28, color: '#ffffff' },
    site: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: 2 },
    heroBadges: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    scoreBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    scoreBadgeGreen: { backgroundColor: 'rgba(74,222,128,0.18)' },
    scoreBadgeAmber: { backgroundColor: 'rgba(251,191,36,0.22)' },
    scoreBadgeRed: { backgroundColor: 'rgba(248,113,113,0.22)' },
    scoreText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    statusBadge: { alignItems: 'center', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
    statusBadgeGreen: { backgroundColor: 'rgba(74,222,128,0.15)' },
    statusBadgeRed: { backgroundColor: 'rgba(248,113,113,0.15)' },
    statusDot: { borderRadius: 4, height: 7, width: 7 },
    statusText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    searchPill: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, margin: 16, marginBottom: 0, paddingHorizontal: 14, paddingVertical: 12 },
    searchPillIcon: { fontSize: 15 },
    searchPillText: { color: theme.textMuted, flex: 1, fontSize: 13, fontWeight: '600' },
    searchPillArrow: { color: theme.textMuted, fontSize: 18 },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, margin: 20, marginBottom: 0, padding: 12 },
    errorBannerText: { color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
    strip: { backgroundColor: theme.bgCard, borderBottomColor: theme.border, borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 12 },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 18, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    recoCard: { alignItems: 'center', backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 4, marginHorizontal: 20, marginTop: 16, padding: 14 },
    recoIcon: { fontSize: 20 },
    recoBody: { flex: 1 },
    recoTitle: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    recoHint: { color: theme.amber, fontSize: 11, fontWeight: '600' },
    sectionTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 10, marginTop: 20, paddingHorizontal: 20 },
    clearCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 10, marginHorizontal: 20, padding: 14 },
    clearIcon: { color: theme.success, fontSize: 20 },
    clearTitle: { color: theme.success, fontSize: 13, fontWeight: '900' },
    clearSub: { color: theme.success, fontSize: 12, fontWeight: '600' },
    alertCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 8, marginHorizontal: 20, overflow: 'hidden' },
    alertBar: { alignSelf: 'stretch', width: 4 },
    alertBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
    alertType: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    alertMeta: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    zoneCard: { alignItems: 'center', backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 8, marginHorizontal: 20, padding: 14 },
    zoneIcon: { fontSize: 20, marginRight: 10 },
    zoneBody: { flex: 1 },
    zoneName: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    zoneMeta: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
    riskPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    riskHigh: { backgroundColor: theme.danger },
    riskMed: { backgroundColor: theme.amber },
    riskLow: { backgroundColor: theme.accent },
    riskPillText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  });
}
