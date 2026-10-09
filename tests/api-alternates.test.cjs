"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const provider=require("../lib/provider");
const movieHandler=require("../api/movies-full");
const healthHandler=require("../api/media-health");

const badHls="https://video.example/broken.m3u8";
const goodMp4="https://video.example/working.mp4";
const payloadMovies={movies:[
  {title:"Speed Faster",genre:"اكشن",logo:"https://posters.example/image1.jpg",url:badHls},
  {title:"Speed Faster",genre:"اكشن",logo:"https://posters.example/image2.jpg",url:goodMp4}
]};
const payloadAnime=[{series_name:"Sample Anime S1",episode_name:"Episode 1",episode_number:1,url:"https://video.example/anime.ts"}];

function responseMock(){
  const result={statusCode:200,headers:{},body:null,
    setHeader(key,value){this.headers[key]=value;},
    end(value){this.body=JSON.parse(value);}};
  return result;
}

test("catalog exposes unverified alternatives, and rejects HLS image segments during live candidate checks",async()=>{
  const prior=global.fetch;
  try{
    global.fetch=async(input)=>{
      const url=String(input);
      if(url.includes("movsameh.json"))return new Response(JSON.stringify(payloadMovies),{status:200});
      if(url.includes("anisameh.json"))return new Response(JSON.stringify(payloadAnime),{status:200});
      if(url===badHls)return new Response("#EXTM3U\n#EXTINF:6.0,\nsegment.png\n",{
        status:200,headers:{"content-type":"application/vnd.apple.mpegurl","access-control-allow-origin":"*"}});
      if(url==="https://video.example/segment.png")return new Response(Buffer.from("89504e470d0a1a0a0000000d49484452","hex"),{
        status:206,headers:{"content-type":"image/png","access-control-allow-origin":"*","content-range":"bytes 0-15/100"}});
      if(url===goodMp4)return new Response(Buffer.from("\x00\x00\x00\x18ftypisom"),{
        status:206,headers:{"content-type":"video/mp4","content-range":"bytes 0-11/10000"}});
      throw new Error("unexpected mock URL "+url);
    };
    const all=await provider.loadAll(true);
    const id=all.movies[0].id;
    const detailsRes=responseMock();
    await movieHandler({method:"GET",url:"/api/movies?id="+encodeURIComponent(id)+"&enrich=0",headers:{}},detailsRes);
    assert.equal(detailsRes.statusCode,200);
    assert.equal(detailsRes.body.data.source_candidates.length,2);
    assert.ok(detailsRes.body.data.source_candidates.every(x=>x.playback_verified===false));
    const checkRes=responseMock();
    await healthHandler({method:"GET",url:"/api/media-health?type=movie&id="+encodeURIComponent(id)+"&alternates=1&fresh=1",headers:{}},checkRes);
    assert.equal(checkRes.statusCode,200);
    const candidates=checkRes.body.candidates;
    assert.equal(candidates.length,2);
    assert.equal(candidates[0].health.playback_ready,false);
    assert.ok(candidates[0].health.issues.includes("hls_child_non_video"));
    assert.equal(candidates[1].health.playback_ready,true);
    assert.equal(checkRes.body.playable_candidate_id,candidates[1].id);
    assert.equal(checkRes.body.verified_full_playback,false);
  }finally{global.fetch=prior;}
});
