import type { ManualNotificationFormValues } from '../_schemas/manual-notification-form.schema';

type ManualNotificationTarget = ManualNotificationFormValues['target'];

/** Phase 1 UI hint. The API remains authoritative when a notification is submitted. */
export function manualNotificationRequiresApproval(target: ManualNotificationTarget): boolean {
  if (target.type === 'all_members') return true;
  if (target.type !== 'brands') return false;

  const selectedBrand = target.brands[0];
  return selectedBrand === 'joyfit_all' || selectedBrand === 'fit365';
}
