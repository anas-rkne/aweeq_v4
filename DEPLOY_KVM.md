# نشر 3WEEQ على KVM 2 (Ubuntu 24.04)

> **الهدف:** نشر الحالة الحالية (فرع `launch/phase-0-baseline`) على VPS واحد، ثم إعادة نشر التغييرات بعد كل خطوة.
> **البنية:** Nginx → Next.js (3000) + Medusa (9000) → PostgreSQL محلي.
> **الافتراض:** KVM 2 = 2 vCPU / 8 GB RAM / Ubuntu 24.04. إذا كانت المواصفات مختلفة، راجع قسم الموارد.

---

## 0. قبل أي شيء

1. **لا تنشر من `main`.** فرع العمل الحالي هو `launch/phase-0-baseline` وليس مرفوعاً بعد.
2. ارفع الفرع إلى GitHub من جهازك:

```bash
git push -u origin launch/phase-0-baseline
```

3. جهّز الدومين:
   - `A` record لـ `example.com` و`www.example.com` إلى IP الخاص بـ KVM.
   - `A` record لـ `api.example.com` إلى نفس IP.
   - انتظر انتشار DNS قبل Certbot.

4. جهّز مفاتيح الدفع/النشرة عندما تصحى. النشر الحالي يعمل بدونها، لكن الدفع يبقى "قريباً".

---

## 1. تجهيز السيرفر

```bash
# كـ root
apt update && apt upgrade -y
apt install -y git nginx postgresql redis-server ufw certbot python3-certbot-nginx build-essential curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm i -g pm2
```

### مستخدم deploy

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /var/www/threeweeq
chown -R deploy:deploy /var/www/threeweeq
```

### SSH key (بدل كلمة المرور)

```bash
# على جهازك
ssh-copy-id deploy@SERVER_IP
```

### Swap (مهم للبناء على 8GB)

```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

### قاعدة البيانات

```bash
sudo -u postgres psql
```

```sql
CREATE USER threeweeq WITH PASSWORD 'ضع-كلمة-مرور-قوية';
CREATE DATABASE threeweeq OWNER threeweeq;
\q
```

PostgreSQL يستمع على localhost افتراضياً. لا تفتح المنفذ 5432 للخارج.

---

## 2. جلب المشروع

```bash
sudo -u deploy -i
cd /var/www/threeweeq
git clone -b launch/phase-0-baseline git@github.com:anas-rkne/aweeq_v4.git .
```

إذا الريبو خاص، أضف **Deploy Key** (قراءة فقط) من GitHub → Settings → Deploy keys، أو استخدم PAT.

> إذا clone إلى مجلد غير فارغ فشل، استخدم `git clone ... /tmp/threeweeq && cp -a /tmp/threeweeq/. /var/www/threeweeq/`.

---

## 3. متغيرات البيئة

### 3.1 الواجهة: `/var/www/threeweeq/.env.production`

```bash
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.example.com
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_ضع_المفتاح_هنا
NEXT_PUBLIC_SITE_NAME=3WEEQ
NEXT_PUBLIC_DEFAULT_CURRENCY=aed
NEXT_PUBLIC_DEFAULT_LOCALE=ar
NEXT_PUBLIC_DEFAULT_REGION=UAE

MEDUSA_BACKEND_URL=https://api.example.com
MEDUSA_PUBLISHABLE_KEY=pk_ضع_المفتاح_هنا
MEDUSA_WAITLIST_CIVILIZATION_ID=babylon
REVALIDATE_SECRET=ضع-سر-طويل-عشوائي
```

> `NEXT_PUBLIC_*` تُدمج وقت البناء. أي تغيير فيها يحتاج `npm run build` جديد.

### 3.2 Medusa: `/var/www/threeweeq/medusa/.env`

```bash
DATABASE_URL=postgres://threeweeq:ضع-كلمة-المرور@127.0.0.1:5432/threeweeq

STORE_CORS=https://example.com
ADMIN_CORS=https://api.example.com
AUTH_CORS=https://example.com,https://api.example.com

JWT_SECRET=ضع-سر-طويل-عشوائي
COOKIE_SECRET=ضع-سر-طويل-عشوائي

MEDUSA_BACKEND_URL=https://api.example.com
MEDUSA_STOREFRONT_URL=https://example.com
STOREFRONT_URL=https://example.com

STRIPE_SECRET_KEY=sk_test_ضع_المفتاح
STRIPE_WEBHOOK_SECRET=ضع_السر
STRIPE_BASE_URL=https://api.stripe.com/v1

TAP_SECRET_KEY=sk_test_ضع_المفتاح
TAP_WEBHOOK_SECRET=ضع_السر
TAP_BASE_URL=https://api.tap.company/v2
TAP_REDIRECT_URL=https://example.com/checkout/callback
```

> `STOREFRONT_URL` مهم قبل `seed`: البذرة تخزّن روابط الصور بناءً عليه. إذا غيّرته لاحقاً، أعد تشغيل `seed` لتحديث روابط الوسائط.

---

## 4. أول نشر (بالترتيب)

```bash
cd /var/www/threeweeq
npm ci
npm --prefix medusa ci

# 1) قاعدة البيانات
npm run medusa:migrate

# 2) البذرة (تنشئ المنطقة AED والمنتج RAFID والمفتاح)
npm run medusa:seed
```

**انسخ Publishable Key من مخرجات الـ seed** (سطر `Publishable key created: pk_...`)، وضعه في:
- `.env.production` → `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` و`MEDUSA_PUBLISHABLE_KEY`.

```bash
# 3) مستخدم الأدمن
cd medusa
npx medusa user -e admin@example.com -p 'كلمة-مرور-قوية'
cd ..

# 4) البناء
npm run build
npm run medusa:build

# 5) التشغيل
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

> **مهم:** قاعدة البيانات يجب أن تكون جديدة. النسخة القديمة التي تحتوي أسعار `85000` وSAR غير متوافقة مع تحويل AED/الوحدات الأساسية. لا تعِد استخدامها في الإنتاج.

### PM2 عند الإقلاع

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
sudo -u deploy pm2 save
```

---

## 5. Nginx وSSL

```bash
sudo cp deploy/nginx/threeweeq-web.conf /etc/nginx/sites-available/threeweeq-web
sudo cp deploy/nginx/threeweeq-api.conf /etc/nginx/sites-available/threeweeq-api

sudo sed -i 's/YOUR_DOMAIN/example.com/g' /etc/nginx/sites-available/threeweeq-web
sudo sed -i 's/API_DOMAIN/api.example.com/g' /etc/nginx/sites-available/threeweeq-api

sudo ln -s /etc/nginx/sites-available/threeweeq-web /etc/nginx/sites-enabled/threeweeq-web
sudo ln -s /etc/nginx/sites-available/threeweeq-api /etc/nginx/sites-enabled/threeweeq-api
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d example.com -d www.example.com -d api.example.com
```

---

## 6. التحقق

```bash
curl -I https://example.com/ar
curl -I https://example.com/en
curl -I https://api.example.com/health
curl -I https://api.example.com/app
curl -I https://example.com/robots.txt
curl -I https://example.com/sitemap.xml
```

ثم من المتصفح:
- `/ar` و`/en`.
- `/ar/products` — يجب أن يظهر RAFID (إن لم يظهر، راجع Medusa).
- `/ar/products/rafid`.
- `https://api.example.com/app` — لوحة Medusa.
- أضف للسلة (بدون دفع، زر الدفع ما زال "قريباً").

### أعطال شائعة

| العرض | السبب |
|---|---|
| 502 | التطبيق لا يعمل: `pm2 status` و`pm2 logs` |
| صفحة فارغة للمتجر | Medusa لا يعمل أو `NEXT_PUBLIC_MEDUSA_*` خاطئ |
| CORS | `STORE_CORS` / `AUTH_CORS` لا تطابق الدومين |
| صور مكسورة | `STOREFRONT_URL` وقت الـ seed أو `NEXT_PUBLIC_SITE_URL` وقت البناء |
| الأسعار خاطئة 100× | قاعدة بيانات قديمة أو لم يُعد البناء بعد تغيير العملة |
| خطأ مفتاح الدفع | مفتاح publishable غير موجود/قديم؛ أعد البناء |

---

## 7. النشر بعد كل خطوة عمل

من جهازك:

```bash
git add -A
git commit -m "..."
git push origin launch/phase-0-baseline
```

على السيرفر:

```bash
sudo -u deploy -i
cd /var/www/threeweeq
./deploy/deploy.sh launch/phase-0-baseline
```

السكربت يعمل: pull → npm ci → build → medusa build → migrations → pm2 reload → health check.

> إذا كان التغيير في `.env.production` فقط، أعد `npm run build` ثم `pm2 reload`، لأن متغيرات `NEXT_PUBLIC_*` تُدمج وقت البناء.

---

## 8. الرجوع (Rollback)

```bash
cd /var/www/threeweeq
git log --oneline -5
git checkout COMMIT_SHA
npm ci && npm --prefix medusa ci
npm run build && npm run medusa:build
pm2 reload deploy/ecosystem.config.cjs --update-env
```

- الـ migrations إلى الأمام فقط. إن كان التغيير خطيراً، استعد نسخة قاعدة البيانات.
- لا تحذف `.env.production` أو `medusa/.env`.

---

## 9. النسخ الاحتياطي

```bash
mkdir -p /var/backups/threeweeq
pg_dump -U threeweeq threeweeq | gzip > /var/backups/threeweeq/db-$(date +%F-%H%M).sql.gz
tar -czf /var/backups/threeweeq/env-$(date +%F).tar.gz /var/www/threeweeq/.env.production /var/www/threeweeq/medusa/.env
```

أضف cron يومي، واحتفظ بنسخة خارج السيرفر. إذا ستستخدم Medusa File للتخزين لاحقاً، أضف مجلد الرفع للنسخ.

---

## 10. الموارد على KVM 2

- 2 vCPU / 8 GB: كافية لـ Next + Medusa + PostgreSQL + Nginx.
- 4 GB swap ضرورية لبناء Next/Medusa.
- حدود PM2: web 900MB، api 1400MB.
- Next Image Optimizer يستهلك CPU عند أول طلب لكل صورة؛ مع 67MB أصول قد يبطؤ أول تحميل. راقب `pm2 monit`.
- PostgreSQL افتراضي كافٍ للبداية. إن زاد الحمل، فعّل Redis/ضبط الاتصالات لاحقاً.

---

## 11. حالة المشروع الحالية (مهم)

- **الدفع غير مفعّل:** صفحة checkout "قريباً" وزر الدفع معطّل. نشر الواجهة الآن لا يعني بيعاً حقيقياً.
- **النشرة البريدية:** في الإنتاج تفشل بأمان (503) حتى تضبط `MEDUSA_WAITLIST_CIVILIZATION_ID` أو ESP.
- **الصور:** تُخدم من `public/` عبر دومين الواجهة. رفع صور المنتجات الجديدة من لوحة الإدارة يحتاج استوديو المحتوى (لم يُبنَ بعد).
- **404:** Next يعيد 200 مع `noindex` للصفحات الديناميكية المتدفقة؛ هذا سلوك معروف، وليس انهياراً.
- **Next 16.4.3:** تم ترقية الإصدار لسد ثغرة أمنية حرجة. ثبّت هذه النسخة.
- **الفرع:** `launch/phase-0-baseline` يحتوي 6 commits (حتى الآن) ولم يُدمج في `main`.

---

## 12. ما أحتاجه منك للمرحلة التالية

1. دومين فعلي (أو subdomain) و`api` subdomain.
2. تأكيد أسعار RAFID بالدرهم: `850 / 1200 / 350`.
3. دول الشحن والضريبة.
4. مزود الدفع الأساسي ومفاتيح Test.
5. قرار تخزين الصور (S3/Cloudinary أم Medusa File).
6. بعدها: Phase 2 checkout ثم Phase 2.5 Content Studio.
