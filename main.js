// 遊戲數據與狀態
let gold = 10, level = 1, exp = 0, hp = 100;
let stage = "1-1"; // 紀錄當前回合
let selected = null; // { type: 'bench'|'board', index/r/c }

// 商店當前的 5 張卡牌資料
let currentShop = [null, null, null, null, null];

// 狀態陣列 (開局完全空白)
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

    // 重置初始數值 (開局空白棋盤)
    level = 1;
    exp = 0;
    gold = 10;
    hp = 100;
    stage = "1-1";

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
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Arial";
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

        if (selected.type === 'bench' && target.type === 'bench') {
            bench[selected.i] = u2;
            bench[target.i] = u1;
        } else if (selected.type === 'board' && target.type === 'board') {
            board[selected.r][selected.c] = u2;
            board[target.r][target.c] = u1;
        } else if (selected.type === 'bench' && target.type === 'board') {
            bench[selected.i] = u2;
            board[target.r][target.c] = u1;
        } else if (selected.type === 'board' && target.type === 'bench') {
            board[selected.r][selected.c] = u2;
            bench[target.i] = u1;
        }
        selected = null;
    }
    updateSynergies();
    drawGame();
}

// 刷新商店卡牌 (考慮等級機率)
function refreshShopCards() {
    const rates = DROP_RATES[level] || DROP_RATES[1];
    currentShop = [];

    for (let i = 0; i < 5; i++) {
        // 隨機抽費率 (1~6費)
        let rand = Math.random() * 100;
        let chosenCost = 1;
        let cumulative = 0;
        for (let c = 0; c < rates.length; c++) {
            cumulative += rates[c];
            if (rand <= cumulative) {
                chosenCost = c + 1;
                break;
            }
        }

        // 從選定的費率池隨機抽取角色
        let pool = CHAMPIONS.filter(ch => ch.cost === chosenCost);
        if (pool.length === 0) pool = CHAMPIONS.filter(ch => ch.cost === 1);
        let champ = pool[Math.floor(Math.random() * pool.length)];

        currentShop.push({ ...champ, star: 1 });
    }
    renderShop();
}

// 手動刷新商店
function refreshShop() {
    if (gold < 2) return;
    gold -= 2;
    refreshShopCards();
    updateUI();
}

// 購買經驗值
function buyExp() {
    if (gold < 4 || level >= 9) return;
    gold -= 4;
    exp += 4;
    // 升級邏輯
    const expNeed = [0, 2, 4, 8, 16, 24, 36, 56, 80];
    if (level < 9 && exp >= expNeed[level]) {
        exp -= expNeed[level];
        level++;
    }
    updateUI();
}

// 渲染商店 HTML
function renderShop() {
    const shopContainer = document.getElementById("shop-cards");
    if (!shopContainer) return;
    shopContainer.innerHTML = "";

    currentShop.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = `card cost-${item ? item.cost : 1}`;
        if (!item) {
            card.style.opacity = "0.3";
            card.innerHTML = `<span class="card-name">已售出</span>`;
        } else {
            card.innerHTML = `
                <div class="card-name">${item.name}</div>
                <div class="card-tag">${item.origin} · ${item.class}</div>
                <div class="card-cost">💰 ${item.cost} 金</div>
            `;
            card.onclick = () => buyChampion(index);
        }
        shopContainer.appendChild(card);
    });
}

// 購買英雄
function buyChampion(index) {
    const item = currentShop[index];
    if (!item || gold < item.cost) return;

    // 尋找備戰區空位
    const emptyIndex = bench.findIndex(slot => slot === null);
    if (emptyIndex === -1) return; // 備戰區已滿

    gold -= item.cost;
    bench[emptyIndex] = item;
    currentShop[index] = null; // 標記為已售出

    checkTripleUpgrade(item.name); // 檢查三星三連合成
    renderShop();
    updateUI();
    drawGame();
}

// 三連合成 (3張1星 -> 1張2星, 3張2星 -> 1張3星)
function checkTripleUpgrade(name) {
    for (let star = 1; star <= 2; star++) {
        let matches = [];

        // 搜尋備戰區
        bench.forEach((u, i) => {
            if (u && u.name === name && (u.star || 1) === star) {
                matches.push({ type: 'bench', i });
            }
        });

        // 搜尋棋盤
        for (let r = 0; r < BOARD_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                let u = board[r][c];
                if (u && u.name === name && (u.star || 1) === star) {
                    matches.push({ type: 'board', r, c });
                }
            }
        }

        // 合成升星
        if (matches.length >= 3) {
            let keep = matches[0];
            let remove1 = matches[1];
            let remove2 = matches[2];

            // 清除被合成掉的兩隻
            if (remove1.type === 'bench') bench[remove1.i] = null;
            else board[remove1.r][remove1.c] = null;

            if (remove2.type === 'bench') bench[remove2.i] = null;
            else board[remove2.r][remove2.c] = null;

            // 升星保留的那隻
            if (keep.type === 'bench') {
                bench[keep.i].star = star + 1;
            } else {
                board[keep.r][keep.c].star = star + 1;
            }
        }
    }
}

// 更新頂部 UI 數值
function updateUI() {
    document.getElementById("gold").innerText = gold;
    document.getElementById("level").innerText = level;
    document.getElementById("hp").innerText = hp;

    const expNeed = [0, 2, 4, 8, 16, 24, 36, 56, 80];
    document.getElementById("exp").innerText = `${exp}/${expNeed[level] || 'MAX'}`;
}

// 計算與更新左側已激活羈絆
function updateSynergies() {
    const counts = {};

    // 統計棋盤上的角色 (不含備戰區)
    for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
            const unit = board[r][c];
            if (unit) {
                counts[unit.origin] = (counts[unit.origin] || 0) + 1;
                counts[unit.class] = (counts[unit.class] || 0) + 1;
            }
        }
    }

    const synergyContainer = document.getElementById("synergies");
    synergyContainer.innerHTML = "";

    let hasSynergy = false;
    for (const [key, count] of Object.entries(counts)) {
        if (SYNERGY_THRESHOLDS[key]) {
            const activeThreshold = SYNERGY_THRESHOLDS[key].filter(t => count >= t).pop();
            if (activeThreshold) {
                hasSynergy = true;
                const item = document.createElement("div");
                item.className = "synergy-item";
                item.innerHTML = `<strong>${key}</strong> (${count}/${activeThreshold})`;
                synergyContainer.appendChild(item);
            }
        }
    }

    if (!hasSynergy) {
        synergyContainer.innerHTML = `<div class="empty">尚無羈絆</div>`;
    }
}

// 開始戰鬥 (測試回合切換)
function startBattle() {
    alert("戰鬥開始！");
}