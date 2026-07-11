import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useTheme, type Theme } from '../theme/theme';
import { useThemeMode } from '../theme/ThemeContext';
import type { HazardReport } from '../types/actions';

type HazardCardProps = {
  canClear: boolean;
  canReview: boolean;
  hazard: HazardReport;
  onClear: (id: number) => void;
  onReview: (id: number) => void;
};

// Category color maps — intentional, stay fixed regardless of theme
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  OPEN:     { bg: '#fdeceb', text: '#b42318', label: 'Open' },
  REVIEWED: { bg: '#fff7e0', text: '#a15c00', label: 'Reviewed' },
  CLEARED:  { bg: '#e7f6ef', text: '#1f7a4d', label: 'Cleared' },
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  Low:      { bg: '#e7f6ef', text: '#1f7a4d' },
  Medium:   { bg: '#fff7e0', text: '#a15c00' },
  High:     { bg: '#fdeceb', text: '#b42318' },
  Critical: { bg: '#3b0000', text: '#ffffff' },
};

function statusStyle(status: string) {
  return STATUS_STYLES[status.toUpperCase()] ?? STATUS_STYLES['OPEN'];
}

function severityStyle(severity?: string) {
  return SEVERITY_STYLES[severity ?? 'Medium'] ?? SEVERITY_STYLES['Medium'];
}

function HazardPhoto({ photoData }: { photoData: string }) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)} style={{ marginTop: 8 }}>
      {expanded ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${photoData}` }}
          style={{ borderRadius: 8, height: 180, width: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ alignItems: 'center', backgroundColor: theme.bgInput, borderColor: theme.border, borderRadius: 8, borderWidth: 1, paddingVertical: 10 }}>
          <Text style={{ color: theme.textSub, fontSize: 13, fontWeight: '700' }}>📷 Tap to view photo</Text>
        </View>
      )}
    </Pressable>
  );
}

export function HazardCard({ canClear, canReview, hazard, onClear, onReview }: HazardCardProps) {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const badge = statusStyle(hazard.status);
  const sevStyle = severityStyle(hazard.severity);
  const isOpen = hazard.status.toUpperCase() === 'OPEN';
  const isReviewed = hazard.status.toUpperCase() === 'REVIEWED';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.meta}>
          <Text style={styles.id}>#{hazard.id}</Text>
          <Text style={styles.type}>{hazard.hazardType}</Text>
        </View>
        <View style={styles.badges}>
          {hazard.severity ? (
            <View style={[styles.badge, { backgroundColor: sevStyle.bg, marginRight: 6 }]}>
              <Text style={[styles.badgeText, { color: sevStyle.text }]}>{hazard.severity}</Text>
            </View>
          ) : null}
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.description}>{hazard.description}</Text>

      <Text style={styles.detail}>
        {hazard.site} - {hazard.location}
      </Text>

      <Text style={styles.detail}>
        Reported by {hazard.reportedByName} ({hazard.reportedByRole})
      </Text>

      {hazard.latitude && hazard.longitude ? (
        <Text style={styles.detail}>
          📍 {hazard.latitude.toFixed(5)}, {hazard.longitude.toFixed(5)}
        </Text>
      ) : null}

      {hazard.photoData ? (
        <HazardPhoto photoData={hazard.photoData} />
      ) : null}

      {hazard.actionTaken ? (
        <Text style={styles.action}>Action: {hazard.actionTaken}</Text>
      ) : null}

      {(canReview && isOpen) || (canClear && isReviewed) ? (
        <View style={styles.buttonRow}>
          {canReview && isOpen ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onReview(hazard.id)}
              style={[styles.button, styles.reviewButton]}
            >
              <Text style={styles.buttonText}>Mark Reviewed</Text>
            </Pressable>
          ) : null}
          {canClear && isReviewed ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onClear(hazard.id)}
              style={[styles.button, styles.clearButton]}
            >
              <Text style={styles.buttonText}>Clear Hazard</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 10,
      padding: 14,
    },
    topRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    meta: {
      flex: 1,
      paddingRight: 10,
    },
    id: {
      color: theme.textSub,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    type: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '900',
      marginTop: 2,
    },
    badges: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    badge: {
      borderRadius: 6,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '900',
    },
    description: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      marginBottom: 6,
    },
    detail: {
      color: theme.textSub,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
      marginBottom: 2,
    },
    action: {
      color: theme.accent,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 6,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    button: {
      alignItems: 'center',
      borderRadius: 8,
      flex: 1,
      justifyContent: 'center',
      minHeight: 38,
      paddingHorizontal: 10,
    },
    reviewButton: {
      backgroundColor: theme.accent,
    },
    clearButton: {
      backgroundColor: '#a15c00',
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '900',
    },
  });
}
