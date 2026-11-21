const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {createGameEngine}=require('./helpers/game-engine.cjs');
const root=path.join(__dirname,'..');
function start(){
 const h=createGameEngine(root,{touch:true,seed:17});
 h.run(`stageMode='beginner';reset(false);state='play';
  covers=[];objects=[];humans=[];etanks=[];cars=[];water=[];mud=[];bushes=[];allies=[];
  p.x=500;p.y=5000;p.body=0;p.tank={kind:'tank',t:TYPES[0],f:100};parts=[];
  rebuildSpatialGrid();`);
 return h;
}
test('cover crushing emits chips on the contact edge without changing destruction or random state',()=>{
 const results=[];
 for(const enabled of [true,false]){
  const h=start();if(!enabled)h.run('playerTankContactEffect=()=>{};');
  results.push(h.run(`(()=>{
   covers=[{kd:1,x:526,y:4970,w:100,h:60}];rebuildSpatialGrid();
   let removed=0;const realCarve=carve;carve=(...args)=>(removed=realCarve(...args));
   playerMove(1,0,28,1/60);
   const fx=parts.filter(q=>q.tankContact);
   return {removed,x:p.x,y:p.y,
    covers:JSON.stringify(covers.map(c=>({x:c.x,y:c.y,w:c.w,h:c.h,kd:c.kd}))),random:R(),fx:fx.map(q=>({x:q.x,y:q.y,life:q.life}))};
  })()`));
 }
 const [withFx,withoutFx]=results;
 assert.ok(withFx.removed>0);assert.equal(withFx.fx.length,3);assert.equal(withoutFx.fx.length,0);
 for(const q of withFx.fx){assert.equal(q.x,526);assert.ok(Math.abs(q.y-5000)<=3);assert.ok(q.life<=.36);}
 for(const key of ['removed','x','y','covers','random'])assert.equal(withFx[key],withoutFx[key],key);
});
test('continuous contact follows the hit location, stays bounded across frame rates, and stops on release',()=>{
 const h=start();
 assert.equal(h.run(`(()=>{
  const realUpdate=updateParts;
  for(const fps of [30,60,120]){
   parts=[];p.tank.ramFx=0;
   // Hold the same collision for one second to measure emission independently of carving.
   const c={kd:1,x:526,y:4970,w:100,h:60};covers=[c];objects=[];
   rebuildSpatialGrid();carve=()=>0;mv=()=>{};
   let total=0,max=0;
   for(let frame=0;frame<fps;frame++){
    const n=parts.length;playerMove(1,0,28,1/fps);total+=parts.length-n;
    max=Math.max(max,parts.length);realUpdate(1/fps);
   }
   if(total<27||total>33||max>12)throw Error(JSON.stringify({fps,total,max}));
   // Change contact to the upper edge; the shared timer prevents doubled bursts.
   p.tank.ramFx=0;parts=[];c.x=470;c.y=4972;c.w=60;c.h=10;rebuildSpatialGrid();
   playerMove(0,-1,28,.1);
   if(parts.length!==3||parts.some(q=>q.y!==4984||Math.abs(q.x-500)>3))throw Error(JSON.stringify({fps,parts}));
   realUpdate(.4);if(parts.length!==0)return false;
   covers=[];rebuildSpatialGrid();playerMove(1,0,28,.1);if(parts.length!==0)return false;
  }
  return true;
 })()`),true);
});
test('object contact chips are limited to tracked player tanks and require actual damage',()=>{
 const h=start();
 assert.equal(h.run(`(()=>{
  const o={kind:'crate',x:524,y:4970,w:60,h:60};
  objects=[o];covers=[];rebuildSpatialGrid();mv=()=>{};
  for(const [kind,t,damaged,expected] of [['tank',TYPES[0],true,3],['truck',TRUCK_TYPE,true,0],['tank',ARMORED_TYPE,true,0],['tank',TYPES[0],false,0]]){
   p.tank={kind,t,f:100};parts=[];damageObject=()=>damaged;
   playerMove(1,0,28,.1);if(parts.length!==expected)return false;
  }
  return true;
 })()`),true);
});

test('contact chips render with opaque bright fills and dark borders above the tank layer',()=>{
 const h=start(),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const startAt=html.indexOf(' for(const q of parts){const psz=q.sz||4');
 const renderer=html.slice(startAt,html.indexOf(' let explosionComposing=',startAt));
 assert.ok(startAt>html.indexOf("if(p.tank&&p.tank.kind==='tank'&&inBush(p))drawVehicle"));
 h.run(`parts=[];playerTankContactEffect(p.tank,{x:526,y:4970,w:100,h:60},1,0);
  var contactPaints=[];g={fillRect(...rect){contactPaints.push({rect,alpha:this.globalAlpha,color:this.fillStyle});}};`);
 h.run(`{const cx=400,cy=4800;${renderer}}`);
 const paints=h.run('contactPaints');assert.equal(paints.length,6);
 assert.equal(paints.filter(q=>q.color==='#34291c').length,3);
 for(let i=0;i<paints.length;i+=2){
  assert.equal(paints[i].alpha,1);assert.equal(paints[i+1].alpha,1);
  assert.ok(paints[i+1].rect[2]>=5);assert.equal(paints[i].rect[2],paints[i+1].rect[2]+2);
 }
 h.run('updateParts(.26);contactPaints=[];');
 h.run(`{const cx=400,cy=4800;${renderer}}`);
 assert.ok(h.run('contactPaints.every(q=>q.alpha>0&&q.alpha<1)'));
});
