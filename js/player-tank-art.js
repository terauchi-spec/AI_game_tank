// Painted hulls and independently rotating turrets share the existing pixel tracks.
// Cache only two layers per type; gameplay and vehicle definitions stay in main.
const PLAYER_TANK_ART={
 t34:{barrel:1.72,pivot:.6636771300,hullHeightPixels:467,turretWidthPixels:237,trackPixels:{width:84,span:363,height:472}},
 tiger:{barrel:1.82,pivot:.7246753247,hullHeightPixels:367,turretWidthPixels:200,trackPixels:{width:53,span:285,height:367}},
 type10:{barrel:2.08,pivot:.7088452088,hullHeightPixels:389,turretWidthPixels:212,trackPixels:{width:53,span:286,height:389}},
 m1:{barrel:2.0,pivot:.7200956938,hullHeightPixels:392,turretWidthPixels:229,trackPixels:{width:52,span:286,height:393}},
 sherman:{barrel:1.58,pivot:.6785714286,hullHeightPixels:364,turretWidthPixels:215,trackPixels:{width:50,span:288,height:370}},
 churchill:{barrel:1.62,pivot:.6689944134,hullHeightPixels:440,turretWidthPixels:221,trackPixels:{width:40,span:291,height:436}},
 kingtiger:{barrel:2.22,pivot:.6902439024,hullHeightPixels:410,turretWidthPixels:221,trackPixels:{width:50,span:286,height:410}}
};
// Scale all parts from each sample's pixel measurements, once at startup.
for(const art of Object.values(PLAYER_TANK_ART)){
 const scale=2.12/art.hullHeightPixels;
 art.turretWidth=art.turretWidthPixels*scale;
 art.trackWidth=art.trackPixels.width*scale;
 art.trackHalfSpan=art.trackPixels.span*scale/2;
 art.trackHeight=art.trackPixels.height*scale;
 // Legacy track rims span -1.05 to +1.05; scale the entire design to that width.
 art.displayScale=2.10/(art.trackHalfSpan*2+.14);
}
const ENEMY_TANK_ART={id:'enemy',col:'#4b5f9e',barrel:1.8,trackWidth:.42,trackHalfSpan:.98,trackHeight:2.12};
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
function paintPlayerTankTrackRims(q,id){
 const art=PLAYER_TANK_ART[id];
 const left=-32*art.trackHalfSpan,right=32*(art.trackHalfSpan-art.trackWidth);
 const width=32*art.trackWidth,top=-16*art.trackHeight,height=32*art.trackHeight;
 const alpha=q.globalAlpha;
 q.globalAlpha=alpha*.22;q.fillStyle='#000';q.beginPath();q.ellipse(0,32*.08,32*art.trackHalfSpan*1.12,height*.61,0,0,6.28);q.fill();q.globalAlpha=alpha;
 q.strokeStyle='#090909';q.lineWidth=32*.07;
 q.strokeRect(left-32*.035,top-32*.035,width+32*.07,height+32*.07);
 q.strokeRect(right-32*.035,top-32*.035,width+32*.07,height+32*.07);
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
 else if(layer==='hull')paintPlayerTankTrackRims(q,id);
 if(image){
  q.imageSmoothingEnabled=true;q.imageSmoothingQuality='high';
  const art=PLAYER_TANK_ART[id],turretWidth=id==='enemy'?1.24:art.turretWidth;
  const height=layer==='hull'&&art?32*2.12:32*turretWidth*image.naturalHeight/image.naturalWidth;
  const width=height*image.naturalWidth/image.naturalHeight;
  // Each cutout rotates about its housing centre, below the projecting barrel.
  const pivot=id==='enemy'?(1025-63)/(1331-63):PLAYER_TANK_ART[id].pivot;
  const y=layer==='hull'?-height/2:-height*pivot;
  if(id==='enemy'&&layer==='turret'){
   // Compress only the projecting barrel; its attachment and turret pivot stay fixed.
   const barrelPixels=image.naturalHeight*200/384,barrelHeight=height*200/384;
   q.drawImage(image,0,0,image.naturalWidth,barrelPixels,-width/2,y+barrelHeight*.05,width,barrelHeight*.95);
   q.save();q.beginPath();q.rect(-width,y+barrelHeight,width*2,height);q.clip();
   q.drawImage(image,-width/2,y,width,height);q.restore();
  }else if(id==='type10'&&layer==='turret'){
   // Enlarge the projecting barrel around its fixed attachment point.
   const barrelPixels=image.naturalHeight*106/256,barrelHeight=height*106/256;
   q.drawImage(image,0,0,image.naturalWidth,barrelPixels,-width*.75,y-barrelHeight*.2,width*1.5,barrelHeight*1.2);
   q.save();q.beginPath();q.rect(-width,y+barrelHeight,width*2,height);q.clip();
   q.drawImage(image,-width/2,y,width,height);q.restore();
  }else q.drawImage(image,-width/2,y,width,height);
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
 sz*=PLAYER_TANK_ART[id]?.displayScale||1;
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
 const art=PLAYER_TANK_ART[id]||ENEMY_TANK_ART;
 const sourceHeight=art.trackHeight*32,top=-sz*art.trackHeight/2,height=sz*art.trackHeight;
 const offset=((phase%8)+8)%8;
 drawStaticRaster(playerTankTrackStrip,0,offset,8,sourceHeight,-sz*art.trackHalfSpan,top,sz*art.trackWidth,height);
 drawStaticRaster(playerTankTrackStrip,0,((rightPhase%8)+8)%8,8,sourceHeight,sz*(art.trackHalfSpan-art.trackWidth),top,sz*art.trackWidth,height);
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
