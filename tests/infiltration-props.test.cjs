const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {indoorGenerateFloor,indoorGenerateExterior,indoorRect,indoorAt}=require('../js/infiltration-world.js');
const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
const random=seed=>{let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}};

test('exterior trees and rocks are sparse and leave door approaches and exit pads open',()=>{
 for(let seed=1;seed<=100;seed++){
  const raw=indoorGenerateFloor(1,random(seed)),off=9300;
  const floor={number:1,footprint:indoorRect(raw.footprint,off),entrances:raw.entrances.map(p=>indoorAt(p.x,p.y,off)),emergency:indoorAt(raw.emergency.x,raw.emergency.y,off)};
  const props=indoorGenerateExterior(floor,random(seed^39)),fp=floor.footprint;
  assert.ok(props.length>=6&&props.length<=10);
  assert.ok(props.some(p=>p.kd===6)&&props.some(p=>p.kd===8));
  for(let i=0;i<props.length;i++){
   const q=props[i],x=q.x+q.w/2,y=q.y+q.h/2;
   assert.ok(q.x>=0&&q.x+q.w<=960);
   assert.ok(q.y+q.h<fp.y||q.y>fp.y+fp.h,'nothing inside the building or wall');
   for(const exit of [...floor.entrances,floor.emergency])assert.ok(Math.hypot(x-exit.x,y-exit.y)>=145+q.w/2);
   if(q.y>fp.y+fp.h)for(const door of floor.entrances)assert.ok(Math.abs(x-door.x)>=92+q.w/2,'wide continuous route from entrance to exit');
   for(const other of props.slice(0,i))assert.ok(Math.hypot(x-other.x-other.w/2,y-other.y-other.h/2)>=155);
  }
  assert.deepEqual(indoorGenerateExterior({...floor,number:2},()=>{throw Error('upstairs must not generate outdoor objects');}),[]);
 }
});

test('all six indoor WebP prop types occur without adding furniture or changing hallway constraints',()=>{
 const expected=['bed','cabinet','container','desk','equipment','shelf'];
 for(let seed=1;seed<=60;seed++)for(const number of [1,2]){
  const f=indoorGenerateFloor(number,random(seed));
  assert.deepEqual([...new Set(f.furniture.filter(q=>q.zone==='room').map(q=>q.artKind))].sort(),expected);
  assert.equal(f.furniture.find(q=>q.kind==='postTable').artKind,'desk');
 }
});

test('prop assets load only on first use, fall back while loading, and render within their colliders',()=>{
 const start=source.indexOf('const indoorPropImages='),end=source.indexOf('function drawInfiltrationProps(cx,cy){',start);
 let loads=0;const images=[],calls=[];
 class Image{constructor(){loads++;this.complete=false;images.push(this);}set src(s){this.url=s;}}
 const g={save(){},restore(){},drawImage:(...args)=>calls.push(['draw',...args]),translate:(...args)=>calls.push(['translate',...args]),rotate:a=>calls.push(['rotate',a])};
 const api=new Function('Image','assetOK','g',source.slice(start,end)+';return {image:indoorPropImage,draw:drawInfiltrationPropSprite};')(Image,im=>im.complete,g);
 assert.equal(loads,0);assert.equal(api.image(null),null);assert.equal(loads,0);
 const prop={propArt:'bed',x:20,y:30,w:50,h:98};
 assert.equal(api.draw(prop),false);assert.equal(loads,1);assert.equal(images[0].url,'assets/indoor/bed.webp');
 images[0].complete=true;
 for(let i=0;i<120;i++)assert.equal(api.draw(prop),true);
 assert.equal(loads,1);assert.deepEqual(calls[0],['draw',images[0],20,30,50,98]);
 calls.length=0;api.draw({...prop,w:98,h:50});
 assert.deepEqual(calls,[['translate',69,55],['rotate',Math.PI/2],['draw',images[0],-25,-49,50,98]]);
});

test('outside entrances use the hills backdrop with no concrete strips',()=>{
 const start=source.indexOf('function drawInfiltrationFloors(cx,cy){'),end=source.indexOf('function drawInfiltrationProps(cx,cy){',start);
 const calls=[],concrete={},hill={};
 const g=new Proxy({fillRect(...r){calls.push({style:this.fillStyle,r});}},{get:(o,k)=>k in o?o[k]:()=>{}});
 const floor={footprint:{x:50,y:200,w:800,h:800},entrances:[{x:300,y:1672},{x:480,y:1672}],emergency:{x:400,y:104},corridors:[],rooms:[],stair:{x:100,y:500}};
 const draw=new Function('g','indoorWorld','WW','W','H','INDOOR_FORECOURT_DEPTH','terrainSurfacePattern','indoorOutdoorTerrain','indoorConcretePattern',source.slice(start,end)+';return drawInfiltrationFloors;')(
  g,{floors:[floor]},960,480,720,900,()=>hill,{n:'丘陵',g:'#6b7a3a'},()=>concrete);
 draw(0,1050);
 assert.equal(calls[0].style,hill);
 assert.equal(calls.filter(q=>q.style===concrete).length,0,'no concrete outside the footprint');
 assert.ok(calls.some(q=>q.r[1]===1648),'exit signs still render');
});

test('all six deployed prop assets are small transparent WebP images',()=>{
 let total=0,pixels=0;
 for(const name of ['container','equipment','shelf','cabinet','desk','bed']){
  const data=fs.readFileSync(path.join(__dirname,'../assets/indoor/'+name+'.webp'));total+=data.length;
  assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
  assert.equal(data.toString('ascii',12,16),'VP8X');assert.ok(data[20]&16,'alpha channel is present');
  const w=1+data.readUIntLE(24,3),h=1+data.readUIntLE(27,3);
  assert.ok(w<=256&&h<=256);pixels+=w*h;
 }
 assert.ok(total<100000,'keep new image transfers below 100 KB');
 assert.ok(pixels*4<1600000,'keep decoded prop image memory below 1.6 MB');
});
