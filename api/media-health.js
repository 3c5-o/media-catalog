const { loadAll, send, requireGet, queryOf, itemById, checkUrlHealth, movieSourceCandidates } = require("../lib/provider");

function clamp(value,fallback,min,max){
  const n=Number.parseInt(value,10);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}

function matchesFormat(item,format){
  return !format || format==="all" || item?.playback?.format===format;
}

module.exports=async function handler(req,res){
  if(!requireGet(req,res)) return;
  try{
    const q=queryOf(req);
    const type=String(q.type||"").toLowerCase();
    const id=String(q.id||"").trim();
    const sample=String(q.sample||"")==="1";
    const format=String(q.format||"").toLowerCase();
    const limit=clamp(q.limit,3,1,8);
    const fresh=String(q.fresh||"")==="1";
    // Deep HLS inspection is intentionally limited to single-item checks.
    const deep=String(q.deep||"")==="1" && !sample;

    if(!["movie","episode"].includes(type)){
      return send(res,400,{ok:false,error:"valid_type_required",allowed_types:["movie","episode"]},0);
    }

    const all=await loadAll();
    const source=type==="movie"?all.movies:all.episodes;

    if(sample){
      const available=source.filter(item=>matchesFormat(item,format));
      // Distribute samples across the catalog; the first page alone is not representative.
      const candidates=Array.from({length:Math.min(limit,available.length)},(_,i)=>
        available[Math.floor(i*available.length/Math.min(limit,available.length))]
      );
      const checks=await Promise.all(candidates.map(async item=>({
        id:item.id,
        title:item.title,
        playback:item.playback,
        health:await checkUrlHealth(item.video,{fresh})
      })));
      const reachable=checks.filter(x=>x.health?.reachable).length;
      const browserReady=checks.filter(x=>x.health?.playback_ready).length;
      return send(res,200,{
        ok:true,
        api_version:"v1",
        mode:"sample",
        type,
        format:format||"all",
        requested:limit,
        checked:checks.length,
        reachable,
        unreachable:checks.length-reachable,
        browser_ready:browserReady,
        browser_not_ready:checks.length-browserReady,
        note:"HEAD success is not enough. This endpoint probes a small GET range and inspects CORS, format and video bytes.",
        data:checks
      },30);
    }

    if(!id){
      return send(res,400,{ok:false,error:"id_required_or_use_sample_1"},0);
    }

    const item=itemById(source,id);
    if(!item) return send(res,404,{ok:false,error:type+"_not_found"},60);
    if(type==="movie" && String(q.alternates||"")==="1"){
      const candidates=movieSourceCandidates(all.movies,item,4);
      // Check each candidate in parallel, bounded by the function execution timeout.
      // HLS must inspect the first actual media segment to reject image error pages.
      const results=await Promise.all(candidates.map(async candidate=>{
        const candidateHealth=await checkUrlHealth(candidate.url,{
          fresh,deep:candidate.format==="m3u8"
        });
        return {
          id:candidate.id,format:candidate.format,host:candidate.host,
          source_match:candidate.source_match,
          health:candidateHealth
        };
      }));
      const ready=results.filter(row=>row.health?.playback_ready===true);
      // A single successful byte probe is not a full playback test.
      const preference={mp4:0,m4v:1,webm:2,m3u8:3,ogv:4,ogg:4,ts:5,mkv:6};
      ready.sort((a,b)=>(preference[a.format]??9)-(preference[b.format]??9));
      return send(res,200,{
        ok:true,api_version:"v1",type,id:item.id,title:item.title,
        mode:"source_candidates_checked",
        candidates:results,
        playable_candidate_id:ready[0]?.id||null,
        verified_full_playback:false,
        note:"Small byte probes only. Never automatically publish or replace movie URLs on this result.",
        checked:results.length
      },0);
    }
    const health=await checkUrlHealth(item.video,{fresh,deep});
    return send(res,200,{
      ok:true,
      api_version:"v1",
      type,
      id:item.id,
      title:item.title,
      playback:item.playback,
      inspection:deep?"hls_first_child":"initial_media_bytes",
      health
    },60);
  }catch(e){
    send(res,502,{ok:false,error:"link_check_failed",message:String(e?.message||e)},0);
  }
};