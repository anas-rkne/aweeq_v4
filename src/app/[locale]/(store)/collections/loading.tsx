export default function CollectionsLoading() {
  return (
    <div className="min-h-screen bg-royal-navy px-5 py-10 md:px-10 md:py-14 lg:px-16">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-3 w-40 bg-sand/10" />
        <div className="mt-8 h-12 w-56 bg-sand/10" />
        <div className="mt-4 h-4 w-full max-w-xl bg-sand/[0.07]" />
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="aspect-[16/10] bg-navy-800" />
          ))}
        </div>
      </div>
    </div>
  )
}
