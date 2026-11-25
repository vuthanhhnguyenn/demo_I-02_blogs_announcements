import type { PlanLimitOfSex } from '@/app/(private)/contracts/_constants/constants';

import { Badge } from '@/components/ui/badge';

import type { AreaRefDto } from '@/lib/api-real/types.gen';

import { AREA_GENDER_CONDITION_LABELS, type AreaSubject } from '../../_constants/area.constants';
import { areaConflictMessage, areaResultLine } from '../../_utils/area-gender.util';

type AreaLike = Pick<AreaRefDto, 'id' | 'name' | 'genderCondition'>;

interface AvailableAreasReadoutProps {
  subject: AreaSubject;
  areas: readonly AreaLike[];
  /** The plan's 性別制限 (conflict line); options pass none. */
  limitOfSex?: PlanLimitOfSex;
}

/** Detail / confirmation read-out: one row per area with its gender badge; none = 設定なし. */
export function AvailableAreasReadout({
  subject,
  areas,
  limitOfSex,
}: Readonly<AvailableAreasReadoutProps>) {
  if (areas.length === 0) return <p className="text-muted-foreground text-sm">設定なし</p>;
  const resultLine =
    areaConflictMessage(areas, limitOfSex, 'readout') ?? areaResultLine(subject, areas);
  return (
    <div className="flex flex-col gap-2">
      {areas.map((area) => (
        <div key={area.id} className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 text-sm wrap-anywhere">{area.name}</span>
          {area.genderCondition !== 'none' && (
            <Badge variant="outline" className="shrink-0">
              {AREA_GENDER_CONDITION_LABELS[area.genderCondition]}
            </Badge>
          )}
        </div>
      ))}
      {resultLine && <p className="text-muted-foreground text-xs">{resultLine}</p>}
    </div>
  );
}
