// 遊戲數據與狀態
let gold = 10, level = 1, exp = 0, hp = 100;
let selected = null; // { type: 'bench'|'board', index/r/c }

// 商店當前的 5 張卡牌資料
let currentShop = [null, null, null, null, null];

// 狀態陣列
const BOARD_ROWS = 4, BOARD_COLS = 7;
let board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
let bench = new Array(9).fill(null);

// Canvas
let canvas, ctx;
const HEX_RADIUS = 32;

window.onload = () => {
    canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");

    canvas.addEventListener("click", onCanvasClick);

    // 重置初始數值
    level = 1;
    exp = 0;
    gold = 10;
    hp = 100;

    // 開局若 CHAMPIONS 存在，預設放 1 位角色
    if (typeof CHAMPIONS !== 'undefined' && CHAMPIONS.length > 0) {
        board[3][3] = { ...CHAMPIONS[0], star: 1, isHeadliner: false };
    }

    refreshShopCards();
    updateUI();
    drawGame();
};

// 繪製整張畫布 (Hex 棋盤 + 備戰區)
function drawGame() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 繪製 Hex 棋盤 (4x7)
    const startX = 130, startY = 50;
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            let x = startX + c * (HEX_RADIUS * 1.75);
            let y = startY + r * (HEX_RADIUS * 1.5);
            if (r % 2 === 1) x += HEX_RADIUS * 0.875;

            const isSelected = selected && selected.type === 'board' && selected.r === r && selected.c === c;
            drawHexagon(x, y, HEX_RADIUS, isSelected ? "#f6ad55" : "#282d42", "#3b4261");

            const unit = board[r][c];
            if (unit) drawUnit(x, y, unit);
        }
    }

    // 2. 繪製備戰區 (9 格)
    const benchStartY = 335;
    const slotSize = 56;
    const benchStartX = (canvas.width - (9 * (slotSize + 10))) / 2;

    ctx.fillStyle = "#a0aec0";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("【 備 戰 區 】", 20, benchStartY - 10);

    for (let i = 0; i < 9; i++) {
        let x = benchStartX + i * (slotSize + 10);
        let y = benchStartY;

        const isSelected = selected && selected.type === 'bench' && selected.i === i;
        ctx.fillStyle = isSelected ? "#f6ad55" : "#212538";
        ctx.strokeStyle = isSelected ? "#fff" : "#3b4261";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, slotSize, slotSize, 6);
        } else {
            ctx.rect(x, y, slotSize, slotSize);
        }
        ctx.fill();
        ctx.stroke();

        const unit = bench[i];
        if (unit) drawUnit(x + slotSize / 2, y + slotSize / 2, unit);
    }
}

// 畫六角形
function drawHexagon(x, y, r, fillColor, strokeColor) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        let angle = (Math.PI / 3) * i - Math.PI / 6;
        let hx = x + r * Math.cos(angle);
        let hy = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// 畫棋子單位
function drawUnit(x, y, unit) {
    if (!unit) return;
    ctx.fillStyle = unit.isHeadliner ? "#f6ad55" : "#ffffff";
    ctx.font = unit.isHeadliner ? "bold 12px Arial" : "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const displayName = unit.isHeadliner ? `👑 ${unit.name}` : unit.name;
    ctx.fillText(displayName, x, y - 6);

    ctx.fillStyle = "#f6e05e";
    ctx.font = "11px Arial";
    ctx.fillText("⭐".repeat(unit.star || 1), x, y + 10);
}

// 點擊 Canvas 事件
function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const benchStartY = 335, slotSize = 56;
    const benchStartX = (canvas.width - (9 * (slotSize + 10))) / 2;

    // 檢查點擊備戰區
    if (my >= benchStartY && my <= benchStartY + slotSize) {
        for (let i = 0; i < 9; i++) {
            let x = benchStartX + i * (slotSize + 10);
            if (mx >= x && mx <= x + slotSize) {
                handleSelect({ type: 'bench', i });
                return;
            }
        }
    }

    // 檢查點擊 Hex 棋盤
    const startX = 130, startY = 50;
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            let x = startX + c * (HEX_RADIUS * 1.75);
            let y = startY + r * (HEX_RADIUS * 1.5);
            if (r % 2 === 1) x += HEX_RADIUS * 0.875;

            let dist = Math.hypot(mx - x, my - y);
            if (dist <= HEX_RADIUS) {
                handleSelect({ type: 'board', r, c });
                return;
            }
        }
    }
}

// 選擇與放置英雄
function handleSelect(target) {
    if (!selected) {
        let unit = target.type === 'bench' ? bench[target.i] : board[target.r][target.c];
        if (unit) selected = target;
    } else {
        let u1 = selected.type === 'bench' ? bench[selected.i] : board[selected.r][selected.c];
        let u2 = target.type === 'bench' ? bench[target.i] : board[target.r][target.c];

        if (selected.type === 'bench') bench[selected.i] = u2;
        else board[selected.r][selected.c] = u2;

        if (target.type === 'bench') bench[target.i] = u1;
        else board[target.r][target.c] = u1;

        selected = null;
        checkTripleCombine();
        updateSynergies();
    }
    drawGame();
}

// 自動合成
function checkTripleCombine() {
    const list = [];
    bench.forEach((u, i) => u && list.push({ u, type: 'bench', i }));
    board.forEach((row, r) => row.forEach((u, c) => u && list.push({ u, type: 'board', r, c })));

    const groups = {};
    list.forEach(item => {
        let key = `${item.u.id}_${item.u.star || 1}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });

    for (let key in groups) {
        if (groups[key].length >= 3) {
            const [a, b, c] = groups[key];
            if (a.type === 'bench') bench[a.i] = null; else board[a.r][a.c] = null;
            if (b.type === 'bench') bench[b.i] = null; else board[b.r][b.c] = null;
            c.u.star = (c.u.star || 1) + 1;
            checkTripleCombine();
            break;
        }
    }
}

// --- 【超級防呆】抽卡邏輯 ---
function getRandomHeroByLevel(currentLevel) {
    if (typeof CHAMPIONS === 'undefined' || CHAMPIONS.length === 0) {
        return { id: 'default', name: '無角色', cost: 1, origin: '無', class: '無' };
    }

    const lvl = Math.max(1, Math.min(currentLevel || 1, 9));
    
    // 預設 1 等概率 [100%, 0, 0, 0, 0, 0]
    const defaultRates = [100, 0, 0, 0, 0, 0];
    const rates = (typeof DROP_RATES !== 'undefined' && DROP_RATES[lvl]) 
        ? DROP_RATES[lvl] 
        : defaultRates;
    
    const rand = Math.random() * 100;
    let cumulative = 0;
    let targetCost = 1;

    for (let i = 0; i < rates.length; i++) {
        cumulative += rates[i];
        if (rand < cumulative) {
            targetCost = i + 1;
            break;
        }
    }

    let filtered = CHAMPIONS.filter(c => c.cost === targetCost);
    if (filtered.length === 0) {
        filtered = CHAMPIONS.filter(c => c.cost === 1);
    }
    if (filtered.length === 0) {
        filtered = CHAMPIONS; // 極致保底
    }

    return filtered[Math.floor(Math.random() * filtered.length)];
}

function hasHeadlinerOnBoardOrBench() {
    let count = 0;
    board.forEach(row => row.forEach(u => { if (u && u.isHeadliner) count++; }));
    bench.forEach(u => { if (u && u.isHeadliner) count++; });
    return count > 0;
}

function refreshShopCards() {
    currentShop = [];

    for (let i = 0; i < 4; i++) {
        const hero = getRandomHeroByLevel(level);
        currentShop.push({ ...hero, shopCost: hero.cost, star: 1, isHeadliner: false });
    }

    const alreadyHas = hasHeadlinerOnBoardOrBench();
    const shouldSpawnHeadliner = !alreadyHas || (Math.random() < 0.25);
    const slot5Hero = getRandomHeroByLevel(level);

    if (shouldSpawnHeadliner) {
        currentShop.push({
            ...slot5Hero,
            shopCost: slot5Hero.cost * 3,
            star: 2,
            isHeadliner: true,
            extraSynergy: slot5Hero.origin
        });
    } else {
        currentShop.push({ ...slot5Hero, shopCost: slot5Hero.cost, star: 1, isHeadliner: false });
    }

    renderShopUI();
}

function renderShopUI() {
    const el = document.getElementById("shop-cards");
    if (!el) return;
    el.innerHTML = "";

    currentShop.forEach((hero, index) => {
        const card = document.createElement("div");
        
        if (!hero) {
            card.className = "card empty-card";
            card.style.opacity = "0.2";
            card.style.cursor = "not-allowed";
            card.innerHTML = `<div class="card-name" style="color:#718096;text-align:center;line-height:50px;">已售出</div>`;
        } else {
            const isHL = hero.isHeadliner;
            const costClass = Math.min(hero.cost || 1, 5);
            card.className = `card cost-${costClass} ${isHL ? 'headliner-card' : ''}`;
            
            const hlBadge = isHL ? `<span style="color:#f6ad55;font-weight:bold;">👑天命主角</span>` : '';
            const extraTag = isHL ? `<span style="color:#f6ad55;"> (${hero.origin} +1)</span>` : '';

            card.innerHTML = `
                <div class="card-name">${hero.name} ${hlBadge}</div>
                <div class="card-tag">${hero.origin}${extraTag} / ${hero.class}</div>
                <div class="card-cost">💰 ${hero.shopCost || hero.cost}</div>
            `;
            card.onclick = () => buyHero(index);
        }
        el.appendChild(card);
    });
}

function refreshShop() {
    if (gold < 2) return alert("金幣不足！");
    gold -= 2;
    refreshShopCards();
    updateUI();
}

function buyHero(shopIndex) {
    const hero = currentShop[shopIndex];
    if (!hero) return;

    const buyCost = hero.shopCost || hero.cost;
    if (gold < buyCost) return alert("金幣不足！");
    
    let emptyI = bench.findIndex(x => x === null);
    if (emptyI === -1) return alert("備戰區已滿！");

    gold -= buyCost;
    bench[emptyI] = { 
        ...hero, 
        star: hero.star || 1, 
        isHeadliner: hero.isHeadliner || false 
    };
    
    currentShop[shopIndex] = null;

    checkTripleCombine();
    updateUI();
    renderShopUI();
    updateSynergies();
    drawGame();
}

function buyExp() {
    if (gold < 4) return alert("金幣不足！");
    gold -= 4;
    exp += 4;
    if (exp >= level * 4) { exp -= level * 4; level++; }
    updateUI();
}

function updateUI() {
    const g = document.getElementById("gold");
    const l = document.getElementById("level");
    const e = document.getElementById("exp");
    const h = document.getElementById("hp");

    if (g) g.innerText = gold;
    if (l) l.innerText = level;
    if (e) e.innerText = `${exp}/${level * 4}`;
    if (h) h.innerText = hp;
}

function updateSynergies() {
    const counts = {};

    board.forEach(row => row.forEach(u => {
        if (u) {
            counts[u.origin] = (counts[u.origin] || 0) + 1;
            counts[u.class] = (counts[u.class] || 0) + 1;

            if (u.isHeadliner && u.extraSynergy) {
                counts[u.extraSynergy] = (counts[u.extraSynergy] || 0) + 1;
            }
        }
    }));

    const box = document.getElementById("synergies");
    if (!box) return;
    box.innerHTML = "";
    let count = 0;
    for (let k in counts) {
        count++;
        box.innerHTML += `<div class="synergy-item"><b>${k}</b>: ${counts[k]}</div>`;
    }
    if (count === 0) box.innerHTML = `<div style="color:#718096;font-size:12px;">尚無羈絆</div>`;
}

function startBattle() { alert("⚔️ 戰鬥準備就緒！"); }