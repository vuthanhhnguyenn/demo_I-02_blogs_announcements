import { ArrowUpRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { navigate } from '@/lib/routes/routes.util';

import { BILLING_TYPE_LABELS, getPaymentMethodLabel } from '../../_constants/sales-labels.constant';
import { toBillingDate } from '../../_utils/billing-date.util';
import type { BillingHeader } from '../_utils/billing-detail-api.util';

function ReadOnlyField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

interface BillingBasicInfoCardProps {
  header: BillingHeader;
}

/** 基本情報カード — F-01 請求詳細画面の表示項目 / API-114 §6.9 */
export function BillingBasicInfoCard({ header }: Readonly<BillingBasicInfoCardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">基本情報</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <ReadOnlyField label="請求ID" value={header.publicId} mono />
          {/* 請求日 = date part of createdAt, not dueDate (015 D1) */}
          <ReadOnlyField label="請求日" value={toBillingDate(header.createdAt)} />
          <ReadOnlyField label="店舗" value={header.storeName ?? '—'} />
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">利用者</p>
            <p className="text-sm font-medium">
              <a
                href={navigate('/members/[id]', header.memberId)}
                className="text-primary inline-flex items-center gap-0.5 align-middle underline-offset-2 hover:underline"
              >
                {header.memberName ?? '—'}
                <ArrowUpRight className="size-3" />
              </a>
              {header.memberDisplayId && (
                <span className="text-muted-foreground font-normal">
                  （ID: {header.memberDisplayId}）
                </span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">請求区分</p>
            <Badge variant="secondary" className="text-xs font-normal">
              {BILLING_TYPE_LABELS[header.billingType]}
            </Badge>
          </div>
          {/* The member's current primary method (API-114 §6.3) — D9 */}
          <ReadOnlyField label="決済手段" value={getPaymentMethodLabel(header.paymentMethod)} />
          <div className="col-span-2 space-y-1">
            <p className="text-muted-foreground text-xs">備考</p>
            <p className="text-sm leading-relaxed">{header.note || '—'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
