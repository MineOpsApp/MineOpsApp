import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  getPendingWorkers,
  approveWorker,
  rejectWorker,
  getPendingBuyers,
  approveBuyer,
  rejectBuyer,
  type PendingBuyer,
} from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type PendingWorker = {
  id: number;
  fullName: string;
  email: string;
  assignedSite: string;
  createdAt: string | null;
};

type Props = { session: AuthSession };

export function SupervisorPendingApprovalsScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [workers, setWorkers] = useState<PendingWorker[]>([]);
  const [buyers, setBuyers] = useState<PendingBuyer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoadError(false);
    getPendingWorkers().then(setWorkers).catch(() => setLoadError(true));
    getPendingBuyers().then(setBuyers).catch(() => setLoadError(true));
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }

  function formatDate(str: string | null) {
    if (!str) return '';
    try { return new Date(str).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return str; }
  }

  async function handleApproveWorker(worker: PendingWorker) {
    Alert.alert('Approve worker?', `${worker.fullName} will be able to log in immediately.`, [
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
    ]);
  }

  async function handleRejectWorker(worker: PendingWorker) {
    Alert.alert('Reject registration?', `${worker.fullName}'s account will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
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
    ]);
  }

  async function handleApproveBuyer(buyer: PendingBuyer) {
    Alert.alert('Verify buyer?', `${buyer.fullName} (${buyer.businessName ?? 'no business name'}) will gain access to marketplace listings.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          setActing(buyer.email);
          try {
            await approveBuyer(buyer.email);
            setBuyers((prev) => prev.filter((b) => b.email !== buyer.email));
          } catch {
            Alert.alert('Failed', 'Could not verify buyer. Try again.');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  }

  async function handleRejectBuyer(buyer: PendingBuyer) {
    Alert.alert('Reject buyer?', `${buyer.fullName}'s account will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setActing(buyer.email);
          try {
            await rejectBuyer(buyer.email);
            setBuyers((prev) => prev.filter((b) => b.email !== buyer.email));
          } catch {
            Alert.alert('Failed', 'Could not reject buyer. Try again.');
          } finally {
            setActing(null);
          }
        },
      },
    ]);
  }

  const totalPending = workers.length + buyers.length;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Pending Approvals</Text>
      <Text style={styles.subtitle}>Pull to refresh</Text>

      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Failed to load approvals. Pull to refresh.</Text>
        </View>
      ) : totalPending === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>No pending registrations</Text>
          <Text style={styles.emptySub}>New worker sign-ups and buyer registrations will appear here</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {totalPending} registration{totalPending !== 1 ? 's' : ''} waiting for approval
            </Text>
          </View>

          {workers.length > 0 ? (
            <>
              <Text style={styles.sectionHeader}>Workers</Text>
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
                    <Pressable onPress={() => handleApproveWorker(worker)} disabled={acting === worker.email} style={[styles.approveBtn, acting === worker.email && styles.btnDisabled]}>
                      <Text style={styles.approveBtnText}>{acting === worker.email ? 'Processing...' : 'Approve'}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleRejectWorker(worker)} disabled={acting === worker.email} style={[styles.rejectBtn, acting === worker.email && styles.btnDisabled]}>
                      <Text style={styles.rejectBtnText}>{acting === worker.email ? '...' : 'Reject'}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : null}

          {buyers.length > 0 ? (
            <>
              <Text style={styles.sectionHeader}>Buyers</Text>
              {buyers.map((buyer) => (
                <View key={buyer.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatar, styles.buyerAvatar]}>
                      <Text style={styles.avatarText}>{buyer.fullName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.name}>{buyer.fullName}</Text>
                      <Text style={styles.email}>{buyer.email}</Text>
                      {buyer.businessName ? <Text style={styles.meta}>🏢 {buyer.businessName}</Text> : null}
                      <Text style={styles.meta}>🪪 GoldBod: {buyer.goldbodLicenseNumber ?? 'Not provided'}</Text>
                      {buyer.createdAt ? <Text style={styles.time}>Registered {formatDate(buyer.createdAt)}</Text> : null}
                    </View>
                    <View style={styles.buyerBadge}><Text style={styles.buyerBadgeText}>BUYER</Text></View>
                  </View>
                  <View style={styles.actions}>
                    <Pressable onPress={() => handleApproveBuyer(buyer)} disabled={acting === buyer.email} style={[styles.approveBtn, acting === buyer.email && styles.btnDisabled]}>
                      <Text style={styles.approveBtnText}>{acting === buyer.email ? 'Processing...' : 'Verify'}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleRejectBuyer(buyer)} disabled={acting === buyer.email} style={[styles.rejectBtn, acting === buyer.email && styles.btnDisabled]}>
                      <Text style={styles.rejectBtnText}>{acting === buyer.email ? '...' : 'Reject'}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    subtitle: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 16 },
    infoBox: { backgroundColor: theme.amberLight, borderColor: theme.amber, borderRadius: 8, borderWidth: 1, marginBottom: 14, padding: 12 },
    infoText: { color: theme.amber, fontSize: 13, fontWeight: '700' },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 40 },
    emptyIcon: { color: theme.accent, fontSize: 32, fontWeight: '900', marginBottom: 10 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    sectionHeader: { color: theme.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
    cardHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 14 },
    avatar: { alignItems: 'center', backgroundColor: theme.bgHero, borderRadius: 22, height: 44, justifyContent: 'center', marginRight: 12, width: 44 },
    buyerAvatar: { backgroundColor: theme.info },
    avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
    cardInfo: { flex: 1 },
    name: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 2 },
    email: { color: theme.textSub, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    meta: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 2 },
    time: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
    buyerBadge: { backgroundColor: theme.infoLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    buyerBadgeText: { color: theme.info, fontSize: 9, fontWeight: '900' },
    actions: { flexDirection: 'row', gap: 10 },
    approveBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 1, paddingVertical: 10 },
    approveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
    rejectBtn: { alignItems: 'center', backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10 },
    rejectBtnText: { color: theme.danger, fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.5 },
    errorBanner: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 8, borderWidth: 1, marginBottom: 12, padding: 14 },
    errorBannerText: { color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  });
}
