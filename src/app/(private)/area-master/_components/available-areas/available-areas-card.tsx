'use client';

import type { PlanLimitOfSex } from '@/app/(private)/contracts/_constants/constants';
import { AlertTriangle, ArrowRight } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import {
  AREA_GENDER_CONDITION_LABELS,
  AREA_SUBJECT_LABELS,
  type AreaSubject,
} from '../../_constants/area.constants';
import { useBrandAreas } from '../../_hooks/use-brand-areas';
import { toAreaBrandGroup } from '../../_utils/area-brand.util';
import { areaConflictMessage, areaResultLine } from '../../_utils/area-gender.util';
import { AvailableAreasLoadError } from './available-areas-load-error';
import { AvailableAreasLoading } from './available-areas-loading';

interface AvailableAreasCardProps {
  subject: AreaSubject;
  /** The form's brand (`brandEnum`); `''` / null = not chosen yet. */
  brandEnum: string | null | undefined;
  selectedIds: readonly string[];
  onToggle: (areaId: string, checked: boolean) => void;
  /** Shown after a JOYFIT ⇄ FIT365 brand change dropped the selection. */
  removedNotice?: string;
  /** The plan's 性別制限 (conflict warning); options pass none. */
  limitOfSex?: PlanLimitOfSex;
  onOpenAreaMaster: () => void;
  disabled?: boolean;
}

/**
 * The 利用できるエリア card of the plan / option form (G-01 FR-M002 / G-02 FR-002, prototype 11/12
 * `AvailableAreasCard`): plans and options pick areas of the E-02 FR-016 master.
 */
export function AvailableAreasCard({
  subject,
  brandEnum,
  selectedIds,
  onToggle,
  removedNotice,
  limitOfSex,
  onOpenAreaMaster,
  disabled = false,
}: Readonly<AvailableAreasCardProps>) {
  const brandGroup = toAreaBrandGroup(brandEnum);
  const areasQuery = useBrandAreas(brandGroup);
  const { areas } = areasQuery;
  const selected = areas.filter((a) => selectedIds.includes(a.id));
  const resultLine = areaResultLine(subject, selected);
  const conflictMessage = areaConflictMessage(selected, limitOfSex, 'form');
  const description = `選んだ${brandGroup ? ` ${brandGroup} の` : ''}館内エリアの扉を、この${AREA_SUBJECT_LABELS[subject]}が有効な会員が開けられます`;

  // One status line, highest first: the conflict warning → the removed notice → the result line.
  const statusLine = conflictMessage ? (
    <Alert className="border-warning/50 bg-warning/15">
      <AlertTriangle className="text-warning size-4" />
      <AlertTitle className="text-xs">性別の条件が合いません</AlertTitle>
      <AlertDescription className="text-muted-foreground text-xs">
        {conflictMessage}
      </AlertDescription>
    </Alert>
  ) : removedNotice ? (
    <p className="text-muted-foreground text-xs">{removedNotice}</p>
  ) : resultLine ? (
    <p className="text-muted-foreground text-xs">{resultLine}</p>
  ) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">利用できるエリア</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto gap-1 p-0 text-xs"
            onClick={onOpenAreaMaster}
          >
            エリアマスタ管理を見る
            <ArrowRight className="size-3" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col gap-3">
          {!brandGroup ? (
            <p className="text-muted-foreground text-xs">
              ブランドを選ぶと、そのブランドのエリアから選べます
            </p>
          ) : areasQuery.isLoading ? (
            <AvailableAreasLoading />
          ) : areasQuery.isError ? (
            <AvailableAreasLoadError
              error={areasQuery.error}
              onRetry={() => void areasQuery.refetch()}
            />
          ) : areas.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              {brandGroup} のエリアはまだ登録されていません
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {areas.map((area) => {
                const inputId = `area-${subject}-${area.id}`;
                return (
                  <div key={area.id} className="flex min-w-0 items-center gap-2">
                    <Checkbox
                      id={inputId}
                      checked={selectedIds.includes(area.id)}
                      disabled={disabled}
                      onCheckedChange={(v) => onToggle(area.id, v === true)}
                    />
                    <Label
                      htmlFor={inputId}
                      className="min-w-0 cursor-pointer text-sm font-normal wrap-anywhere"
                    >
                      {area.name}
                    </Label>
                    {area.genderCondition !== 'none' && (
                      <Badge variant="outline" className="shrink-0">
                        {AREA_GENDER_CONDITION_LABELS[area.genderCondition]}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {statusLine}
        </div>
      </CardContent>
    </Card>
  );
}
