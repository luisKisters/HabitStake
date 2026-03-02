import { Skeleton } from "@/components/ui/skeleton";

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-2 shrink-0">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
