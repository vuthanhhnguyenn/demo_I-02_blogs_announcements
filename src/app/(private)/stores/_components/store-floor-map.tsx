import type { ReactNode, Ref } from 'react';

import { cn } from '@/lib/utils';

interface StoreFloorMapProps {
  imageUrl: string;
  /** 「{店舗名}のフロア図」 */
  alt: string;
  /**
   * The overlay is the coordinate basis of every marker. The setup screen measures it to turn a
   * drag or an arrow-key step into a 0.0–1.0 position; read-only callers can omit it.
   */
  overlayRef?: Ref<HTMLDivElement>;
  /** Caps the image height to whatever vertical room the calling screen leaves */
  imageClassName?: string;
  /** `LockerMarker`s */
  children?: ReactNode;
}

/**
 * The floor-plan image with an overlay the size of the rendered image, shared by the store-map
 * setup screen and the store detail's 店舗マップ tab. Ported from the prototype's
 * `components/store-floor-map.tsx` L85-L109.
 *
 * The wrapper shrinks to the image (`w-fit`), so the overlay matches the picture exactly and a
 * marker at (x, y) lands on the same spot of the plan at any rendered size.
 *
 * A plain `<img>`, not `next/image`: the source is either a `blob:` preview of a picked file or the
 * API's self-signed `gymMapUrl`, and the natural aspect ratio is not known up front.
 */
export function StoreFloorMap({
  imageUrl,
  alt,
  overlayRef,
  imageClassName = 'max-h-[calc(100svh-320px)]',
  children,
}: Readonly<StoreFloorMapProps>) {
  return (
    <div className="relative mx-auto w-fit">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview or signed URL, see above */}
      <img
        src={imageUrl}
        alt={alt}
        draggable={false}
        className={cn('block w-auto max-w-full select-none', imageClassName)}
      />
      <div ref={overlayRef} className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}
