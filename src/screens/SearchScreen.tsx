import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { search, type SearchResults } from '../services/api';
import type { AuthSession } from '../types/auth';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';

type Props = { session: AuthSession };

const EMPTY: SearchResults = { hazards: [], incidents: [], workers: [], listings: [], forumPosts: [] };

// Layout-only styles shared by sub-components (no colors)
const S = StyleSheet.create({
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '800' },
});

export function SearchScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

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
          placeholderTextColor={theme.textMuted}
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
          <ActivityIndicator color={theme.accent} />
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
              {key === 'hazards' && <HazardCard item={item} theme={theme} />}
              {key === 'incidents' && <IncidentCard item={item} theme={theme} />}
              {key === 'workers' && <WorkerCard item={item} theme={theme} />}
              {key === 'listings' && <ListingCard item={item} theme={theme} />}
              {key === 'forumPosts' && <PostCard item={item} theme={theme} />}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function HazardCard({ item, theme }: { item: any; theme: Theme }) {
  const severityColor: Record<string, string> = { Low: '#1f6f5b', Medium: '#a15c00', High: '#b42318', Critical: '#b42318' };
  return (
    <>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 2 }}>{item.hazardType}</Text>
      <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{item.location}</Text>
      <View style={S.cardTags}>
        <Tag label={item.severity} color={severityColor[item.severity] ?? theme.textMuted} />
        <Tag label={item.status} color={theme.textSub} />
      </View>
    </>
  );
}

function IncidentCard({ item, theme }: { item: any; theme: Theme }) {
  const severityColor: Record<string, string> = { Minor: '#1f6f5b', Serious: '#a15c00', Critical: '#b42318' };
  return (
    <>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 2 }}>{item.category}</Text>
      <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{item.zone} — {item.description?.slice(0, 80)}{item.description?.length > 80 ? '…' : ''}</Text>
      <View style={S.cardTags}>
        <Tag label={item.severity} color={severityColor[item.severity] ?? theme.textMuted} />
        <Tag label={item.status} color={theme.textSub} />
      </View>
    </>
  );
}

function WorkerCard({ item, theme }: { item: any; theme: Theme }) {
  return (
    <>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 2 }}>{item.fullName}</Text>
      <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{item.email}</Text>
      <View style={S.cardTags}>
        <Tag label={item.role} color={theme.info} />
      </View>
    </>
  );
}

function ListingCard({ item, theme }: { item: any; theme: Theme }) {
  return (
    <>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 2 }}>{item.mineralType}</Text>
      <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{item.location} · {item.site}</Text>
      <View style={S.cardTags}>
        <Tag label={`${Number(item.quantity).toLocaleString()} ${item.unit ?? ''}`} color={theme.accent} />
        {item.askingPrice != null && <Tag label={`GHS ${Number(item.askingPrice).toLocaleString()}`} color={theme.textSub} />}
      </View>
    </>
  );
}

function PostCard({ item, theme }: { item: any; theme: Theme }) {
  return (
    <>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 2 }}>{item.title}</Text>
      <Text style={{ color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>{item.body?.slice(0, 100)}{item.body?.length > 100 ? '…' : ''}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{item.authorName}</Text>
    </>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[S.tag, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[S.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 14 },
    inputRow: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingHorizontal: 12 },
    inputIcon: { fontSize: 16, marginRight: 8 },
    input: { color: theme.text, flex: 1, fontSize: 15, paddingVertical: 12 },
    clearBtn: { padding: 8 },
    clearText: { color: theme.textMuted, fontSize: 14, fontWeight: '700' },
    loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 12 },
    loadingText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    countLabel: { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
    emptyCard: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 36 },
    emptyIcon: { fontSize: 28, marginBottom: 8 },
    emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    emptySub: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
    section: { marginBottom: 12 },
    sectionHeader: { alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 6, padding: 12 },
    sectionIcon: { fontSize: 16, marginRight: 8 },
    sectionLabel: { color: theme.text, flex: 1, fontSize: 14, fontWeight: '900' },
    sectionCount: { color: theme.textMuted, fontSize: 12, fontWeight: '800', marginRight: 8 },
    chevron: { color: theme.textMuted, fontSize: 12 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 10, borderWidth: 1, marginBottom: 6, padding: 12 },
  });
}
