'use client';

import { useState } from 'react';

import { formatDateYYYYMMDD } from '@/utils/date.util';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { PROMO_CODE_SCOPE_LABELS } from '../../_constants/constants';
import type { PromoCodesTabHook } from '../_hooks/use-promo-codes-tab';

const DESCRIPTION_MAX_LENGTH = 1000;
const UNLIMITED = '無制限';

function ReadOnlyField({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/**
 * 発行済みコードの編集。API-089 §6a により編集できるのは説明（配布メモ）のみ。
 * コード文字列・紐づきキャンペーンに加え、有効期間・使用上限・適用店舗も変更不可（新規発行で対応）。
 */
export function PromoCodeEditDialog({ tab }: Readonly<{ tab: PromoCodesTabHook }>) {
  const target = tab.editTarget;

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) tab.setEditTarget(null);
      }}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        {/* Remount per target so the draft always starts from the saved description. */}
        {target && <EditForm key={target.id} tab={tab} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditForm({ tab }: Readonly<{ tab: PromoCodesTabHook }>) {
  const target = tab.editTarget;
  const [description, setDescription] = useState(target?.description ?? '');
  if (!target) return null;

  const unchanged = description.trim() === (target.description ?? '');

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>プロモーションコードを編集</AlertDialogTitle>
        <AlertDialogDescription>
          変更できるのは説明のみです。有効期間・使用上限・適用店舗などを変更する場合は、無効化して新規発行してください。
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="flex min-w-0 flex-col gap-3 py-2">
        <ReadOnlyField label="コード">
          <code className="bg-muted w-fit rounded px-2 py-1 font-mono text-sm">{target.code}</code>
        </ReadOnlyField>
        <div className="grid grid-cols-2 gap-3">
          <ReadOnlyField label="有効期間">
            {formatDateYYYYMMDD(target.validFrom)} 〜 {formatDateYYYYMMDD(target.validTo)}
          </ReadOnlyField>
          <ReadOnlyField label="使用上限">
            {target.maxUses === null ? UNLIMITED : `${target.maxUses}回`}
          </ReadOnlyField>
          <ReadOnlyField label="適用店舗">
            {PROMO_CODE_SCOPE_LABELS[target.scopeType]}
          </ReadOnlyField>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="promo-code-description" className="text-muted-foreground text-xs">
            説明
          </Label>
          <Textarea
            id="promo-code-description"
            rows={3}
            className="field-sizing-fixed max-h-48 min-w-0 resize-y overflow-y-auto break-all"
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={tab.isUpdatingDescription}>キャンセル</AlertDialogCancel>
        <AlertDialogAction
          // Keep the dialog open until the request settles (onSuccess closes it).
          onClick={(event) => {
            event.preventDefault();
            tab.updateDescription(description);
          }}
          disabled={unchanged || tab.isUpdatingDescription}
        >
          保存する
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
