import AsyncStorage from '@react-native-async-storage/async-storage';
import { clockIn, clockOut, createHazardReport, createIncident, createSosAlert, signOffDrillStep, submitIllegalMineReport, submitShiftLog, submitSafetyChecklist } from '../services/api';

const QUEUE_KEY = 'mineops_offline_queue';

export type OfflineActionType = 'hazard' | 'sos' | 'clockIn' | 'clockOut' | 'shiftLog' | 'incident' | 'safetyChecklist' | 'drillSignOff' | 'illegalMineReport';

export type QueuedAction = {
  id: string;
  type: OfflineActionType;
  payload: Record<string, unknown>;
  queuedAt: string;
};

function genId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function enqueue(type: OfflineActionType, payload: Record<string, unknown>): Promise<string> {
  const id = genId(type);
  const action: QueuedAction = { id, type, payload, queuedAt: new Date().toISOString() };
  const queue = await getQueue();
  queue.push(action);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return id;
}

async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(a => a.id !== id)));
}

export async function drainQueue(): Promise<number> {
  const queue = await getQueue();
  let successCount = 0;
  for (const action of queue) {
    try {
      switch (action.type) {
        case 'hazard':
          await createHazardReport({ ...(action.payload as Parameters<typeof createHazardReport>[0]), clientRequestId: action.id });
          break;
        case 'sos':
          await createSosAlert({ ...(action.payload as Parameters<typeof createSosAlert>[0]), clientRequestId: action.id });
          break;
        case 'clockIn':
          await clockIn(action.payload.zone as string | undefined, action.payload.notes as string | undefined, action.id);
          break;
        case 'clockOut': {
          try {
            await clockOut();
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (!msg.includes('404')) throw e;
            // 404 "No active clock-in found" means already clocked out — treat as success
          }
          break;
        }
        case 'shiftLog':
          await submitShiftLog({ ...(action.payload as Parameters<typeof submitShiftLog>[0]), clientRequestId: action.id });
          break;
        case 'incident':
          await createIncident({ ...(action.payload as Parameters<typeof createIncident>[0]), clientRequestId: action.id });
          break;
        case 'safetyChecklist':
          await submitSafetyChecklist(action.payload as Parameters<typeof submitSafetyChecklist>[0]);
          break;
        case 'drillSignOff': {
          const p = action.payload as { drillId: number; step: string; notes?: string };
          await signOffDrillStep(p.drillId, { step: p.step, notes: p.notes });
          break;
        }
        case 'illegalMineReport':
          await submitIllegalMineReport({ ...(action.payload as Parameters<typeof submitIllegalMineReport>[0]), clientRequestId: action.id });
          break;
      }
      await removeFromQueue(action.id);
      successCount++;
    } catch {
      continue;
    }
  }
  return successCount;
}
