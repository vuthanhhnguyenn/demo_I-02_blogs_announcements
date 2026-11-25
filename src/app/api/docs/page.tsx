import { notFound } from 'next/navigation';

import { ApiDocs } from './_components/api-docs';

/**
 * Swagger UI for the mock API — a dev tool only. Allow-listed on `development` (same rule as the
 * demo-user switcher) so an environment that forgot to set the variable hides it.
 */
export default function ApiDocsPage() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'development') notFound();

  return <ApiDocs />;
}
