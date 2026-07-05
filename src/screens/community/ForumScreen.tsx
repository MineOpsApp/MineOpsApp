import React, { useEffect, useState, useCallback } from 'react';
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

const SUBFORUMS = ['general', 'safety', 'market', 'jobs', 'regulatory'];

export default function ForumScreen() {
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#f59e0b" /></View>;
  }

  if (selectedPost) {
    return (
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
            <ActivityIndicator color="#f59e0b" />
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
            placeholderTextColor="#6b7280"
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
              placeholderTextColor="#6b7280"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Body"
              placeholderTextColor="#6b7280"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  subforumBar: { backgroundColor: '#1e293b', paddingVertical: 8, paddingHorizontal: 8, maxHeight: 56 },
  subforumChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#334155', marginRight: 8 },
  subforumChipActive: { backgroundColor: '#f59e0b' },
  subforumText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  subforumTextActive: { color: '#0f172a' },
  newPostBtn: { margin: 12, backgroundColor: '#f59e0b', borderRadius: 8, padding: 12, alignItems: 'center' },
  newPostBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  error: { color: '#ef4444', margin: 12, textAlign: 'center' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  postCard: { backgroundColor: '#1e293b', margin: 8, marginHorizontal: 12, borderRadius: 10, padding: 14 },
  postCardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  postCardMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  backBtn: { padding: 16, backgroundColor: '#1e293b' },
  backText: { color: '#f59e0b', fontWeight: '600' },
  postTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  postMeta: { color: '#94a3b8', fontSize: 13, marginBottom: 12 },
  postBody: { color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  repliesHeader: { color: '#f59e0b', fontWeight: '700', fontSize: 14, marginBottom: 10 },
  replyCard: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 8 },
  replyAuthor: { color: '#f8fafc', fontWeight: '600', fontSize: 13 },
  replyRole: { color: '#94a3b8', fontWeight: '400' },
  replyBody: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  replyBox: { flexDirection: 'row', padding: 10, backgroundColor: '#1e293b', alignItems: 'flex-end', gap: 8 },
  replyInput: { flex: 1, backgroundColor: '#0f172a', borderRadius: 8, padding: 10, color: '#f8fafc', maxHeight: 100 },
  sendBtn: { backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#0f172a', fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalInput: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, color: '#f8fafc', marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 8 },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  submitBtn: { backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  submitBtnText: { color: '#0f172a', fontWeight: '700' },
});
