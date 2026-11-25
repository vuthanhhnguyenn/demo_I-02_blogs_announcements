import type { LessonHistoryEntryDto } from '@/lib/api-real/types.gen';

import { HISTORY_FIELD_LABELS, HISTORY_META_ACTION_DETAILS } from '../_constants/constants';

/**
 * 変更履歴 row wording derived from an API-111 history entry.
 *
 * The API returns a full `snapshot` per event — the §5.1 `Lesson` itself at the top level, plus
 * `deleteReason` / `meta` (API-111 §5.2) — but no change description, so 操作 / 変更内容 are
 * reconstructed here: the `meta.action` of image / restriction writes, the delete reason, and —
 * for a plain edit — a diff against the next-older snapshot when it is on the same page.
 */

export interface LessonHistoryRowText {
  /** 操作 badge text — a key of `HISTORY_ACTION_CLASSES`. */
  action: string;
  /** 変更内容, or null when nothing can be derived (rendered as '—'). */
  detail: string | null;
}

type SnapshotRecord = Record<string, unknown>;

function asRecord(value: unknown): SnapshotRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as SnapshotRecord)
    : null;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function snapshotLesson(entry: LessonHistoryEntryDto | undefined): SnapshotRecord | null {
  return entry ? asRecord(entry.snapshot) : null;
}

/** `undefined` and `null` both mean "unset" in a snapshot. */
function sameValue(a: unknown, b: unknown): boolean {
  return (a ?? null) === (b ?? null);
}

function describeEdit(
  lesson: SnapshotRecord | null,
  previous: SnapshotRecord | null,
): LessonHistoryRowText {
  // TODO(round2) B4: the history carries no change detail — without the previous snapshot on the
  // same page (the oldest row of a page, or a pre-snapshot row) 変更内容 cannot be derived.
  if (!lesson || !previous) return { action: '編集', detail: null };

  // A 無効化 through PATCH isActive=false is an `updated` event; its reason is never stored
  // (TODO(round2) B3), so such a row shows '—' unless other fields changed with it.
  const deactivated = previous.isActive === true && lesson.isActive === false;
  const changed = (Object.keys(HISTORY_FIELD_LABELS) as (keyof typeof HISTORY_FIELD_LABELS)[])
    .filter((field) => !sameValue(lesson[field], previous[field]))
    .map((field) => HISTORY_FIELD_LABELS[field]);

  return {
    action: deactivated ? '無効化' : '編集',
    detail: changed.length > 0 ? `${changed.join('・')}を変更` : null,
  };
}

/**
 * @param entry   the row to describe
 * @param older   the next-older entry on the same page (entries come newest first), if any
 */
export function describeLessonHistoryEntry(
  entry: LessonHistoryEntryDto,
  older: LessonHistoryEntryDto | undefined,
): LessonHistoryRowText {
  const meta = asRecord(entry.snapshot.meta) ?? {};
  const metaAction = typeof meta.action === 'string' ? meta.action : null;

  switch (entry.eventType) {
    case 'created':
      return {
        action: '作成',
        detail: asText(meta.duplicatedFrom) ? '既存のレッスンを複製して作成' : null,
      };

    case 'restored':
      return { action: '有効化', detail: null };

    case 'deleted': {
      // Rows written before `deleteReason` existed carry the reason in `meta.reason` only.
      const reason = asText(entry.snapshot.deleteReason) ?? asText(meta.reason);
      if (metaAction === 'deactivated_in_place_of_delete') {
        return {
          action: '無効化',
          detail: [
            'スケジュールで使用中のため、削除の代わりに無効化',
            reason ? `理由: ${reason}` : null,
          ]
            .filter(Boolean)
            .join(' / '),
        };
      }
      return { action: '削除', detail: reason ? `削除理由: ${reason}` : null };
    }

    case 'updated': {
      const describeMeta = metaAction ? HISTORY_META_ACTION_DETAILS[metaAction] : undefined;
      if (describeMeta) {
        const count = typeof meta.count === 'number' ? meta.count : null;
        return { action: '更新', detail: describeMeta(count) };
      }
      return describeEdit(snapshotLesson(entry), snapshotLesson(older));
    }

    default:
      return { action: '更新', detail: null };
  }
}
