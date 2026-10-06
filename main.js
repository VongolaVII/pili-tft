let gold = 10;
let bench = new Array(9).fill(null);

// 初始化遊戲
window.onload = () => {
    initBoard();
    generateShopCards(); // 初始化免費顯示商店英雄
};

function initBoard() {
    const benchEl = document.getElementById("bench");
    if (!benchEl) return;
    benchEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.innerText = bench[i] ? bench[i].name : "空";
        benchEl.appendChild(slot);
    }
}

// 產生商店英雄卡片
function generateShopCards() {
    const shopEl = document.getElementById("shop");
    if (!shopEl) return;
    shopEl.innerHTML = "";

    for (let i = 0; i < 5; i++) {
        const randHero = CHAMPIONS[Math.floor(Math.random() * CHAMPIONS.length)];
        const card = document.createElement("div");
        card.className = `card cost-${randHero.cost}`;
        card.innerHTML = `
            <strong>${randHero.name}</strong><br>
            <small>${randHero.origin} / ${randHero.class}</small><br>
            <span>💰 ${randHero.cost}</span>
        `;
        card.onclick = () => buyHero(randHero);
        shopEl.appendChild(card);
    }
}

// 手動刷新商店（扣 2 金幣）
function refreshShop() {
    if (gold < 2) return alert("金幣不足！");
    gold -= 2;
    document.getElementById("gold").innerText = gold;
    generateShopCards();
}

// 購買英雄
function buyHero(hero) {
    if (gold < hero.cost) return alert("金幣不足！");
    
    const emptyIndex = bench.findIndex(x => x === null);
    if (emptyIndex === -1) return alert("備戰區已滿！");

    gold -= hero.cost;
    document.getElementById("gold").innerText = gold;
    bench[emptyIndex] = hero;
    initBoard();
}