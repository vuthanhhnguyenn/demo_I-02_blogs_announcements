import type {
  ConnectedEquipmentListItem,
  ExportEquipmentQuery,
  GetEquipmentQuery,
  GetEquipmentSort,
} from '@/app/api/_schemas/equipment.schema';

type Comparator = (left: ConnectedEquipmentListItem, right: ConnectedEquipmentListItem) => number;

function byText(pick: (row: ConnectedEquipmentListItem) => string | null): Comparator {
  return (left, right) => (pick(left) ?? '').localeCompare(pick(right) ?? '', 'ja');
}

// Every column the prototype lets the user sort by. The design doc's `sort` enum covers only
// four of these; the rest are served mock-side (spec 029 gap A3).
const EQUIPMENT_SORTERS: Record<GetEquipmentSort, Comparator> = {
  id: byText((row) => row.id),
  name: byText((row) => row.name),
  storeName: byText((row) => row.storeName),
  deviceType: byText((row) => row.deviceType),
  serialNumber: byText((row) => row.serialNumber),
  ipAddress: byText((row) => row.ipAddress),
  macAddress: byText((row) => row.macAddress),
  location: byText((row) => row.location),
  installedOn: byText((row) => row.installedOn),
  status: byText((row) => row.status),
  authMethod: byText((row) => row.authMethod),
  linkedContractLabels: byText((row) => row.linkedContractLabels.join('、')),
};

/**
 * FR-002: keyword matches device ID / name / serial number / installation location, then the
 * store, device-type and status filters narrow further — combined with AND.
 */
export function filterAndSortEquipment(
  rows: ConnectedEquipmentListItem[],
  query: GetEquipmentQuery | ExportEquipmentQuery,
): ConnectedEquipmentListItem[] {
  const { deviceType, order, q, sort, status, storeId } = query;
  let items = rows;

  if (q) {
    const normalized = q.toLowerCase();
    items = items.filter((item) =>
      [item.id, item.name, item.serialNumber, item.location].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }

  if (storeId && storeId !== 'all') {
    items = items.filter((item) => item.storeId === storeId);
  }

  if (deviceType) {
    items = items.filter((item) => item.deviceType === deviceType);
  }

  if (status) {
    items = items.filter((item) => item.status === status);
  }

  const comparator = EQUIPMENT_SORTERS[sort];

  return [...items].sort((left, right) => {
    const comparison = comparator(left, right);
    return order === 'desc' ? -comparison : comparison;
  });
}

export const EQUIPMENT_TYPE_CSV_LABELS: Record<ConnectedEquipmentListItem['deviceType'], string> = {
  entry_gate: '入館ゲート',
  exit_gate: '退館ゲート',
  hydrogen_water: '水素水サーバー',
  body_composition: '体組成計',
  tanning: 'タンニングマシン',
  protein: 'プロテインサーバー',
  other: 'その他',
};

export const EQUIPMENT_STATUS_CSV_LABELS: Record<ConnectedEquipmentListItem['status'], string> = {
  normal: '正常',
  abnormal: '異常',
  under_maintenance: 'メンテナンス中',
  discarded: '廃棄',
};

export const EQUIPMENT_AUTH_METHOD_CSV_LABELS: Record<
  ConnectedEquipmentListItem['authMethod'],
  string
> = {
  member_scan: '会員読取型',
  device_scan: '機器読取型',
  none: 'なし',
};
