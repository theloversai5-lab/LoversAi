export default function LoadingCard() {
  return (
    <div className="bg-[#E2B451]/10 rounded-lg border-2 border-[#E2B451]/20 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-[#E2B451]/20 rounded w-3/4 mb-2 skeleton"></div>
          <div className="h-4 bg-[#E2B451]/20 rounded w-1/2 skeleton"></div>
        </div>
        <div className="h-8 w-20 bg-[#E2B451]/20 rounded-full skeleton"></div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-3 mb-4">
        <div className="h-4 bg-[#E2B451]/20 rounded w-full skeleton"></div>
        <div className="h-4 bg-[#E2B451]/20 rounded w-5/6 skeleton"></div>
        <div className="h-4 bg-[#E2B451]/20 rounded w-4/6 skeleton"></div>
      </div>

      {/* Footer skeleton */}
      <div className="flex gap-3 pt-4 border-t border-[#E2B451]/20">
        <div className="h-10 bg-[#E2B451]/20 rounded flex-1 skeleton"></div>
        <div className="h-10 bg-[#E2B451]/20 rounded w-24 skeleton"></div>
      </div>
    </div>
  );
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}

export function LoadingList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}
