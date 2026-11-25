import type {
  CopyPlanDto,
  CreatePlanDto,
  PlanDetailDto,
  PlanUsageHourDto,
  UpdatePlanDto,
} from '@/lib/api-real/types.gen';

import {
  ALL_DAY_CLOSE,
  ALL_DAY_OPEN,
  type ContractFormSubmitValues,
  type ContractFormValues,
  LAST_MINUTE_OF_DAY,
  PLAN_USAGE_DAYS,
} from '../_schemas/contract-form.schema';

/** One row as the form holds it — `usageHours` is optional on the zod *input* type. */
type UsageHourFormRow = NonNullable<ContractFormValues['usageHours']>[number];

/** A brand-new form starts every day at 00:00〜23:59 with 終日 off, as the prototype does. */
export const EMPTY_USAGE_HOURS: UsageHourFormRow[] = PLAN_USAGE_DAYS.map((dayOfWeek) => ({
  dayOfWeek,
  openTime: ALL_DAY_OPEN,
  closeTime: LAST_MINUTE_OF_DAY,
  isAllDay: false,
}));

export const emptyContractFormValues: ContractFormValues = {
  name: '',
  contractType: undefined as unknown as ContractFormValues['contractType'],
  brandEnum: undefined as unknown as ContractFormValues['brandEnum'],
  storeId: null,
  // A new master starts 無効 and is switched on once it is ready to sell (prototype).
  isActive: false,
  hasCompanionBenefit: false,
  isMultiUsable: false,
  isCopyable: true,
  sameMonthWithdrawalAllowed: false,
  priceTaxIncluded: undefined as unknown as number,
  taxRate: undefined as unknown as number,
  accountingCode: '',
  usageStartDate: '',
  usageHours: EMPTY_USAGE_HOURS,
  areaIds: [],
};

/** API row → form row. A 休業 day arrives with both times `null` and comes back as two blanks. */
function usageHourToFormRow(row: PlanUsageHourDto): UsageHourFormRow {
  const isAllDay =
    !row.isClosed && row.openTime === ALL_DAY_OPEN && row.closeTime === ALL_DAY_CLOSE;
  return {
    dayOfWeek: row.dayOfWeek,
    openTime: row.isClosed ? '' : (row.openTime ?? ''),
    closeTime: row.isClosed ? '' : (row.closeTime ?? ''),
    isAllDay,
  };
}

/**
 * `usageHours` replaces the whole set on every save — omitting it keeps the stored rows and `[]`
 * wipes them (confirmed with the client at qa-186 §4) — so the form always sends all 8 rows.
 */
function formRowToUsageHour(row: UsageHourFormRow): PlanUsageHourDto {
  if (row.isAllDay) {
    return {
      dayOfWeek: row.dayOfWeek,
      openTime: ALL_DAY_OPEN,
      closeTime: ALL_DAY_CLOSE,
      isClosed: false,
    };
  }
  if (!row.openTime && !row.closeTime) {
    return { dayOfWeek: row.dayOfWeek, openTime: null, closeTime: null, isClosed: true };
  }
  return {
    dayOfWeek: row.dayOfWeek,
    openTime: row.openTime || null,
    closeTime: row.closeTime || null,
    isClosed: false,
  };
}

/** Maps an API-087 plan detail onto the form, filling in any 曜日 the API did not store. */
export function planDetailToFormValues(plan: PlanDetailDto): ContractFormValues {
  const storedRows = new Map(
    plan.usageHours.map((row) => [row.dayOfWeek, usageHourToFormRow(row)]),
  );

  return {
    name: plan.name,
    contractType: plan.contractType,
    storeId: plan.storeId,
    otherStoreAvailable: plan.otherStoreAvailable,
    brandEnum: plan.brandEnum as ContractFormValues['brandEnum'],
    parentPlanId: plan.parentPlanId,
    legacyCode: plan.legacyCode,
    isMultiUsable: plan.isMultiUsable,
    hasCompanionBenefit: plan.hasCompanionBenefit,
    nameForMember: plan.nameForMember,
    description: plan.description,
    corporateId: plan.corporateId,
    termsId: plan.termsId,
    // The plan carries a gallery; the form edits the first image as its サムネイル.
    thumbnailS3Key: plan.images[0]?.s3Key ?? null,
    publicDescription: plan.publicDescription,
    remarks: plan.remarks,
    priceTaxIncluded: plan.priceMonthly,
    suspensionFee: plan.suspensionFee,
    cancellationFee: plan.cancellationFee,
    taxRate: plan.taxRate,
    accountingCode: plan.accountingCode,
    enrollmentFee: plan.enrollmentFee,
    registrationFee: plan.registrationFee,
    cardIssueFee: plan.cardIssueFee,
    maintenanceFee: plan.maintenanceFee,
    usageStartDate: plan.usageStartDate ?? '',
    monthlyVisitLimit: plan.monthlyVisitLimit,
    usageHours: PLAN_USAGE_DAYS.map(
      (dayOfWeek) =>
        storedRows.get(dayOfWeek) ?? {
          dayOfWeek,
          openTime: '',
          closeTime: '',
          isAllDay: false,
        },
    ),
    suspendableMonths: plan.suspendableMonths,
    cancellationFeeMonths: plan.cancellationFeeMonths,
    prepaidMonths: plan.prepaidMonths,
    sameMonthWithdrawalAllowed: plan.sameMonthWithdrawalAllowed,
    minAge: plan.minAge,
    maxAge: plan.maxAge,
    limitOfSex: plan.limitOfSex,
    areaIds: [...plan.areaIds],
    isChangeable: plan.isChangeable,
    isCopyable: plan.isCopyable,
    hasBilling: plan.hasBilling,
    isActive: plan.isActive,
  };
}

/**
 * Prefill for the 複製 flow: everything the source master carries, with the name marked as a copy
 * so the operator is forced to rename it before saving. The copy inherits the source's 親主契約
 * rather than being parented to the source — an operator who wants a derived master picks the
 * source in the 親主契約 selector.
 */
export function planDetailToCopyFormValues(plan: PlanDetailDto): ContractFormValues {
  return { ...planDetailToFormValues(plan), name: `${plan.name}（複製）` };
}

/** G-01 FR-M007 子主契約の作成: a full copy whose 親主契約 is the source itself (`asDerived: true`). */
export function planDetailToChildFormValues(plan: PlanDetailDto): ContractFormValues {
  return {
    ...planDetailToFormValues(plan),
    name: `${plan.name}（子主契約）`,
    parentPlanId: plan.planId,
  };
}

/**
 * Fields the DTOs do **not** mark nullable: a blank input has to be left out of the body rather
 * than sent as `null`. Everything else is nullable on purpose, and sending `null` is how the form
 * clears a stored value — dropping those would silently keep the old one on PATCH.
 */
const NON_NULLABLE_BODY_FIELDS = new Set([
  'priceMonthly',
  'taxRate',
  'suspensionFee',
  'enrollmentFee',
  'registrationFee',
  'cardIssueFee',
  'maintenanceFee',
  'hasBilling',
  'limitOfSex',
  'isChangeable',
  'isCopyable',
  'otherStoreAvailable',
  'parentPlanId',
]);

function dropBlankNonNullables<T extends Record<string, unknown>>(body: T): T {
  return Object.fromEntries(
    Object.entries(body).filter(
      ([key, value]) =>
        value !== undefined && !(value === null && NON_NULLABLE_BODY_FIELDS.has(key)),
    ),
  ) as T;
}

function sharedPlanBody(values: ContractFormSubmitValues) {
  return {
    contractType: values.contractType,
    storeId: values.contractType === 'special' ? values.storeId : null,
    name: values.name,
    nameForMember: values.nameForMember,
    description: values.description,
    publicDescription: values.publicDescription,
    legacyCode: values.legacyCode,
    remarks: values.remarks,
    priceMonthly: values.priceTaxIncluded,
    taxRate: values.taxRate,
    cancellationFee: values.cancellationFee,
    suspensionFee: values.suspensionFee,
    enrollmentFee: values.enrollmentFee,
    registrationFee: values.registrationFee,
    cardIssueFee: values.cardIssueFee,
    maintenanceFee: values.maintenanceFee,
    hasBilling: values.hasBilling,
    accountingCode: values.accountingCode,
    hasCompanionBenefit: values.hasCompanionBenefit,
    monthlyVisitLimit: values.monthlyVisitLimit,
    usageStartDate: values.usageStartDate,
    suspendableMonths: values.suspendableMonths,
    cancellationFeeMonths: values.cancellationFeeMonths,
    prepaidMonths: values.prepaidMonths,
    sameMonthWithdrawalAllowed: values.sameMonthWithdrawalAllowed,
    minAge: values.minAge,
    maxAge: values.maxAge,
    limitOfSex: values.limitOfSex,
    areaIds: values.areaIds,
    isChangeable: values.isChangeable,
    isCopyable: values.isCopyable,
    otherStoreAvailable: values.otherStoreAvailable,
    // The API ignores 相互利用 unless 他店舗利用 is allowed, so keep the stored flag honest.
    isMultiUsable: values.otherStoreAvailable ? values.isMultiUsable : false,
    corporateId: values.contractType === 'corporate' ? values.corporateId : null,
    termsId: values.termsId,
    isActive: values.isActive,
    usageHours: values.usageHours.map(formRowToUsageHour),
  };
}

/** What the update body needs to know of the stored plan: which fees already hold an amount. */
type StoredPlanFees = Partial<
  Record<
    'suspensionFee' | 'enrollmentFee' | 'registrationFee' | 'cardIssueFee' | 'maintenanceFee',
    number | null
  >
>;

/**
 * A blank 休会時請求金額 is left out of the body so the API fills it from the brand master
 * (`CreatePlanDto.suspensionFee` is optional).
 */
export function toCreatePlanBody(values: ContractFormSubmitValues): CreatePlanDto {
  return dropBlankNonNullables({
    ...sharedPlanBody(values),
    brandEnum: values.brandEnum,
    parentPlanId: values.parentPlanId,
  }) as CreatePlanDto;
}

/**
 * `brandEnum` / `parentPlanId` are rejected with 400 E-VAL-001, so they never reach the body.
 * Omitting a fee keeps the stored amount, so a 休会時請求金額 the operator emptied is sent as `0`.
 * One that was never set (null = brand default) stays out of the body.
 */
export function toUpdatePlanBody(
  values: ContractFormSubmitValues,
  stored?: StoredPlanFees,
): UpdatePlanDto {
  const body = sharedPlanBody(values);
  // Omitting a fee on update keeps the stored amount, so a 入会時費用 the operator emptied is sent
  // as `0`. One that was never set stays out of the body.
  const clearedToZero = (next: number | null | undefined, previous: number | null | undefined) =>
    next ?? (previous == null ? undefined : 0);
  return dropBlankNonNullables({
    ...body,
    suspensionFee: clearedToZero(body.suspensionFee, stored?.suspensionFee),
    enrollmentFee: clearedToZero(body.enrollmentFee, stored?.enrollmentFee),
    registrationFee: clearedToZero(body.registrationFee, stored?.registrationFee),
    cardIssueFee: clearedToZero(body.cardIssueFee, stored?.cardIssueFee),
    maintenanceFee: clearedToZero(body.maintenanceFee, stored?.maintenanceFee),
  }) as UpdatePlanDto;
}

/**
 * `overrides` of the 複製 endpoint: the edit body minus `name`, which travels as the endpoint's
 * required top-level field — repeating it inside `overrides` is rejected with 400 E-VAL-001.
 */
export function toCopyPlanOverrides(
  values: ContractFormSubmitValues,
  source?: StoredPlanFees,
): NonNullable<CopyPlanDto['overrides']> {
  const body = toUpdatePlanBody(values, source);
  delete body.name;
  return body;
}
