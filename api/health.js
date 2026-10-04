const { loadAll, send, requireGet } = require("../lib/provider");
module.exports = async function handler(req,res){
  if(!requireGet(req,res)) return;
  const started=Date.now();
  try{
    const data=await loadAll();
    send(res,200,{
      ok:true,
      status:"healthy",
      source:"SAMEHJA/live",
      counts:{
        movies:data.movies.length,
        anime_titles:data.animeCatalog.length,
        anime_source_series:data.series.length,
        anime_episodes:data.episodes.length
      },
      metadata_providers:{movies:"TMDb",anime:"Jikan"},
      cache_loaded_at:new Date(data.loadedAt).toISOString(),
      response_ms:Date.now()-started
    },60);
  }catch(e){send(res,503,{ok:false,status:"source_unavailable",error:String(e?.message||e)},0);}
};