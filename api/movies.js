const { loadAll, page, filterItems, send, requireGet, queryOf, itemById } = require("../lib/provider");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try {
    const q = queryOf(req);
    const all = await loadAll();
    if (q.id) {
      const item = itemById(all.movies,q.id);
      return item ? send(res,200,{ok:true,data:item}) : send(res,404,{ok:false,error:"movie_not_found"},60);
    }
    const result = page(filterItems(all.movies,q),q);
    send(res,200,{ok:true,type:"movie",...result});
  } catch(e){ send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0); }
};