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
  getSiteWorkersForMessaging,
  markWorkerMessageRead,
  parseApiError,
  replyToWorkerMessage,
  sendMessageToWorker,
} from '../../services/api';
import type { WorkerMessage } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { formatAgo } from '../../utils/time';
import { Ionicons } from '@expo/vector-icons';

import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorMessagesScreen({ session }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [tab, setTab] = useState<'inbox' | 'compose'>('inbox');

  // Inbox state
  const [messages, setMessages] = useState<WorkerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<number | null>(null);

  // Compose tab state
  const [workers, setWorkers] = useState<{ email: string; fullName: string }[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<{ email: string; fullName: string } | null>(null);
  const [composeText, setComposeText] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [composeSent, setComposeSent] = useState(false);

  async function load() {
    try {
      const data = await getSiteWorkerMessages();
      setMessages(data);
    } catch { /* silent */ }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'compose' && workers.length === 0 && !workersLoading) {
      setWorkersLoading(true);
      getSiteWorkersForMessaging()
        .then(setWorkers)
        .catch(() => {})
        .finally(() => setWorkersLoading(false));
    }
  }, [tab]);

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
    if ((!msg.initiatedBy || msg.initiatedBy === 'WORKER') && !msg.readAt) {
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

  async function handleCompose() {
    if (!selectedWorker || !composeText.trim()) return;
    setComposeSending(true);
    try {
      await sendMessageToWorker(selectedWorker.email, composeText.trim());
      setComposeSent(true);
      setComposeText('');
      // Refresh inbox so the sent message appears
      load();
    } catch (e) {
      Alert.alert('Failed to send', parseApiError(e));
    } finally {
      setComposeSending(false);
    }
  }

  const unreadCount = messages.filter(
    (m) => (!m.initiatedBy || m.initiatedBy === 'WORKER') && !m.readAt
  ).length;

  const composeCharCount = composeText.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          tab === 'inbox'
            ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />
            : undefined
        }
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleRow}>
            <Text style={styles.pageTitle}>Worker Messages</Text>
            {unreadCount > 0 && tab === 'inbox' && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.tabRow}>
          <Pressable onPress={() => setTab('inbox')} style={[styles.tab, tab === 'inbox' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'inbox' && styles.tabTextActive]}>Inbox</Text>
          </Pressable>
          <Pressable onPress={() => setTab('compose')} style={[styles.tab, tab === 'compose' && styles.tabActive]}>
            <Text style={[styles.tabText, tab === 'compose' && styles.tabTextActive]}>Message a Worker</Text>
          </Pressable>
        </View>

        {tab === 'inbox' ? (
          loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />
          ) : messages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-outline" size={32} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Workers on your site can send you messages here</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isExpanded = expandedId === msg.id;
              const isStaffInitiated = msg.initiatedBy === 'STAFF';
              const isUnread = !isStaffInitiated && !msg.readAt;
              const isSending = sending === msg.id;
              const charCount = (replyText[msg.id] ?? '').length;
              const displayName = isStaffInitiated
                ? (msg.recipientName ?? 'Worker')
                : msg.senderName;

              return (
                <View key={msg.id} style={[styles.msgCard, isUnread && styles.msgCardUnread]}>
                  <Pressable onPress={() => toggleExpand(msg)} style={styles.msgHeader}>
                    <View style={[styles.msgAvatarWrap, isStaffInitiated && styles.msgAvatarWrapOutbound]}>
                      <Text style={[styles.msgAvatar, isStaffInitiated && styles.msgAvatarOutbound]}>
                        {displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.msgMeta}>
                      <View style={styles.msgMetaTop}>
                        <Text style={styles.msgSender}>
                          {isStaffInitiated ? `→ ${displayName}` : displayName}
                        </Text>
                        {isUnread && <View style={styles.unreadDot} />}
                        {isStaffInitiated && (
                          <View style={styles.sentBadge}>
                            <Text style={styles.sentBadgeText}>{msg.reply ? 'replied' : 'sent'}</Text>
                          </View>
                        )}
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

                      {isStaffInitiated ? (
                        msg.reply ? (
                          <View style={styles.repliedSection}>
                            <Text style={styles.repliedLabel}>
                              {(msg.recipientName ?? 'Worker').split(' ')[0]} replied
                            </Text>
                            <Text style={styles.repliedText}>{msg.reply}</Text>
                            {msg.repliedAt && (
                              <Text style={styles.repliedTime}>{formatAgo(msg.repliedAt)}</Text>
                            )}
                          </View>
                        ) : (
                          <View style={styles.awaitingSection}>
                            <View style={styles.awaitingDot} />
                            <Text style={styles.awaitingText}>
                              Awaiting {(msg.recipientName ?? 'worker').split(' ')[0]}'s reply
                            </Text>
                          </View>
                        )
                      ) : msg.reply ? (
                        <View style={styles.repliedSection}>
                          <Text style={styles.repliedLabel}>
                            {msg.repliedByEmail === session.user.email
                              ? 'Your reply'
                              : msg.repliedByName
                                ? `${msg.repliedByName} replied`
                                : 'Staff replied'}
                          </Text>
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
          )
        ) : (
          // Compose tab
          !selectedWorker ? (
            <>
              <Text style={styles.composeHint}>Select a worker to message</Text>
              {workersLoading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
              ) : workers.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="person-outline" size={32} color={theme.textMuted} />
                  <Text style={styles.emptyTitle}>No workers at your site</Text>
                  <Text style={styles.emptySub}>Approved workers will appear here</Text>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search workers…"
                    placeholderTextColor={theme.textMuted}
                    value={workerSearch}
                    onChangeText={setWorkerSearch}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                  {workers
                    .filter((w) => w.fullName.toLowerCase().includes(workerSearch.toLowerCase()))
                    .map((w) => (
                      <Pressable key={w.email} onPress={() => { setSelectedWorker(w); setComposeSent(false); setWorkerSearch(''); }} style={styles.workerRow}>
                        <View style={styles.workerAvatar}>
                          <Text style={styles.workerAvatarText}>{w.fullName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.workerName}>{w.fullName}</Text>
                        <Text style={styles.workerChevron}>›</Text>
                      </Pressable>
                    ))}
                  {workers.filter((w) => w.fullName.toLowerCase().includes(workerSearch.toLowerCase())).length === 0 && (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyTitle}>No results</Text>
                      <Text style={styles.emptySub}>No workers match "{workerSearch}"</Text>
                    </View>
                  )}
                </>
              )}
            </>
          ) : composeSent ? (
            <View style={styles.sentCard}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={styles.sentTitle}>Message Sent</Text>
              </View>
              <Text style={styles.sentSub}>Your message was delivered to {selectedWorker.fullName}.</Text>
              <Pressable onPress={() => { setComposeSent(false); setSelectedWorker(null); }} style={styles.anotherBtn}>
                <Text style={styles.anotherBtnText}>Send Another</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable onPress={() => setSelectedWorker(null)} style={styles.selectedWorkerRow}>
                <Text style={styles.selectedWorkerLabel}>To: {selectedWorker.fullName}</Text>
                <Text style={styles.changeWorker}>Change</Text>
              </Pressable>
              <View style={styles.composeCard}>
                <TextInput
                  style={styles.composeInput}
                  placeholder={`Message to ${selectedWorker.fullName.split(' ')[0]}…`}
                  placeholderTextColor={theme.textMuted}
                  value={composeText}
                  onChangeText={setComposeText}
                  multiline
                  maxLength={500}
                  autoFocus
                />
                <View style={styles.replyFooter}>
                  <Text style={[styles.charCount, composeCharCount > 450 && styles.charCountWarn]}>
                    {composeCharCount}/500
                  </Text>
                  <Pressable
                    style={[styles.replyBtn, (!composeText.trim() || composeSending) && styles.replyBtnDisabled]}
                    onPress={handleCompose}
                    disabled={!composeText.trim() || composeSending}
                  >
                    {composeSending
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.replyBtnText}>Send →</Text>
                    }
                  </Pressable>
                </View>
              </View>
            </>
          )
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: Theme, isDark: boolean) {
  const cardShadow = {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 4,
    elevation: 2,
  };
  return StyleSheet.create({
    container: { padding: spacing.lg, paddingBottom: 40 },

    pageHeader: { marginBottom: spacing.md },
    pageTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    pageTitle: { color: theme.text, fontSize: 20, fontWeight: '800' },
    unreadBadge: { backgroundColor: theme.accentLight, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    unreadBadgeText: { color: theme.accent, fontSize: 12, fontWeight: '700' },

    tabRow: {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      marginBottom: spacing.lg,
      padding: 4,
    },
    tab: { alignItems: 'center', borderRadius: 7, flex: 1, paddingVertical: spacing.sm },
    tabActive: { backgroundColor: theme.accent },
    tabText: { color: theme.textMuted, fontSize: 13, fontWeight: '700' },
    tabTextActive: { color: '#fff' },

    emptyCard: {
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: spacing.sm,
      padding: 32,
      ...cardShadow,
    },
    emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
    emptySub: { color: theme.textSub, fontSize: 13, textAlign: 'center' },

    msgCard: {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
      overflow: 'hidden',
      ...cardShadow,
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
    msgAvatarWrapOutbound: { backgroundColor: theme.bgInput },
    msgAvatar: { color: theme.accent, fontSize: 16, fontWeight: '800' },
    msgAvatarOutbound: { color: theme.textSub },
    msgMeta: { flex: 1 },
    msgMetaTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    msgSender: { color: theme.text, fontSize: 15, fontWeight: '700' },
    unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.accent },
    sentBadge: { backgroundColor: theme.bgInput, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    sentBadgeText: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
    msgPreview: { color: theme.textSub, fontSize: 14, lineHeight: 20 },
    msgTime: { color: theme.textSub, fontSize: 12, marginTop: 4 },
    chevron: { color: theme.textMuted, fontSize: 12, marginTop: 4 },

    msgBody: { paddingHorizontal: 12, paddingBottom: 12 },
    divider: { height: 1, backgroundColor: theme.bgInput, marginBottom: 12 },

    awaitingSection: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    awaitingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.amber },
    awaitingText: { color: theme.textMuted, fontSize: 13 },

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

    // Compose tab
    searchInput: {
      backgroundColor: theme.bgCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.text,
      fontSize: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    composeHint: { color: theme.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    workerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 8,
      gap: 12,
    },
    workerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    workerAvatarText: { color: theme.accent, fontSize: 15, fontWeight: '800' },
    workerName: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' },
    workerChevron: { color: theme.textMuted, fontSize: 18 },

    selectedWorkerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.accentLight,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
    },
    selectedWorkerLabel: { color: theme.accent, fontSize: 14, fontWeight: '700' },
    changeWorker: { color: theme.accent, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

    composeCard: {
      backgroundColor: theme.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
    },
    composeInput: {
      color: theme.text,
      fontSize: 15,
      minHeight: 100,
      textAlignVertical: 'top',
    },

    sentCard: {
      backgroundColor: theme.successLight,
      borderColor: theme.success,
      borderRadius: 12,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    sentTitle: { color: theme.success, fontSize: 18, fontWeight: '900' },
    sentSub: { color: theme.success, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    anotherBtn: {
      marginTop: 8,
      backgroundColor: theme.accent,
      borderRadius: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    anotherBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
}
