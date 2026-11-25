import type {
  BlogBrandCode,
  BlogCreateBody,
  BlogDetail,
  BlogFormBrandId,
  BlogOperator,
  BlogPublishMethod,
  BlogUpdateBody,
} from '@/app/(private)/blogs/_types/blog.type';
import { parseDate, toJstPickerDate } from '@/utils/date.util';
import { startOfDay } from 'date-fns';

import {
  type AnnouncementFormStore,
  type AnnouncementFormValues,
  type AnnouncementLoadedPublish,
  hasBodyText,
  isUnchangedSchedule,
  toPublishEndInstant,
} from './announcement-form.schema';

type BlogTargetFields = Pick<
  BlogCreateBody,
  'brandScope' | 'brandCode' | 'subBrandCodes' | 'storeScope' | 'targetStoreIds' | 'targetStores'
>;

type BlogSubBrandCode = NonNullable<BlogCreateBody['subBrandCodes']>[number];

/** Edit default of 公開方法 per status (Clarification Q3, research F6). */
/** An emptied editor still holds markup such as `<p><br></p>`; save it as `''` (Q1, gap AF-01). */
function toSavedBody(body: string): string {
  return hasBodyText(body) ? body : '';
}

export function publishMethodFromStatus(status: BlogDetail['publishStatus']): BlogPublishMethod {
  switch (status) {
    case 'published':
      return 'now';
    case 'scheduled':
      return 'scheduled';
    case 'draft':
      return 'draft';
    case 'unpublished':
      return 'keepUnpublished';
  }
}

/** 対象ブランド checkboxes of a ブランド指定 article: whole JOYFIT, its sub-brands, or FIT365. */
function detailToBrands(detail: BlogDetail): BlogFormBrandId[] {
  if (detail.brandScope !== 'brand' || !detail.brandCode) return [];
  if (detail.brandCode === 'Fit365') return ['Fit365'];
  if (!detail.subBrandCodes) return ['joyfitAll'];
  return detail.subBrandCodes.filter(
    (code): code is Exclude<BlogFormBrandId, 'joyfitAll' | 'Fit365'> =>
      code === 'Joyfit' || code === 'Joyfit24' || code === 'JoyfitYoga' || code === 'JoyfitPlus',
  );
}

/**
 * The detail carries store names only; the brand is approximated from the article (family, or
 * its single sub-brand) and replaced by the store master's value once the selection changes.
 */
function detailStoreBrand(detail: BlogDetail): BlogBrandCode {
  if (detail.brandCode === 'Fit365') return 'Fit365';
  const subs = detail.subBrandCodes ?? [];
  const single = subs.length === 1 ? subs[0] : undefined;
  return single === 'Joyfit24' || single === 'JoyfitYoga' || single === 'JoyfitPlus'
    ? single
    : 'Joyfit';
}

/** Picker value (JST calendar day as local midnight) of an ISO 掲載終了日時. */
function toPublishEndDate(iso: string | null): Date | null {
  const instant = parseDate(iso);
  if (!instant) return null;
  return startOfDay(toJstPickerDate(instant));
}

/** Publish setting of a loaded article, for the edit-mode schema rules (M5 / L1). */
export function toLoadedPublish(detail: BlogDetail): AnnouncementLoadedPublish {
  return {
    method: publishMethodFromStatus(detail.publishStatus),
    publishStartAt: parseDate(detail.publishStartAt),
  };
}

/** data-model.md "Reverse mapping". */
export function announcementDetailToFormValues(detail: BlogDetail): AnnouncementFormValues {
  const storeBrand = detailStoreBrand(detail);
  return {
    title: detail.title,
    body: detail.body,
    thumbnailS3Key: detail.thumbnailS3Key,
    thumbnailUrl: detail.thumbnailUrl,
    categoryId: detail.categoryId,
    scope: detail.brandScope,
    brands: detailToBrands(detail),
    stores:
      detail.brandScope === 'store'
        ? detail.targetStores.map((store) => ({ ...store, brandEnum: storeBrand }))
        : [],
    channelWeb: detail.channelWeb,
    channelApp: detail.channelApp,
    publishMethod: publishMethodFromStatus(detail.publishStatus),
    publishAt: detail.publishStatus === 'scheduled' ? parseDate(detail.publishStartAt) : null,
    publishEndDate: toPublishEndDate(detail.publishEndAt),
  };
}

/** Distinct JOYFIT sub-brands of the stores, or null for a FIT365 selection (research F3). */
function storeSubBrands(stores: AnnouncementFormStore[]): BlogSubBrandCode[] | null {
  if (stores.some((store) => store.brandEnum === 'Fit365')) return null;
  return [...new Set(stores.map((store) => store.brandEnum))];
}

/** data-model.md "Mapping to the request" — the three delivery axes (research F1 / F3). */
function toTargetFields(values: AnnouncementFormValues): BlogTargetFields {
  if (values.scope === 'company') {
    return {
      brandScope: 'company',
      brandCode: null,
      subBrandCodes: null,
      storeScope: 'all',
      targetStoreIds: [],
      targetStores: [],
    };
  }

  if (values.scope === 'brand') {
    const isFit365 = values.brands.includes('Fit365');
    const subs = values.brands.filter(
      (id): id is Exclude<BlogFormBrandId, 'joyfitAll' | 'Fit365'> =>
        id !== 'joyfitAll' && id !== 'Fit365',
    );
    return {
      brandScope: 'brand',
      brandCode: isFit365 ? 'Fit365' : 'Joyfit',
      subBrandCodes: isFit365 || values.brands.includes('joyfitAll') ? null : subs,
      storeScope: 'all',
      targetStoreIds: [],
      targetStores: [],
    };
  }

  const isFit365 = values.stores.some((store) => store.brandEnum === 'Fit365');
  return {
    brandScope: 'store',
    brandCode: isFit365 ? 'Fit365' : 'Joyfit',
    subBrandCodes: storeSubBrands(values.stores),
    storeScope: 'specific',
    targetStoreIds: values.stores.map((store) => store.id),
    // Mock-only seam BF-01: store names for list / detail.
    targetStores: values.stores.map(({ id, name }) => ({ id, name })),
  };
}

function toPublishEndAt(values: AnnouncementFormValues): string | null {
  return values.publishEndDate ? toPublishEndInstant(values.publishEndDate).toISOString() : null;
}

/** `publishStatus` written for a chosen method (`keepUnpublished` never writes one). */
const PUBLISH_STATUS_BY_METHOD = {
  now: 'published',
  scheduled: 'scheduled',
  draft: 'draft',
} as const satisfies Record<Exclude<BlogPublishMethod, 'keepUnpublished'>, string>;

export function announcementFormToCreateBody(
  values: AnnouncementFormValues,
  operator: BlogOperator | undefined,
): BlogCreateBody {
  const method = values.publishMethod === 'keepUnpublished' ? 'draft' : values.publishMethod;
  return {
    type: 'notice',
    title: values.title.trim(),
    body: toSavedBody(values.body),
    categoryId: values.categoryId,
    thumbnailS3Key: values.thumbnailS3Key,
    ...toTargetFields(values),
    channelWeb: values.channelWeb,
    channelApp: values.channelApp,
    publishStatus: PUBLISH_STATUS_BY_METHOD[method],
    // 即時公開: the server sets the start to the save time.
    publishStartAt:
      method === 'scheduled'
        ? (values.publishAt?.toISOString() ?? null)
        : method === 'draft'
          ? null
          : undefined,
    publishEndAt: toPublishEndAt(values),
    operator,
  };
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/** Whether the delivery target still equals the loaded article (then the target is not sent). */
function isTargetUnchanged(values: AnnouncementFormValues, detail: BlogDetail): boolean {
  if (values.scope !== detail.brandScope) return false;
  if (values.scope === 'brand') return sameIds(values.brands, detailToBrands(detail));
  if (values.scope === 'store') {
    return sameIds(
      values.stores.map((store) => store.id),
      detail.targetStoreIds,
    );
  }
  return true;
}

/**
 * PATCH body (research F6): the publish method is sent only when it changed — unchanged or
 * 非公開のまま保存 leaves `publishStatus` out, and an unchanged 公開中 keeps its original start.
 */
export function announcementFormToUpdateBody(
  values: AnnouncementFormValues,
  detail: BlogDetail,
  operator: BlogOperator | undefined,
): BlogUpdateBody {
  const method = values.publishMethod;
  const isMethodChanged =
    method !== 'keepUnpublished' && method !== publishMethodFromStatus(detail.publishStatus);

  const publishFields: Pick<BlogUpdateBody, 'publishStatus' | 'publishStartAt'> = {};
  // An unchanged 予約公開 date-time is not re-sent, so the server does not re-check "future".
  if (method !== 'keepUnpublished' && !isUnchangedSchedule(values, toLoadedPublish(detail))) {
    if (isMethodChanged) publishFields.publishStatus = PUBLISH_STATUS_BY_METHOD[method];
    if (method === 'scheduled') publishFields.publishStartAt = values.publishAt?.toISOString();
    if (method === 'draft') publishFields.publishStartAt = null;
  }

  // Unchanged thumbnail / end date (same JST day) are left out; the server keeps its values.
  const isPublishEndChanged =
    (values.publishEndDate?.getTime() ?? null) !==
    (toPublishEndDate(detail.publishEndAt)?.getTime() ?? null);

  return {
    title: values.title.trim(),
    body: toSavedBody(values.body),
    categoryId: values.categoryId,
    ...(values.thumbnailS3Key === detail.thumbnailS3Key
      ? {}
      : { thumbnailS3Key: values.thumbnailS3Key }),
    ...(isTargetUnchanged(values, detail) ? {} : toTargetFields(values)),
    channelWeb: values.channelWeb,
    channelApp: values.channelApp,
    ...publishFields,
    ...(isPublishEndChanged ? { publishEndAt: toPublishEndAt(values) } : {}),
    expectedUpdatedAt: detail.updatedAt,
    operator,
  };
}
