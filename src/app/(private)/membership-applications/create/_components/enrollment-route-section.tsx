import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EnrollmentRouteSectionProps {
  /** 手動 by default; 紹介経由 once a 紹介コード is entered (C-01 FR-M009, prototype 9/16). */
  readonly routeLabel: '手動' | '紹介経由';
}

export function EnrollmentRouteSection({ routeLabel }: EnrollmentRouteSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>入会経路</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex items-center gap-3">
          <div className="border-input bg-muted/50 flex h-8 items-center rounded-md border px-3 text-sm font-medium">
            {routeLabel}
          </div>
          <p className="text-muted-foreground text-xs">
            管理画面からの入会は入会経路「手動」が自動付与されます（紹介コード入力時は「紹介経由」）。申請種別の選択は不要です。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
