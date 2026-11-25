import type { ReactNode } from 'react';

import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MemberHeadupCardProps {
  /** The member identifier as displayed (会員番号 on the member screens). */
  memberId: string;
  /**
   * 旧会員番号. The 旧No segment is omitted when absent (as on the transfer request); the member
   * detail screen, which always shows the label, passes an em dash instead.
   */
  oldMemberNo?: string | null;
  name: string;
  nameKana?: string | null;
  /** 会員種別 (display label). */
  memberType?: string | null;
  /** 主契約名. */
  contractName?: string | null;
  /**
   * 主契約店舗 — the store the main contract is signed with, which the real API says need not be
   * the member's `primaryStore`. Display-ready text; the row is skipped when absent, so screens
   * that are only *about* a member (e.g. a transfer request) can leave it out.
   */
  contractStoreName?: string | null;
  /** 登録日 — when the member record was created. Display-ready text, skipped when absent. */
  registrationDate?: string | null;
  /** 顔写真 URL. Falls back to the initials when absent. */
  facePhotoUrl?: string | null;
  /** Avatar initials. Derived from `name` when omitted. */
  avatarFallback?: string;
  /**
   * 会員ステータス badge, passed in as a slot rather than derived here: the status vocabulary,
   * colors and dot rule live in the members route's constants, and `components/common` does not
   * import from `app/`.
   */
  statusBadge?: ReactNode;
  /**
   * Optional content rendered at the right edge of the identity row — for a transfer, the origin
   * store label + name; other screens could pass a button or link instead. A plain node (not a
   * `storeName: string`) since what belongs there varies by screen.
   */
  asideContent?: ReactNode;
  /** Extra content appended below the identity row, separated by a rule (e.g. a summary strip). */
  children?: ReactNode;
  className?: string;
}

/**
 * Member identity head-up card: avatar, name + status, kana, IDs and the 会員種別 / 主契約 badges.
 *
 * Shared by the member detail screen and screens that are *about* a member without being it (e.g.
 * a transfer request), so "who is this?" reads identically everywhere. Screen-specific extras stay
 * out of here: the member detail screen's current-status strip is passed in as `children`, and its
 * status badge as `statusBadge`.
 */
export function MemberHeadupCard({
  memberId,
  oldMemberNo,
  name,
  nameKana,
  memberType,
  contractName,
  contractStoreName,
  registrationDate,
  facePhotoUrl,
  avatarFallback,
  statusBadge,
  asideContent,
  children,
  className,
}: Readonly<MemberHeadupCardProps>) {
  // 山田 太郎 → 山太. Matches the member detail screen's lastName[0] + firstName[0] derivation,
  // since the name it passes is those two joined by a space.
  const initials =
    avatarFallback ??
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('');

  return (
    <Card className={className ? `gap-0 py-0 ${className}` : 'gap-0 py-0'}>
      <CardContent className="flex flex-col gap-4 px-4 py-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-24 shrink-0 rounded-lg after:rounded-lg">
            <AvatarImage
              src={facePhotoUrl ?? undefined}
              alt={name}
              className="rounded-lg object-cover"
            />
            <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 text-base font-bold wrap-anywhere">{name}</p>
              {statusBadge}
            </div>
            {nameKana && (
              <p className="text-muted-foreground mt-1 text-xs wrap-anywhere">{nameKana}</p>
            )}
            {/* A-01 FR-004 表示項目: ユーザーID・旧会員No・主契約店舗・登録日 */}
            <div className="text-muted-foreground mt-1 font-mono text-xs wrap-anywhere">
              ID: {memberId}
              {oldMemberNo && <> / 旧No: {oldMemberNo}</>}
              {contractStoreName && (
                <span className="ml-2 font-sans">主契約店舗: {contractStoreName}</span>
              )}
              {registrationDate && (
                <span className="ml-2 font-sans">登録日: {registrationDate}</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {memberType && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {memberType}
                </Badge>
              )}
              {contractName && (
                <Badge
                  variant="outline"
                  className="max-w-full min-w-0 shrink text-[10px] font-normal"
                >
                  <TextWithTooltip text={`主契約: ${contractName}`} />
                </Badge>
              )}
            </div>
          </div>
          {asideContent && <div className="shrink-0">{asideContent}</div>}
        </div>

        {children && (
          <>
            <Separator />
            {children}
          </>
        )}
      </CardContent>
    </Card>
  );
}
