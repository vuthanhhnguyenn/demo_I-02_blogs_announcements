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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  adminMemberFinancialControllerPointsQueryKey,
  adminMemberFinancialControllerRefundPointsMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberDetailDto } from '@/lib/api-real/types.gen';

import {
  POINT_REFUND_DEFAULT_VALUES,
  POINT_REFUND_MAX,
  POINT_REFUND_MIN,
  type PointRefundFormInput,
  PointRefundFormSchema,
  type PointRefundFormValues,
} from '../_schemas/point-refund-form.schema';

interface PointRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  /** Points are brand-locked — the endpoint requires the member's own brand group */
  memberBrand: MemberDetailDto['brandGroup'];
}

// ── PointRefundDialog (ポイント手動返還 — A-01 FR-S001) ─────────────────────────
export function PointRefundDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
  memberBrand,
}: Readonly<PointRefundDialogProps>) {
  const queryClient = useQueryClient();

  const form = useForm<PointRefundFormInput, unknown, PointRefundFormValues>({
    resolver: zodResolver(PointRefundFormSchema),
    mode: 'onSubmit',
    defaultValues: POINT_REFUND_DEFAULT_VALUES,
  });
  // A second click lands before `isPending` re-renders the button disabled; a ref (not state)
  // is what the second handler call sees synchronously.
  const submittingRef = useRef(false);
  const [pointsInput, reasonInput] = useWatch({
    control: form.control,
    name: ['points', 'reason'],
  });
  // Same gate as the prototype: both fields filled and the amount above zero.
  const isIncomplete = !pointsInput || Number(pointsInput) <= 0 || !(reasonInput ?? '').trim();

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      form.reset(POINT_REFUND_DEFAULT_VALUES);
    }, 300);
  };

  const mutation = useMutation({
    ...adminMemberFinancialControllerRefundPointsMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: (_data, variables) => {
      toast.success('ポイントを返還しました', {
        description: `${variables.body.points.toLocaleString()}pt を ${memberName}様に返還しました`,
      });
      void queryClient.invalidateQueries({
        queryKey: adminMemberFinancialControllerPointsQueryKey({ path: { memberId } }),
      });
      handleClose();
    },
  });

  const refund = (data: PointRefundFormValues) => {
    mutation.mutate({
      path: { memberId },
      body: { brandGroup: memberBrand, points: Number(data.points), reason: data.reason },
    });
  };

  const handleExecute = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    void form.handleSubmit(refund, () => {
      submittingRef.current = false;
    })();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>ポイントを手動返還しますか？</AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            {memberName}
            様に指定したポイントを返還します。返還者・日時・理由は変更履歴に記録されます。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 px-1 pb-2">
          <Form {...form}>
            {/* Refund amount */}
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel className="text-sm font-medium">
                    返還ポイント <span className="text-destructive ml-1 text-xs">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      inputMode="numeric"
                      min={POINT_REFUND_MIN}
                      max={POINT_REFUND_MAX}
                      placeholder="例: 550"
                      className="h-9 text-sm"
                      disabled={mutation.isPending}
                      value={field.value == null ? '' : String(field.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Refund reason — mandatory audit trail (FR-S001) */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel className="text-sm font-medium">
                    返還理由 <span className="text-destructive ml-1 text-xs">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="例：休会申請時に自動返還されなかった紹介特典分を返還"
                      className="max-h-32 resize-none overflow-y-auto text-sm"
                      disabled={mutation.isPending}
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
          <AlertDialogAction disabled={mutation.isPending || isIncomplete} onClick={handleExecute}>
            返還する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
