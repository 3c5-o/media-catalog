const { send, requireGet } = require("../lib/provider");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  send(res,200,{
    ok:true,
    provider:"media-catalog",
    version:"2.0.0",
    architecture:{
      movies:"movie -> playback + metadata",
      anime:"anime -> seasons -> episodes -> playback"
    },
    endpoints:[
      "/movies-api",
      "/anime-api",
      "/anime-episodes-api",
      "/api/search?q=resident&type=all&page=1&limit=24",
      "/api/categories?type=movie",
      "/api/latest?type=movie&limit=20",
      "/api/stats",
      "/api/health"
    ]
  },600);
};