function isPartnerDrivenVehicle(){return !!(p&&p.partnerDriver&&p.tank&&partner&&partner.vehicle===p.tank);}
function playerVehicleGunBlocked(){return !!(skill==='partner'&&p&&p.tank&&partner&&partner.passengerVehicle===p.tank);}
function syncPartnerDriverPassenger(){
 if(!isPartnerDrivenVehicle())return;
 p.x=partner.x;p.y=partner.y;p.body=partner.face;
}
function releasePartnerSharedWreck(v){
 if(!partner||partner.vehicle!==v)return;
 partner.vehicle=null;partner.route=null;partner.boardTarget=null;partner.backup=false;partner.moving=false;
 partner.hp=Math.max(0,partner.hp-1);partner.down=partner.hp<=0;partner.stunT=partner.down?0:2;partner.stunContactDelay=.3;
 p.partnerDriver=false;
}
function updatePartnerPassenger(q,dt){
 if(q.passengerVehicle&&q.passengerVehicle!==p.tank){
  q.passengerVehicle=null;q.planT=0;q.backup=true;q.route=null;
  for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2]){
   const x=p.x+Math.cos(a)*52,y=p.y+Math.sin(a)*52;
   if(x>12&&x<WW-12&&y>12&&y<WH-12&&!hitsC(x,y,9)&&!inWaterAt(x,y,8)){q.x=x;q.y=y;break;}
  }
 }
 if(!q.passengerVehicle&&p.tank&&!q.vehicle&&!q.down&&!(q.stunT>0)&&D(q,p)<=200){
  q.passengerVehicle=p.tank;p.partnerDriver=false;q.route=null;q.boardTarget=null;q.reentryT=0;q.passengerScan=0;q.passengerTarget=null;
 }
 if(!q.passengerVehicle)return false;
 q.x=p.x;q.y=p.y;q.face=p.body;q.moving=false;
 const v=p.tank;
 if(v.kind!=='tank'||q.down||q.stunT>0)return true;
 q.passengerScan=Math.max(0,(q.passengerScan||0)-dt);
 if(q.passengerScan<=0){
  q.passengerScan=.25;q.passengerTarget=null;let nearest=306;
  for(const h of humans)if(h.alive&&!(h.stun>0)){const d=D(q,h);if(d<nearest&&los(q,h)){nearest=d;q.passengerTarget=h;}}
 }
 q.passengerGunT=Math.max(0,(q.passengerGunT||0)-dt);
 const h=q.passengerTarget;
 if(h&&h.alive&&!(h.stun>0)&&v.v>0&&q.passengerGunT<=0&&D(q,h)<306&&los(q,h)){
  const a=Math.atan2(h.y-q.y,h.x-q.x);q.passengerGunT=Math.max(.18,v.t.vcd||.2);v.v--;
  fire(q.x+Math.cos(a)*35,q.y+Math.sin(a)*35,a+(R()-.5)*.08,'ally','v',468,306);
 }
 return true;
}
function drawPartnerPassengerHead(){
 const q=partner;if(skill!=='partner'||!q||!p.tank||q.passengerVehicle!==p.tank&&!isPartnerDrivenVehicle())return;
 // One large passenger badge for every vehicle type. The smaller tank badge was duplicate.
 g.save();const badgeY=p.y-(p.tank.kind==='fighter'?15:10);
 g.translate(p.x+14,badgeY);g.fillStyle='rgba(8,16,20,.82)';g.beginPath();g.arc(0,0,14,0,Math.PI*2);g.fill();
 g.fillStyle='#baa585';g.beginPath();g.arc(0,2,8,0,Math.PI*2);g.fill();
 g.fillStyle='#4e6855';g.beginPath();g.ellipse(0,-3,10,8,0,Math.PI,Math.PI*2);g.lineTo(10,0);g.lineTo(-10,0);g.closePath();g.fill();
 g.strokeStyle='#399bff';g.lineWidth=3;g.beginPath();g.moveTo(-9,-2);g.lineTo(9,-2);g.stroke();g.restore();
}
// Companion AI and route/vehicle behavior — extracted without behavior changes.
// Route-bound vehicle boarding is computed on confirmation, not each frame.
function partnerRouteVehicle(points){
 if(!points||points.length<2||!cars)return null;
 // Scan the entire drawn polyline; the earliest drivable vehicle within 50px wins.
 // Arc length (rather than waypoint index) keeps detection correct for uneven spacing.
 let best=null,progress=0,bestProgress=Infinity;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy,len=Math.sqrt(len2);
  if(len<.001)continue;
  for(const car of cars){
   if(!car||!car.t||car.f<=0||!['tank','truck','fighter'].includes(car.kind))continue;
   const t=Math.max(0,Math.min(1,((car.x-a.x)*dx+(car.y-a.y)*dy)/len2));
   const x=a.x+dx*t,y=a.y+dy*t,distance=Math.hypot(car.x-x,car.y-y);
   if(distance>50)continue;
   const at=progress+len*t;
   if(at<bestProgress){bestProgress=at;best={car,index:i-1,distance};}
  }
  progress+=len;
 }
 return best;
}
function partnerBoardVehicle(q,car){
 if(!q||!car||q.vehicle||car.f<=0||D(q,car)>50)return false;
 const index=cars.indexOf(car);if(index<0)return false;
 cars.splice(index,1);q.vehicle=car;q.boardTarget=null;
 q.x=car.x;q.y=car.y;q.face=car.body??q.face;q.vehicleAim=q.face;
 q.vehicleCannonT=0;q.vehicleGunT=0;q.routePointT=0;q.routeStuckT=0;
 // After boarding, continue forward from the point where the vehicle was encountered.
 if(q.route&&q.route.length)q.routeIndex=Math.max(q.routeIndex||0,Math.min(q.route.length-1,(q.boardAt||0)+1));
 q.wallFollow=null;q.sideStep=null;q.moving=false;
 sfx('enter');return true;
}
function partnerExitVehicle(q){
 if(!q||!q.vehicle||isPartnerDrivenVehicle())return false;
 const v=q.vehicle,ang=q.face||0;
 const options=[ang+Math.PI/2,ang-Math.PI/2,ang+Math.PI,ang,0,Math.PI];
 let spot=null;
 for(const a of options)for(const d of [47,62,78]){
  const x=q.x+Math.cos(a)*d,y=q.y+Math.sin(a)*d;
  if(x>12&&x<WW-12&&y>12&&y<WH-12&&!hitsC(x,y,9)&&!inWaterAt(x,y,8)){spot={x,y};break;}
  if(spot)break;
 }
 if(!spot){say('降車できる場所がない');return false;}
 v.x=q.x;v.y=q.y;v.body=q.face;cars.push(v);
 q.vehicle=null;q.x=spot.x;q.y=spot.y;q.vehicleAim=null;
 q.route=null;q.routeWait=0;q.routeStart=null;q.boardTarget=null;q.backup=false;
 q.planT=0;q.moving=false;q.wallFollow=null;q.sideStep=null;
 sfx('enter');say('相棒が乗り物から降りた');return true;
}
function partnerVehicleDestroyed(q){
 if(!q||!q.vehicle)return;
 if(isPartnerDrivenVehicle()){wreck();return;}
 const v=q.vehicle;q.vehicle=null;q.boardTarget=null;q.route=null;q.routeStart=null;
 q.routeWait=0;q.backup=false;q.moving=false;q.wallFollow=null;q.sideStep=null;
 burst(q.x,q.y,32,'#ff8244',220);sfx('explosion');
 q.hp=Math.max(0,q.hp-1);
 if(!q.hp){q.down=true;say('相棒の乗り物が大破！救助が必要');}
 else{q.stunT=2;q.stunContactDelay=.3;say('相棒の乗り物が大破！');}
}
function partnerVehicleMove(q,goal,speed,dt){
 const v=q.vehicle;if(!v||!goal||v.f<=0)return;
 const a=Math.atan2(goal.y-q.y,goal.x-q.x),d=Math.hypot(goal.x-q.x,goal.y-q.y);
 const step=Math.min(d,Math.min(speed,v.t.sp||speed)*dt),radius=v.kind==='fighter'?23:v.t.id==='armored'?27:v.kind==='truck'?20:27;
 const oldX=q.x,oldY=q.y;
 if(v.kind==='fighter'){
  // Aircraft ignore ground obstacles, as the player aircraft does.
  q.x=Math.max(radius,Math.min(WW-radius,q.x+Math.cos(a)*step));
  q.y=Math.max(radius,Math.min(WH-radius,q.y+Math.sin(a)*step));
 }else mv(q,Math.cos(a)*step,Math.sin(a)*step,radius);
 if(v.kind!=='fighter'&&Math.hypot(q.x-oldX,q.y-oldY)<.08){
  // Alternate a wider side-step without allowing the tank to pass through walls.
  const side=(q.vehicleSide||1),aa=a+side*Math.PI*.5;
  mv(q,Math.cos(aa)*step,Math.sin(aa)*step,radius,v.kind==='fighter'?1:null);
  if(Math.hypot(q.x-oldX,q.y-oldY)<.08)q.vehicleSide=-side;
 }
 const moved=Math.hypot(q.x-oldX,q.y-oldY);
 if(moved>.05){q.face=Math.atan2(q.y-oldY,q.x-oldX);if(!v.debugInfinite&&!v.areaDebug&&!areaDebugEnabled)v.f=Math.max(0,v.f-moved*.04);}
 v.x=q.x;v.y=q.y;v.body=q.face;
}
function partnerWaterMovement(q,ox,oy){
 const v=q.vehicle;
 if(q.passengerVehicle||(v&&v.kind==='fighter')){q.waterWakeDistance=0;return;}
 const moved=Math.hypot(q.x-ox,q.y-oy);if(moved<=.05)return;
 const r=v?(v.kind==='truck'?20:15):8,wet=inWaterAt(q.x,q.y,r);
 if(!wet){q.waterWakeDistance=0;return;}
 if(!inWaterAt(ox,oy,r)){
  sfx('splash');burst(q.x,q.y+3,8,'#c3f1fd',65);
  addWaterRipple(q.x,q.y+3,v?22:10,1.6);q.waterWakeDistance=0;
 }else{
  q.waterWakeDistance=(q.waterWakeDistance||0)+moved;
  if(q.waterWakeDistance>=(v?22:13)){addWaterRipple(q.x,q.y+3,v?22:10);q.waterWakeDistance=0;}
 }
}
function partnerCompanionMove(q,goal,speed,dt){
 const ox=q.x,oy=q.y;
 if(q.vehicle)partnerVehicleMove(q,goal,speed,dt);
 else moveAllySmart(q,goal,speed,dt);
 partnerWaterMovement(q,ox,oy);
}
function partnerVehicleAttack(q,dt){
 const v=q.vehicle;if(!v||q.down||q.stunT>0)return;
 q.vehicleCannonT=Math.max(0,(q.vehicleCannonT||0)-dt);
 q.vehicleGunT=Math.max(0,(q.vehicleGunT||0)-dt);
 let closestHuman=null,hd=320;
 for(const h of humans)if(h.alive&&!(h.stun>0)){
  const d=D(q,h);if(d<hd&&los(q,h)){hd=d;closestHuman=h;}
 }
 let closestTank=null,td=Math.max(360,v.t.crng||360);
 for(const e of etanks)if(e.alive){
  const d=D(q,e);if(d<td&&los(q,e)){td=d;closestTank=e;}
 }
 const target=closestTank||closestHuman;
 if(target)q.vehicleAim=Math.atan2(target.y-q.y,target.x-q.x);
 else q.vehicleAim=q.face;
 const a=q.vehicleAim;
 if(v.kind==='fighter'){
  // The debug aircraft uses the same delayed bomb as the player fighter.
  if(target&&D(q,target)<95&&q.vehicleCannonT<=0){
   q.vehicleCannonT=v.t.ccd||2.2;airbombs.push({x:q.x,y:q.y,t:.52,maxT:.52,fighter:true});sfx('bombdrop');
  }
 }else if(v.kind==='tank'){
  if(v.t.id!=='armored'&&target&&v.c>0&&q.vehicleCannonT<=0){
   q.vehicleCannonT=v.t.ccd||2.5;v.c--;
   fire(q.x+Math.cos(a)*44,q.y+Math.sin(a)*44,a,'ally','c',v.t.cspd||558,v.t.crng||504,v.t.cdmg||3);
  }
  if(!isPartnerDrivenVehicle()&&closestHuman&&v.v>0&&q.vehicleGunT<=0){
   const ma=Math.atan2(closestHuman.y-q.y,closestHuman.x-q.x);
   q.vehicleAim=ma;q.vehicleGunT=v.t.vcd||.2;v.v--;
   fire(q.x+Math.cos(ma)*35,q.y+Math.sin(ma)*35,ma+(R()-.5)*.08,'ally','v',468,306);
  }
 }else if(v.kind==='truck'){
  // Trucks have no gun: run over infantry while driving, as in player truck mode.
  if(q.moving)for(const h of humans)if(h.alive&&D(q,h)<28){
   h.alive=false;burst(h.x,h.y,15,'#c05a3a',180);sfx('crush');
  }
  if(q.moving)for(const e of etanks)if(e.alive&&D(q,e)<TANK_HIT+20){
   truckTankCrashFx(q.x,q.y,e);partnerVehicleDestroyed(q);break;
  }
 }
}
// S short press: call the partner back. Long press: freeze player and draw a route using movement keys.
const partnerOrder={pressed:false,held:0,drawing:false,cursor:null,path:[],signalT:0,signalKind:'point'};
function startPartnerOrder(){
 if(skill!=='partner'||state!=='play'||!p||p.tank)return;
 partnerOrder.signalT=0;partnerOrder.pressed=true;partnerOrder.held=0;partnerOrder.drawing=false;partnerOrder.cursor=null;partnerOrder.path=[];
}
function finishPartnerOrder(confirm=true){
 if(!partnerOrder.pressed)return;
 if(confirm&&partner&&!partner.down&&!(partner.stunT>0)){
  if(!partnerOrder.drawing){partnerOrder.signalT=1;partnerOrder.signalKind='call';}
  if(partner.vehicle&&!partnerOrder.drawing){partnerExitVehicle(partner);}
  else if(partnerOrder.drawing){
   if(partnerOrder.path.length>1){
    partner.route=partnerOrder.path.slice(1).map(v=>({x:v.x,y:v.y}));
    partner.routeIndex=0;partner.routeWait=0;partnerOrder.signalT=1;partnerOrder.signalKind='point';partner.routePointT=0;partner.routeStuckT=0;partner.routeStart={x:partner.x,y:partner.y};partner.backup=false;
    partner.wallFollow=null;partner.sideStep=null;
    partner.boardTarget=null;
    if(!partner.vehicle){
     const pickup=partnerRouteVehicle([{x:partner.x,y:partner.y},...partner.route]);
     if(pickup){partner.boardTarget=pickup.car;partner.boardAt=pickup.index;}
    }
    // 指差しの吹き出しでルート確定を伝え、待ち時間なしで出発する。
   }else say('方向キーでルートを描いてください');
  }else{
   partnerOrder.signalT=1;partnerOrder.signalKind='call';partner.backup=true;partner.route=null;partner.boardTarget=null;partner.routeWait=0;partner.planT=0;
   partner.wallFollow=null;partner.sideStep=null;say('相棒：バックアップ！');
  }
 }
 partnerOrder.pressed=false;partnerOrder.held=0;partnerOrder.drawing=false;partnerOrder.cursor=null;partnerOrder.path=[];
}
function updatePartnerOrder(dt){
 partnerOrder.signalT=Math.max(0,partnerOrder.signalT-dt);
 if(!partnerOrder.pressed||skill!=='partner'||state!=='play'||!p||p.tank)return;
 partnerOrder.held+=dt;
 if(partnerOrder.held>=.18&&!partnerOrder.drawing&&partner&&!partner.down&&!(partner.stunT>0)){
  partnerOrder.drawing=true;partnerOrder.cursor={x:partner.x,y:partner.y};
  partnerOrder.path=[{x:partner.x,y:partner.y}];partnerOrder.blocked=false;
 }
 if(!partnerOrder.drawing)return;
 let dx=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0),dy=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0);
 const d=Math.hypot(dx,dy);if(!d)return;dx/=d;dy/=d;
 const c=partnerOrder.cursor,step=170*dt;
 const cx=Math.max(0,Math.min(WW-W,p.x-W/2)),cy=Math.max(0,Math.min(WH-H,p.y-H*.6));
 const nx=Math.max(15,Math.min(WW-15,Math.max(cx+15,Math.min(cx+W-15,c.x+dx*step))));
 const ny=Math.max(15,Math.min(WH-15,Math.max(cy+15,Math.min(cy+H-15,c.y+dy*step))));
 if(hitsC(nx,ny,7)){
  const first=partnerOrder.path[0];
  if(first){c.x=first.x;c.y=first.y;partnerOrder.path=[{x:first.x,y:first.y}];}
  if(!partnerOrder.blocked)say('障害物に接触：指示ルートを開始地点へ戻した');
  partnerOrder.blocked=true;return;
 }
 partnerOrder.blocked=false;c.x=nx;c.y=ny;
 const prev=partnerOrder.path[partnerOrder.path.length-1];
 if(Math.hypot(c.x-prev.x,c.y-prev.y)>11&&partnerOrder.path.length<145)partnerOrder.path.push({x:c.x,y:c.y});
}
function stunPartnerByOwnBlast(x,y){
 if(!partner||partner.down||Math.hypot(partner.x-x,partner.y-y)>95)return;
 partner.stunT=5;partner.stunContactDelay=.3;partner.backup=false;partner.route=null;partner.routeWait=0;
 partner.wallFollow=null;partner.sideStep=null;partner.moving=false;
 say('相棒が爆風で気絶！触れるか5秒で復帰');
}
// Contact knockout applies during autonomous travel, backup and instructed routes.
function partnerKnockoutPatrol(dt){
 const q=partner;if(!q||q.down||q.stunT>0||q.vehicle)return false;
 q.touchCd=Math.max(0,(q.touchCd||0)-dt);
 if(q.grappleT>0)return true;
 // Every active tactical mode: close to any eligible soldier within 100px.
 let target=null,near=100;
 for(const h of humans)if(h.alive&&!(h.stun>0)){
  const d=D(q,h);
  if(d<near){near=d;target=h;}
 }
 if(!target)return false;
 if(near<=25&&los(q,target)){
  if(q.touchCd<=0&&stunHuman(target)){
   q.grappleT=.45;q.grappleTarget=target;q.touchCd=1;
   q.face=Math.atan2(target.y-q.y,target.x-q.x);q.moving=false;
  }
  return q.grappleT>0;
 }
 // While drawing hand-sign directions the partner should remain at the drawn route's start.
 // Otherwise pursuit interrupts autonomous/backup/routed walking.
 const ox=q.x,oy=q.y;
 moveAllySmart(q,target,180,dt);
 partnerWaterMovement(q,ox,oy);
 q.moving=Math.hypot(q.x-ox,q.y-oy)>.1;
 if(q.moving)q.face=Math.atan2(q.y-oy,q.x-ox);
 return true;
}
// Revival/reposition must execute even when the companion is incapacitated.
function recallSeparatedPartner(q,dt){
 if(!q||!p||isPartnerDrivenVehicle())return false;
 const cx=Math.max(0,Math.min(WW-W,p.x-W/2)),cy=Math.max(0,Math.min(WH-H,p.y-H*.6));
 const separated=q.x<cx-12||q.x>cx+W+12||q.y<cy-12||q.y>cy+H+12;
 const tooFar=D(q,p)>Math.max(300,Math.max(W,H)*.8);
 q.off=separated?(q.off||0)+dt:0;
 q.farT=tooFar?(q.farT||0)+dt:0;
 if(q.off<10&&q.farT<1.5)return false;
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 let pos=null;
 // 画面の下端から再入場。すぐ近くに瞬間出現させない。
 const entryY=Math.max(16,Math.min(WH-16,cy+H-15));
 for(const dy of [0,-15,-30,-50,-80,-110]){
  if(pos)break;
  for(const dx of [28,-28,52,-52,0,85,-85]){
   const x=clamp(p.x+dx,Math.max(12,cx+16),Math.min(WW-12,cx+W-16));
   const y=clamp(entryY+dy,Math.max(12,cy+16),Math.min(WH-12,cy+H-16));
   if(!hitsC(x,y,9)){pos={x,y};break;}
  }
 }
 if(!pos)pos={x:clamp(p.x+20,15,WW-15),y:clamp(p.y+30,15,WH-15)};
 q.x=pos.x;q.y=pos.y;q.off=0;q.farT=0;q.moving=false;
 q.reentryT=q.down?0:1.5;q.reentryGoalY=Math.max(cy+34,Math.min(cy+H-95,pos.y-110));
 q.wallFollow=null;q.sideStep=null;q.route=null;q.routeWait=0;q.routeIndex=0;q.routeStart=null;
 q.backup=false;q.boardTarget=null;q.modeT=0;q.planT=0;q.grappleT=0;q.grappleTarget=null;
 if(partnerOrder.drawing)finishPartnerOrder(false);
 say(q.down?'相棒が救助できる場所に戻った！':'相棒が合流した！');
 return true;
}
function rollbackPartnerRoute(q){
 if(!q)return;
 const start=q.routeStart;
 if(start&&!hitsC(start.x,start.y,9)){q.x=start.x;q.y=start.y;}
 q.route=null;q.routeWait=0;q.routeIndex=0;q.routeStart=null;
 q.routeStuckT=0;q.routePointT=0;q.backup=false;q.boardTarget=null;q.planT=0;
 q.wallFollow=null;q.sideStep=null;q.moving=false;
 burst(q.x,q.y,5,'#8ad9ff',65);say('ルートが行き止まり：開始地点に戻った');
}
// Utility-style companion AI. Decision making is throttled; movement remains frame-based.
function partnerDangerAt(x,y){
 let risk=0,point={x,y};
 for(const h of humans){if(!h.alive||h.stun>0)continue;const d=Math.hypot(h.x-x,h.y-y);if(d<270&&los(h,point))risk+=(h.st?65:120)*(1-d/400);}
 for(const e of etanks){if(!e.alive)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<340&&los(e,point))risk+=(e.st?90:145)*(1-d/460);}
 return risk;
}
function updatePartner(dt){
 if(skill!=='partner'||!p)return;
 if(!partner){
  partner={x:p.x+24,y:p.y+32,face:p.body,hp:3,down:false,off:10,moving:false,mode:'advance',modeT:0,planT:0,shotCd:0,stunT:0,backup:false,route:null};
  recallSeparatedPartner(partner,0);
 }
 const q=partner;
 if(updatePartnerPassenger(q,dt))return;
 q.grappleT=Math.max(0,(q.grappleT||0)-dt);
 recallSeparatedPartner(q,dt);
 if(q.reentryT>0){
  q.reentryT=Math.max(0,q.reentryT-dt);
  const ox=q.x,oy=q.y,goal={x:q.x,y:q.reentryGoalY};
  partnerCompanionMove(q,goal,q.vehicle?110:105,dt);
  q.moving=Math.hypot(q.x-ox,q.y-oy)>.1;
  if(q.moving)q.face=Math.atan2(q.y-oy,q.x-ox);
  if(Math.abs(q.y-q.reentryGoalY)<6)q.reentryT=0;
  if(!q.down)return;
 }
 if(q.down){
  if(!p.tank&&Math.hypot(p.x-q.x,p.y-q.y)<22){q.down=false;q.hp=3;q.modeT=0;q.planT=0;burst(q.x,q.y,10,'#8ad9ff',75);say('相棒を救助！');}
  return;
 }
 if(q.stunT>0){q.stunT=Math.max(0,q.stunT-dt);q.stunContactDelay=Math.max(0,(q.stunContactDelay||0)-dt);q.moving=false;if(q.stunContactDelay<=0&&!p.tank&&D(q,p)<22)q.stunT=0;if(q.stunT<=0){q.planT=0;burst(q.x,q.y,8,'#8ad9ff',70);say('相棒が気絶から復帰！');}return;}
 partnerVehicleAttack(q,dt);
 if(partnerKnockoutPatrol(dt))return;
 // 命令は通常の自律判断より優先。ただしルート入力中はその場で待機する。
 if(partnerOrder.drawing){q.moving=false;return;}
 if(q.routeWait>0){q.routeWait=Math.max(0,q.routeWait-dt);q.moving=false;return;}
 if(q.route&&q.routeIndex<q.route.length){
  if(q.boardTarget&&(!cars.includes(q.boardTarget)||q.boardTarget.f<=0)){q.boardTarget=null;q.boardAt=null;}
  // 搭乗成功後は当フレームから車両としてルートの次区間へ進む。
  let goingToBoard=!!(q.boardTarget&&!q.vehicle&&q.routeIndex>=q.boardAt);
  if(goingToBoard&&D(q,q.boardTarget)<=50){
   if(partnerBoardVehicle(q,q.boardTarget))goingToBoard=false;
  }
  const destination=goingToBoard?q.boardTarget:q.route[q.routeIndex],
        oldX=q.x,oldY=q.y,before=D(q,destination);
  q.routePointT=(q.routePointT||0)+dt;
  if(before<16){if(!goingToBoard){q.routeIndex++;q.routePointT=0;q.routeStuckT=0;q.wallFollow=null;}}
  else{
   partnerCompanionMove(q,destination,q.vehicle?Math.min(q.vehicle.t.sp||155,155):155,dt);
   const after=D(q,destination),moved=Math.hypot(q.x-oldX,q.y-oldY);
   q.routeStuckT=(moved<.12||after>before+.3)?(q.routeStuckT||0)+dt:Math.max(0,(q.routeStuckT||0)-dt);
   // 遠方の乗り物へ向かう間は通常のルートより長く猶予を設ける。
   const timeout=goingToBoard?Math.max(5.5,Math.min(20,before/110+5.5)):5.5;
   if(q.routeStuckT>1.1||q.routePointT>timeout){rollbackPartnerRoute(q);return;}
   if(after<16&&!goingToBoard){q.routeIndex++;q.routePointT=0;q.routeStuckT=0;q.wallFollow=null;}
  }
  q.moving=Math.hypot(q.x-oldX,q.y-oldY)>.1;
  if(q.moving)q.face=Math.atan2(q.y-oldY,q.x-oldX);
  if(q.routeIndex>=q.route.length){q.route=null;q.routeStart=null;q.planT=0;say('相棒が指定ルートを完了！');}
  return;
 }
 if(isPartnerDrivenVehicle()){q.moving=false;return;}
 if(q.backup){
  const oldX=q.x,oldY=q.y,d=D(q,p);
  if(d<49){q.backup=false;q.planT=0;q.moving=false;}
  else partnerCompanionMove(q,{x:p.x+Math.cos(p.body+Math.PI)*23,y:p.y+Math.sin(p.body+Math.PI)*23},195,dt);
  q.moving=Math.hypot(q.x-oldX,q.y-oldY)>.1;
  if(q.moving)q.face=Math.atan2(q.y-oldY,q.x-oldX);
  return;
 }
  const vx=(p.x-(q.prevPX??p.x))/Math.max(dt,.001),vy=(p.y-(q.prevPY??p.y))/Math.max(dt,.001);
 q.prevPX=p.x;q.prevPY=p.y;
 // Low-pass speed, to avoid mode switching on every frame.
 q.playerSpeed=(q.playerSpeed||0)*.86+Math.hypot(vx,vy)*.14;
 const playerHidden=!p.tank&&inBush(p),partnerHidden=inBush(q);
 const playerThreat=humans.some(h=>h.alive&&h.st&&h.target==='p')||etanks.some(e=>e.alive&&e.st&&e.target==='p');
 const partnerThreat=humans.some(h=>h.alive&&h.st&&h.target==='partner')||etanks.some(e=>e.alive&&e.st&&e.target==='partner');
 q.shotCd=Math.max(0,(q.shotCd||0)-dt);
 q.modeT=Math.max(0,(q.modeT||0)-dt);
 q.planT=Math.max(0,(q.planT||0)-dt);
 // Combat is event-driven; slower intents are committed for about one second.
 let desired=playerHidden?'stealth':q.playerSpeed>175?'breakthrough':q.playerSpeed<18?'hold':q.playerSpeed<92?'cautious':'advance';
 if(playerThreat||partnerThreat)desired=q.playerSpeed>145?'retreat':'combat';
 if(q.modeT<=0||desired==='combat'||desired==='retreat'){
  if(q.mode!==desired){q.mode=desired;q.planT=0;}
  q.modeT=(desired==='combat'||desired==='retreat') ? 0.6 : 1.0;
 }
 // 画面追従範囲は相棒の自律行動用。画面外復帰処理とは独立して計算する。
 const cx=Math.max(0,Math.min(WW-W,p.x-W/2)),cy=Math.max(0,Math.min(WH-H,p.y-H*.6));
 const left=cx+25,right=cx+W-25,top=cy+25,bottom=cy+H-25;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const far=Math.hypot(q.x-p.x,q.y-p.y);
 if(q.planT<=0){
  q.planT=.35;
  const preferredY=clamp(p.y-(q.mode==='advance'?95:q.mode==='breakthrough'?75:35),top,bottom);
  let options=[{x:p.x-65,y:preferredY},{x:p.x+65,y:preferredY},{x:q.x,y:preferredY},{x:p.x,y:p.y+25}];
  if(playerHidden)options=[{x:p.x-15,y:p.y+10},{x:p.x+15,y:p.y+10},...nearbyBushes(p.x,p.y,130).slice(0,8).map(b=>({x:b.x+b.w/2,y:b.y+b.h/2}))];
  else if(q.mode==='stealth'||q.mode==='cautious'||q.mode==='hold'||q.mode==='retreat'){
   options.push(...nearbyBushes(q.x,q.y,175).slice(0,8).map(b=>({x:b.x+b.w/2,y:b.y+b.h/2})));
   for(const c of coversInBox(q.x-170,q.y-170,q.x+170,q.y+170).slice(0,9)){
    options.push({x:c.x-17,y:c.y+c.h/2},{x:c.x+c.w+17,y:c.y+c.h/2});
   }
  }
  if(q.mode==='combat'){
   for(const h of humans)if(h.alive&&h.st&&D(h,q)<220){options.push({x:h.x-110,y:h.y+30},{x:h.x+110,y:h.y+30});break;}
  }
  let best=null,bestScore=Infinity;
  for(const c of options){
   if(c.x<left||c.x>right||c.y<top||c.y>bottom||hitsC(c.x,c.y,9))continue;
   const d=Math.hypot(c.x-q.x,c.y-q.y),dp=Math.hypot(c.x-p.x,c.y-p.y);
   const risk=partnerDangerAt(c.x,c.y),hide=inBush(c);
   let score=d*.25+Math.max(0,dp-135)*1.2+Math.max(0,55-dp)*.8+(c.y-p.y)*.14;
   if(q.mode==='stealth'||q.mode==='cautious'||q.mode==='hold')score+=risk*2.4-(hide?110:0);
   else if(q.mode==='retreat')score+=risk*2.8-(hide?80:0);
   else if(q.mode==='combat')score+=risk*.9;
   else score+=risk*.38;
   if(q.mode==='hold')score+=d*.7;
   if(score<bestScore){bestScore=score;best={x:c.x,y:c.y};}
  }
  q.goal=best||{x:clamp(p.x+30,left,right),y:clamp(p.y-25,top,bottom)};
 }
 // Close formation while waiting; sprint to catch up, but do not imitate each step.
 if(far>240)q.goal={x:clamp(p.x+25,left,right),y:clamp(p.y+20,top,bottom)};
 const oldX=q.x,oldY=q.y,goal=q.goal;
 const speed=q.mode==='breakthrough'?245:q.mode==='advance'?140:q.mode==='combat'?125:q.mode==='retreat'?180:q.mode==='hold'?55:q.mode==='stealth'?75:90;
 if(goal&&Math.hypot(goal.x-q.x,goal.y-q.y)>14)partnerCompanionMove(q,goal,far>240?235:speed,dt);
 if(oldX>=left&&oldX<=right&&oldY>=top&&oldY<=bottom){q.x=clamp(q.x,left,right);q.y=clamp(q.y,top,bottom);}
 q.moving=Math.hypot(q.x-oldX,q.y-oldY)>.12;
 if(q.moving)q.face=Math.atan2(q.y-oldY,q.x-oldX);
 // Only engage after the team is in combat; don't break stealth with an unsolicited shot.
 if(!q.vehicle&&q.mode==='combat'&&!partnerHidden&&q.shotCd<=0){
  let enemy=null,best=225;
  for(const h of humans)if(h.alive&&D(h,q)<best&&los(q,h)){enemy=h;best=D(h,q);}
  if(enemy){
   const angle=Math.atan2(enemy.y-q.y,enemy.x-q.x);q.face=angle;
   fire(q.x+Math.cos(angle)*13,q.y+Math.sin(angle)*13,angle+(R()-.5)*.07,'ally','v',480,205);
   q.shotCd=.75;
  }
 }
}
// 添付のハンドサインと同じグー／指差しを静止吹き出しで表示。
function drawPartnerHandSign(x,y,pointing){
 g.save();g.translate(x,y-43);g.fillStyle='#fff4d7';g.strokeStyle='#473e2c';g.lineWidth=1.5;
 g.beginPath();g.roundRect(-19,-17,38,32,8);g.fill();g.stroke();
 g.beginPath();g.moveTo(-4,14);g.lineTo(0,21);g.lineTo(5,14);g.fill();g.stroke();
 g.font='25px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#222';g.fillText(pointing==='call'?'🫴':pointing?'👉':'✊',0,0);g.restore();
}
function drawPartnerOrderSignal(){
 const q=partner;if(skill!=='partner'||!q||!p||q.down||q.stunT>0)return;
 if(partnerOrder.drawing||partnerOrder.signalT>0)drawPartnerHandSign(p.x,p.y,partnerOrder.drawing?false:partnerOrder.signalKind);
}
function drawPartner(){
 if(!partner||skill!=='partner')return;const q=partner;
 if(q.passengerVehicle===p.tank&&p.tank)return;
 if(partnerOrder.drawing){
  g.save();g.strokeStyle='#76d5ff';g.lineWidth=3;g.setLineDash([8,5]);g.beginPath();
  partnerOrder.path.forEach((pt,i)=>{if(!i)g.moveTo(pt.x,pt.y);else g.lineTo(pt.x,pt.y);});
  if(partnerOrder.cursor)g.lineTo(partnerOrder.cursor.x,partnerOrder.cursor.y);
  g.stroke();g.setLineDash([]);
  const tip=partnerOrder.cursor||partnerOrder.path[partnerOrder.path.length-1];
  let from=null;for(let i=partnerOrder.path.length-1;i>=0;i--){const pt=partnerOrder.path[i];if(tip&&Math.hypot(tip.x-pt.x,tip.y-pt.y)>1){from=pt;break;}}
  if(tip&&from){const a=Math.atan2(tip.y-from.y,tip.x-from.x);g.fillStyle='#76d5ff';g.beginPath();g.moveTo(tip.x,tip.y);g.lineTo(tip.x-Math.cos(a-.5)*15,tip.y-Math.sin(a-.5)*15);g.lineTo(tip.x-Math.cos(a+.5)*15,tip.y-Math.sin(a+.5)*15);g.closePath();g.fill();}
  g.restore();
 }


 if(q.down){
  // 横たわった兵士：頭・胴体・曲がった腕・開いた脚を静止描画。
  g.save();g.translate(q.x,q.y);g.rotate(q.face+.8);
  g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.ellipse(0,3,23,10,0,0,Math.PI*2);g.fill();
  g.lineCap='round';g.lineJoin='round';g.strokeStyle='#18271e';g.lineWidth=7;
  g.beginPath();g.moveTo(5,-2);g.lineTo(14,-5);g.lineTo(21,-3);g.moveTo(5,3);g.lineTo(13,8);g.lineTo(19,10);g.stroke();
  g.strokeStyle='#4b6650';g.lineWidth=5;g.beginPath();g.moveTo(-6,-3);g.lineTo(-3,-10);g.lineTo(4,-11);g.moveTo(-6,4);g.lineTo(-10,10);g.lineTo(-3,13);g.stroke();
  g.fillStyle='#111912';g.fillRect(18,-6,7,5);g.fillRect(18,8,6,5);
  g.fillStyle='#54745c';g.strokeStyle='#23382b';g.lineWidth=1.5;g.beginPath();g.ellipse(-2,1,10,6,0,0,Math.PI*2);g.fill();g.stroke();
  g.fillStyle='#344b3c';g.fillRect(-4,-4,9,9);
  g.fillStyle='#baa585';g.beginPath();g.arc(-14,3,5,0,Math.PI*2);g.fill();
  g.fillStyle='#4e6855';g.strokeStyle='#17291d';g.beginPath();g.ellipse(-16,0,7,6,.15,0,Math.PI*2);g.fill();g.stroke();
  g.strokeStyle='#399bff';g.lineWidth=2;g.beginPath();g.moveTo(-21,-1);g.lineTo(-12,0);g.stroke();g.restore();
  g.save();g.translate(q.x,q.y-26);g.fillStyle='#f3f3f3';g.strokeStyle='#a83232';g.lineWidth=1.5;g.beginPath();g.roundRect(-11,-8,22,17,3);g.fill();g.stroke();g.fillStyle='#d52b31';g.fillRect(-2,-6,4,13);g.fillRect(-7,-1,14,4);g.strokeStyle='#a83232';g.beginPath();g.moveTo(-4,-8);g.lineTo(-4,-11);g.lineTo(4,-11);g.lineTo(4,-8);g.stroke();g.restore();return;
 }
 if(isPartnerDrivenVehicle())return;
 if(q.vehicle){
  drawVehicle(q.vehicle,q.x,q.y,q.face,q.vehicleAim??q.face);
  // Blue marker distinguishes the companion-operated vehicle from the player's.
  g.fillStyle='#3c9ef5';g.beginPath();g.arc(q.x,q.y-21,4.5,0,Math.PI*2);g.fill();
  if(q.stunT>0)lab('★',q.x,q.y-42,'bold 18px system-ui','#ffd85a');
  return;
 }
 soldier(q.x,q.y,q.face,true,false,q.moving,false,'',true,'blue');
 if(q.grappleT>0&&q.grappleTarget&&q.grappleTarget.alive){
  const h=q.grappleTarget,a=Math.atan2(h.y-q.y,h.x-q.x),k=1-q.grappleT/.45;
  g.save();g.strokeStyle='rgba(255,230,170,'+(1-k*.25)+')';g.lineWidth=3;g.beginPath();
  g.moveTo(q.x+Math.cos(a+.55)*8,q.y+Math.sin(a+.55)*8);g.lineTo(h.x-Math.cos(a)*5,h.y-Math.sin(a)*5);
  g.moveTo(q.x+Math.cos(a-.55)*8,q.y+Math.sin(a-.55)*8);g.lineTo(h.x-Math.cos(a)*5,h.y-Math.sin(a)*5);
  g.stroke();g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=2;
  for(let i=-1;i<=1;i++){const off=i*7;g.beginPath();g.moveTo(q.x-Math.cos(a)*10+Math.cos(a+1.57)*off,q.y-Math.sin(a)*10+Math.sin(a+1.57)*off);
   g.lineTo(q.x-Math.cos(a)*20+Math.cos(a+1.57)*off,q.y-Math.sin(a)*20+Math.sin(a+1.57)*off);g.stroke();}
  g.restore();
 }
 if(q.stunT>0){
  // Exactly the enemy soldier's rotating three-star stun graphic.
  const tt=performance.now()*.006;g.fillStyle='#ffd85a';
  for(let i=0;i<3;i++){const a=tt+i*2.094,x=q.x+Math.cos(a)*13,y=q.y-18+Math.sin(a)*5;
   g.save();g.translate(x,y);g.rotate(a);g.beginPath();g.moveTo(0,-4);g.lineTo(2,-1);g.lineTo(5,0);
   g.lineTo(2,1);g.lineTo(0,4);g.lineTo(-2,1);g.lineTo(-5,0);g.lineTo(-2,-1);g.closePath();g.fill();g.restore();
  }
 }
}
