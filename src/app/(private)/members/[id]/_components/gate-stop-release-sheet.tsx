'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { formatDateTime } from '@/utils/format.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';

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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import { getApiErrorStatus } from '@/lib/api-error.util';
import {
  adminMemberControllerClearGateStopMutation,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { ClearGateStopDto, MemberGateStopDto } from '@/lib/api-real/types.gen';

import { GATE_STOP_PATTERN_LABELS } from '../_constants/gate-stop';

// ── GATE STOP RELEASE REASON OPTIONS ─────────────────────────────────────────
type GateStopReleaseReason = ClearGateStopDto['reasonCategory'];

const GATE_STOP_RELEASE_REASON_OPTIONS: { value: GateStopReleaseReason; label: string }[] = [
  { value: 'resolved', label: '問題解決済み' },
  { value: 'misconfigured', label: '誤設定' },
  { value: 'identity_verified', label: '本人確認完了' },
  { value: 'other', label: 'その他' },
];

/** `ClearGateStopDto.note` — the API rejects anything longer. */
const RELEASE_NOTE_MAX_LENGTH = 500;

// ── Zod form schema ───────────────────────────────────────────────────────────
const gateStopReleaseFormSchema = z
  .object({
    reasonCategory: z.enum(['resolved', 'misconfigured', 'identity_verified', 'other'], {
      message: '解除理由は必須です',
    }),
    note: z
      .string()
      .max(RELEASE_NOTE_MAX_LENGTH, `詳細は${RELEASE_NOTE_MAX_LENGTH}文字以内で入力してください`)
      .optional(),
    confirmed: z.boolean().refine((v) => v, { message: '内容の確認チェックが必要です' }),
  })
  // PO 2026-09-29: その他 needs a 詳細, matching the API's `note` rule.
  .refine((v) => v.reasonCategory !== 'other' || !!v.note?.trim(), {
    message: '詳細は必須です',
    path: ['note'],
  });

type GateStopReleaseFormValues = z.infer<typeof gateStopReleaseFormSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────
interface GateStopReleaseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  /** Pass member.gateStop from the member-detail bundle as-is */
  gateStopInfo: MemberGateStopDto | null | undefined;
  /** Opens the 変更履歴 tab from the success toast. */
  onShowHistory: () => void;
}

// ── GateStopReleaseSheet ──────────────────────────────────────────────────────
export function GateStopReleaseSheet({
  open,
  onOpenChange,
  memberId,
  gateStopInfo,
  onShowHistory,
}: Readonly<GateStopReleaseSheetProps>) {
  const queryClient = useQueryClient();
  const { user } = useAuthUser();

  // FR-007: an immediate, hard-to-reverse release gets the acknowledgement checkbox AND a
  // confirm dialog, matching the other 申請 surfaces.
  const [showConfirm, setShowConfirm] = useState(false);
  // A second click on the confirm button lands before the closing dialog unmounts; a ref (not
  // state) is what the second handler call sees synchronously.
  const submittingRef = useRef(false);

  const detailQueryKey = adminMemberControllerDetailQueryKey({ path: { memberId } });

  // The stop may have been released from another tab since this page loaded; re-read it so the
  // sheet never offers to release a stop that is already gone.
  useEffect(() => {
    void queryClient.invalidateQueries({
      queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
    });
  }, [queryClient, memberId]);

  const form = useForm<GateStopReleaseFormValues>({
    resolver: zodResolver(gateStopReleaseFormSchema),
    defaultValues: {
      reasonCategory: undefined,
      note: '',
      confirmed: false,
    },
  });
  // Drives the footer submit button; RHF is the single source of truth for the reason and checkbox
  const confirmed = useWatch({ control: form.control, name: 'confirmed' });
  const reasonCategory = useWatch({ control: form.control, name: 'reasonCategory' });

  const mutation = useMutation({
    ...adminMemberControllerClearGateStopMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onError: (error) => {
      // 404 E-GAT-006: the stop was released elsewhere — refresh the banner and card.
      if (getApiErrorStatus(error) === 404) {
        void queryClient.invalidateQueries({ queryKey: detailQueryKey });
      }
    },
    onSuccess: () => {
      toast.success('ゲートストップを解除しました', {
        action: { label: '履歴を見る', onClick: onShowHistory },
      });
      queryClient.invalidateQueries({ queryKey: detailQueryKey });
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      handleClose();
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset({ reasonCategory: undefined, note: '', confirmed: false });
    }, 300);
  };

  // Validate first, then ask for confirmation; the mutation only runs from the dialog.
  // The sheet body scrolls, so `scrollToFirstError` brings the first invalid field into view
  const scrollToFirstError = useScrollToFirstError();
  const handleSubmit = form.handleSubmit(() => {
    setShowConfirm(true);
  }, scrollToFirstError);

  const handleConfirm = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setShowConfirm(false);
    const data = form.getValues();
    mutation.mutate({
      path: { memberId },
      body: {
        reasonCategory: data.reasonCategory,
        note: data.note || undefined,
      },
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          {/* Header */}
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <ShieldOff className="size-4" />
                ゲートストップ解除
              </SheetTitle>
              <SheetDescription className="sr-only">ゲートストップ解除フォーム</SheetDescription>
            </SheetHeader>
          </div>

          {/* Body */}
          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6">
                {/* Current gate stop info */}
                <div className="py-4">
                  <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-3">
                    <p className="text-muted-foreground mb-1 text-xs font-medium">現在の設定</p>
                    {gateStopInfo ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <p className="text-muted-foreground text-xs">設定日時</p>
                          <p className="text-sm font-medium">
                            {formatDateTime(gateStopInfo.setAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">設定者</p>
                          <p className="text-sm font-medium">
                            {gateStopInfo.setBy?.displayName ?? '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">パターン</p>
                          <p className="text-sm font-medium">
                            {gateStopInfo.pattern
                              ? GATE_STOP_PATTERN_LABELS[gateStopInfo.pattern]
                              : '—'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground text-xs">端末メッセージ</p>
                          <p className="text-sm font-medium break-all">
                            {gateStopInfo.message || '—'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">設定情報なし</p>
                    )}
                  </div>
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                {/* Release fields */}
                <div className="flex flex-col gap-4 py-4">
                  {/* Release reason */}
                  <FormField
                    control={form.control}
                    name="reasonCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          解除理由 <span className="text-destructive ml-1 text-xs">*</span>
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => field.onChange(v as GateStopReleaseReason)}
                          items={GATE_STOP_RELEASE_REASON_OPTIONS}
                        >
                          <FormControl>
                            <SelectTrigger id="release-reason" className="h-9 text-sm">
                              <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GATE_STOP_RELEASE_REASON_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Detail */}
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          詳細{' '}
                          {reasonCategory === 'other' ? (
                            <span className="text-destructive ml-1 text-xs">*</span>
                          ) : (
                            <span className="text-muted-foreground ml-1 text-xs">任意</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            maxLength={RELEASE_NOTE_MAX_LENGTH}
                            id="release-detail"
                            rows={2}
                            className="resize-none text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Release info — who/when this release will be recorded under (FR-018) */}
                  <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-3">
                    <p className="text-muted-foreground text-xs font-medium">解除情報</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-muted-foreground text-xs">解除予定者</p>
                        <p className="text-sm font-medium">{user?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">解除予定日時</p>
                        <p className="text-sm font-medium">{formatDateYYYYMMDD_HHMM(new Date())}</p>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation checkbox */}
                  <FormField
                    control={form.control}
                    name="confirmed"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2 pt-1">
                          <FormControl>
                            <Checkbox
                              id="release-confirm"
                              checked={field.value}
                              onCheckedChange={(v) => field.onChange(v === true)}
                            />
                          </FormControl>
                          <Label
                            htmlFor="release-confirm"
                            className="cursor-pointer text-sm leading-snug"
                          >
                            上記の内容を確認し、ゲートストップを解除します
                          </Label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={mutation.isPending}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                  // A-01 FR-014 v9: the reason and the confirmation must both be filled in first
                  disabled={!reasonCategory || !confirmed || mutation.isPending}
                >
                  解除する
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Confirm AlertDialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ゲートストップを解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              解除後、会員は全店舗への入館が可能になります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction disabled={mutation.isPending} onClick={handleConfirm}>
              解除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
