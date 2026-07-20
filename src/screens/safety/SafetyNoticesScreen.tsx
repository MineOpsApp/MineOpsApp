import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InputField } from '../../components/InputField';
import { ActionButton } from '../../components/ActionButton';
import { getNotices, createNotice, parseApiError } from '../../services/api';
import type { Notice } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SafetyNoticesScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState('Safety Alert');
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  function load() { getNotices().then(setNotices).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function post() {
    if (!title.trim()) { Alert.alert('Required', 'Enter a notice title.'); return; }
    if (!message.trim()) { Alert.alert('Required', 'Enter the notice message.'); return; }
    setPosting(true);
    try {
      const notice = await createNotice({ title: title.trim(), message: message.trim(), postedByRole: session.user.role, actorName: session.user.fullName, actorEmail: session.user.email });
      setNotices((c) => [notice, ...c]);
      Alert.alert('Posted', `Notice #${notice.id} posted.`);
    } catch (e) { Alert.alert('Action failed', parseApiError(e)); }
    finally { setPosting(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.title}>Notices</Text>
      <InputField label="Title" onChangeText={setTitle} value={title} />
      <InputField label="Message" multiline onChangeText={setMessage} value={message} placeholder="Enter notice details..." />
      <ActionButton label={posting ? 'Posting...' : 'Post Notice'} onPress={post} disabled={posting} />
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 16 },
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 8 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 10, padding: 14 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
    meta: { color: theme.textSub, fontSize: 13, fontWeight: '600', marginBottom: 4 },
    seenMeta: { color: theme.textMuted, fontSize: 12, fontWeight: '700' },
  });
}
