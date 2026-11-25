import type { AccountingExportListItemDto } from '@/lib/api-real/types.gen';

/**
 * Shared by the API-119 CSV exports (FR-008 accounting CSV, FR-010 refund CSV): both are async —
 * create (202) → poll §9 `?exportIds=` → fetch the signed `csvUrl` (§10) → download. The export
 * worker (BAT-010) runs hourly, so a request not ready within the poll is kept in the browser and
 * offered for download later.
 */
export const EXPORT_POLL_INTERVAL_MS = 2000;
export const EXPORT_POLL_MAX_ATTEMPTS = 15;
/** Kept requests are re-read this often while they are on screen and one is still running */
export const EXPORT_PENDING_REFETCH_MS = 30_000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isExportRunning(row: Pick<AccountingExportListItemDto, 'status'>): boolean {
  return row.status === 'pending' || row.status === 'running';
}

/** Thrown for a failed / expired export so the shared MutationCache shows this copy */
export function exportError(message: string): Error {
  return Object.assign(new Error(message), { userMessage: message });
}

export function triggerDownload(url: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Requests not downloaded yet, per browser and staff (front-desk PCs are shared between accounts).
 * Kept in full until downloaded or 削除 — §9 is read 20 ids at a time (`useExportRows`).
 * Storage may be unavailable — the export then only downloads in-session.
 */
export function readKeptExports<T>(key: string): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeKeptExports<T>(key: string, exports: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(exports));
  } catch {
    // Not kept — the next visit simply does not list it
  }
}
