import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { checkInLoneWorker, getLoneWorkerStatus, parseApiError, startLoneWorker, stopLoneWorker, type LoneWorkerStatus } from '../../services/api';
import { useTheme, type Theme } from '../../theme/theme';
import { useThemeMode } from '../../theme/ThemeContext';

const INTERVALS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

function msUntil(isoDeadline: string): number {
  return new Date(isoDeadline).getTime() - Date.now();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'OVERDUE';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkerLoneWorkerScreen() {
  const { mode } = useThemeMode();
  const theme = useTheme(mode);
  const styles = makeStyles(theme);

  const [status, setStatus] = useState<LoneWorkerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(60);
  const [countdown, setCountdown] = useState('');
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await getLoneWorkerStatus();
      setStatus(s);
    } catch {
      setError('Cannot reach server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (status?.active && status.deadline) {
      const tick = () => setCountdown(formatCountdown(msUntil(status.deadline!)));
      tick();
      timerRef.current = setInterval(tick, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  async function handleStart() {
    setBusy(true);
    setError('');
    try {
      const s = await startLoneWorker(selectedInterval);
      setStatus(s);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    setBusy(true);
    setError('');
    try {
      const s = await checkInLoneWorker();
      setStatus(s);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    setError('');
    try {
      await stopLoneWorker();
      setStatus({ active: false });
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const isOverdue = status?.active && status.deadline
    ? msUntil(status.deadline) <= 0 : false;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lone Worker</Text>
        <Text style={styles.headerSub}>Check in regularly so supervisors know you're safe</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {status?.active ? (
        <View style={styles.activeContainer}>
          <View style={[styles.countdownRing, isOverdue && styles.countdownRingRed]}>
            <Text style={[styles.countdownValue, isOverdue && { color: theme.danger }]}>
              {countdown}
            </Text>
            <Text style={styles.countdownLabel}>
              {isOverdue ? 'SUPERVISORS ALERTED' : 'until next check-in'}
            </Text>
          </View>

          {isOverdue && (
            <View style={styles.overdueWarning}>
              <Text style={styles.overdueText}>
                ⚠ You are overdue — your supervisor has been notified. Tap "I'm OK" immediately.
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.checkInBtn, busy && styles.btnDisabled, isOverdue && styles.checkInBtnRed]}
            onPress={handleCheckIn}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.checkInBtnText}>I'm OK ✓</Text>
            }
          </Pressable>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Check-in interval</Text>
              <Text style={styles.infoValue}>{status.intervalMinutes} min</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Session started</Text>
              <Text style={styles.infoValue}>
                {status.startedAt
                  ? new Date(status.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.stopBtn, busy && styles.btnDisabled]}
            onPress={handleStop}
            disabled={busy}
          >
            <Text style={styles.stopBtnText}>End Lone Worker Mode</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.inactiveContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxIcon}>🛡</Text>
            <Text style={styles.infoBoxTitle}>Lone Worker Protection</Text>
            <Text style={styles.infoBoxBody}>
              Working underground or in an isolated area? Enable this mode and check in at regular intervals.
              If you miss a check-in, your supervisor is automatically alerted. No GPS required.
            </Text>
          </View>

          <Text style={styles.intervalTitle}>Check-in interval</Text>
          <View style={styles.intervalRow}>
            {INTERVALS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.intervalBtn, selectedInterval === opt.value && styles.intervalBtnActive]}
                onPress={() => setSelectedInterval(opt.value)}
              >
                <Text style={[styles.intervalBtnText, selectedInterval === opt.value && styles.intervalBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.startBtn, busy && styles.btnDisabled]}
            onPress={handleStart}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.startBtnText}>Enable Lone Worker Mode</Text>
            }
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: { backgroundColor: theme.bgHero, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
    headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500', marginTop: 4 },

    errorBanner: { backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 8, borderWidth: 1, margin: 16, padding: 12 },
    errorText: { color: theme.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },

    activeContainer: { alignItems: 'center', flex: 1, padding: 24 },

    countdownRing: {
      alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.accent,
      borderRadius: 120, borderWidth: 4, height: 220, justifyContent: 'center',
      marginVertical: 20, width: 220,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
      elevation: 4,
    },
    countdownRingRed: { borderColor: theme.danger },
    countdownValue: { color: theme.accent, fontSize: 42, fontWeight: '900', letterSpacing: -1 },
    countdownLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },

    overdueWarning: {
      backgroundColor: theme.dangerLight, borderColor: '#fca5a5', borderRadius: 10,
      borderWidth: 1, marginBottom: 16, padding: 12, width: '100%',
    },
    overdueText: { color: theme.danger, fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'center' },

    checkInBtn: {
      alignItems: 'center', backgroundColor: theme.accent, borderRadius: 16,
      height: 56, justifyContent: 'center', width: '100%',
    },
    checkInBtnRed: { backgroundColor: theme.danger },
    checkInBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },

    infoCard: {
      backgroundColor: theme.bgCard, borderColor: theme.border, borderRadius: 12,
      borderWidth: 1, marginTop: 20, width: '100%',
    },
    infoRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
    infoDivider: { backgroundColor: theme.bg, height: 1, marginHorizontal: 14 },
    infoLabel: { color: theme.textSub, fontSize: 13, fontWeight: '600' },
    infoValue: { color: theme.text, fontSize: 14, fontWeight: '800' },

    stopBtn: {
      alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border,
      borderRadius: 12, borderWidth: 1, height: 48, justifyContent: 'center',
      marginTop: 12, width: '100%',
    },
    stopBtnText: { color: theme.danger, fontSize: 14, fontWeight: '700' },

    btnDisabled: { opacity: 0.5 },

    inactiveContainer: { flex: 1, padding: 20 },

    infoBox: {
      alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border,
      borderRadius: 16, borderWidth: 1, marginBottom: 24, padding: 24,
    },
    infoBoxIcon: { fontSize: 40, marginBottom: 12 },
    infoBoxTitle: { color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 10 },
    infoBoxBody: { color: theme.textSub, fontSize: 13, fontWeight: '500', lineHeight: 20, textAlign: 'center' },

    intervalTitle: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
    intervalRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    intervalBtn: {
      alignItems: 'center', backgroundColor: theme.bgCard, borderColor: theme.border,
      borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 14,
    },
    intervalBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    intervalBtnText: { color: theme.textSub, fontSize: 14, fontWeight: '700' },
    intervalBtnTextActive: { color: '#fff' },

    startBtn: {
      alignItems: 'center', backgroundColor: theme.accent, borderRadius: 14,
      height: 56, justifyContent: 'center',
    },
    startBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  });
}
