import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { getNotices, markNoticeSeen } from '../../services/api';
import type { Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function GuestNoticesScreen({ session }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    getNotices().then(setNotices).catch(() => {});
  }, []);

  async function markSeen(notice: Notice) {
    try {
      const updated = await markNoticeSeen(notice.id, session.user);
      setNotices((c) => c.map((n) => n.id === updated.id ? updated : n));
    } catch { Alert.alert('Action failed', 'Could not mark notice as seen.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notices</Text>
      {notices.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No notices yet</Text></View>
      ) : null}
      {notices.map((n) => {
        const seen = n.seenBy.some((s) => s.email.toLowerCase() === session.user.email.toLowerCase());
        return (
          <View key={n.id} style={[styles.card, seen && styles.seenCard]}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.meta}>{n.message}</Text>
            {!seen ? <ActionButton label="Mark as Seen" onPress={() => markSeen(n)} /> : (
              <Text style={styles.seenLabel}>✓ Seen</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  seenCard: { borderColor: '#1f6f5b', opacity: 0.8 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  seenLabel: { color: '#1f6f5b', fontSize: 13, fontWeight: '800' },
});