import { formatDateYYYYMMDD, formatDateYYYYMMDD_HHMM } from '@/utils/date.util';
import { Ban, Building2, CheckCircle } from 'lucide-react';

import { Field } from '@/components/common/field';
import { RoleGatedButton } from '@/components/common/role-gated-button';
import { StatusCard } from '@/components/common/status-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { FcCompanyDetailDto } from '@/lib/api-real/types.gen';

import { Permission } from '@/types/permission.type';

import { FC_AUTH_PROVIDER_LABELS, getActiveLabel } from '../../_constants/constants';
import { FRANCHISE_COMPANY_BASIC_INFO_LABELS as LABELS } from '../_constants/detail.constants';

interface BasicInfoTabProps {
  franchiseCompany: FcCompanyDetailDto;
  /** Opens the 無効化 / 有効化 confirmation (the StatusCard owns the status action) */
  onStatusAction: () => void;
}

/**
 * Max-length / unbroken values (255-char names, 254-char email, 500-char address) must wrap
 * inside their own cell: `overflow-wrap: anywhere` is inherited by every Field value and, unlike
 * `break-word`, also shrinks the min-content width; `min-w-0` lets each grid item stay in its track.
 */
const FIELD_GRID_CLASS =
  'grid grid-cols-1 gap-x-8 gap-y-4 wrap-anywhere md:grid-cols-2 [&>*]:min-w-0';

/** Same rendering as the 変更履歴 line (`${value}%`): 0 → 0%, 5.5 → 5.5%, 100 → 100% */
function formatRoyaltyRate(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${Number(value)}%`;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export function BasicInfoTab({ franchiseCompany, onStatusAction }: Readonly<BasicInfoTabProps>) {
  const company = franchiseCompany;

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
      <div className="flex w-full min-w-0 flex-col gap-4 lg:w-[60%]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">法人基本情報</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={FIELD_GRID_CLASS}>
              <Field label={LABELS.code} value={company.code} mono />
              <Field label={LABELS.corporateNumber} value={formatValue(company.corporateNumber)} />
              <Field label={LABELS.legalName} value={formatValue(company.legalName)} />
              <Field label={LABELS.displayName} value={formatValue(company.displayName)} />
              {/* Y-03 FR-002 認証方式 — null only for companies registered before the field existed */}
              <Field
                label={LABELS.authProvider}
                value={company.authProvider ? FC_AUTH_PROVIDER_LABELS[company.authProvider] : '—'}
              />
              <Field
                label={LABELS.representativeName}
                value={formatValue(company.representativeName)}
              />
              <Field label={LABELS.phone} value={formatValue(company.phone)} />
              <div className="md:col-span-2">
                <Field
                  label={LABELS.headOfficeAddress}
                  value={formatValue(company.headOfficeAddress)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">担当者情報</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={FIELD_GRID_CLASS}>
              <Field
                label={LABELS.contactPersonName}
                value={formatValue(company.contactPersonName)}
              />
              <Field
                label={LABELS.contactPersonEmail}
                value={formatValue(company.contactPersonEmail)}
              />
              <Field
                label={LABELS.contactPersonPhone}
                value={formatValue(company.contactPersonPhone)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">契約情報</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={FIELD_GRID_CLASS}>
              <Field
                label={LABELS.fcContractStartDate}
                value={formatDateYYYYMMDD(company.fcContractStartDate)}
              />
              <Field
                label={LABELS.fcContractRenewalDate}
                value={formatDateYYYYMMDD(company.fcContractRenewalDate)}
              />
              <Field label={LABELS.royaltyRate} value={formatRoyaltyRate(company.royaltyRate)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base font-semibold">備考</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm wrap-anywhere whitespace-pre-wrap">{formatValue(company.note)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full min-w-0 lg:w-[40%]">
        <div className="lg:sticky lg:top-0">
          <StatusCard
            tone={company.isActive ? 'success' : 'muted'}
            icon={Building2}
            label={getActiveLabel(company.isActive)}
            meta={[
              `管轄店舗数: ${company.managedStoreCount}店舗`,
              `作成日: ${formatDateYYYYMMDD_HHMM(company.createdAt)}`,
              `更新日: ${formatDateYYYYMMDD_HHMM(company.updatedAt)}`,
            ]}
            action={
              company.isActive ? (
                <RoleGatedButton
                  requiredPermission={Permission.FCCompaniesEdit}
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="text-warning hover:text-warning w-full gap-1"
                  onClick={onStatusAction}
                >
                  <Ban className="size-4" />
                  無効化
                </RoleGatedButton>
              ) : (
                <RoleGatedButton
                  requiredPermission={Permission.FCCompaniesEdit}
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="w-full gap-1"
                  onClick={onStatusAction}
                >
                  <CheckCircle className="size-4" />
                  有効化
                </RoleGatedButton>
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
