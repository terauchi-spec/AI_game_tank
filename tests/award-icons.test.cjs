// Run: node --test tests/award-icons.test.cjs
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const c={};vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('const RES_AXES='),html.indexOf('function evaluateRunTitles(')),c);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/award-icons.js'),'utf8'),c);
const read=code=>vm.runInContext(code,c);
const titles=read('TITLE_CATALOG.filter(t=>!t.legacy)');
test('all 34 current titles have complete icon definitions',()=>{
 assert.equal(titles.length,34);assert.ok(titles.every(t=>t.id.startsWith('v3_')));
 for(const [kind,entries] of [['title',titles]])for(const entry of entries){const spec=c.awardIconSpec(entry,kind);assert.ok(spec,`${kind} ${entry.id}`);assert.ok(read(`AWARD_SYMBOLS[${JSON.stringify(spec.main)}]`));if(spec.secondary)assert.ok(read(`AWARD_SYMBOLS[${JSON.stringify(spec.secondary)}]`));const svg=c.awardIcon(entry,kind);assert.ok(svg.startsWith('<img'));assert.ok(!svg.includes('undefined'));assert.match(svg,/aria-hidden="true"/);}
});
test('all current titles have distinct visual compositions',()=>{
 const t=titles.filter(t=>!t.legacy).map(t=>c.awardIcon(t));assert.equal(new Set(t).size,t.length);
});
test('every axis has distinct normal, elite and legendary emblems; combinations use two axis symbols',()=>{
 for(let i=0;i<8;i++){const entries=[`v3_single_${i}_normal`,`v3_single_${i}_elite`,`v3_legend_${i}`].map(id=>titles.find(t=>t.id===id));assert.equal(new Set(entries.map(e=>c.awardIcon(e))).size,3);assert.equal(new Set(entries.map(e=>c.awardIconSpec(e).main)).size,1);}
 for(const entry of titles.filter(t=>t.axes)){const spec=c.awardIconSpec(entry);assert.equal(spec.main,read(`AWARD_AXIS_SYMBOLS[${entry.axes[0]}]`));assert.equal(spec.secondary,read(`AWARD_AXIS_SYMBOLS[${entry.axes[1]}]`));}
});
test('result chips retain readable names and NEW state alongside an icon, with escaped text',()=>{
 const entry={...titles[0],name:'<img src=x onerror=alert(1)>'};const chip=c.renderAwardChip(entry,'title',true);assert.ok(chip.includes('<img class="award-icon'));assert.ok(chip.includes('NEW!'));assert.ok(chip.includes('&lt;img'));assert.ok(!chip.includes('<img src=x'));assert.ok(!chip.includes('onerror="'));assert.ok(c.renderAwardChip(titles[0]).includes(titles[0].name));
});
test('title medal images are lazy, asynchronous, decorative, sized and cached',()=>{
 const svg=c.awardIcon(titles[0]);assert.equal(svg,c.awardIcon(titles[0]));assert.match(svg,/loading="lazy"/);assert.match(svg,/decoding="async"/);assert.match(svg,/width="256" height="256"/);assert.match(svg,/assets\/ui\/titles\/v3_single_0_normal\.webp/);assert.ok(!/<script|onerror=|style=|<svg/i.test(svg));const size=read('awardIconCache.size');for(let i=0;i<100;i++)c.awardIcon(titles[0]);assert.equal(read('awardIconCache.size'),size);assert.equal(c.awardIcon(null),'');assert.equal(c.awardIcon({id:'missing'}),'');
});

function resultAwards(awards){
 c.renderCareerRank=()=>{};
 const nodes=new Map();c.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);}};
 vm.runInContext(html.slice(html.indexOf('function renderAwardResult('),html.indexOf("let trophyTab='title';")),c);c.renderAwardResult({awards});return id=>nodes.get(id);
}
test('all secondary titles render once with first acquisitions first',()=>{
 const aw={primary:titles[0].id,titles:titles.slice(0,6).map(t=>t.id),newTitles:[titles[5].id],disabled:false};
 const el=resultAwards(aw),main=el('resEarnedTitles').innerHTML;assert.equal((main.match(/class="res-award/g)||[]).length,5);assert.ok(main.indexOf(titles[5].name)<main.indexOf(titles[1].name));assert.ok(!main.includes(titles[0].name));for(const t of titles.slice(1,6))assert.ok(main.includes(t.name));
});
test('empty result preserves debug and save-failure notices',()=>{
 for(const flag of ['disabled','saveFailed']){const el=resultAwards({titles:[],newTitles:[],[flag]:true});assert.match(el('resEarnedTitles').innerHTML,/獲得なし/);assert.match(el('resAwardNote').textContent,flag==='disabled'?/デバッグ/:/保存できません/);}
});
test('UI contains no medal tab or removed result element references',()=>{
 assert.ok(!html.includes('trophyTabMedals'));for(const id of ['resMedals','resOtherAwards','resOtherMedals','resMedalNote'])assert.ok(!html.includes("'"+id+"'"));assert.ok(html.includes('全34種'));
});

test('each live title maps to its own transparent 256px WebP within the transfer budget',()=>{
 const files=titles.map(t=>path.join(__dirname,'../assets/ui/titles',t.id+'.webp'));let total=0;
 for(const file of files){const b=fs.readFileSync(file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&16,'alpha channel '+file);assert.equal(b.readUIntLE(24,3)+1,256);assert.equal(b.readUIntLE(27,3)+1,256);assert.ok(b.length<45000,'per image budget');total+=b.length;}
 assert.ok(total<900000,'32 image budget');const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/title-medal-art.json'),'utf8'));assert.equal(manifest.titles.length,34);assert.deepEqual(new Set(manifest.titles.map(t=>t.id)),new Set(titles.map(t=>t.id)));
});
