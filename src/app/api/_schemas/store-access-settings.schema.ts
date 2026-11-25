import { StoreListBrandSchema } from '@/app/api/_schemas/store.schema';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const PermittedStoreSchema = z
  .object({
    id: z.string(),
    store_name: z.string(),
    brand: StoreListBrandSchema,
    setup_date: z.string().openapi({ description: '設定日 (yyyy/MM/dd)' }),
  })
  .openapi('PermittedStore', {
    title: 'PermittedStore',
    description: '相互利用グループの許可店舗行',
  });

export const StoreAccessSettingsSchema = z
  .object({
    mutual_use_enabled: z.boolean(),
    /**
     * Y-02 FR-004 daily deferred-payment setting (#255, #376) — whether Dokodemo JOY visits to
     * other stores are billed a day at a time in arrears. The BE design's `MutualUseSettingsDto`
     * has no such field, so the mock supplies it.
     */
    deferred_payment_enabled: z.boolean().openapi({ description: '1日単位の後払い設定' }),
    start_date: z.string(),
    end_date: z.string(),
    under18_start_time: z.string(),
    under18_end_time: z.string(),
    permitted_stores: z.array(PermittedStoreSchema),
    /**
     * Y-02 FR-004 yoga usage fee: JPY 3,000 per day, billed to the store that is visited.
     * The prototype shows a single row, so this is one amount rather than a price table.
     */
    yoga_usage_fee: z.number().openapi({ description: 'どこでもJOY YOGA利用料金（1日・税込）' }),
  })
  .openapi('StoreAccessSettings', {
    title: 'StoreAccessSettings',
    description: '店舗の入退館・相互利用設定（mock）',
  });

export const GetStoreAccessSettingsResponseSchema = StoreAccessSettingsSchema.openapi(
  'GetStoreAccessSettingsResponse',
  {
    title: 'GetStoreAccessSettingsResponse',
  },
);

export const UpdateStoreAccessSettingsRequestSchema = StoreAccessSettingsSchema.openapi(
  'UpdateStoreAccessSettingsRequest',
  {
    title: 'UpdateStoreAccessSettingsRequest',
  },
);

export const UpdateStoreAccessSettingsResponseSchema = z
  .object({
    message: z.string(),
    access_settings: StoreAccessSettingsSchema,
  })
  .openapi('UpdateStoreAccessSettingsResponse', {
    title: 'UpdateStoreAccessSettingsResponse',
  });

export type StoreAccessSettings = z.infer<typeof StoreAccessSettingsSchema>;
