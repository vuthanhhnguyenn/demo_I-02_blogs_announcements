import type { CreatePositionDto, UpdatePositionDto } from '@/lib/api-real/types.gen';

import type { PositionRole } from '../_constants/position-permissions.constant';
import type { PositionPermissionState } from './position-permission.util';

/** Position error codes the UI reacts to specifically (decision D6) */
export const POSITION_ERROR_CODE = {
  /** 404 — the position does not exist */
  notFound: 'E-STF-009',
  /** 409 — duplicate (role, name) */
  duplicateName: 'E-STF-010',
  /** 409 — the position still has assigned staff */
  positionInUse: 'E-STF-011',
  /** 422 — system-managed positions are read-only */
  systemManaged: 'E-STF-012',
} as const;

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors */
export function getPositionErrorCode(error: unknown): string | undefined {
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

/**
 * True for "the position does not exist".
 *
 * The documented contract is `404 + E-STF-009`, but the backend currently returns
 * a 404 with no `code`, which made the screen fall through to its network-error
 * branch ("再試行" that can never succeed). Accept either signal.
 */
export function isPositionNotFoundError(error: unknown): boolean {
  return (
    getPositionErrorCode(error) === POSITION_ERROR_CODE.notFound || getErrorStatus(error) === 404
  );
}

type PositionBodyInput = {
  name: string;
  role: PositionRole;
  description?: string;
  permissions: PositionPermissionState;
};

/**
 * TODO(round2) B3 — the backend declares `description` as `type: object` with
 * `maxLength: 500`, so codegen types it `{ [key: string]: unknown } | null` even
 * though the API stores and returns a plain string (`PositionDto.description` is
 * `string | null`). This is the single cast for that defect; remove it once the
 * schema is corrected and `api-real` regenerated (backlog R202).
 */
function toDescriptionBody(description: string | undefined): CreatePositionDto['description'] {
  const trimmed = description?.trim();
  return (trimmed ? trimmed : null) as unknown as CreatePositionDto['description'];
}

export function toCreatePositionBody(values: PositionBodyInput): CreatePositionDto {
  return {
    name: values.name.trim(),
    role: values.role,
    description: toDescriptionBody(values.description),
    permissions: values.permissions,
  };
}

/** Which top-level fields the user actually edited — drives the partial PATCH body */
export type PositionDirtyFields = {
  name?: boolean;
  description?: boolean;
  permissions?: boolean;
};

/**
 * PATCH body — role is immutable and therefore never included (Clarification Q3).
 *
 * Only the fields the user actually changed are sent: the API contract is
 * "omitted = unchanged", so a full-object PATCH silently overwrites whatever
 * another tab (or another operator) saved in the meantime. `dirty` omitted
 * means "send everything", which is what a caller without dirty tracking wants.
 */
export function toUpdatePositionBody(
  values: PositionBodyInput,
  dirty?: PositionDirtyFields,
): UpdatePositionDto {
  const body: UpdatePositionDto = {};

  if (!dirty || dirty.name) body.name = values.name.trim();
  if (!dirty || dirty.description) body.description = toDescriptionBody(values.description);
  // 権限はマップ全体で送る。キー単位の部分送信はサーバー側の「省略＝据え置き」
  // 解釈が未確認のため、変更があったときだけ全 58 キーを送る。
  if (!dirty || dirty.permissions) body.permissions = values.permissions;

  return body;
}
