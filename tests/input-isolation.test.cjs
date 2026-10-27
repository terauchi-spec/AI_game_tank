const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {touchInputHarness}=require('./helpers/touch-input.cjs');
function fixture(mode,deadZone=.12){return touchInputHarness({mode,deadZone,source:fs.readFileSync(path.join(__dirname,'../js/input-test-'+mode+'.js'),'utf8')});}
for(const mode of ['pointer','touch'])test(mode+': isolated real handlers accept repeated A-to-stick handoffs and expose requests once',()=>{
 const h=fixture(mode),api=h.c.window.inputTestAdapter;
 for(let i=0;i<50;i++){
  h.start(h.nodes.aBtn,i*2);assert.equal(api.take().A,true);assert.equal(api.take().A,false);h.end(i*2);
  h.start(h.nodes.stick,i*2+1,50,50);h.move(i*2+1,50,40);assert.equal(api.read().stick,true);assert.equal(h.c.keys.ArrowUp,true);h.end(i*2+1);assert.equal(api.read().stick,false);assert.equal(h.c.keys.ArrowUp,false);
 }
});
for(const mode of ['pointer','touch'])test(mode+': sensitivity is a shared independent variable rather than an input-method difference',()=>{
 for(const deadZone of [.12,.3]){
  const h=fixture(mode,deadZone);h.start(h.nodes.stick,1,50,50);h.move(1,50,40);assert.equal(!!h.c.keys.ArrowUp,deadZone===.12);h.end(1);
 }
});
test('comparison preserves the actual difference between a missing pointerdown and a native touch',()=>{
 for(const mode of ['pointer','touch']){
  const h=fixture(mode);h.start(h.nodes.stick,1,95,50,{pointer:false});assert.equal(!!h.c.keys.ArrowRight,mode==='touch');
 }
});
test('exactly one input snapshot activates in each page',()=>{
 for(const mode of ['pointer','touch']){
  const other=mode==='pointer'?'touch':'pointer',h=fixture(mode);const before=h.c.window.inputTestAdapter;
  h.run(fs.readFileSync(path.join(__dirname,'../js/input-test-'+other+'.js'),'utf8'));assert.equal(h.c.window.inputTestAdapter,before);
 }
});
test('test page loads only its shared UI and the two input snapshots, with no engine, audio or assets',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../input-test.html'),'utf8');
 const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(scripts,['js/input-test-common.js','js/input-test-pointer.js','js/input-test-touch.js']);
 assert.doesNotMatch(html,/<canvas|<audio|<img|requestAnimationFrame|fetch\(/);
 for(const script of scripts)new vm.Script(fs.readFileSync(path.join(__dirname,'..',script),'utf8'));
 for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
});
