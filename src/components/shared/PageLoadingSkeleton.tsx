import { Skeleton } from '@/components/ui/skeleton';
import { Layout } from '@/components/layout/Layout';

export function PageLoadingSkeleton() {
  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </div>
    </Layout>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-10">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex flex-col items-center mb-10">
        <Skeleton className="w-28 h-28 rounded-full" />
        <Skeleton className="h-3 w-24 mt-3" />
      </div>
      <div className="space-y-8">
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="mb-5">
              <Skeleton className="h-4 w-36 mb-2" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
