import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getWorkerContactDirectory, getWorkerEmergencyContacts, getWorkerProfileByEmail } from '../../services/api';
import type { UserProfile, WorkerDirectoryEntry } from '../../services/api';
import type { EmergencyContact } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession; onViewProfile?: (email: string) => void };

const ROLE_LABELS: Record<string, string> = {
  worker: 'Worker',
  supervisor: 'Supervisor',
  safetyOfficer: 'Safety Officer',
};

export function SupervisorWorkerContactsScreen({ session: _, onViewProfile }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [workers, setWorkers] = useState<WorkerDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [contactsCache, setContactsCache] = useState<Record<string, EmergencyContact[]>>({});
  const [loadingContacts, setLoadingContacts] = useState<string | null>(null);
  const [profilesCache, setProfilesCache] = useState<Record<string, UserProfile>>({});

  function load() {
    return getWorkerContactDirectory().then(setWorkers).catch(() => {});
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleContacts(worker: WorkerDirectoryEntry) {
    if (expandedEmail === worker.email) { setExpandedEmail(null); return; }
    setExpandedEmail(worker.email);
    const needsContacts = contactsCache[worker.email] === undefined;
    const needsProfile = profilesCache[worker.email] === undefined;
    if (!needsContacts && !needsProfile) return;
    setLoadingContacts(worker.email);
    try {
      const [contacts, profile] = await Promise.allSettled([
        needsContacts ? getWorkerEmergencyContacts(worker.email) : Promise.resolve(contactsCache[worker.email]),
        needsProfile ? getWorkerProfileByEmail(worker.email) : Promise.resolve(profilesCache[worker.email]),
      ]);
      if (contacts.status === 'fulfilled') {
        setContactsCache((prev) => ({ ...prev, [worker.email]: contacts.value }));
      } else {
        setContactsCache((prev) => ({ ...prev, [worker.email]: [] }));
      }
      if (profile.status === 'fulfilled' && profile.value) {
        setProfilesCache((prev) => ({ ...prev, [worker.email]: profile.value as UserProfile }));
      }
    } finally {
      setLoadingContacts(null);
    }
  }

  const filtered = workers.filter((w) =>
    w.fullName.toLowerCase().includes(search.toLowerCase()) ||
    w.email.toLowerCase().includes(search.toLowerCase())
  );

  const withContacts = workers.filter((w) => w.contactCount > 0).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Worker Contacts</Text>
        <Text style={styles.pageSub}>All site personnel · Tap to view emergency contacts</Text>
      </View>

      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripValue}>{workers.length}</Text>
          <Text style={styles.stripLabel}>Total</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: theme.accent }]}>{withContacts}</Text>
          <Text style={styles.stripLabel}>Have Contacts</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: theme.danger }]}>{workers.length - withContacts}</Text>
          <Text style={styles.stripLabel}>Missing</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email…"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </Pressable>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No workers match "{search}"</Text>
        </View>
      ) : null}

      {filtered.map((w) => {
        const isExpanded = expandedEmail === w.email;
        const contacts = contactsCache[w.email];
        const profile = profilesCache[w.email];
        const isLoading = loadingContacts === w.email;
        const hasContacts = w.contactCount > 0;

        return (
          <View key={w.id} style={styles.workerCardWrap}>
            <Pressable onPress={() => toggleContacts(w)} style={styles.workerCard}>
              <View style={styles.workerLeft}>
                <View style={[styles.workerAvatar, !hasContacts && styles.workerAvatarWarning]}>
                  {profile?.profilePhoto ? (
                    <Image source={{ uri: profile.profilePhoto }} style={styles.workerAvatarImg} />
                  ) : (
                    <Text style={styles.workerAvatarText}>{w.fullName.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View>
                  <Text style={styles.workerName}>{w.fullName}</Text>
                  <Text style={styles.workerRole}>{ROLE_LABELS[w.role] ?? w.role}</Text>
                </View>
              </View>
              <View style={styles.workerRight}>
                {hasContacts ? (
                  <View style={styles.contactsBadge}>
                    <Text style={styles.contactsBadgeText}>{w.contactCount} contact{w.contactCount > 1 ? 's' : ''}</Text>
                  </View>
                ) : (
                  <View style={styles.noContactsBadge}>
                    <Text style={styles.noContactsBadgeText}>None</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.chevron, isExpanded && styles.chevronOpen]}>›</Text>
            </Pressable>

            {isExpanded && (
              <View style={styles.contactsPanel}>
                {onViewProfile && (
                  <Pressable onPress={() => onViewProfile(w.email)} style={styles.viewProfileBtn}>
                    <Text style={styles.viewProfileBtnText}>🪪 View Full Profile & ID Card →</Text>
                  </Pressable>
                )}
                {profile?.bio ? (
                  <View style={styles.bioRow}>
                    <Text style={styles.bioText}>{profile.bio}</Text>
                  </View>
                ) : null}
                {profile && (
                  <View style={styles.profileStatsRow}>
                    <Text style={styles.profileStat}>{profile.shiftLogCount} shifts</Text>
                    <Text style={styles.profileStatDot}>·</Text>
                    <Text style={styles.profileStat}>{profile.certificationCount} certs</Text>
                    <Text style={styles.profileStatDot}>·</Text>
                    <Text style={styles.profileStat}>ID: WRK-{String(profile.id).padStart(6, '0')}</Text>
                  </View>
                )}
                <Text style={styles.contactsPanelTitle}>📞 Emergency Contacts</Text>
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
                        style={styles.callBtn}
                      >
                        <Text style={styles.callBtnText}>📞 {c.phone}</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageHeader: { marginBottom: 16 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900' },
    pageSub: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
    strip: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingVertical: 14 },
    stripItem: { alignItems: 'center', flex: 1 },
    stripValue: { color: theme.text, fontSize: 24, fontWeight: '900' },
    stripLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
    stripDivider: { backgroundColor: theme.border, width: 1 },
    searchWrap: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: 14, paddingHorizontal: 12, paddingVertical: 10 },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { color: theme.text, flex: 1, fontSize: 14, fontWeight: '600' },
    clearSearch: { color: theme.textMuted, fontSize: 14, fontWeight: '800', paddingLeft: 8 },
    emptyCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, padding: 20 },
    emptyText: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    workerCardWrap: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
    workerCard: { alignItems: 'center', flexDirection: 'row', padding: 12 },
    workerLeft: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10 },
    workerAvatar: { alignItems: 'center', backgroundColor: theme.bgHero, borderRadius: 18, height: 36, justifyContent: 'center', overflow: 'hidden', width: 36 },
    workerAvatarWarning: { backgroundColor: theme.amber },
    workerAvatarText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
    workerAvatarImg: { height: 36, width: 36 },
    bioRow: { backgroundColor: theme.bgInput, borderRadius: 8, marginBottom: 10, padding: 10 },
    bioText: { color: theme.textSub, fontSize: 12, fontWeight: '600', lineHeight: 18 },
    profileStatsRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 12 },
    profileStat: { color: theme.textSub, fontSize: 11, fontWeight: '700' },
    profileStatDot: { color: theme.textMuted, fontSize: 11 },
    viewProfileBtn: { backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 10 },
    viewProfileBtnText: { color: theme.success, fontSize: 13, fontWeight: '800' },
    workerName: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    workerRole: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
    workerRight: { marginRight: 6 },
    contactsBadge: { backgroundColor: theme.successLight, borderColor: theme.success, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    contactsBadgeText: { color: theme.success, fontSize: 11, fontWeight: '800' },
    noContactsBadge: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    noContactsBadgeText: { color: theme.danger, fontSize: 11, fontWeight: '800' },
    chevron: { color: theme.textMuted, fontSize: 20, transform: [{ rotate: '0deg' }] },
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
