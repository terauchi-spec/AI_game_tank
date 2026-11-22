const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function rocketHarness(){
 const blasts=[];
 const context={Math,camX:100,cam:200,W:840,H:720,p:{x:5000,y:5000,dig:0},stageMode:'base',combatVipTarget:()=>null,hitsC:()=>false,D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),allies:[],humans:[],etanks:[],commanderRocketBlast:(x,y)=>blasts.push([x,y]),updateFrontlineCommanderRocket:()=> 'ally'};
 vm.createContext(context);
 vm.runInContext(html.slice(html.indexOf('function updateCommanderRocket('),html.indexOf('// 電波リングの基本描画。')),context);
 return {context,blasts};
}
test('enemy bazooka expires silently at each viewport edge and outside spawn points',()=>{
 for(const [x,y] of [[99,300],[941,300],[300,199],[300,921]]){
  const {context:c,blasts}=rocketHarness();
  assert.equal(c.updateCommanderRocket({x,y,sx:300,sy:300,from:'e'},300,300,false),true);
  assert.deepEqual(blasts,[]);
  assert.equal(c.updateCommanderRocket({x:300,y:300,sx:x,sy:y,from:'e'},x,y,false),true);
  assert.deepEqual(blasts,[]);
 }
});
test('onscreen expiry explodes, friendly rockets retain their own update path, and camera movement culls old shots',()=>{
 const {context:c,blasts}=rocketHarness();
 const bullet={x:300,y:300,sx:300,sy:300,from:'e'};
 assert.equal(c.updateCommanderRocket(bullet,300,300,false),false);
 assert.equal(c.updateCommanderRocket(bullet,300,300,true),true);
 assert.deepEqual(blasts,[[300,300]]);
 assert.equal(c.updateCommanderRocket({...bullet,from:'ally'},0,0,false),'ally');
 c.cam=1000;
 assert.equal(c.updateCommanderRocket(bullet,300,300,false),true);
 assert.equal(blasts.length,1);
});
test('outdoor and indoor blue commanders fire bazookas at 1000px range',()=>{
 const c={Math,COMMANDER_BLUE_RANGE:0};
 vm.createContext(c);
 vm.runInContext(html.match(/^const COMMANDER_BLUE_RANGE=.*$/m)[0].replace('const COMMANDER_BLUE_RANGE','COMMANDER_BLUE_RANGE'),c);
 assert.equal(c.COMMANDER_BLUE_RANGE,1000);
 const src=fs.readFileSync(path.join(root,'js/infiltration-world.js'),'utf8');
 const shots=[],bullets=[];
 Object.assign(c,{p:{},D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),los:()=>true,performance:{now:()=>0},enemyCannonSpeed:()=>630,bullets,fire:(...args)=>{shots.push(args);bullets.push({});}});
 const start=src.indexOf('function indoorUpdateCommanderWeapon(');
 const end=src.indexOf('\nfunction ',start+10);
 vm.runInContext(src.slice(start,end),c);
 const guard={x:0,y:0,indoorCommander:true,cd:0};
 assert.equal(c.indoorUpdateCommanderWeapon(guard,{x:1001,y:0},true,false,.1),false);
 assert.equal(c.indoorUpdateCommanderWeapon(guard,{x:900,y:0},true,false,.1),true);
 c.indoorUpdateCommanderWeapon(guard,{x:900,y:0},true,false,.5);
 assert.equal(shots[0][6],1000);
 assert.equal(bullets[0].commanderRocket,true);
});
