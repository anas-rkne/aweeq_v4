export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-royal-navy px-5 py-10 md:px-10 md:py-14 lg:px-16">
      <div className="mx-auto max-w-7xl animate-pulse" dir="rtl">
        <div className="h-3 w-40 bg-sand/10" />
        <div className="mt-8 h-12 w-52 bg-sand/10" />
        <div className="mt-4 h-4 w-full max-w-xl bg-sand/[0.07]" />
        <div className="mt-10 flex gap-4 border-y border-sand/10 py-5">
          <div className="h-4 w-20 bg-sand/10" />
          <div className="h-4 w-14 bg-sand/[0.07]" />
          <div className="h-4 w-14 bg-sand/[0.07]" />
          <div className="h-4 w-14 bg-sand/[0.07]" />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index}>
              <div className="aspect-[3/4] bg-navy-800" />
              <div className="mt-4 h-5 w-2/3 bg-sand/10" />
              <div className="mt-2 h-3 w-1/2 bg-sand/[0.07]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
