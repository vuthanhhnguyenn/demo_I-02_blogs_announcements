'use client';

import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { toSelectItems } from '@/utils/app.util';
import { formatDateYYYYMMDD } from '@/utils/date.util';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldBan, TriangleAlert, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useDebounce } from '@/hooks/use-debounce.hook';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes.hook';

import { OptionalMark, RequiredMark } from '@/components/common/field-marker';
import { SearchableSelect } from '@/components/common/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

import {
  adminMemberControllerDetailOptions,
  adminMemberControllerDetailQueryKey,
  adminMemberControllerListBlacklistQueryKey,
  adminMemberControllerListInfiniteOptions,
  adminMemberControllerListOptions,
  adminMemberControllerListQueryKey,
  adminMemberControllerRegisterBlacklistMutation,
  adminMemberRelationsControllerChangeHistoryQueryKey,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type {
  AdminMemberControllerListResponse,
  MemberListItemDto,
} from '@/lib/api-real/types.gen';

import {
  BLACKLIST_MEMO_MAX_LENGTH,
  BLACKLIST_REASON_OPTIONS,
  MEMBER_NUMBER_MAX_LENGTH,
} from '../_constants/blacklist.constants';
import {
  REGISTER_BLACKLIST_DEFAULT_VALUES,
  RegisterBlacklistFormSchema,
  type RegisterBlacklistFormValues,
} from '../_schemas/register-blacklist-form.schema';

type MemberOption = MemberListItemDto;

function memberName(member: MemberOption): string {
  return [member.lastName, member.firstName].filter(Boolean).join(' ') || member.memberNumber;
}

function memberNameKana(member: MemberOption): string {
  return [member.lastNameKana, member.firstNameKana].filter(Boolean).join(' ');
}

/** One page of combobox results; more are appended on scroll (FR-038). */
const MEMBER_SEARCH_PAGE_SIZE = 20;

interface BlacklistRegisterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * FR-042 — the identity card's avatar. The combobox rows carry no photo (FR-039).
 *
 * `Avatar` rather than `next/image`: `facePhotoUrl` is null for most seeded members, and
 * the shared primitive already degrades to initials. Pointing an `<Image>` at a
 * placeholder path instead would 404 on every member without a photo.
 */
function MemberAvatar({
  name,
  facePhotoUrl,
  className,
}: Readonly<{ name: string; facePhotoUrl: string | null | undefined; className: string }>) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('');
  return (
    <Avatar className={`shrink-0 ${className}`}>
      <AvatarImage src={facePhotoUrl ?? undefined} alt={name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

export function BlacklistRegisterSheet({
  open,
  onOpenChange,
}: Readonly<BlacklistRegisterSheetProps>) {
  const queryClient = useQueryClient();

  const form = useForm<RegisterBlacklistFormValues>({
    resolver: zodResolver(RegisterBlacklistFormSchema),
    defaultValues: REGISTER_BLACKLIST_DEFAULT_VALUES,
  });

  const { confirmDiscard } = useUnsavedChanges(open && form.formState.isDirty);

  // ── Member resolution ──────────────────────────────────────────────────────
  const [memberNumberInput, setMemberNumberInput] = useState('');
  /** Set only by the combobox; the number field resolves through the lookup query below. */
  const [pickedMember, setPickedMember] = useState<MemberOption | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [comboSearch, setComboSearch] = useState('');

  const debouncedNumber = useDebounce(memberNumberInput.trim(), 300);

  /**
   * FR-036 — the 会員番号 field resolves by exact member number. The endpoint's `query` is a
   * prefix match on every field except the unique keys, which match exactly (FR-038a).
   */
  const {
    data: lookupData,
    isFetching: isLookingUp,
    isError: lookupFailed,
  } = useQuery({
    ...adminMemberControllerListOptions({ query: { query: debouncedNumber, limit: 5 } }),
    enabled: open && debouncedNumber.length > 0,
  });

  const lookupHit = useMemo(() => {
    if (!debouncedNumber) return null;
    const candidates = lookupData?.items ?? [];
    return (
      candidates.find((m) => m.memberNumber.toLowerCase() === debouncedNumber.toLowerCase()) ?? null
    );
  }, [lookupData, debouncedNumber]);

  /**
   * `idle` while the field is empty, then `found` / `not_found` once a lookup settles.
   * Kept out of render-time derivation so the destructive border does not flash while a
   * request is still in flight.
   *
   * `error` is deliberately a state of its own: a lookup that could not run must never
   * fall through to `not_found`, which would tell the operator the member does not exist
   * when the system simply failed to check.
   */
  const lookupStatus: 'idle' | 'pending' | 'found' | 'not_found' | 'error' = !debouncedNumber
    ? 'idle'
    : isLookingUp
      ? 'pending'
      : lookupFailed
        ? 'error'
        : lookupHit
          ? 'found'
          : 'not_found';

  /**
   * The resolved member is **derived**, not synchronised into state. Mirroring the lookup
   * result into a `useState` inside an effect would cascade a render on every settled
   * query for no gain — the value is a pure function of what the operator typed.
   *
   * The combobox pick wins only while the number field still holds that member's number;
   * FR-037 then falls out for free, because editing the field away invalidates the pick.
   */
  const selectedMember: MemberOption | null =
    lookupHit ?? (pickedMember?.memberNumber === memberNumberInput ? pickedMember : null);

  /**
   * FR-042 — 生年月日 and the face photo are not on the list item, so the identity card
   * reads them from the member detail once a member is resolved.
   */
  const { data: selectedMemberDetail } = useQuery({
    ...adminMemberControllerDetailOptions({
      path: { memberId: selectedMember?.memberId ?? '' },
    }),
    enabled: open && !!selectedMember,
  });

  // ── Combobox search (name / kana / phone / email) ──────────────────────────
  const debouncedCombo = useDebounce(comboSearch, 300);
  /**
   * FR-038 – FR-041 — paged, not a single capped request. The member table is the largest
   * in the CRM, so a fixed `limit` would silently truncate the result to its first page and
   * hide matches the operator searched for. The search itself stays server-side; the
   * combobox only appends pages as the list is scrolled.
   */
  const {
    data: searchData,
    isFetching: isSearching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...adminMemberControllerListInfiniteOptions({
      query: { query: debouncedCombo || undefined, limit: MEMBER_SEARCH_PAGE_SIZE },
    }),
    enabled: open && comboOpen,
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminMemberControllerListResponse, allPages) => {
      const loadedPages = allPages.length;
      return loadedPages < lastPage.pagination.totalPages ? loadedPages + 1 : undefined;
    },
  });
  const searchResults = useMemo(
    () => searchData?.pages.flatMap((page) => page.items) ?? [],
    [searchData],
  );

  const handleSelectFromCombo = (member: MemberOption | null) => {
    if (!member) return;
    setPickedMember(member);
    setMemberNumberInput(member.memberNumber);
    setComboOpen(false);
    setComboSearch('');
  };

  /**
   * FR-050a — the member-list projection already reports an active entry, so an
   * already-listed member is refused here rather than after a round-trip. The server's
   * one-active-row guard still runs (FR-050); this only closes the common case.
   */
  const isAlreadyBlacklisted = selectedMember?.hasBlacklist === true;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const resetAll = () => {
    form.reset(REGISTER_BLACKLIST_DEFAULT_VALUES);
    setMemberNumberInput('');
    setPickedMember(null);
    setComboSearch('');
    setComboOpen(false);
  };

  // `isPending` only flips on the next render, so rapid clicks would each fire a POST first.
  const submittingRef = useRef(false);

  const { mutate, isPending } = useMutation({
    ...adminMemberControllerRegisterBlacklistMutation(),
    onSettled: () => {
      submittingRef.current = false;
    },
    onSuccess: (_data, variables) => {
      toast.success('ブラックリストに登録しました');
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerListBlacklistQueryKey(),
      });
      /**
       * FR-050a — the member lookups carry `hasBlacklist`, which the registration just
       * flipped. Leaving them cached would let the very next lookup offer this member
       * again with no warning, pushing the duplicate all the way to the server's 409.
       */
      void queryClient.invalidateQueries({ queryKey: adminMemberControllerListQueryKey() });
      /**
       * That member's own detail too: it gates 個人情報削除 / 再入会 on the same registration,
       * so a copy cached before this Sheet ran would still present the member as unlisted.
       */
      void queryClient.invalidateQueries({
        queryKey: adminMemberControllerDetailQueryKey({
          path: { memberId: variables.path.memberId },
        }),
      });
      // 変更履歴 is a separate cache, so a copy opened before the registration would stay stale.
      void queryClient.invalidateQueries({
        queryKey: adminMemberRelationsControllerChangeHistoryQueryKey({
          path: { memberId: variables.path.memberId },
        }),
      });
      onOpenChange(false);
      resetAll();
    },
  });

  const onSubmit = (data: RegisterBlacklistFormValues) => {
    if (!selectedMember || submittingRef.current) return;
    submittingRef.current = true;
    mutate({
      path: { memberId: selectedMember.memberId },
      // FR-043 — V0's control is single-select; the contract takes an array.
      body: { reasonCategories: [data.reason], memo: data.memo?.trim() || undefined },
    });
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    // FR-052 — closing resets every field, not just the form ones.
    if (!next) resetAll();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* FR-034 — the Sheet keeps SheetContent's default width, as V0 does. */}
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader className="gap-0 p-0">
            <SheetTitle className="text-sm font-semibold">ブラックリスト手動登録</SheetTitle>
            <SheetDescription className="sr-only">
              対象会員をブラックリストに手動登録します
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form
              id="blacklist-register-form"
              onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            >
              <div className="flex flex-col gap-4 py-4">
                {/* 会員番号 — autofill (FR-035 – FR-037) */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">
                    会員番号
                    <RequiredMark />
                  </Label>
                  <Input
                    placeholder="例：M-00001"
                    maxLength={MEMBER_NUMBER_MAX_LENGTH}
                    value={memberNumberInput}
                    onChange={(e) => setMemberNumberInput(e.target.value)}
                    className={
                      lookupStatus === 'found'
                        ? 'border-success focus-visible:ring-success/30'
                        : lookupStatus === 'not_found' || lookupStatus === 'error'
                          ? 'border-destructive focus-visible:ring-destructive/30'
                          : ''
                    }
                  />
                  {lookupStatus === 'not_found' && (
                    <p className="text-destructive text-xs">該当する会員が見つかりません</p>
                  )}
                  {lookupStatus === 'error' && (
                    <p className="text-destructive text-xs">
                      会員情報の取得に失敗しました。通信状況をご確認のうえ、再度お試しください。
                    </p>
                  )}
                  {lookupStatus === 'idle' && (
                    <p className="text-muted-foreground text-xs">
                      会員番号を入力すると氏名・生年月日・顔写真が自動反映されます
                    </p>
                  )}
                </div>

                {/* 氏名・カナ・電話番号での検索 (FR-038 – FR-041) */}
                <div className="flex flex-col gap-2">
                  <Label className="text-muted-foreground text-sm font-medium">
                    または氏名・カナ・電話番号で検索
                  </Label>
                  <SearchableSelect<MemberOption>
                    value={selectedMember?.memberId ?? null}
                    valueLabel={
                      selectedMember
                        ? `${memberName(selectedMember)}（${selectedMember.memberNumber}）`
                        : undefined
                    }
                    options={searchResults}
                    placeholder="ID・氏名・カナ・電話番号・メールで検索"
                    searchPlaceholder="ID・氏名・カナ・電話番号・メールで検索..."
                    emptyMessage="該当する会員が見つかりません"
                    loadingMessage="会員を読み込み中..."
                    open={comboOpen}
                    onOpenChange={setComboOpen}
                    onSearchChange={setComboSearch}
                    onSelect={handleSelectFromCombo}
                    getOptionKey={(m) => m.memberId}
                    getOptionLabel={(m) => memberName(m)}
                    getOptionKeywords={(m) =>
                      [m.memberNumber, memberName(m), memberNameKana(m)].filter(Boolean).join(' ')
                    }
                    // FR-039 — name plus ID・カナ・店舗 only; photo and birthdate are kept
                    // for the identity card below, once a row is chosen.
                    renderOption={(m) => (
                      <div className="flex min-w-0 flex-col py-1">
                        <span className="text-sm font-medium">{memberName(m)}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          {[m.memberNumber, memberNameKana(m), m.primaryStore?.name]
                            .filter(Boolean)
                            .join(' ・ ')}
                        </span>
                      </div>
                    )}
                    // The first page replaces the list with a loading row; a later page
                    // appends below it, so the two states must not share one flag.
                    isLoading={isSearching && !isFetchingNextPage}
                    hasMore={hasNextPage}
                    isLoadingMore={isFetchingNextPage}
                    onLoadMore={() => void fetchNextPage()}
                  />

                  {/* Resolved identity card (FR-042) */}
                  {selectedMember && (
                    <div className="border-success/30 bg-success/10 mt-1 flex items-center gap-3 rounded-md border p-3">
                      <MemberAvatar
                        name={memberName(selectedMember)}
                        facePhotoUrl={selectedMemberDetail?.personalInfo.facePhotoUrl}
                        className="size-20"
                      />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <UserCheck className="text-success size-3 shrink-0" />
                          <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
                            {memberName(selectedMember)}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
                          {memberNameKana(selectedMember)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          生年月日：
                          {formatDateYYYYMMDD(selectedMemberDetail?.personalInfo.dateOfBirth, '—')}
                        </span>
                        <span className="text-muted-foreground font-mono text-xs [overflow-wrap:anywhere]">
                          {/* A member with no primary store must not leave a dangling ` / `;
                              degrades to an em dash like the list column and head-up card. */}
                          ID: {selectedMember.memberNumber} /{' '}
                          {selectedMember.primaryStore?.name || '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Already-listed block (FR-050a) */}
                  {isAlreadyBlacklisted && (
                    <Alert className="border-destructive/20 bg-destructive/10 text-destructive">
                      <ShieldBan className="size-4" />
                      <AlertDescription className="text-sm">
                        この会員はすでにブラックリストに登録されています。
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* 登録理由 (FR-043) */}
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        登録理由
                        <RequiredMark />
                      </FormLabel>
                      {/* `?? ''` keeps the Select controlled from first render: an
                          undefined default would make Base UI switch it from uncontrolled
                          to controlled the moment a reason is picked. */}
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        items={toSelectItems(BLACKLIST_REASON_OPTIONS)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="理由を選択してください" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BLACKLIST_REASON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* メモ (FR-044) */}
                <FormField
                  control={form.control}
                  name="memo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        メモ
                        <OptionalMark />
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          maxLength={BLACKLIST_MEMO_MAX_LENGTH}
                          placeholder="補足情報を入力してください"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="-mx-6 w-[calc(100%+48px)]" />

              {/* FR-045 — the deletion-invariant warning (A-01 L267-L269) */}
              <div className="py-4">
                <Alert className="border-warning/20 bg-warning/10 text-warning">
                  <TriangleAlert className="size-4" />
                  <AlertDescription className="text-sm">
                    ブラックリストに登録された会員の個人情報は削除できなくなります
                  </AlertDescription>
                </Alert>
              </div>
            </form>
          </Form>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t p-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => confirmDiscard(() => handleOpenChange(false))}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            form="blacklist-register-form"
            variant="destructive"
            size="lg"
            className="flex-1"
            // FR-047 / FR-050a — no member resolved, or the member is already listed.
            disabled={!selectedMember || isAlreadyBlacklisted || isPending}
          >
            {isPending ? '登録中...' : '登録'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
