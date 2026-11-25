import { REASON_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

// 無効化理由 is **optional** — per `specs/020-staff-permission-management/spec.md` Assumptions
// ("Deactivation reason capture is optional (not required to complete the action)") and the
// reviewed staff-detail.tsx prototype, which marks the field 「（任意）」.
//
// ⚠️ The API disagrees: `DeactivateStaffRequestDto.deactivatedReason` is `required`, and
// `POST /admin/staff/{id}/deactivate` answers `400` E-VAL-001 for a missing or empty value.
// Per the 2026-09-18 decision the **spec is authoritative and the endpoint's required flag is a
// backend defect**, the same rule applied to the PATCH HQ-only gate. So the form no longer
// blocks an empty reason; a deactivation with no reason will 400 until the backend relaxes it,
// and that failure is surfaced by the global mutation error toast rather than hidden.
// Tracked as gap G9 in specs/020-staff-permission-management/tests/test-plan-phase2.md.
export const staffDeactivateReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(REASON_MAX_LENGTH, `無効化理由は${REASON_MAX_LENGTH}文字以内で入力してください`),
});

export type StaffDeactivateReasonValues = z.input<typeof staffDeactivateReasonSchema>;
export type StaffDeactivateReasonSubmitValues = z.output<typeof staffDeactivateReasonSchema>;
