const { loadAll, page, send, requireGet, queryOf, itemById, summaryAnime, enrichAnime } = require("../lib/provider");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try {
    const q=queryOf(req);
    const all=await loadAll();
    const catalog=all.animeCatalog||[];
    if (q.id || q.title) {
      const title=String(q.title||"").trim().toLocaleLowerCase("en");
      const item=q.id
        ? itemById(catalog,q.id)
        : catalog.find(x=>String(x.title||"").trim().toLocaleLowerCase("en")===title);
      if (!item) return send(res,404,{ok:false,error:"anime_not_found"},60);
      const full = q.enrich === "0" ? item : await enrichAnime(item);
      return send(res,200,{ok:true,type:"anime_title",grouping:"anime > seasons > episodes",data:full},300);
    }
    const term=String(q.q||"").trim().toLocaleLowerCase("ar");
    const genre=String(q.genre||"").trim();
    const filtered=catalog.filter(x=>{
      const genreOk=!genre||genre==="all"||x.genre===genre||x.genres?.includes(genre);
      const qOk=!term||[x.title,x.genre,...(x.genres||[])].join(" ").toLocaleLowerCase("ar").includes(term);
      return genreOk&&qOk;
    }).map(summaryAnime);
    const result=page(filtered,q);
    send(res,200,{ok:true,type:"anime_title",grouping:"anime > seasons > episodes",...result});
  } catch(e){ send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0); }
};