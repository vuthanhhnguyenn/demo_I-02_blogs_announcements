import { z } from 'zod';

import { BRAND_NAME_MAX_LENGTH } from '../_constants/brand-real.constants';

/**
 * ブランド名 is the only editable brand field (Y-07 260928_v3 FR-001); ブランドID is the immutable
 * path key and is shown read-only, so it is not part of the form. Bounds follow
 * `UpdateBrandGroupDto.displayName` (1–100, trimmed server-side too).
 */
export const brandFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'ブランド名を入力してください')
    // Code points, not UTF-16 units: the server (class-validator) counts a surrogate pair (emoji,
    // rare kanji) as one character. The input has no maxLength so an over-long paste reaches here
    // and shows this message instead of being silently truncated.
    .refine((value) => [...value].length <= BRAND_NAME_MAX_LENGTH, {
      message: `ブランド名は${BRAND_NAME_MAX_LENGTH}文字以内で入力してください`,
    }),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;
