const SOURCES = {
  movies: 'https://raw.githubusercontent.com/SAMEHJA/live/main/movsameh.json',
  anime: 'https://raw.githubusercontent.com/SAMEHJA/live/main/anisameh.json'
};

const CACHE_KEY = 'media_catalog_cache_v1';
const CACHE_TTL = 30 * 60 * 1000;
const PAGE_SIZE = 48;

const state = { all: [], filtered: [], type: 'all', genre: 'all', query: '', visible: PAGE_SIZE, updatedAt: null };

const $ = (s) => document.querySelector(s);
const grid = $('#grid');
const emptyState = $('#emptyState');
const loadMoreBtn = $('#loadMoreBtn');
const statusText = $('#statusText');
const lastUpdated = $('#lastUpdated');
const dialog = $('#detailsDialog');
const dialogContent = $('#dialogContent');

function text(v){ return String(v ?? '').trim(); }
function pick(obj, keys){ for (const k of keys) if (obj && obj[k] != null && text(obj[k])) return obj[k]; return ''; }
function asArray(data, keys){
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function safeUrl(v){
  try { const u = new URL(text(v)); return ['http:','https:'].includes(u.protocol) ? u.href : ''; }
  catch { return ''; }
}

function normalizeMovie(item, i){
  return {
    id: `movie-${i}`,
    type: 'movie',
    title: text(pick(item,['title','name','movie_name'])) || `فيلم ${i+1}`,
    image: safeUrl(pick(item,['logo','poster','image','cover','poster_url'])),
    genre: text(pick(item,['genre','category','type'])) || 'غير مصنف',
    url: safeUrl(pick(item,['url','link','video','stream_url','source'])),
    episode: '', series: '', raw: item
  };
}

function normalizeAnime(item, i){
  const title = text(pick(item,['episode_name','title','name','episodeTitle','episode_title']));
  const series = text(pick(item,['series_name','anime_name','series','anime','show_name']));
  const episode = text(pick(item,['episode_number','episode','ep','number']));
  return {
    id: `anime-${i}`,
    type: 'anime',
    title: title || series || `عنصر أنمي ${i+1}`,
    image: safeUrl(pick(item,['logo','poster','image','cover','poster_url'])),
    genre: text(pick(item,['genre','category','group'])) || 'أنمي',
    url: safeUrl(pick(item,['url','link','video','stream_url','source'])),
    episode,
    series,
    raw: item
  };
}

async function fetchJson(url){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { cache:'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

function readCache(){
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!c?.time || !Array.isArray(c?.items)) return null;
    return c;
  } catch { return null; }
}
function saveCache(items){
  const payload = { time: Date.now(), items };
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

async function loadData(force=false){
  statusText.textContent = 'جاري تحميل البيانات...';
  grid.innerHTML = '';
  const cached = readCache();
  if (!force && cached && Date.now() - cached.time < CACHE_TTL) {
    applyLoaded(cached.items, cached.time, 'تم التحميل من التخزين المؤقت');
    return;
  }

  const results = await Promise.allSettled([fetchJson(SOURCES.movies), fetchJson(SOURCES.anime)]);
  const items = [];
  const errors = [];

  if (results[0].status === 'fulfilled') {
    const list = asArray(results[0].value,['movies','data','items','results']);
    items.push(...list.map(normalizeMovie));
  } else errors.push('تعذر تحميل الأفلام');

  if (results[1].status === 'fulfilled') {
    const list = asArray(results[1].value,['anime','animes','episodes','data','items','results']);
    items.push(...list.map(normalizeAnime));
  } else errors.push('تعذر تحميل الأنمي');

  if (!items.length && cached?.items?.length) {
    applyLoaded(cached.items, cached.time, 'المصدر غير متاح حالياً — تم عرض آخر نسخة محفوظة');
    return;
  }
  if (!items.length) {
    statusText.textContent = errors.join(' — ') || 'لم تصل بيانات قابلة للعرض';
    grid.innerHTML = `<div class="error-box">تعذر جلب البيانات من المصدر. جرّب التحديث لاحقاً أو تحقّق من بنية ملفات JSON.</div>`;
    return;
  }

  const saved = saveCache(items);
  applyLoaded(items, saved.time, errors.length ? `تم التحميل جزئياً — ${errors.join('، ')}` : 'تم تحديث البيانات بنجاح');
}

function applyLoaded(items, time, message){
  state.all = items;
  state.updatedAt = time;
  $('#totalCount').textContent = items.length.toLocaleString('ar-IQ');
  $('#movieCount').textContent = items.filter(x=>x.type==='movie').length.toLocaleString('ar-IQ');
  $('#animeCount').textContent = items.filter(x=>x.type==='anime').length.toLocaleString('ar-IQ');
  statusText.textContent = message;
  lastUpdated.textContent = `آخر تحديث: ${new Date(time).toLocaleString('ar-IQ')}`;
  buildGenres();
  filterAndRender();
}

function buildGenres(){
  const select = $('#genreSelect');
  const previous = select.value;
  const genres = [...new Set(state.all.map(x=>x.genre).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
  select.innerHTML = `<option value="all">كل التصنيفات</option>` + genres.map(g=>`<option value="${escapeAttr(g)}">${escapeHtml(g)}</option>`).join('');
  if ([...select.options].some(o=>o.value===previous)) select.value = previous;
}

function filterAndRender(reset=true){
  if (reset) state.visible = PAGE_SIZE;
  const q = state.query.toLocaleLowerCase('ar');
  state.filtered = state.all.filter(item => {
    const typeOk = state.type === 'all' || item.type === state.type;
    const genreOk = state.genre === 'all' || item.genre === state.genre;
    const hay = `${item.title} ${item.series} ${item.genre} ${item.episode}`.toLocaleLowerCase('ar');
    return typeOk && genreOk && (!q || hay.includes(q));
  });
  render();
}

function render(){
  const slice = state.filtered.slice(0,state.visible);
  grid.innerHTML = slice.map(cardTemplate).join('');
  emptyState.hidden = state.filtered.length !== 0;
  loadMoreBtn.hidden = state.visible >= state.filtered.length;
  statusText.textContent = state.filtered.length ? `${state.filtered.length.toLocaleString('ar-IQ')} نتيجة` : 'لا توجد نتائج مطابقة';
  grid.querySelectorAll('.card').forEach(card => card.addEventListener('click', () => openDetails(card.dataset.id)));
}

function cardTemplate(item){
  const badge = item.type === 'movie' ? 'فيلم' : (item.episode ? `حلقة ${escapeHtml(item.episode)}` : 'أنمي');
  const image = item.image ? `<img src="${escapeAttr(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<div class=&quot;poster-fallback&quot;>NO IMAGE</div>'">` : `<div class="poster-fallback">NO IMAGE</div>`;
  return `<article class="card" data-id="${escapeAttr(item.id)}" tabindex="0">
    <div class="poster">${image}</div><span class="badge">${badge}</span>
    <div class="card-body"><h3 class="card-title" title="${escapeAttr(item.title)}">${escapeHtml(item.title)}</h3>
    <div class="meta">${escapeHtml(item.series || item.genre)}</div></div></article>`;
}

function openDetails(id){
  const item = state.all.find(x=>x.id===id); if (!item) return;
  const image = item.image ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}" referrerpolicy="no-referrer">` : `<div class="poster-fallback" style="aspect-ratio:2/3;border-radius:17px">NO IMAGE</div>`;
  const chips = [item.type==='movie'?'فيلم':'أنمي', item.genre, item.episode?`الحلقة ${item.episode}`:''].filter(Boolean).map(x=>`<span class="chip">${escapeHtml(x)}</span>`).join('');
  dialogContent.innerHTML = `<div class="detail"><div>${image}</div><div><div class="chips">${chips}</div><h3>${escapeHtml(item.title)}</h3>${item.series?`<p>السلسلة: <strong>${escapeHtml(item.series)}</strong></p>`:''}<p>هذه الصفحة تعرض البيانات كما تصل من المصدر الخارجي، لذلك توفر الرابط واستمراره يعتمد على المصدر.</p>${item.url?`<a class="source-link" href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">فتح رابط المصدر</a>`:`<p>لا يوجد رابط مصدر صالح لهذا العنصر.</p>`}<div class="source-note">لا يتم حفظ أو إعادة استضافة ملفات الفيديو داخل هذا الموقع.</div></div></div>`;
  dialog.showModal();
}

function escapeHtml(v){ return text(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(v){ return escapeHtml(v); }

$('#searchInput').addEventListener('input', e=>{ state.query = e.target.value.trim(); filterAndRender(); });
$('#genreSelect').addEventListener('change', e=>{ state.genre = e.target.value; filterAndRender(); });
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); state.type=btn.dataset.type; filterAndRender();
}));
loadMoreBtn.addEventListener('click',()=>{ state.visible += PAGE_SIZE; render(); });
$('#refreshBtn').addEventListener('click',()=>loadData(true));
$('#closeDialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{ if(e.target===dialog) dialog.close(); });
grid.addEventListener('keydown',e=>{ const card=e.target.closest('.card'); if(card && (e.key==='Enter'||e.key===' ')){e.preventDefault();openDetails(card.dataset.id);} });

loadData();