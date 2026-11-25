import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  ErrorResponseSchema,
  GetUsageStatusResponseSchema,
} from '@/app/api/_schemas/member.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/members/{id}/usage-status',
  summary: 'Get member usage status',
  description: 'Get visit counts and usage patterns for a member',
  tags: ['Members'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Member ID',
      schema: { type: 'string' },
    },
  ],
  responses: [
    {
      status: 200,
      schema: GetUsageStatusResponseSchema,
      description: 'Usage status information',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

const TIME_SLOTS = [
  '06:00-08:00',
  '10:00-12:00',
  '12:00-14:00',
  '17:00-19:00',
  '18:00-20:00',
  '20:00-22:00',
];

/**
 * Stable small number from any id shape. The CRM now navigates with the real member id (a UUID),
 * not the mock `M-00001`, so only the trailing digits are read — `parseInt` on a full UUID's digits
 * overflows into a float and stops being deterministic.
 */
function idSeed(id: string): number {
  const digits = id.replace(/\D/g, '').slice(-6);
  return parseInt(digits, 10) || 1;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // A member outside the mock db is expected: the screen passes the real id while this card
    // waits for `GET ~/{memberId}/usage-summary`. Only 店舗名 needs the record, so the figures
    // are served either way rather than 404-ing the whole card.
    const member = db.members.get(id);

    // Deterministic mock data derived from member ID number
    const idNum = idSeed(id);
    const monthlyVisits = 6 + (idNum % 20);
    const monthlyVisitsDiff = (idNum % 11) - 5; // -5 ~ +5
    const peakTimeSlot = TIME_SLOTS[idNum % TIME_SLOTS.length]!;

    const monthlyLessons = 8 + (idNum % 8);
    const monthlyOptions = 3 + (idNum % 4);

    const usageStatus = {
      monthlyVisits,
      monthlyVisitsDiff,
      peakTimeSlot,
      frequentStore: member?.primaryStore.name ?? null,
      monthlyLessons,
      monthlyLessonsDiff: (idNum % 7) - 3,
      monthlyOptions,
      monthlyOptionsBreakdown: [
        { label: '水素水', count: Math.max(1, monthlyOptions - 2) },
        { label: 'PT', count: 1 },
        { label: 'タンニング', count: 1 },
      ],
      totalVisits: 120 + (idNum % 200),
      last30DaysVisits: Math.max(monthlyVisits, 4 + (idNum % 18)),
    };

    return NextResponse.json(usageStatus);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch usage status' }, { status: 500 });
  }
}
