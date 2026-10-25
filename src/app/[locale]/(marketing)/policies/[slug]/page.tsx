import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

type PolicySection = {
  headingAr: string
  headingEn: string
  bodyAr: string[]
  bodyEn: string[]
}

type Policy = {
  slug: string
  titleAr: string
  titleEn: string
  introAr: string
  introEn: string
  sections: PolicySection[]
}

const POLICIES: Policy[] = [
  {
    slug: "faq",
    titleAr: "الأسئلة الشائعة",
    titleEn: "FAQ",
    introAr: "كل ما تحتاج معرفته قبل اقتناء قطعة من 3WEEQ.",
    introEn: "Everything you need to know before owning a piece from 3WEEQ.",
    sections: [
      {
        headingAr: "هل القطع محدودة فعلاً؟",
        headingEn: "Are the pieces really limited?",
        bodyAr: [
          "نعم. كل إصدار يُنتج بعدد محدد ومرقّم، ولا يُعاد إنتاجه بعد نفاد الكمية. الرقم التسلسلي مذكور في بطاقة القطعة.",
        ],
        bodyEn: [
          "Yes. Every edition is produced in a fixed, numbered quantity and is never reproduced once sold out. The serial number is noted on the piece's card.",
        ],
      },
      {
        headingAr: "كيف أعرف أن القطعة أصلية؟",
        headingEn: "How do I know a piece is authentic?",
        bodyAr: [
          "كل قطعة تحمل رقمًا تسلسليًا فريدًا وبطاقة أصالة موقّعة، ويمكن التحقق من الرقم عبر خدمة العملاء.",
        ],
        bodyEn: [
          "Every piece carries a unique serial number and a signed certificate of authenticity, and the number can be verified through customer service.",
        ],
      },
      {
        headingAr: "هل تتوفر عينات قبل الشراء؟",
        headingEn: "Are samples available before purchase?",
        bodyAr: [
          "نوفّر مجموعات اكتشاف محدودة عند إطلاق كل مجموعة. تابع النشرة البريدية لمعرفة مواعيد الإطلاق.",
        ],
        bodyEn: [
          "We offer limited discovery sets at the launch of each collection. Follow the newsletter to learn the release dates.",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    titleAr: "الشحن والتوصيل",
    titleEn: "Shipping & Delivery",
    introAr: "نشحن إلى دول الخليج، ونعمل على التوسع تدريجيًا.",
    introEn: "We ship to Gulf countries and are expanding gradually.",
    sections: [
      {
        headingAr: "مدة التوصيل",
        headingEn: "Delivery time",
        bodyAr: [
          "داخل المملكة: 2–4 أيام عمل. دول الخليج: 4–7 أيام عمل. قد تزيد المدة في مواسم الإطلاق المحدود.",
        ],
        bodyEn: [
          "Within the Kingdom: 2–4 business days. Gulf countries: 4–7 business days. Times may increase during limited-launch seasons.",
        ],
      },
      {
        headingAr: "التغليف",
        headingEn: "Packaging",
        bodyAr: [
          "تُشحن كل قطعة في تغليف واقٍ يحفظ العطر من الحرارة والضوء، مع تأمين كامل ضد الكسر أثناء النقل.",
        ],
        bodyEn: [
          "Every piece ships in protective packaging that keeps the fragrance safe from heat and light, with full insurance against breakage in transit.",
        ],
      },
      {
        headingAr: "تتبع الطلب",
        headingEn: "Order tracking",
        bodyAr: [
          "يصلك رقم تتبع عبر البريد الإلكتروني فور خروج الطلب من المستودع.",
        ],
        bodyEn: [
          "You will receive a tracking number by email as soon as your order leaves the warehouse.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    titleAr: "الاسترجاع والاستبدال",
    titleEn: "Returns & Exchanges",
    introAr: "رضاك شرط أساسي، مع مراعاة طبيعة منتجات العطور.",
    introEn:
      "Your satisfaction is essential, mindful of the nature of fragrance products.",
    sections: [
      {
        headingAr: "مدة الاسترجاع",
        headingEn: "Return window",
        bodyAr: [
          "يمكن طلب الاسترجاع خلال 14 يومًا من الاستلام، بشرط أن يكون الغلاف الخارجي سليمًا ولم تُفتح قطعة العطر.",
        ],
        bodyEn: [
          "Returns can be requested within 14 days of delivery, provided the outer packaging is intact and the fragrance has not been opened.",
        ],
      },
      {
        headingAr: "القطع المفتوحة",
        headingEn: "Opened pieces",
        bodyAr: [
          "لأسباب صحية، لا يمكن استرجاع العطور المفتوحة أو المستخدمة، ما لم يكن هناك عيب في التصنيع.",
        ],
        bodyEn: [
          "For health reasons, opened or used fragrances cannot be returned unless there is a manufacturing defect.",
        ],
      },
      {
        headingAr: "القطع المحدودة",
        headingEn: "Limited pieces",
        bodyAr: [
          "القطع المرقّمة قابلة للاستبدال فقط في حال وجود عيب تصنيعي، نظرًا لطبيعتها المحدودة.",
        ],
        bodyEn: [
          "Numbered pieces can only be exchanged in the case of a manufacturing defect, given their limited nature.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    titleAr: "الشروط والأحكام",
    titleEn: "Terms & Conditions",
    introAr: "باستخدامك موقع 3WEEQ فإنك توافق على الشروط التالية.",
    introEn: "By using the 3WEEQ website you agree to the following terms.",
    sections: [
      {
        headingAr: "الاستخدام",
        headingEn: "Use",
        bodyAr: [
          "يُخصص الموقع للاستخدام الشخصي غير التجاري. يُمنع إعادة بيع القطع المحدودة دون إذن كتابي.",
        ],
        bodyEn: [
          "The website is intended for personal, non-commercial use. Reselling limited pieces without written permission is prohibited.",
        ],
      },
      {
        headingAr: "الأسعار",
        headingEn: "Prices",
        bodyAr: [
          "جميع الأسعار بالريال السعودي وتشمل القيمة المضافة حيث ينطبق. قد تتغير الأسعار دون إشعار مسبق.",
        ],
        bodyEn: [
          "All prices are in Saudi Riyals and include VAT where applicable. Prices may change without prior notice.",
        ],
      },
      {
        headingAr: "الملكية الفكرية",
        headingEn: "Intellectual property",
        bodyAr: [
          "جميع النصوص والصور والتصاميم مملوكة لـ 3WEEQ ولا يجوز استخدامها دون إذن.",
        ],
        bodyEn: [
          "All texts, images, and designs are owned by 3WEEQ and may not be used without permission.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    titleAr: "سياسة الخصوصية",
    titleEn: "Privacy Policy",
    introAr: "نحترم خصوصيتك ونستخدم بياناتك فقط لخدمتك.",
    introEn: "We respect your privacy and use your data only to serve you.",
    sections: [
      {
        headingAr: "ما نجمعه",
        headingEn: "What we collect",
        bodyAr: [
          "نجمع بريدك الإلكتروني عند الاشتراك في النشرة، وبيانات الشحن عند إتمام الطلب. لا نجمع بيانات دفع على موقعنا؛ تُعالج بأمان عبر مزوّد الدفع.",
        ],
        bodyEn: [
          "We collect your email address when you subscribe to the newsletter, and shipping data when you complete an order. We do not collect payment data on our site; it is processed securely through the payment provider.",
        ],
      },
      {
        headingAr: "كيف نستخدمه",
        headingEn: "How we use it",
        bodyAr: [
          "نستخدم بياناتك لتنفيذ الطلبات، وإرسال تحديثات الإصدارات إذا اشتركت، وتحسين تجربتك.",
        ],
        bodyEn: [
          "We use your data to fulfill orders, send release updates if you subscribed, and improve your experience.",
        ],
      },
      {
        headingAr: "حقوقك",
        headingEn: "Your rights",
        bodyAr: [
          "يمكنك طلب الاطلاع على بياناتك أو حذفها في أي وقت عبر التواصل معنا.",
        ],
        bodyEn: [
          "You can request to access or delete your data at any time by contacting us.",
        ],
      },
    ],
  },
]

export function generateStaticParams() {
  return POLICIES.map((policy) => ({ slug: policy.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const policy = POLICIES.find((item) => item.slug === slug)

  if (!policy) {
    return { title: `${locale === "ar" ? "السياسات" : "Policies"} | 3WEEQ` }
  }

  return {
    title: `${locale === "ar" ? policy.titleAr : policy.titleEn} | 3WEEQ`,
    description: locale === "ar" ? policy.introAr : policy.introEn,
  }
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const isArabic = locale === "ar"
  const t = await getTranslations({ locale, namespace: "Common" })
  const storeT = await getTranslations({ locale, namespace: "Store" })
  const policy = POLICIES.find((item) => item.slug === slug)

  if (!policy) {
    notFound()
  }

  return (
    <main className="min-h-svh bg-royal-navy px-5 pb-24 pt-32 sm:px-8 md:px-16 lg:px-24">
      <div className="mx-auto max-w-3xl">
        <nav
          aria-label={storeT("breadcrumb")}
          className="mb-10 flex items-center gap-2 font-primary text-xs text-sand/40"
        >
          <Link href="/" className="transition-colors hover:text-gold">
            {storeT("home")}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-sand/65">
            {isArabic ? policy.titleAr : policy.titleEn}
          </span>
        </nav>

        <h1 className="font-secondary text-[clamp(1.9rem,3.5vw,3rem)] leading-[1.15] text-gold">
          {isArabic ? policy.titleAr : policy.titleEn}
        </h1>
        <p className="mt-4 font-primary text-base leading-loose text-sand/60">
          {isArabic ? policy.introAr : policy.introEn}
        </p>

        <div className="mt-12 space-y-10">
          {policy.sections.map((section) => (
            <section key={section.headingAr}>
              <h2 className="font-primary text-xl text-sand">
                {isArabic ? section.headingAr : section.headingEn}
              </h2>
              <div className="mt-3 space-y-3">
                {(isArabic ? section.bodyAr : section.bodyEn).map(
                  (paragraph) => (
                    <p
                      key={paragraph.slice(0, 32)}
                      className="font-primary text-sm leading-loose text-sand/55"
                    >
                      {paragraph}
                    </p>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 border-t border-sand/10 pt-8">
          <Link
            href="/products"
            className="inline-flex items-center border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold hover:text-royal-navy"
          >
            {t("backToStore")}
          </Link>
        </div>
      </div>
    </main>
  )
}
