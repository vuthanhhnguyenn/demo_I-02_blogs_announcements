'use client';

import { formatDateYYYYMMDD } from '@/utils/date.util';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { RelayControllerDetailDto } from '@/lib/api-real/types.gen';

type ControllerDetail = RelayControllerDetailDto;

interface ControllerMetaCardProps {
  controller: ControllerDetail;
}

export function ControllerMetaCard({ controller }: ControllerMetaCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">その他情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">作成日時</p>
            <p className="text-sm">{formatDateYYYYMMDD(controller.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">更新日時</p>
            <p className="text-sm">{formatDateYYYYMMDD(controller.updatedAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
