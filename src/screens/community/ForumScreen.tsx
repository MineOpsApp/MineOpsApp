import React, { useEffect, useState, useCallback } from 'react';
import { SwipeBackView } from '../../components/SwipeBackView';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  getForumPosts,
  createForumPost,
  getPostReplies,
  createReply,
  type ForumPost,
  type ForumReply,
} from '../../services/api';
import { parseApiError } from '../../services/api';
import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

const SUBFORUMS = ['general', 'safety', 'market', 'jobs', 'regulatory'];

export default function ForumScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [subforum, setSubforum] = useState('general');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const [newPostVisible, setNewPostVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await getForumPosts(subforum);
      setPosts(data);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subforum]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  async function openPost(post: ForumPost) {
    setSelectedPost(post);
    setReplyLoading(true);
    setReplies([]);
    try {
      const data = await getPostReplies(post.id);
      setReplies(data);
    } catch {}
    setReplyLoading(false);
  }

  async function submitReply() {
    if (!selectedPost || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const reply = await createReply(selectedPost.id, replyText.trim());
      setReplies(prev => [...prev, reply]);
      setReplyText('');
      setSelectedPost(prev => prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev);
    } catch (e: any) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSubmittingReply(false);
    }
  }

  async function submitPost() {
    if (!newTitle.trim() || !newBody.trim()) {
      Alert.alert('Missing fields', 'Title and body are required.');
      return;
    }
    setSubmitting(true);
    try {
      const post = await createForumPost({ title: newTitle.trim(), body: newBody.trim(), subforum });
      setPosts(prev => [post, ...prev]);
      setNewPostVisible(false);
      setNewTitle('');
      setNewBody('');
    } catch (e: any) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  if (selectedPost) {
    return (
      <SwipeBackView onBack={() => setSelectedPost(null)}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedPost(null)}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.postTitle}>{selectedPost.title}</Text>
          <Text style={styles.postMeta}>{selectedPost.authorName} · {selectedPost.subforum}</Text>
          <Text style={styles.postBody}>{selectedPost.body}</Text>
          <Text style={styles.repliesHeader}>{selectedPost.replyCount} Replies</Text>
          {replyLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            replies.map(r => (
              <View key={r.id} style={styles.replyCard}>
                <Text style={styles.replyAuthor}>{r.authorName} <Text style={styles.replyRole}>({r.authorRole})</Text></Text>
                <Text style={styles.replyBody}>{r.body}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.replyBox}>
          <TextInput
            style={styles.replyInput}
            placeholder="Write a reply..."
            placeholderTextColor={theme.textMuted}
            value={replyText}
            onChangeText={setReplyText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!replyText.trim() || submittingReply) && styles.sendBtnDisabled]}
            onPress={submitReply}
            disabled={!replyText.trim() || submittingReply}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </SwipeBackView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subforumBar}>
        {SUBFORUMS.map(sf => (
          <TouchableOpacity
            key={sf}
            style={[styles.subforumChip, subforum === sf && styles.subforumChipActive]}
            onPress={() => setSubforum(sf)}
          >
            <Text style={[styles.subforumText, subforum === sf && styles.subforumTextActive]}>
              {sf.charAt(0).toUpperCase() + sf.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.newPostBtn} onPress={() => setNewPostVisible(true)}>
        <Text style={styles.newPostBtnText}>+ New Post</Text>
      </TouchableOpacity>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={posts}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(true); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No posts yet. Be the first!</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.postCard} onPress={() => openPost(item)}>
            <Text style={styles.postCardTitle}>{item.title}</Text>
            <Text style={styles.postCardMeta}>{item.authorName} · {item.replyCount} replies</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={newPostVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Post</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Title"
              placeholderTextColor={theme.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Body"
              placeholderTextColor={theme.textMuted}
              value={newBody}
              onChangeText={setNewBody}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNewPostVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.sendBtnDisabled]}
                onPress={submitPost}
                disabled={submitting}
              >
                <Text style={styles.submitBtnText}>{submitting ? 'Posting…' : 'Post'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    container: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, alignItems: 'center', backgroundColor: theme.bg, justifyContent: 'center' },
    subforumBar: { backgroundColor: theme.bgCard, maxHeight: 56, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
    subforumChip: { backgroundColor: theme.bgInput, borderRadius: 16, marginRight: spacing.sm, paddingHorizontal: 14, paddingVertical: 6 },
    subforumChipActive: { backgroundColor: theme.accent },
    subforumText: { color: theme.textSub, fontSize: 13, fontWeight: '600' },
    subforumTextActive: { color: '#0f172a' },
    newPostBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, margin: spacing.md, padding: spacing.md },
    newPostBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
    error: { color: theme.danger, margin: spacing.md, textAlign: 'center' },
    empty: { color: theme.textMuted, marginTop: 40, textAlign: 'center' },
    postCard: { backgroundColor: theme.bgCard, borderRadius: 10, margin: spacing.sm, marginHorizontal: spacing.md, padding: 14, ...cardShadow },
    postCardTitle: { color: theme.text, fontSize: 15, fontWeight: '700' },
    postCardMeta: { color: theme.textSub, fontSize: 12, marginTop: 4 },
    backBtn: { backgroundColor: theme.bgCard, padding: spacing.lg },
    backText: { color: theme.accent, fontWeight: '600' },
    postTitle: { color: theme.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
    postMeta: { color: theme.textSub, fontSize: 13, marginBottom: spacing.md },
    postBody: { color: theme.textSub, fontSize: 15, lineHeight: 22, marginBottom: spacing.xl },
    repliesHeader: { color: theme.accent, fontSize: 14, fontWeight: '700', marginBottom: 10 },
    replyCard: { backgroundColor: theme.bgCard, borderRadius: 8, marginBottom: spacing.sm, padding: spacing.md, ...cardShadow },
    replyAuthor: { color: theme.text, fontSize: 13, fontWeight: '600' },
    replyRole: { color: theme.textSub, fontWeight: '400' },
    replyBody: { color: theme.textSub, fontSize: 14, marginTop: 4 },
    replyBox: { alignItems: 'flex-end', backgroundColor: theme.bgCard, flexDirection: 'row', gap: spacing.sm, padding: 10 },
    replyInput: { backgroundColor: theme.bg, borderRadius: 8, color: theme.text, flex: 1, maxHeight: 100, padding: 10 },
    sendBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { color: '#0f172a', fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.xl },
    modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
    modalInput: { backgroundColor: theme.bg, borderRadius: 8, color: theme.text, marginBottom: 10, padding: spacing.md },
    modalActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, justifyContent: 'flex-end', marginTop: spacing.sm },
    cancelText: { color: theme.textSub, fontWeight: '600' },
    submitBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: spacing.xl, paddingVertical: 10 },
    submitBtnText: { color: '#0f172a', fontWeight: '700' },
  });
}
