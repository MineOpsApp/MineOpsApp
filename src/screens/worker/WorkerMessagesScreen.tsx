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
import { formatAgo } from '../../utils/time';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function WorkerMessagesScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [messages, setMessages] = useState<WorkerMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function load() {
    try {
      const data = await getMyWorkerMessages();
      setMessages(data);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function refresh() {
    setLoadError(false);
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
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Message Supervisor</Text>
          <Text style={styles.pageSub}>
            {session.user.assignedSite ?? 'Your site'} · Messages are private to your supervisor
          </Text>
        </View>

        <View style={styles.composeCard}>
          <TextInput
            style={styles.composeInput}
            placeholder={`Send a message to your supervisor…\nE.g. "Equipment EX-01 making strange noise"`}
            placeholderTextColor={theme.textMuted}
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

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
        ) : loadError && messages.length === 0 ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardText}>Could not load messages. Pull to refresh.</Text>
          </View>
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
                  <Text style={styles.msgTime}>{formatAgo(m.createdAt)}</Text>
                </View>

                {m.reply ? (
                  <View style={styles.replyBubble}>
                    <Text style={styles.replyLabel}>Supervisor replied</Text>
                    <Text style={styles.replyText}>{m.reply}</Text>
                    {m.repliedAt && (
                      <Text style={styles.replyTime}>{formatAgo(m.repliedAt)}</Text>
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.bg, padding: 16, paddingBottom: 40 },

    pageHeader: { marginBottom: 16 },
    pageTitle: { color: theme.text, fontSize: 20, fontWeight: '800' },
    pageSub: { color: theme.textMuted, fontSize: 13, marginTop: 2 },

    composeCard: {
      backgroundColor: theme.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 20,
    },
    composeInput: {
      color: theme.text,
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
      borderTopColor: theme.border,
    },
    charCount: { color: theme.textMuted, fontSize: 12 },
    charCountWarn: { color: theme.amber },
    sendBtn: {
      backgroundColor: theme.accent,
      borderRadius: 8,
      paddingHorizontal: 18,
      paddingVertical: 8,
      minWidth: 90,
      alignItems: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
    sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    errorCard: {
      backgroundColor: theme.dangerLight,
      borderColor: '#fca5a5',
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
      padding: 14,
    },
    errorCardText: { color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },

    emptyCard: {
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 32,
      gap: 8,
    },
    emptyIcon: { fontSize: 32 },
    emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: theme.textMuted, fontSize: 13, textAlign: 'center' },

    historyLabel: { color: theme.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },

    msgCard: { marginBottom: 16 },
    msgBubble: {
      backgroundColor: theme.bgHero,
      borderRadius: 12,
      borderBottomRightRadius: 2,
      padding: 12,
      alignSelf: 'flex-end',
      maxWidth: '90%',
    },
    msgText: { color: '#ffffff', fontSize: 15, lineHeight: 20 },
    msgTime: { color: '#3fb950', fontSize: 11, marginTop: 4, textAlign: 'right' },

    replyBubble: {
      backgroundColor: theme.bgCard,
      borderRadius: 12,
      borderBottomLeftRadius: 2,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginTop: 6,
      maxWidth: '90%',
      alignSelf: 'flex-start',
    },
    replyLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
    replyText: { color: theme.text, fontSize: 15, lineHeight: 20 },
    replyTime: { color: theme.textMuted, fontSize: 11, marginTop: 4 },

    pendingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
    pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.amber },
    pendingText: { color: theme.textMuted, fontSize: 12 },
  });
}
