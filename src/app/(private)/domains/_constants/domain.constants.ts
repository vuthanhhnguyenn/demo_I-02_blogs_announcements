import type { DomainMasterSummaryDto } from '@/lib/api-real/types.gen';

export const DOMAIN_AUTH_METHOD_LABELS: Record<DomainMasterSummaryDto['authProvider'], string> = {
  google: 'Google SSO',
  cognito: 'IDaaS',
};

/**
 * The list endpoint clamps `limit` to 1–100, so the picker stops at 100 — a larger value would be
 * silently reduced server-side and leave the pager counting pages that never load.
 */
export const DOMAIN_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DOMAIN_DEFAULT_PAGE_SIZE = 50;

/** `search` is capped at 100 characters by the list endpoint (400 E-VAL-001 above it) */
export const DOMAIN_SEARCH_MAX_LENGTH = 100;

/** 管理名 (`RegisterDomainMasterDto.name` / `UpdateDomainMasterDto.name`) — API max */
export const DOMAIN_NAME_MAX_LENGTH = 100;

/**
 * ドメイン (`RegisterDomainMasterDto.domain` / `UpdateDomainMasterDto.domain`) — API max per 認証方式
 * (API-071 v0.6 §6.5.2). Each is that route's email limit minus 2, so the shortest staff address
 * `a@<domain>` still fits: Google SSO 254 → 252, IDaaS (Cognito) 128 → 126. Over it the API answers
 * `400 E-VAL-001 { field: "domain", code: "too_long" }` (Y-01 Bug No.26).
 */
export const DOMAIN_STRING_MAX_LENGTH_BY_AUTH_PROVIDER: Record<
  DomainMasterSummaryDto['authProvider'],
  number
> = {
  google: 252,
  cognito: 126,
};

/** Input cap before an 認証方式 is chosen — the larger of the two, so nothing valid is cut off */
export const DOMAIN_STRING_MAX_LENGTH = Math.max(
  ...Object.values(DOMAIN_STRING_MAX_LENGTH_BY_AUTH_PROVIDER),
);

/** Page size for the detail sheet's 紐づくスタッフ list — the rest loads on scroll */
export const DOMAIN_LINKED_STAFF_PAGE_SIZE = 20;
