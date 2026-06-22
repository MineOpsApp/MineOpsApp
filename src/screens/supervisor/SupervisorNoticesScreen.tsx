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

  useEffect(() => { getNotices().then(setNotices).catch(() => {}); }, []);

  async function post() {
    try {
      const notice = await createNotice({ title: title.trim() || 'Site Notice', message: message.trim() || 'New notice', postedByRole: session.user.role, actorName: session.user.fullName, actorEmail: session.user.email });
      setNotices((c) => [notice, ...c]);
      Alert.alert('Posted', `Notice #${notice.id} posted.`);
    } catch { Alert.alert('Failed', 'Could not post notice.'); }
  }

  async function sendBriefing() {
    try {
      await createSupervisorMessage({ senderRole: session.user.role, actorName: session.user.fullName, actorEmail: session.user.email, audience: 'Workers - Obuasi Mine', message: briefing.trim() || 'Daily briefing sent' });
      Alert.alert('Sent', 'Briefing sent to all workers.');
    } catch { Alert.alert('Failed', 'Could not send briefing.'); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Notices</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📣 Send Briefing</Text>
        <Text style={styles.cardSub}>Broadcast a message to all workers on site</Text>
        <InputField label="Message" multiline onChangeText={setBriefing} value={briefing} />
        <ActionButton label="Send Briefing to Workers" onPress={sendBriefing} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📌 Post Notice</Text>
        <Text style={styles.cardSub}>Notices require acknowledgment from workers</Text>
        <InputField label="Title" onChangeText={setTitle} value={title} />
        <InputField label="Message" multiline onChangeText={setMessage} value={message} />
        <ActionButton label="Post Notice" onPress={post} />
      </View>

      <Text style={styles.sectionTitle}>Posted Notices</Text>
      {notices.length === 0 ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>No notices posted yet</Text></View>
      ) : null}
      {notices.map((n) => {
        const ackCount = n.seenBy.length;
        return (
          <View key={n.id} style={styles.noticeCard}>
            <View style={styles.noticeTop}>
              <View style={styles.noticeAccent} />
              <View style={styles.noticeBody}>
                <Text style={styles.noticeTitle}>{n.title}</Text>
                <Text style={styles.noticeMessage}>{n.message}</Text>
                <Text style={styles.noticeRole}>Posted by {n.postedByRole}</Text>
              </View>
              <View style={[styles.ackBadge, ackCount > 0 ? styles.ackBadgeGreen : styles.ackBadgeGrey]}>
                <Text style={[styles.ackBadgeText, ackCount > 0 ? styles.ackBadgeTextGreen : styles.ackBadgeTextGrey]}>{ackCount} ✓</Text>
              </View>
            </View>
            {ackCount > 0 ? (
              <View style={styles.ackList}>
                {n.seenBy.slice(0, 3).map((s) => (
                  <Text key={s.id} style={styles.ackName}>✓ {s.fullName}</Text>
                ))}
                {n.seenBy.length > 3 ? <Text style={styles.ackMore}>+{n.seenBy.length - 3} more</Text> : null}
              </View>
            ) : (
              <Text style={styles.noAckText}>No acknowledgments yet</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageTitle: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 16 },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  cardTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  cardSub: { color: '#8fa3b8', fontSize: 12, fontWeight: '600', marginBottom: 14 },
  sectionTitle: { color: '#17212b', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  noticeCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  noticeTop: { flexDirection: 'row', alignItems: 'flex-start' },
  noticeAccent: { backgroundColor: '#1f6f5b', width: 3, alignSelf: 'stretch' },
  noticeBody: { flex: 1, padding: 12 },
  noticeTitle: { color: '#17212b', fontSize: 14, fontWeight: '900', marginBottom: 3 },
  noticeMessage: { color: '#5d6875', fontSize: 12, fontWeight: '600', lineHeight: 17, marginBottom: 4 },
  noticeRole: { color: '#8fa3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  ackBadge: { borderRadius: 12, margin: 12, paddingHorizontal: 10, paddingVertical: 4 },
  ackBadgeGreen: { backgroundColor: '#e7f6ef' },
  ackBadgeGrey: { backgroundColor: '#f4f6f8' },
  ackBadgeText: { fontSize: 12, fontWeight: '900' },
  ackBadgeTextGreen: { color: '#1f7a4d' },
  ackBadgeTextGrey: { color: '#8fa3b8' },
  ackList: { borderTopColor: '#f4f6f8', borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  ackName: { color: '#1f6f5b', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  ackMore: { color: '#8fa3b8', fontSize: 11, fontWeight: '700' },
  noAckText: { borderTopColor: '#f4f6f8', borderTopWidth: 1, color: '#b42318', fontSize: 12, fontWeight: '700', padding: 10 },
  emptyCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 20 },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});