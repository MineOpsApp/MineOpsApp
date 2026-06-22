import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { completeVisitorInduction, getNotices } from '../../services/api';
import type { Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function GuestHomeScreen({ session }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    getNotices().then(setNotices).catch(() => {});
  }, []);

  async function completeInduction() {
    try {
      const induction = await completeVisitorInduction({ actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role, site: 'Obuasi Mine', visitorType: 'Guest' });
      Alert.alert('Induction complete', `Guest induction #${induction.id} was saved.`);
    } catch { Alert.alert('Action failed', 'Could not complete visitor induction.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>{session.user.fullName} · Guest</Text>

      <ActionButton label="Complete Site Induction" onPress={completeInduction} />

      <Text style={styles.sectionTitle}>Site Notices</Text>
      {notices.length === 0 ? (
        <View style={styles.card}><Text style={styles.meta}>No notices</Text></View>
      ) : null}
      {notices.slice(0, 5).map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text style={styles.meta}>{n.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#5d6875', fontSize: 14, fontWeight: '700', marginBottom: 20 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600' },
});