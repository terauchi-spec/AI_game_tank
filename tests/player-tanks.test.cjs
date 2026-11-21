const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),canyon=fs.readFileSync(path.join(__dirname,'../js/canyon.js'),'utf8');
const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
function harness(){const c={Math,WW:960,WH:15000,p:{x:480,y:14000},cars:[]};vm.createContext(c);vm.runInContext(section(html,'const PLAYER_TANK_FUEL_SCALE=','const ARMORED_TYPE='),c);c.types=vm.runInContext('TYPES',c);vm.runInContext(section(html,'function spawnAreaDebugPlayerTanks(','function setupAreaDebugStage('),c);return c;}
test('seven unique tanks keep all original specifications and give new tanks distinct roles',()=>{
 const c=harness(),t=c.types;assert.deepEqual(Array.from(t,v=>v.id),['t34','tiger','type10','m1','sherman','churchill','kingtiger']);
 assert.deepEqual(Array.from(t.slice(0,4),v=>[v.hp,v.armor,v.sp,v.cdmg,v.ccd]),[[8,1.35,99,2.7,2.42],[16,2,72,5.4,3.08],[12,1.55,126,3.6,1.65],[15,1.8,113,4.5,1.87]]);
 for(const v of t)for(const k of ['hp','armor','cmax','vmax','fmax','sp','cdmg','ccd','cspd','crng','vcd'])assert.ok(Number.isFinite(v[k])&&v[k]>0,v.id+' '+k);
 const [s,ch,k]=t.slice(4);assert.ok(s.sp>ch.sp&&s.ccd<ch.ccd);assert.ok(ch.armor>t[1].armor&&ch.sp<t[1].sp);assert.ok(k.cdmg>t[1].cdmg&&k.armor>t[1].armor&&k.ccd>t[1].ccd);
});
test('normal random vehicle selection can produce every new tank without increasing vehicle count',()=>{
 const c=harness();Object.assign(c,{TRUCK_TYPE:{},ARMORED_TYPE:{},freeSpot:(x,y)=>({x,y})});vm.runInContext(section(html,'function spawnRandomVehicles(','function ensurePlayerVehicleSpawns('),c);
 for(let i=0;i<7;i++){let n=0;c.R=()=>++n===6?(i+.5)/7:0;c.spawnRandomVehicles();assert.equal(c.cars.length,2);assert.ok(c.cars.some(v=>v.kind==='tank'&&v.t.id===c.types[i].id));}
});
test('debug lineup starts each tank fully supplied, unlimited, separated and within map bounds',()=>{
 const c=harness();c.spawnAreaDebugPlayerTanks();assert.equal(c.cars.length,7);
 for(const v of c.cars){assert.equal(v.kind,'tank');assert.equal(v.c,v.t.cmax);assert.equal(v.v,v.t.vmax);assert.equal(v.f,v.t.fmax);assert.equal(v.hp,v.t.hp);assert.equal(v.ch,0);assert.equal(v.debugInfinite,1);assert.ok(v.x>60&&v.x<900&&v.y<c.p.y-60);assert.ok(c.cars.every(w=>v===w||Math.hypot(v.x-w.x,v.y-w.y)>=120));}
});
test('each area setup clears the complete lineup including generated terrain and uses normal tank definitions',()=>{
 for(const area of ['草原','森林','村','丘陵','街','湿地','荒野','敵迷路基地','敵前線基地','敵司令本部']){
  const c=harness();Object.assign(c,{selectedAreaDebug:area,ZONE_STYLE:{[area]:{g:'#000',p:[]}},COMMAND_BASE_W:390,COMMAND_BASE_H:336,MAP_SCALE:1,scoreStats:{},R:()=>.5,hitsM:()=>false,clearCanyonTiles(){},clearMazeWallChunks(){},clearFragmentRenderCache(){},rebuildSpatialGrid(){},genCovers(){c.covers=[{x:230,y:c.p.y-250,w:500,h:300},{x:20,y:12000,w:50,h:50}];},genObjects(){c.objects=[{x:300,y:c.p.y-180,w:50,h:50}];},coverSpriteRect:v=>v,circleHitsRect:(x,y,r,o)=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h,buildCanyonZones(){c.covers.push({x:230,y:c.p.y-250,w:500,h:300})},setupGrassVegetation(){},captureBuildingGroundMarks(){},spawnAreaDebugEnemies(){},say(){}});
  vm.runInContext(section(canyon,'function setupSelectedAreaDebugStage(','function syncAreaDebugPicker('),c);c.setupSelectedAreaDebugStage();assert.equal(c.cars.length,7,area);
  for(const v of c.cars)for(const o of [...c.covers,...c.objects,...c.bushes,...c.mud])assert.equal(c.circleHitsRect(v.x,v.y,45,o),false,area+' '+v.t.id);assert.equal(c.covers.some(v=>v.y===12000),true);
 }
});
test('all tank body and turret layers render independently with balanced canvas state and distinct new silhouettes',()=>{
 const c=harness(),commands=[];let depth=0;const g=new Proxy({globalAlpha:1,save(){depth++},restore(){depth--}},{get:(o,k)=>k in o?o[k]:(...args)=>commands.push([k,...args])});c.g=g;c.shade=()=> '#888';
 vm.runInContext(section(html,'function wreckHullPath(','function tankWreckPose('),c);vm.runInContext(section(html,'function tankShape(','function truckShape('),c);
 const silhouettes=[];for(const t of c.types)for(const layer of ['both','hull','turret']){commands.length=0;c.tankShape(0,0,-Math.PI/2,0,t,30,layer);assert.equal(depth,0);assert.ok(commands.length>0);for(const cmd of commands)for(const arg of cmd.slice(1))if(typeof arg==='number')assert.ok(Number.isFinite(arg));if(layer==='both')silhouettes.push(JSON.stringify(commands));}
 assert.equal(new Set(silhouettes).size,7);
});

function artHarness(){
 const c=harness(),commands=[],rasters=[],canvases=[];let depth=0;
 const context=()=>new Proxy({globalAlpha:1,save(){depth++},restore(){depth--},createLinearGradient(){return{addColorStop(){}}}},{get:(o,k)=>k in o?o[k]:(...args)=>commands.push([k,...args])});
 c.Image=class{constructor(){this.complete=false;this.naturalWidth=0;}};
 c.g=context();c.shade=()=> '#888';c.document={createElement(){const canvas={number:canvases.length};canvases.push(canvas);return canvas;}};c.gameCanvasContext=context;c.drawStaticRaster=(...args)=>rasters.push(args);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/player-tank-art.js'),'utf8'),c);
 vm.runInContext(section(html,'function wreckHullPath(','function tankWreckPose('),c);vm.runInContext(section(html,'function tankShape(','function truckShape('),c);
 return{c,commands,rasters,canvases,depth:()=>depth};
}
test('deformed artwork caches exactly two layers per type and does no repeated vector work or allocations',()=>{
 const h=artHarness();for(const t of h.c.types)h.c.tankShape(12,34,.2,.8,t,30,'both');assert.equal(h.canvases.length,15);assert.equal(h.rasters.length,28);assert.equal(h.depth(),0);
 const originals=h.rasters.map(args=>args[0]);h.rasters.length=0;h.commands.length=0;
 for(let n=0;n<10;n++)for(const t of h.c.types)h.c.tankShape(12,34,n*.1,n*.2,t,30,'both');
 assert.equal(h.canvases.length,15);assert.equal(h.rasters.length,280);assert.ok(h.commands.every(cmd=>['translate','rotate','beginPath','ellipse','fill'].includes(cmd[0])));assert.equal(h.depth(),0);
 for(let i=0;i<280;i++)assert.equal(h.rasters[i][0],originals[i%28]);assert.ok(h.canvases.every(v=>v.width<=80&&v.height<=120));assert.ok(h.canvases.reduce((sum,v)=>sum+v.width*v.height,0)<110000);
});
test('split foliage layers keep independent turret headings, caller opacity and all seven cached designs',()=>{
 const h=artHarness();for(const t of h.c.types){h.c.g.globalAlpha=.4;h.rasters.length=0;h.commands.length=0;h.c.tankShape(0,0,.3,1.2,t,30,'hull');assert.equal(h.rasters.length,3);assert.equal(h.c.g.globalAlpha,.4);assert.ok(h.commands.some(cmd=>cmd[0]==='rotate'&&cmd[1]===.3+Math.PI/2));h.commands.length=0;h.c.tankShape(0,0,.3,1.2,t,30,'turret');assert.equal(h.rasters.length,4);assert.ok(h.commands.some(cmd=>cmd[0]==='rotate'&&cmd[1]===1.2+Math.PI/2));assert.equal(h.depth(),0);}
});
test('deformed artwork is limited to player tanks and preserves the legacy enemy renderer',()=>{
 const h=artHarness();h.c.shade=()=> '#888';h.c.tankShape(0,0,0,0,{id:'enemy',col:'#333333'},30);assert.equal(h.canvases.length,0);assert.equal(h.rasters.length,0);assert.ok(h.commands.some(cmd=>cmd[0]==='fillRect'));assert.equal(h.depth(),0);
});
test('destroyed player hulls and turrets use the original compact silhouettes',()=>{
 const h=artHarness();for(const t of h.c.types){h.commands.length=0;h.c.wreckHullPath(h.c.g,t.id,30);h.c.wreckTurretPath(h.c.g,t.id,30);assert.ok(h.commands.some(cmd=>['rect','ellipse','moveTo'].includes(cmd[0])));assert.equal(h.depth(),0);}
});

test('all seven driven tanks animate outer tracks from real travel and share one small cached strip',()=>{
 const h=artHarness();h.c.TANK_DRAW=30;h.c.state='play';vm.runInContext(html.split('\n').find(l=>l.startsWith('function drawVehicle(v,')),h.c);
 for(const t of h.c.types){const v={kind:'tank',t,f:100};h.c.drawVehicle(v,0,0,0,.5);assert.equal(v.trackPhase,undefined);h.rasters.length=0;h.c.drawVehicle(v,6,0,0,.5);assert.equal(v.trackPhase,3);assert.equal(h.rasters.length,4);const strips=h.rasters.filter(a=>a.length===9);assert.equal(strips.length,2);assert.equal(strips[0][2],3);assert.equal(strips[0][0],strips[1][0]);}
 assert.equal(h.canvases.length,15);const strip=h.canvases.find(c=>c.width===8&&c.height===96);assert.ok(strip);
 const v={kind:'tank',t:h.c.types[0],f:100};h.c.drawVehicle(v,0,0,0,0);h.commands.length=0;
 for(let i=1;i<=50;i++)h.c.drawVehicle(v,i*2,0,0,1);assert.equal(h.canvases.length,15);assert.ok(!h.commands.some(c=>c[0]==='fillRect'));assert.equal(h.depth(),0);
});
test('tracks stop on idle, turning, empty fuel and pause, ignore teleports, and reverse with backward travel',()=>{
 const h=artHarness(),v={kind:'tank',t:h.c.types[0],f:100};h.c.state='play';const step=(x,y=0,body=0)=>h.c.playerTankTrackPhase(v,x,y,body);
 assert.equal(step(0),null);assert.equal(step(6),3);assert.equal(step(6),3);assert.equal(step(6,0,2),3);v.f=0;assert.equal(step(10),3);v.f=100;h.c.state='paused';assert.equal(step(20),3);h.c.state='play';assert.equal(step(20),3);assert.equal(step(1020),3);assert.equal(step(1014),0);assert.equal(h.c.playerTankTrackPhase({t:{id:'armored'},f:100},0,0,0),null);
});
test('track overlays stay on hull layers, retain caller opacity, and match the sample proportions',()=>{
 const h=artHarness();h.c.g.globalAlpha=.4;h.c.tankShape(0,0,.3,1.2,h.c.types[0],30,'turret',2);assert.equal(h.rasters.length,1);h.rasters.length=0;h.c.tankShape(0,0,.3,1.2,h.c.types[5],30,'hull',2);assert.equal(h.rasters.length,3);const tracks=h.rasters.filter(a=>a.length===9);assert.ok(tracks.every(a=>a[2]+a[4]<=96));assert.ok(Math.abs(tracks[0][8]-30*2.12*436/440*vm.runInContext('PLAYER_TANK_ART.churchill.displayScale',h.c))<1e-9);assert.equal(h.c.g.globalAlpha,.4);assert.equal(h.depth(),0);
});

test('parked, newly boarded and stationary driven tanks use identical full-width belts in every model',()=>{
 const h=artHarness();h.c.TANK_DRAW=30;h.c.state='play';vm.runInContext(html.split('\n').find(l=>l.startsWith('function drawVehicle(v,')),h.c);
 for(const t of h.c.types){
  const layout=vm.runInContext('PLAYER_TANK_ART',h.c)[t.id];
  const vehicle={kind:'tank',t,f:100};h.c.drawVehicle(vehicle,100,100,0,0);const parked=h.rasters.slice(-4);
  h.c.p.tank=vehicle;h.c.drawVehicle(vehicle,100,100,0,0);const boarded=h.rasters.slice(-4);
  assert.deepEqual(boarded,parked,t.id);const belts=parked.filter(a=>a.length===9);assert.equal(belts.length,2);assert.equal(belts[0][2],0);assert.equal(belts[1][2],0);
  assert.equal(belts[0][7],(30*layout.displayScale)*layout.trackWidth);assert.equal(belts[1][7],(30*layout.displayScale)*layout.trackWidth);assert.equal(belts[0][8],belts[1][8]);assert.equal(belts[0][1],belts[1][1]);
  assert.equal(belts[0][5],-(30*layout.displayScale)*layout.trackHalfSpan);assert.equal(belts[1][5],(30*layout.displayScale)*(layout.trackHalfSpan-layout.trackWidth));
  h.c.drawVehicle(vehicle,106,100,0,0);const rolling=h.rasters.slice(-4);assert.equal(rolling[0][2],3);assert.equal(rolling[1][2],3);assert.equal(rolling[2][0],parked[2][0]);assert.equal(rolling[3][0],parked[3][0]);
  h.c.p.tank=null;h.c.drawVehicle(vehicle,106,100,0,0);assert.deepEqual(h.rasters.slice(-4),rolling,t.id+' exit');
 }
 assert.equal(h.depth(),0);
});

test('blue enemy tanks reuse the track strip and cache two layers; movement drives their phase',()=>{
 const h=artHarness();h.c.TANK_DRAW=30;h.c.state='play';
 h.c.tankShape(0,0,0,0,h.c.types[0],30);
 const strip=h.rasters[0][0],enemy={x:0,y:0,body:0,ang:0};
 const draw=()=>{h.rasters.length=0;h.c.drawEnemyTank(enemy);
  assert.equal(h.rasters.length,4);assert.equal(h.rasters[0][0],strip);return h.rasters[0][2];};
 assert.equal(draw(),0);
 assert.equal(h.canvases.length,5);
 enemy.x=6;assert.equal(draw(),3);
 enemy.ang=1;assert.equal(draw(),3);
 h.c.state='paused';enemy.x=8;assert.equal(draw(),3);
 h.c.state='play';enemy.x=4;assert.equal(draw(),1);
 assert.equal(h.canvases.length,5);
 assert.equal(h.depth(),0);
});

test('enemy artwork replaces both layers after loading once and keeps animated pixel tracks',()=>{
 const h=artHarness(),images=[];
 h.c.Image=class{constructor(){this.complete=false;this.naturalWidth=0;images.push(this);}};
 const enemy={x:0,y:0,body:0,ang:1};h.c.TANK_DRAW=30;h.c.state='play';
 h.c.drawEnemyTank(enemy);assert.equal(images.length,2);
 assert.deepEqual(images.map(i=>i.src),['assets/vehicles/enemy/hull.webp','assets/vehicles/enemy/turret.webp']);
 images.forEach((i,n)=>{Object.assign(i,{complete:true,naturalWidth:n?177:256,naturalHeight:n?384:378});i.onload();});
 h.commands.length=0;h.rasters.length=0;h.c.drawEnemyTank(enemy);
 const stamps=h.commands.filter(c=>c[0]==='drawImage');assert.equal(stamps.length,3);
 assert.equal(stamps[0][1],images[0]);assert.equal(stamps[1][1],images[1]);assert.equal(stamps[2][1],images[1]);
 assert.ok(!h.commands.some(c=>c[0]==='arc'&&Math.abs(Math.abs(c[1])-32*.78)<1e-9),'no wheel circles over enemy tracks');
 assert.equal(h.rasters.filter(a=>a.length===9).length,2);
 const barrel=stamps[1],housing=stamps[2],clip=h.commands.filter(command=>command[0]==='rect').at(-1);
 assert.equal(barrel[3],0);
 assert.ok(Math.abs(barrel[9]/barrel[5]/(housing[5]/384)-.95)<1e-12);
 assert.ok(Math.abs(barrel[7]+barrel[9]-clip[2])<1e-12);
 const originalHeight=32*1.24*384/177,originalTop=-originalHeight*(1025-63)/(1331-63);
 assert.ok(Math.abs(housing[3]-originalTop)<1e-12);assert.ok(Math.abs(housing[5]-originalHeight)<1e-12);
 assert.ok(Math.abs(clip[2]-(originalTop+originalHeight*200/384))<1e-12);
 const count=h.canvases.length;h.commands.length=0;
 for(let i=0;i<20;i++){enemy.x+=2;h.c.drawEnemyTank(enemy);}
 assert.equal(images.length,2);assert.equal(h.canvases.length,count);
 assert.ok(!h.commands.some(c=>c[0]==='drawImage'));assert.equal(h.depth(),0);
});

test('enemy pivot counter-rotates cached track strips without translating or changing turret heading',()=>{
 const h=artHarness();h.c.TANK_DRAW=30;h.c.state='play';
 const e={x:100,y:200,body:0,ang:.7};h.c.drawEnemyTank(e);
 const count=h.canvases.length;e.body=.1;h.rasters.length=0;h.c.drawEnemyTank(e);
 const belts=h.rasters.filter(a=>a.length===9);
 assert.ok(Math.abs(belts[0][2]-1.2)<1e-9);assert.ok(Math.abs(belts[1][2]-6.8)<1e-9);
 assert.equal(e.x,100);assert.equal(e.y,200);assert.equal(e.ang,.7);assert.equal(h.canvases.length,count);
 h.rasters.length=0;h.c.drawEnemyTank(e);assert.deepEqual(h.rasters.filter(a=>a.length===9),belts);
});

test('all friendly cutouts load once, replace fallback layers independently and reuse their rasters',()=>{
 const h=artHarness(),images=[];
 h.c.Image=class{constructor(){this.complete=false;this.naturalWidth=0;images.push(this);}};
 h.c.loadPlayerTankArtwork();h.c.loadPlayerTankArtwork();assert.equal(images.length,14);
 const root=path.join(__dirname,'..');
 for(const t of h.c.types){
  const hull=images.find(i=>i.src===`assets/vehicles/player/${t.id}/hull.webp`);
  const turret=images.find(i=>i.src===`assets/vehicles/player/${t.id}/turret.webp`);
  assert.ok(hull&&turret);
  for(const layer of ['hull','turret']){
   const asset=fs.readFileSync(path.join(root,`assets/vehicles/player/${t.id}/${layer}.webp`));
   assert.equal(asset.toString('ascii',8,12),'WEBP');assert.ok(asset[20]&0x10);
   assert.ok(asset.length<18000);
  }
  h.c.tankShape(0,0,.3,1.2,t,30,'both');
  Object.assign(hull,{complete:true,naturalWidth:154,naturalHeight:256});hull.onload();
  h.commands.length=0;h.c.tankShape(0,0,.3,1.2,t,30,'both');
  assert.ok(h.commands.some(c=>c[0]==='drawImage'&&c[1]===hull));
  Object.assign(turret,{complete:true,naturalWidth:128,naturalHeight:256});turret.onload();
  h.commands.length=0;h.rasters.length=0;h.c.tankShape(0,0,.3,1.2,t,30,'both');
  assert.ok(h.commands.some(c=>c[0]==='drawImage'&&c[1]===hull));
  assert.ok(h.commands.some(c=>c[0]==='drawImage'&&c[1]===turret));
  assert.ok(!h.commands.some(c=>c[0]==='arc'&&Math.abs(Math.abs(c[1])-32*.78)<1e-9),'no circles on friendly tracks');
  assert.equal(h.rasters.length,4);
  const count=h.canvases.length;h.commands.length=0;
  for(let i=0;i<20;i++)h.c.tankShape(i,0,.3,1.2,t,30,'both');
  assert.equal(h.canvases.length,count);assert.ok(!h.commands.some(c=>c[0]==='drawImage'));
 }
 assert.equal(images.length,14);assert.equal(h.depth(),0);
});

test('friendly wreck rendering uses original pixel shapes without requesting painted layers',()=>{
 const {createGameEngine}=require('./helpers/game-engine.cjs');
 const h=createGameEngine(path.join(__dirname,'..'));
 for(const t of ['t34','tiger','type10','m1','sherman','churchill','kingtiger']){
  h.c.tankId=t;
  assert.equal(h.run(`(()=>{
   let requests=0;playerTankGraphic=()=>{requests++;throw Error('wreck requested live artwork');};
   spawnTankWreck(400,500,.3,1.2,{id:tankId},400,480);
   drawOneTankWreck(tankWrecks[tankWrecks.length-1]);
   return requests===0;
  })()`),true);
 }
});

test('a stationary player pivot counter-rotates the same two track strips while the turret stays independent',()=>{
 const h=artHarness();h.c.TANK_DRAW=30;h.c.state='play';
 vm.runInContext(html.split('\n').find(line=>line.startsWith('function drawVehicle(v,')),h.c);
 const vehicle={kind:'tank',t:h.c.types[0],f:100};
 h.c.drawVehicle(vehicle,100,100,0,.7);const count=h.canvases.length;
 h.rasters.length=0;h.commands.length=0;h.c.drawVehicle(vehicle,100,100,.1,.7);
 const belts=h.rasters.filter(args=>args.length===9);
 assert.equal(belts.length,2);assert.ok(Math.abs(belts[0][2]-1.2)<1e-9);assert.ok(Math.abs(belts[1][2]-6.8)<1e-9);
 assert.equal(vehicle.trackPhase,undefined);assert.equal(h.canvases.length,count);
 assert.ok(h.commands.some(command=>command[0]==='rotate'&&command[1]===.7+Math.PI/2));
});

test('friendly hulls and turrets use one sample scale and expose the outer track strips',()=>{
 const h=artHarness(),root=path.join(__dirname,'..');
 h.c.Image=class{
  constructor(){this.complete=true;}
  set src(value){
   this.url=value;
   const parts=value.split('/'),id=parts[3],layer=parts[4].split('.')[0];
   const png=fs.readFileSync(path.join(root,`docs/player-tank-art/${id}-${layer}-master.png`));
   this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);
  }
  get src(){return this.url;}
 };
 const designs=vm.runInContext('PLAYER_TANK_ART',h.c);
 for(const tank of h.c.types){
  h.commands.length=0;h.rasters.length=0;h.c.tankShape(0,0,0,.7,tank,30,'both');
  const stamps=h.commands.filter(command=>command[0]==='drawImage'&&typeof command[1]?.src==='string');
  assert.equal(stamps.length,tank.id==='type10'?4:2,'original hull and turret plus the Type 10 muzzle and barrel');
  const hull=stamps[0],turret=stamps.at(-1),layout=designs[tank.id];
  assert.ok(Math.abs(hull[4]/hull[1].naturalWidth-turret[4]/turret[1].naturalWidth)<1e-9,tank.id+' shared source scale');
  assert.ok(Math.abs(hull[5]/hull[1].naturalHeight-turret[5]/turret[1].naturalHeight)<1e-9,tank.id+' original aspect ratios');
  const outer=layout.trackHalfSpan,width=layout.trackWidth,halfHull=hull[4]/64;
  assert.ok(halfHull>outer-width&&halfHull<outer,tank.id+' connected covers and exposed outer belt');
  const belts=h.rasters.filter(args=>args.length===9);
  const rim=30*layout.displayScale*.07;
  const left=belts[0][5]-rim,right=belts[1][5]+belts[1][7]+rim;
  assert.ok(Math.abs(right-left-30*2.10)<1e-9,tank.id+' legacy outer width');
  const hullRaster=h.rasters[2],turretRaster=h.rasters[3];
  assert.ok(Math.abs(hullRaster[3]/hullRaster[0].width-turretRaster[3]/turretRaster[0].width)<1e-9,tank.id+' uniform enlargement');
  assert.ok(Math.abs(belts[0][7]/belts[0][8]-layout.trackPixels.width/layout.trackPixels.height)<1e-9,tank.id+' sample belt ratio');
  assert.ok(Math.abs(outer*2/layout.trackHeight-layout.trackPixels.span/layout.trackPixels.height)<1e-9,tank.id+' sample track spacing');
 }
});


test('Type 10 keeps its enlarged barrel, emphasizes the muzzle and caches black outlines once',()=>{
 const h=artHarness(),images=[];
 h.c.Image=class{constructor(){this.complete=false;images.push(this);}};
 const tank=h.c.types.find(t=>t.id==='type10');
 h.c.tankShape(0,0,.3,1.2,tank,30,'both');
 images.forEach(image=>{Object.assign(image,{complete:true,naturalWidth:133,naturalHeight:256});image.onload();});
 h.commands.length=0;h.c.tankShape(0,0,.3,1.2,tank,30,'both');
 const stamps=h.commands.filter(command=>command[0]==='drawImage'&&images.includes(command[1]));
 assert.equal(stamps.length,4);
 const muzzle=stamps[1],barrel=stamps[2],housing=stamps[3],clip=h.commands.filter(command=>command[0]==='rect').at(-1);
 assert.ok(Math.abs(barrel[8]/housing[4]-1.5)<1e-12);
 assert.ok(Math.abs(barrel[9]/(housing[5]*92/256)-1.2)<1e-12);
 assert.ok(Math.abs(muzzle[8]/barrel[8]-1.2)<1e-12,'muzzle width +20%');
 assert.ok(Math.abs(muzzle[9]/(housing[5]*14/256*1.2)-1.15)<1e-12,'muzzle length +15%');
 assert.ok(Math.abs(muzzle[7]+muzzle[9]-barrel[7])<1e-12,'muzzle joins the shaft');
 assert.ok(Math.abs(barrel[7]+barrel[9]-clip[2])<1e-12);
 assert.ok(Math.abs(clip[2]-(housing[3]+housing[5]*106/256))<1e-12);
 assert.ok(Math.abs(barrel[6]+barrel[8]/2)<1e-12);
 const masks=h.commands.filter(command=>command[0]==='drawImage'&&!images.includes(command[1]));
 assert.equal(masks.length,18,'two mask copies and eight outline offsets for each layer');
 assert.equal(new Set(masks.filter(command=>command.length===4).map(command=>command[1])).size,3,'two source layers share one outline mask');
 const allocations=h.canvases.length;h.commands.length=0;
 for(let frame=0;frame<30;frame++)h.c.tankShape(frame,0,.3,1.2,tank,30,'both');
 assert.equal(h.canvases.length,allocations);assert.ok(!h.commands.some(command=>command[0]==='drawImage'));
 assert.equal(h.depth(),0);
});
