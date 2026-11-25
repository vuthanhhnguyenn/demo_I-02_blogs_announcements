import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import type { StudioImageDto } from '@/lib/api-real/types.gen';

interface StudioImagesCardProps {
  images: StudioImageDto[];
}

export function StudioImagesCard({ images }: StudioImagesCardProps) {
  if (!images || images.length === 0) {
    return (
      <Card>
        <CardContent className="px-4">
          <h2 className="text-sm font-bold">スタジオ画像</h2>
          <p className="text-muted-foreground mt-2 text-center text-sm">画像はありません</p>
        </CardContent>
      </Card>
    );
  }

  // The API already answers displayOrder ASC (ties by createdAt); kept explicit for the gaps it allows
  const sortedImages = [...images].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Card>
      <CardContent className="px-4">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-bold">スタジオ画像</h2>
          <Badge variant="secondary" className="text-[10px]">
            {sortedImages.length}枚
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {sortedImages.map((image) => (
            <div key={image.id} className="bg-muted aspect-[3/2] overflow-hidden rounded-lg">
              {image.url && (
                // Signed asset URL (exp / sig) from the BFF — served as is, like the lesson images
                <Image
                  src={image.url}
                  alt="スタジオ画像"
                  width={600}
                  height={400}
                  unoptimized
                  className="size-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
