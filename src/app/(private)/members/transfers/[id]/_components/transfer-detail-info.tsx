import { STAFF_ROLE_LABELS, StaffRole } from '@/constants/staff.constants';
import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { TransferDetailDto } from '@/lib/api-real/types.gen';
import { cn } from '@/lib/utils';

import {
  TRANSFER_BRAND_GROUP_CLASSES,
  getTransferReasonLabel,
  toTransferBrandGroup,
} from '../../_constants/constants';

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

/**
 * 移籍情報 card. Field set and order follow the prototype: 申請ID / 移籍予定日 / 移籍元店舗 /
 * 移籍先店舗 / 移籍理由 / ブランド / 申請者 / 申請日時. 申請者 reads 「name (role)」 like the prototype.
 */
export function TransferDetailInfo({ transfer }: Readonly<{ transfer: TransferDetailDto }>) {
  const brandGroup =
    transfer.timeline.brandGroup ?? toTransferBrandGroup(transfer.fromStore.brandEnum);
  // Free text wins; the coded reason is the fallback. Neither is guaranteed (both nullable).
  const reason = transfer.reasonDetail ?? getTransferReasonLabel(transfer.reasonCode);
  // The system role has no display label (STAFF_ROLE_LABELS hides it), so it gets no suffix.
  const applicantRole = transfer.createdBy?.role;
  const applicantRoleLabel =
    applicantRole && applicantRole !== StaffRole.SYSTEM ? STAFF_ROLE_LABELS[applicantRole] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">移籍情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label="申請ID">
            <span className="font-mono">
              {transfer.applicationNumber ?? transfer.transferApplicationId}
            </span>
          </Field>

          <Field label="移籍予定日">
            {transfer.scheduledTransferDate
              ? formatDateYYYYMMDD(transfer.scheduledTransferDate)
              : '—'}
          </Field>

          <Field label="移籍元店舗">{transfer.fromStore.name ?? '—'}</Field>

          <Field label="移籍先店舗">{transfer.toStore.name ?? '—'}</Field>

          <div className="col-span-2">
            <p className="text-muted-foreground mb-1 text-xs">移籍理由</p>
            <p className="text-sm">{reason ?? '—'}</p>
          </div>

          <Field label="ブランド">
            {brandGroup ? (
              <Badge
                variant="outline"
                className={cn('text-xs font-medium', TRANSFER_BRAND_GROUP_CLASSES[brandGroup])}
              >
                {brandGroup}
              </Badge>
            ) : (
              '—'
            )}
          </Field>

          <Field label="申請者">
            {/* A member's own filing (mobile app) has no CRM operator. */}
            {transfer.createdBy?.displayName ?? (transfer.createdBy ? '—' : '会員本人')}
            {applicantRoleLabel && (
              <span className="text-muted-foreground ml-1 text-xs">({applicantRoleLabel})</span>
            )}
          </Field>

          <Field label="申請日時">{formatDateYYYYMMDD_HHMM(transfer.appliedAt)}</Field>
        </div>
      </CardContent>
    </Card>
  );
}
