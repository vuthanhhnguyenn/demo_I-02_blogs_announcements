import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { buildCsv, csvDateStamp } from '@/app/api/_lib/csv';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  type ExportEquipmentQuery,
  ExportEquipmentQuerySchema,
  type ExportEquipmentResponse,
  ExportEquipmentResponseSchema,
} from '@/app/api/_schemas/equipment.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

import {
  EQUIPMENT_AUTH_METHOD_CSV_LABELS,
  EQUIPMENT_STATUS_CSV_LABELS,
  EQUIPMENT_TYPE_CSV_LABELS,
  filterAndSortEquipment,
} from '../_lib/equipment-query';

registerRoute({
  method: 'get',
  path: '/crm/equipment/export',
  summary: 'Export equipment list as CSV',
  description:
    'Export the connected equipment list using the same filters and sort as the list screen without pagination. Returns the CSV body inline (UTF-8 BOM, CRLF) so the client can save it, matching the backend design doc.',
  tags: ['Equipment'],
  query: ExportEquipmentQuerySchema,
  responses: [
    {
      status: 200,
      schema: ExportEquipmentResponseSchema,
      description: 'CSV body plus its filename and row count',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 401, schema: ErrorResponseSchema, description: 'Unauthorized' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

// Mirrors the FR-001 display items, in the same order as the list columns.
const CSV_HEADERS = [
  '接続機器ID',
  '接続機器名',
  '店舗',
  '機器タイプ',
  'シリアルナンバー',
  'IPアドレス',
  'MACアドレス',
  '設置場所',
  '設置日',
  '状態',
  '認証方式',
  '紐づき契約種別',
];

export async function GET(request: NextRequest) {
  try {
    const authResult = getAuthUserFromRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const queryObj: Record<string, string | undefined> = {};

    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const validationResult = ExportEquipmentQuerySchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const query: ExportEquipmentQuery = validationResult.data;
    const items = filterAndSortEquipment(db.equipment.getAll(), query);

    const rows = items.map((item) => [
      item.id,
      item.name,
      item.storeName,
      EQUIPMENT_TYPE_CSV_LABELS[item.deviceType],
      item.serialNumber,
      item.ipAddress ?? '',
      item.macAddress ?? '',
      item.location,
      item.installedOn,
      EQUIPMENT_STATUS_CSV_LABELS[item.status],
      EQUIPMENT_AUTH_METHOD_CSV_LABELS[item.authMethod],
      item.linkedContractLabels.join('、'),
    ]);

    const response: ExportEquipmentResponse = {
      filename: `equipment_${csvDateStamp()}.csv`,
      rowCount: rows.length,
      csv: buildCsv(CSV_HEADERS, rows),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error exporting equipment:', error);
    return NextResponse.json({ error: 'Failed to export equipment' }, { status: 500 });
  }
}
