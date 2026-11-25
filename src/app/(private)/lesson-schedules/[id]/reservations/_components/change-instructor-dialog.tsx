'use client';

import { useMemo, useState } from 'react';

import { useAuthUser } from '@/contexts/auth-user.context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCircle, Info, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

import { useDebounce } from '@/hooks/use-debounce.hook';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  adminLessonScheduleControllerUpdateScheduleMutation,
  adminTrainerControllerLookupOptions,
  adminTrainerControllerMeOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { LessonScheduleDetailDto, TrainerLookupItemDto } from '@/lib/api-real/types.gen';
import { cn, formatFullName } from '@/lib/utils';

import { UserRole } from '@/types/permission.type';

import {
  SCHEDULE_REASON_MAX_LENGTH,
  TRAINER_LOOKUP_LIMIT,
  TRAINER_SEARCH_DEBOUNCE_MS,
} from '../_constants/booking-status.constants';
import { invalidateScheduleQueries, refetchScheduleDetail } from '../_utils/booking-api.util';
import { formatTrainerNames, liveBookingCount } from '../_utils/schedule-datetime.util';

const COACH_TYPE_LABELS: Record<TrainerLookupItemDto['coachTypes'][number], string> = {
  trainer: 'トレーナー',
  instructor: 'インストラクター',
  body_care_therapist: 'ボディケアセラピスト',
};

function formatCoachTypes(coachTypes: ReadonlyArray<keyof typeof COACH_TYPE_LABELS>): string {
  return coachTypes.map((c) => COACH_TYPE_LABELS[c]).join(' / ');
}

function TrainerLoadError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <p className="text-destructive flex items-center justify-center gap-1 py-3 text-xs">
      {label}の取得に失敗しました
      <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={onRetry}>
        再試行
      </Button>
    </p>
  );
}

interface ChangeInstructorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  schedule: LessonScheduleDetailDto;
}

export function ChangeInstructorDialog({
  open,
  onOpenChange,
  scheduleId,
  schedule,
}: ChangeInstructorDialogProps) {
  // The trainers of the session AFTER the change — `null` until touched = the current ones, so a
  // single replacement (A・B → A・C) keeps everyone else
  const [selectedIdsDraft, setSelectedIdsDraft] = useState<string[] | null>(null);
  const [reason, setReason] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim(), TRAINER_SEARCH_DEBOUNCE_MS);
  // Names of the trainers picked here — the chips keep them whatever the list has loaded
  const [pickedNames, setPickedNames] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const selectedIds = selectedIdsDraft ?? schedule.trainerIds;
  const isUnchanged =
    selectedIds.length === schedule.trainerIds.length &&
    selectedIds.every((id) => schedule.trainerIds.includes(id));
  const currentNames = useMemo(
    () =>
      Object.fromEntries(
        schedule.trainerRows.map((row) => [
          row.trainerId,
          formatFullName(row.lastName, row.firstName) || row.nickname || row.trainerId,
        ]),
      ),
    [schedule.trainerRows],
  );

  const lessonName = schedule.lesson?.name ?? '';
  const trainerNames = formatTrainerNames(schedule) || '—';
  const bookedCount = liveBookingCount(schedule);
  const currentCoachTypes = formatCoachTypes(
    Array.from(new Set(schedule.trainerRows.flatMap((row) => row.coachTypes))),
  );

  // Active trainers matching the search (name / nickname, on the server) — the current assignees
  // included, so they can be kept or removed. `GET /trainers/lookup` (API-109 #10) is the picker
  // endpoint: no store scope, no paging; the list (`GET /trainers`) is store-scoped and hid trainers
  // with no session at the caller's stores yet (CRM UT D-04 No13).
  // D-01 権限マトリクス: a Trainer handles their own sessions only (FR-003-014a), so they are offered
  // just themselves (GET /admin/trainers/me) — as the store-scoped list did for them. The API only
  // checks that the caller is assigned BEFORE the write, so the lookup would let them hand the
  // session to anyone.
  const { user } = useAuthUser();
  const isTrainer = user?.role === UserRole.Trainer;
  const trainersQuery = useQuery({
    ...adminTrainerControllerLookupOptions({
      query: { q: search || undefined, limit: TRAINER_LOOKUP_LIMIT },
    }),
    enabled: open && !isTrainer,
  });
  const selfQuery = useQuery({
    ...adminTrainerControllerMeOptions(),
    enabled: open && isTrainer,
    retry: false,
  });
  const availableTrainers = useMemo(
    () =>
      (isTrainer
        ? selfQuery.data
          ? [selfQuery.data]
          : []
        : (trainersQuery.data?.items ?? [])
      ).map((t) => ({
        id: t.id,
        name: formatFullName(t.lastName, t.firstName) || t.nickname || t.id,
        specialty: formatCoachTypes(t.coachTypes),
      })),
    [isTrainer, selfQuery.data, trainersQuery.data],
  );
  const isTrainersLoading = isTrainer ? selfQuery.isFetching : trainersQuery.isFetching;
  const isTrainersError = isTrainer ? selfQuery.isError : trainersQuery.isError;
  // The lookup stops at TRAINER_LOOKUP_LIMIT rows: say so, so a missing name is searched for
  const isTrainerListCapped =
    !isTrainer && (trainersQuery.data?.items.length ?? 0) >= TRAINER_LOOKUP_LIMIT;

  const changeMutation = useMutation({
    ...adminLessonScheduleControllerUpdateScheduleMutation(),
    onSuccess: () => {
      toast.success('講師を変更しました');
      invalidateScheduleQueries(queryClient, scheduleId);
      handleClose();
    },
    // Toast comes from the shared MutationCache; refetch so a retry has a fresh expectedUpdatedAt.
    onError: () => refetchScheduleDetail(queryClient, scheduleId),
  });

  const handleToggle = (trainer: { id: string; name: string }) => {
    setPickedNames((prev) => ({ ...prev, [trainer.id]: trainer.name }));
    setSelectedIdsDraft(
      selectedIds.includes(trainer.id)
        ? selectedIds.filter((v) => v !== trainer.id)
        : [...selectedIds, trainer.id],
    );
  };

  const handleRemove = (id: string) => {
    setSelectedIdsDraft(selectedIds.filter((v) => v !== id));
  };

  const handleClose = () => {
    setSelectedIdsDraft(null);
    setReason('');
    setSearchInput('');
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0 || isUnchanged || !reason.trim()) return;
    changeMutation.mutate({
      path: { scheduleId },
      // A full replacement set (API-112 §7.3): everyone in charge after the change
      body: {
        trainerIds: selectedIds,
        changeReason: reason.trim(),
        expectedUpdatedAt: schedule.updatedAt,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">講師を変更する</DialogTitle>
          <p className="text-muted-foreground text-xs">{lessonName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current instructor */}
          <div>
            <Label className="mb-2 block text-xs font-medium">現在の講師</Label>
            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
              <div className="bg-muted flex size-8 items-center justify-center rounded-full text-sm font-medium">
                {trainerNames.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{trainerNames}</p>
                {currentCoachTypes && (
                  <p className="text-muted-foreground text-[10px]">{currentCoachTypes}</p>
                )}
              </div>
            </div>
          </div>

          {/* New instructors */}
          <div>
            <Label className="mb-1 block text-xs font-medium">変更先の講師（複数可）</Label>
            <p className="text-muted-foreground mb-2 text-[10px]">
              変更後に担当する講師をすべて選択してください（現在の講師も選択できます）
            </p>
            {/* The search runs on the server (name / nickname), not over the loaded rows */}
            <Command shouldFilter={false} className="rounded-lg border">
              <CommandInput
                value={searchInput}
                onValueChange={setSearchInput}
                placeholder="講師名で検索..."
                className="h-9 text-sm"
              />
              <CommandList className="max-h-[200px]">
                {isTrainersLoading ? (
                  <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    読み込み中...
                  </div>
                ) : isTrainersError ? (
                  <TrainerLoadError
                    label="講師一覧"
                    onRetry={() => void (isTrainer ? selfQuery.refetch() : trainersQuery.refetch())}
                  />
                ) : (
                  <CommandEmpty>該当する講師が見つかりません</CommandEmpty>
                )}
                <CommandGroup>
                  {availableTrainers.map((inst) => (
                    <CommandItem
                      key={inst.id}
                      value={inst.id}
                      onSelect={() => handleToggle(inst)}
                      className="flex items-center gap-3 py-2"
                    >
                      <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                        {inst.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{inst.name}</p>
                        <p className="text-muted-foreground text-[10px]">{inst.specialty}</p>
                      </div>
                      <Check
                        className={cn(
                          'text-primary size-4 shrink-0',
                          selectedIds.includes(inst.id) ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
                {isTrainerListCapped && (
                  <p className="text-muted-foreground px-3 py-2 text-center text-xs">
                    先頭{TRAINER_LOOKUP_LIMIT}件を表示しています。講師名で絞り込んでください。
                  </p>
                )}
              </CommandList>
            </Command>

            {selectedIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedIds.map((id) => {
                  return (
                    <span
                      key={id}
                      className="bg-secondary text-secondary-foreground inline-flex items-center gap-2 rounded-full py-1 pr-2 pl-2 text-xs font-medium"
                    >
                      {pickedNames[id] ?? currentNames[id] ?? id}
                      <button
                        type="button"
                        onClick={() => handleRemove(id)}
                        className="hover:bg-muted-foreground/20 ml-0.5 rounded-full p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <p className="mb-1 text-xs font-bold">
              変更理由 <span className="text-destructive">*</span>
            </p>
            <Textarea
              placeholder="変更理由を入力してください（例: インストラクター体調不良のため代行）"
              className="resize-none text-sm"
              rows={2}
              maxLength={SCHEDULE_REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Impact summary */}
          <div className="bg-muted/50 rounded-lg border p-4">
            <h4 className="mb-2 text-xs font-bold">変更の影響</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Info className="text-info size-4 shrink-0" />
                <span className="text-muted-foreground">
                  影響を受ける予約: <strong className="text-foreground">{bookedCount}件</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="text-warning size-4 shrink-0" />
                <span className="text-muted-foreground">
                  予約者への通知: <strong className="text-foreground">講師変更のお知らせ</strong>（
                  {bookedCount}名）
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-success size-4 shrink-0" />
                <span className="text-muted-foreground">
                  返金処理: <strong className="text-foreground">不要</strong>（レッスン自体は実施）
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            size="sm"
            disabled={
              selectedIds.length === 0 || isUnchanged || !reason.trim() || changeMutation.isPending
            }
            onClick={handleConfirm}
          >
            講師を変更する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
