export default function CollectionsLoading() {
  return (
    <div className="px-5 pb-16 pt-8 md:px-10 md:pt-12 lg:px-16">
      <div className="mx-auto max-w-[84rem]">
        {/* cover */}
        <div className="h-14 w-64 animate-pulse bg-sand/10 md:w-80" />
        <div className="mt-5 h-4 w-full max-w-[46ch] animate-pulse bg-sand/[0.07]" />

        {/* spreads */}
        <div className="mt-12 space-y-14 lg:space-y-20">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-8 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-12"
            >
              <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-2">
                <div className="aspect-square rounded-[calc(var(--store-radius)-0.25rem)] bg-sand/[0.06]" />
              </div>
              <div>
                <div className="h-3 w-24 animate-pulse bg-sand/10" />
                <div className="mt-3 h-8 w-56 animate-pulse bg-sand/10" />
                <div className="mt-4 h-4 w-full max-w-xl animate-pulse bg-sand/[0.07]" />
                <div className="mt-7 h-12 w-44 animate-pulse rounded-[var(--store-radius-sm)] bg-sand/[0.07]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
