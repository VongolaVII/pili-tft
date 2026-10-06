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
    ctx = canvas.getContext("2d");

    canvas.addEventListener("click", onCanvasClick);

    refreshShopCards();
    updateUI();
    drawGame();
};

// 繪製整張畫布 (Hex 棋盤 + 備戰區)
function drawGame() {
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

    // 2. 繪製備戰區 (9 格) - 調整 Y 軸位置避免標題重疊
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
        ctx.roundRect(x, y, slotSize, slotSize, 6);
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

// 畫棋子單位 (文字 + 星級)
function drawUnit(x, y, unit) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(unit.name, x, y - 6);

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

// 三合一自動升星 (合成 2 星或 3 星)
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

// 刷新商店英雄卡片
function refreshShopCards() {
    currentShop = [];
    for (let i = 0; i < 5; i++) {
        const hero = CHAMPIONS[Math.floor(Math.random() * CHAMPIONS.length)];
        currentShop.push({ ...hero });
    }
    renderShopUI();
}

// 渲染商店 UI（若已被購買則變灰空置）
function renderShopUI() {
    const el = document.getElementById("shop-cards");
    el.innerHTML = "";

    currentShop.forEach((hero, index) => {
        const card = document.createElement("div");
        
        if (!hero) {
            // 已被購買後空置
            card.className = "card empty-card";
            card.style.opacity = "0.2";
            card.style.cursor = "not-allowed";
            card.innerHTML = `<div class="card-name" style="color:#718096;text-align:center;line-height:50px;">已售出</div>`;
        } else {
            card.className = `card cost-${hero.cost}`;
            card.innerHTML = `
                <div class="card-name">${hero.name}</div>
                <div class="card-tag">${hero.origin} / ${hero.class}</div>
                <div class="card-cost">💰 ${hero.cost}</div>
            `;
            card.onclick = () => buyHero(index);
        }
        el.appendChild(card);
    });
}

// 手動花 2 金刷新商店
function refreshShop() {
    if (gold < 2) return alert("金幣不足！");
    gold -= 2;
    refreshShopCards();
    updateUI();
}

// 購買英雄（買完清空該卡片位置）
function buyHero(shopIndex) {
    const hero = currentShop[shopIndex];
    if (!hero) return; // 已經買過了

    if (gold < hero.cost) return alert("金幣不足！");
    let emptyI = bench.findIndex(x => x === null);
    if (emptyI === -1) return alert("備戰區已滿！");

    gold -= hero.cost;
    bench[emptyI] = { ...hero, star: 1 };
    
    // 將商店該卡片設為已售出 (null)
    currentShop[shopIndex] = null;

    checkTripleCombine();
    updateUI();
    renderShopUI();
    drawGame();
}

// 購買經驗值
function buyExp() {
    if (gold < 4) return alert("金幣不足！");
    gold -= 4;
    exp += 4;
    if (exp >= level * 4) { exp -= level * 4; level++; }
    updateUI();
}

// 更新頂部數據 UI
function updateUI() {
    document.getElementById("gold").innerText = gold;
    document.getElementById("level").innerText = level;
    document.getElementById("exp").innerText = `${exp}/${level * 4}`;
    document.getElementById("hp").innerText = hp;
}

// 計算並更新已激活羈絆
function updateSynergies() {
    const counts = {};
    board.forEach(row => row.forEach(u => {
        if (u) {
            counts[u.origin] = (counts[u.origin] || 0) + 1;
            counts[u.class] = (counts[u.class] || 0) + 1;
        }
    }));

    const box = document.getElementById("synergies");
    box.innerHTML = "";
    let count = 0;
    for (let k in counts) {
        count++;
        box.innerHTML += `<div class="synergy-item"><b>${k}</b>: ${counts[k]}</div>`;
    }
    if (count === 0) box.innerHTML = `<div style="color:#718096;font-size:12px;">尚無羈絆</div>`;
}

function startBattle() { alert("⚔️ 戰鬥準備就緒！"); }