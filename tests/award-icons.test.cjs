// Run: node --test tests/award-icons.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const c={};vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('const RES_AXES='),html.indexOf('function evaluateRunTitles(')),c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/award-icons.js'),'utf8'),c);
const read=code=>vm.runInContext(code,c);
const titles=read('TITLE_CATALOG'),medals=read('MEDAL_CATALOG');
test('all 40 current titles, 22 medals and 40 legacy titles have complete icon definitions',()=>{
 assert.equal(titles.filter(t=>!t.legacy).length,40);assert.equal(medals.length,22);assert.equal(titles.filter(t=>t.legacy).length,40);
 for(const [kind,entries] of [['title',titles],['medal',medals]])for(const entry of entries){const spec=c.awardIconSpec(entry,kind);assert.ok(spec,`${kind} ${entry.id}`);assert.ok(read(`AWARD_SYMBOLS[${JSON.stringify(spec.main)}]`));if(spec.secondary)assert.ok(read(`AWARD_SYMBOLS[${JSON.stringify(spec.secondary)}]`));const svg=c.awardIcon(entry,kind);assert.ok(svg.startsWith('<svg'));assert.ok(!svg.includes('undefined'));assert.match(svg,/aria-hidden="true"/);}
});
test('all current titles and medals have distinct visual compositions',()=>{
 const t=titles.filter(t=>!t.legacy).map(t=>c.awardIcon(t));assert.equal(new Set(t).size,t.length);
 const m=medals.map(t=>c.awardIcon(t,'medal'));assert.equal(new Set(m).size,m.length);
});
test('every axis has distinct normal, elite and legendary emblems; combinations use two axis symbols',()=>{
 for(let i=0;i<8;i++){const entries=[`v2_single_${i}_normal`,`v2_single_${i}_elite`,`v2_legend_${i}`].map(id=>titles.find(t=>t.id===id));assert.equal(new Set(entries.map(e=>c.awardIcon(e))).size,3);assert.equal(new Set(entries.map(e=>c.awardIconSpec(e).main)).size,1);}
 for(const entry of titles.filter(t=>t.axes)){const spec=c.awardIconSpec(entry);assert.equal(spec.main,read(`AWARD_AXIS_SYMBOLS[${entry.axes[0]}]`));assert.equal(spec.secondary,read(`AWARD_AXIS_SYMBOLS[${entry.axes[1]}]`));}
});
test('result chips retain readable names and NEW state alongside an icon, with escaped text',()=>{
 const entry={...titles[0],name:'<img src=x onerror=alert(1)>'};const chip=c.renderAwardChip(entry,'title',true);assert.ok(chip.includes('<svg'));assert.ok(chip.includes('NEW!'));assert.ok(chip.includes('&lt;img'));assert.ok(!chip.includes('<img'));assert.ok(c.renderAwardChip(titles[0]).includes(titles[0].name));
});
test('icons are static and self contained, and cached rather than regenerated for result re-renders',()=>{
 const svg=c.awardIcon(titles[0]);assert.equal(svg,c.awardIcon(titles[0]));assert.ok(!/animate|filter=|<image|<use|href=|<script|style=|url\(/i.test(svg));const size=read('awardIconCache.size');for(let i=0;i<100;i++)c.awardIcon(titles[0]);assert.equal(read('awardIconCache.size'),size);assert.equal(c.awardIcon(null),'');assert.equal(c.awardIcon({id:'missing'}),'');
});
