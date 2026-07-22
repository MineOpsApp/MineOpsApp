import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getSiteRoster, getWorkerEmergencyContacts } from '../../services/api';
import type { EmergencyContact } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type AttendanceRecord = {
  id: number;
  workerName: string;
  workerEmail: string;
  workerRole: string;
  zone: string;
  site: string;
  clockInAt: string;
};

type Props = { session: AuthSession };

const ROLE_LABELS: Record<string, string> = {
  worker: 'Worker',
  supervisor: 'Supervisor',
  safetyOfficer: 'Safety Officer',
  guest: 'Guest',
};

export function SupervisorRosterScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [roster, setRoster] = useState<AttendanceRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [contactsCache, setContactsCache] = useState<Record<string, EmergencyContact[]>>({});
  const [loadingContacts, setLoadingContacts] = useState<string | null>(null);

  function load() { return getSiteRoster().then(setRoster).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function formatTime(dateStr: string) {
    try { return new Date(dateStr).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' }); }
    catch { return dateStr; }
  }

  function getDuration(clockIn: string) {
    const start = new Date(clockIn).getTime();
    const hours = Math.floor((Date.now() - start) / 3600000);
    const mins = Math.floor(((Date.now() - start) % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }

  async function toggleContacts(workerEmail: string) {
    if (expandedEmail === workerEmail) {
      setExpandedEmail(null);
      return;
    }
    setExpandedEmail(workerEmail);
    if (contactsCache[workerEmail] !== undefined) return;
    setLoadingContacts(workerEmail);
    try {
      const contacts = await getWorkerEmergencyContacts(workerEmail);
      setContactsCache((prev) => ({ ...prev, [workerEmail]: contacts }));
    } catch {
      setContactsCache((prev) => ({ ...prev, [workerEmail]: [] }));
    } finally {
      setLoadingContacts(null);
    }
  }

  const byZone: Record<string, AttendanceRecord[]> = {};
  roster.forEach((r) => {
    if (!byZone[r.zone]) byZone[r.zone] = [];
    byZone[r.zone].push(r);
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Site Roster</Text>
        <Text style={styles.pageSub}>Tap a worker to view emergency contacts</Text>
      </View>

      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{roster.length}</Text>
          <Text style={styles.stripLabel}>On Site</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{roster.filter((r) => r.workerRole === 'worker').length}</Text>
          <Text style={styles.stripLabel}>Workers</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{Object.keys(byZone).length}</Text>
          <Text style={styles.stripLabel}>Zones Active</Text>
        </View>
      </View>

      {roster.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={32} color={styles.emptyIcon.color} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No one on site</Text>
          <Text style={styles.emptySub}>Workers will appear here when they clock in</Text>
        </View>
      ) : null}

      {Object.entries(byZone).map(([zone, records]) => (
        <View key={zone} style={styles.zoneSection}>
          <View style={styles.zoneHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              <Ionicons name="location-outline" size={13} color={styles.zoneTitle.color} />
              <Text style={styles.zoneTitle}>{zone}</Text>
            </View>
            <View style={styles.zoneBadge}>
              <Text style={styles.zoneBadgeText}>{records.length}</Text>
            </View>
          </View>
          {records.map((r) => {
            const isExpanded = expandedEmail === r.workerEmail;
            const contacts = contactsCache[r.workerEmail];
            const isLoading = loadingContacts === r.workerEmail;

            return (
              <View key={r.id} style={styles.workerCardWrap}>
                <Pressable onPress={() => toggleContacts(r.workerEmail)} style={styles.workerCard}>
                  <View style={styles.workerLeft}>
                    <View style={styles.workerAvatar}>
                      <Text style={styles.workerAvatarText}>{r.workerName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.workerName}>{r.workerName}</Text>
                      <Text style={styles.workerRole}>{ROLE_LABELS[r.workerRole] ?? r.workerRole}</Text>
                    </View>
                  </View>
                  <View style={styles.workerRight}>
                    <Text style={styles.workerDuration}>{getDuration(r.clockInAt)}</Text>
                    <Text style={styles.workerTime}>Since {formatTime(r.clockInAt)}</Text>
                  </View>
                  <Text style={[styles.chevron, isExpanded && styles.chevronOpen]}>›</Text>
                </Pressable>

                {isExpanded && (
                  <View style={styles.contactsPanel}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="call" size={13} color={styles.contactsPanelTitle.color} />
                      <Text style={styles.contactsPanelTitle}>Emergency Contacts</Text>
                    </View>
                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.accent} style={{ marginVertical: 8 }} />
                    ) : !contacts || contacts.length === 0 ? (
                      <Text style={styles.noContactsText}>No emergency contacts on file</Text>
                    ) : (
                      contacts.map((c) => (
                        <View key={c.id} style={styles.contactRow}>
                          <View style={styles.contactTypePill}>
                            <Text style={styles.contactTypeText}>{c.contactType}</Text>
                          </View>
                          <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>{c.name}</Text>
                            <Text style={styles.contactMeta}>{c.relationship}</Text>
                          </View>
                          <Pressable
                            onPress={() => Linking.openURL(`tel:${c.phone.replace(/[\s\-().]/g, '')}`)}
                            style={[styles.callBtn, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}
                          >
                            <Ionicons name="call" size={12} color={styles.callBtnText.color} />
                            <Text style={styles.callBtnText}>{c.phone}</Text>
                          </Pressable>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageHeader: { marginBottom: 16 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900' },
    pageSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 20, paddingVertical: 14 },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 24, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40 },
    emptyIcon: { color: theme.textMuted, fontSize: 36, marginBottom: 10 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    zoneSection: { marginBottom: 16 },
    zoneHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
    zoneTitle: { color: theme.text, flex: 1, fontSize: 14, fontWeight: '900' },
    zoneBadge: { backgroundColor: theme.bgHero, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    zoneBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
    workerCardWrap: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 6, overflow: 'hidden' },
    workerCard: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
    workerLeft: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    workerAvatar: { alignItems: 'center', backgroundColor: theme.bgHero, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
    workerAvatarText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
    workerName: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    workerRole: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
    workerRight: { alignItems: 'flex-end', flex: 1 },
    workerDuration: { color: theme.accent, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    workerTime: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    chevron: { color: theme.textMuted, fontSize: 20, marginLeft: 8, transform: [{ rotate: '0deg' }] },
    chevronOpen: { transform: [{ rotate: '90deg' }] },
    contactsPanel: { backgroundColor: theme.bgInput, borderTopColor: theme.border, borderTopWidth: 1, padding: 12 },
    contactsPanelTitle: { color: theme.text, fontSize: 12, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase' },
    noContactsText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    contactRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 8 },
    contactTypePill: { backgroundColor: theme.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    contactTypeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
    contactInfo: { flex: 1 },
    contactName: { color: theme.text, fontSize: 13, fontWeight: '800' },
    contactMeta: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginTop: 1 },
    callBtn: { backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
    callBtnText: { color: theme.success, fontSize: 12, fontWeight: '800' },
  });
}
