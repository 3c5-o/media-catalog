const { loadAll, page, filterItems, send, requireGet, queryOf, itemById, enrichMovie, normalizeMatchTitle } = require("../lib/provider");
module.exports = async function handler(req,res){
  if(!requireGet(req,res)) return;
  try{
    const q=queryOf(req);
    const all=await loadAll();
    if(q.id||q.title){
      const wanted=normalizeMatchTitle(q.title||"");
      const item=q.id
        ? itemById(all.movies,q.id)
        : all.movies.find(x=>normalizeMatchTitle(x.title)===wanted);
      if(!item) return send(res,404,{ok:false,error:"movie_not_found"},60);
      const full=q.enrich==="0"?item:await enrichMovie(item);
      return send(res,200,{ok:true,api_version:"v1",type:"movie",data:full},300);
    }
    const result=page(filterItems(all.movies,q),q);
    send(res,200,{ok:true,api_version:"v1",type:"movie",schema:"movie + playback + metadata",...result});
  }catch(e){
    send(res,502,{ok:false,api_version:"v1",error:"source_error",message:String(e?.message||e)},0);
  }
};