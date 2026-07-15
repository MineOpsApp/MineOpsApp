import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { getNotificationPreferences, updateNotificationPreferences, parseApiError } from '../../services/api';
import { openDndAccessSettings } from '../../utils/notifications';
import type { NotificationPreferences } from '../../services/api';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

const ALWAYS_ON: { icon: string; label: string; desc: string }[] = [
  { icon: '🆘', label: 'SOS Alerts', desc: 'Sent to supervisors and safety officers when a worker triggers an SOS. Cannot be muted.' },
  { icon: '🚨', label: 'Incident Alerts', desc: 'Serious and Critical incident reports. Cannot be muted.' },
  { icon: '💥', label: 'Blast Warnings', desc: 'Scheduled and cancelled blasts — clearing the area is safety-critical. Cannot be muted.' },
  { icon: '🚧', label: 'Danger Zone Alerts', desc: 'Active danger zones at your site. Cannot be muted.' },
];

export function NotificationPreferencesScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() => setPrefs({ notifyHazard: true, notifyNotice: true }))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(key: keyof NotificationPreferences) {
    if (!prefs || saving) return;
    const previous = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    try {
      await updateNotificationPreferences({ [key]: next[key] });
    } catch (e) {
      setPrefs(previous);
      Alert.alert('Failed', parseApiError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !prefs) {
    return <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Notifications</Text>
      <Text style={styles.pageSub}>Choose which push alerts you receive on this device</Text>

      <Text style={styles.sectionLabel}>YOUR PREFERENCES</Text>
      <View style={styles.list}>
        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.body}>
            <Text style={styles.label}>Hazard Alerts</Text>
            <Text style={styles.desc}>High and Critical hazard reports at your site</Text>
          </View>
          <Switch value={prefs.notifyHazard} onValueChange={() => toggle('notifyHazard')} trackColor={{ true: theme.accent }} disabled={saving} />
        </View>
        <View style={styles.row}>
          <View style={styles.body}>
            <Text style={styles.label}>Site Notices</Text>
            <Text style={styles.desc}>Announcements posted by your supervisor</Text>
          </View>
          <Switch value={prefs.notifyNotice} onValueChange={() => toggle('notifyNotice')} trackColor={{ true: theme.accent }} disabled={saving} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>ALWAYS ON</Text>
      <View style={styles.list}>
        {ALWAYS_ON.map((item, idx) => (
          <View key={item.label} style={[styles.row, idx < ALWAYS_ON.length - 1 && styles.rowBorder]}>
            <View style={styles.iconWrap}><Text style={styles.icon}>{item.icon}</Text></View>
            <View style={styles.body}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {Platform.OS === 'android' && (
        <>
          <Text style={styles.sectionLabel}>DO NOT DISTURB</Text>
          <View style={styles.list}>
            <View style={styles.row}>
              <View style={styles.body}>
                <Text style={styles.label}>Bypass Do Not Disturb</Text>
                <Text style={styles.desc}>
                  Let SOS and Danger Zone alerts sound even when your phone is on silent or Do Not Disturb. Requires a one-time permission from Android.
                </Text>
              </View>
            </View>
            <Pressable onPress={openDndAccessSettings} style={styles.dndBtn}>
              <Text style={styles.dndBtnText}>Open Do Not Disturb Settings</Text>
            </Pressable>
          </View>
        </>
      )}

      <Text style={styles.disclaimer}>
        Turning off a preference only affects push alerts on this device — you'll still see these updates in your in-app notification list.
      </Text>
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.bg, padding: 20, paddingBottom: 40 },
    pageTitle: { color: theme.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
    pageSub: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 20 },
    sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4, marginTop: 4 },
    list: { backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
    row: { alignItems: 'center', flexDirection: 'row', padding: 14 },
    rowBorder: { borderBottomColor: theme.bgInput, borderBottomWidth: 1 },
    iconWrap: { alignItems: 'center', backgroundColor: theme.bgInput, borderRadius: 10, height: 40, justifyContent: 'center', marginRight: 12, width: 40 },
    icon: { fontSize: 18 },
    body: { flex: 1 },
    label: { color: theme.text, fontSize: 14, fontWeight: '800' },
    desc: { color: theme.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    dndBtn: { alignItems: 'center', backgroundColor: theme.accent, borderRadius: 10, margin: 14, marginTop: 0, paddingVertical: 12 },
    dndBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    disclaimer: { color: theme.textMuted, fontSize: 11, fontWeight: '600', lineHeight: 16, textAlign: 'center' },
  });
}
