const { loadAll, send, requireGet, queryOf, itemById, checkUrlHealth } = require("../lib/provider");
module.exports=async function handler(req,res){
  if(!requireGet(req,res)) return;
  try{
    const q=queryOf(req);
    const type=String(q.type||"").toLowerCase();
    const id=String(q.id||"").trim();
    if(!["movie","episode"].includes(type) || !id){
      return send(res,400,{ok:false,error:"type_and_id_required",allowed_types:["movie","episode"]},0);
    }
    const all=await loadAll();
    const item=type==="movie"?itemById(all.movies,id):itemById(all.episodes,id);
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