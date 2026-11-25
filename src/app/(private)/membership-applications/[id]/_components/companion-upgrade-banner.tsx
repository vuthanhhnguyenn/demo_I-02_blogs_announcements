import { ArrowUpCircle, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { ApplicationDetail } from './membership-application.utils';

interface CompanionUpgradeBannerProps {
  app: ApplicationDetail;
}

/**
 * Shown when the applicant's member type before this application was `companion` (C区分).
 * The inherited visit / training counts are not part of API-098 (spec v1.7) and C-01 FR-M005
 * does not require them, so the banner shows the upgrade itself only (B8 closed 2026-10-07).
 */
export function CompanionUpgradeBanner({ app }: Readonly<CompanionUpgradeBannerProps>) {
  return (
    <Card className="border-info/40 bg-info/15">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ArrowUpCircle className="text-info size-4 shrink-0" />
          <CardTitle className="text-info text-base font-semibold">
            同伴者からの正会員昇格申請
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <p className="text-muted-foreground text-xs">
          この申請者は同伴者（C区分）として登録済みです。入会申請を承認すると、Yamauchi-IDを引き継いだまま正会員（A区分）へ昇格します。同伴履歴・トレーニング記録はそのまま引き継がれます。
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">引き継がれるYamauchi-ID</span>
            <span className="text-info font-mono text-sm font-medium">
              {app.member.yamauchiUserId ?? '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">現在の区分</span>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground border-border text-[10px]"
              >
                C区分（同伴者）
              </Badge>
              <span className="text-muted-foreground text-xs">→</span>
              <Badge
                variant="outline"
                className="bg-success/15 text-success border-success/20 text-[10px]"
              >
                A区分（正会員）
              </Badge>
            </div>
          </div>
        </div>
        <div className="bg-info/15 flex items-center gap-2 rounded-md px-3 py-2">
          <Info className="text-info size-4 shrink-0" />
          <p className="text-info text-xs">承認後、Yamauchi-IDの区分がC→Aに自動更新されます。</p>
        </div>
      </CardContent>
    </Card>
  );
}
