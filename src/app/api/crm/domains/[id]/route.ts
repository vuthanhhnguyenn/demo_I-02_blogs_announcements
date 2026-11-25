import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/app/api/_mock-db';
import {
  DeleteDomainBlockedResponseSchema,
  DeleteDomainResponseSchema,
  DomainDetailSchema,
  ErrorResponseSchema,
  UpdateDomainBodySchema,
} from '@/app/api/_schemas/domain.schema';
import { registerRoute } from '@/app/api/_scripts/register-route';

registerRoute({
  method: 'get',
  path: '/crm/domains/{id}',
  summary: 'Get domain by ID',
  description: 'Fetch a single domain, including its linked-staff list, for the edit dialog',
  tags: ['Domains'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Domain ID',
      schema: { type: 'string' },
    },
  ],
  responses: [
    {
      status: 200,
      schema: DomainDetailSchema,
      description: 'Domain detail',
    },
    {
      status: 404,
      schema: ErrorResponseSchema,
      description: 'Domain not found',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const domain = db.domains.getById(id);

    if (!domain) {
      return NextResponse.json({ error: 'ドメインが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(db.domains.toDetail(domain));
  } catch (error) {
    console.error('GET /crm/domains/[id] error:', error);
    return NextResponse.json({ error: 'ドメイン情報の取得に失敗しました' }, { status: 500 });
  }
}

registerRoute({
  method: 'patch',
  path: '/crm/domains/{id}',
  summary: 'Update domain',
  description: 'Full-replace update of a domain by ID',
  tags: ['Domains'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Domain ID',
      schema: { type: 'string' },
    },
  ],
  requestBody: {
    schema: UpdateDomainBodySchema,
    description: 'Domain update payload',
  },
  responses: [
    {
      status: 200,
      schema: DomainDetailSchema,
      description: 'Domain updated',
    },
    {
      status: 400,
      schema: ErrorResponseSchema,
      description: 'Validation error',
    },
    {
      status: 404,
      schema: ErrorResponseSchema,
      description: 'Domain not found',
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validationResult = UpdateDomainBodySchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const result = db.domains.update(id, validationResult.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('PATCH /crm/domains/[id] error:', error);
    return NextResponse.json({ error: 'ドメインの更新に失敗しました' }, { status: 500 });
  }
}

registerRoute({
  method: 'delete',
  path: '/crm/domains/{id}',
  summary: 'Delete domain',
  description: '紐づくスタッフが存在する場合は削除をブロックし、紐づくスタッフ数を返す (FR-013)',
  tags: ['Domains'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      description: 'Domain ID',
      schema: { type: 'string' },
    },
  ],
  responses: [
    {
      status: 200,
      schema: DeleteDomainResponseSchema,
      description: 'Domain deleted',
    },
    {
      status: 404,
      schema: ErrorResponseSchema,
      description: 'Domain not found',
    },
    {
      status: 409,
      schema: DeleteDomainBlockedResponseSchema,
      description: 'Domain has linked staff — deletion blocked',
    },
    {
      status: 500,
      schema: ErrorResponseSchema,
      description: 'Internal server error',
    },
  ],
});

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = db.domains.remove(id);
    if (!result.ok) {
      if (result.status === 409) {
        return NextResponse.json(
          { error: result.error, staffCount: result.staffCount },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ message: 'ドメインを削除しました' });
  } catch (error) {
    console.error('DELETE /crm/domains/[id] error:', error);
    return NextResponse.json({ error: 'ドメインの削除に失敗しました' }, { status: 500 });
  }
}
