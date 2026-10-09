const {loadAll, send, requireGet, queryOf, itemById, movieSourceCandidates, checkUrlHealth} = require("../lib/provider");

// This endpoint resolves a *candidate* for direct browser playback. It does
// not mirror video content, modify source JSON or claim full-length playback.
const PREFERRED_FORMATS = {mp4:0,m4v:1,webm:2,ogv:3,ogg:4,m3u8:5};

module.exports = async function handler(req,res){
  if(!requireGet(req,res)) return;
  try {
    const q=queryOf(req);
    const type=String(q.type||"").toLowerCase();
    const id=String(q.id||"").trim();
    const platform=String(q.platform||"web").toLowerCase();
    if(!["movie","episode"].includes(type) || !id || platform!=="web"){
      return send(res,400,{ok:false,error:"type_movie_or_episode_and_id_required",supported_platforms:["web"]},0);
    }
    const all=await loadAll();
    const entries=type==="movie"?all.movies:all.episodes;
    const item=itemById(entries,id);
    if(!item)return send(res,404,{ok:false,error:"content_not_found"},0);
    const candidates=type==="movie"
      ? movieSourceCandidates(all.movies,item,4)
      : (item.video && item.playback?.recognized_media ? [{
          id:item.id,url:item.video,host:item.playback.host,format:item.playback.format,
          source_match:"selected"
        }] : []);

    const results=await Promise.all(candidates.map(async candidate=>{
      const health=await checkUrlHealth(candidate.url,{deep:candidate.format==="m3u8",fresh:q.fresh==="1"});
      const ready=health.playback_ready===true &&
        Object.hasOwn(PREFERRED_FORMATS,candidate.format);
      return {
        id:candidate.id,
        format:candidate.format,
        host:candidate.host,
        source_match:candidate.source_match,
        ready_for_browser_probe:ready,
        reachable:health.reachable===true,
        http_status:health.status||0,
        issues:health.issues||[health.error||"source_unavailable"],
        checked_at:health.checked_at||null,
        // The URL is returned only after passing the byte/playlist check.
        ...(ready?{url:candidate.url}:{})
      };
    }));
    const preferred=results.filter(row=>row.ready_for_browser_probe)
      .sort((a,b)=>(PREFERRED_FORMATS[a.format]??9)-(PREFERRED_FORMATS[b.format]??9))[0]||null;
    return send(res,200,{
      ok:true,
      api_version:"v1",
      type,id:item.id,title:item.title,
      platform,
      available:Boolean(preferred),
      status:preferred?"candidate_available":"no_verified_browser_candidate",
      selected:preferred?{id:preferred.id,format:preferred.format,url:preferred.url}:null,
      candidates:results.map(({url,...row})=>row),
      checked:results.length,
      // A byte check does not verify playable codecs, all segments or user device.
      verified_full_playback:false,
      note:"Only an initial media probe has passed. Always confirm playback on the target browser/device."
    },0);
  } catch(error) {
    return send(res,502,{ok:false,error:"playback_resolution_failed",message:String(error?.message||error)},0);
  }
};
