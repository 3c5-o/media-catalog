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
  loadedAt: 0,
  stale: false,
  lastError: null,
  retryAt: 0
});
const MEMORY_TTL = 5 * 60 * 1000;
const metadataMemory = globalThis.__MEDIA_CATALOG_METADATA__ || (globalThis.__MEDIA_CATALOG_METADATA__ = {
  anime: new Map(),
  movies: new Map()
});
const METADATA_TTL = 6 * 60 * 60 * 1000;
const LINK_HEALTH_TTL = 5 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 120;

const linkHealthMemory = globalThis.__MEDIA_CATALOG_LINK_HEALTH__ || (globalThis.__MEDIA_CATALOG_LINK_HEALTH__ = new Map());
const rateMemory = globalThis.__MEDIA_CATALOG_RATE_LIMIT__ || (globalThis.__MEDIA_CATALOG_RATE_LIMIT__ = new Map());

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
function detectFormat(url){
  const safe=safeUrl(url);
  if(!safe) return "";
  try{
    const path=new URL(safe).pathname.toLowerCase();
    const m=path.match(/\.([a-z0-9]+)$/);
    return m?m[1]:"";
  }catch{return "";}
}

function playbackProfile(video){
  const url=safeUrl(video);
  let host="";
  try{host=url?new URL(url).hostname:"";}catch{}
  const format=detectFormat(url);
  const knownMedia=["mp4","m4v","webm","ogv","ogg","m3u8","mkv","ts"];
  const recognized_media=knownMedia.includes(format);
  let browser_support="unknown";
  let strategy="external_or_custom_player";
  let browser_playable=false;
  let issue=null;

  if(["mp4","m4v","webm","ogv","ogg"].includes(format)){
    browser_support="native";
    strategy="native_html5";
    browser_playable=true;
  }else if(format==="m3u8"){
    browser_support="hls";
    strategy="hls_native_or_hlsjs";
    browser_playable=true;
  }else if(format==="mkv"){
    browser_support="limited";
    strategy="external_player_or_transcode";
  }else if(format==="ts"){
    browser_support="limited";
    strategy="hls_or_transmux";
  }else if(!url){
    issue="missing_video_url";
  }else if(["jpg","jpeg","png","webp","gif"].includes(format)){
    issue="image_url_in_video_field";
  }else if(!format){
    issue="non_file_or_missing_extension";
  }else{
    issue="unsupported_media_extension";
  }

  return {
    url,
    host,
    format,
    direct:Boolean(url),
    recognized_media,
    browser_playable,
    browser_support,
    strategy,
    issue
  };
}
function clientIp(req){
  const fwd=str(req?.headers?.["x-forwarded-for"]).split(",")[0].trim();
  return fwd || str(req?.headers?.["x-real-ip"]) || "unknown";
}

function applyRateLimit(req,res){
  const now=Date.now();
  const ip=clientIp(req);
  const key=ip;
  let entry=rateMemory.get(key);
  if(!entry || now-entry.startedAt>=RATE_WINDOW_MS){
    entry={startedAt:now,count:0};
  }
  entry.count+=1;
  rateMemory.set(key,entry);

  if(rateMemory.size>5000){
    for(const [k,v] of rateMemory){
      if(now-v.startedAt>=RATE_WINDOW_MS*2) rateMemory.delete(k);
    }
  }

  const remaining=Math.max(0,RATE_LIMIT-entry.count);
  const reset=Math.ceil((entry.startedAt+RATE_WINDOW_MS)/1000);
  res.setHeader("X-RateLimit-Limit",String(RATE_LIMIT));
  res.setHeader("X-RateLimit-Remaining",String(remaining));
  res.setHeader("X-RateLimit-Reset",String(reset));

  if(entry.count>RATE_LIMIT){
    res.setHeader("Retry-After",String(Math.max(1,Math.ceil((entry.startedAt+RATE_WINDOW_MS-now)/1000))));
    send(res,429,{ok:false,error:"rate_limited",retry_after_seconds:Math.max(1,Math.ceil((entry.startedAt+RATE_WINDOW_MS-now)/1000))},0);
    return false;
  }
  return true;
}

// Probe a small byte range, rather than trusting HEAD (which some media hosts allow
// even when the actual video GET is forbidden or returns an HTML error page).
// No full video is downloaded or proxied through this API.
const LINK_HEALTH_FAILURE_TTL = 60 * 1000;
const LINK_HEALTH_SUCCESS_TTL = LINK_HEALTH_TTL;
const CORS_ORIGIN = "https://3c5-o.github.io";
function probeUrl(value){
  const url=safeUrl(value);
  if(!url) return "";
  try {
    const u=new URL(url);
    const host=u.hostname.toLowerCase().replace(/^\[|\]$/g,"");
    const ipv4=/^\d{1,3}(?:\.\d{1,3}){3}$/;
    if(u.protocol!=="https:" || !host.includes(".") ||
       ipv4.test(host) || host.includes(":") ||
       host==="localhost" || host.endsWith(".localhost") ||
       host.endsWith(".local") || host.endsWith(".internal") ||
       u.username || u.password) return "";
    return url;
  }catch{return "";}
}
async function checkUrlHealth(url, options={}){
  const safe=probeUrl(url);
  if(!safe) return {reachable:false,playback_ready:false,status:0,error:"invalid_or_nonpublic_https_url"};
  const now=Date.now();
  const cached=linkHealthMemory.get(safe);
  if(!options.fresh && cached && now-cached.time<(cached.data.reachable?LINK_HEALTH_SUCCESS_TTL:LINK_HEALTH_FAILURE_TTL)){
    return {...cached.data,cached:true};
  }

  const format=detectFormat(safe);
  const profile=playbackProfile(safe);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  let reader;
  try{
    // Follow only a small number of HTTPS redirects to public DNS names.
    // Automatically following an arbitrary upstream redirect could reach private hosts.
    let requestUrl=safe;
    let response;
    for(let hop=0;hop<=4;hop++){
      response=await fetch(requestUrl,{
        method:"GET",
        headers:{Range:"bytes=0-1023",Accept:"*/*",Origin:CORS_ORIGIN},
        signal:controller.signal,
        redirect:"manual"
      });
      if(![301,302,303,307,308].includes(response.status)) break;
      const location=response.headers.get("location");
      const next=location?probeUrl(new URL(location,requestUrl).href):"";
      if(!next || hop===4) {
        return {reachable:false,playback_ready:false,status:response.status,format,error:"unsafe_or_excessive_redirect",issues:["unsafe_or_excessive_redirect"],checked_at:new Date().toISOString()};
      }
      try{await response.body?.cancel();}catch{}
      requestUrl=next;
    }
    const type=(response.headers.get("content-type")||"").split(";")[0].toLowerCase();
    const cors=response.headers.get("access-control-allow-origin")||"";
    const corsAllowed=cors==="*" || cors===CORS_ORIGIN;
    const rangeOk=response.status===206 && /^bytes\s+0-\d+\/(?:\d+|\*)$/i.test(response.headers.get("content-range")||"");
    let bytes=new Uint8Array(0);
    if(response.ok && response.body?.getReader){
      reader=response.body.getReader();
      const piece=await reader.read();
      if(piece.value) bytes=piece.value.subarray(0,1024);
    }
    // Read only the leading bytes. Even if a server ignores Range and returns a
    // full file, cancel immediately to avoid downloading user video on Vercel.
    if(reader){try{await reader.cancel();}catch{}reader=null;}
    const prefix=Array.from(bytes.subarray(0,24)).map(b=>String.fromCharCode(b)).join("");
    const html=type.includes("text/html") || /^\s*(?:<!doctype html|<html|<\?xml)/i.test(prefix);
    const manifestOk=format!=="m3u8" || prefix.replace(/^\uFEFF/,"").startsWith("#EXTM3U");
    const hasBytes=bytes.length>0;
    const reachable=response.ok && hasBytes && !html && manifestOk;
    const browserCompatible=profile.browser_playable && corsAllowed &&
      (format!=="m3u8" || manifestOk);
    const reasons=[];
    if(!response.ok) reasons.push("http_"+response.status);
    if(!hasBytes) reasons.push("empty_media_response");
    if(html) reasons.push("html_instead_of_video");
    if(!manifestOk) reasons.push("invalid_hls_manifest");
    if(reachable && !corsAllowed) reasons.push("cors_not_confirmed_for_browser");
    if(reachable && !profile.browser_playable) reasons.push("format_requires_native_player_or_conversion");
    if(reachable && ["mp4","m4v","webm"].includes(format) && !rangeOk) reasons.push("range_not_confirmed");
    const data={
      reachable,playback_ready:reachable && browserCompatible,
      status:response.status,format,content_type:type||null,
      content_length:Number(response.headers.get("content-length"))||null,
      accept_ranges:response.headers.get("accept-ranges")||null,
      range_supported:rangeOk,cors_allowed:corsAllowed,
      browser_compatible:browserCompatible,
      bytes_sampled:bytes.length,
      final_url:response.url||safe,
      issues:reasons,
      checked_at:new Date().toISOString()
    };
    linkHealthMemory.set(safe,{time:Date.now(),data});
    return {...data,cached:false};
  }catch(e){
    const error=e?.name==="AbortError"?"timeout":"request_failed";
    const data={reachable:false,playback_ready:false,status:0,format,error,issues:[error],checked_at:new Date().toISOString()};
    linkHealthMemory.set(safe,{time:Date.now(),data});
    return {...data,cached:false};
  }finally{
    if(reader){try{await reader.cancel();}catch{}}
    clearTimeout(timer);
  }
}

function normalizeMovie(item){
  const title = str(pick(item,["title","name","movie_name"])) || "بدون عنوان";
  const video = safeUrl(pick(item,["url","link","video","stream_url","source"]));
  const poster = safeUrl(pick(item,["logo","poster","image","cover","poster_url"]));
  const genre = normalizeGenre(pick(item,["genre","category","type"]));
  const playback=playbackProfile(video);
  return {
    id: makeId("movie", title, video),
    // Persist this alongside the legacy id for future updates where only the URL changes.
    stable_key: makeId("movie-stable", title, poster),
    type: "movie",
    title,
    poster,
    genre,
    genres:[genre],
    video,
    playback,
    source:{ repository:"SAMEHJA/live", file:"movsameh.json" }
  };
}
function normalizeEpisode(item){
  const series = str(pick(item,["series_name","anime_name","series","anime","show_name","group"])) || "غير معروف";
  const episodeNumber = str(pick(item,["episode_number","episode","ep","number"]));
  const title = str(pick(item,["episode_name","title","name","episodeTitle","episode_title"])) || series;
  const video = safeUrl(pick(item,["url","link","video","stream_url","source"]));
  const poster = safeUrl(pick(item,["logo","poster","image","cover","poster_url"]));
  const genre = normalizeGenre(pick(item,["genre","category","group"]));
  const playback=playbackProfile(video);
  return {
    id: makeId("episode", title + "|" + episodeNumber, video),
    stable_key: makeId("episode-stable", series + "|" + episodeNumber, poster),
    type: "anime_episode",
    title,
    series,
    episode: episodeNumber,
    poster,
    genre,
    genres:[genre],
    video,
    playback,
    source:{ repository:"SAMEHJA/live", file:"anisameh.json" }
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
    season.episodes.push({ ...ep, season:parsed.season });
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

function normalizeMatchTitle(value){
  return str(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g," ")
    .replace(/&/g," and ")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

function titleSimilarity(a,b){
  const x=normalizeMatchTitle(a), y=normalizeMatchTitle(b);
  if(!x || !y) return 0;
  if(x===y) return 1;
  const ax=new Set(x.split(" ").filter(Boolean));
  const by=new Set(y.split(" ").filter(Boolean));
  let common=0;
  for(const token of ax) if(by.has(token)) common++;
  const dice=(2*common)/Math.max(1,ax.size+by.size);
  const contains=(x.includes(y)||y.includes(x)) ? 0.88 : 0;
  return Math.max(dice,contains);
}

function extractYearHint(value){
  const m=str(value).match(/\b((?:19|20)\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function selectMovieMatch(movie, results){
  const candidates=Array.isArray(results)?results:[];
  const yearHint=extractYearHint(movie.title);
  let best=null;
  for(const item of candidates.slice(0,10)){
    const titles=[item?.title,item?.original_title].filter(Boolean);
    const similarity=Math.max(0,...titles.map(t=>titleSimilarity(movie.title,t)));
    let score=similarity*100;
    const resultYear=item?.release_date ? Number(String(item.release_date).slice(0,4)) : null;
    if(yearHint && resultYear){
      if(yearHint===resultYear) score+=20;
      else if(Math.abs(yearHint-resultYear)>1) score-=15;
    }
    if(!best || score>best.score) best={item,score,similarity,resultYear};
  }
  if(!best || best.similarity<0.55) return null;
  return best;
}

function selectAnimeMatch(anime, results){
  const candidates=Array.isArray(results)?results:[];
  let best=null;
  for(const item of candidates.slice(0,10)){
    const aliases=[
      item?.title,item?.title_english,item?.title_japanese,
      ...(Array.isArray(item?.titles)?item.titles.map(x=>x?.title):[])
    ].filter(Boolean);
    const similarity=Math.max(0,...aliases.map(t=>titleSimilarity(anime.title,t)));
    let score=similarity*100;
    if(normalizeMatchTitle(item?.title)===normalizeMatchTitle(anime.title)) score+=15;
    if(!best || score>best.score) best={item,score,similarity};
  }
  if(!best || best.similarity<0.52) return null;
  return best;
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
  const cached=metadataMemory.anime.get(anime.id);
  if(cached && Date.now()-cached.time<METADATA_TTL){
    return { ...anime, metadata:cached.metadata };
  }
  try{
    const q=encodeURIComponent(anime.title);
    const search=await fetchJsonUrl("https://api.jikan.moe/v4/anime?q="+q+"&limit=10");
    const selected=selectAnimeMatch(anime,search?.data);
    if(!selected?.item?.mal_id){
      const metadata={provider:"jikan",enriched:false,reason:"no_confident_match"};
      metadataMemory.anime.set(anime.id,{time:Date.now(),metadata});
      return { ...anime, metadata };
    }
    const hit=selected.item;
    const full=await fetchJsonUrl("https://api.jikan.moe/v4/anime/"+hit.mal_id+"/full");
    const x=full?.data||hit;
    const metadata={
      provider:"jikan",
      enriched:true,
      match:{
        query:anime.title,
        matched_title:x.title||hit.title||null,
        confidence:Number(Math.min(1,selected.similarity).toFixed(3)),
        method:selected.similarity===1?"exact_title":"title_similarity"
      },
      mal_id:x.mal_id||null,
      title:x.title||anime.title,
      title_english:x.title_english||null,
      title_japanese:x.title_japanese||null,
      titles:Array.isArray(x.titles)?x.titles.map(v=>({type:v.type,title:v.title})):[],
      synopsis:x.synopsis||null,
      background:x.background||null,
      status:x.status||null,
      airing:Boolean(x.airing),
      year:x.year||x.aired?.prop?.from?.year||null,
      aired_from:x.aired?.from||null,
      aired_to:x.aired?.to||null,
      score:x.score??null,
      scored_by:x.scored_by??null,
      rank:x.rank??null,
      popularity:x.popularity??null,
      members:x.members??null,
      favorites:x.favorites??null,
      rating:x.rating||null,
      duration:x.duration||null,
      source:x.source||null,
      media_type:x.type||null,
      episodes:x.episodes??null,
      season:x.season||null,
      broadcast:x.broadcast?.string||null,
      studios:Array.isArray(x.studios)?x.studios.map(v=>v.name):[],
      producers:Array.isArray(x.producers)?x.producers.map(v=>v.name):[],
      licensors:Array.isArray(x.licensors)?x.licensors.map(v=>v.name):[],
      genres:Array.isArray(x.genres)?x.genres.map(v=>v.name):[],
      explicit_genres:Array.isArray(x.explicit_genres)?x.explicit_genres.map(v=>v.name):[],
      themes:Array.isArray(x.themes)?x.themes.map(v=>v.name):[],
      demographics:Array.isArray(x.demographics)?x.demographics.map(v=>v.name):[],
      trailer:x.trailer?.url||null,
      image:x.images?.webp?.large_image_url||x.images?.jpg?.large_image_url||null,
      url:x.url||null
    };
    metadataMemory.anime.set(anime.id,{time:Date.now(),metadata});
    return { ...anime, poster:anime.poster||metadata.image||"", metadata };
  }catch(e){
    if(cached?.metadata){
      return { ...anime, metadata:{...cached.metadata,stale:true,stale_reason:"metadata_provider_unavailable"} };
    }
    return { ...anime, metadata:{provider:"jikan",enriched:false,error:"metadata_unavailable"} };
  }
}
async function enrichMovie(movie){
  const cached=metadataMemory.movies.get(movie.id);
  if(cached && Date.now()-cached.time<METADATA_TTL){
    return { ...movie, metadata:cached.metadata };
  }
  const credential=process.env.TMDB_API_TOKEN||process.env.TMDB_API_KEY||"";
  if(!credential){
    return { ...movie, metadata:{provider:"source",enriched:false,reason:"tmdb_key_not_configured"} };
  }
  try{
    const bearer=credential.includes(".")||credential.length>40;
    const authHeaders=bearer?{Authorization:"Bearer "+credential}:{};
    const apiKey=bearer?"":"&api_key="+encodeURIComponent(credential);
    const search=await fetchJsonUrl(
      "https://api.themoviedb.org/3/search/movie?query="+encodeURIComponent(movie.title)+"&language=ar"+apiKey,
      {headers:authHeaders}
    );
    const selected=selectMovieMatch(movie,search?.results);
    const hit=selected?.item;
    if(!hit?.id){
      const metadata={provider:"tmdb",enriched:false,reason:"no_confident_match"};
      metadataMemory.movies.set(movie.id,{time:Date.now(),metadata});
      return { ...movie, metadata };
    }
    const details=await fetchJsonUrl(
      "https://api.themoviedb.org/3/movie/"+hit.id+"?language=ar&append_to_response=credits,videos"+apiKey,
      {headers:authHeaders}
    );
    const metadata={
      provider:"tmdb",
      enriched:true,
      match:{
        query:movie.title,
        matched_title:details.title||details.original_title||hit.title||null,
        confidence:Number(Math.min(1,selected.similarity).toFixed(3)),
        method:selected.similarity===1?"exact_title":"title_similarity",
        year_hint:extractYearHint(movie.title),
        matched_year:details.release_date?Number(details.release_date.slice(0,4)):null
      },
      tmdb_id:details.id,
      title:details.title||null,
      original_title:details.original_title||null,
      overview:details.overview||null,
      release_date:details.release_date||null,
      year:details.release_date?Number(details.release_date.slice(0,4)):null,
      runtime:details.runtime??null,
      vote_average:details.vote_average??null,
      vote_count:details.vote_count??null,
      popularity:details.popularity??null,
      status:details.status||null,
      original_language:details.original_language||null,
      genres:Array.isArray(details.genres)?details.genres.map(v=>v.name):[],
      countries:Array.isArray(details.production_countries)?details.production_countries.map(v=>v.name):[],
      companies:Array.isArray(details.production_companies)?details.production_companies.map(v=>v.name):[],
      cast:Array.isArray(details.credits?.cast)?details.credits.cast.slice(0,12).map(v=>({
        id:v.id||null,name:v.name,character:v.character||null,profile_path:v.profile_path||null
      })):[],
      directors:Array.isArray(details.credits?.crew)?details.credits.crew.filter(v=>v.job==="Director").map(v=>v.name).slice(0,5):[],
      trailer:Array.isArray(details.videos?.results)
        ? (details.videos.results.find(v=>v.site==="YouTube"&&v.type==="Trailer")?.key||null)
        : null,
      backdrop:details.backdrop_path?"https://image.tmdb.org/t/p/original"+details.backdrop_path:null,
      tmdb_url:"https://www.themoviedb.org/movie/"+details.id
    };
    metadataMemory.movies.set(movie.id,{time:Date.now(),metadata});
    return { ...movie, metadata };
  }catch(e){
    if(cached?.metadata){
      return { ...movie, metadata:{...cached.metadata,stale:true,stale_reason:"metadata_provider_unavailable"} };
    }
    return { ...movie, metadata:{provider:"tmdb",enriched:false,error:"metadata_unavailable"} };
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
let inFlightLoad=null;
async function loadAll(force=false){
  if (!force && memory.movies && memory.episodes &&
      (Date.now() - memory.loadedAt < MEMORY_TTL || (memory.stale && Date.now() < (memory.retryAt||0)))) return memory;
  if (inFlightLoad) return inFlightLoad;
  inFlightLoad=(async()=>{
    try{
      const [moviesRaw, animeRaw] = await Promise.all([fetchFirst(MOVIE_SOURCES), fetchFirst(ANIME_SOURCES)]);
      const movieItems=asArray(moviesRaw,["movies","items","data","results"]);
      const animeItems=asArray(animeRaw,["anime","animes","episodes","items","data","results"]);
      if (!movieItems.length || !animeItems.length) throw new Error("Source files contained no movie or anime entries");
      // Atomic replacement: never publish half a catalog after one upstream fails.
      const movies=movieItems.map(normalizeMovie);
      const episodes=animeItems.map(normalizeEpisode);
      const series=buildSeries(episodes);
      const animeCatalog=buildAnimeCatalog(episodes);
      Object.assign(memory,{movies,episodes,series,animeCatalog,loadedAt:Date.now(),stale:false,lastError:null,retryAt:0});
      return memory;
    }catch(error){
      if(memory.movies && memory.episodes){
        memory.stale=true;
        memory.lastError=String(error?.message||error);
        memory.retryAt=Date.now()+60_000;
        return memory;
      }
      throw error;
    }
  })();
  try{return await inFlightLoad;}
  finally{inFlightLoad=null;}
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
  res.setHeader("X-API-Version","v1");
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
  if(options(req,res)) return false;
  if(req.method!=="GET"){
    send(res,405,{ok:false,error:"method_not_allowed"},0);
    return false;
  }
  if(!applyRateLimit(req,res)) return false;
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
  buildAnimeCatalog, summaryAnime, parseAnimeSeriesName, enrichAnime, enrichMovie,
  normalizeMatchTitle, titleSimilarity, selectMovieMatch, selectAnimeMatch,
  playbackProfile, checkUrlHealth, probeUrl, applyRateLimit, RATE_LIMIT, RATE_WINDOW_MS, METADATA_TTL, LINK_HEALTH_TTL
};