import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getWorkerContactDirectory, getWorkerEmergencyContacts } from '../../services/api';
import type { WorkerDirectoryEntry } from '../../services/api';
import type { EmergencyContact } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

const ROLE_LABELS: Record<string, string> = {
  worker: 'Worker',
  supervisor: 'Supervisor',
  safetyOfficer: 'Safety Officer',
};

export function SupervisorWorkerContactsScreen({ session: _ }: Props) {
  const [workers, setWorkers] = useState<WorkerDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [contactsCache, setContactsCache] = useState<Record<string, EmergencyContact[]>>({});
  const [loadingContacts, setLoadingContacts] = useState<string | null>(null);

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
    if (contactsCache[worker.email] !== undefined) return;
    setLoadingContacts(worker.email);
    try {
      const contacts = await getWorkerEmergencyContacts(worker.email);
      setContactsCache((prev) => ({ ...prev, [worker.email]: contacts }));
    } catch {
      setContactsCache((prev) => ({ ...prev, [worker.email]: [] }));
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
        <ActivityIndicator color="#1f6f5b" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
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
          <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>{withContacts}</Text>
          <Text style={styles.stripLabel}>Have Contacts</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#b42318' }]}>{workers.length - withContacts}</Text>
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
          placeholderTextColor="#8fa3b8"
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
        const isLoading = loadingContacts === w.email;
        const hasContacts = w.contactCount > 0;

        return (
          <View key={w.id} style={styles.workerCardWrap}>
            <Pressable onPress={() => toggleContacts(w)} style={styles.workerCard}>
              <View style={styles.workerLeft}>
                <View style={[styles.workerAvatar, !hasContacts && styles.workerAvatarWarning]}>
                  <Text style={styles.workerAvatarText}>{w.fullName.charAt(0).toUpperCase()}</Text>
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
                <Text style={styles.contactsPanelTitle}>📞 Emergency Contacts</Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#1f6f5b" style={{ marginVertical: 8 }} />
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

const styles = StyleSheet.create({
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { marginBottom: 16 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900' },
  pageSub: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 2 },
  strip: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingVertical: 14 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 24, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  searchWrap: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, flexDirection: 'row', marginBottom: 14, paddingHorizontal: 12, paddingVertical: 10 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { color: '#17212b', flex: 1, fontSize: 14, fontWeight: '600' },
  clearSearch: { color: '#8fa3b8', fontSize: 14, fontWeight: '800', paddingLeft: 8 },
  emptyCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, padding: 20 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  workerCardWrap: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  workerCard: { alignItems: 'center', flexDirection: 'row', padding: 12 },
  workerLeft: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10 },
  workerAvatar: { alignItems: 'center', backgroundColor: '#17212b', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  workerAvatarWarning: { backgroundColor: '#b45309' },
  workerAvatarText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  workerName: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  workerRole: { color: '#8fa3b8', fontSize: 11, fontWeight: '700' },
  workerRight: { marginRight: 6 },
  contactsBadge: { backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  contactsBadgeText: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  noContactsBadge: { backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  noContactsBadgeText: { color: '#b42318', fontSize: 11, fontWeight: '800' },
  chevron: { color: '#8fa3b8', fontSize: 20, transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  contactsPanel: { backgroundColor: '#f8fafc', borderTopColor: '#e5e9ef', borderTopWidth: 1, padding: 12 },
  contactsPanelTitle: { color: '#17212b', fontSize: 12, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase' },
  noContactsText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  contactRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 8 },
  contactTypePill: { backgroundColor: '#1f6f5b', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  contactTypeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  contactInfo: { flex: 1 },
  contactName: { color: '#17212b', fontSize: 13, fontWeight: '800' },
  contactMeta: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginTop: 1 },
  callBtn: { backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  callBtnText: { color: '#15803d', fontSize: 12, fontWeight: '800' },
});
