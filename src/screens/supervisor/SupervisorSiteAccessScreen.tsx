import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { getMySites, grantSiteAccess, revokeSiteAccess, type SiteAccess, parseApiError } from '../../services/api';
import type { AuthSession } from '../../types/auth';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

type Props = { session: AuthSession };

export function SupervisorSiteAccessScreen({ session: _ }: Props) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [sites, setSites] = useState<SiteAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantSite, setGrantSite] = useState('');
  const [granting, setGranting] = useState(false);

  async function load() {
    try {
      const data = await getMySites();
      setSites(data);
    } catch { /* best-effort */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleGrant() {
    if (!grantEmail.trim() || !grantSite.trim()) {
      Alert.alert('Required', 'Enter supervisor email and site name.');
      return;
    }
    setGranting(true);
    try {
      await grantSiteAccess(grantEmail.trim(), grantSite.trim());
      setGrantEmail('');
      setGrantSite('');
      await load();
      Alert.alert('Access granted', `${grantEmail.trim()} can now access ${grantSite.trim()}.`);
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(grant: SiteAccess) {
    if (grant.id == null) return;
    Alert.alert(
      'Revoke access',
      `Remove access to ${grant.site}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeSiteAccess(grant.id!);
              await load();
            } catch (e) {
              Alert.alert('Failed', parseApiError(e));
            }
          },
        },
      ]
    );
  }

  const grantedSites = sites.filter(s => !s.isHome);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Site Access</Text>

      <Text style={styles.sectionTitle}>My Accessible Sites</Text>
      {loading ? (
        <Text style={styles.meta}>Loading...</Text>
      ) : sites.length === 0 ? (
        <Text style={styles.meta}>No site data available.</Text>
      ) : (
        sites.map((s, i) => (
          <View key={i} style={[styles.card, s.isCurrent && styles.cardActive]}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.siteName}>{s.site}</Text>
                <View style={styles.tagRow}>
                  {s.isHome && <View style={styles.tag}><Text style={styles.tagText}>HOME</Text></View>}
                  {s.isCurrent && <View style={[styles.tag, styles.tagGreen]}><Text style={styles.tagText}>ACTIVE</Text></View>}
                  {!s.isHome && <Text style={styles.grantedBy}>Granted by {s.grantedByEmail}</Text>}
                </View>
              </View>
              {!s.isHome && (
                <Pressable onPress={() => handleRevoke(s)} style={styles.revokeBtn} hitSlop={8}>
                  <Text style={styles.revokeBtnText}>Revoke</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Grant Access to Another Supervisor</Text>
      <Text style={styles.label}>Supervisor Email</Text>
      <TextInput
        style={styles.input}
        value={grantEmail}
        onChangeText={setGrantEmail}
        placeholder="supervisor@example.com"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={styles.label}>Site Name</Text>
      <TextInput
        style={styles.input}
        value={grantSite}
        onChangeText={setGrantSite}
        placeholder="e.g. Tarkwa Mine"
        placeholderTextColor={theme.textMuted}
      />
      <ActionButton label={granting ? 'Granting...' : 'Grant Access'} onPress={handleGrant} />

      {grantedSites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Existing Grants on My Sites</Text>
          <Text style={styles.meta}>
            Supervisors granted access to your sites are shown here and can be revoked.
          </Text>
          {grantedSites.map(g => (
            <View key={g.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.siteName}>{g.site}</Text>
                  <Text style={styles.grantedBy}>Granted by {g.grantedByEmail}</Text>
                  {g.grantedAt && (
                    <Text style={styles.meta}>{new Date(g.grantedAt).toLocaleDateString()}</Text>
                  )}
                </View>
                <Pressable onPress={() => handleRevoke(g)} style={styles.revokeBtn} hitSlop={8}>
                  <Text style={styles.revokeBtnText}>Revoke</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: theme.bg },
    title: { color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 4 },
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 16 },
    label: { color: theme.textSub, fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 4 },
    meta: { color: theme.textSub, fontSize: 12, fontWeight: '600', marginBottom: 8 },
    input: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, color: theme.text, fontSize: 14, minHeight: 44, paddingHorizontal: 12, marginBottom: 10 },
    card: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 8, borderWidth: 1, marginBottom: 8, padding: 12 },
    cardActive: { borderColor: theme.accent, borderWidth: 2 },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    siteName: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 4 },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    tag: { backgroundColor: theme.bgHero, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    tagGreen: { backgroundColor: theme.accent },
    tagText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    grantedBy: { color: theme.textSub, fontSize: 11, fontWeight: '700' },
    revokeBtn: { backgroundColor: theme.dangerLight, borderColor: theme.danger, borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
    revokeBtnText: { color: theme.danger, fontSize: 12, fontWeight: '800' },
  });
}
