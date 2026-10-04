const { loadAll, send, requireGet } = require("./_lib");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try {
    const all = await loadAll();
    const movieGenres = new Set(all.movies.map(x=>x.genre));
    const animeGenres = new Set(all.episodes.map(x=>x.genre));
    send(res,200,{ok:true,data:{
      movies:all.movies.length,
      series:all.series.length,
      anime_episodes:all.episodes.length,
      movie_genres:movieGenres.size,
      anime_genres:animeGenres.size,
      source:"SAMEHJA/live",
      provider_version:"1.0.0"
    }},300);
  } catch(e){ send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0); }
};