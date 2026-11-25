import { db } from '@/app/api/_mock-db';
import type { ManualNotificationRow } from '@/app/api/_mock-db/types/manual-notifications.type';
import type {
  GetManualNotificationFormConfigResponse,
  ManualNotificationTarget,
  ManualNotificationTargetInput,
} from '@/app/api/_schemas/manual-notification.schema';

import {
  MANUAL_NOTIFICATION_BRANDS,
  MANUAL_NOTIFICATION_JOYFIT_SUB_BRANDS,
} from './manual-notification-target.constants';

type TargetPreviewCounts = GetManualNotificationFormConfigResponse['targetPreviewCounts'];

const MANUAL_NOTIFICATION_ACTIVE_STATUSES = ['active'] as const;
const MANUAL_NOTIFICATION_PENDING_WITHDRAWAL_STATUSES = ['pending_withdrawal'] as const;
const MANUAL_NOTIFICATION_DORMANT_DAYS = 90;

type NotificationMemberLike = {
  id: string;
  status: string;
  contract_type: string;
  store_id: string;
  brand_group?: string;
  joined_at?: string | null;
  last_visit_date?: string | null;
  date_of_birth?: string | null;
  has_unpaid?: boolean;
};

interface ManualNotificationTargetMatchOptions {
  resolveSubBrand?: (member: NotificationMemberLike) => string | undefined;
  now?: Date;
  allowedStoreIds?: readonly string[] | null;
}

const activeStatuses = new Set<string>(MANUAL_NOTIFICATION_ACTIVE_STATUSES);
const pendingWithdrawalStatuses = new Set<string>(MANUAL_NOTIFICATION_PENDING_WITHDRAWAL_STATUSES);

function isActive(member: NotificationMemberLike): boolean {
  return activeStatuses.has(member.status);
}

function isAllowedStore(
  member: NotificationMemberLike,
  allowedStoreIds: readonly string[] | null | undefined,
): boolean {
  return allowedStoreIds === undefined || allowedStoreIds === null
    ? true
    : allowedStoreIds.includes(member.store_id);
}

function monthElapsed(joined: Date, now: Date): number {
  return (
    (now.getFullYear() - joined.getFullYear()) * 12 +
    (now.getMonth() - joined.getMonth()) -
    (now.getDate() < joined.getDate() ? 1 : 0)
  );
}

function getManualNotificationDormantCutoff(now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - MANUAL_NOTIFICATION_DORMANT_DAYS);
  return cutoff;
}

function isManualNotificationDormant(member: NotificationMemberLike, now: Date): boolean {
  if (!member.last_visit_date) return true;
  return new Date(member.last_visit_date) < getManualNotificationDormantCutoff(now);
}

function matchesManualNotificationTarget(
  member: NotificationMemberLike,
  target: ManualNotificationTargetInput,
  options: ManualNotificationTargetMatchOptions,
): boolean {
  const now = options.now ?? new Date();

  if (!isAllowedStore(member, options.allowedStoreIds)) return false;

  switch (target.type) {
    case 'all_members':
      return isActive(member);
    case 'brands': {
      if (!isActive(member)) return false;
      const brandSet = new Set<string>(target.brands);
      if (brandSet.has('joyfit_all')) {
        for (const brand of MANUAL_NOTIFICATION_JOYFIT_SUB_BRANDS) brandSet.add(brand);
      }
      const subBrand = options.resolveSubBrand?.(member);
      if (subBrand !== undefined) return brandSet.has(subBrand);
      return member.brand_group !== undefined && brandSet.has(member.brand_group);
    }
    case 'stores':
      return isActive(member) && target.storeIds.includes(member.store_id);
    case 'contract_type':
      return isActive(member) && member.contract_type === target.contractType;
    case 'membership_duration': {
      if (!isActive(member) || !member.joined_at) return false;
      const elapsed = monthElapsed(new Date(member.joined_at), now);
      return target.condition === 'within' ? elapsed <= target.months : elapsed >= target.months;
    }
    case 'dynamic_attribute': {
      if (target.attribute === 'trial') return member.status === 'provisional';
      if (target.attribute === 'birthday_month') {
        if (!isActive(member) || !member.date_of_birth) return false;
        const birthday = new Date(`${member.date_of_birth}T00:00:00`);
        return !Number.isNaN(birthday.getTime()) && birthday.getMonth() === now.getMonth();
      }
      if (!isActive(member) && !pendingWithdrawalStatuses.has(member.status)) return false;
      if (target.attribute === 'unpaid') return member.has_unpaid === true;
      if (target.attribute === 'dormant') return isManualNotificationDormant(member, now);
      return pendingWithdrawalStatuses.has(member.status);
    }
    case 'members':
      return isActive(member) && target.memberIds.includes(member.id);
  }
}

function getMatchingMemberIds(
  members: readonly NotificationMemberLike[],
  target: ManualNotificationTargetInput,
  options: ManualNotificationTargetMatchOptions,
): string[] {
  return members
    .filter((member) => matchesManualNotificationTarget(member, target, options))
    .map((member) => member.id);
}

function memberSubBrand(member: NotificationMemberLike): string | undefined {
  return db.stores.getById(member.store_id)?.brand;
}

function notificationMembers(): NotificationMemberLike[] {
  return db.members.getList();
}

function countMembersForTarget(
  target: ManualNotificationTargetInput,
  allowedStoreIds: readonly string[] | null = null,
  now = new Date(),
): number {
  return getMatchingMemberIds(notificationMembers(), target, {
    resolveSubBrand: memberSubBrand,
    allowedStoreIds,
    now,
  }).length;
}

function targetToInput(target: ManualNotificationTarget): ManualNotificationTargetInput {
  if (target.type === 'stores') {
    return { type: 'stores', storeIds: target.stores.map((store) => store.id) };
  }
  if (target.type === 'members') {
    return { type: 'members', memberIds: target.members.map((member) => member.id) };
  }
  return target;
}

/** Recalculate a row using the immutable recipient scope captured when its creator saved it. */
export function getManualNotificationRowTargetCount(row: ManualNotificationRow): number {
  return countMembersForTarget(targetToInput(row.target), row.recipientScopeStoreIds);
}

function countByStore(allowedStoreIds: readonly string[] | null): Record<string, number> {
  const counts: Record<string, number> = {};
  const members = notificationMembers();
  for (const member of members) {
    if (member.status !== 'active') continue;
    if (allowedStoreIds !== null && !allowedStoreIds.includes(member.store_id)) continue;
    counts[member.store_id] = (counts[member.store_id] ?? 0) + 1;
  }
  return counts;
}

function countByBrand(allowedStoreIds: readonly string[] | null): TargetPreviewCounts['brands'] {
  return Object.fromEntries(
    MANUAL_NOTIFICATION_BRANDS.map((brand) => [
      brand,
      countMembersForTarget({ type: 'brands', brands: [brand] }, allowedStoreIds),
    ]),
  ) as TargetPreviewCounts['brands'];
}

function countByContractType(
  allowedStoreIds: readonly string[] | null,
): TargetPreviewCounts['contractType'] {
  const contractTypes: Array<keyof TargetPreviewCounts['contractType']> = [
    'regular',
    'one_day_member',
    'family',
  ];
  return Object.fromEntries(
    contractTypes.map((contractType) => [
      contractType,
      countMembersForTarget({ type: 'contract_type', contractType }, allowedStoreIds),
    ]),
  ) as TargetPreviewCounts['contractType'];
}

function countDynamicAttributes(
  allowedStoreIds: readonly string[] | null,
): TargetPreviewCounts['dynamicAttributes'] {
  const attributes: Array<keyof TargetPreviewCounts['dynamicAttributes']> = [
    'unpaid',
    'dormant',
    'withdrawal_pending',
    'birthday_month',
    'trial',
  ];
  return Object.fromEntries(
    attributes.map((attribute) => [
      attribute,
      countMembersForTarget({ type: 'dynamic_attribute', attribute }, allowedStoreIds),
    ]),
  ) as TargetPreviewCounts['dynamicAttributes'];
}

export function getManualNotificationFormPreviewCounts(
  allowedStoreIds: readonly string[] | null = null,
): TargetPreviewCounts {
  return {
    allMembers: countMembersForTarget({ type: 'all_members' }, allowedStoreIds),
    brands: countByBrand(allowedStoreIds),
    stores: countByStore(allowedStoreIds),
    contractType: countByContractType(allowedStoreIds),
    membershipDuration: countMembersForTarget(
      { type: 'membership_duration', condition: 'within', months: 3 },
      allowedStoreIds,
    ),
    dynamicAttributes: countDynamicAttributes(allowedStoreIds),
  };
}

export function countManualNotificationTarget(
  target: ManualNotificationTargetInput,
  allowedStoreIds: readonly string[] | null = null,
): number {
  return countMembersForTarget(target, allowedStoreIds);
}
