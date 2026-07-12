import { useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuditLogFeed } from '../../components/AuditLogFeed';
import { searchAuditLogs, exportAuditLogsCsv } from '../../services/api';
import type { AuditLog } from '../../types/actions';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorAuditScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [action, setAction] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = { action, actorEmail, from, to };

  function load() {
    return searchAuditLogs(params).then(setLogs).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function search() {
    setSearching(true);
    try { await load(); }
    finally { setSearching(false); }
  }

  function clear() {
    setAction('');
    setActorEmail('');
    setFrom('');
    setTo('');
    searchAuditLogs({}).then(setLogs).catch(() => {});
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportAuditLogsCsv(params);
      await Share.share({
        message: csv,
        title: 'MineOps Audit Log',
      });
    } catch {
      Alert.alert('Export failed', 'Could not export audit log. Try again.');
    } finally {
      setExporting(false);
    }
  }

  const hasFilters = action.trim() || actorEmail.trim() || from.trim() || to.trim();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.title}>Audit Log</Text>
      <Text style={styles.subtitle}>Tamper-proof activity trail · Pull to refresh</Text>

      {/* Filter card */}
      <View style={styles.filterCard}>
        <Text style={styles.filterHeading}>Search & Filter</Text>

        <Text style={styles.fieldLabel}>Action Type</Text>
        <TextInput
          autoCapitalize="characters"
          onChangeText={setAction}
          placeholder="e.g. HAZARD_SUBMITTED"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          value={action}
        />

        <Text style={styles.fieldLabel}>Actor Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setActorEmail}
          placeholder="user@example.com"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
          value={actorEmail}
        />

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>From</Text>
            <TextInput
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textMuted}
              style={styles.input}
              value={from}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>To</Text>
            <TextInput
              onChangeText={setTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textMuted}
              style={styles.input}
              value={to}
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={search}
            disabled={searching}
            style={[styles.searchBtn, searching && styles.btnDisabled]}
          >
            <Text style={styles.searchBtnText}>{searching ? 'Searching...' : 'Search'}</Text>
          </Pressable>

          {hasFilters ? (
            <Pressable onPress={clear} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleExport}
            disabled={exporting}
            style={[styles.exportBtn, exporting && styles.btnDisabled]}
          >
            <Text style={styles.exportBtnText}>{exporting ? 'Exporting...' : 'Export CSV'}</Text>
          </Pressable>
        </View>
      </View>

      {logs.length > 0 ? (
        <Text style={styles.resultCount}>{logs.length} record{logs.length !== 1 ? 's' : ''}</Text>
      ) : null}

      <AuditLogFeed logs={logs} onRefresh={load} roleLabel="Supervisor" />
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 2 },
    subtitle: { color: theme.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 16 },
    filterCard: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 14 },
    filterHeading: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 12 },
    fieldLabel: { color: theme.textSub, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
    input: { backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 13, marginBottom: 10, minHeight: 40, paddingHorizontal: 10 },
    dateRow: { flexDirection: 'row', gap: 10 },
    dateField: { flex: 1 },
    buttonRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
    searchBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 8, flex: 1, paddingVertical: 10 },
    searchBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
    clearBtn: { alignItems: 'center', backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
    clearBtnText: { color: theme.textSub, fontSize: 13, fontWeight: '800' },
    exportBtn: { alignItems: 'center', backgroundColor: theme.bgHero, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    exportBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
    btnDisabled: { opacity: 0.5 },
    resultCount: { color: theme.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  });
}
