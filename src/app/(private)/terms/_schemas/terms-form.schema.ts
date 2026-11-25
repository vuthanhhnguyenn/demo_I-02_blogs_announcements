import { TERMS_BRANDS, TERMS_TYPES } from '@/app/(private)/terms/_constants/constants';
import { TEXTAREA_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { z } from 'zod';

/** CreateTermsDto / UpdateTermsDto `version.maxLength`. */
const TERMS_VERSION_MAX_LENGTH = 50;

/** `terms_documents.display_order` is a Postgres INTEGER (int32). */
const TERMS_DISPLAY_ORDER_MAX = 2_147_483_647;

export type TermsFormMode = 'create' | 'edit' | 'new-version';

export const TermsFormSchema = z
  .object({
    brandEnum: z.array(z.enum(TERMS_BRANDS)).min(1, 'ブランドを選択してください。'),
    title: z
      .string()
      .trim()
      .min(1, '規約名を入力してください')
      .max(TEXT_MAX_LENGTH, `規約名は${TEXT_MAX_LENGTH}文字以内で入力してください。`),
    termsType: z.enum(TERMS_TYPES, { error: '規約タイプを選択してください。' }),
    version: z
      .string()
      .trim()
      .min(1, 'バージョンを入力してください')
      .max(
        TERMS_VERSION_MAX_LENGTH,
        `バージョンは${TERMS_VERSION_MAX_LENGTH}文字以内で入力してください。`,
      ),
    effectiveFrom: z.string().min(1, '適用開始日を入力してください'),
    effectiveTo: z.string().nullable().optional(),
    displayOrder: z
      .number({ error: '表示順は数字を入力してください。' })
      // Checked before `.int()`: zod's int rejects anything past Number.MAX_SAFE_INTEGER, which
      // would mislabel a huge whole number as non-integer (Y-04 不具合 No11).
      .max(
        TERMS_DISPLAY_ORDER_MAX,
        `表示順は${TERMS_DISPLAY_ORDER_MAX}以下の整数で入力してください。`,
      )
      .int('表示順は整数で入力してください。')
      .min(0, '表示順は0以上の整数で入力してください。')
      .nullable()
      .optional(),
    requiresConsent: z.boolean(),
    remarks: z
      .string()
      .max(TEXTAREA_MAX_LENGTH, `備考は${TEXTAREA_MAX_LENGTH}文字以内で入力してください。`)
      .nullable()
      .optional(),
    pdfS3Key: z.string().min(1, 'PDFファイルを選択してください'),
    pdfFileName: z.string(),
    pdfFileSize: z.number(),
    // Extracted at upload time: an empty extraction never sets `pdfS3Key` (handlePdfSelect), and a
    // pre-v0.8 row legitimately reads back as '' on edit, where the text is only re-sent with a new PDF.
    bodyText: z.string(),
  })
  .refine(
    // An empty 適用開始日 is the required-field error's job, not a date-order one (Y-04 不具合 No9).
    (data) =>
      !data.effectiveTo ||
      !data.effectiveFrom ||
      new Date(data.effectiveTo) >= new Date(data.effectiveFrom),
    {
      message: '適用終了予定日は適用開始日以降の日付を入力してください。',
      path: ['effectiveTo'],
    },
  );

export type TermsFormValues = z.infer<typeof TermsFormSchema>;

export const emptyTermsFormValues: TermsFormValues = {
  brandEnum: [],
  title: '',
  termsType: '' as unknown as TermsFormValues['termsType'],
  version: '',
  effectiveFrom: '',
  effectiveTo: null,
  displayOrder: null,
  requiresConsent: true,
  remarks: '',
  pdfS3Key: '',
  pdfFileName: '',
  pdfFileSize: 0,
  bodyText: '',
};
