'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { toSelectItems } from '@/utils/app.util';
import { zodResolver } from '@hookform/resolvers/zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { DomainMasterSummaryDto } from '@/lib/api-real/types.gen';

import { DOMAIN_AUTH_METHOD_LABELS, DOMAIN_NAME_MAX_LENGTH } from '../_constants/domain.constants';
import { type DomainFormValues, domainFormSchema } from '../_schemas/domain-form.schema';

const AUTH_METHOD_SELECT_OPTIONS = (
  Object.entries(DOMAIN_AUTH_METHOD_LABELS) as [DomainFormValues['authProvider'], string][]
).map(([value, label]) => ({ value, label }));
const AUTH_METHOD_SELECT_ITEMS = toSelectItems(AUTH_METHOD_SELECT_OPTIONS);

type DomainFormInput = {
  name: string;
  domain: string;
  authProvider: DomainFormValues['authProvider'] | undefined;
};

interface DomainFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  domain: DomainMasterSummaryDto | null;
  isSubmitting: boolean;
  duplicateError: boolean;
  editBlockedError: boolean;
  editBlockedMessage: string;
  onOpenChange: (open: boolean) => void;
  onDismissDuplicateError: () => void;
  onSubmit: (values: DomainFormValues) => void;
}

export function DomainFormDialog({
  open,
  mode,
  domain,
  isSubmitting,
  duplicateError,
  editBlockedError,
  editBlockedMessage,
  onOpenChange,
  onDismissDuplicateError,
  onSubmit,
}: DomainFormDialogProps) {
  // The row passed in from the list already carries every editable field — no separate prefill
  // fetch is needed (the detail sheet re-reads `GET /{id}` for the read-only 作成者 fields only).
  const formValues = useMemo<DomainFormInput>(
    () =>
      mode === 'edit' && domain
        ? { name: domain.name, domain: domain.domain, authProvider: domain.authProvider }
        : { name: '', domain: '', authProvider: undefined },
    [mode, domain],
  );

  const form = useForm<DomainFormInput, unknown, DomainFormValues>({
    resolver: zodResolver(domainFormSchema) as never,
    mode: 'onChange',
    values: formValues,
  });

  const [pendingValues, setPendingValues] = useState<DomainFormValues | null>(null);

  /**
   * ドメイン・認証方式は紐づくスタッフがいる間 API 側で変更が拒否される (409 E-DMN-005) —
   * 再指定すると次回ログインで許可ドメイン外に取り残されるため。管理名はいつでも変更可能なので、
   * ここでは該当 2 項目だけを読み取り専用にして理由を添える。
   * 判定と N名 は「有効スタッフ」(`activeStaffCount` = 有効 + 招待中) で行う。`staffCount` は
   * 無効スタッフも含む表示用の件数なので、無効スタッフしかいないドメインはロックしない (Y-14 Bug No.14)。
   */
  const linkedStaffCount = mode === 'edit' ? (domain?.activeStaffCount ?? 0) : 0;
  const isDomainLocked = linkedStaffCount > 0;

  /**
   * FR-011 — 認証方式を変更するときは確認ダイアログを経てから保存する。
   *
   * スタッフが紐づいている間の変更は Y-14.md v2 でも仕様上不可（`409 E-DMN-005`。
   * 切り替える場合は Y-01 で無効化 → ドメイン編集 → 再招待）なので、この確認が開くのは
   * `activeStaffCount === 0` のときだけ（無効スタッフのみ紐づく場合は開き、文言の N名 は表示用の
   * `staffCount` = 全スタッフ数を出す — プロトタイプ準拠）。詳細は spec.md 「Q&A」Q5（解決済）/ integration-plan.md **D9**。
   */
  const handleFormSubmit = (values: DomainFormValues) => {
    if (mode === 'edit' && domain && values.authProvider !== domain.authProvider) {
      setPendingValues(values);
      return;
    }
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'ドメインを追加' : 'ドメインを編集'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'CRMへのアクセスを許可するドメインと、そのドメインのスタッフに適用する認証方式を登録します。'
              : 'ドメイン情報を編集してください。'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleFormSubmit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    管理名 <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: 株式会社ダフトクラフト"
                      maxLength={DOMAIN_NAME_MAX_LENGTH}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    ドメインに対応する管理用の名称。一覧での行識別と削除前の確認に使います
                  </p>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ドメイン <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例: daftcraft.co.jp"
                      disabled={isDomainLocked}
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        onDismissDuplicateError();
                      }}
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    @以降のドメイン部分を入力してください（例: joyfit.co.jp）
                  </p>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authProvider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    認証方式 <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <Select
                    items={AUTH_METHOD_SELECT_ITEMS}
                    // 未選択は null で渡し、初回描画から controlled にする (undefined だと Base UI が uncontrolled 扱い)
                    value={field.value ?? null}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // 認証方式を切り替えると同じドメインでも上限超過になり得るため、ドメイン側のエラーを再評価する
                      if (form.getValues('domain')) void form.trigger('domain');
                    }}
                    disabled={isDomainLocked}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AUTH_METHOD_SELECT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    このドメインのスタッフのCRM認証経路。Google Workspace保有企業はGoogle
                    SSO、非保有企業はIDaaSを選択
                  </p>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {isDomainLocked && (
              <Alert>
                <AlertDescription>
                  このドメインには{linkedStaffCount}
                  名のスタッフが紐づいているため、ドメインと認証方式は変更できません。管理名のみ変更できます。変更が必要な場合は、先にスタッフ管理で該当スタッフの所属変更または無効化を行ってください。
                </AlertDescription>
              </Alert>
            )}

            {duplicateError && (
              <Alert variant="destructive">
                <AlertDescription>このドメインは既に登録されています</AlertDescription>
              </Alert>
            )}

            {editBlockedError && (
              <Alert variant="destructive">
                <AlertDescription>{editBlockedMessage}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {mode === 'create' ? '追加する' : '変更を保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <AlertDialog
        open={pendingValues !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingValues(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>認証方式を変更しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="break-all">
                「{domain?.name}（{domain?.domain}）」
              </span>
              の認証方式を {domain && DOMAIN_AUTH_METHOD_LABELS[domain.authProvider]} から{' '}
              {pendingValues && DOMAIN_AUTH_METHOD_LABELS[pendingValues.authProvider]}{' '}
              に変更します。 このドメインに紐づくスタッフ{domain?.staffCount ?? 0}
              名の認証経路は、次回ログインから変更されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingValues) onSubmit(pendingValues);
                setPendingValues(null);
              }}
            >
              変更して保存
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
