/* ==========================================================================
 *  霹靂神州：天罪自走棋 — 主程式 main.js
 *  沿用原檔架構（STATE / Hex 棋盤 / 商店 / 羈絆 / 三星合成），補完：
 *  ・回合流程與經濟（基礎收入 + 利息 + 連勝連敗獎勵）
 *  ・等級 → 上場人數
 *  ・羈絆效果實際套用至戰鬥
 *  ・即時自動戰鬥引擎（尋敵、普攻、集氣施放技能、濺射、吸血、護盾）
 *  ・勝負判定、生命值扣減、通關
 *  ・Web Audio 合成音效、Canvas 戰鬥特效、結算畫面
 * ========================================================================== */

/* ------------------------------- 版面常數 ------------------------------- */
const BOARD_ROWS = 4, BOARD_COLS = 7;
const HEX_RADIUS = 33, HEX_W = 60, HEX_H = 50;
const BOARD_X = 210, BOARD_Y = 46;
const BENCH_COUNT = 9, BENCH_SIZE = 58, BENCH_STEP = 66, BENCH_X = 117, BENCH_Y = 300;
const CANVAS_W = 820, CANVAS_H = 470;
const ARENA = { x0: 30, x1: 790, y0: 25, y1: 285 };
const BASE_ATK_MS = 650;

/* ------------------------------- 全域狀態 ------------------------------- */
const STATE = {
    phase: "prep",           // prep | battle
    gold: 10, level: 1, exp: 0, hp: 100,
    round: 0,
    winStreak: 0, loseStreak: 0,
    selected: null,
    sellMode: false,
    shop: [null, null, null, null, null],
    board: Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null)),
    bench: new Array(BENCH_COUNT).fill(null),
    battle: null
};

let canvas = null, ctx = null;
let lastTs = 0;

/* =============================== 音效系統 =============================== */
let actx = null, muted = false;
function ensureAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === "suspended") { actx.resume(); }
}
function beep(freq, dur, type, vol) {
    if (muted) return;
    ensureAudio();
    if (!actx) return;
    try {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || "sine"; o.frequency.value = freq;
        const v = vol || 0.05, t = actx.currentTime;
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + (dur || 0.12) + 0.03);
    } catch (e) { /* 忽略音效錯誤 */ }
}
const SFX = {
    buy()   { beep(880, .09, "triangle", .06); setTimeout(() => beep(1320, .09, "triangle", .05), 55); },
    sell()  { beep(320, .12, "sawtooth", .04); },
    place() { beep(540, .07, "square", .045); },
    start() { beep(170, .18, "sawtooth", .06); setTimeout(() => beep(120, .26, "sawtooth", .06), 120); },
    hit()   { beep(200, .035, "square", .018); },
    skill() { beep(680, .14, "sine", .05); setTimeout(() => beep(1020, .16, "sine", .04), 85); },
    win()   { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .22, "triangle", .055), i * 130)); },
    lose()  { [400, 330, 262, 196].forEach((f, i) => setTimeout(() => beep(f, .3, "sawtooth", .05), i * 155)); },
    err()   { beep(120, .12, "square", .05); },
    levelup() { [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f, .14, "triangle", .05), i * 90)); }
};

/* =============================== 小工具 =============================== */
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let toastTimer = null;
function toast(msg, isErr) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.style.color = isErr ? "#e63946" : "#f6d365";
    el.style.borderColor = isErr ? "#c1121f" : "#8a6d10";
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1700);
}

function maxUnits() { return Math.min(9, STATE.level + 1); }
function boardCount() {
    let n = 0;
    for (let r = 0; r < BOARD_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) if (STATE.board[r][c]) n++;
    return n;
}
function ownedCount(name) {
    let n = 0;
    for (let r = 0; r < BOARD_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) if (STATE.board[r][c] && STATE.board[r][c].name === name) n++;
    for (let i = 0; i < BENCH_COUNT; i++) if (STATE.bench[i] && STATE.bench[i].name === name) n++;
    return n;
}
function cellCenter(r, c) {
    let x = BOARD_X + c * HEX_W;
    if (r % 2 === 1) x += HEX_W / 2;
    return { x: x, y: BOARD_Y + r * HEX_H };
}

/* =============================== 初始化 =============================== */
function init() {
    canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    canvas.addEventListener("click", onCanvasClick);

    resetState();
    refreshShopCards();
    updateUI();
    updateSynergies();

    requestAnimationFrame(loop);
}

function resetState() {
    STATE.phase = "prep";
    STATE.gold = 10; STATE.level = 1; STATE.exp = 0; STATE.hp = 100;
    STATE.round = 0;
    STATE.winStreak = 0; STATE.loseStreak = 0;
    STATE.selected = null; STATE.sellMode = false;
    STATE.shop = [null, null, null, null, null];
    STATE.board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
    STATE.bench = new Array(BENCH_COUNT).fill(null);
    STATE.battle = null;
    const sellBtn = document.getElementById("btn-sell");
    if (sellBtn) sellBtn.textContent = "🗑 賣出角色";
}

/* =============================== 主迴圈 =============================== */
function loop(ts) {
    const dt = lastTs ? Math.min(50, ts - lastTs) : 16;
    lastTs = ts;
    if (STATE.phase === "battle" && STATE.battle) updateBattle(dt);
    drawGame();
    requestAnimationFrame(loop);
}

/* =============================== 繪製 =============================== */
function drawGame() {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 背景星塵
    ctx.fillStyle = "rgba(120,140,200,.05)";
    for (let i = 0; i < 40; i++) {
        const x = (i * 137.5) % CANVAS_W, y = (i * 89.3) % CANVAS_H;
        ctx.fillRect(x, y, 1.4, 1.4);
    }

    if (STATE.phase === "battle" && STATE.battle) { drawBattlefield(); }
    else { drawFormation(); }
}

/* --- 準備階段：Hex 棋盤 + 備戰區 --- */
function drawFormation() {
    // 棋盤
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const p = cellCenter(r, c);
            const unit = STATE.board[r][c];
            const sel = STATE.selected && STATE.selected.type === "board" && STATE.selected.r === r && STATE.selected.c === c;
            drawHexagon(p.x, p.y, HEX_RADIUS,
                sel ? "rgba(232,185,35,.28)" : (unit ? "rgba(66,80,120,.35)" : "rgba(30,38,60,.5)"),
                sel ? "#e8b923" : "#38405e");
            if (unit) drawToken(p.x, p.y, 25, unit);
        }
    }

    // 備戰區標題
    ctx.fillStyle = "#8a90a8";
    ctx.font = "bold 12px 'Noto Sans TC', Arial";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("【 備 戰 區 】", BENCH_X, BENCH_Y - 12);
    ctx.fillStyle = "#5a6178";
    ctx.font = "11px 'Noto Sans TC', Arial";
    ctx.textAlign = "right";
    ctx.fillText("點選角色 → 點棋盤／備戰格即可部署與交換", CANVAS_W - 30, BENCH_Y - 12);

    // 備戰格
    for (let i = 0; i < BENCH_COUNT; i++) {
        const x = BENCH_X + i * BENCH_STEP, y = BENCH_Y;
        const sel = STATE.selected && STATE.selected.type === "bench" && STATE.selected.i === i;
        roundRect(x, y, BENCH_SIZE, BENCH_SIZE, 8);
        ctx.fillStyle = sel ? "rgba(232,185,35,.22)" : "rgba(20,25,40,.75)";
        ctx.fill();
        ctx.strokeStyle = sel ? "#e8b923" : "#333c5a";
        ctx.lineWidth = 2; ctx.stroke();
        if (STATE.bench[i]) drawToken(x + BENCH_SIZE / 2, y + BENCH_SIZE / 2, 23, STATE.bench[i]);
    }
}

/* --- 戰鬥階段：戰場 --- */
function drawBattlefield() {
    const b = STATE.battle;
    // 戰場地板
    const g = ctx.createLinearGradient(0, ARENA.y0, 0, ARENA.y1);
    g.addColorStop(0, "rgba(80,20,20,.18)");
    g.addColorStop(1, "rgba(20,30,60,.18)");
    ctx.fillStyle = g;
    ctx.fillRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
    ctx.strokeStyle = "rgba(232,185,35,.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);

    // 隊伍標籤
    ctx.font = "bold 12px 'Noto Sans TC', Arial";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#e5533d"; ctx.fillText("敵方 · 異度魔界", ARENA.x0 + 8, ARENA.y0 + 16);
    ctx.fillStyle = "#e8b923"; ctx.fillText("我方 · 群俠", ARENA.x0 + 8, ARENA.y1 - 8);

    // 勝負條
    const pAlive = b.player.filter(u => u.alive).length, eAlive = b.enemy.filter(u => u.alive).length;
    ctx.textAlign = "right"; ctx.fillStyle = "#9aa0b4";
    ctx.fillText("存活  我方 " + pAlive + "  vs  敵方 " + eAlive, ARENA.x1 - 8, ARENA.y0 + 16);

    // 單位（依 y 排序做出前後層次）
    const all = b.player.concat(b.enemy).filter(u => u.alive).sort((a, z) => a.py - z.py);
    all.forEach(u => drawBattleUnit(u));

    // 漂浮特效
    b.fx.forEach(f => {
        const a = clamp(f.life / 700, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = f.color;
        ctx.font = "bold " + (f.big ? 20 : 14) + "px 'Noto Sans TC', Arial";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(f.text, f.x, f.y - (700 - f.life) * 0.03);
        ctx.globalAlpha = 1;
    });
}

function drawBattleUnit(u) {
    // 施法光環
    if (u.castFx > 0) {
        ctx.beginPath();
        ctx.arc(u.px, u.py, 26 + (1 - u.castFx / 400) * 22, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(246,211,101," + (u.castFx / 400) + ")";
        ctx.lineWidth = 3; ctx.stroke();
    }
    // 本體
    const grad = ctx.createRadialGradient(u.px - 6, u.py - 6, 3, u.px, u.py, 26);
    grad.addColorStop(0, u.team === "player" ? "#3a4a78" : "#7a2f2f");
    grad.addColorStop(1, u.team === "player" ? "#1a2240" : "#3d1414");
    ctx.beginPath(); ctx.arc(u.px, u.py, 25, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = u.color || "#e8b923"; ctx.stroke();

    // 名字
    ctx.fillStyle = "#f0ece0";
    ctx.font = "bold 11px 'Noto Sans TC', Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(u.name, u.px, u.py - 2);
    // 星級
    ctx.font = "9px Arial";
    ctx.fillStyle = "#f6d365";
    ctx.fillText("★".repeat(u.stars), u.px, u.py + 11);

    // 血條
    const bw = 46, bh = 5, bx = u.px - bw / 2, by = u.py - 36;
    ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = "rgba(40,46,66,.9)"; ctx.fillRect(bx, by, bw, bh);
    const ratio = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = u.team === "player" ? "#48bb78" : "#e53e3e";
    ctx.fillRect(bx, by, bw * ratio, bh);
    if (u.shield > 0) {
        ctx.fillStyle = "rgba(66,153,225,.85)";
        const sr = clamp(u.shield / u.maxHp, 0, 1);
        ctx.fillRect(bx + bw * ratio, by, bw * Math.min(sr, 1 - ratio), bh);
    }
    // 魔力條
    const my = by + bh + 2;
    ctx.fillStyle = "rgba(40,46,66,.9)"; ctx.fillRect(bx, my, bw, 3);
    ctx.fillStyle = "#9f7aea";
    ctx.fillRect(bx, my, bw * clamp(u.mana / u.maxMana, 0, 1), 3);
}

/* --- 通用繪製元件 --- */
function drawHexagon(x, y, r, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const hx = x + r * Math.cos(a), hy = y + r * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawToken(cx, cy, r, unit) {
    const grad = ctx.createRadialGradient(cx - 6, cy - 6, 3, cx, cy, r);
    grad.addColorStop(0, "#2c3554");
    grad.addColorStop(1, "#141a2c");
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = unit.color || "#e8b923";
    ctx.stroke();

    // 星級小點
    const st = unit.star || 1;
    for (let i = 0; i < st; i++) {
        ctx.beginPath();
        ctx.arc(cx - (st - 1) * 5 + i * 10, cy - r + 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#f6d365"; ctx.fill();
    }

    // 名字
    ctx.fillStyle = "#f0ece0";
    ctx.font = "bold 11px 'Noto Sans TC', Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(unit.name, cx, cy);
}

/* =============================== 互動 =============================== */
function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
        y: (e.clientY - rect.top) * (CANVAS_H / rect.height)
    };
}

function hitCell(mx, my) {
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const p = cellCenter(r, c);
            if (Math.hypot(mx - p.x, my - p.y) <= HEX_RADIUS) return { type: "board", r: r, c: c };
        }
    }
    return null;
}
function hitBench(mx, my) {
    if (my < BENCH_Y || my > BENCH_Y + BENCH_SIZE) return null;
    for (let i = 0; i < BENCH_COUNT; i++) {
        const x = BENCH_X + i * BENCH_STEP;
        if (mx >= x && mx <= x + BENCH_SIZE) return { type: "bench", i: i };
    }
    return null;
}

function onCanvasClick(e) {
    if (STATE.phase !== "prep") return;
    ensureAudio();
    const p = pointerPos(e);
    const target = hitCell(p.x, p.y) || hitBench(p.x, p.y);
    if (!target) { STATE.selected = null; return; }
    handleSelect(target);
}

function unitAt(t) { return t.type === "bench" ? STATE.bench[t.i] : STATE.board[t.r][t.c]; }
function setUnitAt(t, u) { if (t.type === "bench") STATE.bench[t.i] = u; else STATE.board[t.r][t.c] = u; }

function handleSelect(target) {
    const unit = unitAt(target);

    // 賣出模式
    if (STATE.sellMode) {
        if (!unit) { STATE.sellMode = false; document.getElementById("btn-sell").textContent = "🗑 賣出角色"; return; }
        const refund = unit.cost * ((unit.star || 1) === 1 ? 1 : (unit.star === 2 ? 3 : 9));
        STATE.gold += refund;
        setUnitAt(target, null);
        SFX.sell();
        toast("賣出 " + unit.name + "，返還 " + refund + " 金");
        STATE.sellMode = false;
        document.getElementById("btn-sell").textContent = "🗑 賣出角色";
        updateUI(); updateSynergies();
        return;
    }

    if (!STATE.selected) {
        if (unit) { STATE.selected = target; SFX.place(); }
        return;
    }

    const sel = STATE.selected;
    if (sel.type === target.type && (sel.type === "bench" ? sel.i === target.i : (sel.r === target.r && sel.c === target.c))) {
        STATE.selected = null; return; // 取消選取
    }

    const from = unitAt(sel), to = unitAt(target);

    // 備戰區 → 空棋盤格：檢查上場人數上限
    if (sel.type === "bench" && target.type === "board" && !to) {
        if (boardCount() >= maxUnits()) {
            SFX.err(); toast("上場人數已達上限（等級 " + STATE.level + "：" + maxUnits() + " 人）", true);
            STATE.selected = null; return;
        }
    }
    // 棋盤 → 備戰（一律允許）；棋盤內互換允許

    setUnitAt(target, from);
    setUnitAt(sel, to);
    STATE.selected = null;
    SFX.place();
    updateSynergies();
    drawGame();
}

/* =============================== 商店 =============================== */
function refreshShopCards() {
    const rates = DROP_RATES[STATE.level] || DROP_RATES[1];
    STATE.shop = [];
    for (let i = 0; i < 5; i++) {
        const rand = Math.random() * 100;
        let chosenCost = 1, cumulative = 0;
        for (let c = 0; c < rates.length; c++) {
            cumulative += rates[c];
            if (rand <= cumulative) { chosenCost = c + 1; break; }
        }
        let pool = CHAMPIONS.filter(ch => ch.cost === chosenCost);
        if (pool.length === 0) pool = CHAMPIONS.filter(ch => ch.cost === 1);
        const champ = pick(pool);
        STATE.shop.push(Object.assign({}, champ, { star: 1 }));
    }
    renderShop();
}

function refreshShop() {
    if (STATE.phase !== "prep") return;
    if (STATE.gold < 2) { SFX.err(); toast("金錢不足（需 2 金）", true); return; }
    STATE.gold -= 2;
    refreshShopCards();
    SFX.buy();
    updateUI();
}

function renderShop() {
    const box = document.getElementById("shop-cards");
    if (!box) return;
    box.innerHTML = "";
    STATE.shop.forEach((item, index) => {
        const card = document.createElement("div");
        if (!item) {
            card.className = "card sold";
            card.innerHTML = '<span class="card-name" style="color:#5a6178;font-size:12px;">已招募</span>';
        } else {
            const owned = ownedCount(item.name);
            const afford = STATE.gold >= item.cost;
            card.className = "card card-cost" + item.cost + (afford ? "" : " disabled");
            card.innerHTML =
                '<div class="card-name">' + item.name + '</div>' +
                '<div class="card-tag"><span class="c-origin">' + item.origin + '</span> · ' + item.class + (item.group ? ' · <span style="color:#e0b64a">✦' + item.group + '</span>' : '') + '</div>' +
                '<div class="card-skill">' + item.skill + '</div>' +
                '<div class="card-cost"><span>💰 ' + item.cost + '</span>' +
                '<span class="card-owned">' + (owned > 0 ? "已擁有 " + owned : "") + '</span></div>';
            card.onclick = function () { buyChampion(index); };
        }
        box.appendChild(card);
    });
}

function buyChampion(index) {
    if (STATE.phase !== "prep") return;
    const item = STATE.shop[index];
    if (!item) return;
    if (STATE.gold < item.cost) { SFX.err(); toast("金錢不足（需 " + item.cost + " 金）", true); return; }
    const empty = STATE.bench.indexOf(null);
    if (empty === -1) { SFX.err(); toast("備戰區已滿，請先部署或賣出角色", true); return; }

    STATE.gold -= item.cost;
    STATE.bench[empty] = item;
    STATE.shop[index] = null;
    SFX.buy();
    checkTripleUpgrade(item.name);
    renderShop(); updateUI(); updateSynergies(); drawGame();
}

/* 三連合成：3 張同星同名 → 升一星 */
function checkTripleUpgrade(name) {
    let changed = false;
    for (let star = 1; star <= 2; star++) {
        const matches = [];
        STATE.bench.forEach((u, i) => { if (u && u.name === name && (u.star || 1) === star) matches.push({ type: "bench", i: i }); });
        for (let r = 0; r < BOARD_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) {
            const u = STATE.board[r][c];
            if (u && u.name === name && (u.star || 1) === star) matches.push({ type: "board", r: r, c: c });
        }
        if (matches.length >= 3) {
            const keep = matches[0];
            setUnitAt(matches[1], null);
            setUnitAt(matches[2], null);
            const ku = unitAt(keep);
            if (ku) ku.star = star + 1;
            changed = true;
            SFX.levelup();
            toast("★ " + name + " 升星至 " + (star + 1) + "★！");
        }
    }
    return changed;
}

/* =============================== 經濟與 UI =============================== */
function buyExp() {
    if (STATE.phase !== "prep") return;
    if (STATE.level >= 9) { SFX.err(); toast("已達最高等級", true); return; }
    if (STATE.gold < 4) { SFX.err(); toast("金錢不足（需 4 金）", true); return; }
    STATE.gold -= 4;
    SFX.buy();
    addExp(4);
    updateUI(); renderShop();
}

function addExp(amount) {
    if (STATE.level >= 9) return;
    STATE.exp += amount;
    while (STATE.level < 9 && STATE.exp >= EXP_TABLE[STATE.level]) {
        STATE.exp -= EXP_TABLE[STATE.level];
        STATE.level++;
        SFX.levelup();
        toast("⬆ 等級提升至 " + STATE.level + "（可上場 " + maxUnits() + " 人）");
    }
    if (STATE.level >= 9) STATE.exp = 0;
}

function updateUI() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("gold", STATE.gold);
    set("level", STATE.level);
    set("hp", Math.max(0, STATE.hp));
    set("unit-count", boardCount() + "/" + maxUnits());
    set("exp", STATE.level >= 9 ? "MAX" : STATE.exp + "/" + EXP_TABLE[STATE.level]);

    const r = ROUNDS[Math.min(STATE.round, ROUNDS.length - 1)];
    const info = document.getElementById("stage-info");
    if (info) {
        if (STATE.phase === "battle") info.innerHTML = "回合 " + r.stage + " <small>（戰鬥進行中…）</small>";
        else info.innerHTML = "回合 " + r.stage + " <small>（準備階段　敵方 " + r.count + " 名）</small>";
    }
    const bb = document.getElementById("btn-battle");
    if (bb) bb.disabled = STATE.phase !== "prep";
}

/* =============================== 羈絆 =============================== */
function computeSynergies() {
    const counts = {};
    for (let r = 0; r < BOARD_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) {
        const u = STATE.board[r][c];
        if (u) {
            counts[u.origin] = (counts[u.origin] || 0) + 1;
            counts[u.class] = (counts[u.class] || 0) + 1;
        }
    }
    const active = [];
    Object.keys(SYNERGIES).forEach(key => {
        const def = SYNERGIES[key];
        const n = counts[key] || 0;
        let tier = -1;
        def.thresholds.forEach((t, i) => { if (n >= t) tier = i; });
        if (tier >= 0) active.push({ key: key, def: def, count: n, tier: tier, value: def.values[tier] });
    });
    return { counts: counts, active: active };
}

function updateSynergies() {
    const box = document.getElementById("synergies");
    if (!box) return;
    const res = computeSynergies();
    const entries = Object.keys(SYNERGIES)
        .map(key => ({ key: key, def: SYNERGIES[key], count: res.counts[key] || 0 }))
        .filter(e => e.count > 0)
        .sort((a, b) => b.count - a.count);

    const sc = document.getElementById("syn-count");
    if (sc) sc.textContent = res.active.length + " 種";

    if (entries.length === 0) {
        box.innerHTML = '<div class="empty">尚無羈絆<br><small>將角色放上棋盤即會觸發</small></div>';
        return;
    }

    box.innerHTML = "";
    entries.forEach(e => {
        const def = e.def;
        let tier = -1;
        def.thresholds.forEach((t, i) => { if (e.count >= t) tier = i; });
        const nextT = def.thresholds.find(t => e.count < t);
        const div = document.createElement("div");
        div.className = "synergy-item" + (tier >= 0 ? " active tier-active" : "");
        div.style.borderLeftColor = def.color;
        const head =
            '<div class="s-head"><span class="s-name" style="color:' + def.color + '">' + def.icon + " " + e.key + '</span>' +
            '<span class="s-count">' + e.count + "/" + (nextT !== undefined ? nextT : def.thresholds[def.thresholds.length - 1]) + '</span></div>';
        const eff = tier >= 0
            ? '<div class="s-eff">✔ ' + def.tiers[tier] + '</div>'
            : '<div class="s-broken">✖ ' + def.tiers[0] + '（尚缺 ' + (def.thresholds[0] - e.count) + ' 人）</div>';
        div.innerHTML = head + eff;
        box.appendChild(div);
    });
}

/* =============================== 戰鬥引擎 =============================== */
function makeEntity(unit, team, px, py, hpMul) {
    const c = CHAMPIONS.find(x => x.id === unit.id) || unit;
    const star = unit.star || 1;
    const sm = star === 1 ? 1 : star === 2 ? 1.8 : 3.2;
    const mul = hpMul || 1;
    const maxHp = Math.round(c.hp * sm * mul);
    const ad = Math.round(c.ad * (star === 1 ? 1 : star === 2 ? 1.7 : 3.0) * 1.15);
    const mpParts = (c.mp || "0/60").split("/");
    return {
        id: c.id, name: c.name, team: team, color: c.color, cost: c.cost,
        origin: c.origin, cls: c.class, skill: c.skill, stars: star,
        px: px, py: py, maxHp: maxHp, hp: maxHp, shield: 0,
        ad: ad, baseAd: ad, armor: c.armor || 0, mr: c.mr || 0,
        range: 40 + (c.range || 1) * 34,
        atkInterval: BASE_ATK_MS, asBonus: 0, critChance: 0.05, critDmg: 0.5,
        spellPower: 0, dmgAmp: 0, dr: 0, lifesteal: 0, splash: 0, regen: 0,
        manaRegen: 0, buffMul: 1, buffUntil: 0,
        mana: parseInt(mpParts[0]) || 0, maxMana: parseInt(mpParts[1]) || 60,
        ability: c.ability, alive: true, atkCd: 500, moveSpd: 95, castFx: 0,
        dealt: 0, healed: 0, assassin: false
    };
}

function applySynergies(team, res) {
    const teamWide = { "苦境正道": 1, "異度魔界": 1, "玄宗道門": 1, "東瀛": 1, "紅樓劍閣": 1, "識界靈體": 1, "獨立梟雄": 1, "佛門": 1, "醫者": 1, "神級": 1 };
    res.active.forEach(s => {
        const key = s.key, v = s.value, tier = s.tier, n = s.count;
        const targets = teamWide[key] ? team : team.filter(u => u.cls === key);
        if (targets.length === 0) return;
        switch (key) {
            case "苦境正道":
                targets.forEach(u => { u.shield += v; if (tier >= 2) { u.armor += 20; u.mr += 20; } });
                break;
            case "異度魔界":
                targets.forEach(u => { u.lifesteal += v / 100; });
                break;
            case "玄宗道門":
                targets.forEach(u => { u.spellPower += v / 100; u.mana += (tier === 0 ? 15 : 30); });
                break;
            case "東瀛":
                targets.forEach(u => { u.asBonus += v / 100; });
                break;
            case "紅樓劍閣":
                targets.forEach(u => { u.critChance += v / 100; });
                break;
            case "識界靈體":
                targets.forEach(u => { u.dmgAmp += v / 100; });
                break;
            case "獨立梟雄":
                targets.forEach(u => { u.ad *= 1 + (n * v) / 100; });
                break;
            case "劍者":
                targets.forEach(u => { u.ad += v; });
                break;
            case "刀者":
                targets.forEach(u => { u.splash += v / 100; });
                break;
            case "術法":
                targets.forEach(u => { u.spellPower += v / 100; u.manaRegen += (tier === 0 ? 20 : 40); });
                break;
            case "佛門":
                targets.forEach(u => { u.dr += v / 100; if (tier >= 2) u.regen += 20; });
                break;
            case "魔道":
                targets.forEach(u => { u.dmgAmp += v / 100; });
                break;
            case "弓者":
                targets.forEach(u => { u.range += 34; u.critChance += v / 100; u.asBonus += (tier === 0 ? 0.15 : 0.25); });
                break;
            case "醫者":
                targets.forEach(u => { u.regen += v; });
                break;
            case "刺客":
                targets.forEach(u => { u.critDmg += v / 100; u.assassin = true; });
                break;
            case "重裝":
                targets.forEach(u => { u.armor += v; u.mr += v; });
                break;
            case "神級":
                targets.forEach(u => { u.dmgAmp += v / 100; u.dr += v / 100; });
                break;
            default: break;
        }
    });
    team.forEach(u => { u.atkInterval = BASE_ATK_MS / (1 + u.asBonus); });
}

function buildEnemyTeam() {
    const r = ROUNDS[STATE.round];
    const pool = CHAMPIONS.filter(c => c.cost <= r.tier && c.cost >= Math.max(1, r.tier - 2));
    const cols = Math.min(5, r.count);
    const enemy = [];
    for (let i = 0; i < r.count; i++) {
        const ch = pick(pool);
        const row = Math.floor(i / cols), col = i % cols;
        const px = cols === 1 ? 410 : 140 + col * (540 / (cols - 1));
        const py = 52 + row * 46 + randInt(-5, 5);
        enemy.push(makeEntity({ id: ch.id, star: r.star }, "enemy", clamp(px, 60, 760), py, r.hpMul));
    }
    return enemy;
}

function startBattle() {
    if (STATE.phase !== "prep") return;
    ensureAudio();
    if (boardCount() === 0) { SFX.err(); toast("請先將角色部署到棋盤上", true); return; }

    const res = computeSynergies();
    const player = [];
    for (let r = 0; r < BOARD_ROWS; r++) for (let c = 0; c < BOARD_COLS; c++) {
        const u = STATE.board[r][c];
        if (u) {
            const p = cellCenter(r, c);
            player.push(makeEntity(u, "player", p.x, 130 + r * 40));
        }
    }
    applySynergies(player, res);

    // 刺客跳後排
    player.forEach(u => { if (u.assassin) { u.py = 55; u.px = clamp(u.px + randInt(-60, 60), 60, 760); } });

    const enemy = buildEnemyTeam();

    STATE.battle = {
        player: player, enemy: enemy,
        t: 0, over: false, resolved: false, winner: null, resolveTimer: 1500,
        fx: []
    };
    STATE.selected = null;
    STATE.phase = "battle";
    SFX.start();
    const log = document.getElementById("battle-log");
    if (log) log.innerHTML = "⚔ 戰鬥開始！羈絆已生效 — 我方 " + player.length + " 名 vs 敵方 " + enemy.length + " 名";
    updateUI();
}

function aliveList(team) { return team.filter(u => u.alive); }
function nearestEnemy(u, list) {
    let best = null, bd = Infinity;
    list.forEach(e => {
        const d = Math.hypot(e.px - u.px, e.py - u.py);
        if (d < bd) { bd = d; best = e; }
    });
    return best;
}
function lowestAlly(u, team) {
    let best = null, br = Infinity;
    team.forEach(a => {
        if (!a.alive) return;
        const r = a.hp / a.maxHp;
        if (r < br) { br = r; best = a; }
    });
    return best;
}

function pushFx(b, x, y, text, color, big) {
    b.fx.push({ x: x, y: y, text: text, color: color, life: 700, big: !!big });
    if (b.fx.length > 60) b.fx.shift();
}

function dealDamage(b, src, tgt, amount, isMagic) {
    if (!tgt || !tgt.alive) return;
    let dmg = amount;
    // 暴擊（僅物理）
    if (!isMagic && Math.random() < src.critChance) dmg *= 1.5 + src.critDmg;
    dmg *= 1 + src.dmgAmp;
    // 防禦
    const def = isMagic ? tgt.mr : tgt.armor;
    dmg *= 100 / (100 + def);
    dmg *= 1 - Math.min(0.7, tgt.dr);

    // 護盾吸收
    if (tgt.shield > 0) {
        const absorb = Math.min(tgt.shield, dmg);
        tgt.shield -= absorb;
        dmg -= absorb;
    }
    if (dmg > 0) tgt.hp -= dmg;

    src.dealt += amount;
    if (src.lifesteal > 0) {
        const heal = amount * src.lifesteal;
        src.hp = Math.min(src.maxHp, src.hp + heal);
    }
    tgt.mana = Math.min(tgt.maxMana, tgt.mana + 8);

    pushFx(b, tgt.px, tgt.py - 26, "-" + Math.round(amount), isMagic ? "#b794f4" : "#ffd7a0");
    if (dmg > 0) SFX.hit();

    if (tgt.hp <= 0) { tgt.hp = 0; tgt.alive = false; }
}

function doHeal(b, src, tgt, amount) {
    if (!tgt || !tgt.alive) return;
    const before = tgt.hp;
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + amount);
    src.healed += tgt.hp - before;
    pushFx(b, tgt.px, tgt.py - 26, "+" + Math.round(tgt.hp - before), "#68d391");
}

function castAbility(b, u) {
    const a = u.ability;
    if (!a) { u.mana = 0; return; }
    u.mana = 0;
    u.castFx = 400;
    SFX.skill();

    const foes = aliveList(u.team === "player" ? b.enemy : b.player);
    const allies = aliveList(u.team === "player" ? b.player : b.enemy);
    const power = 1 + u.spellPower;

    if (a.type === "burst") {
        const t = nearestEnemy(u, foes);
        if (t) { pushFx(b, u.px, u.py - 34, u.skill + "!", u.color, true); dealDamage(b, u, t, a.value * power, true); }
    } else if (a.type === "aoe") {
        pushFx(b, u.px, u.py - 34, u.skill + "!", u.color, true);
        const cx = u.px, cy = u.py;
        foes.forEach(f => { if (Math.hypot(f.px - cx, f.py - cy) <= (a.radius || 80) + 30) dealDamage(b, u, f, a.value * power, true); });
    } else if (a.type === "heal") {
        const t = lowestAlly(u, allies);
        if (t && t.hp < t.maxHp) { pushFx(b, u.px, u.py - 34, u.skill + "!", u.color, true); doHeal(b, u, t, a.value * power); }
    } else if (a.type === "shield") {
        const desc = a.desc || "";
        pushFx(b, u.px, u.py - 34, u.skill + "!", u.color, true);
        if (desc.indexOf("全隊") >= 0) allies.forEach(t => { t.shield += a.value * power; });
        else if (desc.indexOf("最低") >= 0) { const t = lowestAlly(u, allies); if (t) t.shield += a.value * power; }
        else u.shield += a.value * power;
    } else if (a.type === "buff") {
        pushFx(b, u.px, u.py - 34, u.skill + "!", u.color, true);
        u.buffMul = 1 + a.value / 100;
        u.buffUntil = b.t + 6;
        u.ad = u.baseAd * u.buffMul;
    }
}

function updateBattle(dtMs) {
    const b = STATE.battle;
    if (b.over) {
        b.resolveTimer -= dtMs;
        b.fx.forEach(f => { f.life -= dtMs; });
        b.fx = b.fx.filter(f => f.life > 0);
        if (b.resolveTimer <= 0 && !b.resolved) { b.resolved = true; resolveBattle(); }
        // 持續更新特效（讓死亡後的動畫收尾）
        return;
    }
    b.t += dtMs / 1000;
    const dt = dtMs / 1000;

    const pAlive = aliveList(b.player), eAlive = aliveList(b.enemy);
    b.player.concat(b.enemy).forEach(u => {
        if (!u.alive) return;
        if (u.castFx > 0) u.castFx -= dtMs;
        if (u.buffMul !== 1 && b.t > u.buffUntil) { u.buffMul = 1; u.ad = u.baseAd; }

        // 醫者被動回血
        if (u.regen > 0) u.hp = Math.min(u.maxHp, u.hp + u.regen * dt);

        const foes = u.team === "player" ? eAlive : pAlive;
        if (foes.length === 0) return;
        const tgt = nearestEnemy(u, foes);
        if (!tgt) return;

        const dist = Math.hypot(tgt.px - u.px, tgt.py - u.py);

        // 攻擊
        u.atkCd -= dtMs;
        if (dist <= u.range) {
            if (u.atkCd <= 0) {
                u.atkCd = u.atkInterval;
                dealDamage(b, u, tgt, u.ad, false);
                u.mana = Math.min(u.maxMana, u.mana + 10 + u.manaRegen);
                if (u.splash > 0) {
                    foes.forEach(f => { if (f !== tgt && Math.hypot(f.px - tgt.px, f.py - tgt.py) < 70) dealDamage(b, u, f, u.ad * u.splash, false); });
                }
                if (u.mana >= u.maxMana) castAbility(b, u);
            }
        } else {
            // 移動
            const ang = Math.atan2(tgt.py - u.py, tgt.px - u.px);
            u.px = clamp(u.px + Math.cos(ang) * u.moveSpd * dt, ARENA.x0 + 26, ARENA.x1 - 26);
            u.py = clamp(u.py + Math.sin(ang) * u.moveSpd * dt, ARENA.y0 + 26, ARENA.y1 - 26);
            if (u.mana < u.maxMana) u.mana = Math.min(u.maxMana, u.mana + 4 * dt * (u.manaRegen / 20 + 1));
            if (u.mana >= u.maxMana) castAbility(b, u);
        }
    });

    // 戰鬥結束判定
    const pAfter = aliveList(b.player).length, eAfter = aliveList(b.enemy).length;
    if (eAfter === 0 || pAfter === 0 || b.t > 40) {
        b.over = true;
        b.resolveTimer = 1200;
        if (eAfter === 0 && pAfter > 0) b.winner = "player";
        else if (pAfter === 0) b.winner = "enemy";
        else {
            // 逾時：比剩餘血量比例
            const ph = b.player.reduce((s, u) => s + Math.max(0, u.hp) / u.maxHp, 0);
            const eh = b.enemy.reduce((s, u) => s + Math.max(0, u.hp) / u.maxHp, 0);
            b.winner = ph > eh ? "player" : "enemy";
        }
    }
}

function resolveBattle() {
    const b = STATE.battle;
    const log = document.getElementById("battle-log");

    if (b.winner === "player") {
        STATE.winStreak++; STATE.loseStreak = 0;
        SFX.win();
        if (log) log.innerHTML = '<span class="win">✦ 戰鬥勝利！</span> 連勝 <b>' + STATE.winStreak + '</b>　準備進入下一回合…';
        setTimeout(() => nextRound(), 1500);
    } else {
        const survivors = aliveList(b.enemy).length;
        const dmg = Math.min(15, 2 + survivors);
        STATE.hp -= dmg;
        STATE.loseStreak++; STATE.winStreak = 0;
        SFX.lose();
        if (log) log.innerHTML = '<span class="lose">✖ 戰鬥失敗</span>　生命值 -' + dmg + '（剩 ' + Math.max(0, STATE.hp) + '）';
        updateUI();
        if (STATE.hp <= 0) { setTimeout(() => endGame(false), 1400); }
        else setTimeout(() => nextRound(), 1500);
    }
}

/* =============================== 回合流程 =============================== */
function nextRound() {
    STATE.round++;
    if (STATE.round >= ROUNDS.length) { endGame(true); return; }
    STATE.battle = null;
    STATE.phase = "prep";
    startPrep();
}

function startPrep() {
    // 收入：基礎 5 + 利息(每10金+1，上限5) + 連勝/連敗獎勵
    const interest = Math.min(5, Math.floor(STATE.gold / 10));
    const streak = STATE.winStreak > 0 ? STATE.winStreak : STATE.loseStreak;
    const bonus = streak >= 5 ? 3 : streak >= 3 ? 2 : 0;
    const income = 5 + interest + bonus;
    STATE.gold += income;

    // 每回合免費 2 點經驗
    addExp(2);

    // 免費刷新商店
    refreshShopCards();

    const log = document.getElementById("battle-log");
    if (log) log.innerHTML = "💰 本回合收入 <b>+" + income + "</b>（基礎 5" + (interest ? " · 利息 " + interest : "") + (bonus ? " · 連勝/敗 +" + bonus : "") + "）　調整陣容後按「開始戰鬥」";

    updateUI(); updateSynergies(); renderShop(); drawGame();
    toast("回合 " + ROUNDS[STATE.round].stage + " 開始　收入 +" + income);
}

/* =============================== 結束 / 重啟 / 說明 =============================== */
function endGame(win) {
    STATE.phase = "prep";
    const modal = document.getElementById("result-modal");
    const title = document.getElementById("result-title");
    const desc = document.getElementById("result-desc");
    const stats = document.getElementById("result-stats");
    if (!modal) return;

    if (win) {
        SFX.win();
        title.textContent = "天下靖平";
        title.className = "win";
        desc.textContent = "恭喜！你率領群俠擋下異度魔界的侵略，棄天帝之禍已然平息。";
    } else {
        SFX.lose();
        title.textContent = "天罪降臨";
        title.className = "lose";
        desc.textContent = "魔界大軍攻破防線，神州陷入黑暗……再調整陣容，捲土重來！";
    }
    const res = computeSynergies();
    stats.textContent = "存活回合 " + STATE.round + " / " + ROUNDS.length + "　最終等級 " + STATE.level + "　觸發羈絆 " + res.active.length + " 種";
    modal.classList.add("show");
}

function restartGame() {
    const rm = document.getElementById("result-modal");
    const hm = document.getElementById("help-modal");
    if (rm) rm.classList.remove("show");
    if (hm) hm.classList.remove("show");
    resetState();
    refreshShopCards();
    updateUI(); updateSynergies(); drawGame();
    toast("已重新開始，祝君武運昌隆");
}

function toggleHelp(show) {
    const hm = document.getElementById("help-modal");
    if (!hm) return;
    if (show === undefined) hm.classList.toggle("show");
    else hm.classList[show ? "add" : "remove"]("show");
}

function toggleSellMode() {
    if (STATE.phase !== "prep") return;
    STATE.sellMode = !STATE.sellMode;
    STATE.selected = null;
    const btn = document.getElementById("btn-sell");
    if (btn) btn.textContent = STATE.sellMode ? "✖ 取消賣出" : "🗑 賣出角色";
    toast(STATE.sellMode ? "賣出模式：點選要賣出的角色（返還購買金）" : "已離開賣出模式");
}

/* =============================== 啟動 =============================== */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
