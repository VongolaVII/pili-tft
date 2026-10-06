// 霹靂神州 TFT 自走棋 - 官方角色與武學修正版數據庫
const CHAMPIONS = [
    // --- 1 費 (Cost 1) ---
    { id: 1, name: "屈世途", cost: 1, origin: "苦境正道", class: "醫者/輔助", hp: 550, mp: "0/60", ad: 45, armor: 20, mr: 20, range: 3, skill: "琉璃機關" },
    { id: 2, name: "伊達我流", cost: 1, origin: "東瀛武林", class: "劍客", hp: 600, mp: "0/40", ad: 55, armor: 30, mr: 30, range: 1, skill: "一刀流·極" },
    { id: 3, name: "暴風殘道", cost: 1, origin: "異度魔界", class: "重裝", hp: 650, mp: "0/80", ad: 50, armor: 40, mr: 40, range: 1, skill: "暴風狂刀" },
    { id: 4, name: "金藺", cost: 1, origin: "玄宗道門", class: "術士", hp: 500, mp: "20/50", ad: 40, armor: 20, mr: 20, range: 4, skill: "玄宗道符" },
    { id: 5, name: "霏嬰", cost: 1, origin: "紅樓劍閣", class: "醫者/輔助", hp: 500, mp: "0/50", ad: 40, armor: 20, mr: 20, range: 3, skill: "純真祈願" },
    { id: 6, name: "遊子安", cost: 1, origin: "識界靈體", class: "術士", hp: 500, mp: "0/40", ad: 45, armor: 20, mr: 20, range: 3, skill: "識界靈光" },

    // --- 2 費 (Cost 2) ---
    { id: 7, name: "莫召奴", cost: 2, origin: "苦境正道", class: "術士", hp: 600, mp: "20/70", ad: 45, armor: 25, mr: 25, range: 4, skill: "朱雀靈心" },
    { id: 8, name: "照世明燈", cost: 2, origin: "苦境正道", class: "醫者/輔助", hp: 650, mp: "30/80", ad: 45, armor: 30, mr: 30, range: 3, skill: "九轉靈丹" },
    { id: 9, name: "算天裂", cost: 2, origin: "異度魔界", class: "術士", hp: 600, mp: "0/60", ad: 50, armor: 25, mr: 25, range: 3, skill: "恨長生策" },
    { id: 10, name: "京極鬼彥", cost: 2, origin: "東瀛武林", class: "重裝", hp: 750, mp: "0/70", ad: 60, armor: 45, mr: 45, range: 1, skill: "鬼彥槍突" },
    { id: 11, name: "泰逢", cost: 2, origin: "識界靈體", class: "重裝", hp: 700, mp: "0/60", ad: 65, armor: 40, mr: 40, range: 1, skill: "斬馬巨刃" },
    { id: 12, name: "蘇苓", cost: 2, origin: "識界靈體", class: "術士", hp: 550, mp: "0/50", ad: 40, armor: 25, mr: 25, range: 3, skill: "迷心幻影" },
    { id: 13, name: "翠山步", cost: 2, origin: "玄宗道門", class: "劍客", hp: 650, mp: "0/40", ad: 60, armor: 30, mr: 30, range: 1, skill: "弦劍合一" },

    // --- 3 費 (Cost 3) ---
    { id: 14, name: "汲無蹤", cost: 3, origin: "苦境正道", class: "劍客", hp: 800, mp: "0/50", ad: 70, armor: 35, mr: 35, range: 1, skill: "病劍三絕" },
    { id: 15, name: "華顏無道", cost: 3, origin: "異度魔界", class: "重裝", hp: 900, mp: "30/90", ad: 65, armor: 50, mr: 50, range: 1, skill: "惡露天斧" },
    { id: 16, name: "斷風塵", cost: 3, origin: "異度魔界", class: "刺客", hp: 750, mp: "0/60", ad: 75, armor: 30, mr: 30, range: 1, skill: "降世魔劍" },
    { id: 17, name: "墨塵音", cost: 3, origin: "玄宗道門", class: "術士", hp: 700, mp: "40/80", ad: 50, armor: 35, mr: 35, range: 3, skill: "墨曲琴音" },
    { id: 18, name: "拳皇", cost: 3, origin: "東瀛武林", class: "重裝", hp: 850, mp: "0/70", ad: 80, armor: 45, mr: 45, range: 1, skill: "拳霸天下" },
    { id: 19, name: "神鶴佐木", cost: 3, origin: "東瀛武林", class: "刺客", hp: 750, mp: "0/50", ad: 70, armor: 35, mr: 35, range: 1, skill: "普賢流·飛瀧斬" },
    { id: 20, name: "樓無痕", cost: 3, origin: "紅樓劍閣", class: "劍客", hp: 750, mp: "0/60", ad: 75, armor: 35, mr: 35, range: 2, skill: "赤宵鍊" },
    { id: 21, name: "緋羽怨姬", cost: 3, origin: "紅樓劍閣", class: "醫者/輔助", hp: 650, mp: "30/80", ad: 45, armor: 30, mr: 30, range: 3, skill: "飛針救劫" },
    { id: 22, name: "曼睟", cost: 3, origin: "識界靈體", class: "重裝", hp: 850, mp: "0/60", ad: 65, armor: 45, mr: 45, range: 1, skill: "曼睟護法" },
    { id: 23, name: "閻王鎖", cost: 3, origin: "獨立梟雄", class: "刺客", hp: 750, mp: "0/50", ad: 80, armor: 30, mr: 30, range: 1, skill: "閻王鐮刀" },

    // --- 4 費 (Cost 4) ---
    { id: 24, name: "葉小釵", cost: 4, origin: "苦境正道", class: "劍客", hp: 950, mp: "0/50", ad: 85, armor: 45, mr: 45, range: 1, skill: "活殺留聲 / 心劍" },
    { id: 25, name: "風之痕", cost: 4, origin: "苦境正道", class: "劍客", hp: 900, mp: "0/60", ad: 90, armor: 40, mr: 40, range: 1, skill: "風之痕/魔流劍" },
    { id: 26, name: "吞佛童子", cost: 4, origin: "異度魔界", class: "刺客", hp: 900, mp: "30/80", ad: 85, armor: 40, mr: 40, range: 1, skill: "朱厭殺道·紅蓮蝕日" },
    { id: 27, name: "伏嬰師", cost: 4, origin: "異度魔界", class: "術士", hp: 800, mp: "40/100", ad: 55, armor: 35, mr: 35, range: 4, skill: "式神召喚·骨昌" },
    { id: 28, name: "九禍", cost: 4, origin: "異度魔界", class: "術士/輔助", hp: 850, mp: "30/80", ad: 60, armor: 40, mr: 40, range: 3, skill: "魔女之佑" },
    { id: 29, name: "赭杉軍", cost: 4, origin: "玄宗道門", class: "重裝/術士", hp: 1000, mp: "50/100", ad: 70, armor: 50, mr: 50, range: 1, skill: "紫霄騰龍" },
    { id: 30, name: "釋雲生", cost: 4, origin: "識界靈體", class: "劍客", hp: 900, mp: "0/50", ad: 85, armor: 40, mr: 40, range: 1, skill: "雲生劍" },
    { id: 31, name: "玄笈華", cost: 4, origin: "識界靈體", class: "術士", hp: 800, mp: "50/120", ad: 55, armor: 35, mr: 35, range: 4, skill: "玄舸轟擊" },
    { id: 32, name: "曌雲裳", cost: 4, origin: "紅樓劍閣", class: "劍客", hp: 950, mp: "0/60", ad: 95, armor: 45, mr: 45, range: 1, skill: "狂躁劍意" },
    { id: 33, name: "軒轅不敗", cost: 4, origin: "獨立梟雄", class: "重裝", hp: 1100, mp: "0/80", ad: 75, armor: 55, mr: 55, range: 1, skill: "玄功反彈" },

    // --- 5 費 (Cost 5) ---
    { id: 34, name: "一頁書", cost: 5, origin: "苦境正道", class: "術士", hp: 1100, mp: "50/130", ad: 70, armor: 50, mr: 50, range: 4, skill: "八部龍神火" },
    { id: 35, name: "素還真", cost: 5, origin: "苦境正道", class: "術士", hp: 1050, mp: "40/120", ad: 65, armor: 45, mr: 45, range: 4, skill: "蓮華聖路開天光" },
    { id: 36, name: "銀鍠朱武", cost: 5, origin: "異度魔界", class: "劍客/重裝", hp: 1300, mp: "30/90", ad: 100, armor: 60, mr: 60, range: 1, skill: "貫天神擊" },
    { id: 37, name: "蒼", cost: 5, origin: "玄宗道門", class: "術士", hp: 1000, mp: "60/120", ad: 65, armor: 45, mr: 45, range: 4, skill: "伏天宗陣·怒滄琴" },
    { id: 38, name: "柳生劍影", cost: 5, origin: "東瀛武林", class: "劍客", hp: 1150, mp: "0/70", ad: 110, armor: 50, mr: 50, range: 1, skill: "萬道森羅" },
    { id: 39, name: "源武藏", cost: 5, origin: "東瀛武林", class: "重裝", hp: 1400, mp: "0/100", ad: 90, armor: 70, mr: 70, range: 1, skill: "神之光/返返歸一" },

    // --- 6 費 (Cost 6) ---
    { id: 40, name: "棄天帝", cost: 6, origin: "異度魔界", class: "神級", hp: 2000, mp: "50/150", ad: 150, armor: 80, mr: 80, range: 5, skill: "神之光 / 神之手" }
];

// 羈絆等級觸發門檻
const SYNERGY_THRESHOLDS = {
    "苦境正道": [2, 4, 6, 8],
    "異度魔界": [3, 5, 7, 9],
    "玄宗道門": [2, 4, 6],
    "東瀛武林": [2, 4, 6],
    "紅樓劍閣": [2, 3, 4],
    "識界靈體": [2, 4],
    "劍客": [2, 4, 6, 8],
    "術士": [2, 4, 6],
    "重裝": [2, 4, 6],
    "刺客": [2, 4],
    "醫者/輔助": [2, 3],
    "獨立梟雄": [1],
    "神級": [1]
};