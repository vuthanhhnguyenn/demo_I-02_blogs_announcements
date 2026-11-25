import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/**
 * Y-02 FR-003 1DayPass price setting.
 *
 * Phase 1 fixes the permitted range as a system constant (JPY 700 to JPY 1,800); the head-office UI
 * for changing it is Y-07 Phase 2 (#311). The BE design constrains the same range in the
 * schema (`422 E-STR-009` outside it).
 */
export const ONE_DAY_PASS_MIN_PRICE = 700;
export const ONE_DAY_PASS_MAX_PRICE = 1800;

export const OneDayPassExceptionSchema = z
  .object({
    date: z.string().openapi({ example: '2026-03-20', description: '適用日 YYYY-MM-DD' }),
    price: z
      .number()
      .int()
      .min(ONE_DAY_PASS_MIN_PRICE)
      .max(ONE_DAY_PASS_MAX_PRICE)
      .openapi({ example: 1800, description: '販売価格（税込）' }),
    note: z.string().nullable().openapi({ example: '春分の日・繁忙期価格', description: '備考' }),
  })
  .openapi({ title: 'OneDayPassException', description: '日付単位の1DayPass価格' });

export const GetStoreOneDayPassPriceResponseSchema = z
  .object({
    /**
     * Base price. Resolved as the store's own default price, falling back to the 1Day-use plan
     * master when the store has none (`specs/027-store-detail/spec.md` FR-050a). Nothing on
     * the store detail screen sets it.
     */
    base_price: z.number().int().openapi({ example: 1650, description: '基準価格（税込）' }),
    min_price: z.number().int().openapi({ example: ONE_DAY_PASS_MIN_PRICE }),
    max_price: z.number().int().openapi({ example: ONE_DAY_PASS_MAX_PRICE }),
    exceptions: z
      .array(OneDayPassExceptionSchema)
      .openapi({ description: '日付単位の価格設定（日付昇順）' }),
  })
  .openapi({ title: 'GetStoreOneDayPassPriceResponse' });

/**
 * The BE design upserts one date per call (`PUT …/one-day-pass-exceptions/{date}`); the
 * prototype applies one price to every selected date in a single action, so the mock takes
 * the whole date set and applies the same per-date upsert semantics to each.
 */
export const UpsertStoreOneDayPassExceptionsRequestSchema = z
  .object({
    dates: z
      .array(z.string())
      .min(1)
      .openapi({ example: ['2026-03-20'], description: '適用する日付 YYYY-MM-DD' }),
    price: z
      .number()
      .int()
      .min(ONE_DAY_PASS_MIN_PRICE)
      .max(ONE_DAY_PASS_MAX_PRICE)
      .openapi({
        example: 1200,
        description: `販売価格（税込）— ¥${ONE_DAY_PASS_MIN_PRICE}〜¥${ONE_DAY_PASS_MAX_PRICE}`,
      }),
    note: z.string().nullable().optional().openapi({ example: 'GW特別価格' }),
  })
  .openapi({ title: 'UpsertStoreOneDayPassExceptionsRequest' });

export const DeleteStoreOneDayPassExceptionsRequestSchema = z
  .object({
    dates: z.array(z.string()).min(1).openapi({ description: '設定を解除する日付' }),
  })
  .openapi({ title: 'DeleteStoreOneDayPassExceptionsRequest' });

export const MutateStoreOneDayPassExceptionsResponseSchema = z
  .object({
    message: z.string().openapi({ example: '1DayPass価格を設定しました' }),
    exceptions: z.array(OneDayPassExceptionSchema),
  })
  .openapi({ title: 'MutateStoreOneDayPassExceptionsResponse' });

export type OneDayPassException = z.infer<typeof OneDayPassExceptionSchema>;
export type GetStoreOneDayPassPriceResponse = z.infer<typeof GetStoreOneDayPassPriceResponseSchema>;
export type UpsertStoreOneDayPassExceptionsRequest = z.infer<
  typeof UpsertStoreOneDayPassExceptionsRequestSchema
>;
export type DeleteStoreOneDayPassExceptionsRequest = z.infer<
  typeof DeleteStoreOneDayPassExceptionsRequestSchema
>;
