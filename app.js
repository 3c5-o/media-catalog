const SOURCES = {
  movies: 'https://raw.githubusercontent.com/SAMEHJA/live/main/movsameh.json',
  anime: 'https://raw.githubusercontent.com/SAMEHJA/live/main/anisameh.json',
  repository: 'https://github.com/SAMEHJA/live'
};

const XTREAM_SOURCES = [
  'seen 1.json',
  'ssen 2.json',
  'seen 3.JSON',
  'seen 4.json',
  'seen 5.json',
  'seen top.json'
];

const REPOSITORY_FILES = [
  { name:'GR VORTEX.txt', kind:'نص', description:'ملف موجود في المستودع وحجمه الحالي صفر بايت.', sensitive:false, url:'https://github.com/SAMEHJA/live/blob/main/GR%20VORTEX.txt' },
  { name:'anisameh.json', kind:'أنمي / حلقات', description:'قاعدة الحلقات والسلاسل والتصنيفات والصور وروابط المصدر.', sensitive:false, url:'https://github.com/SAMEHJA/live/blob/main/anisameh.json' },
  { name:'movsameh.json', kind:'أفلام', description:'قاعدة الأفلام: العنوان، الصورة، التصنيف ورابط المصدر.', sensitive:false, url:'https://github.com/SAMEHJA/live/blob/main/movsameh.json' },
  ...XTREAM_SOURCES.map(name => ({
    name,
    kind:'Xtream config',
    description:'ملف إعداد اتصال يحتوي حقول server وusername وpassword. القيم الحساسة غير محمّلة في هذه الواجهة.',
    sensitive:true,
    url:''
  }))
];


const API_BASE = 'https://media-catalog-navy.vercel.app';

const API_SERVICES = [
  {
    key:'movies',
    label:'Movies Full API',
    title:'واجهة الأفلام الكاملة',
    endpoint:'/api/v1/movies',
    description:'تعيد كل بيانات الفيلم المتوفرة من المصدر بصيغة موحدة مع معلومات التشغيل. عند طلب id تحاول إضافة معلومات TMDb إذا كان مفتاح TMDb مضبوطاً على السيرفر.',
    params:['page رقم الصفحة','limit عدد النتائج (1–100)','q بحث بالاسم','genre التصنيف','id تفاصيل فيلم محدد','enrich=0 لتعطيل إثراء TMDb'],
    example:'/api/v1/movies?page=1&limit=24&genre=رعب'
  },
  {
    key:'anime',
    label:'Anime Catalog API',
    title:'واجهة الأنمي الكاملة',
    endpoint:'/api/v1/anime',
    description:'تعرض كل أنمي كعنصر واحد. عند فتحه ترجع المواسم وتحت كل موسم الحلقات وروابط التشغيل، وتضيف معلومات Jikan عند طلب التفاصيل.',
    params:['page رقم الصفحة','limit عدد النتائج (1–100)','q بحث باسم الأنمي','genre التصنيف','id تفاصيل أنمي كامل','enrich=0 لتعطيل معلومات Jikan'],
    example:'/api/v1/anime?page=1&limit=24&q=KINGDOM'
  },
  {
    key:'episodes',
    label:'Anime Episodes API',
    title:'واجهة الحلقات المباشرة',
    endpoint:'/api/v1/anime/episodes',
    description:'واجهة منفصلة للحلقات لمن يحتاج الوصول المباشر إلى حلقة بدون المرور بتجميع الأنمي والمواسم.',
    params:['page رقم الصفحة','limit عدد النتائج (1–100)','q بحث','genre التصنيف','id تفاصيل حلقة'],
    example:'/api/v1/anime/episodes?page=1&limit=24'
  },
  {
    key:'search',
    label:'Search API',
    title:'البحث الموحد',
    endpoint:'/api/v1/search',
    description:'بحث واحد ضمن الأفلام وسلاسل الأنمي والحلقات. يمكن حصر النتائج بنوع محدد.',
    params:['q عبارة البحث (مطلوب)','type = all | movie | anime | episode','series يعمل كاسم توافق لـ anime','page رقم الصفحة','limit عدد النتائج'],
    example:'/api/v1/search?q=Resident&type=all&page=1&limit=24'
  },
  {
    key:'categories',
    label:'Categories API',
    title:'التصنيفات',
    endpoint:'/api/v1/categories',
    description:'يعيد التصنيفات الموجودة وعدد العناصر داخل كل تصنيف حسب نوع المحتوى.',
    params:['type = movie | series | anime'],
    example:'/api/v1/categories?type=movie'
  },
  {
    key:'latest',
    label:'Latest API',
    title:'أول المحتوى حسب ترتيب المصدر',
    endpoint:'/api/v1/latest',
    description:'يعيد أول العناصر بحسب ترتيب ملف المصدر الحالي. المصدر لا يوفر تاريخ إضافة موثوقاً لذلك لا ندعي أنها أحدث زمنياً.',
    params:['type = movie | series | anime','limit عدد النتائج (1–100)'],
    example:'/api/v1/latest?type=movie&limit=20'
  },
  {
    key:'stats',
    label:'Stats API',
    title:'إحصائيات المزود',
    endpoint:'/api/v1/stats',
    description:'يعيد أعداد الأفلام وسلاسل الأنمي والحلقات وعدد التصنيفات وإصدار المزود.',
    params:[],
    example:'/api/v1/stats'
  },
  {
    key:'health',
    label:'Health API',
    title:'فحص حالة المزود',
    endpoint:'/api/v1/health',
    description:'يفحص قدرة المزود على قراءة المصادر ويعيد الحالة والأعداد ووقت الاستجابة.',
    params:[],
    example:'/api/v1/health'
  },
  {
    key:'provider',
    label:'Provider API',
    title:'معلومات المزود',
    endpoint:'/api/v1',
    description:'نقطة البداية التي تعرض اسم المزود وإصداره وقائمة المسارات العامة المتوفرة.',
    params:[],
    example:'/api/v1'
  }
,
  {
    key:'formats',
    label:'Formats API',
    title:'توافق صيغ الفيديو',
    endpoint:'/api/v1/formats',
    description:'يعرض توزيع MP4 وM3U8 وMKV وTS ومستوى توافق كل صيغة مع المتصفح.',
    params:[],
    example:'/api/v1/formats'
  },
  {
    key:'media-health',
    label:'Media Health API',
    title:'فحص رابط التشغيل',
    endpoint:'/api/v1/media-health',
    description:'يفحص رابط فيلم أو حلقة معروفة عبر ID فقط، ويعيد الحالة وContent-Type ودعم Range بدون قبول روابط عشوائية.',
    params:['type = movie | episode','id معرّف العنصر'],
    example:'/api/v1/media-health?type=movie&id=movie_9k2f87'
  }
];

const CACHE_KEY = 'media_catalog_full_v2';
const CACHE_TTL = 30 * 60 * 1000;
const PAGE_SIZE = 48;

const data = { movies:[], episodes:[], series:[], animeCatalog:[] };
const state = {
  section:'overview', query:'', genre:'all', visible:PAGE_SIZE, filtered:[], updatedAt:null,
  xtream:{ profile:null, auth:null, catalog:null, view:'summary', activeType:'', activeCategory:'', seriesInfo:null, busy:false, message:'' }
};

const $ = (selector) => document.querySelector(selector);
const grid = $('#grid');
const contentPanel = $('#contentPanel');
const overviewPanel = $('#overviewPanel');
const filters = document.querySelector('.filters');
const statusText = $('#statusText');
const lastUpdated = $('#lastUpdated');
const emptyState = $('#emptyState');
const loadMoreBtn = $('#loadMoreBtn');
const dialog = $('#detailsDialog');
const dialogContent = $('#dialogContent');

function str(value){ return String(value ?? '').trim(); }
function pick(obj, keys){
  for (const key of keys) {
    if (obj && obj[key] != null && str(obj[key])) return obj[key];
  }
  return '';
}
function safeUrl(value){
  try {
    const url = new URL(str(value));
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function streamFormat(value){
  const url=safeUrl(value);
  if(!url) return '';
  try{
    const pathname=new URL(url).pathname.toLowerCase();
    const match=pathname.match(/\.([a-z0-9]+)$/);
    return match?match[1]:'';
  }catch{return '';}
}

function directVideoMime(value){
  const format=streamFormat(value);
  if(format==='mp4'||format==='m4v') return 'video/mp4';
  if(format==='webm') return 'video/webm';
  if(format==='ogv'||format==='ogg') return 'video/ogg';
  if(format==='m3u8') return 'application/vnd.apple.mpegurl';
  if(format==='ts') return 'video/mp2t';
  return '';
}

function playerSupport(value){
  const format=streamFormat(value);
  if(['mp4','m4v','webm','ogv','ogg'].includes(format)) return {format,mode:'native',playable:true};
  if(format==='m3u8') return {format,mode:'hls',playable:true};
  if(format==='ts') return {format,mode:'mpegts',playable:Boolean(window.mpegts?.isSupported?.()),reason:'يحتاج MPEG-TS runtime في المتصفح'};
  if(format==='mkv') return {format,mode:'external',playable:false,reason:'MKV غير مدعوم بثبات داخل أغلب المتصفحات'};
  return {format:format||'unknown',mode:'external',playable:false,reason:'صيغة التشغيل غير معروفة'};
}

function inlinePlayerButton(item){
  const support=playerSupport(item?.url);
  if(!support.playable) return '';
  return '<button class="source-link play-button" type="button" data-play-url="'+
    escapeAttr(item.url)+'" data-play-title="'+escapeAttr(item.title)+
    '" data-play-poster="'+escapeAttr(item.image||'')+
    '">فتح المشغل الكبير</button>';
}

function unsupportedPlaybackNote(url){
  const safe=safeUrl(url);
  if(!safe) return '';
  const support=playerSupport(safe);
  if(support.playable) return '';
  return '<div class="playback-warning"><strong>'+escapeHtml(support.format.toUpperCase())+
    '</strong><span>'+escapeHtml(support.reason)+'</span>'+
    '<a href="'+escapeAttr(safe)+'" target="_blank" rel="noopener noreferrer">فتح المصدر</a></div>';
}

function playerMarkup(url,title,poster,compact=false){
  const safe=safeUrl(url);
  const support=playerSupport(safe);
  const mime=directVideoMime(safe);
  if(!safe) return '';
  if(!support.playable) return unsupportedPlaybackNote(safe);

  return '<div class="stream-player'+(compact?' compact-player':'')+'" data-stream-player data-stream-mode="'+support.mode+'">'+
    '<div class="video-shell detail-video-shell">'+
      '<video controls playsinline preload="none" controlsList="nodownload" '+
        'data-stream-url="'+escapeAttr(safe)+'" data-stream-mime="'+escapeAttr(mime)+'" data-stream-mode="'+support.mode+'"'+
        (poster?' poster="'+escapeAttr(poster)+'"':'')+'></video>'+
      '<button class="stream-start" type="button" data-stream-start>تشغيل الفيديو</button>'+
      '<div class="stream-status" data-stream-status>لم يبدأ التحميل بعد</div>'+
      '<div class="buffer-meter" aria-hidden="true"><span data-buffer-fill></span></div>'+
      '<div class="buffer-label" data-buffer-label>سيبدأ التحميل عند الضغط على تشغيل</div>'+
    '</div>'+
  '</div>';
}

function inlineVideoPlayer(item){
  const safe=safeUrl(item?.url);
  if(!safe) return '';
  return '<div class="detail-player-block">'+
    '<div class="detail-player-label">مشغل الفيديو</div>'+
    playerMarkup(item.url,item.title,item.image,true)+
  '</div>';
}

function getBufferedAhead(video){
  if (!video || !video.buffered || !video.buffered.length) return 0;
  const t = Number.isFinite(video.currentTime) ? video.currentTime : 0;

  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i);
    const end = video.buffered.end(i);
    if (t >= start - 0.15 && t <= end + 0.15) {
      return Math.max(0, end - t);
    }
  }

  return 0;
}

function getBufferedEnd(video){
  if (!video || !video.buffered || !video.buffered.length) return 0;
  let end = 0;
  for (let i = 0; i < video.buffered.length; i++) {
    end = Math.max(end, video.buffered.end(i));
  }
  return end;
}

function setupBufferMonitor(video, status, player){
  if (!video || video._smartBufferController) return;

  const fill = player?.querySelector?.('[data-buffer-fill]');
  const label = player?.querySelector?.('[data-buffer-label]');
  const controller = {
    timer:null,
    waiting:false,
    lastAhead:0,
    destroyed:false
  };

  const update = () => {
    if (controller.destroyed) return;

    const ahead = getBufferedAhead(video);
    controller.lastAhead = ahead;

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const bufferedEnd = getBufferedEnd(video);
    const percent = duration ? Math.min(100, Math.max(0, (bufferedEnd / duration) * 100)) : 0;

    if (fill) fill.style.width = percent.toFixed(2) + '%';
    if (label) label.textContent = ahead > 0 ? ('مخزن أمامك ' + Math.floor(ahead) + ' ث') : 'جاري تجهيز المخزون';

    if (!video.paused && !video.ended && !video.seeking) {
      if (ahead >= 12) {
        if (status) status.textContent = 'تشغيل مستقر • مخزون ممتاز';
      } else if (ahead >= 5) {
        if (status) status.textContent = 'تشغيل مستقر • مخزون ' + Math.floor(ahead) + ' ث';
      } else if (ahead > 0 && !controller.waiting) {
        if (status) status.textContent = 'تشغيل • جاري زيادة المخزون';
      }
    }
  };

  video.addEventListener('progress', update);
  video.addEventListener('timeupdate', update);
  video.addEventListener('durationchange', update);

  video.addEventListener('waiting', () => {
    controller.waiting = true;
    if (status) status.textContent = 'الاتصال بطيء قليلاً • جاري تجميع جزء إضافي...';
    update();
  });

  video.addEventListener('canplay', () => {
    controller.waiting = false;
    if (status) {
      const ahead = getBufferedAhead(video);
      status.textContent = ahead >= 5 ? ('جاهز • مخزون ' + Math.floor(ahead) + ' ث') : 'جاهز للتشغيل';
    }
    update();
  });

  video.addEventListener('canplaythrough', () => {
    controller.waiting = false;
    if (status) status.textContent = 'التشغيل مستقر';
    update();
  });

  video.addEventListener('stalled', () => {
    if (status) status.textContent = 'المصدر تأخر بالاستجابة • المشغل سيكمل تلقائياً';
  });

  video.addEventListener('seeking', () => {
    if (status) status.textContent = 'جاري الانتقال للمقطع المطلوب...';
  });

  video.addEventListener('seeked', () => {
    controller.waiting = false;
    update();
  });

  controller.timer = setInterval(update, 750);
  controller.destroy = () => {
    controller.destroyed = true;
    if (controller.timer) clearInterval(controller.timer);
  };

  video._smartBufferController = controller;
  update();
}

function attachStreamSource(video,url,mode,status){
  if(mode==='mpegts'){
    if(window.mpegts?.isSupported?.()){
      try{
        const runtime=window.mpegts.createPlayer({type:'mpegts',isLive:false,url},{enableWorker:true,lazyLoad:true,autoCleanupSourceBuffer:true});
        video._mpegtsInstance=runtime;
        runtime.attachMediaElement(video);
        runtime.load();
        runtime.on?.(window.mpegts.Events.ERROR,()=>{
          if(status) status.textContent='تعذر تشغيل MPEG-TS من المصدر';
        });
        return true;
      }catch{
        if(status) status.textContent='تعذر تهيئة مشغل MPEG-TS';
        return false;
      }
    }
    if(status) status.textContent='هذا المتصفح لا يدعم MPEG-TS';
    return false;
  }

  if(mode==='hls'){
    if(video.canPlayType('application/vnd.apple.mpegurl') && 'ManagedMediaSource' in window){
      video.src=url;
      return true;
    }
    if(window.Hls && Hls.isSupported()){
      const hls=new Hls({
        enableWorker:true,
        lowLatencyMode:false,
        backBufferLength:30
      });
      video._hlsInstance=hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR,(_,data)=>{
        if(!data?.fatal) return;
        if(status) status.textContent='تعذر تشغيل بث HLS من المصدر';
        try{hls.destroy();}catch{}
        delete video._hlsInstance;
      });
      return true;
    }
    if(video.canPlayType('application/vnd.apple.mpegurl')){
      video.src=url;
      return true;
    }
    if(status) status.textContent='هذا المتصفح لا يدعم HLS';
    return false;
  }

  video.src=url;
  return true;
}

function startStreamPlayer(root){
  const player=root?.closest?.('[data-stream-player]')||root?.querySelector?.('[data-stream-player]')||root;
  if(!player) return;

  const video=player.querySelector('video[data-stream-url]');
  const status=player.querySelector('[data-stream-status]');
  const startButton=player.querySelector('[data-stream-start]');
  if(!video) return;

  const url=safeUrl(video.dataset.streamUrl);
  const mode=video.dataset.streamMode||player.dataset.streamMode||playerSupport(url).mode;
  if(!url||!playerSupport(url).playable){
    if(status) status.textContent='صيغة الفيديو غير مدعومة داخل المتصفح';
    return;
  }

  if(!video.dataset.initialized){
    video.preload='auto';
    video.dataset.initialized='1';
    setupBufferMonitor(video,status,player);

    video.addEventListener('loadstart',()=>{if(status) status.textContent='جاري فتح الفيديو وتجهيز أول جزء...';});
    video.addEventListener('loadedmetadata',()=>{if(status) status.textContent='تم قراءة معلومات الفيديو • جاري تجهيز التشغيل';});
    video.addEventListener('playing',()=>{
      if(status){
        const ahead=getBufferedAhead(video);
        status.textContent=ahead>=5?('تشغيل مستقر • مخزون '+Math.floor(ahead)+' ث'):'يتم التشغيل • جاري بناء المخزون';
      }
      if(startButton) startButton.hidden=true;
    });
    video.addEventListener('pause',()=>{if(!video.ended&&!video.seeking&&status) status.textContent='متوقف مؤقتاً';});
    video.addEventListener('ended',()=>{if(status) status.textContent='انتهى الفيديو';});
    video.addEventListener('error',()=>{
      if(video._hlsInstance) return;
      const code=video.error?.code;
      const message=code===2?'مشكلة اتصال بالمصدر':code===3?'المتصفح لم يستطع فك ترميز الفيديو':code===4?'صيغة الفيديو غير مدعومة أو الرابط غير متاح':'تعذر تشغيل الفيديو من المصدر';
      if(status) status.textContent=message+' • جرّب إعادة المحاولة';
      if(startButton){startButton.hidden=false;startButton.textContent='إعادة المحاولة';}
    });

    if(!attachStreamSource(video,url,mode,status)){
      if(startButton){startButton.hidden=false;startButton.textContent='غير مدعوم';}
      return;
    }
    if(mode!=='hls') video.load?.();
  }

  if(startButton) startButton.textContent='جاري تجهيز التشغيل...';
  const playPromise=video.play();
  if(playPromise&&typeof playPromise.then==='function'){
    playPromise.then(()=>{if(startButton) startButton.hidden=true;}).catch(()=>{
      if(status) status.textContent='اضغط تشغيل من داخل الفيديو للبدء';
      if(startButton){startButton.hidden=false;startButton.textContent='تشغيل الفيديو';}
    });
  }
}

function stopStreamPlayers(root=document){
  root.querySelectorAll?.('video[data-stream-url]').forEach(video=>{
    try{
      if(video._smartBufferController?.destroy) video._smartBufferController.destroy();
      delete video._smartBufferController;
      if(video._hlsInstance){
        video._hlsInstance.destroy();
        delete video._hlsInstance;
      }
      if(video._mpegtsInstance){
        try{video._mpegtsInstance.pause();}catch{}
        try{video._mpegtsInstance.unload();}catch{}
        try{video._mpegtsInstance.detachMediaElement();}catch{}
        try{video._mpegtsInstance.destroy();}catch{}
        delete video._mpegtsInstance;
      }
      video.pause();
      video.removeAttribute('src');
      video.querySelectorAll('source').forEach(source=>source.remove());
      video.load();
      delete video.dataset.initialized;
    }catch{}
  });
}

function openInlinePlayer(url,title,poster){
  const safe=safeUrl(url);
  if(!safe) return;
  const support=playerSupport(safe);

  dialogContent.innerHTML=
    '<div class="player-view">'+
      '<div class="player-head"><div><span class="overview-kicker">INTERNAL PLAYER</span><h3>'+
      escapeHtml(title||'تشغيل الفيديو')+
      '</h3></div><span class="chip">'+escapeHtml(support.format.toUpperCase())+'</span></div>'+
      playerMarkup(safe,title,poster,false)+
      '<div class="player-actions">'+
        '<a class="mini-link" href="'+escapeAttr(safe)+'" target="_blank" rel="noopener noreferrer">فتح الرابط مباشرة</a>'+
      '</div>'+
      '<p class="source-note">'+
        (support.mode==='hls'
          ? 'يستخدم المشغل HLS.js عند الحاجة، مع استخدام دعم HLS الأصلي عندما يكون مناسباً.'
          : support.playable
            ? 'يبدأ جلب الفيديو بعد الضغط على تشغيل ويستفيد من Range والتخزين المؤقت الذي يوفره المصدر.'
            : escapeHtml(support.reason))+
      '</p>'+
    '</div>';

  const player=dialogContent.querySelector('[data-stream-player]');
  if(player&&support.playable) startStreamPlayer(player);
}

function asArray(value, keys){
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
}
function escapeHtml(value){
  return str(value).replace(/[&<>'"]/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[char]));
}
function escapeAttr(value){ return escapeHtml(value); }
function formatNumber(value){ return Number(value || 0).toLocaleString('ar-IQ'); }

function normalizeGenre(value){
  const g = str(value) || 'غير مصنف';
  if (g === 'أكشن') return 'اكشن';
  return g;
}

function normalizeMovie(item, index){
  return {
    id:'movie-' + index,
    type:'movie',
    title:str(pick(item,['title','name','movie_name'])) || 'فيلم ' + (index + 1),
    image:safeUrl(pick(item,['logo','poster','image','cover','poster_url'])),
    genre:normalizeGenre(pick(item,['genre','category','type'])),
    url:safeUrl(pick(item,['url','link','video','stream_url','source']))
  };
}

function normalizeEpisode(item, index){
  const seriesName = str(pick(item,['series_name','anime_name','series','anime','show_name','group']));
  const episodeNumber = str(pick(item,['episode_number','episode','ep','number']));
  return {
    id:'anime-' + index,
    type:'anime',
    title:str(pick(item,['episode_name','title','name','episodeTitle','episode_title'])) || seriesName || 'حلقة ' + (index + 1),
    series:seriesName || 'غير معروف',
    episode:episodeNumber,
    image:safeUrl(pick(item,['logo','poster','image','cover','poster_url'])),
    genre:normalizeGenre(pick(item,['genre','category','group'])),
    url:safeUrl(pick(item,['url','link','video','stream_url','source']))
  };
}


function parseAnimeSeriesName(value){
  const original = str(value) || 'غير معروف';
  const patterns = [
    /\s+season\s*(\d+)\s*$/i,
    /\s+(\d+)(?:st|nd|rd|th)\s+season\s*$/i,
    /\s+s(?:eason)?\s*(\d+)\s*$/i
  ];
  for (const pattern of patterns) {
    const match = original.match(pattern);
    if (match) {
      const season = Math.max(1, Number.parseInt(match[1],10) || 1);
      const base = original.replace(pattern,'').trim() || original;
      return { original, base, season };
    }
  }
  return { original, base:original, season:1 };
}

function buildAnimeCatalog(episodes){
  const groups = new Map();
  for (const ep of episodes) {
    const parsed = parseAnimeSeriesName(ep.series);
    const key = parsed.base.toLocaleLowerCase('en');
    if (!groups.has(key)) {
      groups.set(key,{
        id:'anime-title-' + groups.size,
        type:'anime_title',
        title:parsed.base,
        image:ep.image,
        genre:ep.genre,
        seasonCount:0,
        episodeCount:0,
        seasons:[]
      });
    }
    const anime = groups.get(key);
    if (!anime.image && ep.image) anime.image = ep.image;
    let season = anime.seasons.find(x=>x.season===parsed.season);
    if (!season) {
      season={season:parsed.season,title:parsed.original,episodeCount:0,episodes:[]};
      anime.seasons.push(season);
    }
    season.episodes.push(ep);
    season.episodeCount += 1;
    anime.episodeCount += 1;
  }
  return [...groups.values()].map(anime=>{
    anime.seasons.sort((a,b)=>a.season-b.season);
    anime.seasons.forEach(season=>season.episodes.sort((a,b)=>{
      const na=Number(a.episode), nb=Number(b.episode);
      if(Number.isFinite(na)&&Number.isFinite(nb)) return na-nb;
      return a.title.localeCompare(b.title,'ar');
    }));
    anime.seasonCount=anime.seasons.length;
    return anime;
  });
}

function buildSeries(episodes){
  const groups = new Map();
  for (const ep of episodes) {
    const key = ep.series || 'غير معروف';
    if (!groups.has(key)) {
      groups.set(key, {
        id:'series-' + groups.size,
        type:'series',
        title:key,
        image:ep.image,
        genre:ep.genre,
        episodeCount:0,
        episodes:[]
      });
    }
    const group = groups.get(key);
    group.episodes.push(ep);
    group.episodeCount += 1;
    if (!group.image && ep.image) group.image = ep.image;
  }
  return [...groups.values()].map(group => {
    group.episodes.sort((a,b) => {
      const na = Number(a.episode), nb = Number(b.episode);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.title.localeCompare(b.title, 'ar');
    });
    return group;
  });
}

async function fetchJson(url){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { cache:'no-store', signal:controller.signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function saveCache(){
  const compact = {
    time:Date.now(),
    movies:data.movies,
    episodes:data.episodes
  };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(compact)); } catch {}
  return compact.time;
}

function readCache(){
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!cache?.time || !Array.isArray(cache.movies) || !Array.isArray(cache.episodes)) return null;
    return cache;
  } catch { return null; }
}

function applyData(movies, episodes, time, message){
  data.movies = movies;
  data.episodes = episodes;
  data.series = buildSeries(episodes);
  data.animeCatalog = buildAnimeCatalog(episodes);
  state.updatedAt = time;

  $('#movieCount').textContent = formatNumber(data.movies.length);
  $('#seriesCount').textContent = formatNumber(data.animeCatalog.length);
  $('#animeCount').textContent = formatNumber(data.episodes.length);
  $('#overviewMovieCount').textContent = formatNumber(data.movies.length);
  $('#overviewSeriesCount').textContent = formatNumber(data.animeCatalog.length);
  $('#overviewAnimeCount').textContent = formatNumber(data.episodes.length);

  statusText.textContent = message;
  lastUpdated.textContent = 'آخر تحديث: ' + new Date(time).toLocaleString('ar-IQ');

  if (state.section !== 'overview') renderSection();
}

async function loadData(force=false){
  const cached = readCache();
  if (!force && cached && Date.now() - cached.time < CACHE_TTL) {
    applyData(cached.movies, cached.episodes, cached.time, 'تم تحميل آخر نسخة محفوظة');
    return;
  }

  statusText.textContent = 'جاري تحميل بيانات الأفلام والأنمي...';

  const [movieResult, animeResult] = await Promise.allSettled([
    fetchJson(SOURCES.movies),
    fetchJson(SOURCES.anime)
  ]);

  let movies = [];
  let episodes = [];
  const errors = [];

  if (movieResult.status === 'fulfilled') {
    const list = asArray(movieResult.value,['movies','items','data','results']);
    movies = list.map(normalizeMovie);
  } else {
    errors.push('تعذر تحميل الأفلام');
  }

  if (animeResult.status === 'fulfilled') {
    const list = asArray(animeResult.value,['anime','animes','episodes','items','data','results']);
    episodes = list.map(normalizeEpisode);
  } else {
    errors.push('تعذر تحميل حلقات الأنمي');
  }

  if ((!movies.length && !episodes.length) && cached) {
    applyData(cached.movies, cached.episodes, cached.time, 'المصدر غير متاح؛ تم عرض النسخة المحفوظة');
    return;
  }

  data.movies = movies;
  data.episodes = episodes;
  const time = saveCache();
  applyData(movies, episodes, time, errors.length ? 'تم التحميل جزئياً: ' + errors.join('، ') : 'تم تحديث بيانات المصدر بنجاح');
}

function setSection(section){
  state.section = section;
  state.query = '';
  state.genre = 'all';
  state.visible = PAGE_SIZE;

grid.addEventListener('click', async event => {
  const copyButton = event.target.closest('[data-copy-api]');
  if (!copyButton) return;
  const value = copyButton.dataset.copyApi || '';
  let copied = false;
  try { await navigator.clipboard.writeText(value); copied = true; }
  catch {
    try {
      const area=document.createElement('textarea');
      area.value=value; area.style.position='fixed'; area.style.opacity='0';
      document.body.appendChild(area); area.select();
      copied=document.execCommand('copy'); area.remove();
    } catch {}
  }
  const oldText=copyButton.textContent;
  copyButton.textContent=copied?'تم النسخ':'انسخ الرابط يدوياً';
  setTimeout(()=>{copyButton.textContent=oldText;},1400);
});

document.querySelectorAll('.section-tab').forEach(button => {
    button.classList.toggle('active', button.dataset.section === section);
  });

  if (section === 'overview') {
    overviewPanel.hidden = false;
    contentPanel.hidden = true;
    return;
  }

  overviewPanel.hidden = true;
  contentPanel.hidden = false;
  $('#searchInput').value = '';
  renderSection();
}

function renderSection(){
  const section = state.section;
  const sectionInfo = {
    movie:{ eyebrow:'MOVIES', title:'الأفلام' },
    series:{ eyebrow:'ANIME CATALOG', title:'الأنمي — المواسم والحلقات مجمعة' },
    anime:{ eyebrow:'ANIME EPISODES', title:'كل حلقات الأنمي' },
    api:{ eyebrow:'DEVELOPER API', title:'واجهات API العامة' },
    xtream:{ eyebrow:'XTREAM SOURCES', title:'مصادر Xtream الموجودة في المستودع' },
    files:{ eyebrow:'REPOSITORY FILES', title:'كل ملفات المصدر' }
  }[section];

  $('#sectionEyebrow').textContent = sectionInfo?.eyebrow || 'CATALOG';
  $('#sectionTitle').textContent = sectionInfo?.title || 'المحتوى';

  const mediaSection = ['movie','series','anime'].includes(section);
  filters.hidden = !mediaSection;
  loadMoreBtn.hidden = true;
  emptyState.hidden = true;

  if (section === 'api') {
    renderApi();
    return;
  }
  if (section === 'xtream') {
    renderXtream();
    return;
  }
  if (section === 'files') {
    renderFiles();
    return;
  }

  buildGenres();
  filterMedia();
}

function currentCollection(){
  if (state.section === 'movie') return data.movies;
  if (state.section === 'series') return data.animeCatalog;
  if (state.section === 'anime') return data.episodes;
  return [];
}

function buildGenres(){
  const collection = currentCollection();
  const select = $('#genreSelect');
  const genres = [...new Set(collection.map(item => item.genre).filter(Boolean))].sort((a,b) => a.localeCompare(b,'ar'));
  select.innerHTML = '<option value="all">كل التصنيفات</option>' + genres.map(genre =>
    '<option value="' + escapeAttr(genre) + '">' + escapeHtml(genre) + '</option>'
  ).join('');
  select.value = state.genre;
}

function filterMedia(reset=true){
  if (reset) state.visible = PAGE_SIZE;
  const query = state.query.toLocaleLowerCase('ar');
  const collection = currentCollection();

  state.filtered = collection.filter(item => {
    const genreOk = state.genre === 'all' || item.genre === state.genre;
    const haystack = [item.title,item.series,item.genre,item.episode].filter(Boolean).join(' ').toLocaleLowerCase('ar');
    return genreOk && (!query || haystack.includes(query));
  });

  renderMedia();
}

function renderMedia(){
  const visible = state.filtered.slice(0,state.visible);
  grid.className = 'grid';
  grid.innerHTML = visible.map(mediaCard).join('');
  emptyState.hidden = state.filtered.length !== 0;
  loadMoreBtn.hidden = state.visible >= state.filtered.length;

  statusText.textContent = formatNumber(state.filtered.length) + ' نتيجة';
  if (state.updatedAt) lastUpdated.textContent = 'آخر تحديث: ' + new Date(state.updatedAt).toLocaleString('ar-IQ');

  grid.querySelectorAll('[data-media-id]').forEach(card => {
    card.addEventListener('click', () => openMedia(card.dataset.mediaId));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openMedia(card.dataset.mediaId);
      }
    });
  });
}

function mediaCard(item){
  let badge='فيلم';
  let meta=item.genre||'';
  if(item.type==='anime_title'){
    badge=formatNumber(item.seasonCount||0)+' موسم • '+formatNumber(item.episodeCount||0)+' حلقة';
  }else if(item.type==='series'){
    badge=formatNumber(item.episodeCount||0)+' حلقة';
  }else if(item.type==='anime'||item.type==='anime_episode'){
    badge=item.episode?'حلقة '+escapeHtml(item.episode):'أنمي';
    meta=item.series||item.genre||'';
  }

  const image=item.image
    ? '<img src="'+escapeAttr(item.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML=\'<div class=&quot;poster-fallback&quot;>NO IMAGE</div>\'">'
    : '<div class="poster-fallback">NO IMAGE</div>';

  return '<article class="card" data-media-id="'+escapeAttr(item.id)+'" tabindex="0">'+
    '<div class="poster">'+image+'</div>'+
    '<span class="badge">'+badge+'</span>'+
    '<div class="card-body"><h3 class="card-title" title="'+escapeAttr(item.title)+'">'+escapeHtml(item.title)+'</h3>'+
    '<div class="meta">'+escapeHtml(meta)+'</div></div></article>';
}

function findMedia(id){
  return [...data.movies,...data.animeCatalog,...data.series,...data.episodes].find(item=>item.id===id);
}

function openMedia(id){
  const item=findMedia(id);
  if(!item) return;

  const image=item.image
    ? '<img src="'+escapeAttr(item.image)+'" alt="'+escapeAttr(item.title)+'" referrerpolicy="no-referrer">'
    : '<div class="poster-fallback" style="aspect-ratio:2/3;border-radius:17px">NO IMAGE</div>';

  if(item.type==='anime_title'){
    const seasons=(item.seasons||[]).map(season=>{
      const episodes=(season.episodes||[]).map(ep=>
        '<div class="episode-item"><span>'+
        escapeHtml(ep.episode?'الحلقة '+ep.episode:ep.title)+
        '</span>'+
        (ep.url?(playerSupport(ep.url).playable
          ? '<button class="episode-play" type="button" data-play-url="'+escapeAttr(ep.url)+'" data-play-title="'+escapeAttr(ep.title)+'" data-play-poster="'+escapeAttr(ep.image||item.image||'')+'">تشغيل</button>'
          : '<a href="'+escapeAttr(ep.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(streamFormat(ep.url).toUpperCase()||'فتح المصدر')+'</a>')
        :'<span>بدون رابط</span>')+
        '</div>'
      ).join('');
      return '<section class="anime-season"><div class="file-row"><strong>الموسم '+
        formatNumber(season.season)+'</strong><span class="file-type">'+
        formatNumber(season.episodeCount||season.episode_count||0)+' حلقة</span></div>'+
        '<div class="episode-list">'+episodes+'</div></section>';
    }).join('');

    dialogContent.innerHTML='<div class="detail"><div>'+image+'</div><div>'+
      '<div class="chips"><span class="chip">أنمي</span><span class="chip">'+escapeHtml(item.genre)+
      '</span><span class="chip">'+formatNumber(item.seasonCount||0)+' موسم</span><span class="chip">'+
      formatNumber(item.episodeCount||0)+' حلقة</span></div>'+
      '<h3>'+escapeHtml(item.title)+'</h3>'+
      '<p>تم جمع المواسم والحلقات تحت عنوان أنمي واحد تلقائياً من بيانات المصدر.</p>'+
      '<div class="anime-meta-live" data-anime-meta><div class="source-note">جاري تحميل معلومات الأنمي الإضافية...</div></div>'+
      '<div class="anime-seasons">'+seasons+'</div></div></div>';
  }else if(item.type==='series'){
    const eps=(item.episodes||[]).map(ep=>
      '<div class="episode-item"><span>'+escapeHtml(ep.episode?'الحلقة '+ep.episode:ep.title)+'</span>'+
      (ep.url?'<a href="'+escapeAttr(ep.url)+'" target="_blank" rel="noopener noreferrer">فتح المصدر</a>':'<span>بدون رابط</span>')+
      '</div>'
    ).join('');
    dialogContent.innerHTML='<div class="detail"><div>'+image+'</div><div>'+
      '<div class="chips"><span class="chip">سلسلة</span><span class="chip">'+escapeHtml(item.genre)+'</span>'+
      '<span class="chip">'+formatNumber(item.episodeCount||0)+' حلقة</span></div>'+
      '<h3>'+escapeHtml(item.title)+'</h3><div class="episode-list">'+eps+'</div></div></div>';
  }else{
    const chips=[
      item.type==='movie'?'فيلم':'حلقة أنمي',
      item.genre,
      item.episode?'الحلقة '+item.episode:''
    ].filter(Boolean).map(v=>'<span class="chip">'+escapeHtml(v)+'</span>').join('');

    dialogContent.innerHTML='<div class="detail"><div>'+image+'</div><div>'+
      '<div class="chips">'+chips+'</div><h3>'+escapeHtml(item.title)+'</h3>'+
      (item.series?'<p>السلسلة: <strong>'+escapeHtml(item.series)+'</strong></p>':'')+
      (item.url?inlineVideoPlayer(item)+inlinePlayerButton(item)+
        '<a class="mini-link source-secondary" href="'+escapeAttr(item.url)+'" target="_blank" rel="noopener noreferrer">فتح رابط المصدر</a>'
        :'<p>لا يوجد رابط مصدر صالح.</p>')+
      '<div class="source-note">الموقع لا يعيد استضافة الفيديو؛ توفر الرابط يعتمد على المصدر الخارجي.</div>'+
      '</div></div>';
  }

  dialog.showModal();

  if(item.type==='anime_title'){
    const metaRoot=dialogContent.querySelector('[data-anime-meta]');
    if(metaRoot){
      fetchJson(API_BASE+'/api/v1/anime?title='+encodeURIComponent(item.title))
        .then(payload=>{
          const meta=payload?.data?.metadata;
          if(!meta?.enriched){
            metaRoot.innerHTML='<div class="source-note">معلومات المصدر الخارجي غير متاحة حالياً.</div>';
            return;
          }
          const chips=[
            meta.year?String(meta.year):'',
            meta.score!=null?'تقييم '+meta.score:'',
            meta.status||'',
            meta.duration||''
          ].filter(Boolean).map(v=>'<span class="chip">'+escapeHtml(v)+'</span>').join('');
          const genres=Array.isArray(meta.genres)&&meta.genres.length
            ? '<p><strong>التصنيفات:</strong> '+escapeHtml(meta.genres.join('، '))+'</p>':'';
          const studios=Array.isArray(meta.studios)&&meta.studios.length
            ? '<p><strong>الاستوديو:</strong> '+escapeHtml(meta.studios.join('، '))+'</p>':'';
          const confidence=meta.match?.confidence!=null
            ? '<p class="source-note">دقة المطابقة: '+Math.round(meta.match.confidence*100)+'%</p>':'';
          metaRoot.innerHTML='<div class="chips">'+chips+'</div>'+
            (meta.synopsis?'<p class="anime-synopsis">'+escapeHtml(meta.synopsis)+'</p>':'')+
            genres+studios+confidence;
        })
        .catch(()=>{
          metaRoot.innerHTML='<div class="source-note">تعذر تحميل معلومات الأنمي الإضافية، والحلقات ما زالت متاحة.</div>';
        });
    }
  }
}

function renderApi(){
  grid.className = 'api-grid';
  grid.innerHTML = API_SERVICES.map((service,index) => {
    const endpoint = API_BASE + service.endpoint;
    const example = API_BASE + service.example;
    const params = service.params.length
      ? '<div class="api-params">' + service.params.map(param => '<span>' + escapeHtml(param) + '</span>').join('') + '</div>'
      : '<div class="api-no-params">لا يحتاج باراميترات</div>';

    return '<article class="api-card">' +
      '<div class="api-card-head">' +
        '<div><span class="api-number">' + String(index + 1).padStart(2,'0') + '</span>' +
        '<span class="overview-kicker">' + escapeHtml(service.label) + '</span></div>' +
        '<span class="api-method">GET</span>' +
      '</div>' +
      '<h3>' + escapeHtml(service.title) + '</h3>' +
      '<p>' + escapeHtml(service.description) + '</p>' +
      '<div class="api-label">المسار</div>' +
      '<code class="api-code">' + escapeHtml(endpoint) + '</code>' +
      '<div class="api-label">الباراميترات</div>' +
      params +
      '<div class="api-label">مثال جاهز</div>' +
      '<code class="api-code api-example">' + escapeHtml(example) + '</code>' +
      '<div class="api-actions">' +
        '<button class="api-copy" type="button" data-copy-api="' + escapeAttr(example) + '">نسخ المثال</button>' +
        '<a class="api-open" href="' + escapeAttr(example) + '" target="_blank" rel="noopener noreferrer">فتح API</a>' +
      '</div>' +
    '</article>';
  }).join('');

  statusText.textContent = formatNumber(API_SERVICES.length) + ' واجهات API عامة';
  lastUpdated.textContent = 'Base URL: ' + API_BASE;
  loadMoreBtn.hidden = true;
  emptyState.hidden = true;
}


function normalizeXtreamConfig(value){
  const input=value&&typeof value==='object'?value:{};
  let server=str(input.server||input.url||input.host||input.base_url||input.baseUrl);
  const username=str(input.username||input.user);
  const password=str(input.password||input.pass);
  if(server&&!/^https?:\/\//i.test(server)) server='http://'+server;
  const safe=safeUrl(server);
  if(!safe||!username||!password) throw new Error('ملف Xtream يجب أن يحتوي server و username و password.');
  const parsed=new URL(safe);
  const cleanPath=parsed.pathname.replace(/\/player_api\.php\/?$/i,'').replace(/\/+$/,'');
  parsed.pathname=cleanPath||'/';
  parsed.search='';
  parsed.hash='';
  const normalized=parsed.href.replace(/\/+$/,'');
  if(location.protocol==='https:'&&parsed.protocol==='http:'){
    throw new Error('هذا الخادم يعمل عبر HTTP فقط، والمتصفح يمنع الاتصال به من موقع HTTPS. استخدم خادماً يدعم HTTPS.');
  }
  return {server:normalized,username,password};
}

function xtreamApiUrl(action='',extra={},profile=state.xtream.profile){
  if(!profile) throw new Error('لا يوجد حساب Xtream محمل.');
  const url=new URL(profile.server.replace(/\/+$/,'')+'/player_api.php');
  url.searchParams.set('username',profile.username);
  url.searchParams.set('password',profile.password);
  if(action) url.searchParams.set('action',action);
  Object.entries(extra||{}).forEach(([key,value])=>{
    if(value!==undefined&&value!==null&&String(value)!=='') url.searchParams.set(key,String(value));
  });
  return url.href;
}

async function xtreamFetch(action='',extra={},profile=state.xtream.profile){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(xtreamApiUrl(action,extra,profile),{
      cache:'no-store',
      credentials:'omit',
      signal:controller.signal,
      headers:{Accept:'application/json'}
    });
    if(!response.ok) throw new Error('HTTP '+response.status);
    return await response.json();
  }catch(error){
    if(error?.name==='AbortError') throw new Error('انتهت مهلة الاتصال بخادم Xtream.');
    throw error;
  }finally{
    clearTimeout(timer);
  }
}

async function xtreamTry(action,profile){
  try{
    const value=await xtreamFetch(action,{},profile);
    return Array.isArray(value)?value:[];
  }catch{
    return [];
  }
}

function xtreamCatalogType(type,categories,items){
  const counts=new Map();
  for(const item of items){
    const id=str(item?.category_id)||'0';
    counts.set(id,(counts.get(id)||0)+1);
  }
  const normalized=(Array.isArray(categories)?categories:[]).map((category,index)=>({
    id:str(category?.category_id)||String(index+1),
    name:str(category?.category_name)||('قسم '+(index+1)),
    count:counts.get(str(category?.category_id)||String(index+1))||0
  }));
  const known=new Set(normalized.map(category=>category.id));
  for(const [id,count] of counts){
    if(!known.has(id)) normalized.push({id,name:id==='0'?'غير مصنف':'قسم '+id,count});
  }
  normalized.sort((x,y)=>y.count-x.count||x.name.localeCompare(y.name,'ar'));
  return {type,total:items.length,categories:normalized,items};
}

function xtreamTypeLabel(type){
  if(type==='live') return 'البث المباشر';
  if(type==='movie') return 'الأفلام';
  return 'المسلسلات';
}

function xtreamTypeShort(type){
  if(type==='live') return 'LIVE';
  if(type==='movie') return 'MOVIES';
  return 'SERIES';
}

async function loadXtreamProfile(config){
  if(state.xtream.busy) return;
  state.xtream.busy=true;
  state.xtream.message='جاري فحص حساب Xtream...';
  renderXtream();
  try{
    const profile=normalizeXtreamConfig(config);
    const auth=await xtreamFetch('',{},profile);
    const userInfo=auth?.user_info||{};
    const authenticated=String(userInfo.auth??'1')!=='0'&&!/disabled|banned|expired/i.test(str(userInfo.status));
    if(!authenticated) throw new Error('الحساب غير فعال أو بيانات الدخول غير صحيحة.');

    state.xtream.profile=profile;
    state.xtream.auth={
      status:str(userInfo.status)||'Active',
      expDate:str(userInfo.exp_date),
      maxConnections:str(userInfo.max_connections),
      activeConnections:str(userInfo.active_cons)
    };
    state.xtream.message='جاري قراءة الأقسام والمحتوى...';
    renderXtream();

    const results=await Promise.all([
      xtreamTry('get_live_categories',profile),
      xtreamTry('get_live_streams',profile),
      xtreamTry('get_vod_categories',profile),
      xtreamTry('get_vod_streams',profile),
      xtreamTry('get_series_categories',profile),
      xtreamTry('get_series',profile)
    ]);

    state.xtream.catalog={
      live:xtreamCatalogType('live',results[0],results[1]),
      movie:xtreamCatalogType('movie',results[2],results[3]),
      series:xtreamCatalogType('series',results[4],results[5])
    };
    state.xtream.view='summary';
    state.xtream.activeType='';
    state.xtream.activeCategory='';
    state.xtream.message='تم الاتصال وقراءة الأقسام بنجاح.';
    renderXtream();
  }catch(error){
    state.xtream.profile=null;
    state.xtream.auth=null;
    state.xtream.catalog=null;
    state.xtream.message=error?.message||'تعذر الاتصال بحساب Xtream.';
    renderXtream();
  }finally{
    state.xtream.busy=false;
  }
}

async function handleXtreamFile(file){
  if(!file) return;
  if(file.size>1024*1024) {
    state.xtream.message='ملف JSON أكبر من الحد المطلوب.';
    renderXtream();
    return;
  }
  try{
    const textValue=await file.text();
    const config=JSON.parse(textValue);
    await loadXtreamProfile(config);
  }catch(error){
    state.xtream.message=error instanceof SyntaxError?'ملف JSON غير صالح.':(error?.message||'تعذر قراءة الملف.');
    renderXtream();
  }
}

function clearXtream(){
  stopStreamPlayers(document);
  state.xtream={profile:null,auth:null,catalog:null,view:'summary',activeType:'',activeCategory:'',seriesInfo:null,busy:false,message:'تم قطع الاتصال ومسح بيانات الحساب من الذاكرة.'};
  renderXtream();
}

function xtreamSummaryCard(type,entry){
  return '<button class="xtream-summary-card" type="button" data-xtream-type="'+type+'">'+
    '<span>'+xtreamTypeShort(type)+'</span>'+
    '<strong>'+formatNumber(entry?.total||0)+'</strong>'+
    '<b>'+escapeHtml(xtreamTypeLabel(type))+'</b>'+
    '<small>'+formatNumber(entry?.categories?.length||0)+' قسم</small>'+
  '</button>';
}

function xtreamCategoryGroup(type,entry){
  return '<section class="xtream-category-group">'+
    '<div class="xtream-group-head"><div><span>'+xtreamTypeShort(type)+'</span><h3>'+escapeHtml(xtreamTypeLabel(type))+'</h3></div><strong>'+formatNumber(entry?.total||0)+'</strong></div>'+
    '<div class="xtream-category-list">'+
      (entry?.categories||[]).map(category=>
        '<button type="button" class="xtream-category" data-xtream-category="'+escapeAttr(category.id)+'" data-xtream-category-type="'+type+'">'+
          '<span>'+escapeHtml(category.name)+'</span><b>'+formatNumber(category.count)+'</b>'+
        '</button>'
      ).join('')+
    '</div>'+
  '</section>';
}

function xtreamItemImage(item,type){
  const raw=type==='series'?(item?.cover||item?.stream_icon):(item?.stream_icon||item?.cover||item?.movie_image);
  const url=safeUrl(raw);
  return url
    ? '<img src="'+escapeAttr(url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">'
    : '<div class="poster-fallback">NO IMAGE</div>';
}

function renderXtreamItems(){
  const catalog=state.xtream.catalog?.[state.xtream.activeType];
  if(!catalog){state.xtream.view='summary';return renderXtream();}
  const categoryId=state.xtream.activeCategory;
  const items=categoryId==='all'||!categoryId
    ? catalog.items
    : catalog.items.filter(item=>str(item?.category_id)===categoryId);
  const visible=items.slice(0,300);
  grid.className='xtream-browser';
  grid.innerHTML=
    '<div class="xtream-browser-head">'+
      '<button class="mini-link xtream-back" type="button" data-xtream-back>رجوع إلى الأقسام</button>'+
      '<div><span class="overview-kicker">'+xtreamTypeShort(state.xtream.activeType)+'</span><h3>'+escapeHtml(xtreamTypeLabel(state.xtream.activeType))+'</h3><p>'+formatNumber(items.length)+' عنصر في هذا القسم</p></div>'+
    '</div>'+
    '<div class="xtream-items-grid">'+visible.map(item=>{
      const id=state.xtream.activeType==='series'?str(item?.series_id):str(item?.stream_id);
      const name=str(item?.name)||'بدون اسم';
      const meta=state.xtream.activeType==='live'
        ? 'قناة مباشرة'
        : state.xtream.activeType==='movie'
          ? (str(item?.rating_5based||item?.rating)?'تقييم '+escapeHtml(str(item?.rating_5based||item?.rating)):'فيلم')
          : 'مسلسل';
      return '<button class="xtream-item-card" type="button" data-xtream-item-type="'+state.xtream.activeType+'" data-xtream-item-id="'+escapeAttr(id)+'">'+
        '<div class="xtream-poster">'+xtreamItemImage(item,state.xtream.activeType)+'</div>'+
        '<div class="xtream-item-copy"><b>'+escapeHtml(name)+'</b><small>'+meta+'</small></div>'+
      '</button>';
    }).join('')+'</div>'+
    (items.length>visible.length?'<div class="xtream-limit-note">يعرض أول '+formatNumber(visible.length)+' من '+formatNumber(items.length)+' عنصر للمحافظة على سرعة الصفحة.</div>':'');
  statusText.textContent=formatNumber(items.length)+' عنصر';
  lastUpdated.textContent='Xtream • البيانات في ذاكرة الصفحة فقط';
}

function renderXtream(){
  filters.hidden=true;
  loadMoreBtn.hidden=true;
  emptyState.hidden=true;

  if(state.xtream.view==='items'&&state.xtream.catalog){
    renderXtreamItems();
    return;
  }

  grid.className='xtream-tool';
  const message=state.xtream.message
    ? '<div class="xtream-message '+(state.xtream.catalog?'success':'')+'">'+escapeHtml(state.xtream.message)+'</div>'
    : '';

  if(!state.xtream.catalog){
    grid.innerHTML=
      '<section class="xtream-connect-card">'+
        '<div class="xtream-connect-icon">XT</div>'+
        '<div class="xtream-connect-copy"><span class="overview-kicker">AUTHORIZED XTREAM</span><h3>فحص وتشغيل حساب Xtream</h3>'+
          '<p>اختر ملف JSON لحساب تملكه أو لديك إذن باستخدامه. يجب أن يحتوي الحقول <code>server</code> و<code>username</code> و<code>password</code>.</p>'+
          '<p class="xtream-security">الملف يُقرأ داخل المتصفح فقط، ولا يتم حفظ بيانات الدخول في التخزين المحلي.</p>'+
        '</div>'+
        '<label class="xtream-file-button"><input id="xtreamJsonFile" type="file" accept=".json,application/json"><span>اختيار ملف JSON</span></label>'+
      '</section>'+
      message+
      '<section class="xtream-source-note"><strong>ملفات المصدر المعروفة</strong><p>'+XTREAM_SOURCES.map(escapeHtml).join(' • ')+'</p><small>لا يتم فتح أو استخدام بيانات الدخول المنشورة في المستودع تلقائياً.</small></section>';
    statusText.textContent=state.xtream.busy?'جاري فحص Xtream...':'اختر ملف JSON مصرحاً لك باستخدامه';
    lastUpdated.textContent='لا يتم حفظ بيانات الدخول';
    return;
  }

  const auth=state.xtream.auth||{};
  grid.innerHTML=
    '<div class="xtream-session-head">'+
      '<div><span class="overview-kicker">XTREAM CONNECTED</span><h3>الحساب متصل</h3><p>الحالة: '+escapeHtml(auth.status||'Active')+
      (auth.activeConnections?' • اتصالات حالية: '+escapeHtml(auth.activeConnections):'')+
      (auth.maxConnections?' / '+escapeHtml(auth.maxConnections):'')+'</p></div>'+
      '<button class="mini-link xtream-disconnect" type="button" data-xtream-disconnect>قطع الاتصال</button>'+
    '</div>'+
    message+
    '<div class="xtream-summary-grid">'+
      xtreamSummaryCard('live',state.xtream.catalog.live)+
      xtreamSummaryCard('movie',state.xtream.catalog.movie)+
      xtreamSummaryCard('series',state.xtream.catalog.series)+
    '</div>'+
    '<div class="xtream-category-columns">'+
      xtreamCategoryGroup('live',state.xtream.catalog.live)+
      xtreamCategoryGroup('movie',state.xtream.catalog.movie)+
      xtreamCategoryGroup('series',state.xtream.catalog.series)+
    '</div>';
  statusText.textContent=
    'Live '+formatNumber(state.xtream.catalog.live.total)+
    ' • Movies '+formatNumber(state.xtream.catalog.movie.total)+
    ' • Series '+formatNumber(state.xtream.catalog.series.total);
  lastUpdated.textContent='Xtream • لا يتم حفظ بيانات الحساب';
}

function xtreamFindItem(type,id){
  return state.xtream.catalog?.[type]?.items?.find(item=>str(type==='series'?item?.series_id:item?.stream_id)===str(id))||null;
}

function xtreamPlaybackUrl(type,item){
  const profile=state.xtream.profile;
  if(!profile||!item) return '';
  const base=profile.server.replace(/\/+$/,'');
  const user=encodeURIComponent(profile.username);
  const pass=encodeURIComponent(profile.password);
  if(type==='live'){
    const ext=str(item?.container_extension)||'m3u8';
    return base+'/live/'+user+'/'+pass+'/'+encodeURIComponent(item.stream_id)+'.'+ext;
  }
  if(type==='movie'){
    const ext=str(item?.container_extension)||'mp4';
    return base+'/movie/'+user+'/'+pass+'/'+encodeURIComponent(item.stream_id)+'.'+ext;
  }
  return '';
}

async function openXtreamSeries(item){
  if(!item||!state.xtream.profile) return;
  statusText.textContent='جاري تحميل حلقات المسلسل...';
  try{
    const info=await xtreamFetch('get_series_info',{series_id:item.series_id});
    state.xtream.seriesInfo=info;
    const seasons=info?.episodes&&typeof info.episodes==='object'?info.episodes:{};
    const profile=state.xtream.profile;
    const base=profile.server.replace(/\/+$/,'');
    const user=encodeURIComponent(profile.username);
    const pass=encodeURIComponent(profile.password);
    const cover=safeUrl(info?.info?.cover||item?.cover||'');
    const blocks=Object.entries(seasons).sort((a,b)=>Number(a[0])-Number(b[0])).map(([seasonNumber,episodes])=>{
      const list=Array.isArray(episodes)?episodes:[];
      return '<section class="xtream-season"><div class="file-row"><strong>الموسم '+escapeHtml(seasonNumber)+'</strong><span class="file-type">'+formatNumber(list.length)+' حلقة</span></div>'+
        '<div class="episode-list">'+list.map(ep=>{
          const ext=str(ep?.container_extension)||'mp4';
          const url=base+'/series/'+user+'/'+pass+'/'+encodeURIComponent(ep?.id)+'.'+ext;
          const title=str(ep?.title)||('الحلقة '+str(ep?.episode_num||ep?.id));
          return '<div class="episode-item"><span>'+escapeHtml(title)+'</span>'+
            '<button class="episode-play" type="button" data-play-url="'+escapeAttr(url)+'" data-play-title="'+escapeAttr(str(item?.name)+' — '+title)+'" data-play-poster="'+escapeAttr(cover)+'">تشغيل</button></div>';
        }).join('')+'</div></section>';
    }).join('');

    dialogContent.innerHTML=
      '<div class="player-view xtream-series-view">'+
        '<div class="player-head"><div><span class="overview-kicker">XTREAM SERIES</span><h3>'+escapeHtml(str(info?.info?.name||item?.name||'مسلسل'))+'</h3></div></div>'+
        (cover?'<img class="xtream-series-cover" src="'+escapeAttr(cover)+'" alt="" referrerpolicy="no-referrer">':'')+
        (blocks||'<div class="error-box">لا توجد حلقات متاحة.</div>')+
      '</div>';
    dialog.showModal();
  }catch(error){
    state.xtream.message='تعذر تحميل تفاصيل المسلسل: '+(error?.message||'خطأ اتصال');
    renderXtream();
  }
}

function openXtreamItem(type,id){
  const item=xtreamFindItem(type,id);
  if(!item) return;
  if(type==='series'){
    openXtreamSeries(item);
    return;
  }
  const url=xtreamPlaybackUrl(type,item);
  openInlinePlayer(url,str(item?.name)||xtreamTypeLabel(type),safeUrl(item?.stream_icon||item?.cover||''));
}

function renderFiles(){
  grid.className = 'grid';
  grid.innerHTML = REPOSITORY_FILES.map(file =>
    '<article class="info-card file-card' + (file.sensitive ? ' sensitive' : '') + '">' +
      '<div class="file-row"><div class="file-name">' + escapeHtml(file.name) + '</div><span class="file-type">' + escapeHtml(file.kind) + '</span></div>' +
      '<p>' + escapeHtml(file.description) + '</p>' +
      (file.url ? '<a class="mini-link" href="' + escapeAttr(file.url) + '" target="_blank" rel="noopener noreferrer">فتح الملف على GitHub</a>' : '') +
      '<div class="info-meta">' + (file.sensitive ? 'محتوى حساس مخفي' : 'ملف عام') + '</div>' +
    '</article>'
  ).join('');
  statusText.textContent = formatNumber(REPOSITORY_FILES.length) + ' ملفات في جذر المستودع';
  lastUpdated.textContent = 'يشمل ملفات المحتوى وملفات الإعداد';
}

document.querySelectorAll('.section-tab').forEach(button => {
  button.addEventListener('click', () => setSection(button.dataset.section));
});

document.querySelectorAll('[data-jump]').forEach(card => {
  card.addEventListener('click', () => setSection(card.dataset.jump));
});

$('#searchInput').addEventListener('input', event => {
  state.query = event.target.value.trim();
  filterMedia();
});

$('#genreSelect').addEventListener('change', event => {
  state.genre = event.target.value;
  filterMedia();
});

loadMoreBtn.addEventListener('click', () => {
  state.visible += PAGE_SIZE;
  renderMedia();
});

$('#refreshBtn').addEventListener('click', () => loadData(true));
$('#closeDialog').addEventListener('click', () => {
  stopStreamPlayers(dialog);
  dialog.close();
});

dialogContent.addEventListener('click', event => {
  const streamStart = event.target.closest('[data-stream-start]');
  if (streamStart) {
    startStreamPlayer(streamStart);
    return;
  }

  const playButton = event.target.closest('[data-play-url]');
  if (!playButton) return;
  openInlinePlayer(
    playButton.dataset.playUrl,
    playButton.dataset.playTitle,
    playButton.dataset.playPoster
  );
});

dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  stopStreamPlayers(dialog);
  dialog.close();
});

setSection('overview');
loadData();