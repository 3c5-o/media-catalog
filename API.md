# Media Catalog Provider API

مزود قراءة عام للأفلام والأنمي. الهدف أن التطبيق يستهلك بنية موحدة بدل التعامل مباشرة مع ملفات المصدر.

## Base URL

`https://media-catalog-navy.vercel.app`

## Movies Full API

`GET /movies-api?page=1&limit=24`

البحث والتصفية:

`GET /movies-api?q=Resident&genre=رعب`

تفاصيل فيلم كامل:

`GET /movies-api?id=movie_xxx`

قائمة الأفلام تعيد كل المعلومات المتوفرة في المصدر: العنوان، الصورة، التصنيف، رابط الفيديو، ومعلومات playback/source بصيغة موحدة.

عند طلب فيلم بـ `id`، يحاول المزود إضافة معلومات TMDb إذا كان `TMDB_API_TOKEN` أو `TMDB_API_KEY` مضبوطاً على Vercel. بدون المفتاح يبقى الفيلم صالحاً ويعاد بمعلومات المصدر فقط.

## Anime Catalog API

`GET /anime-api?page=1&limit=24`

كل نتيجة تمثل أنمي واحداً وليس حلقة.

تفاصيل أنمي كامل:

`GET /anime-api?id=anime_xxx`

التفاصيل ترجع:

`anime -> seasons -> episodes -> video`

وعند طلب التفاصيل يحاول المزود إضافة معلومات Jikan تلقائياً. يمكن تعطيل ذلك بـ `enrich=0`.

## Anime Episodes API

`GET /anime-episodes-api?page=1&limit=24`

للوصول المباشر للحلقات بدون التجميع.

## Compatibility

`GET /anime-series-api` يشير حالياً إلى Anime Catalog API للمحافظة على التوافق مع الروابط السابقة.

## Other endpoints

- `GET /api/search?q=resident&type=all`
- `GET /api/categories?type=movie`
- `GET /api/latest?type=movie&limit=20`
- `GET /api/stats`
- `GET /api/health`
- `GET /api`

## Pagination

الحد الأقصى لكل صفحة هو 100 عنصر.

## Notes

- CORS متاح للقراءة العامة.
- ملفات الفيديو لا تمر عبر Vercel ولا يعاد استضافتها؛ الـAPI يعيد رابط المصدر.
- المصدر الحالي لا يوفر وصفاً وسنة وتقييماً للأفلام، لذلك إثراء معلومات الأفلام يحتاج TMDb على السيرفر.
- يجب التأكد من حقوق استخدام المحتوى قبل توزيعه في تطبيق إنتاجي.
