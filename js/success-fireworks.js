// Reuse cannon-impact bursts in a bounded, screen-space celebration.
const successFireworks={frame:null,particles:[],startedAt:null,lastAt:null,next:0};
const SUCCESS_FIREWORK_BURSTS=[
 [.15,.18,.24,'#ff70b4','#ffe391'],
 [.45,.78,.20,'#62caff','#a1fff3'],
 [.75,.48,.12,'#c497ff','#ff9bdd'],
 [1.05,.22,.60,'#ffb65e','#fff29b'],
 [1.35,.81,.55,'#71f7b0','#9edbff']
];
function stopSuccessFireworks(){
 if(successFireworks.frame!==null)cancelAnimationFrame(successFireworks.frame);
 successFireworks.frame=null;successFireworks.particles.length=0;
 successFireworks.startedAt=null;successFireworks.lastAt=null;
}
function emitSuccessFirework(event,canvas,sound=true){
 const [,x,y,primary,secondary]=event,particles=successFireworks.particles;
 const speed=Math.min(canvas.width,canvas.height)*.792;
 // Three layers follow the cannon impact's coloured spray and white-hot core.
 burst(x*canvas.width,y*canvas.height,54,primary,speed,particles,Math.random);
 burst(x*canvas.width,y*canvas.height,28,secondary,speed*1.28,particles,Math.random);
 burst(x*canvas.width,y*canvas.height,10,'#ffffff',speed*1.46,particles,Math.random);
 if(particles.length>320)particles.splice(0,particles.length-320);
 if(sound)sfx('firework');
}
function paintSuccessFireworks(context,canvas,dt){
 context.clearRect(0,0,canvas.width,canvas.height);
 context.save();context.globalCompositeOperation='lighter';
 const particles=successFireworks.particles,drag=Math.pow(.93,dt*60);
 let alive=0;
 for(const particle of particles){
  particle.life-=dt;if(particle.life<=0)continue;
  const x=particle.x,y=particle.y;
  particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;
  particle.vx*=drag;particle.vy=particle.vy*drag+45*dt;
  context.globalAlpha=Math.min(1,particle.life*2);
  context.strokeStyle=context.fillStyle=particle.col;context.lineWidth=1.4;
  context.beginPath();context.moveTo(x,y);context.lineTo(particle.x-particle.vx*.025,particle.y-particle.vy*.025);context.stroke();
  context.fillRect(particle.x-1.5,particle.y-1.5,3,3);
  particles[alive++]=particle;
 }
 particles.length=alive;context.restore();
}
function syncSuccessFireworks(active){
 stopSuccessFireworks();
 const canvas=document.getElementById('missionFireworks');
 if(!canvas)return;
 const context=gameCanvasContext(canvas);
 context.clearRect(0,0,canvas.width,canvas.height);
 if(!active)return;
 const bounds=canvas.getBoundingClientRect();
 canvas.width=Math.max(1,Math.round(Math.min(bounds.width||W,720)));
 canvas.height=Math.max(1,Math.round(canvas.width*(bounds.height||H)/(bounds.width||W)));
 successFireworks.next=0;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){
  for(const event of SUCCESS_FIREWORK_BURSTS)emitSuccessFirework(event,canvas,false);
  paintSuccessFireworks(context,canvas,.28);return;
 }
 const frame=now=>{
  successFireworks.frame=null;
  if(state!=='succeeded'||document.visibilityState==='hidden'){stopSuccessFireworks();return;}
  if(successFireworks.startedAt===null)successFireworks.startedAt=now;
  const elapsed=(now-successFireworks.startedAt)/1000;
  if(successFireworks.lastAt!==null&&now-successFireworks.lastAt<1000/30){
   successFireworks.frame=requestAnimationFrame(frame);return;
  }
  const dt=successFireworks.lastAt===null?0:Math.min(.05,(now-successFireworks.lastAt)/1000);
  successFireworks.lastAt=now;
  while(successFireworks.next<SUCCESS_FIREWORK_BURSTS.length&&elapsed>=SUCCESS_FIREWORK_BURSTS[successFireworks.next][0]){
   emitSuccessFirework(SUCCESS_FIREWORK_BURSTS[successFireworks.next++],canvas);
  }
  paintSuccessFireworks(context,canvas,dt);
  if(successFireworks.next<SUCCESS_FIREWORK_BURSTS.length||successFireworks.particles.length){
   successFireworks.frame=requestAnimationFrame(frame);
  }
 };
 successFireworks.frame=requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden')syncSuccessFireworks(false);
});
