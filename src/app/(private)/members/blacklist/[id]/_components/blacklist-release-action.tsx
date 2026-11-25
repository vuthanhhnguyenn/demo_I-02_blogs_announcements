'use client';

import { useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { formatDateYYYYMMDD } from '@/utils/date.util';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldBan, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import { StatusCard, type StatusTone } from '@/components/common/status-card';
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
  adminMemberControllerDetailQueryKey,
  adminMemberControllerGetBlacklistQueryKey,
  adminMemberControllerListBlacklistQueryKey,
  adminMemberControllerListQueryKey,
  adminMemberControllerSetBlacklistActiveMutation,
  adminMemberRelationsControllerChangeHistoryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { UserRole } from '@/types/permission.type';

import {
  BLACKLIST_SOURCE_LABEL,
  type BlacklistDetail,
  formatBlacklistReasons,
} from '../../_constants/blacklist.constants';

interface BlacklistReleaseActionProps {
  blacklist: BlacklistDetail;
  /** Display-ready, as the page header shows it. */
  memberName: string;
}

/**
 * FR-061 – FR-068 — the status card and its release action.
 *
 * A released entry (reachable only by its own URL, FR-069a) must **not** be presented as
 * still blacklisted: the card switches to a muted 解除済み state and offers no second
 * release. That is a correctness constraint, not a style choice — V0 has no released state
 * to copy because it renders one active entry from a constant (FR-069b).
 */
export function BlacklistReleaseAction({
  blacklist,
  memberName,
}: Readonly<BlacklistReleaseActionProps>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isReleased = !blacklist.isActive;

  // `isPending` only flips on the next render, so rapid clicks would each fire a PATCH first.
  const submittingRef = useRef(false);

  const { mutate, isPending } = useMutation({
    ...adminMemberControllerSetBlacklistActiveMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: () => {
      toast.success('ブラックリストから解除しました');
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerListBlacklistQueryKey(),
      });
      /**
       * This entry's own cache too — releasing does not delete the row, so the detail
       * stays reachable by its URL. Without this, navigating back lands on a cached
       * `is_active: true` copy that still offers 解除 and would answer 409.
       */
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerGetBlacklistQueryKey({
          path: { blacklistId: blacklist.blacklistId },
        }),
      });
      if (blacklist.member) {
        void queryClient.invalidateQueries({
          queryKey: adminMemberControllerDetailQueryKey({
            path: { memberId: blacklist.member.memberId },
          }),
        });
        // 変更履歴 is a separate cache, so a copy opened before the release would stay stale.
        void queryClient.invalidateQueries({
          queryKey: adminMemberRelationsControllerChangeHistoryQueryKey({
            path: { memberId: blacklist.member.memberId },
          }),
        });
      }
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      setIsDialogOpen(false);
      // FR-064a — return to the list, where the entry is now absent. That absence is the
      // operator's confirmation; staying here would leave them on a screen that no longer
      // describes a live listing.
      router.push(navigate('/members/blacklist'));
    },
  });

  const tone: StatusTone = isReleased
    ? 'muted'
    : blacklist.source === 'forced_withdrawal'
      ? 'destructive'
      : 'warning';

  const label = isReleased ? '解除済み' : BLACKLIST_SOURCE_LABEL[blacklist.source];

  const registeredAt = `登録日: ${formatDateYYYYMMDD(blacklist.registeredAt, '—')}`;
  // FR-061 — 登録日 then 登録理由, as V0's status card.
  const meta = isReleased
    ? [registeredAt, `解除日: ${formatDateYYYYMMDD(blacklist.removedAt, '—')}`]
    : [registeredAt, `登録理由: ${formatBlacklistReasons(blacklist.reasonCategories)}`];

  return (
    <>
      <StatusCard
        tone={tone}
        icon={isReleased ? ShieldCheck : ShieldBan}
        label={label}
        meta={meta}
        action={
          // FR-069a — a released entry offers no second release.
          isReleased ? undefined : (
            <RoleGatedButton
              allowedRoles={[UserRole.System, UserRole.Headquarter]}
              denyTooltip="ブラックリスト解除は本部のみ操作できます"
              variant="outline"
              fullWidth
              className="text-destructive hover:text-destructive"
              onClick={() => setIsDialogOpen(true)}
              disabled={isPending}
            >
              ブラックリスト解除
            </RoleGatedButton>
          )
        }
      />

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ブラックリストから解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {memberName} さんをブラックリストから解除します。解除後、再入会が可能になります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                // The dialog closes on its own action; the mutation drives navigation, so
                // the default close is suppressed until the request settles.
                e.preventDefault();
                if (submittingRef.current) return;
                submittingRef.current = true;
                mutate({
                  path: { blacklistId: blacklist.blacklistId },
                  body: { isActive: false },
                });
              }}
            >
              {isPending ? '解除中...' : '解除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
