import type { PermissionCatalogResponseDto, PositionDto } from '@/lib/api-real/types.gen';

import { CSV_CATEGORY_KEY } from '../_constants/position-permissions.constant';

/**
 * The form's permission state, keyed by the catalog's `permissionKey` — the very
 * same shape the API speaks on every surface: `PositionDto.permissions`, the
 * catalog items, and the POST/PATCH `permissions` body. No FE key list is
 * involved, so a catalog change needs no FE change.
 *
 * NOTE(spec-drift 2026-09-17): this drops the compile-time key safety that
 * integration-plan D3 asked for (a 58-key literal tuple + a `PositionDto` drift
 * assertion). Trade accepted on the user's directive — the catalog is the single
 * source of truth, so a BE catalog change must NOT need an FE change. The
 * safety net moved server-side: an unknown key in a request body → E-VAL-001.
 * See spec.md → Clarifications Session 2026-09-17.
 */
export type PositionPermissionState = Record<string, boolean>;

/** Create form starting point — omitted keys default to false server-side */
export function buildEmptyPermissions(): PositionPermissionState {
  return {};
}

/** Edit / clone prefill — `GET /positions/{id}` returns the map keyed by catalog key */
export function permissionMapFromPositionDto(position: PositionDto): PositionPermissionState {
  return { ...position.permissions };
}

/** The CSV出力管理 keys, read off the catalog instead of a local list (FR-S001 / FR-011) */
export function csvPermissionKeys(
  catalog: PermissionCatalogResponseDto | undefined,
): readonly string[] {
  const csvCategory = catalog?.categories.find(
    (category) => category.categoryKey === CSV_CATEGORY_KEY,
  );
  return csvCategory?.permissions.map((permission) => permission.permissionKey) ?? [];
}
