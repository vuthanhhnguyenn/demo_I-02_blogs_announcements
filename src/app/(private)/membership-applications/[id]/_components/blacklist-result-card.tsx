import Link from 'next/link';

import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { navigate } from '@/lib/routes/routes.util';

import { BLACKLIST_CONDITION_LABELS } from '../../_constants/constants';
import { isBlacklistFlagged } from '../../_utils/application-dto.util';
import type { ApplicationDetail } from './membership-application.utils';

interface BlacklistResultCardProps {
  app: ApplicationDetail;
}

export function BlacklistResultCard({ app }: Readonly<BlacklistResultCardProps>) {
  const matched = isBlacklistFlagged(app.blacklist.matchResult);
  const unchecked = app.blacklist.matchResult === 'unchecked';

  return (
    <Card className={matched ? 'border-destructive/50 bg-destructive/10' : ''}>
      <CardHeader>
        <CardTitle className="text-sm">ブラックリスト照合結果</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {unchecked ? (
          <div className="flex items-center gap-2">
            <HelpCircle className="text-warning size-4 shrink-0" />
            <span className="text-warning text-sm font-medium">照合未完了：再照合が必要です</span>
          </div>
        ) : matched ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive size-4 shrink-0" />
              <span className="text-destructive text-sm font-medium">照合済み：一致あり</span>
            </div>
            {/* C-01 FR-M003 L253: 一致条件 per matched BL entry, each linking to that entry. */}
            {app.blacklist.matchedRecords.map((record) => (
              <div key={record.blacklistId} className="flex flex-col gap-1 pl-6">
                <ul className="flex flex-col gap-1 pl-4">
                  {record.matchedConditions.map((condition) => (
                    <li key={condition} className="text-destructive list-disc text-sm">
                      {BLACKLIST_CONDITION_LABELS[condition] ?? condition}
                    </li>
                  ))}
                </ul>
                <Button
                  nativeButton={false}
                  variant="link"
                  size="sm"
                  className="text-destructive w-fit px-0 text-xs"
                  render={<Link href={navigate('/members/blacklist/[id]', record.blacklistId)} />}
                >
                  該当BLエントリの詳細を確認 →
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle className="text-success size-4 shrink-0" />
            <span className="text-muted-foreground text-sm">照合済み：該当なし</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
