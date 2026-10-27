const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),source=html.slice(html.indexOf('const VEHICLE_HUD_ARMOR_MAX='),html.indexOf('const STATIC_COVER_DRAW_COLORS='));
function harness(touch=true){
 const text=[],icons=[],gauges=[],lines=[],rects=[],paths=[];let depth=0;
 const g=new Proxy({save(){depth++},restore(){depth--},fillText(s,x,y){text.push({s,x,y})},fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle});},moveTo(x,y){lines.push({x,y});},beginPath(){paths.push(true);}},{get:(o,k)=>k in o?o[k]:()=>{}});
 const c={g,p:{},TOUCH:touch,H:720,areaDebugEnabled:false,debugMode:0};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('const PLAYER_TANK_FUEL_SCALE='),html.indexOf('const ZONE_STYLE=')),c);vm.runInContext(source,c);c.get=code=>vm.runInContext(code,c);
 const icon=c.drawVehicleHudIcon,gauge=c.drawVehicleHudGauge;
 c.drawVehicleHudIcon=(...args)=>{icons.push(args);icon(...args)};c.drawVehicleHudGauge=(...args)=>{gauges.push(args);gauge(...args)};
 return {c,text,icons,gauges,lines,rects,paths,draw(v){c.p.tank=v;c.drawVehicleBottomHud();assert.equal(depth,0);}};
}
function assertRatios(actual,expected){assert.equal(actual.length,expected.length);actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<1e-10,value+' vs '+expected[i]));}
const tank=()=>({kind:'tank',t:{id:'t34',n:'T-34(ソ連)',armor:2,cmax:11,vmax:72,fmax:100},ch:.5,c:8,v:57,f:60});
test('tank HUD uses shield and fuel gauges plus shell and bullet counts on mobile and desktop',()=>{
 for(const touch of [true,false]){
  const h=harness(touch);Object.defineProperty(h.c.p,'cc',{get(){throw Error('tank reload timing must not be displayed')}});h.draw(tank());
  assert.deepEqual(h.text.map(t=>t.s),['T-34(ソ連)','8/11','57/72']);
  assert.deepEqual(h.icons.map(i=>i[0]),['shield','shell','ammo','fuel']);
  assertRatios(h.gauges.map(a=>a[3]),[1.5/2.4,60/163.8]);assert.equal(h.gauges.length,2);
  for(const i of h.icons)assert.ok(i[1]>8&&i[1]<(touch?226:244)&&i[2]>0&&i[2]<720);
 }
});
test('armored car reuses the shield, machine-gun ammunition and fuel components without a cannon slot',()=>{
 const h=harness();h.draw({kind:'tank',t:{id:'armored',n:'装甲車',armor:1,vmax:120,fmax:100},ch:.6,v:65,f:20});
 assert.deepEqual(h.text.map(t=>t.s),['装甲車','65/120']);assert.deepEqual(h.icons.map(i=>i[0]),['shield','ammo','fuel']);
 assertRatios(h.gauges.map(a=>a[3]),[.4/2.4,20/163.8]);
});
test('truck displays remaining durability from received hits and shares the fuel gauge',()=>{
 const h=harness();h.draw({kind:'truck',t:{id:'truck',n:'トラック',fmax:100},mgHits:3,f:75});
 assert.deepEqual(h.text.map(t=>t.s),['トラック']);assert.deepEqual(h.icons.map(i=>i[0]),['shield','fuel']);
 assertRatios(h.gauges.map(a=>a[3]),[.4,75/163.8]);
});
test('fighter uses aircraft health for its shield gauge and retains bombing status without a reload gauge',()=>{
 const h=harness(false);h.c.p.cc=0;h.draw({kind:'fighter',t:{id:'fighter',n:'戦闘機',hp:8,fmax:100},hp:4,f:40});
 assert.deepEqual(h.icons.map(i=>i[0]),['shield','fuel']);assertRatios(h.gauges.map(a=>a[3]),[.5,40/163.8]);
 assert.deepEqual(h.text.map(t=>t.s),['戦闘機','D  爆撃 READY']);
});
test('empty and overfilled resources stay within their gauge bounds and zero ammunition remains readable',()=>{
 const h=harness(),v=tank();Object.assign(v,{ch:99,f:200,c:0,v:0});h.draw(v);
 assertRatios(h.gauges.map(a=>a[3]),[0,100/163.8]);assert.deepEqual(h.text.map(t=>t.s),['T-34(ソ連)','0/11','0/72']);
});
test('debug ammunition retains an unlimited count and fuel indicator',()=>{
 const h=harness(),v=tank();v.debugInfinite=true;h.draw(v);
 assert.deepEqual(h.text.map(t=>t.s),['T-34(ソ連)','∞/11','∞/72','∞']);
});
test('on-foot players do not draw the vehicle HUD',()=>{
 const h=harness();h.draw(null);assert.equal(h.icons.length,0);assert.equal(h.gauges.length,0);assert.equal(h.text.length,0);
});

test('all seven real tanks show capacity differences on common absolute armor and fuel scales',()=>{
 const h=harness(),types=h.c.get('TYPES');
 for(const t of types){h.gauges.length=0;h.draw({kind:'tank',t,ch:0,f:t.fmax,c:t.cmax,v:t.vmax});assertRatios(h.gauges.map(a=>a[3]),[t.armor/2.4,t.fmax/163.8]);assertRatios(h.gauges.map(a=>a[5]),[t.armor/2.4,t.fmax/163.8]);}
 assert.equal(new Set(Array.from(types,t=>t.armor)).size,7);assert.equal(h.c.get('VEHICLE_HUD_ARMOR_MAX'),2.4);assert.ok(Math.abs(h.c.get('VEHICLE_HUD_FUEL_MAX')-163.8)<1e-10);
});
test('equal absolute remaining armor and fuel have equal lengths across vehicles; warning colors use local remaining fraction',()=>{
 const h=harness(),types=h.c.get('TYPES'),result=[];
 for(const t of [types[0],types[6]]){h.gauges.length=0;h.draw({kind:'tank',t,ch:t.armor-1,f:50,c:0,v:0});result.push(h.gauges.map(a=>a[3]));}
 assertRatios(result[0],result[1]);h.gauges.length=0;h.draw({kind:'tank',t:types[0],ch:0,f:types[0].fmax,c:0,v:0});assert.equal(h.gauges[0][4],'#9bd477');assert.equal(h.gauges[1][4],'#dce7b8');
});
test('ticks are limited to the filled active portion, stay on the common scale and require no more than eleven marks',()=>{
 const h=harness();for(const [fill,capacity] of [[0,.6],[.25,.6],[.6,.6],[1,1]]){h.lines.length=0;h.rects.length=0;h.c.drawVehicleHudGauge(10,20,120,fill,'green',capacity);assert.ok(h.lines.length<=11);for(const tick of h.lines)assert.ok(tick.x>10&&tick.x<10+120*fill);if(!fill)assert.equal(h.lines.length,0);const color=h.rects.find(r=>r.color==='green');assert.equal(color.w,120*fill);}
});
