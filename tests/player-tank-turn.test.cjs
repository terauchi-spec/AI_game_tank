const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');
const root=path.join(__dirname,'..');
function start(){
 const h=createGameEngine(root,{touch:true});
 h.run(`stageMode='beginner';reset(false);state='play';
  covers=[];objects=[];humans=[];etanks=[];cars=[];water=[];mud=[];bushes=[];allies=[];roadTruckEvents=[];
  mission=null;rebuildSpatialGrid();touchTurretAngle=.7;
  playerMove=(dx,dy)=>{p.x+=dx;p.y+=dy;return Math.hypot(dx,dy);};`);
 return h;
}
test('all seven player tanks stop to pivot on opposite input and resume at the original speed',()=>{
 const h=start();
 assert.equal(h.run(`(()=>{
  for(const type of TYPES)for(const [key,body] of [['ArrowLeft',0],['ArrowRight',Math.PI],['ArrowUp',Math.PI/2],['ArrowDown',-Math.PI/2]]){
   for(const key of Object.keys(keys))keys[key]=false;
   p.x=480;p.y=5000;p.body=body;p.ang=.7;
   p.tank={kind:'tank',t:type,f:100,v:100,c:100};keys[key]=true;
   for(let frame=0;frame<119;frame++){
    update(1/60);
    if(p.x!==480||p.y!==5000||p.tank.f!==100||Math.abs(p.ang-.7)>1e-9)return false;
   }
   update(1/60);
   if(Math.abs(Math.hypot(p.x-480,p.y-5000)-type.sp/60)>1e-8||p.tank.playerPivoting)return false;
   if(Math.abs(p.tank.f-(100-type.sp/60*.04))>1e-8)return false;
  }
  return true;
 })()`),true);
});
test('straight and perpendicular controls retain immediate movement; wheel vehicles and infantry do not pivot',()=>{
 const h=start();
 assert.equal(h.run(`(()=>{
  for(const [vehicle,body] of [[{kind:'tank',t:TYPES[0],f:100},0],[{kind:'tank',t:TYPES[0],f:100},Math.PI/2],
   [{kind:'truck',t:TRUCK_TYPE,f:100},Math.PI],[{kind:'tank',t:ARMORED_TYPE,f:100},Math.PI],
   [{kind:'fighter',t:FIGHTER_TYPE,f:100,hp:FIGHTER_TYPE.hp},Math.PI],[null,Math.PI]]){
   p.x=480;p.y=5000;p.body=body;p.tank=vehicle;
   keys.ArrowRight=true;update(1/60);
   if(!(p.x>480)||p.y!==5000||p.body!==0)return false;
  }
  return true;
 })()`),true);
});
test('release and empty fuel stop a player pivot, and changing the requested direction follows the short turn',()=>{
 const h=start();
 assert.equal(h.run(`(()=>{
  p.tank={kind:'tank',t:TYPES[0],f:100};p.x=480;p.y=5000;p.body=0;
  keys.ArrowLeft=true;update(.1);const turned=p.body;
  keys.ArrowLeft=false;update(.1);
  if(p.body!==turned||p.tank.playerPivoting)return false;
  keys.ArrowLeft=true;update(.1);const before=p.body;
  keys.ArrowLeft=false;keys.ArrowUp=true;update(.1);
  if(Math.abs(p.body-before)>Math.PI/20+1e-9||p.x!==480||p.y!==5000)return false;
  p.tank.f=0;const stopped=p.body;update(.1);
  return p.body===stopped&&!p.tank.playerPivoting&&p.x===480&&p.y===5000;
 })()`),true);
});
test('player pivots use the enemy turn rate independently of frame rate',()=>{
 const h=start();
 assert.equal(h.run(`(()=>{
  for(const dt of [1/30,1/60,1/120]){
   p.body=0;p.tank={kind:'tank',t:TYPES[0]};
   for(let frame=0;frame<Math.round(2/dt)-1;frame++)if(turnPlayerTankBody(Math.PI,dt))return false;
   if(!turnPlayerTankBody(Math.PI,dt)||Math.abs(angD(Math.PI,p.body))>1e-8)return false;
  }
  return true;
 })()`),true);
});
