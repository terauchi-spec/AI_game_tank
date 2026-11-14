// 決戦の砂漠街、施設潜入、砂漠戦を一つの作戦として進める。
const DECISIVE_FACILITY_NAME='最高指揮通信施設';
const DECISIVE_FACILITY_ENTRY_RADIUS=58;
const DECISIVE_FACILITY_DEFENSE_CLEARANCE=360;
const DECISIVE_COMPUTER_HITS=3;
const decisiveFacilityOutdoorTerrain={n:'砂漠',g:ZONE_STYLE['砂漠'].g};

function placeDecisiveRoomComputers(room,objects){
 const center=room.x+room.w/2;
 const place=(kind,x,y,w,h)=>objects.push({
  kind,x:x-w/(2*INDOOR_SCALE_X),y:room.y+y/INDOOR_SCALE_Y,
  w:w/INDOOR_SCALE_X,h:h/INDOOR_SCALE_Y,group:'command-room'
 });
 place('commandMain',center,15,360,360*184/512);
 const smallWidth=96;
 for(let row=0;row<3;row++)for(let col=-1;col<=1;col++){
  place('commandSmall',center+col*145/INDOOR_SCALE_X,218+row*105,smallWidth,smallWidth*87/192);
 }
}

function drawDecisiveComputerObject(o){
 const size=o.kind==='commandMain'?'large':'small';
 const image=COVER_IMG['decisive_computer-'+size+(o.wrecked?'-wreck':'')];
 const [w,h]=o.wrecked?fitAspect(image,o.w,o.h):[o.w,o.h];
 if(drawAssetSprite(image,o.x+o.w/2,o.y+o.h/2,w,h))return;
 g.fillStyle='#373733';g.fillRect(o.x,o.y,o.w,o.h);
 g.fillStyle=o.wrecked?'#232321':'#296e55';g.fillRect(o.x+o.w*.06,o.y+o.h*.1,o.w*.88,o.h*.28);
}
const DECISIVE_DESERT_START=6,DECISIVE_DESERT_EXTENSION=3680;
const DESERT_SANDBAG_W=210,DESERT_SANDBAG_H=52;
const DECISIVE_BUNKER_SCAN_SECONDS=.2;
const DECISIVE_FORTRESS_MOUNTS=[
 [.112,.473,Math.PI],[.112,.689,Math.PI],
 [.888,.473,0],[.888,.689,0],
 [.395,.89,Math.PI/2],[.605,.89,Math.PI/2]
];
const DECISIVE_ROOF_TURRETS=[[.264,.506],[.736,.506]];
const DECISIVE_FORTRESS_DOORS=[.293,.5,.707];
const DECISIVE_ARC_TIME=1.65,DECISIVE_ARC_HEIGHT=146,DECISIVE_ARC_RADIUS=52;
const DECISIVE_DOOR_TIME=1.35,DECISIVE_DOOR_RELEASE=.72;
const DECISIVE_FORTRESS_GEARS=[[.175,51],[.282,31],[.368,39],[.469,42],[.56,29],[.663,47],[.765,34],[.86,53]];
const DECISIVE_ALLIED_AIRDROP_DISTANCE=200,DECISIVE_ENEMY_RELEASE_DISTANCE=500;
let decisiveBattle=null,desertTownEvents=null;
function isDecisiveFacility(){return stageMode==='indoor'&&decisiveBattle?.phase==='facility';}
function isDecisiveStage(){return stageMode==='decisive'||isDecisiveFacility()||stageMode==='front'&&!!decisiveBattle;}
function loadDecisiveAssets(){
 for(const key of ['fortress','fortress-hull','fortress-gear','bunker','bunker-barrel','command-facility'])if(!COVER_IMG['decisive_'+key])COVER_IMG['decisive_'+key]=makeAssetImage('assets/decisive/'+key+'.webp?v='+GAME_VERSION);
 loadDesertTerrain();loadDesertSandbags();
}
function loadDesertSandbags(){
 if(!COVER_IMG.decisive_sandbags)COVER_IMG.decisive_sandbags=makeAssetImage('assets/decisive/sandbags.webp?v='+GAME_VERSION);
}
function loadDesertTerrain(){
 if(!TERRAIN_IMG['砂漠'])TERRAIN_IMG['砂漠']=makeAssetImage('assets/decisive/desert.webp?v='+GAME_VERSION,()=>{
  for(const z of ZONES)if(z.n==='砂漠'||z.n==='砂漠街')z.pat=null;
 });
 TERRAIN_IMG['砂漠街']=TERRAIN_IMG['砂漠'];
}
function setupDecisiveZones(){
 const names=['草原','砂漠街','砂漠街','砂漠街','砂漠街','砂漠街','砂漠','砂漠','砂漠','砂漠','砂漠'];
 const edges=[16880,15080,14030,13010,11990,11000,9200,7360,5520,3680,1840,-400];
 ZONES=names.map((n,i)=>({n,y0:edges[i],y1:edges[i+1],g:ZONE_STYLE[n].g,p:ZONE_STYLE[n].p.slice(),edgeRisk:R()<.5?'left':'right',decisiveArea:i}));
}
const DESERT_TOWN_SCALE=1.5;
const DESERT_TOWN_SANDBAG_ROW_GAP=168;
const DESERT_TOWN_GATE_GAP=92;
const DESERT_TOWN_GATE_DEPTH=222;
const DESERT_TOWN_PATROL_MARGIN=12;
const DESERT_TOWN_BUILDINGS=[
 ['adobe-house',4,216,144],
 ['adobe-building',4,288,144],
 ['desert-watchtower',3,160,180],
 ['citadel-ruins',3,210,212.8]
];
function setupDesertTownConditions(zones){
 for(const z of zones)z.desertTownStorm=R()<.5;
 const z=zones.length===1?zones[0]:zones[Math.floor(R()*zones.length)];
 // Use the jungle size distribution, including its 2,400px reference section.
 const lake=rollWildernessLake({...z,y0:z.y1+ESCAPE_TEST_AREA_HEIGHT},1);
 const relay=z.decisiveArea===DECISIVE_DESERT_START-1;
 lake.y=z.y1+(relay?800:48);
 // Leave room for the dry route beside the lake, the defenses, and a building row.
 const buildingReserve=(relay?320:270)+DESERT_TOWN_GATE_DEPTH+32+96;
 const fit=Math.min(1,(WW-168)/lake.w,(z.y0-lake.y-buildingReserve)/lake.h);
 lake.w*=fit;lake.h*=fit;lake.x=16;
 z.oasis=lake;
 water.push({...lake,y:lake.y/MAP_SCALE});
}
function plantDesertTownLakeBushes(zones){
 for(const z of zones){
  const lake=z.oasis;if(!lake)continue;
  for(let i=0;i<24;i++){
   const a=i*Math.PI/12,w=72,h=52;
   const x=lake.x+lake.w/2+Math.cos(a)*(lake.w/2+70);
   const y=lake.y+lake.h/2+Math.sin(a)*(lake.h/2+70);
   const shrub={x:x-w/2,y:y-h/2,w,h,desertLakeBush:true};
   if(x<48||x>WW-48||y<z.y1+40||y>z.y0-40||hitsM(x,y,40)||
      (shrub.x+shrub.w>WW/2-100&&shrub.x<WW/2+100)||
      (decisiveBattle?.building&&decisiveRectsOverlap(decisiveBattle.building,shrub,20))||
      covers.some(c=>decisiveRectsOverlap(c,shrub))||
      objects.some(o=>decisiveRectsOverlap(o.kind==='barrel'?barrelVisualRect(o):o,shrub))||
      bushes.some(b=>decisiveRectsOverlap(b,shrub,6)))continue;
   bushes.push(shrub);
  }
 }
}
function addDesertTownBuildings(z){
 loadDesertTerrain();
 for(const [key] of DESERT_TOWN_BUILDINGS){
  if(!COVER_IMG['decisive_'+key])COVER_IMG['decisive_'+key]=makeAssetImage(ASSET_DIR+'desert-town/'+key+'.webp?v='+GAME_VERSION);
 }
 // Pair the widest building with the tower to leave room for a vehicle to pass.
 const relay=z.decisiveArea===DECISIVE_DESERT_START-1;
 const top=z.oasis?z.oasis.y+z.oasis.h+32:z.y1+(relay?800:70);
 const bottom=z.y0-(z.areaDebug?650:70);
 const pairs=[[1,2],[0,3]],first=relay?1:z.oasis&&!z.areaDebug?0:Math.floor(R()*pairs.length);
 const rows=Array.from({length:relay||z.oasis&&!z.areaDebug?1:2},(_,row)=>pairs[(first+row)%pairs.length].map(index=>{
  const [key,kd,w,h]=DESERT_TOWN_BUILDINGS[index];
  return {key,kd,w:w*DESERT_TOWN_SCALE,h:h*DESERT_TOWN_SCALE};
 }));
 const heights=rows.map(row=>Math.max(...row.map(building=>building.h)));
 const gateCount=z.areaDebug?2:1;
 const spare=(bottom-top-gateCount*DESERT_TOWN_GATE_DEPTH-heights.reduce((sum,h)=>sum+h,0))/rows.length;
 let rowTop=top;
 for(const [i,row] of rows.entries()){
  if(z.areaDebug||i===0){
   // Leave the opening on alternating sides so no northbound line crosses the town.
   const openRight=(z.areaDebug?i:z.decisiveArea)%2===1;
   const emplace=R()<.35;
   for(let column=0;column<3;column++){
    const offset=column*(DESERT_SANDBAG_W+DESERT_TOWN_GATE_GAP);
    const x=openRight?offset:WW-offset-DESERT_SANDBAG_W;
    const y=rowTop+64+column*16;
    covers.push({kd:1,x,y:y/MAP_SCALE,w:DESERT_SANDBAG_W,h:DESERT_SANDBAG_H,decisiveKind:'sandbags',desertTownGate:true});
   }
   if(emplace){
    const gapCenter=DESERT_SANDBAG_W+DESERT_TOWN_GATE_GAP/2;
    (z.desertTownTowers??=[]).push({x:openRight?gapCenter:WW-gapCenter,y:rowTop+98});
   }
   rowTop+=DESERT_TOWN_GATE_DEPTH;
  }
  const lot=heights[i]+spare;
  let central=false;
  for(const [side,{key,kd,w,h}] of row.entries()){
   const wideRow=row[0].key==='adobe-building';
   const left=side?WW/2+(wideRow?156:central?145:100):16,right=side?WW-16:Math.max(WW/2-100,16+w);
   const roll=R();
   if(!side)central=!wideRow&&roll<.35;
   const x=!side&&central?WW/2-w*.85:left+roll*(right-left-w),y=rowTop+(lot-h)*(.35+R()*.3);
   const desertTownPatrolSite=i===0&&side===1;
   const patrolMargin=desertTownPatrolSite||key.startsWith('adobe-');
   // The normal generator scales Y later; sprite dimensions are already in world pixels.
   covers.push({kd,x:patrolMargin?Math.max(24,Math.min(x,WW-w-24)):x,y:y/MAP_SCALE,w,h,decisiveKind:key,desertTownPatrolSite});
  }
  rowTop+=lot;
 }
}
function addDesertTownScenery(z){
 loadDesertSandbags();
 const top=z.y1+(z.decisiveArea===DECISIVE_DESERT_START-1?800:70),bottom=z.y0-70;
 // Position in world pixels, then store the same pre-scaling Y as ordinary scenery.
 const occupied=covers.concat(objects,bushes,water).map(o=>{
  const pad=o.desertTownPatrolSite||DESERT_TOWN_DOORS[o.decisiveKind]?DESERT_TOWN_PATROL_MARGIN:0;
  return {...o,x:o.x-pad,y:o.y*MAP_SCALE-pad,w:o.w+pad*2,h:o.h+pad*2};
 });
 // Preserve the passage between the left and right buildings and across the rows.
 occupied.push({x:448,y:z.y1,w:176,h:z.y0-z.y1});
 // Leave the entire staggered row clear of other scenery, including its opening.
 for(const c of covers)if(c.desertTownGate){
  occupied.push({x:0,y:c.y*MAP_SCALE-64,w:WW,h:c.h+128});
 }
 // The sides of the relay plaza can hold small props while its clearing stays open.
 if(z.oasis)occupied.push({x:WW-152,y:z.oasis.y-32,w:152,h:z.oasis.h+64});
 const propsTop=z.y1+70,relayClearing=z.decisiveArea===DECISIVE_DESERT_START-1?{x:WW/2-350,y:z.y1+70,w:700,h:700}:null;
 const place=(list,props,w,h,count)=>{
  for(let tries=0,placed=0;tries<count*30&&placed<count;tries++){
   const side=R()<.5,left=side?WW/2+100:24,right=side?WW-24:WW/2-100;
   const x=left+R()*(right-left-w),y=propsTop+R()*(bottom-propsTop-h);
   const rect={x,y,w,h};
   const footprint=props.kind==='barrel'?barrelVisualRect(rect):rect;
   if(footprint.x<left||footprint.x+footprint.w>right||footprint.y<propsTop||
      (relayClearing&&decisiveRectsOverlap(footprint,relayClearing,16))||
      occupied.some(other=>decisiveRectsOverlap(footprint,other,16)))continue;
   occupied.push(footprint);
   list.push({...props,...rect,y:y/MAP_SCALE});placed++;
  }
 };
 const sandbagW=DESERT_SANDBAG_W,sandbagH=DESERT_SANDBAG_H;
 const gridBottom=z.y0-(z.areaDebug?650:70);
 const inset=(WW/2-100-sandbagW)/2,columns=[inset,WW-inset-sandbagW];
 const gridOptions=Array.from({length:6},(_,i)=>{
  const cells=[];
  for(let y=top+i*28;y+sandbagH<=gridBottom;y+=DESERT_TOWN_SANDBAG_ROW_GAP)
   for(const x of columns){
    const rect={x,y,w:sandbagW,h:sandbagH};
    if(!occupied.some(other=>decisiveRectsOverlap(rect,other,16)))cells.push(rect);
   }
  return cells;
 });
 const cells=gridOptions.reduce((best,row)=>row.length>best.length?row:best);
 const addSandbag=rect=>{
  occupied.push(rect);
  covers.push({...rect,y:rect.y/MAP_SCALE,kd:1,decisiveKind:'sandbags'});
 };
 if(cells.length)addSandbag(cells.shift());
 // Place the first of each prop before filling the rest of the grid.
 place(objects,{kind:'crate'},CRATE_W,CRATE_H,1);
 place(objects,{kind:'barrel'},BARREL_SIZE,BARREL_SIZE,1);
 place(bushes,{},85,55,1);
 for(const rect of cells){
  if(!occupied.some(other=>decisiveRectsOverlap(rect,other,16)))addSandbag(rect);
 }
 place(objects,{kind:'crate'},CRATE_W,CRATE_H,2);
 place(objects,{kind:'barrel'},BARREL_SIZE,BARREL_SIZE,2);
 place(bushes,{},85,55,7);
}
function placeDesertTownGunTowers(zones){
 for(const z of zones)for(const spot of z.desertTownTowers||[]){
  // The existing tower remains accessible from either end of the gap.
  if(!hitsM(spot.x,spot.y,GUN_TOWER_TYPE.coverRadius)&&cars.every(v=>D(v,spot)>96))cars.push(makeGunTower(spot));
 }
}
// Coordinates are normalized to the visible door panel on each facade.
const DESERT_TOWN_DOORS={
 'adobe-house':[133/300,172/200,32/300,25/200],
 'adobe-building':[173/384,162/192,36/384,27/192]
};
function setupDesertTownEvents(){
 const doorsByZone=new Map();
 for(const c of covers){
  const panel=DESERT_TOWN_DOORS[c.decisiveKind];
  if(!panel)continue;
  const zone=zoneAt(c.y+c.h/2);
  const [x,y,w,h]=panel,door={
   x:c.x+c.w*x,y:c.y+c.h*y,w:c.w*w,h:c.h*h,
   kind:c.decisiveKind,panel,building:c,zone,remaining:2.5+R()*2.5,elapsed:0,departed:0,broken:false
  };
  c.desertTownDoor=door;
  if(!doorsByZone.has(zone))doorsByZone.set(zone,[]);
  doorsByZone.get(zone).push(door);
 }
 desertTownEvents={doorsByZone,drop:{remaining:45+R()*15,plane:null,parachutes:[]}};
}
function damageDesertTownDoor(door,tile){
 if(!door.broken&&decisiveRectsOverlap(door,tile,8)){
  door.broken=true;door.elapsed=0;
 }
}
function desertTownDoorPatrol(door){
 const route=buildingPerimeterPatrol(door.building,door.zone,8,[DESERT_TOWN_PATROL_MARGIN,14,22,34],10);
 if(!route)return null;
 const x=door.x+door.w/2,y=route.path[2].y,q={x,y},wi=3;
 if(!patrolLineClear({x,y:door.building.y+door.building.h+11},q,8)||
    D(p,q)<(p.tank?40:20)||humans.some(h=>h.alive&&D(h,q)<24)||
    etanks.some(e=>e.alive&&D(e,q)<TANK_HIT+14)||cars.some(c=>c.kind!=='fighter'&&D(c,q)<34))return null;
 return {...route,x,y,wi};
}
function spawnDesertTownDoorSoldier(door){
 const route=desertTownDoorPatrol(door);
 if(!route)return;
 const {x,y,path,wi}=route;
 const human={...route,dir:1,stk:0,alive:true,st:0,sus:0,lost:0,
  cd:.7,face:Math.atan2(path[wi].y-y,path[wi].x-x),target:null,foundPause:0,
  patrolMode:'building',elite:false,walkStartX:x,walkStartY:y};
 if(R()<.5)Object.assign(human,enemyCommanderFields('blue'));
 humans.push(human);
 door.departed++;
}
function updateDesertTownEvents(dt){
 if(!desertTownEvents||state!=='play'||stageMode==='indoor'||decisiveBattle?.phase==='assault'&&!mission.enemyWavesStarted)return;
 const zone=zoneAt(p.y),{doorsByZone,drop}=desertTownEvents;
 if(zone.n==='砂漠街'){
  for(const door of doorsByZone.get(zone)||[]){
   if(door.broken)continue;
   door.remaining-=dt;
   if(door.elapsed>0){
    const before=door.elapsed;
    door.elapsed+=dt;
    if(before<.3&&door.elapsed>=.3)spawnDesertTownDoorSoldier(door);
    if(door.elapsed>=.9)door.elapsed=0;
   }else if(door.departed<2&&door.remaining<=.3){
    door.remaining=.3+2.5+R()*2.5;
    if(desertTownDoorPatrol(door))door.elapsed=Number.EPSILON;
   }
  }
 }
 updateDecisiveEnemyDrop(drop,zone.n==='砂漠街'?zone:null,dt);
}
function updateDecisiveEnemyDrop(drop,zone,dt,minDelay=45,delayRange=15){
 if(zone){
  drop.remaining-=dt;
  if(drop.remaining<=0&&!drop.plane&&!drop.parachutes.length){
   const full=drop===decisiveBattle?.desertDrop&&humans.filter(h=>h.alive).length>frontlineEnemyLimit();
   drop.remaining=!full&&startEnemyParachutePass(drop,zone)?minDelay+R()*delayRange:1;
  }
 }
 if(drop.plane||drop.parachutes.length){
  const before=humans.length;
  updateEnemyParachutePass(drop,dt);
  if(drop===decisiveBattle?.desertDrop)for(let i=before;i<humans.length;i++)humans[i].frontMarch=true;
 }
}
function drawDesertTownDoors(cx,cy){
 if(!desertTownEvents||!p||stageMode==='indoor')return;
 for(const door of desertTownEvents.doorsByZone.get(zoneAt(p.y))||[]){
  if(!door.elapsed||!drawPointInView(door.x,door.y,cx,cy,45))continue;
  const {x,y,w,h,elapsed}=door;
  const t=Math.min(1,elapsed/.3,(.9-elapsed)/.35);
  const leaf=w*Math.cos(t*t*(3-2*t)*Math.PI/2);
  // Keep the frame baked into the facade. The original wooden leaf swings inward.
  g.fillStyle='#59402e';g.fillRect(x,y,w,h);
  g.fillStyle='#453123';g.fillRect(x,y,w,h*.73);
  g.fillStyle='#74553a';g.fillRect(x,y+h*.9,w,h*.1);
  if(leaf<.5)continue;
  const im=COVER_IMG['decisive_'+door.kind];
  if(assetOK(im)){
   const [sx,sy,sw,sh]=door.panel,iw=im.naturalWidth,ih=im.naturalHeight;
   g.drawImage(im,sx*iw,sy*ih,sw*iw,sh*ih,x,y,leaf,h);
  }else{
   g.fillStyle='#7a593b';g.fillRect(x,y,leaf,h);
  }
  if(leaf<w-.5){
   g.fillStyle='#9a7552';g.fillRect(x+leaf-1,y,1,h);
  }
 }
}
function spawnDesertTownPatrols(zones){
 for(const zone of zones){
  const routes=covers.filter(c=>!c.fr&&DESERT_TOWN_BUILDINGS.some(([key])=>key===c.decisiveKind)&&zoneAt(c.y+c.h/2)===zone)
   .map(c=>buildingPerimeterPatrol(c,zone,8,[DESERT_TOWN_PATROL_MARGIN,14,22,34,48,64],10)).filter(Boolean);
  let added=0;
  // Spread guards across buildings first, and across different corners on shared routes.
  for(const offset of [0,.5,.25,.75])for(const corner of [0,2,1,3])for(const route of routes){
   if(added===4)break;
   const a=route.path[corner],wi=(corner+1)%route.path.length,b=route.path[wi];
   const x=a.x+(b.x-a.x)*offset,y=a.y+(b.y-a.y)*offset,q={x,y};
   if(D(p,q)<400||humans.some(h=>h.alive&&D(h,q)<32)||
      etanks.some(e=>e.alive&&D(e,q)<TANK_HIT+14)||cars.some(c=>D(c,q)<38))continue;
   humans.push({...route,x,y,wi,dir:1,stk:0,alive:true,st:0,sus:0,lost:0,
    target:null,cd:.7,burstLeft:0,face:Math.atan2(b.y-y,b.x-x),
    patrolMode:'building',elite:false,desertTownPatrol:true});
   added++;
  }
 }
}
function decisiveRectsOverlap(a,b,pad=0){return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;}
function setupDecisiveWorld(){
 loadDecisiveAssets();
 const border=ZONES[DECISIVE_DESERT_START].y0;
 const w=440,h=w*439/448,building={x:(WW-w)/2,y:border+86,w,h,kd:3,decisiveKind:'command-facility'};
 const gate={x:WW/2,y:building.y+h+22,name:DECISIVE_FACILITY_NAME};
 decisiveBattle={phase:'town',border,gate,building,reserve:[],bunkers:[],fortressDir:1,fortressCd:2,fortressTravel:0,fortressScan:0,
  roofGuns:DECISIVE_ROOF_TURRETS.map(([x,y])=>({x,y,gunAim:Math.PI/2})),roofCd:4,roofNext:0,roofShell:null,
  doorCd:5,doorNext:0,door:null,fortressGuns:DECISIVE_FORTRESS_MOUNTS.map(([x,y,neutral])=>({x,y,neutral,gunAim:neutral})),gunScan:0};
 // 施設と南側正面の進入路を砂漠街の生成物から空ける。
 const clearing={x:gate.x-350,y:border+24,w:700,h:740};
 covers=covers.filter(c=>c.y>=border&&!decisiveRectsOverlap(c,clearing));
 objects=objects.filter(o=>o.y>=border&&!decisiveRectsOverlap(o,clearing));
 bushes=bushes.filter(b=>b.y>=border&&!decisiveRectsOverlap(b,clearing));
 water=water.filter(w=>w.y>=border&&!decisiveRectsOverlap(w,clearing));
 bridges=bridges.filter(b=>b.y>=border&&!decisiveRectsOverlap(b,clearing));
 roadBands=roadBands.filter(r=>r.y>=border);
 mud=mud.filter(m=>!decisiveRectsOverlap(m,clearing));
 cars=cars.filter(v=>!decisiveRectsOverlap({x:v.x-32,y:v.y-32,w:64,h:64},clearing));
 const nearFacilityDefense=c=>decisiveRectsOverlap(c,building,DECISIVE_FACILITY_DEFENSE_CLEARANCE);
 covers=covers.filter(c=>c.decisiveKind!=='sandbags'||!nearFacilityDefense(c));
 covers.push(building);
 base={x:WW/2-300,y:140,w:600,h:400,hp:90,maxHp:90,deadAt:0,decisiveFortress:true,decisiveLocked:true};
 for(const zone of ZONES.slice(DECISIVE_DESERT_START)){
  // Alternate the side placements around a bunker in the middle of the area.
  const leftFirst=R()<.5;
  const columns=leftFirst?[82,WW/2-90,WW-262]:[WW-262,WW/2-90,82];
  for(const [i,x] of columns.entries()){
   const y=zone.y0-300-i*460;
   const bunker={kd:3,x,y,w:180,h:140,decisiveKind:'bunker',gunCd:1+i*.4};
   if(!nearFacilityDefense(bunker)){
    covers.push(bunker);decisiveBattle.bunkers.push(bunker);
   }
   // Stagger three bags across the width, leaving a vehicle-width gap between them.
   const step=DESERT_SANDBAG_W+DESERT_TOWN_GATE_GAP;
   for(let column=0;column<3;column++){
    const x=(i%2===0)===leftFirst?column*step:WW-DESERT_SANDBAG_W-column*step;
    const sandbags={kd:1,x,y:y+205+column*16,w:DESERT_SANDBAG_W,h:DESERT_SANDBAG_H,decisiveKind:'sandbags'};
    if(!nearFacilityDefense(sandbags))covers.push(sandbags);
   }
  }
  const t=TYPES[(zone.decisiveArea-DECISIVE_DESERT_START+2)%TYPES.length],spot={x:WW/2,y:(zone.y0+Math.max(40,zone.y1))/2};
  // The wide centre lane remains open for tanks, trucks and the shared infantry detour AI.
  cars=cars.filter(v=>!decisiveRectsOverlap({x:v.x-50,y:v.y-50,w:100,h:100},{x:spot.x-55,y:spot.y-55,w:110,h:110}));
  cars.push({...spot,t,kind:'tank',hp:t.hp,c:t.cmax,v:t.vmax,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2});
  for(const dx of [-70,70])items.push({x:spot.x+dx,y:spot.y+100,got:false});
 }
 rebuildSpatialGrid();
 for(const zone of ZONES.slice(DECISIVE_DESERT_START))placeDecisiveDesertSupplies(zone);
 if(radio&&zoneAt(radio.y).n==='砂漠')radio=null;
 // No desert patrol is updated before the phase change. Keep its classes as wave reserves.
 decisiveBattle.reserve=humans.filter(h=>h.y<border);
 humans=humans.filter(h=>h.y>=border);
 enemyDogs=enemyDogs.filter(d=>d.handler&&humans.includes(d.handler));
 etanks=etanks.filter(e=>e.y>1100&&!covers.some(c=>decisiveRectsOverlap(c,{x:e.x-32,y:e.y-32,w:64,h:64})));
 humans=humans.filter(h=>!covers.some(c=>decisiveRectsOverlap(c,{x:h.x-12,y:h.y-12,w:24,h:24})));
 mission={index:0,points:[gate]};
 scoreStats.objectiveTotal=2;scoreStats.objectiveProgress=0;
 rebuildSpatialGrid();captureBuildingGroundMarks();ensurePlayerVehicleSpawns();ensureEnemyTankSpawns();
 const townZones=ZONES.slice(1,DECISIVE_DESERT_START);
 plantDesertTownLakeBushes(townZones);
 placeDesertTownGunTowers(townZones);
 spawnDesertTownPatrols(townZones);
 setupDesertTownEvents();
 say('決戦：最高指揮通信施設に潜入せよ');
}
function setupDecisiveDesertRoadTrucks(){
 for(const zone of ZONES.slice(DECISIVE_DESERT_START)){
  if(R()>=.25)continue;
  const span={x:0,w:WW,h:96};
  const occupied=r=>decisiveRectsOverlap(r,base,16)||covers.some(c=>decisiveRectsOverlap(r,c,16))||
   objects.some(o=>decisiveRectsOverlap(r,objectHitRect(o),16))||
   cars.some(v=>v.y>r.y-50&&v.y<r.y+r.h+50);
  let road=roadBands.find(r=>r.y>=zone.y1&&r.y+r.h<=zone.y0&&
   !occupied(r));
  if(!road){
   for(let y=zone.y0-224;y>=Math.max(0,zone.y1)+96;y-=28){
    const candidate={...span,y,kind:'dirt',lanes:1};
    if(occupied(candidate)||roadBands.some(r=>decisiveRectsOverlap(candidate,r,16)))continue;
    road=candidate;roadBands.push(road);break;
   }
  }
  if(!road)continue;
  addRoadTruckEvent(road,R()<.5?1:-1);
  roadTruckEvents.at(-1).decisiveZone=zone;
 }
}
function updateDecisiveAircraftCollisions(dt){
 const d=decisiveBattle;
 if(d?.phase!=='assault'||state!=='play')return;
 const raid=mission.enemyAirRaid,drop=d.desertDrop;
 for(let i=d.crashingAircraft.length-1;i>=0;i--){
  const plane=d.crashingAircraft[i];
  if(advanceBomberFall(plane,dt,plane.enemy?1:-1)){
   recordBomberWreck(raid,plane);
   d.crashingAircraft.splice(i,1);
  }
 }
 const enemyPlanes=[raid.plane,drop.plane];
 for(const enemy of enemyPlanes){
  if(!enemy||enemy.falling)continue;
  let x=null,y=null;
  if(airstrike&&bomberPathsCollide(enemy,airstrike.x,airstrike.y,dt)){
   ({x,y}=airstrike);airstrike=null;
  }else if(reinforcementPass){
   const pass=reinforcementPass;
   const i=pass.offsets.findIndex(offset=>bomberPathsCollide(enemy,pass.x+offset,pass.y,dt));
   if(i>=0){
    x=pass.x+pass.offsets[i];y=pass.y;
    pass.offsets.splice(i,1);
    if(!pass.offsets.length)reinforcementPass=null;
   }
  }
  if(x===null)continue;
  const position=(enemy.y+y)/2;
  d.crashingAircraft.push({x,y:position,enemy:false,fallT:0});
  enemy.y=position;enemy.falling=true;enemy.collision=true;enemy.fallT=0;enemy.fallFxT=.22;
  if(enemy===drop.plane){
   drop.plane=null;
   d.crashingAircraft.push({...enemy,enemy:true});
  }
  if(enemy===raid.plane&&raid.fighter)raid.fighter.exitT=1.6;
  enemyBomberExplosionFx((x+enemy.x)/2,position,.75);
  say('爆撃機が衝突！');
 }
}
function bomberPathsCollide(enemy,x,y,dt){
 const gap=y-enemy.y;
 return Math.abs(enemy.x-x)<110&&gap>=-95&&gap-760*dt<=95;
}
function drawDecisiveCrashingAircraft(cx,cy){
 if(decisiveBattle?.phase!=='assault')return;
 for(const plane of decisiveBattle.crashingAircraft){
  if(drawPointInView(plane.x,plane.y,cx,cy,180))drawFallingBomber(plane,plane.enemy);
 }
}
function placeDecisiveDesertSupplies(zone){
 const inZone=y=>y>=Math.max(0,zone.y1)+60&&y<=zone.y0-60;
 const clear=(x,y,r)=>x>=r+14&&x<=WW-r-14&&inZone(y)&&!hitsM(x,y,r)&&!inBase(x,y)&&
  !cars.some(v=>D(v,{x,y})<r+50)&&!items.some(item=>D(item,{x,y})<r+28);
 const defenses=covers.filter(c=>zoneAt(c.y)===zone&&['bunker','sandbags'].includes(c.decisiveKind));
 for(const kind of ['bunker','sandbags']){
  for(const c of defenses.filter(c=>c.decisiveKind===kind)){
   const size=BARREL_SIZE;
   // Place beside the flank or behind, away from the passage through the sandbags.
   const spots=kind==='sandbags'?[[c.x+c.w/2,c.y-48]]:[[c.x-45,c.y+c.h/2],[c.x+c.w+45,c.y+c.h/2],[c.x+c.w/2,c.y-45]];
   const spot=spots.find(([x,y])=>clear(x,y,28));
   if(!spot)continue;
   const [x,y]=spot;
   objects.push({kind:'barrel',x:x-size/2,y:y-size/2,w:size,h:size});
   break;
  }
 }
 zone.decisiveRadios=[];
 const mid=(zone.y0+Math.max(0,zone.y1))/2;
 for(const white of [true,false]){
  let found=null;
  for(let dy=0;!found&&dy<zone.y0-zone.y1;dy+=48){
   const y=mid+(white?-1:1)*dy;
   for(const x of white?[220,740,350,610,480]:[740,220,610,350,480]){
    if(!clear(x,y,16)||zone.decisiveRadios.some(q=>D(q,{x,y})<80))continue;
    found={x,y,white,got:false};break;
   }
  }
  if(found)zone.decisiveRadios.push(found);
 }
}
function collectDecisiveDesertRadios(){
 if(decisiveBattle?.phase!=='assault')return;
 for(const pickup of zoneAt(p.y).decisiveRadios||[]){
  if(pickup.got||D(p,pickup)>=30||(pickup.white?reinforcementPass||decisiveBattle.pendingReinforcement:airstrike))continue;
  pickup.got=true;
  if(pickup.white)startReinforcementPass();
  else startAirstrike(pickup);
 }
}
function drawDecisiveDesertRadios(cx,cy){
 if(decisiveBattle?.phase!=='assault')return;
 for(let i=DECISIVE_DESERT_START;i<ZONES.length;i++){
  const zone=ZONES[i];
  if(zone.y0<cy-100||zone.y1>cy+H+100)continue;
  for(const q of zone.decisiveRadios)if(!q.got&&drawPointInView(q.x,q.y,cx,cy,100))drawRadioPickup(q.x,q.y,q.white,!q.white);
 }
}
function enterDecisiveFacility(){
 const d=decisiveBattle;
 if(stageMode!=='decisive'||d?.phase!=='town'||d.facilityTransition||p.tank||p.dig>0||p.digPrep>0||p.drill>0||D(p,d.gate)>DECISIVE_FACILITY_ENTRY_RADIUS)return false;
 return startDecisiveFacilityTransition(openDecisiveFacility);
}
function startDecisiveFacilityTransition(switchWorld){
 if(decisiveBattle.facilityTransition)return false;
 decisiveBattle.facilityTransition={remaining:INDOOR_STAIR_TRANSITION_SECONDS,switchWorld};
 return true;
}
function updateDecisiveFacilityTransition(dt){
 const d=decisiveBattle,transition=d?.facilityTransition;
 if(!transition)return false;
 transition.remaining=Math.max(0,transition.remaining-dt);
 if(transition.switchWorld&&transition.remaining<=INDOOR_STAIR_TRANSITION_SECONDS/2+1e-9){
  const switchWorld=transition.switchWorld;
  transition.switchWorld=null;
  switchWorld();
 }
 if(transition.remaining<=1e-9)d.facilityTransition=null;
 return true;
}
function openDecisiveFacility(){
 const d=decisiveBattle;
 if(partner)indoorPreparePartnerTravel(partner);
 // 砂漠街と後半エリアは生成済みの状態を保持し、潜入中の更新を止める。
 d.outdoors={ZONES,roadBands,covers,objects,bushes,mud,water,bridges,cars,enemyDogs,etanks,humans,
  bombs,items,allies,builtWalls,tankWrecks,buildingGroundMarks,radio,whiteRadio,base,baseSpawnT,
  patrolRoutesVisible,roadTruckEvents,waterRipples,burningNature:[...burningNatureSet],fallen:fallenEnemies.slice()};
 d.phase='facility';stageMode='indoor';
 const hp=p.hp;
 for(const key of ['computer-small','computer-large','computer-small-wreck','computer-large-wreck'])if(!COVER_IMG['decisive_'+key])COVER_IMG['decisive_'+key]=makeAssetImage('assets/decisive/'+key+'.webp?v='+GAME_VERSION);
 setupInfiltrationWorld(true);
 setupInfiltrationMission();
 p.hp=hp;scoreStats.lastY=p.y;
 whiteRadio=null;reinforcementPass=null;roadTruckEvents=[];waterRipples=[];
 sandIntensity=0;sandWeatherZone=null;
 resetDecisiveLocation();
 say('地下1階の大型コンピューターを設置爆弾で破壊せよ');
 return true;
}
function resetDecisiveLocation(){
 clearInfiltrationRenderCache();clearStaticRasterCache();clearFragmentRenderCache();clearSpinifexScatters();
 clearFallenEnemies();burningNatureSet.clear();
 if(partner){
  indoorPreparePartnerTravel(partner);
  Object.assign(partner,{x:p.x+24,y:p.y+32,face:p.body});
 }
 if(hound){
  hound.x=p.x;hound.y=p.y;
  resetHoundPosition();
 }
 touchTurretAngle=null;cam=Math.max(0,Math.min(WH-H,p.y-H*.6));camX=Math.max(0,Math.min(WW-W,p.x-W/2));
}
function damageDecisiveComputer(x,y){
 const target=mission?.computer,blast={x,y};
 if(state!=='play'||!target||target.done||target.floor!==indoorWorld.currentFloor+1)return;
 const rect=objectHitRect(target.object);
 const hit={x:Math.max(rect.x,Math.min(x,rect.x+rect.w)),y:Math.max(rect.y,Math.min(y,rect.y+rect.h))};
 if(D(blast,hit)>70||!los(blast,hit,target.object))return;
 target.hits++;
 scoreStats.decisiveTerminalHits=target.hits;
 scoreStats.objectiveProgress=.25*target.hits/DECISIVE_COMPUTER_HITS;
 if(target.hits<DECISIVE_COMPUTER_HITS){
  fb(hit.x,hit.y,20);burst(hit.x,hit.y,12,'#ffb347',140);
  say('大型コンピューター：設置爆弾あと'+(DECISIVE_COMPUTER_HITS-target.hits)+'回');
  return;
 }
 target.done=true;
 explodeObject(target.object);
 say('大型コンピューターを破壊！ 地上階のEXITへ');
}
function updateDecisiveFacilityExit(dt){
 const m=mission,w=indoorWorld,ground=w.floors[0].footprint;
 const atExit=m.computer.done&&w.currentFloor===0&&!p.tank&&!(p.dig>0)&&!(p.digPrep>0)&&!(p.blastAirT>0)&&p.y<ground.y-12&&D(p,w.exit)<INDOOR_EXIT_RADIUS;
 m.escapeExit=atExit?w.exit:null;
 m.escapeProgress=atExit?m.escapeProgress+dt:0;
 if(m.escapeProgress>=INDOOR_EXIT_SECONDS-1e-9)beginDecisiveAssault();
}
function beginDecisiveAssault(){
 const d=decisiveBattle;
 if(!isDecisiveFacility()||!mission?.computer?.done||mission.escapeProgress<INDOOR_EXIT_SECONDS-1e-9)return false;
 return startDecisiveFacilityTransition(openDecisiveAssault);
}
function openDecisiveAssault(){
 const d=decisiveBattle;
 const saved=d.outdoors;d.outdoors=null;d.phase='assault';
 if(indoorWorld.alarm?.active)scoreStats.indoorAlarm=true;
 ({ZONES,roadBands,covers,objects,bushes,mud,water,bridges,cars,enemyDogs,etanks,humans,
   bombs,items,allies,builtWalls,tankWrecks,buildingGroundMarks,radio,whiteRadio,base,baseSpawnT,
   patrolRoutesVisible,roadTruckEvents,waterRipples}=saved);
 base.decisiveLocked=false;
 indoorWorld=null;
 p.x=WW/2;p.y=d.border-86;p.body=p.ang=-Math.PI/2;
 d.assaultStartY=p.y;
 d.pendingReinforcement=true;
 d.pendingEnemyTanks=etanks;etanks=[];
 p.blastAirT=0;p.grappleT=0;p.grappleTarget=null;
 p.digPrep=0;p.digExitAnim=0;p.drill=0;p.drillTarget=null;
 scoreStats.lastY=p.y;
 scoreStats.objectiveProgress=.5;
 bullets=[];waves=[];parts=[];fx=[];decoy=null;
 weather='clear';weatherT=0;weatherNext=20+R()*30;
 rebuildSpatialGrid();resetDecisiveLocation();
 fallenEnemies.push(...saved.fallen);
 for(const cover of saved.burningNature)burningNatureSet.add(cover);
 // Switching here reuses all existing frontline target acquisition, movement, ally roles and stun rules.
 stageMode='front';frontlineBeginner=false;frontlineOni=false;
 humans=humans.filter(h=>h.alive&&!(h.stun>0));humans.push(...d.reserve.filter(h=>h.alive));d.reserve=[];
 mission={index:0,progress:0,points:[{x:base.x+base.w/2,y:base.y+base.h+220,captureRadius:540,name:'移動要塞',done:false}],waveT:6,reinforceT:18,advanceReleased:true,northEdge:0};
 for(const h of humans){h.dogHandler=false;h.dog=null;}
 setupFrontlineArmy();mission.advanceReleased=true;
 for(const ally of allies)if(ally.alive){ally.frontline=true;assignFrontlineAllyRole(ally);}
 missionAllies(d.gate.y);setupFrontlineVehicles();
 d.desertDrop={remaining:10+R()*10,plane:null,parachutes:[]};
 d.crashingAircraft=[];
 setupEnemyBomber(true);
 setupDecisiveDesertRoadTrucks();
 p.hp=3;sfx('capture');say('施設から脱出！ 増援部隊と砂漠の移動要塞へ進軍せよ');
 return true;
}
function updateDecisiveMission(dt){
 const d=decisiveBattle;if(!d||state!=='play')return;
 if(d.phase==='town'){
  p.y=Math.max(d.border+32,p.y);
  if(p.tank){p.tank.x=p.x;p.tank.y=p.y;}
  return;
 }
 if(d.phase==='facility'){updateInfiltrationMission(dt);return;}
 const advance=d.assaultStartY-p.y;
 if(d.pendingReinforcement&&advance>=DECISIVE_ALLIED_AIRDROP_DISTANCE){
  d.pendingReinforcement=false;
  startReinforcementPass(true);
 }
 if(!mission.enemyWavesStarted){
  if(advance<DECISIVE_ENEMY_RELEASE_DISTANCE){
   if(zoneAt(p.y).n==='砂漠'){
    const raid=mission.enemyAirRaid;
    raid.nextPassT=Math.max(5,raid.nextPassT-dt);
   }
   return;
  }
  etanks=d.pendingEnemyTanks;d.pendingEnemyTanks=null;
  mission.enemyWavesStarted=true;
  spawnFrontlineWave(6);
 }
 updateDecisiveFortress(dt);
 updateDecisiveTankDrop(d,dt);
 if(state!=='play')return;
 cleanupFrontlineArmy(dt);updateFrontlineWaves(dt);
 const zone=zoneAt(p.y);
 updateDecisiveEnemyDrop(d.desertDrop,zone.n==='砂漠'?zone:null,dt,10,10);
 updateEnemyBomber(dt);
 if(state!=='play')return;
 mission.reinforceT-=dt;
 if(mission.reinforceT<=0){mission.reinforceT=18;if(allies.filter(a=>a.alive&&a.frontline).length<4)missionAllies(Math.min(d.gate.y,p.y+120));}
 scoreStats.objectiveProgress=.5+.5*(1-base.hp/base.maxHp);
 // The frontline objective guides the squad to a safe firing position, never to another capture finish.
 const point=mission.points[0];point.x=base.x+base.w/2;point.y=base.y+base.h+220;
 updateDecisiveBunkers(dt);
}
function decisiveTankLanding(x,y){
 const r=TANK_HIT;
 return x>=r&&x<=WW-r&&y>=base.y+base.h+55&&y<=WH-r&&!hitsM(x,y,r)&&
  !cars.some(v=>Math.hypot(v.x-x,v.y-y)<r+32)&&
  !etanks.some(v=>v.alive&&Math.hypot(v.x-x,v.y-y)<r+32)&&
  !humans.some(h=>h.alive&&Math.hypot(h.x-x,h.y-y)<r+12)&&
  !allies.some(a=>a.alive&&!(a.chute>0)&&Math.hypot(a.x-x,a.y-y)<r+12)&&
  Math.hypot(p.x-x,p.y-y)>=r+12;
}
function updateDecisiveTankDrop(d,dt){
 if(state!=='play'||base.hp<=0)return;
 if(d.tankCargo){
  const cargo=d.tankCargo;
  cargo.chute=Math.max(0,cargo.chute-dt);
  if(cargo.chute>0)return;
  d.tankCargo=null;d.tankDropCheck=2;
  const v=cargo.vehicle;
  if(!decisiveTankLanding(v.x,v.y))return;
  cars.push(v);say('補充戦車が到着！');
  return;
 }
 if(reinforcementPass||p.tank?.kind==='tank'||p.y<base.y+base.h||p.y>base.y+base.h+650)return;
 d.tankDropCheck=(d.tankDropCheck||0)-dt;
 if(d.tankDropCheck>0)return;
 d.tankDropCheck=1;
 if(cars.some(v=>v.kind==='tank'&&v.t?.cmax>0&&v.f>0&&Math.hypot(v.x-p.x,v.y-p.y)<700))return;
 for(const dy of [140,220,300,80])for(const dx of [0,-100,100,-200,200]){
  const x=Math.max(42,Math.min(WW-42,p.x+dx)),y=p.y+dy;
  if(!decisiveTankLanding(x,y))continue;
  const t=TYPES[Math.floor(R()*TYPES.length)],view=frontlineView();
  const vehicle={x,y,t,kind:'tank',hp:t.hp,c:t.cmax,v:t.vmax,f:t.fmax,ch:0,mgHits:0,body:-Math.PI/2};
  reinforcementPass={x,y:view.y+view.h+180,endY:view.y-180,offsets:[0],cargoFlight:true,tankCargo:vehicle};
  sfx('radio');say('味方機が補充戦車を投下します');
  return;
 }
}
function updateDecisiveTankTransport(pass){
 if(pass.tankCargo&&pass.y<=pass.tankCargo.y){
  decisiveBattle.tankCargo={vehicle:pass.tankCargo,chute:2.6};
  pass.tankCargo=null;
 }
 if(pass.y<pass.endY&&!pass.tankCargo)reinforcementPass=null;
}
function drawDecisiveTankDrop(cx,cy){
 const cargo=decisiveBattle?.tankCargo;
 if(!cargo||!drawPointInView(cargo.vehicle.x,cargo.vehicle.y,cx,cy,230))return;
 const v=cargo.vehicle,lift=cargo.chute/2.6*130;
 drawAllyParachute({x:v.x,y:v.y-lift,alive:true,chute:cargo.chute},false,v);
}
function decisiveGunTarget(x,y,range){
 let target=null,best=range;
 for(const unit of [p,...allies]){
  if(unit!==p&&(!unit.alive||unit.chute>0||unit.stun>0)||unit===p&&(p.dig>0||debugMode>=2))continue;
  const distance=Math.hypot(unit.x-x,unit.y-y);
  if(distance<best&&los({x,y},unit)){best=distance;target=unit;}
 }
 return target;
}
function decisiveBunkerAngle(bunker,now){
 const aim=bunker.gunAim??Math.PI/2,from=bunker.gunFrom??aim;
 const blend=Math.min(1,(now-(bunker.gunAimAt??now))/(1000*DECISIVE_BUNKER_SCAN_SECONDS));
 const delta=aim-from;
 return from+Math.atan2(Math.sin(delta),Math.cos(delta))*blend;
}
function updateDecisiveBunkers(dt){
 const d=decisiveBattle;d.gunScan-=dt;if(d.gunScan>0)return;d.gunScan=DECISIVE_BUNKER_SCAN_SECONDS;
 const now=performance.now();
 for(const bunker of d.bunkers){
  if(Math.abs(bunker.y-p.y)>900||!covers.includes(bunker))continue;
  bunker.gunCd-=DECISIVE_BUNKER_SCAN_SECONDS;
  const x=bunker.x+bunker.w/2,y=bunker.y+bunker.h+8,target=decisiveGunTarget(x,y,560);
  if(!target&&!bunker.burstLeft)continue;
  const aim=target?Math.atan2(target.y-y,target.x-x):bunker.gunAim;
  if(aim!==bunker.gunAim){
   bunker.gunFrom=decisiveBunkerAngle(bunker,now);bunker.gunAim=aim;bunker.gunAimAt=now;
  }
  if(bunker.gunCd>0)continue;
  bunker.gunFrom=aim;bunker.gunShotAt=now;
  bunker.burstLeft=(bunker.burstLeft||5)-1;
  fire(x,y,aim,'e','v',480,620,.3);bunker.gunCd=bunker.burstLeft?DECISIVE_BUNKER_SCAN_SECONDS:1.1;
 }
}
function decisiveFortressSpriteKey(){
 return assetOK(COVER_IMG['decisive_fortress-hull'])?'decisive_fortress-hull':'decisive_fortress';
}
function scanDecisiveFortressGuns(b,d,target,now,canFire){
 let selected=null,best=Infinity;
 for(const gun of d.fortressGuns){
  const x=b.x+b.w*gun.x,y=b.y+b.h*gun.y;
  const angle=target?Math.atan2(target.y-y,target.x-x):gun.neutral;
  const offset=Math.atan2(Math.sin(angle-gun.neutral),Math.cos(angle-gun.neutral));
  const inArc=Math.abs(offset)<=Math.PI/2;
  const aim=gun.neutral+Math.max(-Math.PI/2,Math.min(Math.PI/2,offset));
  if(aim!==gun.gunAim){
   gun.gunFrom=decisiveBunkerAngle(gun,now);gun.gunAim=aim;gun.gunAimAt=now;
  }
  if(!canFire||!target||!inArc)continue;
  // Start beyond the moving hull collider to keep its guns from hitting the fortress.
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const exitX=Math.abs(dx)<1e-6?Infinity:(dx>0?b.x+b.w-x:b.x-x)/dx;
  const exitY=Math.abs(dy)<1e-6?Infinity:(dy>0?b.y+b.h-y:b.y-y)/dy;
  const clearance=Math.min(exitX,exitY)+5,length=Math.hypot(target.x-x,target.y-y);
  if(length<clearance||length>=best)continue;
  const muzzle={x:x+dx*clearance,y:y+dy*clearance};
  if(!los(muzzle,target))continue;
  best=length;selected={gun,angle,...muzzle};
 }
 return selected;
}
function updateDecisiveFortress(dt){
 const d=decisiveBattle;
 if(!base||base.decisiveLocked||d?.phase!=='assault')return;
 if(base.hp<=0){d.roofShell=null;d.door=null;return;}
 const minX=WW/2-base.w/2-75,maxX=WW/2-base.w/2+75;
 const nx=base.x+d.fortressDir*18*dt;
 if(nx<minX||nx>maxX)d.fortressDir*=-1;
 else{
  const box={x:nx-42,y:base.y-42,w:base.w+84,h:base.h+84};
  // Do not sweep the moving collider through soldiers, player vehicles or abandoned vehicles.
  const blocked=[p,...humans,...etanks,...allies,...cars].some(u=>u.alive!==false&&u.x>box.x&&u.x<box.x+box.w&&u.y>box.y&&u.y<box.y+box.h);
  if(!blocked){d.fortressTravel+=nx-base.x;base.x=nx;}
 }
 updateDecisiveRoofShell(d,dt);
 if(state!=='play')return;
 updateDecisiveFortressDoor(base,d,dt);
 d.roofCd-=dt;d.fortressCd-=dt;d.fortressScan-=dt;
 if(d.fortressCd>0&&d.fortressScan>0)return;
 d.fortressScan=DECISIVE_BUNKER_SCAN_SECONDS;
 const x=base.x+base.w/2,y=base.y+base.h+18,now=performance.now();
 updateDecisiveRoofGuns(base,d,now);
 const target=decisiveGunTarget(x,y,900),shot=scanDecisiveFortressGuns(base,d,target,now,d.fortressCd<=0);
 if(d.fortressCd>0)return;
 if(!shot){d.fortressCd=.25;d.fortressBurst=0;return;}
 shot.gun.gunFrom=shot.gun.gunAim;shot.gun.gunShotAt=now;
 if(shot.gun.y>.85){
  fire(shot.x,shot.y,shot.angle,'e','v',480,620,.3);
  d.fortressBurst=(d.fortressBurst||0)+1;
  d.fortressCd=d.fortressBurst<4?.16:3;
  if(d.fortressBurst>=4)d.fortressBurst=0;
 }else{
  d.fortressBurst=0;
  fire(shot.x,shot.y,shot.angle,'e','c',420,1000,1.4,'enemyCannon');d.fortressCd=3;
 }
}
function updateDecisiveRoofGuns(b,d,now){
 const firingIndex=d.roofCd<=0&&!d.roofShell?d.roofNext:-1;
 const dx=p.x-(b.x+b.w/2),dy=p.y-(b.y+b.h);
 const target=dy>40&&Math.hypot(dx,dy)<850&&!(p.dig>0)&&debugMode<2?p:null;
 for(let i=0;i<d.roofGuns.length;i++){
  const gun=d.roofGuns[i],x=b.x+b.w*gun.x,y=b.y+b.h*gun.y;
  const aim=target?Math.atan2(target.y-y,target.x-x):Math.PI/2;
  if(aim!==gun.gunAim){
   gun.gunFrom=decisiveBunkerAngle(gun,now);gun.gunAim=aim;gun.gunAimAt=now;
  }
  if(!target||i!==firingIndex)continue;
  d.roofShell={x,y,targetX:target.x,targetY:target.y,elapsed:0};
  d.roofCd=6;d.roofNext=1-i;
  sfx('enemyCannon',{x,y});
 }
}
function updateDecisiveRoofShell(d,dt){
 const shell=d.roofShell;
 if(!shell)return;
 shell.elapsed+=dt;
 if(shell.elapsed<DECISIVE_ARC_TIME)return;
 d.roofShell=null;
 const {targetX:x,targetY:y}=shell,r=DECISIVE_ARC_RADIUS;
 sfx('shellExplosion',{x,y});fb(x,y,r);burst(x,y,48,'#ff9b47',300);
 for(const a of allies)if(a.alive&&!(a.chute>0)&&Math.hypot(a.x-x,a.y-y)<r)beginBlastFlight(a,x,y,r,65,8,3);
 if(p.dig>0||debugInvincible||p.tank?.kind==='fighter'||Math.hypot(p.x-x,p.y-y)>=r)return;
 if(p.tank){
  const v=p.tank;
  if(v.kind==='truck'){recordPlayerDamage(.2,true);v.mgHits=(v.mgHits||0)+1;if(v.mgHits>=5)wreck();}
  else{const armor=v.t.armor||3;recordPlayerDamage(.55/armor,true);v.ch=(v.ch||0)+.55;if(v.ch>=armor-1e-9)wreck();}
 }else{
  recordPlayerDamage(Math.min(p.hp,.5)/3);p.hp-=.5;
  beginBlastFlight(p,x,y,r,60,8,0);
  if(p.hp<=0)triggerPlayerDeath();
 }
}
function decisiveFortressDoorExit(b,index){
 const point={x:b.x+b.w*DECISIVE_FORTRESS_DOORS[index],y:b.y+b.h+12};
 if(hitsM(point.x,point.y,8)||D(p,point)<32||
  humans.filter(h=>h.alive).length>=frontlineEnemyLimit()||
  humans.some(h=>h.alive&&D(h,point)<24)||allies.some(a=>a.alive&&D(a,point)<24)||
  etanks.some(t=>t.alive&&D(t,point)<40)||cars.some(v=>v.kind!=='fighter'&&D(v,point)<40))return null;
 return point;
}
function updateDecisiveFortressDoor(b,d,dt){
 if(d.door){
  const door=d.door,before=door.elapsed;
  door.elapsed+=dt;
  if(before<DECISIVE_DOOR_RELEASE&&door.elapsed>=DECISIVE_DOOR_RELEASE){
   const exit=decisiveFortressDoorExit(b,door.index);
   if(exit)humans.push({...exit,...enemyCommanderFields('blue'),alive:true,elite:false,st:0,sus:0,lost:0,
    cd:1,face:Math.PI/2,burstLeft:0,frontMarch:true,frontLaneX:exit.x,path:[],wi:0,dir:1,stk:0});
  }
  if(door.elapsed>=DECISIVE_DOOR_TIME)d.door=null;
  return;
 }
 if(p.y<b.y+b.h||p.y>b.y+b.h+700)return;
 d.doorCd-=dt;
 if(d.doorCd>0)return;
 const index=d.doorNext;
 d.doorNext=(index+1)%DECISIVE_FORTRESS_DOORS.length;
 if(!decisiveFortressDoorExit(b,index)){d.doorCd=1;return;}
 d.door={index,elapsed:0};d.doorCd=9;
 sfx('door',{x:b.x+b.w*DECISIVE_FORTRESS_DOORS[index],y:b.y+b.h});
}
function drawDecisiveRoofShell(cx,cy){
 const shell=decisiveBattle?.roofShell;
 if(!shell||base?.hp<=0)return;
 const {x,y,targetX,targetY}=shell,t=Math.min(1,shell.elapsed/DECISIVE_ARC_TIME);
 const px=x+(targetX-x)*t,py=y+(targetY-y)*t-4*DECISIVE_ARC_HEIGHT*t*(1-t);
 if(drawPointInView(targetX,targetY,cx,cy,DECISIVE_ARC_RADIUS)){
  g.strokeStyle='rgba(255,168,77,.8)';g.lineWidth=2;g.beginPath();
  g.arc(targetX,targetY,DECISIVE_ARC_RADIUS,0,Math.PI*2);g.stroke();
 }
 if(drawPointInView(px,py,cx,cy,15)){
  g.fillStyle='#ffe1a0';g.beginPath();g.ellipse(px,py,5,8,Math.atan2(targetY-y,targetX-x)-Math.PI/2,0,Math.PI*2);g.fill();
 }
}
let decisiveRoofSpriteSource=null,decisiveRoofSprites=[];
function drawDecisiveRoofGuns(b,d,image,now){
 if(decisiveRoofSpriteSource!==image){
  decisiveRoofSprites=d.roofGuns.map(gun=>{
   const canvas=document.createElement('canvas'),size=176;
   canvas.width=canvas.height=size;const ctx=gameCanvasContext(canvas),r=size/2;
   const sx=image.naturalWidth*gun.x,sy=image.naturalHeight*gun.y,sr=image.naturalWidth*.092;
   ctx.beginPath();ctx.arc(r,r,r,0,Math.PI*2);ctx.clip();
   ctx.drawImage(image,sx-sr,sy-sr,2*sr,2*sr,0,0,size,size);
   return canvas;
  });
  decisiveRoofSpriteSource=image;
 }
 const size=b.w*.184;
 for(let i=0;i<d.roofGuns.length;i++){
  const gun=d.roofGuns[i],x=b.x+b.w*gun.x,y=b.y+b.h*gun.y;
  if(b.fragMask&&!baseFragmentAliveAt(x,y))continue;
  g.save();g.translate(x,y);
  g.rotate(decisiveBunkerAngle(gun,now)-Math.PI/2);
  drawStaticRaster(decisiveRoofSprites[i],-size/2,-size/2,size,size);g.restore();
 }
}
function drawDecisiveFortressDoor(b,d,image){
 if(!d.door)return;
 const {index,elapsed}=d.door,open=Math.min(1,elapsed/.28,(DECISIVE_DOOR_TIME-elapsed)/.35);
 const u=DECISIVE_FORTRESS_DOORS[index],v=.825,w=.043,h=.071;
 const left=b.x+b.w*(u-w/2),top=b.y+b.h*v,width=b.w*w,height=b.h*h;
 g.fillStyle='#232629';g.fillRect(left,top,width,height);
 const fraction=1-open;
 if(fraction>0)g.drawImage(image,image.naturalWidth*(u-w/2),image.naturalHeight*v,
  image.naturalWidth*w,image.naturalHeight*h*fraction,left,top,width,height*fraction);
}
function drawDecisiveFortressDrive(b){
 const gear=COVER_IMG['decisive_fortress-gear'];
 if(decisiveFortressSpriteKey()!=='decisive_fortress-hull'||!assetOK(gear))return;
 const travel=decisiveBattle?.fortressTravel||0,scale=b.w/600;
 for(const side of [-1,1]){
  const x=b.x+b.w*(.5+side*.448);
  g.save();
  for(let i=0;i<DECISIVE_FORTRESS_GEARS.length;i++){
   const [height,width]=DECISIVE_FORTRESS_GEARS[i],size=width*scale,y=b.y+b.h*height;
   const angle=travel*2/size*(i%2?-1:1);
   g.save();g.translate(x,y);g.rotate(angle);g.drawImage(gear,-size/2,-size/2,size,size);g.restore();
  }
  g.lineCap='round';
  g.beginPath();g.moveTo(x-side*10*scale,b.y+b.h*DECISIVE_FORTRESS_GEARS[0][0]);
  g.lineTo(x-side*10*scale,b.y+b.h*DECISIVE_FORTRESS_GEARS.at(-1)[0]);
  g.strokeStyle='#45494a';g.lineWidth=5*scale;g.stroke();
  g.strokeStyle='#aaa190';g.lineWidth=2*scale;g.stroke();
  for(let i=0;i<DECISIVE_FORTRESS_GEARS.length-1;i++){
   const [height,width]=DECISIVE_FORTRESS_GEARS[i],size=width*scale,y=b.y+b.h*height;
   const angle=travel*2/size*(i%2?-1:1),pin=size*.24;
   const fromX=x+Math.cos(angle)*pin,fromY=y+Math.sin(angle)*pin;
   const toX=x-side*(i%2?14:5)*scale,toY=b.y+b.h*DECISIVE_FORTRESS_GEARS[i+1][0];
   g.beginPath();g.moveTo(fromX,fromY);g.lineTo(toX,toY);
   g.lineWidth=4*scale;g.strokeStyle='#332f2a';g.stroke();
   g.lineWidth=2*scale;g.strokeStyle='#b8b3a6';g.stroke();
   if(i%2===0){
    g.beginPath();g.moveTo(toX,toY);g.lineTo((fromX+toX)/2,(fromY+toY)/2);
    g.strokeStyle='#373535';g.lineWidth=8*scale;g.stroke();
    g.strokeStyle='#81715c';g.lineWidth=5*scale;g.stroke();
   }
  }
  g.restore();
 }
}
function drawDecisiveFortressTurrets(b){
 const barrel=COVER_IMG['decisive_bunker-barrel'],guns=decisiveBattle?.fortressGuns;
 if(!guns||decisiveFortressSpriteKey()!=='decisive_fortress-hull')return;
 const now=performance.now(),scale=b.w/600,image=COVER_IMG['decisive_fortress-hull'];
 if(decisiveBattle.phase==='assault'){
  drawDecisiveRoofGuns(b,decisiveBattle,image,now);
  drawDecisiveFortressDoor(b,decisiveBattle,image);
 }
 if(!assetOK(barrel))return;
 for(const gun of guns){
  const recoil=4*Math.max(0,1-(now-(gun.gunShotAt??-Infinity))/130);
  g.save();g.translate(b.x+b.w*gun.x,b.y+b.h*gun.y);g.rotate(decisiveBunkerAngle(gun,now));
  g.drawImage(barrel,(-6-recoil)*scale,-6*scale,33*scale,12*scale);g.restore();
 }
}
let decisiveSmokeSprite=null;
function drawDecisiveFacilitySmoke(cx,cy){
 const d=decisiveBattle;
 if(d?.phase!=='assault')return;
 const {x,y,w,h}=d.building,originX=x+w*.48,originY=y+h*.26;
 if(!drawBoundsInView(originX-135,originY-400,310,450,cx,cy,0))return;
 if(!decisiveSmokeSprite){
  const sprite=document.createElement('canvas');sprite.width=sprite.height=96;
  const ctx=gameCanvasContext(sprite);
  for(const [px,py,r] of [[38,45,31],[58,44,29],[49,59,31],[50,35,24]]){
   const fade=ctx.createRadialGradient(px,py,0,px,py,r);
   fade.addColorStop(0,'rgba(12,11,10,.85)');
   fade.addColorStop(.42,'rgba(20,19,18,.67)');
   fade.addColorStop(1,'rgba(34,33,31,0)');
   ctx.fillStyle=fade;ctx.fillRect(px-r,py-r,r*2,r*2);
  }
  decisiveSmokeSprite=sprite;
 }
 const time=performance.now()/4400;
 g.save();g.imageSmoothingEnabled=true;
 for(let i=0;i<9;i++){
  const age=(time+i/9)%1,size=55+age*153;
  const px=originX+age*65+Math.sin(age*12+i)*age*24,py=originY-age*300;
  g.globalAlpha=.88*Math.min(1,age*20)*(1-age*age);
  g.drawImage(decisiveSmokeSprite,px-size/2,py-size/2,size,size);
 }
 g.restore();
}
function drawDecisiveCover(c){
 const im=COVER_IMG['decisive_'+c.decisiveKind];
 if(assetOK(im))g.drawImage(im,c.x,c.y,c.w,c.h);
 else{g.fillStyle=c.decisiveKind==='bunker'?'#81795e':'#b69c68';g.fillRect(c.x,c.y,c.w,c.h);}
 // Fragment renders only carry the body art. A broken bunker has no working gun.
 const barrel=COVER_IMG['decisive_bunker-barrel'];
 if(c.decisiveKind==='bunker'&&c.gunCd!==undefined&&assetOK(barrel)){
  const now=performance.now(),recoil=4*Math.max(0,1-(now-(c.gunShotAt??-Infinity))/130);
  g.save();g.translate(c.x+c.w/2,c.y+c.h-6);g.rotate(decisiveBunkerAngle(c,now));
  g.drawImage(barrel,-6-recoil,-5,36,10);g.restore();
 }
 return true;
}
function drawDecisiveMission(){
 document.body.classList.toggle('front-battle',decisiveBattle?.phase==='assault');
 if(isDecisiveFacility()){drawInfiltrationMission();return;}
 document.getElementById('missionHud').style.display='none';
 if(state!=='play'||!decisiveBattle)return;
 const d=decisiveBattle,town=d.phase==='town',q=town?d.gate:mission.points[0];
 gm.save();gm.setTransform(1,0,0,1,0,0);
 drawFrontlineArrow(q);
 gm.font='bold 16px system-ui';gm.fillStyle='#fff1c0';gm.textAlign='center';gm.strokeStyle='#302a20';gm.lineWidth=4;
 const text=town?(D(p,q)<=DECISIVE_FACILITY_ENTRY_RADIUS?'入口でA：施設へ潜入':'決戦：最高指揮通信施設へ'):'決戦：移動要塞を破壊せよ';
 gm.strokeText(text,W/2,32);gm.fillText(text,W/2,32);gm.restore();
}
function drawDecisiveFacilityHud(el){
 const w=indoorWorld,q=mission.computer,floor=w.currentFloor;
 const basement=['1F','B1F'][floor];
 const task=q.done?'地上のEXITで5秒待機':'設置爆弾あと'+(DECISIVE_COMPUTER_HITS-q.hits)+'回';
 const alarm=w.alarm?.active?'館内アラート発令中 ／ ':'';
 const hud='<b>'+DECISIVE_FACILITY_NAME+' '+basement+'</b><small>'+alarm+task+'</small>';
 if(hud!==indoorHudSnapshot){indoorHudSnapshot=hud;el.innerHTML=hud;}
 const targetFloor=q.done?0:q.floor-1;
 gm.save();gm.setTransform(1,0,0,1,0,0);
 drawInfiltrationAlarmOverlay();
 if(indoorStairProtected())drawIndoorStairSafeArea(w.stairSanctuary);
 if(floor===targetFloor)drawFrontlineArrow(q.done?w.exit:q);
 else{
  gm.font='bold 21px system-ui';gm.textAlign='right';
  gm.fillStyle=q.done?'#a9f3c0':'#ffe1a0';
  gm.fillText(q.done?'→EXIT':'→B1F',W-12,83);
 }
 const {x,y,w:width,h:height}=q.object;
 const cx=Math.round(camX/2)*2,cy=Math.round(cam/2)*2;
 if(!q.done&&floor===targetFloor&&drawBoundsInView(x,y,width,height,cx,cy,48)){
  drawObjectiveHealthBar(gm,x+10-cx,y-16-cy,width-20,1-q.hits/DECISIVE_COMPUTER_HITS);
 }
 gm.restore();drawIndoorStairTransition();
}
