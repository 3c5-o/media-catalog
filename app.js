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

const CACHE_KEY = 'media_catalog_full_v2';
const CACHE_TTL = 30 * 60 * 1000;
const PAGE_SIZE = 48;

const data = { movies:[], episodes:[], series:[] };
const state = { section:'overview', query:'', genre:'all', visible:PAGE_SIZE, filtered:[], updatedAt:null };

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

function directVideoMime(value){
  const url = safeUrl(value);
  if (!url) return '';
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (pathname.endsWith('.mp4') || pathname.endsWith('.m4v')) return 'video/mp4';
    if (pathname.endsWith('.webm')) return 'video/webm';
    if (pathname.endsWith('.ogv') || pathname.endsWith('.ogg')) return 'video/ogg';
  } catch {}
  return '';
}

function inlinePlayerButton(item){
  const mime = directVideoMime(item?.url);
  if (!mime) return '';
  return '<button class="source-link play-button" type="button" data-play-url="' +
    escapeAttr(item.url) + '" data-play-title="' + escapeAttr(item.title) +
    '" data-play-poster="' + escapeAttr(item.image || '') +
    '">تشغيل الآن</button>';
}

function openInlinePlayer(url, title, poster){
  const safe = safeUrl(url);
  const mime = directVideoMime(safe);
  if (!safe || !mime) return;

  dialogContent.innerHTML =
    '<div class="player-view">' +
      '<div class="player-head"><div><span class="overview-kicker">INTERNAL PLAYER</span><h3>' +
      escapeHtml(title || 'تشغيل الفيديو') +
      '</h3></div></div>' +
      '<div class="video-shell">' +
        '<video id="internalVideo" controls playsinline preload="metadata"' +
        (poster ? ' poster="' + escapeAttr(poster) + '"' : '') + '>' +
          '<source src="' + escapeAttr(safe) + '" type="' + escapeAttr(mime) + '">' +
          'متصفحك لا يدعم تشغيل هذا الفيديو.' +
        '</video>' +
      '</div>' +
      '<div class="player-actions">' +
        '<a class="mini-link" href="' + escapeAttr(safe) + '" target="_blank" rel="noopener noreferrer">فتح الرابط مباشرة</a>' +
      '</div>' +
    '</div>';

  const video = $('#internalVideo');
  if (video) {
    video.play().catch(() => {});
  }
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
  state.updatedAt = time;

  $('#movieCount').textContent = formatNumber(data.movies.length);
  $('#seriesCount').textContent = formatNumber(data.series.length);
  $('#animeCount').textContent = formatNumber(data.episodes.length);
  $('#overviewMovieCount').textContent = formatNumber(data.movies.length);
  $('#overviewSeriesCount').textContent = formatNumber(data.series.length);
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
    series:{ eyebrow:'SERIES', title:'المسلسلات / السلاسل المجمعة من بيانات الأنمي' },
    anime:{ eyebrow:'ANIME EPISODES', title:'حلقات الأنمي' },
    xtream:{ eyebrow:'XTREAM SOURCES', title:'مصادر Xtream الموجودة في المستودع' },
    files:{ eyebrow:'REPOSITORY FILES', title:'كل ملفات المصدر' }
  }[section];

  $('#sectionEyebrow').textContent = sectionInfo?.eyebrow || 'CATALOG';
  $('#sectionTitle').textContent = sectionInfo?.title || 'المحتوى';

  const mediaSection = ['movie','series','anime'].includes(section);
  filters.hidden = !mediaSection;
  loadMoreBtn.hidden = true;
  emptyState.hidden = true;

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
  if (state.section === 'series') return data.series;
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
  let badge = 'فيلم';
  let meta = item.genre;
  if (item.type === 'series') {
    badge = formatNumber(item.episodeCount) + ' حلقة';
    meta = item.genre;
  }
  if (item.type === 'anime') {
    badge = item.episode ? 'حلقة ' + escapeHtml(item.episode) : 'أنمي';
    meta = item.series || item.genre;
  }

  const image = item.image
    ? '<img src="' + escapeAttr(item.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML=\'<div class=&quot;poster-fallback&quot;>NO IMAGE</div>\'">'
    : '<div class="poster-fallback">NO IMAGE</div>';

  return '<article class="card" data-media-id="' + escapeAttr(item.id) + '" tabindex="0">' +
    '<div class="poster">' + image + '</div>' +
    '<span class="badge">' + badge + '</span>' +
    '<div class="card-body"><h3 class="card-title" title="' + escapeAttr(item.title) + '">' + escapeHtml(item.title) + '</h3>' +
    '<div class="meta">' + escapeHtml(meta) + '</div></div></article>';
}

function findMedia(id){
  return [...data.movies,...data.series,...data.episodes].find(item => item.id === id);
}

function openMedia(id){
  const item = findMedia(id);
  if (!item) return;

  const image = item.image
    ? '<img src="' + escapeAttr(item.image) + '" alt="' + escapeAttr(item.title) + '" referrerpolicy="no-referrer">'
    : '<div class="poster-fallback" style="aspect-ratio:2/3;border-radius:17px">NO IMAGE</div>';

  if (item.type === 'series') {
    const episodes = item.episodes.map(ep =>
      '<div class="episode-item"><span>' +
      escapeHtml(ep.episode ? 'الحلقة ' + ep.episode : ep.title) +
      '</span>' +
      (ep.url ? '<a href="' + escapeAttr(ep.url) + '" target="_blank" rel="noopener noreferrer">فتح المصدر</a>' : '<span>بدون رابط</span>') +
      '</div>'
    ).join('');

    dialogContent.innerHTML = '<div class="detail"><div>' + image + '</div><div>' +
      '<div class="chips"><span class="chip">سلسلة</span><span class="chip">' + escapeHtml(item.genre) + '</span><span class="chip">' + formatNumber(item.episodeCount) + ' حلقة</span></div>' +
      '<h3>' + escapeHtml(item.title) + '</h3>' +
      '<p>تم تجميع هذه السلسلة تلقائياً من الحلقات التي تحمل نفس <code>series_name</code> في ملف الأنمي.</p>' +
      '<div class="episode-list">' + episodes + '</div>' +
      '</div></div>';
  } else {
    const chips = [
      item.type === 'movie' ? 'فيلم' : 'حلقة أنمي',
      item.genre,
      item.episode ? 'الحلقة ' + item.episode : ''
    ].filter(Boolean).map(value => '<span class="chip">' + escapeHtml(value) + '</span>').join('');

    dialogContent.innerHTML = '<div class="detail"><div>' + image + '</div><div>' +
      '<div class="chips">' + chips + '</div>' +
      '<h3>' + escapeHtml(item.title) + '</h3>' +
      (item.series ? '<p>السلسلة: <strong>' + escapeHtml(item.series) + '</strong></p>' : '') +
      '<p>المعلومات معروضة كما تصل من ملف JSON الخارجي.</p>' +
      (item.url ? inlinePlayerButton(item) + '<a class="mini-link source-secondary" href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener noreferrer">فتح رابط المصدر</a>' : '<p>لا يوجد رابط مصدر صالح.</p>') +
      '<div class="source-note">' + (directVideoMime(item.url) ? 'هذا الرابط يدعم التشغيل المباشر داخل المتصفح. ' : '') + 'الموقع لا يعيد استضافة الفيديو؛ توفر الرابط يعتمد على المصدر الخارجي.</div>' +
      '</div></div>';
  }

  dialog.showModal();
}

function renderXtream(){
  grid.className = 'grid';
  grid.innerHTML = XTREAM_SOURCES.map((name,index) =>
    '<article class="info-card warning sensitive">' +
      '<div class="info-icon">X' + (index + 1) + '</div>' +
      '<h3>' + escapeHtml(name) + '</h3>' +
      '<p>إعداد Xtream خارجي موجود في المستودع الأصلي. يحتوي حقول <code>server</code> و<code>username</code> و<code>password</code>.</p>' +
      '<p>لأسباب أمنية، هذه الواجهة لا تجلب ولا تعرض ولا تستخدم بيانات الدخول المنشورة.</p>' +
      '<div class="info-meta">المصدر مسجّل فقط كقسم متاح في المستودع</div>' +
    '</article>'
  ).join('');
  statusText.textContent = formatNumber(XTREAM_SOURCES.length) + ' ملفات إعداد Xtream';
  lastUpdated.textContent = 'بيانات الدخول مخفية وغير مستخدمة';
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
  const video = dialog.querySelector('video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  dialog.close();
});

dialogContent.addEventListener('click', event => {
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
  const video = dialog.querySelector('video');
  if (video) video.pause();
  dialog.close();
});

setSection('overview');
loadData();