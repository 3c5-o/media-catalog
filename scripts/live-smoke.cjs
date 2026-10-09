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

(async()=>{
  await probe("health","/api/v1/health");
  await probe("formats","/api/v1/formats");
  // A few samples, not a full catalog scan. All checks happen server-side,
  // and the API reads at most the first media bytes.
  await probe("sample:movie:mp4","/api/v1/media-health?type=movie&sample=1&format=mp4&limit=2");
  await probe("sample:movie:m3u8","/api/v1/media-health?type=movie&sample=1&format=m3u8&limit=2");
  await probe("sample:movie:ts","/api/v1/media-health?type=movie&sample=1&format=ts&limit=1");
  await probe("sample:episode:mkv","/api/v1/media-health?type=episode&sample=1&format=mkv&limit=2");

  summary.push("", "**Caveat:** Live samples are limited and do not certify an entire video or every episode. A successful API response does not mean all videos are playable.");
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary.join("\n")+"\n");
  const failures=checks.filter(x=>x.required&&!x.ok);
  console.log("PRODUCTION_SMOKE_RESULT="+JSON.stringify({total:checks.length,pass:checks.length-failures.length,fail:failures.length}));
  process.exitCode=failures.length?1:0;
})().catch(error=>{console.error("Uncaught smoke test error:",error);process.exitCode=1;});
