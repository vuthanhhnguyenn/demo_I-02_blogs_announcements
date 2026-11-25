import { navigate } from '@/lib/routes/routes.util';

/**
 * 店舗マップ設定 for the form's store; with no store picked yet, the store-less entry resolves
 * the header's store instead (Y-02-05 FR-071/FR-072).
 */
export function storeMapHref(storeId: string | null | undefined): string {
  return storeId ? navigate('/stores/[id]/map', storeId) : navigate('/stores/map');
}

// TODO(round3) R303: read-only floor map of the form (store floor-map image, static SVG fallback).
// FR-016 is a Could and Phase 2, and no real API carries a floor-map image. Integrate in phase 2.
// The prototype component is kept below, commented out.
//
// type LockerFormFloorMapProps = {
//   storeId: string;
//   /** Leaves for 店舗マップ設定 through the form's unsaved-changes guard */
//   onOpenStoreMap: (href: string) => void;
// };
//
// export function LockerFormFloorMap({ storeId, onOpenStoreMap }: LockerFormFloorMapProps) {
//   const [showFloorMap, setShowFloorMap] = useState(false);
//
//   const { data } = useQuery({
//     ...getCrmStoresByIdOptions({ path: { id: storeId } }),
//     enabled: Boolean(storeId),
//   });
//
//   const floorMapUrl = data?.store?.floor_map_url;
//
//   return (
//     <div className="border-border bg-muted/30 mb-4 overflow-hidden rounded-lg border">
//       <button
//         type="button"
//         onClick={() => setShowFloorMap((value) => !value)}
//         className="hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left transition-colors"
//       >
//         <div className="flex items-center gap-2">
//           <Map className="text-muted-foreground size-4" />
//           <span className="text-sm font-medium">
//             フロアマップを{showFloorMap ? '閉じる' : '確認する'}
//           </span>
//           <span className="border-border text-muted-foreground inline-flex items-center gap-1 rounded border px-2 py-0 text-[10px]">
//             <Lock className="size-3" />
//             閲覧専用
//           </span>
//         </div>
//         {showFloorMap ? (
//           <ChevronUp className="text-muted-foreground size-4" />
//         ) : (
//           <ChevronDown className="text-muted-foreground size-4" />
//         )}
//       </button>
//       {showFloorMap && (
//         <div className="border-border bg-background border-t p-4">
//           <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
//             {/* Prototype `locker-form.tsx` L505-L512: a link, through the form's guard */}
//             <Button
//               type="button"
//               variant="link"
//               size="sm"
//               className="h-auto p-0 align-baseline text-xs"
//               onClick={() => onOpenStoreMap(storeMapHref(storeId))}
//             >
//               店舗マップ設定
//             </Button>{' '}
//             で登録された画像です。エリア記号（A〜N, R,
//             S）を参照して下のSelectで選択してください。画像の差し替えは店舗マップ設定側で行います。
//           </p>
//           <div className="w-full rounded-lg border bg-white p-4">
//             {floorMapUrl ? (
//               <div className="relative aspect-[700/440] w-full overflow-hidden rounded-lg">
//                 <Image
//                   src={floorMapUrl}
//                   alt="店舗フロアマップ（閲覧専用）"
//                   fill
//                   unoptimized
//                   className="object-contain"
//                 />
//               </div>
//             ) : (
//               <StoreFloorMapSvg />
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
