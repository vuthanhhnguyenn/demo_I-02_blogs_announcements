'use client';

import Link from 'next/link';

import { TextWithTooltip } from '@/components/common/text-with-tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { type StaffDetailDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';

interface StaffPersonalInfoCardProps {
  staff: StaffDetailDto;
}

/**
 * 基本情報 card — スタッフID / 氏名 / メールアドレス（ログインID） — src: staff-detail.tsx L209-229
 *
 * NOTE(spec-gap, 2026-09-18): the フリガナ line and the (now hidden) 携帯電話番号 row below are **out of
 * scope per Y-01** — they appear in no Y-01 requirement, no design note and no prototype; see
 * `specs/020-staff-permission-management/spec.md` › "Out of scope for this spec". The backend
 * diverges the other way (`StaffDetailDto` returns `lastNameKana` / `firstNameKana` / `phone`),
 * so the wire supports them. Decision (user, 2026-09-18): Y-01 wins, but the working UI is
 * kept rather than deleted so the divergence stays visible. Resolve by amending Y-01 or
 * removing these fields. Matching notes: `edit/_schemas/staff-edit-form.schema.ts`,
 * `edit/_components/personal-info-section.tsx`.
 */
export function StaffPersonalInfoCard({ staff }: StaffPersonalInfoCardProps) {
  const kana = [staff.lastNameKana, staff.firstNameKana].filter(Boolean).join(' ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">基本情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">スタッフID</p>
            <p className="text-sm">{staff.id}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground mb-1 text-xs">氏名</p>
            {/* A long unbroken name used to be clipped mid-token at the card border with
                neither ellipsis nor tooltip; TextWithTooltip is the same treatment the
                list table gives 氏名. */}
            <TextWithTooltip
              text={`${staff.lastName} ${staff.firstName}`}
              className="text-sm font-medium"
            />
            {kana && <p className="text-muted-foreground truncate text-xs">{kana}</p>}
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">メールアドレス（ログインID）</p>
            <p className="text-sm wrap-break-word">{staff.email}</p>
          </div>
          {/* 携帯電話番号 — hidden, out of scope per Y-01 (Y-01 - Bug No.15); see the note above.
          <div>
            <p className="text-muted-foreground mb-1 text-xs">携帯電話番号</p>
            <p className="text-sm">{staff.phone ?? '—'}</p>
          </div> */}
          {staff.memberId && (
            <div className="col-span-2">
              <p className="text-muted-foreground mb-1 text-xs">連携会員</p>
              <Link
                href={navigate('/members/[id]', staff.memberId)}
                className="text-primary text-sm hover:underline"
              >
                {staff.memberId}
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
