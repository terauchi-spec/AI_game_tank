const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function harness(){let requests=0;const image={getAttribute:()=>image.current||null,set src(value){image.current=value;requests++;}},label={};const c={document:{getElementById:id=>id==='resRankBadge'?image:label}};vm.createContext(c);vm.runInContext(html.slice(html.indexOf('const RESULT_RANKS='),html.indexOf('function renderResultScreen(')),c);return {c,image,label,requests:()=>requests};}
test('every result rank selects its own WebP badge and accessible rank name',()=>{
 const {c,image,label}=harness();for(const rank of ['S','A','B','C','D','E','F']){c.setResultRankArtwork(rank);assert.equal(image.current,'assets/ui/ranks/rank_'+rank.toLowerCase()+'.webp?v=2026.10.17');assert.match(image.alt,new RegExp(rank+'ランク'));assert.equal(label.textContent,rank);}
});
test('rendering the same rank avoids a repeated asset request and invalid ranks use the recruit badge',()=>{
 const h=harness();h.c.setResultRankArtwork('S');h.c.setResultRankArtwork('S');assert.equal(h.requests(),1);h.c.setResultRankArtwork('<invalid>');assert.match(h.image.current,/rank_f\.webp/);assert.equal(h.label.textContent,'F');
});
test('all seven badges are distinct transparent WebP assets within the UI size budget',()=>{
 const hashes=new Set();let total=0;const crypto=require('node:crypto');for(const rank of 'sabcdef'){const b=fs.readFileSync(path.join(__dirname,'../assets/ui/ranks/rank_'+rank+'.webp'));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.equal(b.toString('ascii',12,16),'VP8X');assert.ok(b[20]&0x10);assert.equal(b.readUIntLE(24,3)+1,256);assert.equal(b.readUIntLE(27,3)+1,256);assert.ok(b.length<50000);total+=b.length;hashes.add(crypto.createHash('sha256').update(b).digest('hex'));}assert.equal(hashes.size,7);assert.ok(total<250000);
});
