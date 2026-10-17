const test=require('node:test');
const assert=require('node:assert/strict');
const {generateFloor,blocked,canGuardSee,setMode,moveGuards,WIDTH,HEIGHT,OBJECTIVES_PER_FLOOR}=require('../js/infiltration-sample.js');
function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
function reachable(f,goal){
  const step=14,n=Math.ceil(WIDTH/step),h=Math.ceil(HEIGHT/step),sx=Math.round(f.center/step),sy=Math.round(1285/step);
  const seen=new Set([sy*n+sx]),queue=[[sx,sy]];let read=0;
  while(read<queue.length){
    const [x,y]=queue[read++];
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const xx=x+dx,yy=y+dy,id=yy*n+xx;
      if(xx<0||xx>=n||yy<0||yy>=h||seen.has(id)||blocked(f,xx*step,yy*step,13))continue;
      seen.add(id);queue.push([xx,yy]);
    }
  }
  for(let y=Math.floor((goal.y-30)/step);y<=Math.ceil((goal.y+30)/step);y++)
   for(let x=Math.floor((goal.x-30)/step);x<=Math.ceil((goal.x+30)/step);x++)
    if(seen.has(y*n+x))return true;
  return false;
}
test('each random floor always has ten reachable rooms and three reachable files',()=>{
  for(let seed=1;seed<=30;seed++){
    const rng=random(seed);
    for(let floor=1;floor<=2;floor++){
      const f=generateFloor(floor,rng);
      assert.equal(f.rooms.length,10);
      assert.equal(f.intel.length,OBJECTIVES_PER_FLOOR);
      assert.equal(f.guards.length,4);
      assert.equal(new Set(f.intel.map(q=>q.room)).size,OBJECTIVES_PER_FLOOR);
      for(const item of [...f.intel,f.stair])assert.equal(reachable(f,item),true,'unreachable '+seed+'/'+floor+': '+item.room);
    }
  }
});
test('walls block movement and view even in a sight cone',()=>{
 const f=generateFloor(1,random(42));
 const r=f.rooms[0];
 assert.equal(blocked(f,r.x+4,r.y+70,13),true);
 const g={x:f.center,y:740,face:Math.PI/2,sight:245};
 assert.equal(canGuardSee(f,g,{x:f.center,y:825}),true);
 assert.equal(canGuardSee(f,g,{x:f.center,y:825},true),true);
});

test('indoor blue guard keeps patrol > suspicious > found state and freezes on transitions',()=>{
 const h={x:0,y:100,face:0,mode:'patrol',modePause:0,stun:0,spotT:0,suspectT:0,
  lastX:0,lastY:0,burstLeft:0,shotCd:0,lostT:0,wait:0,
  speed:50,sight:220,waypoints:[{x:0,y:100},{x:150,y:100}],index:1};
 const floor={guards:[h],walls:[],furniture:[],rooms:[]};
 const p={x:70,y:100,concealed:0,sneak:false,detections:0,hp:3};
 for(let k=0;k<5;k++)moveGuards(floor,p,.05);
 assert.equal(h.mode,'suspect');
 assert.ok(h.modePause>0);
 assert.equal(setMode(h,'found',p),true);
 assert.equal(h.mode,'found');
 assert.equal(h.burstLeft,3);
 assert.ok(h.modePause>=.5);
});
