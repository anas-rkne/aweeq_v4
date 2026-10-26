# خطة بناء استوديو المحتوى — 3WEEQ Catalog Studio

> **الهدف:** إدارة كتالوج 3WEEQ كاملاً من داخل Medusa Admin بدون SQL أو سكربتات.
> **المكان:** إضافة مخصصة (Medusa Admin Extension) داخل `medusa/src/admin` + Admin API في `medusa/src/api/admin`.
> **المرجع:** `PROJECT_AUDIT.md` (فجوة C4/Eدارة المحتوى) و`LAUNCH_PLAN.md` المرحلة 2.5.
> **القرارات المعتمدة:** العملة AED، السعر بوحدات أساسية، شحن الإمارات، الضريبة شاملة، تخزين الوسائط = Medusa File (محلي) الآن ثم S3/Cloudinary.

---

## 1. النطاق

### داخل النسخة الأولى (V1)

| الميزة | الوصف |
|---|---|
| قائمة المنتجات | بحث، فلترة حسب الحضارة/المجموعة/النوع/الحالة، صفحة/ترقيم |
| محرر المنتج | أساسي + AR + EN + التصنيف + الإصدار + الوسائط + SEO + نشر |
| إنشاء منتج كامل | ينشئ Medusa product + variants + أسعار AED + `product_profile` + الترجمات + `variant_profile` في عملية واحدة |
| الوسائط | رفع عبر Medusa File، أدوار (hero/gallery/detail/packaging/editorial/video)، ترتيب، alt عربي/إنجليزي، focal point |
| الأرقام التسلسلية | توليد `serial_unit` تلقائياً (1..edition_size)، معاينة قبل التوليد، عرض الحالة |
| الحضارات | إنشاء/تعديل + ترجمة AR/EN + لون + صورة hero + ترتيب |
| المجموعات | إنشاء/تعديل + ترجمة AR/EN + صورة hero + حالة + ترتيب |
| أنواع المنتجات | إنشاء/تعديل + تسمية AR/EN + تفعيل |
| قائمة التحقق قبل النشر | تمنع النشر الناقص برسالة واضحة |
| المعاينة | رابط مباشر للمنتج على الواجهة قبل النشر |

### خارج النطاق V1 (مؤجل)

- المجلة (`content.journal_post`) ونصوص التسويق.
- Drops وإدارة قوائم الانتظار (واجهة).
- التقييمات والولاء.
- إدارة الطلبات المخصصة (Medusa Admin يدير الطلبات الأساسية أصلاً).

---

## 2. العمارة

### 2.1 البنية الملفية

```
medusa/src/
  api/admin/threeweeq/
    products/route.ts               # GET list + POST create
    products/[id]/route.ts          # GET / PUT / DELETE / POST publish
    collections/route.ts            # GET + POST
    collections/[id]/route.ts       # GET / PUT / DELETE
    civilizations/route.ts          # GET + POST
    civilizations/[id]/route.ts     # GET / PUT / DELETE
    product-types/route.ts          # GET + POST
    media/route.ts                  # POST upload (Medusa File) + ربط بأدوار
    serials/route.ts                # POST generate + GET status
  admin/
    routes/catalog/page.tsx         # لوحة الاستوديو الرئيسية (قائمة المنتجات)
    routes/catalog/products/[id]/page.tsx  # محرر المنتج
    widgets/product-catalog.tsx     # widget يعرض حقول 3WEEQ في صفحة منتج Medusa
  lib/threeweeq/
    admin-service.ts                # منطق CRUD + تنسيق core flows مع الجداول المخصصة
    schemas.ts                      # zod schemas لكل الإدخالات
    serial-numbers.ts               # توليد الأرقام (idempotent)
```

### 2.2 الطبقات

1. **UI (React داخل Admin):** `@medusajs/ui` + `@tanstack/react-query` + fetch عبر `@medusajs/admin-sdk` لمسارات `/admin/threeweeq/*`.
2. **Admin API:** مسارات `src/api/admin` (محمية بمصادقة أدمن Medusa تلقائياً) تستقبل JSON وتستدعي `CatalogAdminService`.
3. **الخدمة:** `CatalogAdminService` يجمع:
   - `createProductsWorkflow` / `updateProductsWorkflow` (core) لإنشاء المنتج والفاريانتس والأسعار.
   - كتابة/تحديث جداول `catalog.*` عبر `ThreeweeqRepository` الموسّعة (بدون `joinRaw`/`leftJoinRaw` — knex 3).
   - توليد الأرقام التسلسلية.
   - تسجيل `ops.audit_log` لكل عملية (actor, action, entity, before/after).
4. **التخزين:** Medusa File module (محلي) للرفع؛ `media_asset.url` يُحفظ من استجابة الرفع.

### 2.3 التحقق

- `zod` في `schemas.ts` لكل body (عنوان إلزامي لكل لغة، handle صالح `[a-z0-9-]`، أسعار موجبة، edition_size > 0، أدوار وسائط معروفة).
- أخطاء 400 برسالة حقلية (اسم الحقل + السبب) تظهر في النموذج.

---

## 3. المخططات (Schemas)

| الكيان | الحقول |
|---|---|
| Product | handle, title AR/EN, subtitle, short/description, story, ingredients, ritual, seo_title/description, civilization_id, collection_id, product_type_id, is_limited, is_serialized, edition_size, max_per_customer, launch_at, hero_media_id, olfactory_pyramid {top,heart,base}, specifications, variants[] |
| Variant | title, sku, size_ml, concentration, packaging, price (AED), in_stock, is_serialized, edition_size |
| Media | file (upload), role, alt_ar, alt_en, focal_x/y, sort_order |
| Collection | handle, title/subtitle/description/story AR/EN, civilization_id, hero_media_id, status, sort_order, launch_at |
| Civilization | code, name/subtitle/description/story AR/EN, accent_color, hero_media_id, status, sort_order |
| Serial generation | variant_id, edition_size (عرض `count`) |

---

## 4. قواعد العمل الحرجة

1. **الترجمات إلزامية:** لا نشر بدون `ar` و`en` (الاستعلام في الواجهة INNER JOIN على لغة الصفحة — منتج بلغة واحدة يختفي من اللغة الأخرى).
2. **سلسلة النشر:** Medusa product `published` + في `3weeq Store` sales channel + `product_profile.status = active` + سعر AED + Variant واحد على الأقل + ترجمتان + صورة hero.
3. **الأسعار:** وحدات أساسية `850.00` AED — لا تحويل، لا قسمة على 100.
4. **الأرقام التسلسلية:** `edition_number` من 1 إلى `edition_size`، فريدة لكل variant، لا تتولد مرتين (idempotent)، ولا تقبل التقليل بعد البيع.
5. **Handle فريد** عبر Medusa core و`collection_profile.handle`.
6. **وسائط:** hero واحد فقط؛ gallery متعدد بترتيب؛ packaging/detail تظهر في قسم التغليف بصفحة المنتج.
7. **كل تعديل** يسجل في `ops.audit_log`.

---

## 5. الشاشات والتفاعلات

### 5.1 لوحة الاستوديو (Route: `/app/catalog`)

- جدول المنتجات: صورة مصغرة + عنوان AR/EN + حضارة + مجموعة + حالة + سعر + عدد قطع.
- فلاتر وبحث، زر "منتج جديد".
- أزرار: تعديل / معاينة / نشر / أرشفة.

### 5.2 محرر المنتج (Route: `/app/catalog/products/:id`)

تبويبات:
1. **أساسي:** handle، SKU لكل variant، الأسعار، المخزون (متاح/نفد).
2. **AR / EN:** كل الحقول النصية + SEO.
3. **التصنيف:** حضارة/مجموعة/نوع (قوائم منتهية، بدون إدخال IDs).
4. **الإصدار:** limited/serialized، edition_size، max_per_customer، launch_at.
5. **الهرم العطري:** top/heart/base (إضافة/حذف/ترتيب).
6. **الوسائط:** رفع + تعيين دور + ترتيب + alt لكل لغة + focal.
7. **النشر:** قائمة تحقق + زر نشر/إلغاء + رابط معاينة.

### 5.3 إدارة الحضارات والمجموعات والأنواع

- نفس نمط الجدول + النموذج ثنائي اللغة + صورة hero + حالة/ترتيب.

### 5.4 الأرقام التسلسلية

- في محرر المنتج (variant مرقّم): عرض "تم توليد X من Y".
- زر "توليد" يعرض معاينة (مثال أول 5 أرقام) ثم تأكيد.
- منع التوليد المكرر، وتنبيه إذا كان الإصدار مباعاً.

### 5.5 Widget في صفحة منتج Medusa

- يعرض ملخص 3WEEQ (حضارة/مجموعة/إصدار/حالة النشر) مع زر "فتح في الاستوديو".

---

## 6. مسارات الـ Admin API

| Method | Path | الوصف |
|---|---|---|
| GET | `/admin/threeweeq/products` | قائمة + فلاتر + pagination |
| POST | `/admin/threeweeq/products` | إنشاء كامل (core + مخصص) |
| GET/PUT/DELETE | `/admin/threeweeq/products/:id` | تفاصيل/تعديل/حذف (soft) |
| POST | `/admin/threeweeq/products/:id/publish` | فحص checklist ثم نشر |
| GET/POST | `/admin/threeweeq/collections` | قائمة/إنشاء |
| GET/PUT/DELETE | `/admin/threeweeq/collections/:id` | تعديل/حذف |
| GET/POST | `/admin/threeweeq/civilizations` | قائمة/إنشاء |
| GET/PUT/DELETE | `/admin/threeweeq/civilizations/:id` | تعديل/حذف |
| GET/POST | `/admin/threeweeq/product-types` | قائمة/إنشاء |
| POST | `/admin/threeweeq/media` | رفع + إنشاء `media_asset` |
| POST | `/admin/threeweeq/serials/generate` | توليد أرقام |
| GET | `/admin/threeweeq/serials/:variantId` | حالة الأرقام |

> المصادقة: مسارات `src/api/admin` محمية بمصادقة أدمن Medusa (نتحقق من `admin-sdk` عند التنفيذ، وإن لزم نضيف middleware صريحة).

---

## 7. تفاصيل الإنشاء الكامل للمنتج (POST products)

1. تحقق zod.
2. `createProductsWorkflow`: عنوان أساسي + handle + variants (sku, title, options) + أسعار AED + sales channel + status `draft` + thumbnail إن رفعت.
3. `upsert` في:
   - `catalog.product_profile` (civilization/collection/type, flags, edition, launch, hero_media_id, pyramid, specs, status `draft`).
   - `catalog.product_translation` (ar/en كاملتين).
   - `catalog.variant_profile` لكل variant.
   - `catalog.media_asset` + `catalog.product_media` إن رفعت صور.
4. تعويض على الفشل: حذف الـ core product (compensation) + تسجيل `audit_log`.
5. الاستجابة: `product` كاملاً بصيغة المحرر.

### النشر (publish)

- يعيد فحص الـ checklist (قسم 4) ويحدّث: core `status=published` + `product_profile.status=active`.
- يولّد الأرقام التسلسلية إن كان `is_serialized` ولم تولد.

---

## 8. الوسائط

- الرفع: Admin upload إلى Medusa File (محلي `/var/www/threeweeq/medusa/static/uploads`).
- `media_asset.url` = رابط `/static/uploads/...` الذي يرجعه Medusa (يُخدم من `api.3weeq.ae`).
- الأدوار: hero(1) / gallery(∞ بترتيب) / detail / packaging / editorial / video.
- alt_ar/alt_en إلزامي للـ hero.
- حجم مقبول: حتى 5MB، صيغ webp/jpg/png.
- لاحقاً: استبدال المزود بـ S3 بدون تغيير الواجهة (الروابط تُخزن في `media_asset`).

---

## 9. الأرقام التسلسلية

- `serial = RAFID-100-0001` (نمط قابل للتهيئة لكل variant).
- إدراج دفعات بمعاملات صغيرة (500 صف)، `onConflict ignore`.
- قيود فريدة موجودة: `(variant_id, edition_number)` و`(product_id, serial)`.
- لا تعديل بعد البيع؛ إبطال/إرجاع لاحقاً في V2.

---

## 10. الاختبار

| نوع | تغطية |
|---|---|
| Unit | `schemas.ts` (حالات فشل)، `serial-numbers.ts` (توليد/تكرار)، `admin-service` publish checklist |
| Integration | إنشاء منتج كامل → يظهر في `/store/threeweeq/products` بـ ar وen |
| E2E (Playwright) | إنشاء منتج من الاستوديو → الشراء → تأكيد الطلب |
| Regression | المنتج الحالي RAFID يبقى سليماً بعد الترقية |

---

## 11. المراحل الزمنية (تقدير: 6–9 أيام عمل)

| المرحلة | المدة | الناتج |
|---|---:|---|
| M1: الأساس | 1–2 يوم | مسارات list/get + repository موسّعة + zod + audit |
| M2: إنشاء/تعديل المنتج | 1–2 يوم | POST/PUT + core flows + compensation |
| M3: واجهة المنتج | 1–2 يوم | قائمة + محرر (تبويبات) + نشر checklist |
| M4: الوسائط | 1 يوم | رفع + أدوار + ترتيب + alt/focal |
| M5: الأرقام التسلسلية | 0.5–1 يوم | توليد + معاينة + حالة |
| M6: حضارات/مجموعات/أنواع | 1 يوم | محررات كاملة |
| M7: تثبيت واختبار | 1 يوم | E2E + توثيق + إصلاحات |

---

## 12. معايير القبول (Go / No-Go للاستوديو)

1. إنشاء منتج كامل من اللوحة (بدون SQL) يظهر في `/ar/products` و`/en/products` خلال 5 دقائق (بعد revalidate).
2. نشر منتج ناقص الترجمة/الصورة مرفوض برسالة تحدد الحقل.
3. الأرقام المسلسلة = edition_size بالضبط، وتوليد متكرر لا يكرر.
4. تعديل السعر/الوصف يظهر على الواجهة بدون إعادة نشر.
5. كل تعديل في `ops.audit_log`.
6. الأدوار والأدوار الإعلامية تنعكس صحيحاً (hero في البطاقة، packaging في قسم التغليف).
7. لا أي استدعاء `leftJoinRaw` أو طرق knex محذوفة جديدة.
8. واجهة تعمل بالعربية والإنجليزية.

---

## 13. المخاطر

- **API إضافات الأدمن في Medusa 2.22:** نتحقق من `@medusajs/admin-sdk` المثبت على السيرفر (route config/widgets) قبل كتابة الواجهة؛ إن اختلفت الواجهة، البديل: صفحات داخل Next محمية بسر (خطة بديلة B).
- **knex 3:** كل SQL جديد عبر `raw()` أو طرق builder الموجودة فقط.
- **Medusa File محلي:** حجم الرفع والنسخ الاحتياطي؛ الانتقال لـ S3 لاحقاً.
- **وقت البناء:** `medusa build` بطيء — نعتمد `medusa develop` للتطوير على staging.
- **Idempotency:** أي إنشاء يستخدم مفاتيح عشوائية فريدة و`onConflict ignore`.

---

## 14. خطة بديلة (B) إن تعذّرت إضافات الأدمن

إذا واجهة Medusa Admin صعّبت، ننفذ نفس الـ Admin API ثم نبني شاشات بسيطة داخل Next.js على `/ar/admin` محمية بـ `ADMIN_PASSWORD` (سر في env)، مع إعادة استخدام نفس الخدمة. الوظائف متطابقة، يختلف فقط مكان الواجهة.

---

## 15. ما يترتب على صاحب المشروع

- لا شيء فوري. عند الاكتمال: جولة استخدام مع إضافة منتج حقيقي جديد.
- قرار التخزين النهائي (S3) عند الإطلاق الكبير.
