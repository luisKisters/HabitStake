import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-20" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-6 pt-2">
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 flex-1 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
