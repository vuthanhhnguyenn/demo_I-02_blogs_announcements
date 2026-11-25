import { NextRequest, NextResponse } from 'next/server';

import { getAuthUserFromRequest } from '@/app/api/_lib/auth';
import { buildCsv, csvDateStamp } from '@/app/api/_lib/csv';
import { db } from '@/app/api/_mock-db';
import { ErrorResponseSchema } from '@/app/api/_schemas/auth.schema';
import {
  type ExportControllersQuery,
  ExportControllersQuerySchema,
  type ExportControllersResponse,
  ExportControllersResponseSchema,
} from '@/app/api/_schemas/controller.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/controllers/export',
  summary: 'Export contact-control device list as CSV',
  description:
    'Export the contact-control device list (接点制御装置) using the same filters and sort as the list screen without pagination. Returns the CSV body inline (UTF-8 BOM, CRLF) so the client can save it, matching the connected-equipment export.',
  tags: ['Controllers'],
  query: ExportControllersQuerySchema,
  responses: [
    {
      status: 200,
      schema: ExportControllersResponseSchema,
      description: 'CSV body plus its filename and row count',
    },
    { status: 400, schema: ErrorResponseSchema, description: 'Bad request' },
    { status: 401, schema: ErrorResponseSchema, description: 'Unauthorized' },
    { status: 500, schema: ErrorResponseSchema, description: 'Internal server error' },
  ],
});

type ControllerRecord = ReturnType<typeof db.controllers.list>['items'][number];

const STATUS_LABELS: Record<ControllerRecord['status'], string> = {
  normal: '正常',
  error: '異常',
  maintenance: 'メンテナンス中',
  discarded: '廃棄',
};

// Mirrors the list columns, in the same order as the table.
const CSV_HEADERS = [
  '装置ID',
  '装置名',
  '店舗コード',
  '設置場所',
  'IPアドレス',
  'FW',
  '制御ポート数',
  '紐付き機器数',
  'ステータス',
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

    const validationResult = ExportControllersQuerySchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const filters: ExportControllersQuery = validationResult.data;
    // Reuse the list logic (filter + sort + device counts) without pagination.
    const { items } = db.controllers.list({ ...filters, page: 1, limit: Number.MAX_SAFE_INTEGER });

    const rows = items.map((item) => [
      item.id,
      item.name ?? '',
      item.storeCode,
      item.location,
      item.ipAddress,
      item.firmwareVersion ?? '',
      item.controlPortCount,
      item.connectedDeviceCount,
      STATUS_LABELS[item.status],
    ]);

    const response: ExportControllersResponse = {
      filename: `controllers_${csvDateStamp()}.csv`,
      rowCount: rows.length,
      csv: buildCsv(CSV_HEADERS, rows),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error exporting controllers:', error);
    return NextResponse.json({ error: 'Failed to export controllers' }, { status: 500 });
  }
}
