import type {
  BusinessHourDto,
  CreateStoreDto,
  ReplaceStoreImagesBodyDto,
  StoreBusinessHourDto,
  StoreDetailDto,
  StoreImageDto,
  StoreImageSpecDto,
  UpdateStoreDto,
} from '@/lib/api-real/types.gen';

import {
  BUSINESS_HOUR_DAYS,
  type BusinessHourDay,
  DIRECT_MANAGEMENT_VALUE,
  type HolidayMode,
  type StoreFormSubmitValues,
  type StoreFormValues,
  type StorePhotoDraft,
  fromStoredBrand,
  isWeeklyTableBlank,
  toStoredBrand,
} from '../_schemas/store-form.schema';
import { WEEKDAY_FROM_API, WEEKDAY_TO_API, emptyToNull } from './store-api.util';

/**
 * Initial business hours on the create screen. As in the prototype (`store-form.tsx` L469-L476),
 * all rows start with empty times and no closing-day tick, and 祝日 starts at 曜日どおり
 * (spec 028 FR-047, parity PAR074).
 */
function emptyHourRows(): StoreFormValues['default_hours'] {
  return BUSINESS_HOUR_DAYS.map((day) => ({
    day,
    open_time: '',
    close_time: '',
    is_closed: false,
  }));
}

export function emptyStoreFormValues(): StoreFormValues {
  return {
    club_code: '',
    name: '',
    name_kana: '',
    brand_group: '',
    sub_brand: '',
    territory_id: '',
    fc_company_id: '',
    prefecture: '',
    postal_code: '',
    address: '',
    phone: '',
    fax: '',
    receipt_date: '',
    preopen_date: '',
    grand_open_date: '',
    closing_date: '',
    gender_restriction: '',
    memo: '',
    // Y-02 FR-002 — a newly registered store starts with both receptions OFF
    joining_reception: false,
    link_reception: false,
    default_hours: emptyHourRows(),
    holiday_mode: 'follow_weekday',
    photos: [],
  };
}

/** R3 — a missing `holiday` row is 曜日どおり; a present one is 営業 or 休業 by its flag */
function holidayModeOf(row: StoreBusinessHourDto | undefined): HolidayMode {
  if (!row) return 'follow_weekday';
  return row.isClosed ? 'closed' : 'open';
}

/**
 * Loads a store (and its weekly set) into the form's shape — every unset value becomes `''`.
 *
 * `photos` starts empty: the photo list is a query of its own, and the edit screen seeds the field
 * when it lands (`toPhotoDrafts`) so a slow photo read never holds the rest of the form back.
 *
 * The wire is camelCase and the form is snake_case; decision D1 keeps the rename here, at the one
 * seam that reads the DTO, rather than behind a mapper layer.
 */
export function toStoreFormValues(
  store: StoreDetailDto,
  businessHours: StoreBusinessHourDto[] | undefined,
): StoreFormValues {
  const storedRows = new Map<BusinessHourDay, StoreBusinessHourDto>(
    (businessHours ?? []).map((row) => [WEEKDAY_FROM_API[row.dayOfWeek], row]),
  );

  return {
    club_code: store.clubCode,
    name: store.name,
    name_kana: store.nameKana ?? '',
    ...fromStoredBrand(store.brandEnum),
    // TODO(round3) B1 — no `territoryId` on the wire, so the disabled cascade always loads empty
    territory_id: '',
    fc_company_id: store.fcCompanyId ?? DIRECT_MANAGEMENT_VALUE,
    prefecture: store.prefecture ?? '',
    postal_code: store.postalCode ?? '',
    address: store.address ?? '',
    phone: store.phone ?? '',
    fax: store.fax ?? '',
    receipt_date: store.receiptDate ?? '',
    preopen_date: store.preopenDate ?? '',
    grand_open_date: store.grandOpenDate ?? '',
    closing_date: store.closedAt ?? '',
    gender_restriction: store.genderRestriction,
    memo: store.memo ?? '',
    joining_reception: store.joiningReception,
    link_reception: store.linkReception,
    default_hours: BUSINESS_HOUR_DAYS.map((day) => {
      const row = storedRows.get(day);
      return {
        day,
        open_time: row?.openTime ?? '',
        close_time: row?.closeTime ?? '',
        is_closed: row?.isClosed ?? false,
      };
    }),
    holiday_mode: holidayModeOf(storedRows.get('holiday')),
    photos: [],
  };
}

/**
 * The gender restriction is a closed set rather than free text, so "not set" is dropped while the chosen value
 * keeps its own type — no cast back to the wire enum on the way out.
 */
const genderOrUndefined = (
  value: StoreFormSubmitValues['gender_restriction'],
): CreateStoreDto['genderRestriction'] => (value === '' ? undefined : value);

/**
 * The weekly set as replace rows (research R3 / data-model.md).
 *
 * - FR-043: a 定休日 weekday, and 祝日 set to 休業, are closed days with no times, so whatever the
 *   operator had typed into the disabled inputs is dropped rather than persisted.
 * - 曜日どおり sends no `holiday` row at all — seven rows — which is how the contract says "not
 *   overridden". 営業 sends an open `holiday` row with its two times.
 * - A weekday left blank (no times, not 定休日) sends no row either: the day is "not set".
 * - The staff-on-site window has no control on the form; the 営業設定 tab owns it. Both writes
 *   are full replaces, so on edit a day that stays open carries its stored window through
 *   (`storedRows`) rather than wiping it. A closed day has no window.
 */
function toHourRows(
  rows: StoreFormSubmitValues['default_hours'],
  holidayMode: HolidayMode,
  storedRows: readonly StoreBusinessHourDto[] = [],
): BusinessHourDto[] {
  return rows.flatMap((row): BusinessHourDto[] => {
    const isClosed = row.day === 'holiday' ? holidayMode === 'closed' : row.is_closed;
    if (row.day === 'holiday' && holidayMode === 'follow_weekday') return [];
    // Y-02 Bug No.21 / No.8 — a weekday left with neither time nor 定休日 is "not set", which the
    // contract expresses by leaving the day out (API-083 §6.2 / §8.2). Sent as an open row with null
    // times it is refused with 422 E-STR-003.
    if (row.day !== 'holiday' && !isClosed && !row.open_time && !row.close_time) return [];
    const dayOfWeek = WEEKDAY_TO_API[row.day];
    const stored = isClosed ? undefined : storedRows.find((entry) => entry.dayOfWeek === dayOfWeek);
    return [
      {
        dayOfWeek,
        openTime: isClosed ? null : emptyToNull(row.open_time),
        closeTime: isClosed ? null : emptyToNull(row.close_time),
        ...(stored
          ? { staffStartTime: stored.staffStartTime, staffEndTime: stored.staffEndTime }
          : {}),
        isClosed,
      },
    ];
  });
}

/** Direct management is the absence of an FC company, which the payload carries as null (as API-083 does). */
function toFcCompanyId(value: string): string | null {
  return value === '' || value === DIRECT_MANAGEMENT_VALUE ? null : value;
}

export function buildCreatePayload(values: StoreFormSubmitValues): CreateStoreDto {
  const brandEnum = toStoredBrand(values.brand_group, values.sub_brand);
  if (!brandEnum) {
    // Unreachable: the schema requires a sub-brand whenever the group is JOYFIT (FR-065)
    throw new Error('ブランドを解決できませんでした');
  }

  // What is deliberately absent:
  // - TODO(round3) B1 — `territoryId`: no such column, and `CreateStoreDto` does not accept it.
  // - `status` — FR-071: a new store is always born `preparing`.
  // - `businessHours` when the weekly table was left blank — the table is 任意 (FR-011), and
  //   sending seven empty open rows would be refused (E-STR-003).
  return {
    clubCode: values.club_code,
    name: values.name,
    brandEnum,
    nameKana: emptyToNull(values.name_kana),
    fcCompanyId: toFcCompanyId(values.fc_company_id),
    prefecture: emptyToNull(values.prefecture),
    postalCode: emptyToNull(values.postal_code),
    address: emptyToNull(values.address),
    phone: emptyToNull(values.phone),
    fax: emptyToNull(values.fax),
    receiptDate: emptyToNull(values.receipt_date),
    preopenDate: emptyToNull(values.preopen_date),
    grandOpenDate: emptyToNull(values.grand_open_date),
    closedAt: emptyToNull(values.closing_date),
    genderRestriction: genderOrUndefined(values.gender_restriction),
    memo: emptyToNull(values.memo),
    // Y-02 FR-002 受付設定 — only head office reaches the create screen, so both always travel
    joiningReception: values.joining_reception,
    linkReception: values.link_reception,
    // FR-046 — the weekly set travels in the same request as the store (one write, D11)
    ...(isWeeklyTableBlank(values.default_hours, values.holiday_mode)
      ? {}
      : { businessHours: toHourRows(values.default_hours, values.holiday_mode) }),
  };
}

/**
 * A field the operator did not touch is left out of the body entirely. `PATCH /admin/stores/{id}`
 * takes a partial payload and leaves an unspecified field untouched (API-083
 * 「未指定フィールドは変更しない」), so a save that changes only the name cannot rewrite a value
 * somebody else changed on the detail screen since this form was loaded — the same protection
 * FR-045a gives the weekly table, applied to every other field.
 */
type StoreFormDirtyFields = Partial<Record<keyof StoreFormValues, unknown>>;

/**
 * The edit payload. Two rules shape it:
 *
 * - Only the fields the operator actually changed are sent — see `StoreFormDirtyFields` above.
 * - FR-086 — a restricted Staff user submits nothing outside the whitelisted fields; every other
 *   field is left out entirely, so a locked value is never rewritten and the write cannot be
 *   refused whole for carrying a locked field.
 *
 * The weekly set (B13, closed by the 2026-10-07 regen) rides the same PATCH as `businessHours`,
 * a full replace saved in one transaction with the row, and only when the table or 祝日の扱い was
 * touched. A table emptied completely is `[]` — every day back to unset. `photos` is not part of
 * this body: it is its own `PUT …/images` (`buildPhotoItems`).
 *
 * No `status` is sent (FR-071). Whether an omitted `status` really leaves it untouched is open
 * (T011 / quickstart V1); if PATCH turns out to reset it, this is where it gets echoed.
 */
export function buildUpdatePayload(
  values: StoreFormSubmitValues,
  options: {
    restricted: boolean;
    dirtyFields: StoreFormDirtyFields;
    /** The weekly rows as loaded — their staff-on-site windows are carried through (`toHourRows`) */
    storedHours: readonly StoreBusinessHourDto[] | undefined;
  },
): UpdateStoreDto {
  const isChanged = (field: keyof StoreFormValues) => Boolean(options.dirtyFields[field]);
  /** The field as a one-key fragment to spread, or nothing at all when it was not touched. */
  const ifChanged = <K extends string, V>(
    field: keyof StoreFormValues,
    key: K,
    value: V,
  ): Partial<Record<K, V>> => (isChanged(field) ? ({ [key]: value } as Record<K, V>) : {});

  const hoursChanged = isChanged('default_hours') || isChanged('holiday_mode');

  /**
   * FR-083: the client's whitelist of 2026-08-24 is name / address / phone — 店舗名（カナ）is not
   * in it — plus the weekly hours, which permission matrix L205 grants Staff on their own store.
   *
   * The API enforces the same whitelist: `staff` may PATCH only `name` / `address` / `phone` /
   * `businessHours` on their own store; any other field is 403 `E-AUTH-103`.
   */
  const staffEditable: UpdateStoreDto = {
    ...ifChanged('name', 'name', values.name),
    ...ifChanged('address', 'address', emptyToNull(values.address)),
    ...ifChanged('phone', 'phone', emptyToNull(values.phone)),
    ...(hoursChanged
      ? {
          businessHours: isWeeklyTableBlank(values.default_hours, values.holiday_mode)
            ? []
            : toHourRows(values.default_hours, values.holiday_mode, options.storedHours),
        }
      : {}),
  };

  if (options.restricted) {
    return staffEditable;
  }

  // Two controls resolve to one stored field (FR-063/FR-065), so either one going dirty sends it.
  const brandEnum =
    isChanged('brand_group') || isChanged('sub_brand')
      ? toStoredBrand(values.brand_group, values.sub_brand)
      : undefined;

  // TODO(round3) B1 — `territory_id` is stripped: `UpdateStoreDto` has no `territoryId`.
  return {
    ...staffEditable,
    ...ifChanged('club_code', 'clubCode', values.club_code),
    ...ifChanged('name_kana', 'nameKana', emptyToNull(values.name_kana)),
    ...(brandEnum ? { brandEnum } : {}),
    ...ifChanged('fc_company_id', 'fcCompanyId', toFcCompanyId(values.fc_company_id)),
    ...ifChanged('prefecture', 'prefecture', emptyToNull(values.prefecture)),
    ...ifChanged('postal_code', 'postalCode', emptyToNull(values.postal_code)),
    ...ifChanged('fax', 'fax', emptyToNull(values.fax)),
    ...ifChanged('receipt_date', 'receiptDate', emptyToNull(values.receipt_date)),
    ...ifChanged('preopen_date', 'preopenDate', emptyToNull(values.preopen_date)),
    ...ifChanged('grand_open_date', 'grandOpenDate', emptyToNull(values.grand_open_date)),
    ...ifChanged('closing_date', 'closedAt', emptyToNull(values.closing_date)),
    ...ifChanged(
      'gender_restriction',
      'genderRestriction',
      genderOrUndefined(values.gender_restriction),
    ),
    ...ifChanged('memo', 'memo', emptyToNull(values.memo)),
    // Y-02 FR-002 受付設定 — head office only: never in `staffEditable` (staff → 403 E-AUTH-103)
    ...ifChanged('joining_reception', 'joiningReception', values.joining_reception),
    ...ifChanged('link_reception', 'linkReception', values.link_reception),
  };
}

/** The store's current photo list (`GET …/images`, already in display order) as card tiles */
export function toPhotoDrafts(
  items: readonly (StoreImageDto | StoreImageSpecDto)[] | undefined,
): StorePhotoDraft[] {
  return [...(items ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      s3Key: item.s3Key,
      caption: item.caption,
      displayUrl: 'url' in item ? item.url : undefined,
      status: 'uploaded',
    }));
}

/**
 * The `PUT …/images` body (FR-059a): the complete list to keep, in grid order, as `{ s3Key,
 * caption }` pairs only — an `id` or `sortOrder` answers 400 E-VAL-001. A tile still uploading has
 * no key yet and is left out (the primary button is disabled meanwhile anyway, FR-059c).
 */
export function buildPhotoItems(list: readonly StorePhotoDraft[]): ReplaceStoreImagesBodyDto {
  return {
    items: list
      .filter((photo) => photo.status === 'uploaded')
      .map(({ s3Key, caption }) => ({ s3Key, caption })),
  };
}

/** FR-059a — the list changed when the ordered keys differ (an add or a delete) */
export function photosChanged(
  loaded: readonly StorePhotoDraft[],
  current: readonly StorePhotoDraft[],
): boolean {
  const keys = (list: readonly StorePhotoDraft[]) =>
    list.filter((photo) => photo.status === 'uploaded').map((photo) => photo.s3Key);
  const before = keys(loaded);
  const after = keys(current);
  return before.length !== after.length || before.some((key, index) => key !== after[index]);
}
