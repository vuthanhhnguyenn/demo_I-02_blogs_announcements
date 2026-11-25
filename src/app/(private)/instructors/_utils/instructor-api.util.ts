import type { QueryClient } from '@tanstack/react-query';

import type { BrandEnumValue } from '@/components/common/brand-badge';

import {
  adminTrainerControllerDetailQueryKey,
  adminTrainerControllerHistoryQueryKey,
  adminTrainerControllerListQueryKey,
  adminTrainerControllerSummaryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminTrainerControllerListData,
  CreateTrainerBodyDto,
  TrainerDetailDto,
  TrainerListItemDto,
  UpdateMyTrainerBodyDto,
  UpdateTrainerBodyDto,
} from '@/lib/api-real/types.gen';
import { lazyQueryIds } from '@/lib/query-id.util';

import type { InstructorFormValues } from '../_components/instructor-form.schema';

/**
 * Trainer master (API-109 v0.10) — the one hand-written seam between the `/instructors` screens and
 * the real API: coach-type labels, the tab / filter → list query, brand groups, error codes, cache
 * invalidation and the form ↔ body conversions.
 */

export type CoachType = TrainerListItemDto['coachTypes'][number];

export const COACH_TYPE_LABELS: Record<CoachType, string> = {
  trainer: 'トレーナー',
  instructor: 'インストラクター',
  body_care_therapist: 'ボディケアセラピスト',
};

// --- list ---

export type InstructorTab = 'studio' | 'pt';

/**
 * The tabs as coach-type sets (D2). The API matches ANY listed type, so a person holding both an
 * instructor and a trainer role shows in both tabs; the role filter offers only the tab's own types.
 */
export const TAB_COACH_TYPES: Record<InstructorTab, CoachType[]> = {
  studio: ['instructor'],
  pt: ['trainer', 'body_care_therapist'],
};

type ListQuery = NonNullable<AdminTrainerControllerListData['query']>;
export type BrandGroup = NonNullable<ListQuery['brandGroup']>;

export const BRAND_GROUP_OPTIONS: { value: BrandGroup; label: string }[] = [
  { value: 'JOYFIT', label: 'JOYFIT' },
  { value: 'FIT365', label: 'FIT365' },
];

/** The badge each brand group is drawn with (the group's flagship brand) */
export const BRAND_GROUP_BADGE: Record<BrandGroup, BrandEnumValue> = {
  JOYFIT: 'Joyfit',
  FIT365: 'Fit365',
};

/** `derivedBrands` (the brands of the trainer's schedule stores) folded into JOYFIT / FIT365 (D3) */
export function brandGroupsOf(brands: readonly BrandEnumValue[]): BrandGroup[] {
  const groups = new Set<BrandGroup>(brands.map((b) => (b === 'Fit365' ? 'FIT365' : 'JOYFIT')));
  return BRAND_GROUP_OPTIONS.map((o) => o.value).filter((g) => groups.has(g));
}

export const INSTRUCTOR_PAGE_SIZE = 50;

/** Table column → API `sort`. Ids are UUID v7, so creation order is id order (D5). */
export const SORT_KEY_BY_COLUMN: Partial<Record<string, ListQuery['sort']>> = {
  id: 'createdAt',
  name: 'lastName',
};

export interface InstructorListParams {
  tab: InstructorTab;
  search: string;
  role: string;
  brand: string;
  status: string;
  sort_by: string;
  sort_order: string;
  page: number;
}

const isCoachType = (value: string): value is CoachType => value in COACH_TYPE_LABELS;
const isBrandGroup = (value: string): value is BrandGroup =>
  BRAND_GROUP_OPTIONS.some((o) => o.value === value);

/** One tab's coach types — narrowed to the role filter when it names one of the tab's types (D2) */
export function tabCoachTypes(tab: InstructorTab, role = ''): string {
  const types = TAB_COACH_TYPES[tab];
  return isCoachType(role) && types.includes(role) ? role : types.join(',');
}

/** The list's URL state → the API query. `scopeStoreId` is the header's store (null on 全店舗, D6). */
export function toInstructorListQuery(
  params: InstructorListParams,
  scopeStoreId: string | null,
): ListQuery {
  return {
    page: params.page,
    limit: INSTRUCTOR_PAGE_SIZE,
    sort: SORT_KEY_BY_COLUMN[params.sort_by] ?? 'createdAt',
    order: params.sort_order === 'desc' ? 'desc' : 'asc',
    coachTypes: tabCoachTypes(params.tab, params.role),
    ...(params.search ? { q: params.search } : {}),
    ...(scopeStoreId ? { storeId: scopeStoreId } : {}),
    ...(isBrandGroup(params.brand) ? { brandGroup: params.brand } : {}),
    ...(params.status ? { isActive: params.status === 'active' } : {}),
  };
}

/** The list conditions a tab badge counts by (UT D-04 No3); the role is the active tab's */
export type InstructorCountFilters = Pick<
  InstructorListParams,
  'search' | 'role' | 'brand' | 'status'
>;

/**
 * A one-row read whose `totalItems` is a count. A tab badge (`tab` set) counts that tab under the
 * current search and filters, so it matches what the tab lists. The header count (`tab` null, no
 * filters) asks for every coach type, so it counts exactly the people shown in either tab — a legacy
 * row without any coach type is in no tab and is not counted.
 */
export function toInstructorCountQuery(
  tab: InstructorTab | null,
  scopeStoreId: string | null,
  filters?: InstructorCountFilters,
): ListQuery {
  return {
    page: 1,
    limit: 1,
    coachTypes: tab
      ? tabCoachTypes(tab, filters?.role)
      : [...TAB_COACH_TYPES.studio, ...TAB_COACH_TYPES.pt].join(','),
    ...(filters?.search ? { q: filters.search } : {}),
    ...(scopeStoreId ? { storeId: scopeStoreId } : {}),
    ...(filters && isBrandGroup(filters.brand) ? { brandGroup: filters.brand } : {}),
    ...(filters?.status ? { isActive: filters.status === 'active' } : {}),
  };
}

// --- names ---

export function fullName(trainer: Pick<TrainerListItemDto, 'lastName' | 'firstName'>): string {
  return [trainer.lastName, trainer.firstName].filter((part) => part.trim().length > 0).join(' ');
}

export function romanizedName(
  trainer: Pick<
    TrainerDetailDto,
    'lastNameRomanized' | 'firstNameRomanized' | 'middleNameRomanized'
  >,
): string {
  return [trainer.lastNameRomanized, trainer.firstNameRomanized, trainer.middleNameRomanized]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join(' ');
}

// --- permissions ---

/** `editableFields` (§5.1): `["*"]` means every field (D13) */
export function canEditField(editableFields: readonly string[], field: string): boolean {
  return editableFields.includes('*') || editableFields.includes(field);
}

// --- form ↔ body ---

export function instructorToFormValues(detail: TrainerDetailDto): InstructorFormValues {
  return {
    lastName: detail.lastName,
    firstName: detail.firstName,
    romajiLastName: detail.lastNameRomanized ?? '',
    romajiFirstName: detail.firstNameRomanized ?? '',
    nickname: detail.nickname ?? '',
    roleClassifications: detail.coachTypes,
    profileText: detail.bio ?? '',
    instructingHistory: detail.careerHistory ?? '',
    facePhotoS3Key: detail.facePhotoS3Key,
    photoUrl: detail.facePhotoUrl,
    minBookingLeadHours: detail.minBookingHours as InstructorFormValues['minBookingLeadHours'],
    preBufferMinutes: detail.bufferBeforeMin as InstructorFormValues['preBufferMinutes'],
    postBufferMinutes: detail.bufferAfterMin as InstructorFormValues['postBufferMinutes'],
    crmAccountLinkStaffId: detail.linkedStaff?.id ?? detail.staffId,
    crmAccountLinkStaffName: detail.linkedStaff?.name ?? null,
  };
}

const orNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** Every writable field the form holds, in the API's names */
function formValuesToFields(values: InstructorFormValues) {
  return {
    lastName: values.lastName.trim(),
    firstName: values.firstName.trim(),
    lastNameRomanized: orNull(values.romajiLastName),
    firstNameRomanized: orNull(values.romajiFirstName),
    nickname: orNull(values.nickname),
    coachTypes: values.roleClassifications,
    bio: orNull(values.profileText),
    careerHistory: orNull(values.instructingHistory),
    facePhotoS3Key: values.facePhotoS3Key ?? null,
    minBookingHours: values.minBookingLeadHours,
    bufferBeforeMin: values.preBufferMinutes,
    bufferAfterMin: values.postBufferMinutes,
    staffId: values.crmAccountLinkStaffId ?? null,
  } satisfies CreateTrainerBodyDto;
}

export function formValuesToCreateBody(values: InstructorFormValues): CreateTrainerBodyDto {
  return formValuesToFields(values);
}

type TrainerFields = ReturnType<typeof formValuesToFields>;
type TrainerField = keyof TrainerFields;

const sameValue = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((v, i) => v === b[i])
    : a === b;

/**
 * The fields that differ from the detail the form was opened with, limited to what the caller may
 * edit, plus the optimistic lock (D13). `coachTypes` compares as a set: re-ticking the same roles in
 * another order is no change.
 */
function changedFields(
  values: InstructorFormValues,
  detail: TrainerDetailDto,
): Partial<TrainerFields> {
  const next = formValuesToFields(values);
  const current: Record<TrainerField, unknown> = {
    lastName: detail.lastName,
    firstName: detail.firstName,
    lastNameRomanized: detail.lastNameRomanized,
    firstNameRomanized: detail.firstNameRomanized,
    nickname: detail.nickname,
    coachTypes: [...detail.coachTypes].sort(),
    bio: detail.bio,
    careerHistory: detail.careerHistory,
    facePhotoS3Key: detail.facePhotoS3Key,
    minBookingHours: detail.minBookingHours,
    bufferBeforeMin: detail.bufferBeforeMin,
    bufferAfterMin: detail.bufferAfterMin,
    staffId: detail.staffId,
  };
  const changed: Partial<TrainerFields> = {};
  for (const key of Object.keys(next) as TrainerField[]) {
    if (!canEditField(detail.editableFields, key)) continue;
    const value = key === 'coachTypes' ? [...next.coachTypes].sort() : next[key];
    if (!sameValue(value, current[key])) Object.assign(changed, { [key]: next[key] });
  }
  return changed;
}

export function formValuesToUpdateBody(
  values: InstructorFormValues,
  detail: TrainerDetailDto,
): UpdateTrainerBodyDto {
  const changed = changedFields(values, detail);
  // The form has no primary-role input and a coachTypes write without one clears it (BR-TRN-008):
  // the held primary rides along while it is still in the set (dropped with its role otherwise)
  const held = detail.primaryCoachType;
  const primary =
    changed.coachTypes && held && changed.coachTypes.includes(held)
      ? { primaryCoachType: held }
      : {};
  return { ...changed, ...primary, expectedUpdatedAt: detail.updatedAt };
}

/** `PATCH /trainers/me` takes the self-editable fields only (anything else is 403 E-TRN-101) */
export function formValuesToUpdateMeBody(
  values: InstructorFormValues,
  detail: TrainerDetailDto,
): UpdateMyTrainerBodyDto {
  return {
    ...(changedFields(values, detail) as UpdateMyTrainerBodyDto),
    expectedUpdatedAt: detail.updatedAt,
  };
}

// --- errors ---

/** Trainer error codes the UI reacts to specifically (API-109 §9, D19) */
export const INSTRUCTOR_ERROR_CODE = {
  /** 404 — unknown, deleted or outside the caller's scope */
  notFound: 'E-TRN-001',
  /** 409 — the CRM account is already linked to another trainer */
  staffAlreadyLinked: 'E-TRN-004',
  /** 409 — `expectedUpdatedAt` is stale: edited elsewhere meanwhile */
  stale: 'E-TRN-012',
  /** 403 — role not allowed */
  forbidden: 'E-TRN-101',
} as const;

// --- cache ---

const parameterisedInstructorQueryIds = lazyQueryIds(() => [
  adminTrainerControllerDetailQueryKey({ path: { trainerId: '' } }),
  adminTrainerControllerSummaryQueryKey({ path: { trainerId: '' } }),
  adminTrainerControllerHistoryQueryKey({ path: { trainerId: '' } }),
]);

/** Everything a trainer write can change on screen: every list, and any trainer's detail reads */
export function invalidateInstructorQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: adminTrainerControllerListQueryKey() });
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const [key] = query.queryKey as [{ _id?: unknown } | undefined];
      return typeof key?._id === 'string' && parameterisedInstructorQueryIds().has(key._id);
    },
  });
}
