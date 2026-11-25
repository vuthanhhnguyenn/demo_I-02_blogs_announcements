'use client';

import { useQuery } from '@tanstack/react-query';

import { getApiErrorCode } from '@/lib/api-error.util';
import { adminMemberControllerDetailOptions } from '@/lib/api-real/@tanstack/react-query.gen';

/** API-093 §4: the member's primary store is outside the caller's scope (or not set yet) */
const MEMBER_OUT_OF_SCOPE = 'E-AUTH-101';

export type MemberUnpaidBalance =
  | { status: 'idle' | 'loading' | 'unknown' | 'unchecked' | 'clear' }
  | { status: 'unpaid'; amount: number };

/**
 * E-01 FR-005 異常系 (#309): a member with an unpaid balance cannot be given a locker slot.
 * Reads `unpaidAmount` of `GET /admin/members/{memberId}` (API-093 §4) — the A-01 judgement amount
 * the BE check uses (API-101 §8.4 = API-093 §8.3: exempted months excluded). The F-01 receivable
 * total (API-117) is a debt view that keeps exempted months, so it would refuse members the BE
 * accepts. A failed lookup is `unknown`, never `clear` — callers must not fail open. The BE still
 * enforces it (409 E-LOC-011).
 *
 * `unchecked`: the detail answered 403 E-AUTH-101 — the member's primary store is outside a scoped
 * caller's stores, or not set yet (app enrolment). The lookup worked, the caller just may not read
 * this member; the assign call checks the balance itself (E-LOC-011), so this does not block.
 */
export function useMemberUnpaidBalance(memberId: string | null | undefined) {
  const query = useQuery({
    ...adminMemberControllerDetailOptions({ path: { memberId: memberId ?? '' } }),
    enabled: Boolean(memberId),
    retry: false,
  });

  let balance: MemberUnpaidBalance;
  if (!memberId) balance = { status: 'idle' };
  else if (query.isLoading) balance = { status: 'loading' };
  else if (query.isError && getApiErrorCode(query.error) === MEMBER_OUT_OF_SCOPE) {
    balance = { status: 'unchecked' };
  } else if (query.isError || !query.data) balance = { status: 'unknown' };
  else if (query.data.unpaidAmount > 0) {
    balance = { status: 'unpaid', amount: query.data.unpaidAmount };
  } else balance = { status: 'clear' };

  return { balance, refetch: query.refetch, isFetching: query.isFetching };
}
