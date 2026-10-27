// Cosmetic only: bounded snapshots, independent of actors, collision, AI and scoring.
const FALLEN_ENEMY_LIMIT=80,FALLEN_ENEMY_SIZE=44,ENEMY_CRY_FLIGHT_DURATION=.65,ENEMY_CRY_LIFETIME=10;
const fallenEnemyArt={},fallenEnemies=[];
function loadFallenEnemyArtwork(){
 for(const pose of ['cry-flying','cry-sitting','supine'])if(!fallenEnemyArt[pose])fallenEnemyArt[pose]=makeAssetImage('assets/characters/fallen/'+pose+'.webp');
}
function clearFallenEnemies(){fallenEnemies.length=0;}
function noteEnemyFallHit(h,dx,dy){
 if(!h||h.fallenSpriteRecorded||h.frontRetired||!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.001)return;
 h.fallImpactAngle=Math.atan2(dy,dx);
}
function rememberFallenEnemy(h){
 if(!h||h.alive||h.frontRetired||h.fallenSpriteRecorded||!Number.isFinite(h.x)||!Number.isFinite(h.y))return;
 h.fallenSpriteRecorded=true;
 const impact=h.fallImpactAngle??h.sniperFallA,angle=Number.isFinite(impact)?impact:Number.isFinite(h.face)?h.face:0;
 fallenEnemies.push({x:h.x,y:h.y,dx:Math.cos(angle)*18,dy:Math.sin(angle)*18,flip:Math.cos(angle)<0?-1:1,age:0,floor:stageMode==='indoor'?(h.indoorFloor??indoorWorld?.currentFloor??0):null});
 if(fallenEnemies.length>FALLEN_ENEMY_LIMIT)fallenEnemies.shift();
}
function updateFallenEnemies(dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 for(let i=fallenEnemies.length-1;i>=0;i--){
  const body=fallenEnemies[i];body.age+=dt;
  if(body.age>=ENEMY_CRY_LIFETIME)fallenEnemies.splice(i,1);
 }
}
function drawFallenEnemies(cx,cy){
 for(let i=fallenEnemies.length-1;i>=0;i--){
  const body=fallenEnemies[i];
  const sameFloor=body.floor===null?stageMode!=='indoor':stageMode==='indoor'&&body.floor===indoorWorld?.currentFloor;
  const t=Math.min(1,body.age/ENEMY_CRY_FLIGHT_DURATION),flying=t<1,lift=flying?Math.sin(Math.PI*t)*36:0;
  const x=body.x+body.dx*t,y=body.y+body.dy*t-lift,size=FALLEN_ENEMY_SIZE*(flying?1.10:.95),radius=size*.6;
  if(!sameFloor||x+radius<cx||x-radius>cx+W||y+radius<cy||y-radius>cy+H){fallenEnemies.splice(i,1);continue;}
  const im=fallenEnemyArt[flying?'cry-flying':'cry-sitting'];if(!assetOK(im))continue;
  const scale=size/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;
  g.save();g.translate(x,y);if(flying)g.rotate(body.flip*Math.sin(Math.PI*t)*.18);if(body.flip<0)g.scale(-1,1);g.imageSmoothingEnabled=true;g.drawImage(im,-w/2,-h/2,w,h);g.restore();
 }
}
function drawStunnedEnemy(x,y,face,size=FALLEN_ENEMY_SIZE*1.15){
 const im=fallenEnemyArt.supine;if(!assetOK(im))return false;
 const scale=size/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;
 g.save();g.translate(x,y);g.rotate(face);g.imageSmoothingEnabled=true;g.drawImage(im,-w/2,-h/2,w,h);g.restore();return true;
}

// The scope has its own projected character layer; keep the same gentle reaction there.
function drawScopedCryingEnemy(h,x,y,size){
 const t=Math.min(1,Math.max(0,(h.sniperFallMax||.72)-(h.sniperFallT||0))/ENEMY_CRY_FLIGHT_DURATION),flying=t<1;
 const im=fallenEnemyArt[flying?'cry-flying':'cry-sitting'];if(!assetOK(im))return false;
 const scale=size*(flying?1.10:.95)/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*scale,height=im.naturalHeight*scale;
 g.save();g.translate(x,y-(flying?Math.sin(Math.PI*t)*size*.3:0));if(Number.isFinite(h.sniperFallA)&&Math.cos(h.sniperFallA)<0)g.scale(-1,1);g.imageSmoothingEnabled=true;g.drawImage(im,-w/2,-height/2,w,height);g.restore();return true;
}
