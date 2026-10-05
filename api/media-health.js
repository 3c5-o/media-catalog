const { loadAll, send, requireGet, queryOf, itemById, checkUrlHealth } = require("../lib/provider");

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

    if(!["movie","episode"].includes(type)){
      return send(res,400,{ok:false,error:"valid_type_required",allowed_types:["movie","episode"]},0);
    }

    const all=await loadAll();
    const source=type==="movie"?all.movies:all.episodes;

    if(sample){
      const candidates=source.filter(item=>matchesFormat(item,format)).slice(0,limit);
      const checks=await Promise.all(candidates.map(async item=>({
        id:item.id,
        title:item.title,
        playback:item.playback,
        health:await checkUrlHealth(item.video)
      })));
      const reachable=checks.filter(x=>x.health?.reachable).length;
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
        data:checks
      },30);
    }

    if(!id){
      return send(res,400,{ok:false,error:"id_required_or_use_sample_1"},0);
    }

    const item=itemById(source,id);
    if(!item) return send(res,404,{ok:false,error:type+"_not_found"},60);
    const health=await checkUrlHealth(item.video);
    return send(res,200,{
      ok:true,
      api_version:"v1",
      type,
      id:item.id,
      title:item.title,
      playback:item.playback,
      health
    },60);
  }catch(e){
    send(res,502,{ok:false,error:"link_check_failed",message:String(e?.message||e)},0);
  }
};