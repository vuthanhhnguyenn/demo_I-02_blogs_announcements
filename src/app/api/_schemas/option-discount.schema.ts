import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { ErrorResponseSchema } from './auth.schema';

extendZodWithOpenApi(z);

/** Application condition — the prototype's select offers exactly these three (simultaneous application / existing members included / two or more family members). */
export const OptionDiscountConditionSchema = z
  .enum(['simultaneous', 'existing_member', 'family_2_plus'])
  .openapi({
    title: 'OptionDiscountCondition',
    description: 'セット割の適用条件',
  });

export const OptionDiscountTypeSchema = z.enum(['fixed_amount', 'percentage']).openapi({
  title: 'OptionDiscountType',
  description: 'セット割の割引タイプ',
});

export const OptionDiscountStatusSchema = z.enum(['active', 'inactive']).openapi({
  title: 'OptionDiscountStatus',
  description: 'セット割の有効/無効ステータス',
});

export const OptionDiscountListItemSchema = z
  .object({
    id: z.string().openapi({ example: 'SD001', description: 'セット割ID' }),
    name: z.string().openapi({ example: 'デイタイム＋水素水セット', description: 'セット割名' }),
    target_options: z
      .array(z.string())
      .openapi({ description: '対象オプション名一覧', example: ['水素水'] }),
    discount_type: OptionDiscountTypeSchema.openapi({ description: '割引タイプ' }),
    discount_value: z.number().nonnegative().openapi({ example: 330, description: '割引値' }),
    conditions: OptionDiscountConditionSchema.openapi({
      example: 'simultaneous',
      description: '適用条件',
    }),
    status: OptionDiscountStatusSchema.openapi({ description: 'ステータス' }),
  })
  .openapi({
    title: 'OptionDiscountListItem',
    description: 'セット割一覧アイテム',
  });

export const GetOptionDiscountsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(25),
    search: z.string().optional().openapi({ description: 'セット割名で検索' }),
    discount_type: OptionDiscountTypeSchema.optional(),
    status: OptionDiscountStatusSchema.optional(),
    sort_by: z.enum(['id', 'name', 'discount_type', 'discount_value', 'status']).default('id'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
  })
  .openapi({
    title: 'GetOptionDiscountsQuery',
    description: 'セット割一覧取得クエリ',
  });

export const GetOptionDiscountsResponseSchema = z
  .object({
    option_discounts: z.array(OptionDiscountListItemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      total_pages: z.number(),
    }),
  })
  .openapi({
    title: 'GetOptionDiscountsResponse',
    description: 'セット割一覧レスポンス',
  });

// --- Detail ---
export const OptionDiscountDetailSchema = OptionDiscountListItemSchema.extend({
  description: z.string().nullable().openapi({ description: '説明文' }),
  applied_count: z
    .number()
    .int()
    .nonnegative()
    .openapi({ example: 180, description: '対象会員数（構成オプションをすべて契約中の会員数）' }),
  rules: z.array(z.string()).openapi({ description: '適用ルール' }),
  created_at: z.string().openapi({ example: '2025/06/20 16:45', description: '作成日時' }),
  updated_at: z.string().openapi({ example: '2026/03/01 10:30', description: '最終更新日時' }),
  updated_by: z.string().openapi({ example: 'テストユーザー', description: '更新者' }),
}).openapi({
  title: 'OptionDiscountDetail',
  description: 'セット割詳細',
});

export const GetOptionDiscountDetailResponseSchema = z
  .object({ option_discount: OptionDiscountDetailSchema })
  .openapi({
    title: 'GetOptionDiscountDetailResponse',
    description: 'セット割詳細レスポンス',
  });

// --- Create / Update ---
export const UpsertOptionDiscountBodySchema = z
  .object({
    name: z.string().min(1, 'セット割名は必須です'),
    description: z.string().nullable().optional(),
    target_options: z.array(z.string()).min(1, '対象オプションを1つ以上選択してください'),
    discount_type: OptionDiscountTypeSchema,
    discount_value: z.number().nonnegative('0以上の値を入力してください'),
    conditions: OptionDiscountConditionSchema,
    status: OptionDiscountStatusSchema.optional().default('active'),
  })
  .superRefine((value, ctx) => {
    if (value.discount_type === 'percentage' && value.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discount_value'],
        message: '割引率は100%以下で入力してください',
      });
    }
  })
  .openapi({
    title: 'UpsertOptionDiscountBody',
    description: 'セット割作成・更新リクエスト',
  });

export const CreateOptionDiscountResponseSchema = z
  .object({
    message: z.string(),
    option_discount: OptionDiscountDetailSchema,
  })
  .openapi({
    title: 'CreateOptionDiscountResponse',
    description: 'セット割作成レスポンス',
  });

export const UpdateOptionDiscountResponseSchema = z
  .object({
    message: z.string(),
    option_discount: OptionDiscountDetailSchema,
  })
  .openapi({
    title: 'UpdateOptionDiscountResponse',
    description: 'セット割更新レスポンス',
  });

// --- Activate / Deactivate ---
// G-02 L206: the only management actions are list / create / edit / deactivate — no delete is defined. The API design document
// agrees — `option-sets` exposes `PATCH /option-sets/{setId}/active` and no delete endpoint — so a
// retired set discount is deactivated, never removed.
export const UpdateOptionDiscountActiveBodySchema = z
  .object({
    status: OptionDiscountStatusSchema.openapi({ description: '変更後のステータス' }),
  })
  .openapi({
    title: 'UpdateOptionDiscountActiveBody',
    description: 'セット割有効/無効切替リクエスト',
  });

export const UpdateOptionDiscountActiveResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'セット割を無効化しました' }),
    option_discount: OptionDiscountDetailSchema,
  })
  .openapi({
    title: 'UpdateOptionDiscountActiveResponse',
    description: 'セット割有効/無効切替レスポンス',
  });

export { ErrorResponseSchema };

export type OptionDiscountType = z.infer<typeof OptionDiscountTypeSchema>;
export type OptionDiscountStatus = z.infer<typeof OptionDiscountStatusSchema>;
export type OptionDiscountCondition = z.infer<typeof OptionDiscountConditionSchema>;
export type OptionDiscountListItem = z.infer<typeof OptionDiscountListItemSchema>;
export type GetOptionDiscountsQuery = z.infer<typeof GetOptionDiscountsQuerySchema>;
export type GetOptionDiscountsResponse = z.infer<typeof GetOptionDiscountsResponseSchema>;
export type OptionDiscountDetail = z.infer<typeof OptionDiscountDetailSchema>;
export type GetOptionDiscountDetailResponse = z.infer<typeof GetOptionDiscountDetailResponseSchema>;
export type UpdateOptionDiscountActiveBody = z.infer<typeof UpdateOptionDiscountActiveBodySchema>;
export type UpdateOptionDiscountActiveResponse = z.infer<
  typeof UpdateOptionDiscountActiveResponseSchema
>;
export type UpsertOptionDiscountBody = z.infer<typeof UpsertOptionDiscountBodySchema>;
export type CreateOptionDiscountResponse = z.infer<typeof CreateOptionDiscountResponseSchema>;
export type UpdateOptionDiscountResponse = z.infer<typeof UpdateOptionDiscountResponseSchema>;
