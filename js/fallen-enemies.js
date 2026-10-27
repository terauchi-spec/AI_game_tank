// Cosmetic only: no actors, collision, AI, scoring or per-frame timers in this bounded ground layer.
const FALLEN_ENEMY_LIMIT=80,FALLEN_ENEMY_SIZE=44;
const fallenEnemyArt={},fallenEnemies=[];
function loadFallenEnemyArtwork(){
 for(const pose of ['supine','prone','side'])if(!fallenEnemyArt[pose])fallenEnemyArt[pose]=makeAssetImage('assets/characters/fallen/'+pose+'.webp');
}
function clearFallenEnemies(){fallenEnemies.length=0;}
function noteEnemyFallHit(h,dx,dy){
 if(!h||h.fallenSpriteRecorded||h.frontRetired||!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<.001)return;
 h.fallImpactAngle=Math.atan2(dy,dx);
}
function enemyFallPose(face,impact){
 const facing=Number.isFinite(face)?face:0,angle=Number.isFinite(impact)?impact:facing,dot=Math.cos(angle-facing);
 if(dot<-.5)return{pose:'supine',angle:facing-Math.PI/2,flip:1};
 if(dot>.5)return{pose:'prone',angle:facing+Math.PI/2,flip:1};
 return{pose:'side',angle:facing+Math.PI,flip:Math.sin(angle-facing)<0?-1:1};
}
function rememberFallenEnemy(h){
 if(!h||h.alive||h.frontRetired||h.fallenSpriteRecorded||!Number.isFinite(h.x)||!Number.isFinite(h.y))return;
 h.fallenSpriteRecorded=true;
 const pose=enemyFallPose(h.face,h.fallImpactAngle??h.sniperFallA);
 fallenEnemies.push({x:h.x,y:h.y,...pose,floor:stageMode==='indoor'?(h.indoorFloor??indoorWorld?.currentFloor??0):null});
 if(fallenEnemies.length>FALLEN_ENEMY_LIMIT)fallenEnemies.shift();
}
function drawFallenEnemies(cx,cy){
 for(const body of fallenEnemies){
  if(body.floor!==null&&(stageMode!=='indoor'||body.floor!==indoorWorld?.currentFloor))continue;
  if(body.floor===null&&stageMode==='indoor')continue;
  if(body.x<cx-50||body.x>cx+W+50||body.y<cy-50||body.y>cy+H+50)continue;
  const im=fallenEnemyArt[body.pose];if(!assetOK(im))continue;
  const scale=FALLEN_ENEMY_SIZE/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;
  g.save();g.translate(body.x,body.y);g.rotate(body.angle);if(body.flip<0)g.scale(1,-1);g.imageSmoothingEnabled=true;g.drawImage(im,-w/2,-h/2,w,h);g.restore();
 }
}
