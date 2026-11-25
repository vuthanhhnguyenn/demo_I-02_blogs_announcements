import { z } from 'zod';

import {
  DOMAIN_AUTH_METHOD_LABELS,
  DOMAIN_NAME_MAX_LENGTH,
  DOMAIN_STRING_MAX_LENGTH,
  DOMAIN_STRING_MAX_LENGTH_BY_AUTH_PROVIDER,
} from '../_constants/domain.constants';

/**
 * Same shape the API enforces (`RegisterDomainMasterDto.domain` pattern): at least two labels and
 * an alphabetic TLD. A numeric TLD such as `test.2` is `400 invalid_format`, because no staff
 * email at it could pass invitation (API-070).
 */
const BARE_DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/** DNS label cap (RFC 1035). Checked before the format regex so the user is told the real cause (Y-14 Bug No.16). */
const DOMAIN_LABEL_MAX_LENGTH = 63;

export const domainFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, '管理名を入力してください')
      .max(DOMAIN_NAME_MAX_LENGTH, `管理名は${DOMAIN_NAME_MAX_LENGTH}文字以内で入力してください。`),
    domain: z
      .string()
      .trim()
      .min(1, 'ドメインを入力してください')
      .refine(
        (value) => value.split('.').every((label) => label.length <= DOMAIN_LABEL_MAX_LENGTH),
        `ドメインの各ラベル（「.」で区切られた部分）は${DOMAIN_LABEL_MAX_LENGTH}文字以内で入力してください。`,
      )
      .regex(BARE_DOMAIN_REGEX, 'ドメインの形式が正しくありません（例: joyfit.co.jp）'),
    authProvider: z.enum(['google', 'cognito'], {
      message: '認証方式を選択してください',
    }),
  })
  // The domain cap depends on the 認証方式 (Google SSO 252 / IDaaS 126), so it is checked here
  // rather than on the field. Before an 認証方式 is chosen the larger cap applies. The input has no
  // `maxLength` on purpose: an over-long paste must show this error instead of being cut silently.
  .superRefine(
    (values, ctx) => {
      const provider = DOMAIN_AUTH_METHOD_LABELS[values.authProvider] ? values.authProvider : null;
      const maxLength = provider
        ? DOMAIN_STRING_MAX_LENGTH_BY_AUTH_PROVIDER[provider]
        : DOMAIN_STRING_MAX_LENGTH;
      if (typeof values.domain === 'string' && values.domain.trim().length > maxLength) {
        ctx.addIssue({
          code: 'custom',
          path: ['domain'],
          message: provider
            ? `${DOMAIN_AUTH_METHOD_LABELS[provider]}のドメインは${maxLength}文字以内で入力してください。`
            : `ドメインは${maxLength}文字以内で入力してください。`,
        });
      }
    },
    {
      // Run even while 認証方式 is still unselected (zod skips refinements once any field fails),
      // so a too-long domain is reported as soon as it is typed.
      when: (payload) => typeof (payload.value as { domain?: unknown })?.domain === 'string',
    },
  );

export type DomainFormValues = z.infer<typeof domainFormSchema>;

export const EMPTY_DOMAIN_FORM_VALUES: Partial<DomainFormValues> = {
  name: '',
  domain: '',
};
