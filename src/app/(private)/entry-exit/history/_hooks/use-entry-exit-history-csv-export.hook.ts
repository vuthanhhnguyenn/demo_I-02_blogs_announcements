import { useEffect, useRef } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import { AdminAccessLogHistoryApi105 } from '@/lib/api-real';
import type { AccessLogExportRequestDto } from '@/lib/api-real/types.gen';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;
const STORAGE_KEY_PREFIX = 'entry-exit-history:csv-export:';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Storage can be unavailable (private window, blocked site data) — the export still works, it
// just cannot be resumed after a reload.
function readStoredExportId(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredExportId(key: string, exportId: string | null) {
  try {
    if (exportId === null) localStorage.removeItem(key);
    else localStorage.setItem(key, exportId);
  } catch {
    // Ignored — see readStoredExportId.
  }
}

function downloadFile(url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.click();
}

type PollResult =
  | { kind: 'completed'; exportId: string; downloadUrl: string }
  /** Still running when the client stopped waiting — the job keeps going on the server. */
  | { kind: 'running'; exportId: string }
  /** 404 / 410 (E-VIS-001 / E-VIS-002): the job is unknown or expired and cannot be resumed. */
  | { kind: 'gone' };

async function pollExport(exportId: string): Promise<PollResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    let job;
    try {
      ({ data: job } = await AdminAccessLogHistoryApi105.adminAccessLogControllerGetExport({
        path: { exportId },
        throwOnError: true,
      }));
    } catch (error) {
      const status = getApiErrorStatus(error);
      if (status === 404 || status === 410) return { kind: 'gone' };
      if (status !== undefined) throw error;
      // A transport error (no HTTP status) is retried against the same job, never re-queued.
    }
    if (job?.status === 'completed' && job.downloadUrl) {
      return { kind: 'completed', exportId, downloadUrl: job.downloadUrl };
    }
    if (job?.status === 'failed') throw new Error(job.errorCode ?? 'export failed');
    await wait(POLL_INTERVAL_MS);
  }
  return { kind: 'running', exportId };
}

// A mutation keeps running after the screen unmounts, so leaving and coming back while a job runs
// starts a second run on the same job. Module-level state keeps that to one poll loop per job and
// one handling of its result (download / toast), whichever run gets there first.
const pollsInFlight = new Map<string, Promise<PollResult>>();
const finishedExportIds = new Set<string>();

function pollExportOnce(exportId: string): Promise<PollResult> {
  let poll = pollsInFlight.get(exportId);
  if (!poll) {
    poll = pollExport(exportId).finally(() => pollsInFlight.delete(exportId));
    pollsInFlight.set(exportId, poll);
  }
  return poll;
}

/**
 * CSV export for the entry-exit history screen — async job (API-105 §5): queue the
 * export (202), poll the job until `completed`, then download from the presigned URL.
 *
 * The job ID is persisted per staff in localStorage as soon as it is queued, and dropped only
 * once the job is over (downloaded / failed / 404 / 410). Until then every click — and every
 * reload of the screen — polls that same job instead of queueing a duplicate (which would also
 * count against the 2-running-exports cap, E-VIS-006), even after a network error or timeout.
 *
 * Variables: the request body for a click, or `null` for the resume run fired on mount.
 */
export function useEntryExitHistoryCsvExport() {
  const staffId = useAuthUser().user?.staffId;
  const storageKey = staffId ? `${STORAGE_KEY_PREFIX}${staffId}` : null;

  const mutation = useMutation({
    mutationFn: async (body: AccessLogExportRequestDto | null): Promise<PollResult> => {
      const storedExportId = storageKey ? readStoredExportId(storageKey) : null;
      if (storedExportId) {
        // The stored job may have been queued with other conditions than the current filter.
        if (body !== null) {
          toast.info('前回依頼したCSV出力の処理状況を確認しています', {
            id: 'csv-export-checking',
          });
        }
        const result = await pollExportOnce(storedExportId);
        if (result.kind !== 'gone') return result;
        if (storageKey) writeStoredExportId(storageKey, null);
      }
      if (body === null) return { kind: 'gone' };

      const {
        data: { exportId },
      } = await AdminAccessLogHistoryApi105.adminAccessLogControllerCreateExport({
        body,
        throwOnError: true,
      });
      if (storageKey) writeStoredExportId(storageKey, exportId);
      return pollExportOnce(exportId);
    },
    onSuccess: (result, body) => {
      if (result.kind === 'gone') return;
      if (result.kind === 'running') {
        toast.warning('CSVの出力に時間がかかっています', {
          id: `csv-export-running:${result.exportId}`,
          description:
            '処理は続行中です。しばらくしてから再度「CSV出力」を押すとダウンロードできます。',
        });
        return;
      }
      if (finishedExportIds.has(result.exportId)) return;
      // One toast per job: the completion offer is replaced in place by the download confirmation.
      const toastId = `csv-export:${result.exportId}`;
      const finish = () => {
        if (finishedExportIds.has(result.exportId)) return;
        finishedExportIds.add(result.exportId);
        downloadFile(result.downloadUrl);
        if (storageKey) writeStoredExportId(storageKey, null);
        toast.success('CSVをダウンロードしました', { id: toastId, action: undefined });
      };
      // On the resume run there was no click, so the download waits for one; until then the job
      // stays stored and the「CSV出力」button downloads it as well.
      if (body === null) {
        toast.success('前回依頼したCSVの出力が完了しました', {
          id: toastId,
          action: { label: 'ダウンロード', onClick: finish },
        });
        return;
      }
      finish();
    },
    onError: (error) => {
      // `failed` job, or a 4xx/5xx other than 404/410 — the job cannot be resumed either way.
      if (storageKey) writeStoredExportId(storageKey, null);
      // Toasted here instead of by the global MutationCache handler: two runs sharing one failed
      // poll would otherwise show the error twice.
      toast.error(resolveApiErrorMessage(error), { id: 'csv-export-error' });
    },
    meta: { suppressErrorToast: true },
  });

  // Resume a job left over from before a reload / navigation, once the staff is known.
  const { mutate } = mutation;
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!storageKey || resumedRef.current) return;
    // Deferred so StrictMode's mount → unmount → remount has re-subscribed the mutation
    // observer first; a mutate() from the first mount leaves `isPending` stuck at true.
    const timer = setTimeout(() => {
      resumedRef.current = true;
      if (readStoredExportId(storageKey)) mutate(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey, mutate]);

  return mutation;
}
