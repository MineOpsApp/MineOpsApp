import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getSiteAnnouncements, parseApiError, postAnnouncement } from '../../services/api';
import type { ShiftAnnouncement } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { formatAgo } from '../../utils/time';

type Props = { session: AuthSession };

export function SupervisorAnnouncementsScreen({ session }: Props) {
  const [announcements, setAnnouncements] = useState<ShiftAnnouncement[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setAnnouncements(await getSiteAnnouncements());
    } catch { /* silent */ }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const created = await postAnnouncement(trimmed);
      setAnnouncements((prev) => [created, ...prev].slice(0, 5));
      setText('');
    } catch (e) {
      Alert.alert('Failed to post', parseApiError(e));
    } finally {
      setSending(false);
    }
  }

  const charCount = text.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Shift Announcements</Text>
          <Text style={styles.pageSub}>
            Broadcast a quick update to all workers on {session.user.assignedSite ?? 'your site'} · expires after 24h
          </Text>
        </View>

        {/* Compose */}
        <View style={styles.composeCard}>
          <TextInput
            style={styles.composeInput}
            placeholder={`Broadcast a quick update…\nE.g. "Meeting at 3pm in Zone B" or "Water supply restored"`}
            placeholderTextColor="#556878"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={200}
            returnKeyType="default"
          />
          <View style={styles.composeFooter}>
            <Text style={[styles.charCount, charCount > 160 && styles.charCountWarn]}>
              {charCount}/200
            </Text>
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.sendBtnText}>📢 Broadcast</Text>
              }
            </Pressable>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>Workers receive a push notification and see it on their home screen for 24 hours</Text>
        </View>

        {/* History */}
        {loading ? (
          <ActivityIndicator color="#1f6f5b" style={{ marginTop: 24 }} />
        ) : announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📢</Text>
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            <Text style={styles.emptySub}>Post one above to broadcast to all workers</Text>
          </View>
        ) : (
          <>
            <Text style={styles.historyLabel}>Last 5 · Last 24 hours</Text>
            {announcements.map((a) => (
              <View key={a.id} style={styles.announcementCard}>
                <View style={styles.announcementTop}>
                  <Text style={styles.announcementIcon}>📢</Text>
                  <View style={styles.announcementMeta}>
                    <Text style={styles.announcementBy}>{a.createdByName}</Text>
                    <Text style={styles.announcementTime}>{formatAgo(a.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.announcementContent}>{a.content}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },

  pageHeader: { marginBottom: 16 },
  pageTitle: { color: '#e6edf3', fontSize: 20, fontWeight: '800' },
  pageSub: { color: '#7d8590', fontSize: 13, marginTop: 2, lineHeight: 18 },

  composeCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 12,
    marginBottom: 10,
  },
  composeInput: {
    color: '#e6edf3',
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  composeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#21262d',
  },
  charCount: { color: '#7d8590', fontSize: 12 },
  charCountWarn: { color: '#d29922' },
  sendBtn: {
    backgroundColor: '#1f6f5b',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  infoRow: { marginBottom: 20 },
  infoText: { color: '#556878', fontSize: 12, lineHeight: 17 },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 32,
    gap: 8,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { color: '#e6edf3', fontSize: 16, fontWeight: '700' },
  emptySub: { color: '#7d8590', fontSize: 13, textAlign: 'center' },

  historyLabel: { color: '#7d8590', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },

  announcementCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 12,
    marginBottom: 8,
  },
  announcementTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  announcementIcon: { fontSize: 16 },
  announcementMeta: {},
  announcementBy: { color: '#e6edf3', fontSize: 13, fontWeight: '700' },
  announcementTime: { color: '#7d8590', fontSize: 12 },
  announcementContent: { color: '#c9d1d9', fontSize: 15, lineHeight: 21 },
});
