import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { BlogBodyViewer } from '../../_components/blog-body-viewer';
import { BLOG_DETAIL_EMPTY_BODY } from '../../_constants/blog.constants';
import type { BlogDetail } from '../../_types/blog.type';

interface BlogDetailBodyCardProps {
  detail: BlogDetail;
}

/** Read-only 本文 card (PAR013). */
export function BlogDetailBodyCard({ detail }: BlogDetailBodyCardProps) {
  const body = detail.body.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">本文</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {body ? (
          <BlogBodyViewer html={body} className="text-sm leading-relaxed [&_.ql-editor]:text-sm" />
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">{BLOG_DETAIL_EMPTY_BODY}</p>
        )}
      </CardContent>
    </Card>
  );
}
