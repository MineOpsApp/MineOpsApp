import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { getNotices, markNoticeSeen } from '../../services/api';
import type { Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function WorkerNoticesScreen({ session }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [acknowledging, setAcknowledging] = useState<number | null>(null);

  useEffect(() => {
    getNotices().then(setNotices).catch(() => {});
  }, []);

  async function acknowledge(notice: Notice) {
    setAcknowledging(notice.id);
    try {
      const updated = await markNoticeSeen(notice.id, session.user);
      setNotices((c) => c.map((n) => n.id === updated.id ? updated : n));
    } catch {
      Alert.alert('Failed', 'Could not acknowledge notice.');
    } finally {
      setAcknowledging(null);
    }
  }

  const unacknowledged = notices.filter(
    (n) => !n.seenBy.some((s) => s.email.toLowerCase() === session.user.email.toLowerCase())
  );
  const acknowledged = notices.filter(
    (n) => n.seenBy.some((s) => s.email.toLowerCase() === session.user.email.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Notices</Text>
        {unacknowledged.length > 0 && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>{unacknowledged.length} pending</Text>
          </View>
        )}
      </View>

      {unacknowledged.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>ACTION REQUIRED</Text>
          {unacknowledged.map((n) => (
            <View key={n.id} style={styles.urgentCard}>
              <View style={styles.urgentTop}>
                <Text style={styles.urgentFlag}>⚠ Acknowledgment required</Text>
                <Text style={styles.noticeRole}>{n.postedByRole}</Text>
              </View>
              <Text style={styles.noticeTitle}>{n.title}</Text>
              <Text style={styles.noticeMessage}>{n.message}</Text>
              <Pressable
                onPress={() => acknowledge(n)}
                style={[styles.ackBtn, acknowledging === n.id && styles.ackBtnLoading]}
              >
                <Text style={styles.ackBtnText}>
                  {acknowledging === n.id ? 'Acknowledging...' : '✓  I have read and understood this notice'}
                </Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.allClearCard}>
          <Text style={styles.allClearIcon}>✓</Text>
          <View>
            <Text style={styles.allClearTitle}>All notices acknowledged</Text>
            <Text style={styles.allClearSub}>You're up to date</Text>
          </View>
        </View>
      )}

      {acknowledged.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>ACKNOWLEDGED</Text>
          {acknowledged.map((n) => (
            <View key={n.id} style={styles.doneCard}>
              <View style={styles.doneLeft}>
                <View style={styles.doneCheck}>
                  <Text style={styles.doneCheckText}>✓</Text>
                </View>
                <View style={styles.doneBody}>
                  <Text style={styles.doneTitle}>{n.title}</Text>
                  <Text style={styles.doneMeta}>{n.message}</Text>
                </View>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {notices.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📢</Text>
          <Text style={styles.emptyTitle}>No notices yet</Text>
          <Text style={styles.emptySub}>Site notices will appear here</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 20 },
  pageTitle: { color: '#17212b', flex: 1, fontSize: 22, fontWeight: '900' },
  urgentBadge: { backgroundColor: '#b42318', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  urgentBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  sectionLabel: { color: '#8fa3b8', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  urgentCard: { backgroundColor: '#ffffff', borderColor: '#b42318', borderRadius: 12, borderWidth: 2, marginBottom: 12, overflow: 'hidden' },
  urgentTop: { alignItems: 'center', backgroundColor: '#fff5f5', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 },
  urgentFlag: { color: '#b42318', fontSize: 12, fontWeight: '800' },
  noticeRole: { color: '#8fa3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  noticeTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 6, paddingHorizontal: 14, paddingTop: 12 },
  noticeMessage: { color: '#5d6875', fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 14, paddingHorizontal: 14 },
  ackBtn: { alignItems: 'center', backgroundColor: '#1f6f5b', margin: 14, marginTop: 0, borderRadius: 8, paddingVertical: 12 },
  ackBtnLoading: { opacity: 0.6 },
  ackBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  allClearCard: { alignItems: 'center', backgroundColor: '#f0fdf4', borderColor: '#86efac', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 20, padding: 16 },
  allClearIcon: { color: '#16a34a', fontSize: 24 },
  allClearTitle: { color: '#15803d', fontSize: 14, fontWeight: '900' },
  allClearSub: { color: '#4ade80', fontSize: 12, fontWeight: '600', marginTop: 2 },
  doneCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 8, padding: 12 },
  doneLeft: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  doneCheck: { alignItems: 'center', backgroundColor: '#e7f6ef', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  doneCheckText: { color: '#1f6f5b', fontSize: 14, fontWeight: '900' },
  doneBody: { flex: 1 },
  doneTitle: { color: '#17212b', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  doneMeta: { color: '#8fa3b8', fontSize: 12, fontWeight: '600' },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 32 },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
});