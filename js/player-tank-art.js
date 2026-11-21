// Painted hulls and independently rotating turrets share the existing pixel tracks.
// Cache only two layers per type; gameplay and vehicle definitions stay in main.
const PLAYER_TANK_ART={
 t34:{barrel:1.72,pivot:.6636771300},tiger:{barrel:1.82,pivot:.7246753247},
 type10:{barrel:2.08,pivot:.7088452088,skirts:true},m1:{barrel:2.0,pivot:.7200956938,skirts:true},
 sherman:{barrel:1.58,pivot:.6785714286},churchill:{barrel:1.62,pivot:.6689944134,skirts:true},
 kingtiger:{barrel:2.22,pivot:.6902439024,skirts:true}
};
const ENEMY_TANK_ART={id:'enemy',col:'#4b5f9e',barrel:1.8};
const playerTankArtCache=new Map();
const enemyTankGraphics=new Map(),playerTankGraphics=new Map();
function invalidateTankArtwork(id){
 const art=playerTankArtCache.get(id);
 if(art&&typeof invalidateStaticRaster==='function'){
  invalidateStaticRaster(art.hull.canvas);invalidateStaticRaster(art.turret.canvas);
 }
 playerTankArtCache.delete(id);
}
function playerTankGraphic(id,layer){
 const key=id+'/'+layer;
 let image=playerTankGraphics.get(key);
 if(!image){
  image=new Image();image.decoding='async';
  image.onload=()=>invalidateTankArtwork(id);
  image.src='assets/vehicles/player/'+key+'.webp';
  playerTankGraphics.set(key,image);
 }
 return image.complete&&image.naturalWidth>0?image:null;
}
function loadPlayerTankArtwork(){
 for(const id of Object.keys(PLAYER_TANK_ART)){
  playerTankGraphic(id,'hull');playerTankGraphic(id,'turret');
 }
}
function paintPlayerTankTrackRims(q){
 const alpha=q.globalAlpha;
 q.globalAlpha=alpha*.22;q.fillStyle='#000';q.beginPath();q.ellipse(0,32*.08,32*1.12,32*1.38,0,0,6.28);q.fill();q.globalAlpha=alpha;
 q.strokeStyle='#090909';q.lineWidth=32*.07;
 q.strokeRect(-32*1.015,-32*1.095,32*.49,32*2.19);
 q.strokeRect(32*.525,-32*1.095,32*.49,32*2.19);
}
function enemyTankGraphic(layer){
 let image=enemyTankGraphics.get(layer);
 if(!image){
  image=new Image();image.decoding='async';
  image.onload=()=>invalidateTankArtwork('enemy');
  image.src='assets/vehicles/enemy/'+layer+'.webp';
  enemyTankGraphics.set(layer,image);
 }
 return image.complete&&image.naturalWidth>0?image:null;
}
function paintPlayerTankArt(q,id,layer){
 const tank=id==='enemy'?ENEMY_TANK_ART:TYPES.find(t=>t.id===id);
 const image=id==='enemy'?enemyTankGraphic(layer):playerTankGraphic(id,layer);
 q.save();q.scale(1/32,1/32);
 // Keep the animated belt interiors clear beneath the painted hull.
 if(!image||id==='enemy'&&layer==='hull')drawOriginalTankShape(0,0,-Math.PI/2,-Math.PI/2,tank,32,layer,q,true);
 else if(layer==='hull')paintPlayerTankTrackRims(q);
 if(image){
  q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';
  const height=layer==='hull'&&id!=='enemy'?32*1.94:32*1.24*image.naturalHeight/image.naturalWidth;
  const width=height*image.naturalWidth/image.naturalHeight;
  // Each cutout rotates about its housing centre, below the projecting barrel.
  const pivot=id==='enemy'?(1025-63)/(1331-63):PLAYER_TANK_ART[id].pivot;
  const y=layer==='hull'?-height/2:-height*pivot;
  if(layer==='hull'&&id!=='enemy'&&PLAYER_TANK_ART[id].skirts){
   // Extend the existing edge panels over the inner belts, leaving both outer strips exposed.
   const panelWidth=image.naturalWidth*.14,sy=image.naturalHeight*.1,sh=image.naturalHeight*.8;
   q.drawImage(image,0,sy,panelWidth,sh,-32*.8,-32*.9,32*.25,32*1.8);
   q.drawImage(image,image.naturalWidth-panelWidth,sy,panelWidth,sh,32*.55,-32*.9,32*.25,32*1.8);
  }
  q.drawImage(image,-width/2,y,width,height);
 }
 q.restore();
}
function playerTankArtSprites(id){
 let cached=playerTankArtCache.get(id);if(cached)return cached;
 const make=layer=>{
  const a=id==='enemy'?ENEMY_TANK_ART:PLAYER_TANK_ART[id],bounds=layer==='hull'?{x:-1.18,y:-1.60,w:2.36,h:3.20}:{x:-.85,y:-a.barrel-.25,w:1.70,h:a.barrel+(id==='enemy'?1.20:1.10)};
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(bounds.w*32);canvas.height=Math.ceil(bounds.h*32);
  const q=gameCanvasContext(canvas);q.scale(32,32);q.translate(-bounds.x,-bounds.y);paintPlayerTankArt(q,id,layer);
  return{canvas,x:bounds.x,y:bounds.y,w:canvas.width/32,h:canvas.height/32};
 };
 cached={hull:make('hull'),turret:make('turret')};playerTankArtCache.set(id,cached);return cached;
}
function drawPlayerTankArt(x,y,body,ang,id,sz,layer,trackPhase=null,trackTurn=0){
 const art=playerTankArtSprites(id);
 const stamp=sprite=>drawStaticRaster(sprite.canvas,sprite.x*sz,sprite.y*sz,sprite.w*sz,sprite.h*sz);
 if(layer!=='turret'){g.save();g.translate(x,y);g.rotate(body+Math.PI/2);drawPlayerTankTracks(id,sz,(Number.isFinite(trackPhase)?trackPhase:0)+trackTurn,(Number.isFinite(trackPhase)?trackPhase:0)-trackTurn);stamp(art.hull);g.restore();}
 if(layer!=='hull'){g.save();g.translate(x,y);g.rotate(ang+Math.PI/2);stamp(art.turret);g.restore();}
}

// One shared strip, not extra full hull frames. Source cropping moves full-width belts beneath the cached hull and track covers.
let playerTankTrackStrip=null;
function drawPlayerTankTracks(id,sz,phase,rightPhase=phase){
 if(!playerTankTrackStrip){
  const c=document.createElement('canvas');c.width=8;c.height=96;
  const q=gameCanvasContext(c);q.fillStyle='#2f3338';q.fillRect(0,0,8,96);
  q.fillStyle='#7b858d';for(let y=0;y<96;y+=8)q.fillRect(0,y,8,2);
  q.fillStyle='#181b20';for(let y=3;y<96;y+=8)q.fillRect(0,y,8,2);
  playerTankTrackStrip=c;
 }
 const sourceHeight=2.12*32,top=-sz*1.06,height=sz*2.12;
 const offset=((phase%8)+8)%8;
 drawStaticRaster(playerTankTrackStrip,0,offset,8,sourceHeight,-sz*.98,top,sz*.42,height);
 drawStaticRaster(playerTankTrackStrip,0,((rightPhase%8)+8)%8,8,sourceHeight,sz*.56,top,sz*.42,height);
}
function playerTankTrackPhase(v,x,y,body){
 if(!v?.t||!PLAYER_TANK_ART[v.t.id])return null;
 return tankTrackPhase(v,x,y,body,v.f>0);
}
function tankTrackTurnPhase(vehicle,body){
 const delta=Number.isFinite(vehicle.trackDrawBody)?Math.atan2(Math.sin(body-vehicle.trackDrawBody),Math.cos(body-vehicle.trackDrawBody)):0;
 vehicle.trackDrawBody=body;
 // Counter-rotate the two belts during a pivot, using one shared strip.
 vehicle.trackTurnPhase=((vehicle.trackTurnPhase||0)+delta*12)%8;
 return vehicle.trackTurnPhase;
}
function drawEnemyTank(e){
 const turn=tankTrackTurnPhase(e,e.body),phase=tankTrackPhase(e,e.x,e.y,e.body,true);
 drawPlayerTankArt(e.x,e.y,e.body,e.ang,'enemy',TANK_DRAW,'both',phase,turn);
}
function tankTrackPhase(v,x,y,body,moving){
 const dx=Number.isFinite(v.trackDrawX)?x-v.trackDrawX:0,dy=Number.isFinite(v.trackDrawY)?y-v.trackDrawY:0;
 v.trackDrawX=x;v.trackDrawY=y;
 if(typeof state!=='undefined'&&state!=='play')return v.trackPhase??null;
 const distance=Math.hypot(dx,dy);
 // Ignore teleports and turning in place; animation follows real movement, including inertia.
 if(distance>.01&&distance<128&&moving){
  const direction=dx*Math.cos(body)+dy*Math.sin(body)>=0?1:-1;
  v.trackPhase=(((v.trackPhase||0)+distance*.5*direction)%8+8)%8;
 }
 return v.trackPhase??null;
}
