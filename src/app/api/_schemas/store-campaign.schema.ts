import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { CampaignAcceptStateSchema } from './campaign.schema';
import { StoreListBrandSchema } from './store.schema';

extendZodWithOpenApi(z);

/**
 * G-03 "select store-use campaigns" — the store side of the campaign link, rendered on the
 * contract-and-pricing tab of the store detail screen.
 *
 * The BE design (API-088 §10) returns only `campaignId` / `brandEnum` / `name` / `planId` /
 * `planName` / `isAccepting` / `linkedAt`. The prototype's table also needs the discount
 * summary, the recruitment period, a three-state acceptance and whether the campaign is
 * published to this store, so the mock supplies those four
 * (`specs/027-store-detail/spec.md` Appendix A.7).
 */
export const StoreCampaignSchema = z
  .object({
    id: z.string().openapi({ example: 'CP001', description: 'キャンペーンID' }),
    name: z.string().openapi({ example: '春の入会キャンペーン' }),
    brand: StoreListBrandSchema.openapi({ description: 'キャンペーンのブランド' }),
    discount_summary: z
      .string()
      .openapi({ example: '入会金無料 + 初月半額', description: '割引概要' }),
    period_start: z.string().openapi({ example: '2026/03/01', description: '募集開始日' }),
    period_end: z.string().openapi({ example: '2026/04/30', description: '募集終了日' }),
    accept_state: CampaignAcceptStateSchema.openapi({ description: '受付可否' }),
    published_to_store: z.boolean().openapi({
      description: '本部の公開店舗設定で自店舗が対象か（対象外でも紐づけ行は残す）',
    }),
    linked_at: z
      .string()
      .nullable()
      .openapi({ example: '2026/02/20', description: '紐づけ日 — 未紐づけなら null' }),
  })
  .openapi({ title: 'StoreCampaign', description: '店舗に紐づくキャンペーン' });

export const GetStoreCampaignsResponseSchema = z
  .object({
    campaigns: z.array(StoreCampaignSchema).openapi({ description: '紐づけ日の昇順' }),
  })
  .openapi({ title: 'GetStoreCampaignsResponse' });

export const GetStoreCampaignCandidatesQuerySchema = z
  .object({
    keyword: z
      .string()
      .optional()
      .openapi({ description: 'キャンペーン名・IDの部分一致（サーバー側で適用）' }),
  })
  .openapi({ title: 'GetStoreCampaignCandidatesQuery' });

/**
 * Candidates are every campaign **not** already linked to the store. Ineligible ones are
 * returned too — the sheet lists them dimmed with the reason — so the response carries the
 * fields the reason is derived from rather than the reason itself.
 */
export const GetStoreCampaignCandidatesResponseSchema = z
  .object({
    campaigns: z.array(StoreCampaignSchema).openapi({ description: '未紐づけのキャンペーン' }),
    store_brand: StoreListBrandSchema.openapi({
      description: '自店舗のブランド（ブランド対象外の判定に使う）',
    }),
  })
  .openapi({ title: 'GetStoreCampaignCandidatesResponse' });

export const LinkStoreCampaignsRequestSchema = z
  .object({
    campaign_ids: z.array(z.string()).min(1).openapi({
      description: '紐づけるキャンペーンID。プロトタイプは複数同時に紐づける',
    }),
  })
  .openapi({ title: 'LinkStoreCampaignsRequest' });

export const LinkStoreCampaignsResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'キャンペーンを紐づけました' }),
    campaigns: z.array(StoreCampaignSchema),
  })
  .openapi({ title: 'LinkStoreCampaignsResponse' });

export const UnlinkStoreCampaignResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'キャンペーンの紐づけを解除しました' }),
  })
  .openapi({ title: 'UnlinkStoreCampaignResponse' });

export type StoreCampaign = z.infer<typeof StoreCampaignSchema>;
export type GetStoreCampaignsResponse = z.infer<typeof GetStoreCampaignsResponseSchema>;
export type GetStoreCampaignCandidatesResponse = z.infer<
  typeof GetStoreCampaignCandidatesResponseSchema
>;
export type LinkStoreCampaignsRequest = z.infer<typeof LinkStoreCampaignsRequestSchema>;
