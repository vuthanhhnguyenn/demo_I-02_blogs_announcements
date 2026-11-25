import { TEXTAREA_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/constants/app.constants';
import {
  isJapanesePhoneNumber,
  isJapanesePostalCode,
  japanesePhoneMessage,
  japanesePostalCodeMessage,
  maxLengthMessage,
} from '@/utils/validation.util';
import { z } from 'zod';

import {
  STORE_ADDRESS_MAX_LENGTH,
  STORE_BRAND_GROUPS,
  STORE_BRAND_VALUES,
  STORE_CLUB_CODE_MAX_LENGTH,
  STORE_FAX_EXAMPLE,
  STORE_GENDER_RESTRICTION_VALUES,
  STORE_PHONE_EXAMPLE,
  STORE_PHONE_MAX_LENGTH,
  STORE_POSTAL_CODE_MAX_LENGTH,
  type StoreBrandEnum,
  type StoreBrandGroup,
} from '../_constants/constants';

/**
 * Y-02 FR-002 store basic info, create and edit — the schema behind the store create and edit screens.
 *
 * Shape follows the prototype's form (`store-form.tsx` @ `b223fef`), so the fields the repo's
 * older form carried and the prototype does not are gone: status, is-FC boolean, accounting code,
 * email address, floor map, the seven social URLs and the rough area select
 * (`specs/028-store-form/spec.md` FR-051). Store photos came back on 2026-10-02 as the dev-added
 * 店舗写真 card (`photos`, FR-055).
 *
 * Every enum here is now the wire's own value (decision D2): the FE never re-cases an API value,
 * so `brandEnum` and `genderRestriction` travel exactly as `CreateStoreDto` declares them.
 */

/** The prototype's brand select — the brand group, not the stored brand (FR-014) */
export const BRAND_GROUPS = STORE_BRAND_GROUPS;
export type BrandGroup = StoreBrandGroup;

/** The prototype's sub-brand select, JOYFIT only (FR-015) — the four JOYFIT wire values */
export const JOYFIT_SUB_BRANDS: StoreBrandEnum[] = STORE_BRAND_VALUES.filter(
  (brand) => brand !== 'Fit365',
);

/** The single FIT365 brand value; its group has no sub-brand (FR-015) */
const FIT365_BRAND: StoreBrandEnum = 'Fit365';

/** Direct management — the operating-company select's "no company" value; an empty string cannot be a Select item value */
export const DIRECT_MANAGEMENT_VALUE = 'direct';

/** FR-018 gender-restriction options — declared above the schema, which builds its enum from it */
export const GENDER_RESTRICTION_OPTIONS = STORE_GENDER_RESTRICTION_VALUES;

/** Y-02 FR-002 / FR-005 business hours (per-weekday defaults) — 7 weekdays + public holiday, in this order */
export const BUSINESS_HOUR_DAYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
  'holiday',
] as const;
export type BusinessHourDay = (typeof BUSINESS_HOUR_DAYS)[number];

export const BUSINESS_HOUR_DAY_LABELS: Record<BusinessHourDay, string> = {
  mon: '月曜日',
  tue: '火曜日',
  wed: '水曜日',
  thu: '木曜日',
  fri: '金曜日',
  sat: '土曜日',
  sun: '日曜日',
  holiday: '祝日',
};

/**
 * One weekly row. The staff-on-site window (Y-02 FR-005) is not part of this form: the detail
 * screen's 営業設定 tab owns it, and the create body leaves it unset.
 */
const businessHourRowSchema = z.object({
  day: z.enum(BUSINESS_HOUR_DAYS),
  open_time: z.string(),
  close_time: z.string(),
  is_closed: z.boolean(),
});

/**
 * F11 / FR-041a — how a public holiday is treated. The wire has no mode field, so research R3
 * encodes it by the presence of the `holiday` row: 曜日どおり = no row (7 rows sent), 営業 = an open
 * row with times, 休業 = a closed row.
 */
export const HOLIDAY_MODES = ['follow_weekday', 'open', 'closed'] as const;
export type HolidayMode = (typeof HOLIDAY_MODES)[number];

export const HOLIDAY_MODE_LABELS: Record<HolidayMode, string> = {
  follow_weekday: '曜日どおり',
  open: '営業',
  closed: '休業',
};

/** Index of the 祝日 row in `default_hours` — always the last of the eight */
export const HOLIDAY_ROW_INDEX = BUSINESS_HOUR_DAYS.indexOf('holiday');

/** FR-055 / FR-057a — the 店舗写真 card's caps */
export const STORE_PHOTO_MAX_COUNT = 20;
export const STORE_PHOTO_MAX_SIZE_MB = 10;

/**
 * One tile of the 店舗写真 card (data-model.md `StorePhotoDraft`).
 *
 * - `uploaded` — has its `s3Key`; the only state that is ever sent.
 * - `uploading` — no key yet; `previewUrl` (a local object URL, unique per file) identifies it
 *   until the upload settles.
 * - `failed` — reserved by the data model; the card drops a failed tile instead (FR-057b).
 *
 * No image id is kept: ids change on every `PUT …/images` (FR-059d).
 */
const storePhotoSchema = z.object({
  s3Key: z.string(),
  caption: z.string().nullable(),
  previewUrl: z.string().optional(),
  /** The signed asset URL a stored photo came back with (`StoreImageDto.url`); display only */
  displayUrl: z.string().optional(),
  status: z.enum(['uploaded', 'uploading', 'failed']),
});
export type StorePhotoDraft = z.infer<typeof storePhotoSchema>;

/** Optional free text capped at the API's `maxLength` */
const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, maxLengthMessage(label, max));

/**
 * Optional phone / FAX: the API's 20-character cap, plus the shared Japanese phone shape.
 * `example` is the field's placeholder, so the error shows the same grouping.
 */
const optionalPhone = (label: string, example: string) =>
  optionalText(label, STORE_PHONE_MAX_LENGTH).refine(
    (value) => value === '' || isJapanesePhoneNumber(value),
    { message: japanesePhoneMessage(label, example) },
  );

export const storeFormSchema = z
  .object({
    club_code: z
      .string()
      .trim()
      .min(1, '店舗コードを入力してください')
      .max(STORE_CLUB_CODE_MAX_LENGTH, maxLengthMessage('店舗コード', STORE_CLUB_CODE_MAX_LENGTH)),
    name: z
      .string()
      .trim()
      .min(1, '店舗名を入力してください')
      .max(TEXT_MAX_LENGTH, maxLengthMessage('店舗名', TEXT_MAX_LENGTH)),
    name_kana: optionalText('店舗名（カナ）', TEXT_MAX_LENGTH),
    /** FR-063 — the brand group; combined with the sub-brand into the stored brand on submit */
    brand_group: z
      .string()
      .min(1, 'ブランドを選択してください')
      .pipe(z.enum(BRAND_GROUPS, { message: 'ブランドを選択してください' })),
    /** FR-065 — required when the brand group is JOYFIT (client sign-off 2026-08-24, QA #202) */
    sub_brand: z.string(),
    /**
     * TODO(round3) B1 — テリトリー is Phase 2 (Y-15 組織階層管理), and neither `CreateStoreDto` nor
     * `UpdateStoreDto` accepts a `territoryId` yet. The form control is commented out in
     * `store-form.tsx`; the field stays in the schema so Round 3 is an uncomment, but its
     * 「テリトリーを選択してください」 rule is dropped — a required rule with no control would make
     * the form unsubmittable. Round 3 restores `.min(1)`.
     */
    territory_id: z.string(),
    /** `DIRECT_MANAGEMENT_VALUE` = directly managed */
    fc_company_id: z.string(),
    /** D4 — the JIS X 0401 numeric code (`"13"`), not the Japanese name; resolved for display only */
    prefecture: z.string(),
    postal_code: optionalText('郵便番号', STORE_POSTAL_CODE_MAX_LENGTH).refine(
      (value) => value === '' || isJapanesePostalCode(value),
      { message: japanesePostalCodeMessage('郵便番号') },
    ),
    address: optionalText('住所', STORE_ADDRESS_MAX_LENGTH),
    phone: optionalPhone('電話番号', STORE_PHONE_EXAMPLE),
    fax: optionalPhone('FAX番号', STORE_FAX_EXAMPLE),
    receipt_date: z.string(),
    preopen_date: z.string(),
    grand_open_date: z.string(),
    closing_date: z.string(),
    // `''` is "not set"; keeping the value typed here is what lets the payload builder drop it
    // without a cast back to the wire's gender enum
    gender_restriction: z.enum(['', ...GENDER_RESTRICTION_OPTIONS]),
    memo: optionalText('備考', TEXTAREA_MAX_LENGTH),
    /**
     * Y-02 FR-002 受付設定 (261112_v11). 入会受付 — the store is offered by the app's new-member /
     * 1Day / 見学 store pickers (`joiningReception`). 引き継ぎ受付 — a member whose contract store
     * is this one may link the new app to their existing membership (`linkReception`, APP-F-02
     * FR-M010). Both start OFF on a new store; head office only.
     */
    joining_reception: z.boolean(),
    link_reception: z.boolean(),
    default_hours: z.array(businessHourRowSchema).length(BUSINESS_HOUR_DAYS.length),
    holiday_mode: z.enum(HOLIDAY_MODES),
    photos: z
      .array(storePhotoSchema)
      .max(STORE_PHOTO_MAX_COUNT, `写真は最大${STORE_PHOTO_MAX_COUNT}枚まで登録できます`),
  })
  .superRefine((values, ctx) => {
    // FR-065: `brandEnum` has no bare JOYFIT value, so a JOYFIT store must name a sub-brand
    if (values.brand_group === 'JOYFIT' && !values.sub_brand) {
      ctx.addIssue({
        code: 'custom',
        path: ['sub_brand'],
        message: 'サブブランドを選択してください',
      });
    }
    // FR-044's weekly-hours rule lives in `storeFormWithHoursRuleSchema` only — see there.
  });

/** True when the operator has not entered anything into the weekly table */
export function isWeeklyTableBlank(
  rows: readonly {
    day: BusinessHourDay;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }[],
  holidayMode: HolidayMode,
): boolean {
  return (
    holidayMode === 'follow_weekday' &&
    rows.every(
      (row) => row.day === 'holiday' || (!row.open_time && !row.close_time && !row.is_closed),
    )
  );
}

export const MISSING_HOURS_MESSAGE = '営業時間を入力してください';
export const REVERSED_HOURS_MESSAGE = '閉店時刻は開店時刻より後の時刻を入力してください';

/**
 * The shared schema plus FR-044 — a weekday that is not 定休日 and has one time entered must carry
 * the other, and the 祝日 row set to 営業 must carry both. A row with both times must close after
 * it opens (FR-005, Y-02 Bug No.8).
 *
 * Y-02 Bug No.21 — a weekday left with neither time is valid: 営業時間 is 任意 per day, so filling
 * only some weekdays saves (the empty days are left out of `businessHours` — "not set", API-083 §6.2). The prototype does not require
 * every day either.
 *
 * The create screen always validates with it. The edit screen switches to it only once the
 * operator has touched the weekly table or 祝日の扱い (B13, closed by the 2026-10-07 regen): an
 * untouched table is not sent, so validating hours the backend already holds in that state would
 * only block an unrelated save.
 *
 * The table is 任意 as a whole (FR-011): a table left completely blank is not validated, and the
 * body carries no rows (`buildCreatePayload` / `buildUpdatePayload`). The issue sits on the row,
 * so editing any of its controls finds and clears it.
 */
export const storeFormWithHoursRuleSchema = storeFormSchema.superRefine((values, ctx) => {
  if (isWeeklyTableBlank(values.default_hours, values.holiday_mode)) return;
  values.default_hours.forEach((row, index) => {
    const needsTimes =
      row.day === 'holiday'
        ? values.holiday_mode === 'open'
        : !row.is_closed && Boolean(row.open_time || row.close_time);
    if (needsTimes && (!row.open_time || !row.close_time)) {
      ctx.addIssue({
        code: 'custom',
        path: ['default_hours', index],
        message: MISSING_HOURS_MESSAGE,
      });
    } else if (needsTimes && row.close_time <= row.open_time) {
      // Y-02 Bug No.8 — FR-005: the close must fall after the open; the backend answers an inverted
      // or equal pair with 422 E-STR-003, whose wording reads as "missing time". "HH:MM" strings
      // compare correctly as text.
      ctx.addIssue({
        code: 'custom',
        path: ['default_hours', index],
        message: REVERSED_HOURS_MESSAGE,
      });
    }
  });
});

export const CLOSING_BEFORE_OPENING_MESSAGE = '閉店日は開店日以降の日付を入力してください';

/**
 * Y-02 Bug No.19 — 閉店日 may not fall before 開店日 (the same day is allowed); the backend stores
 * whatever pair it is sent. Both values are `YYYY-MM-DD`, so string order is date order.
 *
 * The create screen always applies it. The edit screen applies it only once the operator has
 * changed either date: a stored pair is not re-sent untouched, and Staff cannot edit the dates at
 * all, so an inverted pair already on file must not block an unrelated save.
 */
export function withOpeningClosingOrderRule(
  schema: typeof storeFormSchema,
): typeof storeFormSchema {
  return schema.refine(
    (values) =>
      !values.grand_open_date ||
      !values.closing_date ||
      values.closing_date >= values.grand_open_date,
    {
      path: ['closing_date'],
      message: CLOSING_BEFORE_OPENING_MESSAGE,
      // Zod skips object-level checks once any field aborts (e.g. a blank 店舗コード), which would
      // hide this error behind the required ones. It reads only the two dates, so run it whenever
      // both are strings.
      when: ({ value }) => {
        const { grand_open_date, closing_date } = (value ?? {}) as Record<string, unknown>;
        return typeof grand_open_date === 'string' && typeof closing_date === 'string';
      },
    },
  );
}

/** The create screen's schema: FR-044's weekly-hours rule plus the 開店日/閉店日 order */
export const storeCreateFormSchema = withOpeningClosingOrderRule(storeFormWithHoursRuleSchema);

/** Form state — every field is a string so an unset control round-trips as `''` */
export type StoreFormValues = z.input<typeof storeFormSchema>;

/** Values after parse (submit handlers / API body) */
export type StoreFormSubmitValues = z.output<typeof storeFormSchema>;

/**
 * The prototype's two selects resolve to one stored brand: FIT365 → `Fit365`; JOYFIT plus its
 * sub-brand → `Joyfit` / `Joyfit24` / `JoyfitYoga` / `JoyfitPlus` (decision D2 — wire values).
 */
export function toStoredBrand(
  brandGroup: BrandGroup,
  subBrand: string,
): StoreBrandEnum | undefined {
  if (brandGroup === 'FIT365') return FIT365_BRAND;
  return JOYFIT_SUB_BRANDS.find((value) => value === subBrand);
}

/**
 * The inverse of `toStoredBrand`, for loading a store into the form.
 *
 * `StoreDetailDto.brandEnum` is typed as a bare `string` on the wire, so an unknown value simply
 * resolves to no selection rather than putting an unrenderable option in the select.
 */
export function fromStoredBrand(brand: string | null | undefined): {
  brand_group: string;
  sub_brand: string;
} {
  if (!brand) return { brand_group: '', sub_brand: '' };
  if (brand === FIT365_BRAND) return { brand_group: 'FIT365', sub_brand: '' };
  const subBrand = JOYFIT_SUB_BRANDS.find((value) => value === brand);
  return subBrand
    ? { brand_group: 'JOYFIT', sub_brand: subBrand }
    : { brand_group: '', sub_brand: '' };
}
