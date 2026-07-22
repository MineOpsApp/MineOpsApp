import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getScheduledBlasts } from '../services/api';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';

export function BlastAlert() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);
  const [blasts, setBlasts] = useState<any[]>([]);

  useEffect(() => {
    getScheduledBlasts().then(setBlasts).catch(() => {});
    const interval = setInterval(() => {
      getScheduledBlasts().then(setBlasts).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (blasts.length === 0) return null;

  return (
    <View>
      {blasts.map((blast) => {
        const diff = new Date(blast.blastTime).getTime() - Date.now();
        const mins = Math.floor(diff / 60000);
        const isImminent = mins < 15;

        return (
          <View key={blast.id} style={[styles.banner, isImminent ? styles.bannerRed : styles.bannerAmber]}>
            <MaterialCommunityIcons name="bomb" size={24} color={theme.text} />
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>
                {isImminent ? 'BLAST IMMINENT' : 'BLAST SCHEDULED'} — {blast.zone}
              </Text>
              <Text style={styles.bannerSub}>
                {mins < 0 ? 'Blast time passed' : `In ${mins < 60 ? `${mins} minutes` : `${Math.floor(mins / 60)}h ${mins % 60}m`}`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    banner: { alignItems: 'center', flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
    bannerRed: { backgroundColor: theme.dangerLight, borderColor: theme.danger },
    bannerAmber: { backgroundColor: theme.amberLight, borderColor: theme.amber },
    bannerBody: { flex: 1 },
    bannerTitle: { color: theme.text, fontSize: 13, fontWeight: '900', marginBottom: 2 },
    bannerSub: { color: theme.textSub, fontSize: 12, fontWeight: '600' },
  });
}
