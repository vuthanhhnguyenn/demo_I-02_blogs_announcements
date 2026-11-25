'use client';

import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from 'react';

import { ImageUp, Lock, MapPin, Trash2, TriangleAlert, Upload } from 'lucide-react';

import { Empty } from '@/components/common/data-state-boundary/empty';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import { type SignedMimeType, findFileProblem } from '@/lib/utils/file-signature.util';

import { LockerMarker } from '../../../_components/locker-marker';
import { StoreFloorMap } from '../../../_components/store-floor-map';
import {
  type FloorImage,
  type ImageChange,
  type MapCabinet,
  type MapPosition,
  clamp01,
} from './use-store-map-draft';

/** Accepted floor-plan formats and size (prototype L65-L68; SVG dropped, the presign refuses it — BQ1) */
const ACCEPTED_IMAGE_TYPES: SignedMimeType[] = ['image/png', 'image/jpeg'];
const ACCEPTED_IMAGE_ATTR = ACCEPTED_IMAGE_TYPES.join(',');
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** A press released before moving this far (px) is a selection, not a drag (L57-L58) */
const DRAG_THRESHOLD_PX = 4;

/** One arrow-key step, in rendered pixels; Shift multiplies it by 10 (L70-L76) */
const ARROW_DIRECTION: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** Why a picked file is refused (FR-013), or null when it is accepted */
function validateImage(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as string[]).includes(file.type)) {
    return `PNG・JPG 以外の形式のため登録できません（選んだファイル: ${file.name}）`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `5MBを超えているため登録できません（選んだファイル: ${formatMegabytes(file.size)}）`;
  }
  return null;
}

/**
 * True when the browser can actually draw the file. The type check above trusts the extension's
 * MIME type, so a text file renamed `.png` passes it and would otherwise preview as a broken image
 * and be uploaded (E-MED-002 class).
 */
function canDecodeImage(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    image.src = url;
  });
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  /** Grab point minus the marker's centre, so the marker does not jump when the drag starts */
  offsetX: number;
  offsetY: number;
  moved: boolean;
}

export interface PlacedCabinet extends MapCabinet {
  position: MapPosition;
}

interface FloorImageCardProps {
  storeName: string;
  canEdit: boolean;
  draftImage: FloorImage | null;
  imageChange: ImageChange | null;
  imageError: string | null;
  /** Cabinets with a draft position, sorted by symbol */
  placed: PlacedCabinet[];
  dirtyIds: ReadonlySet<string>;
  selectedId: string | null;
  hoveredId: string | null;
  /** The cabinet 配置 just put down, while it is still selected and unmoved (FR-023) */
  justPlacedName: string | null;
  onImageAccepted: (file: File) => void;
  onImageError: (message: string | null) => void;
  onRemoveImage: () => void;
  onSelect: (id: string) => void;
  onHoverChange: (id: string | null) => void;
  /** A drag or arrow-key move started on this cabinet — selects it and ends the placement hint */
  onMoveStart: (id: string) => void;
  onMove: (id: string, next: MapPosition | ((current: MapPosition) => MapPosition)) => void;
}

/**
 * The フロア図 card: the image with its markers, or the dropzone / empty state when there is no
 * image (prototype `store-map-setup.tsx` L633-L741, handlers L391-L530).
 */
export function FloorImageCard({
  storeName,
  canEdit,
  draftImage,
  imageChange,
  imageError,
  placed,
  dirtyIds,
  selectedId,
  hoveredId,
  justPlacedName,
  onImageAccepted,
  onImageError,
  onRemoveImage,
  onSelect,
  onHoverChange,
  onMoveStart,
  onMove,
}: Readonly<FloorImageCardProps>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  /** The click that ends a drag is not a selection (L508-L524) */
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  /** Bumped per pick, so a slow decode check never applies a file picked before the latest one */
  const pickSeqRef = useRef(0);

  // --- image (nothing is stored until 変更を保存) ---
  async function applyFile(file: File) {
    const seq = ++pickSeqRef.current;
    const error = validateImage(file);
    if (error) {
      onImageError(error);
      return;
    }
    // Bug No.13: the type check above trusts the extension, so the leading bytes must agree
    const problem = await findFileProblem(file, {
      acceptedTypes: ACCEPTED_IMAGE_TYPES,
      maxSizeMB: MAX_IMAGE_BYTES / 1024 / 1024,
    });
    if (seq !== pickSeqRef.current) return;
    if (problem) {
      onImageError(`PNG・JPG 以外の形式のため登録できません（選んだファイル: ${file.name}）`);
      return;
    }
    const decodable = await canDecodeImage(file);
    if (seq !== pickSeqRef.current) return;
    if (!decodable) {
      onImageError(`画像として読み込めないため登録できません（選んだファイル: ${file.name}）`);
      return;
    }
    onImageError(null);
    onImageAccepted(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file again still fires `change` (L407-L412)
    event.target.value = '';
    if (file) void applyFile(file);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    // Moving onto a child of the zone fires `dragleave` on the zone too; ignore that one
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDropActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void applyFile(file);
  }

  // --- markers: keyboard (selected marker only, editors only — L443-L468) ---
  function handleMarkerKeyDown(event: KeyboardEvent<HTMLElement>, id: string) {
    if (!canEdit || selectedId !== id) return;
    const direction = ARROW_DIRECTION[event.key];
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!direction || !rect || rect.width === 0 || rect.height === 0) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    onMoveStart(id);
    onMove(id, (current) => ({
      x: clamp01(current.x + (direction.x * step) / rect.width),
      y: clamp01(current.y + (direction.y * step) / rect.height),
    }));
  }

  // --- markers: pointer drag (L470-L524) ---
  function handleMarkerPointerDown(event: PointerEvent<HTMLElement>, id: string) {
    suppressClickRef.current = false;
    if (!canEdit || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - (rect.left + rect.width / 2),
      offsetY: event.clientY - (rect.top + rect.height / 2),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMarkerPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    const overlay = overlayRef.current;
    if (!drag || !overlay) return;
    if (!drag.moved) {
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (distance < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setDraggingId(drag.id);
      onMoveStart(drag.id);
    }
    const rect = overlay.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    onMove(drag.id, {
      x: clamp01((event.clientX - drag.offsetX - rect.left) / rect.width),
      y: clamp01((event.clientY - drag.offsetY - rect.top) / rect.height),
    });
  }

  /** Release and pointer cancel alike */
  function handleMarkerPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) {
      suppressClickRef.current = true;
      setDraggingId(null);
    }
  }

  function handleMarkerClick(id: string) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelect(id);
  }

  return (
    <Card className="min-w-0 flex-1">
      <CardHeader>
        <CardTitle className="text-base font-semibold">フロア図</CardTitle>
        {!canEdit ? (
          <CardAction className="text-muted-foreground flex items-center gap-1 text-xs">
            <Lock className="size-3" />
            閲覧のみ
          </CardAction>
        ) : (
          draftImage && (
            <CardAction className="flex items-center gap-1">
              {justPlacedName && (
                <p role="status" className="text-muted-foreground mr-2 text-xs">
                  {justPlacedName} を置きました。ドラッグして位置を合わせてください
                </p>
              )}
              <Button variant="outline" size="sm" onClick={openFilePicker}>
                <ImageUp />
                画像を差し替え
              </Button>
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="画像を削除"
                    onClick={onRemoveImage}
                  >
                    <Trash2 />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">画像を削除</TooltipContent>
              </Tooltip>
            </CardAction>
          )
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Editors only: a read-only user has no way to pick a file at all (L671) */}
        {canEdit && (
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_ATTR}
            className="hidden"
            onChange={handleFileChange}
          />
        )}

        {/* A replacement only — not a first registration, not a deletion (L322-L323) */}
        {imageChange === 'replace' && (
          <Alert className="border-warning/50 bg-warning/15">
            <TriangleAlert className="text-warning size-4" />
            <AlertTitle className="text-sm">画像を差し替えました</AlertTitle>
            <AlertDescription className="text-muted-foreground text-xs">
              ロッカーの位置は前の画像のままです。ずれていないか確認してください
            </AlertDescription>
          </Alert>
        )}

        {draftImage ? (
          <StoreFloorMap
            imageUrl={draftImage.previewUrl}
            alt={`${storeName}のフロア図`}
            overlayRef={overlayRef}
          >
            {placed.map((cabinet) => (
              <LockerMarker
                key={cabinet.id}
                lockerId={cabinet.id}
                symbol={cabinet.symbol}
                name={cabinet.name}
                shapeLabel={cabinet.shapeLabel}
                x={cabinet.position.x}
                y={cabinet.position.y}
                selected={selectedId === cabinet.id}
                hovered={hoveredId === cabinet.id}
                dragging={draggingId === cabinet.id}
                unsaved={dirtyIds.has(cabinet.id)}
                readOnly={!canEdit}
                onClick={() => handleMarkerClick(cabinet.id)}
                onHoverChange={(hovered) => onHoverChange(hovered ? cabinet.id : null)}
                onPointerDown={(event) => handleMarkerPointerDown(event, cabinet.id)}
                onPointerMove={handleMarkerPointerMove}
                onPointerUp={handleMarkerPointerUp}
                onKeyDown={(event) => handleMarkerKeyDown(event, cabinet.id)}
              />
            ))}
          </StoreFloorMap>
        ) : canEdit ? (
          <div
            className={cn(
              'border-border flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed',
              dropActive && 'border-ring bg-muted/50',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="text-muted-foreground size-8" strokeWidth={1.5} />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-sm font-medium">フロア図の画像を登録してください</p>
              <p className="text-muted-foreground text-xs">PNG・JPG（5MB まで）</p>
            </div>
            <Button variant="outline" onClick={openFilePicker}>
              画像を選ぶ
            </Button>
          </div>
        ) : (
          <Empty variant="empty" icon={MapPin} title="フロア図が登録されていません" />
        )}

        {/* A long unbroken file name breaks anywhere rather than running past the card (LV-17) */}
        {imageError && (
          <p className="text-destructive min-w-0 text-xs [overflow-wrap:anywhere]">{imageError}</p>
        )}
      </CardContent>
    </Card>
  );
}
