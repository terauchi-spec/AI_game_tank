const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/infiltration-world.js'),'utf8');
const random=seed=>{let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}};
function harness(beginner=true,seed=1,code=source){
 let completed=0;
 const c={indoorBeginner:beginner,stageMode:'indoor',state:'play',WH:14000,WW:960,W:480,H:800,cam:0,camX:0,p:{},scoreStats:{},R:random(seed),
  ZONE_STYLE:{'敵迷路基地':{p:[]}},module:{exports:{}},document:{body:{classList:{remove(){}}}},rebuildSpatialGrid(){},say(){},sfx(){},
  partner:null,hound:null,debugMode:0,hitsM:()=>false,playerDetectedNow:()=>false,los:()=>true,D:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
  completeMission(){completed++;c.state='win';}};
 vm.createContext(c);vm.runInContext(code+`;setupInfiltrationWorld();setupInfiltrationMission();api={get world(){return indoorWorld;},get files(){return INDOOR_FILES_TOTAL;},setup:setupInfiltrationWorld,mission:updateInfiltrationMission,roles:indoorReinforcementRole,replenish:indoorReplenishGuards,entrance:indoorUpdateEntranceGuards,landing:indoorStairLanding,stairBounds:indoorStairBounds,point:indoorGridPoint,nearest:indoorGridFreeNearest};`,c);
 return{c,api:c.api,get completed(){return completed;}};
}
function reachable(f,s){
 const g=f.navigation.grid,b=s.api.stairBounds(f.stair,f.number),entry={x:f.stair.x,y:b.y+b.h+24};
 const start=f.number===1?{x:f.openings[0].x,y:f.footprint.y+f.footprint.h-32}:entry;
 const first=s.api.nearest(g,s.api.point(g,start)),seen=new Uint8Array(g.solid.length),queue=[first];assert.ok(first>=0);seen[first]=1;
 for(let at=0;at<queue.length;at++){
  const id=queue[at],x=id%g.cols,y=(id/g.cols)|0;
  for(const n of [x?id-1:-1,x+1<g.cols?id+1:-1,y?id-g.cols:-1,y+1<g.rows?id+g.cols:-1])if(n>=0&&!g.solid[n]&&!seen[n]){seen[n]=1;queue.push(n);}
 }
 const canReach=(q,r)=>queue.some(id=>Math.hypot(g.x+(id%g.cols+.5)*g.step-q.x,g.y+(((id/g.cols)|0)+.5)*g.step-q.y)<r);
 for(const q of s.api.world.intel.filter(q=>q.floor===f.number))assert.ok(canReach(q,60),'document must be reachable from entrance/stair, floor '+f.number);
 assert.ok(canReach(entry,35),'south stair entrance must connect to the entry/room graph');
}
test('beginner physical floor area is 80 percent, with two reachable files, no back exit and a 70 percent roster',()=>{
 for(let seed=1;seed<=60;seed++){
  const s=harness(true,seed),w=s.api.world;
  assert.equal(s.api.files,2);assert.equal(w.intel.length,2);assert.equal(w.intel.filter(q=>q.floor===1).length,1);assert.equal(w.intel.filter(q=>q.floor===2).length,1);
  assert.equal(w.emergency,null);assert.equal(w.exits.length,1);
  for(const f of w.floors){
   assert.ok(Math.abs(f.footprint.w*f.footprint.h/(900*1260*1.75)-.8)<1e-12);
   assert.equal(f.guards.length,Math.round(f.fullGuardCount*.7));
   assert.equal(f.emergency,null);assert.ok(!f.openings.some(q=>q.side===-1));assert.ok(!f.doors.some(q=>q.kind==='emergency'));
   assert.ok(f.guards.every(h=>!h.elite&&!h.indoorWhite&&!h.indoorWhiteCommander));
   assert.ok(f.postGuards.every(h=>f.guards.includes(h)));reachable(f,s);
  }
  assert.equal(s.c.humans.length,w.floors.reduce((n,f)=>n+f.guards.length,0));assert.ok(s.c.humans.some(h=>h.indoorCommander));
 }
});
test('beginner replacement roles and alarm entrance guards retain only blue soldiers and blue commanders',()=>{
 const s=harness();for(const roll of [0,.49,.5,.89,.9,.999]){const r=s.api.roles(roll);assert.equal(r.elite,false);assert.equal(r.indoorWhite,false);assert.equal(r.indoorWhiteCommander,false);assert.equal(r.indoorCommander,roll<.5);}
 const count=s.c.humans.length;s.c.humans.forEach(h=>h.alive=false);s.api.replenish(.3);
 assert.equal(s.c.humans.length,count);assert.ok(s.c.humans.every(h=>h.alive&&!h.elite&&!h.indoorWhite&&!h.indoorWhiteCommander));
 const w=s.api.world;w.alarm.active=true;s.c.cam=0;s.c.R=()=>0;s.api.entrance(.3);
 assert.equal(w.floors[0].guards.filter(h=>h.indoorEntranceGuard).length+(w.alarm.entranceGuards?.pending.length||0),4);
 assert.ok(s.c.humans.every(h=>!h.elite&&!h.indoorWhite&&!h.indoorWhiteCommander));
});
test('beginner escapes after two files only and advanced settings return when replaying the other difficulty',()=>{
 const s=harness(),w=s.api.world,m=s.c.mission;
 Object.assign(s.c.p,w.exit);m.index=1;s.api.mission(.1);assert.equal(s.completed,0);
 m.index=2;for(const q of m.points)q.done=true;for(let i=0;i<55;i++)s.api.mission(.1);assert.equal(s.completed,1);
 s.c.indoorBeginner=false;s.api.setup();assert.equal(s.api.files,3);assert.equal(s.api.world.intel.length,3);
 for(const f of s.api.world.floors){assert.equal(f.footprint.w,900);assert.equal(f.footprint.h,2205);assert.equal(f.fullGuardCount,undefined);}
 assert.equal(s.api.roles(.95).indoorWhiteCommander,true);
 s.c.indoorBeginner=true;s.api.setup();assert.equal(s.api.files,2);assert.equal(s.api.world.exits.length,1);
});
module.exports={harness};

test('selection maps each indoor card to the shared indoor loop with the correct difficulty and opening file count',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),cards=['indoorBeginner','indoor','frontBeginner','base'].map(stage=>({dataset:{stage},addEventListener(_name,callback){this.click=callback;}})),nodes={};
 const element=id=>nodes[id]??={hidden:false,textContent:'',src:'',classList:{toggle(){}},focus(){},getAttribute(k){return this[k];},querySelector(selector){return element(selector);}};
 const c={document:{querySelectorAll:()=>cards,getElementById:element,body:{classList:{remove(){},contains:()=>false,toggle(){}}}},stageSelectable:()=>true,skillMenuList:()=>[{id:'throw'}],selectedSkillId:'throw',selectSkillIndex(){},isFrontlineBeginner:()=>false};vm.createContext(c);
 vm.runInContext([html.match(/^let stageMode=.*$/m)[0],html.match(/^const STAGE_NAMES=.*$/m)[0],html.match(/^document.querySelectorAll\('\[data-stage\]'\).*$/m)[0]].join('\n'),c);
 const a=html.indexOf('function syncMissionBriefing(){'),b=html.indexOf("document.getElementById('missionBegin').addEventListener",a);vm.runInContext(html.slice(a,b),c);
 for(const [card,title,total,id]of[[cards[0],'潜入（初級）',2,'indoorBeginner'],[cards[1],'潜入（上級）',3,'indoor'],[cards[0],'潜入（初級）',2,'indoorBeginner']]){
  card.click();vm.runInContext("state='briefing';syncMissionBriefing();snapshot={mode:stageMode,beginner:indoorBeginner,name:STAGE_NAMES[stageMode]};",c);
  assert.equal(c.snapshot.mode,'indoor');assert.equal(c.snapshot.beginner,id==='indoorBeginner');assert.equal(c.snapshot.name,title+'：重要資料'+total+'箇所');
  assert.equal(nodes.missionBriefingTitle.textContent,title);assert.equal(nodes.missionIndoorDocuments.textContent,'円に入り、重要資料'+total+'か所を回収');assert.equal(nodes.missionIndoorRules.hidden,false);
 }
 cards[2].click();vm.runInContext('snapshot={mode:stageMode,beginner:indoorBeginner,front:frontlineBeginner}',c);assert.equal(c.snapshot.mode,'front');assert.equal(c.snapshot.beginner,false);assert.equal(c.snapshot.front,true);
 cards[3].click();vm.runInContext('snapshot={mode:stageMode,beginner:indoorBeginner}',c);assert.equal(c.snapshot.mode,'base');assert.equal(c.snapshot.beginner,false);
});
