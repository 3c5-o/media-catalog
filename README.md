# Media Catalog

واجهة عربية ثابتة (HTML/CSS/JS) لقراءة بيانات عامة من ملفات JSON خارجية وعرضها ككتالوج.

## مصادر البيانات

- Movies: `https://raw.githubusercontent.com/SAMEHJA/live/main/movsameh.json`
- Anime: `https://raw.githubusercontent.com/SAMEHJA/live/main/anisameh.json`

لا يتم استخدام ملفات `seen*.json` أو أي ملفات تحتوي بيانات دخول.

## المميزات

- RTL ومتجاوب مع الهاتف والكمبيوتر.
- تبويبات: الكل / الأفلام / الأنمي.
- بحث وتصنيف.
- تحميل تدريجي لتخفيف الواجهة.
- Cache محلي لمدة 30 دقيقة.
- معالجة مرنة لعدة أشكال JSON.
- صفحة تفاصيل لكل عنصر.
- لا يعيد استضافة ملفات الفيديو.

## GitHub Pages

فعّل GitHub Pages من:
`Settings > Pages > Deploy from a branch > main > /(root)`

ثم يصبح الرابط عادة:
`https://3c5-o.github.io/media-catalog/`

## ملاحظة

المصدر خارجي وغير مملوك لهذا المشروع، لذلك قد تتغير بنية البيانات أو الروابط. للاستخدام الإنتاجي يفضّل إنشاء طبقة بيانات تابعة لك والتحقق من الحقوق والتراخيص قبل عرض أو تشغيل أي محتوى.