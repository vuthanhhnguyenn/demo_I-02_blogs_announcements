import { TEXT_EDITOR_MAX_LENGTH, TEXT_MAX_LENGTH } from '@/constants/app.constants';
import { fromJstPickerDate, toJstPickerDate } from '@/utils/date.util';
import { endOfDay, startOfDay } from 'date-fns';
import { z } from 'zod';

import {
  BLOG_BRAND_CODES,
  BLOG_FORM_BRAND_IDS,
  BLOG_PUBLISH_METHODS,
} from '../_constants/blog.constants';
import type { BlogPublishMethod } from '../_types/blog.type';

/** A targeted store; `brandEnum` gives its family for the one-family rule (Clarification Q2). */
const blogFormStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  brandEnum: z.enum(BLOG_BRAND_CODES),
});

/** Visible text of the Quill HTML (tags, entities and whitespace dropped) — FR-004 "required". */
export function hasBodyText(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0
  );
}

/** 掲載終了日 = the end of that JST day (data-model "Mapping": end of day JST). */
export function toPublishEndInstant(date: Date): Date {
  return fromJstPickerDate(endOfDay(date));
}

/** Edit mode: the publish setting the form was loaded with (method + ISO start as a Date). */
export interface BlogLoadedPublish {
  method: BlogPublishMethod;
  publishStartAt: Date | null;
}

/** Edit mode: 予約公開 kept with the loaded date-time — not re-checked, not re-sent (M5). */
export function isUnchangedSchedule(
  values: Pick<BlogFormValues, 'publishMethod' | 'publishAt'>,
  loaded: BlogLoadedPublish | undefined,
): boolean {
  return (
    values.publishMethod === 'scheduled' &&
    loaded?.method === 'scheduled' &&
    !!values.publishAt &&
    !!loaded.publishStartAt &&
    values.publishAt.getTime() === loaded.publishStartAt.getTime()
  );
}

/** JST calendar day of an instant, as a comparable local-midnight timestamp. */
function jstDay(instant: Date): number {
  return startOfDay(toJstPickerDate(instant)).getTime();
}

/** Calendar day of a 掲載終了日 picker value (already a JST day at local midnight). */
function pickerDay(date: Date): number {
  return startOfDay(date).getTime();
}

const blogFormObjectSchema = z.object({
  title: z.string().max(TEXT_MAX_LENGTH, `タイトルは${TEXT_MAX_LENGTH}文字以内で入力してください`),
  body: z
    .string()
    .max(TEXT_EDITOR_MAX_LENGTH, `本文は${TEXT_EDITOR_MAX_LENGTH}文字以内で入力してください`),
  thumbnailS3Key: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  categoryId: z.string().nullable(),
  scope: z.enum(['company', 'brand', 'store'], { error: '配信範囲を選択してください' }),
  brands: z.array(z.enum(BLOG_FORM_BRAND_IDS)),
  stores: z.array(blogFormStoreSchema),
  channelWeb: z.boolean(),
  channelApp: z.boolean(),
  publishMethod: z.enum(BLOG_PUBLISH_METHODS, { error: '公開方法を選択してください' }),
  publishAt: z.date({ error: '公開日時を指定してください' }).nullable(),
  publishEndDate: z.date({ error: '掲載終了日を指定してください' }).nullable(),
});

/**
 * specs/blog-form data-model.md "Form values". Edit mode passes the loaded publish setting so an
 * unchanged 予約公開 skips the "future" rule and an unchanged 公開中 keeps its original start.
 */
export function createBlogFormSchema({ loaded }: { loaded?: BlogLoadedPublish } = {}) {
  return blogFormObjectSchema.superRefine((data, ctx) => {
    // Required checks live here so a blank field never short-circuits the cross-field rules.
    if (!data.title.trim()) {
      ctx.addIssue({ code: 'custom', path: ['title'], message: 'タイトルを入力してください' });
    }
    if (!hasBodyText(data.body)) {
      ctx.addIssue({ code: 'custom', path: ['body'], message: '本文を入力してください' });
    }

    if (data.scope === 'brand') {
      if (data.brands.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['brands'],
          message: '対象ブランドを1つ以上選択してください',
        });
      } else if (data.brands.includes('Fit365') && data.brands.some((id) => id !== 'Fit365')) {
        // BF-04: one article holds one brandCode.
        ctx.addIssue({
          code: 'custom',
          path: ['brands'],
          message: 'JOYFITとFIT365は同時に選択できません',
        });
      }
    }

    if (data.scope === 'store') {
      if (data.stores.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['stores'],
          message: '対象店舗を1つ以上選択してください',
        });
      } else {
        const fit365Count = data.stores.filter((store) => store.brandEnum === 'Fit365').length;
        if (fit365Count > 0 && fit365Count < data.stores.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['stores'],
            message: '同一ブランドの店舗を選択してください',
          });
        }
      }
    }

    if (!data.channelWeb && !data.channelApp) {
      ctx.addIssue({
        code: 'custom',
        path: ['channelWeb'],
        message: 'WEBサイト・モバイルアプリのいずれか1つ以上を選択してください',
      });
    }

    const now = new Date();
    if (data.publishMethod === 'scheduled') {
      if (!data.publishAt) {
        ctx.addIssue({
          code: 'custom',
          path: ['publishAt'],
          message: '公開日時を指定してください',
        });
      } else if (data.publishAt <= now && !isUnchangedSchedule(data, loaded)) {
        ctx.addIssue({
          code: 'custom',
          path: ['publishAt'],
          message: '公開日時は現在より後の日時を指定してください',
        });
      }
    }

    if (data.publishEndDate) {
      // E-NTC-009 / spec Edge Cases: the end date must be a later JST calendar day than the
      // publish date (scheduled date-time; for 即時公開 the kept original start, else now).
      const keepsPublishedStart = data.publishMethod === 'now' && loaded?.method === 'now';
      const start =
        data.publishMethod === 'scheduled'
          ? data.publishAt
          : data.publishMethod === 'now'
            ? ((keepsPublishedStart ? loaded.publishStartAt : null) ?? now)
            : null;
      if (start && pickerDay(data.publishEndDate) <= jstDay(start)) {
        ctx.addIssue({
          code: 'custom',
          path: ['publishEndDate'],
          message: '掲載終了日は公開日時より後の日付を指定してください',
        });
      }
    }
  });
}

export type BlogFormValues = z.infer<typeof blogFormObjectSchema>;
export type BlogFormStore = BlogFormValues['stores'][number];

/** Create defaults (spec US1-AC1): WEB + アプリ on, 即時公開; the page sets the scope by role. */
export const emptyBlogFormValues: BlogFormValues = {
  title: '',
  body: '',
  thumbnailS3Key: null,
  thumbnailUrl: null,
  categoryId: null,
  scope: 'company',
  brands: [],
  stores: [],
  channelWeb: true,
  channelApp: true,
  publishMethod: 'now',
  publishAt: null,
  publishEndDate: null,
};
