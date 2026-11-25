import { z } from 'zod';

import type { AppStoreUrlListResponseDto, PutAppStoreUrlsDto } from '@/lib/api-real/types.gen';

import { APP_STORE_URL_FIELDS, type AppStoreUrlKey } from '../_constants/app-version.constants';

const URL_MAX_LENGTH = 2048;

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** FR-M006: required and URL 形式. */
function storeUrlField(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label}を入力してください`)
    .max(URL_MAX_LENGTH, `${label}は${URL_MAX_LENGTH}文字以内で入力してください`)
    .refine(isHttpUrl, { message: 'URL の形式で入力してください' });
}

export const AppStoreUrlFormSchema = z.object(
  Object.fromEntries(
    APP_STORE_URL_FIELDS.map(({ key, label }) => [key, storeUrlField(label)]),
  ) as Record<AppStoreUrlKey, ReturnType<typeof storeUrlField>>,
);

export type AppStoreUrlFormValues = z.infer<typeof AppStoreUrlFormSchema>;

export function appStoreUrlsToFormValues(
  data: AppStoreUrlListResponseDto | undefined,
): AppStoreUrlFormValues {
  const values = {} as AppStoreUrlFormValues;
  for (const { key, brand, os } of APP_STORE_URL_FIELDS) {
    values[key] = data?.items.find((item) => item.brand === brand && item.os === os)?.url ?? '';
  }
  return values;
}

export function appStoreUrlFormValuesToBody(values: AppStoreUrlFormValues): PutAppStoreUrlsDto {
  return values;
}
