const { loadAll, send, requireGet } = require("../lib/provider");
module.exports = async function handler(req,res){
  if(!requireGet(req,res)) return;
  try{
    const all=await loadAll();
    const movieGenres=new Set(all.movies.flatMap(x=>x.genres||[x.genre]).filter(Boolean));
    const animeGenres=new Set(all.animeCatalog.flatMap(x=>x.genres||[x.genre]).filter(Boolean));
    const animeSeasons=all.animeCatalog.reduce((sum,x)=>sum+(x.season_count||0),0);
    send(res,200,{ok:true,data:{
      movies:all.movies.length,
      anime_titles:all.animeCatalog.length,
      anime_seasons:animeSeasons,
      anime_source_series:all.series.length,
      anime_episodes:all.episodes.length,
      movie_genres:movieGenres.size,
      anime_genres:animeGenres.size,
      source:"SAMEHJA/live",
      anime_metadata:"Jikan",
      movie_metadata:"TMDb",
      provider_version:"2.1.0"
    }},300);
  }catch(e){send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0);}
};