// Wilderness terrain and oasis imagery are cached; only sandstorm dust animates.
const canyonTiles=new Map(),wildernessRockCache=new Map();
let sandIntensity=0,sandDuration=24;
function clearCanyonTiles(){
 for(const c of canyonTiles.values())invalidateStaticRaster(c);canyonTiles.clear();
 for(const c of wildernessRockCache.values())invalidateStaticRaster(c);wildernessRockCache.clear();sandIntensity=0;
}
function oasisContains(w,x,y,r=0){const rx=w.w/2+r,ry=w.h/2+r;return ((x-w.x-w.w/2)/rx)**2+((y-w.y-w.h/2)/ry)**2<1;}
function wildernessRockSprite(c){
 const im=naturalCoverImage(c,'rock');if(!assetOK(im))return im;
 if(wildernessRockCache.has(im))return wildernessRockCache.get(im);
 const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;const q=gameCanvasContext(canvas);q.drawImage(im,0,0);
 q.globalCompositeOperation='source-atop';q.fillStyle='rgba(183,87,36,.52)';q.fillRect(0,0,canvas.width,canvas.height);q.globalCompositeOperation='source-over';
 canvas.complete=true;canvas.naturalWidth=canvas.width;canvas.naturalHeight=canvas.height;wildernessRockCache.set(im,canvas);return canvas;
}
function buildCanyonZones(){
 for(const z of ZONES)if(z.n==='荒野'){
  const top=Math.max(0,z.y1),bottom=Math.min(WH,z.y0),span=bottom-top;z.oasis=null;
  if(R()<.55){
   const w=600+R()*220,h=Math.min(440+R()*240,span*.42),cx=R()*WW,cy=top+span*(.3+R()*.35);
   z.oasis={x:cx-w/2,y:cy-h/2,w,h,oasis:true,flowSpeed:0};water.push(z.oasis);
   covers=covers.filter(c=>!oasisContains(z.oasis,c.x+c.w/2,c.y+c.h/2,Math.max(c.w,c.h)/2+8));
   objects=objects.filter(o=>!oasisContains(z.oasis,o.x+o.w/2,o.y+o.h/2,Math.max(o.w,o.h)/2+8));
   bushes=bushes.filter(b=>!oasisContains(z.oasis,b.x+b.w/2,b.y+b.h/2,40));rebuildSpatialGrid();
  }
  // Scattered mesas/inselbergs keep the main trail open and retain rock collision.
  for(let i=0,made=0;i<100&&made<6;i++){
   const w=110+R()*95,h=80+R()*75,x=35+R()*(WW-w-70),y=top+120+R()*Math.max(1,span-h-380),r=Math.max(w,h)*.55;
   if(hitsM(x+w/2,y+h/2,r)||(p&&Math.hypot(x+w/2-p.x,y+h/2-p.y)<200))continue;
   covers.push({kd:8,x,y,w,h,wildernessRock:1});made++;rebuildSpatialGrid();
  }
  const addShrub=(x,y)=>{
   const w=65+R()*30,h=45+R()*20;if(x<12||x+w>WW-12||y<top+30||y+h>bottom-170||hitsM(x+w/2,y+h/2,40)||bushes.some(b=>circleHitsRect(x+w/2,y+h/2,45,b)))return false;
   const b={x,y,w,h};if(R()<.15)b.wildFlowers=Array.from({length:3+(R()*3|0)},()=>({dx:w*(.2+R()*.6),dy:h*(.2+R()*.5),white:R()<.55}));bushes.push(b);rebuildSpatialGrid();return true;
  };
  for(let i=0,made=0;i<80&&made<3;i++)if(addShrub(35+R()*(WW-135),top+70+R()*Math.max(1,span-360)))made++;
  if(z.oasis){const o=z.oasis;for(let i=0,made=0;i<160&&made<20;i++){const a=R()*Math.PI*2,rx=o.w/2+55+R()*50,ry=o.h/2+55+R()*50;if(addShrub(o.x+o.w/2+Math.cos(a)*rx-40,o.y+o.h/2+Math.sin(a)*ry-25))made++;}}
 }
 rebuildSpatialGrid();
 // Relocate only patrols invalidated by a new pond or mesa, to a dry short route.
 for(const h of humans||[])if(zoneAt(h.y).n==='荒野'&&(hitsM(h.x,h.y,10)||!pOK(h.path||[h],8,false))){
  const z=zoneAt(h.y),o=z.oasis;let done=false;
  for(const yy of [h.y,o?o.y-90:h.y-100,o?o.y+o.h+110:h.y+100])for(const x of [120,WW-120,WW/2,WW/2-130,WW/2+130]){
   const y=Math.max(z.y1+160,Math.min(z.y0-250,yy)),path=[{x,y},{x,y:y-55}];if(!done&&pOK(path,10,false)){h.x=x;h.y=y;h.path=path;h.loop=false;h.wi=1;h.dir=1;h.stk=0;done=true;}
  }
 }
}
function canyonTile(){
 if(canyonTiles.has('soil'))return canyonTiles.get('soil');
 const c=document.createElement('canvas');c.width=WW;c.height=512;const q=gameCanvasContext(c);q.fillStyle='#a76b43';q.fillRect(0,0,WW,512);
 let seed=871;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<2200;i++){q.fillStyle=i%3?'rgba(92,49,30,.16)':'rgba(234,179,113,.18)';q.fillRect(rnd()*WW,rnd()*512,1+rnd()*4,1+rnd()*3);}
 const cell=62,cols=Math.ceil(WW/cell)+1,rows=10,pts=[];
 for(let y=0;y<=rows;y++){pts[y]=[];for(let x=0;x<=cols;x++)pts[y][x]=y===rows?{x:pts[0][x].x,y:512}:{x:x*cell+(rnd()-.5)*35,y:y===0?0:y*51.2+(rnd()-.5)*25};}
 q.lineWidth=1.2;q.strokeStyle='rgba(77,40,27,.38)';
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=pts[y][x],b=pts[y][x+1],d=pts[y+1][x],e=pts[y+1][x+1];q.beginPath();if(y>0){q.moveTo(a.x,a.y);q.lineTo(b.x,b.y);}q.moveTo(a.x,a.y);q.lineTo(d.x,d.y);q.stroke();}
 q.strokeStyle='rgba(227,163,96,.25)';q.lineWidth=12;for(let i=0;i<5;i++){q.beginPath();q.moveTo(0,i*120+20);q.bezierCurveTo(WW*.3,i*120-40,WW*.6,i*120+70,WW,i*120);q.stroke();}
 canyonTiles.set('soil',c);return c;
}
function drawCanyonTerrain(cx,cy){
 for(const z of ZONES)if(z.n==='荒野'&&z.y0>cy&&z.y1<cy+H){
  const top=Math.max(0,z.y1),bottom=Math.min(WH,z.y0),tile=canyonTile();g.save();g.beginPath();g.rect(0,top,WW,bottom-top);g.clip();
  for(let y=Math.floor(cy/512)*512;y<cy+H;y+=512)drawStaticRaster(tile,0,y);g.restore();
 }
}
function oasisImage(o){
 if(o.visualCache)return o.visualCache;
 const pad=24,c=document.createElement('canvas');c.width=Math.ceil(o.w)+pad*2;c.height=Math.ceil(o.h)+pad*2;const q=gameCanvasContext(c),cx=o.w/2+pad,cy=o.h/2+pad;
 q.fillStyle='#5e7947';q.beginPath();q.ellipse(cx,cy,o.w/2+15,o.h/2+15,0,0,Math.PI*2);q.fill();
 q.save();q.beginPath();q.ellipse(cx,cy,o.w/2,o.h/2,0,0,Math.PI*2);q.clip();
 const gr=q.createRadialGradient(cx-o.w*.12,cy-o.h*.12,20,cx,cy,o.w*.6);gr.addColorStop(0,'#245d61');gr.addColorStop(.7,'#438e88');gr.addColorStop(1,'#8cba99');q.fillStyle=gr;q.fillRect(0,0,c.width,c.height);
 const river=TERRAIN_IMG['川'];if(assetOK(river)){q.globalAlpha=.25;q.drawImage(river,pad,pad,o.w,o.h);q.globalAlpha=1;}
 q.strokeStyle='rgba(200,241,220,.25)';q.lineWidth=2;for(let i=0;i<10;i++){q.beginPath();q.ellipse(cx,cy,Math.max(20,o.w/2-i*19),Math.max(15,o.h/2-i*12),0,Math.PI*.1,Math.PI*.8);q.stroke();}q.restore();
 q.strokeStyle='#b6c698';q.lineWidth=3;q.beginPath();q.ellipse(cx,cy,o.w/2,o.h/2,0,0,Math.PI*2);q.stroke();o.visualCache=c;return c;
}
function drawCanyonWaterfalls(cx,cy){
 // Historical hook name: water layer now draws still oasis ponds, without waterfalls.
 for(const w of water)if(w.oasis&&drawBoundsInView(w.x,w.y,w.w,w.h,cx,cy,24))drawStaticRaster(oasisImage(w),w.x-24,w.y-24);
}
function drawWildernessFlowers(cx,cy){
 for(const b of bushes)if(b.wildFlowers&&drawBoundsInView(b.x,b.y,b.w,b.h,cx,cy,10))for(const f of b.wildFlowers){g.fillStyle=f.white?'#f4e8cb':'#c74732';g.beginPath();g.arc(b.x+f.dx,b.y+f.dy,2.5,0,Math.PI*2);g.fill();g.fillStyle='#d5b655';g.fillRect(b.x+f.dx-.6,b.y+f.dy-.6,1.2,1.2);}
}
function updateSandstorm(dt){
 const arid=p&&zoneAt(p.y).n==='荒野';
 if(!arid){sandIntensity=0;if(weather==='sandstorm'){weather='clear';weatherT=0;weatherNext=20+R()*30;}return false;}
 if(weather==='rain'){weather='clear';weatherT=0;weatherNext=8+R()*12;}
 rainIntensity=0;
 if(weather==='sandstorm'){weatherT=Math.max(0,weatherT-dt);if(weatherT===0){weather='clear';weatherNext=22+R()*40;say('砂嵐が収まった');}}
 else{weatherNext-=dt;if(weatherNext<=0){weather='sandstorm';sandDuration=18+R()*10;weatherT=sandDuration;say('砂嵐：視界と索敵距離が低下');}}
 const k=weather==='sandstorm'?Math.max(0,Math.min(1,(sandDuration-weatherT)/4,weatherT/4)):0;sandIntensity=k*k*(3-2*k);return true;
}
function drawSandstormOverlay(){
 if(sandIntensity<=0)return;const q=gm,t=performance.now(),s=sandIntensity;q.save();q.fillStyle='rgba(132,83,43,'+(.40*s)+')';q.fillRect(0,0,W,H);
 q.strokeStyle='rgba(243,199,133,'+(.34*s)+')';q.lineWidth=2;for(let i=0;i<28;i++){const x=((i*127+t*(.16+(i%3)*.025))%(W+140))-70,y=(i*173+t*.015)%(H+40)-20;q.beginPath();q.moveTo(x,y);q.lineTo(x+20+i%4*7,y-6);q.stroke();}q.restore();
}
let selectedAreaDebug=null;
function setupSelectedAreaDebugStage(){
 const name=selectedAreaDebug||'草原',z={n:name,y0:WH-40,y1:WH-2440,g:ZONE_STYLE[name].g,p:ZONE_STYLE[name].p.slice(),areaDebug:1};ZONES=[z];
 clearCanyonTiles();clearMazeWallChunks();clearFragmentRenderCache();
 covers=[];objects=[];bushes=[];water=[];bridges=[];mud=[];cars=[];humans=[];etanks=[];items=[];bullets=[];parts=[];waves=[];fx=[];bombs=[];roadBands=[];areaDebugLabels=[];
 base={x:WW/2-COMMAND_BASE_W/2,y:name==='敵司令本部'?z.y1+160:-60000,w:COMMAND_BASE_W,h:COMMAND_BASE_H,hp:30,maxHp:30,deadAt:0};
 p.x=WW/2;p.y=z.y0-170;p.hp=3;p.tank=null;p.body=p.ang=-Math.PI/2;scoreStats.startY=p.y;scoreStats.debugUsed=true;
 base.y/=MAP_SCALE;genCovers();genObjects();base.y*=MAP_SCALE;covers.forEach(c=>c.y*=MAP_SCALE);objects.forEach(o=>o.y*=MAP_SCALE);rebuildSpatialGrid();
 if(name==='湿地')for(let i=0;i<12;i++)mud.push({x:90+R()*650,y:z.y1+160+R()*1700,w:100+R()*120,h:55+R()*40});
 const bushN=name==='草原'?50:name==='湿地'?30:name==='森林'?12:name==='村'?8:name==='荒野'?0:5;
 for(let i=0,made=0;i<bushN*40&&made<bushN;i++){const x=40+R()*(WW-150),y=z.y1+140+R()*1900;if(!hitsM(x+40,y+25,45)&&!bushes.some(b=>circleHitsRect(x+40,y+25,50,b))){bushes.push({x,y,w:85,h:55});made++;}}
 if(name==='荒野')buildCanyonZones();
 // Reserve a safe starting space for infantry and the unlimited-ammo tank.
 covers=covers.filter(c=>!circleHitsRect(WW/2,p.y-50,145,coverSpriteRect(c)||c));
 objects=objects.filter(o=>!circleHitsRect(WW/2,p.y-50,170,o));bushes=bushes.filter(b=>!circleHitsRect(WW/2,p.y-50,170,b));mud=mud.filter(m=>!circleHitsRect(WW/2,p.y-50,170,m));
 const type=TYPES[0];cars.push({x:WW/2+75,y:p.y-60,t:type,kind:'tank',hp:type.hp,c:type.cmax,v:type.vmax,f:type.fmax,ch:0,body:-Math.PI/2,areaDebug:1,debugInfinite:1});
 weather='clear';weatherT=0;weatherNext=name==='荒野'?8+R()*10:99999;rainIntensity=0;baseSpawnT=99999;radio=null;airstrike=null;airbombs=[];debugMode=1;debugInvincible=true;
 captureBuildingGroundMarks();rebuildSpatialGrid();say(name+' テスト：無敵／戦車の弾数・燃料無制限');
}
function syncAreaDebugPicker(){document.body.classList.toggle('area-picker-open',state==='areaPick');}
const areaList=document.getElementById('areaDebugList');
for(const name of AREA_DEBUG_ORDER){const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',()=>{if(state!=='areaPick')return;selectedAreaDebug=name;stageMode='base';const i=skillMenuList().findIndex(k=>k.id===selectedSkillId);selectSkillIndex(i,true);});areaList.append(b);}
document.getElementById('areaDebugBack').addEventListener('click',()=>{if(state==='areaPick'){state='skill';selectedAreaDebug=null;}});
