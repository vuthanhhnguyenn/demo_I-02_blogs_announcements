import type { BrandEnumValue } from '@/components/common/brand-badge';

import type { AdminQuestionnaireControllerListData } from '@/lib/api-real/types.gen';

type QuestionnaireListSort = NonNullable<
  NonNullable<AdminQuestionnaireControllerListData['query']>['sort']
>;

/**
 * List URL sort keys (発動トリガー / ブランド are not sortable) → real `sort` of GET /admin/questionnaires.
 * No key is the default: the list then sends no `sort` / `order` and the API orders by `createdAt` desc
 * (newest survey first).
 */
export const SURVEY_SORT_PARAMS = {
  id: 'code',
  name: 'name',
  type: 'category',
  question_count: 'questionCount',
  response_count: 'responseCount',
  response_rate: 'responseRatePct',
  last_response_date: 'lastAnsweredAt',
  status: 'status',
} as const satisfies Record<string, QuestionnaireListSort>;

export const SURVEY_SORT_FIELDS = Object.keys(SURVEY_SORT_PARAMS) as SurveySortField[];

/** Prototype default page size (survey-list.tsx useState(50)); options stay API_PAGE_SIZE_OPTIONS (25/50/100). */
export const SURVEY_DEFAULT_PAGE_SIZE = 50;

export type SurveySortField = keyof typeof SURVEY_SORT_PARAMS;

/** 種別 offered by the list and responses filters (prototype): `counseling` rows still show under すべての種別. */
export const SURVEY_FILTER_CATEGORIES = ['lifecycle', 'operational'] as const;
export type SurveyFilterCategory = (typeof SURVEY_FILTER_CATEGORIES)[number];

/** Real `category` of the cross-questionnaire response list (`counseling` is not in the prototype; its label is ours). */
export const SURVEY_RESPONSE_CATEGORIES = ['lifecycle', 'operational', 'counseling'] as const;
export type SurveyResponseCategory = (typeof SURVEY_RESPONSE_CATEGORIES)[number];

export const SURVEY_RESPONSE_CATEGORY_LABELS: Record<SurveyResponseCategory, string> = {
  lifecycle: 'ライフサイクル',
  operational: 'オペレーション',
  counseling: 'カウンセリング',
};

export const SURVEY_RESPONSE_CATEGORY_BADGE_CLASSES: Record<SurveyResponseCategory, string> = {
  lifecycle: 'bg-info/15 text-info border-info/20',
  operational: 'bg-warning/15 text-warning border-warning/20',
  // Neutral tone: the prototype styles only its two types, and green already means 回答完了.
  counseling: 'bg-muted text-muted-foreground border-border',
};

/** Real questionnaire `status` (`inactive` is the off switch — there is no delete). */
export type SurveyRealStatus = 'active' | 'inactive';

export const SURVEY_REAL_STATUS_LABELS: Record<SurveyRealStatus, string> = {
  active: '有効',
  inactive: '無効',
};

export const SURVEY_REAL_STATUS_BADGE_CLASSES: Record<SurveyRealStatus, string> = {
  active: 'bg-success/15 text-success border-success/20',
  inactive: 'bg-card text-muted-foreground border-border',
};

/** Real question `format` values (`rating` is the star rating of FR-S002). */
export const SURVEY_REAL_QUESTION_FORMAT_LABELS: Record<string, string> = {
  single_choice: '選択式（単一）',
  multiple_choice: '選択式（複数）',
  free_text: '自由記述',
  rating: '評価（星）',
};

/** 完了 / 未完了 / 辞退 / 回答中 (qa-147) — derived from `isComplete` + `responseStatus`. */
export type SurveyResponseRowStatus = 'completed' | 'partial' | 'declined' | 'in_progress';

export const SURVEY_RESPONSE_ROW_STATUS_LABELS: Record<SurveyResponseRowStatus, string> = {
  completed: '完了',
  partial: '未完了',
  declined: '辞退',
  in_progress: '回答中',
};

/**
 * A response's `store.brandEnum` comes from the store master, spelt `JOYFIT` / `FIT365`, while
 * `BrandBadge` reads the questionnaire spelling (`Joyfit`); both spellings map to the latter.
 */
const STORE_BRAND_TO_BRAND_ENUM: Record<string, BrandEnumValue> = {
  JOYFIT: 'Joyfit',
  FIT365: 'Fit365',
  JOYFIT24: 'Joyfit24',
  JOYFIT_YOGA: 'JoyfitYoga',
  JOYFIT_PLUS: 'JoyfitPlus',
};

export function toSurveyBrandEnum(value: string | null | undefined): BrandEnumValue | null {
  if (!value) return null;
  return STORE_BRAND_TO_BRAND_ENUM[value] ?? (value as BrandEnumValue);
}

/** Shared by the response list and the response detail — both DTOs carry these two fields. */
export function getSurveyResponseRowStatus(response: {
  responseStatus: string;
  isComplete: boolean;
}): SurveyResponseRowStatus {
  if (response.responseStatus === 'declined') return 'declined';
  if (response.responseStatus === 'in_progress') return 'in_progress';
  return response.isComplete ? 'completed' : 'partial';
}

export function formatSurveyMemberName(member: {
  lastName: string | null;
  firstName: string | null;
}): string {
  return [member.lastName, member.firstName].filter(Boolean).join(' ') || '—';
}

export const SURVEY_RESPONSE_ROW_STATUS_BADGE_CLASSES: Record<SurveyResponseRowStatus, string> = {
  completed: 'bg-card text-muted-foreground border-border',
  partial: 'bg-warning/15 text-warning border-warning/20',
  declined: 'bg-card text-muted-foreground border-border',
  in_progress: 'bg-info/15 text-info border-info/20',
};
