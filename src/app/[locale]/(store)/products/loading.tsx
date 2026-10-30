export default function ProductsLoading() {
  return (
    <div className="px-5 pt-5 md:px-10 md:pt-8 lg:px-16">
      <div className="mx-auto max-w-[84rem]">
        {/* cover */}
        <div className="grid gap-8 rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:p-12">
          <div>
            <div className="h-6 w-28 animate-pulse rounded-full bg-sand/10" />
            <div className="mt-5 h-14 w-3/4 animate-pulse bg-sand/10" />
            <div className="mt-4 h-4 w-full max-w-[34ch] animate-pulse bg-sand/[0.07]" />
            <div className="mt-7 flex gap-3">
              <div className="h-12 w-40 animate-pulse rounded-[var(--store-radius-sm)] bg-sand/10" />
              <div className="h-12 w-32 animate-pulse rounded-[var(--store-radius-sm)] bg-sand/[0.07]" />
            </div>
          </div>
          <div className="aspect-[4/3] animate-pulse rounded-[var(--store-radius-sm)] bg-sand/[0.06] lg:aspect-square" />
        </div>

        {/* the category circles */}
        <div className="mt-10 flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex w-20 shrink-0 flex-col items-center gap-2">
              <div className="h-16 w-16 animate-pulse rounded-full bg-sand/[0.07]" />
              <div className="h-3 w-14 animate-pulse bg-sand/[0.07]" />
            </div>
          ))}
        </div>

        {/* the catalogue */}
        <div className="mt-14">
          <div className="h-6 w-48 animate-pulse bg-sand/10" />
          <div className="mt-6 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-11 w-28 animate-pulse rounded-[var(--store-radius-pill)] bg-sand/[0.07]"
              />
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-2">
                  <div className="aspect-square rounded-[calc(var(--store-radius)-0.25rem)] bg-sand/[0.06]" />
                </div>
                <div className="mt-3 h-4 w-2/3 animate-pulse bg-sand/10" />
                <div className="mt-2 h-3 w-1/2 animate-pulse bg-sand/[0.07]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
