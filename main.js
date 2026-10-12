const BOARD_ROWS=4,BOARD_COLS=7,HEX_RADIUS=33,HEX_W=60,HEX_H=50,BOARD_X=210,BOARD_Y=46,BENCH_ROWS=2,BENCH_COLS=6,BENCH_SIZE=54,BENCH_STEP=62,BENCH_X=126,BENCH_Y=300,RESERVE_X=126,RESERVE_Y=414,RESERVE_Y_MAX=468,RESERVE_SLOTS=3,CANVAS_W=820,CANVAS_H=470,ARENA={x0:30,x1:790,y0:25,y1:285},BASE_ATK_MS=650;
const STATE={phase:"prep",gold:10,level:1,exp:0,hp:100,round:0,winStreak:0,loseStreak:0,selected:null,sellMode:!1,faction:null,wins:0,aegis:!1,ace:!1,shop:[null,null,null,null,null],board:Array.from({length:BOARD_ROWS},()=>Array(BOARD_COLS).fill(null)),bench:new Array(BENCH_ROWS*BENCH_COLS).fill(null),reserve:new Array(RESERVE_SLOTS).fill(null),battle:null};
let canvas=null,ctx=null,lastTs=0,actx=null,muted=!1;
function ensureAudio(){if(!actx)try{actx=new(window.AudioContext||window.webkitAudioContext)}catch(e){actx=null}actx&&actx.state==="suspended"&&actx.resume()}
function beep(freq,dur,type,vol){if(!muted&&(ensureAudio(),!!actx))try{const o=actx.createOscillator(),g=actx.createGain();o.type=type||"sine",o.frequency.value=freq;const v=vol||.05,t=actx.currentTime;g.gain.setValueAtTime(v,t),g.gain.exponentialRampToValueAtTime(1e-4,t+(dur||.12)),o.connect(g),g.connect(actx.destination),o.start(t),o.stop(t+(dur||.12)+.03)}catch(e){}}
const SFX={buy(){beep(880,.09,"triangle",.06),setTimeout(()=>beep(1320,.09,"triangle",.05),55)},sell(){beep(320,.12,"sawtooth",.04)},place(){beep(540,.07,"square",.045)},start(){beep(170,.18,"sawtooth",.06),setTimeout(()=>beep(120,.26,"sawtooth",.06),120)},hit(){beep(200,.035,"square",.018)},skill(){beep(680,.14,"sine",.05),setTimeout(()=>beep(1020,.16,"sine",.04),85)},win(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,.22,"triangle",.055),i*130))},lose(){[400,330,262,196].forEach((f,i)=>setTimeout(()=>beep(f,.3,"sawtooth",.05),i*155))},err(){beep(120,.12,"square",.05)},levelup(){[660,880,1100].forEach((f,i)=>setTimeout(()=>beep(f,.14,"triangle",.05),i*90))},aegis(){[196,392,587,784].forEach((f,i)=>setTimeout(()=>beep(f,.5,"sawtooth",.06),i*180))}};
function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
let toastTimer=null;
function toast(msg,isErr){const el=document.getElementById("toast");el&&(el.textContent=msg,el.style.color=isErr?"#e63946":"#f6d365",el.style.borderColor=isErr?"#c1121f":"#8a6d10",el.classList.add("show"),clearTimeout(toastTimer),toastTimer=setTimeout(()=>el.classList.remove("show"),1700))}
function maxUnits(){return Math.min(MAX_LEVEL,STATE.level)}
function boardCount(){let n=0;for(let r=0;r<BOARD_ROWS;r++)for(let c=0;c<BOARD_COLS;c++)STATE.board[r][c]&&n++;return n}
function ownedCount(name){let n=0;for(let r=0;r<BOARD_ROWS;r++)for(let c=0;c<BOARD_COLS;c++)STATE.board[r][c]&&STATE.board[r][c].name===name&&n++;for(let i=0;i<STATE.bench.length;i++)STATE.bench[i]&&STATE.bench[i].name===name&&n++;for(let i=0;i<STATE.reserve.length;i++)STATE.reserve[i]&&STATE.reserve[i].name===name&&n++;return n}
function cellCenter(r,c){let x=BOARD_X+c*HEX_W;return r%2===1&&(x+=HEX_W/2),{x,y:BOARD_Y+r*HEX_H}}
function isMaxed(c){const s=(c&&c.star)||1;return s>=3}
function maxedNames(){const set={};const scan=u=>{if(u&&(u.star||1)>=3)set[u.name]=1};for(let r=0;r<BOARD_ROWS;r++)for(let c=0;c<BOARD_COLS;c++)scan(STATE.board[r][c]);STATE.bench.forEach(scan);STATE.reserve.forEach(scan);return set}
function init(){canvas=document.getElementById("gameCanvas"),canvas&&(ctx=canvas.getContext("2d"),canvas.addEventListener("click",onCanvasClick),resetState(),updateUI(),requestAnimationFrame(loop)),renderFactionSelect()}
function resetState(){STATE.phase="prep",STATE.gold=BASE_GOLD,STATE.level=1,STATE.exp=0,STATE.hp=100,STATE.round=0,STATE.winStreak=0,STATE.loseStreak=0,STATE.selected=null,STATE.sellMode=!1,STATE.wins=0,STATE.aegis=!1,STATE.ace=!1,STATE.shop=[null,null,null,null,null],STATE.board=Array.from({length:BOARD_ROWS},()=>Array(BOARD_COLS).fill(null)),STATE.bench=new Array(BENCH_ROWS*BENCH_COLS).fill(null),STATE.reserve=new Array(RESERVE_SLOTS).fill(null),STATE.battle=null;const sellBtn=document.getElementById("btn-sell");sellBtn&&(sellBtn.textContent="🗑 賣出角色")}
function loop(ts){const dt=lastTs?Math.min(50,ts-lastTs):16;lastTs=ts,STATE.phase==="battle"&&STATE.battle&&updateBattle(dt),drawGame(),requestAnimationFrame(loop)}
function drawGame(){if(ctx){ctx.clearRect(0,0,CANVAS_W,CANVAS_H),ctx.fillStyle="rgba(120,140,200,.05)";for(let i=0;i<40;i++){const x=i*137.5%CANVAS_W,y=i*89.3%CANVAS_H;ctx.fillRect(x,y,1.4,1.4)}STATE.phase==="battle"&&STATE.battle?drawBattlefield():drawFormation()}}
function drawFormation(){
  for(let r=0;r<BOARD_ROWS;r++)for(let c=0;c<BOARD_COLS;c++){const p=cellCenter(r,c),unit=STATE.board[r][c],sel=STATE.selected&&STATE.selected.type==="board"&&STATE.selected.r===r&&STATE.selected.c===c;drawHexagon(p.x,p.y,HEX_RADIUS,sel?"rgba(232,185,35,.28)":unit?"rgba(66,80,120,.35)":"rgba(30,38,60,.5)",sel?"#e8b923":"#38405e"),unit&&drawToken(p.x,p.y,25,unit)}
  ctx.fillStyle="#8a90a8",ctx.font="bold 12px 'Noto Sans TC', Arial",ctx.textAlign="left",ctx.textBaseline="alphabetic",ctx.fillText("【 備 戰 區 】",BENCH_X,BENCH_Y-8);
  ctx.fillStyle="#5a6178",ctx.font="11px 'Noto Sans TC', Arial",ctx.textAlign="right",ctx.fillText("點選角色 → 點棋盤／備戰格即可部署與交換",790,BENCH_Y-8);
  for(let i=0;i<BENCH_ROWS*BENCH_COLS;i++){const br=Math.floor(i/BENCH_COLS),bc=i%BENCH_COLS,x=BENCH_X+bc*BENCH_STEP,y=BENCH_Y+br*58,sel=STATE.selected&&STATE.selected.type==="bench"&&STATE.selected.i===i;roundRect(x,y,BENCH_SIZE,BENCH_SIZE,8),ctx.fillStyle=sel?"rgba(232,185,35,.22)":"rgba(20,25,40,.75)",ctx.fill(),ctx.strokeStyle=sel?"#e8b923":"#333c5a",ctx.lineWidth=2,ctx.stroke(),STATE.bench[i]&&drawToken(x+BENCH_SIZE/2,y+BENCH_SIZE/2,21,STATE.bench[i])}
  ctx.fillStyle=STATE.aegis?"#f6d365":"#5a6178",ctx.font="bold 11px 'Noto Sans TC', Arial",ctx.textAlign="left",ctx.textBaseline="alphabetic",ctx.fillText("🛡 最終防線儲備",RESERVE_X,RESERVE_Y-5);
  for(let i=0;i<RESERVE_SLOTS;i++){const x=RESERVE_X+i*BENCH_STEP,y=RESERVE_Y,sel=STATE.selected&&STATE.selected.type==="reserve"&&STATE.selected.i===i;roundRect(x,y,BENCH_SIZE,RESERVE_Y_MAX-y,8),ctx.fillStyle=sel?"rgba(246,211,101,.25)":(STATE.reserve[i]?"rgba(60,45,20,.8)":"rgba(20,25,40,.55)"),ctx.fill(),ctx.strokeStyle=sel?"#f6d365":(STATE.reserve[i]?"#8a6d10":"#333c5a"),ctx.lineWidth=2,ctx.stroke(),STATE.reserve[i]&&drawToken(x+BENCH_SIZE/2,y+(RESERVE_Y_MAX-y)/2,20,STATE.reserve[i]),!STATE.reserve[i]&&(ctx.fillStyle="#4a5162",ctx.font="10px 'Noto Sans TC', Arial",ctx.textAlign="center",ctx.textBaseline="middle",ctx.fillText("儲備",x+BENCH_SIZE/2,y+(RESERVE_Y_MAX-y)/2))}
}
function drawBattlefield(){
  const b=STATE.battle,g=ctx.createLinearGradient(0,ARENA.y0,0,ARENA.y1);g.addColorStop(0,"rgba(80,20,20,.18)"),g.addColorStop(1,"rgba(20,30,60,.18)"),ctx.fillStyle=g,ctx.fillRect(ARENA.x0,ARENA.y0,ARENA.x1-ARENA.x0,ARENA.y1-ARENA.y0),ctx.strokeStyle="rgba(232,185,35,.12)",ctx.lineWidth=1,ctx.strokeRect(ARENA.x0,ARENA.y0,ARENA.x1-ARENA.x0,ARENA.y1-ARENA.y0),ctx.font="bold 12px 'Noto Sans TC', Arial",ctx.textAlign="left",ctx.textBaseline="alphabetic",ctx.fillStyle="#e5533d",ctx.fillText("敵方 · "+(STATE.faction==="中原正道"?"異度魔界":"中原群俠"),ARENA.x0+8,ARENA.y0+16),ctx.fillStyle="#e8b923",ctx.fillText("我方 · 群俠",ARENA.x0+8,ARENA.y1-8);
  const pAlive=b.player.filter(u=>u.alive).length,eAlive=b.enemy.filter(u=>u.alive).length;ctx.textAlign="right",ctx.fillStyle="#9aa0b4",ctx.fillText("存活  我方 "+pAlive+"  vs  敵方 "+eAlive,ARENA.x1-8,ARENA.y0+16);
  const px0=ARENA.x0+8,py0=ARENA.y0+24;
  STATE.ace&&(ctx.fillStyle="#f56565",ctx.font="bold 11px 'Noto Sans TC', Arial",ctx.fillText("👑 最終王牌降臨",px0,py0+30)),STATE.aegis&&(ctx.fillStyle="#f6d365",ctx.font="bold 11px 'Noto Sans TC', Arial",ctx.fillText("🛡 最終防線降臨",px0+(STATE.ace?130:0),py0+30));
  b.player.concat(b.enemy).filter(u=>u.alive).sort((a,z)=>a.py-z.py).forEach(u=>drawBattleUnit(u)),b.fx.forEach(f=>{const a=clamp(f.life/700,0,1);ctx.globalAlpha=a,ctx.fillStyle=f.color,ctx.font="bold "+(f.big?20:14)+"px 'Noto Sans TC', Arial",ctx.textAlign="center",ctx.textBaseline="middle",ctx.fillText(f.text,f.x,f.y-(700-f.life)*.03),ctx.globalAlpha=1});
}
function drawBattleUnit(u){u.castFx>0&&(ctx.beginPath(),ctx.arc(u.px,u.py,26+(1-u.castFx/400)*22,0,Math.PI*2),ctx.strokeStyle="rgba(246,211,101,"+u.castFx/400+")",ctx.lineWidth=3,ctx.stroke());const grad=ctx.createRadialGradient(u.px-6,u.py-6,3,u.px,u.py,26);grad.addColorStop(0,u.team==="player"?"#3a4a78":"#7a2f2f"),grad.addColorStop(1,u.team==="player"?"#1a2240":"#3d1414"),ctx.beginPath(),ctx.arc(u.px,u.py,25,0,Math.PI*2),ctx.fillStyle=grad,ctx.fill(),ctx.lineWidth=2.5,ctx.strokeStyle=u.color||"#e8b923",ctx.stroke(),ctx.fillStyle="#f0ece0",ctx.font="bold 11px 'Noto Sans TC', Arial",ctx.textAlign="center",ctx.textBaseline="middle",ctx.fillText(u.name,u.px,u.py-2),ctx.font="9px Arial",ctx.fillStyle="#f6d365",ctx.fillText("★".repeat(u.stars),u.px,u.py+11);const bw=46,bh=5,bx=u.px-bw/2,by=u.py-36;ctx.fillStyle="rgba(0,0,0,.7)",ctx.fillRect(bx-1,by-1,bw+2,bh+2),ctx.fillStyle="rgba(40,46,66,.9)",ctx.fillRect(bx,by,bw,bh);const ratio=clamp(u.hp/u.maxHp,0,1);if(ctx.fillStyle=u.team==="player"?"#48bb78":"#e53e3e",ctx.fillRect(bx,by,bw*ratio,bh),u.shield>0){ctx.fillStyle="rgba(66,153,225,.85)";const sr=clamp(u.shield/u.maxHp,0,1);ctx.fillRect(bx+bw*ratio,by,bw*Math.min(sr,1-ratio),bh)}const my=by+bh+2;ctx.fillStyle="rgba(40,46,66,.9)",ctx.fillRect(bx,my,bw,3),ctx.fillStyle="#9f7aea",ctx.fillRect(bx,my,bw*clamp(u.mana/u.maxMana,0,1),3)}
function drawHexagon(x,y,r,fill,stroke){ctx.beginPath();for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6,hx=x+r*Math.cos(a),hy=y+r*Math.sin(a);i===0?ctx.moveTo(hx,hy):ctx.lineTo(hx,hy)}ctx.closePath(),ctx.fillStyle=fill,ctx.fill(),ctx.strokeStyle=stroke,ctx.lineWidth=2,ctx.stroke()}
function roundRect(x,y,w,h,r){if(ctx.beginPath(),ctx.roundRect){ctx.roundRect(x,y,w,h,r);return}ctx.moveTo(x+r,y),ctx.arcTo(x+w,y,x+w,y+h,r),ctx.arcTo(x+w,y+h,x,y+h,r),ctx.arcTo(x,y+h,x,y,r),ctx.arcTo(x,y,x+w,y,r),ctx.closePath()}
function drawToken(cx,cy,r,unit){const grad=ctx.createRadialGradient(cx-6,cy-6,3,cx,cy,r);grad.addColorStop(0,"#2c3554"),grad.addColorStop(1,"#141a2c"),ctx.beginPath(),ctx.arc(cx,cy,r,0,Math.PI*2),ctx.fillStyle=grad,ctx.fill(),ctx.lineWidth=3,ctx.strokeStyle=unit.color||"#e8b923",ctx.stroke();const st=unit.star||1;for(let i=0;i<st;i++)ctx.beginPath(),ctx.arc(cx-(st-1)*5+i*10,cy-r+3,3,0,Math.PI*2),ctx.fillStyle="#f6d365",ctx.fill();ctx.fillStyle="#f0ece0",ctx.font="bold 11px 'Noto Sans TC', Arial",ctx.textAlign="center",ctx.textBaseline="middle",ctx.fillText(unit.name,cx,cy)}
function pointerPos(e){const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)*(CANVAS_W/rect.width),y:(e.clientY-rect.top)*(CANVAS_H/rect.height)}}
function hitCell(mx,my){for(let r=0;r<BOARD_ROWS;r++)for(let c=0;c<BOARD_COLS;c++){const p=cellCenter(r,c);if(Math.hypot(mx-p.x,my-p.y)<=HEX_RADIUS)return{type:"board",r,c}}return null}
function hitBench(mx,my){for(let i=0;i<BENCH_ROWS*BENCH_COLS;i++){const br=Math.floor(i/BENCH_COLS),bc=i%BENCH_COLS,x=BENCH_X+bc*BENCH_STEP,y=BENCH_Y+br*58;if(mx>=x&&mx<=x+BENCH_SIZE&&my>=y&&my<=y+BENCH_SIZE)return{type:"bench",i}}return null}
function hitReserve(mx,my){if(my<RESERVE_Y||my>RESERVE_Y_MAX)return null;for(let i=0;i<RESERVE_SLOTS;i++){const x=RESERVE_X+i*BENCH_STEP;if(mx>=x&&mx<=x+BENCH_SIZE)return{type:"reserve",i}}return null}
function onCanvasClick(e){if(STATE.phase!=="prep")return;ensureAudio();const p=pointerPos(e),target=hitCell(p.x,p.y)||hitBench(p.x,p.y)||hitReserve(p.x,p.y);if(!target){STATE.selected=null;return}handleSelect(target)}
function unitAt(t){return t.type==="bench"?STATE.bench[t.i]:t.type==="reserve"?STATE.reserve[t.i]:STATE.board[t.r][t.c]}
function setUnitAt(t,u){t.type==="bench"?STATE.bench[t.i]=u:t.type==="reserve"?STATE.reserve[t.i]=u:STATE.board[t.r][t.c]=u}
function handleSelect(target){
  const unit=unitAt(target);
  if(STATE.sellMode){if(!unit){STATE.sellMode=!1,document.getElementById("btn-sell").textContent="🗑 賣出角色";return}const refund=unit.cost*((unit.star||1)===1?1:unit.star===2?3:9);STATE.gold+=refund,setUnitAt(target,null),SFX.sell(),toast("賣出 "+unit.name+"，返還 "+refund+" 金"),STATE.sellMode=!1,document.getElementById("btn-sell").textContent="🗑 賣出角色",updateUI(),updateSynergies();return}
  if(!STATE.selected){unit&&(STATE.selected=target,SFX.place());return}
  const sel=STATE.selected;
  if(sel.type===target.type&&(sel.type==="bench"||sel.type==="reserve"||sel.type==="board")&&(sel.type==="board"?sel.r===target.r&&sel.c===target.c:sel.i===target.i)){STATE.selected=null;return}
  const from=unitAt(sel),to=unitAt(target);
  if(target.type==="board"&&sel.type!=="board"&&!to&&boardCount()>=maxUnits()){SFX.err(),toast("上場人數已達上限（等級 "+STATE.level+"："+maxUnits()+" 人）",!0),STATE.selected=null;return}
  setUnitAt(target,from),setUnitAt(sel,to),STATE.selected=null,SFX.place(),updateSynergies(),drawGame();
}
function factionPool(){if(!STATE.faction)return CHAMPIONS.slice();const own=FACTION_GROUPS[STATE.faction]||[];return CHAMPIONS.filter(c=>own.indexOf(c.origin)>=0||NEUTRAL_ORIGINS.indexOf(c.origin)>=0)}
function shopRates(base){const raw=SHOP_ODDS[STATE.level]||SHOP_ODDS[1],avail=raw.map((p,idx)=>base.some(ch=>ch.cost===idx+1)?p:0),sum=avail.reduce((a,b)=>a+b,0);return sum>0?avail.map(v=>v/sum*100):raw}
function refreshShopCards(){
  const base=factionPool(),rates=shopRates(base),maxed=maxedNames();
  STATE.shop=[];
  for(let i=0;i<5;i++){
    const rand=Math.random()*100;let chosenCost=1,cumulative=0;
    for(let c=0;c<rates.length;c++)if(cumulative+=rates[c],rand<=cumulative){chosenCost=c+1;break}
    let pool=base.filter(ch=>ch.cost===chosenCost&&!maxed[ch.name]);
    pool.length===0&&(pool=base.filter(ch=>!maxed[ch.name]));
    pool.length===0&&(pool=base.slice());
    const champ=pick(pool);
    STATE.shop.push(Object.assign({},champ,{star:1}));
  }
  renderShop();
}
function refreshShop(){if(STATE.phase==="prep"){if(STATE.gold<REROLL_COST){SFX.err(),toast("金錢不足（需 "+REROLL_COST+" 金）",!0);return}STATE.gold-=REROLL_COST,refreshShopCards(),SFX.buy(),updateUI()}}
function renderShop(){const box=document.getElementById("shop-cards");box&&(box.innerHTML="",STATE.shop.forEach((item,index)=>{const card=document.createElement("div");if(!item)card.className="card sold",card.innerHTML='<span class="card-name" style="color:#5a6178;font-size:12px;">已招募</span>';else{const owned=ownedCount(item.name),afford=STATE.gold>=item.cost;card.className="card card-cost"+item.cost+(afford?"":" disabled"),card.innerHTML='<div class="card-name">'+item.name+'</div><div class="card-tag"><span class="c-origin">'+item.origin+"</span> · "+item.class+(item.group?' · <span style="color:#e0b64a">✦'+item.group+"</span>":"")+"</div>"+(item.note?'<div class="card-note" style="color:#c8b06a;font-size:11px;margin-top:2px;">⚔ '+item.note+"</div>":"")+'<div class="card-skill">'+item.skill+'</div><div class="card-cost"><span>💰 '+item.cost+'</span><span class="card-owned">'+(owned>0?"已擁有 "+owned:"")+"</span></div>",card.onclick=function(){buyChampion(index)}}box.appendChild(card)}))}
function buyChampion(index){
  if(STATE.phase!=="prep")return;
  const item=STATE.shop[index];if(!item)return;
  if(STATE.gold<item.cost){SFX.err(),toast("金錢不足（需 "+item.cost+" 金）",!0);return}
  let empty=STATE.bench.indexOf(null),toReserve=!1;
  if(empty===-1&&item.group){empty=STATE.reserve.indexOf(null),toReserve=!0}
  if(empty===-1){SFX.err(),toast("備戰區已滿（最終防線儲備格僅限 6 費終極角色）",!0);return}
  STATE.gold-=item.cost,toReserve?STATE.reserve[empty]=item:STATE.bench[empty]=item,STATE.shop[index]=null,SFX.buy(),checkTripleUpgrade(item.name),renderShop(),updateUI(),updateSynergies(),drawGame();
}
function checkTripleUpgrade(name){
  let changed=!1;
  for(let star=1;star<=2;star++){
    const matches=[];
    STATE.bench.forEach((u,i)=>{u&&u.name===name&&(u.star||1)===star&&matches.push({type:"bench",i})});
    STATE.reserve.forEach((u,i)=>{u&&u.name===name&&(u.star||1)===star&&matches.push({type:"reserve",i})});
    for(let r=0;r<BOARD_ROWS;r++)for(let c=0;c<BOARD_COLS;c++){const u=STATE.board[r][c];u&&u.name===name&&(u.star||1)===star&&matches.push({type:"board",r,c})}
    if(matches.length>=3){const keep=matches[0];setUnitAt(matches[1],null),setUnitAt(matches[2],null);const ku=unitAt(keep);ku&&(ku.star=star+1),changed=!0,SFX.levelup(),toast("★ "+name+" 升星至 "+(star+1)+"★！")}
  }
  return changed;
}
function buyExp(){if(STATE.phase==="prep"){if(STATE.level>=MAX_LEVEL){SFX.err(),toast("已達最高等級 "+MAX_LEVEL,!0);return}if(STATE.gold<BUYEXP_COST){SFX.err(),toast("金錢不足（需 "+BUYEXP_COST+" 金）",!0);return}STATE.gold-=BUYEXP_COST,SFX.buy(),addExp(BUYEXP_AMOUNT),updateUI(),renderShop()}}
function addExp(amount){if(!(STATE.level>=MAX_LEVEL)){for(STATE.exp+=amount;STATE.level<MAX_LEVEL&&STATE.exp>=(XP_NEEDED[STATE.level]||0);)STATE.exp-=(XP_NEEDED[STATE.level]||0),STATE.level++,SFX.levelup(),toast("⬆ 等級提升至 "+STATE.level+"（可上場 "+maxUnits()+" 人）");STATE.level>=MAX_LEVEL&&(STATE.exp=0)}}
function updateUI(){
  const set=(id,v)=>{const el=document.getElementById(id);el&&(el.textContent=v)};
  set("gold",STATE.gold),set("level",STATE.level),set("hp",Math.max(0,STATE.hp)),set("siege",Math.min(STATE.round,ROUNDS.length)+" / "+ROUNDS.length),set("hp-label",STATE.faction==="異度魔界"?"魔軍血量":"神州血量"),(()=>{const sb=document.getElementById("siege-box");sb&&(sb.style.display=STATE.faction==="異度魔界"?"inline-block":"none")})(),set("unit-count",boardCount()+"/"+maxUnits()),set("exp",STATE.level>=MAX_LEVEL?"MAX":STATE.exp+"/"+(XP_NEEDED[STATE.level]!=null?XP_NEEDED[STATE.level]:0));
  const r=ROUNDS[Math.min(STATE.round,ROUNDS.length-1)],info=document.getElementById("stage-info");
  info&&(STATE.phase==="battle"?info.innerHTML="第 "+r.stage+" / "+ROUNDS.length+" 波 <small>（戰鬥進行中…）</small>":info.innerHTML="第 "+r.stage+" / "+ROUNDS.length+" 波 <small>（準備階段　敵方 "+enemyCount(r)+" 名）</small>");
  const bb=document.getElementById("btn-battle");bb&&(bb.disabled=STATE.phase!=="prep");
  const at=document.getElementById("aegis-tag");at&&(at.style.display=(STATE.aegis||STATE.ace)?"inline-block":"none",at.textContent=STATE.ace?"👑 最終王牌：棄天帝":(STATE.aegis?"🛡 最終防線：一頁書＋風之痕":""));
}
function computeSynergies(){const counts={};for(let r=0;r<BOARD_ROWS;r++)for(let c=0;c<BOARD_COLS;c++){const u=STATE.board[r][c];u&&(counts[u.origin]=(counts[u.origin]||0)+1,counts[u.class]=(counts[u.class]||0)+1)}const active=[];return Object.keys(SYNERGIES).forEach(key=>{const def=SYNERGIES[key],n=counts[key]||0;let tier=-1;def.thresholds.forEach((t,i)=>{n>=t&&(tier=i)}),tier>=0&&active.push({key,def,count:n,tier,value:def.values[tier]})}),{counts,active}}
function updateSynergies(){const box=document.getElementById("synergies");if(!box)return;const res=computeSynergies(),entries=Object.keys(SYNERGIES).map(key=>({key,def:SYNERGIES[key],count:res.counts[key]||0})).filter(e=>e.count>0).sort((a,b)=>b.count-a.count),sc=document.getElementById("syn-count");if(sc&&(sc.textContent=res.active.length+" 種"),entries.length===0){box.innerHTML='<div class="empty">尚無羈絆<br><small>將角色放上棋盤即會觸發</small></div>';return}box.innerHTML="",entries.forEach(e=>{const def=e.def;let tier=-1;def.thresholds.forEach((t,i)=>{e.count>=t&&(tier=i)});const nextT=def.thresholds.find(t=>e.count<t),div=document.createElement("div");div.className="synergy-item"+(tier>=0?" active tier-active":""),div.style.borderLeftColor=def.color;const head='<div class="s-head"><span class="s-name" style="color:'+def.color+'">'+def.icon+" "+e.key+'</span><span class="s-count">'+e.count+"/"+(nextT!==void 0?nextT:def.thresholds[def.thresholds.length-1])+"</span></div>",eff=tier>=0?'<div class="s-eff">✔ '+def.tiers[tier]+"</div>":'<div class="s-broken">✖ '+def.tiers[0]+"（尚缺 "+(def.thresholds[0]-e.count)+" 人）</div>";div.innerHTML=head+eff,box.appendChild(div)})}
function makeEntity(unit,team,px,py,hpMul,adMul){const c=CHAMPIONS.find(x=>x.id===unit.id)||unit,star=unit.star||1,sm=star===1?1:star===2?1.8:3.2,mul=hpMul||(team==="player"?PLAYER_HP_MUL:1),maxHp=Math.round(c.hp*(COST_BAL[c.cost]||{hp:1}).hp*sm*mul),ad=Math.round(c.ad*(COST_BAL[c.cost]||{ad:1}).ad*(star===1?1:star===2?1.7:3)*1.15*(adMul||1)),mpParts=(c.mp||"0/60").split("/");return{id:c.id,name:c.name,team,color:c.color,cost:c.cost,origin:c.origin,cls:c.class,skill:c.skill,stars:star,px,py,maxHp,hp:maxHp,shield:0,ad,baseAd:ad,armor:c.armor||0,mr:c.mr||0,range:40+(c.range||1)*34,baseAs:(CLASS_AS[c.class]||1)*((COST_BAL[c.cost]||{as:1}).as),atkInterval:BASE_ATK_MS/((CLASS_AS[c.class]||1)*((COST_BAL[c.cost]||{as:1}).as)),asBonus:0,critChance:.05,critDmg:.5,spellPower:0,dmgAmp:0,dr:0,lifesteal:0,splash:0,regen:0,manaRegen:0,buffMul:1,buffUntil:0,mana:parseInt(mpParts[0])||0,maxMana:parseInt(mpParts[1])||60,ability:c.ability,alive:!0,atkCd:500,moveSpd:95,castFx:0,dealt:0,healed:0,assassin:!1}}
function applySynergies(team,res){const teamWide={"苦境正道":1,"異度魔界":1,"玄宗道門":1,"東瀛":1,"紅樓劍閣":1,"識界靈體":1,"獨立梟雄":1,"佛門":1,"醫者":1,"神級":1,"魔界四天王":1,"最終防線":1,"最終王牌":1};res.active.forEach(s=>{const key=s.key,v=s.value,tier=s.tier,n=s.count,targets=teamWide[key]?team:team.filter(u=>u.cls===key);if(targets.length!==0)switch(key){case"苦境正道":targets.forEach(u=>{u.shield+=v,tier>=2&&(u.armor+=20,u.mr+=20)});break;case"異度魔界":targets.forEach(u=>{u.lifesteal+=v/100});break;case"玄宗道門":targets.forEach(u=>{u.spellPower+=v/100,u.mana+=tier===0?15:30});break;case"東瀛":targets.forEach(u=>{u.asBonus+=v/100});break;case"紅樓劍閣":targets.forEach(u=>{u.critChance+=v/100});break;case"識界靈體":targets.forEach(u=>{u.dmgAmp+=v/100});break;case"獨立梟雄":targets.forEach(u=>{u.ad*=1+n*v/100});break;case"劍者":targets.forEach(u=>{u.ad+=v});break;case"刀者":targets.forEach(u=>{u.splash+=v/100});break;case"術法":targets.forEach(u=>{u.spellPower+=v/100,u.manaRegen+=tier===0?20:40});break;case"佛門":targets.forEach(u=>{u.dr+=v/100,tier>=2&&(u.regen+=20)});break;case"魔道":targets.forEach(u=>{u.dmgAmp+=v/100});break;case"弓者":targets.forEach(u=>{u.range+=34,u.critChance+=v/100,u.asBonus+=tier===0?.15:.25});break;case"醫者":targets.forEach(u=>{u.regen+=v});break;case"刺客":targets.forEach(u=>{u.critDmg+=v/100,u.assassin=!0});break;case"重裝":targets.forEach(u=>{u.armor+=v,u.mr+=v});break;case"神級":targets.forEach(u=>{u.dmgAmp+=v/100,u.dr+=v/100});break;case"魔界四天王":targets.forEach(u=>{u.dmgAmp+=v/100,u.lifesteal+=.12});break;case"最終防線":targets.forEach(u=>{u.dmgAmp+=v/100,u.dr+=(tier===0?.10:.20)});break;case"最終王牌":targets.forEach(u=>{u.dmgAmp+=v/100,u.lifesteal+=.20});break;default:break}}),team.forEach(u=>{u.atkInterval=BASE_ATK_MS/(u.baseAs*(1+u.asBonus))})}
function enemyPool(){const foe=STATE.faction==="中原正道"?"異度魔界":"中原正道",own=FACTION_GROUPS[foe]||[];return CHAMPIONS.filter(c=>own.indexOf(c.origin)>=0&&c.group!=="最終防線"&&c.group!=="最終王牌")}
function enemyCount(r){return Math.max(2,Math.min(r.count,maxUnits()+1))}
function buildEnemyTeam(){const r=ROUNDS[STATE.round],all=enemyPool();let pool=all.filter(c=>c.cost<=r.tier&&c.cost>=Math.max(1,r.tier-2));pool.length||(pool=all.filter(c=>c.cost<=r.tier));pool.length||(pool=all);const cnt=enemyCount(r),cols=Math.min(5,cnt),enemy=[];for(let i=0;i<cnt;i++){const ch=pick(pool),row=Math.floor(i/cols),col=i%cols,px=cols===1?410:140+col*(540/(cols-1)),py=52+row*46+randInt(-5,5);{const e=makeEntity({id:ch.id,star:r.star},"enemy",clamp(px,60,760),py,r.hpMul,r.adMul);e.baseAs*=(r.asMul||1),e.atkInterval=BASE_ATK_MS/e.baseAs,enemy.push(e)}}return enemy}
const AEGIS_UNITS=["一頁書","風之痕"],ACE_UNITS=["棄天帝"];
function summonUltimates(){
  const b=STATE.battle;
  const pull=(names,baseX)=>names.map((n,idx)=>{const c=CHAMPIONS.find(x=>x.name===n);return c?makeEntity({id:c.id,star:1},"player",clamp(baseX+(idx-(names.length-1)/2)*140,90,730),150,1):null}).filter(Boolean);
  if(STATE.faction==="異度魔界"){const set=pull(ACE_UNITS,410);if(set.length){STATE.ace=!0,set.forEach(u=>{u.mr*=2,u.dr+=.3,u.maxHp=Math.round(u.maxHp*1.2),u.hp=u.maxHp}),b.player.push(...set)}}
  else{const set=pull(AEGIS_UNITS,410);if(set.length){STATE.aegis=!0,set.forEach(u=>{u.shield+=800}),b.player.push(...set)}}
  SFX.aegis(),toast(STATE.faction==="異度魔界"?"👑 魔軍陣線告急——「最終王牌」棄天帝降臨！":"🛡 神州防線告急——「最終防線」一頁書與風之痕降臨！"),pushFx(b,410,150,STATE.faction==="異度魔界"?"棄 天 降 臨":"最 終 防 線","#f6d365",!0);
}
function startBattle(){
  if(STATE.phase!=="prep")return;
  if(ensureAudio(),boardCount()===0){SFX.err(),toast("請先將角色部署到棋盤上",!0);return}
  const res=computeSynergies(),player=[];
  for(let r=0;r<BOARD_ROWS;r++)for(let c=0;c<BOARD_COLS;c++){const u=STATE.board[r][c];if(u){const p=cellCenter(r,c);player.push(makeEntity(u,"player",p.x,130+r*40))}}
  STATE.reserve.forEach(u=>{u&&player.push(makeEntity(u,"player",410,240))});
  applySynergies(player,res),player.forEach(u=>{u.assassin&&(u.py=55,u.px=clamp(u.px+randInt(-60,60),60,760))});
  STATE.aegis=!1,STATE.ace=!1;
  const enemy=buildEnemyTeam();
  STATE.battle={player,enemy,t:0,over:!1,resolved:!1,winner:null,resolveTimer:1500,fx:[],summoned:!1},STATE.selected=null,STATE.phase="battle",SFX.start();
  const log=document.getElementById("battle-log");log&&(log.innerHTML="⚔ 戰鬥開始！羈絆已生效 — 我方 "+player.length+" 名 vs 敵方 "+enemy.length+" 名"),updateUI();
}
function aliveList(team){return team.filter(u=>u.alive)}
function nearestEnemy(u,list){let best=null,bd=1/0;return list.forEach(e=>{const d=Math.hypot(e.px-u.px,e.py-u.py);d<bd&&(bd=d,best=e)}),best}
function nearestFrom(point,list){let best=null,bd=1/0;return list.forEach(e=>{const d=Math.hypot(e.px-point.x,e.py-point.y);d<bd&&(bd=d,best=e)}),best}
function lowestAlly(u,team){let best=null,br=1/0;return team.forEach(a=>{if(!a.alive)return;const r=a.hp/a.maxHp;r<br&&(br=r,best=a)}),best}
function pushFx(b,x,y,text,color,big){b.fx.push({x,y,text,color,life:700,big:!!big}),b.fx.length>60&&b.fx.shift()}
function dealDamage(b,src,tgt,amount,isMagic){if(!tgt||!tgt.alive)return;let dmg=amount;!isMagic&&Math.random()<src.critChance&&(dmg*=1.5+src.critDmg),dmg*=1+src.dmgAmp;const def=isMagic?tgt.mr:tgt.armor;if(dmg*=100/(100+def),dmg*=1-Math.min(.7,tgt.dr),tgt.shield>0){const absorb=Math.min(tgt.shield,dmg);tgt.shield-=absorb,dmg-=absorb}if(dmg>0&&(tgt.hp-=dmg),src.dealt+=amount,src.lifesteal>0){const heal=amount*src.lifesteal;src.hp=Math.min(src.maxHp,src.hp+heal)}tgt.mana=Math.min(tgt.maxMana,tgt.mana+8),pushFx(b,tgt.px,tgt.py-26,"-"+Math.round(dmg),isMagic?"#b794f4":"#ffd7a0"),dmg>0&&SFX.hit(),tgt.hp<=0&&(tgt.hp=0,tgt.alive=!1)}
function doHeal(b,src,tgt,amount){if(!tgt||!tgt.alive)return;const before=tgt.hp;tgt.hp=Math.min(tgt.maxHp,tgt.hp+amount),src.healed+=tgt.hp-before,pushFx(b,tgt.px,tgt.py-26,"+"+Math.round(tgt.hp-before),"#68d391")}
function castAbility(b,u){const a=u.ability;if(!a){u.mana=0;return}u.mana=0,u.castFx=400,SFX.skill();const foes=aliveList(u.team==="player"?b.enemy:b.player),allies=aliveList(u.team==="player"?b.player:b.enemy),power=1+u.spellPower;if(a.type==="burst"){const t=nearestEnemy(u,foes);t&&(pushFx(b,u.px,u.py-34,u.skill+"!",u.color,!0),dealDamage(b,u,t,a.value*power,!0))}else if(a.type==="aoe"){pushFx(b,u.px,u.py-34,u.skill+"!",u.color,!0);const cx=u.px,cy=u.py;foes.forEach(f=>{Math.hypot(f.px-cx,f.py-cy)<=(a.radius||80)+30&&dealDamage(b,u,f,a.value*power,!0)})}else if(a.type==="heal"){const t=lowestAlly(u,allies);t&&t.hp<t.maxHp&&(pushFx(b,u.px,u.py-34,u.skill+"!",u.color,!0),doHeal(b,u,t,a.value*power))}else if(a.type==="shield"){const desc=a.desc||"";if(pushFx(b,u.px,u.py-34,u.skill+"!",u.color,!0),desc.indexOf("全隊")>=0)allies.forEach(t=>{t.shield+=a.value*power});else if(desc.indexOf("最低")>=0){const t=lowestAlly(u,allies);t&&(t.shield+=a.value*power)}else u.shield+=a.value*power}else a.type==="buff"&&(pushFx(b,u.px,u.py-34,u.skill+"!",u.color,!0),u.buffMul=1+a.value/100,u.buffUntil=b.t+6,u.ad=u.baseAd*u.buffMul)}
function updateBattle(dtMs){
  const b=STATE.battle;
  if(b.over){b.resolveTimer-=dtMs,b.fx.forEach(f=>{f.life-=dtMs}),b.fx=b.fx.filter(f=>f.life>0),b.resolveTimer<=0&&!b.resolved&&(b.resolved=!0,resolveBattle());return}
  b.t+=dtMs/1e3;
  const dt=dtMs/1e3,pAlive=aliveList(b.player),eAlive=aliveList(b.enemy);
  /* ── 最終防線：我方全隊血量比例降到門檻以下時降臨（每場一次）── */
  if(!b.summoned&&eAlive.length>0&&b.t>2){const th=b.player.reduce((s,u)=>s+Math.max(0,u.hp),0),tm=b.player.reduce((s,u)=>s+u.maxHp,0);tm>0&&th/tm<=ULT_TRIGGER&&(summonUltimates(),b.summoned=!0)}
  b.player.concat(b.enemy).forEach(u=>{
    if(!u.alive)return;
    u.castFx>0&&(u.castFx-=dtMs),u.buffMul!==1&&b.t>u.buffUntil&&(u.buffMul=1,u.ad=u.baseAd),u.regen>0&&(u.hp=Math.min(u.maxHp,u.hp+u.regen*dt));
    let tgt=null,focus=[];
    if(u.team==="enemy"){const pl=aliveList(b.player);if(!pl.length)return;focus=pl,tgt=nearestFrom({x:u.px,y:u.py},pl)}
    else{const foes=u.team==="player"?eAlive:pAlive;if(foes.length===0)return;focus=foes,tgt=nearestEnemy(u,foes)}
    if(!tgt)return;
    const dist=Math.hypot(tgt.px-u.px,tgt.py-u.py);
    if(u.atkCd-=dtMs,dist<=u.range)u.atkCd<=0&&(u.atkCd=u.atkInterval,dealDamage(b,u,tgt,u.ad,!1),u.mana=Math.min(u.maxMana,u.mana+10+u.manaRegen),u.splash>0&&focus.forEach(f=>{f!==tgt&&Math.hypot(f.px-tgt.px,f.py-tgt.py)<70&&dealDamage(b,u,f,u.ad*u.splash,!1)}),u.mana>=u.maxMana&&castAbility(b,u));else{const ang=Math.atan2(tgt.py-u.py,tgt.px-u.px);u.px=clamp(u.px+Math.cos(ang)*u.moveSpd*dt,ARENA.x0+26,ARENA.x1-26),u.py=clamp(u.py+Math.sin(ang)*u.moveSpd*dt,ARENA.y0+26,ARENA.y1-26),u.mana<u.maxMana&&(u.mana=Math.min(u.maxMana,u.mana+4*dt*(u.manaRegen/20+1))),u.mana>=u.maxMana&&castAbility(b,u)}
  });
  const pAfter=aliveList(b.player).length,eAfter=aliveList(b.enemy).length;
  if(eAfter===0||pAfter===0||b.t>40)if(b.over=!0,b.resolveTimer=1200,eAfter===0&&pAfter>0)b.winner="player";else if(pAfter===0)b.winner="enemy";else{const ph=b.player.reduce((s,u)=>s+Math.max(0,u.hp)/u.maxHp,0),eh=b.enemy.reduce((s,u)=>s+Math.max(0,u.hp)/u.maxHp,0);b.winner=ph>eh?"player":"enemy"}
}
function resolveBattle(){
  const b=STATE.battle,log=document.getElementById("battle-log"),attacker=STATE.faction==="異度魔界";
  if(b.winner==="player"){
    STATE.winStreak++,STATE.loseStreak=0,SFX.win();
    let extra="";
    if(attacker){extra="　🏰 攻陷進度 <b>"+(STATE.round+1)+" / "+ROUNDS.length+"</b>"}
    log&&(log.innerHTML='<span class="win">✦ 戰鬥勝利！</span> 連勝 <b>'+STATE.winStreak+"</b>"+extra),updateUI();
    setTimeout(()=>nextRound(),1500)
  }else{
    const survivors=aliveList(b.enemy).length,protect=STATE.round<PROTECT_ROUNDS,dmg=protect?0:Math.min(LOSE_DMG_MAX,LOSE_DMG_BASE+survivors);
    STATE.hp-=dmg,STATE.loseStreak++,STATE.winStreak=0,SFX.lose(),
    log&&(log.innerHTML='<span class="lose">✖ 戰鬥失敗</span>　'+(protect?"新手保護：本回合不扣血":(attacker?"魔軍血量":"神州血量")+" -"+dmg+"（剩 "+Math.max(0,STATE.hp)+"）")),updateUI(),
    STATE.hp<=0?setTimeout(()=>endGame(!1),1400):setTimeout(()=>nextRound(),1500)
  }
}
function nextRound(){if(STATE.round++,STATE.round>=ROUNDS.length){endGame(!0);return}STATE.battle=null,STATE.phase="prep",startPrep()}
function startPrep(){const interest=Math.min(INTEREST_MAX,Math.floor(STATE.gold/INTEREST_PER)),streak=STATE.winStreak>0?STATE.winStreak:STATE.loseStreak,bonus=streak>=5?3:streak>=3?2:0,income=BASE_INCOME+interest+bonus;STATE.gold+=income,addExp(NATURAL_EXP),refreshShopCards();const log=document.getElementById("battle-log");log&&(log.innerHTML="💰 本回合收入 <b>+"+income+"</b>（基礎 "+BASE_INCOME+(interest?" · 利息 "+interest:"")+(bonus?" · 連勝/敗 +"+bonus:"")+"）　自然經驗 +"+NATURAL_EXP+"　調整陣容後按「開始戰鬥」"),updateUI(),updateSynergies(),renderShop(),drawGame(),toast("第 "+ROUNDS[STATE.round].stage+" 波開始　收入 +"+income+"　經驗 +"+NATURAL_EXP)}
function endGame(win){STATE.phase="prep";const modal=document.getElementById("result-modal"),title=document.getElementById("result-title"),desc=document.getElementById("result-desc"),stats=document.getElementById("result-stats");if(!modal)return;const atk=STATE.faction==="異度魔界";if(win){SFX.win();if(atk)title.textContent="魔界入侵 · 神州陷落",desc.textContent="魔軍連戰連捷，神州防線全面潰敗，異度魔界大軍長驅直入！";else title.textContent="天罪止息 · 神州不退",desc.textContent="恭喜！神州防線屹立不搖，中原群俠擋下異度魔界的侵攻，棄天帝之禍已然平息。";title.className="win"}else{SFX.lose();if(atk){STATE.hp<=0?(title.textContent="兵敗如山 · 退兵魔界",desc.textContent="魔軍折損殆盡，無力再戰，只得退回異度魔界，伺機再起。"):(title.textContent="進攻失敗 · 退兵魔界",desc.textContent="魔軍血量耗盡，攻勢功敗垂成，只得撤兵回魔界，等待下一次時機。")}else title.textContent="天罪降臨 · 神州淪陷",desc.textContent="魔界大軍攻破防線，神州陷入黑暗……重整陣容，捲土重來！";title.className="lose"};const res=computeSynergies();stats.textContent="撐過波數 "+STATE.round+" / "+ROUNDS.length+"　最終等級 "+STATE.level+(atk?"　攻陷進度 "+Math.min(STATE.round,ROUNDS.length)+"/"+ROUNDS.length:"　血量剩餘 "+Math.max(0,STATE.hp))+"　觸發羈絆 "+res.active.length+" 種",modal.classList.add("show")}
function restartGame(){const rm=document.getElementById("result-modal"),hm=document.getElementById("help-modal");rm&&rm.classList.remove("show"),hm&&hm.classList.remove("show"),resetState(),updateUI(),updateSynergies(),drawGame(),renderFactionSelect()}
function toggleHelp(show){const hm=document.getElementById("help-modal");hm&&(show===void 0?hm.classList.toggle("show"):hm.classList[show?"add":"remove"]("show"))}
function toggleSellMode(){if(STATE.phase!=="prep")return;STATE.sellMode=!STATE.sellMode,STATE.selected=null;const btn=document.getElementById("btn-sell");btn&&(btn.textContent=STATE.sellMode?"✖ 取消賣出":"🗑 賣出角色"),toast(STATE.sellMode?"賣出模式：點選要賣出的角色（返還購買金）":"已離開賣出模式")}
function renderFactionSelect(){const m=document.getElementById("faction-modal");if(!m)return;const box=document.getElementById("faction-options");if(box){box.innerHTML="";Object.keys(FACTIONS).forEach(key=>{const f=FACTIONS[key],pool=factionCount(key),card=document.createElement("button");card.className="faction-card";card.style.setProperty("--fc",f.color);card.innerHTML='<div class="fc-icon">'+f.icon+'</div><div class="fc-name">'+key+'</div><div class="fc-sub">'+f.sub+'</div><div class="fc-pool">可招募 <b>'+pool.total+'</b> 名<small>（己方 '+pool.own+' ＋ 中立 '+pool.neutral+'）</small></div><div class="fc-desc">'+f.desc+'</div><div class="fc-go">選擇此陣營 ▸</div>',card.onclick=function(){chooseFaction(key)},box.appendChild(card)})}m.classList.add("show")}
function factionCount(key){const own=FACTION_GROUPS[key]||[],o=CHAMPIONS.filter(c=>own.indexOf(c.origin)>=0).length,n=CHAMPIONS.filter(c=>NEUTRAL_ORIGINS.indexOf(c.origin)>=0).length;return{own:o,neutral:n,total:o+n}}
function chooseFaction(f){STATE.faction=f;const m=document.getElementById("faction-modal");m&&m.classList.remove("show"),STATE.level=2,STATE.exp=0,STATE.gold=BASE_GOLD,refreshShopCards(),updateUI(),updateSynergies(),drawGame();const tag=document.getElementById("faction-tag");tag&&(tag.textContent=(FACTIONS[f]?FACTIONS[f].icon+" ":"")+f,tag.style.color=FACTIONS[f]?FACTIONS[f].color:"#f6d365"),SFX.levelup(),toast("已加入「"+f+"」陣營　商店只出現己方與中立俠客")}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
