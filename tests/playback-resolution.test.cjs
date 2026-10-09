"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const provider=require("../lib/provider");
const resolvePlayback=require("../api/playback");
const movieJson={movies:[
  {title:"Speed Faster",genre:"اكشن",logo:"https://poster.example/a.jpg",url:"https://video.example/broken.m3u8"},
  {title:"Speed Faster",genre:"اكشن",logo:"https://poster.example/b.jpg",url:"https://video.example/working.mp4"},
  {title:"Another Film",genre:"دراما",logo:"https://poster.example/c.jpg",url:"https://video.example/unrelated.mp4"}
]};
const animeJson=[{series_name:"Attack on Titan S1",episode_name:"Episode 1",episode_number:1,url:"https://video.example/episode.ts"}];

function response(){
  return {statusCode:200,headers:{},body:null,
    setHeader(k,v){this.headers[k]=v;},
    end(text){this.body=JSON.parse(text);}
  };
}
async function run(type,id){
  const res=response();
  await resolvePlayback({method:"GET",url:"/api/playback?type="+type+"&id="+encodeURIComponent(id)+"&fresh=1",headers:{}},res);
  return res;
}
async function setup(){
  const data=await provider.loadAll(true);
  assert.equal(data.movies.length,3);
  assert.equal(data.episodes.length,1);
  return data;
}
test("returns a verified-byte MP4 candidate when the selected HLS link serves a PNG",async()=>{
  const old=global.fetch;
  try{
    global.fetch=async(input)=>{
      const url=String(input);
      if(url.includes("movsameh.json"))return new Response(JSON.stringify(movieJson),{status:200});
      if(url.includes("anisameh.json"))return new Response(JSON.stringify(animeJson),{status:200});
      if(url.endsWith("broken.m3u8"))return new Response("#EXTM3U\n#EXTINF:6.0,\nsegment.png\n",{status:200,headers:{"content-type":"application/vnd.apple.mpegurl","access-control-allow-origin":"*"}});
      if(url.endsWith("segment.png"))return new Response(Buffer.from("89504e470d0a1a0a0000000d49484452","hex"),{status:206,headers:{"content-type":"image/png","access-control-allow-origin":"*"}});
      if(url.endsWith("working.mp4"))return new Response(Buffer.from("\0\0\0\x18ftypisom"),{status:206,headers:{"content-type":"video/mp4","content-range":"bytes 0-11/20000"}});
      throw Error("Unmocked URL "+url);
    };
    const {movies}=await setup();
    const res=await run("movie",movies[0].id);
    assert.equal(res.statusCode,200);
    assert.equal(res.headers["Cache-Control"],"no-store");
    assert.equal(res.body.available,true);
    assert.equal(res.body.status,"candidate_available");
    assert.equal(res.body.selected.id,movies[1].id);
    assert.equal(res.body.selected.url,"https://video.example/working.mp4");
    assert.equal(res.body.verified_full_playback,false);
    assert.equal(res.body.candidates.length,2);
    assert.equal(res.body.candidates[0].ready_for_browser_probe,false);
    assert.ok(res.body.candidates[0].issues.includes("hls_child_non_video"));
    assert.equal(res.body.candidates[0].url,undefined,"failed URL must not appear as a selected source");
    assert.equal(res.body.candidates[1].ready_for_browser_probe,true);
  }finally{global.fetch=old;}
});

test("does not silently publish a broken HLS link when no alternative is playable",async()=>{
  const old=global.fetch;
  try{
    global.fetch=async(input)=>{
      const url=String(input);
      if(url.includes("movsameh.json"))return new Response(JSON.stringify({movies:[movieJson.movies[0]]}),{status:200});
      if(url.includes("anisameh.json"))return new Response(JSON.stringify(animeJson),{status:200});
      if(url.endsWith("broken.m3u8"))return new Response("#EXTM3U\n#EXTINF:6.0,\nsegment.png\n",{status:200,headers:{"content-type":"application/vnd.apple.mpegurl","access-control-allow-origin":"*"}});
      if(url.endsWith("segment.png"))return new Response(Buffer.from("89504e470d0a1a0a","hex"),{status:206,headers:{"content-type":"image/png","access-control-allow-origin":"*"}});
      throw Error("Unexpected URL "+url);
    };
    const all=await setupSingle();
    const res=await run("movie",all.movies[0].id);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.available,false);
    assert.equal(res.body.status,"no_verified_browser_candidate");
    assert.equal(res.body.selected,null);
    assert.equal(res.body.verified_full_playback,false);
  }finally{global.fetch=old;}
});
async function setupSingle(){return provider.loadAll(true);}

test("episode TS cannot be misreported as browser-ready",async()=>{
  const old=global.fetch;
  try{
    global.fetch=async(input)=>{
      const url=String(input);
      if(url.includes("movsameh.json"))return new Response(JSON.stringify(movieJson),{status:200});
      if(url.includes("anisameh.json"))return new Response(JSON.stringify(animeJson),{status:200});
      if(url.endsWith("episode.ts")){
        const ts=Buffer.alloc(376);ts[0]=0x47;ts[188]=0x47;
        return new Response(ts,{status:206,headers:{"content-type":"video/mp2t","content-range":"bytes 0-375/20000"}});
      }
      throw Error("Unexpected URL "+url);
    };
    const data=await provider.loadAll(true);
    const res=await run("episode",data.episodes[0].id);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.available,false);
    assert.equal(res.body.selected,null);
    assert.equal(res.body.candidates[0].reachable,true);
    assert.ok(res.body.candidates[0].issues.includes("format_requires_native_player_or_conversion"));
  }finally{global.fetch=old;}
});
