/**
 * The single seam between the backend's `/crm/me` payload and the app's own
 * `AuthUser` model.
 *
 * Everything downstream (context, guards, RoleGated* components, sidebar) reads
 * `AuthUser` and never the generated DTO, so a backend field rename costs one
 * edit here instead of one per screen. Rules this mapper follows:
 *
 * 1. **Values are the API's.** `role` is passed through as the lowercase wire
 *    value; no re-casing (`UserRole`'s enum values are those same strings).
 * 2. **Fail closed.** An unparseable role or a flag the API stopped sending
 *    resolves to "no access", never to "granted".
 * 3. **No `undefined` downstream.** Every known flag is always present as a boolean,
 *    so callers never have to distinguish "false" from "missing".
 */
import type { CrmMeResponseDto, PositionDto } from '@/lib/api-real/types.gen';

import {
  type AuthUser,
  STAFF_PERMISSION_FLAGS,
  type StaffPermissionFlag,
  type StaffPermissionFlagSet,
  UserRole,
  parseUserRole,
} from '@/types/permission.type';

/** Every flag `false` — the baseline a partial payload is merged onto. */
function noFlags(): Record<StaffPermissionFlag, boolean> {
  return Object.fromEntries(STAFF_PERMISSION_FLAGS.map((flag) => [flag, false])) as Record<
    StaffPermissionFlag,
    boolean
  >;
}

/** `canViewMember` → `can_view_member`. */
function toSnakeCase(flag: string): string {
  return flag.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * Every spelling of a flag name this mapper accepts, keyed by the FE name.
 *
 * `/crm/me` spells its `permissions` keys in **snake_case** (`can_view_member`),
 * while `PositionDto` — the position-master endpoints — spells the same flags in
 * camelCase (`canViewMember`), which is also what the committed OpenAPI example
 * for `/crm/me` shows. Accepting both here is what keeps a casing change on
 * either endpoint from silently reading as "no permissions granted": the flags
 * are `Record<string, boolean>` on the wire, so nothing else — not the generated
 * types, not the compile-time drift guard below — can catch it.
 */
const FLAG_ALIASES: ReadonlyArray<readonly [StaffPermissionFlag, string]> =
  STAFF_PERMISSION_FLAGS.map((flag) => [flag, toSnakeCase(flag)] as const);

/**
 * Resolves the raw `{ [key: string]: boolean }` map into a complete flag set.
 * Unknown keys are dropped (the backend may add flags before the FE knows them);
 * known keys the payload omits stay `false`.
 */
export function toStaffPermissionFlags(
  raw: CrmMeResponseDto['permissions'] | null | undefined,
): StaffPermissionFlagSet {
  const flags = noFlags();
  if (!raw) return flags;

  for (const [flag, snake] of FLAG_ALIASES) {
    flags[flag] = raw[flag] === true || raw[snake] === true;
  }
  return flags;
}

/**
 * Flags the backend sent that this FE build has no name for. Not used for
 * authorization — surfaced only so a schema drift is visible in dev instead of
 * silently narrowing what the UI offers. Recognises both spellings the API uses
 * (see `FLAG_ALIASES`), so a snake_case payload is not reported as 58 unknowns.
 */
export function findUnknownPermissionFlags(
  raw: CrmMeResponseDto['permissions'] | null | undefined,
): string[] {
  if (!raw) return [];
  const known = new Set<string>(FLAG_ALIASES.flat());
  return Object.keys(raw).filter((key) => !known.has(key));
}

/** Maps the `/crm/me` response onto the app's `AuthUser`. */
export function toAuthUser(dto: CrmMeResponseDto): AuthUser {
  return {
    id: dto.staffId,
    staffId: dto.staffId,
    name: dto.name,
    nameKana: dto.nameKana,
    email: dto.email,
    // An unrecognised role must not read as a privileged one. Observer is the
    // most restricted role in the matrix, so it is the safe landing spot.
    role: parseUserRole(dto.role) ?? UserRole.Observer,
    positionId: dto.position?.positionId ?? '',
    positionName: dto.position?.name ?? '',
    storeId: dto.storeId,
    storeCode: dto.storeCode,
    storeName: dto.storeName,
    fcCompanyId: dto.fcCompanyId,
    stores: dto.stores ?? [],
    // Not part of the /crm/me contract — see the field's doc comment.
    managedStoreIds: [],
    flags: toStaffPermissionFlags(dto.permissions),
  };
}

// ---------------------------------------------------------------------------
// Contract drift guard (compile-time only)
// ---------------------------------------------------------------------------
/**
 * Flags a live `/crm/me` returns that the committed `openapi.real.json` does not
 * declare on `PositionDto` yet. Empty since the 2026-10-09 schema, which declares the
 * seven flags first observed live on 2026-08-26 (the API then sent 58, the schema 51).
 *
 * This list is the *documented* part of that drift. Keeping it explicit — rather
 * than loosening the guard below — means a typo in a newly added flag is still a
 * compile error, while a genuinely-ahead-of-schema flag is allowed and visible.
 * Delete entries from here as `npm run generate-api-real` picks them up.
 */
type FlagsAheadOfSchema = never;

/**
 * `CrmMeResponseDto.permissions` is typed as `Record<string, boolean>`, so the
 * flag *names* are unchecked there — but `PositionDto` carries them as real
 * properties. Diffing the two lists turns a schema change into a compile error
 * instead of a silently-ignored flag.
 *
 * If this stops compiling, `npm run generate-api-real` changed the flag set:
 * reconcile `STAFF_PERMISSION_FLAGS` (and `PERMISSION_FLAG_RULES`) with the new
 * `PositionDto`, and trim `FlagsAheadOfSchema`.
 *
 * Note this only catches drift against the *committed* schema. Drift against the
 * *running* API is caught at runtime by `findUnknownPermissionFlags`, which
 * `useCurrentUser` logs in development — that is how the seven flags once listed
 * above were found.
 */
type ApiFlagKey = Extract<keyof PositionDto, `can${string}`>;
type FlagsMissingFromFe = Exclude<ApiFlagKey, StaffPermissionFlag>;
type FlagsUnknownToApi = Exclude<StaffPermissionFlag, ApiFlagKey | FlagsAheadOfSchema>;

export const STAFF_PERMISSION_FLAGS_MATCH_API: [FlagsMissingFromFe, FlagsUnknownToApi] extends [
  never,
  never,
]
  ? true
  : never = true;
