'use client';
// Holds local UI/dialog state and mutation calls — client-only.
import { useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';

import { BackToListLink } from '@/components/common/back-to-list-link';
import { DataStateBoundary } from '@/components/common/data-state-boundary';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { getApiErrorStatus } from '@/lib/api-error.util';
import { adminApplicationControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import { navigate } from '@/lib/routes/routes.util';

import { REJECTION_REASON_LABELS } from '../../_constants/constants';
import { ActivityTimelineCard } from './activity-timeline-card';
import { ApplicantInfoCard } from './applicant-info-card';
import { ApplicationMetaCard } from './application-meta-card';
import { BlacklistResultCard } from './blacklist-result-card';
import { CancelMenuDropdown } from './cancel-dialog-menu';
import { CompanionUpgradeBanner } from './companion-upgrade-banner';
import { ContractInfoCard } from './contract-info-card';
import { FeePaymentCard } from './fee-payment-card';
import { MembershipApplicationDetailSkeleton } from './membership-application-detail-skeleton';
import {
  applicantName,
  getStatusBadge,
  getStatusLabel,
  uiStatusOf,
} from './membership-application.utils';
import { StatusActionCard } from './status-action-card';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MembershipApplicationDetailProps {
  applicationId: string;
}

export function MembershipApplicationDetail({
  applicationId,
}: Readonly<MembershipApplicationDetailProps>) {
  // A malformed id (e.g. an old mock `APP-…` deep link) is a not-found — the API answers it
  // with a 500, so it is never sent.
  const isValidId = UUID_PATTERN.test(applicationId);
  const {
    data: app,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...adminApplicationControllerDetailOptions({ path: { applicationId } }),
    enabled: isValidId,
  });
  // 404 E-ENR-012 — not found or outside the caller's store scope (FR-062): a not-found, not
  // a system error.
  const status = getApiErrorStatus(error);
  const isNotFound = !isValidId || status === 404 || status === 400;

  // Staff-discretionary enrolment-fee waiver reason (G-05 ADD-09 ③), lifted here so the fee
  // card (which renders the input) and the approve mutation (which submits it) share it.
  const [staffExemptionOpen, setStaffExemptionOpen] = useState(false);
  const [staffExemptionReason, setStaffExemptionReason] = useState('');
  const uiStatus = app ? uiStatusOf(app) : undefined;

  return (
    <DataStateBoundary
      isLoading={isValidId && isLoading}
      isError={isError && !isNotFound}
      isEmpty={isNotFound || !app}
      onRetry={() => void refetch()}
      skeleton={<MembershipApplicationDetailSkeleton />}
      errorTitle="申込情報を読み込めませんでした"
      emptyState={{
        title: '申込情報が見つかりません',
        // Not-found (unknown / out-of-scope / malformed id) offers the way back (BUG-B-12).
        action: (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            nativeButton={false}
            render={<Link href={navigate('/membership-applications')} />}
          >
            入会申請一覧に戻る
          </Button>
        ),
      }}
    >
      {app && (
        <>
          <PageHeader
            breadcrumb={
              <BackToListLink
                label="入会申請管理に戻る"
                listPath={navigate('/membership-applications')}
              />
            }
            title={applicantName(app)}
            badge={
              uiStatus && (
                <Badge
                  variant="outline"
                  className={`gap-1 text-[10px] font-medium ${getStatusBadge(uiStatus)}`}
                >
                  {getStatusLabel(uiStatus)}
                </Badge>
              )
            }
            actions={
              (uiStatus === 'approved' || uiStatus === 'auto_approved') && (
                <CancelMenuDropdown app={app} />
              )
            }
          />
          <div className="bg-muted/40 p-6 pt-4">
            {/* 2-column layout. `min-w-0` keeps a long unbroken value from widening a column
                past its share and pushing the other one out (BUG-B-09). */}
            <div className="flex gap-6">
              {/* Left Column (60%) */}
              <div className="flex w-[60%] min-w-0 flex-col gap-4">
                {/* FR-M005: a registered companion (C) applying to become a member (A) */}
                {app.member.originalMemberType === 'companion' && (
                  <CompanionUpgradeBanner app={app} />
                )}
                <ApplicantInfoCard app={app} />
                <BlacklistResultCard app={app} />
                <ContractInfoCard app={app} />
                <FeePaymentCard
                  app={app}
                  staffExemptionOpen={staffExemptionOpen}
                  staffExemptionReason={staffExemptionReason}
                  onStaffExemptionOpenChange={setStaffExemptionOpen}
                  onStaffExemptionReasonChange={setStaffExemptionReason}
                />
                <ActivityTimelineCard
                  timeline={app.timeline}
                  applicationId={applicationId}
                  rejectReasonLabel={REJECTION_REASON_LABELS[app.rejectReasonCode]}
                />
              </div>

              {/* Right Column (40%) sticky */}
              <div className="w-[40%] min-w-0">
                <div className="sticky top-20 flex flex-col gap-4">
                  <StatusActionCard
                    app={app}
                    applicationId={applicationId}
                    staffExemptionReason={staffExemptionReason}
                    onStaffExemptionReasonChange={setStaffExemptionReason}
                  />
                  <ApplicationMetaCard app={app} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DataStateBoundary>
  );
}
