// frontend/src/services/offlineRegistrationQueue.service.ts — Queue farmer registrations offline and auto-submit on reconnect
import api from "@/utils/axios";
import { logger } from "@/utils/logger";

type RegistrationPayload = Record<string, unknown>;

interface QueuedRegistration {
  queue_id: string;
  payload: RegistrationPayload;
  queued_at: string;
  attempts: number;
}

interface SyncQueueResponse {
  job_id: string;
  status: string;
}

const COMPONENT = "offlineRegistrationQueue";
const STORAGE_KEY = "offline_registration_queue_v1";

let syncStarted = false;

function readQueue(): QueuedRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRegistration[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage quota issues; queue remains best-effort.
  }
}

function nextQueueId() {
  return `QREG-${Date.now().toString(36).toUpperCase()}`;
}

export const offlineRegistrationQueueService = {
  enqueue(payload: RegistrationPayload): string {
    const queue = readQueue();
    const queueId = nextQueueId();
    queue.push({
      queue_id: queueId,
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
    });
    writeQueue(queue);
    logger.info(COMPONENT, "Queued offline registration", { queueId, queueSize: queue.length });
    return queueId;
  },

  getQueueSize(): number {
    return readQueue().length;
  },

  async flushQueue(): Promise<{ submitted: number; remaining: number }> {
    if (!navigator.onLine) {
      return { submitted: 0, remaining: readQueue().length };
    }

    const queue = readQueue();
    if (queue.length === 0) return { submitted: 0, remaining: 0 };

    let submitted = 0;
    const remaining: QueuedRegistration[] = [];

    for (const item of queue) {
      try {
        const personalInfo = (item.payload.personal_info as Record<string, unknown> | undefined) ?? {};
        const address = (item.payload.address as Record<string, unknown> | undefined) ?? {};
        const farmInfo = (item.payload.farm_info as Record<string, unknown> | undefined) ?? {};
        const householdInfo = (item.payload.household_info as Record<string, unknown> | undefined) ?? {};
        const nrc = typeof personalInfo.nrc === "string" ? personalInfo.nrc : undefined;

        await api.post<SyncQueueResponse>("/sync", {
          farmers: [
            {
              temp_id: item.queue_id,
              nrc_number: nrc,
              personal_info: personalInfo,
              address,
              farm_info: farmInfo,
              household_info: householdInfo,
              client_updated_at: item.queued_at,
            },
          ],
          last_sync: new Date().toISOString(),
        });
        submitted += 1;
        logger.info(COMPONENT, "Queued registration submitted to sync endpoint", { queueId: item.queue_id });
      } catch (error) {
        remaining.push({ ...item, attempts: item.attempts + 1 });
        logger.warn(COMPONENT, "Flush failed; keeping in queue", {
          queueId: item.queue_id,
          attempts: item.attempts + 1,
          error: (error as Error)?.message,
        });
      }
    }

    writeQueue(remaining);
    return { submitted, remaining: remaining.length };
  },

  startSync() {
    if (syncStarted) return;
    syncStarted = true;

    const flush = async () => {
      const result = await offlineRegistrationQueueService.flushQueue();
      if (result.submitted > 0) {
        logger.info(COMPONENT, "Queued registrations submitted after reconnect", result);
      }
    };

    window.addEventListener("online", () => {
      void flush();
    });

    if (navigator.onLine) {
      void flush();
    }
  },
};
