const { loadAll, send, requireGet, queryOf } = require("./_lib");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try {
    const q = queryOf(req);
    const all = await loadAll();
    const type = String(q.type||"movie");
    const items = type === "anime" ? all.episodes : type === "series" ? all.series : all.movies;
    const counts = new Map();
    for (const item of items) counts.set(item.genre, (counts.get(item.genre)||0)+1);
    const data = [...counts.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name,"ar"));
    send(res,200,{ok:true,type,data},600);
  } catch(e){ send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0); }
};