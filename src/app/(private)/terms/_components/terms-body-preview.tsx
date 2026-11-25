import { toTermsViewerDocument } from '@/app/(private)/terms/_utils/terms-body-viewer.util';

import { cn } from '@/lib/utils';

interface TermsBodyPreviewProps {
  bodyText: string | null | undefined;
  className?: string;
}

/**
 * The 規約本文 as the member app renders it (its WebView page). `sandbox` without `allow-scripts`
 * keeps the iframe inert: no script, form or navigation can run from the stored body.
 */
export function TermsBodyPreview({ bodyText, className }: Readonly<TermsBodyPreviewProps>) {
  return (
    <iframe
      title="規約本文"
      sandbox=""
      srcDoc={toTermsViewerDocument(bodyText)}
      className={cn('bg-background w-full rounded-md border', className)}
    />
  );
}
