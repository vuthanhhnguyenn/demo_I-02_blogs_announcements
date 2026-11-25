'use client';

import { useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListBlacklistQueryKey,
  adminMemberControllerListQueryKey,
  adminMemberControllerRegisterBlacklistMutation,
  adminMemberRelationsControllerChangeHistoryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { RegisterBlacklistDto } from '@/lib/api-real/types.gen';

/**
 * A-01 FR-074 — this dialog and the blacklist list's Sheet register through the same
 * endpoint with the same payload, so they share one option list, one schema and one set of
 * defaults rather than each keeping a copy.
 */
import {
  BLACKLIST_MEMO_MAX_LENGTH,
  BLACKLIST_REASON_OPTIONS,
} from '../../blacklist/_constants/blacklist.constants';
import {
  REGISTER_BLACKLIST_DEFAULT_VALUES,
  RegisterBlacklistFormSchema,
  type RegisterBlacklistFormValues,
} from '../../blacklist/_schemas/register-blacklist-form.schema';

type BlacklistReason = RegisterBlacklistDto['reasonCategories'][number];

// ── Props ─────────────────────────────────────────────────────────────────────
interface BlacklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  memberNumber: string;
}

// ── BlacklistDialog (ブラックリスト登録) ────────────────────────────────────────
export function BlacklistDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberNumber,
}: Readonly<BlacklistDialogProps>) {
  const queryClient = useQueryClient();

  const form = useForm<RegisterBlacklistFormValues>({
    resolver: zodResolver(RegisterBlacklistFormSchema),
    mode: 'onSubmit',
    defaultValues: REGISTER_BLACKLIST_DEFAULT_VALUES,
  });
  // Drives the footer button; RHF is the single source of truth for the field state
  const reason = useWatch({ control: form.control, name: 'reason' });
  // A second click lands before `isPending` re-renders the button disabled; a ref (not state)
  // is what the second handler call sees synchronously.
  const submittingRef = useRef(false);

  const mutation = useMutation({
    ...adminMemberControllerRegisterBlacklistMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: () => {
      toast.success('ブラックリストに登録しました', {
        description: `${memberName}（${memberNumber}）を登録しました`,
      });
      queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerListBlacklistQueryKey(),
      });
      // 変更履歴 is a separate cache, so a copy opened before the registration would stay stale.
      void queryClient.invalidateQueries({
        queryKey: adminMemberRelationsControllerChangeHistoryQueryKey({ path: { memberId } }),
      });
      handleClose();
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset(REGISTER_BLACKLIST_DEFAULT_VALUES);
    }, 300);
  };

  const register = (data: RegisterBlacklistFormValues) => {
    mutation.mutate({
      path: { memberId },
      /**
       * v0.4 — the single chosen reason travels as a one-element `reasonCategories`
       * array. The dialog stays single-select; only the wire shape changed (FR-074).
       * The retired `reason` field is not sent: the endpoint folds it into `memo`.
       */
      body: { reasonCategories: [data.reason], memo: data.memo?.trim() || undefined },
    });
  };

  const handleExecute = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    void form.handleSubmit(register, () => {
      submittingRef.current = false;
    })();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ブラックリストに登録しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。登録後、会員の個人情報は削除不可になります。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex min-w-0 flex-col gap-3 px-1 pb-2">
          {/* Target member */}
          <div className="rounded-lg border p-3 text-sm">
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-y-1.5">
              <span className="text-muted-foreground self-center text-xs">対象会員</span>
              <span className="font-medium break-all">{memberName}</span>
              <span className="text-muted-foreground self-center text-xs">会員ID</span>
              <span className="font-mono text-xs break-all">{memberNumber}</span>
              <span className="text-muted-foreground self-center text-xs">登録日</span>
              <span className="text-xs">本日（実行時に自動記録）</span>
            </div>
          </div>

          {/* 確認ダイアログの理由入力は「ユーザーが取り戻したい未保存データ」ではないため、
              離脱・ログアウト・ダイアログを閉じる操作を破棄確認で止めない。 */}
          <Form {...form} guardUnsaved={false}>
            {/* Registration reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel className="text-sm font-medium">
                    登録理由 <span className="text-destructive ml-1 text-xs">*</span>
                  </FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v as BlacklistReason)}
                    disabled={mutation.isPending}
                    items={BLACKLIST_REASON_OPTIONS}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="理由を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BLACKLIST_REASON_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Memo */}
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel htmlFor="blacklist-memo" className="text-sm font-medium">
                    メモ <span className="text-muted-foreground ml-1 text-xs">任意</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      id="blacklist-memo"
                      placeholder="補足情報を入力してください"
                      rows={3}
                      className="field-sizing-fixed resize-none text-sm"
                      // The shared schema caps `memo`; enforce it where the operator can see
                      // it, rather than surfacing the cap as a validation error after submit.
                      maxLength={BLACKLIST_MEMO_MAX_LENGTH}
                      disabled={mutation.isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Form>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            disabled={!reason || mutation.isPending}
            onClick={handleExecute}
          >
            登録を実行
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
