export default function ProductLoading() {
  return (
    <main className="min-h-screen bg-royal-navy px-5 pb-16 pt-10 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="aspect-[3/4] w-full bg-navy-800" />
          <div className="space-y-5 py-4">
            <div className="h-4 w-32 bg-sand/10" />
            <div className="h-12 w-2/3 bg-sand/10" />
            <div className="h-4 w-1/2 bg-sand/[0.07]" />
            <div className="h-24 w-full bg-sand/[0.05]" />
            <div className="h-14 w-48 bg-sand/10" />
          </div>
        </div>
      </div>
    </main>
  )
}
