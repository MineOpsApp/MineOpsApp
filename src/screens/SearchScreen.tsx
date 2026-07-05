import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { search, type SearchResults } from '../services/api';
import type { AuthSession } from '../types/auth';

type Props = { session: AuthSession };

const EMPTY: SearchResults = { hazards: [], incidents: [], workers: [], listings: [], forumPosts: [] };

export function SearchScreen({ session: _ }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await search(q);
        setResults(data);
        setSearched(true);
      } catch {
        setResults(EMPTY);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function toggle(key: string) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  const totalResults =
    results.hazards.length + results.incidents.length + results.workers.length +
    results.listings.length + results.forumPosts.length;

  const sections: { key: string; label: string; icon: string; items: any[] }[] = [
    { key: 'hazards', label: 'Hazards', icon: '⚠', items: results.hazards },
    { key: 'incidents', label: 'Incidents', icon: '🚨', items: results.incidents },
    { key: 'workers', label: 'Workers', icon: '👷', items: results.workers },
    { key: 'listings', label: 'Mineral Listings', icon: '⛏', items: results.listings },
    { key: 'forumPosts', label: 'Forum Posts', icon: '💬', items: results.forumPosts },
  ].filter((s) => s.items.length > 0);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Search</Text>

      <View style={styles.inputRow}>
        <Text style={styles.inputIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search hazards, workers, listings…"
          placeholderTextColor="#8fa3b8"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#1f6f5b" />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      )}

      {!loading && searched && totalResults === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🔎</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySub}>Try different keywords</Text>
        </View>
      )}

      {!loading && searched && totalResults > 0 && (
        <Text style={styles.countLabel}>{totalResults} result{totalResults !== 1 ? 's' : ''}</Text>
      )}

      {sections.map(({ key, label, icon, items }) => (
        <View key={key} style={styles.section}>
          <Pressable style={styles.sectionHeader} onPress={() => toggle(key)}>
            <Text style={styles.sectionIcon}>{icon}</Text>
            <Text style={styles.sectionLabel}>{label}</Text>
            <Text style={styles.sectionCount}>{items.length}</Text>
            <Text style={styles.chevron}>{collapsed[key] ? '▶' : '▼'}</Text>
          </Pressable>

          {!collapsed[key] && items.map((item, idx) => (
            <View key={idx} style={styles.card}>
              {key === 'hazards' && <HazardCard item={item} />}
              {key === 'incidents' && <IncidentCard item={item} />}
              {key === 'workers' && <WorkerCard item={item} />}
              {key === 'listings' && <ListingCard item={item} />}
              {key === 'forumPosts' && <PostCard item={item} />}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function HazardCard({ item }: { item: any }) {
  const severityColor: Record<string, string> = { Low: '#1f6f5b', Medium: '#a15c00', High: '#b42318', Critical: '#b42318' };
  return (
    <>
      <Text style={styles.cardTitle}>{item.hazardType}</Text>
      <Text style={styles.cardSub}>{item.location}</Text>
      <View style={styles.cardTags}>
        <Tag label={item.severity} color={severityColor[item.severity] ?? '#8fa3b8'} />
        <Tag label={item.status} color="#5d6875" />
      </View>
    </>
  );
}

function IncidentCard({ item }: { item: any }) {
  const severityColor: Record<string, string> = { Minor: '#1f6f5b', Serious: '#a15c00', Critical: '#b42318' };
  return (
    <>
      <Text style={styles.cardTitle}>{item.category}</Text>
      <Text style={styles.cardSub}>{item.zone} — {item.description?.slice(0, 80)}{item.description?.length > 80 ? '…' : ''}</Text>
      <View style={styles.cardTags}>
        <Tag label={item.severity} color={severityColor[item.severity] ?? '#8fa3b8'} />
        <Tag label={item.status} color="#5d6875" />
      </View>
    </>
  );
}

function WorkerCard({ item }: { item: any }) {
  return (
    <>
      <Text style={styles.cardTitle}>{item.fullName}</Text>
      <Text style={styles.cardSub}>{item.email}</Text>
      <View style={styles.cardTags}>
        <Tag label={item.role} color="#1d5f99" />
      </View>
    </>
  );
}

function ListingCard({ item }: { item: any }) {
  return (
    <>
      <Text style={styles.cardTitle}>{item.mineralType}</Text>
      <Text style={styles.cardSub}>{item.location} · {item.site}</Text>
      <View style={styles.cardTags}>
        <Tag label={`${Number(item.quantity).toLocaleString()} ${item.unit ?? ''}`} color="#1f6f5b" />
        {item.askingPrice != null && <Tag label={`GHS ${Number(item.askingPrice).toLocaleString()}`} color="#5d6875" />}
      </View>
    </>
  );
}

function PostCard({ item }: { item: any }) {
  return (
    <>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSub}>{item.body?.slice(0, 100)}{item.body?.length > 100 ? '…' : ''}</Text>
      <Text style={styles.cardMeta}>{item.authorName}</Text>
    </>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f0f2f5' },
  title: { color: '#17212b', fontSize: 22, fontWeight: '900', marginBottom: 14 },
  inputRow: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingHorizontal: 12 },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { color: '#17212b', flex: 1, fontSize: 15, paddingVertical: 12 },
  clearBtn: { padding: 8 },
  clearText: { color: '#8fa3b8', fontSize: 14, fontWeight: '700' },
  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 12 },
  loadingText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  countLabel: { color: '#8fa3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 36 },
  emptyIcon: { fontSize: 28, marginBottom: 8 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 12 },
  sectionHeader: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 6, padding: 12 },
  sectionIcon: { fontSize: 16, marginRight: 8 },
  sectionLabel: { color: '#17212b', flex: 1, fontSize: 14, fontWeight: '900' },
  sectionCount: { color: '#8fa3b8', fontSize: 12, fontWeight: '800', marginRight: 8 },
  chevron: { color: '#8fa3b8', fontSize: 12 },
  card: { backgroundColor: '#fff', borderColor: '#e5e9ef', borderRadius: 10, borderWidth: 1, marginBottom: 6, padding: 12 },
  cardTitle: { color: '#17212b', fontSize: 14, fontWeight: '900', marginBottom: 2 },
  cardSub: { color: '#5d6875', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  cardMeta: { color: '#8fa3b8', fontSize: 11, fontWeight: '600', marginTop: 2 },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '800' },
});
