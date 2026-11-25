import { TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { ErrorResponseSchema } from './auth.schema';
import { StaffStatusSchema } from './staff.schema';

extendZodWithOpenApi(z);

const BARE_DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export const DomainAuthMethodSchema = z.enum(['google_sso', 'idaas']).openapi({
  title: 'DomainAuthMethod',
  description: '認証方式（Google SSO / IDaaS）',
});

export const DomainSchema = z
  .object({
    id: z.string().openapi({ example: 'D-001', description: 'ドメインID' }),
    name: z.string().openapi({ example: 'ヤマウチ社', description: '管理名' }),
    domain: z.string().openapi({ example: 'yamauchi.co.jp', description: 'ドメイン（@以降）' }),
    auth_provider: DomainAuthMethodSchema.openapi({ description: '認証方式' }),
    created_by: z.string().openapi({ example: 'システム管理者', description: '作成者' }),
    created_at: z
      .string()
      .openapi({ example: '2026-06-23T09:00:00.000Z', description: '作成日時' }),
  })
  .openapi({
    title: 'Domain',
    description: 'ドメインマスタ',
  });

export const DomainLinkedStaffSummarySchema = z
  .object({
    id: z.string().openapi({ example: '1', description: 'スタッフ内部ID' }),
    staffId: z.string().openapi({ example: 'STF-001', description: 'スタッフ表示ID' }),
    name: z.string().openapi({ example: '田中 太郎', description: 'スタッフ氏名' }),
    email: z
      .string()
      .email()
      .openapi({ example: 'tanaka@joyfit.co.jp', description: 'スタッフのメールアドレス' }),
    position: z.string().openapi({ example: '正社員スタッフ', description: 'スタッフの職位名' }),
    status: StaffStatusSchema.openapi({ description: 'スタッフのアカウント状態' }),
  })
  .openapi({
    title: 'DomainLinkedStaffSummary',
    description: 'ドメインに紐づくスタッフの概要',
  });

export const DomainListItemSchema = z
  .object({
    id: DomainSchema.shape.id,
    name: DomainSchema.shape.name,
    domain: DomainSchema.shape.domain,
    authProvider: DomainSchema.shape.auth_provider,
    staffCount: z
      .number()
      .int()
      .nonnegative()
      .openapi({ example: 3, description: '紐づくスタッフ数' }),
  })
  .openapi({
    title: 'DomainListItem',
    description: 'ドメイン一覧アイテム',
  });

export const DomainDetailSchema = DomainListItemSchema.extend({
  createdBy: DomainSchema.shape.created_by,
  createdAt: DomainSchema.shape.created_at,
  linkedStaff: z
    .array(DomainLinkedStaffSummarySchema)
    .openapi({ description: '紐づくスタッフ一覧' }),
}).openapi({
  title: 'DomainDetail',
  description: 'ドメイン詳細',
});

export const GetDomainsQueryParamsSchema = z
  .object({
    query: z
      .string()
      .optional()
      .openapi({ description: '名前・ドメイン 部分一致検索（大文字小文字を区別しない）' }),
    authProvider: DomainAuthMethodSchema.optional().openapi({ description: '認証方式で絞り込み' }),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine(
        (value) => [25, 50, 100, 200].includes(value),
        'limit must be one of 25, 50, 100, 200',
      )
      .default(50),
  })
  .openapi({
    title: 'GetDomainsQuery',
    description: 'ドメイン一覧取得クエリ',
  });

export const GetDomainsResponseSchema = z
  .object({
    items: z.array(DomainListItemSchema),
    pagination: z.object({
      page: z.number().int().min(1),
      limit: z.number().int(),
      totalItems: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
    count: z.number().int().nonnegative().openapi({
      example: 5,
      description: '全ドメイン数（ページネーション対象外）',
    }),
  })
  .openapi({
    title: 'GetDomainsResponse',
    description: 'ドメイン一覧レスポンス',
  });

export const CreateDomainBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, '名前を入力してください')
      .max(TEXT_MAX_LENGTH, `名前は${TEXT_MAX_LENGTH}文字以内で入力してください。`),
    domain: z
      .string()
      .trim()
      .min(1, 'ドメインを入力してください')
      .max(TEXT_MAX_LENGTH, `ドメインは${TEXT_MAX_LENGTH}文字以内で入力してください。`)
      .regex(BARE_DOMAIN_REGEX, 'ドメインの形式が正しくありません（例: joyfit.co.jp）'),
    authProvider: DomainAuthMethodSchema,
  })
  .openapi({
    title: 'CreateDomainBody',
    description: 'ドメイン作成リクエスト',
  });

export const UpdateDomainBodySchema = CreateDomainBodySchema.openapi({
  title: 'UpdateDomainBody',
  description: 'ドメイン更新リクエスト',
});

export const DeleteDomainResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'ドメインを削除しました' }),
  })
  .openapi({
    title: 'DeleteDomainResponse',
    description: 'ドメイン削除レスポンス',
  });

export const DeleteDomainBlockedResponseSchema = ErrorResponseSchema.extend({
  staffCount: z
    .number()
    .int()
    .nonnegative()
    .openapi({ example: 3, description: '紐づくスタッフ数' }),
}).openapi({
  title: 'DeleteDomainBlockedResponse',
  description: 'スタッフが紐づいているため削除できない場合のレスポンス',
});

export type DomainAuthMethod = z.infer<typeof DomainAuthMethodSchema>;
export type Domain = z.infer<typeof DomainSchema>;
export type DomainLinkedStaffSummary = z.infer<typeof DomainLinkedStaffSummarySchema>;
export type DomainListItem = z.infer<typeof DomainListItemSchema>;
export type DomainDetail = z.infer<typeof DomainDetailSchema>;
export type GetDomainsQueryParams = z.infer<typeof GetDomainsQueryParamsSchema>;
export type GetDomainsResponse = z.infer<typeof GetDomainsResponseSchema>;
export type CreateDomainBody = z.infer<typeof CreateDomainBodySchema>;
export type UpdateDomainBody = z.infer<typeof UpdateDomainBodySchema>;
export type DeleteDomainResponse = z.infer<typeof DeleteDomainResponseSchema>;
export type DeleteDomainBlockedResponse = z.infer<typeof DeleteDomainBlockedResponseSchema>;

export { ErrorResponseSchema };
