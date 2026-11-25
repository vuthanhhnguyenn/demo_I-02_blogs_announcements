import { STAFF_ROLE_LABELS, StaffRole } from '@/constants/staff.constants';
import { formatDateYYYYMMDD } from '@/utils/date.util';

import type { FcCompanyDetailDto, FcCompanyHistoryEntryDto } from '@/lib/api-real/types.gen';

import {
  FC_AUTH_PROVIDER_LABELS,
  MANAGEMENT_TYPE_LABELS,
  getActiveLabel,
} from '../_constants/constants';

/** Screen label for each `fc_companies` column the history `changes[]` can name (D13) */
const HISTORY_FIELD_LABELS = {
  legalName: '法人名（正式名称）',
  displayName: '法人名（表示名）',
  managementType: '直営/FC区分',
  authProvider: '認証方式',
  ownedStore: '直営店フラグ',
  royaltyRate: 'ロイヤリティ率',
  corporateNumber: '法人番号',
  representativeName: '代表者名',
  headOfficeAddress: '本社所在地',
  phone: '電話番号',
  contactPersonName: '担当者名',
  contactPersonPhone: '担当者電話番号',
  contactPersonEmail: '担当者メールアドレス',
  fcContractStartDate: 'FC契約開始日',
  fcContractRenewalDate: 'FC契約更新日',
  note: '備考',
  isActive: 'ステータス',
} as const satisfies Partial<Record<keyof FcCompanyDetailDto, string>>;

type HistoryField = keyof typeof HISTORY_FIELD_LABELS;

function isHistoryField(field: string): field is HistoryField {
  return field in HISTORY_FIELD_LABELS;
}

const DATE_FIELDS = new Set<string>(['fcContractStartDate', 'fcContractRenewalDate']);

function formatHistoryValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'isActive' && typeof value === 'boolean') return getActiveLabel(value);
  if (field === 'managementType' && typeof value === 'string') {
    return MANAGEMENT_TYPE_LABELS[value as keyof typeof MANAGEMENT_TYPE_LABELS] ?? value;
  }
  if (field === 'authProvider' && typeof value === 'string') {
    return FC_AUTH_PROVIDER_LABELS[value as keyof typeof FC_AUTH_PROVIDER_LABELS] ?? value;
  }
  if (field === 'royaltyRate' && (typeof value === 'number' || typeof value === 'string')) {
    return `${value}%`;
  }
  if (DATE_FIELDS.has(field) && typeof value === 'string') return formatDateYYYYMMDD(value);
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function snapshotString(entry: FcCompanyHistoryEntryDto, key: string): string | undefined {
  const value = entry.snapshot[key];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Store name at the time; rows written before the snapshot carried it fall back to the code */
function storeLabel(entry: FcCompanyHistoryEntryDto): string {
  return (
    snapshotString(entry, 'targetStoreName') ??
    snapshotString(entry, 'targetStoreCode') ??
    snapshotString(entry, 'storeCode') ??
    '—'
  );
}

/** 付け替え: the store came from another company (prototype 「（{旧企業} から付け替え）」) */
function reassignSuffix(entry: FcCompanyHistoryEntryDto): string {
  const previousCompany = snapshotString(entry, 'prevFcCompanyName');
  return entry.snapshot.prevFcCompanyId && previousCompany
    ? `（${previousCompany} から付け替え）`
    : '';
}

/**
 * 操作者 cell: 「{name}（{role}）」 (prototype R206). `changedByRole` is the staff's CURRENT role;
 * the system role and a staff-directory miss (empty name, role null) get no suffix.
 */
export function formatHistoryOperator(entry: FcCompanyHistoryEntryDto): string {
  if (!entry.changedByName) return '—';
  const role = entry.changedByRole as StaffRole | null;
  return role && role !== StaffRole.SYSTEM
    ? `${entry.changedByName}（${STAFF_ROLE_LABELS[role]}）`
    : entry.changedByName;
}

/** Human-readable 変更内容 lines for one history entry (the API leaves this to the CRM) */
export function formatHistoryLines(entry: FcCompanyHistoryEntryDto): string[] {
  switch (entry.changeAction) {
    case 'create':
      return [`FC企業登録: ${snapshotString(entry, 'legalName') ?? '—'}`];
    case 'migrate':
      return [`移行データ登録: ${snapshotString(entry, 'legalName') ?? '—'}`];
    case 'delete':
      return ['FC企業削除'];
    case 'restore':
      return ['FC企業復元'];
    case 'assign_store':
      return [`店舗紐づけ追加: ${storeLabel(entry)}${reassignSuffix(entry)}`];
    case 'unassign_store':
      return [`店舗紐づけ解除: ${storeLabel(entry)}`];
    case 'update': {
      if (entry.changes.length === 0) return ['FC企業情報を更新'];
      const reason = snapshotString(entry, 'reason');
      return entry.changes.map(({ field, before, after }) => {
        const label = isHistoryField(field) ? HISTORY_FIELD_LABELS[field] : field;
        const verb = field === 'isActive' ? 'ステータス変更' : label;
        const line = `${verb}: ${formatHistoryValue(field, before)} → ${formatHistoryValue(field, after)}`;
        // 無効化理由 (`PATCH /{id}/active` stores it as `snapshot.reason` on deactivation rows)
        return field === 'isActive' && after === false && reason
          ? `${line}（理由: ${reason}）`
          : line;
      });
    }
    default:
      return [entry.changeAction];
  }
}
