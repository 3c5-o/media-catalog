const { loadAll, send, requireGet } = require("../lib/provider");
function summarize(items){
  const formats={};
  const support={};
  let recognized=0, browserPlayable=0, issues=0, missingUrl=0;
  const titles=new Map(), videoUrls=new Map();
  for(const item of items){
    const p=item.playback||{};
    const f=p.format||"unknown";
    const s=p.browser_support||"unknown";
    formats[f]=(formats[f]||0)+1;
    support[s]=(support[s]||0)+1;
    if(p.recognized_media) recognized++;
    if(p.browser_playable) browserPlayable++;
    if(p.issue) issues++;
    if(!item.video) missingUrl++;
    const normalizedTitle=String(item.title||"").trim().toLowerCase();
    if(normalizedTitle) titles.set(normalizedTitle,(titles.get(normalizedTitle)||0)+1);
    if(item.video) videoUrls.set(item.video,(videoUrls.get(item.video)||0)+1);
  }
  return {
    total:items.length,
    recognized_media:recognized,
    browser_playable:browserPlayable,
    source_issues:issues,
    missing_video_urls:missingUrl,
    duplicated_title_groups:[...titles.values()].filter(count=>count>1).length,
    duplicated_video_url_groups:[...videoUrls.values()].filter(count=>count>1).length,
    verified_video_links:0,
    warning:"Format detection does not verify URL reachability, CORS, or actual playback.",
    formats,
    browser_support:support
  };
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