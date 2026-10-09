"use strict";
const fs = require("node:fs");

const base = (process.env.MEDIA_CATALOG_BASE_URL || "https://media-catalog-navy.vercel.app").replace(/\/+$/, "");
const checks = [];
const summary = ["# Media Catalog production smoke test", "", "Test date: " + new Date().toISOString(), "", "| Check | HTTP | Result |", "|---|---:|---|"];

async function getJson(path, timeoutMs=35000) {
  const response = await fetch(base + path, {
    method: "GET",
    headers: {"Accept":"application/json", "Cache-Control":"no-cache"},
    signal:AbortSignal.timeout(timeoutMs),
    redirect:"manual"
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new Error("non_json_response status=" + response.status + " content_type=" + String(response.headers.get("content-type")||"").slice(0,90));
  }
  return {status:response.status, data, contentType:response.headers.get("content-type")};
}

async function probe(name,path,required=true) {
  try{
    const r=await getJson(path);
    const ok=r.status===200 && r.data && r.data.ok===true;
    const detail= !ok ? ("API not ready: status="+r.status+" error="+String(r.data?.error||r.data?.status||"unknown")) : (
      name==="health" ? "movies="+r.data.counts?.movies+" episodes="+r.data.counts?.anime_episodes+" source_stale="+r.data.source_stale :
      name==="formats" ? "movies="+r.data.movies?.total+" anime_episodes="+r.data.anime_episodes?.total :
      "checked="+r.data.checked+" reachable="+r.data.reachable+" browser_ready="+r.data.browser_ready+" unavailable="+r.data.unreachable
    );
    checks.push({name,ok,detail,required,status:r.status});
    summary.push("| "+name+" | "+r.status+" | "+(ok ? "available" : "ERROR")+" |");
    console.log(JSON.stringify({check:name,status:r.status,ok,detail}));
    if(ok && name.startsWith("sample:")){
      const issues=(r.data.data||[]).map(item=>({
        format:item.playback?.format||"unknown",
        reachable:item.health?.reachable===true,
        browser_ready:item.health?.playback_ready===true,
        http_status:item.health?.status||0,
        issues:item.health?.issues||[item.health?.error||"unknown"]
      }));
      console.log("source_sample_outcomes="+JSON.stringify(issues));
    }
  }catch(error){
    const detail=String(error?.message||error).slice(0,300);
    checks.push({name,ok:false,detail,required,status:0});
    summary.push("| "+name+" | - | FAIL |");
    console.log(JSON.stringify({check:name,ok:false,error:detail}));
  }
}



async function boundedMediaGet(url) {
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),9000);
  let reader;
  try{
    const r=await fetch(url,{method:"GET",headers:{Range:"bytes=0-2047",Origin:"https://3c5-o.github.io"},redirect:"follow",signal:controller.signal});
    let data="",signature="empty";
    if(r.body?.getReader){
      reader=r.body.getReader();
      const first=await reader.read();
      if(first.value){
        const bytes=Buffer.from(first.value.subarray(0,2048));
        data=bytes.toString("utf8");
        if(bytes.subarray(0,8).toString("hex")==="89504e470d0a1a0a")signature="png_image";
        else if(bytes[0]===0xff&&bytes[1]===0xd8)signature="jpeg_image";
        else if(bytes[0]===0x47&&(bytes.length<189||bytes[188]===0x47))signature="mpeg_ts";
        else if(bytes.subarray(4,8).toString("utf8")==="ftyp")signature="mp4_iso_bmff";
        else if(bytes.subarray(0,4).toString("hex")==="1a45dfa3")signature="matroska";
        else if(data.startsWith("#EXTM3U"))signature="hls_playlist";
        else if(/^\\s*(?:<html|<!doctype html)/i.test(data))signature="html";
        else signature="unknown_or_encrypted";
      }
    }
    return {status:r.status,cors:r.headers.get("access-control-allow-origin")||"",type:r.headers.get("content-type")||"",data,signature};
  }finally{
    if(reader){try{await reader.cancel();}catch{}}
    clearTimeout(t);
  }
}
async function inspectHlsChildren(url) {
  const steps=[];
  let current=url;
  try{
    for(let depth=0;depth<3;depth++){
      const u=new URL(current);
      if(u.protocol!=="https:"||["localhost","127.0.0.1"].includes(u.hostname)) throw new Error("nonpublic_child_url");
      const response=await boundedMediaGet(current);
      const cors=response.cors==="*"||response.cors==="https://3c5-o.github.io";
      const manifest=response.data.replace(/^\uFEFF/,"").startsWith("#EXTM3U");
      const step={depth,kind:depth===0?"manifest":manifest?"playlist":"segment",http_status:response.status,cors_allowed: cors,content_type:response.type.slice(0,48),manifest,signature:response.signature};
      steps.push(step);
      if(![200,206].includes(response.status)||!cors)return {ok:false,steps,issue:"child_http_or_cors_failed"};
      if(!manifest)return {ok:depth>0 && ["mpeg_ts","mp4_iso_bmff"].includes(response.signature),steps,issue:depth===0?"invalid_master_manifest":(["mpeg_ts","mp4_iso_bmff"].includes(response.signature)?null:"child_media_magic_unverified")};
      const lines=response.data.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      const refs=lines.filter(x=>!x.startsWith("#"));
      const child=refs[0];
      if(!child)return {ok:false,steps,issue:"empty_or_incomplete_playlist"};
      current=new URL(child,current).href;
    }
    return {ok:true,steps,issue:null};
  }catch(error){return {ok:false,steps,issue:String(error?.name||"error")};}
}

async function namedMovie(title) {
  const name="title:"+title;
  try {
    const listing=await getJson("/api/v1/movies?q="+encodeURIComponent(title)+"&page=1&limit=20");
    const entries=(listing.data?.data||[]).filter(item=>String(item.title||"").toLowerCase()===title.toLowerCase()).slice(0,2);
    if(listing.status!==200 || !entries.length) throw new Error("movie_not_found_in_api");
    // Verify alternate candidate selection without changing the published movie record.
    if(entries[0]?.id){
      try{
        const r=await getJson("/api/v1/playback?type=movie&platform=web&id="+encodeURIComponent(entries[0].id)+"&fresh=1",60000);
        const item=r.data||{};
        console.log("named_playback_resolution="+JSON.stringify({
          title,endpoint_status:r.status,available:item.available===true,
          candidate_format:item.selected?.format||null,checked:item.checked||0,
          full_playback_verified:item.verified_full_playback===true,
          failures:(item.candidates||[]).filter(x=>!x.ready_for_browser_probe).map(x=>({format:x.format,issues:x.issues||[]}))
        }));
        summary.push("| "+name+" resolver | "+r.status+" | "+(item.available?"candidate found":"not ready")+" |");
      }catch(error){
        // On PR runs this endpoint may not have reached production yet.
        console.log("named_playback_resolution_pending="+JSON.stringify({title,error:String(error?.message||error).slice(0,150)}));
      }
      const r=await getJson("/api/v1/media-health?type=movie&id="+encodeURIComponent(entries[0].id)+"&alternates=1&fresh=1",60000);
      const options=r.data?.candidates||[];
      console.log("named_source_candidates="+JSON.stringify({
        title,total:options.length,
        formats:options.map(x=>x.format),
        initial_byte_candidates:options.filter(x=>x.health?.playback_ready===true).length,
        best_available:Boolean(r.data?.playable_candidate_id),
        verified_full_playback:r.data?.verified_full_playback===true,
        failures:options.filter(x=>!x.health?.playback_ready).map(x=>({format:x.format,issues:x.health?.issues||[]}))
      }));
      summary.push("| "+name+" sources | "+r.status+" | "+options.length+" candidates, "+options.filter(x=>x.health?.playback_ready).length+" byte-probe ready |");
    }
    for(const [index,item] of entries.entries()){
      const r=await getJson("/api/v1/media-health?type=movie&id="+encodeURIComponent(item.id)+"&fresh=1"+(item.playback?.format==="m3u8"?"&deep=1":""),45000);
      const h=r.data?.health||{};
      console.log("named_source_outcome="+JSON.stringify({
        title,index:index+1,format:item.playback?.format||"unknown",
        reachable:h.reachable===true,browser_ready:h.playback_ready===true,
        http_status:h.status||0,issues:h.issues||[h.error||"unknown"],hls_children:h.hls_children?.checks||[]
      }));
      summary.push("| "+name+" #"+(index+1)+" | "+(h.status||r.status)+" | "+(h.playback_ready?"browser candidate":h.reachable?"server reachable only":"source unavailable")+" |");
      if(title==="Speed Faster" && item.playback?.format==="m3u8" && item.video){
        const tree=await inspectHlsChildren(item.video);
        console.log("hls_children_outcome="+JSON.stringify({title,ok:tree.ok,issue:tree.issue,steps:tree.steps}));
        summary.push("| HLS child segments ("+title+") | - | "+(tree.ok?"first child reachable":"child check failed: "+tree.issue)+" |");
      }
    }
  }catch(error){
    console.log("named_source_error="+JSON.stringify({title,error:String(error?.message||error).slice(0,160)}));
    summary.push("| "+name+" | - | Unable to verify |");
  }
}

async function namedAnimeEpisode() {
  const title="Attack on Titan";
  try {
    const listing=await getJson("/api/v1/anime?q="+encodeURIComponent(title)+"&page=1&limit=30");
    const matches=listing.data?.data||[];
    const candidate=matches.find(x=>String(x.title||"").trim().toLowerCase()===title.toLowerCase())||matches.find(x=>String(x.title||"").toLowerCase().includes(title.toLowerCase()));
    if(!candidate) throw new Error("anime_title_missing");
    const detail=await getJson("/api/v1/anime/"+encodeURIComponent(candidate.id)+"?enrich=0");
    const seasons=detail.data?.data?.seasons||[];
    const season=seasons.find(x=>Number(x.season)===1)||seasons[0];
    const episode=season?.episodes?.find(x=>Number(x.episode)===1)||season?.episodes?.[0];
    if(!episode?.id) throw new Error("anime_episode_missing");
    const h=(await getJson("/api/v1/media-health?type=episode&id="+encodeURIComponent(episode.id)+"&fresh=1",45000)).data?.health||{};
    console.log("named_episode_outcome="+JSON.stringify({
      title,season:season.season,episode:episode.episode,format:episode.playback?.format||"unknown",
      reachable:h.reachable===true,browser_ready:h.playback_ready===true,
      http_status:h.status||0,issues:h.issues||[h.error||"unknown"]
    }));
    summary.push("| Attack on Titan S1 Ep1 | "+(h.status||"-")+" | "+(h.playback_ready?"browser candidate":h.reachable?"server reachable only":"source unavailable")+" |");
  }catch(error){
    console.log("named_episode_error="+String(error?.message||error).slice(0,150));
    summary.push("| Attack on Titan S1 Ep1 | - | Unable to verify |");
  }
}

(async()=>{
  await probe("health","/api/v1/health");
  await probe("formats","/api/v1/formats");
  // A few samples, not a full catalog scan. All checks happen server-side,
  // and the API reads at most the first media bytes.
  await probe("sample:movie:mp4","/api/v1/media-health?type=movie&sample=1&format=mp4&limit=2");
  await probe("sample:movie:m3u8","/api/v1/media-health?type=movie&sample=1&format=m3u8&limit=2");
  await probe("sample:movie:ts","/api/v1/media-health?type=movie&sample=1&format=ts&limit=1");
  await probe("sample:episode:mkv","/api/v1/media-health?type=episode&sample=1&format=mkv&limit=2");
  await namedMovie("Speed Faster");
  await namedMovie("Sinners");
  await namedAnimeEpisode();

  summary.push("", "**Caveat:** Live samples are limited and do not certify an entire video or every episode. A successful API response does not mean all videos are playable.");
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary.join("\n")+"\n");
  const failures=checks.filter(x=>x.required&&!x.ok);
  console.log("PRODUCTION_SMOKE_RESULT="+JSON.stringify({total:checks.length,pass:checks.length-failures.length,fail:failures.length}));
  process.exitCode=failures.length?1:0;
})().catch(error=>{console.error("Uncaught smoke test error:",error);process.exitCode=1;});
