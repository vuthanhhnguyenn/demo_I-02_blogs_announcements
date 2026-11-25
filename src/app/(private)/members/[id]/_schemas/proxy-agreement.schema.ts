import { differenceInMilliseconds } from 'date-fns';
import { z } from 'zod';

/** The reason / memo of a status-change application is capped at 500 characters by the API. */
export const STATUS_CHANGE_REASON_MAX_LENGTH = 500;

/**
 * 合意日時 of a proxy filing (header FR-005): required and not in the future.
 * The value is the ISO string the DateTimePicker produces.
 */
export const proxyAgreedAtSchema = z
  .string()
  .min(1, '合意日時は必須です')
  .refine((value) => differenceInMilliseconds(new Date(), new Date(value)) >= 0, {
    message: '合意日時に未来の日時は指定できません',
  });
