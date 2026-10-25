// Top-down interpretations of museum / manufacturer references (docs/player-tank-art.md).
// Coordinates face north. Hull and turret are rasterized separately once per type;
// the game can rotate them independently, including its existing split bush layers.
const PLAYER_TANK_ART={
 t34:{base:'#556a3d',light:'#81905d',dark:'#35442c',trackX:.64,trackW:.30,length:2.70,wheels:5,barrel:2.25,gunWidth:.095,muzzle:false,
  hull:[[-.49,-1.30],[.49,-1.30],[.55,-.94],[.51,1.28],[-.51,1.28],[-.55,-.94]],
  turret:[[-.24,-.67],[.28,-.67],[.46,-.43],[.48,.12],[.32,.54],[-.32,.57],[-.49,.20],[-.47,-.37]]},
 tiger:{base:'#99865c',light:'#b9a77a',dark:'#61563d',trackX:.68,trackW:.35,length:2.42,wheels:8,barrel:2.20,gunWidth:.105,muzzle:true,
  hull:[[-.57,-1.15],[.57,-1.15],[.57,1.16],[-.57,1.16]],
  turret:[[-.44,-.51],[.44,-.51],[.51,-.27],[.51,.30],[.34,.55],[-.34,.55],[-.51,.30],[-.51,-.27]],camo:'german'},
 type10:{base:'#435d43',light:'#7d8a65',dark:'#293a2c',trackX:.65,trackW:.28,length:2.65,wheels:5,barrel:2.48,gunWidth:.10,muzzle:false,
  hull:[[-.45,-1.29],[.45,-1.29],[.57,-.85],[.56,1.28],[-.56,1.28],[-.57,-.85]],
  turret:[[-.18,-.86],[.18,-.86],[.57,-.52],[.63,-.12],[.55,.69],[-.55,.69],[-.63,-.12],[-.57,-.52]],camo:'japan'},
 m1:{base:'#b09a70',light:'#d6c39a',dark:'#786a4e',trackX:.70,trackW:.31,length:2.64,wheels:7,barrel:2.47,gunWidth:.11,muzzle:false,
  hull:[[-.48,-1.28],[.48,-1.28],[.62,-.91],[.62,1.30],[-.62,1.30],[-.62,-.91]],
  turret:[[-.17,-.81],[.17,-.81],[.63,-.53],[.70,-.16],[.64,.61],[.49,.82],[-.55,.82],[-.69,.49],[-.68,-.20],[-.58,-.54]]},
 sherman:{base:'#596847',light:'#8a9670',dark:'#394632',trackX:.59,trackW:.26,length:2.56,wheels:6,barrel:1.90,gunWidth:.09,muzzle:false,
  hull:[[-.38,-1.24],[.38,-1.24],[.52,-1.03],[.54,-.62],[.51,1.18],[-.51,1.18],[-.54,-.62],[-.52,-1.03]],
  turret:[[-.22,-.56],[.22,-.56],[.43,-.32],[.45,.13],[.29,.49],[-.21,.56],[-.44,.30],[-.46,-.13]]},
 churchill:{base:'#555e42',light:'#858c65',dark:'#343c2c',trackX:.60,trackW:.28,length:2.98,wheels:11,barrel:1.86,gunWidth:.09,muzzle:false,
  hull:[[-.45,-1.39],[.45,-1.39],[.45,1.40],[-.45,1.40]],
  turret:[[-.29,-.51],[.29,-.51],[.44,-.30],[.43,.31],[.23,.49],[-.24,.49],[-.43,.31],[-.44,-.30]]},
 kingtiger:{base:'#a48d5f',light:'#c5b184',dark:'#6d5b3e',trackX:.72,trackW:.34,length:2.72,wheels:9,barrel:2.65,gunWidth:.105,muzzle:true,
  hull:[[-.49,-1.31],[.49,-1.31],[.60,-.94],[.60,1.26],[-.60,1.26],[-.60,-.94]],
  turret:[[-.33,-.71],[.33,-.71],[.57,-.40],[.59,.68],[-.59,.68],[-.57,-.40]],camo:'german'}
};
const playerTankArtCache=new Map();
function playerTankArtPath(q,points){q.beginPath();for(let i=0;i<points.length;i++)i?q.lineTo(...points[i]):q.moveTo(...points[i]);q.closePath();}
function playerTankArmorPath(q,id,layer){
 const a=PLAYER_TANK_ART[id];
 if(layer==='turret'&&id==='sherman'){
  q.beginPath();q.moveTo(-.21,-.57);q.lineTo(.21,-.57);q.bezierCurveTo(.54,-.39,.54,.16,.28,.45);q.bezierCurveTo(.14,.66,-.23,.62,-.40,.34);q.bezierCurveTo(-.57,.04,-.47,-.40,-.21,-.57);q.closePath();
 }else if(layer==='turret'&&id==='tiger'){
  q.beginPath();q.moveTo(-.48,-.48);q.lineTo(.48,-.48);q.lineTo(.51,.16);q.bezierCurveTo(.51,.66,-.51,.66,-.51,.16);q.closePath();
 }else if(layer==='turret'&&id==='t34'){
  q.beginPath();q.moveTo(-.23,-.67);q.lineTo(.24,-.67);q.bezierCurveTo(.54,-.42,.58,.04,.35,.48);q.lineTo(.18,.59);q.lineTo(-.26,.56);q.bezierCurveTo(-.61,.25,-.53,-.41,-.23,-.67);q.closePath();
 }else if(layer==='hull'&&id==='sherman'){
  q.beginPath();q.moveTo(-.51,1.18);q.lineTo(.51,1.18);q.lineTo(.54,-.64);q.bezierCurveTo(.55,-1.18,.37,-1.27,0,-1.27);q.bezierCurveTo(-.37,-1.27,-.55,-1.18,-.54,-.64);q.closePath();
 }else playerTankArtPath(q,layer==='hull'?a.hull:a.turret);
}
function paintPlayerTankArt(q,id,layer){
 const a=PLAYER_TANK_ART[id],hull=layer==='hull';
 const rect=(x,y,w,h,c)=>{q.fillStyle=c;q.fillRect(x,y,w,h);};
 const line=(x1,y1,x2,y2,c,w=.025)=>{q.strokeStyle=c;q.lineWidth=w;q.beginPath();q.moveTo(x1,y1);q.lineTo(x2,y2);q.stroke();};
 const disc=(x,y,r,c)=>{q.fillStyle=c;q.beginPath();q.arc(x,y,r,0,Math.PI*2);q.fill();};
 if(hull){
  // Track shoes are visible from above; suspension hints vary by vehicle.
  for(const side of [-1,1]){
   const x=side*a.trackX,top=-a.length/2;
   rect(x-a.trackW/2-.035,top-.035,a.trackW+.07,a.length+.07,'#111411');
   rect(x-a.trackW/2,top,a.trackW,a.length,'#333830');
   q.strokeStyle='#65685a';q.lineWidth=.024;q.beginPath();
   for(let y=top+.04;y<-top;y+=.10){q.moveTo(x-a.trackW/2+.015,y);q.lineTo(x+a.trackW/2-.015,y);}q.stroke();
   const groups=id==='sherman'?3:a.wheels;
   for(let i=0;i<groups;i++){const y=top+.19+(a.length-.38)*i/(groups-1);disc(x,y,id==='churchill'?.067:.092,'#1b201b');disc(x,y,.038,'#737868');}
  }
 }else{
  // Gun, sleeve and muzzle. Only the German 88mm guns have a double-baffle brake.
  rect(-a.gunWidth/2-.018,-a.barrel,a.gunWidth+.036,a.barrel-.30,'#20251f');
  rect(-a.gunWidth/2,-a.barrel,a.gunWidth,a.barrel-.30,a.light);
  line(-a.gunWidth*.22,-a.barrel+.05,-a.gunWidth*.22,-.42,'#d3cfb1',.014);
  if(id==='m1'||id==='type10'){
   rect(-a.gunWidth*.70,-1.88,a.gunWidth*1.4,.46,a.base);
   for(const y of [-1.89,-1.44,-1.04])rect(-a.gunWidth*.76,y,a.gunWidth*1.52,.035,a.light);
   rect(-a.gunWidth*.60,-1.25,a.gunWidth*1.2,.09,'#343e32');
  }
  if(a.muzzle){
   rect(-.115,-a.barrel-.025,.23,.245,a.dark);rect(-.098,-a.barrel-.01,.196,.045,a.light);
   for(const y of [-a.barrel+.055,-a.barrel+.145])rect(-.125,y,.25,.034,'#20231d');
  }else rect(-a.gunWidth*.53,-a.barrel,.106,.035,'#1d211d');
  // Turret shadow moves with the turret, not with the chassis.
  q.save();q.translate(.04,.07);playerTankArmorPath(q,id,layer);q.fillStyle='#0005';q.fill();q.restore();
 }
 playerTankArmorPath(q,id,layer);const grad=q.createLinearGradient(-.65,-1.4,.65,1.4);grad.addColorStop(0,a.light);grad.addColorStop(.38,a.base);grad.addColorStop(1,a.dark);q.fillStyle=grad;q.fill();
 q.strokeStyle='#20291e';q.lineWidth=.045;q.stroke();
 // Paint patches are clipped to armor and cached, never generated each frame.
 if(a.camo){
  q.save();q.clip();q.lineCap='round';q.lineWidth=a.camo==='japan'?.28:.19;
  q.strokeStyle=a.camo==='japan'?'#635d42':'#535e3c';q.beginPath();q.moveTo(-.78,-1.2);q.bezierCurveTo(.3,-.9,-.4,-.25,.8,.04);q.moveTo(-.7,.38);q.bezierCurveTo(.1,.14,.25,.96,.85,1.2);q.stroke();
  if(a.camo==='german'){q.strokeStyle='#79563d';q.lineWidth=.14;q.beginPath();q.moveTo(.65,-.95);q.bezierCurveTo(.15,-.45,-.25,.45,-.65,.85);q.stroke();}q.restore();
 }
 if(hull){
  // Front glacis, driver hatch, machine-gun mount and rear engine deck.
  line(-.43,-.76,.43,-.76,a.light,.035);line(-.41,-.73,.41,-.73,a.dark,.025);
  rect(-.36,-1.09,.22,.19,a.dark);rect(-.33,-1.07,.16,.12,a.base);line(-.31,-1.05,-.19,-1.05,'#b2b6a0');
  disc(.31,-.98,.066,a.dark);rect(.29,-1.09,.04,.13,'#2b3128');
  if(id==='tiger'||id==='kingtiger'){
   // Two rear cooling-fan covers and their grille bars.
   for(const x of [-.28,.28]){disc(x,.77,.18,a.dark);disc(x,.77,.14,'#424b39');q.strokeStyle=a.light;q.lineWidth=.018;q.beginPath();for(let j=-2;j<=2;j++){q.moveTo(x-.13,.77+j*.045);q.lineTo(x+.13,.77+j*.045);}q.stroke();}
   for(const x of [-.26,.26]){rect(x-.07,1.09,.14,.19,a.dark);disc(x,1.25,.055,'#262a23');}
  }else{
   const y=id==='m1'?.75:.64;rect(-.36,y,.72,.39,a.dark);
   q.strokeStyle=a.light;q.lineWidth=.018;q.beginPath();for(let j=0;j<7;j++){q.moveTo(-.32,y+.035+j*.05);q.lineTo(.32,y+.035+j*.05);}q.stroke();
   if(id==='m1')for(let j=0;j<7;j++)line(-.43+j*.14,1.15,-.43+j*.14,1.30,a.dark,.05);
  }
  if(id==='t34'){
   // Cylindrical external fuel drums along the rear sides.
   for(const x of [-.48,.48]){rect(x-.085,.47,.17,.58,a.dark);rect(x-.06,.49,.12,.54,a.light);for(const y of [.58,.87])rect(x-.09,y,.18,.03,a.dark);}
   rect(-.32,1.11,.64,.14,a.base);
  }
  if(id==='sherman'){
   // Three VVSS bogie groups per side and the rounded transmission nose.
   q.strokeStyle=a.light;q.lineWidth=.028;q.beginPath();q.ellipse(0,-1.08,.44,.14,0,0,Math.PI);q.stroke();
   for(const side of [-1,1])for(let j=0;j<3;j++)rect(side*.53-.045,-.81+j*.80,.09,.36,a.dark);
  }
  if(id==='churchill'){
   // Full-length track guards and side access panels are its defining silhouette.
   for(const side of [-1,1]){rect(side*.59-.085,-1.30,.17,2.60,a.base);line(side*.59,-1.29,side*.59,1.28,a.light);for(const y of [-.7,.1,.9])rect(side*.59-.065,y,.13,.12,a.dark);}
  }
  if(id==='type10'||id==='m1'){
   for(const side of [-1,1]){rect(side*(id==='m1'?.63:.59)-.055,-.86,.11,2.08,a.base);for(let j=0;j<5;j++)line(side*.63,-.79+j*.40,side*.70,-.79+j*.40,a.dark,.025);}
  }
  for(const x of [-.41,.41]){rect(x-.045,-1.18,.09,.065,'#c2bf91');line(x-.055,-1.22,x+.055,-1.22,a.dark,.025);}
 }else{
  // Per-type armor geometry, mantlets, hatches, optics and turret rear storage.
  if(id==='m1'||id==='type10'||id==='kingtiger'){
   line(-.17,-.73,-.52,-.35,a.light,.035);line(.17,-.73,.52,-.35,a.light,.035);
   if(id==='m1'){rect(-.48,.52,.96,.22,a.dark);for(let j=0;j<4;j++)rect(-.44+j*.23,.54,.19,.17,a.base);line(-.53,.80,.53,.80,a.light,.025);}
   if(id==='type10'){rect(-.48,.44,.96,.20,a.dark);for(const x of [-.37,-.12,.13,.38])rect(x-.085,.47,.17,.13,a.base);rect(.28,-.33,.15,.17,'#25362c');rect(.30,-.32,.11,.055,'#7a9992');}
  }
  if(id==='tiger'){
   rect(-.30,.48,.60,.16,a.dark);rect(-.28,.49,.56,.12,a.base);
   for(const x of [-.46,.46])for(let j=0;j<3;j++)rect(x-.045,-.28+j*.115,.09,.075,'#3c4434');
  }
  if(id==='t34')line(-.30,-.35,-.42,.23,a.light,.04);
  if(id==='sherman'){disc(-.10,-.02,.31,a.base);line(-.36,.21,-.18,.40,a.light,.03);}
  // Wide gun mantlet belongs to the barrel front (negative Y), not its side.
  rect(-.22,-.69,.44,.22,a.dark);rect(-.19,-.67,.38,.16,a.base);line(-.17,-.66,.17,-.66,a.light,.03);
  const modern=id==='m1'||id==='type10',hx=modern?.26:-.22,hy=modern?.16:.19;
  disc(hx,hy,modern?.15:.145,a.dark);disc(hx,hy,modern?.115:.105,a.light);disc(hx,hy,.066,a.base);
  line(hx-.08,hy,hx+.08,hy,a.dark,.025);
  const lx=modern?-.23:.20,ly=modern?.17:.13;disc(lx,ly,.11,a.dark);disc(lx,ly,.08,a.base);line(lx-.065,ly,lx+.065,ly,a.light,.022);
  if(modern){rect(hx-.03,hy-.07,.055,.30,'#252e25');rect(hx-.05,hy-.19,.10,.19,'#373d31');line(hx,hy-.22,hx,hy-.42,'#22271f',.028);}
  rect(.25,-.42,.11,.055,a.dark);rect(.27,-.42,.07,.02,'#91a8a0');
  line(-.32,.37,-.34,.76,'#263023',.019);disc(-.32,.37,.035,a.light);
 }
}
function playerTankArtSprites(id){
 let cached=playerTankArtCache.get(id);if(cached)return cached;
 const make=layer=>{
  const a=PLAYER_TANK_ART[id],bounds=layer==='hull'?{x:-1,y:-1.60,w:2,h:3.20}:{x:-.83,y:-a.barrel-.12,w:1.66,h:a.barrel+1.04};
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(bounds.w*32);canvas.height=Math.ceil(bounds.h*32);
  const q=gameCanvasContext(canvas);q.scale(32,32);q.translate(-bounds.x,-bounds.y);paintPlayerTankArt(q,id,layer);
  return{canvas,x:bounds.x,y:bounds.y,w:canvas.width/32,h:canvas.height/32};
 };
 cached={hull:make('hull'),turret:make('turret')};playerTankArtCache.set(id,cached);return cached;
}
function drawPlayerTankArt(x,y,body,ang,id,sz,layer){
 const art=playerTankArtSprites(id);
 const stamp=sprite=>drawStaticRaster(sprite.canvas,sprite.x*sz,sprite.y*sz,sprite.w*sz,sprite.h*sz);
 if(layer!=='turret'){
  g.save();g.translate(x,y);g.rotate(body+Math.PI/2);
  g.fillStyle='#0004';g.beginPath();g.ellipse(.04*sz,.10*sz,.93*sz,PLAYER_TANK_ART[id].length*.53*sz,0,0,Math.PI*2);g.fill();
  stamp(art.hull);g.restore();
 }
 if(layer!=='hull'){g.save();g.translate(x,y);g.rotate(ang+Math.PI/2);stamp(art.turret);g.restore();}
}
