const { loadAll, page, filterItems, send, requireGet, queryOf, itemById, summarySeries } = require("./_lib");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try {
    const q = queryOf(req);
    const all = await loadAll();
    if (q.id) {
      const item = itemById(all.series,q.id);
      return item ? send(res,200,{ok:true,data:item}) : send(res,404,{ok:false,error:"series_not_found"},60);
    }
    const filtered = filterItems(all.series,q).map(summarySeries);
    const result = page(filtered,q);
    send(res,200,{ok:true,type:"series",...result});
  } catch(e){ send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0); }
};