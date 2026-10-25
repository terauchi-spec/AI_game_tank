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
 drawOriginalTankShape(0,0,-Math.PI/2,-Math.PI/2,tank,32,layer,q);
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
function drawPlayerTankArt(x,y,body,ang,id,sz,layer){
 const art=playerTankArtSprites(id);
 const stamp=sprite=>drawStaticRaster(sprite.canvas,sprite.x*sz,sprite.y*sz,sprite.w*sz,sprite.h*sz);
 if(layer!=='turret'){g.save();g.translate(x,y);g.rotate(body+Math.PI/2);stamp(art.hull);g.restore();}
 if(layer!=='hull'){g.save();g.translate(x,y);g.rotate(ang+Math.PI/2);stamp(art.turret);g.restore();}
}
