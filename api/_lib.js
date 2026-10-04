const MOVIE_SOURCES = [
  "https://raw.githubusercontent.com/SAMEHJA/live/main/movsameh.json",
  "https://samehja.github.io/live/movsameh.json"
];
const ANIME_SOURCES = [
  "https://raw.githubusercontent.com/SAMEHJA/live/main/anisameh.json",
  "https://samehja.github.io/live/anisameh.json"
];

const memory = globalThis.__MEDIA_CATALOG_CACHE__ || (globalThis.__MEDIA_CATALOG_CACHE__ = {
  movies: null,
  episodes: null,
  series: null,
  loadedAt: 0
});
const MEMORY_TTL = 5 * 60 * 1000;

function str(v){ return String(v ?? "").trim(); }
function safeUrl(v){
  try {
    const u = new URL(str(v));
    return ["http:","https:"].includes(u.protocol) ? u.href : "";
  } catch { return ""; }
}
function normalizeGenre(v){
  const g = str(v) || "غير مصنف";
  return g === "أكشن" ? "اكشن" : g;
}
function hash(input){
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
function makeId(prefix, title, url){
  return prefix + "_" + hash(str(title) + "|" + str(url));
}
function pick(obj, keys){
  for (const key of keys) {
    if (obj && obj[key] != null && str(obj[key])) return obj[key];
  }
  return "";
}
function asArray(value, keys){
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
}
function normalizeMovie(item){
  const title = str(pick(item,["title","name","movie_name"])) || "بدون عنوان";
  const video = safeUrl(pick(item,["url","link","video","stream_url","source"]));
  return {
    id: makeId("movie", title, video),
    type: "movie",
    title,
    poster: safeUrl(pick(item,["logo","poster","image","cover","poster_url"])),
    genre: normalizeGenre(pick(item,["genre","category","type"])),
    video
  };
}
function normalizeEpisode(item){
  const series = str(pick(item,["series_name","anime_name","series","anime","show_name","group"])) || "غير معروف";
  const episodeNumber = str(pick(item,["episode_number","episode","ep","number"]));
  const title = str(pick(item,["episode_name","title","name","episodeTitle","episode_title"])) || series;
  const video = safeUrl(pick(item,["url","link","video","stream_url","source"]));
  return {
    id: makeId("episode", title + "|" + episodeNumber, video),
    type: "anime",
    title,
    series,
    episode: episodeNumber,
    poster: safeUrl(pick(item,["logo","poster","image","cover","poster_url"])),
    genre: normalizeGenre(pick(item,["genre","category","group"])),
    video
  };
}
function buildSeries(episodes){
  const groups = new Map();
  for (const ep of episodes) {
    const key = ep.series || "غير معروف";
    if (!groups.has(key)) {
      groups.set(key, {
        id: makeId("series", key, ep.poster),
        type: "series",
        title: key,
        poster: ep.poster,
        genre: ep.genre,
        episode_count: 0,
        episodes: []
      });
    }
    const group = groups.get(key);
    group.episode_count += 1;
    group.episodes.push(ep);
    if (!group.poster && ep.poster) group.poster = ep.poster;
  }
  for (const group of groups.values()) {
    group.episodes.sort((a,b) => {
      const na = Number(a.episode), nb = Number(b.episode);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.title.localeCompare(b.title, "ar");
    });
  }
  return [...groups.values()];
}
async function fetchFirst(urls){
  let lastError;
  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const r = await fetch(url, { signal: controller.signal, headers: { "user-agent": "media-catalog-provider/1.0" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("Source unavailable");
}
async function loadAll(force=false){
  if (!force && memory.movies && memory.episodes && Date.now() - memory.loadedAt < MEMORY_TTL) return memory;
  const [moviesRaw, animeRaw] = await Promise.all([fetchFirst(MOVIE_SOURCES), fetchFirst(ANIME_SOURCES)]);
  memory.movies = asArray(moviesRaw,["movies","items","data","results"]).map(normalizeMovie);
  memory.episodes = asArray(animeRaw,["anime","animes","episodes","items","data","results"]).map(normalizeEpisode);
  memory.series = buildSeries(memory.episodes);
  memory.loadedAt = Date.now();
  return memory;
}
function int(v, fallback, min, max){
  const n = Number.parseInt(v,10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
function page(items, query){
  const pageNo = int(query.page,1,1,100000);
  const limit = int(query.limit,24,1,100);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (pageNo - 1) * limit;
  return { data: items.slice(start,start+limit), pagination:{ page:pageNo, limit, total, pages, has_more:start+limit < total } };
}
function filterItems(items, query){
  const q = str(query.q).toLocaleLowerCase("ar");
  const genre = str(query.genre);
  return items.filter(item => {
    const genreOk = !genre || genre === "all" || item.genre === genre;
    if (!genreOk) return false;
    if (!q) return true;
    return [item.title,item.series,item.genre,item.episode].filter(Boolean).join(" ").toLocaleLowerCase("ar").includes(q);
  });
}
function send(res, status, body, ttl=300){
  res.statusCode = status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Cache-Control","public, max-age=60, s-maxage="+ttl+", stale-while-revalidate=3600");
  res.end(JSON.stringify(body));
}
function options(req,res){
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers","Content-Type");
    res.end();
    return true;
  }
  return false;
}
function requireGet(req,res){
  if (options(req,res)) return false;
  if (req.method !== "GET") {
    send(res,405,{ok:false,error:"method_not_allowed"},0);
    return false;
  }
  return true;
}
function queryOf(req){
  const url = new URL(req.url, "https://provider.local");
  return Object.fromEntries(url.searchParams.entries());
}
function itemById(items,id){ return items.find(x => x.id === id); }
function summarySeries(series){ const { episodes, ...rest } = series; return rest; }

module.exports = { loadAll, page, filterItems, send, requireGet, queryOf, itemById, summarySeries };