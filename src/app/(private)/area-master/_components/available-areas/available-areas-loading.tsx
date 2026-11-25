import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder rows while the brand's areas load. */
export function AvailableAreasLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  );
}
