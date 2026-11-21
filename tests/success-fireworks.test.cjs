const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function setup(reduced=false){
 const frames=new Map(),sounds=[],draws=[],events={};
 let id=0;
 const context={clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(...args){draws.push(args);}};
 const canvas={width:480,height:720,getBoundingClientRect:()=>({width:390,height:720})};
 const gameplay=[{life:1}];
 const c={state:'succeeded',W:480,H:720,MAX_PARTS:240,parts:gameplay,R(){throw Error('game random must not change');},
  trimParts(){throw Error('game particles must not change');},gameCanvasContext:()=>context,
  document:{visibilityState:'visible',getElementById:()=>canvas,addEventListener:(type,fn)=>events[type]=fn},
  matchMedia:()=>({matches:reduced}),requestAnimationFrame(fn){frames.set(++id,fn);return id;},
  cancelAnimationFrame(id){frames.delete(id);},sfx:effect=>sounds.push(effect)};
 vm.createContext(c);
 const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
 vm.runInContext(source.split('\n').find(line=>line.startsWith('function burst(')),c);
 vm.runInContext(fs.readFileSync(path.join(root,'js/success-fireworks.js'),'utf8'),c);
 return {c,frames,sounds,draws,events,gameplay,run:code=>vm.runInContext(code,c),
  tick(now){const entries=[...frames.entries()];frames.clear();for(const [,fn] of entries)fn(now);}};
}
test('five colourful impact bursts finish, release their frame and preserve game particles and randomness',()=>{
 const h=setup();h.c.syncSuccessFireworks(true);
 let max=0;
 for(let now=0;now<3500;now+=17){h.tick(now);max=Math.max(max,h.run('successFireworks.particles.length'));}
 assert.equal(h.sounds.length,5);assert.ok(h.sounds.every(sound=>sound==='firework'));
 assert.ok(h.draws.length>100);assert.ok(max<=320);
 assert.equal(h.frames.size,0);assert.equal(h.run('successFireworks.particles.length'),0);
 assert.deepEqual(h.gameplay,[{life:1}]);
});
test('leaving success or hiding the tab cancels celebration work',()=>{
 for(const reason of ['state','visibility','close']){
  const h=setup();h.c.syncSuccessFireworks(true);h.tick(0);h.tick(170);
  if(reason==='state'){h.c.state='win';h.tick(210);}
  else if(reason==='visibility'){h.c.document.visibilityState='hidden';h.events.visibilitychange();}
  else h.c.syncSuccessFireworks(false);
  assert.equal(h.frames.size,0);assert.equal(h.run('successFireworks.particles.length'),0);
 }
});
test('reduced motion paints a still celebration without animation or extra sounds',()=>{
 const h=setup(true);h.c.syncSuccessFireworks(true);
 assert.equal(h.frames.size,0);assert.equal(h.sounds.length,0);
 assert.ok(h.draws.length>0);assert.ok(h.run('new Set(successFireworks.particles.map(p=>p.col)).size')>5);
});
