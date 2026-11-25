import type { RegisterDomainMasterDto, UpdateDomainMasterDto } from '@/lib/api-real/types.gen';

import type { DomainFormValues } from '../_schemas/domain-form.schema';

/** Domain master error codes the UI reacts to specifically (integration-plan.md decision D6) */
export const DOMAIN_ERROR_CODE = {
  /** 409 — duplicate domain string on register or edit */
  duplicateDomain: 'E-DMN-001',
  /** 404 — the domain master record does not exist */
  notFound: 'E-DMN-002',
  /** 409 — delete refused because active staff are still attached (FR-013) */
  deleteBlockedByStaff: 'E-DMN-004',
  /** 409 — domain / authProvider change refused because active staff are still attached */
  editBlockedByStaff: 'E-DMN-005',
} as const;

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors */
export function getDomainErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

export function toRegisterDomainBody(values: DomainFormValues): RegisterDomainMasterDto {
  return {
    name: values.name.trim(),
    domain: values.domain.trim().toLowerCase(),
    authProvider: values.authProvider,
  };
}

/**
 * PATCH takes every field as optional but rejects an empty body (400 E-VAL-001), and treats a
 * field carrying the current value as a no-op rather than a change — so the whole form is sent
 * back as-is. That also keeps a staff-attached domain editable: only 管理名 can actually differ
 * there, and the unchanged `domain`/`authProvider` do not trip the E-DMN-005 guard.
 */
export function toUpdateDomainBody(values: DomainFormValues): UpdateDomainMasterDto {
  return {
    name: values.name.trim(),
    domain: values.domain.trim().toLowerCase(),
    authProvider: values.authProvider,
  };
}
