import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AuditLog } from '../types/actions';

type AuditLogFeedProps = {
  logs: AuditLog[];
  onRefresh: () => void;
  roleLabel: string;
};

const ACTION_COLORS: Record<string, string> = {
  HAZARD_SUBMITTED: '#b42318',
  HAZARD_REVIEWED:  '#a15c00',
  HAZARD_CLEARED:   '#1f7a4d',
  SOS_TRIGGERED:    '#b42318',
  DANGER_ZONE_CREATED: '#a15c00',
  NOTICE_POSTED:    '#1d5f99',
  NOTICE_SEEN:      '#334155',
  MESSAGE_SENT:     '#1d5f99',
  EQUIPMENT_STATUS_UPDATED: '#334155',
  EQUIPMENT_FAULT_REPORTED: '#b42318',
  MAINTENANCE_REQUESTED: '#a15c00',
  VISITOR_INDUCTION_COMPLETED: '#1f7a4d',
};

function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? '#5d6875';
}

function formatAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function AuditLogFeed({ logs, onRefresh, roleLabel }: AuditLogFeedProps) {
  return (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{roleLabel} - Audit Log</Text>
        <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No audit log entries yet.</Text>
          <Text style={styles.emptyHint}>Actions recorded across the site will appear here.</Text>
        </View>
      ) : (
        logs.map((log) => (
          <View key={log.id} style={styles.logCard}>
            <View style={styles.logTopRow}>
              <View
                style={[
                  styles.actionPill,
                  { backgroundColor: actionColor(log.action) + '18' },
                ]}
              >
                <Text style={[styles.actionText, { color: actionColor(log.action) }]}>
                  {formatAction(log.action)}
                </Text>
              </View>
              <Text style={styles.timestamp}>{formatTime(log.createdAt)}</Text>
            </View>

            <Text style={styles.actor}>
              {log.actorName} - <Text style={styles.actorRole}>{log.actorRole}</Text>
            </Text>

            <Text style={styles.details}>{log.details}</Text>

            <Text style={styles.target}>
              {log.targetType}
              {log.targetId != null ? ` #${log.targetId}` : ''}
            </Text>
          </View>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#17212b',
    fontSize: 20,
    fontWeight: '900',
  },
  refreshButton: {
    backgroundColor: '#edf1f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  refreshText: {
    color: '#1f6f5b',
    fontSize: 13,
    fontWeight: '900',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  emptyText: {
    color: '#17212b',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyHint: {
    color: '#5d6875',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3ea',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  logTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  actionPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  timestamp: {
    color: '#9aa5b1',
    fontSize: 12,
    fontWeight: '700',
  },
  actor: {
    color: '#17212b',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  actorRole: {
    color: '#5d6875',
    fontWeight: '600',
  },
  details: {
    color: '#17212b',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 4,
  },
  target: {
    color: '#9aa5b1',
    fontSize: 12,
    fontWeight: '700',
  },
});
