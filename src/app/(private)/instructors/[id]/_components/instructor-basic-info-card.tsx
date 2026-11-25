import Image from 'next/image';

import { formatDateYYYYMMDD } from '@/utils/date.util';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import type { TrainerDetailDto } from '@/lib/api-real/types.gen';

import {
  COACH_TYPE_LABELS,
  romanizedName,
  fullName as trainerFullName,
} from '../../_utils/instructor-api.util';

export function InstructorBasicInfoCard({ instructor }: { instructor: TrainerDetailDto }) {
  const fullName = trainerFullName(instructor);
  const romajiFullName = romanizedName(instructor);
  return (
    <Card>
      <CardContent className="px-4">
        <div className="mb-6 flex items-center gap-5">
          {instructor.facePhotoUrl ? (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full">
              <Image
                src={instructor.facePhotoUrl}
                alt={fullName}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-medium">
              {fullName.slice(0, 1)}
            </div>
          )}
          {/* wrap-anywhere: a long unbroken name wraps inside the card (UT D-04 No12) */}
          <div className="min-w-0">
            <h2 className="text-lg font-bold wrap-anywhere">{fullName}</h2>
            {romajiFullName && (
              <p className="text-muted-foreground mt-0.5 text-sm wrap-anywhere">{romajiFullName}</p>
            )}
          </div>
        </div>

        <h2 className="mb-4 text-sm font-bold">基本情報</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <p className="text-muted-foreground mb-1 text-xs">指導者ID</p>
            <p className="font-mono text-sm font-medium break-all">{instructor.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">ニックネーム</p>
            <p className="text-sm wrap-anywhere">
              {instructor.nickname || <span className="text-muted-foreground">未設定</span>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">役割区分</p>
            <div className="flex flex-wrap gap-1">
              {instructor.coachTypes.map((role) => (
                <Badge key={role} variant="secondary" className="text-[11px]">
                  {COACH_TYPE_LABELS[role]}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">英字サブネーム</p>
            <p className="text-sm wrap-anywhere">
              {romajiFullName || <span className="text-muted-foreground">未設定</span>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">登録日</p>
            <p className="text-sm">{formatDateYYYYMMDD(instructor.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs">更新日</p>
            <p className="text-sm">{formatDateYYYYMMDD(instructor.updatedAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
