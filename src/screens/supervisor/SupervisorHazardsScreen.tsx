import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HazardCard } from '../../components/HazardCard';
import { InputField } from '../../components/InputField';
import { getHazardReports, reviewHazardReport, closeHazardReport } from '../../services/api';
import type { HazardReport } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorHazardsScreen({ session }: Props) {
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [actionTaken, setActionTaken] = useState('Area isolated and assigned for follow-up');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHazardReports().then((h) => { setHazards(h); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function review(id: number) {
    try {
      const updated = await reviewHazardReport(id, { actionTaken: actionTaken.trim() || 'Hazard reviewed', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch { Alert.alert('Failed', 'Could not review the hazard.'); }
  }

  async function close(id: number) {
    try {
      const updated = await closeHazardReport(id, { actionTaken: actionTaken.trim() || 'Hazard cleared', actorEmail: session.user.email, actorName: session.user.fullName, actorRole: session.user.role });
      setHazards((c) => c.map((h) => h.id === updated.id ? updated : h));
    } catch { Alert.alert('Failed', 'Could not close the hazard.'); }
  }

  const open = hazards.filter((h) => h.status.toUpperCase() === 'OPEN');
  const reviewed = hazards.filter((h) => h.status.toUpperCase() === 'REVIEWED');
  const cleared = hazards.filter((h) => h.status.toUpperCase() === 'CLEARED');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Hazard Reports</Text>
        {open.length > 0 && <View style={styles.urgentBadge}><Text style={styles.urgentBadgeText}>{open.length} open</Text></View>}
      </View>

      {/* Stats strip */}
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, open.length > 0 && { color: '#b42318' }]}>{open.length}</Text>
          <Text style={styles.stripLabel}>Open</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#a15c00' }]}>{reviewed.length}</Text>
          <Text style={styles.stripLabel}>Reviewed</Text>
        </View>
        <View style={styles.stripDivider} />
        <View style={styles.stripItem}>
          <Text style={[styles.stripValue, { color: '#1f6f5b' }]}>{cleared.length}</Text>
          <Text style={styles.stripLabel}>Cleared</Text>
        </View>
      </View>

      {/* Action input */}
      <View style={styles.actionCard}>
        <Text style={styles.actionLabel}>Action taken (applied to reviewed/cleared reports)</Text>
        <InputField label="" multiline onChangeText={setActionTaken} value={actionTaken} placeholder="Describe the action taken..." />
      </View>

      {loading ? (
        <View style={styles.emptyCard}><Text style={styles.emptyText}>Loading reports...</Text></View>
      ) : hazards.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>No hazard reports</Text>
          <Text style={styles.emptySub}>All clear on site</Text>
        </View>
      ) : null}

      {hazards.map((h) => (
        <HazardCard key={h.id} hazard={h} canReview canClear onReview={review} onClear={close} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f0f2f5', padding: 20, paddingBottom: 40 },
  pageHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  pageTitle: { color: '#17212b', flex: 1, fontSize: 22, fontWeight: '900' },
  urgentBadge: { backgroundColor: '#b42318', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  urgentBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  strip: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 16, paddingVertical: 14 },
  stripItem: { alignItems: 'center', flex: 1 },
  stripValue: { color: '#17212b', fontSize: 20, fontWeight: '900' },
  stripLabel: { color: '#8fa3b8', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  stripDivider: { backgroundColor: '#e5e9ef', width: 1 },
  actionCard: { backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 14 },
  actionLabel: { color: '#5d6875', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  emptyCard: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#e5e9ef', borderRadius: 12, borderWidth: 1, padding: 32 },
  emptyIcon: { color: '#1f6f5b', fontSize: 28, marginBottom: 8 },
  emptyTitle: { color: '#17212b', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  emptySub: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#8fa3b8', fontSize: 13, fontWeight: '600' },
});