'use client';

import { type ReactNode, useRef, useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Link2, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

import { DisabledReasonButton } from '@/components/common/disabled-reason-button';
import { RequiredMark } from '@/components/common/field-marker';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { ToneBadge } from '@/components/common/tone-badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

import { getApiErrorCode, getApiErrorStatus, resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminMemberControllerDetailQueryKey,
  adminMemberControllerGetAppLinkAccountOptions,
  adminMemberControllerGetAppLinkAccountQueryKey,
  adminMemberControllerLinkAppMutation,
  adminMemberControllerListQueryKey,
  adminMemberControllerSearchAppLinkCandidatesOptions,
  adminMemberControllerUnlinkAppMutation,
  adminMemberControllerUnlockAppLinkMutation,
  adminMemberRelationsControllerChangeHistoryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { cn } from '@/lib/utils';

import { Permission } from '@/types/permission.type';

import {
  type AppLinkLookup,
  type AppLinkState,
  formatAppLinkAccount,
  formatAutoUnlock,
  judgeAppLinkCandidates,
  toAppLinkSearchQuery,
} from '../_utils/app-link.util';

/** The operation the sheet commits. `relink` moves a linked member to another account. */
type Operation = 'link' | 'relink' | 'unlock' | 'unlink' | 'none';
type ConfirmKind = 'link' | 'relink' | 'unlink';

const CONFIRM_LABELS: Record<Exclude<Operation, 'none'>, string> = {
  link: '紐付ける',
  relink: '紐付け直す',
  unlock: 'ロックを解除する',
  unlink: '連携を解除する',
};

interface AppLinkSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberNumber: string;
  memberName: string;
  memberNameKana: string;
  /** 生年月日, display-ready. */
  birthDate: string;
  isWithdrawn: boolean;
  /** The current link state, from `linking` of the member detail. */
  state: AppLinkState;
  /** `yamauchiUserId` of the member detail — the account a 紐付け直し must not pick again. */
  currentYamauchiUserId: string | null;
  /** Opens the 変更履歴 tab from the success toast. */
  onShowHistory: () => void;
}

/** The sheet's 今の状態: 未連携 is grey text, every other state a badge (no dot). */
function AppLinkStatus({ state }: { state: AppLinkState }) {
  switch (state.kind) {
    case 'unlinked':
      return <p className="text-muted-foreground text-sm font-medium">未連携</p>;
    case 'linked':
      return <ToneBadge tone="success">連携済み</ToneBadge>;
    case 'tempLocked':
      return <ToneBadge tone="warning">一時ロック中</ToneBadge>;
    case 'permLocked':
      return <ToneBadge tone="destructive">永続ロック中</ToneBadge>;
  }
}

function InfoItem({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  // `min-w-0` + `wrap-anywhere`: a long unbroken value (e.g. a Latin name) wraps inside its grid cell
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm font-medium wrap-anywhere">{children}</div>
    </div>
  );
}

/**
 * Keeps an account / member number in the dialog copy as one chunk, so a phone never splits
 * mid-number: it moves to the next line whole when it fits there, and wraps inside itself only
 * when it is wider than the dialog (a long e-mail domain).
 */
function KeepTogether({ children }: { children: ReactNode }) {
  return <span className="inline-block max-w-full wrap-anywhere">{children}</span>;
}

/** One bordered choice row of 行う操作. */
function ChoiceRow({
  id,
  value,
  selected,
  disabled,
  title,
  description,
}: {
  id: string;
  value: string;
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-3 rounded-md border px-3 py-3 transition-colors',
        selected ? 'border-primary bg-primary/10' : 'border-border',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      <RadioGroupItem id={id} value={value} disabled={disabled} className="mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </div>
    </label>
  );
}

const countLabel = (value: number | null) => (value === null ? '—' : `${value}回`);

/**
 * A-01 FR-027 アプリ連携 sheet: 今の状態 → (permanent lock / linked only) 行う操作 → account search →
 * identity check → footer. 手動紐付け / 紐付け直し / 連携解除 confirm in an AlertDialog after the sheet
 * closes (キャンセル returns to the sheet with the input kept); ロック解除 runs from the sheet itself.
 *
 * Roles (A-01 アプリ連携の権限): 手動紐付け・紐付け直し・ロック解除 = System / Headquarter / Manager / Staff,
 * 連携解除 = System / Headquarter / Manager. Observer sees the operations disabled, without the account
 * search or the identity check.
 *
 * Nothing is drawn from a mutation response: every success refetches the member detail (and the
 * 変更履歴 tab), which is what the sheet and the head-up item read. The linked account's contact is
 * not on the detail (it is a Yamauchi read): the sheet asks for it only while open on a linked member.
 */
export function AppLinkSheet({
  open,
  onOpenChange,
  memberId,
  memberNumber,
  memberName,
  memberNameKana,
  birthDate,
  isWithdrawn,
  state: liveState,
  currentYamauchiUserId,
  onShowHistory,
}: Readonly<AppLinkSheetProps>) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthUser();
  const canOperate = hasPermission(Permission.MembersAppLinkOperate);
  const canUnlink = hasPermission(Permission.MembersAppLinkUnlink);

  // While the sheet closes after ロック解除 it keeps drawing the state it was opened on; the refetched
  // detail would otherwise swap its content mid-animation.
  const [frozenState, setFrozenState] = useState<AppLinkState | null>(null);
  const state = frozenState ?? liveState;

  // アカウント row and the 紐付け直し / 連携解除 confirmation; while it loads the row shows a skeleton,
  // and when Yamauchi cannot answer it shows — (reopening the sheet asks again).
  const accountQuery = useQuery({
    ...adminMemberControllerGetAppLinkAccountOptions({ path: { memberId } }),
    enabled: open && state.kind === 'linked',
  });
  const linkedAccount = formatAppLinkAccount(accountQuery.data);
  // The sheet is closing to show the confirm dialog: the dialog opens once the sheet has closed,
  // and the input is kept so キャンセル can return to it.
  const [closingForConfirm, setClosingForConfirm] = useState(false);

  const [permChoice, setPermChoice] = useState<'unlock' | 'link'>('unlock');
  const [linkedChoice, setLinkedChoice] = useState<'relink' | 'unlink'>('relink');
  const [query, setQuery] = useState('');
  const [lookup, setLookup] = useState<AppLinkLookup | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Kept after closing so the dialog copy does not vanish during its exit animation.
  const [confirmTarget, setConfirmTarget] = useState<{
    kind: ConfirmKind;
    account: string;
    current: string;
    yamauchiUserId: string | null;
  } | null>(null);
  // A second click on a confirm button lands before React re-renders it disabled.
  const submittingRef = useRef(false);
  // Bumped on every form reset, so a search still in flight cannot write its answer into the fresh form.
  const searchIdRef = useRef(0);

  const resetForm = () => {
    searchIdRef.current += 1;
    setPermChoice('unlock');
    setLinkedChoice('relink');
    setQuery('');
    setLookup(null);
    setIdentityChecked(false);
  };

  // The member list too: a link can turn a 仮会員 active and merges the account's provisional row
  const refreshMemberReads = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({ path: { memberId } }),
      }),
      queryClient.invalidateQueries({
        queryKey: adminMemberRelationsControllerChangeHistoryQueryKey({ path: { memberId } }),
      }),
      queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() }),
      queryClient.invalidateQueries({
        queryKey: adminMemberControllerGetAppLinkAccountQueryKey({ path: { memberId } }),
      }),
    ]);

  const finish = (message: string, description?: string) => {
    if (confirmOpen) {
      // Committed from the dialog: the sheet is already closed, so the input can go now.
      setConfirmOpen(false);
      resetForm();
    } else {
      setFrozenState(liveState);
    }
    onOpenChange(false);
    toast.success(message, {
      description,
      action: { label: '履歴を見る', onClick: onShowHistory },
    });
    void refreshMemberReads();
  };

  const onMutationSettled = () => {
    submittingRef.current = false;
  };

  const linkMutation = useMutation({
    ...adminMemberControllerLinkAppMutation(),
    onSettled: onMutationSettled,
    onSuccess: () => finish('アプリと紐付けました'),
    onError: () => {
      // Back to the sheet with the input kept, on a fresh read of the link state.
      void refreshMemberReads();
      setConfirmOpen(false);
      onOpenChange(true);
    },
  });

  const unlinkMutation = useMutation({
    ...adminMemberControllerUnlinkAppMutation(),
    onSettled: onMutationSettled,
    onSuccess: () => finish('アプリ連携を解除しました'),
    onError: () => {
      void refreshMemberReads();
      setConfirmOpen(false);
      onOpenChange(true);
    },
  });

  const unlockMutation = useMutation({
    ...adminMemberControllerUnlockAppLinkMutation(),
    onSettled: onMutationSettled,
    onSuccess: () => finish('ロックを解除しました', 'アプリで連携し直すよう会員に案内してください'),
    onError: () => {
      void refreshMemberReads();
    },
  });

  const isMutating = linkMutation.isPending || unlinkMutation.isPending || unlockMutation.isPending;

  // One operation per state and choice (Observer gets the same one, disabled)
  let operation: Operation = 'none';
  if (state.kind === 'unlinked' && !isWithdrawn) operation = 'link';
  if (state.kind === 'tempLocked') operation = 'link';
  if (state.kind === 'permLocked') operation = permChoice;
  if (state.kind === 'linked') operation = linkedChoice;
  const needsAccount = canOperate && (operation === 'link' || operation === 'relink');
  const needsIdentity =
    canOperate && (operation === 'link' || operation === 'relink' || operation === 'unlock');
  const hasChoice = state.kind === 'permLocked' || state.kind === 'linked';

  const handleSheetOpenChangeComplete = (isOpen: boolean) => {
    if (isOpen) return;
    if (closingForConfirm) {
      setClosingForConfirm(false);
      setConfirmOpen(true);
      return;
    }
    resetForm();
    setFrozenState(null);
  };

  const runSearch = async () => {
    const value = query.trim();
    if (!value || isSearching) return;
    const searchQuery = toAppLinkSearchQuery(value);
    if (!searchQuery) {
      setLookup({ kind: 'notFound' });
      return;
    }
    const searchId = searchIdRef.current;
    setIsSearching(true);
    try {
      const result = await queryClient.fetchQuery({
        ...adminMemberControllerSearchAppLinkCandidatesOptions({
          path: { memberId },
          query: searchQuery,
        }),
        // The answer changes as soon as anyone links the account — never reuse an earlier one.
        staleTime: 0,
      });
      if (searchId !== searchIdRef.current) return;
      setLookup(
        judgeAppLinkCandidates(
          result.items,
          state.kind === 'linked' ? currentYamauchiUserId : null,
        ),
      );
    } catch (error) {
      if (searchId !== searchIdRef.current) return;
      // A key the server rejects as malformed can never match an account exactly
      if (getApiErrorStatus(error) === 400 && getApiErrorCode(error) === 'E-VAL-001') {
        setLookup({ kind: 'notFound' });
      } else {
        toast.error(resolveApiErrorMessage(error));
      }
    } finally {
      setIsSearching(false);
    }
  };

  const currentAccount = state.kind === 'linked' ? (linkedAccount ?? '—') : '';

  // Close the sheet first, then show the dialog (キャンセル in the dialog brings the sheet back)
  const goConfirm = (kind: ConfirmKind, account: string, yamauchiUserId: string | null) => {
    setConfirmTarget({ kind, account, current: currentAccount, yamauchiUserId });
    setClosingForConfirm(true);
    onOpenChange(false);
  };

  const commitConfirm = () => {
    if (!confirmTarget || submittingRef.current) return;
    submittingRef.current = true;
    if (confirmTarget.kind === 'unlink') {
      unlinkMutation.mutate({ path: { memberId }, body: {} });
      return;
    }
    if (!confirmTarget.yamauchiUserId) {
      submittingRef.current = false;
      return;
    }
    linkMutation.mutate({
      path: { memberId },
      body: {
        yamauchiUserId: confirmTarget.yamauchiUserId,
        // 紐付け直し moves the linked member in one step — no 連携解除 first.
        ...(confirmTarget.kind === 'relink' ? { replace: true } : {}),
      },
    });
  };

  const commitUnlock = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    unlockMutation.mutate({ path: { memberId }, body: {} });
  };

  // Why 紐付ける / 紐付け直す cannot be pressed yet
  const linkDisabledReason =
    lookup?.kind === 'linkedToOther'
      ? '別の会員と連携済みのアカウントは紐付けできません'
      : lookup?.kind === 'alreadyThisMember'
        ? 'このアカウントはすでにこの会員と連携しています'
        : lookup?.kind !== 'available'
          ? 'メールアドレスか電話番号で検索してください'
          : !identityChecked
            ? '本人確認のチェックを入れてください'
            : undefined;

  let primaryButton: ReactNode = null;
  if (isWithdrawn && state.kind === 'unlinked') {
    primaryButton = (
      <DisabledReasonButton
        className="w-full"
        disabled
        disabledReason="退会済みのため紐付けできません"
      >
        紐付ける
      </DisabledReasonButton>
    );
  } else if (operation !== 'none' && !canOperate) {
    primaryButton = (
      <RoleGatedButton
        fullWidth
        variant={operation === 'unlink' ? 'destructive' : 'default'}
        requiredPermission={Permission.MembersAppLinkOperate}
        denyTooltip="閲覧のみの権限のため操作できません"
      >
        {CONFIRM_LABELS[operation]}
      </RoleGatedButton>
    );
  } else if (operation === 'link' || operation === 'relink') {
    const found = lookup?.kind === 'available' ? lookup : null;
    primaryButton = (
      <DisabledReasonButton
        className="w-full"
        disabled={!!linkDisabledReason}
        disabledReason={linkDisabledReason}
        onClick={() => found && goConfirm(operation, found.account, found.candidate.yamauchiUserId)}
      >
        {CONFIRM_LABELS[operation]}
      </DisabledReasonButton>
    );
  } else if (operation === 'unlock') {
    primaryButton = (
      <DisabledReasonButton
        className="w-full"
        disabled={!identityChecked || isMutating}
        disabledReason={identityChecked ? undefined : '本人確認のチェックを入れてください'}
        onClick={commitUnlock}
      >
        ロックを解除する
      </DisabledReasonButton>
    );
  } else if (operation === 'unlink') {
    primaryButton = (
      <RoleGatedButton
        fullWidth
        variant="destructive"
        requiredPermission={Permission.MembersAppLinkUnlink}
        denyTooltip="連携解除は本部・マネージャーの権限で行います"
        onClick={() => goConfirm('unlink', currentAccount, null)}
      >
        連携を解除する
      </RoleGatedButton>
    );
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => onOpenChange(next)}
        onOpenChangeComplete={handleSheetOpenChangeComplete}
      >
        <SheetContent className="flex w-120 flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-120">
          <div className="shrink-0 border-b px-6 py-4">
            <SheetHeader className="gap-0 p-0">
              <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="size-4" />
                アプリ連携
              </SheetTitle>
              <SheetDescription className="sr-only">
                会員番号とアプリのアカウントの連携の状態と操作
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            {/* 1. 今の状態 */}
            <div className="flex flex-col gap-2 py-4">
              <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium">今の状態</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <InfoItem label="会員番号">
                    <span className="font-mono">{memberNumber}</span>
                  </InfoItem>
                  <InfoItem label="氏名">{memberName}</InfoItem>
                  <InfoItem label="状態" className="col-span-2">
                    <div className="mt-1 flex">
                      <AppLinkStatus state={state} />
                    </div>
                  </InfoItem>
                  {state.kind === 'linked' && (
                    <>
                      <InfoItem label="連携日時">
                        <span className="tabular-nums">{state.linkedAt}</span>
                      </InfoItem>
                      <InfoItem label="連携経路">{state.route ?? '—'}</InfoItem>
                      <InfoItem label="アカウント" className="col-span-2">
                        {accountQuery.isLoading ? (
                          <Skeleton className="mt-0.5 h-5 w-48" />
                        ) : (
                          <span className="wrap-anywhere">{linkedAccount ?? '—'}</span>
                        )}
                      </InfoItem>
                      {state.isManual && (
                        <InfoItem label="操作者">{state.operator ?? '—'}</InfoItem>
                      )}
                    </>
                  )}
                  {state.kind === 'tempLocked' && (
                    <>
                      <InfoItem label="ロックした日時">
                        <span className="tabular-nums">{state.lockedAt}</span>
                      </InfoItem>
                      <InfoItem label="自動で解除する時刻">
                        <span className="tabular-nums">
                          {state.autoUnlockAt === null
                            ? '—'
                            : formatDateYYYYMMDD_HHMM(state.autoUnlockAt)}
                        </span>
                      </InfoItem>
                      <InfoItem label="照合失敗（連続）">
                        <span className="tabular-nums">
                          {countLabel(state.consecutiveFailures)}
                        </span>
                      </InfoItem>
                      <InfoItem label="照合失敗（累計）">
                        <span className="tabular-nums">{countLabel(state.totalFailures)}</span>
                      </InfoItem>
                    </>
                  )}
                  {state.kind === 'permLocked' && (
                    <>
                      <InfoItem label="ロックした日時">
                        <span className="tabular-nums">{state.lockedAt}</span>
                      </InfoItem>
                      <InfoItem label="照合失敗（累計）">
                        <span className="tabular-nums">{countLabel(state.totalFailures)}</span>
                      </InfoItem>
                    </>
                  )}
                </div>
              </div>
              {state.kind === 'tempLocked' && state.autoUnlockAt !== null && (
                <p className="text-muted-foreground text-xs">
                  待てる場合は、{formatAutoUnlock(state.autoUnlockAt)}{' '}
                  以降に会員がアプリで連携できます
                </p>
              )}
              {state.kind === 'permLocked' && (
                <p className="text-muted-foreground text-xs">自動では解除されません</p>
              )}
              {state.kind === 'unlinked' && isWithdrawn && (
                <p className="text-muted-foreground text-xs">
                  退会済みの会員は紐付けできません。アプリを使うには、アプリの新規入会から手続きしてもらってください
                </p>
              )}
            </div>

            {(hasChoice || needsAccount || needsIdentity) && (
              <>
                <Separator className="-mx-6 w-[calc(100%+48px)]" />
                <div className="flex flex-col gap-4 py-4">
                  {/* 2. 行う操作 (states with two operations only; disabled for Observer) */}
                  {state.kind === 'permLocked' && (
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">行う操作</Label>
                      <RadioGroup
                        value={permChoice}
                        onValueChange={(value) => setPermChoice(value as 'unlock' | 'link')}
                        disabled={!canOperate}
                        className="flex flex-col gap-2"
                      >
                        <ChoiceRow
                          id="app-link-op-unlock"
                          value="unlock"
                          selected={permChoice === 'unlock'}
                          disabled={!canOperate}
                          title="ロックを解除する"
                          description="会員番号のロックを解除し、照合失敗の回数を 0 に戻します"
                        />
                        <ChoiceRow
                          id="app-link-op-link"
                          value="link"
                          selected={permChoice === 'link'}
                          disabled={!canOperate}
                          title="手動で紐付ける"
                          description="スタッフが会員のアカウントを探して結びます。登録内容（カナ・生年月日）が書類と違い、アプリで照合できない時に使います"
                        />
                      </RadioGroup>
                    </div>
                  )}
                  {state.kind === 'linked' && (
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">行う操作</Label>
                      <RadioGroup
                        value={linkedChoice}
                        onValueChange={(value) => setLinkedChoice(value as 'relink' | 'unlink')}
                        disabled={!canOperate}
                        className="flex flex-col gap-2"
                      >
                        <ChoiceRow
                          id="app-link-op-relink"
                          value="relink"
                          selected={linkedChoice === 'relink'}
                          disabled={!canOperate}
                          title="別のアカウントに紐付け直す"
                          description="会員の正しいアカウントを探して結び直します。今のアカウントとの連携は外れます（誤って連携された時・機種変更でアカウントを作り直した時）"
                        />
                        <ChoiceRow
                          id="app-link-op-unlink"
                          value="unlink"
                          selected={linkedChoice === 'unlink'}
                          disabled={!canUnlink}
                          title="連携を解除する"
                          description="アカウントとの連携を外し、未連携に戻します（なりすましの時など）"
                        />
                      </RadioGroup>
                      {canOperate && !canUnlink && (
                        <p className="text-muted-foreground text-xs">
                          連携解除は本部・マネージャーの権限で行います
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. Account search (手動紐付け / 紐付け直し only; exact match, never a list) */}
                  {needsAccount && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="app-link-account" className="text-sm font-medium">
                        アプリのログインに使っているメールアドレスまたは電話番号
                        <RequiredMark />
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="app-link-account"
                          placeholder="例：taro@example.com／09012345678"
                          value={query}
                          disabled={isSearching}
                          onChange={(event) => {
                            setQuery(event.target.value);
                            setLookup(null);
                          }}
                          onKeyDown={(event) => {
                            // Enter that confirms an IME conversion is not a search
                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                              void runSearch();
                            }
                          }}
                          aria-invalid={lookup?.kind === 'notFound' || undefined}
                          className={cn(
                            'h-9 flex-1',
                            lookup?.kind === 'notFound' &&
                              'border-destructive focus-visible:ring-destructive/30',
                          )}
                        />
                        <Button
                          variant="outline"
                          size="lg"
                          disabled={isSearching}
                          onClick={() => void runSearch()}
                        >
                          検索
                        </Button>
                      </div>
                      {lookup === null && (
                        <p className="text-muted-foreground text-xs">
                          会員のアプリに表示されているメールアドレスか電話番号を確認してください。完全に一致するアカウントだけを表示します
                        </p>
                      )}
                      {lookup?.kind === 'notFound' && (
                        <p className="text-destructive text-xs">
                          該当するアカウントが見つかりません。入力内容を確認してください
                        </p>
                      )}
                      {lookup?.kind === 'available' && (
                        <div className="border-success/30 bg-success/10 flex items-start gap-3 rounded-md border p-3">
                          <UserCheck className="text-success mt-0.5 size-4 shrink-0" />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-sm font-medium wrap-anywhere">
                              {lookup.account}
                            </span>
                            {lookup.createdAt && (
                              <span className="text-muted-foreground text-xs tabular-nums">
                                アカウント作成日 {lookup.createdAt}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {lookup?.kind === 'alreadyThisMember' && (
                        <div className="flex items-start gap-3 rounded-md border p-3">
                          <UserX className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-sm font-medium wrap-anywhere">
                              {lookup.account}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              このアカウントはすでにこの会員と連携しています
                            </span>
                          </div>
                        </div>
                      )}
                      {lookup?.kind === 'linkedToOther' && (
                        <>
                          <div className="flex items-start gap-3 rounded-md border p-3">
                            <UserX className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                            <span className="text-sm font-medium wrap-anywhere">
                              {lookup.account}
                            </span>
                          </div>
                          {/* The other member's number / name is never shown */}
                          <Alert className="border-destructive/50 bg-destructive/15">
                            <CircleAlert className="text-destructive size-4" />
                            <AlertDescription className="text-destructive text-xs">
                              このアカウントは別の会員番号と連携済みのため、紐付けできません。会員にご本人のアカウントか確認してください
                            </AlertDescription>
                          </Alert>
                        </>
                      )}
                    </div>
                  )}

                  {/* 4. Identity check (手動紐付け / 紐付け直し / ロック解除; not 連携解除, not Observer) */}
                  {needsIdentity && (
                    <div className="flex flex-col gap-2">
                      <p className="text-muted-foreground text-xs font-medium">
                        照合に使う登録内容（本人確認書類と見比べてください）
                      </p>
                      <div className="bg-muted/40 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md p-3">
                        <InfoItem label="氏名">{memberName}</InfoItem>
                        <InfoItem label="カナ">{memberNameKana || '—'}</InfoItem>
                        <InfoItem label="生年月日">
                          <span className="tabular-nums">{birthDate}</span>
                        </InfoItem>
                      </div>
                      <div className="flex items-start gap-2 pt-1">
                        <Checkbox
                          id="app-link-identity"
                          checked={identityChecked}
                          onCheckedChange={(value) => setIdentityChecked(value === true)}
                        />
                        <Label
                          htmlFor="app-link-identity"
                          className="cursor-pointer text-sm leading-snug"
                        >
                          本人確認書類で、来店者が会員本人であることを確認しました
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer: キャンセル / confirm; Observer gets 閉じる and the confirm disabled */}
          <div className="flex shrink-0 gap-2 border-t px-6 py-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {canOperate ? 'キャンセル' : '閉じる'}
            </Button>
            {primaryButton && <div className="flex-1 *:w-full">{primaryButton}</div>}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm dialog (手動紐付け / 紐付け直し / 連携解除). キャンセル returns to the sheet with the input kept */}
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (next || isMutating) return;
          setConfirmOpen(false);
          onOpenChange(true);
        }}
      >
        <AlertDialogContent>
          {confirmTarget?.kind === 'link' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>このアカウントと紐付けますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  <KeepTogether>{confirmTarget.account}</KeepTogether> のアカウントと{' '}
                  <span className="wrap-anywhere">{memberName}</span>様（
                  <KeepTogether>{memberNumber}</KeepTogether>
                  ）を紐付けます。紐付けると、このアカウントのアプリで会員証・入館が使えるようになります。操作者と日時は変更履歴に記録されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isMutating}>キャンセル</AlertDialogCancel>
                <AlertDialogAction disabled={isMutating} onClick={commitConfirm}>
                  紐付ける
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirmTarget?.kind === 'relink' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>このアカウントに紐付け直しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  <KeepTogether>{confirmTarget.current}</KeepTogether> との連携を外し、
                  <KeepTogether>{confirmTarget.account}</KeepTogether> と{' '}
                  <span className="wrap-anywhere">{memberName}</span>様（
                  <KeepTogether>{memberNumber}</KeepTogether>
                  ）を紐付けます。外したアカウントのアプリでは、すぐに会員証・入館が使えなくなります。操作者と日時は変更履歴に記録されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isMutating}>キャンセル</AlertDialogCancel>
                <AlertDialogAction disabled={isMutating} onClick={commitConfirm}>
                  紐付け直す
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirmTarget?.kind === 'unlink' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>アプリ連携を解除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  <KeepTogether>{confirmTarget.account}</KeepTogether>{' '}
                  のアカウントでは、すぐに会員証・入館が使えなくなります。会員番号の契約はそのまま残ります。操作者と日時は変更履歴に記録されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isMutating}>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isMutating}
                  onClick={commitConfirm}
                >
                  連携を解除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
