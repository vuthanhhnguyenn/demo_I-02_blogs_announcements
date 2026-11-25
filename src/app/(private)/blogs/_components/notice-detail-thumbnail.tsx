import Image from 'next/image';

import { ImageIcon } from 'lucide-react';

interface NoticeDetailThumbnailProps {
  thumbnailUrl: string | null;
  alt: string;
}

/** 16:9 サムネイル画像 frame (max 320px) of ブログ詳細 / お知らせ詳細; a placeholder when none. */
export function NoticeDetailThumbnail({ thumbnailUrl, alt }: Readonly<NoticeDetailThumbnailProps>) {
  return thumbnailUrl ? (
    <div className="bg-muted relative aspect-video w-full max-w-[320px] overflow-hidden rounded-lg border">
      <Image
        src={thumbnailUrl}
        alt={alt}
        fill
        sizes="320px"
        // Above the fold and reported as the LCP image (Next 16: `priority` is deprecated).
        loading="eager"
        unoptimized
        className="object-cover"
      />
    </div>
  ) : (
    <div className="border-muted-foreground/30 flex aspect-video w-full max-w-[320px] items-center justify-center rounded-lg border border-dashed">
      <ImageIcon className="text-muted-foreground/40 size-6" />
    </div>
  );
}
