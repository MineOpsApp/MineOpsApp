import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  getCommunityEvents,
  createCommunityEvent,
  parseApiError,
  type CommunityEvent,
} from '../../services/api';
import { useTheme, spacing, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

const EVENT_TYPES = ['General', 'Training', 'Safety Drill', 'Community Meeting', 'Trade Fair'];

export default function EventsScreen({ canCreate = false }: { canCreate?: boolean }) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const isDark = mode === 'dark';
  const styles = makeStyles(theme, isDark);

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('General');
  const [eventDate, setEventDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      setEvents(await getCommunityEvents());
    } catch (e: any) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!title.trim() || !eventDate.trim()) {
      Alert.alert('Missing fields', 'Title and event date are required (ISO format e.g. 2026-08-15T10:00:00).');
      return;
    }
    setSubmitting(true);
    try {
      const ev = await createCommunityEvent({ title: title.trim(), description: description.trim(), eventType, eventDate: eventDate.trim() });
      setEvents(prev => [ev, ...prev]);
      setModalVisible(false);
      setTitle(''); setDescription(''); setEventDate('');
    } catch (e: any) {
      Alert.alert('Error', parseApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      {canCreate && (
        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Create Event</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={events}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No upcoming events.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.eventType}</Text>
              </View>
            </View>
            <Text style={styles.dateText}>{formatDate(item.eventDate)}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <Text style={styles.byText}>by {item.createdByName}</Text>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Create Event</Text>
              <TextInput style={styles.input} placeholder="Title" placeholderTextColor={theme.textMuted} value={title} onChangeText={setTitle} />
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Description (optional)" placeholderTextColor={theme.textMuted} value={description} onChangeText={setDescription} multiline />
              <TextInput style={styles.input} placeholder="Event date (e.g. 2026-08-15T10:00:00)" placeholderTextColor={theme.textMuted} value={eventDate} onChangeText={setEventDate} />
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, eventType === t && styles.typeChipActive]}
                    onPress={() => setEventType(t)}
                  >
                    <Text style={[styles.typeChipText, eventType === t && styles.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.5 }]} onPress={submit} disabled={submitting}>
                <Text style={styles.submitBtnText}>{submitting ? 'Creating…' : 'Create'}</Text>
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
    createBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, margin: spacing.md, padding: spacing.md },
    createBtnText: { color: '#0f172a', fontWeight: '700' },
    error: { color: theme.danger, margin: spacing.md, textAlign: 'center' },
    empty: { color: theme.textMuted, marginTop: 40, textAlign: 'center' },
    card: { backgroundColor: theme.bgCard, borderRadius: 10, margin: spacing.sm, marginHorizontal: spacing.md, padding: 14, ...cardShadow },
    cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    cardTitle: { color: theme.text, flex: 1, fontSize: 15, fontWeight: '700' },
    typeBadge: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    dateText: { color: theme.accent, fontSize: 13, marginBottom: 4 },
    desc: { color: theme.textSub, fontSize: 13 },
    byText: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.xl, maxHeight: '85%' },
    modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
    input: { backgroundColor: theme.bg, borderRadius: 8, color: theme.text, marginBottom: 10, padding: spacing.md },
    label: { color: theme.textSub, fontSize: 13, marginBottom: 6 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    typeChip: { backgroundColor: theme.bgInput, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
    typeChipActive: { backgroundColor: theme.accent },
    typeChipText: { color: theme.textSub, fontSize: 12 },
    typeChipTextActive: { color: '#0f172a', fontWeight: '700' },
    modalActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, justifyContent: 'flex-end' },
    cancelText: { color: theme.textSub, fontWeight: '600' },
    submitBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: spacing.xl, paddingVertical: 10 },
    submitBtnText: { color: '#0f172a', fontWeight: '700' },
  });
}
