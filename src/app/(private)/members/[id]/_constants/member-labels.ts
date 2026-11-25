import type { MemberDetailDto } from '@/lib/api-real/types.gen';

import { REAL_MEMBER_TYPE_LABELS } from '../../_constants/constants';

/**
 * Display labels for the member-detail screen, keyed by the real API's own vocabulary.
 *
 * The shared `memberTypeLabel` / `brandLabel` / `genderLabel` helpers in `members/_constants`
 * resolve through the mock enums because screens still on the mock use them too; this screen is
 * fully on `api-real`, so it resolves here instead.
 *
 * Every helper takes a plain string: the 変更履歴 tab hands over raw history values, which the
 * API types as `unknown`. Unknown values fall through to the raw string so a new enum member
 * shows up as itself rather than as blank.
 */

type RealMemberType = MemberDetailDto['memberType'];
type RealBrandGroup = MemberDetailDto['brandGroup'];

/**
 * The store `brandEnum` vocabulary. `StoreRefDto['brandEnum']` is typed only as `string`, but the
 * store DTOs that do enumerate it spell it in these five values.
 */
type RealStoreBrand = 'Joyfit' | 'Joyfit24' | 'JoyfitYoga' | 'JoyfitPlus' | 'Fit365';

/** `MemberPersonalInfoDto['gender']` is typed only as `string`; these are the `members.gender` values. */
type RealGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

const BRAND_GROUP_LABELS: Record<RealBrandGroup, string> = {
  JOYFIT: 'JOYFIT',
  FIT365: 'FIT365',
};

const STORE_BRAND_LABELS: Record<RealStoreBrand, string> = {
  Joyfit: 'JOYFIT',
  Joyfit24: 'JOYFIT24',
  JoyfitYoga: 'JOYFIT YOGA',
  JoyfitPlus: 'JOYFIT+',
  Fit365: 'FIT365',
};

const GENDER_LABELS: Record<RealGender, string> = {
  male: '男性',
  female: '女性',
  other: 'その他',
  prefer_not_to_say: '回答しない',
};

const GENDER_CLASSES: Record<RealGender, string> = {
  male: 'bg-gender-male/15 text-gender-male border-gender-male/20',
  female: 'bg-gender-female/15 text-gender-female border-gender-female/20',
  other: 'bg-muted text-muted-foreground border-muted/20',
  prefer_not_to_say: 'bg-muted text-muted-foreground border-muted/20',
};

export function memberTypeLabel(memberType: string | null | undefined): string | null {
  if (!memberType) return null;
  return REAL_MEMBER_TYPE_LABELS[memberType as RealMemberType] ?? memberType;
}

export function brandGroupLabel(brandGroup: string | null | undefined): string | null {
  if (!brandGroup) return null;
  return BRAND_GROUP_LABELS[brandGroup as RealBrandGroup] ?? brandGroup;
}

export function storeBrandLabel(brand: string | null | undefined): string | null {
  if (!brand) return null;
  return STORE_BRAND_LABELS[brand as RealStoreBrand] ?? brand;
}

export function genderLabel(gender: string | null | undefined): string | null {
  if (!gender) return null;
  return GENDER_LABELS[gender as RealGender] ?? gender;
}

export function genderClass(gender: string | null | undefined): string {
  if (!gender) return '';
  return GENDER_CLASSES[gender as RealGender] ?? '';
}
