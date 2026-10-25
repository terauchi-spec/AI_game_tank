const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(extra={}){
 const particles=[],sounds=[],damage=[],c={state:'play',debugInvincible:false,areaDebugEnabled:false,p:{hp:0,x:123,y:456,drill:3,dig:2,digPrep:1},shake:0,flash:0,deathT:0,recordPlayerDamage:n=>damage.push(n),sfx:n=>sounds.push(n),burst:(...v)=>particles.push(v),...extra};
 vm.createContext(c);const a=html.indexOf('function triggerPlayerDeath(){');vm.runInContext(html.slice(a,html.indexOf('function damagePlayerByOwnBomb()',a)),c);return{c,particles,sounds,damage};
}
test('player defeat uses the normal enemy infantry defeat particles once and retains death transition and sound',()=>{
 const h=harness();h.c.triggerPlayerDeath();assert.deepEqual(h.particles,[[123,456,12,'#c05a3a',160]]);assert.deepEqual(h.sounds,['deathHit']);assert.equal(h.c.state,'dying');assert.equal(h.c.deathT,1.35);for(const v of ['hp','drill','dig','digPrep'])assert.equal(h.c.p[v],0);h.c.triggerPlayerDeath();assert.equal(h.particles.length,1);
});
test('invincibility, area debug and non-playing states do not emit defeat particles or enter death',()=>{
 for(const extra of [{debugInvincible:true},{areaDebugEnabled:true},{state:'failed'},{state:'title'}]){const h=harness(extra);h.c.triggerPlayerDeath();assert.equal(h.particles.length,0);assert.equal(h.sounds.length,0);assert.notEqual(h.c.state,'dying');}
});
