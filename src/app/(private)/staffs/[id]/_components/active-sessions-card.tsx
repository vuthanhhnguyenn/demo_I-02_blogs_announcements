'use client';

import { useState } from 'react';

import { formatElapsedTime } from '@/utils/date.util';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Monitor, Smartphone } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import {
  adminStaffControllerActiveSessionOptions,
  adminStaffControllerActiveSessionQueryKey,
  adminStaffControllerRevokeSessionsMutation,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StaffActiveSessionDto } from '@/lib/api-real/types.gen';

interface ActiveSessionsCardProps {
  staffId: string;
}

const MOBILE_UA_RE = /Mobile|Android|iPhone|iPad/i;

// Checked in priority order, not by position in the UA: Edge/Opera UAs also
// contain "Chrome" and "Safari", Android UAs contain "Linux", iOS UAs contain
// "Mac OS X" — a single alternation regex returns whichever token comes first.
const OS_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/iPhone/i, 'iPhone'],
  [/iPad/i, 'iPad'],
  [/Android/i, 'Android'],
  [/Windows/i, 'Windows'],
  [/Mac OS X|Macintosh/i, 'Mac'],
  [/Linux/i, 'Linux'],
];

const BROWSER_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/Edg(e|A|iOS)?\//i, 'Edge'],
  [/OPR\/|Opera/i, 'Opera'],
  [/Firefox\/|FxiOS\//i, 'Firefox'],
  [/Chrome\/|CriOS\//i, 'Chrome'],
  [/Safari\//i, 'Safari'],
];

function matchFirstRule(userAgent: string, rules: ReadonlyArray<readonly [RegExp, string]>) {
  return rules.find(([re]) => re.test(userAgent))?.[1];
}

function deviceLabelFromUserAgent(userAgent: string | null): string {
  if (!userAgent) return '不明なデバイス';

  const os = matchFirstRule(userAgent, OS_RULES);
  const browser = matchFirstRule(userAgent, BROWSER_RULES);

  if (os && browser) return `${os} · ${browser}`;
  return os ?? browser ?? userAgent;
}

/**
 * アクティブセッション card — Y-13 FR-S002 (3 concurrent devices, per-row 強制終了).
 * src: staff-detail.tsx L412-461, session-terminate dialog L556-585
 */
export function ActiveSessionsCard({ staffId }: ActiveSessionsCardProps) {
  const queryClient = useQueryClient();
  const [terminatedIds, setTerminatedIds] = useState<Set<string>>(new Set());
  const [terminateTarget, setTerminateTarget] = useState<StaffActiveSessionDto | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  const { data, isLoading } = useQuery({
    ...adminStaffControllerActiveSessionOptions({ path: { id: staffId } }),
  });

  // BE shipped FR-S002's multi-session shape (`sessions[]` + `maxConcurrent`) on 2026-09-16;
  // the old singular `session` field is deprecated and no longer read here.
  const sessions: StaffActiveSessionDto[] = data?.sessions ?? [];
  const maxConcurrent = data?.maxConcurrent;

  const revokeMutation = useMutation({
    ...adminStaffControllerRevokeSessionsMutation(),
    onSuccess: () => {
      if (terminateTarget) {
        setTerminatedIds((prev) => new Set(prev).add(terminateTarget.sessionId));
        toast.success('セッションを強制終了しました');
      } else {
        // Revoke-all leaves nothing to mark per row — the refetch below empties the list.
        toast.success('すべてのセッションを終了しました');
      }
      setTerminateTarget(null);
      setRevokeAllOpen(false);
      queryClient.invalidateQueries({
        queryKey: adminStaffControllerActiveSessionQueryKey({ path: { id: staffId } }),
      });
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">アクティブセッション</CardTitle>
          {sessions.length > 0 && (
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive h-8 gap-1"
                onClick={() => setRevokeAllOpen(true)}
              >
                <LogOut className="size-4" />
                すべてのセッションを終了
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="px-4">
          {isLoading ? (
            <Skeleton className="h-16 w-full rounded-lg" />
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              現在ログイン中のセッションはありません。
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => {
                const DeviceIcon = MOBILE_UA_RE.test(session.userAgent ?? '')
                  ? Smartphone
                  : Monitor;
                const terminated = terminatedIds.has(session.sessionId);
                return (
                  <div
                    key={session.sessionId}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                      <DeviceIcon className="text-muted-foreground size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {deviceLabelFromUserAgent(session.userAgent)}
                        </p>
                        {session.isCurrent && (
                          <Badge
                            variant="outline"
                            className="bg-info/15 text-info border-info/20 text-[10px] font-medium"
                          >
                            現在のセッション
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                        {session.ipAddress ?? '不明なIP'} ・ 最終アクティブ{' '}
                        {formatElapsedTime(
                          session.lastSeenAt ?? session.loggedInAt ?? session.createdAt,
                        ) || '不明'}
                      </p>
                    </div>
                    {session.isCurrent ? null : terminated ? (
                      <span className="text-muted-foreground shrink-0 text-xs">終了しました</span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive h-8 shrink-0 gap-1"
                        onClick={() => setTerminateTarget(session)}
                      >
                        <LogOut className="size-4" />
                        強制終了
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {maxConcurrent !== undefined && (
            <p className="text-muted-foreground mt-3 text-xs">
              同時ログインは最大{maxConcurrent}
              デバイスまで。上限を超えた場合は最も古いセッションが自動的に失効します。
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={terminateTarget !== null}
        onOpenChange={(open) => {
          if (!open) setTerminateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このセッションを強制終了しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {terminateTarget && (
                <>
                  「{deviceLabelFromUserAgent(terminateTarget.userAgent)}」（
                  {terminateTarget.ipAddress ?? '不明なIP'}）のセッションを強制終了します。
                  このデバイスは即座にログアウトされ、CRMを利用するには再度ログインが必要になります。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={revokeMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                // The dialog only opens with a target set, but narrow explicitly: without it
                // an unset target would send an empty body, which the API reads as
                // "revoke EVERY session this staff holds" — a much wider action than the
                // per-row button promises.
                if (!terminateTarget) return;
                revokeMutation.mutate({
                  path: { id: staffId },
                  // Targets this one terminal; omitting the body would end every session
                  // the staff holds (the pre-FR-S002 behaviour).
                  body: { sessionId: terminateTarget.sessionId },
                });
              }}
            >
              強制終了する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={revokeAllOpen}
        onOpenChange={(open) => {
          if (!open) setRevokeAllOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>すべてのセッションを終了しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このスタッフがログイン中のすべてのデバイス（現在のセッションを含む）が即座にログアウトされます。
              CRMを利用するには、どのデバイスからも再度ログインが必要になります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              disabled={revokeMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                revokeMutation.mutate({
                  path: { id: staffId },
                  // No body — the API reads that as "revoke EVERY session this staff holds",
                  // which is exactly what this dialog promises (revised FR-005).
                  body: undefined,
                });
              }}
            >
              すべて終了する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
