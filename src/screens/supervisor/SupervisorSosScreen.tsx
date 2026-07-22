import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getSosAlerts, getWorkerEmergencyContacts } from '../../services/api';
import type { EmergencyContact } from '../../types/actions';
import type { SosAlert } from '../../types/sos';
import type { AuthSession } from '../../types/auth';
import { useTheme, spacing, typography, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorSosScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [contactsCache, setContactsCache] = useState<Record<string, EmergencyContact[]>>({});
  const [loadingContacts, setLoadingContacts] = useState<string | null>(null);

  function load() { return getSosAlerts().then(setAlerts).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function toggleContacts(alert: SosAlert) {
    if (expandedId === alert.id) { setExpandedId(null); return; }
    setExpandedId(alert.id);
    const email = alert.actorEmail;
    if (!email || contactsCache[email] !== undefined) return;
    setLoadingContacts(email);
    try {
      const contacts = await getWorkerEmergencyContacts(email);
      setContactsCache((prev) => ({ ...prev, [email]: contacts }));
    } catch {
      setContactsCache((prev) => ({ ...prev, [email]: [] }));
    } finally {
      setLoadingContacts(null);
    }
  }

  const active = alerts.filter((a) => a.status.toLowerCase() !== 'resolved');

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.danger} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>SOS Alerts</Text>
        {active.length > 0 && (
          <View style={styles.activeBadge}>
            <Ionicons name="alert-circle" size={12} color="#ffffff" />
            <Text style={styles.activeBadgeText}>{active.length} active</Text>
          </View>
        )}
      </View>

      {active.length === 0 ? (
        <View style={styles.clearCard}>
          <Ionicons name="checkmark-circle" size={24} color={theme.success} />
          <View>
            <Text style={styles.clearTitle}>No active SOS alerts</Text>
            <Text style={styles.clearSub}>Pull down to refresh</Text>
          </View>
        </View>
      ) : null}

      {alerts.map((a) => {
        const isExpanded = expandedId === a.id;
        const contacts = a.actorEmail ? contactsCache[a.actorEmail] : undefined;
        const isLoading = a.actorEmail ? loadingContacts === a.actorEmail : false;
        const isDone = a.status.toLowerCase() === 'resolved';

        return (
          <View key={a.id} style={[styles.alertCard, isDone && styles.alertCardDone]}>
            <Pressable onPress={() => toggleContacts(a)} style={styles.alertPressable}>
              <View style={styles.alertTop}>
                <View style={styles.alertIconWrap}>
                  <Ionicons name="alert-circle" size={18} color={theme.danger} />
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertName}>{a.actorName ?? 'Unknown worker'}</Text>
                  <Text style={styles.alertSite}>{a.site}</Text>
                  <Text style={styles.alertMessage}>{a.message}</Text>
                  {a.latitude != null && a.longitude != null ? (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(`https://www.google.com/maps?q=${a.latitude},${a.longitude}`)
                      }
                      style={styles.mapLink}
                      hitSlop={6}
                    >
                      <Ionicons name="location" size={12} color={theme.info} />
                      <Text style={styles.mapLinkText}>View location on map</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.alertRight}>
                  <View style={[styles.statusPill, isDone ? styles.statusPillDone : styles.statusPillActive]}>
                    <Text style={styles.statusPillText}>{a.status}</Text>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
                </View>
              </View>
              <Text style={styles.alertMeta}>
                {a.actorEmail ?? a.role} · Alert #{a.id}
                {a.actorEmail ? ' · Tap for contacts' : ''}
              </Text>
            </Pressable>

            {isExpanded && a.actorEmail ? (
              <View style={styles.contactsPanel}>
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  <Ionicons name="call-outline" size={13} color={theme.danger} />
                  <Text style={styles.contactsPanelTitle}>Emergency Contacts</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.danger} style={{ marginVertical: 8 }} />
                ) : !contacts || contacts.length === 0 ? (
                  <Text style={styles.noContactsText}>No emergency contacts on file for this worker</Text>
                ) : (
                  contacts.map((c) => (
                    <View key={c.id} style={styles.contactRow}>
                      <View style={[styles.contactTypePill, isDone && styles.contactTypePillDone]}>
                        <Text style={styles.contactTypeText}>{c.contactType}</Text>
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{c.name}</Text>
                        <Text style={styles.contactMeta}>{c.relationship}</Text>
                      </View>
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${c.phone.replace(/[\s\-().]/g, '')}`)}
                        style={styles.callBtn}
                      >
                        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 5 }}>
                          <Ionicons name="call" size={12} color={theme.success} />
                          <Text style={styles.callBtnText}>{c.phone}</Text>
                        </View>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      {alerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No SOS alerts on record</Text>
        </View>
      ) : null}
    </ScrollView>
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
    container: { backgroundColor: theme.bg, padding: spacing.xl, paddingBottom: 40 },
    pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.xl },
    pageTitle: { ...typography.h1, color: theme.text, flex: 1 },
    activeBadge: { alignItems: 'center', backgroundColor: theme.danger, borderRadius: 12, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
    activeBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    clearCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: spacing.lg, padding: spacing.lg, ...cardShadow },
    clearTitle: { color: theme.success, fontSize: 14, fontWeight: '900' },
    clearSub: { color: theme.success, fontSize: 12, fontWeight: '600', marginTop: 2 },
    alertCard: { backgroundColor: theme.bgCard, borderColor: theme.dangerLight, borderLeftColor: theme.danger, borderLeftWidth: 4, borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden', ...cardShadow },
    alertCardDone: { borderColor: theme.border, borderLeftColor: theme.textMuted, opacity: 0.7 },
    alertPressable: { padding: 14 },
    alertTop: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: spacing.sm },
    alertIconWrap: { alignItems: 'center', backgroundColor: theme.dangerLight, borderRadius: 20, height: 36, justifyContent: 'center', marginRight: 10, width: 36 },
    alertBody: { flex: 1 },
    alertName: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    alertSite: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    alertMessage: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    mapLink: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 6 },
    mapLinkText: { color: theme.info, fontSize: 12, fontWeight: '800' },
    alertRight: { alignItems: 'flex-end', gap: 4 },
    statusPill: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    statusPillActive: { backgroundColor: theme.dangerLight },
    statusPillDone: { backgroundColor: theme.bgInput },
    statusPillText: { color: theme.textSub, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    alertMeta: { ...typography.label, color: theme.textMuted },
    contactsPanel: { backgroundColor: theme.dangerLight, borderTopColor: theme.danger, borderTopWidth: 1, padding: 14 },
    contactsPanelTitle: { color: theme.danger, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
    noContactsText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    contactRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
    contactTypePill: { backgroundColor: theme.danger, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    contactTypePillDone: { backgroundColor: theme.textMuted },
    contactTypeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
    contactInfo: { flex: 1 },
    contactName: { color: theme.text, fontSize: 13, fontWeight: '800' },
    contactMeta: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginTop: 1 },
    callBtn: { backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
    callBtnText: { color: theme.success, fontSize: 12, fontWeight: '800' },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: spacing.xl },
    emptyText: { ...typography.body, color: theme.textMuted, textAlign: 'center' },
  });
}
