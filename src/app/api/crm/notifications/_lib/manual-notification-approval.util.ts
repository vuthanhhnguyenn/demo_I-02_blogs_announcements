import type { ManualNotificationTargetInput } from '@/app/api/_schemas/manual-notification.schema';

/** I-03: broad audiences require HQ approval before delivery. */
export function manualNotificationRequiresApproval(target: ManualNotificationTargetInput): boolean {
  if (target.type === 'all_members') return true;
  if (target.type !== 'brands') return false;

  const selectedBrand = target.brands[0];
  return selectedBrand === 'joyfit_all' || selectedBrand === 'fit365';
}
