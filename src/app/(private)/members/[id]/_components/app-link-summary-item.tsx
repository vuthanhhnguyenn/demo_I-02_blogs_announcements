'use client';

import type { ReactNode } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { ChevronRight, Clock, Link2, Link2Off, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { Permission } from '@/types/permission.type';

import { type AppLinkState, formatAutoUnlock } from '../_utils/app-link.util';

interface AppLinkSummaryItemProps {
  state: AppLinkState;
  /** 退会済み — nothing can be linked any more, so the unlinked tooltip is not offered. */
  isWithdrawn: boolean;
  onOpen: () => void;
}

/**
 * A-01 FR-027 アプリ連携 — the 4th item of the head-up summary strip: one status link (icon + word +
 * chevron) that opens the アプリ連携 sheet. When / how it was linked, when a temporary lock lifts and
 * that a permanent one needs the counter go in its tooltip; the details are in the sheet.
 */
export function AppLinkSummaryItem({
  state,
  isWithdrawn,
  onOpen,
}: Readonly<AppLinkSummaryItemProps>) {
  const { hasPermission } = useAuthUser();
  const canOperate = hasPermission(Permission.MembersAppLinkOperate);

  let icon: ReactNode = <Link2Off className="text-muted-foreground size-4" />;
  let word: ReactNode = <span className="text-muted-foreground">未連携</span>;
  let tip: string | null = canOperate && !isWithdrawn ? '押すと紐付けできます' : null;
  if (state.kind === 'linked') {
    icon = <Link2 className="text-success size-4" />;
    word = <span className="text-foreground">連携済み</span>;
    tip = state.route ? `${state.linkedAt} に ${state.route}で連携` : `${state.linkedAt} に連携`;
  }
  if (state.kind === 'tempLocked') {
    icon = <Clock className="text-warning size-4" />;
    word = <span className="text-warning">一時ロック中</span>;
    const unlock =
      state.autoUnlockAt === null ? null : `${formatAutoUnlock(state.autoUnlockAt)} に自動で解除`;
    tip = canOperate ? [unlock, '押すと紐付けできます'].filter(Boolean).join('・') : unlock;
  }
  if (state.kind === 'permLocked') {
    icon = <Lock className="text-destructive size-4" />;
    word = <span className="text-destructive">永続ロック中</span>;
    tip = '窓口で本人確認のうえ解除が必要です';
  }

  const button = (
    <Button variant="link" className="h-auto p-0 text-sm font-medium" onClick={onOpen}>
      {icon}
      {word}
      <ChevronRight data-icon="inline-end" className="text-muted-foreground" />
    </Button>
  );

  return (
    <div>
      <dt className="text-muted-foreground mb-1 text-xs">アプリ連携</dt>
      {/* The value row is as tall as the text values beside it */}
      <dd className="flex h-5 items-center">
        {tip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger render={button} />
              <TooltipContent>
                <p className="text-xs">{tip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          button
        )}
      </dd>
    </div>
  );
}
