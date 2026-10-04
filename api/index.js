const { send, requireGet } = require("./_lib");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  send(res,200,{
    ok:true,
    provider:"media-catalog",
    version:"1.0.0",
    endpoints:[
      "/api/health",
      "/api/stats",
      "/api/movies?page=1&limit=24&q=&genre=",
      "/api/movies?id=movie_xxx",
      "/api/series?page=1&limit=24&q=&genre=",
      "/api/series?id=series_xxx",
      "/api/anime?page=1&limit=24&q=&genre=",
      "/api/anime?id=episode_xxx",
      "/api/search?q=resident&type=all&page=1&limit=24",
      "/api/categories?type=movie",
      "/api/latest?type=movie&limit=20"
    ]
  },600);
};