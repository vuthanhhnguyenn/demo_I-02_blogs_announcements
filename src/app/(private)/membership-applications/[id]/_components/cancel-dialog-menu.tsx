'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { useRef, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAfter, startOfDay } from 'date-fns';
import { MoreHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';

import { RoleGatedMenuItem } from '@/components/common/role-gated-menu-item';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { resolveApiErrorMessage } from '@/lib/api-error.util';
import {
  adminApplicationControllerCancelMutation,
  adminApplicationControllerDetailQueryKey,
  adminApplicationControllerListQueryKey,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';

import { Permission, UserRole } from '@/types/permission.type';

import { SAME_DAY_CANCEL_LIMIT } from '../../_constants/constants';
import {
  APPLICATION_ERROR_CODE,
  getApplicationErrorCode,
  isStaleStateError,
} from '../../_utils/application-error.util';
import { CancelDialog } from './cancel-dialog';
import { CancelErrorDialog } from './cancel-error-dialog';
import type { ApplicationDetail } from './membership-application.utils';

interface CancelMenuDropdownProps {
  app: ApplicationDetail;
}

// Cancel is blocked from 利用開始日 itself (usageStartDate ≤ today). Wording follows the API's
// E-ENR-201 rewording in BE MR !1048 (「利用開始日以降のため、キャンセルできません。」, C-01 Bug-No11).
const USAGE_STARTED_MESSAGE = '利用開始日以降の申請はキャンセルできません。';

function sameDayLimitMessage(limit: number): string {
  return `当日のキャンセル操作は${limit}回までです。`;
}

export function CancelMenuDropdown({ app }: Readonly<CancelMenuDropdownProps>) {
  const queryClient = useQueryClient();
  const applicationId = app.applicationId;
  const sameDayCancelLimit = app.sameDayCancelLimit || SAME_DAY_CANCEL_LIMIT;

  function invalidateApplication() {
    void queryClient.invalidateQueries({
      queryKey: adminApplicationControllerDetailQueryKey({ path: { applicationId } }),
    });
    void queryClient.invalidateQueries({ queryKey: adminApplicationControllerListQueryKey() });
  }

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErrorOpen, setCancelErrorOpen] = useState(false);
  const [cancelErrorMessage, setCancelErrorMessage] = useState('');

  // Blocks a second cancel POST from a click that lands before the re-render disables 取り消す.
  const isSubmittingRef = useRef(false);

  // The two documented guards (E-ENR-201 usage started, E-ENR-005 daily limit) answer in the
  // blocked-message dialog instead of a toast; every other failure uses the shared toast.
  const cancelMutation = useMutation({
    ...adminApplicationControllerCancelMutation(),
    meta: { suppressErrorToast: true },
    onSuccess: () => {
      setCancelDialogOpen(false);
      setCancelReason('');
      invalidateApplication();
      // A cancel also updates the member, so a member screen opened earlier must refetch.
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({
          path: { memberId: app.member.memberId },
        }),
      });
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      toast.success('申請を取り消しました。');
    },
    onError: (error) => {
      const code = getApplicationErrorCode(error);
      if (code === APPLICATION_ERROR_CODE.usageStarted) {
        setCancelDialogOpen(false);
        setCancelErrorMessage(USAGE_STARTED_MESSAGE);
        setCancelErrorOpen(true);
        return;
      }
      if (code === APPLICATION_ERROR_CODE.sameDayCancelLimit) {
        setCancelDialogOpen(false);
        setCancelErrorMessage(sameDayLimitMessage(sameDayCancelLimit));
        setCancelErrorOpen(true);
        return;
      }
      if (isStaleStateError(error)) invalidateApplication();
      toast.error(resolveApiErrorMessage(error));
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  function handleCancelButtonClick() {
    // Client-side pre-checks mirror the server guards so the common cases never round-trip.
    const usageStart = app.usageStartDate ? new Date(`${app.usageStartDate}T00:00:00`) : null;
    const today = startOfDay(new Date());
    if (usageStart && !isAfter(usageStart, today)) {
      setCancelErrorMessage(USAGE_STARTED_MESSAGE);
      setCancelErrorOpen(true);
      return;
    }
    if (app.sameDayCancelCount >= sameDayCancelLimit) {
      setCancelErrorMessage(sameDayLimitMessage(sameDayCancelLimit));
      setCancelErrorOpen(true);
      return;
    }
    setCancelDialogOpen(true);
  }

  function handleCancelConfirm() {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    cancelMutation.mutate({
      path: { applicationId },
      body: { cancelReason: cancelReason.trim(), expectedStatus: 'approved' },
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex size-8 items-center justify-center rounded-md border">
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <RoleGatedMenuItem
            variant="destructive"
            allowedRoles={[UserRole.Headquarter, UserRole.Manager, UserRole.Staff]}
            requiredPermission={Permission.MembershipApplicationsCancel}
            denyBadge="権限なし"
            onClick={handleCancelButtonClick}
          >
            <div className="flex items-center gap-2">
              <X className="size-4" />
              申請を取り消す
            </div>
          </RoleGatedMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        paymentMethod={app.paymentMethod}
        sameDayCancelCount={app.sameDayCancelCount}
        sameDayCancelLimit={sameDayCancelLimit}
        cancelReason={cancelReason}
        onCancelReasonChange={setCancelReason}
        onConfirm={handleCancelConfirm}
        isPending={cancelMutation.isPending}
      />

      <CancelErrorDialog
        open={cancelErrorOpen}
        onOpenChange={setCancelErrorOpen}
        message={cancelErrorMessage}
      />
    </>
  );
}
