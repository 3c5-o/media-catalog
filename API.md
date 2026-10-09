# Media Catalog Provider API v1

Base URL:

`https://media-catalog-navy.vercel.app/api/v1`

المسارات القديمة ما زالت تعمل للتوافق، لكن أي تطبيق جديد يُفضّل أن يعتمد `/api/v1`.

## Movies

قائمة الأفلام:

`GET /api/v1/movies?page=1&limit=24`

بحث وتصنيف:

`GET /api/v1/movies?q=Resident&genre=رعب`

تفاصيل بالمعرّف:

`GET /api/v1/movies/movie_xxx`

أو:

`GET /api/v1/movies?id=movie_xxx`

تفاصيل بالاسم الدقيق:

`GET /api/v1/movies?title=The%20End%20of%20Oak%20Street`

التفاصيل تجمع بيانات المصدر مع TMDb. المطابقة لا تعتمد أول نتيجة فقط؛ يتم تقييم العنوان والعنوان الأصلي والسنة إن كانت موجودة في اسم المصدر، وتظهر نتيجة المطابقة في `metadata.match`.

### مرشحات مصادر الفيديو البديلة

تفاصيل الفيلم في `GET /api/v1/movies/:id?enrich=0` تحتوي `data.source_candidates`، وهي روابط إضافية من **ملفات المصدر نفسها** لأفلام ذات عنوان مطابق وبوستر أو تصنيف متوافق. لا يتم دمج سجلات الأفلام أو استبدال معرّفاتها القديمة.

**تنبيه:** مصادر `source_candidates` غير مفحوصة عند طلب التفاصيل، ولهذا يكون `playback_verified:false` و`status:not_checked`. تشابه العنوان والتصنيف لا يكفي لضمان تطابق محتوى الملفين.

لفحص حتى 4 مرشحات:

`GET /api/v1/media-health?type=movie&id=movie_xxx&alternates=1&fresh=1`

النتيجة تعرض `candidates[].health`، وتعيد `playable_candidate_id` فقط لمصدر اجتاز فحص البايتات الأولية (ويشمل أول مقطع HLS عند وجوده). يبقى `verified_full_playback:false` دائماً، لذلك **لا تُحدّث رابط الإنتاج ولا تنشر المصدر تلقائياً** اعتماداً على هذا الفحص وحده.

### تحديد مصدر تشغيل صالح مبدئياً

`GET /api/v1/playback?type=movie&id=movie_xxx&platform=web`

`GET /api/v1/playback?type=episode&id=episode_xxx&platform=web`

هذه الواجهة **لا تستضيف الفيديو ولا تغيّر المصدر الأصلي**. تفحص حتى أربعة مصادر محتملة للفيلم، أو المصدر الوحيد للحلقة، وتعيد:

- `available=true` و`selected.url` إذا اجتاز أحد المصادر فحص البايتات الأولية وتوافق صيغة المتصفح؛ يتم فحص أول مقطع HLS أيضاً.
- `available=false` و`selected=null` عندما لا يوجد أي مصدر اجتاز الفحص، بدلاً من تقديم رابط معطّل على أنه صالح.
- `candidates[]` تشخيصات للأسباب، لكن بدون روابط مصادر فاشلة، و`verified_full_playback=false` في الحالتين.
- `fresh=1` لتجاوز التخزين المؤقت للفحص، دون التأثير على المصدر الأصلي.
- استجابات فحص التشغيل الحديثة تُرسل مع `Cache-Control: no-store` حتى لا تتخزن نتائج جاهزية قديمة.

**هذه نتيجة ترشيح فقط، وليست ضمان مشاهدة الفيديو كاملاً أو توافق الصوت والترميز.** للأنمي MKV/TS لا يُعطى رابط على أنه صالح للمتصفح دون معالج تشغيل مناسب. لا تعتمد هذا المسار لتعديل قاعدة CINARO بشكل دائم قبل تجربة الملف على المتصفح والهاتف.

## Anime

قائمة الأنمي:

`GET /api/v1/anime?page=1&limit=24`

بحث:

`GET /api/v1/anime?q=KINGDOM`

تفاصيل أنمي كامل:

`GET /api/v1/anime/anime_xxx`

أو:

`GET /api/v1/anime?id=anime_xxx`

البنية:

`anime -> seasons -> episodes -> playback`

معلومات Jikan تُضاف عند طلب التفاصيل. المطابقة تقارن العناوين الأساسية والإنجليزية واليابانية والبديلة قبل اختيار النتيجة، وتظهر الثقة في `metadata.match.confidence`.

لتعطيل الإثراء الخارجي في التفاصيل:

`?enrich=0`

## Anime Episodes

`GET /api/v1/anime/episodes?page=1&limit=24`

تفاصيل حلقة:

`GET /api/v1/anime/episodes/episode_xxx`

## Search

`GET /api/v1/search?q=KINGDOM&type=all`

الأنواع:

- `all`
- `movie`
- `anime`
- `episode`

## Categories

`GET /api/v1/categories?type=movie`

أو:

`GET /api/v1/categories?type=anime`

## Latest

`GET /api/v1/latest?type=movie&limit=20`

ملاحظة: المصدر لا يوفر تاريخ إضافة موثوقاً، لذلك الترتيب هو `source_order` وليس ضماناً للأحدث زمنياً.

## Stats

`GET /api/v1/stats`

## Health

`GET /api/v1/health`

## Pagination

- `page`: يبدأ من 1
- `limit`: من 1 إلى 100

## Compatibility aliases

هذه الروابط باقية:

- `/movies-api`
- `/anime-api`
- `/anime-episodes-api`
- `/anime-series-api`

## Notes

- CORS مفتوح للقراءة العامة.
- كل الاستجابات ترسل Header باسم `X-API-Version: v1`.
- الفيديو لا يمر عبر Vercel ولا يعاد استضافته؛ يرجع المزود رابط المصدر.
- TMDb مستخدم لمعلومات الأفلام، وJikan لمعلومات الأنمي.
- إذا فشل مزود المعلومات الخارجي، تبقى بيانات المصدر وروابط التشغيل متاحة.


## Formats

`GET /api/v1/formats`

يعرض توزيع صيغ الفيديو ومستوى توافق المتصفح لكل نوع محتوى.

قيم `browser_support` داخل `playback`:

- `native`: MP4/WebM/Ogg — مناسب لمشغل HTML5 مباشرة.
- `hls`: M3U8 — يحتاج HLS native أو hls.js حسب المتصفح.
- `limited`: MKV/TS — دعم المتصفح محدود، وقد يحتاج مشغل خارجي أو transcoding/transmux.
- `unknown`: صيغة غير معروفة.

## Media Link Health

`GET /api/v1/media-health?type=movie&id=movie_xxx`

أو:

`GET /api/v1/media-health?type=episode&id=episode_xxx`

الفحص يقبل فقط IDs موجودة في الكتالوج ولا يقبل URL عشوائي. يستخدم Range GET لقراءة أول 1KB من الملف، ويفحص حالات HTTP وHTML وHLS وCORS وRange. يعيد حقلي `reachable` (استجابة فيديو من الخادم) و`playback_ready` (فحص أولي لمتطلبات المتصفح)، ويعرض `issues` عند وجود عائق. لا يضمن الفحص تشغيل الفيديو بالكامل، خصوصاً الملفات ذات الترميزات غير المدعومة.

مدة حفظ نتيجة الفحص 5 دقائق عند نجاح الوصول ودقيقة عند الفشل، ويمكن تمرير `fresh=1` لإعادة الفحص. للعينات الموزعة عبر الملفات: `GET /api/v1/media-health?type=episode&sample=1&format=mkv&limit=8`.

للتحقق من أول مقطع HLS، أضف `deep=1` إلى فحص **عنصر واحد** مثل `/api/v1/media-health?type=movie&id=movie_xxx&deep=1&fresh=1`. سيفحص أول رابط داخل ملف M3U8، وعند وجود قائمة فرعية سيفحص أول مقطع منها، ويعيد `health.hls_children` مع نوع البيانات المكتشفة. إذا أعاد الخادم صورة PNG أو JPEG بدلاً من مقطع فيديو، تظهر المشكلة `hls_child_non_video` وتصبح `playback_ready=false` حتى لو بقيت `reachable=true` للقائمة الأصلية. هذا فحص أولي محدود، وليس اختباراً لكل مقاطع البث أو مفاتيح التشفير. لا يُطبق `deep=1` على العينات الجماعية لتجنب الضغط على المصادر.\n\nيمكن أن يتغير `id` القديم إذا تغيّر رابط التشغيل. أضيف `stable_key` لتعقب المحتوى نفسه عبر تغيّر الرابط. إذا كان العنوان والبوستر متطابقين في أكثر من سجل، تكون `stable_key=null` مع `stable_key_ambiguous=true` لمنع دمج سجلين مختلفين خطأً. لا تستخدم `stable_key` وحده كمفتاح وحيد من دون التحقق من هذا التنبيه.
 

## قراءة حالة المصدر

`GET /api/v1/health` يختبر قراءة الفهرس، وليس تشغيل كل فيديو. يحتوي `playback_audit` على عدد الملفات ذات الصيغ غير المناسبة، وقيم `links_checked_live:false` و`verified_links:0` حتى لا يُفسَّر تحميل JSON كنجاح التشغيل. عند استخدام نسخة مخزنة بعد فشل تحديث المصدر، تعود الحالة `degraded_using_cached_source` مع رمز HTTP 503.

## Rate limiting

يوجد Rate Limit برمجي best-effort بمقدار 120 طلب/دقيقة لكل IP داخل كل Runtime instance، مع Headers:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` عند 429

هذا يحمي من الإساءة البسيطة، لكنه ليس Rate Limit موزعاً عالمياً. للحماية الصارمة على مستوى Edge يجب استخدام Vercel WAF/Firewall rate limiting.

## Cache/Fallback

- Source cache: 5 دقائق.
- Metadata cache: 6 ساعات.
- Link health cache: 30 دقيقة.
- إذا توقف TMDb أو Jikan مؤقتاً، يرجع النظام آخر Metadata مخزنة إذا كانت متوفرة مع `stale:true`.


## Batch sample health checks

يمكن فحص عينة صغيرة من نوع وصيغة محددة بدون إرسال روابط خارجية:

`GET /api/v1/media-health?sample=1&type=movie&format=mp4&limit=3`

`GET /api/v1/media-health?sample=1&type=movie&format=m3u8&limit=3`

`GET /api/v1/media-health?sample=1&type=episode&format=mkv&limit=3`

الحد الأقصى للعينة 8 عناصر في الطلب الواحد.

## Web player behavior

- MP4/WebM/Ogg: تشغيل HTML5 مباشر.
- M3U8: HLS native عندما يكون مناسباً، وإلا HLS.js v1 عبر MSE.
- MKV: لا يتم إجبار المتصفح على تشغيله؛ يظهر خيار فتح المصدر لأن الدعم غير ثابت.
- TS مباشر: يعرض كصيغة محدودة ويحتاج HLS/transmux أو مشغلاً خارجياً.


## Playback validation

كل عنصر يحتوي الآن داخل `playback` على:

- `recognized_media`: هل الرابط يشير إلى صيغة فيديو معروفة.
- `browser_playable`: هل المشغل الويب يستطيع التعامل معه مباشرة/HLS.
- `browser_support`: `native` أو `hls` أو `limited` أو `unknown`.
- `strategy`: طريقة التشغيل المقترحة.
- `issue`: سبب المشكلة عندما لا يكون الرابط ملف فيديو صالحاً.

المصدر الحالي يحتوي عدداً قليلاً من روابط الأفلام غير الصالحة كفيديو، لذلك تبقى العناصر ظاهرة لكن يتم تعليمها بدلاً من محاولة تشغيلها بصمت.
