import type {
  AdminApplicationControllerListData,
  EnrollmentApplicationListItemDto,
} from '@/lib/api-real/types.gen';

/**
 * The six statuses the screens render (C-01 FR-M001). The API carries five
 * (`submitted / under_review / approved / rejected / cancelled`) plus `approvalMethod`;
 * 自動承認済 is `approved` + `approvalMethod: 'auto'` (integration-plan.md D2).
 */
export type ApplicationUiStatus =
  | 'pending'
  | 'review'
  | 'approved'
  | 'auto_approved'
  | 'rejected'
  | 'cancelled';

export type ApplicationApiStatus = EnrollmentApplicationListItemDto['status'];

type ListQuery = NonNullable<AdminApplicationControllerListData['query']>;

export function toUiStatus(
  status: ApplicationApiStatus,
  approvalMethod: string | null,
): ApplicationUiStatus {
  switch (status) {
    case 'submitted':
      return 'pending';
    case 'under_review':
      return 'review';
    case 'approved':
      return approvalMethod === 'auto' ? 'auto_approved' : 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
  }
}

/** The list filter's UI status → the API's `status` (+ `approvalMethod` for the two approved kinds). */
export function toStatusQuery(
  status: ApplicationUiStatus | '',
): Pick<ListQuery, 'status' | 'approvalMethod'> {
  switch (status) {
    case '':
      return {};
    case 'pending':
      return { status: 'submitted' };
    case 'review':
      return { status: 'under_review' };
    case 'approved':
      return { status: 'approved', approvalMethod: 'manual' };
    case 'auto_approved':
      return { status: 'approved', approvalMethod: 'auto' };
    case 'rejected':
      return { status: 'rejected' };
    case 'cancelled':
      return { status: 'cancelled' };
  }
}

/** 未審査 and 審査中 can both be approved / rejected (prototype 9/8 `isReviewable`). */
export function isReviewable(status: ApplicationUiStatus): boolean {
  return status === 'pending' || status === 'review';
}
