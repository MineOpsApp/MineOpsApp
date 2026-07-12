import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSosAlerts, getWorkerEmergencyContacts } from '../../services/api';
import type { EmergencyContact } from '../../types/actions';
import type { SosAlert } from '../../types/sos';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorSosScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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
            <Text style={styles.activeBadgeText}>🚨 {active.length} active</Text>
          </View>
        )}
      </View>

      {active.length === 0 ? (
        <View style={styles.clearCard}>
          <Text style={styles.clearIcon}>✓</Text>
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
                  <Text style={styles.alertIcon}>🚨</Text>
                </View>
                <View style={styles.alertBody}>
                  <Text style={styles.alertName}>{a.actorName ?? 'Unknown worker'}</Text>
                  <Text style={styles.alertSite}>{a.site}</Text>
                  <Text style={styles.alertMessage}>{a.message}</Text>
                </View>
                <View style={styles.alertRight}>
                  <View style={[styles.statusPill, isDone ? styles.statusPillDone : styles.statusPillActive]}>
                    <Text style={styles.statusPillText}>{a.status}</Text>
                  </View>
                  <Text style={[styles.chevron, isExpanded && styles.chevronOpen]}>›</Text>
                </View>
              </View>
              <Text style={styles.alertMeta}>
                {a.actorEmail ?? a.role} · Alert #{a.id}
                {a.actorEmail ? ' · Tap for contacts' : ''}
              </Text>
            </Pressable>

            {isExpanded && a.actorEmail ? (
              <View style={styles.contactsPanel}>
                <Text style={styles.contactsPanelTitle}>📞 Emergency Contacts</Text>
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
                        <Text style={styles.callBtnText}>📞 {c.phone}</Text>
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
    pageTitle: { color: theme.text, flex: 1, fontSize: 22, fontWeight: '900' },
    activeBadge: { backgroundColor: theme.danger, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    activeBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    clearCard: { alignItems: 'center', backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 16, padding: 16 },
    clearIcon: { color: theme.success, fontSize: 24 },
    clearTitle: { color: theme.success, fontSize: 14, fontWeight: '900' },
    clearSub: { color: theme.success, fontSize: 12, fontWeight: '600', marginTop: 2 },
    alertCard: { backgroundColor: theme.bgCard, borderColor: theme.dangerLight, borderLeftColor: theme.danger, borderLeftWidth: 4, borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
    alertCardDone: { borderColor: theme.border, borderLeftColor: theme.textMuted, opacity: 0.7 },
    alertPressable: { padding: 14 },
    alertTop: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 8 },
    alertIconWrap: { alignItems: 'center', backgroundColor: theme.dangerLight, borderRadius: 20, height: 36, justifyContent: 'center', marginRight: 10, width: 36 },
    alertIcon: { fontSize: 18 },
    alertBody: { flex: 1 },
    alertName: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    alertSite: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    alertMessage: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    alertRight: { alignItems: 'flex-end', gap: 4 },
    statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusPillActive: { backgroundColor: theme.dangerLight },
    statusPillDone: { backgroundColor: theme.bgInput },
    statusPillText: { color: theme.textSub, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    chevron: { color: theme.textMuted, fontSize: 20, transform: [{ rotate: '0deg' }] },
    chevronOpen: { transform: [{ rotate: '90deg' }] },
    alertMeta: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    contactsPanel: { backgroundColor: theme.dangerLight, borderTopColor: theme.danger, borderTopWidth: 1, padding: 14 },
    contactsPanelTitle: { color: theme.danger, fontSize: 12, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase' },
    noContactsText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    contactRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 8 },
    contactTypePill: { backgroundColor: theme.danger, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    contactTypePillDone: { backgroundColor: theme.textMuted },
    contactTypeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
    contactInfo: { flex: 1 },
    contactName: { color: theme.text, fontSize: 13, fontWeight: '800' },
    contactMeta: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginTop: 1 },
    callBtn: { backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
    callBtnText: { color: theme.success, fontSize: 12, fontWeight: '800' },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 20 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  });
}
