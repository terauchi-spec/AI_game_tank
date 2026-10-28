// Original compact, round tank illustrations, with small per-model details.
// Cache only two layers per type; gameplay and vehicle definitions stay in main.
const PLAYER_TANK_ART={
 t34:{barrel:1.72},tiger:{barrel:1.82},type10:{barrel:2.08},m1:{barrel:2.0},
 sherman:{barrel:1.58},churchill:{barrel:1.62},kingtiger:{barrel:2.22}
};
const playerTankArtCache=new Map();
function paintPlayerTankArt(q,id,layer){
 const tank=TYPES.find(t=>t.id===id);
 q.save();q.scale(1/32,1/32);
 drawOriginalTankShape(0,0,-Math.PI/2,-Math.PI/2,tank,32,layer,q,true);
 q.restore();
}
function playerTankArtSprites(id){
 let cached=playerTankArtCache.get(id);if(cached)return cached;
 const make=layer=>{
  const a=PLAYER_TANK_ART[id],bounds=layer==='hull'?{x:-1.18,y:-1.60,w:2.36,h:3.20}:{x:-.85,y:-a.barrel-.25,w:1.70,h:a.barrel+1.10};
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(bounds.w*32);canvas.height=Math.ceil(bounds.h*32);
  const q=gameCanvasContext(canvas);q.scale(32,32);q.translate(-bounds.x,-bounds.y);paintPlayerTankArt(q,id,layer);
  return{canvas,x:bounds.x,y:bounds.y,w:canvas.width/32,h:canvas.height/32};
 };
 cached={hull:make('hull'),turret:make('turret')};playerTankArtCache.set(id,cached);return cached;
}
function drawPlayerTankArt(x,y,body,ang,id,sz,layer,trackPhase=null){
 const art=playerTankArtSprites(id);
 const stamp=sprite=>drawStaticRaster(sprite.canvas,sprite.x*sz,sprite.y*sz,sprite.w*sz,sprite.h*sz);
 if(layer!=='turret'){g.save();g.translate(x,y);g.rotate(body+Math.PI/2);drawPlayerTankTracks(id,sz,Number.isFinite(trackPhase)?trackPhase:0);stamp(art.hull);g.restore();}
 if(layer!=='hull'){g.save();g.translate(x,y);g.rotate(ang+Math.PI/2);stamp(art.turret);g.restore();}
}

// One shared strip, not extra full hull frames. Source cropping moves full-width belts beneath the cached wheels and hull.
let playerTankTrackStrip=null;
function drawPlayerTankTracks(id,sz,phase){
 if(!playerTankTrackStrip){
  const c=document.createElement('canvas');c.width=8;c.height=96;
  const q=gameCanvasContext(c);q.fillStyle='#2f3338';q.fillRect(0,0,8,96);
  q.fillStyle='#7b858d';for(let y=0;y<96;y+=8)q.fillRect(0,y,8,2);
  q.fillStyle='#181b20';for(let y=3;y<96;y+=8)q.fillRect(0,y,8,2);
  playerTankTrackStrip=c;
 }
 const length=id==='churchill'?1.16:1,sourceHeight=2.12*32*length,top=-sz*1.06*length,height=sz*2.12*length;
 const offset=((phase%8)+8)%8;
 drawStaticRaster(playerTankTrackStrip,0,offset,8,sourceHeight,-sz*.98,top,sz*.42,height);
 drawStaticRaster(playerTankTrackStrip,0,offset,8,sourceHeight,sz*.56,top,sz*.42,height);
}
function playerTankTrackPhase(v,x,y,body){
 if(!v?.t||!PLAYER_TANK_ART[v.t.id])return null;
 const dx=Number.isFinite(v.trackDrawX)?x-v.trackDrawX:0,dy=Number.isFinite(v.trackDrawY)?y-v.trackDrawY:0;
 v.trackDrawX=x;v.trackDrawY=y;
 if(typeof state!=='undefined'&&state!=='play')return v.trackPhase??null;
 const distance=Math.hypot(dx,dy);
 // Ignore teleports and turning in place; animation follows real movement, including inertia.
 if(distance>.01&&distance<128&&v.f>0){
  const direction=dx*Math.cos(body)+dy*Math.sin(body)>=0?1:-1;
  v.trackPhase=(((v.trackPhase||0)+distance*.5*direction)%8+8)%8;
 }
 return v.trackPhase??null;
}
