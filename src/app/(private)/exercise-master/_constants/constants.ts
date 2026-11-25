import type {
  ExerciseTypeMasterDto,
  ExplanationMasterDto,
  NamedRefMasterDto,
  ToolTypeDto,
} from '@/lib/api-real/types.gen';

export type TabKey = 'category' | 'muscle' | 'tool' | 'exercise_type' | 'tag' | 'explanation';
export type FormMode = 'create' | 'edit';

/** The columns every reference master shares. */
type MasterRowFields =
  | 'id'
  | 'code'
  | 'description'
  | 'sortOrder'
  | 'isActive'
  | 'referenceCount'
  | 'updatedAt';

export type ExerciseMasterRow =
  | Pick<NamedRefMasterDto, MasterRowFields | 'name'>
  | Pick<ExerciseTypeMasterDto, MasterRowFields | 'name'>
  | Pick<ToolTypeDto, MasterRowFields | 'name' | 'isSystem'>
  /** 用語解説 (FR-017) names its entry `term`. */
  | Pick<ExplanationMasterDto, MasterRowFields | 'term'>;

/**
 * System-fixed row (器具種別 「なし（自重）」, `code=none`): the BE answers PATCH / DELETE with
 * 422 E-EXM-011, so the screen shows it read-only.
 */
export function isSystemMasterRow(row: ExerciseMasterRow) {
  return 'isSystem' in row && row.isSystem;
}

export const SYSTEM_MASTER_ROW_MESSAGE = 'システム固定のデータのため、編集・削除できません';

export function getMasterRowName(row: ExerciseMasterRow) {
  return 'term' in row ? row.term : row.name;
}

/** Spec order (Y-08 L69): カテゴリ・筋肉部位・器具種別・エクササイズタイプ・タグ・用語解説. */
export const TAB_ORDER: TabKey[] = [
  'category',
  'muscle',
  'tool',
  'exercise_type',
  // TODO(phase2) — タグ and 用語解説 tabs are phase 2 (hidden in phase 1).
  // 'tag',
  // 'explanation',
];

interface TabMeta {
  label: string;
  /** Label of the `name` field (用語解説 → 用語, decision D21). */
  nameLabel: string;
  /** Label of the name input in the create/edit dialog (prototype: 名称（日本語）). */
  nameFieldLabel: string;
  codePlaceholder: string;
  /** The glossary requires its explanation text; the other masters do not. */
  descriptionRequired: boolean;
  /** No create / edit / delete in the CRM — the rows are listed and searched only. */
  readOnly?: boolean;
  /** `false`: every row on one page, no pagination footer. */
  paginated?: boolean;
}

export const TAB_META: Record<TabKey, TabMeta> = {
  category: {
    label: 'カテゴリ',
    nameLabel: '名称',
    nameFieldLabel: '名称（日本語）',
    codePlaceholder: '半角英数字（例: lowerBody）',
    descriptionRequired: false,
  },
  muscle: {
    label: '筋肉部位',
    nameLabel: '名称',
    nameFieldLabel: '名称（日本語）',
    codePlaceholder: '半角英数字（例: midChest）',
    descriptionRequired: false,
  },
  tool: {
    label: '器具種別',
    nameLabel: '名称',
    nameFieldLabel: '名称（日本語）',
    codePlaceholder: '半角英数字（例: barbell）',
    descriptionRequired: false,
  },
  exercise_type: {
    label: 'エクササイズタイプ',
    nameLabel: '名称',
    nameFieldLabel: '名称（日本語）',
    codePlaceholder: '半角英数字（例: weightReps）',
    descriptionRequired: false,
  },
  tag: {
    label: 'タグ',
    nameLabel: '名称',
    nameFieldLabel: '名称（日本語）',
    codePlaceholder: '半角英数字（例: gripWidth.wide）',
    descriptionRequired: false,
    // TODO(round3) R303 — phase 1 tags are seed data only (PO 2026-10-20, BE_REQUEST No.7, D24):
    // the tab lists and searches; create / edit / delete come back in phase 2.
    readOnly: true,
  },
  explanation: {
    label: '用語解説',
    nameLabel: '用語',
    nameFieldLabel: '用語',
    codePlaceholder: '半角英大文字（例: ROM）',
    descriptionRequired: true,
  },
};

export function toLabel(isActive: boolean) {
  return isActive ? '有効' : '無効';
}

export function toStatusBadgeClass(isActive: boolean) {
  return isActive
    ? 'border-success/20 bg-success/15 text-success'
    : 'border-border bg-muted text-muted-foreground';
}
