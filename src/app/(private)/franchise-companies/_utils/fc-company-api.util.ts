import type {
  AdminFcCompanyControllerSetActiveData,
  CreateFcCompanyDto,
  UpdateFcCompanyDto,
} from '@/lib/api-real/types.gen';

import type { FranchiseCompanyFormSubmitValues } from '../_schemas/franchise-company-form.schema';

/** FC company error codes the UI reacts to specifically (decision D7) */
export const FC_COMPANY_ERROR_CODE = {
  /** 409 — the company still has (non-closed) linked stores */
  hasActiveStores: 'E-FC-001',
  /** 404 — the company does not exist or was deleted */
  notFound: 'E-FC-002',
  /** 403 — FC-manager staff reading another company */
  otherCompany: 'E-FC-003',
  /** 409 — the store is closed and cannot be linked */
  storeClosed: 'E-FC-004',
  /** 404 — the store does not exist */
  storeNotFound: 'E-FC-005',
  /** 409 — the store is not linked to this company */
  storeNotLinked: 'E-FC-006',
} as const;

const PERMISSION_DENIED_CODES = new Set<string>([
  'E-AUTH-100',
  'E-AUTH-103',
  FC_COMPANY_ERROR_CODE.otherCompany,
]);

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors */
export function getFcCompanyErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Reads the HTTP status off a thrown API error, whichever shape the client used */
function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  return undefined;
}

/** Request validation failure — on a read-by-id the only input is the path id */
const VALIDATION_ERROR_CODE = 'E-VAL-001';

/**
 * "The FC company does not exist" — accepts the documented code or a bare 404. Only the
 * read-by-id queries (detail / edit pages) use it, so a 400 E-VAL-001 there means a malformed
 * id (`/franchise-companies/abc`), which no company can match → also treated as not found.
 */
export function isFcCompanyNotFoundError(error: unknown): boolean {
  const code = getFcCompanyErrorCode(error);
  return (
    code === FC_COMPANY_ERROR_CODE.notFound ||
    code === VALIDATION_ERROR_CODE ||
    getErrorStatus(error) === 404
  );
}

/** Role / own-company scope denial (D15) — the screen renders a permission state, not a retry */
export function isFcCompanyPermissionError(error: unknown): boolean {
  const code = getFcCompanyErrorCode(error);
  return (code !== undefined && PERMISSION_DENIED_CODES.has(code)) || getErrorStatus(error) === 403;
}

function trimOrNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

type NullableBodyKey =
  | 'royaltyRate'
  | 'corporateNumber'
  | 'representativeName'
  | 'headOfficeAddress'
  | 'phone'
  | 'contactPersonName'
  | 'contactPersonPhone'
  | 'contactPersonEmail'
  | 'fcContractStartDate'
  | 'fcContractRenewalDate'
  | 'note';

type NullableBody = Pick<CreateFcCompanyDto, NullableBodyKey>;

function toNullableFields(values: FranchiseCompanyFormSubmitValues): Required<NullableBody> {
  return {
    royaltyRate: values.royaltyRate ?? null,
    corporateNumber: trimOrNull(values.corporateNumber),
    representativeName: trimOrNull(values.representativeName),
    headOfficeAddress: trimOrNull(values.headOfficeAddress),
    phone: trimOrNull(values.phone),
    contactPersonName: trimOrNull(values.contactPersonName),
    contactPersonPhone: trimOrNull(values.contactPersonPhone),
    contactPersonEmail: trimOrNull(values.contactPersonEmail),
    fcContractStartDate: values.fcContractStartDate || null,
    fcContractRenewalDate: values.fcContractRenewalDate || null,
    note: trimOrNull(values.note),
  };
}

export function toCreateFcCompanyBody(
  values: FranchiseCompanyFormSubmitValues,
): CreateFcCompanyDto {
  const legalName = values.legalName.trim();
  const displayName = values.displayName.trim();
  return {
    legalName,
    // Omitted → the server stores a copy of legalName (API-075 v0.5)
    ...(displayName ? { displayName } : {}),
    managementType: values.managementType,
    authProvider: values.authProvider,
    ...toNullableFields(values),
  };
}

/** Which form fields the user actually edited — drives the partial PATCH body (D8) */
export type FcCompanyDirtyFields = Partial<Record<keyof FranchiseCompanyFormSubmitValues, unknown>>;

function pickDirty(source: Required<NullableBody>, dirty: FcCompanyDirtyFields): NullableBody {
  const picked: NullableBody = {};
  const copy = <K extends NullableBodyKey>(key: K) => {
    if (dirty[key]) picked[key] = source[key];
  };
  (Object.keys(source) as NullableBodyKey[]).forEach(copy);
  return picked;
}

/**
 * PATCH body (every field optional, API-075 §6.2): only what the user changed, so a stale
 * tab cannot overwrite what someone else saved. Cleared fields are sent as `null`.
 */
export function toUpdateFcCompanyBody(
  values: FranchiseCompanyFormSubmitValues,
  dirty: FcCompanyDirtyFields,
): UpdateFcCompanyDto {
  const legalName = values.legalName.trim();
  const body: UpdateFcCompanyDto = {};

  if (dirty.legalName) body.legalName = legalName;
  // The API rejects an empty displayName (min 1) — clearing it means "same as legalName"
  if (dirty.displayName || dirty.legalName) {
    body.displayName = values.displayName.trim() || legalName;
  }
  if (dirty.managementType) body.managementType = values.managementType;
  // Settable but not clearable on the API — the form keeps it required
  if (dirty.authProvider) body.authProvider = values.authProvider;

  return { ...body, ...pickDirty(toNullableFields(values), dirty) };
}

type SetActiveBody = AdminFcCompanyControllerSetActiveData['body'];

/**
 * 無効化 / 有効化 body. `reason` (無効化理由) is accepted only with `isActive: false` and a
 * blank one means none, so it is sent only when deactivating with a non-empty value.
 */
export function toSetActiveBody({
  isActive,
  reason,
}: {
  isActive: boolean;
  reason?: string;
}): SetActiveBody {
  const trimmedReason = reason?.trim();
  return !isActive && trimmedReason ? { isActive, reason: trimmedReason } : { isActive };
}
