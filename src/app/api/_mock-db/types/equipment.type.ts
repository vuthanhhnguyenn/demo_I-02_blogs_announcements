import type {
  ConnectedEquipmentDetail,
  ConnectedEquipmentListItem,
  EquipmentStatusHistoryItem,
  PatchEquipmentRequest,
  UpsertEquipmentRequest,
} from '@/app/api/_schemas/equipment.schema';

import type { EquipmentMeta } from '../seeds/equipment.seed';

export type EquipmentType = {
  _rows: ConnectedEquipmentListItem[];
  _historyByEquipmentId: Record<string, EquipmentStatusHistoryItem[]>;
  _metaById: Record<string, EquipmentMeta>;
  _seeded: boolean;
  _seed(): void;
  getAll(): ConnectedEquipmentListItem[];
  getById(id: string): ConnectedEquipmentListItem | undefined;
  getDetailById(id: string): ConnectedEquipmentDetail | undefined;
  getHistory(id: string): EquipmentStatusHistoryItem[];
  _nextControllerNumber(relayControllerId: string): number;
  _appendHistory(
    id: string,
    previousStatus: ConnectedEquipmentListItem['status'],
    newStatus: ConnectedEquipmentListItem['status'],
    changedNote: string | null,
  ): void;
  create(input: UpsertEquipmentRequest): ConnectedEquipmentDetail;
  update(id: string, input: PatchEquipmentRequest): ConnectedEquipmentDetail | undefined;
  delete(id: string): boolean;
  bulkUpdateStatus(
    ids: string[],
    status: ConnectedEquipmentListItem['status'],
    changedNote?: string | null,
  ):
    | { ok: true; updated: number }
    | { ok: false; reason: 'not_found'; missingIds: string[] }
    | { ok: false; reason: 'no_op'; noOpIds: string[] };
};
