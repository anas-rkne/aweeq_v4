import Link from "next/link"
import { notFound } from "next/navigation"

type Policy = {
  slug: string
  title: string
  intro: string
  sections: Array<{ heading: string; body: string[] }>
}

const POLICIES: Policy[] = [
  {
    slug: "faq",
    title: "الأسئلة الشائعة",
    intro: "كل ما تحتاج معرفته قبل اقتناء قطعة من 3WEEQ.",
    sections: [
      {
        heading: "هل القطع محدودة فعلاً؟",
        body: [
          "نعم. كل إصدار يُنتج بعدد محدد ومرقّم، ولا يُعاد إنتاجه بعد نفاد الكمية. الرقم التسلسلي مذكور في بطاقة القطعة.",
        ],
      },
      {
        heading: "كيف أعرف أن القطعة أصلية؟",
        body: [
          "كل قطعة تحمل رقمًا تسلسليًا فريدًا وبطاقة أصالة موقّعة، ويمكن التحقق من الرقم عبر خدمة العملاء.",
        ],
      },
      {
        heading: "هل تتوفر عينات قبل الشراء؟",
        body: [
          "نوفّر مجموعات اكتشاف محدودة عند إطلاق كل مجموعة. تابع النشرة البريدية لمعرفة مواعيد الإطلاق.",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    title: "الشحن والتوصيل",
    intro: "نشحن إلى دول الخليج، ونعمل على التوسع تدريجيًا.",
    sections: [
      {
        heading: "مدة التوصيل",
        body: [
          "داخل المملكة: 2–4 أيام عمل. دول الخليج: 4–7 أيام عمل. قد تزيد المدة في مواسم الإطلاق المحدود.",
        ],
      },
      {
        heading: "التغليف",
        body: [
          "تُشحن كل قطعة في تغليف واقٍ يحفظ العطر من الحرارة والضوء، مع تأمين كامل ضد الكسر أثناء النقل.",
        ],
      },
      {
        heading: "تتبع الطلب",
        body: [
          "يصلك رقم تتبع عبر البريد الإلكتروني فور خروج الطلب من المستودع.",
        ],
      },
    ],
  },
  {
    slug: "returns",
    title: "الاسترجاع والاستبدال",
    intro: "رضاك شرط أساسي، مع مراعاة طبيعة منتجات العطور.",
    sections: [
      {
        heading: "مدة الاسترجاع",
        body: [
          "يمكن طلب الاسترجاع خلال 14 يومًا من الاستلام، بشرط أن يكون الغلاف الخارجي سليمًا ولم تُفتح قطعة العطر.",
        ],
      },
      {
        heading: "القطع المفتوحة",
        body: [
          "لأسباب صحية، لا يمكن استرجاع العطور المفتوحة أو المستخدمة، ما لم يكن هناك عيب في التصنيع.",
        ],
      },
      {
        heading: "القطع المحدودة",
        body: [
          "القطع المرقّمة قابلة للاستبدال فقط في حال وجود عيب تصنيعي، نظرًا لطبيعتها المحدودة.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "الشروط والأحكام",
    intro: "باستخدامك موقع 3WEEQ فإنك توافق على الشروط التالية.",
    sections: [
      {
        heading: "الاستخدام",
        body: [
          "يُخصص الموقع للاستخدام الشخصي غير التجاري. يُمنع إعادة بيع القطع المحدودة دون إذن كتابي.",
        ],
      },
      {
        heading: "الأسعار",
        body: [
          "جميع الأسعار بالريال السعودي وتشمل القيمة المضافة حيث ينطبق. قد تتغير الأسعار دون إشعار مسبق.",
        ],
      },
      {
        heading: "الملكية الفكرية",
        body: [
          "جميع النصوص والصور والتصاميم مملوكة لـ 3WEEQ ولا يجوز استخدامها دون إذن.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "سياسة الخصوصية",
    intro: "نحترم خصوصيتك ونستخدم بياناتك فقط لخدمتك.",
    sections: [
      {
        heading: "ما نجمعه",
        body: [
          "نجمع بريدك الإلكتروني عند الاشتراك في النشرة، وبيانات الشحن عند إتمام الطلب. لا نجمع بيانات دفع على موقعنا؛ تُعالج بأمان عبر مزوّد الدفع.",
        ],
      },
      {
        heading: "كيف نستخدمه",
        body: [
          "نستخدم بياناتك لتنفيذ الطلبات، وإرسال تحديثات الإصدارات إذا اشتركت، وتحسين تجربتك.",
        ],
      },
      {
        heading: "حقوقك",
        body: [
          "يمكنك طلب الاطلاع على بياناتك أو حذفها في أي وقت عبر التواصل معنا.",
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
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const policy = POLICIES.find((item) => item.slug === slug)

  if (!policy) {
    return { title: "السياسات | 3WEEQ" }
  }

  return { title: `${policy.title} | 3WEEQ`, description: policy.intro }
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const policy = POLICIES.find((item) => item.slug === slug)

  if (!policy) {
    notFound()
  }

  return (
    <main className="min-h-svh bg-royal-navy px-5 pb-24 pt-32 sm:px-8 md:px-16 lg:px-24">
      <div className="mx-auto max-w-3xl" dir="rtl">
        <nav
          aria-label="مسار التنقل"
          className="mb-10 flex items-center gap-2 font-primary text-xs text-sand/40"
        >
          <Link href="/" className="transition-colors hover:text-gold">
            الرئيسية
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-sand/65">{policy.title}</span>
        </nav>

        <h1 className="font-secondary text-[clamp(1.9rem,3.5vw,3rem)] leading-[1.15] text-gold">
          {policy.title}
        </h1>
        <p className="mt-4 font-primary text-base leading-loose text-sand/60">
          {policy.intro}
        </p>

        <div className="mt-12 space-y-10">
          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-primary text-xl text-sand">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className="font-primary text-sm leading-loose text-sand/55"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 border-t border-sand/10 pt-8">
          <Link
            href="/products"
            className="inline-flex items-center border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold hover:text-royal-navy"
          >
            العودة للمتجر
          </Link>
        </div>
      </div>
    </main>
  )
}
