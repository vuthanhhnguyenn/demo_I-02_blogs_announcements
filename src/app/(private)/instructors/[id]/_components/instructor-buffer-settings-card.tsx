import { Card, CardContent } from '@/components/ui/card';

import type { TrainerDetailDto } from '@/lib/api-real/types.gen';

import { leadHoursText } from '../../_utils/instructor-detail.util';

export function InstructorBufferSettingsCard({ instructor }: { instructor: TrainerDetailDto }) {
  return (
    <Card>
      <CardContent className="px-4">
        <h2 className="mb-4 text-sm font-bold">予約設定</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">最短受付期間</p>
            <p className="text-sm">{leadHoursText(instructor.minBookingHours)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">前バッファ</p>
            <p className="text-sm">{instructor.bufferBeforeMin}分</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">後バッファ</p>
            <p className="text-sm">{instructor.bufferAfterMin}分</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
