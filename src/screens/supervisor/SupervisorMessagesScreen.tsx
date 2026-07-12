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

import {
  getSiteWorkerMessages,
  markWorkerMessageRead,
  parseApiError,
  replyToWorkerMessage,
} from '../../services/api';
import type { WorkerMessage } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { formatAgo } from '../../utils/time';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorMessagesScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [messages, setMessages] = useState<WorkerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<number | null>(null);

  async function load() {
    try {
      const data = await getSiteWorkerMessages();
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

  async function toggleExpand(msg: WorkerMessage) {
    if (expandedId === msg.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(msg.id);
    if (!msg.readAt) {
      try {
        const updated = await markWorkerMessageRead(msg.id);
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, readAt: updated.readAt } : m)));
      } catch { /* best effort */ }
    }
  }

  async function handleReply(msg: WorkerMessage) {
    const text = (replyText[msg.id] ?? '').trim();
    if (!text) return;
    setSending(msg.id);
    try {
      const updated = await replyToWorkerMessage(msg.id, text);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)));
      setReplyText((prev) => ({ ...prev, [msg.id]: '' }));
    } catch (e) {
      Alert.alert('Failed to send reply', parseApiError(e));
    } finally {
      setSending(null);
    }
  }

  const unreadCount = messages.filter((m) => !m.readAt).length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle}>Worker Messages</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>
          <Text style={styles.pageSub}>Tap a message to read and reply · Pull to refresh</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>Workers on your site can send you messages here</Text>
          </View>
        ) : (
          messages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            const isUnread = !msg.readAt;
            const isSending = sending === msg.id;
            const charCount = (replyText[msg.id] ?? '').length;

            return (
              <View key={msg.id} style={[styles.msgCard, isUnread && styles.msgCardUnread]}>
                <Pressable onPress={() => toggleExpand(msg)} style={styles.msgHeader}>
                  <View style={styles.msgAvatarWrap}>
                    <Text style={styles.msgAvatar}>
                      {msg.senderName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.msgMeta}>
                    <View style={styles.msgMetaTop}>
                      <Text style={styles.msgSender}>{msg.senderName}</Text>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.msgPreview} numberOfLines={isExpanded ? undefined : 2}>
                      {msg.content}
                    </Text>
                    <Text style={styles.msgTime}>{formatAgo(msg.createdAt)}</Text>
                  </View>
                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </Pressable>

                {isExpanded && (
                  <View style={styles.msgBody}>
                    <View style={styles.divider} />

                    {msg.reply ? (
                      <View style={styles.repliedSection}>
                        <Text style={styles.repliedLabel}>Your reply</Text>
                        <Text style={styles.repliedText}>{msg.reply}</Text>
                        {msg.repliedAt && (
                          <Text style={styles.repliedTime}>{formatAgo(msg.repliedAt)}</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.replySection}>
                        <Text style={styles.replyLabel}>Reply to {msg.senderName.split(' ')[0]}</Text>
                        <TextInput
                          style={styles.replyInput}
                          placeholder="Type your reply…"
                          placeholderTextColor={theme.textMuted}
                          value={replyText[msg.id] ?? ''}
                          onChangeText={(t) => setReplyText((prev) => ({ ...prev, [msg.id]: t }))}
                          multiline
                          maxLength={500}
                        />
                        <View style={styles.replyFooter}>
                          <Text style={[styles.charCount, charCount > 450 && styles.charCountWarn]}>
                            {charCount}/500
                          </Text>
                          <Pressable
                            style={[styles.replyBtn, (!(replyText[msg.id] ?? '').trim() || isSending) && styles.replyBtnDisabled]}
                            onPress={() => handleReply(msg)}
                            disabled={!(replyText[msg.id] ?? '').trim() || isSending}
                          >
                            {isSending
                              ? <ActivityIndicator size="small" color="#fff" />
                              : <Text style={styles.replyBtnText}>Send Reply →</Text>
                            }
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },

    pageHeader: { marginBottom: 16 },
    pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageTitle: { color: theme.text, fontSize: 20, fontWeight: '800' },
    pageSub: { color: theme.textSub, fontSize: 13, marginTop: 2 },
    unreadBadge: { backgroundColor: theme.accentLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    unreadBadgeText: { color: theme.accent, fontSize: 12, fontWeight: '700' },

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
    emptySub: { color: theme.textSub, fontSize: 13, textAlign: 'center' },

    msgCard: {
      backgroundColor: theme.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
      overflow: 'hidden',
    },
    msgCardUnread: { borderColor: theme.accent },

    msgHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      gap: 10,
    },
    msgAvatarWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    msgAvatar: { color: theme.accent, fontSize: 16, fontWeight: '800' },
    msgMeta: { flex: 1 },
    msgMetaTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    msgSender: { color: theme.text, fontSize: 15, fontWeight: '700' },
    unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.accent },
    msgPreview: { color: theme.textSub, fontSize: 14, lineHeight: 20 },
    msgTime: { color: theme.textSub, fontSize: 12, marginTop: 4 },
    chevron: { color: theme.textMuted, fontSize: 12, marginTop: 4 },

    msgBody: { paddingHorizontal: 12, paddingBottom: 12 },
    divider: { height: 1, backgroundColor: theme.bgInput, marginBottom: 12 },

    replySection: {},
    replyLabel: { color: theme.textSub, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
    replyInput: {
      backgroundColor: theme.bg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      fontSize: 14,
      padding: 10,
      minHeight: 70,
      textAlignVertical: 'top',
    },
    replyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    charCount: { color: theme.textSub, fontSize: 12 },
    charCountWarn: { color: theme.amber },
    replyBtn: {
      backgroundColor: theme.accent,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minWidth: 110,
      alignItems: 'center',
    },
    replyBtnDisabled: { opacity: 0.4 },
    replyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    repliedSection: {
      backgroundColor: theme.bg,
      borderRadius: 8,
      padding: 10,
      borderLeftWidth: 3,
      borderLeftColor: theme.accent,
    },
    repliedLabel: { color: theme.accent, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    repliedText: { color: theme.textSub, fontSize: 14, lineHeight: 20 },
    repliedTime: { color: theme.textSub, fontSize: 11, marginTop: 4 },
  });
}
