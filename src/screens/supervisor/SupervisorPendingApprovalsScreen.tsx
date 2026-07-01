import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getPendingWorkers, approveWorker, rejectWorker } from '../../services/api';
import type { AuthSession } from '../../types/auth';

type PendingWorker = {
  id: number;
  fullName: string;
  email: string;
  assignedSite: string;
  createdAt: string | null;
};

type Props = { session: AuthSession };

export function SupervisorPendingApprovalsScreen({ session: _ }: Props) {
  const [workers, setWorkers] = useState<PendingWorker[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  function load() {
    return getPendingWorkers().then(setWorkers).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function formatDate(str: string | null) {
    if (!str) return '';
    try { return new Date(str).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return str; }
  }

  async function handleApprove(worker: PendingWorker) {
    Alert.alert(
      'Approve worker?',
      `${worker.fullName} will be able to log in immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActing(worker.email);
            try {
              await approveWorker(worker.email);
              setWorkers((prev) => prev.filter((w) => w.email !== worker.email));
            } catch {
              Alert.alert('Failed', 'Could not approve worker. Try again.');
            } finally {
              setActing(null);
            }
          },
        },
      ]
    );
  }

  async function handleReject(worker: PendingWorker) {
    Alert.alert(
      'Reject registration?',
      `${worker.fullName}'s account will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActing(worker.email);
            try {
              await rejectWorker(worker.email);
              setWorkers((prev) => prev.filter((w) => w.email !== worker.email));
            } catch {
              Alert.alert('Failed', 'Could not reject worker. Try again.');
            } finally {
              setActing(null);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Pending Approvals</Text>
      <Text style={styles.subtitle}>Pull to refresh</Text>

      {workers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>No pending registrations</Text>
          <Text style={styles.emptySub}>New worker sign-ups will appear here for your review</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {workers.length} worker{workers.length !== 1 ? 's' : ''} waiting for approval
            </Text>
          </View>
          {workers.map((worker) => (
            <View key={worker.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{worker.fullName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{worker.fullName}</Text>
                  <Text style={styles.email}>{worker.email}</Text>
                  <Text style={styles.meta}>{worker.assignedSite}</Text>
                  {worker.createdAt ? <Text style={styles.time}>Registered {formatDate(worker.createdAt)}</Text> : null}
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => handleApprove(worker)}
                  disabled={acting === worker.email}
                  style={[styles.approveBtn, acting === worker.email && styles.btnDisabled]}
                >
                  <Text style={styles.approveBtnText}>
                    {acting === worker.email ? 'Processing...' : 'Approve'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleReject(worker)}
                  disabled={acting === worker.email}
                  style={[styles.rejectBtn, acting === worker.email && styles.btnDisabled]}
                >
                  <Text style={styles.rejectBtnText}>
                    {acting === worker.email ? '...' : 'Reject'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 2 },
  subtitle: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginBottom: 16 },
  infoBox: { backgroundColor: '#fffbeb', borderColor: '#fde68a', borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 12 },
  infoText: { color: '#92400e', fontSize: 13, fontWeight: '700' },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 40 },
  emptyIcon: { color: '#1f6f5b', fontSize: 32, fontWeight: '900', marginBottom: 10 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 14 },
  avatar: { alignItems: 'center', backgroundColor: '#17212b', borderRadius: 22, height: 44, justifyContent: 'center', marginRight: 12, width: 44 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  cardInfo: { flex: 1 },
  name: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  email: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  meta: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  time: { color: '#8fa3b8', fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  approveBtn: { alignItems: 'center', backgroundColor: '#1f6f5b', borderRadius: 8, flex: 1, paddingVertical: 10 },
  approveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  rejectBtn: { alignItems: 'center', backgroundColor: '#fff5f5', borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10 },
  rejectBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },
});
