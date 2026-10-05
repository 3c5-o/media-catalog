const { loadAll, send, requireGet } = require("../lib/provider");
function summarize(items){
  const formats={};
  const support={};
  for(const item of items){
    const f=item.playback?.format||"unknown";
    const s=item.playback?.browser_support||"unknown";
    formats[f]=(formats[f]||0)+1;
    support[s]=(support[s]||0)+1;
  }
  return {total:items.length,formats,browser_support:support};
}
module.exports=async function handler(req,res){
  if(!requireGet(req,res)) return;
  try{
    const all=await loadAll();
    send(res,200,{
      ok:true,
      api_version:"v1",
      movies:summarize(all.movies),
      anime_episodes:summarize(all.episodes)
    },600);
  }catch(e){
    send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0);
  }
};