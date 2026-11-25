'use client';

import { useState } from 'react';

import { Link2Off } from 'lucide-react';

import { useInFlightGuard } from '@/hooks/use-in-flight-guard.hook';

import { RoleGatedButton } from '@/components/common/role-gated-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import type { Permission, UserRole } from '@/types/permission.type';

interface RemoveActionButtonProps {
  readonly dialogTitle: string;
  readonly dialogDescription: string;
  /**
   * Who may unlink. Each section has its own rule — main contracts and options are sales settings
   * (`stores.config-contract`, HQ/System), while campaigns are System / Headquarter / Staff
   * (spec `027-store-detail` FR-047) — so the gate travels with the caller rather than being
   * fixed here.
   */
  readonly allowedRoles?: readonly UserRole[];
  readonly requiredPermission?: Permission;
  /**
   * Shown to a role that may not unlink — the section's own wording (spec D-FR-038/047, e.g.
   * 「販売設定（主契約）はHQ/Systemのみ操作可能」). Left unset, `RoleGatedButton` falls back to its
   * generic 権限がありません copy.
   */
  readonly denyTooltip?: string;
  readonly isPending?: boolean;
  /**
   * The unlink write. It must return the write's promise: the dialog stays open until it settles,
   * closes on success and stays open on failure (already toasted globally) so the operator can
   * retry. A second click while it runs is dropped (BUG-U5-06).
   */
  readonly onConfirm: () => Promise<unknown>;
}

export function RemoveActionButton({
  dialogTitle,
  dialogDescription,
  allowedRoles,
  requiredPermission,
  denyTooltip,
  isPending = false,
  onConfirm,
}: RemoveActionButtonProps) {
  const [open, setOpen] = useState(false);
  const run = useInFlightGuard();

  const handleConfirm = () =>
    run(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch {
        // Already surfaced by the shared mutation-error toast; the dialog stays open for a retry
      }
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <RoleGatedButton
            allowedRoles={allowedRoles}
            requiredPermission={requiredPermission}
            denyTooltip={denyTooltip}
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive/80 hover:text-destructive size-7"
            aria-label="紐づけを解除"
          >
            <Link2Off className="size-4" />
          </RoleGatedButton>
        }
      ></AlertDialogTrigger>
      {/* `minmax(0,1fr)` + `overflow-wrap:anywhere`: an unbroken-token name must wrap inside the
          dialog instead of widening it and pushing the footer off screen (BUG-U5-12) */}
      <AlertDialogContent className="max-w-sm grid-cols-[minmax(0,1fr)]">
        <AlertDialogHeader className="min-w-0 grid-cols-[minmax(0,1fr)]">
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription className="max-w-full [overflow-wrap:anywhere]">
            {dialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => void handleConfirm()}
          >
            解除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
