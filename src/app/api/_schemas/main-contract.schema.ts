import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { StoreListBrandSchema } from './store.schema';

export { ErrorResponseSchema } from './auth.schema';

extendZodWithOpenApi(z);

export const MainContractTypeSchema = z
  .enum([
    'general',
    'oneDay',
    'family',
    'kids',
    'student',
    'corporate',
    'welfare',
    'prepaid',
    'special',
  ])
  .openapi({
    title: 'MainContractType',
    description: '主契約タイプ（G-01 / API-087 ContractType）',
  });

export const MainContractStatusSchema = z.enum(['active', 'inactive']).openapi({
  title: 'MainContractStatus',
  description: '主契約の有効/無効ステータス（API-087 isActive 相当）',
});

export const MainContractOtherStoreUsageSchema = z.enum(['all', 'direct', 'none']).openapi({
  title: 'MainContractOtherStoreUsage',
  description: '他店舗利用範囲（全店舗 / 直営店 / 不可）',
});

export const MainContractGenderRestrictionSchema = z.enum(['none', 'male', 'female']).openapi({
  title: 'MainContractGenderRestriction',
  description: '性別制限（API-087 limitOfSex）: none=制限なし / male=男性のみ / female=女性のみ',
});

export const MainContractListItemSchema = z
  .object({
    id: z.string().openapi({ example: 'MC001', description: '主契約ID（自動採番）' }),
    name: z.string().openapi({ example: 'レギュラー会員', description: '主契約名' }),
    contract_type: MainContractTypeSchema.openapi({ description: '契約タイプ' }),
    brand: StoreListBrandSchema.openapi({ description: 'ブランド' }),
    target_store_name: z.string().nullable().openapi({
      example: 'JOYFIT24 新宿店',
      description: '特殊契約の場合の対象店舗名。それ以外は null（店舗限定なし）',
    }),
    price_including_tax: z
      .number()
      .nonnegative()
      .openapi({ example: 7700, description: '料金（税込）' }),
    companion_benefit_enabled: z.boolean().openapi({
      example: false,
      description: '同伴特典フラグ',
    }),
    parent_contract_name: z.string().nullable().openapi({
      example: 'レギュラー会員',
      description: '親主契約名（派生マスタの場合）',
    }),
    status: MainContractStatusSchema.openapi({ description: 'ステータス' }),
    active_contracts: z.number().int().nonnegative().openapi({
      example: 1250,
      description: '契約者数（API-087 contractCount）。編集・削除可否の判定に使用',
    }),
    derived_child_count: z.number().int().nonnegative().openapi({
      example: 2,
      description: '派生マスタ件数（API-087 derivedChildCount）。削除可否の判定に使用',
    }),
  })
  .openapi({
    title: 'MainContractListItem',
    description: '主契約一覧アイテム（G-01 FR-M001 の一覧項目）',
  });

export const GetMainContractsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    search: z.string().optional().openapi({ description: '主契約名で部分一致検索' }),
    contract_type: MainContractTypeSchema.optional(),
    brand: StoreListBrandSchema.optional(),
    status: MainContractStatusSchema.optional(),
    store_id: z.string().optional().openapi({
      description: '店舗で絞り込み。店舗限定なしの主契約（target_store_id=null）は常に含まれる',
    }),
    companion_benefit_enabled: z
      .preprocess((val) => {
        if (val === undefined || val === null || val === '') return undefined;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          if (val === 'true') return true;
          if (val === 'false') return false;
          return undefined;
        }
        return undefined;
      }, z.boolean().optional())
      .openapi({
        description: '同伴特典の有無でフィルタリング',
      }),
    sort_by: z
      .enum(['id', 'name', 'contract_type', 'price_including_tax', 'status'])
      .default('id')
      .openapi({ description: '並び替え項目（一覧でソート可能な列のみ）' }),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
  })
  .openapi({
    title: 'GetMainContractsQuery',
    description: '主契約一覧取得クエリ',
  });

export const GetMainContractsResponseSchema = z
  .object({
    main_contracts: z.array(MainContractListItemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      total_pages: z.number(),
      total_all_items: z.number().int().nonnegative().openapi({
        example: 20,
        description: '絞り込み前の全件数（「全 N 件中 M 件を抽出中」バナー用）',
      }),
    }),
  })
  .openapi({
    title: 'GetMainContractsResponse',
    description: '主契約一覧レスポンス',
  });

export type MainContractListItem = z.infer<typeof MainContractListItemSchema>;
export type GetMainContractsQuery = z.infer<typeof GetMainContractsQuerySchema>;
export type GetMainContractsResponse = z.infer<typeof GetMainContractsResponseSchema>;

// ─────────────────────────────────────────────
// Detail schemas
// ─────────────────────────────────────────────

export const UsageHoursByDaySchema = z
  .object({
    day: z.string().openapi({ example: '月' }),
    from: z.string().openapi({ example: '06:00' }),
    to: z.string().openapi({ example: '23:00' }),
    all_day: z.boolean(),
  })
  .openapi({ title: 'UsageHoursByDay' });

export const MainContractChildSchema = z
  .object({ id: z.string(), name: z.string() })
  .openapi({ title: 'MainContractChild', description: '派生マスタ（子主契約）' });

export const MainContractDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    old_code: z.string().nullable().openapi({ description: '旧コード（API-087 legacyCode）' }),
    contract_type: MainContractTypeSchema,
    brand: StoreListBrandSchema,
    status: MainContractStatusSchema,

    // 基本情報
    target_store_id: z.string().nullable().openapi({
      description: '対象店舗ID（API-087 storeId）。契約タイプが特殊契約の場合のみ設定',
    }),
    target_store_name: z.string().nullable(),
    other_store_usage: MainContractOtherStoreUsageSchema,
    is_multi_usable: z
      .boolean()
      .openapi({ description: '相互利用あり（API-087 isMultiUsable）。JOYFITは主契約扱い' }),
    is_changeable: z.boolean().openapi({ description: '主契約変更可否（API-087 isChangeable）' }),
    companion_benefit_enabled: z.boolean(),
    previous_contract: z.string().nullable().openapi({ description: '変更前主契約' }),

    // 会員公開設定
    public_name: z.string(),
    public_description: z.string(),
    company: z.string().nullable().openapi({ description: '企業' }),
    terms_id: z
      .string()
      .nullable()
      .openapi({ description: '規約文書ID（API-087 termsId / Y-04）' }),
    terms_name: z.string().nullable().openapi({ description: '規約文書名（表示用）' }),
    thumbnail_url: z.string().nullable(),
    description: z.string(),
    memo: z.string().nullable().openapi({ description: '備考（API-087 remarks）' }),

    // 料金
    price_including_tax: z.number(),
    suspension_fee: z
      .number()
      .nullable()
      .openapi({ description: '休会時請求金額（税込・API-087 suspensionFee）。null は未設定' }),
    cancellation_fee: z.number().nullable().openapi({
      description: '違約金（税込・API-087 cancellationFee）。null は残期間から動的算出',
    }),
    tax_rate: z.number(),
    accounting_code: z.string(),
    enrollment_fee: z.number().nullable().openapi({ description: '入会金（税別・JOYFIT系）' }),
    registration_fee: z
      .number()
      .nullable()
      .openapi({ description: '事務手数料（税別・JOYFIT系）' }),
    card_issue_fee: z.number().nullable().openapi({ description: 'カード発行料（税別・FIT365）' }),
    security_fee: z.number().nullable().openapi({ description: 'セキュリティ管理費（FIT365）' }),
    maintenance_fee: z.number().nullable().openapi({ description: '施設メンテナンス料（FIT365）' }),

    // 利用条件
    start_date: z.string(),
    monthly_limit: z
      .number()
      .int()
      .nullable()
      .openapi({ description: '月額会員回数上限（API-087 monthlyVisitLimit）' }),
    usage_hours_by_day: z.array(UsageHoursByDaySchema),

    // 休会・退会
    suspendable_months: z
      .number()
      .int()
      .nullable()
      .openapi({ example: 3, description: '休会可能月（API-087 suspendableMonths）' }),
    cancellable_months: z
      .number()
      .int()
      .nullable()
      .openapi({ example: 1, description: '退会可能月（API-087 cancellationFeeMonths）' }),
    initial_payment_months: z
      .number()
      .int()
      .openapi({ description: '初回支払月数（API-087 prepaidMonths）' }),
    same_day_cancellation: z
      .boolean()
      .openapi({ description: '退会申請当月の退会可（API-087 sameMonthWithdrawalAllowed）' }),

    // 対象制限
    age_restriction: z.string().openapi({ example: '15歳以上', description: '年齢制限' }),
    gender_restriction: MainContractGenderRestrictionSchema,
    billing_enabled: z.boolean().openapi({ description: '課金有無（API-087 hasBilling）' }),

    // 複製
    is_copyable: z.boolean().openapi({ description: 'コピー可否（API-087 isCopyable）' }),
    copied_from_id: z
      .string()
      .nullable()
      .openapi({ description: 'コピー元主契約ID（API-087 copiedFromPlanId）' }),

    // 関係・集計
    parent_contract_id: z.string().nullable(),
    parent_contract_name: z.string().nullable(),
    child_contracts: z.array(MainContractChildSchema),
    active_contracts: z.number().int(),

    created_at: z.string(),
    updated_at: z.string(),
  })
  .openapi({ title: 'MainContractDetail', description: '主契約詳細（G-01 FR-M003）' });

export const GetMainContractDetailResponseSchema = z
  .object({ main_contract: MainContractDetailSchema })
  .openapi({ title: 'GetMainContractDetailResponse' });

export type MainContractDetail = z.infer<typeof MainContractDetailSchema>;
export type GetMainContractDetailResponse = z.infer<typeof GetMainContractDetailResponseSchema>;

// ─────────────────────────────────────────────
// Change history schemas
// ─────────────────────────────────────────────

export const MainContractChangeHistoryItemSchema = z
  .object({
    date: z.string().openapi({ example: '2026/02/28 14:30' }),
    user: z.string().openapi({ example: '管理者A' }),
    field: z.string().nullable(),
    from: z.string().nullable(),
    to: z.string(),
  })
  .openapi({ title: 'MainContractChangeHistoryItem' });

export const GetMainContractChangeHistoryResponseSchema = z
  .object({ history: z.array(MainContractChangeHistoryItemSchema) })
  .openapi({ title: 'GetMainContractChangeHistoryResponse' });

export type MainContractChangeHistoryItem = z.infer<typeof MainContractChangeHistoryItemSchema>;
export type GetMainContractChangeHistoryResponse = z.infer<
  typeof GetMainContractChangeHistoryResponseSchema
>;

// ─────────────────────────────────────────────
// Create / Update schemas
// ─────────────────────────────────────────────

export const UpsertMainContractBodySchema = z
  .object({
    name: z.string().min(1, '主契約名は必須です'),
    contract_type: MainContractTypeSchema,
    brand: StoreListBrandSchema,
    status: MainContractStatusSchema.optional().default('active'),

    target_store_id: z.string().nullable().optional(),
    other_store_usage: MainContractOtherStoreUsageSchema.optional(),
    parent_contract_id: z.string().nullable().optional(),
    old_code: z.string().nullable().optional(),
    is_multi_usable: z.boolean().optional().default(false),
    is_changeable: z.boolean().optional().default(true),
    companion_benefit_enabled: z.boolean().optional().default(false),

    public_name: z.string().optional(),
    public_description: z.string().optional(),
    company: z.string().nullable().optional(),
    terms_id: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    description: z.string().optional(),
    memo: z.string().nullable().optional(),

    price_including_tax: z.number().nonnegative().optional(),
    suspension_fee: z.number().nonnegative().nullable().optional(),
    cancellation_fee: z.number().nonnegative().nullable().optional(),
    tax_rate: z.number().optional(),
    accounting_code: z.string().optional(),
    enrollment_fee: z.number().nonnegative().nullable().optional(),
    registration_fee: z.number().nonnegative().nullable().optional(),
    card_issue_fee: z.number().nonnegative().nullable().optional(),
    security_fee: z.number().nonnegative().nullable().optional(),
    maintenance_fee: z.number().nonnegative().nullable().optional(),

    start_date: z.string().optional(),
    monthly_limit: z.number().int().nonnegative().nullable().optional(),
    usage_hours_by_day: z.array(UsageHoursByDaySchema).optional(),

    suspendable_months: z.number().int().nonnegative().nullable().optional(),
    cancellable_months: z.number().int().nonnegative().nullable().optional(),
    initial_payment_months: z.number().int().nonnegative().optional(),
    same_day_cancellation: z.boolean().optional().default(false),

    age_restriction: z.string().optional(),
    gender_restriction: MainContractGenderRestrictionSchema.optional(),
    billing_enabled: z.boolean().optional().default(false),

    copied_from_id: z.string().nullable().optional(),
  })
  .openapi({ title: 'UpsertMainContractBody', description: '主契約作成・更新リクエスト' });

export const CreateMainContractResponseSchema = z
  .object({
    message: z.string(),
    main_contract: MainContractDetailSchema,
  })
  .openapi({ title: 'CreateMainContractResponse' });

export const UpdateMainContractResponseSchema = z
  .object({
    message: z.string(),
    main_contract: MainContractDetailSchema,
  })
  .openapi({ title: 'UpdateMainContractResponse' });

export type UpsertMainContractBody = z.infer<typeof UpsertMainContractBodySchema>;
export type CreateMainContractResponse = z.infer<typeof CreateMainContractResponseSchema>;
export type UpdateMainContractResponse = z.infer<typeof UpdateMainContractResponseSchema>;

// ─────────────────────────────────────────────
// Delete schemas
// ─────────────────────────────────────────────

export const DeleteMainContractResponseSchema = z
  .object({ message: z.string().openapi({ example: '主契約を削除しました' }) })
  .openapi({ title: 'DeleteMainContractResponse' });

export type DeleteMainContractResponse = z.infer<typeof DeleteMainContractResponseSchema>;
