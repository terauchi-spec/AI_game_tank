// WebP title medals are fetched only when results or the collection render.
const TITLE_WEBP_IDS=new Set(["v3_single_0_normal", "v3_single_0_elite", "v3_single_1_normal", "v3_single_1_elite", "v3_single_2_normal", "v3_single_2_elite", "v3_single_3_normal", "v3_single_3_elite", "v3_single_4_normal", "v3_single_4_elite", "v3_single_5_normal", "v3_single_5_elite", "v3_single_6_normal", "v3_single_6_elite", "v3_single_7_normal", "v3_single_7_elite", "v3_ghost_sniper", "v3_armored_assault", "v3_front_commander", "v3_shadow_pair", "v3_versatile", "v3_infantry", "v3_chain", "v3_one_shot", "v3_legend_0", "v3_legend_1", "v3_legend_2", "v3_legend_3", "v3_legend_4", "v3_legend_5", "v3_legend_6", "v3_legend_7", "v3_all_stages_clear", "v3_mythic_complete"]);
const TITLE_WEBP_VERSION="2026.10.24.0013";
// Static SVG award emblems. Used only while rendering results / the collection.
// No bitmaps, filters, animation loops or gameplay-time entity searches.
const AWARD_AXIS_SYMBOLS=['flag','stealth','assault','blast','footsteps','tactics','teamwork','survival'];
const AWARD_V2_SYMBOLS=['stealth','precision','assault','blast','destruction','mobility','tactics','teamwork'];
const AWARD_LEGACY_SYMBOLS=['stealth','recon','precision','assault','blast','mobility','tactics','survival'];
const AWARD_SYMBOLS=Object.freeze({
 stealth:'<path d="M5 25V15a11 11 0 0 1 22 0v10l-5-3-6 5-6-5Z"/><path d="m9 16 4 1m6 0 4-1M12 9l4-2 4 2"/>',
 precision:'<circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="4"/><path d="M16 2v7m0 14v7M2 16h7m14 0h7"/>',
 assault:'<path d="m8 28 6-15-7 1L22 3l-5 12 8-1Z"/><path d="m4 8 4-4m16 23 4-4"/>',
 blast:'<path d="m16 2 3 8 8-5-3 9 7 3-9 4 3 9-9-5-8 5 2-10-9-3 9-4-3-8 8 5Z"/><circle cx="16" cy="17" r="3"/>',
 destruction:'<path d="M3 12h12v16H3Zm16-8h10v11H19ZM20 22l7 6m-5-11 7 3M3 20h12M9 12v8M24 4v7h5M14 4l-4 5m5-7 5 1"/>',
 mobility:'<rect x="4" y="17" width="24" height="10" rx="4"/><path d="M8 17v-6h11l4 6m-7-6V7h12M8 22h16M2 9h5M1 13h4"/><circle cx="9" cy="22" r="1"/><circle cx="23" cy="22" r="1"/>',
 tactics:'<path d="M5 26V6h8m-3-3 3 3-3 3M5 21h12v-8h9m-3-3 3 3-3 3"/><circle cx="5" cy="26" r="3"/><path d="m19 22 8 8m0-8-8 8"/>',
 teamwork:'<circle cx="10" cy="9" r="4"/><circle cx="23" cy="11" r="3"/><path d="M2 26v-5a8 8 0 0 1 16 0v5m2-9a6 6 0 0 1 10 5v4M9 25l4 4 8-8"/>',
 recon:'<path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16Z"/><circle cx="16" cy="16" r="4"/><path d="M16 2v3m0 22v3"/>',
 survival:'<path d="m16 3 12 5v8c0 6-6 11-12 14C10 27 4 22 4 16V8Z"/><path d="m10 17 4 4 8-10"/>',
 flag:'<path d="M8 30V3m1 2h18l-4 6 4 6H9M3 30h12"/><path d="m13 10 3 3 5-6"/>',
 shield:'<path d="m16 3 12 5v8c0 6-6 11-12 14C10 27 4 22 4 16V8Z"/><path d="M11 16h10m-5-5v10"/>',
 unseen:'<path d="M3 15s5-8 13-8c5 0 9 3 12 7M6 22c3 2 6 3 10 3 8 0 13-8 13-8M4 29 28 3"/><path d="M12 19a5 5 0 0 1 7-7"/>',
 tank:'<rect x="3" y="18" width="26" height="10" rx="4"/><path d="M7 18v-7h14l4 7m-10-7V6h15M8 23h16"/>',
 chain:'<path d="m13 8 3-3a7 7 0 0 1 10 10l-5 5a7 7 0 0 1-10 0m8 4-3 3A7 7 0 0 1 6 17l5-5a7 7 0 0 1 10 0M11 21l10-10"/>',
 rifle:'<path d="m3 25 5 4 6-9 15-13-4-4-14 14-6 1Zm9-9 5 5m1-12 4 4m-1-8 3-3 5 5-3 3"/>',
 bomb:'<circle cx="14" cy="20" r="10"/><path d="m18 11 3-5 4 3-3 5m1-8 2-3 4 1m-1-3v4m-3-2h6M7 20c0-3 2-5 4-6"/>',
 fleet:'<rect x="2" y="17" width="17" height="10" rx="2"/><path d="M19 20h7l4 4v3H19M6 17v-5h12M22 7h8M25 4l5 3-5 3"/><circle cx="7" cy="28" r="2"/><circle cx="24" cy="28" r="2"/>',
 boot:'<path d="M10 3h12l-2 15 8 5v6H5v-8l5-6Z"/><path d="M11 8h8m-9 5h8M5 25h23"/>',
 multihit:'<path d="M16 2v8M2 16h8m12 0h8M16 22v8"/><circle cx="16" cy="16" r="8"/><circle cx="13" cy="14" r="1"/><circle cx="19" cy="14" r="1"/><circle cx="16" cy="20" r="1"/>',
 footsteps:'<ellipse cx="10" cy="10" rx="4" ry="7" transform="rotate(-25 10 10)"/><ellipse cx="23" cy="21" rx="4" ry="7" transform="rotate(25 23 21)"/><path d="m13 20 2 3M19 5l2 3"/>',
 wall:'<path d="M3 8h22v21H3ZM3 15h22M3 22h22M10 8v7m8 0v7m-8 0v7M30 9l-6 4m6 5h-5m4 8-5-3"/>',
 decoy:'<path d="M12 5v23M5 12h14M7 28l5-10 5 10"/><circle cx="12" cy="7" r="4"/><path d="M22 7a7 7 0 0 1 0 14m3-17a12 12 0 0 1 0 20"/>',
 rescue:'<path d="M10 9V5h12v4M3 10h26v19H3Z"/><path d="M11 19h10m-5-5v10"/>',
 crew:'<path d="M3 20h26v9H3Zm5 0v-5h16v5"/><circle cx="11" cy="8" r="4"/><circle cx="23" cy="8" r="4"/><path d="M7 14v3m20-3v3M8 25h16"/>',
 versatile:'<path d="m16 2 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z"/><circle cx="16" cy="16" r="4"/><path d="m5 5 3 3m16 16 3 3M5 27l3-3M24 8l3-3"/>',
 empty:'<path d="M8 29V4h18l-5 6 5 6H12M3 29h13M4 4l25 25"/>',
 star:'<path d="m16 3 4 8 9 2-6 7 1 9-8-4-8 4 1-9-6-7 9-2Z"/>',
 heart:'<path d="M16 28 4 16C-4 6 9-1 16 9 23-1 36 6 28 16Z"/>',
 arrow:'<path d="M3 12h16V5l11 11-11 11v-7H3"/>'
});
const AWARD_COLORS=Object.freeze({stealth:'#a8d8b6',precision:'#a9d9ed',assault:'#f2ab91',blast:'#f2c078',destruction:'#d5c3a3',mobility:'#e6d28d',tactics:'#c8b5ea',teamwork:'#a5d9db',recon:'#a9d9ed',survival:'#b7d4a2'});
// Every medal has its own composition, rather than a shared star or emoji.
const AWARD_MEDAL_ICONS=Object.freeze({
 v3_bomb_objective:{main:'bomb',secondary:'flag'},v3_capture_leader:{main:'flag',secondary:'boot'},v3_capture_defense:{main:'shield',secondary:'rifle'},v3_quiet_recovery:{main:'unseen',secondary:'boot'},v3_shadow_return:{main:'unseen',secondary:'arrow'},v3_joint_recovery:{main:'teamwork',secondary:'flag'},
 mission_clear:{main:'flag'},untouched:{main:'shield',secondary:'star'},undetected:{main:'unseen',secondary:'flag'},
 tank_hunter:{main:'tank',secondary:'precision'},chain_five:{main:'chain',number:5},sniper_three:{main:'rifle',number:3},
 bomb_three:{main:'bomb',number:3},three_vehicles:{main:'fleet',number:3},infantry_hero:{main:'boot',secondary:'flag'},one_shot_three:{main:'multihit',number:3},
 v2_stealth:{main:'footsteps',secondary:'unseen',color:'#a8d8b6'},v2_precision:{main:'precision',secondary:'rifle',color:'#a9d9ed'},
 v2_assault:{main:'assault',secondary:'star',color:'#f2ab91'},v2_blast:{main:'blast',secondary:'multihit',color:'#f2c078'},
 v2_destruction:{main:'destruction',secondary:'arrow',color:'#d5c3a3'},v2_mobility:{main:'mobility',secondary:'arrow',color:'#e6d28d'},
 v2_tactics:{main:'tactics',secondary:'star',color:'#c8b5ea'},v2_teamwork:{main:'teamwork',secondary:'heart',color:'#a5d9db'},
 v2_decoy:{main:'decoy'},v2_wall:{main:'wall'},v2_rescue:{main:'rescue',secondary:'heart'},v2_crew:{main:'crew'}
});
const AWARD_SPECIAL_ICONS=Object.freeze({
 v2_no_results:{main:'empty'},v2_challenger:{main:'boot',secondary:'arrow'},v2_versatile:{main:'versatile'},
 v2_infantry:{main:'boot',secondary:'rifle'},v2_chain:{main:'chain',secondary:'assault'},v2_one_shot:{main:'multihit',secondary:'blast'},
 no_results:{main:'empty'},challenger:{main:'boot',secondary:'arrow'},allrounder:{main:'versatile'},
 lone_infantry:{main:'boot',secondary:'rifle'},chain_master:{main:'chain',secondary:'assault'},one_shot_master:{main:'multihit',secondary:'blast'}
});
const AWARD_LEGACY_COMBOS=Object.freeze({ghost_sniper:[0,2],shadow_scout:[0,1],silent_saboteur:[0,4],first_strike:[1,2],battle_schemer:[1,6],demolition_expert:[3,4],armored_assault:[3,5],unyielding_fighter:[3,7],lightning_demolition:[4,5],maneuver_ace:[5,6]});
function awardIconSpec(entry,kind='title'){
 if(!entry)return null;
 if(entry.id==='v3_all_stages_clear'&&kind==='title')return{main:'flag',secondary:'versatile',tier:'legend'};
 if(entry.id==='v3_mythic_complete'&&kind==='title')return{main:'bomb',secondary:'star',tier:'mythic'};
 if(kind==='medal'){const spec=AWARD_MEDAL_ICONS[entry.id]||AWARD_MEDAL_ICONS[entry.id.replace(/^v3_/,'v2_')]||AWARD_MEDAL_ICONS[entry.id.replace(/^v3_/,'')];return spec?{...spec,tier:'medal'}:null;}
 let m=entry.id.match(/^(v[23]_)?single_([0-7])_(normal|elite)$/);
 if(m){const symbols=m[1]==='v3_'?AWARD_AXIS_SYMBOLS:m[1]?AWARD_V2_SYMBOLS:AWARD_LEGACY_SYMBOLS;return{main:symbols[+m[2]],tier:m[3],legacy:!m[1]};}
 m=entry.id.match(/^(v[23]_)?legend_([0-7])$/);
 if(m){const symbols=m[1]==='v3_'?AWARD_AXIS_SYMBOLS:m[1]?AWARD_V2_SYMBOLS:AWARD_LEGACY_SYMBOLS;return{main:symbols[+m[2]],tier:'legend',legacy:!m[1]};}
 if(entry.axes){const symbols=entry.legacy?AWARD_V2_SYMBOLS:AWARD_AXIS_SYMBOLS;return{main:symbols[entry.axes[0]],secondary:symbols[entry.axes[1]],tier:'combo'};}
 const axes=AWARD_LEGACY_COMBOS[entry.id];
 if(axes)return{main:AWARD_LEGACY_SYMBOLS[axes[0]],secondary:AWARD_LEGACY_SYMBOLS[axes[1]],tier:'combo',legacy:true};
 const spec=AWARD_SPECIAL_ICONS[entry.id.replace(/^v3_/,'v2_')];return spec?{...spec,tier:'special',legacy:!!entry.legacy}:null;
}
function escapeAwardText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const awardIconCache=new Map();
function awardIcon(entry,kind='title'){
 if(!entry)return '';
 const key=kind+':'+entry.id;if(awardIconCache.has(key))return awardIconCache.get(key);
 const spec=awardIconSpec(entry,kind);if(!spec)return '';
 if(kind==='title'&&TITLE_WEBP_IDS.has(entry.id)){
  const html='<img class="award-icon award-icon-'+spec.tier+'" src="assets/ui/titles/'+entry.id+'.webp?v='+TITLE_WEBP_VERSION+'" width="256" height="256" alt="" aria-hidden="true" loading="lazy" decoding="async">';
  awardIconCache.set(key,html);return html;
 }
 const color=spec.color||AWARD_COLORS[spec.main]||'#e7d195',legend=spec.tier==='legend',elite=spec.tier==='elite';
 const rim=legend?'#ffe5a0':elite?'#f3d28a':'#9aa98b';
 const frame=kind==='medal'?'<path d="m19 41-3 20 16-7 16 7-3-20" fill="#5b4930" stroke="'+rim+'"/><circle cx="32" cy="26" r="23" fill="#26332b" stroke="'+rim+'"/>':'<path d="M32 3 57 14v19c0 12-11 21-25 28C18 54 7 45 7 33V14Z" fill="#26332b" stroke="'+rim+'"/>';
 const glyph=(name,x,y,size)=>'<g transform="translate('+x+' '+y+') scale('+size/32+')" stroke="'+color+'">'+AWARD_SYMBOLS[name]+'</g>';
 let art=spec.secondary?glyph(spec.main,12,12,30)+'<circle cx="43" cy="40" r="13" fill="#26332b" stroke="'+rim+'"/>'+glyph(spec.secondary,33,30,20):glyph(spec.main,16,kind==='medal'?10:13,32);
 if(spec.number)art+='<circle cx="47" cy="42" r="10" fill="#26332b" stroke="'+rim+'"/><text x="47" y="46" text-anchor="middle" stroke="none" fill="'+color+'" font-size="13" font-weight="900" font-family="system-ui,sans-serif">'+spec.number+'</text>';
 let trim='';
 if(elite)trim='<path d="m24 48 8 4 8-4m-16 5 8 4 8-4" stroke="#f3d28a"/>';
 if(legend)trim='<path d="m22 9-2-7 8 4 4-5 4 5 8-4-2 7ZM10 28l-4 4 6 3-4 5 8 1m38-13 4 4-6 3 4 5-8 1" stroke="#ffe5a0" fill="#665335"/>';
 if(spec.tier==='normal')trim='<path d="m27 51 5 3 5-3" stroke="'+rim+'"/>';
 if(spec.legacy)trim+='<path d="M8 51h9" stroke="#94a18f"/>';
 const svg='<svg class="award-icon award-icon-'+spec.tier+'" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+frame+art+trim+'</g></svg>';
 awardIconCache.set(key,svg);return svg;
}
function renderAwardChip(entry,kind='title',fresh=false){
 if(!entry)return '';
 return '<span class="res-award-chip'+(fresh?' new':'')+(entry.type==='神話級実績'?' mythic':entry.type==='伝説級実績'?' legendary':'')+'">'+awardIcon(entry,kind)+'<span class="award-chip-label">'+(fresh?'<span class="award-new">NEW! </span>':'')+escapeAwardText(entry.name)+'</span></span>';
}
