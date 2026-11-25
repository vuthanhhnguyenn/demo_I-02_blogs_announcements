'use client';

import { useEffect, useRef, useState } from 'react';

import { buildLoginUrl, handleLogout } from '@/utils/global.util';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react';

import { currentUserQueryKey } from '@/hooks/use-current-user';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

import {
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_IDLE_WARNING_BEFORE_MS,
  getLastSessionActivity,
  markSessionActivity,
  subscribeSessionEnded,
} from '@/lib/auth/session-activity.util';

const TICK_MS = 1000;

/**
 * セッションタイムアウト警告バー (Y-13 FR-M007, prototype `session-timeout-banner.tsx`).
 *
 * - 最終API呼出から55分: 警告バーを表示する（タイムアウト5分前）
 * - 60分: 自動ログアウトし、ログイン画面で「セッションの有効期限が切れました」を表示する
 *
 * 「セッションを継続」は `/crm/me` を呼ぶだけで良い — BFF ガードを通過した時点でサーバー側の
 * セッションが延長され、レスポンス受信で FE の最終操作時刻も更新される (use-client-request)。
 * × で閉じた場合もタイムアウト自体は止まらない（同じ待機サイクル中は再表示しない）。
 */
export function SessionTimeoutBanner() {
  const queryClient = useQueryClient();
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [dismissedFor, setDismissedFor] = useState<number | null>(null);
  const [extending, setExtending] = useState(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    // A page opened before any call was recorded (e.g. storage was cleared) starts its window now;
    // the `/crm/me` request that every private page fires settles the real value right after.
    if (getLastSessionActivity() === null) markSessionActivity();

    const tick = () => {
      const last = getLastSessionActivity();
      const current = Date.now();
      setLastActivityAt(last);
      setNow(current);
      if (last !== null && current - last >= SESSION_IDLE_TIMEOUT_MS && !loggingOut.current) {
        loggingOut.current = true;
        void handleLogout({ sessionExpired: true });
      }
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);

    // Another tab already logged out (and removed the shared cookie / server session) — just leave.
    const unsubscribe = subscribeSessionEnded((reason) => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      window.location.href =
        reason === 'expired'
          ? buildLoginUrl({ redirectTo: window.location.href, variant: 'session-expired' })
          : buildLoginUrl();
    });

    return () => {
      window.clearInterval(id);
      unsubscribe();
    };
  }, []);

  if (lastActivityAt === null) return null;
  const remaining = SESSION_IDLE_TIMEOUT_MS - (now - lastActivityAt);
  const inWarningWindow = remaining > 0 && remaining <= SESSION_IDLE_WARNING_BEFORE_MS;
  if (!inWarningWindow || dismissedFor === lastActivityAt) return null;

  const extendSession = async () => {
    setExtending(true);
    try {
      await queryClient.refetchQueries({ queryKey: currentUserQueryKey() });
    } finally {
      setExtending(false);
    }
  };

  return (
    <div
      role="alert"
      className="border-warning/20 bg-warning/10 flex shrink-0 items-center gap-3 border-b px-4 py-2"
    >
      <AlertTriangle className="text-warning size-4 shrink-0" aria-hidden="true" />
      <p className="text-foreground flex-1 text-xs">
        まもなくセッションが有効期限を迎えます。操作を続けるには更新してください。
      </p>
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={() => void extendSession()}
        disabled={extending}
      >
        {extending && <Spinner className="size-3" />}
        セッションを継続
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground size-7 shrink-0"
        onClick={() => setDismissedFor(lastActivityAt)}
        aria-label="通知バーを閉じる"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
