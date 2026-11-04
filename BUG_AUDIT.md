# 3WEEQ — تقرير التدقيق الشامل للأخطاء المخفية

> أُنشئ أثناء جلسة تدقيق مستقلة (المالك خارج المنزل). يوثّق كل خطأ خفي تم العثور عليه وإصلاحه، وكل ما تم التحقق منه، وما تبقى للاختبار.
> آخر تحديث: 2026-11-02.

---

## ١. الأخطاء المكتشفة والمُصلحة (هذه الجلسة)

كلها من نفس الفئة: **تعارض بين الكود ومخطط قاعدة البيانات** — لا تظهر إلا عند تشغيل مسار معيّن فعلياً.

| # | الخطأ | الأثر | الإصلاح |
|---|---|---|---|
| 1 | **Webhook Stripe يرجع 401 دائماً** — الـ raw body ما كان محفوظاً، فالتوقيع يتفقد على `JSON.stringify(body)` بدل البايتات الأصلية | الدفع لا يُعتمد من الـ webhook، والطلبات تبقى "pending" | `middlewares.ts`: استبدال `express.raw` بـ `bodyParser: { preserveRawBody: true }` |
| 2 | **`ops.idempotency_key` ينقصه عمود `last_error`** — الكود يكتبه (`beginIdempotency`/`failIdempotency`) لكن المهاجرة 0005 ما أنشأته | أي فشل بـ `checkout/complete` يحاول `failIdempotency` → يرمي 500 "last_error does not exist" ويحجب الخطأ الحقيقي | `Migration…0008`: `add column last_error` |
| 3 | **`engagement.newsletter_subscriber` ينقصه عمود `metadata`** — الجدول أُنشئ في المهاجرة 0003 (بلا metadata)، وتعريف 0007 (الذي يتضمنه) لا يعمل لأن الجدول موجود | الاشتراك بالنشرة يرمي 500 "metadata does not exist" | `Migration…0009`: `add column metadata` |

**إصلاح داعم:** `medusa-fetch.ts` — المهلة 8 ثوانٍ كانت مطبقة على كل الطلبات (ومنها `checkout/complete` الطويل) → صارت للمطالعات (GET) فقط، والعمليات (POST/PATCH/DELETE) بلا مهلة.

---

## ٢. ما تم التحقق منه (سليم — بلا أخطاء)

تمت مقارنة **كل استعلام SQL خام** في `repository.ts` و`admin-service.ts` ضد أعمدة المهاجرات 0001–0007:

| الجدول | الحالة |
|---|---|
| `catalog.media_asset` (storage_key/url/mime/blurhash/focal) | ✅ |
| `ops.audit_log` (actor/action/entity/before/after) | ✅ |
| `commerce.order_profile` + `order_item_profile` | ✅ |
| `catalog.serial_unit` (reserve/assign/release) | ✅ |
| `engagement.drop_allocation` (reserve/release) | ✅ |
| `catalog.product_profile` (بما فيه `max_per_customer` من 0006) | ✅ |
| `catalog.variant_profile` / `product_translation` / `product_media` | ✅ |
| `ops.webhook_event` / `ops.outbox_event` (عندهما `last_error` أصلاً) | ✅ |
| `order` + `order_item` + `order_line_item` (عدّ المشتريات) | ✅ (أُصلح سابقاً) |

---

## ٣. التحقق الجاري (النتائج)

| الفحص | النتيجة |
|---|---|
| `cd medusa && npx tsc --noEmit` | ✅ صفر أخطاء |
| `npx medusa build` | ✅ Backend + Frontend |
| `npm run typecheck` | ✅ |
| `npm test` | ✅ 19/19 |

---

## ٤. ما تبقى للاختبار الفعلي (بعد النشر)

لا يمكن اختباره محلياً (يتطلب السيرفر + Stripe + متصفح). **يجب تشغيله عند عودة المالك:**

| # | السيناريو | ماذا نتحقق |
|---|---|---|
| 1 | شراء كامل (كرت 4242) | الـ webhook يرجع **200** (مش 401)، الإتمام يرجع 200، الطلب يصير "completed" |
| 2 | الاشتراك بالنشرة | لا 500 — صف يُنشأ بـ `metadata` |
| 3 | فشل إتمام (متعمّد) | `failIdempotency` يعمل ويرجع رسالة الخطأ الحقيقية (مش 500 مبهم) |
| 4 | إضافة منتج/متغير/صورة من الاستوديو | لا أخطاء أعمدة |
| 5 | طلب بمنتج مسلسل (RAFID) | حجز/بيع الأرقام التسلسلية صحيح |

---

## ٥. ملاحظات مهمة (غير أخطاء، لكن للمتابعة)

1. **صور منتج RAFID** تشير لـ `localhost:9000/static/...` (من رفع قديم) — تحتاج إعادة رفع من الاستوديو.
2. **`newsletter_subscriber` معرّف مرتين** (0003 و0007) بتعريفين مختلفين — الـ 0007 لا يعمل أبداً (الجدول موجود). لا ضرر وظيفي بعد إضافة `metadata`، لكن يُنصح لاحقاً بحذف التعريف المكرر من 0003 لتجنب اللبس.
3. **سعر الشحن** 30/50 أُضيفا عبر SQL (الواجهة لا تُظهر حقل السعر في هذا الإصدار).
4. **`pm2 startup` / `ufw` / cron النسخ الاحتياطي** — موثّقة لكن لم يُؤكد تشغيلها (راجع `HANDOVER_ACCEPTANCE.md` قسم د).

---

## ٦. خطوات النشر المطلوبة (عند عودة المالك)

```powershell
# جهاز المالك
git add medusa/src/api/middlewares.ts src/shared/lib/medusa-fetch.ts \
        medusa/src/modules/threeweeq/migrations/Migration20260101000008.ts \
        medusa/src/modules/threeweeq/migrations/Migration20260101000009.ts
git commit -m "fix: preserve webhook raw body + add missing last_error and newsletter metadata columns"
git push
```

```bash
# السيرفر (نشر كامل — يطبّق المهاجرات 0008/0009 تلقائياً)
cd /var/www/threeweeq && ./deploy/deploy.sh
```

ثم إعادة اختبار السيناريوهات في القسم ٤.
