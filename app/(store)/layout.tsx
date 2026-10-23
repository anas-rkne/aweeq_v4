import { StoreHeader } from "@/components/store/store-header"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[#020A14] text-sand">
      <StoreHeader />
      <div className="flex-1 pt-28 md:pt-24">{children}</div>
    </div>
  )
}
