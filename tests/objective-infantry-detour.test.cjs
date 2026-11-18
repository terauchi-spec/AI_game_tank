const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
const root=path.join(__dirname,'..');

for(const [name,setup] of [
 ['beginner', "stageMode='beginner';reset(false)"],
 ['middle', "stageMode='base';intermediateStageId='baseIntermediate';reset(false)"],
 ['advanced', "stageMode='base';intermediateStageId=null;reset(false)"],
 ['moving fortress', "stageMode='base';areaDebugEnabled=true;selectedAreaDebug='移動要塞';reset(false)"]
]){
 test(`blue and white infantry pass to the far side of the ${name} objective`,()=>{
  const {run}=createGameEngine(root,{seed:7});
  run(setup);
  const result=JSON.parse(run(`JSON.stringify((()=>{
   covers=[];objects=[];water=[];mud=[];etanks=[];cars=[];allies=[];rebuildSpatialGrid();
   p.x=base.x+base.w*(base.decisiveFortress?.64:.5);p.y=base.y-34;
   humans=[-.12,.01,.14].map((offset,i)=>({
    x:base.x+base.w*(.55+offset),y:base.y+base.h+12+33*i,
    alive:true,elite:i!==0,target:'p',frontMarch:i===0&&!!base.decisiveFortress
   }));
   const crossed=humans.map(()=>false);
   let collision=false;
   const startX=base.x;
   for(let frame=0;frame<720&&crossed.includes(false);frame++){
    if(base.decisiveFortress)updateDecisiveFortress(1/60);
    for(const [i,h] of humans.entries()){
     if(crossed[i])continue;
     const angle=Math.atan2(p.y-h.y,p.x-h.x),speed=h.elite?114:95;
     if(!moveHumanAroundObjective(h,p,speed,1/60)&&D(h,p)>110)moveHumanChase(h,angle,speed,1/60);
     collision||=circleHitsBase(h.x,h.y,8);
     if(h.y<base.y-8){crossed[i]=true;h.alive=false;}
    }
   }
   return {crossed,collision,moved:base.x!==startX};
  })())`));
  assert.deepEqual(result.crossed,[true,true,true]);
  assert.equal(result.collision,false);
  if(name==='moving fortress')assert.equal(result.moved,true);
 });
}

test('alerted infantry rounds a command building corner through the normal update loop',()=>{
 const {run}=createGameEngine(root,{seed:7});
 const result=JSON.parse(run(`JSON.stringify((()=>{
  stageMode='base';intermediateStageId='baseIntermediate';reset(false);
  covers=[];objects=[];water=[];mud=[];etanks=[];cars=[];allies=[];rebuildSpatialGrid();
  state='play';debugInvincible=true;weather='clear';baseSpawnT=999;
  p.x=base.x+base.w+30;p.y=base.y+base.h-36;
  const h={x:base.x+base.w-94,y:base.y+base.h+12,elite:false,hq:true,alive:true,st:1,target:'p',
   face:-.4,cd:999,bu:true,path:[],stun:0,foundPause:0,sharePause:0};
  humans=[h];
  let detoured=false;
  for(let frame=0;frame<120;frame++){update(1/60);detoured||=!!h.objectiveDetour;}
  return {detoured,passed:h.x>=base.x+base.w-4,collision:circleHitsBase(h.x,h.y,8)};
 })())`));
 assert.deepEqual(result,{detoured:true,passed:true,collision:false});
});
