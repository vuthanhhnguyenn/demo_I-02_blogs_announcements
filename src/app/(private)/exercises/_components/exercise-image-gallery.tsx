'use client';

import { useState } from 'react';

import Image from 'next/image';

import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { cn } from '@/lib/utils';

export interface ExerciseGalleryImage {
  id: string;
  src: string;
  isPrimary: boolean;
}

interface ExerciseImageGalleryProps {
  images: readonly ExerciseGalleryImage[];
  exerciseName: string;
}

export function ExerciseImageGallery({ images, exerciseName }: ExerciseImageGalleryProps) {
  // An image that fails to load (expired signature, missing object) shows the placeholder instead
  // of a broken icon.
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(() => new Set());
  const markFailed = (id: string) => setFailedIds((prev) => new Set(prev).add(id));
  const [activeIndex, setActiveIndex] = useState(() => {
    const primaryIndex = images.findIndex((image) => image.isPrimary);
    return primaryIndex === -1 ? 0 : primaryIndex;
  });

  if (images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">サムネイル画像</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted flex aspect-video flex-col items-center justify-center gap-2 rounded-md">
            <Dumbbell className="text-muted-foreground size-8" />
            <p className="text-muted-foreground text-xs">写真未登録</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = images[activeIndex]!;
  const hasMultiple = images.length > 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">サムネイル画像</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {images.length}枚
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted relative aspect-video overflow-hidden rounded-lg">
          {failedIds.has(current.id) ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              画像を表示できません
            </div>
          ) : (
            <Image
              src={current.src}
              alt={`${exerciseName} ${activeIndex + 1}`}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              onError={() => markFailed(current.id)}
            />
          )}
          {hasMultiple && (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border-border bg-background/80 text-foreground hover:bg-background hover:text-foreground absolute top-1/2 left-2 size-8 -translate-y-1/2 rounded-full border p-0 shadow-sm"
                onClick={() => setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border-border bg-background/80 text-foreground hover:bg-background hover:text-foreground absolute top-1/2 right-2 size-8 -translate-y-1/2 rounded-full border p-0 shadow-sm"
                onClick={() => setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
              >
                <ChevronRight className="size-4" />
              </Button>
              <div className="bg-background/80 text-foreground absolute right-3 bottom-3 rounded px-2 py-1 text-xs shadow-sm">
                {activeIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {hasMultiple && (
          <div className="grid grid-cols-5 gap-2">
            {images.map((image, index) => (
              <button
                type="button"
                key={image.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-md border-2 transition-colors',
                  activeIndex === index
                    ? 'border-primary'
                    : 'hover:border-border border-transparent',
                )}
              >
                {failedIds.has(image.id) ? null : (
                  <Image
                    src={image.src}
                    alt={`${exerciseName} サムネイル ${index + 1}`}
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-cover"
                    onError={() => markFailed(image.id)}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
