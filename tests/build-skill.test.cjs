const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const functions=html.slice(html.indexOf('function activeBuiltWalls(){'),html.indexOf('function cleanBuiltWalls('));
const overlap=(a,b,m=0)=>a.x<b.x+b.w+m&&a.x+a.w+m>b.x&&a.y<b.y+b.h+m&&a.y+a.h+m>b.y;
function harness(){
 const c={p:{x:500,y:500,body:0},covers:[],objects:[],builtWalls:[],water:[],base:{x:-1000,y:-1000,w:1,h:1},
  WW:3000,WH:3000,stageMode:'base',performance:{now:()=>1000},ov2:overlap,coverHitRect:o=>o.noHit&&!o.indoorDoor?null:o,objectHitRect:o=>o,
  circleHitsRect:(x,y,r,q)=>x+r>q.x&&x-r<q.x+q.w&&y+r>q.y&&y-r<q.y+q.h,
  burst(){},sfx(){},say(t){c.message=t;}};
 const segment=(a,b,r,pad)=>{
  if(!r)return false;
  const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));
  for(let i=0;i<=steps;i++){const t=steps?i/steps:0,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
   if(x>=r.x-pad&&x<=r.x+r.w+pad&&y>=r.y-pad&&y<=r.y+r.h+pad)return true;
  }return false;
 };
 c.segmentHitsCover=(a,b,r,pad)=>!r.noHit&&segment(a,b,r,pad);c.segmentHitsObject=segment;
 c.coversInBox=(x,y,x2,y2)=>c.covers.filter(r=>overlap(r,{x,y,w:x2-x,h:y2-y}));
 c.objectsInBox=(x,y,x2,y2)=>c.objects.filter(r=>overlap(r,{x,y,w:x2-x,h:y2-y}));
 c.indoorFloorEdgeBlocked=(_p,x,y)=>x<470||x>570||y<480||y>520;
 vm.createContext(c);vm.runInContext(functions,c);return c;
}
function safe(c,obstacles){
 for(const q of c.builtWalls.at(-1).parts){
  assert.ok(!c.circleHitsRect(c.p.x,c.p.y,14,q),'keep player clear');
  for(const o of obstacles)assert.ok(!overlap(q,o,2),'no obstacle overlap');
  assert.ok(q.x>=6&&q.x+q.w<=c.WW-6&&q.y>=6&&q.y+q.h<=c.WH-6);
 }
}
test('open ground retains the original full wall and facing in eight directions',()=>{
 for(let i=0;i<8;i++){
  const c=harness();c.p.body=i*Math.PI/4;assert.equal(c.placeBuildWall(),true);safe(c,[]);
  const parts=c.builtWalls[0].parts;assert.equal(parts.length,i%2?7:1);
  if(!(i%2))assert.equal(Math.max(parts[0].w,parts[0].h),88);
 }
});
test('blocked default position moves to nearby free space around covers, cargo, water and headquarters',()=>{
 for(const type of ['covers','objects','water','base']){
  const c=harness(),o={x:548,y:450,w:30,h:100};if(type==='base')c.base=o;else c[type].push(o);
  assert.equal(c.placeBuildWall(),true,type);safe(c,[o]);
 }
});
test('narrow spaces shorten the wall instead of rejecting the skill',()=>{
 const c=harness(),walls=[{x:450,y:400,w:150,h:80},{x:450,y:520,w:150,h:80},{x:400,y:400,w:70,h:200},{x:570,y:400,w:80,h:200}];
 c.covers.push(...walls);assert.equal(c.placeBuildWall(),true);safe(c,walls);
 assert.ok(c.builtWalls[0].parts.every(q=>q.h<=36));
});
test('upper-floor edges and automatic door panels remain free, including open doors',()=>{
 const c=harness();c.stageMode='indoor';const door={x:540,y:480,w:12,h:40,indoorDoor:true,noHit:true};c.covers.push(door);
 assert.equal(c.placeBuildWall(),true);safe(c,[door]);
 for(const q of c.builtWalls[0].parts)assert.ok(q.x>=470&&q.x+q.w<=570&&q.y>=480&&q.y+q.h<=520);
});
test('an enclosed player cannot build through walls and failure adds nothing',()=>{
 const c=harness();c.covers.push({x:480,y:480,w:40,h:4},{x:480,y:516,w:40,h:4},{x:480,y:480,w:4,h:40},{x:516,y:480,w:4,h:40});
 assert.equal(c.placeBuildWall(),false);assert.equal(c.covers.length,4);assert.equal(c.builtWalls.length,0);
});
test('ten successful builds are allowed; the eleventh is rejected and destroyed walls free a slot',()=>{
 const c=harness();for(let i=0;i<10;i++){c.p.x=100+i*150;assert.equal(c.placeBuildWall(),true);}
 assert.equal(c.builtWalls.length,10);assert.equal(c.placeBuildWall(),false);assert.match(c.message,/10/);
 const gone=c.builtWalls[0].parts;c.covers=c.covers.filter(q=>!gone.includes(q));c.p.x=100;
 assert.equal(c.placeBuildWall(),true);assert.equal(c.builtWalls.length,10);
});
test('placement queries local obstacles only once per press',()=>{
 const c=harness();let coverQueries=0,objectQueries=0;
 c.coversInBox=()=>{coverQueries++;return[]};c.objectsInBox=()=>{objectQueries++;return[]};
 assert.equal(c.placeBuildWall(),true);assert.equal(coverQueries,1);assert.equal(objectQueries,1);
});
test('moving builds behind actual travel in eight directions, even when facing elsewhere',()=>{
 for(let i=0;i<8;i++){
  const c=harness(),angle=i*Math.PI/4;
  c.p.body=angle+Math.PI/2;c.p.buildMoveX=Math.cos(angle)*2;c.p.buildMoveY=Math.sin(angle)*2;
  assert.equal(c.placeBuildWall(),true);safe(c,[]);
  for(const q of c.builtWalls[0].parts)for(const x of [q.x,q.x+q.w])for(const y of [q.y,q.y+q.h])
   assert.ok((x-c.p.x)*Math.cos(angle)+(y-c.p.y)*Math.sin(angle)<0,'entire wall behind travel');
 }
});
test('stopping immediately restores front placement without remembering previous travel',()=>{
 const c=harness();c.p.buildMoveX=2;assert.equal(c.placeBuildWall(),true);
 assert.ok(c.builtWalls[0].parts.every(q=>q.x+q.w<c.p.x));
 c.p.buildMoveX=0;c.p.buildMoveY=0;assert.equal(c.placeBuildWall(),true);
 assert.ok(c.builtWalls[1].parts.every(q=>q.x>c.p.x));
});
test('rear obstruction adapts behind the player instead of switching to the front',()=>{
 const c=harness();c.p.buildMoveX=2;const obstacle={x:424,y:450,w:30,h:100};c.covers.push(obstacle);
 assert.equal(c.placeBuildWall(),true);safe(c,[obstacle]);
 assert.ok(c.builtWalls[0].parts.every(q=>q.x+q.w<c.p.x));
});
test('current-frame travel tracking includes wall slides and clears on a stationary frame',()=>{
 const start=html.indexOf(" if(skill==='build'){p.buildMoveX="),end=html.indexOf('\n',start);
 const c={skill:'build',p:{x:500,y:502},buildStartX:500,buildStartY:500};vm.createContext(c);
 vm.runInContext(html.slice(start,end),c);assert.equal(c.p.buildMoveX,0);assert.equal(c.p.buildMoveY,2);
 c.buildStartY=502;vm.runInContext(html.slice(start,end),c);assert.equal(c.p.buildMoveX,0);assert.equal(c.p.buildMoveY,0);
});
