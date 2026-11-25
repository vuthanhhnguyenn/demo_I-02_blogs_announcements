import { format } from 'date-fns';

/** 請求日 = date part of `header.createdAt` (API-114 §6.9) — not `dueDate` (015 D1) */
export function toBillingDate(createdAt: string | null | undefined): string {
  if (!createdAt) return '—';
  return format(new Date(createdAt), 'yyyy/MM/dd');
}
