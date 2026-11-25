'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { PREFECTURES } from '@/constants/app.constants';
import { calcAge } from '@/utils/age.util';
import { formatDate, formatDateTime } from '@/utils/format.util';
import { Bell, ShieldOff, User } from 'lucide-react';

import { JargonTip } from '@/components/common/jargon-tip';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type {
  MemberDetailDto,
  MemberGateStopDto,
  MemberNotificationPreferenceDto,
} from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

import { Permission } from '@/types/permission.type';

import { getTenureLabel, postalCodeForDisplay, prefectureCodeFromStored } from '../../../../_utils';
import { GATE_STOP_PATTERN_LABELS, isGateStopRestricted } from '../../../_constants/gate-stop';
import {
  brandGroupLabel,
  genderClass,
  genderLabel,
  storeBrandLabel,
} from '../../../_constants/member-labels';
import type { MemberDerivedFacts } from '../../../_hooks/use-member-detail';
import { TestAccountCard } from '../../test-account-card';

type PersonalInfo = MemberDetailDto['personalInfo'];

/** The API stores the JIS X 0401 code (`13`); the address line shows the name (東京都). */
function prefectureName(stored: string | null): string | undefined {
  const code = prefectureCodeFromStored(stored);
  return code ? PREFECTURES[Number(code) - 1] : (stored ?? undefined);
}

function composeFullAddress(personalInfo: PersonalInfo): string {
  // The real API has no separate `city` — prefecture + streetAddress carry the whole line.
  const cityLine = [prefectureName(personalInfo.prefecture), personalInfo.streetAddress]
    .filter(Boolean)
    .join('');
  const parts = [
    personalInfo.postalCode ? `〒${postalCodeForDisplay(personalInfo.postalCode)}` : undefined,
    cityLine || undefined,
    personalInfo.building || undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

export function BasicInfoTab({
  member,
  derived,
  onGateStopRelease,
  onShowHistory,
}: {
  member: MemberDetailDto;
  derived: MemberDerivedFacts;
  onGateStopRelease: () => void;
  /** Opens the 変更履歴 tab — the test-account toasts link there. */
  onShowHistory: () => void;
}) {
  const router = useRouter();
  const memberId = member.memberId;
  const personalInfo = member.personalInfo;

  const currentMemberName = `${personalInfo.lastName} ${personalInfo.firstName}`.trim();
  const referrer = member.referral?.byMember;
  const gender = personalInfo.gender;
  const gateStopRestricted = isGateStopRestricted(member);

  // The real API now returns the whole roster (`members`, each flagged with `isSelf`) plus the
  // server-computed `remainingSlots`, so the card no longer has to join `parent` + `children`
  // by hand nor hide the 残り枠 line.
  const family = member.family;
  const familyMembers = family.members;
  const remainingFamilySlots = family.remainingSlots;

  return (
    <div className="flex flex-col items-start gap-4 md:flex-row">
      <div className="w-full md:w-[60%]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">個人情報</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">生年月日</p>
                  <p className="text-sm font-medium">
                    {personalInfo.dateOfBirth
                      ? `${formatDate(personalInfo.dateOfBirth)}（${calcAge(personalInfo.dateOfBirth)}歳）`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">性別</p>
                  {gender ? (
                    <Badge
                      variant="outline"
                      className={`text-xs font-normal ${genderClass(gender)}`}
                    >
                      {genderLabel(gender)}
                    </Badge>
                  ) : (
                    <p className="text-muted-foreground text-sm font-medium">—</p>
                  )}
                </div>
                <div className="min-w-0 md:col-span-2">
                  <p className="text-muted-foreground mb-1 text-xs">住所</p>
                  <p className="text-sm font-medium break-words">
                    {composeFullAddress(personalInfo)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-xs">電話番号</p>
                  <p className="text-sm font-medium break-words">{personalInfo.phone || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-xs">メールアドレス</p>
                  {/* An e-mail is one unbreakable token, so it may break anywhere */}
                  <p className="text-sm font-medium break-all">{personalInfo.email || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">入会情報</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">入会日</p>
                  <p className="text-sm font-medium">{formatDate(member.enrolledAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">入会店舗</p>
                  <p className="text-sm font-medium wrap-anywhere">
                    {member.primaryStore?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">ブランド</p>
                  {/* The member row carries the brand GROUP; the sub-brand belongs to
                      the store, so both are shown from their own source (QA01 §1-4). */}
                  <p className="text-sm font-medium">
                    {brandGroupLabel(member.brandGroup) || '—'}
                    {member.primaryStore?.brandEnum &&
                      member.primaryStore.brandEnum !== member.brandGroup && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          （{storeBrandLabel(member.primaryStore.brandEnum)}）
                        </span>
                      )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">紹介者</p>
                  {referrer ? (
                    <Button
                      variant="link"
                      className="h-auto max-w-full min-w-0 justify-start gap-0 p-0 text-sm font-medium"
                      nativeButton={false}
                      render={
                        <Link
                          href={navigate('/members/[id]', referrer.memberId, {
                            parentMemberId: memberId,
                            parentName: currentMemberName,
                          })}
                        />
                      }
                    >
                      <TextWithTooltip text={referrer.displayName || '—'} />
                      <span className="shrink-0">（{referrer.memberNumber || '—'}）</span>
                    </Button>
                  ) : (
                    <p className="text-muted-foreground text-sm font-medium">—</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-muted-foreground mb-1 text-xs">入会キャンペーン</p>
                  {/* The campaign applied at enrollment, not the one on today's contract */}
                  <p className="text-sm font-medium wrap-anywhere">
                    {derived.enrollmentCampaignName || '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">家族会員</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              {familyMembers.length === 0 ? (
                <p className="text-muted-foreground text-sm">家族会員の登録はありません</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {familyMembers.map((m: (typeof familyMembers)[number], index: number) => (
                    <div key={m.memberId} className="flex items-center gap-2">
                      <User className="text-muted-foreground size-4 shrink-0" />
                      {m.isSelf ? (
                        <span className="min-w-0 text-sm font-medium wrap-anywhere">
                          {m.displayName}
                        </span>
                      ) : (
                        <Button
                          variant="link"
                          className="h-auto min-w-0 shrink p-0 text-sm font-medium"
                          onClick={() =>
                            router.push(
                              navigate('/members/[id]', m.memberId, {
                                parentMemberId: memberId,
                                parentName: currentMemberName,
                              }),
                            )
                          }
                        >
                          <TextWithTooltip text={m.displayName ?? '—'} />
                          <span className="shrink-0">（{m.memberNumber}）</span>
                        </Button>
                      )}
                      {m.isSelf && (
                        <Badge
                          variant="outline"
                          className="bg-primary/15 text-primary border-primary/20 text-[10px]"
                        >
                          本人
                        </Badge>
                      )}
                      {/* The API guarantees the parent comes first, so the badge keys on position */}
                      {index === 0 && (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          主会員
                        </Badge>
                      )}
                    </div>
                  ))}

                  {remainingFamilySlots != null && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      家族枠 残り{remainingFamilySlots}名（主会員1名＋家族最大3名）
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <TestAccountCard
            memberId={memberId}
            testAccount={member.testAccount}
            memberName={currentMemberName}
            onShowHistory={onShowHistory}
          />
        </div>
      </div>

      <div className="w-full md:w-[40%]">
        <div className="sticky top-0 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">来館情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid w-full grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">在籍期間</p>
                  <p className="text-sm font-semibold">
                    {getTenureLabel(member.enrolledAt ?? undefined)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">最終来館日</p>
                  <p className="text-sm font-semibold">{formatDate(member.lastEntryAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <GateStopCard
            gateStop={gateStopRestricted ? member.gateStop : null}
            onRelease={onGateStopRelease}
          />

          <NotificationSettingsCard preferences={member.notificationPreferences ?? []} />
        </div>
      </div>
    </div>
  );
}

/**
 * ゲートストップ card (A-01 FR-014).
 *
 * 認証方法 / ICカード番号 / QRコード used to sit here, read from the mock
 * `~/usage-history/access-settings`. They are gone: the customer confirmed (qa-121) that none of
 * the three is a member attribute, and the prototype dropped them with the same design update
 * that turned this card into a gate-stop-only card (fitness-crm-ui 2026-09-17).
 */
function GateStopCard({
  gateStop,
  onRelease,
}: {
  /** The gate stop in force, or null when entry is not restricted. */
  gateStop: MemberGateStopDto | null;
  onRelease: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          <JargonTip term="ゲートストップ" />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {gateStop ? (
          <div className="flex flex-col gap-2">
            <Badge
              variant="outline"
              className="bg-destructive/15 text-destructive border-destructive/20 w-fit gap-1 text-[10px]"
            >
              <span className="bg-destructive size-1.5 rounded-full" />
              {gateStop.pattern ? GATE_STOP_PATTERN_LABELS[gateStop.pattern] : '—'}
            </Badge>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">端末メッセージ</p>
                <p className="text-sm font-medium break-all">{gateStop.message || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">設定者</p>
                <p className="text-sm font-medium wrap-anywhere">
                  {gateStop.setBy?.displayName ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">設定日時</p>
                <p className="text-sm font-medium">{formatDateTime(gateStop.setAt)}</p>
              </div>
            </div>
            <RoleGatedButton
              requiredPermission={Permission.MembersGateStop}
              denyTooltip="ゲートストップ解除の権限がありません"
              variant="outline"
              size="sm"
              className="w-fit gap-1"
              onClick={onRelease}
            >
              <ShieldOff className="size-4" />
              解除...
            </RoleGatedButton>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">設定なし</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Notification opt-ins are per TOPIC, not per channel (push / mail / …) — the
 * axis changed with the backend answer 2026-08-10 (QA02 §2.3). All 10 topics
 * always come back, in this order, so no sorting or filling in is needed here.
 */
const NOTIFICATION_TOPIC_LABELS: Record<MemberNotificationPreferenceDto['topic'], string> = {
  visit_stamp: '来館・スタンプ',
  points: 'ポイント',
  achievements: '称号',
  training_reminder: 'トレーニングリマインダー',
  body_measurement_reminder: '体組成測定リマインダー',
  condition_record: 'コンディション記録',
  follow_request: 'フォロー申請',
  news: 'お知らせ',
  campaign: 'キャンペーン',
  reservation_reminder: '予約リマインダー',
};

function NotificationSettingsCard({
  preferences,
}: {
  preferences: MemberNotificationPreferenceDto[];
}) {
  const header = (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold">通知受信設定</CardTitle>
        <Badge variant="outline" className="text-muted-foreground text-[10px]">
          参照のみ
        </Badge>
      </div>
    </CardHeader>
  );

  return (
    <Card>
      {header}
      <CardContent className="px-4">
        <p className="text-muted-foreground mb-3 text-xs">
          会員がアプリ側で設定した通知種別ごとの受信ON/OFFです。管理者は参照のみ可能です。
        </p>
        <div className="flex flex-col divide-y">
          {preferences.map((preference) => (
            <div key={preference.topic} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Bell className="text-muted-foreground size-4" />
                <span className="text-sm">
                  {NOTIFICATION_TOPIC_LABELS[preference.topic] ?? preference.topic}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    preference.isOptedIn
                      ? 'bg-success/15 text-success border-success/20'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {preference.isOptedIn ? 'ON' : 'OFF'}
                </Badge>
                {/* Null until the member changes the topic themselves */}
                <span className="text-muted-foreground text-[10px]">
                  {preference.updatedAt ? formatDate(preference.updatedAt) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
