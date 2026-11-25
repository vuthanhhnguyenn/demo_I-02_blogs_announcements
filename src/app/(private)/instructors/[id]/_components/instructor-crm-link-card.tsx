import { Link } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import type { TrainerDetailDto } from '@/lib/api-real/types.gen';

export function InstructorCrmLinkCard({
  linkedStaff,
}: {
  linkedStaff: TrainerDetailDto['linkedStaff'];
}) {
  // FR-008: this field is optional — render nothing when the instructor has no link.
  if (!linkedStaff) {
    return null;
  }

  return (
    <Card>
      <CardContent className="px-4">
        <h2 className="mb-3 text-sm font-bold">CRMアカウント紐づけ</h2>
        <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
          <Link className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{linkedStaff.name}</p>
            {linkedStaff.positionName && (
              <p className="text-muted-foreground text-xs">{linkedStaff.positionName}</p>
            )}
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
            紐づけ済み
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
