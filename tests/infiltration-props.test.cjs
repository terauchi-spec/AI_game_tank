const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {indoorGenerateFloor,indoorGenerateExterior,indoorRect,indoorAt}=require('../js/infiltration-world.js');
const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
const random=seed=>{let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}};

test('exterior trees and rocks are sparse and leave door approaches and exit pads open',()=>{
 for(let seed=1;seed<=100;seed++){
  const raw=indoorGenerateFloor(1,random(seed)),off=9300;
  const floor={number:1,footprint:indoorRect(raw.footprint,off),entrances:raw.entrances.map(p=>indoorAt(p.x,p.y,off)),emergency:raw.emergency?indoorAt(raw.emergency.x,raw.emergency.y,off):null};
  const props=indoorGenerateExterior(floor,random(seed^39)),fp=floor.footprint;
  assert.ok(props.length>=6&&props.length<=10);
  assert.ok(props.some(p=>p.kd===6)&&props.some(p=>p.kd===8));
  for(let i=0;i<props.length;i++){
   const q=props[i],x=q.x+q.w/2,y=q.y+q.h/2;
   assert.ok(q.x>=0&&q.x+q.w<=960);
   assert.ok(q.y+q.h<fp.y||q.y>fp.y+fp.h,'nothing inside the building or wall');
   for(const exit of [...floor.entrances,floor.emergency].filter(Boolean))assert.ok(Math.hypot(x-exit.x,y-exit.y)>=145+q.w/2);
   if(q.y>fp.y+fp.h)for(const door of floor.entrances)assert.ok(Math.abs(x-door.x)>=92+q.w/2,'wide continuous route from entrance to exit');
   for(const other of props.slice(0,i))assert.ok(Math.hypot(x-other.x-other.w/2,y-other.y-other.h/2)>=155);
  }
  assert.deepEqual(indoorGenerateExterior({...floor,number:2},()=>{throw Error('upstairs must not generate outdoor objects');}),[]);
 }
});

test('indoor WebP prop types vary while beds stay confined to small rooms',()=>{
 const expected=['bed','cabinet','container','desk','equipment','shelf'];
 for(let seed=1;seed<=60;seed++)for(const number of [1,2]){
  const f=indoorGenerateFloor(number,random(seed));
  assert.ok(f.furniture.every(q=>expected.includes(q.artKind)),'every indoor furniture collider has a WebP asset');
  for(const q of f.furniture.filter(q=>q.artKind==='bed')){
   const room=f.rooms.find(r=>r.tiles.some(t=>q.x>=t.x&&q.x<t.x+t.w&&q.y>=t.y&&q.y<t.y+t.h));
   assert.equal(room.size,1);assert.ok(Math.abs(q.h*1.75-104)<1e-9);assert.ok(Math.abs(q.w/104-106/256)<1e-9);
  }
  assert.equal(f.furniture.find(q=>q.kind==='postTable').artKind,'desk');
 }
});

test('prop assets load only on first use, fall back while loading, and render within their colliders',()=>{
 const start=source.indexOf('const indoorPropImages='),end=source.indexOf('function drawInfiltrationProps(cx,cy){',start);
 let loads=0;const images=[],calls=[];
 class Image{constructor(){loads++;this.complete=false;this.naturalWidth=106;this.naturalHeight=256;images.push(this);}set src(s){this.url=s;}}
 const g={save(){},restore(){},drawImage:(...args)=>calls.push(['draw',...args]),translate:(...args)=>calls.push(['translate',...args]),rotate:a=>calls.push(['rotate',a])};
 const api=new Function('Image','assetOK','g',source.slice(start,end)+';return {image:indoorPropImage,draw:drawInfiltrationPropSprite};')(Image,im=>im.complete,g);
 assert.equal(loads,0);assert.equal(api.image(null),null);assert.equal(loads,0);
 const prop={propArt:'bed',x:20,y:30,w:50,h:98};
 assert.equal(api.draw(prop),false);assert.equal(loads,1);assert.equal(images[0].url,'assets/indoor/bed.webp');
 images[0].complete=true;
 for(let i=0;i<120;i++)assert.equal(api.draw(prop),true);
 assert.equal(loads,1);const w=98*106/256;assert.deepEqual(calls[0],['draw',images[0],20+(50-w)/2,30,w,98]);
 calls.length=0;api.draw({...prop,w:98,h:50});
 assert.deepEqual(calls,[['translate',69,55],['rotate',Math.PI/2],['draw',images[0],-w/2,-49,w,98]]);
});

test('outside entrances use the hills backdrop with no concrete strips',()=>{
 const start=source.indexOf('function drawInfiltrationFloors(cx,cy){'),end=source.indexOf('function drawInfiltrationProps(cx,cy){',start);
 const calls=[],concrete={},hill={};
 const g=new Proxy({fillRect(...r){calls.push({style:this.fillStyle,r});}},{get:(o,k)=>k in o?o[k]:()=>{}});
 const floor={footprint:{x:50,y:200,w:800,h:800},entrances:[{x:300,y:1672},{x:480,y:1672}],emergency:{x:400,y:104},corridors:[],rooms:[],stair:{x:100,y:500}};
 const draw=new Function('g','indoorWorld','WW','W','H','INDOOR_FORECOURT_DEPTH','terrainSurfacePattern','indoorOutdoorTerrain','indoorConcretePattern','INDOOR_EXIT_RADIUS','INDOOR_EXIT_SECONDS',source.slice(start,end)+';return drawInfiltrationFloors;')(
  g,{floors:[floor]},960,480,720,900,()=>hill,{n:'丘陵',g:'#6b7a3a'},()=>concrete,90,5);
 draw(0,1050);
 assert.equal(calls[0].style,hill);
 assert.equal(calls.filter(q=>q.style===concrete).length,0,'no concrete outside the footprint');
 // Exit circles are drawn as arcs rather than rectangular pads.
 assert.ok(!calls.some(q=>q.r[2]===86&&q.r[3]===40));
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

test('furniture colliders preserve source aspect ratios and containers double their fitted size',()=>{
 const ratios={container:119/256,equipment:207/256,shelf:108/256,cabinet:137/256,desk:147/256,bed:106/256};
 let beds=0,containers=0;
 for(let seed=1;seed<=100;seed++)for(const number of [1,2]){
  const floor=indoorGenerateFloor(number,random(seed*771));
  for(const q of floor.furniture){
   if(!q.artKind)continue;
   assert.ok(Math.abs(q.w/(q.h*1.75)-ratios[q.artKind])<1e-9);
   if(q.artKind==='container'){
    const expected=q.kind==='cabinet'?154:140;
    assert.ok(Math.abs(q.h*1.75-expected)<1e-9);containers++;
   }
   if(q.artKind==='bed'){
    assert.ok(Math.abs(q.h*1.75-104)<1e-9);beds++;
    assert.ok(floor.rooms.some(r=>r.size===1&&r.tiles.some(t=>q.x>=t.x&&q.x+q.w<=t.x+t.w&&q.y>=t.y&&q.y+q.h<=t.y+t.h)));
   }
  }
 }
 assert.ok(beds>0&&containers>0);
});

test('emergency exit randomizes its real doorway, escape pad and light together',()=>{
 let withExit=0,withoutExit=0;
 for(let seed=1;seed<=200;seed++){
  const floor=indoorGenerateFloor(1,random(seed*913));
  assert.equal(floor.entryOpenings.some(q=>q.side===-1),!!floor.emergency);assert.ok(floor.doors.every(q=>!q.outer));
  assert.equal(floor.lightFixtures.some(q=>q.anchor==='entry-north'),!!floor.emergency);
  const x=floor.footprint.x+450,y=floor.footprint.y;
  const blocked=floor.walls.some(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);
  assert.equal(blocked,!floor.emergency);
  if(floor.emergency)withExit++;else withoutExit++;
 }
 assert.ok(withExit>60&&withoutExit>60,'both patterns occur regularly');
});

test('infiltration pallet has a high resolution alpha source without replacing the shared 80px asset',()=>{
 const high=fs.readFileSync(path.join(__dirname,'../assets/indoor/shell_pallet_hd.webp'));
 assert.equal(high.toString('ascii',8,12),'WEBP');assert.equal(high.toString('ascii',12,16),'VP8X');
 assert.ok(high[20]&16);assert.equal(1+high.readUIntLE(24,3),512);assert.equal(1+high.readUIntLE(27,3),512);
 assert.ok(high.length<100000);
 const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(index.includes("if(o.indoorExplosive&&drawInfiltrationShellPallet(o))return;"));
 assert.ok(index.includes('"shell_pallet":ASSET_DIR+\'cover/shell_pallet.webp\''));
});

test('exit marker uses the escape radius and a half ring at 2.5 seconds',()=>{
 const start=source.indexOf('function drawInfiltrationFloors(cx,cy){'),end=source.indexOf('function drawInfiltrationProps(cx,cy){',start);
 const circles=[],labels=[],exit={x:300,y:1672};
 const g=new Proxy({arc:(...a)=>circles.push(a),fillText:(...a)=>labels.push(a)},{get:(o,k)=>k in o?o[k]:()=>{}});
 const floor={footprint:{x:50,y:200,w:800,h:800},entrances:[exit],emergency:null,corridors:[],rooms:[],stair:{x:100,y:500}};
 const m={escapeExit:exit,escapeProgress:2.5};
 const draw=new Function('g','indoorWorld','WW','W','H','INDOOR_FORECOURT_DEPTH','terrainSurfacePattern','indoorOutdoorTerrain','indoorConcretePattern','INDOOR_EXIT_RADIUS','INDOOR_EXIT_SECONDS','mission',source.slice(start,end)+';return drawInfiltrationFloors;')(
  g,{floors:[floor]},960,480,720,900,()=>null,{g:'#6b7a3a'},()=>null,90,5,m);
 draw(0,1050);
 assert.deepEqual(circles,[[300,1672,90,0,Math.PI*2],[300,1672,90,-Math.PI/2,Math.PI/2]]);
 assert.ok(labels.some(q=>q[0]==='EXIT'));assert.ok(labels.some(q=>q[0]==='2.5s'));
});

test('stair sprites select ascending and descending artwork and preserve image proportions',()=>{
 const start=source.indexOf('function drawInfiltrationStairSprite(floor){'),end=source.indexOf('function drawInfiltrationFloors(cx,cy){',start);
 const calls=[],requests=[],g={save(){},restore(){},drawImage:(...a)=>calls.push(a)};
 const image={naturalWidth:100,naturalHeight:240};
 const draw=new Function('g','indoorPropImage','INDOOR_STAIR_WIDTH',source.slice(start,end)+';return drawInfiltrationStairSprite;')(g,key=>{requests.push(key);return image;},60);
 for(const number of [1,2])assert.equal(draw({number,stair:{x:500,y:1000}}),true);
 assert.deepEqual(requests,['stairs_up','stairs_down']);
 for(const [im,x,y,w,h] of calls){assert.equal(im,image);assert.ok(Math.abs(w/h-100/240)<1e-9);assert.equal(w,60);assert.equal(h,144);assert.equal(x+w/2,500);assert.equal(y+h/2,1000);}
});

test('ascending and descending staircase files are small alpha WebP assets',()=>{
 let bytes=0;
 for(const name of ['stairs_up','stairs_down']){
  const data=fs.readFileSync(path.join(__dirname,'../assets/indoor/'+name+'.webp'));bytes+=data.length;
  assert.equal(data.toString('ascii',8,12),'WEBP');assert.ok(data[20]&16);
  assert.ok(1+data.readUIntLE(24,3)<=256);assert.ok(1+data.readUIntLE(27,3)<=320);
 }
 assert.ok(bytes<50000);
});
