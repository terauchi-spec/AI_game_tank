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
