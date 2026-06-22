import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HazardReport } from '../types/actions';

type HazardCardProps = {
  canClear: boolean;
  canReview: boolean;
  hazard: HazardReport;
  onClear: (id: number) => void;
  onReview: (id: number) => void;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  OPEN:     { bg: '#fdeceb', text: '#b42318', label: 'Open' },
  REVIEWED: { bg: '#fff7e0', text: '#a15c00', label: 'Reviewed' },
  CLEARED:  { bg: '#e7f6ef', text: '#1f7a4d', label: 'Cleared' },
};

function statusStyle(status: string) {
  return STATUS_STYLES[status.toUpperCase()] ?? STATUS_STYLES['OPEN'];
}

export function HazardCard({ canClear, canReview, hazard, onClear, onReview }: HazardCardProps) {
  const badge = statusStyle(hazard.status);
  const isOpen = hazard.status.toUpperCase() === 'OPEN';
  const isReviewed = hazard.status.toUpperCase() === 'REVIEWED';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.meta}>
          <Text style={styles.id}>#{hazard.id}</Text>
          <Text style={styles.type}>{hazard.hazardType}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={styles.description}>{hazard.description}</Text>

      <Text style={styles.detail}>
        {hazard.site} - {hazard.location}
      </Text>

      <Text style={styles.detail}>
        Reported by {hazard.reportedByName} ({hazard.reportedByRole})
      </Text>

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
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
    color: '#5d6875',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  type: {
    color: '#17212b',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
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
    color: '#17212b',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  detail: {
    color: '#5d6875',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 2,
  },
  action: {
    color: '#1f6f5b',
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
    backgroundColor: '#1f6f5b',
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
