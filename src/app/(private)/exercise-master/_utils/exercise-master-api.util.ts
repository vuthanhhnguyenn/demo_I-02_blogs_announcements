import type {
  CreateExplanationMasterDto,
  CreateRefBaseDto,
  CreateToolTypeDto,
  UpdateExplanationMasterDto,
  UpdateRefBaseDto,
  UpdateToolTypeDto,
} from '@/lib/api-real/types.gen';

import type { ExerciseMasterFormSubmitValues } from '../_schemas/exercise-master-form.schema';

/** Error codes the master screen reacts to (decision D16). */
export const EXERCISE_MASTER_ERROR_CODE = {
  /** 409 — the code already exists */
  codeExists: 'E-EXM-008',
} as const;

/** Reads `ErrorResponseDto.code` off a thrown API error; undefined for transport errors. */
export function getExerciseMasterErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** POST body — shared by categories / muscles / exercise types / tags (same base shape). */
export function toCreateMasterBody(values: ExerciseMasterFormSubmitValues): CreateRefBaseDto {
  return {
    code: values.code,
    name: values.name,
    description: values.description || null,
    sortOrder: Number(values.sortOrder),
  };
}

/** PATCH body — `code` is immutable (E-EXM-007) and never sent. */
export function toUpdateMasterBody(values: ExerciseMasterFormSubmitValues): UpdateRefBaseDto {
  return {
    name: values.name,
    description: values.description || null,
    sortOrder: Number(values.sortOrder),
  };
}

/**
 * 器具種別 (gate-svc `mst_tools`, E-03) bodies — the training-side ref masters were fixed by
 * BE_REQUEST No.19, but the tool-type DTOs still declare `description` nullable without a type, so
 * codegen types it `{ [key: string]: unknown } | null` while the API stores a plain string.
 *
 * TODO(round2) B13 — the single cast for that defect; drop it once the gate DTO is typed (R211).
 */
export function toCreateToolTypeBody(values: ExerciseMasterFormSubmitValues): CreateToolTypeDto {
  return toCreateMasterBody(values) as unknown as CreateToolTypeDto;
}

export function toUpdateToolTypeBody(values: ExerciseMasterFormSubmitValues): UpdateToolTypeDto {
  return toUpdateMasterBody(values) as unknown as UpdateToolTypeDto;
}

/** 用語解説 POST body — `term` is the entry name and `description` is required (D21). */
export function toCreateExplanationBody(
  values: ExerciseMasterFormSubmitValues,
): CreateExplanationMasterDto {
  return {
    code: values.code,
    term: values.name,
    description: values.description,
    sortOrder: Number(values.sortOrder),
  };
}

/** 用語解説 PATCH body — `code` is immutable and never sent. */
export function toUpdateExplanationBody(
  values: ExerciseMasterFormSubmitValues,
): UpdateExplanationMasterDto {
  return {
    term: values.name,
    description: values.description,
    sortOrder: Number(values.sortOrder),
  };
}
