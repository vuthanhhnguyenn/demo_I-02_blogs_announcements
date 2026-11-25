'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { adminStaffControllerEmailAvailabilityOptions } from '@/lib/api-real/@tanstack/react-query.gen';
import type { EmailAvailabilityResponseDto } from '@/lib/api-real/types.gen';

import { isValidEmailFormat } from '../_schemas/staff-create.schema';

// A blur can fire on every tab through the table; wait out the burst before asking.
const AVAILABILITY_DEBOUNCE_MS = 300;
// The answer only changes when someone else registers the address — keep it warm so
// tabbing back and forth over the same rows doesn't re-ask.
const AVAILABILITY_CACHE_MS = 5 * 60 * 1000;

/**
 * Why `email-availability` refused an address — the contract's `reason` enum, plus
 * `'unknown'` for anything a newer backend adds before the SDK is regenerated.
 *
 * - `'duplicate'`: a staff already holds the address.
 * - `'domain_not_registered'` / `'domain_inactive'`: the domain cannot be invited at (API-071);
 *   the 「すでに登録されています」 copy misreported these (BUG-P2-02-11).
 * - `'email_too_long'`: the domain is IDaaS (Cognito) and the address is over 128 characters
 *   (API-071 §3.5.6 — Y-01 Bug No.26).
 */
export type EmailUnavailableReason =
  | NonNullable<EmailAvailabilityResponseDto['reason']>
  | 'unknown';

export interface UseEmailAvailabilityReturn {
  /** Addresses (lowercased) the endpoint refused, each with the reason it gave. */
  unavailableEmails: ReadonlyMap<string, EmailUnavailableReason>;
  /** Queue a check for one address — no-op for a malformed or already-checked one. */
  checkEmail: (email: string) => void;
}

const KNOWN_REASONS: readonly EmailUnavailableReason[] = [
  'duplicate',
  'domain_not_registered',
  'domain_inactive',
  'email_too_long',
];

function toUnavailableReason(reason: unknown): EmailUnavailableReason {
  return KNOWN_REASONS.find((known) => known === reason) ?? 'unknown';
}

/**
 * Advisory pre-check against `GET /admin/staff/email-availability`, so a duplicate shows
 * up on the row while typing instead of only as a `409` at submit time (Y-01 FR-009).
 *
 * One request per distinct address, debounced and deduped: the form holds up to 50 rows
 * and the endpoint is advisory — the authoritative uniqueness check is the invite-time
 * constraint (E-STF-002), so a failed pre-check is swallowed rather than surfaced.
 */
export function useEmailAvailability(): UseEmailAvailabilityReturn {
  const queryClient = useQueryClient();
  const [unavailableEmails, setUnavailableEmails] = useState<
    ReadonlyMap<string, EmailUnavailableReason>
  >(() => new Map());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const requestedRef = useRef(new Set<string>());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const checkEmail = useCallback(
    (rawEmail: string) => {
      const email = rawEmail.trim().toLowerCase();
      // Only a syntactically valid address is worth a round trip — the row schema already
      // flags the rest, and the endpoint answers `400 E-VAL-001` for a malformed one.
      if (!email || !isValidEmailFormat(email) || requestedRef.current.has(email)) return;

      const timers = timersRef.current;
      const pending = timers.get(email);
      if (pending) clearTimeout(pending);

      timers.set(
        email,
        setTimeout(() => {
          timers.delete(email);
          requestedRef.current.add(email);
          queryClient
            .fetchQuery({
              ...adminStaffControllerEmailAvailabilityOptions({ query: { email } }),
              staleTime: AVAILABILITY_CACHE_MS,
            })
            .then((result) => {
              if (result.available) return;
              const reason = toUnavailableReason(result.reason);
              setUnavailableEmails((previous) => new Map(previous).set(email, reason));
            })
            .catch(() => {
              // Advisory only, so a failed pre-check must leave the form usable. Forget the
              // address so a later blur can try again.
              requestedRef.current.delete(email);
            });
        }, AVAILABILITY_DEBOUNCE_MS),
      );
    },
    [queryClient],
  );

  return { unavailableEmails, checkEmail };
}
