// Individual transparent WebP cutouts, not animation sheets. The textures are
// decoded once; cached cutout parts articulate limbs without frame atlases.
const CHARACTER_GRAPHICS_SCALE=.8; // Trial: 20% smaller artwork; gameplay radii stay unchanged.
const CHARACTER_GRAPHICS_MODE='webp'; // Set to 'legacy' to restore all original character drawing.
const CHARACTER_ART={},CHARACTER_GAIT=new WeakMap(),CHARACTER_LAYERS=new WeakMap(),CHARACTER_POSES=new WeakMap();
const CHARACTER_ART_NAMES=['player','blue','blue_commander','white','white_commander','rifle','launcher','scope_blue','scope_blue_commander','scope_white','scope_white_commander'];
function loadCharacterArtwork(){
 if(CHARACTER_GRAPHICS_MODE!=='webp')return;
 for(const name of CHARACTER_ART_NAMES)CHARACTER_ART[name]=makeAssetImage('assets/characters/'+name+'.webp?v='+GAME_VERSION,()=>{if(!name.startsWith('scope_')&&name!=='rifle'&&name!=='launcher'){prepareCharacterLayers(CHARACTER_ART[name]);if(name==='player')prepareAllyHelmetArtwork(CHARACTER_ART[name]);}});
}
// Cache allied helmet variants once at load time; no pixel work during play.
function prepareAllyHelmetArtwork(im){
 const w=im.naturalWidth,h=im.naturalHeight;
 for(const blue of [false,true]){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const q=canvas.getContext('2d');q.drawImage(im,0,0);
  const pixels=q.getImageData(0,0,w,h),d=pixels.data;
  for(let y=Math.floor(h*.38);y<h*.62;y++)for(let x=0;x<w;x++){
   if(((x/w-.60)/.34)**2+((y/h-.50)/.34)**2>1)continue;
   const i=(y*w+x)*4,r=d[i],green=d[i+1],b=d[i+2];
   if(r<=green*1.18||r<=b*1.20||r<45)continue;
   const light=r*.299+green*.587+b*.114;
   d[i]=Math.min(255,light*(blue?.55:1.08));
   d[i+1]=Math.min(255,light*(blue?1.35:1.12));
   d[i+2]=Math.min(255,light*(blue?2:.75));
  }
  q.putImageData(pixels,0,0);
  canvas.complete=true;canvas.naturalWidth=w;canvas.naturalHeight=h;
  CHARACTER_ART[blue?'player_blue':'player_plain']=canvas;
  prepareCharacterLayers(canvas);
 }
}
function characterArtKey(isPlayer,elite,commander){
 return isPlayer?'player':commander==='blue'?'blue_commander':commander==='white'?'white_commander':elite?'white':'blue';
}
function characterGait(actor,x,y,moving,now,jog=true){
 const cadence=jog?80:110,travelPhase=jog?.09:.065;
 if(!actor)return moving?Math.sin(now/cadence):0;
 let anim=CHARACTER_GAIT.get(actor);
 if(!anim){anim={x:actor.x,y:actor.y,phase:0,lastMove:-1e9,lastAt:now};CHARACTER_GAIT.set(actor,anim);return 0;}
 const elapsed=Math.max(0,now-anim.lastAt),distance=Math.hypot(actor.x-anim.x,actor.y-anim.y);
 anim.x=actor.x;anim.y=actor.y;anim.lastAt=now;
 // Shared running/stepping cadence follows actual travel distance. Distance
 // coupling stops the feet at walls; elapsed time prevents rapid foot flutter.
 if(moving&&distance>0&&distance<30){anim.phase+=Math.min(distance*travelPhase,elapsed/cadence);anim.lastMove=now;}
 return moving&&now-anim.lastMove<100?Math.sin(anim.phase):0;
}
function prepareCharacterLayers(im){
 const iw=im.naturalWidth,ih=im.naturalHeight;
 const copy=()=>{const c=document.createElement('canvas');c.width=iw;c.height=ih;c.getContext('2d').drawImage(im,0,0);return c;};
 // The overhead asset faces right. Boots are at the rear/left; fingertips
 // are at the forward top/bottom. Cache these layers ONCE at decode time.
 const boxes=[[0,.18,.24,.25],[0,.59,.24,.25],[.4,0,.6,.30],[.4,.70,.6,.30]];
 const core=copy(),parts=[];
 for(let i=0;i<boxes.length;i++){
  const [x,y,w,h]=boxes[i],sx=Math.round(x*iw),sy=Math.round(y*ih),sw=Math.min(iw-sx,Math.round(w*iw)),sh=Math.min(ih-sy,Math.round(h*ih));
  const c=document.createElement('canvas');c.width=sw;c.height=sh;const q=c.getContext('2d');q.drawImage(im,sx,sy,sw,sh,0,0,sw,sh);
  if(i>=2){q.globalCompositeOperation='destination-out';q.beginPath();q.ellipse(iw*.60-sx,ih*.50-sy,iw*.34,ih*.34,0,0,Math.PI*2);q.fill();}
  core.getContext('2d').clearRect(sx,sy,sw,sh);
  parts.push({im:c,x:sx/iw,y:sy/ih,w:sw/iw,h:sh/ih});
 }
 for(const canvas of [core]){const q=canvas.getContext('2d');q.save();q.beginPath();q.ellipse(iw*.60,ih*.50,iw*.34,ih*.34,0,0,Math.PI*2);q.clip();q.drawImage(im,0,0);q.restore();}
 CHARACTER_LAYERS.set(im,{core,parts});
}
function composeOverheadCutout(im,width,height,stride=0,armed=false){
 const left=-width*.60,top=-height*.50,layers=CHARACTER_LAYERS.get(im);
 const trousers=(im===CHARACTER_ART.player||im===CHARACTER_ART.player_plain||im===CHARACTER_ART.player_blue)?'#77734f':im===CHARACTER_ART.white||im===CHARACTER_ART.white_commander?'#d0cdbd':'#637387';
 if(!layers){g.drawImage(im,left,top,width,height);return;}
 for(let i=0;i<layers.parts.length;i++){
  const part=layers.parts[i];
  if(i<2){
   // Feet draw beneath the torso; occlusion hides the middle of each stride.
   // Draw them first so the body naturally occludes the heels and upper legs.
   const step=(i?-1:1)*stride;
   {
    // A long forward step and a short rear kick replace the sliding-foot pose.
    // The torso hides the returning leg; only the extended kick peeks past the
    // backpack. Foreshorten and tilt the raised boot as it pushes off.
    const kick=Math.max(0,-step),fw=part.w*width*1.3,fh=part.h*height*(1.05-kick*.04);
    const fx=width*.04+step*(step>0?8:22),fy=(i?1:-1)*height*(.21+kick*.035)-fh/2;
    // The trouser leg joins hip and ankle beneath the body, avoiding floating boots.
    g.save();g.strokeStyle=trousers;g.lineWidth=4.8;g.lineCap='round';g.beginPath();g.moveTo(-1,(i?1:-1)*height*.21);g.lineTo(fx+fw*.35,fy+fh/2);g.stroke();g.restore();
    g.save();g.translate(fx+fw/2,fy+fh/2);g.rotate((i?-1:1)*kick*.22);g.scale(-1,1);g.drawImage(part.im,-fw/2,-fh/2,fw,fh);g.restore();
   }
   continue;
  }
  const side=i===2?1:-1,ax=left+width*.55,ay=top+height*(i===2?.28:.72);
  g.save();
  if(armed){g.translate(ax,ay);g.rotate(side*.68);g.translate(-ax,-ay);}
  // A forward foot pairs with the opposite arm, not the arm on its own side.
  else g.translate(-side*stride*4.5,0);
  g.drawImage(part.im,left+part.x*width,top+part.y*height,part.w*width,part.h*height);g.restore();
 }
 g.drawImage(layers.core,left,top,width,height);
}
function drawOverheadCutout(im,width,height,stride=0,armed=false){
 // Cache procedural limb compositions, not an authored frame sheet. At runtime
 // each character needs one texture draw instead of five transformed part draws.
 let poses=CHARACTER_POSES.get(im);if(!poses){poses=new Map();CHARACTER_POSES.set(im,poses);}
 const quant=Math.round(stride*4),key=(armed?'armed:':'free:')+quant;
 let pose=poses.get(key);
 if(!pose){
  const c=document.createElement('canvas');c.width=128;c.height=128;
  const saved=g;g=c.getContext('2d');g.translate(70,64);g.scale(3,3);
  composeOverheadCutout(im,32,32*im.naturalHeight/im.naturalWidth,quant/4,armed);g=saved;
  pose=c;poses.set(key,pose);
 }
 const scale=width/32;
 g.drawImage(pose,-70/3*scale,-64/3*scale,128/3*scale,128/3*scale);
}
function drawPortraitCutout(im,width,height,stride=0,armed=false){
 const iw=im.naturalWidth,ih=im.naturalHeight,left=-width/2,top=-height*.56;
 const region=(x,y,w,h,dx=0,dy=0)=>g.drawImage(im,iw*x,ih*y,iw*w,ih*h,left+width*x+dx,top+height*y+dy,width*w,height*h);
 // Lower legs occupy opposite halves and move in counterphase. The waistband
 // overlaps them, so articulation cannot open a horizontal gap through the body.
 region(.18,.69,.32,.31,0,stride*1.65);
 region(.50,.69,.32,.31,0,-stride*1.65);
 if(!armed){
  for(const side of [-1,1]){
   g.save();const ax=left+width*(side<0?.22:.78),ay=top+height*.48;
   g.translate(ax,ay);g.rotate(side*stride*.09);g.translate(-ax,-ay);
   region(side<0?0:.73,.46,.27,.30);g.restore();
  }
 }
 region(.23,.46,.54,.28);
 region(0,0,1,.49);
}
function drawCharacterWeapon(commander,shot=0,flame=false,player=false,elite=false,size=1){
 const launcher=commander==='blue'||flame,im=CHARACTER_ART[launcher?'launcher':'rifle'];
 if(!assetOK(im))return;
 const long=commander==='white',width=(flame?25:launcher?36:long?42:29)*size;
 const height=(launcher?11:long?8:7)*size;
 const recoil=shot>0?Math.min(1,shot/.09)*2:0,x=(launcher?-9:-2)-recoil;
 // Sleeves and fingers hold the independent textured gun in an aiming pose.
 // Textured sleeves and hands are articulated in the body cutout.
 g.drawImage(im,x,-height/2,width,height);
 g.fillStyle='#e4b18a';g.beginPath();g.ellipse(8-recoil,-2,2,1.6,.2,0,Math.PI*2);g.ellipse(14-recoil,2,2,1.6,-.2,0,Math.PI*2);g.fill();
 if(long){g.fillStyle='#1e2928';g.fillRect(13-recoil,-5,10,2.5);g.fillStyle='#b2beba';g.fillRect(15-recoil,-5.5,4,1);}
 if(shot>0&&!flame){
  const tip=x+width;
  g.fillStyle=launcher?'#ffb75a':'#fff3ad';g.beginPath();g.moveTo(tip,-3);g.lineTo(tip+7,-1);g.lineTo(tip+11,0);g.lineTo(tip+7,2);g.lineTo(tip,3);g.closePath();g.fill();
 }
}
function drawCharacterWebP(x,y,face,isPlayer,alert,moving,elite,commander,weaponVisible,playerStripe,actor=null){
 if(CHARACTER_GRAPHICS_MODE!=='webp')return false;
 const key=isPlayer?(playerStripe==='blue'?'player_blue':playerStripe?'player':'player_plain'):characterArtKey(false,elite,commander);
 const im=CHARACTER_ART[key];if(!assetOK(im))return false;
 const now=performance.now(),stunned=actor&&(actor.stun>0||actor.stunT>0||actor.down);
 const stride=characterGait(actor,x,y,moving&&!stunned,now);
 const flame=!!(isPlayer&&actor===p&&p.flameActive);
 const armed=(!isPlayer&&weaponVisible)||(isPlayer&&playerStripe==='blue'&&weaponVisible)||flame;
 const shot=actor?Math.max(0,.09-(now-(actor.characterShotAt||-1e9))/1000):0;
 g.save();g.imageSmoothingEnabled=true;g.translate(x,y);g.scale(CHARACTER_GRAPHICS_SCALE,CHARACTER_GRAPHICS_SCALE);
 g.fillStyle='rgba(8,12,9,.30)';g.beginPath();g.ellipse(1,3,11,7,0,0,Math.PI*2);g.fill();
 // The overhead artwork points right, exactly like world angle zero.
 g.rotate(face);
 // Weapons sit beneath the body/helmet; the muzzle remains forward of the hands.
 if(armed&&!stunned)drawCharacterWeapon(commander,shot,flame,isPlayer,elite,!isPlayer&&!elite&&!commander?1.5:1);
 if(stunned){g.save();g.rotate(.8);g.scale(1,.68);}
 drawOverheadCutout(im,32,32*im.naturalHeight/im.naturalWidth,stride,armed);
 if(stunned)g.restore();
 g.restore();return true;
}
function drawCharacterProne(){
 if(CHARACTER_GRAPHICS_MODE!=='webp')return false;
 const im=CHARACTER_ART.player;if(!assetOK(im))return false;
 g.save();g.imageSmoothingEnabled=true;g.translate(p.x,p.y);g.rotate(p.body);g.scale(CHARACTER_GRAPHICS_SCALE,CHARACTER_GRAPHICS_SCALE);
 g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(-5,3,22,8,0,0,Math.PI*2);g.fill();
 g.save();g.scale(1.35,.8);drawOverheadCutout(im,32,32*im.naturalHeight/im.naturalWidth,0,true);g.restore();
 drawCharacterWeapon('white',0);g.restore();
 if(!(p.sniperEnterT>0)&&p.sniperReadyT>0){g.save();g.fillStyle='rgba(0,0,0,.58)';g.fillRect(p.x-22,p.y-27,44,5);g.fillStyle='#dce7b8';g.fillRect(p.x-22,p.y-27,44*(1-p.sniperReadyT/SNIPER_SETTLE_TIME),5);g.restore();}
 return true;
}
function drawScopedCharacter(o,elite,x,top,height,falling){
 if(CHARACTER_GRAPHICS_MODE!=='webp')return false;
 const im=CHARACTER_ART['scope_'+characterArtKey(false,elite,o.commander||'')];if(!assetOK(im))return false;
 top+=height*(1-CHARACTER_GRAPHICS_SCALE);height*=CHARACTER_GRAPHICS_SCALE;
 const now=performance.now();
 const stride=characterGait(o,o.x,o.y,!!o.walking&&!falling,now);
 g.save();g.imageSmoothingEnabled=true;g.translate(x,top+height*.56);g.scale(height/43,height/43);
 drawPortraitCutout(im,43*.61,43,stride,!!o.st&&!falling);
 if(o.st&&!falling){g.save();g.scale(.62,.62);drawCharacterWeapon(o.commander||'',Math.max(0,.09-(now-(o.characterShotAt||-1e9))/1000));g.restore();}
 g.restore();return true;
}
