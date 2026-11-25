'use client';

import type { ReactNode } from 'react';
import type { FieldErrors, FieldValues } from 'react-hook-form';

import { ShieldAlert } from 'lucide-react';

import { BackLink } from '@/components/common/back-link';
import { BackToListLink } from '@/components/common/back-to-list-link';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';

import { navigate } from '@/lib/routes/routes.util';

export type StoreFormMode = 'create' | 'edit';

export const STORE_FORM_TITLES: Record<StoreFormMode, string> = {
  create: '店舗新規登録',
  edit: '店舗編集',
};

/**
 * Y-02 permission matrix L196-198 — the line naming who may perform each mode.
 * Verbatim from the prototype (`store-form.tsx` L224-227).
 */
const NO_ACCESS_REASON: Record<StoreFormMode, string> = {
  create: '店舗の新規登録は本部・System 権限のみ操作できます。',
  edit: '店舗情報の編集は本部・System 権限、または所属店舗のスタッフのみ操作できます。',
};

/**
 * Page chrome shared by the store create and edit screens: the back link and title, then the
 * body column.
 *
 * List to form is a single step, so the header carries a `BackLink` rather than a breadcrumb,
 * as the prototype has it (`store-form.tsx` L241-247) and as `back-link.tsx` states for the
 * list-to-form transition.
 *
 * `onBack` is the caller's unsaved-changes guard (FR-003, FR-101). The wall passes none: there
 * is nothing to discard behind it, so its own link leaves straight away.
 */
export function StoreFormShell({
  mode,
  onBack,
  children,
}: Readonly<{ mode: StoreFormMode; onBack?: () => void; children: ReactNode }>) {
  const title = STORE_FORM_TITLES[mode];

  return (
    <div>
      <PageHeader
        breadcrumb={
          onBack ? (
            <BackLink label="店舗管理に戻る" onClick={onBack} />
          ) : (
            <BackToListLink label="店舗管理に戻る" listPath={navigate('/stores')} />
          )
        }
        title={title}
      />

      {/* Prototype `store-form.tsx` L251: the body column is capped at 960px */}
      <div className="mx-auto max-w-240 px-4 pt-4 pb-8">{children}</div>
    </div>
  );
}

/**
 * Y-02 permission matrix: store registration is System / Headquarter only, and basic-info editing excludes
 * Manager / Trainer / Observer entirely. Those roles get this wall instead of a form they
 * cannot use (spec 028 FR-082).
 */
export function StoreFormNoAccess({ mode }: Readonly<{ mode: StoreFormMode }>) {
  return (
    <StoreFormShell mode={mode}>
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <ShieldAlert className="text-muted-foreground size-10" />
          <h2 className="text-base font-semibold">アクセス権限がありません</h2>
          <p className="text-muted-foreground text-sm">{NO_ACCESS_REASON[mode]}</p>
        </div>
      </div>
    </StoreFormShell>
  );
}

/**
 * The form footer: the two exits plus the one guidance line beside them.
 *
 * In flow at the end of the form column, as the prototype has it (`store-form.tsx` L454) — a
 * fixed footer would run under the sidebar and clip the guidance line's left edge.
 *
 * A validation failure takes precedence over the restricted-Staff line, so the two are never
 * shown together (spec 028 FR-067, FR-085, prototype L455-459). `hasErrors` means a client-side
 * validation failure only — a refusal from the server is not an unfilled field (BUG-U2-06); see
 * `hasValidationErrors`.
 */
export function StoreFormFooter({
  mode,
  hasErrors,
  restricted,
  submitting,
  submitDisabled = false,
  photosUploading = false,
  onCancel,
  onSubmit,
}: Readonly<{
  mode: StoreFormMode;
  hasErrors: boolean;
  restricted: boolean;
  submitting: boolean;
  /** Edit mode passes the untouched-form state: nothing to save, so the button stays inert */
  submitDisabled?: boolean;
  /** FR-059c — a 店舗写真 upload is still in flight, so there is no key to save yet */
  photosUploading?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}>) {
  // `mb-24` keeps the buttons clear of the bottom-right toast stack once the page is scrolled to
  // its end: at 1024×768 a save error's toast otherwise sits on キャンセル / 保存する (BUG-U2-09)
  return (
    <div className="mt-6 mb-24 border-t p-4">
      <div className="flex items-center justify-end gap-2">
        {hasErrors ? (
          <p className="text-destructive mr-auto text-xs">未入力の項目があります</p>
        ) : restricted ? (
          /* FR-085 / FR-086a — V0's line (L567) plus 店舗写真, for the dev-added photo card */
          <p className="text-muted-foreground mr-auto text-xs">
            店舗名・住所・電話番号・営業時間・店舗写真のみ編集できます。それ以外の項目は本部へ変更を依頼してください
          </p>
        ) : null}
        <Button type="button" size="lg" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={submitting || submitDisabled || photosUploading}
          onClick={onSubmit}
        >
          {submitting
            ? mode === 'edit'
              ? '保存中...'
              : '登録中...'
            : mode === 'edit'
              ? '保存する'
              : '登録する'}
        </Button>
      </div>
    </div>
  );
}

/**
 * True when the form holds a validation error of its own. Errors the pages set from a server
 * refusal (`type: 'server'` — a duplicate store code, a brand change refused after opening) stay on
 * their field but do not raise the footer's 未入力の項目があります (BUG-U2-06).
 */
export function hasValidationErrors<T extends FieldValues>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(
    (error) => !(error && typeof error === 'object' && 'type' in error && error.type === 'server'),
  );
}
