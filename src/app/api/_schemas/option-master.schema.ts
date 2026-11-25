import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { ErrorResponseSchema } from './auth.schema';
import { StoreListBrandSchema } from './store.schema';

extendZodWithOpenApi(z);

export const OptionTypeSchema = z.enum(['standard', 'metered', 'auto_attached']).openapi({
  title: 'OptionType',
  description: '課金種別（通常/都度/自動付与）',
});

/**
 * Real-API `paymentType`. The type the screens show is the mapping monthly = `monthly_billing` &
 * !auto / per-use = `per_use` & !auto / auto-assigned = auto — see
 * `OPTION_TYPE_QUERY_PARAMS` on the UI side and `optionPaymentFields` on the mock side.
 */
export const OptionPaymentTypeSchema = z.enum(['monthly_billing', 'per_use']).openapi({
  title: 'OptionPaymentType',
  description: '課金方式（monthly_billing: 月額課金 / per_use: 都度課金）',
});

export const OptionStatusSchema = z.enum(['active', 'inactive']).openapi({
  title: 'OptionStatus',
  description: 'オプション有効/無効ステータス',
});

export const OptionProrataMethodSchema = z.enum(['daily', 'fixed']).openapi({
  title: 'OptionProrataMethod',
  description: '日割り計算方法（daily: 日割り計算 / fixed: 固定金額）',
});

export const OptionUsageRuleSchema = z
  .enum(['disabled', 'add_remove', 'add_remove_change', 'change_remove'])
  .openapi({
    title: 'OptionUsageRule',
    description: '利用可否ルール',
  });

export const OptionCategorySchema = z
  .enum(['supplement', 'drink', 'rental', 'locker', 'insurance', 'service'])
  .openapi({
    title: 'OptionCategory',
    description: 'オプション分類',
  });

export const OptionMasterCategorySchema = z
  .enum(['gym_option', 'locker_option', 'lesson_plan', 'insurance', 'oneday_pass', 'other'])
  .openapi({
    title: 'OptionMasterCategory',
    description: 'オプション機能カテゴリ',
  });

/**
 * API design document `subcategory`, redefined by G-02 FR-002 (260731_v3) as the service type: an
 * axis independent of the billing type, optional, and settable whichever billing type is chosen.
 */
export const OptionSubcategorySchema = z
  .enum([
    'protein',
    'supplement',
    'tanning',
    'collagen',
    'hydrogen_water',
    'body_planner',
    'shower',
  ])
  .openapi({
    title: 'OptionSubcategory',
    description: 'サービス種別',
  });

/** API design document `areaRestriction`. The prototype allows selecting several areas at once. */
export const OptionAreaRestrictionSchema = z
  .enum(['ladies_area', 'tanning_area', 'protein_bar', 'locker_area'])
  .openapi({
    title: 'OptionAreaRestriction',
    description: 'エリア制限',
  });

export const OptionMasterListItemSchema = z
  .object({
    id: z.string().openapi({ example: 'OP002', description: 'オプションID' }),
    name: z.string().openapi({ example: '水素水', description: 'オプション名' }),
    code: z.string().openapi({ example: 'H2O-001', description: 'オプションコード' }),
    category: OptionMasterCategorySchema.openapi({ description: 'オプション機能カテゴリ' }),
    brand: StoreListBrandSchema.openapi({ description: 'ブランド' }),
    /** Mock-only convenience derived from payment_type + is_auto_assigned; the real API has only the pair. */
    option_type: OptionTypeSchema.openapi({ description: '課金種別' }),
    payment_type: OptionPaymentTypeSchema.openapi({ description: '課金方式' }),
    is_auto_assigned: z.boolean().openapi({ example: false, description: '自動付与フラグ' }),
    /** G-02 FR-001 lists the service type as a column, so it rides on the list item too. */
    subcategory: OptionSubcategorySchema.nullable().openapi({
      description: 'サービス種別（課金種別と独立・任意。null = 未設定）',
    }),
    /** The tax-exclusive price is the source of truth; taxInclusive = floor(taxExclusive × (1 + tax_rate/100)). */
    price_excluding_tax: z
      .number()
      .nonnegative()
      .openapi({ example: 1000, description: '料金（税抜）' }),
    price_including_tax: z
      .number()
      .nonnegative()
      .openapi({ example: 1100, description: '料金（税込）' }),
    tax_rate: z.number().nonnegative().openapi({ example: 10, description: '税率（%）' }),
    prorated_enabled: z.boolean().openapi({ example: true, description: '日割り要否' }),
    prorata_method: OptionProrataMethodSchema.nullable().openapi({
      description: '日割り計算方法（prorated_enabled=true の場合のみ）',
    }),
    usage_rule: OptionUsageRuleSchema.openapi({ description: '利用可否ルール' }),
    linked_contracts: z
      .number()
      .int()
      .nonnegative()
      .openapi({ example: 10, description: '紐付き契約プラン数' }),
    member_count: z
      .number()
      .int()
      .nonnegative()
      .openapi({ example: 680, description: '利用会員数' }),
    store_id: z.string().nullable().openapi({ description: '対象店舗ID（null = 全店舗）' }),
    store_name: z.string().nullable().openapi({ description: '対象店舗名（null = 全店舗）' }),
    store_count: z
      .number()
      .int()
      .nonnegative()
      .openapi({ example: 13, description: '適用店舗数（0 = 未設定）' }),
    accounting_code: z.string().openapi({ example: 'OPT-102', description: '会計コード' }),
    status: OptionStatusSchema.openapi({ description: 'ステータス' }),
    description: z.string().nullable().openapi({ description: '説明文' }),
  })
  .openapi({
    title: 'OptionMasterListItem',
    description: 'オプション一覧アイテム',
  });

export const GetOptionMastersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    search: z
      .string()
      .max(50)
      .optional()
      .openapi({ description: 'オプション名で検索（部分一致）' }),
    brand: StoreListBrandSchema.optional(),
    // The type filter sends this pair — monthly = monthly_billing & !auto,
    // per-use = per_use & !auto, auto-assigned = auto — instead of a single option_type param.
    payment_type: OptionPaymentTypeSchema.optional().openapi({
      description: '課金方式で絞り込み',
    }),
    is_auto_assigned: z
      .enum(['true', 'false'])
      .optional()
      .openapi({ description: '自動付与フラグで絞り込み' }),
    status: OptionStatusSchema.optional(),
    prorated_enabled: z
      .enum(['true', 'false'])
      .optional()
      .openapi({ description: '日割りフラグで絞り込み' }),
    category: OptionMasterCategorySchema.optional().openapi({
      description: 'オプション機能カテゴリで絞り込み',
    }),
    store_id: z.string().optional().openapi({ description: '店舗IDで絞り込み' }),
    sort_by: z.enum(['id', 'name', 'price_including_tax', 'tax_rate', 'status']).default('id'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
  })
  .openapi({
    title: 'GetOptionMastersQuery',
    description: 'オプション一覧取得クエリ',
  });

export const GetOptionMastersResponseSchema = z
  .object({
    options: z.array(OptionMasterListItemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      total_pages: z.number(),
      total_all_items: z
        .number()
        .int()
        .nonnegative()
        .openapi({ description: '絞り込み前の全件数（「全 N 件中 M 件」バナー用）' }),
    }),
  })
  .openapi({
    title: 'GetOptionMastersResponse',
    description: 'オプション一覧レスポンス',
  });

export const OptionMasterDetailSchema = OptionMasterListItemSchema.extend({
  option_category: OptionCategorySchema.openapi({ description: 'オプション分類' }),
  note: z.string().nullable().openapi({ description: '備考' }),
  member_app_image: z.string().nullable().openapi({ description: '会員公開用画像（base64）' }),
  created_at: z.string().openapi({ example: '2024-04-01T10:00:00+09:00', description: '作成日時' }),
  updated_at: z.string().openapi({ example: '2026-02-15T14:30:00+09:00', description: '更新日時' }),
  popularity_rank: z.number().int().positive().nullable().openapi({
    example: 3,
    description: '人気ランキング',
  }),
  popularity_total: z.number().int().nonnegative().openapi({
    example: 9,
    description: '人気ランキングの母数（オプション総数）',
  }),
  constraint_main_option_change: z.boolean().openapi({ description: '主オプション契約変更可否' }),
  constraint_change: z.boolean().openapi({ description: '変更可否' }),
  area_restrictions: z
    .array(OptionAreaRestrictionSchema)
    .openapi({ description: 'エリア制限（空配列 = 制限なし）' }),
}).openapi({
  title: 'OptionMasterDetail',
  description: 'オプション詳細',
});

export const GetOptionMasterDetailResponseSchema = z
  .object({ option: OptionMasterDetailSchema })
  .openapi({
    title: 'GetOptionMasterDetailResponse',
    description: 'オプション詳細レスポンス',
  });

export const UpsertOptionMasterBodySchema = z
  .object({
    brand: StoreListBrandSchema.openapi({ description: 'ブランド' }),
    name: z
      .string()
      .min(1, 'オプション名は必須です')
      .max(100, 'オプション名は100文字以内で入力してください')
      .openapi({ description: 'オプション名' }),
    /**
     * Not exposed on the option screens (the prototype has no code field); the mock generates one
     * on create. It stays on the resource because the locker screens address contract types by code.
     */
    code: z.string().min(1).optional().openapi({ description: 'コード（未指定時は自動採番）' }),
    option_category: OptionCategorySchema.openapi({ description: 'オプション分類' }),
    category: OptionMasterCategorySchema.optional().openapi({
      description: 'オプション機能カテゴリ（未指定時はコードから自動判定）',
    }),
    accounting_code: z
      .string()
      .max(30, '会計コードは30文字以内で入力してください')
      .default('')
      .openapi({ description: '会計コード' }),
    note: z
      .string()
      .max(1000, '備考は1000文字以内で入力してください')
      .nullable()
      .optional()
      .openapi({ description: '備考' }),
    description: z
      .string()
      .max(2000, '説明文は2000文字以内で入力してください')
      .nullable()
      .optional()
      .openapi({ description: '説明文' }),
    member_app_image: z.string().nullable().optional().openapi({
      description: '会員公開用画像（base64）',
    }),
    // The form captures the tax-exclusive price (`feeMonthly`); the tax-inclusive price is
    // derived with floor(taxExclusive × (1 + tax_rate/100)) — see `toTaxIncludedPrice`.
    price_excluding_tax: z
      .number({ error: '料金（税抜）は必須です' })
      .nonnegative('0以上の値を入力してください')
      .max(999999999, '料金は9桁以内で入力してください')
      .openapi({ description: '料金（税抜）' }),
    // G-02 FR-002 "tax-rate choices: fixed two-way choice — 10% (standard rate) / 8% (reduced rate)" — the API design document is
    // looser (0-20), but the requirement and the prototype's select both fix the two choices.
    tax_rate: z
      .union([z.literal(8), z.literal(10)], { error: '税率を選択してください' })
      .openapi({ description: '税率（8 = 軽減税率 / 10 = 標準税率）' }),
    prorated_enabled: z.boolean().default(false).openapi({ description: '日割りフラグ' }),
    prorata_method: OptionProrataMethodSchema.nullable().optional().openapi({
      description: '日割り計算方式',
    }),
    option_type: OptionTypeSchema.openapi({ description: '課金種別' }),
    subcategory: OptionSubcategorySchema.nullable().optional().openapi({
      description: 'サービス種別（任意）',
    }),
    usage_rule: OptionUsageRuleSchema.openapi({ description: '利用可否ルール' }),
    constraint_main_option_change: z
      .boolean()
      .default(false)
      .openapi({ description: '主オプション契約変更可否' }),
    constraint_change: z.boolean().default(false).openapi({ description: '変更可否' }),
    area_restrictions: z
      .array(OptionAreaRestrictionSchema)
      .default([])
      .openapi({ description: 'エリア制限' }),
    status: OptionStatusSchema.default('active').openapi({ description: 'ステータス' }),
  })
  .superRefine((value, ctx) => {
    if (value.prorated_enabled && !value.prorata_method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prorata_method'],
        message: '日割り計算方式を選択してください',
      });
    }

    if (!value.prorated_enabled && value.prorata_method) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['prorata_method'],
        message: '日割り未適用の場合は日割り計算方式を指定できません',
      });
    }

    // G-02 FR-002 (260731_v3) supersedes the API design document §12.1 rule (E-OPT-002, "required
    // iff paymentType=per_use, null otherwise"): the service type is optional and independent of
    // the billing type, so no cross-check against option_type is left — the same service type may
    // be shared by options billed differently (prototype 2026-09-03).
  })
  .openapi({
    title: 'UpsertOptionMasterBody',
    description: 'オプション作成・更新リクエスト',
  });

export const CreateOptionMasterResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'オプションを作成しました' }),
    option: OptionMasterDetailSchema,
  })
  .openapi({
    title: 'CreateOptionMasterResponse',
    description: 'オプション作成レスポンス',
  });

export const UpdateOptionMasterResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'オプションを更新しました' }),
    option: OptionMasterDetailSchema,
  })
  .openapi({
    title: 'UpdateOptionMasterResponse',
    description: 'オプション更新レスポンス',
  });

export const OptionMasterChangeHistoryItemSchema = z
  .object({
    date: z.string().openapi({ example: '2026/02/15 14:30' }),
    user: z.string().openapi({ example: '管理者A' }),
    field: z.string().nullable(),
    from: z.string().nullable(),
    to: z.string(),
  })
  .openapi({ title: 'OptionMasterChangeHistoryItem', description: 'オプション変更履歴' });

export const GetOptionMasterChangeHistoryResponseSchema = z
  .object({ history: z.array(OptionMasterChangeHistoryItemSchema) })
  .openapi({
    title: 'GetOptionMasterChangeHistoryResponse',
    description: 'オプション変更履歴レスポンス',
  });

export const DeleteOptionMasterRequestSchema = z
  .object({
    reason: z.string().min(1, '削除理由は必須です').openapi({ example: '廃止のため' }),
  })
  .openapi({ title: 'DeleteOptionMasterRequest', description: 'オプション削除リクエスト' });

export const DeleteOptionMasterResponseSchema = z
  .object({ message: z.string().openapi({ example: 'オプションを削除しました' }) })
  .openapi({ title: 'DeleteOptionMasterResponse', description: 'オプション削除レスポンス' });

export type OptionMasterListItem = z.infer<typeof OptionMasterListItemSchema>;
export type GetOptionMastersQuery = z.infer<typeof GetOptionMastersQuerySchema>;
export type GetOptionMastersResponse = z.infer<typeof GetOptionMastersResponseSchema>;
export type OptionMasterDetail = z.infer<typeof OptionMasterDetailSchema>;
export type GetOptionMasterDetailResponse = z.infer<typeof GetOptionMasterDetailResponseSchema>;
export type UpsertOptionMasterBody = z.infer<typeof UpsertOptionMasterBodySchema>;
export type OptionMasterChangeHistoryItem = z.infer<typeof OptionMasterChangeHistoryItemSchema>;
export type GetOptionMasterChangeHistoryResponse = z.infer<
  typeof GetOptionMasterChangeHistoryResponseSchema
>;
export type DeleteOptionMasterRequest = z.infer<typeof DeleteOptionMasterRequestSchema>;
export type DeleteOptionMasterResponse = z.infer<typeof DeleteOptionMasterResponseSchema>;
export type CreateOptionMasterResponse = z.infer<typeof CreateOptionMasterResponseSchema>;
export type UpdateOptionMasterResponse = z.infer<typeof UpdateOptionMasterResponseSchema>;
export type OptionCategory = z.infer<typeof OptionCategorySchema>;
export type OptionPaymentType = z.infer<typeof OptionPaymentTypeSchema>;
export type OptionType = z.infer<typeof OptionTypeSchema>;
export type OptionMasterCategory = z.infer<typeof OptionMasterCategorySchema>;
export type OptionSubcategory = z.infer<typeof OptionSubcategorySchema>;
export type OptionAreaRestriction = z.infer<typeof OptionAreaRestrictionSchema>;
export type OptionProrataMethod = z.infer<typeof OptionProrataMethodSchema>;
export type OptionUsageRule = z.infer<typeof OptionUsageRuleSchema>;

export { ErrorResponseSchema };
