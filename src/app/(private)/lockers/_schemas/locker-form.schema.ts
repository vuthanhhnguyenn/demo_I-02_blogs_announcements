import { z } from 'zod';

import type {
  LockerLockMethod,
  LockerOpenMethod,
  LockerOrderType,
  LockerShapeType,
} from '../_constants/locker-enum-labels.constants';

/** API-100 §7.1 bounds */
export const LOCKER_LOCATION_CAPTION_MAX_LENGTH = 255;
export const LOCKER_SUPPLEMENTARY_NOTE_MAX_LENGTH = 2000;

const SHAPE_TYPES = ['three_by_nine', 'three_by_seven', 'three_by_five', 'three_by_two'] as const;
const ORDER_TYPES = [
  'top_left_to_top_right',
  'top_right_to_top_left',
  'top_left_to_bottom_left',
  'top_right_to_bottom_right',
] as const;
/** `ic_lock` is reserved and rejected on write (API-100 §7.5) */
const LOCK_METHODS = ['dial_lock', 'key_lock', 'padlock'] as const;
const OPEN_METHODS = ['door', 'drawer'] as const;

// Compile-time drift guards: a BE enum change fails `tsc` here instead of at runtime.
type AssertExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const shapeTypesMatch: AssertExact<(typeof SHAPE_TYPES)[number], LockerShapeType> = true;
const orderTypesMatch: AssertExact<(typeof ORDER_TYPES)[number], LockerOrderType> = true;
const openMethodsMatch: AssertExact<(typeof OPEN_METHODS)[number], LockerOpenMethod> = true;
const lockMethodsInEnum: (typeof LOCK_METHODS)[number] extends LockerLockMethod ? true : never =
  true;
void [shapeTypesMatch, orderTypesMatch, openMethodsMatch, lockMethodsInEnum];

/**
 * E-01 FR-002: slot size W×H×D (in cm) is required as the default for the whole locker.
 * Inputs are received as strings and converted to integer cm on submit.
 */
export const SLOT_SIZE_MAX_CM = 500;

const slotSizeDimension = (label: string) =>
  z
    .string()
    .min(1, `${label}を入力してください`)
    .regex(/^\d+$/, `${label}は数字で入力してください`)
    .transform(Number)
    .refine((value) => value > 0, { message: `${label}は1以上で入力してください` })
    // Matches the BE's 1–500 cm (`locker.schema.ts` slotSize*Cm) so the PATCH is never a 400
    .refine((value) => value <= SLOT_SIZE_MAX_CM, {
      message: `${label}は${SLOT_SIZE_MAX_CM}以下で入力してください`,
    });

const slotSizeSchema = z.object({
  widthCm: slotSizeDimension('横幅'),
  heightCm: slotSizeDimension('高さ'),
  depthCm: slotSizeDimension('奥行き'),
});

/** A per-slot lock override of the create form, keyed by `slotCode` (「001」) */
const slotLockSettingSchema = z.object({
  slotCode: z.string(),
  lockMethod: z.enum(LOCK_METHODS),
  pinCode: z
    .union([z.literal(''), z.string().regex(/^\d{4}$/)])
    .nullable()
    .optional(),
});

/**
 * A cabinet photo (FR-012). A saved one carries its `imageId`; a new upload only its `imageS3Key`.
 * `imageUrl` is the self-signed preview URL (API-100 `LockerImageDto.imageUrl`) or a local blob URL.
 */
const lockerImageSchema = z.object({
  imageId: z.string().nullable(),
  imageS3Key: z.string(),
  imageUrl: z.string(),
});

/** Shared zod schema for ロッカー新規 / ロッカー編集 (field names follow `CreateLockerDto`) */
export const lockerFormSchema = z.object({
  storeId: z.string().min(1, '設置店舗を選択してください'),
  lockerLocationId: z.string().min(1, '設置エリアを選択してください'),
  locationCaption: z
    .string()
    .max(
      LOCKER_LOCATION_CAPTION_MAX_LENGTH,
      `案内文は${LOCKER_LOCATION_CAPTION_MAX_LENGTH}文字以内で入力してください`,
    )
    .optional(),
  supplementaryNote: z
    .string()
    .max(
      LOCKER_SUPPLEMENTARY_NOTE_MAX_LENGTH,
      `補足説明は${LOCKER_SUPPLEMENTARY_NOTE_MAX_LENGTH}文字以内で入力してください`,
    )
    .optional(),
  /** E-01 FR-012: one or more photos per cabinet, required on both 新規 and 編集 */
  images: z.array(lockerImageSchema).min(1, 'ロッカー写真を登録してください'),
  shapeType: z.enum(SHAPE_TYPES, { error: '形状を選択してください' }),
  /**
   * E-01 FR-003: slot numbers are auto-assigned from the shape and numbering pattern.
   * The starting number is fixed by the system, so the form has no start-value input.
   */
  orderType: z.enum(ORDER_TYPES),
  /**
   * E-01 FR-001 / FR-013 (260901_v4): the cabinet's one 契約形態コード, applied to every slot until
   * a slot gets its own option. `bottomOptionId` is not on the screen (API-100 v0.16 §7.1 / §7.2):
   * create leaves it out and edit never sends it, so a migrated value is kept.
   */
  optionId: z.string().nullable(),
  openMethod: z.enum(OPEN_METHODS, { error: '開閉方法を選択してください' }),
  lockMethod: z.enum(LOCK_METHODS, { error: '施錠方法を選択してください' }),
  slotSize: slotSizeSchema,
  slotLockSettings: z.array(slotLockSettingSchema).default([]),
});

export type LockerFormValues = z.input<typeof lockerFormSchema>;
export type LockerFormSubmitValues = z.output<typeof lockerFormSchema>;

export type LockerSlotLockSettingFormValue = z.infer<typeof slotLockSettingSchema>;
export type LockerImageFormValue = z.infer<typeof lockerImageSchema>;
export type LockerSelectableLockMethod = (typeof LOCK_METHODS)[number];
