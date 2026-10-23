export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-[#020A14] px-5 py-8 md:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-3 w-48 bg-sand/10" />
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="aspect-[3/4] bg-[#0a1420]" />
          <div className="space-y-5" dir="rtl">
            <div className="h-6 w-24 bg-sand/10" />
            <div className="h-12 w-2/3 bg-sand/10" />
            <div className="h-5 w-1/2 bg-sand/[0.07]" />
            <div className="h-4 w-full bg-sand/[0.07]" />
            <div className="h-4 w-4/5 bg-sand/[0.07]" />
            <div className="mt-8 h-12 w-36 bg-sand/10" />
            <div className="h-14 w-full bg-sand/[0.07]" />
            <div className="h-14 w-full bg-sand/[0.07]" />
          </div>
        </div>
      </div>
    </div>
  )
}
