import { getTranslations } from "next-intl/server"

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="M3 8h9v8H3z" />
      <path d="M12 11h4l3 3v2h-7z" />
      <circle cx="6.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  )
}

function NumberIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="M8 4 6 20M16 4l-2 16M4 9h16M3 15h16" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <rect x="5" y="10" width="14" height="10" rx="1.5" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </svg>
  )
}

const ICONS = [TruckIcon, NumberIcon, LockIcon]

export async function StoreAnnouncementBar() {
  const t = await getTranslations("Store")
  const items = [
    t("announcement.shipping"),
    t("announcement.numbering"),
    t("announcement.secure"),
  ]

  return (
    <div className="relative z-10 border-b border-sand/10 bg-navy-950/70">
      <ul className="mx-auto flex max-w-[84rem] items-center overflow-x-auto px-5 py-2.5 md:justify-center md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => {
          const Icon = ICONS[index]
          return (
            <li
              key={item}
              className={`flex shrink-0 items-center gap-2 font-primary text-[11px] leading-none text-sand/65 ${
                index > 0
                  ? "ms-5 border-s border-sand/15 ps-5 md:ms-7 md:ps-7"
                  : ""
              }`}
            >
              <Icon />
              <span className="whitespace-nowrap">{item}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
