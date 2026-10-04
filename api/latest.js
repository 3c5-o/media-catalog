const { loadAll, send, requireGet, queryOf, summarySeries } = require("./_lib");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try {
    const q = queryOf(req);
    const all = await loadAll();
    const type = String(q.type||"movie");
    const limit = Math.max(1,Math.min(100,Number.parseInt(q.limit||"20",10)||20));
    const source = type === "anime" ? all.episodes : type === "series" ? all.series.map(summarySeries) : all.movies;
    send(res,200,{ok:true,type,order:"source_order",data:source.slice(0,limit)},120);
  } catch(e){ send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0); }
};