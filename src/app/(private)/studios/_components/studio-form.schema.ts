import { CAPACITY_MAX_SIZE, TEXTAREA_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

export const StudioImageItemSchema = z.object({
  /** Local key of the row (the API image id once saved) */
  id: z.string(),
  /** API-110 image id — set for an image already saved on the studio */
  imageId: z.string().optional(),
  /** API-006 key (tag facility-image) — what create / add-image send */
  s3Key: z.string(),
  /** Preview: the signed delivery URL, or a local object URL for a fresh upload */
  url: z.string(),
});

export type StudioImageItem = z.infer<typeof StudioImageItemSchema>;

export const StudioLayoutCellKindSchema = z.enum([
  'normal_seat',
  'equipment_seat',
  'fixed_object',
  'empty',
]);

export type StudioLayoutCellKind = z.infer<typeof StudioLayoutCellKindSchema>;

const CELL_POSITION_MESSAGE = 'レイアウトの座席位置が不正です。';

export const LayoutCellSchema = z.object({
  x: z.number().int(CELL_POSITION_MESSAGE).min(0, CELL_POSITION_MESSAGE),
  y: z.number().int(CELL_POSITION_MESSAGE).min(0, CELL_POSITION_MESSAGE),
  kind: StudioLayoutCellKindSchema,
  /** The saved seat's id, when the cell came from the API */
  seatId: z.string().optional(),
  /** 通常席 only — kept across edits; a new 通常席 gets the next free number */
  seatNumber: z.string().optional(),
  /** 器材席 / 固定物 display label (the API's displayLabel) */
  label: z.string().optional(),
  /** Reserved / pending bookings holding the seat on a schedule from today */
  activeBookingCount: z.number().optional(),
});

export type LayoutCell = z.infer<typeof LayoutCellSchema>;

const ROWS_MESSAGE = '行数は2〜5の中から選択してください。';
const COLUMNS_MESSAGE = '列数は6・8・10の中から選択してください。';

export const SpaceLayoutSchema = z.object({
  rows: z.number().int(ROWS_MESSAGE).min(2, ROWS_MESSAGE).max(5, ROWS_MESSAGE),
  columns: z
    .number()
    .int(COLUMNS_MESSAGE)
    .refine((v) => [6, 8, 10].includes(v), {
      message: COLUMNS_MESSAGE,
    }),
  cells: z.array(LayoutCellSchema).default([]),
});

export type SpaceLayout = z.infer<typeof SpaceLayoutSchema>;

const OPERATING_HOURS_PATTERN = /^\d{2}:\d{2}~\d{2}:\d{2}$/;

/**
 * 物理定員 / バッファ値: blank is 必須; anything else that is not a whole number in range — a
 * negative, a decimal, or text the browser could not parse (NaN, see `numberInputHandlers`) —
 * gets the range message.
 */
const headcount = (label: string, min: number) => {
  const rangeMessage = `${label}は${min}〜${CAPACITY_MAX_SIZE}の整数で入力してください。`;
  return z
    .number({ error: (issue) => (issue.input == null ? `${label}は必須です。` : rangeMessage) })
    .int(rangeMessage)
    .min(min, rangeMessage)
    .max(CAPACITY_MAX_SIZE, rangeMessage);
};

export const StudioFormSchema = z.object({
  storeId: z.string().min(1, '店舗名は必須です。'),
  name: z
    .string()
    .trim()
    .min(1, 'スタジオ名は必須です。')
    .max(TEXT_MAX_LENGTH, `スタジオ名は${TEXT_MAX_LENGTH}文字以内で入力してください。`),
  studioType: z.enum(['studio-lesson', 'pt', 'body-care'], {
    error: 'スタジオ区分は必須です。',
  }),
  operatingHours: z
    .string()
    .min(1, '利用可能時間は必須です。')
    .regex(OPERATING_HOURS_PATTERN, {
      message: '利用可能時間は HH:mm~HH:mm 形式で入力してください。',
    })
    // Zero-padded HH:mm compares as text; an equal pair is no time at all. A refine runs even
    // after the regex failed, so a malformed value is left to the regex's message.
    .refine(
      (value) => {
        if (!OPERATING_HOURS_PATTERN.test(value)) return true;
        const [start, end] = value.split('~');
        return start < end;
      },
      { message: '終了時刻は開始時刻より後の時刻を入力してください。' },
    ),
  capacity: headcount('物理定員', 1),
  bufferValue: headcount('バッファ値', 0),
  equipmentNotes: z
    .string()
    .max(TEXTAREA_MAX_LENGTH, `設備・備品は${TEXTAREA_MAX_LENGTH}文字以内で入力してください。`)
    .optional()
    .default(''),
  internalNotes: z
    .string()
    .max(TEXTAREA_MAX_LENGTH, `備考は${TEXTAREA_MAX_LENGTH}文字以内で入力してください。`)
    .optional()
    .default(''),
  status: z.enum(['active', 'inactive']).default('active'),
  images: z.array(StudioImageItemSchema).default([]),
  layout: SpaceLayoutSchema.optional(),
});

export type StudioFormInput = z.input<typeof StudioFormSchema>;
export type StudioFormValues = z.output<typeof StudioFormSchema>;
export type StudioFormMode = 'create' | 'edit';
