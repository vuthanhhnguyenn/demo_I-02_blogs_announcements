import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  CreateDomainBodySchema,
  DomainDetailSchema,
  ErrorResponseSchema,
  GetDomainsQueryParams,
  GetDomainsQueryParamsSchema,
  GetDomainsResponseSchema,
} from '@/app/api/_schemas/domain.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/domains',
  summary: 'Get domains',
  description: 'Get paginated domain master list with search and authentication-method filter',
  tags: ['Domains'],
  query: GetDomainsQueryParamsSchema,
  responses: [
    {
      status: 200,
      schema: GetDomainsResponseSchema,
      description: 'Domain list',
    },
    {
      status: 400,
      schema: ErrorResponseSchema,
      description: 'Bad request',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

export async function GET(request: NextRequest) {
  try {
    const queryObj: Record<string, string | undefined> = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const validationResult = GetDomainsQueryParamsSchema.safeParse(queryObj);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const query: GetDomainsQueryParams = validationResult.data;
    return NextResponse.json(db.domains.list(query));
  } catch (error) {
    console.error('GET /crm/domains error:', error);
    return NextResponse.json({ error: 'ドメイン一覧の取得に失敗しました' }, { status: 500 });
  }
}

registerRoute({
  method: 'post',
  path: '/crm/domains',
  summary: 'Create domain',
  description: 'Register a new domain in the staff email-domain allowlist',
  tags: ['Domains'],
  requestBody: {
    schema: CreateDomainBodySchema,
    description: 'Domain create payload',
  },
  responses: [
    {
      status: 200,
      schema: DomainDetailSchema,
      description: 'Domain created',
    },
    {
      status: 400,
      schema: ErrorResponseSchema,
      description: 'Bad request',
    },
    {
      status: 409,
      schema: ErrorResponseSchema,
      description: 'Domain already registered',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = CreateDomainBodySchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const result = db.domains.create(validationResult.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('POST /crm/domains error:', error);
    return NextResponse.json({ error: 'ドメインの作成に失敗しました' }, { status: 500 });
  }
}
