import { z } from 'zod';

import type { CreatePositionDto, PositionDto, UpdatePositionDto } from '@/lib/api-real/types.gen';

import {
  CSV_DEFAULTS_BY_ROLE,
  type PositionRole,
} from '../_constants/position-permissions.constant';
import { POSITION_NAME_MAX_LENGTH, POSITION_ROLE_VALUES } from '../_constants/position.constants';
import { toCreatePositionBody, toUpdatePositionBody } from '../_utils/position-api.util';
import {
  type PositionPermissionState,
  buildEmptyPermissions,
  permissionMapFromPositionDto,
} from '../_utils/position-permission.util';

/** `CreatePositionDto.description` is capped at 500 chars server-side */
export const POSITION_DESCRIPTION_MAX_LENGTH = 500;

export const positionFormSchema = z.object({
  // Field name follows the DTO (`CreatePositionDto.name`) so setError and the
  // request body share one name (decision D2).
  // BE: `maxLength: 100`, required. The server declares no minimum, but FR-015
  // requires a non-blank name, so the FE is deliberately stricter here.
  name: z
    .string()
    .trim()
    .min(1, '職位名を入力してください')
    .max(POSITION_NAME_MAX_LENGTH, `職位名は${POSITION_NAME_MAX_LENGTH}文字以内で入力してください`),
  // BE: `enum` of the 6 `crm_role` values. Was `z.string().min(1)`, which accepted
  // any string and left the rejection to the server (E-VAL-001). Kept as a `string`
  // field (not `z.enum`) so the unselected initial state `''` stays representable,
  // with the enum membership enforced by the refine — which is also what makes the
  // `as PositionRole` cast in the body mappers below sound.
  role: z
    .string()
    .min(1, '対象ロールを選択してください')
    .refine((value) => (POSITION_ROLE_VALUES as readonly string[]).includes(value), {
      error: '対象ロールを選択してください',
    }),
  description: z
    .string()
    .max(
      POSITION_DESCRIPTION_MAX_LENGTH,
      `説明は${POSITION_DESCRIPTION_MAX_LENGTH}文字以内で入力してください`,
    )
    .optional(),
  // Open map keyed by the catalog's `permissionKey` — the FE declares no key
  // list, the server catalog decides which toggles exist (round 2).
  permissions: z.record(z.string(), z.boolean()),
});

export type PositionFormValues = z.infer<typeof positionFormSchema>;

/**
 * FR-011: CSV出力管理のロール別デフォルトを適用したマップを返す（他カテゴリは不変）。
 * 対象キーはカタログの CSV出力管理 カテゴリから渡される（FE では定義しない）。
 */
export function applyCsvRoleDefaults(
  permissions: PositionPermissionState,
  role: string,
  csvKeys: readonly string[],
): PositionPermissionState {
  const csvDefault = CSV_DEFAULTS_BY_ROLE[role as PositionRole] ?? false;
  const next = { ...permissions };
  for (const key of csvKeys) {
    next[key] = csvDefault;
  }
  return next;
}

export function createEmptyPositionFormValues(): PositionFormValues {
  return {
    name: '',
    role: '',
    description: '',
    permissions: buildEmptyPermissions(),
  };
}

/** Edit prefill (FR-012); clone prefill keeps the name blank per V0 (FR-013) */
export function mapPositionToFormValues(
  position: PositionDto,
  options?: { blankName?: boolean },
): PositionFormValues {
  return {
    name: options?.blankName ? '' : position.name,
    role: position.role,
    description: position.description ?? '',
    permissions: permissionMapFromPositionDto(position),
  };
}

export function mapFormValuesToCreateBody(values: PositionFormValues): CreatePositionDto {
  return toCreatePositionBody({
    name: values.name,
    role: values.role as PositionRole,
    description: values.description,
    permissions: values.permissions,
  });
}

/**
 * react-hook-form の `dirtyFields` 形。`permissions` はキーごとの真偽値マップに
 * なるため、1 つでも true なら「権限が変更された」とみなす。
 */
type PositionFormDirtyFields = {
  name?: boolean;
  description?: boolean;
  permissions?: Partial<Record<string, boolean>>;
};

/**
 * PATCH body — role is immutable and therefore never included (Clarification Q3).
 * `dirtyFields` を渡すと変更項目だけの部分 PATCH になる（省略＝据え置き）。
 */
export function mapFormValuesToUpdateBody(
  values: PositionFormValues,
  dirtyFields?: PositionFormDirtyFields,
): UpdatePositionDto {
  const input = {
    name: values.name,
    role: values.role as PositionRole,
    description: values.description,
    permissions: values.permissions,
  };

  if (!dirtyFields) return toUpdatePositionBody(input);

  return toUpdatePositionBody(input, {
    name: dirtyFields.name === true,
    description: dirtyFields.description === true,
    permissions: Object.values(dirtyFields.permissions ?? {}).some(Boolean),
  });
}
