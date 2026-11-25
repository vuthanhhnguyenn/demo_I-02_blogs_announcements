import { formatDateMMDD, formatDateYYYYMMDD, formatTime } from '@/utils/date.util';
import { formatDate, formatDateTime } from '@/utils/format.util';
import { z } from 'zod';

import type {
  AppLinkAccountResponseDto,
  AppLinkCandidateDto,
  MemberLinkingDto,
} from '@/lib/api-real/types.gen';

/** 連携経路 — A-01 FR-027's own words for each `linkMethod`. */
const LINK_ROUTE_LABELS: Partial<Record<string, string>> = {
  nfc: 'NFCカード読取',
  member_number: '会員番号入力',
  tablet_qr: '入館用タブレットの連携用QR',
  manual: '手動紐付け',
};

/**
 * A-01 FR-027 連携状態 as the head-up item and the sheet draw it (prototype `AppLinkState`).
 * Date fields are display-ready (`YYYY/MM/DD HH:mm`, `—` when the API has none).
 */
export type AppLinkState =
  | { kind: 'unlinked' }
  | {
      kind: 'linked';
      linkedAt: string;
      /** Null for routes FR-027 has no word for (pre-v2.0 `deeplink`, or no route recorded). */
      route: string | null;
      isManual: boolean;
      /** 手動紐付け only: the staff that made the link. */
      operator: string | null;
    }
  | {
      kind: 'tempLocked';
      lockedAt: string;
      /** When the lock lifts on its own (epoch ms); null when the API gives no end time. */
      autoUnlockAt: number | null;
      consecutiveFailures: number | null;
      totalFailures: number;
    }
  | { kind: 'permLocked'; lockedAt: string; totalFailures: number };

/** Masked contact(s) of a Yamauchi account, email first; null when it has neither. */
export function formatAppLinkAccount(
  account: Pick<AppLinkAccountResponseDto, 'email' | 'phone'> | null | undefined,
): string | null {
  const parts = [account?.email, account?.phone].filter((value): value is string => !!value);
  return parts.length > 0 ? parts.join('／') : null;
}

/**
 * Maps the detail's `linking` onto the four states FR-027 draws. A lock on a linked number (the API
 * allows it) does not change what the member sees, so `linked` wins. `linkMethod` and the lock `type`
 * are runtime-guarded: the generated enum types drop their `null`.
 */
export function toAppLinkState(linking: MemberLinkingDto | null | undefined): AppLinkState {
  if (!linking) return { kind: 'unlinked' };

  if (linking.status === 'linked') {
    const method: string | null = linking.linkMethod ?? null;
    const isManual = method === 'manual';
    return {
      kind: 'linked',
      linkedAt: formatDateTime(linking.linkedAt),
      route: (method && LINK_ROUTE_LABELS[method]) ?? null,
      isManual,
      operator: isManual ? (linking.linkedBy?.displayName ?? null) : null,
    };
  }

  const lock = linking.status === 'locked' ? linking.lock : null;
  if (lock?.type === 'permanent') {
    return {
      kind: 'permLocked',
      lockedAt: formatDateTime(lock.lockedAt),
      totalFailures: lock.failTotal,
    };
  }
  if (lock?.type === 'temporary') {
    const until = lock.lockedUntil ? Date.parse(lock.lockedUntil) : Number.NaN;
    return {
      kind: 'tempLocked',
      lockedAt: formatDateTime(lock.lockedAt),
      autoUnlockAt: Number.isNaN(until) ? null : until,
      consecutiveFailures: lock.consecutiveFailures ?? null,
      totalFailures: lock.failTotal,
    };
  }
  return { kind: 'unlinked' };
}

/** 自動解除の時刻: `HH:mm` on the same day, `MM/DD HH:mm` once it crosses midnight. */
export function formatAutoUnlock(at: number, now: number = Date.now()): string {
  const time = formatTime(at);
  return formatDateYYYYMMDD(at) === formatDateYYYYMMDD(now)
    ? time
    : `${formatDateMMDD(at)} ${time}`;
}

/** The candidates endpoint's e-mail limit (contract `maxLength`). */
const SEARCH_EMAIL_MAX_LENGTH = 254;
const JP_DOMESTIC_PHONE = /^0[0-9]{9,10}$/;
const E164_PHONE = /^\+[1-9][0-9]{1,14}$/;

/**
 * The candidates query for a typed key: an e-mail when it has `@`, a phone otherwise. Null when the
 * key is neither a well-formed e-mail nor a JP domestic / E.164 phone — an exact search can never
 * match it, so it is answered as 見つからない without a request (prototype `lookupAppAccount`).
 * A phone is sent with full-width digits read as half-width and hyphens / spaces dropped.
 */
export function toAppLinkSearchQuery(raw: string): { email: string } | { phone: string } | null {
  const value = raw.trim();
  if (value.includes('@')) {
    const isEmail = value.length <= SEARCH_EMAIL_MAX_LENGTH && z.email().safeParse(value).success;
    return isEmail ? { email: value } : null;
  }
  const phone = value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/＋/g, '+')
    .replace(/[-\s\uff0d\u2010-\u2015\u2212\u30fc]/g, '');
  return JP_DOMESTIC_PHONE.test(phone) || E164_PHONE.test(phone) ? { phone } : null;
}

/** アカウント探しの結果 (prototype `AppLinkLookup`), judged from the §24 candidates. */
export type AppLinkLookup =
  | { kind: 'available'; candidate: AppLinkCandidateDto; account: string; createdAt: string | null }
  | { kind: 'linkedToOther'; account: string }
  | { kind: 'alreadyThisMember'; account: string }
  | { kind: 'notFound' };

/**
 * The search answers exact matches only — usually zero or one account. A linkable account other
 * than the member's own wins; the member's own account (a 紐付け直し to itself) and one held by
 * another member say so; an account that cannot be used (`account_not_usable`) is no match.
 */
export function judgeAppLinkCandidates(
  items: AppLinkCandidateDto[],
  currentYamauchiUserId: string | null,
): AppLinkLookup {
  const accountOf = (candidate: AppLinkCandidateDto) => formatAppLinkAccount(candidate) ?? '—';
  const own = items.find(
    (candidate) =>
      currentYamauchiUserId !== null && candidate.yamauchiUserId === currentYamauchiUserId,
  );
  const linkable = items.find((candidate) => candidate.linkable && candidate !== own);
  if (linkable) {
    return {
      kind: 'available',
      candidate: linkable,
      account: accountOf(linkable),
      createdAt: linkable.createdAt ? formatDate(linkable.createdAt) : null,
    };
  }
  if (own) return { kind: 'alreadyThisMember', account: accountOf(own) };
  const other = items.find((candidate) => candidate.reason === 'linked_to_other_member');
  if (other) return { kind: 'linkedToOther', account: accountOf(other) };
  return { kind: 'notFound' };
}
