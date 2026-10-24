import { StoreHeader } from "@/components/store/store-header"

export const dynamic = "force-dynamic"

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[#0a1628] text-sand">
      <StoreHeader />
      <div className="flex-1 pt-32 md:pt-24">{children}</div>
    </div>
  )
}
