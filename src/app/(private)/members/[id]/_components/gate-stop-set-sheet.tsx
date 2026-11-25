'use client';

import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useScrollToFirstError } from '@/hooks/use-scroll-to-first-error';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
  adminMemberControllerSetGateStopMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { SetGateStopDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import { GATE_STOP_SET_PATTERN_OPTIONS } from '../_constants/gate-stop';

// ── GATE STOP REASON OPTIONS ─────────────────────────────────────────────────
type GateStopReason = SetGateStopDto['reasonCategory'];
type GateStopSetPattern = SetGateStopDto['pattern'];

const GATE_STOP_REASON_OPTIONS: { value: GateStopReason; label: string }[] = [
  { value: 'nuisance', label: '迷惑行為' },
  { value: 'unpaid', label: '未納金' },
  { value: 'fraudulent_use', label: '不正利用' },
  { value: 'other', label: 'その他' },
];

/** `SetGateStopDto.message` — the API rejects anything longer. */
const GATE_MESSAGE_MAX_LENGTH = 500;
/** `SetGateStopDto.reasonDetail` — the API rejects anything longer. */
const REASON_DETAIL_MAX_LENGTH = 1000;

// ── Zod form schema ───────────────────────────────────────────────────────────
const gateStopFormSchema = z
  .object({
    pattern: z.enum(['staffed_hours_deny', 'always_deny', 'unstaffed_hours_deny'], {
      message: 'パターンは必須です',
    }),
    reasonCategory: z.enum(['nuisance', 'unpaid', 'fraudulent_use', 'other'], {
      message: '設定理由は必須です',
    }),
    reasonDetail: z
      .string()
      .max(REASON_DETAIL_MAX_LENGTH, `詳細は${REASON_DETAIL_MAX_LENGTH}文字以内で入力してください`)
      .optional(),
    message: z
      .string()
      .max(
        GATE_MESSAGE_MAX_LENGTH,
        `ゲート端末メッセージは${GATE_MESSAGE_MAX_LENGTH}文字以内で入力してください`,
      )
      .optional(),
    lock_after_message: z.boolean(),
  })
  // PO 2026-09-29: その他 needs a 詳細, matching the API's `reasonDetail` rule.
  .refine((v) => v.reasonCategory !== 'other' || !!v.reasonDetail?.trim(), {
    message: '詳細は必須です',
    path: ['reasonDetail'],
  });

type GateStopFormValues = z.infer<typeof gateStopFormSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────
interface GateStopSetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  /** Opens the 変更履歴 tab from the success toast. */
  onShowHistory: () => void;
}

// ── GateStopSetSheet ──────────────────────────────────────────────────────────
export function GateStopSetSheet({
  open,
  onOpenChange,
  memberId,
  onShowHistory,
}: Readonly<GateStopSetSheetProps>) {
  const queryClient = useQueryClient();
  const scrollToFirstError = useScrollToFirstError();

  // FR-014: the gate-stop setting must be confirmed before it is applied
  const [showConfirm, setShowConfirm] = useState(false);
  // A second click on the confirm button lands before the closing dialog unmounts; a ref (not
  // state) is what the second handler call sees synchronously.
  const submittingRef = useRef(false);

  const form = useForm<GateStopFormValues>({
    resolver: zodResolver(gateStopFormSchema),
    defaultValues: {
      pattern: undefined,
      reasonCategory: undefined,
      reasonDetail: '',
      message: '',
      lock_after_message: false,
    },
  });
  const reasonCategory = useWatch({ control: form.control, name: 'reasonCategory' });
  const message = useWatch({ control: form.control, name: 'message' });

  const { confirmDiscard } = useUnsavedChanges(open && form.formState.isDirty);

  const mutation = useMutation({
    ...adminMemberControllerSetGateStopMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: () => {
      toast.success('ゲートストップを設定しました', {
        action: { label: '履歴を見る', onClick: onShowHistory },
      });
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      handleClose();
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset({
        pattern: undefined,
        reasonCategory: undefined,
        reasonDetail: '',
        message: '',
        lock_after_message: false,
      });
    }, 300);
  };

  // Validate first, then ask for confirmation; the mutation only runs from the dialog.
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
        pattern: data.pattern,
        reasonCategory: data.reasonCategory,
        reasonDetail:
          data.reasonCategory === 'other' ? data.reasonDetail?.trim() || undefined : undefined,
        message: data.message || undefined,
        // The checkbox asks whether entry stays denied after the member confirms
        // the gate message; the API takes that as a two-value type.
        messageType: data.lock_after_message ? 'deny_after_confirm' : 'allow_after_confirm',
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
                <ShieldAlert className="size-4" />
                ゲートストップ設定
              </SheetTitle>
              <SheetDescription className="text-muted-foreground mt-1 text-xs">
                会員の入館を制限します
              </SheetDescription>
            </SheetHeader>
          </div>

          {/* Body */}
          <Form {...form}>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6">
                {/* Pattern (the 4 patterns of A-01 FR-014) */}
                <div className="flex flex-col gap-3 py-4">
                  <Label className="text-sm font-medium">
                    パターン <span className="text-destructive ml-1 text-xs">*</span>
                  </Label>
                  <FormField
                    control={form.control}
                    name="pattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            value={field.value ?? null}
                            onValueChange={(v) => field.onChange(v as GateStopSetPattern)}
                            className="flex flex-col gap-2"
                          >
                            {GATE_STOP_SET_PATTERN_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                htmlFor={`gate-pattern-${option.value}`}
                                className={cn(
                                  'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 transition-colors',
                                  field.value === option.value
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border',
                                )}
                              >
                                <RadioGroupItem
                                  id={`gate-pattern-${option.value}`}
                                  value={option.value}
                                  className="mt-0.5"
                                />
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm font-medium">{option.label}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {option.description}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        {/* 常時入退館（ストップなし）is deliberately not an option here:
                            it means "no gate stop", which is the 解除 action, and the
                            API rejects it on this endpoint (QA03 §2.2). */}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator className="-mx-6 w-[calc(100%+48px)]" />

                {/* Reason & message */}
                <div className="flex flex-col gap-4 py-4">
                  {/* Reason */}
                  <FormField
                    control={form.control}
                    name="reasonCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          設定理由 <span className="text-destructive ml-1 text-xs">*</span>
                        </FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => field.onChange(v as GateStopReason)}
                          items={GATE_STOP_REASON_OPTIONS}
                        >
                          <FormControl>
                            <SelectTrigger id="gate-stop-reason" className="h-9 text-sm">
                              <SelectValue placeholder="選択してください" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GATE_STOP_REASON_OPTIONS.map((option) => (
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

                  {/* Detail — only for その他, where it is required */}
                  {reasonCategory === 'other' && (
                    <FormField
                      control={form.control}
                      name="reasonDetail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            詳細 <span className="text-destructive ml-1 text-xs">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              id="gate-stop-reason-detail"
                              rows={2}
                              maxLength={REASON_DETAIL_MAX_LENGTH}
                              className="max-h-32 resize-none overflow-y-auto text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Terminal message */}
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          ゲート端末メッセージ{' '}
                          <span className="text-muted-foreground ml-1 text-xs">任意</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            id="gate-stop-message"
                            rows={2}
                            maxLength={GATE_MESSAGE_MAX_LENGTH}
                            placeholder="ゲート端末に表示するメッセージ"
                            className="resize-none text-sm"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-muted-foreground text-right text-xs tabular-nums">
                          {message?.length ?? 0}/{GATE_MESSAGE_MAX_LENGTH}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Lock after message */}
                  <FormField
                    control={form.control}
                    name="lock_after_message"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2">
                          <FormControl>
                            <Checkbox
                              id="gate-stop-lock"
                              checked={field.value}
                              onCheckedChange={(v) => field.onChange(v === true)}
                            />
                          </FormControl>
                          <Label
                            htmlFor="gate-stop-lock"
                            className="cursor-pointer text-sm leading-snug"
                          >
                            メッセージ確認後も入館不可にする
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />

                  <Alert className="border-warning/20 bg-warning/10">
                    <AlertDescription className="text-warning text-xs">
                      この設定はゲート端末に即時反映されます
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 gap-2 border-t px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => confirmDiscard(handleClose)}
                  disabled={mutation.isPending}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                  disabled={mutation.isPending}
                >
                  設定
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
            <AlertDialogTitle>ゲートストップを設定しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              設定後、会員の入館が制限されます。この設定はゲート端末に即時反映されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirm(false);
              }}
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={mutation.isPending}
              onClick={handleConfirm}
            >
              設定する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
