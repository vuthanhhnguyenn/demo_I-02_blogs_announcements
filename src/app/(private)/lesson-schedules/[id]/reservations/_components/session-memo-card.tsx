'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateMDWeekday } from '@/utils/date.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  adminLessonBookingControllerCreateSessionMemoMutation,
  adminLessonBookingControllerDeleteSessionMemoMutation,
  adminLessonBookingControllerUpdateSessionMemoMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonScheduleDetailDto, SessionMemoResponseDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { SESSION_MEMO_MAX_LENGTH } from '../_constants/booking-status.constants';
import {
  type GroupMemoFormValues,
  type PersonalMemoFormValues,
  buildPersonalMemoContent,
  createGroupMemoFormSchema,
  createPersonalMemoFormSchema,
} from '../_schemas/session-memo-form.schema';
import { invalidateSessionMemoQuery } from '../_utils/booking-api.util';
import { isOwnSessionScope } from '../_utils/session-scope.util';

interface SessionMemoCardProps {
  scheduleId: string;
  schedule: LessonScheduleDetailDto;
  /** The one memo of this schedule (API-113 §7.5); null when none is registered. */
  memo: SessionMemoResponseDto | null;
}

export function SessionMemoCard({ scheduleId, schedule, memo }: SessionMemoCardProps) {
  const lessonType = schedule.lesson?.lessonType ?? 'studio';
  const isPersonalSession = lessonType === 'personal_training';
  const maxLength = SESSION_MEMO_MAX_LENGTH[lessonType];
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuthUser();

  // FR-011 / FR-S001 — only roles with memo-manage may record/delete memos;
  // Trainer is further scoped to their own session.
  const canManageMemo = hasPermission(Permission.LessonsMemoManage) && isOwnSessionScope(user);

  // Decision D11 — single server value: no optimistic cache edits, just refetch. Error
  // toasts (409 E-LSB-017 stale / E-LSB-031 exists, 400 cap) come from the shared cache.
  const onSaved = () => {
    toast.success('メモを保存しました');
    invalidateSessionMemoQuery(queryClient, scheduleId);
  };
  const onFailed = () => invalidateSessionMemoQuery(queryClient, scheduleId);
  // Several clicks in one tick all see `isPending === false` and all hit *create* (the `memo`
  // prop is still null), so the 2nd/3rd come back 409 — the ref closes that window (BUG-D01A-03).
  const isSavingRef = useRef(false);
  const onSettled = () => {
    isSavingRef.current = false;
  };

  const createMemo = useMutation({
    ...adminLessonBookingControllerCreateSessionMemoMutation(),
    onSuccess: onSaved,
    onError: onFailed,
    onSettled,
  });
  const updateMemo = useMutation({
    ...adminLessonBookingControllerUpdateSessionMemoMutation(),
    onSuccess: onSaved,
    onError: onFailed,
    onSettled,
  });
  // FR-S001 — 「確認ダイアログを表示後、削除実行」; the delete is permanent (API-113 §6.8 #7
  // leaves the confirmation to the front end).
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const deleteMemo = useMutation({
    ...adminLessonBookingControllerDeleteSessionMemoMutation(),
    onSuccess: () => {
      setIsDeleteConfirmOpen(false);
      toast.success('メモを削除しました');
      invalidateSessionMemoQuery(queryClient, scheduleId);
    },
    onError: onFailed,
  });

  // Resolves true only after the server accepted the memo, so the forms keep the draft on a
  // refusal (409 stale / exists, 400 cap, 5xx) instead of clearing it (BUG-D01A-14).
  const handleSave = async (content: string): Promise<boolean> => {
    if (isSavingRef.current) return false;
    isSavingRef.current = true;
    try {
      if (memo) {
        await updateMemo.mutateAsync({
          path: { scheduleId },
          body: { memo: content, expectedUpdatedAt: memo.updatedAt ?? undefined },
        });
      } else {
        await createMemo.mutateAsync({ path: { scheduleId }, body: { memo: content } });
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleDelete = () => {
    deleteMemo.mutate({ path: { scheduleId } });
  };

  const isSaving = createMemo.isPending || updateMemo.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">セッションメモ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* The memo — scroll internally so a long text never scrolls the page */}
        <div className="max-h-90 space-y-3 overflow-y-auto">
          {memo?.memo ? (
            <div className="bg-muted/50 space-y-1 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {memo.updatedAt ? formatDateMDWeekday(memo.updatedAt) : '—'}
                </span>
                {canManageMemo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive h-5 w-5 p-0"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    disabled={deleteMemo.isPending}
                    aria-label="メモを削除"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
              {/* wrap-anywhere: a long run without spaces must wrap, not scroll sideways */}
              <p className="text-muted-foreground text-xs leading-relaxed wrap-anywhere whitespace-pre-wrap">
                {memo.memo}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground py-2 text-center text-xs">メモはありません</p>
          )}
        </div>

        {/* Memo input — saving replaces the existing memo */}
        {canManageMemo &&
          (isPersonalSession ? (
            <PersonalMemoForm maxLength={maxLength} onSave={handleSave} isPending={isSaving} />
          ) : (
            <GroupMemoForm maxLength={maxLength} onSave={handleSave} isPending={isSaving} />
          ))}
      </CardContent>

      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!deleteMemo.isPending) setIsDeleteConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>セッションメモを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このセッションのメモを削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMemo.isPending}>キャンセル</AlertDialogCancel>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteMemo.isPending}
            >
              削除する
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

interface MemoFormProps {
  maxLength: number;
  /** Returns false when a save is already in flight — the form then keeps its draft. */
  onSave: (content: string) => Promise<boolean>;
  isPending: boolean;
}

/** n / max under the input (BUG-D01A-11) — the cap itself is enforced by the Zod schema. */
function CharacterCounter({ length, maxLength }: { length: number; maxLength: number }) {
  return (
    <p
      className={`text-right text-[10px] ${length > maxLength ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      {length.toLocaleString('ja-JP')} / {maxLength.toLocaleString('ja-JP')}
    </p>
  );
}

const GROUP_DEFAULT_VALUES: GroupMemoFormValues = { content: '' };

function GroupMemoForm({ maxLength, onSave, isPending }: MemoFormProps) {
  const schema = useMemo(() => createGroupMemoFormSchema(maxLength), [maxLength]);
  const form = useForm<GroupMemoFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: GROUP_DEFAULT_VALUES,
  });

  const onSubmit = async (values: GroupMemoFormValues) => {
    if (await onSave(values.content.trim())) form.reset(GROUP_DEFAULT_VALUES);
  };
  const contentLength = useWatch({ control: form.control, name: 'content' }).length;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  className="min-h-[100px] text-sm"
                  placeholder="クラスの実施記録、参加者の様子、次回への申し送りなど"
                />
              </FormControl>
              <CharacterCounter length={contentLength} maxLength={maxLength} />
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="sm"
          className="h-8 w-full text-xs"
          disabled={!form.formState.isValid || isPending}
        >
          メモを保存
        </Button>
      </form>
    </Form>
  );
}

const PERSONAL_DEFAULT_VALUES: PersonalMemoFormValues = {
  menu: '',
  weight: '',
  reps: '',
  condition: '',
  handover: '',
};

function PersonalMemoForm({ maxLength, onSave, isPending }: MemoFormProps) {
  const schema = useMemo(() => createPersonalMemoFormSchema(maxLength), [maxLength]);
  const form = useForm<PersonalMemoFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: PERSONAL_DEFAULT_VALUES,
  });

  const onSubmit = async (values: PersonalMemoFormValues) => {
    const content = buildPersonalMemoContent(values);
    if (!content) return;
    if (await onSave(content)) form.reset(PERSONAL_DEFAULT_VALUES);
  };
  // The PT cap applies to the composed memo, so count what will actually be sent.
  const contentLength = buildPersonalMemoContent(useWatch({ control: form.control })).length;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="menu"
          render={({ field }) => (
            <FormItem>
              <Label className="mb-1 block text-xs font-medium">実施メニュー</Label>
              <FormControl>
                <Input {...field} className="h-8 text-sm" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <Label className="mb-1 block text-xs font-medium">重量</Label>
                <FormControl>
                  <Input {...field} className="h-8 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reps"
            render={({ field }) => (
              <FormItem>
                <Label className="mb-1 block text-xs font-medium">回数</Label>
                <FormControl>
                  <Input {...field} className="h-8 text-sm" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <Label className="mb-1 block text-xs font-medium">会員の状態</Label>
              <FormControl>
                <Textarea {...field} className="min-h-[60px] text-sm" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="handover"
          render={({ field }) => (
            <FormItem>
              <Label className="mb-1 block text-xs font-medium">次回への申し送り</Label>
              <FormControl>
                <Textarea {...field} className="min-h-[60px] text-sm" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <CharacterCounter length={contentLength} maxLength={maxLength} />
        <Button
          type="submit"
          size="sm"
          className="h-8 w-full text-xs"
          disabled={!form.formState.isValid || isPending}
        >
          メモを保存
        </Button>
      </form>
    </Form>
  );
}
