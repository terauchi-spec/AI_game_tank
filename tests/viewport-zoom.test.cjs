const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(state='play'){
 function node(){return{events:new Map(),addEventListener(type,fn,options){this.events.set(type,{fn,options});},emit(type,extra={}){const e={cancelable:true,preventDefault(){this.prevented=true},...extra};this.events.get(type).fn(e);return e;}};}
 const c={state,document:node(),cv:node(),pad:node()};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('// プレイ中だけ誤ズームを抑止する。'),html.indexOf("document.addEventListener('contextmenu'")),c);return c;
}
test('pinch start, change, end and double tap are blocked during play and pause',()=>{
 for(const state of ['play','paused']){const c=harness(state);for(const type of ['gesturestart','gesturechange','gestureend','dblclick']){assert.equal(c.document.emit(type).prevented,true);assert.equal(c.document.events.get(type).options.capture,true);assert.equal(c.document.events.get(type).options.passive,false);}}
});
test('game zoom guards leave title, explanations, skill selection, result and name entry alone',()=>{
 for(const state of ['title','help','spec','skill','stage','intro','win','failed','leaderboard','developer']){const c=harness(state);for(const type of ['gesturestart','gesturechange','gestureend','dblclick'])assert.ok(!c.document.emit(type).prevented);for(const el of [c.cv,c.pad])assert.ok(!el.emit('touchstart',{touches:[{},{}]}).prevented);}
});
test('the second finger is prevented on game surfaces without blocking one-finger controls or stopping dispatch',()=>{
 const c=harness();for(const el of [c.cv,c.pad]){assert.ok(!el.emit('touchstart',{touches:[{}]}).prevented);assert.equal(el.emit('touchstart',{touches:[{},{}]}).prevented,true);assert.equal(el.events.get('touchstart').options.passive,false);}
 c.state='paused';assert.ok(!c.pad.emit('touchstart',{touches:[{},{}]}).prevented);
});
test('uncancelable events are safe and no per-move handler or polling is added by zoom guards',()=>{
 const c=harness();assert.ok(!c.document.emit('gesturechange',{cancelable:false}).prevented);assert.ok(!c.pad.emit('touchstart',{touches:[{},{}],cancelable:false}).prevented);assert.ok(!c.pad.events.has('touchmove'));assert.ok(!c.document.events.has('touchmove'));
});
test('the gameplay common ancestor and menu buttons exclude zoom while paused menus can scroll',()=>{
 assert.match(html,/body\.gameplay-active\{touch-action:none\}/);
 assert.match(html,/body\.gameplay-active #resetBtn,body\.gameplay-active #debugToggleBtn,body\.gameplay-active #debugBadge\{touch-action:none\}/);
 assert.match(html,/body\.game-paused,body\.game-paused #gameMenu,body\.game-paused #gameMenu \*\{touch-action:pan-y\}/);
});
