// Valley scenery uses two reusable 256px bands; only waterfall foam animates.
const canyonTiles=new Map();
let canyonTileAssets=-1;
function clearCanyonTiles(){for(const c of canyonTiles.values())invalidateStaticRaster(c);canyonTiles.clear();canyonTileAssets=-1;}
function buildCanyonZones(){
 for(const z of ZONES)if(z.n==='渓谷'){
  z.canyonSide=R()<.5?'left':'right';
  const x=z.canyonSide==='left'?40:WW-204,top=Math.max(0,z.y1),bottom=Math.min(WH,z.y0);
  z.canyonWater={x,y:top,w:164,h:Math.max(100,bottom-top),canyon:true,flowDir:z.canyonSide==='left'?1:-1,flowSpeed:7};water.push(z.canyonWater);
  z.canyonFalls=[];for(let y=top+110;y<bottom-100;y+=390)z.canyonFalls.push({x:z.canyonSide==='left'?50:WW-50,y,dir:z.canyonSide==='left'?1:-1});
  const blocked=(x,y,r)=>hitsM(x,y,r)||(p&&Math.hypot(x-p.x,y-p.y)<180);
  for(let i=0,y=top+70;y<bottom-30;y+=140,i++){
   const rx=i%2?WW-95:65,w=62+R()*32,h=70+R()*32;
   if(!blocked(rx+w/2,y+h/2,Math.max(w,h)/2))covers.push({kd:8,x:rx,y,w,h,canyonRock:1});
   const bx=z.canyonSide==='left'?250+R()*65:WW-330+R()*65,by=y+25;
   if(!blocked(bx+36,by+24,40))bushes.push({x:bx,y:by,w:75+R()*20,h:50+R()*18});
  }
 }
 rebuildSpatialGrid();
 // Any route blocked by newly added edge scenery is moved to the clear middle trail.
 for(const h of humans||[])if(zoneAt(h.y).n==='渓谷'&&(hitsM(h.x,h.y,10)||!pOK(h.path||[h],8,false))){
  const z=zoneAt(h.y),y=Math.max(z.y1+240,Math.min(z.y0-280,h.y));
  for(const x of [WW/2,WW/2-70,WW/2+70]){const path=[{x,y},{x,y:y-60}];if(pOK(path,10,false)){h.x=x;h.y=y;h.path=path;h.loop=false;h.wi=1;h.dir=1;h.stk=0;break;}}
 }
}
function canyonTile(side){
 const rock=COVER_IMG.rock,ground=TERRAIN_IMG['丘陵'],river=TERRAIN_IMG['川'],sig=(assetOK(rock)?1:0)+(assetOK(ground)?2:0)+(assetOK(river)?4:0);
 if(sig!==canyonTileAssets){clearCanyonTiles();canyonTileAssets=sig;}
 if(canyonTiles.has(side))return canyonTiles.get(side);
 const c=document.createElement('canvas');c.width=WW;c.height=256;const q=gameCanvasContext(c);
 q.fillStyle='#67715c';q.fillRect(0,0,WW,256);
 if(assetOK(ground)){q.globalAlpha=.28;for(let x=0;x<WW;x+=256)q.drawImage(ground,x,0,256,256);q.globalAlpha=1;}
 // Fine gravel, moss and weathered rock strata are baked once.
 let seed=side==='left'?137:731;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<500;i++){q.fillStyle=i%3?'rgba(47,61,49,.18)':'rgba(184,178,143,.25)';q.fillRect(rnd()*WW,rnd()*256,2+rnd()*5,1+rnd()*3);}
 for(const left of [true,false]){
  const inner=left?108:WW-108;q.fillStyle='#474c43';q.fillRect(left?0:inner,0,108,256);
  for(let i=0;i<12;i++){const y=i*23-8,w=65+rnd()*35;q.fillStyle=['#747668','#585e52','#90907b'][i%3];q.beginPath();q.moveTo(left?0:WW,y);q.lineTo(left?w:WW-w,y+6);q.lineTo(left?w-10:WW-w+10,y+24);q.lineTo(left?0:WW,y+30);q.closePath();q.fill();q.strokeStyle='#343b34';q.lineWidth=2;q.stroke();}
  if(assetOK(rock)){for(const y of [-60,35,130,225])q.drawImage(rock,left?-42:WW-110,y,150,150);}
  for(let i=0;i<30;i++){q.fillStyle=i%2?'#526846':'#6f8053';q.beginPath();q.ellipse(left?65+rnd()*55:WW-65-rnd()*55,rnd()*256,4+rnd()*12,2+rnd()*6,0,0,Math.PI*2);q.fill();}
 }
 const x=side==='left'?40:WW-204;
 q.fillStyle='#285f65';q.fillRect(x,0,164,256);q.fillStyle='#397f80';q.fillRect(x+14,0,136,256);
 if(assetOK(river)){q.globalAlpha=.65;q.drawImage(river,x+9,0,146,256);q.globalAlpha=1;}
 for(let i=0;i<2;i++){q.fillStyle=i%2?'rgba(93,179,169,.08)':'rgba(18,75,80,.1)';q.beginPath();q.ellipse(x+82,50+i*125,65,45,0,0,Math.PI*2);q.fill();}
 q.strokeStyle='rgba(184,224,202,.25)';q.lineWidth=2;for(let i=0;i<9;i++){q.beginPath();q.moveTo(x+27,20+i*31);q.quadraticCurveTo(x+70,14+i*31,x+133,22+i*31);q.stroke();}
 canyonTiles.set(side,c);return c;
}
function drawCanyonTerrain(cx,cy){
 for(const z of ZONES)if(z.n==='渓谷'&&z.y0>cy&&z.y1<cy+H){
  const top=Math.max(0,z.y1),bottom=Math.min(WH,z.y0),tile=canyonTile(z.canyonSide||'left');
  g.save();g.beginPath();g.rect(0,top,WW,bottom-top);g.clip();
  for(let y=Math.floor(cy/256)*256;y<cy+H;y+=256)drawStaticRaster(tile,0,y);
  g.restore();
 }
}
function drawCanyonWaterfalls(cx,cy){
 const t=performance.now()*.003;
 for(const z of ZONES)for(const f of z.canyonFalls||[]){
  if(f.y<cy-50||f.y>cy+H+50||f.x<cx-90||f.x>cx+W+90)continue;
  g.save();g.translate(f.x,f.y);g.scale(f.dir,1);g.fillStyle='#b2ddd6';g.fillRect(0,-15,68,30);
  g.strokeStyle='#effaf2';g.lineWidth=3;for(let i=0;i<4;i++){const y=-10+i*7;g.beginPath();g.moveTo(5+(Math.sin(t+i)+1)*5,y);g.lineTo(62,y+2);g.stroke();}
  g.strokeStyle='rgba(220,250,240,.7)';g.lineWidth=2;g.beginPath();g.ellipse(72,2,14+Math.sin(t)*2,24,0,0,Math.PI*2);g.stroke();g.restore();
 }
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
 const bushN=name==='草原'?50:name==='湿地'?30:name==='森林'?12:name==='村'?8:5;
 for(let i=0,made=0;i<bushN*40&&made<bushN;i++){const x=40+R()*(WW-150),y=z.y1+140+R()*1900;if(!hitsM(x+40,y+25,45)&&!bushes.some(b=>circleHitsRect(x+40,y+25,50,b))){bushes.push({x,y,w:85,h:55});made++;}}
 if(name==='渓谷')buildCanyonZones();
 // Reserve a safe starting space for infantry and the unlimited-ammo tank.
 covers=covers.filter(c=>!circleHitsRect(WW/2,p.y-50,145,coverSpriteRect(c)||c));
 objects=objects.filter(o=>!circleHitsRect(WW/2,p.y-50,170,o));bushes=bushes.filter(b=>!circleHitsRect(WW/2,p.y-50,170,b));mud=mud.filter(m=>!circleHitsRect(WW/2,p.y-50,170,m));
 const type=TYPES[0];cars.push({x:WW/2+75,y:p.y-60,t:type,kind:'tank',hp:type.hp,c:type.cmax,v:type.vmax,f:type.fmax,ch:0,body:-Math.PI/2,areaDebug:1,debugInfinite:1});
 weather='clear';weatherT=0;weatherNext=99999;rainIntensity=0;baseSpawnT=99999;radio=null;airstrike=null;airbombs=[];debugMode=1;debugInvincible=true;
 captureBuildingGroundMarks();rebuildSpatialGrid();say(name+' テスト：無敵／戦車の弾数・燃料無制限');
}
function syncAreaDebugPicker(){document.body.classList.toggle('area-picker-open',state==='areaPick');}
const areaList=document.getElementById('areaDebugList');
for(const name of AREA_DEBUG_ORDER){const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',()=>{if(state!=='areaPick')return;selectedAreaDebug=name;stageMode='base';const i=skillMenuList().findIndex(k=>k.id===selectedSkillId);selectSkillIndex(i,true);});areaList.append(b);}
document.getElementById('areaDebugBack').addEventListener('click',()=>{if(state==='areaPick'){state='skill';selectedAreaDebug=null;}});
