'use client';
// Holds local reveal/mask toggle state — client-only.
import { useState } from 'react';

import { PREFECTURES } from '@/constants/app.constants';
import { formatDateYYYYMMDD } from '@/utils/date.util';
import { phoneForDisplay } from '@/utils/phone.util';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Eye, EyeOff, Loader2, User } from 'lucide-react';

import { DisabledReasonButton } from '@/components/common/disabled-reason-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { getEnrollmentApplicantPersonalInfoOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { ApplicantPersonalInfoDto } from '@/lib/api-real/types.gen';

import {
  type ApplicationDetail,
  GENDER_LABELS,
  applicantKana,
  applicantName,
} from './membership-application.utils';

/**
 * FR-M002 L447 reveal. API-098 serves masked strings only (`value` is always null); the real
 * values come from `GET /admin/applications/{applicationId}/personal-info` (audit-logged,
 * 30 calls/min per staff), fetched on the first reveal click only — never on page load.
 */
const PII_REVEAL_UNAVAILABLE = 'この会員の個人情報を表示できません';

interface RevealedPii {
  phone: string | null;
  email: string | null;
  address: string | null;
}

function toRevealedPii(info: ApplicantPersonalInfoDto): RevealedPii {
  const { postalCode, prefectureCode, streetAddress, building } = info.address;
  const prefecture = prefectureCode ? (PREFECTURES[Number(prefectureCode) - 1] ?? null) : null;
  const postal = postalCode ? `〒${postalCode.slice(0, 3)}-${postalCode.slice(3)}` : null;
  const address = [postal, prefecture, streetAddress, building].filter(Boolean).join(' ');
  return { phone: info.phoneNumber, email: info.email, address: address || null };
}

interface ApplicantInfoCardProps {
  app: ApplicationDetail;
}

function Field({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <span className="text-sm wrap-anywhere">{value}</span>
    </div>
  );
}

function MaskedField({
  label,
  maskedValue,
  realValue,
  forceVisible,
  revealUnavailable,
  isRevealing,
  onRequestReveal,
}: Readonly<{
  label: string;
  maskedValue: string;
  realValue: string | null;
  forceVisible: boolean;
  revealUnavailable: boolean;
  isRevealing: boolean;
  /** True when the click retried a failed fetch — the field then stays in the revealed state. */
  onRequestReveal: () => boolean;
}>) {
  const [individualVisible, setIndividualVisible] = useState(false);
  const visible = (forceVisible || individualVisible) && realValue !== null;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        {/* `min-w-0` + wrap-anywhere keep the eye button inside the card for long values (BUG-B-01). */}
        <span className="min-w-0 flex-1 font-mono text-sm wrap-anywhere">
          {visible ? realValue : maskedValue}
        </span>
        {!forceVisible && (
          <DisabledReasonButton
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground size-6 shrink-0 p-0"
            onClick={() => {
              const retried = onRequestReveal();
              setIndividualVisible((v) => retried || !v);
            }}
            disabled={revealUnavailable}
            disabledReason={PII_REVEAL_UNAVAILABLE}
            aria-label={individualVisible ? `${label}を隠す` : `${label}を表示する`}
          >
            {individualVisible && isRevealing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : individualVisible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </DisabledReasonButton>
        )}
      </div>
    </div>
  );
}

export function ApplicantInfoCard({ app }: Readonly<ApplicantInfoCardProps>) {
  const [allRevealed, setAllRevealed] = useState(false);
  const [revealRequested, setRevealRequested] = useState(false);
  const { member } = app;
  const photoUrl = member.facePhotoSignedUrl;
  const personalInfo = useQuery({
    ...getEnrollmentApplicantPersonalInfoOptions({
      path: { applicationId: app.applicationId },
    }),
    enabled: revealRequested,
    staleTime: 5 * 60 * 1000,
    retry: false,
    meta: { showErrorToast: true },
  });
  // 404 E-ENR-001 (not visible / outside the caller's scope) / 403 → the reveal stays
  // unavailable. Anything else (429 E-RATE-001 over 30 calls/min, a transient 5xx) → toast
  // only, and the next click retries.
  const errorStatus = getApiErrorStatus(personalInfo.error);
  const revealUnavailable = errorStatus === 404 || errorStatus === 403;
  const isRetryable = personalInfo.isError && !revealUnavailable;
  const revealed = personalInfo.data ? toRevealedPii(personalInfo.data) : null;
  const isFirstReveal = revealRequested && personalInfo.isFetching && !personalInfo.data;
  const requestReveal = () => {
    if (!isRetryable) {
      setRevealRequested(true);
      return false;
    }
    void personalInfo.refetch();
    return true;
  };
  const revealProps = {
    revealUnavailable,
    isRevealing: personalInfo.isFetching,
    onRequestReveal: requestReveal,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">申請者情報</CardTitle>
        {/* While the member detail is first loading the button shows a spinner and ignores
            clicks, so a double-click cannot toggle the reveal back off (BUG-B-02). */}
        <DisabledReasonButton
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => {
            if (isFirstReveal) return;
            const retried = requestReveal();
            setAllRevealed((v) => retried || !v);
          }}
          disabled={revealUnavailable}
          disabledReason={PII_REVEAL_UNAVAILABLE}
          aria-busy={isFirstReveal}
        >
          {isFirstReveal ? (
            <Loader2 className="size-4 animate-spin" />
          ) : allRevealed ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
          {allRevealed ? '個人情報を隠す' : '個人情報を表示'}
        </DisabledReasonButton>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex gap-6">
          <div className="flex shrink-0 flex-col gap-2">
            {/* C-01 FR-M002 「顔写真」: a registered photo is shown as the image itself — it is
                what staff compare against on a BL match (prototype 9/17). Only phone / email /
                address are masked. */}
            <Avatar className={`bg-muted/30 size-24 border ${photoUrl ? 'border-success/40' : ''}`}>
              {photoUrl && (
                <AvatarImage
                  src={photoUrl}
                  alt={`${applicantName(app)}の顔写真`}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-muted/30">
                <div className="text-muted-foreground flex flex-col items-center gap-1">
                  <User className="size-6" />
                  <span className="text-[10px]">顔写真</span>
                </div>
              </AvatarFallback>
            </Avatar>
            {photoUrl ? (
              <Badge
                variant="outline"
                className="bg-success/15 text-success border-success/20 w-full justify-center gap-1 text-[10px]"
              >
                <CheckCircle className="size-3" />
                登録済み
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-warning/15 text-warning border-warning/20 w-full justify-center gap-1 text-[10px]"
              >
                <AlertTriangle className="size-3" />
                未登録
              </Badge>
            )}
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-8 gap-y-4">
            <Field label="氏名" value={applicantName(app)} />
            <Field label="フリガナ" value={applicantKana(app)} />
            <Field
              label="生年月日"
              value={`${formatDateYYYYMMDD(member.dateOfBirth ?? undefined, '—')}（${member.ageAtApplication}歳）`}
            />
            <Field label="性別" value={GENDER_LABELS[member.gender] ?? '—'} />
            <MaskedField
              label="電話番号"
              maskedValue={member.phoneNumber.masked ?? '—'}
              realValue={phoneForDisplay(member.phoneNumber.value ?? revealed?.phone) || null}
              forceVisible={allRevealed}
              {...revealProps}
            />
            <MaskedField
              label="メールアドレス"
              maskedValue={member.email.masked ?? '—'}
              realValue={member.email.value ?? revealed?.email ?? null}
              forceVisible={allRevealed}
              {...revealProps}
            />
            <div className="col-span-2">
              <MaskedField
                label="住所"
                maskedValue={member.address.masked ?? '—'}
                realValue={revealed?.address ?? null}
                forceVisible={allRevealed}
                {...revealProps}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
