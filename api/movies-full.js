const { loadAll, page, filterItems, send, requireGet, queryOf, itemById, enrichMovie } = require("../lib/provider");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try {
    const q=queryOf(req);
    const all=await loadAll();
    if (q.id) {
      const item=itemById(all.movies,q.id);
      if (!item) return send(res,404,{ok:false,error:"movie_not_found"},60);
      const full = q.enrich === "0" ? item : await enrichMovie(item);
      return send(res,200,{ok:true,type:"movie",data:full},300);
    }
    const result=page(filterItems(all.movies,q),q);
    send(res,200,{ok:true,type:"movie",schema:"full-source",...result});
  } catch(e){ send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0); }
};