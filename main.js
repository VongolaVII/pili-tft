// 遊戲狀態
let gold = 10;
let level = 1;
let exp = 0;
let hp = 100;
let selectedSlot = null; // 當前選取的備戰區或棋盤格 { type: 'bench'|'board', index/row/col }

// 棋盤狀態 (4行 7列)
const BOARD_ROWS = 4;
const BOARD_COLS = 7;
let boardState = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));

// 備戰區狀態 (9格)
let benchState = new Array(9).fill(null);

// 初始化遊戲
window.onload = () => {
    renderBoard();
    renderBench();
    refreshShopFree();
    updateUI();
};

// 渲染六角形棋盤
function renderBoard() {
    const boardEl = document.getElementById("hex-board");
    boardEl.innerHTML = "";

    for (let r = 0; r < BOARD_ROWS; r++) {
        const rowEl = document.createElement("div");
        rowEl.className = `hex-row ${r % 2 === 1 ? 'even' : ''}`;

        for (let c = 0; c < BOARD_COLS; c++) {
            const cellEl = document.createElement("div");
            cellEl.className = "hex-cell";
            cellEl.dataset.row = r;
            cellEl.dataset.col = c;

            if (selectedSlot && selectedSlot.type === 'board' && selectedSlot.row === r && selectedSlot.col === c) {
                cellEl.classList.add('selected');
            }

            const unit = boardState[r][c];
            if (unit) {
                cellEl.appendChild(createPieceElement(unit));
            }

            cellEl.onclick = () => handleCellClick('board', { row: r, col: c });
            rowEl.appendChild(cellEl);
        }
        boardEl.appendChild(rowEl);
    }
    updateSynergies();
}

// 渲染備戰區
function renderBench() {
    const benchEl = document.getElementById("bench");
    benchEl.innerHTML = "";

    for (let i = 0; i < 9; i++) {
        const slotEl = document.createElement("div");
        slotEl.className = "bench-slot";
        
        if (selectedSlot && selectedSlot.type === 'bench' && selectedSlot.index === i) {
            slotEl.classList.add('selected');
        }

        const unit = benchState[i];
        if (unit) {
            slotEl.appendChild(createPieceElement(unit));
        }

        slotEl.onclick = () => handleCellClick('bench', { index: i });
        benchEl.appendChild(slotEl);
    }
}

// 創建棋子文字視覺元件
function createPieceElement(unit) {
    const pieceEl = document.createElement("div");
    pieceEl.className = "piece";
    
    const stars = "⭐".repeat(unit.star || 1);
    pieceEl.innerHTML = `
        <div class="piece-stars">${stars}</div>
        <div class="piece-name">${unit.name}</div>
        <div class="hp-bar-bg"><div class="hp-bar-fill"></div></div>
    `;
    return pieceEl;
}

// 點擊格子處理（移動/放置邏輯）
function handleCellClick(type, pos) {
    if (!selectedSlot) {
        // 第一下點擊：選取棋子
        const unit = type === 'bench' ? benchState[pos.index] : boardState[pos.row][pos.col];
        if (unit) {
            selectedSlot = { type, ...pos };
        }
    } else {
        // 第二下點擊：移動或交換棋子
        moveUnit(selectedSlot, { type, ...pos });
        selectedSlot = null;
    }
    renderBoard();
    renderBench();
}

// 棋子位置交換/移動
function moveUnit(from, to) {
    let fromUnit = from.type === 'bench' ? benchState[from.index] : boardState[from.row][from.col];
    let toUnit = to.type === 'bench' ? benchState[to.index] : boardState[to.row][to.col];

    // 設定新位置
    if (from.type === 'bench') benchState[from.index] = toUnit;
    else boardState[from.row][from.col] = toUnit;

    if (to.type === 'bench') benchState[to.index] = fromUnit;
    else boardState[to.row][to.col] = fromUnit;

    checkTripleCombine(); // 檢查是否可以 3 合 1 升星
}

// 三合一自動升星
function checkTripleCombine() {
    const counts = {};
    // 統計所有相同的英雄與星級
    const allUnits = [];
    benchState.forEach((u, i) => u && allUnits.push({ unit: u, type: 'bench', index: i }));
    boardState.forEach((row, r) => row.forEach((u, c) => u && allUnits.push({ unit: u, type: 'board', row: r, col: c })));

    allUnits.forEach(item => {
        const key = `${item.unit.id}_${item.unit.star || 1}`;
        if (!counts[key]) counts[key] = [];
        counts[key].push(item);
    });

    for (let key in counts) {
        if (counts[key].length >= 3) {
            const [u1, u2, u3] = counts[key];
            // 刪除前兩個
            removeUnit(u1);
            removeUnit(u2);
            // 升級第三個
            u3.unit.star = (u3.unit.star || 1) + 1;
            alert(`🎉 恭喜！${u3.unit.name} 成功合成升至 ${u3.unit.star} 星！`);
            checkTripleCombine(); // 遞迴檢查是否能連續升星
            break;
        }
    }
}

function removeUnit(target) {
    if (target.type === 'bench') benchState[target.index] = null;
    else boardState[target.row][target.col] = null;
}

// 刷新商店
function refreshShopFree() {
    generateShopCards();
}

function refreshShop() {
    if (gold < 2) return alert("金幣不足！");
    gold -= 2;
    generateShopCards();
    updateUI();
}

function generateShopCards() {
    const shopEl = document.getElementById("shop");
    shopEl.innerHTML = "";

    for (let i = 0; i < 5; i++) {
        const randHero = CHAMPIONS[Math.floor(Math.random() * CHAMPIONS.length)];
        const card = document.createElement("div");
        card.className = `card cost-${randHero.cost}`;
        card.innerHTML = `
            <div class="card-title">${randHero.name}</div>
            <div class="card-tags">${randHero.origin} / ${randHero.class}</div>
            <div class="card-cost">💰 ${randHero.cost}</div>
        `;
        card.onclick = () => buyHero(randHero);
        shopEl.appendChild(card);
    }
}

// 購買英雄
function buyHero(hero) {
    if (gold < hero.cost) return alert("金幣不足！");

    const emptyIndex = benchState.findIndex(x => x === null);
    if (emptyIndex === -1) return alert("備戰區已滿！");

    gold -= hero.cost;
    benchState[emptyIndex] = { ...hero, star: 1 };
    
    checkTripleCombine();
    renderBench();
    updateUI();
}

// 購買經驗值
function buyExp() {
    if (gold < 4) return alert("金幣不足！");
    gold -= 4;
    exp += 4;
    if (exp >= level * 4) {
        exp -= level * 4;
        level++;
    }
    updateUI();
}

// 更新頂部 UI 數據
function updateUI() {
    document.getElementById("gold").innerText = gold;
    document.getElementById("level").innerText = level;
    document.getElementById("exp").innerText = `${exp}/${level * 4}`;
    document.getElementById("hp").innerText = hp;
}

// 更新羈絆計算
function updateSynergies() {
    const activeOrigins = {};
    const activeClasses = {};

    boardState.forEach(row => {
        row.forEach(unit => {
            if (unit) {
                activeOrigins[unit.origin] = (activeOrigins[unit.origin] || 0) + 1;
                activeClasses[unit.class] = (activeClasses[unit.class] || 0) + 1;
            }
        });
    });

    const synergyListEl = document.getElementById("synergy-list");
    synergyListEl.innerHTML = "";

    let hasSynergy = false;
    const renderGroup = (dict) => {
        for (let name in dict) {
            hasSynergy = true;
            const item = document.createElement("div");
            item.className = "synergy-item active";
            item.innerHTML = `
                <div class="synergy-name">${name}</div>
                <div class="synergy-count">當前數量: ${dict[name]}</div>
            `;
            synergyListEl.appendChild(item);
        }
    };

    renderGroup(activeOrigins);
    renderGroup(activeClasses);

    if (!hasSynergy) {
        synergyListEl.innerHTML = `<div class="synergy-empty" style="color:#718096; font-size:13px;">尚無 active 羈絆</div>`;
    }
}

function startBattle() {
    alert("⚔️ 戰鬥開始！棋子開始發動攻擊...（戰鬥特效與動作邏輯準備中）");
}