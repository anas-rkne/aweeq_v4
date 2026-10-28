# تقرير تطبيق مهارة Anime.js v4 على 3WEEQ

**نوع المستند:** دراسة تقنية + خطة تطبيق (قرار، لا كود)
**المشروع:** 3WEEQ — Next.js 16 / React 19 / Tailwind v4
**محرّك الحركة الحالي:** GSAP 3.15 + ScrollTrigger + Lenis 1.3
**مصدر المهارة:** `.opencode/skills/animejs/` (SKILL.md + references/api-reference.md + references/examples.md)
**المرجع الملزم للهوية والحركة:** `PRODUCT.md` + `MOTION_PLAN.md`
**التاريخ:** 2026-10-27

---

## 1. الملخّص التنفيذي

مهارة Anime.js تعلّم مكتبة حركة JavaScript خفيفة (v4) تغطّي: `animate`, `createTimeline`, `stagger`, `onScroll`, `createDraggable`, `createAnimatable`, `createLayout` (FLIP), `createScope` (تكامل React)، أدوات SVG (`morphTo`, `createDrawable`, `createMotionPath`)، وتقسيم النص (`splitText`)، ونظام easing (منها `createSpring`).

المشروع حالياً يملك **نظام حركة ناضج ومكتوب بالكامل في GSAP + Lenis**، مع دستور هوية صارم في `MOTION_PLAN.md` يمنع صراحةً:

> «No second scroll library, **no new animation dependency**.» — [`MOTION_PLAN.md`, Part I]

**التوصية الأساسية:** لا نضيف Anime.js كمحرّك ثانٍ فوق GSAP. الأفضل أن نتعامل مع المهارة كـ**مرجع تقنيات** وننفّذ ما ينقص داخل GSAP (التبعية الموجودة أصلاً) — وهذا يحقق الهدف (نفس التأثيرات) دون خرق دستور الهوية ودون ~24.5KB إضافية وطبقة حركة ثانية.

إذا أراد المالك اعتماد Anime.js فعلياً، فهناك مسار بديل محدود (جزيرة micro-interactions فقط) موضّح في §4، لكنه يحتاج قراراً صريحاً بتجاوز Part I.

---

## 2. ما الذي تعلّمته من المهارة (خريطة القدرات)

| القدرة | الـ API | ملاحظة |
|---|---|---|
| حركة على CSS/Transform/SVG/Objects | `animate()` | يطابق `gsap.to/from` |
| تسلسل زمني | `createTimeline()` | يطابق `gsap.timeline` (بدون وظيفة pin) |
| توزيع تأخير | `stagger()` | يطابق `gsap stagger` |
| حركة مبنية على التمرير | `onScroll()` | **محرّك تمرير خاص** ← يتعارض مع Lenis/ScrollTrigger |
| سحب وإفلات فيزيائي | `createDraggable()` | يعتمد على الزنبرك |
| خصائص تفاعلية | `createAnimatable()` | بديل جزئي لـ `quickTo` |
| انتقال تخطيط تلقائي (FLIP) | `createLayout()` | **مجاني** (عكس GSAP Flip المدفوع) |
| تكامل React + media queries | `createScope()` | يطابق `useGSAP`/`gsap.context` |
| رسم SVG | `createDrawable()` | يطابق `stroke-dashoffset` يدوياً في GSAP |
| تحويل أشكال SVG | `morphTo()` | لا يوجد في GSAP المجاني |
| مسار حركة | `createMotionPath()` | يطابق MotionPathPlugin (مدفوع) |
| تقسيم النص | `splitText()` | خطير على العربية (يجب lines فقط) |
| زنبرك | `createSpring()` | **ممنوع دستورياً** |
| Easing | `cubicBezier`, line-bezier | يطابق `ease-out-expo` |
| أدوات رياضية | `clamp, lerp, mapRange, snap, damp` | بديل مساعدات صغيرة |
| محرّك عام | `engine.fps/speed` | لا يوجد مكافئ مباشر |

---

## 3. الوضع الحالي للمشروع (مُتحقَّق من الكود)

**التوكنز الحيّة** (`src/app/globals.css` — هي المصدر الفعلي، وليست قيم `PRODUCT.md` القديمة):
- `royal-navy #0a1628` · `gold #cd9e61` · `sand #f6e6d6` · `olive #b8a9be` · `sky #3b96da` · `navy-975…800`
- الخطوط: `Lyon Arabic Display` (primary) + `Ador Hairline` (secondary)
- `--ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1)`

**ما هو منفَّذ فعلاً بالحركة:**
- Lenis مزامَن مع `gsap.ticker` و`ScrollTrigger` (hero→about→portal→first-chapter→featured→packaging→civilizations).
- تسلسلات pin + scrub (About, Featured, Civilizations, Portal, FirstChapter).
- parallax المؤشر في Hero عبر `gsap.quickTo`.
- `.cta-sheen` (لمعة الزر)، `hero-rise` (دخول)، `scroll-cue`.
- قائمة الموبايل: `gsap.timeline` للدخول.
- Cart drawer + Search modal: انتقالات CSS.
- `prefers-reduced-motion` محترم في 11 ملف.

**ما ينقص (مذكور في `MOTION_PLAN.md` ولم يُنفَّذ):** أزرار مغناطيسية، tilt للبطاقات، مؤشر مخصص، Prologue، كشف نصوص بقناع (mask)، خطوط/hairlines أفقية للأقسام، rails، micro-interactions الفورم، نبضة شارة السلة، رسم SVG.

---

## 4. التعارض الجوهري وخيارات القرار

`MOTION_PLAN.md` Part I يمنع تبعية حركة جديدة. لذلك:

| الخيار | الوصف | الأثر | التقييم |
|---|---|---|---|
| **A — مرجع تقنيات (موصى به)** | نستخدم ما تعلّمناه من المهارة لكن ننفّذه داخل GSAP الموجود | 0KB إضافية · يحترم الدستور · لا طبقة ثانية | ✅ الأفضل |
| **B — جزيرة Anime.js معزولة** | Anime.js فقط للـ micro-interactions غير المرتبطة بالتمرير (drawer, badge, form, layout FLIP للسلة) | ~15–25KB gzip · محرّكان · قرار صريح بتجاوز Part I | ⚠️ ممكن بشرط |
| **C — ترحيل كامل إلى Anime.js** | استبدال GSAP/ScrollTrigger | فقدان pin/scrub المتقدّم · مخاطرة عالية · يعيد 11–15 يوم عمل | ❌ مرفوض |

**القرار المطلوب من المالك:** هل نلتزم بـ A، أم نسمح بـ B؟ (التقرير مبني على A افتراضياً، مع خريطة B جاهزة).

نقطة مهمة: `createLayout()` (FLIP) هو الشيء الوحيد الذي يقدّمه Anime.js مجاناً ولا يوجد مكافئ مجاني جاهز في GSAP (Flip مدفوع). لكن حتى هو قابل للتنفيذ يدوياً أو بـ CSS عند الحاجة.

---

## 5. خريطة التطبيق قسم بقسم (متوافقة مع الهوية)

> كل القيم أدناه مشتقة من توكنز `MOTION_PLAN.md`: easing = `cubic-bezier(0.22,1,0.36,1)` (= `expo.out`)، مدد 280/800/1200ms، حركة فقط على transform/opacity/clip-path.

| القسم/العنصر | تقنية Anime.js ذات الصلة | التطبيق المقترح (بروح الهوية) | القرار |
|---|---|---|---|
| الكشف عند الدخول (تسلسل الأقسام) | `onScroll` / `animate` | **لا نستخدم `onScroll`** (يتعارض مع Lenis). نستخدم `IntersectionObserver` الحالي + `ease-out-expo`, 800ms, رفع 12px, stagger 50–70ms | A |
| كشف النصوص (mask) | `splitText` (lines) | تقسيم **سطور فقط** (لا حروف/كلمات عربية). السطر داخل `overflow:clip` بـ `translateY(110%→0)`, 900ms | A |
| Hero prelude (Prologue) | `createTimeline` | تسلسل Wordmark + curtain بمدد 700/1100ms, `power4.inOut` (مذكور في Part E) | A |
| البطاقات (ميل) | `animate` + `createAnimatable` | tilt 3° عبر `gsap.quickTo` (الموجود) — لا Anime | A |
| زر CTA (مغناطيس) | `createAnimatable` | مغناطيسية ≤6px عبر `quickTo` + `.cta-sheen` الموجود | A |
| شارة السلة | `animate` | `scale 1→1.12→1` 400ms عند تغيّر العدد (CSS/GSAP) | A |
| رسم الهيرلاينات/الـ rails | `createDrawable` | `stroke-dashoffset` يدوياً في GSAP (Part J.3) — يعطي نفس النتيجة | A |
| مؤشر مخصص | `createAnimatable` | نقطة 8px + حلقة 34px بتأخير 120ms (Part B.5) | A |
| Cart drawer/list إعادة ترتيب | `createLayout` (FLIP) | **المرشّح الوحيد لـ Anime.js**: انتقال صفوف السلة عند تغيير الكمية | B (اختياري) |
| Newsletter success | `createTimeline` | خط ذهبي يُرسم + رسالة rise 8px (Part B.6) | A |
| Civilizations CTA | `animate` | sheen + سهم 3px (نفس الزر) | A |
| SVG morph (لو احتجناه) | `morphTo` | لا يوجد استخدام حالي؛ لو ظهر رسم SVG متحوّل، هو الوحيد بلا مكافئ GSAP مجاني | B |
| الزنبرك (`createSpring`) | `createSpring` | **ممنوع** — «no spring/bounce/elastic» | ❌ |

**خلاصة:** ~90% من قدرات المهارة لها مكافئ في GSAP، و3 تقنيات فقط لها قيمة إضافية إن اعتمدنا Anime.js: `createLayout` (FLIP)، `morphTo`، و`createAnimatable`. أي أن قيمة التبعية الجديدة محدودة جداً مقابل تكلفتها.

---

## 6. ما يجب ألا تُستخدم فيه المهارة (حرّاس الهوية)

هذه مذكورة صراحةً في `MOTION_PLAN.md` Part I + Part A:
- ❌ `onScroll` كمحرّك تمرير بديل (محرّكان للتمرير = تعارض).
- ❌ `createSpring` / bounce / elastic / `back.out` (تقرأ «مرِحة» لا «فاخرة»).
- ❌ `splitText` على حروف/كلمات عربية (تكسر وصل الحروف).
- ❌ `createDraggable` للعناصر الترويجية (سحب/إفلات يقرأ لعِباً).
- ❌ Marquee / typewriter / particles / shader / parallax على نص عربي.
- ❌ أنيميشن على `width/height/top/left/margin/filter/box-shadow` على أسطح كبيرة.
- ❌ تصاعد حركة جديدة تتجاوز «همكة واحدة لكل لحظة» و«لون ذهبي واحد لكل شاشة».

---

## 7. قيود العربية و RTL والوصولية (تُطبَّق على أي تقنية)

- لا `letter-spacing` على العربية أبداً.
- الكشف = **قناع سطر** فقط، لا تقسيم حروف.
- RTL: `transform-origin: inline-start` لا `left`؛ لا `scaleX(-1)` على أي مجموعة تحتوي أيقونات/نص؛ الهيرلاينات تبدأ من الحافة اليمنى في العربية.
- `prefers-reduced-motion: reduce`: لا Parallax/No pin/No mask، المحتوى ظاهر فوراً، والمدة = انتقال لون 120ms فقط.
- كل عنصر تفاعلي له `:focus-visible` مرئي؛ المؤشر المخصص لا يغطي العنصر المركّز.
- أهداف اللمس ≥ 44×44px.

---

## 8. الأداء والحزمة

- Anime.js كامل ≈ **24.5KB gzip**؛ الوحدات المفردة (Timeline ≈ 5.6KB، Drawable/Scroll ≈ 4KB).
- المشروع يحافظ على **~0KB إضافية** باختيار A. أي اعتماد لـ B يعيدنا لقياس ميزانية `BASELINE.md` (`Initial JS Marketing < 180KB gzip`).
- الشروط المُلزمة (Part F): animate فقط `transform/opacity/clip-path/scale`، `will-change` مؤقت فقط، لا `setState` في إطار التمرير، `ticker` واحد فقط (المستخدم أصلاً).
- ميزانية التمرير/الرسم: ≤20 مسار SVG لكل شاشة، ≤3 طبقات parallax لكل قسم.

---

## 9. خطة تنفيذ مرحلية (وفق MOTION_PLAN، مع مرجع المهارة)

| المرحلة | النطاق | يستهلك من المهارة | معيار الخروج |
|---|---|---|---|
| **M0 — أسس** | `src/shared/motion/tokens.ts` (easings/مدد/مسافات)، تسجيل GSAP مرة واحدة، hook موحّد للـ reduced-motion | مفهوم `defaults` في `createTimeline`/`createScope` | typecheck/lint/build أخضر، بلا تغيير بصري |
| **M1 — Micro** | زر مغناطيسي، underline من المركز، press states، فورم، نبضة الشارة | `animate` + `createAnimatable` (مفهومياً) | كل تفاعل ≤300ms، الكيبورد سليم |
| **M2 — Text** | Hero line-mask، عناوين الأقسام، فقرات | `splitText` (lines فقط) — يُنفّذ في GSAP | عربي سليم عند 390/1024/1440 |
| **M3 — Scroll** | مزامنة نص RAFID مع الـ scrub، parallax Packaging، rails، Portal anticipation | `onScroll` — **يُستبدل** بـ ScrollTrigger | pins الحالية دون تغيير، لا مستمع scroll جديد |
| **M4 — Prologue** | Wordmark + curtain + حرّاس الجلسة/reduced-motion | `createTimeline` | يعمل مرة/جلسة، Lenis stop/start مُتحقَّق |
| **M5 — QA** | مصفوفة reduced-motion، كيبورد/قارئ شاشة، 4G/أندرويد ضعيف | — | كل معايير القبول |

**اختياري B (لو اعتُمد):** جزيرة `animejs` واحدة في `src/shared/motion/islands/` لـ `createLayout` في السلة + `morphTo`، محمّلة عبر `next/dynamic` (client-only) وبعد التفاعل، مع قياس الحزمة قبل/بعد.

---

## 10. معايير القبول (Acceptance)

1. **اختبار الصمت:** الصفحة هادئة بلا حلقات خاملة.
2. **اختبار الاستجابة:** كل hover/press/focus ≤300ms.
3. **اختبار العربية:** لا تقسيم حروف، لا tracking، لا كسر وصل عند أي عرض.
4. **اختبار reduced-motion:** المحتوى نفسه، بلا pins/spacers/cursor/prologue.
5. **اختبار التمرير:** التسلسلات المثبّتة تصل آخر الصفحة بلا «Lenis limit» قديم.
6. **اختبار الأداء:** 60fps لابتوب / ≥45fps جوال، INP <200ms.
7. **اختبار الميزانية:** مسار التسويق لا يزيد >15KB gzip من طبقة الحركة (بدون الإطارات الحالية). اعتماد Anime.js كامل يكسر هذه الميزانية.

---

## 11. المخاطر والقرارات المفتوحة

| # | البند | الأثر | القرار المطلوب |
|---|---|---|---|
| 1 | إضافة Anime.js كمحرّك ثانٍ | يخالف MOTION_PLAN Part I | التزام بـ A أم السماح بـ B؟ |
| 2 | `onScroll` مقابل Lenis | ازدواج تمرير/قفزات | ممنوع؛ ScrollTrigger فقط |
| 3 | `splitText` للعربية | كسر الحروف | lines فقط، أو لا |
| 4 | `createSpring` | يخالف «لا زنبرك» | ممنوع |
| 5 | حزمة ~24.5KB | تجاوز ميزانية JS | تحميل كسول (dynamic) لو B |

---

## 12. التوصية النهائية

**اعتمد المسار A:** المهارة تُستخدم كمرجع للمعرفة والتقنيات، ويُنفَّذ كل ما تحتاجه الهوية داخل GSAP/Lenis الموجود. هذا يحقق نفس النتيجة البصرية، يحترم دستور 3WEEQ (فخامة تاريخية، همسة بصرية، لا زنبرك، لا تبعية جديدة)، ويحافظ على ميزانية الأداء.

**إن أراد المالك اعتماد Anime.js فعلياً (B):** نحصره في جزيرة معزولة ومحمّلة كسولاً — وبالتحديد `createLayout` لإعادة ترتيب صفوف السلة و`morphTo` لأي SVG متحوّل مستقبلاً — مع قياس الحزمة والأداء قبل/بعد، وقرار صريح بتعديل Part I من `MOTION_PLAN.md`.
