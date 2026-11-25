'use client';

import { useRef, useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateTime } from '@/utils/format.util';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerSetTestAccountMutation,
  adminMemberRelationsControllerChangeHistoryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { MemberTestAccountDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

interface TestAccountCardProps {
  memberId: string;
  /** `member.testAccount` from the member-detail bundle */
  testAccount: MemberTestAccountDto;
  memberName: string;
  /** Opens the 変更履歴 tab from the success toast. */
  onShowHistory: () => void;
}

interface TestAccountChange {
  at: string;
  /** Null when the staff row is gone — deleted staff keep only their audit id. */
  by: string | null;
  action: '設定' | '解除';
}

/**
 * FR-025 最終更新: the newer of the set / clear stamps. Both can be non-null at once
 * (set → clear → set), and `isTestAccount` is what decides the current state, so the line is
 * derived from the timestamps rather than from the flag.
 */
function lastTestAccountChange(testAccount: MemberTestAccountDto): TestAccountChange | null {
  const { setAt, setBy, clearedAt, clearedBy } = testAccount;

  if (clearedAt !== null && (setAt === null || Date.parse(clearedAt) > Date.parse(setAt))) {
    return { at: clearedAt, by: clearedBy?.displayName ?? null, action: '解除' };
  }
  if (setAt !== null) {
    return { at: setAt, by: setBy?.displayName ?? null, action: '設定' };
  }
  return null;
}

/**
 * A-01 FR-025 動作確認用アカウント — the flag Y-06 FR-M007 reads to let a member keep using the
 * mobile app during an app-maintenance window. Setting / clearing is System / Headquarter only;
 * every other role sees the switch read-only.
 */
export function TestAccountCard({
  memberId,
  testAccount,
  memberName,
  onShowHistory,
}: Readonly<TestAccountCardProps>) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthUser();
  const canEdit = hasPermission(Permission.MembersTestAccountSet);
  const lastChange = lastTestAccountChange(testAccount);

  // Null = no confirmation pending; true/false = the value the confirm dialog will commit.
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  // A second click on the confirm button lands before the closing dialog unmounts; a ref (not
  // state) is what the second handler call sees synchronously.
  const submittingRef = useRef(false);

  const mutation = useMutation({
    ...adminMemberControllerSetTestAccountMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.body.isTestAccount
          ? '動作確認用アカウントに設定しました'
          : '動作確認用アカウントを解除しました',
        { action: { label: '履歴を見る', onClick: onShowHistory } },
      );
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      });
      void queryClient.invalidateQueries({
        queryKey: adminMemberRelationsControllerChangeHistoryQueryKey({ path: { memberId } }),
      });
    },
  });

  const handleConfirm = () => {
    if (submittingRef.current || pendingValue === null) return;
    submittingRef.current = true;
    const next = pendingValue === true;
    setPendingValue(null);
    mutation.mutate({ path: { memberId }, body: { isTestAccount: next } });
  };

  const switchNode = (
    <Switch
      id="test-account-switch"
      checked={testAccount.isTestAccount}
      disabled={!canEdit || mutation.isPending}
      onCheckedChange={(next) => setPendingValue(next)}
      className="shrink-0"
    />
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">動作確認用アカウント</CardTitle>
            {!canEdit && (
              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                参照のみ
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="test-account-switch" className="text-sm font-medium">
                メンテナンス中もアプリを利用可能にする
              </Label>
              <p className="text-muted-foreground text-xs">
                アプリメンテナンス期間中もモバイルアプリを利用できる検証用アカウントとして指定します。開発・QAの動作確認用途に限定してください
              </p>
              {/* FR-025 設定者・設定日時 / 解除者・解除日時 — the full trail is the 変更履歴 tab. */}
              {lastChange && (
                <p className="text-muted-foreground text-xs">
                  最終更新: {formatDateTime(lastChange.at)}（{lastChange.by ?? '—'}が
                  {lastChange.action}）
                </p>
              )}
            </div>
            {canEdit ? (
              switchNode
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                    {switchNode}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">本部権限が必要です</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FR-025: a mis-click would hand out app access during a maintenance window, so the
          toggle commits only from this confirmation step. */}
      <AlertDialog
        open={pendingValue !== null}
        onOpenChange={(open) => {
          if (!open) setPendingValue(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingValue
                ? '動作確認用アカウントに設定しますか？'
                : '動作確認用アカウントを解除しますか？'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingValue
                ? `${memberName}様は、アプリメンテナンス期間中もモバイルアプリを利用できるようになります。開発・QAの動作確認用途に限定してください。操作者と日時は変更履歴に記録されます。`
                : `${memberName}様は、アプリメンテナンス期間中はモバイルアプリを利用できなくなります。操作者と日時は変更履歴に記録されます。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {pendingValue ? '設定する' : '解除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
