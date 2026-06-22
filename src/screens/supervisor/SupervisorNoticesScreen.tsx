import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { getNotices, createNotice, createSupervisorMessage } from '../../services/api';
import type { Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorNoticesScreen({ session }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState('Zone B restriction');
  const [message, setMessage] = useState('Zone B is restricted until clearance.');
  const [briefing, setBriefing] = useState('Avoid Zone B until clearance is completed.');

  useEffect(() => {
    getNotices().then(setNotices).catch(() => {});
  }, []);

  async function post() {
    try {
      const notice = await createNotice({ title: title.trim() || 'Site Notice', message: message.trim() || 'New notice', postedByRole: session.user.role, actorName: session.user.fullName, actorEmail: session.user.email });
      setNotices((c) => [notice, ...c]);
      Alert.alert('Posted', `Notice #${notice.id} posted.`);
    } catch { Alert.alert('Action failed', 'Could not post notice.'); }
  }

  async function sendBriefing() {
    try {
      await createSupervisorMessage({ senderRole: session.user.role, actorName: session.user.fullName, actorEmail: session.user.email, audience: 'Workers - Obuasi Mine', message: briefing.trim() || 'Daily briefing sent' });
      Alert.alert('Sent', 'Briefing sent to workers.');
    } catch { Alert.alert('Action failed', 'Could not send briefing.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notices</Text>
      <Text style={styles.sectionTitle}>Send Briefing</Text>
      <InputField label="Briefing" multiline onChangeText={setBriefing} value={briefing} />
      <ActionButton label="Send Briefing" onPress={sendBriefing} />
      <Text style={styles.sectionTitle}>Post Notice</Text>
      <InputField label="Title" onChangeText={setTitle} value={title} />
      <InputField label="Message" multiline onChangeText={setMessage} value={message} />
      <ActionButton label="Post Notice" onPress={post} />
      <Text style={styles.sectionTitle}>Posted Notices</Text>
      {notices.map((n) => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.cardTitle}>{n.title}</Text>
          <Text style={styles.meta}>{n.message}</Text>
          <Text style={styles.seenMeta}>Seen by: {n.seenBy.length ? n.seenBy.map((s) => s.fullName).join(', ') : 'None'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
  title: { color: '#17212b', fontSize: 26, fontWeight: '800', marginBottom: 16 },
  sectionTitle: { color: '#17212b', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  card: { backgroundColor: '#fff', borderColor: '#dde3ea', borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  meta: { color: '#5d6875', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  seenMeta: { color: '#9aa5b1', fontSize: 12, fontWeight: '700' },
});
