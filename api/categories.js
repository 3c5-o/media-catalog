const { loadAll, send, requireGet, queryOf } = require("../lib/provider");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try{
    const q=queryOf(req);
    let type=String(q.type||"movie").toLowerCase();
    if(type==="series") type="anime";
    const all=await loadAll();
    const items=type==="anime" ? all.animeCatalog : type==="episode" ? all.episodes : all.movies;
    const counts=new Map();
    for(const item of items){
      const genres=Array.isArray(item.genres)&&item.genres.length ? item.genres : [item.genre];
      for(const genre of genres.filter(Boolean)) counts.set(genre,(counts.get(genre)||0)+1);
    }
    const data=[...counts.entries()].map(([name,count])=>({name,count}))
      .sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"ar"));
    send(res,200,{ok:true,type,data},600);
  }catch(e){send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0);}
};