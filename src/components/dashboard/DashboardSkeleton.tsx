import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      {/* Header skeleton */}
      <div className="mb-12">
        <Skeleton className="h-12 w-72 mb-3" />
        <Skeleton className="h-5 w-96 mb-4" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      {/* Subscription card skeleton */}
      <div className="glass-card rounded-2xl p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5 flex flex-col items-center">
            <Skeleton className="h-9 w-12 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* History header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="flex flex-wrap gap-3 mb-6">
          <Skeleton className="h-10 w-[180px] rounded-md" />
          <Skeleton className="h-10 w-[160px] rounded-md" />
          <Skeleton className="h-10 w-[160px] rounded-md" />
        </div>
      </div>

      {/* Diagnosis list skeleton */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="h-5 w-48 mb-2" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
