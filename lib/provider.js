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
  animeCatalog: null,
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
  const poster = safeUrl(pick(item,["logo","poster","image","cover","poster_url"]));
  const genre = normalizeGenre(pick(item,["genre","category","type"]));
  let host = "";
  let format = "";
  try {
    const u = new URL(video);
    host = u.hostname;
    const match = u.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    format = match ? match[1] : "";
  } catch {}
  return {
    id: makeId("movie", title, video),
    type: "movie",
    title,
    poster,
    genre,
    genres:[genre],
    video,
    playback:{ url:video, host, format, direct:Boolean(video) },
    source:{ repository:"SAMEHJA/live", file:"movsameh.json" }
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

function parseAnimeSeriesName(value){
  const original = str(value) || "غير معروف";
  const patterns = [
    /\s+season\s*(\d+)\s*$/i,
    /\s+(\d+)(?:st|nd|rd|th)\s+season\s*$/i,
    /\s+s(?:eason)?\s*(\d+)\s*$/i
  ];
  for (const pattern of patterns) {
    const match = original.match(pattern);
    if (match) {
      const season = Math.max(1, Number.parseInt(match[1],10) || 1);
      const base = original.replace(pattern,"").trim() || original;
      return { original, base, season };
    }
  }
  return { original, base:original, season:1 };
}

function buildAnimeCatalog(episodes){
  const catalog = new Map();
  for (const ep of episodes) {
    const parsed = parseAnimeSeriesName(ep.series);
    const key = parsed.base.toLocaleLowerCase("en");
    if (!catalog.has(key)) {
      catalog.set(key,{
        id:makeId("anime",parsed.base,""),
        type:"anime_title",
        title:parsed.base,
        poster:ep.poster,
        genre:ep.genre,
        genres:[],
        season_count:0,
        episode_count:0,
        seasons:[]
      });
    }
    const anime = catalog.get(key);
    if (!anime.poster && ep.poster) anime.poster = ep.poster;
    if (!anime.genres.includes(ep.genre)) anime.genres.push(ep.genre);
    if (!anime.genre || anime.genre === "غير مصنف") anime.genre = ep.genre;

    let season = anime.seasons.find(x=>x.season === parsed.season);
    if (!season) {
      season = {
        season:parsed.season,
        title:parsed.original,
        episode_count:0,
        episodes:[]
      };
      anime.seasons.push(season);
    }
    season.episodes.push(ep);
    season.episode_count += 1;
    anime.episode_count += 1;
  }

  for (const anime of catalog.values()) {
    anime.seasons.sort((a,b)=>a.season-b.season);
    for (const season of anime.seasons) {
      season.episodes.sort((a,b)=>{
        const na=Number(a.episode), nb=Number(b.episode);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na-nb;
        return a.title.localeCompare(b.title,"ar");
      });
    }
    anime.season_count = anime.seasons.length;
  }
  return [...catalog.values()];
}

function summaryAnime(anime){
  const { seasons, ...rest } = anime;
  return rest;
}

async function fetchJsonUrl(url, options={}){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), options.timeout || 12000);
  try {
    const r = await fetch(url,{
      signal:controller.signal,
      headers:{ accept:"application/json", ...(options.headers||{}) }
    });
    if (!r.ok) throw new Error("HTTP "+r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

async function enrichAnime(anime){
  try {
    const q = encodeURIComponent(anime.title);
    const search = await fetchJsonUrl("https://api.jikan.moe/v4/anime?q="+q+"&limit=1");
    const hit = search?.data?.[0];
    if (!hit?.mal_id) return { ...anime, metadata:{ provider:"jikan", enriched:false } };
    const full = await fetchJsonUrl("https://api.jikan.moe/v4/anime/"+hit.mal_id+"/full");
    const x = full?.data || hit;
    return {
      ...anime,
      poster: anime.poster || x?.images?.jpg?.large_image_url || x?.images?.webp?.large_image_url || "",
      metadata:{
        provider:"jikan",
        enriched:true,
        mal_id:x.mal_id || null,
        title_english:x.title_english || null,
        title_japanese:x.title_japanese || null,
        synopsis:x.synopsis || null,
        background:x.background || null,
        status:x.status || null,
        year:x.year || x.aired?.prop?.from?.year || null,
        score:x.score ?? null,
        scored_by:x.scored_by ?? null,
        rank:x.rank ?? null,
        popularity:x.popularity ?? null,
        rating:x.rating || null,
        duration:x.duration || null,
        episodes:x.episodes ?? null,
        season:x.season || null,
        broadcast:x.broadcast?.string || null,
        studios:Array.isArray(x.studios)?x.studios.map(v=>v.name):[],
        producers:Array.isArray(x.producers)?x.producers.map(v=>v.name):[],
        genres:Array.isArray(x.genres)?x.genres.map(v=>v.name):[],
        themes:Array.isArray(x.themes)?x.themes.map(v=>v.name):[],
        trailer:x.trailer?.url || null,
        url:x.url || null
      }
    };
  } catch (e) {
    return { ...anime, metadata:{ provider:"jikan", enriched:false, error:"metadata_unavailable" } };
  }
}

async function enrichMovie(movie){
  const credential = process.env.TMDB_API_TOKEN || process.env.TMDB_API_KEY || "";
  if (!credential) {
    return { ...movie, metadata:{ provider:"source", enriched:false, reason:"tmdb_key_not_configured" } };
  }
  try {
    const bearer = credential.includes(".") || credential.length > 40;
    const authHeaders = bearer ? { Authorization:"Bearer "+credential } : {};
    const apiKey = bearer ? "" : "&api_key="+encodeURIComponent(credential);
    const search = await fetchJsonUrl(
      "https://api.themoviedb.org/3/search/movie?query="+encodeURIComponent(movie.title)+"&language=ar"+apiKey,
      {headers:authHeaders}
    );
    const hit = search?.results?.[0];
    if (!hit?.id) return { ...movie, metadata:{ provider:"tmdb", enriched:false } };
    const details = await fetchJsonUrl(
      "https://api.themoviedb.org/3/movie/"+hit.id+"?language=ar&append_to_response=credits,videos"+apiKey,
      {headers:authHeaders}
    );
    return {
      ...movie,
      metadata:{
        provider:"tmdb",
        enriched:true,
        tmdb_id:details.id,
        original_title:details.original_title || null,
        overview:details.overview || null,
        release_date:details.release_date || null,
        year:details.release_date ? Number(details.release_date.slice(0,4)) : null,
        runtime:details.runtime ?? null,
        vote_average:details.vote_average ?? null,
        vote_count:details.vote_count ?? null,
        popularity:details.popularity ?? null,
        status:details.status || null,
        original_language:details.original_language || null,
        genres:Array.isArray(details.genres)?details.genres.map(v=>v.name):[],
        countries:Array.isArray(details.production_countries)?details.production_countries.map(v=>v.name):[],
        companies:Array.isArray(details.production_companies)?details.production_companies.map(v=>v.name):[],
        cast:Array.isArray(details.credits?.cast)?details.credits.cast.slice(0,12).map(v=>({name:v.name,character:v.character||null})):[],
        tmdb_url:"https://www.themoviedb.org/movie/"+details.id
      }
    };
  } catch (e) {
    return { ...movie, metadata:{ provider:"tmdb", enriched:false, error:"metadata_unavailable" } };
  }
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
  memory.animeCatalog = buildAnimeCatalog(memory.episodes);
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

module.exports = {
  loadAll, page, filterItems, send, requireGet, queryOf, itemById, summarySeries,
  buildAnimeCatalog, summaryAnime, parseAnimeSeriesName, enrichAnime, enrichMovie
};