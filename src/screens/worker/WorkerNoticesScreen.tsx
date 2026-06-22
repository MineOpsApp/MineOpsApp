import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

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
      Alert.alert('Action failed', 'Could not acknowledge notice.');
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notices</Text>

      {unacknowledged.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Requires Acknowledgment</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{unacknowledged.length}</Text>
            </View>
          </View>
          {unacknowledged.map((n) => (
            <View key={n.id} style={styles.urgentCard}>
              <View style={styles.urgentBanner}>
                <Text style={styles.urgentBannerText}>⚠ Action Required</Text>
              </View>
              <Text style={styles.cardTitle}>{n.title}</Text>
              <Text style={styles.meta}>{n.message}</Text>
              <Text style={styles.roleMeta}>Posted by {n.postedByRole}</Text>
              <ActionButton
                label={acknowledging === n.id ? 'Acknowledging...' : 'Acknowledge Notice'}
                onPress={() => acknowledge(n)}
              />
            </View>
          ))}
        </>
      ) : (
        <View style={styles.allClearCard}>
          <Text style={styles.allClearText}>✓ All notices acknowledged</Text>
        </View>
      )}

      {acknowledged.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Acknowledged</Text>
          {acknowledged.map((n) => (
            <View key={n.id} style={styles.seenCard}>
              <Text style={styles.cardTitle}>{n.title}</Text>
              <Text style={styles.meta}>{n.message}</Text>
              <Text style={styles.seenLabel}>✓ Acknowledged</Text>
            </View>
          ))}
        </>
      ) : null}

      {notices.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No notices yet</Text></View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  sectionTitle: { color: '#17212b', fontSize: 16, fontWeight: '800', flex: 1 },
  countBadge: { backgroundColor: '#b42318', borderRadius: 12, minWidth: 24, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: '#fff', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  urgentCard: { backgroundColor: '#fff', borderColor: '#b42318', borderRadius: 8, borderWidth: 2, marginBottom: 12, overflow: 'hidden' },
  urgentBanner: { backgroundColor: '#b42318', paddingHorizontal: 14, paddingVertical: 6 },
  urgentBannerText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  seenCard: { backgroundColor: '#f8fffe', borderColor: '#1f6f5b', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  allClearCard: { backgroundColor: '#e7f6ef', borderColor: '#1f6f5b', borderRadius: 8, borderWidth: 1, marginBottom: 16, padding: 14 },
  allClearText: { color: '#1f6f5b', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4, padding: 14, paddingBottom: 0 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginBottom: 4, paddingHorizontal: 14 },
  roleMeta: { color: '#9aa5b1', fontSize: 12, fontWeight: '700', marginBottom: 8, paddingHorizontal: 14 },
  seenLabel: { color: '#1f6f5b', fontSize: 13, fontWeight: '800' },
});