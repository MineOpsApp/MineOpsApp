import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { AuditLogFeed } from '../../components/AuditLogFeed';
import { getAuditLogs } from '../../services/api';
import type { AuditLog } from '../../types/actions';
import type { AuthSession } from '../../types/auth';

type Props = { session: AuthSession };

export function SupervisorAuditScreen({ session: _ }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    return getAuditLogs().then(setLogs).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <AuditLogFeed logs={logs} onRefresh={load} roleLabel="Supervisor" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: '#f4f6f8' },
});