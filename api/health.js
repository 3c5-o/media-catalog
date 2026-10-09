const { loadAll, send, requireGet, RATE_LIMIT, RATE_WINDOW_MS, METADATA_TTL, LINK_HEALTH_TTL } = require("../lib/provider");
module.exports=async function handler(req,res){
  if(!requireGet(req,res)) return;
  const started=Date.now();
  try{
    const data=await loadAll();
    const degraded=Boolean(data.stale);
    const combined=[...data.movies,...data.episodes];
    const formats={};
    let missing=0,unsupported=0;
    for(const item of combined){
      const format=item.playback?.format||"unknown";
      formats[format]=(formats[format]||0)+1;
      if(!item.video) missing++;
      if(!item.playback?.browser_playable) unsupported++;
    }
    send(res,degraded?503:200,{
      ok:!degraded,
      status:degraded?"degraded_using_cached_source":"catalog_loaded",
      api_version:"v1",
      source:"SAMEHJA/live",
      counts:{movies:data.movies.length,anime_titles:data.animeCatalog.length,anime_source_series:data.series.length,anime_episodes:data.episodes.length},
      playback_audit:{verified_links:0,links_checked_live:false,missing_video_urls:missing,browser_incompatible_or_unknown:unsupported,formats,note:"Catalog loading does not verify media links. Use /api/v1/media-health to probe playback."},
      source_stale:degraded,
      source_error:degraded?data.lastError:null,
      metadata_providers:{movies:"TMDb",anime:"Jikan"},
      cache:{source_ttl_seconds:300,metadata_ttl_seconds:Math.floor(METADATA_TTL/1000),link_health_ttl_seconds:300},
      rate_limit:{requests:RATE_LIMIT,window_seconds:Math.floor(RATE_WINDOW_MS/1000),scope:"best_effort_per_runtime_instance"},
      cache_loaded_at:new Date(data.loadedAt).toISOString(),
      response_ms:Date.now()-started
    },degraded?0:60);
  }catch(e){send(res,503,{ok:false,status:"source_unavailable",error:String(e?.message||e)},0);}
};