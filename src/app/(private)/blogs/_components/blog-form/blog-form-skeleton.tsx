import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function FieldSkeleton({ inputClassName = 'h-9 w-full' }: { inputClassName?: string }) {
  return (
    <div>
      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className={inputClassName} />
    </div>
  );
}

/** Loading shape of the blog form: four cards + footer (scroll area included). */
export function BlogFormSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
      <div className="mx-auto flex max-w-[960px] flex-col gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-4">
            <FieldSkeleton />
            <FieldSkeleton inputClassName="h-[360px] w-full" />
            <FieldSkeleton inputClassName="aspect-video w-[160px]" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="px-4">
            <FieldSkeleton inputClassName="h-9 w-full max-w-[320px]" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <FieldSkeleton inputClassName="h-5 w-64" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-4">
            <FieldSkeleton inputClassName="h-20 w-full max-w-[400px]" />
            <FieldSkeleton inputClassName="h-9 w-48" />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}
