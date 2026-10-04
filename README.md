# Media Catalog

واجهة عربية ثابتة على GitHub Pages لعرض وتنظيم كل الأقسام الموجودة حالياً في المستودع العام `SAMEHJA/live`.

## الأقسام

- **الأفلام:** من `movsameh.json`.
- **المسلسلات / السلاسل:** يتم تجميعها من حلقات `anisameh.json` حسب `series_name`.
- **حلقات الأنمي:** عرض كل حلقة بشكل مستقل.
- **Xtream:** إظهار ملفات إعداد Xtream الموجودة في المستودع كأقسام، بدون تحميل أو عرض أو استخدام بيانات `server / username / password`.
- **ملفات المصدر:** خريطة لملفات جذر المستودع ووظيفة كل ملف.

## الأعداد عند آخر فحص

- 1545 فيلم.
- 2865 حلقة أنمي.
- 174 سلسلة مجمعة.
- 6 ملفات إعداد Xtream.
- 9 ملفات في جذر المستودع.

الأعداد الفعلية للأفلام والحلقات والسلاسل تتحدث تلقائياً عند تحميل الموقع من ملفات JSON الحالية.

## الأمان

الموقع لا يجلب ملفات Xtream التي تحتوي بيانات اعتماد، ولا يعرض كلمات مرور أو أسماء مستخدمين. إذا أريد ربط Xtream فعلياً لاحقاً، استخدم بيانات اتصال تملكها أنت وخادماً خلفياً بدلاً من وضع الاعتمادات داخل JavaScript عام.

## المصادر

- Movies: `https://raw.githubusercontent.com/SAMEHJA/live/main/movsameh.json`
- Anime: `https://raw.githubusercontent.com/SAMEHJA/live/main/anisameh.json`
- Repository: `https://github.com/SAMEHJA/live`

## GitHub Pages

`https://3c5-o.github.io/media-catalog/`


## Provider API

تمت إضافة مزود API عام للقراءة داخل مجلد `/api`، جاهز للنشر على Vercel.

أهم المسارات بعد النشر:

- `GET /api` — معلومات المزود.
- `GET /api/health` — فحص المصدر.
- `GET /api/stats` — الإحصائيات.
- `GET /api/movies?page=1&limit=24` — الأفلام.
- `GET /api/series?page=1&limit=24` — السلاسل.
- `GET /api/anime?page=1&limit=24` — حلقات الأنمي.
- `GET /api/search?q=resident&type=all` — البحث.
- `GET /api/categories?type=movie` — التصنيفات.
- `GET /api/latest?type=movie&limit=20` — أول العناصر حسب ترتيب المصدر.

التفاصيل الكاملة موجودة في [API.md](./API.md).

> الـAPI يعيد روابط الفيديو الأصلية ولا يعيد استضافة ملفات الفيديو.
