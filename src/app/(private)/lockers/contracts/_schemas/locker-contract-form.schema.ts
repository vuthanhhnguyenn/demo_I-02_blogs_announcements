import { z } from 'zod';

/**
 * Zod schema for the locker contract edit form — the PIN only (slot PATCH, API-100 §6.2).
 * No slot move or period edit (API-101 §14 TBD-E01-SLOT-MOVE, not adopted). 契約種類 is read-only:
 * FR-005 applies the slot's option.
 */
export const lockerContractFormSchema = z.object({
  pinCode: z.union([
    z.literal(''),
    z.string().regex(/^\d{4}$/, '暗証番号は4桁固定です。数字4桁で入力してください。'),
  ]),
});

export type LockerContractFormValues = z.input<typeof lockerContractFormSchema>;
export type LockerContractFormSubmitValues = z.output<typeof lockerContractFormSchema>;
