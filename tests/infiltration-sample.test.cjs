const test=require('node:test');
const assert=require('node:assert/strict');
const {generateFloor,blocked,canGuardSee,WIDTH,HEIGHT,OBJECTIVES_PER_FLOOR}=require('../js/infiltration-sample.js');
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
