import { NextResponse } from 'next/server';

import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  // Dev tool only — see `api/docs/page.tsx`
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    const filePath = join(process.cwd(), 'src/lib/openapi.json');
    const fileContents = readFileSync(filePath, 'utf8');
    const openApiSpec = JSON.parse(fileContents);
    return NextResponse.json(openApiSpec);
  } catch (error) {
    console.error('Error reading OpenAPI spec:', error);
    return NextResponse.json({ error: 'Failed to load OpenAPI specification' }, { status: 500 });
  }
}
