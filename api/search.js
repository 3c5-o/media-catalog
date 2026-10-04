const { loadAll, page, send, requireGet, queryOf, summaryAnime } = require("../lib/provider");
module.exports = async function handler(req,res){
  if (!requireGet(req,res)) return;
  try {
    const q=queryOf(req);
    const term=String(q.q||"").trim().toLocaleLowerCase("ar");
    if(!term) return send(res,400,{ok:false,error:"q_required"},0);
    const all=await loadAll();
    let type=String(q.type||"all").toLowerCase();
    if(type==="series") type="anime";
    const collections=[];
    if(type==="all"||type==="movie") collections.push(...all.movies);
    if(type==="all"||type==="anime") collections.push(...all.animeCatalog.map(summaryAnime));
    if(type==="episode") collections.push(...all.episodes);
    const matches=collections.filter(x=>
      [x.title,x.series,x.genre,...(x.genres||[]),x.episode]
        .filter(Boolean).join(" ").toLocaleLowerCase("ar").includes(term)
    );
    const result=page(matches,q);
    send(res,200,{ok:true,query:q.q,type,...result},120);
  }catch(e){send(res,502,{ok:false,error:"source_error",message:String(e?.message||e)},0);}
};