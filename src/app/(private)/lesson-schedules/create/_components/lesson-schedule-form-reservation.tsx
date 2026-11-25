'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import Link from 'next/link';

import { useQueries } from '@tanstack/react-query';
import { ArrowRight, Info } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { adminTrainerControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import type { LessonScheduleFormValues } from '../_schemas/lesson-schedule-form.schema';

function SettingValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function LessonScheduleFormReservation() {
  const form = useFormContext<LessonScheduleFormValues>();
  const [isPublished, instructorIds] = useWatch({
    control: form.control,
    name: ['is_published', 'instructor_ids'],
  });
  const selectedIds = (instructorIds ?? []) as string[];
  // Read only — what each picked instructor's profile holds; a row outside the caller's scope stays 「—」
  const trainerQueries = useQueries({
    queries: selectedIds.map((trainerId) =>
      adminTrainerControllerDetailOptions({ path: { trainerId } }),
    ),
  });

  return (
    <Card>
      <CardContent className="px-6">
        <h2 className="mb-4 text-base font-bold">予約設定</h2>

        {!isPublished && (
          <div className="border-info/20 bg-info/15 mb-4 flex items-center gap-2 rounded-md border px-3 py-2">
            <Info className="text-info size-4 shrink-0" />
            <p className="text-info text-xs">
              この枠は非公開（モードB）です。会員アプリからの予約は受け付けません
            </p>
          </div>
        )}

        {/* 最短受付期間 / 前後バッファ belong to the instructor (D-01 FR-004, D-04 profile): the
            schedule has no field of its own, so they are shown read-only here. A member's cancel
            inside the 最短受付期間 counts as a no-show (BAT-040 reads the instructor's value). */}
        <div>
          <Label className="mb-3 block text-sm font-medium">バッファ設定</Label>
          <div className="border-info/20 bg-info/15 mb-3 flex items-start gap-2 rounded-md border px-3 py-2">
            <Info className="text-info mt-0.5 size-4 shrink-0" />
            <p className="text-info text-xs">
              最短受付期間・前後バッファは指導者ごとの設定です。下記は指導者プロフィール（D-04）の現在値で、変更は指導者プロフィールで行ってください。
            </p>
          </div>
          {selectedIds.length === 0 ? (
            <p className="text-muted-foreground text-xs">指導者を選択すると表示されます</p>
          ) : (
            <div className="divide-y rounded-md border">
              {selectedIds.map((id, index) => {
                const trainer = trainerQueries[index]?.data;
                return (
                  <div key={id} className="space-y-2 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">
                        {trainer ? `${trainer.lastName} ${trainer.firstName}`.trim() : '—'}
                      </span>
                      <Link
                        href={navigate('/instructors/[id]', id)}
                        className="text-info inline-flex shrink-0 items-center gap-1 text-xs font-medium hover:underline"
                      >
                        指導者プロフィールを開く
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <SettingValue
                        label="最短受付期間"
                        value={trainer ? `${trainer.minBookingHours}時間` : '—'}
                      />
                      <SettingValue
                        label="前バッファ"
                        value={trainer ? `${trainer.bufferBeforeMin}分` : '—'}
                      />
                      <SettingValue
                        label="後バッファ"
                        value={trainer ? `${trainer.bufferAfterMin}分` : '—'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
