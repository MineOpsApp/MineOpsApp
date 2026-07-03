import { useEffect, useRef, useState } from 'react';
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

import { getMyWorkerMessages, parseApiError, sendWorkerMessage } from '../../services/api';
import type { WorkerMessage } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function WorkerMessagesScreen({ session }: Props) {
  const [messages, setMessages] = useState<WorkerMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function load() {
    try {
      const data = await getMyWorkerMessages();
      setMessages(data);
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
    if (trimmed.length > 500) {
      Alert.alert('Too long', 'Message must be 500 characters or less.');
      return;
    }
    setSending(true);
    try {
      const sent = await sendWorkerMessage(trimmed);
      setMessages((prev) => [sent, ...prev]);
      setText('');
    } catch (e) {
      Alert.alert('Failed to send', parseApiError(e));
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
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1f6f5b" />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Message Supervisor</Text>
          <Text style={styles.pageSub}>
            {session.user.assignedSite ?? 'Your site'} · Messages are private to your supervisor
          </Text>
        </View>

        {/* Compose */}
        <View style={styles.composeCard}>
          <TextInput
            style={styles.composeInput}
            placeholder={`Send a message to your supervisor…\nE.g. "Equipment EX-01 making strange noise"`}
            placeholderTextColor="#556878"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <View style={styles.composeFooter}>
            <Text style={[styles.charCount, charCount > 450 && styles.charCountWarn]}>
              {charCount}/500
            </Text>
            <Pressable
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.sendBtnText}>Send →</Text>
              }
            </Pressable>
          </View>
        </View>

        {/* History */}
        {loading ? (
          <ActivityIndicator color="#1f6f5b" style={{ marginTop: 24 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Type a message above to contact your supervisor</Text>
          </View>
        ) : (
          <>
            <Text style={styles.historyLabel}>Your messages</Text>
            {messages.map((m) => (
              <View key={m.id} style={styles.msgCard}>
                <View style={styles.msgBubble}>
                  <Text style={styles.msgText}>{m.content}</Text>
                  <Text style={styles.msgTime}>{formatTime(m.createdAt)}</Text>
                </View>

                {m.reply ? (
                  <View style={styles.replyBubble}>
                    <Text style={styles.replyLabel}>Supervisor replied</Text>
                    <Text style={styles.replyText}>{m.reply}</Text>
                    {m.repliedAt && (
                      <Text style={styles.replyTime}>{formatTime(m.repliedAt)}</Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.pendingRow}>
                    <View style={styles.pendingDot} />
                    <Text style={styles.pendingText}>Awaiting reply</Text>
                  </View>
                )}
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
  pageSub: { color: '#7d8590', fontSize: 13, marginTop: 2 },

  composeCard: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 12,
    marginBottom: 20,
  },
  composeInput: {
    color: '#e6edf3',
    fontSize: 15,
    minHeight: 80,
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
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

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

  msgCard: { marginBottom: 16 },
  msgBubble: {
    backgroundColor: '#1f3d2e',
    borderRadius: 12,
    borderBottomRightRadius: 2,
    padding: 12,
    alignSelf: 'flex-end',
    maxWidth: '90%',
  },
  msgText: { color: '#e6edf3', fontSize: 15, lineHeight: 20 },
  msgTime: { color: '#3fb950', fontSize: 11, marginTop: 4, textAlign: 'right' },

  replyBubble: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#30363d',
    padding: 12,
    marginTop: 6,
    maxWidth: '90%',
    alignSelf: 'flex-start',
  },
  replyLabel: { color: '#7d8590', fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  replyText: { color: '#e6edf3', fontSize: 15, lineHeight: 20 },
  replyTime: { color: '#7d8590', fontSize: 11, marginTop: 4 },

  pendingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d29922' },
  pendingText: { color: '#7d8590', fontSize: 12 },
});
