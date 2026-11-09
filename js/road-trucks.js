// One bounded traffic event per generated road; inactive roads do no spatial searches.
let roadTruckEvents=[];
const ROAD_TRUCK_HALF_LENGTH=33,ROAD_TRUCK_HALF_WIDTH=22;
function jungleRoadTruckMode(){
 return stageMode==='escapeTest'||(areaDebugEnabled&&selectedAreaDebug==='密林');
}
function setupRoadTruckEvents(){
 roadTruckEvents=[];
 if(!jungleRoadTruckMode()&&(areaDebugEnabled||stageMode!=='base'||!['baseIntermediate','base'].includes(currentStageId())))return;
 for(const road of roadBands){
  const dir=R()<.5?1:-1,unload=R()<.5;
  const passengers=unload?1+(R()*3|0):0;
  const arrivalDelay=R()<.5?2+R()*3:0;
  roadTruckEvents.push({road,dir,unload,passengers,arrivalDelay,dropped:0,state:'waiting',
   x:0,y:road.y+road.h/2+(road.lanes>1?dir*road.h/4:0),body:dir>0?0:Math.PI,speed:190,t:0,
   kind:'truck',hp:5,maxHp:5});
 }
}
function roadTruckDropSoldier(truck){
 if(!roadTruckActive(truck))return false;
 const r=truck.road,back=truck.x-truck.dir*54;
 // Search only the open road around the tailgate; never use freeSpot's distant fallback.
 for(const dx of [0,-24,24,-48,48,-72,72])for(const side of [-1,1]){
  const q={x:back+dx,y:Math.max(r.y+14,Math.min(r.y+r.h-14,truck.y+side*(27+truck.dropped*4)))};
  if(q.x<16||q.x>WW-16||hitsM(q.x,q.y,10)||humans.some(h=>h.alive&&D(h,q)<23)||
   etanks.some(e=>e.alive&&D(e,q)<TANK_HIT+14)||cars.some(c=>c.kind!=='fighter'&&D(c,q)<38)||
   (p&&D(p,q)<(p.tank?40:18)))continue;
  const path=[q];
  for(const offset of [-90,90,-55,55]){
   const to={x:Math.max(16,Math.min(WW-16,q.x+offset)),y:q.y};
   if(D(q,to)>25&&patrolLineClear(q,to,8)){path.push(to);break;}
  }
  if(path.length<2)continue;
  humans.push({x:q.x,y:q.y,path,loop:false,wi:1,dir:1,stk:0,alive:true,st:0,sus:0,lost:0,
   cd:.7,face:Math.atan2(path[1].y-q.y,path[1].x-q.x),target:null,foundPause:0,
   patrolMode:'axis',elite:false,roadReinforcement:true,walkStartX:q.x,walkStartY:q.y});
  truck.dropped++;return true;
 }
 return false;
}
function updateRoadTrucks(dt){
 if(state!=='play'||(!jungleRoadTruckMode()&&(stageMode!=='base'||areaDebugEnabled)))return;
 const cy=Math.max(0,Math.min(WH-H,p.y-H*.6)),cx=Math.max(0,Math.min(WW-W,p.x-W/2));
 for(const truck of roadTruckEvents){
  if(truck.state==='done'||truck.state==='destroyed')continue;
  if(truck.state==='waiting'){
   if(truck.y<cy||truck.y>cy+H)continue;
   truck.arrivalDelay=Math.max(0,truck.arrivalDelay-dt);
   if(truck.arrivalDelay>1e-9)continue;
   truck.x=truck.dir>0?Math.max(-80,cx-80):Math.min(WW+80,cx+W+80);
   truck.stopX=Math.max(100,Math.min(WW-100,cx+W*(.35+R()*.30)));
   truck.state='entering';
  }
  truck.previousX=truck.x;
  if(truck.state==='unloading'){
   truck.t-=dt;
   if(truck.t<=0){
    if(truck.dropped<truck.passengers){roadTruckDropSoldier(truck);truck.t=.4;}
    else{truck.state='leaving';}
   }
   continue;
  }
  const next=truck.x+truck.dir*truck.speed*dt;
  if(truck.state==='entering'&&truck.unload&&truck.dir*(next-truck.stopX)>=0){
   truck.x=truck.stopX;truck.state='unloading';truck.t=.65;
  }else{
   truck.x=next;
   if(truck.dir>0?truck.x>WW+90:truck.x<-90)truck.state='done';
  }
 }
}
function drawRoadTrucks(cx,cy){
 for(const truck of roadTruckEvents)if(roadTruckActive(truck)&&drawPointInView(truck.x,truck.y,cx,cy,90)){
  truckShape(truck.x,truck.y,truck.body,28,true);
  if(truck.hp<truck.maxHp){g.fillStyle='#341c1c';g.fillRect(truck.x-22,truck.y-30,44,4);g.fillStyle='#f09372';g.fillRect(truck.x-22,truck.y-30,44*truck.hp/truck.maxHp,4);}
 }
}
function roadTruckActive(t){return t.hp>0&&t.state!=='waiting'&&t.state!=='done'&&t.state!=='destroyed';}
// Include the distance driven this update so a fast-moving truck cannot skip a bomb.
function roadTruckOnBomb(bomb){
 for(const truck of roadTruckEvents){
  if(!roadTruckActive(truck)||Math.abs(bomb.y-truck.y)>ROAD_TRUCK_HALF_WIDTH)continue;
  const from=truck.previousX??truck.x;
  if(bomb.x>=Math.min(from,truck.x)-ROAD_TRUCK_HALF_LENGTH&&bomb.x<=Math.max(from,truck.x)+ROAD_TRUCK_HALF_LENGTH)return truck;
 }
 return null;
}
// Road trucks face east/west. Use a small slab test, not sprite pixels or a world scan.
function roadTruckSegmentT(a,b,t,pad=0){
 let lo=0,hi=1;
 for(const [start,delta,min,max] of [[a.x,b.x-a.x,t.x-ROAD_TRUCK_HALF_LENGTH-pad,t.x+ROAD_TRUCK_HALF_LENGTH+pad],[a.y,b.y-a.y,t.y-ROAD_TRUCK_HALF_WIDTH-pad,t.y+ROAD_TRUCK_HALF_WIDTH+pad]]){
  if(Math.abs(delta)<1e-9){if(start<min||start>max)return null;continue;}
  let p=(min-start)/delta,q=(max-start)/delta;if(p>q)[p,q]=[q,p];lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>hi)return null;
 }
 return lo;
}
function damageRoadTruck(t,damage,x=t.x,y=t.y){
 if(!roadTruckActive(t)||!(damage>0))return false;
 t.hp=Math.max(0,t.hp-damage);sfx('vehicleHit',t);burst(x,y,4,'#ffe1a0',90);
 if(t.hp>0)return true;
 t.state='destroyed';t.speed=0;
 spawnVehicleWreck({kind:'truck',t:TRUCK_TYPE},t.x,t.y,t.body,t.body,x,y);
 sfx('vehicleDestroyed',t);fb(t.x,t.y,42);burst(t.x,t.y,40,'#ff8a3a',290);shake=Math.max(shake,9);
 return true;
}
function damageRoadTrucksInRadius(x,y,rad){
 for(const t of roadTruckEvents)if(roadTruckActive(t)){
  const nx=Math.max(t.x-ROAD_TRUCK_HALF_LENGTH,Math.min(t.x+ROAD_TRUCK_HALF_LENGTH,x)),ny=Math.max(t.y-ROAD_TRUCK_HALF_WIDTH,Math.min(t.y+ROAD_TRUCK_HALF_WIDTH,y));
  if(Math.hypot(nx-x,ny-y)<rad)damageRoadTruck(t,5,nx,ny);
 }
}
function hitRoadTruckBullet(b,ox,oy){
 if(b.from!=='p'&&b.from!=='ally')return false;
 const a={x:ox,y:oy},end={x:b.x,y:b.y};let target=null,first=Infinity;
 for(const t of roadTruckEvents)if(roadTruckActive(t)){const at=roadTruckSegmentT(a,end,t,b.k==='c'?2:0);if(at!=null&&at<first){target=t;first=at;}}
 if(!target)return false;
 const hit={x:ox+(end.x-ox)*first,y:oy+(end.y-oy)*first};
 // Earlier scenery must still stop the projectile before it can damage a truck.
 if(segmentBaseImpact(a,hit,1)||objectsInBox(Math.min(ox,hit.x),Math.min(oy,hit.y),Math.max(ox,hit.x),Math.max(oy,hit.y)).some(o=>segmentHitsObject(a,hit,o,0))||
  coversInBox(Math.min(ox,hit.x),Math.min(oy,hit.y),Math.max(ox,hit.x),Math.max(oy,hit.y)).some(c=>segmentHitsCover(a,hit,c,0)))return false;
 // Keep a nearer infantry/tank impact in the ordinary projectile handler.
 let nearer=first;
 for(const h of humans)if(h.alive){const at=gunTowerSegmentT(a,end,h,b.k==='v'&&b.from==='p'?18:10);if(at!=null&&at<nearer)nearer=at;}
 for(const e of etanks)if(e.alive){const at=gunTowerSegmentT(a,end,e,TANK_HIT);if(at!=null&&at<nearer)nearer=at;}
 if(nearer<first){const at=Math.min(first,nearer+.001);b.x=ox+(end.x-ox)*at;b.y=oy+(end.y-oy)*at;return false;}
 b.x=hit.x;b.y=hit.y;damageRoadTruck(target,b.k==='c'?5:b.k==='s'?2:1,hit.x,hit.y);
 if(b.k==='c'){cannonImpact(hit.x,hit.y,b.from);explode(hit.x,hit.y,28,false,b.from,b.actionId||0);}
 return true;
}
