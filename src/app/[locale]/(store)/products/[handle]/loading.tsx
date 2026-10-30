export default function ProductLoading() {
  return (
    <main className="px-5 pb-16 pt-6 md:px-10 md:pt-10 lg:px-16">
      <div className="mx-auto max-w-[84rem] animate-pulse">
        <div className="h-12 w-2/3 bg-sand/10" />
        <div className="mt-4 h-4 w-56 bg-sand/[0.07]" />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="rounded-[var(--store-radius)] border border-sand/10 bg-[var(--store-surface)] p-2">
            <div className="aspect-square rounded-[calc(var(--store-radius)-0.25rem)] bg-sand/[0.06]" />
          </div>

          <div className="rounded-[var(--store-radius)] bg-sand/[0.1] p-8">
            <div className="h-4 w-32 bg-royal-navy/20" />
            <div className="mt-4 h-10 w-2/3 bg-royal-navy/20" />
            <div className="mt-6 h-12 w-full bg-royal-navy/10" />
            <div className="mt-3 h-12 w-full bg-royal-navy/10" />
            <div className="mt-8 h-12 w-48 bg-royal-navy/20" />
          </div>
        </div>
      </div>
    </main>
  )
}
