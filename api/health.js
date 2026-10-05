const { loadAll, send, requireGet, RATE_LIMIT, RATE_WINDOW_MS, METADATA_TTL, LINK_HEALTH_TTL } = require("../lib/provider");
module.exports=async function handler(req,res){
  if(!requireGet(req,res)) return;
  const started=Date.now();
  try{
    const data=await loadAll();
    send(res,200,{
      ok:true,status:"healthy",api_version:"v1",source:"SAMEHJA/live",
      counts:{movies:data.movies.length,anime_titles:data.animeCatalog.length,anime_source_series:data.series.length,anime_episodes:data.episodes.length},
      metadata_providers:{movies:"TMDb",anime:"Jikan"},
      cache:{source_ttl_seconds:300,metadata_ttl_seconds:Math.floor(METADATA_TTL/1000),link_health_ttl_seconds:Math.floor(LINK_HEALTH_TTL/1000)},
      rate_limit:{requests:RATE_LIMIT,window_seconds:Math.floor(RATE_WINDOW_MS/1000),scope:"best_effort_per_runtime_instance"},
      cache_loaded_at:new Date(data.loadedAt).toISOString(),
      response_ms:Date.now()-started
    },60);
  }catch(e){send(res,503,{ok:false,status:"source_unavailable",error:String(e?.message||e)},0);}
};