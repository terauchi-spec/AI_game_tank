const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {createGameEngine}=require('./helpers/game-engine.cjs');

test('local companion danger scoring preserves exact scores and live visibility with large distant armies',()=>{
 const h=createGameEngine(path.join(__dirname,'..'));
 const result=h.run(`(()=>{
  humans=Array.from({length:1000},(_,i)=>({x:100+(i%10)*70,y:i<20?400+Math.floor(i/10)*80:2000+i*15,alive:i%7!==0,stun:i%13===0?1:0,st:i%3===0}));
  etanks=Array.from({length:100},(_,i)=>({x:100+(i%10)*70,y:i<10?500:4000+i*40,alive:i%7!==0,st:i%3===0}));
  const options=[{x:300,y:450},{x:500,y:450},{x:400,y:520},{x:310,y:490}];
  const minX=300,maxX=500,minY=450,maxY=520;
  const localHumans=humans.filter(h=>h.alive&&!(h.stun>0)&&h.x>=minX-270&&h.x<=maxX+270&&h.y>=minY-270&&h.y<=maxY+270);
  const localTanks=etanks.filter(e=>e.alive&&e.x>=minX-340&&e.x<=maxX+340&&e.y>=minY-340&&e.y<=maxY+340);
  // Include just-inside, exact-boundary and just-outside threats.
  for(const d of [269.999,270,270.001]){const enemy={x:300-d,y:450,alive:true};humans.push(enemy);if(enemy.x>=minX-270)localHumans.push(enemy);}
  let calls=0;const hypot=Math.hypot;Math.hypot=(...args)=>{calls++;return hypot(...args);};
  let equal=true;
  for(const visible of [true,false]){
   los=()=>visible;
   for(const c of options)if(partnerDangerAt(c.x,c.y)!==partnerDangerAt(c.x,c.y,localHumans,localTanks))equal=false;
  }
  calls=0;for(const c of options)partnerDangerAt(c.x,c.y);const full=calls;
  calls=0;for(const c of options)partnerDangerAt(c.x,c.y,localHumans,localTanks);const local=calls;
  Math.hypot=hypot;return {equal,full,local};
 })()`);
 assert.equal(result.equal,true);
 assert.ok(result.local<result.full/10,JSON.stringify(result));
});
