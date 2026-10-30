// Cosmetic only: bounded snapshots, independent of actors, collision, AI and scoring.
const FALLEN_ENEMY_LIMIT=80,FALLEN_ENEMY_SIZE=44,ENEMY_CRY_FLIGHT_DURATION=.65,ENEMY_CRY_LIFETIME=10;
const ENEMY_CRY_FLY_SCALE=1.10*1.10,ENEMY_CRY_SIT_SCALE=.95*.95;
// Source frames exclude generated transparent padding (alpha >=32 bounds plus a 2px fringe).
// Blue artwork's solid longest edge is 188px on a 192px canvas; use the same visible extent.
// Precomputed offline: never scan pixels, crop images or allocate canvases during gameplay.
const FALLEN_CRY_FRAMES={
 white:{'cry-flying':{x:1,y:7,w:252,h:211,solid:248},'cry-sitting':{x:39,y:22,w:201,h:190,solid:197}},
 ally:{'cry-flying':{x:1,y:1,w:254,h:214,solid:250},'cry-sitting':{x:33,y:3,w:216,h:207,solid:212}}
};
const fallenEnemyArt={},fallenEnemies=[];
function drawCryingSoldier(im,pose,variant,size){
 const frame=FALLEN_CRY_FRAMES[variant]?.[pose];
 if(frame){
  const scale=size*(188/192)/frame.solid,w=frame.w*scale,h=frame.h*scale;
  g.drawImage(im,frame.x,frame.y,frame.w,frame.h,-w/2,-h/2,w,h);
 }else{
  // Keep the reference blue sprites exactly as before.
  const scale=size/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;
  g.drawImage(im,-w/2,-h/2,w,h);
 }
}
function loadFallenEnemyArtwork(){
 for(const variant of ['blue','white','ally'])for(const pose of ['cry-flying','cry-sitting','supine']){
  const key=variant==='blue'?pose:variant+'-'+pose;
  if(!fallenEnemyArt[key])fallenEnemyArt[key]=makeAssetImage('assets/characters/fallen/'+key+'.webp');
 }
}
function fallenSoldierVariant(h){return h?.elite||h?.commander==='white'?'white':'blue';}
function fallenSoldierArt(pose,variant='blue'){return fallenEnemyArt[variant==='blue'?pose:variant+'-'+pose];}
// Record combat losses immediately, before the ally list removes defeated actors.
function rememberFallenAlly(a,dx,dy){
 if(!a||a.alive)return;
 noteEnemyFallHit(a,dx,dy);rememberFallenEnemy(a,'ally');
}
function clearFallenEnemies(){fallenEnemies.length=0;}
function noteEnemyFallHit(h,dx,dy){
 if(!h||h.fallenSpriteRecorded||h.frontRetired||!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.001)return;
 h.fallImpactAngle=Math.atan2(dy,dx);
}
function rememberFallenEnemy(h,variant=fallenSoldierVariant(h)){
 if(!h||h.alive||h.frontRetired||h.fallenSpriteRecorded||!Number.isFinite(h.x)||!Number.isFinite(h.y))return;
 h.fallenSpriteRecorded=true;
 const impact=h.fallImpactAngle??h.sniperFallA,angle=Number.isFinite(impact)?impact:Number.isFinite(h.face)?h.face:0;
 fallenEnemies.push({variant,x:h.x,y:h.y,dx:Math.cos(angle)*18,dy:Math.sin(angle)*18,flip:Math.cos(angle)<0?-1:1,age:0,floor:stageMode==='indoor'?(h.indoorFloor??indoorWorld?.currentFloor??0):null});
 if(fallenEnemies.length>FALLEN_ENEMY_LIMIT)fallenEnemies.shift();
}
function updateFallenEnemies(dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 for(let i=fallenEnemies.length-1;i>=0;i--){
  const body=fallenEnemies[i];body.age+=dt;
  if(body.age>=ENEMY_CRY_LIFETIME){
   const sameFloor=body.floor===null?stageMode!=='indoor':stageMode==='indoor'&&body.floor===indoorWorld?.currentFloor;
   if(sameFloor)burst(body.x+body.dx,body.y+body.dy,18,'#8fd7ff',180);
   fallenEnemies.splice(i,1);
  }
 }
}
function drawFallenEnemies(cx,cy){
 for(let i=fallenEnemies.length-1;i>=0;i--){
  const body=fallenEnemies[i];
  const sameFloor=body.floor===null?stageMode!=='indoor':stageMode==='indoor'&&body.floor===indoorWorld?.currentFloor;
  const t=Math.min(1,body.age/ENEMY_CRY_FLIGHT_DURATION),flying=t<1,lift=flying?Math.sin(Math.PI*t)*36:0;
  const x=body.x+body.dx*t,y=body.y+body.dy*t-lift,size=FALLEN_ENEMY_SIZE*(flying?ENEMY_CRY_FLY_SCALE:ENEMY_CRY_SIT_SCALE),radius=size*.6;
  if(!sameFloor||x+radius<cx||x-radius>cx+W||y+radius<cy||y-radius>cy+H){fallenEnemies.splice(i,1);continue;}
  const pose=flying?'cry-flying':'cry-sitting',im=fallenSoldierArt(pose,body.variant);if(!assetOK(im))continue;
  g.save();g.translate(x,y);if(flying)g.rotate(body.flip*Math.sin(Math.PI*t)*.18);if(body.flip<0)g.scale(-1,1);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';drawCryingSoldier(im,pose,body.variant,size);g.restore();
 }
}
function drawStunnedEnemy(x,y,face,size=FALLEN_ENEMY_SIZE*1.15,variant='blue'){
 const im=fallenSoldierArt('supine',variant);if(!assetOK(im))return false;
 const scale=size*1.10/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;
 g.save();g.translate(x,y);g.rotate(face);g.imageSmoothingEnabled=true;g.drawImage(im,-w/2,-h/2,w,h);g.restore();return true;
}

// The scope has its own projected character layer; keep the same gentle reaction there.
function drawScopedCryingEnemy(h,x,y,size){
 const t=Math.min(1,Math.max(0,(h.sniperFallMax||.72)-(h.sniperFallT||0))/ENEMY_CRY_FLIGHT_DURATION),flying=t<1;
 const pose=flying?'cry-flying':'cry-sitting',variant=fallenSoldierVariant(h),im=fallenSoldierArt(pose,variant);if(!assetOK(im))return false;
 g.save();g.translate(x,y-(flying?Math.sin(Math.PI*t)*size*.3:0));if(Number.isFinite(h.sniperFallA)&&Math.cos(h.sniperFallA)<0)g.scale(-1,1);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';drawCryingSoldier(im,pose,variant,size*(flying?ENEMY_CRY_FLY_SCALE:ENEMY_CRY_SIT_SCALE));g.restore();return true;
}
