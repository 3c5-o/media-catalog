const { send, requireGet } = require("../lib/provider");
module.exports = async function handler(req,res){
  if(!requireGet(req,res)) return;
  send(res,200,{
    ok:true,
    provider:"media-catalog",
    version:"2.2.0",
    api_version:"v1",
    canonical_base:"/api/v1",
    architecture:{
      movies:"movie -> playback + verified TMDb metadata",
      anime:"anime -> seasons -> episodes -> playback + Jikan metadata"
    },
    canonical_endpoints:[
      "/api/v1/movies",
      "/api/v1/anime",
      "/api/v1/anime/episodes",
      "/api/v1/search?q=resident&type=all&page=1&limit=24",
      "/api/v1/categories?type=movie",
      "/api/v1/latest?type=movie&limit=20",
      "/api/v1/stats",
      "/api/v1/health"
    ],
    legacy_aliases:["/movies-api","/anime-api","/anime-episodes-api","/anime-series-api"]
  },600);
};