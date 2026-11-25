import type { BrandEnumValue } from '@/components/common/brand-badge';

/**
 * Spec G-04 treats ブランド as the brand GROUP: exactly JOYFIT / FIT365. The API stores sub-brands
 * (`brandEnums`, 1-5 unique) and filters by group through `brandGroup`.
 */
export const SURVEY_BRAND_GROUPS = ['JOYFIT', 'FIT365'] as const;
export type SurveyBrandGroup = (typeof SURVEY_BRAND_GROUPS)[number];

/** Option labels of the group selects (list / responses / analytics filters and the form). */
export const SURVEY_BRAND_GROUP_LABELS: Record<SurveyBrandGroup, string> = {
  JOYFIT: 'JOYFIT',
  FIT365: 'FIT365',
};

/** Sub-brands of each group (a survey saved for a group is tagged with all of them). */
export const SURVEY_BRAND_GROUP_ENUMS: Record<SurveyBrandGroup, readonly BrandEnumValue[]> = {
  JOYFIT: ['Joyfit', 'Joyfit24', 'JoyfitYoga', 'JoyfitPlus'],
  FIT365: ['Fit365'],
};

/** The URL keeps the lower-case spelling (`?brand=joyfit`); the API's `brandGroup` is upper-case. */
export const SURVEY_BRAND_GROUP_URL_VALUES = ['joyfit', 'fit365'] as const;
export type SurveyBrandGroupUrlValue = (typeof SURVEY_BRAND_GROUP_URL_VALUES)[number];

export const SURVEY_BRAND_GROUP_BY_URL_VALUE: Record<SurveyBrandGroupUrlValue, SurveyBrandGroup> = {
  joyfit: 'JOYFIT',
  fit365: 'FIT365',
};

export const SURVEY_BRAND_GROUP_URL_VALUE_BY_GROUP: Record<
  SurveyBrandGroup,
  SurveyBrandGroupUrlValue
> = {
  JOYFIT: 'joyfit',
  FIT365: 'fit365',
};

/** The group whose sub-brand set equals `brandEnums` exactly (order-insensitive), else null (legacy / mixed). */
export function getSurveyBrandGroupOfEnums(
  brandEnums: readonly BrandEnumValue[],
): SurveyBrandGroup | null {
  const stored = new Set(brandEnums);
  return (
    SURVEY_BRAND_GROUPS.find((group) => {
      const members = SURVEY_BRAND_GROUP_ENUMS[group];
      return stored.size === members.length && members.every((brand) => stored.has(brand));
    }) ?? null
  );
}

/** Sub-brands to save for a picked group. */
export function getSurveyBrandEnumsOfGroup(group: SurveyBrandGroup): BrandEnumValue[] {
  return [...SURVEY_BRAND_GROUP_ENUMS[group]];
}

/**
 * Badges for a stored sub-brand set: a fully present JOYFIT group collapses into one JOYFIT badge
 * (`Joyfit` renders as 「JOYFIT」); any other sub-brand stays as itself so a legacy partial set hides nothing.
 */
export function collapseSurveyBrandEnums(brandEnums: readonly BrandEnumValue[]): BrandEnumValue[] {
  const stored = new Set(brandEnums);
  const joyfitSubBrands = SURVEY_BRAND_GROUP_ENUMS.JOYFIT;
  const hasWholeJoyfit = joyfitSubBrands.every((brand) => stored.has(brand));
  const collapsed: BrandEnumValue[] = [];
  for (const brand of brandEnums) {
    const next = hasWholeJoyfit && joyfitSubBrands.includes(brand) ? 'Joyfit' : brand;
    if (!collapsed.includes(next)) collapsed.push(next);
  }
  return collapsed;
}
