import {
  PLAN_LIMIT_OF_SEX_LABELS,
  type PlanLimitOfSex,
} from '@/app/(private)/contracts/_constants/constants';

import type { AdminStoreSettingsControllerListPlansData } from '@/lib/api-real/types.gen';

import { AREA_SUBJECT_LABELS, type AreaSubject } from '../_constants/area.constants';

/** `memberGender` of the sale-candidate lists (store plans / options, store campaigns). */
export type MemberGenderFilter = NonNullable<
  NonNullable<AdminStoreSettingsControllerListPlansData['query']>['memberGender']
>;

const MEMBER_GENDERS: readonly string[] = ['male', 'female', 'other', 'prefer_not_to_say'];

/** A member's / applicant's gender as the list filter: `unset` when none is on file (meets no condition). */
export function toMemberGenderFilter(gender: string | null | undefined): MemberGenderFilter {
  return gender && MEMBER_GENDERS.includes(gender) ? (gender as MemberGenderFilter) : 'unset';
}

/**
 * Who a plan / option may be sold or granted to, by gender (E-02 FR-016, G-01 FR-M002, G-02 FR-002).
 * The API answers it per plan / option as `genderCondition` (`StorePlanDto`, `StoreOptionDto`,
 * `PlanListItemDto`, `StoreCampaignDto.planGenderCondition`): the areas' gender conditions folded with
 * a plan's 性別制限. 「女性のみ」 admits only `female`; other, prefer_not_to_say and an unset gender
 * meet neither condition, and `nobody` (both conditions at once) admits no one.
 *
 * Candidate lists are filtered by the API (`memberGender`, see {@link toMemberGenderFilter}); this
 * rule is only re-judged here for an item already picked, where the answer is needed instantly.
 */
export function canSellToGender(
  sellable: string | null | undefined,
  memberGender: string | null | undefined,
): boolean {
  switch (sellable) {
    case undefined:
    case null:
    case 'none':
      return true;
    case 'female_only':
      return memberGender === 'female';
    case 'male_only':
      return memberGender === 'male';
    default:
      return false;
  }
}

type RequiredGender = 'female' | 'male';

const REQUIRED_GENDER_LABELS: Record<RequiredGender, string> = { female: '女性', male: '男性' };

/** The gender a set of area conditions requires, both at once, or none. */
export type AreaGenderEffect =
  | { kind: 'none' }
  | { kind: 'only'; gender: RequiredGender }
  | { kind: 'conflict' };

export function getAreaGenderEffect(conditions: readonly string[]): AreaGenderEffect {
  const hasFemale = conditions.includes('female_only');
  const hasMale = conditions.includes('male_only');
  if (hasFemale && hasMale) return { kind: 'conflict' };
  if (hasFemale) return { kind: 'only', gender: 'female' };
  if (hasMale) return { kind: 'only', gender: 'male' };
  return { kind: 'none' };
}

type AreaWithCondition = { genderCondition: string };

/** The result line when the areas carry a gender condition (null otherwise, or on a conflict). */
export function areaResultLine(
  subject: AreaSubject,
  areas: readonly AreaWithCondition[],
): string | null {
  const effect = getAreaGenderEffect(areas.map((a) => a.genderCondition));
  if (effect.kind !== 'only') return null;
  const gender = REQUIRED_GENDER_LABELS[effect.gender];
  return `${gender}のみのエリアを含むため、この${AREA_SUBJECT_LABELS[subject]}は${gender}の会員にだけ販売・付与されます（アプリ・CRM とも）`;
}

/** The form speaks of the areas being picked, the read-out of the areas the record holds. */
const CONFLICT_VERBS = { form: '選んでいる', readout: '含む' } as const;

/**
 * Combinations nobody can be sold: 女性のみ and 男性のみ areas together, or a plan whose 性別制限
 * contradicts its areas. Same judgment for the form (warning Alert) and the read-out (grey text).
 */
export function areaConflictMessage(
  areas: readonly AreaWithCondition[],
  limitOfSex: PlanLimitOfSex | undefined,
  context: keyof typeof CONFLICT_VERBS,
): string | null {
  const effect = getAreaGenderEffect(areas.map((a) => a.genderCondition));
  if (effect.kind === 'conflict')
    return `女性のみと男性のみのエリアを両方${CONFLICT_VERBS[context]}ため、どの会員にも販売・付与できません`;
  if (
    effect.kind === 'only' &&
    (limitOfSex === 'male' || limitOfSex === 'female') &&
    limitOfSex !== effect.gender
  ) {
    return `性別制限（${PLAN_LIMIT_OF_SEX_LABELS[limitOfSex]}）と、エリアの性別の条件（${REQUIRED_GENDER_LABELS[effect.gender]}のみ）が合わないため、どの会員にも販売・付与できません`;
  }
  return null;
}
