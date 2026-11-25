'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuthUser } from '@/contexts/auth-user.context';
import { formatDate, formatDateTime } from '@/utils/format.util';
import { useQuery } from '@tanstack/react-query';
import { ImageIcon, Pencil, RefreshCw, Store as StoreIcon } from 'lucide-react';

import { useBackToListHref, useWithReturnTo } from '@/hooks/use-return-to.hook';

import { StatusCard } from '@/components/common/status-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  adminFcCompanyControllerDetailOptions,
  adminStoreControllerListImagesOptions,
} from '@/lib/api-real/@tanstack/react-query.gen';
import type { StoreDetailDto, StoreImageDto } from '@/lib/api-real/types.gen';
import { navigate } from '@/lib/routes/routes.util';
import { cn } from '@/lib/utils';

import { Permission, UserRole } from '@/types/permission.type';

import {
  STORE_BRAND_BADGE_CLASSES,
  STORE_BRAND_LABELS,
  STORE_GENDER_RESTRICTION_LABELS,
  STORE_RECEPTION_DESCRIPTIONS,
  STORE_STATUS_LABELS,
  STORE_STATUS_TONES,
} from '../../../../_constants/constants';
import { prefectureLabel } from '../../../../_constants/store-prefecture.constant';
import { fromStoredBrand } from '../../../../_schemas/store-form.schema';
import { canEditStore, editStoreDenyReason } from '../../../../_utils/can-edit-store.util';
import { storeImageSrc } from '../../../../_utils/store-image-url.util';
import { FocusableGatedButton } from '../../focusable-gated-button';
import { StoreStatusChangeDialog } from '../../store-status-change-dialog';

/** Prototype renders four photo slots in a three-column grid — the gallery's loading/error shape */
const PHOTO_SLOTS = 4;

/** Direct management — `fcCompanyId` is null (the list endpoint spells the same label itself) */
const DIRECT_MANAGEMENT_LABEL = '直営';

/** FR-015a: the status change is a head-office action, separate from the edit form */
const STATUS_CHANGE_ROLES = [UserRole.System, UserRole.Headquarter] as const;

/** An empty role list denies everyone — how a gated button is closed by a row-level rule */
const NO_ROLES: readonly UserRole[] = [];

/**
 * ブランド shows the brand group (D8). `brandGroup` is a bare `string` on the wire, so it falls back
 * to the group derived from `brandEnum`, and an unknown value keeps its raw text (D8 degradation).
 */
const BRAND_GROUP_LABELS: Record<string, string> = { JOYFIT: 'JOYFIT', FIT365: 'FIT365' };

/** The group badge reuses the palette of the group's own base brand */
const BRAND_GROUP_BADGE_CLASSES: Record<string, string> = {
  JOYFIT: STORE_BRAND_BADGE_CLASSES.Joyfit,
  FIT365: STORE_BRAND_BADGE_CLASSES.Fit365,
};

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  const display = value?.trim() ? value : '—';
  return (
    // `min-w-0` lets the grid track shrink below an unbroken token, which then breaks anywhere
    // instead of clipping (BUG-U3-08); free text keeps its own line breaks.
    <div className={cn('min-w-0', className)}>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <p
        className={`text-sm [overflow-wrap:anywhere] whitespace-pre-wrap ${display === '—' ? 'text-muted-foreground' : 'text-foreground'}`}
      >
        {display}
      </p>
    </div>
  );
}

/**
 * Y-02 FR-002 受付設定 — one reception setting as a 受付 / 停止 badge, laid out like the form's
 * switch row (label + the same helper on the left, value on the right) so the meaning reads the same
 */
function ReceptionRow({
  label,
  description,
  on,
}: {
  label: string;
  description: string;
  on: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 not-first:border-t not-first:pt-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Badge
        variant={on ? 'default' : 'outline'}
        className={cn(
          'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium',
          !on && 'text-muted-foreground',
        )}
      >
        {on ? '受付' : '停止'}
      </Badge>
    </div>
  );
}

function ImagePlaceholder() {
  return (
    <div className="bg-muted flex aspect-square w-full items-center justify-center rounded-md">
      <ImageIcon className="text-muted-foreground size-4" />
    </div>
  );
}

/**
 * One gallery thumbnail. A URL that fails to load (expired session, missing object) falls back to
 * the placeholder so the card never shows a broken image (FR-016).
 */
function StorePhoto({ image, alt }: { image: StoreImageDto; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <ImagePlaceholder />;
  return (
    // A plain <img>: the signed asset URL answers 302 to S3 on another host, which `next/image`
    // would need a per-bucket `remotePatterns` entry to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={storeImageSrc(image)}
      alt={alt}
      loading="lazy"
      className="bg-muted aspect-square w-full rounded-md object-cover"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Tab 1 — basic info (read-only) on the store detail screen.
 *
 * Field set and order follow the prototype's 一般情報 card (`store-detail.tsx` L975-L1080, detail
 * FR-010). The prototype has no social card here — the store page content (SNS URLs / access
 * info) belongs to I-01 and is out of scope for Phase 1. The edit action lives in the page header
 * (FR-018); the floor map lives on the 店舗マップ tab (FR-017 withdrawn).
 */
export function BasicInfoTab({ store }: { store: StoreDetailDto }) {
  const router = useRouter();
  // Detail → edit forwards the list URL the detail was opened from (Y-01 Bug No.10)
  const backToListHref = useBackToListHref(navigate('/stores'));
  const withReturnTo = useWithReturnTo();
  const { user } = useAuthUser();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Y-02 FR-001: the store row carries only the FC company id, so the display name is read from
  // the FC master. A directly-managed store has no id and needs no request.
  const { data: fcCompany } = useQuery({
    ...adminFcCompanyControllerDetailOptions({ path: { id: store.fcCompanyId ?? '' } }),
    enabled: Boolean(store.fcCompanyId),
  });

  // FR-016: the registered photos, already ordered by `sortOrder` server-side
  const {
    data: imageList,
    isLoading: imagesLoading,
    isError: imagesError,
  } = useQuery(adminStoreControllerListImagesOptions({ path: { id: store.id } }));
  const images = imageList?.items ?? [];

  const { brand_group: derivedGroup, sub_brand: subBrand } = fromStoredBrand(store.brandEnum);
  const brandGroup = store.brandGroup || derivedGroup;
  const brandGroupLabel = BRAND_GROUP_LABELS[brandGroup] ?? brandGroup;
  const brandGroupBadgeClass = BRAND_GROUP_BADGE_CLASSES[brandGroup] ?? '';
  // FR-012a: a sub-brand exists for the JOYFIT group only; FIT365 renders the muted dash
  const subBrandLabel =
    brandGroup === 'JOYFIT' && subBrand
      ? STORE_BRAND_LABELS[subBrand as keyof typeof STORE_BRAND_LABELS]
      : null;

  // FR-016a: the gallery 編集 uses exactly the header 編集's gate (FR-018)
  const canEdit = canEditStore(user, store.id);
  const isClosed = store.status === 'closed';

  return (
    <div className="flex gap-4">
      {/* Left column (60%) */}
      <div className="w-[60%] min-w-0 space-y-4">
        <Card className="gap-0 py-0">
          <CardHeader className="gap-0 p-4 pb-2!">
            <CardTitle className="text-[15px] font-semibold tracking-tight">一般情報</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 p-4">
            <InfoRow label="店舗ID" value={store.code} />
            <div className="min-w-0">
              <p className="text-muted-foreground mb-1 text-xs">店舗名</p>
              <p className="text-sm font-medium [overflow-wrap:anywhere]">{store.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">ブランド</p>
              {brandGroupLabel ? (
                <Badge
                  variant="outline"
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${brandGroupBadgeClass}`}
                >
                  {brandGroupLabel}
                </Badge>
              ) : (
                <p className="text-muted-foreground text-sm">—</p>
              )}
            </div>
            {/* 開発回答（2026/08/24）: サブブランドは JOYFIT のみ。FIT365 店舗は「—」 */}
            <InfoRow label="サブブランド" value={subBrandLabel} />
            {/* Y-02 FR-001: FC company name, or the direct-management label when the store is directly managed */}
            <InfoRow
              label="運営企業"
              value={
                store.fcCompanyId
                  ? (fcCompany?.displayName ?? fcCompany?.legalName)
                  : DIRECT_MANAGEMENT_LABEL
              }
            />
            {/*
              TODO(round3) B1 — テリトリー is Phase 2 (Y-15 組織階層管理 is Phase 2 on the
              client's CRM Category board). Round 3 uncomments the row and renders the territory
              with its resolved path (Y-02 FR-002: upper hierarchy derived from the territory).

            <div>
              <p className="text-muted-foreground mb-1 text-xs">テリトリー</p>
              <p className="text-muted-foreground text-sm">{API_UNSUPPORTED_NOTE}</p>
            </div>
            */}
            <InfoRow label="都道府県" value={prefectureLabel(store.prefecture)} />
            <InfoRow label="郵便番号" value={store.postalCode} />
            <InfoRow label="住所" value={store.address} />
            <InfoRow label="電話番号" value={store.phone} />
            <InfoRow label="FAX番号" value={store.fax} />
            <InfoRow label="店舗コード" value={store.clubCode} />
            <InfoRow label="店舗名（カナ）" value={store.nameKana} />
            {/* 開発回答（2026/08/24）: 受付開始日・プレオープン日（任意）。未設定は「—」 (FR-012b) */}
            <InfoRow label="受付開始日" value={formatDate(store.receiptDate)} />
            <InfoRow label="プレオープン日" value={formatDate(store.preopenDate)} />
            <InfoRow label="開店日" value={formatDate(store.grandOpenDate)} />
            <InfoRow label="閉店日" value={formatDate(store.closedAt)} />
            <InfoRow
              label="性別制限"
              value={STORE_GENDER_RESTRICTION_LABELS[store.genderRestriction]}
            />
            <InfoRow label="備考" value={store.memo} className="col-span-2" />
          </CardContent>
        </Card>

        {/* Y-02 FR-002 受付設定 (261112_v11) — read-only here; switched on the edit form (head office only) */}
        <Card className="gap-0 py-0">
          <CardHeader className="gap-0 p-4 pb-2!">
            <CardTitle className="text-[15px] font-semibold tracking-tight">受付設定</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-4">
            <ReceptionRow
              label="入会受付"
              description={STORE_RECEPTION_DESCRIPTIONS.joiningReception}
              on={store.joiningReception}
            />
            <ReceptionRow
              label="引き継ぎ受付"
              description={STORE_RECEPTION_DESCRIPTIONS.linkReception}
              on={store.linkReception}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right column (40%). Sticky, but capped to the tab's scroll viewport (screen height minus
          the app header, the non-scrolling page header and the tab bar) with its own scroll: a
          column taller than the viewport would otherwise keep ステータス変更 / 店舗写真 編集
          reachable only in a narrow scroll band at 1024×768 (BUG-U3-07). */}
      <div className="w-[40%] min-w-0">
        <div className="sticky top-0 flex max-h-[calc(100dvh-21rem)] min-h-64 flex-col gap-4 overflow-y-auto *:shrink-0">
          {/* FR-015 / FR-015a: tone and label follow the four-value status; the closure date leads
              the meta when set. 閉店 has no way out (Y-02 FR-007), so its action is closed for
              everyone with that reason rather than the role reason. */}
          <StatusCard
            tone={STORE_STATUS_TONES[store.status]}
            icon={StoreIcon}
            label={STORE_STATUS_LABELS[store.status]}
            meta={[
              ...(store.closedAt ? [`閉店予定日: ${formatDate(store.closedAt)}`] : []),
              `作成: ${formatDateTime(store.createdAt)}`,
              `更新: ${formatDateTime(store.updatedAt)}`,
            ]}
            action={
              <FocusableGatedButton
                allowedRoles={STATUS_CHANGE_ROLES}
                denyTooltip="ステータス変更権限がありません"
                blockedReason={isClosed ? '閉店した店舗のステータスは変更できません' : undefined}
                size="sm"
                variant="outline"
                className="gap-1"
                fullWidth
                onClick={() => setStatusDialogOpen(true)}
              >
                <RefreshCw className="size-4" />
                ステータス変更
              </FocusableGatedButton>
            }
          />

          <Card className="gap-0 py-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-0">
              <CardTitle className="text-[15px] font-semibold tracking-tight">店舗写真</CardTitle>
              {/* FR-016a (dev-added, no V0 source): photos are added/removed on the form's
                  店舗写真 card, so this opens the edit form scrolled to it */}
              <FocusableGatedButton
                allowedRoles={canEdit ? undefined : NO_ROLES}
                requiredPermission={Permission.StoresEdit}
                denyTooltip={canEdit ? undefined : editStoreDenyReason(user, store.id)}
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  router.push(
                    `${withReturnTo(navigate('/stores/[id]/edit', store.id), backToListHref)}#photos`,
                  )
                }
              >
                <Pencil className="size-4" />
                編集
              </FocusableGatedButton>
            </CardHeader>
            <CardContent className="p-4">
              {/* No photos uploaded: the same empty copy as DataTable instead of blank slots */}
              {!imagesLoading && !imagesError && images.length === 0 ? (
                <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
                  データがありません
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {images.length > 0 && !imagesError
                    ? images.map((image) => (
                        <StorePhoto key={image.id} image={image} alt={store.name} />
                      ))
                    : Array.from({ length: PHOTO_SLOTS }, (_, index) => (
                        <ImagePlaceholder key={`photo-${index}`} />
                      ))}
                </div>
              )}
              {imagesError && !imagesLoading && (
                <p className="text-muted-foreground mt-2 text-xs">写真を読み込めませんでした</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <StoreStatusChangeDialog
        store={store}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
      />
    </div>
  );
}
