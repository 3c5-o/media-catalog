"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const provider=require("../lib/provider");

function mockVideo(bytes,{status=206,type="video/mp4",cors="*",range="bytes 0-15/100000"}={}){
  const headers={"content-type":type,"access-control-allow-origin":cors};
  if(range) headers["content-range"]=range;
  return new Response(Buffer.from(bytes),{status,headers});
}

test("format classification never confuses an extension with verified playback",()=>{
  assert.equal(provider.playbackProfile("https://archive.org/download/test/movie.mp4").browser_playable,true);
  assert.equal(provider.playbackProfile("https://archive.org/download/test/anime.mkv").browser_playable,false);
  assert.equal(provider.playbackProfile("https://archive.org/download/test/movie.ts").browser_playable,false);
  assert.equal(provider.probeUrl("https://127.0.0.1/private"),"");
  assert.equal(provider.probeUrl("http://archive.org/test.mp4"),"");
  assert.equal(provider.probeUrl("https://archive.org/download/test/movie.mp4").startsWith("https://"),true);
});

test("GET range must actually return video bytes, not a successful HEAD or HTML page",async()=>{
  let method=null;
  const original=global.fetch;
  try{
    global.fetch=async(_url,options)=>{method=options.method;return mockVideo(Buffer.from("\x00\x00\x00\x18ftypisom"),{range:"bytes 0-11/100000"});};
    const good=await provider.checkUrlHealth("https://media.example/movie.mp4",{fresh:true});
    assert.equal(method,"GET");
    assert.equal(good.reachable,true);
    assert.equal(good.playback_ready,true);
    assert.equal(good.range_supported,true);
    global.fetch=async()=>mockVideo("<html>Access denied</html>",{status:200,type:"text/html",range:""});
    const wrong=await provider.checkUrlHealth("https://media.example/error.mp4",{fresh:true});
    assert.equal(wrong.reachable,false);
    assert.equal(wrong.issues.includes("html_instead_of_video"),true);
    global.fetch=async()=>mockVideo('{"error":"not found"}',{status:200,type:"application/json",range:""});
    const jsonError=await provider.checkUrlHealth("https://media.example/json-error.mp4",{fresh:true});
    assert.equal(jsonError.reachable,false);
    assert.equal(jsonError.issues.includes("json_or_error_document_instead_of_video"),true);
  }finally{global.fetch=original;}
});

test("HLS playlists require an actual EXTM3U manifest; MKV is reachable but not browser-ready",async()=>{
  const original=global.fetch;
  try{
    global.fetch=async()=>mockVideo("NOT AN HLS PLAYLIST",{status:200,type:"application/vnd.apple.mpegurl",range:""});
    const invalid=await provider.checkUrlHealth("https://media.example/broken.m3u8",{fresh:true});
    assert.equal(invalid.reachable,false);
    assert.ok(invalid.issues.includes("invalid_hls_manifest"));
    global.fetch=async()=>mockVideo("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000000\nvideo.m3u8\n",{status:200,type:"application/vnd.apple.mpegurl",range:""});
    const valid=await provider.checkUrlHealth("https://media.example/good.m3u8",{fresh:true});
    assert.equal(valid.reachable,true);
    assert.equal(valid.playback_ready,true);
    global.fetch=async()=>mockVideo(Buffer.from([0x1a,0x45,0xdf,0xa3,0x93]),{type:"video/x-matroska"});
    const mkv=await provider.checkUrlHealth("https://media.example/episode.mkv",{fresh:true});
    assert.equal(mkv.reachable,true);
    assert.equal(mkv.playback_ready,false);
    assert.ok(mkv.issues.includes("format_requires_native_player_or_conversion"));
  }finally{global.fetch=original;}
});

test("CORS failure and HTTP 403 are visible instead of reporting working video",async()=>{
  const original=global.fetch;
  try{
    global.fetch=async()=>mockVideo(Buffer.from("\x00\x00\x00\x18ftypisom"),{cors:""});
    const noCors=await provider.checkUrlHealth("https://media.example/nocors.mp4",{fresh:true});
    assert.equal(noCors.reachable,true);
    assert.equal(noCors.playback_ready,false);
    assert.ok(noCors.issues.includes("cors_not_confirmed_for_browser"));
    global.fetch=async()=>new Response("Forbidden",{status:403});
    const blocked=await provider.checkUrlHealth("https://media.example/blocked.mp4",{fresh:true});
    assert.equal(blocked.reachable,false);
    assert.ok(blocked.issues.includes("http_403"));
  }finally{global.fetch=original;}
});

test("redirects cannot escape to a private network address",async()=>{
  const original=global.fetch;
  let calls=0;
  try{
    global.fetch=async()=>{
      calls++;
      return new Response(null,{status:302,headers:{location:"https://127.0.0.1/internal"}});
    };
    const health=await provider.checkUrlHealth("https://media.example/redirect.mp4",{fresh:true});
    assert.equal(health.reachable,false);
    assert.equal(health.error,"unsafe_or_excessive_redirect");
    assert.equal(calls,1);
  }finally{global.fetch=original;}
});

test("safe CDN redirects preserve range verification",async()=>{
  const original=global.fetch;
  const calls=[];
  try{
    global.fetch=async(url,options)=>{
      calls.push({url,redirect:options.redirect});
      if(calls.length===1) return new Response(null,{status:302,headers:{location:"https://cdn.example/media.mp4"}});
      return mockVideo(Buffer.from("\x00\x00\x00\x18ftypisom"),{range:"bytes 0-11/100000"});
    };
    const check=await provider.checkUrlHealth("https://media.example/moved.mp4",{fresh:true});
    assert.equal(check.reachable,true);
    assert.equal(check.playback_ready,true);
    assert.equal(check.final_url,"https://cdn.example/media.mp4");
    assert.equal(calls.length,2);
    assert.equal(calls[0].redirect,"manual");
  }finally{global.fetch=original;}
});

test("ambiguous title/poster pairs are flagged instead of assigned the same stable key",async()=>{
  const original=global.fetch;
  const movie={movies:[
    {title:"Same title",logo:"https://posters.example/poster.jpg",url:"https://videos.example/cut1.mp4"},
    {title:"Same title",logo:"https://posters.example/poster.jpg",url:"https://videos.example/cut2.mp4"}
  ]};
  const anime=[{series_name:"Series S1",episode_number:1,episode_name:"Episode 1",url:"https://videos.example/ep1.mp4"}];
  try{
    global.fetch=async url=>new Response(JSON.stringify(String(url).includes("movsameh")?movie:anime),{status:200});
    const data=await provider.loadAll(true);
    assert.equal(data.movies.length,2);
    assert.notEqual(data.movies[0].id,data.movies[1].id);
    assert.equal(data.movies[0].stable_key,null);
    assert.equal(data.movies[1].stable_key,null);
    assert.equal(data.movies[0].stable_key_ambiguous,true);
  }finally{global.fetch=original;}
});

test("failure to fetch a refreshed source keeps the last known complete catalog and signals degradation",async()=>{
  const original=global.fetch;
  const movie={movies:[{title:"Source test movie",url:"https://archive.org/download/test/movie.mp4",logo:"https://media.example/poster.jpg"}]};
  const anime=[{series_name:"Attack on Titan S1",episode_name:"Episode 1",episode_number:1,url:"https://archive.org/download/test/episode.ts"}];
  try{
    global.fetch=async url=>new Response(JSON.stringify(String(url).includes("movsameh")?movie:anime),{status:200});
    const first=await provider.loadAll(true);
    assert.equal(first.movies.length,1);
    assert.equal(first.episodes.length,1);
    assert.equal(first.stale,false);
    const originalKey=first.movies[0].stable_key;
    const oldId=first.movies[0].id;
    movie.movies[0].url="https://archive.org/download/test/changed-source.mp4";
    const updated=await provider.loadAll(true);
    assert.equal(updated.movies[0].stable_key,originalKey,"stable key should survive a changed playback URL");
    assert.notEqual(updated.movies[0].id,oldId,"legacy ID is kept for compatibility");
    global.fetch=async()=>{throw new Error("simulated outage");};
    const fallback=await provider.loadAll(true);
    assert.equal(fallback.movies.length,1);
    assert.equal(fallback.episodes.length,1);
    assert.equal(fallback.stale,true);
    assert.match(fallback.lastError,/simulated outage/);
  }finally{global.fetch=original;}
});
