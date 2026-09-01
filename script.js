// ============================================================
// 受験RPG - script.js
// 完全置換版
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCggQfYsVVlngak6EJLS74OB3ADV4vFjyo",
  authDomain: "juken-rpg-b2840.firebaseapp.com",
  projectId: "juken-rpg-b2840",
  storageBucket: "juken-rpg-b2840.firebasestorage.app",
  messagingSenderId: "332135698063",
  appId: "1:332135698063:web:cea3c9be433f948bf1aafa",
  measurementId: "G-KLH9WZFNMT"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// CONSTANTS
// ============================================================

const SUBJECT_NAMES = {
  japanese: "国語",
  math: "数学",
  english: "英語",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  "earth-science": "地学",
  "biology-basic": "生物基礎",
  "earth-science-basic": "地学基礎",
  geography: "地理",
  "japanese-history": "日本史",
  "world-history": "世界史",
  civics: "公民"
};

const ALL_SUBJECT_IDS = Object.keys(SUBJECT_NAMES);

const COURSE_NAMES = {
  science: "理系",
  humanities: "文系",
  undecided: "未定"
};


// ============================================================
// APP SCREENS
// ★ここ以外の screen は絶対に触らない
// ============================================================

const APP_SCREEN_IDS = [
  "home-screen",
  "study-screen",
  "quest-screen",
  "party-screen",
  "rank-screen",
  "other-screen"
];


// ============================================================
// RANK
// ============================================================

const RANKS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 600 },
  { name: "Gold", min: 1200 },
  { name: "Platinum", min: 2100 },
  { name: "Diamond", min: 3000 },
  { name: "Master", min: 4200 },
  { name: "Grandmaster", min: 6000 },
  { name: "Legend", min: 9000 }
];


// ============================================================
// XP
// ============================================================

function xpRequiredForLevel(level) {
  if (level >= 100) return 0;

  return 100 + Math.floor((level - 1) / 10) * 50;
}

function totalXpForLevel(level) {
  let total = 0;

  for (let lv = 1; lv < level; lv++) {
    total += xpRequiredForLevel(lv);
  }

  return total;
}

function calculateLevel(xp) {
  let level = 1;

  for (let lv = 1; lv < 100; lv++) {
    const required = totalXpForLevel(lv + 1);

    if (xp >= required) {
      level = lv + 1;
    } else {
      break;
    }
  }

  return Math.min(100, level);
}

function getLevelProgress(xp) {
  const level = calculateLevel(xp);

  if (level >= 100) {
    return {
      level: 100,
      current: 0,
      required: 0,
      percent: 100,
      remaining: 0
    };
  }

  const base = totalXpForLevel(level);
  const required = xpRequiredForLevel(level);
  const current = Math.max(0, xp - base);

  return {
    level,
    current,
    required,
    percent: Math.min(100, (current / required) * 100),
    remaining: Math.max(0, required - current)
  };
}


// ============================================================
// QUEST
// ============================================================

const QUEST_REWARDS = {
  dailyXp: 20,
  dailyCoins: 30,
  weeklyXp: 70,
  weeklyCoins: 70,
  rareXp: 100,
  rareCoins: 500
};

const DAILY_QUEST_MINUTES = 20;
const WEEKLY_QUEST_MINUTES = 100;
const RARE_QUEST_MINUTES = 180;


// ============================================================
// LOGIN REWARD
// ============================================================

const LOGIN_REWARDS = {
  first: { xp: 20, coins: 50 },
  normal: { xp: 0, coins: 20 },
  streak3: { xp: 20, coins: 50 },
  streak7: { xp: 50, coins: 100 },
  streak30: { xp: 100, coins: 300 }
};


// ============================================================
// TITLES
// ============================================================

const NORMAL_TITLES = [
  { id: "title-01", name: "見習い受験生", desc: "初回ログイン" },
  { id: "title-02", name: "第一歩", desc: "累計1時間" },
  { id: "title-03", name: "努力の芽", desc: "累計5時間" },
  { id: "title-04", name: "継続者", desc: "累計10時間" },
  { id: "title-05", name: "勉強家", desc: "累計20時間" },
  { id: "title-06", name: "努力の証", desc: "累計30時間" },
  { id: "title-07", name: "受験戦士", desc: "累計50時間" },
  { id: "title-08", name: "百時間突破", desc: "累計100時間" },
  { id: "title-09", name: "学問の探求者", desc: "累計150時間" },
  { id: "title-10", name: "勉強の鬼", desc: "累計200時間" },
  { id: "title-11", name: "修行僧", desc: "累計300時間" },
  { id: "title-12", name: "受験の猛者", desc: "累計500時間" },
  { id: "title-13", name: "不屈の学習者", desc: "累計750時間" },
  { id: "title-14", name: "受験覇者", desc: "累計1000時間" },

  { id: "title-15", name: "レベル10到達者", desc: "Lv.10" },
  { id: "title-16", name: "レベル20到達者", desc: "Lv.20" },
  { id: "title-17", name: "レベル30到達者", desc: "Lv.30" },
  { id: "title-18", name: "レベル40到達者", desc: "Lv.40" },
  { id: "title-19", name: "レベル50到達者", desc: "Lv.50" },
  { id: "title-20", name: "レベル60到達者", desc: "Lv.60" },
  { id: "title-21", name: "レベル70到達者", desc: "Lv.70" },
  { id: "title-22", name: "レベル80到達者", desc: "Lv.80" },
  { id: "title-23", name: "レベル90到達者", desc: "Lv.90" },
  { id: "title-24", name: "受験RPGの覇者", desc: "Lv.100" },

  { id: "title-25", name: "Silverの証", desc: "Silver到達" },
  { id: "title-26", name: "Goldの証", desc: "Gold到達" },
  { id: "title-27", name: "Platinumの証", desc: "Platinum到達" },
  { id: "title-28", name: "Diamondの証", desc: "Diamond到達" },
  { id: "title-29", name: "Masterの証", desc: "Master到達" },
  { id: "title-30", name: "Grandmasterの証", desc: "Grandmaster到達" },
  { id: "title-31", name: "伝説への挑戦者", desc: "Legend到達" },
  { id: "title-32", name: "伝説の受験生", desc: "Legendをシーズン終了まで維持" },

  { id: "title-33", name: "初クエスト達成", desc: "クエスト初達成" },
  { id: "title-34", name: "クエストハンター", desc: "10クエスト達成" },
  { id: "title-35", name: "クエストマスター", desc: "50クエスト達成" },
  { id: "title-36", name: "完遂者", desc: "デイリー3件をすべて達成" },

  { id: "title-37", name: "一週間の努力", desc: "7日連続ログイン" },
  { id: "title-38", name: "習慣の力", desc: "14日連続ログイン" },
  { id: "title-39", name: "継続の達人", desc: "30日連続ログイン" },

  { id: "title-40", name: "限界突破", desc: "レアクエスト初達成" },

  { id: "title-41", name: "ボス初討伐", desc: "初めてボスを討伐" },
  { id: "title-42", name: "ダメージディーラー", desc: "ボスに累計5000ダメージ" },
  { id: "title-43", name: "MVP", desc: "集団戦でMVP獲得" },
  { id: "title-44", name: "弱点粉砕者", desc: "弱点攻撃で大ダメージ" },

  { id: "title-45", name: "パーティプレイヤー", desc: "パーティー参加" },
  { id: "title-46", name: "仲間との戦い", desc: "パーティーボスに参加" },

  { id: "title-47", name: "全教科制覇", desc: "登録教科をすべてLv.10" },
  { id: "title-48", name: "一芸の達人", desc: "1教科Lv.50" },
  { id: "title-49", name: "万能型受験生", desc: "3教科Lv.30" },
  { id: "title-50", name: "完全制覇", desc: "登録教科をすべてLv.100" }
];

const SECRET_TITLES = [
  { id: "secret-1", name: "静かなる努力家", desc: "1日に120分以上勉強" },
  { id: "secret-2", name: "不屈の意志", desc: "7日連続ログイン" },
  { id: "secret-3", name: "止まらない者", desc: "1日に240分以上勉強" },
  { id: "secret-4", name: "修羅の道", desc: "1日に300分以上勉強" },
  { id: "secret-5", name: "完璧主義者", desc: "デイリー全達成を7日継続" },
  { id: "secret-6", name: "切り札", desc: "弱点攻撃で累計3000ダメージ" },
  { id: "secret-7", name: "最後の一押し", desc: "ボスにとどめを刺す" },
  { id: "secret-8", name: "隠された才能", desc: "短期間で大きく教科レベルを上げる" },
  { id: "secret-9", name: "伝説を超えし者", desc: "Legend到達＋累計300時間" },
  { id: "secret-10", name: "アリ得ない知能", desc: "全13教科を学習する" }
];

const SHOP_TITLES = [
  { id: "shop-title-01", name: "異端の受験者", price: 500 },
  { id: "shop-title-02", name: "覚醒者", price: 800 },
  { id: "shop-title-03", name: "深淵を覗く者", price: 1200 },
  { id: "shop-title-04", name: "魔導学徒", price: 1600 },
  { id: "shop-title-05", name: "限界突破者", price: 2200 },
  { id: "shop-title-06", name: "禁断の知識人", price: 3000 },
  { id: "shop-title-07", name: "試験場の覇者", price: 4000 },
  { id: "shop-title-08", name: "運命を喰らう者", price: 5500 },
  { id: "shop-title-09", name: "賢者の末裔", price: 7000 },
  { id: "shop-title-10", name: "受験界の災厄", price: 9000 },
  { id: "shop-title-11", name: "神域の学習者", price: 12000 },
  { id: "shop-title-12", name: "合格の向こう側", price: 15000 }
];

const ALL_TITLES = [
  ...NORMAL_TITLES,
  ...SECRET_TITLES,
  ...SHOP_TITLES
];


// ============================================================
// ACHIEVEMENTS
// ============================================================

const ACHIEVEMENTS = [
  { id: "first-study", name: "冒険開始", desc: "初めて勉強を記録", reward: 50 },
  { id: "study-10h", name: "10時間突破", desc: "累計10時間", reward: 100 },
  { id: "study-50h", name: "50時間突破", desc: "累計50時間", reward: 250 },
  { id: "study-100h", name: "100時間突破", desc: "累計100時間", reward: 500 },
  { id: "level-10", name: "Lv.10", desc: "Lv.10到達", reward: 100 },
  { id: "level-50", name: "Lv.50", desc: "Lv.50到達", reward: 500 },
  { id: "level-100", name: "Lv.100", desc: "Lv.100到達", reward: 1000 },
  { id: "rank-gold", name: "Gold", desc: "Gold到達", reward: 100 },
  { id: "rank-platinum", name: "Platinum", desc: "Platinum到達", reward: 200 },
  { id: "rank-diamond", name: "Diamond", desc: "Diamond到達", reward: 300 },
  { id: "rank-master", name: "Master", desc: "Master到達", reward: 500 },
  { id: "rank-legend", name: "Legend", desc: "Legend到達", reward: 1000 },
  { id: "streak-3", name: "3日連続", desc: "3日連続ログイン", reward: 100 },
  { id: "streak-7", name: "7日連続", desc: "7日連続ログイン", reward: 250 },
  { id: "streak-30", name: "30日連続", desc: "30日連続ログイン", reward: 1000 }
];


// ============================================================
// SHOP
// ============================================================

const SHOP_ITEMS = [
  {
    id: "xp-boost-10",
    name: "XPブースト +25%",
    desc: "10分間XP+25%",
    price: 300,
    type: "xp",
    multiplier: 1.25,
    minutes: 10
  },
  {
    id: "xp-boost-25",
    name: "XPブースト +50%",
    desc: "30分間XP+50%",
    price: 800,
    type: "xp",
    multiplier: 1.5,
    minutes: 30
  },
  {
    id: "xp-boost-50",
    name: "XPブースト +75%",
    desc: "60分間XP+75%",
    price: 1800,
    type: "xp",
    multiplier: 1.75,
    minutes: 60
  },
  {
    id: "xp-boost-100",
    name: "XPブースト 2倍",
    desc: "120分間XP×2",
    price: 4000,
    type: "xp",
    multiplier: 2,
    minutes: 120
  },

  {
    id: "boss-dmg-10",
    name: "攻撃強化Ⅰ",
    desc: "次のボス攻撃+25%",
    price: 400,
    type: "boss-damage",
    multiplier: 1.25
  },
  {
    id: "boss-dmg-25",
    name: "攻撃強化Ⅱ",
    desc: "次のボス攻撃+50%",
    price: 1000,
    type: "boss-damage",
    multiplier: 1.5
  },
  {
    id: "boss-dmg-50",
    name: "攻撃強化Ⅲ",
    desc: "次のボス攻撃+100%",
    price: 2500,
    type: "boss-damage",
    multiplier: 2
  },
  {
    id: "boss-dmg-100",
    name: "攻撃強化Ⅳ",
    desc: "次のボス攻撃+200%",
    price: 6000,
    type: "boss-damage",
    multiplier: 3
  },

  {
    id: "boss-down-1",
    name: "弱体化Ⅰ",
    desc: "次のボス最大HP -10%",
    price: 500,
    type: "boss-down",
    reduction: 0.10
  },
  {
    id: "boss-down-2",
    name: "弱体化Ⅱ",
    desc: "次のボス最大HP -20%",
    price: 1200,
    type: "boss-down",
    reduction: 0.20
  },
  {
    id: "boss-down-3",
    name: "弱体化Ⅲ",
    desc: "次のボス最大HP -30%",
    price: 2500,
    type: "boss-down",
    reduction: 0.30
  },
  {
    id: "boss-down-4",
    name: "弱体化Ⅳ",
    desc: "次のボス最大HP -50%",
    price: 5000,
    type: "boss-down",
    reduction: 0.50
  }
];

const SHOP_BACKGROUNDS = [
  { id: "bg-abyss", name: "深淵", price: 1500 },
  { id: "bg-royal", name: "王宮", price: 3000 },
  { id: "bg-cosmic", name: "宇宙", price: 6000 }
];


// ============================================================
// BOSS
// ============================================================

const BOSS_BASE_HP = 10000;
const BOSS_WEAKNESS_MULTIPLIER = 1.5;


// ============================================================
// DOM
// ============================================================

const $ = id => document.getElementById(id);

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function show(id) {
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

function hide(id) {
  const el = $(id);
  if (el) el.classList.add("hidden");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// DATE / JAPAN TIME
// ============================================================

function japanNow() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Tokyo"
    })
  );
}

function japanDateKey(date = japanNow()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function japanMonthKey(date = japanNow()) {
  return japanDateKey(date).slice(0, 7);
}

function japanWeekKey(date = japanNow()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  return japanDateKey(d);
}

function getMonthEnd() {
  const now = japanNow();

  return new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  );
}

function formatMinutes(minutes) {
  minutes = Math.max(0, Math.floor(Number(minutes) || 0));

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0) {
    return `${h}時間${m}分`;
  }

  return `${m}分`;
}

function formatDateTime(value) {
  if (!value) return "-";

  let date;

  if (value?.toDate) {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


// ============================================================
// RANK
// ============================================================

function calculateRank(seasonStudyMinutes) {
  let rank = RANKS[0].name;

  for (const r of RANKS) {
    if (seasonStudyMinutes >= r.min) {
      rank = r.name;
    }
  }

  return rank;
}

function getRankData(rankName) {
  return RANKS.find(r => r.name === rankName) || RANKS[0];
}

function getNextRank(rankName) {
  const index = RANKS.findIndex(r => r.name === rankName);

  if (index < 0 || index >= RANKS.length - 1) {
    return null;
  }

  return RANKS[index + 1];
}


// ============================================================
// PLAYER DEFAULT
// ============================================================

function createDefaultPlayer(uid, userId, displayName, course, subjects) {
  const now = japanNow();
  const today = japanDateKey(now);
  const month = japanMonthKey(now);

  const subjectData = {};

  for (const subject of subjects) {
    subjectData[subject] = {
      studyMinutes: 0,
      level: 0
    };
  }

  return {
    uid,
    userId,
    displayName,
    course,
    subjects,

    xp: 0,
    coins: 0,

    totalStudyMinutes: 0,
    totalXpEarned: 0,
    totalCoinsEarned: 0,

    seasonId: month,
    seasonStudyMinutes: 0,
    rank: "Bronze",
    seasonHistory: [],

    subjectData,

    title: "無名の冒険者",
    unlockedTitles: [],

    achievements: [],

    loginStreak: 0,
    lastLoginDate: null,
    loginRewardDate: null,

    todayDate: today,
    todayStudyMinutes: 0,
    todayXp: 0,
    todayCoins: 0,

    questState: {
      dailyDate: today,
      daily: [],
      weeklyId: japanWeekKey(now),
      weekly: null,
      rareDate: today,
      rare: null,
      dailyCompleteStreak: 0,
      lastDailyCompleteDate: null,
      questClaimedCount: 0,
      questHistory: []
    },

    studyHistory: [],

    partyId: null,
    partyRole: null,
    friendIds: [],

    bossData: null,
    bossStats: {
      damage: 0,
      weaknessDamage: 0,
      bossesDefeated: 0,
      participated: 0,
      mvpCount: 0
    },

    permanentLegendBoost: false,

    activeXpBoosts: [],

    inventory: {},

    purchasedItems: {},

    backgrounds: [],
    currentBackground: null,

    pendingBossLevelDownMultiplier: 1,

    totalDailyQuestDays: 0,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}


// ============================================================
// NORMALIZE PLAYER
// ============================================================

function normalizePlayer(p) {
  p = p || {};

  p.subjects = Array.isArray(p.subjects) ? p.subjects : [];

  p.xp = Number(p.xp) || 0;
  p.coins = Number(p.coins) || 0;

  p.totalStudyMinutes = Number(p.totalStudyMinutes) || 0;
  p.totalXpEarned = Number(p.totalXpEarned) || 0;
  p.totalCoinsEarned = Number(p.totalCoinsEarned) || 0;

  p.seasonStudyMinutes = Number(p.seasonStudyMinutes) || 0;
  p.seasonHistory = Array.isArray(p.seasonHistory)
    ? p.seasonHistory
    : [];

  p.unlockedTitles = Array.isArray(p.unlockedTitles)
    ? p.unlockedTitles
    : [];

  p.achievements = Array.isArray(p.achievements)
    ? p.achievements
    : [];

  p.loginStreak = Number(p.loginStreak) || 0;

  p.todayStudyMinutes = Number(p.todayStudyMinutes) || 0;
  p.todayXp = Number(p.todayXp) || 0;
  p.todayCoins = Number(p.todayCoins) || 0;

  p.subjectData = p.subjectData || {};

  for (const subject of p.subjects) {
    if (!p.subjectData[subject]) {
      p.subjectData[subject] = {
        studyMinutes: 0,
        level: 0
      };
    }

    p.subjectData[subject].studyMinutes =
      Number(p.subjectData[subject].studyMinutes) || 0;

    p.subjectData[subject].level = Math.min(
      100,
      Math.floor(p.subjectData[subject].studyMinutes / 30)
    );
  }

  p.questState = p.questState || {};

  p.questState.daily = Array.isArray(p.questState.daily)
    ? p.questState.daily
    : [];

  p.questState.weekly = p.questState.weekly || null;
  p.questState.questHistory = Array.isArray(p.questState.questHistory)
    ? p.questState.questHistory
    : [];

  p.questState.questClaimedCount =
    Number(p.questState.questClaimedCount) || 0;

  p.questState.dailyCompleteStreak =
    Number(p.questState.dailyCompleteStreak) || 0;

  p.studyHistory = Array.isArray(p.studyHistory)
    ? p.studyHistory
    : [];

  p.friendIds = Array.isArray(p.friendIds)
    ? p.friendIds
    : [];

  p.inventory = p.inventory || {};
  p.purchasedItems = p.purchasedItems || {};

  p.activeXpBoosts = Array.isArray(p.activeXpBoosts)
    ? p.activeXpBoosts
    : [];

  p.backgrounds = Array.isArray(p.backgrounds)
    ? p.backgrounds
    : [];

  p.bossStats = p.bossStats || {};

  p.bossStats.damage = Number(p.bossStats.damage) || 0;
  p.bossStats.weaknessDamage =
    Number(p.bossStats.weaknessDamage) || 0;
  p.bossStats.bossesDefeated =
    Number(p.bossStats.bossesDefeated) || 0;
  p.bossStats.participated =
    Number(p.bossStats.participated) || 0;
  p.bossStats.mvpCount =
    Number(p.bossStats.mvpCount) || 0;

  p.pendingBossLevelDownMultiplier =
    Number(p.pendingBossLevelDownMultiplier) || 1;

  if (p.pendingBossLevelDownMultiplier <= 0) {
    p.pendingBossLevelDownMultiplier = 1;
  }

  return p;
}


// ============================================================
// GLOBAL STATE
// ============================================================

let currentPlayer = null;
let currentFirebaseUser = null;

let timerState = {
  running: false,
  startedAt: null,
  accumulatedSeconds: 0,
  savedMinutes: 0
};

let timerInterval = null;

let notificationTimer = null;

let activeQuestTab = "daily";
let activePartyTab = "party";
let activeRankTab = "rank";
let activeRankingType = "friends";
let activeOtherTab = "menu";


// ============================================================
// FIRESTORE PLAYER
// ============================================================

async function loadPlayer(firebaseUser) {
  const ref = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const fallback = createDefaultPlayer(
      firebaseUser.uid,
      firebaseUser.email?.split("@")[0] || "player",
      "冒険者",
      "undecided",
      ["math"]
    );

    await setDoc(ref, fallback);

    return fallback;
  }

  return normalizePlayer(snap.data());
}

async function savePlayer() {
  if (!currentPlayer || !currentFirebaseUser) return;

  currentPlayer.updatedAt = new Date().toISOString();

  await setDoc(
    doc(db, "users", currentFirebaseUser.uid),
    currentPlayer,
    { merge: true }
  );
}


// ============================================================
// SEASON
// ============================================================

async function handleSeasonRollover() {
  if (!currentPlayer) return;

  const currentMonth = japanMonthKey();

  if (!currentPlayer.seasonId) {
    currentPlayer.seasonId = currentMonth;
    currentPlayer.rank =
      calculateRank(currentPlayer.seasonStudyMinutes);

    return;
  }

  if (currentPlayer.seasonId === currentMonth) {
    currentPlayer.rank =
      calculateRank(currentPlayer.seasonStudyMinutes);

    if (currentPlayer.rank === "Legend") {
      currentPlayer.permanentLegendBoost = true;
    }

    return;
  }

  const oldRank = currentPlayer.rank || "Bronze";

  currentPlayer.seasonHistory.unshift({
    seasonId: currentPlayer.seasonId,
    studyMinutes: currentPlayer.seasonStudyMinutes,
    rank: oldRank,
    endedAt: new Date().toISOString()
  });

  currentPlayer.seasonHistory =
    currentPlayer.seasonHistory.slice(0, 24);

  if (oldRank === "Legend") {
    addTitle("title-32");
  }

  currentPlayer.seasonId = currentMonth;
  currentPlayer.seasonStudyMinutes = 0;
  currentPlayer.rank = "Bronze";

  await savePlayer();
}


// ============================================================
// LOGIN STREAK
// ============================================================

async function processLogin() {
  if (!currentPlayer) return;

  const today = japanDateKey();

  if (currentPlayer.loginRewardDate === today) {
    return;
  }

  const previous = currentPlayer.lastLoginDate;

  if (!previous) {
    currentPlayer.loginStreak = 1;
  } else {
    const prevDate = new Date(`${previous}T00:00:00`);
    const todayDate = new Date(`${today}T00:00:00`);

    const diff =
      Math.round(
        (todayDate - prevDate) /
        (1000 * 60 * 60 * 24)
      );

    if (diff === 1) {
      currentPlayer.loginStreak++;
    } else if (diff > 1) {
      currentPlayer.loginStreak = 1;
    }
  }

  currentPlayer.lastLoginDate = today;
  currentPlayer.loginRewardDate = today;

  let reward = LOGIN_REWARDS.normal;
  let label = "ログインボーナス";

  if (!previous) {
    reward = LOGIN_REWARDS.first;
    label = "初回ログインボーナス";
  } else if (currentPlayer.loginStreak >= 30) {
    reward = LOGIN_REWARDS.streak30;
    label = "30日連続ログインボーナス";
  } else if (currentPlayer.loginStreak >= 7) {
    reward = LOGIN_REWARDS.streak7;
    label = "7日連続ログインボーナス";
  } else if (currentPlayer.loginStreak >= 3) {
    reward = LOGIN_REWARDS.streak3;
    label = "3日連続ログインボーナス";
  }

  currentPlayer.xp += reward.xp;
  currentPlayer.coins += reward.coins;

  currentPlayer.totalXpEarned += reward.xp;
  currentPlayer.totalCoinsEarned += reward.coins;

  await checkTitles();
  await checkAchievements();

  await savePlayer();

  showRewardModal(
    `${escapeHtml(label)}<br><br>` +
    `✨ +${reward.xp} XP<br>` +
    `🪙 +${reward.coins} コイン<br>` +
    `🔥 連続ログイン ${currentPlayer.loginStreak}日`
  );
}


// ============================================================
// QUEST GENERATION
// ============================================================

function getLeastStudiedSubjects() {
  if (!currentPlayer?.subjects?.length) {
    return [];
  }

  return [...currentPlayer.subjects].sort((a, b) => {
    const am =
      currentPlayer.subjectData[a]?.studyMinutes || 0;

    const bm =
      currentPlayer.subjectData[b]?.studyMinutes || 0;

    return am - bm;
  });
}

function createDailyQuests() {
  const subjects = getLeastStudiedSubjects();

  if (!subjects.length) return [];

  const quests = [];

  for (let i = 0; i < 3; i++) {
    const subject = subjects[i % subjects.length];

    quests.push({
      id: `daily-${japanDateKey()}-${i}`,
      type: "daily",
      subject,
      target: DAILY_QUEST_MINUTES,
      progress: 0,
      claimed: false,
      title: `${SUBJECT_NAMES[subject]}を20分勉強`,
      rewardXp: QUEST_REWARDS.dailyXp,
      rewardCoins: QUEST_REWARDS.dailyCoins
    });
  }

  return quests;
}

function createWeeklyQuest() {
  const subjects = getLeastStudiedSubjects();

  if (!subjects.length) return null;

  const subject = subjects[0];

  return {
    id: `weekly-${japanWeekKey()}`,
    type: "weekly",
    subject,
    target: WEEKLY_QUEST_MINUTES,
    progress: 0,
    claimed: false,
    title: `${SUBJECT_NAMES[subject]}を100分勉強`,
    rewardXp: QUEST_REWARDS.weeklyXp,
    rewardCoins: QUEST_REWARDS.weeklyCoins
  };
}

function createRareQuest() {
  return {
    id: `rare-${japanDateKey()}`,
    type: "rare",
    target: RARE_QUEST_MINUTES,
    progress: 0,
    claimed: false,
    title: "本日の総勉強時間180分",
    rewardXp: QUEST_REWARDS.rareXp,
    rewardCoins: QUEST_REWARDS.rareCoins
  };
}


// ============================================================
// QUEST STATE
// ============================================================

function finalizeDailyQuestDay() {
  if (!currentPlayer) return;

  const state = currentPlayer.questState;

  if (!state.dailyDate) return;

  const allDone =
    state.daily.length > 0 &&
    state.daily.every(q => q.claimed);

  if (
    allDone &&
    state.lastDailyCompleteDate !== state.dailyDate
  ) {
    state.dailyCompleteStreak++;
    state.lastDailyCompleteDate = state.dailyDate;
    state.totalDailyQuestDays =
      (state.totalDailyQuestDays || 0) + 1;
  } else if (
    !allDone &&
    state.dailyDate !== japanDateKey()
  ) {
    state.dailyCompleteStreak = 0;
  }
}

function ensureQuestState() {
  if (!currentPlayer) return;

  const today = japanDateKey();
  const week = japanWeekKey();
  const state = currentPlayer.questState;

  if (state.dailyDate !== today) {
    finalizeDailyQuestDay();

    state.dailyDate = today;
    state.daily = createDailyQuests();
    state.rareDate = today;
    state.rare = createRareQuest();
  }

  if (state.weeklyId !== week) {
    state.weeklyId = week;
    state.weekly = createWeeklyQuest();
  }

  if (!state.daily.length) {
    state.daily = createDailyQuests();
  }

  if (!state.rare) {
    state.rare = createRareQuest();
  }

  if (!state.weekly) {
    state.weekly = createWeeklyQuest();
  }
}

function updateQuestProgress(minutes, subject) {
  if (!currentPlayer) return;

  ensureQuestState();

  const state = currentPlayer.questState;

  for (const quest of state.daily) {
    if (
      !quest.claimed &&
      quest.subject === subject
    ) {
      quest.progress = Math.min(
        quest.target,
        quest.progress + minutes
      );
    }
  }

  if (
    state.weekly &&
    !state.weekly.claimed &&
    state.weekly.subject === subject
  ) {
    state.weekly.progress = Math.min(
      state.weekly.target,
      state.weekly.progress + minutes
    );
  }

  if (state.rare && !state.rare.claimed) {
    state.rare.progress =
      Math.min(
        state.rare.target,
        currentPlayer.todayStudyMinutes
      );
  }
}


// ============================================================
// CLAIM QUEST
// ============================================================

async function claimQuest(type, id) {
  if (!currentPlayer) return;

  ensureQuestState();

  let quest = null;

  if (type === "daily") {
    quest = currentPlayer.questState.daily.find(
      q => q.id === id
    );
  }

  if (type === "weekly") {
    quest = currentPlayer.questState.weekly;

    if (quest?.id !== id) {
      quest = null;
    }
  }

  if (type === "rare") {
    quest = currentPlayer.questState.rare;

    if (quest?.id !== id) {
      quest = null;
    }
  }

  if (!quest) return;

  if (quest.claimed) {
    showNotification("このクエストは達成済みです。");
    return;
  }

  if (quest.progress < quest.target) {
    showNotification("まだクエスト達成条件を満たしていません。");
    return;
  }

  quest.claimed = true;

  currentPlayer.xp += quest.rewardXp;
  currentPlayer.coins += quest.rewardCoins;

  currentPlayer.totalXpEarned += quest.rewardXp;
  currentPlayer.totalCoinsEarned += quest.rewardCoins;

  currentPlayer.questState.questClaimedCount++;

  currentPlayer.questState.questHistory.unshift({
    id: quest.id,
    type: quest.type,
    title: quest.title,
    rewardXp: quest.rewardXp,
    rewardCoins: quest.rewardCoins,
    date: japanDateKey(),
    completedAt: new Date().toISOString()
  });

  currentPlayer.questState.questHistory =
    currentPlayer.questState.questHistory.slice(0, 100);

  const daily =
    currentPlayer.questState.daily;

  if (
    daily.length === 3 &&
    daily.every(q => q.claimed) &&
    currentPlayer.questState.lastDailyCompleteDate !==
      japanDateKey()
  ) {
    currentPlayer.questState.dailyCompleteStreak++;
    currentPlayer.questState.lastDailyCompleteDate =
      japanDateKey();

    currentPlayer.questState.totalDailyQuestDays =
      (currentPlayer.questState.totalDailyQuestDays || 0) + 1;
  }

  await checkTitles();

  await checkAchievements();

  await savePlayer();

  showRewardModal(
    `<strong>${escapeHtml(quest.title)}</strong><br><br>` +
    `✨ +${quest.rewardXp} XP<br>` +
    `🪙 +${quest.rewardCoins} コイン`
  );

  renderAll();
}


// ============================================================
// XP MULTIPLIER
// ============================================================

function cleanBoosts() {
  if (!currentPlayer) return;

  const now = Date.now();

  currentPlayer.activeXpBoosts =
    currentPlayer.activeXpBoosts.filter(
      boost => Number(boost.expiresAt) > now
    );
}

function getXpMultiplier() {
  if (!currentPlayer) return 1;

  cleanBoosts();

  let multiplier =
    currentPlayer.permanentLegendBoost
      ? 1.5
      : 1;

  for (const boost of currentPlayer.activeXpBoosts) {
    multiplier *= Number(boost.multiplier) || 1;
  }

  return multiplier;
}


// ============================================================
// LEVEL UP
// ============================================================

async function applyXp(amount) {
  if (!currentPlayer || amount <= 0) {
    return {
      oldLevel: calculateLevel(currentPlayer?.xp || 0),
      newLevel: calculateLevel(currentPlayer?.xp || 0)
    };
  }

  const oldLevel =
    calculateLevel(currentPlayer.xp);

  currentPlayer.xp += amount;

  const newLevel =
    calculateLevel(currentPlayer.xp);

  if (newLevel > oldLevel) {
    showLevelUpModal(oldLevel, newLevel);
  }

  return {
    oldLevel,
    newLevel
  };
}


// ============================================================
// STUDY RECORD
// ============================================================

async function recordStudy(
  minutes,
  subject,
  note = "",
  source = "manual"
) {
  if (!currentPlayer) return;

  minutes = Math.floor(Number(minutes));

  if (
    !Number.isFinite(minutes) ||
    minutes < 1 ||
    minutes > 1440
  ) {
    throw new Error("勉強時間は1〜1440分で入力してください。");
  }

  if (!currentPlayer.subjects.includes(subject)) {
    throw new Error("登録されていない教科です。");
  }

  ensureQuestState();

  const oldLevel =
    calculateLevel(currentPlayer.xp);

  const multiplier = getXpMultiplier();

  const xpGain =
    Math.floor(minutes * multiplier);

  const coinGain =
    Math.floor(minutes / 10);

  currentPlayer.xp += xpGain;
  currentPlayer.coins += coinGain;

  currentPlayer.totalStudyMinutes += minutes;
  currentPlayer.totalXpEarned += xpGain;
  currentPlayer.totalCoinsEarned += coinGain;

  currentPlayer.seasonStudyMinutes += minutes;

  currentPlayer.todayStudyMinutes += minutes;
  currentPlayer.todayXp += xpGain;
  currentPlayer.todayCoins += coinGain;

  if (currentPlayer.todayDate !== japanDateKey()) {
    currentPlayer.todayDate = japanDateKey();
    currentPlayer.todayStudyMinutes = minutes;
    currentPlayer.todayXp = xpGain;
    currentPlayer.todayCoins = coinGain;
  }

  if (!currentPlayer.subjectData[subject]) {
    currentPlayer.subjectData[subject] = {
      studyMinutes: 0,
      level: 0
    };
  }

  currentPlayer.subjectData[subject].studyMinutes += minutes;

  currentPlayer.subjectData[subject].level =
    Math.min(
      100,
      Math.floor(
        currentPlayer.subjectData[subject].studyMinutes / 30
      )
    );

  currentPlayer.studyHistory.unshift({
    date: japanDateKey(),
    subject,
    minutes,
    xp: xpGain,
    coins: coinGain,
    note: String(note || "").slice(0, 500),
    source,
    createdAt: new Date().toISOString()
  });

  currentPlayer.studyHistory =
    currentPlayer.studyHistory.slice(0, 300);

  updateQuestProgress(minutes, subject);

  currentPlayer.rank =
    calculateRank(currentPlayer.seasonStudyMinutes);

  if (currentPlayer.rank === "Legend") {
    currentPlayer.permanentLegendBoost = true;
  }

  const bossResult =
    await applyBossDamage(minutes, subject);

  await checkTitles();
  await checkAchievements();

  await savePlayer();

  const newLevel =
    calculateLevel(currentPlayer.xp);

  if (newLevel > oldLevel) {
    showLevelUpModal(oldLevel, newLevel);
  }

  let message =
    `📚 ${SUBJECT_NAMES[subject]} ${minutes}分記録！<br>` +
    `✨ +${xpGain} XP<br>` +
    `🪙 +${coinGain} コイン`;

  if (bossResult?.damage > 0) {
    message +=
      `<br>⚔️ ボスに ${Math.floor(bossResult.damage)} ダメージ！`;
  }

  showNotification(message);

  renderAll();
}


// ============================================================
// BOSS CREATION
// ============================================================

function createBoss(level = 1, hpMultiplier = 1) {
  const subjects =
    currentPlayer?.subjects?.length
      ? currentPlayer.subjects
      : ["math"];

  const weakness =
    subjects[Math.floor(Math.random() * subjects.length)];

  const maxHp =
    Math.max(
      100,
      Math.floor(BOSS_BASE_HP * hpMultiplier)
    );

  return {
    id: `boss-${japanWeekKey()}-${Date.now()}`,
    weekId: japanWeekKey(),

    name: "受験の魔王",
    level,

    maxHp,
    hp: maxHp,

    weaknessSubject: weakness,
    weaknessMultiplier: BOSS_WEAKNESS_MULTIPLIER,

    active: true,
    defeated: false,

    startedAt: new Date().toISOString(),
    endsAt: null,

    contributions: {},
    logs: [],

    defeatedBy: null,
    mvpUid: null,
    defeatedAt: null
  };
}


// ============================================================
// PERSONAL BOSS
// ============================================================

function ensurePersonalBoss() {
  if (!currentPlayer) return;

  const week = japanWeekKey();

  const boss = currentPlayer.bossData;

  if (
    !boss ||
    boss.weekId !== week ||
    boss.defeated
  ) {
    let hpMultiplier =
      currentPlayer.pendingBossLevelDownMultiplier || 1;

    currentPlayer.bossData =
      createBoss(1, hpMultiplier);

    currentPlayer.pendingBossLevelDownMultiplier = 1;
  }
}


// ============================================================
// PARTY DATA
// ============================================================

async function getParty() {
  if (!currentPlayer?.partyId) {
    return null;
  }

  const snap = await getDoc(
    doc(db, "parties", currentPlayer.partyId)
  );

  if (!snap.exists()) {
    currentPlayer.partyId = null;
    currentPlayer.partyRole = null;

    await savePlayer();

    return null;
  }

  return {
    id: snap.id,
    ...snap.data()
  };
}


// ============================================================
// PARTY BOSS
// ============================================================

async function ensurePartyBoss(party) {
  if (!party) return null;

  const week = japanWeekKey();

  if (
    party.boss &&
    party.boss.weekId === week &&
    !party.boss.defeated
  ) {
    return party.boss;
  }

  let hpMultiplier = 1;

  if (
    currentPlayer.partyRole === "leader" &&
    currentPlayer.pendingBossLevelDownMultiplier < 1
  ) {
    hpMultiplier =
      currentPlayer.pendingBossLevelDownMultiplier;

    currentPlayer.pendingBossLevelDownMultiplier = 1;

    await savePlayer();
  }

  const boss =
    createBoss(1, hpMultiplier);

  await updateDoc(
    doc(db, "parties", party.id),
    {
      boss
    }
  );

  return boss;
}


// ============================================================
// BOSS DAMAGE
// ============================================================

function getBossDamageMultiplier() {
  if (!currentPlayer) return 1;

  const inventory = currentPlayer.inventory || {};

  let selected = null;

  for (const item of SHOP_ITEMS) {
    if (item.type !== "boss-damage") continue;

    const quantity =
      Number(inventory[item.id]) || 0;

    if (
      quantity > 0 &&
      (!selected ||
        item.multiplier > selected.multiplier)
    ) {
      selected = {
        id: item.id,
        multiplier: item.multiplier
      };
    }
  }

  return selected?.multiplier || 1;
}

function consumeBossDamageItem() {
  if (!currentPlayer) return 1;

  const inventory = currentPlayer.inventory || {};

  let selected = null;

  for (const item of SHOP_ITEMS) {
    if (item.type !== "boss-damage") continue;

    const quantity =
      Number(inventory[item.id]) || 0;

    if (
      quantity > 0 &&
      (!selected ||
        item.multiplier > selected.multiplier)
    ) {
      selected = item;
    }
  }

  if (!selected) return 1;

  inventory[selected.id] =
    Math.max(
      0,
      (Number(inventory[selected.id]) || 0) - 1
    );

  return selected.multiplier;
}

async function applyBossDamage(minutes, subject) {
  if (!currentPlayer) return null;

  let party = null;

  try {
    party = await getParty();
  } catch {
    party = null;
  }

  const itemMultiplier =
    getBossDamageMultiplier();

  let damage =
    minutes * 10 * itemMultiplier;

  let weak = false;

  // ----------------------------------------------------------
  // PARTY BOSS
  // ----------------------------------------------------------

  if (party) {
    let boss = await ensurePartyBoss(party);

    if (!boss) return null;

    weak =
      boss.weaknessSubject === subject;

    if (weak) {
      damage *= boss.weaknessMultiplier || 1.5;
    }

    const actualMultiplier =
      consumeBossDamageItem();

    damage =
      minutes * 10 *
      actualMultiplier *
      (weak ? (boss.weaknessMultiplier || 1.5) : 1);

    const beforeHp = boss.hp;

    boss.hp =
      Math.max(0, boss.hp - damage);

    boss.contributions =
      boss.contributions || {};

    boss.contributions[currentPlayer.uid] =
      (boss.contributions[currentPlayer.uid] || 0) +
      damage;

    boss.logs =
      Array.isArray(boss.logs)
        ? boss.logs
        : [];

    boss.logs.unshift({
      uid: currentPlayer.uid,
      displayName: currentPlayer.displayName,
      subject,
      minutes,
      damage,
      weak,
      at: new Date().toISOString()
    });

    boss.logs =
      boss.logs.slice(0, 50);

    currentPlayer.bossStats.damage += damage;

    if (weak) {
      currentPlayer.bossStats.weaknessDamage += damage;
    }

    currentPlayer.bossStats.participated++;

    if (boss.hp <= 0 && !boss.defeated) {
      boss.defeated = true;
      boss.active = false;
      boss.defeatedAt =
        new Date().toISOString();

      boss.defeatedBy =
        currentPlayer.uid;

      let mvpUid = null;
      let maxDamage = -1;

      for (const [uid, value] of Object.entries(
        boss.contributions
      )) {
        if (value > maxDamage) {
          maxDamage = value;
          mvpUid = uid;
        }
      }

      boss.mvpUid = mvpUid;

      if (
        boss.mvpUid === currentPlayer.uid
      ) {
        currentPlayer.bossStats.mvpCount++;
      }

      currentPlayer.bossStats.bossesDefeated++;

      addTitle("title-41");

      if (boss.mvpUid === currentPlayer.uid) {
        addTitle("title-43");
      }

      if (boss.defeatedBy === currentPlayer.uid) {
        addTitle("secret-7");
      }
    }

    await updateDoc(
      doc(db, "parties", party.id),
      { boss }
    );

    if (weak) {
      addTitle("title-44");
    }

    if (currentPlayer.partyId) {
      addTitle("title-45");
      addTitle("title-46");
    }

    if (currentPlayer.bossStats.damage >= 5000) {
      addTitle("title-42");
    }

    if (
      currentPlayer.bossStats.weaknessDamage >= 3000
    ) {
      addTitle("secret-6");
    }

    return {
      damage,
      weak,
      defeated: boss.defeated,
      beforeHp
    };
  }


  // ----------------------------------------------------------
  // PERSONAL BOSS
  // ----------------------------------------------------------

  ensurePersonalBoss();

  const boss =
    currentPlayer.bossData;

  weak =
    boss.weaknessSubject === subject;

  const actualMultiplier =
    consumeBossDamageItem();

  damage =
    minutes * 10 *
    actualMultiplier *
    (weak ? (boss.weaknessMultiplier || 1.5) : 1);

  const beforeHp = boss.hp;

  boss.hp =
    Math.max(0, boss.hp - damage);

  boss.contributions =
    boss.contributions || {};

  boss.contributions[currentPlayer.uid] =
    (boss.contributions[currentPlayer.uid] || 0) +
    damage;

  boss.logs =
    Array.isArray(boss.logs)
      ? boss.logs
      : [];

  boss.logs.unshift({
    uid: currentPlayer.uid,
    displayName: currentPlayer.displayName,
    subject,
    minutes,
    damage,
    weak,
    at: new Date().toISOString()
  });

  boss.logs =
    boss.logs.slice(0, 50);

  currentPlayer.bossStats.damage += damage;
  currentPlayer.bossStats.participated++;

  if (weak) {
    currentPlayer.bossStats.weaknessDamage += damage;
  }

  if (
    boss.hp <= 0 &&
    !boss.defeated
  ) {
    boss.hp = 0;
    boss.defeated = true;
    boss.active = false;
    boss.defeatedAt =
      new Date().toISOString();

    boss.defeatedBy =
      currentPlayer.uid;

    boss.mvpUid =
      currentPlayer.uid;

    currentPlayer.bossStats.bossesDefeated++;

    addTitle("title-41");
    addTitle("secret-7");
  }

  if (currentPlayer.bossStats.damage >= 5000) {
    addTitle("title-42");
  }

  if (weak) {
    addTitle("title-44");
  }

  if (
    currentPlayer.bossStats.weaknessDamage >= 3000
  ) {
    addTitle("secret-6");
  }

  return {
    damage,
    weak,
    defeated: boss.defeated,
    beforeHp
  };
}


// ============================================================
// TITLES
// ============================================================

function addTitle(id) {
  if (!currentPlayer) return false;

  if (!currentPlayer.unlockedTitles.includes(id)) {
    currentPlayer.unlockedTitles.push(id);

    const title =
      ALL_TITLES.find(t => t.id === id);

    if (title) {
      showNotification(
        `🏷️ 称号獲得！<br><strong>${escapeHtml(title.name)}</strong>`
      );
    }

    return true;
  }

  return false;
}

async function checkTitles() {
  if (!currentPlayer) return;

  const hours =
    currentPlayer.totalStudyMinutes / 60;

  const today =
    currentPlayer.todayStudyMinutes;

  const level =
    calculateLevel(currentPlayer.xp);

  const rank =
    currentPlayer.rank;

  const questCount =
    currentPlayer.questState.questClaimedCount || 0;

  const subjectLevels =
    currentPlayer.subjects.map(
      s => currentPlayer.subjectData[s]?.level || 0
    );

  const allLv10 =
    currentPlayer.subjects.length > 0 &&
    subjectLevels.every(lv => lv >= 10);

  const allLv100 =
    currentPlayer.subjects.length > 0 &&
    subjectLevels.every(lv => lv >= 100);

  const oneLv50 =
    subjectLevels.some(lv => lv >= 50);

  const threeLv30 =
    subjectLevels.filter(lv => lv >= 30).length >= 3;

  // 勉強時間
  const studyTitles = [
    [1, "title-02"],
    [5, "title-03"],
    [10, "title-04"],
    [20, "title-05"],
    [30, "title-06"],
    [50, "title-07"],
    [100, "title-08"],
    [150, "title-09"],
    [200, "title-10"],
    [300, "title-11"],
    [500, "title-12"],
    [750, "title-13"],
    [1000, "title-14"]
  ];

  for (const [h, id] of studyTitles) {
    if (hours >= h) addTitle(id);
  }

  // レベル
  const levelTitles = [
    [10, "title-15"],
    [20, "title-16"],
    [30, "title-17"],
    [40, "title-18"],
    [50, "title-19"],
    [60, "title-20"],
    [70, "title-21"],
    [80, "title-22"],
    [90, "title-23"],
    [100, "title-24"]
  ];

  for (const [lv, id] of levelTitles) {
    if (level >= lv) addTitle(id);
  }

  // ランク
  const rankIndex =
    RANKS.findIndex(r => r.name === rank);

  if (rankIndex >= 1) addTitle("title-25");
  if (rankIndex >= 2) addTitle("title-26");
  if (rankIndex >= 3) addTitle("title-27");
  if (rankIndex >= 4) addTitle("title-28");
  if (rankIndex >= 5) addTitle("title-29");
  if (rankIndex >= 6) addTitle("title-30");

  if (rank === "Legend") {
    addTitle("title-31");
    currentPlayer.permanentLegendBoost = true;
  }

  // クエスト
  if (questCount >= 1) addTitle("title-33");
  if (questCount >= 10) addTitle("title-34");
  if (questCount >= 50) addTitle("title-35");

  const daily =
    currentPlayer.questState.daily || [];

  if (
    daily.length === 3 &&
    daily.every(q => q.claimed)
  ) {
    addTitle("title-36");
  }

  // ログイン
  if (currentPlayer.loginStreak >= 7) {
    addTitle("title-37");
    addTitle("secret-2");
  }

  if (currentPlayer.loginStreak >= 14) {
    addTitle("title-38");
  }

  if (currentPlayer.loginStreak >= 30) {
    addTitle("title-39");
  }

  // レア
  if (
    currentPlayer.questState.questHistory
      .some(q => q.type === "rare")
  ) {
    addTitle("title-40");
  }

  // パーティー
  if (currentPlayer.partyId) {
    addTitle("title-45");
  }

  // 教科
  if (allLv10) addTitle("title-47");
  if (oneLv50) addTitle("title-48");
  if (threeLv30) addTitle("title-49");
  if (allLv100) addTitle("title-50");

  // Secret
  if (today >= 120) addTitle("secret-1");
  if (today >= 240) addTitle("secret-3");
  if (today >= 300) addTitle("secret-4");

  if (
    (currentPlayer.questState.dailyCompleteStreak || 0) >= 7
  ) {
    addTitle("secret-5");
  }

  if (
    currentPlayer.bossStats.weaknessDamage >= 3000
  ) {
    addTitle("secret-6");
  }

  if (
    currentPlayer.bossStats.bossesDefeated > 0
  ) {
    addTitle("title-41");
  }

  if (
    currentPlayer.bossStats.mvpCount > 0
  ) {
    addTitle("title-43");
  }

  if (
    currentPlayer.totalStudyMinutes >= 300 * 60 &&
    rank === "Legend"
  ) {
    addTitle("secret-9");
  }

  // 全13教科を実際に1分以上
  const allSubjectsStudied =
    ALL_SUBJECT_IDS.every(
      subject =>
        (currentPlayer.subjectData[subject]?.studyMinutes || 0) > 0
    );

  if (allSubjectsStudied) {
    addTitle("secret-10");
  }

  // 隠された才能
  const sevenDaysAgo =
    new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

  const recentSubjectMinutes = {};

  for (const record of currentPlayer.studyHistory) {
    const date = new Date(record.createdAt);

    if (date >= sevenDaysAgo) {
      recentSubjectMinutes[record.subject] =
        (recentSubjectMinutes[record.subject] || 0) +
        Number(record.minutes || 0);
    }
  }

  if (
    Object.values(recentSubjectMinutes)
      .some(minutes => minutes >= 300)
  ) {
    addTitle("secret-8");
  }
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

function unlockAchievement(id) {
  if (!currentPlayer) return false;

  if (!currentPlayer.achievements.includes(id)) {
    currentPlayer.achievements.push(id);

    const achievement =
      ACHIEVEMENTS.find(a => a.id === id);

    if (achievement) {
      currentPlayer.coins += achievement.reward;
      currentPlayer.totalCoinsEarned += achievement.reward;

      showNotification(
        `🏆 実績解除！<br>` +
        `<strong>${escapeHtml(achievement.name)}</strong><br>` +
        `🪙 +${achievement.reward}`
      );
    }

    return true;
  }

  return false;
}

async function checkAchievements() {
  if (!currentPlayer) return;

  const hours =
    currentPlayer.totalStudyMinutes / 60;

  const level =
    calculateLevel(currentPlayer.xp);

  const rank =
    currentPlayer.rank;

  if (currentPlayer.totalStudyMinutes > 0) {
    unlockAchievement("first-study");
  }

  if (hours >= 10) {
    unlockAchievement("study-10h");
  }

  if (hours >= 50) {
    unlockAchievement("study-50h");
  }

  if (hours >= 100) {
    unlockAchievement("study-100h");
  }

  if (level >= 10) {
    unlockAchievement("level-10");
  }

  if (level >= 50) {
    unlockAchievement("level-50");
  }

  if (level >= 100) {
    unlockAchievement("level-100");
  }

  if (rank === "Gold" || rankIndexAtLeast("Gold")) {
    unlockAchievement("rank-gold");
  }

  if (rankIndexAtLeast("Platinum")) {
    unlockAchievement("rank-platinum");
  }

  if (rankIndexAtLeast("Diamond")) {
    unlockAchievement("rank-diamond");
  }

  if (rankIndexAtLeast("Master")) {
    unlockAchievement("rank-master");
  }

  if (rank === "Legend") {
    unlockAchievement("rank-legend");
  }

  if (currentPlayer.loginStreak >= 3) {
    unlockAchievement("streak-3");
  }

  if (currentPlayer.loginStreak >= 7) {
    unlockAchievement("streak-7");
  }

  if (currentPlayer.loginStreak >= 30) {
    unlockAchievement("streak-30");
  }
}

function rankIndexAtLeast(name) {
  const current =
    RANKS.findIndex(
      r => r.name === currentPlayer?.rank
    );

  const target =
    RANKS.findIndex(
      r => r.name === name
    );

  return current >= target;
}


// ============================================================
// NAVIGATION
// ============================================================

function showAppScreen(screenId) {
  if (!APP_SCREEN_IDS.includes(screenId)) {
    return;
  }

  for (const id of APP_SCREEN_IDS) {
    const screen = $(id);

    if (!screen) continue;

    screen.classList.toggle(
      "hidden",
      id !== screenId
    );
  }

  document
    .querySelectorAll("#main-navigation [data-screen]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.screen === screenId
      );
    });

  const target = $(screenId);

  if (target) {
    target.classList.remove("rpg-screen-enter");

    requestAnimationFrame(() => {
      target.classList.add("rpg-screen-enter");

      setTimeout(() => {
        target.classList.remove("rpg-screen-enter");
      }, 300);
    });
  }

  if (screenId === "home-screen") {
    renderHome();
  }

  if (screenId === "study-screen") {
    renderStudy();
  }

  if (screenId === "quest-screen") {
    renderQuest();
  }

  if (screenId === "party-screen") {
    renderParty();
  }

  if (screenId === "rank-screen") {
    renderRank();
  }

  if (screenId === "other-screen") {
    renderOther();
  }
}

function bindNavigation() {
  document
    .querySelectorAll("#main-navigation [data-screen]")
    .forEach(button => {
      button.addEventListener("click", () => {
        showAppScreen(button.dataset.screen);
      });
    });
}


// ============================================================
// AUTH SCREEN
// ============================================================

function showLoginScreen() {
  show("login-screen");
  hide("register-screen");
}

function showRegisterScreen() {
  hide("login-screen");
  show("register-screen");
}

function showMainApp() {
  hide("auth-screen");
  show("main-app");

  showAppScreen("home-screen");
}

function showAuth() {
  show("auth-screen");
  hide("main-app");

  showLoginScreen();
}


// ============================================================
// LOGIN
// ============================================================

function makeEmailFromUserId(userId) {
  return `${userId.toLowerCase()}@juken-rpg.local`;
}

async function handleLogin(event) {
  event.preventDefault();

  const userId =
    $("login-user-id")?.value.trim();

  const password =
    $("login-password")?.value;

  const error =
    $("login-error");

  if (error) error.textContent = "";

  try {
    const email =
      makeEmailFromUserId(userId);

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  } catch (e) {
    console.error(e);

    if (error) {
      error.textContent =
        "ユーザーIDまたはパスワードが正しくありません。";
    }
  }
}


// ============================================================
// REGISTER
// ============================================================

async function handleRegister(event) {
  event.preventDefault();

  const error =
    $("register-error");

  const subjectError =
    $("subject-error");

  if (error) error.textContent = "";
  if (subjectError) subjectError.textContent = "";

  const userId =
    $("register-user-id")?.value.trim();

  const password =
    $("register-password")?.value;

  const confirm =
    $("register-password-confirm")?.value;

  const displayName =
    $("register-display-name")?.value.trim();

  const course =
    document.querySelector(
      'input[name="course"]:checked'
    )?.value || "undecided";

  const subjects =
    [...document.querySelectorAll(
      'input[name="subjects"]:checked'
    )].map(input => input.value);

  if (!/^[A-Za-z0-9_-]{3,30}$/.test(userId)) {
    if (error) {
      error.textContent =
        "ユーザーIDは3〜30文字の英数字・_・-で入力してください。";
    }

    return;
  }

  if (password.length < 6) {
    if (error) {
      error.textContent =
        "パスワードは6文字以上にしてください。";
    }

    return;
  }

  if (password !== confirm) {
    if (error) {
      error.textContent =
        "パスワードが一致していません。";
    }

    return;
  }

  if (!displayName || displayName.length > 30) {
    if (error) {
      error.textContent =
        "表示名を入力してください。";
    }

    return;
  }

  if (!subjects.length) {
    if (subjectError) {
      subjectError.textContent =
        "受験教科を1つ以上選択してください。";
    }

    return;
  }

  try {
    const existing =
      await getDocs(
        query(
          collection(db, "users"),
          where("userId", "==", userId.toLowerCase()),
          limit(1)
        )
      );

    if (!existing.empty) {
      if (error) {
        error.textContent =
          "そのユーザーIDはすでに使用されています。";
      }

      return;
    }

    const email =
      makeEmailFromUserId(userId);

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const player =
      createDefaultPlayer(
        credential.user.uid,
        userId.toLowerCase(),
        displayName,
        course,
        subjects
      );

    player.unlockedTitles.push("title-01");

    await setDoc(
      doc(db, "users", credential.user.uid),
      player
    );

  } catch (e) {
    console.error(e);

    if (error) {
      error.textContent =
        firebaseErrorMessage(e);
    }
  }
}


// ============================================================
// FIREBASE ERROR
// ============================================================

function firebaseErrorMessage(error) {
  const code = error?.code || "";

  if (code.includes("email-already-in-use")) {
    return "このユーザーIDはすでに使用されています。";
  }

  if (code.includes("weak-password")) {
    return "パスワードが弱すぎます。6文字以上にしてください。";
  }

  if (code.includes("network")) {
    return "ネットワーク接続を確認してください。";
  }

  return "処理に失敗しました。もう一度試してください。";
}


// ============================================================
// HOME RENDER
// ============================================================

function renderHome() {
  if (!currentPlayer) return;

  ensureQuestState();

  const progress =
    getLevelProgress(currentPlayer.xp);

  setText("home-level", progress.level);
  setText(
    "home-xp",
    `${currentPlayer.xp.toLocaleString()} XP`
  );

  const progressBar =
    $("level-progress");

  if (progressBar) {
    progressBar.style.width =
      `${progress.percent}%`;
  }

  setText(
    "home-xp-required",
    progress.level >= 100
      ? "MAX LEVEL"
      : `次のレベルまで ${progress.remaining.toLocaleString()} XP`
  );

  setText(
    "today-study-time",
    formatMinutes(currentPlayer.todayStudyMinutes)
  );

  setText(
    "today-xp",
    `${currentPlayer.todayXp.toLocaleString()} XP`
  );

  setText(
    "today-quests",
    currentPlayer.questState.questClaimedCount
  );

  setText(
    "today-coins",
    `🪙 ${currentPlayer.todayCoins.toLocaleString()}`
  );

  setText(
    "home-rank",
    currentPlayer.rank
  );

  setText(
    "home-season-study-time",
    formatMinutes(currentPlayer.seasonStudyMinutes)
  );

  setText(
    "home-season-end",
    getMonthEnd().toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric"
    })
  );

  const list =
    $("home-quest-list");

  if (!list) return;

  const quests = [
    ...(currentPlayer.questState.daily || [])
  ];

  if (currentPlayer.questState.rare) {
    quests.push(currentPlayer.questState.rare);
  }

  list.innerHTML =
    quests.map(renderQuestCard).join("");
}


// ============================================================
// QUEST CARD
// ============================================================

function renderQuestCard(quest) {
  const percent =
    Math.min(
      100,
      quest.target > 0
        ? (quest.progress / quest.target) * 100
        : 0
    );

  const complete =
    quest.progress >= quest.target;

  const claimed =
    quest.claimed;

  return `
    <article class="rpg-generated-card">
      <div>
        <strong>
          ${quest.type === "rare" ? "🔥 " : ""}
          ${escapeHtml(quest.title)}
        </strong>
      </div>

      <div class="rpg-small">
        ${Math.floor(quest.progress)}
        /
        ${quest.target}
        分
      </div>

      <div class="rpg-progress">
        <div
          class="rpg-progress-fill"
          style="width:${percent}%"
        ></div>
      </div>

      <div class="rpg-quest-reward">
        ✨ ${quest.rewardXp} XP　
        🪙 ${quest.rewardCoins}
      </div>

      ${
        claimed
          ? `<span class="rpg-status">達成済み</span>`
          : complete
            ? `
              <button
                type="button"
                class="rpg-inline-button"
                data-claim-quest="${escapeHtml(quest.id)}"
                data-quest-type="${escapeHtml(quest.type)}"
              >
                報酬を受け取る
              </button>
            `
            : `<span class="rpg-status">進行中</span>`
      }
    </article>
  `;
}


// ============================================================
// STUDY RENDER
// ============================================================

function renderStudy() {
  if (!currentPlayer) return;

  renderStudySubjects();
  renderSubjectLevels();
  renderSubjectSummary();
  renderStudyHistory();
  updateTimerDisplay();
}

function renderStudySubjects() {
  const select =
    $("study-subject");

  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    `<option value="">教科を選択</option>` +
    currentPlayer.subjects
      .map(subject =>
        `<option value="${escapeHtml(subject)}">
          ${escapeHtml(SUBJECT_NAMES[subject])}
        </option>`
      )
      .join("");

  if (
    current &&
    currentPlayer.subjects.includes(current)
  ) {
    select.value = current;
  }
}

function renderSubjectLevels() {
  const container =
    $("subject-level-list");

  if (!container) return;

  if (!currentPlayer.subjects.length) {
    container.innerHTML =
      `<p class="empty-message">登録教科がありません。</p>`;

    return;
  }

  container.innerHTML =
    currentPlayer.subjects.map(subject => {
      const data =
        currentPlayer.subjectData[subject] || {};

      const level =
        Math.min(
          100,
          Number(data.level) || 0
        );

      const minutes =
        Number(data.studyMinutes) || 0;

      return `
        <article class="rpg-generated-card">
          <div class="rpg-row">
            <strong>
              ${escapeHtml(SUBJECT_NAMES[subject])}
            </strong>

            <strong>
              Lv.${level}
            </strong>
          </div>

          <div class="rpg-progress">
            <div
              class="rpg-progress-fill"
              style="width:${level}%"
            ></div>
          </div>

          <small>
            ${formatMinutes(minutes)}
          </small>
        </article>
      `;
    }).join("");
}

function renderSubjectSummary() {
  const container =
    $("subject-study-list");

  if (!container) return;

  container.innerHTML =
    currentPlayer.subjects.map(subject => {
      const minutes =
        currentPlayer.subjectData[subject]
          ?.studyMinutes || 0;

      return `
        <div class="rpg-generated-card">
          <strong>
            ${escapeHtml(SUBJECT_NAMES[subject])}
          </strong>
          <span>
            ${formatMinutes(minutes)}
          </span>
        </div>
      `;
    }).join("");
}

function renderStudyHistory() {
  const container =
    $("study-history-list");

  if (!container) return;

  if (!currentPlayer.studyHistory.length) {
    container.innerHTML =
      `<p class="empty-message">まだ勉強履歴がありません。</p>`;

    return;
  }

  container.innerHTML =
    currentPlayer.studyHistory
      .slice(0, 50)
      .map(record => `
        <article class="rpg-generated-card">
          <div class="rpg-row">
            <strong>
              ${escapeHtml(
                SUBJECT_NAMES[record.subject] ||
                record.subject
              )}
            </strong>

            <strong>
              ${record.minutes}分
            </strong>
          </div>

          <small>
            ${escapeHtml(record.date || "-")}
            ${record.createdAt
              ? ` ・ ${formatDateTime(record.createdAt)}`
              : ""}
          </small>

          ${
            record.note
              ? `<p>${escapeHtml(record.note)}</p>`
              : ""
          }

          <small>
            ✨ +${record.xp || 0} XP
            　🪙 +${record.coins || 0}
          </small>
        </article>
      `).join("");
}


// ============================================================
// TIMER
// ============================================================

function getTimerSeconds() {
  let seconds =
    timerState.accumulatedSeconds;

  if (
    timerState.running &&
    timerState.startedAt
  ) {
    seconds +=
      Math.floor(
        (Date.now() - timerState.startedAt) / 1000
      );
  }

  return Math.max(0, seconds);
}

function updateTimerDisplay() {
  const display =
    $("study-timer-display");

  if (!display) return;

  const total =
    getTimerSeconds();

  const h =
    Math.floor(total / 3600);

  const m =
    Math.floor((total % 3600) / 60);

  const s =
    total % 60;

  display.textContent =
    `${String(h).padStart(2, "0")}:` +
    `${String(m).padStart(2, "0")}:` +
    `${String(s).padStart(2, "0")}`;
}

function startTimer() {
  if (!currentPlayer) return;

  const subject =
    $("study-subject")?.value;

  if (!subject) {
    showNotification("先に教科を選択してください。");
    return;
  }

  if (timerState.running) return;

  timerState.running = true;
  timerState.startedAt = Date.now();

  if (!timerInterval) {
    timerInterval =
      setInterval(updateTimerDisplay, 1000);
  }

  updateTimerDisplay();
}

function pauseTimer() {
  if (!timerState.running) return;

  timerState.accumulatedSeconds =
    getTimerSeconds();

  timerState.startedAt = null;
  timerState.running = false;

  updateTimerDisplay();
}

function resetTimer() {
  timerState = {
    running: false,
    startedAt: null,
    accumulatedSeconds: 0,
    savedMinutes: 0
  };

  updateTimerDisplay();
}

async function saveTimerStudy() {
  if (!currentPlayer) return;

  const subject =
    $("study-subject")?.value;

  if (!subject) {
    showNotification("教科を選択してください。");
    return;
  }

  const totalSeconds =
    getTimerSeconds();

  const totalMinutes =
    Math.floor(totalSeconds / 60);

  const unsavedMinutes =
    totalMinutes - timerState.savedMinutes;

  if (unsavedMinutes < 1) {
    showNotification("記録できる1分以上の勉強時間がありません。");
    return;
  }

  timerState.savedMinutes =
    totalMinutes;

  await recordStudy(
    unsavedMinutes,
    subject,
    "勉強タイマー",
    "timer"
  );
}


// ============================================================
// QUEST RENDER
// ============================================================

function switchQuestTab(tab) {
  activeQuestTab = tab;

  const map = {
    daily: "daily-quest-tab",
    weekly: "weekly-quest-tab",
    boss: "boss-tab",
    history: "quest-history-tab"
  };

  Object.values(map).forEach(id => {
    const el = $(id);

    if (el) {
      el.classList.toggle(
        "hidden",
        id !== map[tab]
      );
    }
  });

  document
    .querySelectorAll("[data-quest-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.questTab === tab
      );
    });

  if (tab === "boss") {
    renderBoss();
  }
}

function renderQuest() {
  if (!currentPlayer) return;

  ensureQuestState();

  renderDailyQuests();
  renderWeeklyQuest();
  renderQuestHistory();

  if (activeQuestTab === "boss") {
    renderBoss();
  }
}

function renderDailyQuests() {
  const container =
    $("daily-quest-list");

  if (!container) return;

  const quests =
    currentPlayer.questState.daily || [];

  if (!quests.length) {
    container.innerHTML =
      `<p class="empty-message">クエストがありません。</p>`;

    return;
  }

  const rare =
    currentPlayer.questState.rare;

  container.innerHTML =
    quests.map(renderQuestCard).join("") +
    (rare ? renderQuestCard(rare) : "");
}

function renderWeeklyQuest() {
  const container =
    $("weekly-quest-list");

  if (!container) return;

  const quest =
    currentPlayer.questState.weekly;

  if (!quest) {
    container.innerHTML =
      `<p class="empty-message">クエストがありません。</p>`;

    return;
  }

  container.innerHTML =
    renderQuestCard(quest);
}

function renderQuestHistory() {
  const container =
    $("quest-history-list");

  if (!container) return;

  const history =
    currentPlayer.questState.questHistory || [];

  if (!history.length) {
    container.innerHTML =
      `<p class="empty-message">まだクエスト履歴がありません。</p>`;

    return;
  }

  container.innerHTML =
    history.slice(0, 50).map(q => `
      <article class="rpg-generated-card">
        <strong>
          ${escapeHtml(q.title)}
        </strong>

        <small>
          ${escapeHtml(q.date || "-")}
        </small>

        <div>
          ✨ +${q.rewardXp || 0} XP
         　🪙 +${q.rewardCoins || 0}
        </div>
      </article>
    `).join("");
}


// ============================================================
// BOSS RENDER
// ============================================================

async function renderBoss() {
  if (!currentPlayer) return;

  try {
    const party =
      await getParty();

    let boss;

    if (party) {
      boss =
        await ensurePartyBoss(party);
    } else {
      ensurePersonalBoss();
      boss =
        currentPlayer.bossData;
    }

    if (!boss) return;

    setText(
      "boss-name",
      boss.name || "受験の魔王"
    );

    setText(
      "boss-level",
      `Lv.${boss.level || 1}`
    );

    setText(
      "boss-current-hp",
      Math.floor(boss.hp)
    );

    setText(
      "boss-max-hp",
      Math.floor(boss.maxHp)
    );

    const hpPercent =
      boss.maxHp > 0
        ? (boss.hp / boss.maxHp) * 100
        : 0;

    const hpBar =
      $("boss-hp-progress");

    if (hpBar) {
      hpBar.style.width =
        `${Math.max(0, hpPercent)}%`;
    }

    setText(
      "boss-weakness-subject",
      SUBJECT_NAMES[boss.weaknessSubject] || "-"
    );

    setText(
      "boss-weakness-multiplier",
      `×${boss.weaknessMultiplier || 1.5}`
    );

    const reset =
      getNextMonday();

    setText(
      "boss-reset-date",
      reset.toLocaleDateString("ja-JP", {
        month: "numeric",
        day: "numeric"
      })
    );

    renderBossLogs(boss);

    await renderBossParty(party);
  } catch (e) {
    console.error("boss render error", e);
  }
}

function getNextMonday() {
  const d = japanNow();

  const day = d.getDay();
  const diff =
    day === 0
      ? 1
      : 8 - day;

  d.setDate(d.getDate() + diff);

  return d;
}

function renderBossLogs(boss) {
  const container =
    $("boss-log-list");

  if (!container) return;

  if (!boss.logs?.length) {
    container.innerHTML =
      `<p class="empty-message">まだ戦闘記録はありません。</p>`;

    return;
  }

  container.innerHTML =
    boss.logs.slice(0, 30).map(log => `
      <div class="rpg-generated-card">
        <strong>
          ${escapeHtml(log.displayName)}
        </strong>

        <span>
          ${escapeHtml(
            SUBJECT_NAMES[log.subject] ||
            log.subject
          )}
          ${log.minutes}分
        </span>

        <div>
          ⚔️ ${Math.floor(log.damage)} ダメージ
          ${log.weak ? " 🔥弱点!" : ""}
        </div>

        <small>
          ${formatDateTime(log.at)}
        </small>
      </div>
    `).join("");
}

async function renderBossParty(party) {
  const list =
    $("boss-party-member-list");

  const count =
    $("boss-party-count");

  if (!list || !count) return;

  if (!party) {
    list.innerHTML =
      `<p class="empty-message">ソロ戦闘中</p>`;

    count.textContent = "1 / 4人";

    return;
  }

  const memberUids =
    Array.isArray(party.memberUids)
      ? party.memberUids
      : [];

  const members =
    await getUserDocs(memberUids);

  list.innerHTML =
    members.map(member => `
      <div class="rpg-generated-card">
        <strong>
          ${escapeHtml(member.displayName || member.userId)}
        </strong>

        <small>
          Lv.${calculateLevel(member.xp || 0)}
        </small>
      </div>
    `).join("");

  count.textContent =
    `${memberUids.length} / 4人`;
}


// ============================================================
// PARTY
// ============================================================

async function getUserDocs(uids) {
  const unique =
    [...new Set(uids)].slice(0, 20);

  const result = [];

  for (const uid of unique) {
    try {
      const snap =
        await getDoc(
          doc(db, "users", uid)
        );

      if (snap.exists()) {
        result.push({
          uid: snap.id,
          ...snap.data()
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  return result;
}

async function renderParty() {
  if (!currentPlayer) return;

  setText(
    "party-week-range",
    `${japanWeekKey()} 〜`
  );

  try {
    const party =
      await getParty();

    const list =
      $("party-member-list");

    const count =
      $("party-member-count");

    if (!list || !count) return;

    if (!party) {
      list.innerHTML =
        `<p class="empty-message">現在パーティーに所属していません。</p>`;

      count.textContent =
        "0 / 4人";

      return;
    }

    const members =
      await getUserDocs(
        party.memberUids || []
      );

    list.innerHTML =
      members.map(member => `
        <div class="rpg-generated-card">
          <div class="rpg-row">
            <strong>
              ${escapeHtml(
                member.displayName ||
                member.userId
              )}
            </strong>

            ${
              member.uid === party.leaderUid
                ? `<span>👑 リーダー</span>`
                : ""
            }
          </div>

          <small>
            Lv.${calculateLevel(member.xp || 0)}
            　${escapeHtml(member.rank || "Bronze")}
          </small>

          ${
            member.uid === currentPlayer.uid &&
            party.leaderUid !== currentPlayer.uid
              ? ""
              : ""
          }
        </div>
      `).join("");

    if (
      currentPlayer.uid === party.leaderUid
    ) {
      list.innerHTML += `
        <button
          type="button"
          class="secondary-button rpg-leave-party"
          data-party-leave="true"
        >
          パーティーを解散 / 脱退
        </button>
      `;
    } else {
      list.innerHTML += `
        <button
          type="button"
          class="secondary-button rpg-leave-party"
          data-party-leave="true"
        >
          パーティーを脱退
        </button>
      `;
    }

    count.textContent =
      `${(party.memberUids || []).length} / 4人`;
  } catch (e) {
    console.error(e);
  }

  await renderFriends();
  await renderRequests();
}

async function inviteToParty(userId) {
  if (!currentPlayer) return;

  userId =
    userId.trim().toLowerCase();

  if (!userId) return;

  if (
    userId === currentPlayer.userId.toLowerCase()
  ) {
    throw new Error("自分自身は招待できません。");
  }

  let party =
    await getParty();

  if (!party) {
    const partyRef =
      doc(collection(db, "parties"));

    party = {
      id: partyRef.id,
      leaderUid: currentPlayer.uid,
      memberUids: [currentPlayer.uid],
      createdAt: new Date().toISOString(),
      boss: null
    };

    await setDoc(
      partyRef,
      {
        leaderUid: party.leaderUid,
        memberUids: party.memberUids,
        createdAt: party.createdAt,
        boss: null
      }
    );

    currentPlayer.partyId =
      partyRef.id;

    currentPlayer.partyRole =
      "leader";

    addTitle("title-45");

    await savePlayer();
  }

  if (
    (party.memberUids || []).length >= 4
  ) {
    throw new Error("パーティーは最大4人です。");
  }

  const targetQuery =
    await getDocs(
      query(
        collection(db, "users"),
        where("userId", "==", userId),
        limit(1)
      )
    );

  if (targetQuery.empty) {
    throw new Error("そのユーザーIDは存在しません。");
  }

  const target =
    targetQuery.docs[0];

  if (
    (party.memberUids || []).includes(target.id)
  ) {
    throw new Error("すでにパーティーに参加しています。");
  }

  const requestRef =
    doc(collection(db, "requests"));

  await setDoc(
    requestRef,
    {
      type: "party",
      fromUid: currentPlayer.uid,
      fromUserId: currentPlayer.userId,
      fromDisplayName: currentPlayer.displayName,
      toUid: target.id,
      partyId: party.id,
      status: "pending",
      createdAt: new Date().toISOString()
    }
  );
}

async function acceptPartyRequest(request) {
  const partySnap =
    await getDoc(
      doc(db, "parties", request.partyId)
    );

  if (!partySnap.exists()) {
    throw new Error("パーティーが存在しません。");
  }

  const party = partySnap.data();

  const members =
    Array.isArray(party.memberUids)
      ? party.memberUids
      : [];

  if (members.length >= 4) {
    throw new Error("パーティーが満員です。");
  }

  if (!members.includes(currentPlayer.uid)) {
    members.push(currentPlayer.uid);
  }

  await updateDoc(
    doc(db, "parties", request.partyId),
    {
      memberUids: members
    }
  );

  currentPlayer.partyId =
    request.partyId;

  currentPlayer.partyRole =
    "member";

  addTitle("title-45");

  await updateDoc(
    doc(db, "requests", request.id),
    {
      status: "accepted"
    }
  );

  await savePlayer();
}

async function declineRequest(id) {
  await updateDoc(
    doc(db, "requests", id),
    {
      status: "declined"
    }
  );
}

async function leaveParty() {
  if (!currentPlayer?.partyId) return;

  const partyRef =
    doc(db, "parties", currentPlayer.partyId);

  const snap =
    await getDoc(partyRef);

  if (!snap.exists()) {
    currentPlayer.partyId = null;
    currentPlayer.partyRole = null;

    await savePlayer();

    return;
  }

  const party = snap.data();

  const members =
    (party.memberUids || [])
      .filter(uid => uid !== currentPlayer.uid);

  if (!members.length) {
    await deleteDoc(partyRef);

    currentPlayer.partyId = null;
    currentPlayer.partyRole = null;

    await savePlayer();

    showNotification("パーティーを解散しました。");

    renderAll();

    return;
  }

  let leaderUid =
    party.leaderUid;

  if (leaderUid === currentPlayer.uid) {
    leaderUid = members[0];
  }

  await updateDoc(
    partyRef,
    {
      memberUids: members,
      leaderUid
    }
  );

  currentPlayer.partyId = null;
  currentPlayer.partyRole = null;

  await savePlayer();

  showNotification("パーティーを脱退しました。");

  renderAll();
}


// ============================================================
// FRIENDS / REQUESTS
// ============================================================

async function renderFriends() {
  const container =
    $("friend-list");

  if (!container) return;

  const ids =
    currentPlayer.friendIds || [];

  if (!ids.length) {
    container.innerHTML =
      `<p class="empty-message">フレンドがいません。</p>`;

    return;
  }

  const friends =
    await getUserDocs(ids);

  container.innerHTML =
    friends.map(friend => `
      <div class="rpg-generated-card">
        <strong>
          ${escapeHtml(friend.displayName || friend.userId)}
        </strong>

        <small>
          ID: ${escapeHtml(friend.userId || "-")}
          　Lv.${calculateLevel(friend.xp || 0)}
        </small>
      </div>
    `).join("");
}

async function renderRequests() {
  const container =
    $("friend-request-list");

  if (!container || !currentPlayer) return;

  try {
    const q =
      query(
        collection(db, "requests"),
        where("toUid", "==", currentPlayer.uid),
        where("status", "==", "pending"),
        limit(50)
      );

    const snap =
      await getDocs(q);

    if (snap.empty) {
      container.innerHTML =
        `<p class="empty-message">申請はありません。</p>`;

      return;
    }

    container.innerHTML =
      snap.docs.map(docSnap => {
        const r = docSnap.data();

        return `
          <article class="rpg-generated-card">
            <strong>
              ${escapeHtml(
                r.fromDisplayName ||
                r.fromUserId ||
                "冒険者"
              )}
            </strong>

            <small>
              ${
                r.type === "party"
                  ? "👥 パーティー招待"
                  : "🤝 フレンド申請"
              }
            </small>

            ${
              r.type === "party"
                ? `
                  <button
                    type="button"
                    class="rpg-inline-button"
                    data-request-action="accept-party"
                    data-request-id="${docSnap.id}"
                    data-party-id="${escapeHtml(r.partyId || "")}"
                  >
                    参加する
                  </button>
                `
                : `
                  <button
                    type="button"
                    class="rpg-inline-button"
                    data-request-action="accept-friend"
                    data-request-id="${docSnap.id}"
                    data-from-uid="${escapeHtml(r.fromUid || "")}"
                  >
                    承認
                  </button>
                `
            }

            <button
              type="button"
              class="secondary-button"
              data-request-action="decline"
              data-request-id="${docSnap.id}"
            >
              拒否
            </button>
          </article>
        `;
      }).join("");
  } catch (e) {
    console.error(e);
    container.innerHTML =
      `<p class="empty-message">申請を読み込めませんでした。</p>`;
  }
}

async function acceptFriendRequest(requestId, fromUid) {
  const friendIds =
    [...new Set([
      ...(currentPlayer.friendIds || []),
      fromUid
    ])];

  await updateDoc(
    doc(db, "users", currentPlayer.uid),
    {
      friendIds
    }
  );

  await updateDoc(
    doc(db, "users", fromUid),
    {
      friendIds: [
        ...new Set(
          [
            ...(await getFriendIds(fromUid)),
            currentPlayer.uid
          ]
        )
      ]
    }
  );

  await updateDoc(
    doc(db, "requests", requestId),
    {
      status: "accepted"
    }
  );

  currentPlayer.friendIds =
    friendIds;

  await savePlayer();
}

async function getFriendIds(uid) {
  const snap =
    await getDoc(
      doc(db, "users", uid)
    );

  if (!snap.exists()) return [];

  return Array.isArray(snap.data().friendIds)
    ? snap.data().friendIds
    : [];
}


// ============================================================
// PARTY TABS
// ============================================================

function switchPartyTab(tab) {
  activePartyTab = tab;

  const map = {
    party: "party-tab",
    friends: "friends-tab",
    requests: "friend-requests-tab"
  };

  Object.values(map).forEach(id => {
    const el = $(id);

    if (el) {
      el.classList.toggle(
        "hidden",
        id !== map[tab]
      );
    }
  });

  document
    .querySelectorAll("[data-party-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.partyTab === tab
      );
    });

  renderParty();
}


// ============================================================
// RANK RENDER
// ============================================================

function renderRank() {
  if (!currentPlayer) return;

  setText(
    "current-rank-name",
    currentPlayer.rank
  );

  setText(
    "current-season-study-time",
    formatMinutes(currentPlayer.seasonStudyMinutes)
  );

  setText(
    "current-season-time",
    getSeasonCountdown()
  );

  renderSeasonHistory();

  if (activeRankTab === "ranking") {
    renderRanking();
  }
}

function getSeasonCountdown() {
  const end =
    getMonthEnd();

  const diff =
    Math.max(
      0,
      end.getTime() - japanNow().getTime()
    );

  const days =
    Math.floor(
      diff / 86400000
    );

  const hours =
    Math.floor(
      (diff % 86400000) / 3600000
    );

  const minutes =
    Math.floor(
      (diff % 3600000) / 60000
    );

  return `${days}日 ${hours}時間 ${minutes}分`;
}

async function renderRanking() {
  if (!currentPlayer) return;

  try {
    const snap =
      await getDocs(
        query(
          collection(db, "users"),
          orderBy("seasonStudyMinutes", "desc"),
          limit(100)
        )
      );

    const users =
      snap.docs
        .map(d => ({
          uid: d.id,
          ...d.data()
        }))
        .filter(
          u =>
            u.seasonId === currentPlayer.seasonId
        );

    const globalList =
      $("global-ranking-list");

    const friendList =
      $("friends-ranking-list");

    if (globalList) {
      globalList.innerHTML =
        users.slice(0, 50)
          .map((user, index) =>
            renderRankingRow(user, index + 1)
          )
          .join("") ||
        `<p class="empty-message">ランキングデータがありません。</p>`;
    }

    if (friendList) {
      const friendSet =
        new Set([
          currentPlayer.uid,
          ...(currentPlayer.friendIds || [])
        ]);

      const friends =
        users.filter(
          u => friendSet.has(u.uid)
        );

      friendList.innerHTML =
        friends.map(user => {
          const rank =
            users.findIndex(
              u => u.uid === user.uid
            ) + 1;

          return renderRankingRow(user, rank);
        }).join("") ||
        `<p class="empty-message">フレンドランキングがありません。</p>`;
    }

    const myRank =
      users.findIndex(
        u => u.uid === currentPlayer.uid
      ) + 1;

    setText(
      "global-rank-number",
      myRank > 0 ? `${myRank}位` : "圏外"
    );
  } catch (e) {
    console.error("ranking error", e);

    setText(
      "global-rank-number",
      "-"
    );
  }
}

function renderRankingRow(user, rank) {
  return `
    <article class="rpg-generated-card">
      <div class="rpg-row">
        <strong>
          #${rank}
          ${escapeHtml(
            user.displayName ||
            user.userId ||
            "冒険者"
          )}
        </strong>

        <strong>
          ${user.seasonStudyMinutes || 0}分
        </strong>
      </div>

      <small>
        Lv.${calculateLevel(user.xp || 0)}
        　${escapeHtml(user.rank || "Bronze")}
      </small>
    </article>
  `;
}

function renderSeasonHistory() {
  const container =
    $("season-history-list");

  if (!container) return;

  const history =
    currentPlayer.seasonHistory || [];

  if (!history.length) {
    container.innerHTML =
      `<p class="empty-message">まだシーズン履歴がありません。</p>`;

    return;
  }

  container.innerHTML =
    history.map(item => `
      <article class="rpg-generated-card">
        <strong>
          ${escapeHtml(item.seasonId || "-")}
        </strong>

        <div>
          🏆 ${escapeHtml(item.rank || "Bronze")}
        </div>

        <div>
          📚 ${formatMinutes(item.studyMinutes || 0)}
        </div>
      </article>
    `).join("");
}

function switchRankTab(tab) {
  activeRankTab = tab;

  const map = {
    rank: "rank-info-tab",
    ranking: "ranking-tab",
    history: "season-history-tab"
  };

  Object.values(map).forEach(id => {
    const el = $(id);

    if (el) {
      el.classList.toggle(
        "hidden",
        id !== map[tab]
      );
    }
  });

  document
    .querySelectorAll("[data-rank-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.rankTab === tab
      );
    });

  if (tab === "ranking") {
    renderRanking();
  }
}


// ============================================================
// RANKING TYPE
// ============================================================

function switchRankingType(type) {
  activeRankingType = type;

  const friends =
    $("friends-ranking-list");

  const global =
    $("global-ranking-list");

  if (friends) {
    friends.classList.toggle(
      "hidden",
      type !== "friends"
    );
  }

  if (global) {
    global.classList.toggle(
      "hidden",
      type !== "global"
    );
  }

  document
    .querySelectorAll("[data-ranking-type]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.rankingType === type
      );
    });

  renderRanking();
}


// ============================================================
// OTHER TABS
// ============================================================

function switchOtherTab(tab) {
  activeOtherTab = tab;

  const map = {
    menu: "other-menu-tab",
    achievement: "achievement-tab",
    shop: "shop-tab",
    locker: "locker-tab",
    profile: "profile-tab",
    settings: "settings-tab"
  };

  Object.values(map).forEach(id => {
    const el = $(id);

    if (el) {
      el.classList.toggle(
        "hidden",
        id !== map[tab]
      );
    }
  });

  document
    .querySelectorAll("[data-other-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.otherTab === tab
      );
    });

  if (tab === "achievement") {
    renderAchievements();
  }

  if (tab === "shop") {
    renderShop();
  }

  if (tab === "locker") {
    renderLocker();
  }

  if (tab === "profile") {
    renderProfile();
  }

  if (tab === "settings") {
    renderSettings();
  }
}

function renderOther() {
  switchOtherTab(activeOtherTab);
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

function renderAchievements() {
  const container =
    $("achievement-list");

  if (!container || !currentPlayer) return;

  setText(
    "achievement-count",
    `${currentPlayer.achievements.length} / ${ACHIEVEMENTS.length}`
  );

  container.innerHTML =
    ACHIEVEMENTS.map(a => {
      const unlocked =
        currentPlayer.achievements.includes(a.id);

      return `
        <article
          class="rpg-generated-card
          ${unlocked ? "achievement-unlocked" : ""}"
        >
          <div class="rpg-row">
            <strong>
              ${unlocked ? "🏆" : "🔒"}
              ${escapeHtml(a.name)}
            </strong>

            <span>
              🪙 ${a.reward}
            </span>
          </div>

          <small>
            ${escapeHtml(a.desc)}
          </small>
        </article>
      `;
    }).join("");
}


// ============================================================
// SHOP
// ============================================================

function getItemQuantity(id) {
  return Number(
    currentPlayer?.inventory?.[id] || 0
  );
}

function isPurchased(id) {
  return Boolean(
    currentPlayer?.purchasedItems?.[id]
  );
}

async function buyShopItem(id) {
  if (!currentPlayer) return;

  const item =
    SHOP_ITEMS.find(
      i => i.id === id
    );

  if (!item) return;

  if (
    currentPlayer.coins <
    item.price
  ) {
    showNotification("コインが足りません。");
    return;
  }

  currentPlayer.coins -= item.price;

  currentPlayer.purchasedItems[id] =
    true;

  if (
    item.type === "xp"
  ) {
    const expiresAt =
      Date.now() +
      item.minutes * 60 * 1000;

    currentPlayer.activeXpBoosts.push({
      id,
      multiplier: item.multiplier,
      expiresAt
    });
  }

  if (
    item.type === "boss-damage"
  ) {
    currentPlayer.inventory[id] =
      getItemQuantity(id) + 1;
  }

  if (
    item.type === "boss-down"
  ) {
    const current =
      currentPlayer.pendingBossLevelDownMultiplier || 1;

    currentPlayer.pendingBossLevelDownMultiplier =
      Math.max(
        0.5,
        current * (1 - item.reduction)
      );
  }

  await savePlayer();

  showNotification(
    `🛒 ${escapeHtml(item.name)}を購入しました！`
  );

  renderShop();
  renderLocker();
  renderHome();
}

async function buyShopTitle(id) {
  if (!currentPlayer) return;

  const title =
    SHOP_TITLES.find(
      t => t.id === id
    );

  if (!title) return;

  if (
    currentPlayer.unlockedTitles.includes(id)
  ) {
    showNotification("すでに所持しています。");
    return;
  }

  if (
    currentPlayer.coins <
    title.price
  ) {
    showNotification("コインが足りません。");
    return;
  }

  currentPlayer.coins -= title.price;

  currentPlayer.unlockedTitles.push(id);
  currentPlayer.purchasedItems[id] = true;

  await savePlayer();

  showNotification(
    `🏷️ 「${escapeHtml(title.name)}」を購入しました！`
  );

  renderShop();
  renderLocker();
}

async function buyBackground(id) {
  if (!currentPlayer) return;

  const bg =
    SHOP_BACKGROUNDS.find(
      b => b.id === id
    );

  if (!bg) return;

  if (
    currentPlayer.backgrounds.includes(id)
  ) {
    showNotification("すでに所持しています。");
    return;
  }

  if (
    currentPlayer.coins <
    bg.price
  ) {
    showNotification("コインが足りません。");
    return;
  }

  currentPlayer.coins -= bg.price;

  currentPlayer.backgrounds.push(id);
  currentPlayer.purchasedItems[id] = true;

  await savePlayer();

  showNotification(
    `🖼️ 「${escapeHtml(bg.name)}」を購入しました！`
  );

  renderShop();
  renderLocker();
}

function renderShop() {
  if (!currentPlayer) return;

  setText(
    "shop-coin-count",
    currentPlayer.coins.toLocaleString()
  );

  const titleContainer =
    $("shop-title-list");

  if (titleContainer) {
    titleContainer.innerHTML =
      SHOP_TITLES.map(title => {
        const owned =
          currentPlayer.unlockedTitles.includes(title.id);

        return `
          <article class="rpg-generated-card">
            <div class="rpg-row">
              <strong>
                ${escapeHtml(title.name)}
              </strong>

              <span>
                🪙 ${title.price}
              </span>
            </div>

            ${
              owned
                ? `<span class="rpg-status">所持済み</span>`
                : `
                  <button
                    type="button"
                    class="rpg-inline-button"
                    data-buy-title="${title.id}"
                  >
                    購入
                  </button>
                `
            }
          </article>
        `;
      }).join("");
  }

  const itemContainer =
    $("shop-item-list");

  if (itemContainer) {
    itemContainer.innerHTML =
      SHOP_ITEMS.map(item => {
        const quantity =
          getItemQuantity(item.id);

        return `
          <article class="rpg-generated-card">
            <div class="rpg-row">
              <strong>
                ${escapeHtml(item.name)}
              </strong>

              <span>
                🪙 ${item.price}
              </span>
            </div>

            <small>
              ${escapeHtml(item.desc)}
            </small>

            ${
              item.type === "boss-damage" &&
              quantity > 0
                ? `<small>所持: ${quantity}</small>`
                : ""
            }

            <button
              type="button"
              class="rpg-inline-button"
              data-buy-item="${item.id}"
            >
              購入
            </button>
          </article>
        `;
      }).join("");
  }

  const bgContainer =
    $("shop-background-list");

  if (bgContainer) {
    bgContainer.innerHTML =
      SHOP_BACKGROUNDS.map(bg => {
        const owned =
          currentPlayer.backgrounds.includes(bg.id);

        return `
          <article class="rpg-generated-card">
            <div class="rpg-row">
              <strong>
                ${escapeHtml(bg.name)}
              </strong>

              <span>
                🪙 ${bg.price}
              </span>
            </div>

            ${
              owned
                ? `<span class="rpg-status">所持済み</span>`
                : `
                  <button
                    type="button"
                    class="rpg-inline-button"
                    data-buy-background="${bg.id}"
                  >
                    購入
                  </button>
                `
            }
          </article>
        `;
      }).join("");
  }
}


// ============================================================
// LOCKER
// ============================================================

async function equipTitle(id) {
  if (!currentPlayer) return;

  if (
    !currentPlayer.unlockedTitles.includes(id)
  ) {
    return;
  }

  const title =
    ALL_TITLES.find(
      t => t.id === id
    );

  if (!title) return;

  currentPlayer.title =
    title.name;

  await savePlayer();

  showNotification(
    `🏷️ 「${escapeHtml(title.name)}」を装備しました。`
  );

  renderLocker();
  renderProfile();
  renderHome();
}

function renderLocker() {
  if (!currentPlayer) return;

  const titleContainer =
    $("locker-title-list");

  if (titleContainer) {
    const owned =
      ALL_TITLES.filter(
        t =>
          currentPlayer.unlockedTitles.includes(t.id)
      );

    titleContainer.innerHTML =
      owned.length
        ? owned.map(title => `
          <article class="rpg-generated-card">
            <div class="rpg-row">
              <strong>
                ${escapeHtml(title.name)}
              </strong>

              ${
                currentPlayer.title === title.name
                  ? `<span>装備中</span>`
                  : ""
              }
            </div>

            <small>
              ${escapeHtml(title.desc || "")}
            </small>

            ${
              currentPlayer.title !== title.name
                ? `
                  <button
                    type="button"
                    class="rpg-inline-button"
                    data-equip-title="${title.id}"
                  >
                    装備
                  </button>
                `
                : ""
            }
          </article>
        `).join("")
        : `<p class="empty-message">所持している称号はありません。</p>`;
  }

  const itemContainer =
    $("locker-item-list");

  if (itemContainer) {
    const ownedItems =
      SHOP_ITEMS.filter(
        item =>
          getItemQuantity(item.id) > 0
      );

    itemContainer.innerHTML =
      ownedItems.length
        ? ownedItems.map(item => `
          <article class="rpg-generated-card">
            <strong>
              ${escapeHtml(item.name)}
            </strong>

            <span>
              所持数: ${getItemQuantity(item.id)}
            </span>

            <small>
              ${escapeHtml(item.desc)}
            </small>
          </article>
        `).join("")
        : `
          <p class="empty-message">
            所持しているアイテムはありません。
          </p>
        `;
  }

  const outfitContainer =
    $("locker-outfit-list");

  if (outfitContainer) {
    outfitContainer.innerHTML =
      currentPlayer.backgrounds.length
        ? currentPlayer.backgrounds.map(id => {
            const bg =
              SHOP_BACKGROUNDS.find(
                b => b.id === id
              );

            return `
              <article class="rpg-generated-card">
                <strong>
                  ${escapeHtml(bg?.name || id)}
                </strong>

                ${
                  currentPlayer.currentBackground === id
                    ? `<span>使用中</span>`
                    : `
                      <button
                        type="button"
                        class="rpg-inline-button"
                        data-equip-background="${id}"
                      >
                        使用
                      </button>
                    `
                }
              </article>
            `;
          }).join("")
        : `
          <p class="empty-message">
            所持している背景はありません。
          </p>
        `;
  }
}

async function equipBackground(id) {
  if (!currentPlayer) return;

  if (!currentPlayer.backgrounds.includes(id)) {
    return;
  }

  currentPlayer.currentBackground =
    id;

  await savePlayer();

  applyBackground();

  renderLocker();
}

function applyBackground() {
  if (!currentPlayer) return;

  const bg =
    currentPlayer.currentBackground;

  document.body.dataset.rpgBackground =
    bg || "default";
}


// ============================================================
// PROFILE
// ============================================================

function renderProfile() {
  if (!currentPlayer) return;

  setText(
    "profile-display-name",
    currentPlayer.displayName
  );

  setText(
    "profile-user-id",
    currentPlayer.userId
  );

  setText(
    "profile-course",
    COURSE_NAMES[currentPlayer.course] ||
    "未定"
  );

  setText(
    "profile-level",
    calculateLevel(currentPlayer.xp)
  );

  setText(
    "profile-xp",
    currentPlayer.xp.toLocaleString()
  );

  setText(
    "profile-coins",
    currentPlayer.coins.toLocaleString()
  );

  setText(
    "profile-title",
    currentPlayer.title || "無名の冒険者"
  );

  setText(
    "profile-total-study-time",
    formatMinutes(currentPlayer.totalStudyMinutes)
  );

  setText(
    "profile-total-xp",
    `${currentPlayer.totalXpEarned.toLocaleString()} XP`
  );

  setText(
    "profile-total-coins",
    currentPlayer.totalCoinsEarned.toLocaleString()
  );

  setText(
    "profile-bosses-defeated",
    currentPlayer.bossStats.bossesDefeated
  );

  setText(
    "profile-quests-completed",
    currentPlayer.questState.questClaimedCount
  );

  const container =
    $("profile-subject-list");

  if (container) {
    container.innerHTML =
      currentPlayer.subjects.map(subject => `
        <div class="rpg-generated-card">
          <strong>
            ${escapeHtml(SUBJECT_NAMES[subject])}
          </strong>

          <span>
            Lv.${currentPlayer.subjectData[subject]?.level || 0}
          </span>
        </div>
      `).join("");
  }
}


// ============================================================
// SETTINGS
// ============================================================

function renderSettings() {
  if (!currentPlayer) return;

  const nameInput =
    $("settings-display-name");

  if (nameInput) {
    nameInput.value =
      currentPlayer.displayName || "";
  }

  document
    .querySelectorAll(
      '#settings-subject-selection input[name="settings-subjects"]'
    )
    .forEach(input => {
      input.checked =
        currentPlayer.subjects.includes(
          input.value
        );
    });
}

async function saveDisplayName(event) {
  event.preventDefault();

  const error =
    $("display-name-error");

  if (error) error.textContent = "";

  const value =
    $("settings-display-name")
      ?.value.trim();

  if (!value || value.length > 30) {
    if (error) {
      error.textContent =
        "1〜30文字で入力してください。";
    }

    return;
  }

  currentPlayer.displayName =
    value;

  await savePlayer();

  showNotification("表示名を変更しました。");

  renderAll();
}

async function saveSubjects(event) {
  event.preventDefault();

  const error =
    $("settings-subject-error");

  if (error) error.textContent = "";

  const subjects =
    [...document.querySelectorAll(
      '#settings-subject-selection input[name="settings-subjects"]:checked'
    )].map(input => input.value);

  if (!subjects.length) {
    if (error) {
      error.textContent =
        "1教科以上選択してください。";
    }

    return;
  }

  currentPlayer.subjects =
    subjects;

  for (const subject of subjects) {
    if (!currentPlayer.subjectData[subject]) {
      currentPlayer.subjectData[subject] = {
        studyMinutes: 0,
        level: 0
      };
    }
  }

  currentPlayer.questState.daily = [];
  currentPlayer.questState.weekly = null;

  ensureQuestState();

  await checkTitles();
  await savePlayer();

  showNotification("受験教科を保存しました。");

  renderAll();
}

async function changePassword(event) {
  event.preventDefault();

  const error =
    $("password-error");

  if (error) error.textContent = "";

  const password =
    $("settings-new-password")
      ?.value;

  if (!password || password.length < 6) {
    if (error) {
      error.textContent =
        "6文字以上で入力してください。";
    }

    return;
  }

  try {
    await updatePassword(
      currentFirebaseUser,
      password
    );

    $("settings-new-password").value = "";

    showNotification(
      "パスワードを変更しました。"
    );
  } catch (e) {
    console.error(e);

    if (error) {
      error.textContent =
        "変更できませんでした。再ログイン後にもう一度お試しください。";
    }
  }
}

async function deleteAccountHandler() {
  if (!currentFirebaseUser || !currentPlayer) {
    return;
  }

  const ok =
    window.confirm(
      "本当にアカウントを削除しますか？\nこの操作は取り消せません。"
    );

  if (!ok) return;

  try {
    await deleteDoc(
      doc(db, "users", currentFirebaseUser.uid)
    );

    await deleteUser(
      currentFirebaseUser
    );

    currentPlayer = null;
    currentFirebaseUser = null;

    showAuth();
  } catch (e) {
    console.error(e);

    showNotification(
      "アカウント削除に失敗しました。再ログインしてから再度お試しください。"
    );
  }
}


// ============================================================
// HEADER
// ============================================================

function renderHeader() {
  if (!currentPlayer) return;

  setText(
    "header-display-name",
    currentPlayer.displayName
  );

  setText(
    "header-level",
    `Lv.${calculateLevel(currentPlayer.xp)}`
  );

  setText(
    "header-rank",
    currentPlayer.rank
  );

  setText(
    "header-coins",
    `🪙 ${currentPlayer.coins.toLocaleString()}`
  );
}


// ============================================================
// LEGACY UI CLEANUP
// ============================================================

function hideLegacyUi() {
  const oldStatus =
    $("star-status");

  if (oldStatus) {
    oldStatus.remove();
  }

  const oldProfile =
    $("profile-stars");

  if (oldProfile) {
    const parent =
      oldProfile.closest("p");

    if (parent) {
      parent.remove();
    } else {
      oldProfile.remove();
    }
  }
}


// ============================================================
// MODALS
// ============================================================

function showLevelUpModal(oldLevel, newLevel) {
  setText(
    "level-up-old-level",
    oldLevel
  );

  setText(
    "level-up-new-level",
    newLevel
  );

  show("level-up-modal");
}

function showRewardModal(content) {
  const modal =
    $("reward-modal-content");

  if (modal) {
    modal.innerHTML =
      content;
  }

  show("reward-modal");
}

function showNotification(message) {
  const notification =
    $("notification");

  if (!notification) return;

  clearTimeout(notificationTimer);

  notification.innerHTML =
    message;

  notification.classList.remove("hidden");

  notificationTimer =
    setTimeout(() => {
      notification.classList.add("hidden");
    }, 3500);
}


// ============================================================
// EVENT DELEGATION
// ============================================================

function bindDelegatedEvents() {
  document.addEventListener("click", async event => {
    const claimButton =
      event.target.closest(
        "[data-claim-quest]"
      );

    if (claimButton) {
      await claimQuest(
        claimButton.dataset.questType,
        claimButton.dataset.claimQuest
      );

      return;
    }

    const buyItem =
      event.target.closest(
        "[data-buy-item]"
      );

    if (buyItem) {
      await buyShopItem(
        buyItem.dataset.buyItem
      );

      return;
    }

    const buyTitle =
      event.target.closest(
        "[data-buy-title]"
      );

    if (buyTitle) {
      await buyShopTitle(
        buyTitle.dataset.buyTitle
      );

      return;
    }

    const buyBackground =
      event.target.closest(
        "[data-buy-background]"
      );

    if (buyBackground) {
      await buyBackground(
        buyBackground.dataset.buyBackground
      );

      return;
    }

    const equipTitleButton =
      event.target.closest(
        "[data-equip-title]"
      );

    if (equipTitleButton) {
      await equipTitle(
        equipTitleButton.dataset.equipTitle
      );

      return;
    }

    const equipBackgroundButton =
      event.target.closest(
        "[data-equip-background]"
      );

    if (equipBackgroundButton) {
      await equipBackground(
        equipBackgroundButton.dataset.equipBackground
      );

      return;
    }

    const requestButton =
      event.target.closest(
        "[data-request-action]"
      );

    if (requestButton) {
      const action =
        requestButton.dataset.requestAction;

      const id =
        requestButton.dataset.requestId;

      try {
        if (action === "accept-party") {
          await acceptPartyRequest({
            id,
            partyId:
              requestButton.dataset.partyId
          });
        }

        if (action === "accept-friend") {
          await acceptFriendRequest(
            id,
            requestButton.dataset.fromUid
          );
        }

        if (action === "decline") {
          await declineRequest(id);
        }

        renderParty();

        showNotification(
          action === "decline"
            ? "申請を拒否しました。"
            : "申請を処理しました。"
        );
      } catch (e) {
        console.error(e);
        showNotification(
          e.message ||
          "申請処理に失敗しました。"
        );
      }

      return;
    }

    const leave =
      event.target.closest(
        "[data-party-leave]"
      );

    if (leave) {
      try {
        await leaveParty();
      } catch (e) {
        console.error(e);

        showNotification(
          "パーティー脱退に失敗しました。"
        );
      }
    }

    const otherButton =
      event.target.closest(
        "[data-open-other-tab]"
      );

    if (otherButton) {
      switchOtherTab(
        otherButton.dataset.openOtherTab
      );
    }
  });
}


// ============================================================
// TAB EVENTS
// ============================================================

function bindTabs() {
  document
    .querySelectorAll("[data-quest-tab]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          switchQuestTab(
            button.dataset.questTab
          )
      );
    });

  document
    .querySelectorAll("[data-party-tab]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          switchPartyTab(
            button.dataset.partyTab
          )
      );
    });

  document
    .querySelectorAll("[data-rank-tab]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          switchRankTab(
            button.dataset.rankTab
          )
      );
    });

  document
    .querySelectorAll("[data-ranking-type]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          switchRankingType(
            button.dataset.rankingType
          )
      );
    });

  document
    .querySelectorAll("[data-other-tab]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          switchOtherTab(
            button.dataset.otherTab
          )
      );
    });
}


// ============================================================
// FORMS / BUTTONS
// ============================================================

function bindForms() {
  $("login-form")
    ?.addEventListener(
      "submit",
      handleLogin
    );

  $("register-form")
    ?.addEventListener(
      "submit",
      handleRegister
    );

  $("show-register-button")
    ?.addEventListener(
      "click",
      showRegisterScreen
    );

  $("show-login-button")
    ?.addEventListener(
      "click",
      showLoginScreen
    );

  $("logout-button")
    ?.addEventListener(
      "click",
      async () => {
        await signOut(auth);
      }
    );

  $("study-record-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const error =
          $("study-error");

        if (error) error.textContent = "";

        try {
          await recordStudy(
            Number(
              $("study-minutes")?.value
            ),
            $("study-subject")?.value,
            $("study-note")?.value,
            "manual"
          );

          $("study-minutes").value = "";
          $("study-note").value = "";
        } catch (e) {
          console.error(e);

          if (error) {
            error.textContent =
              e.message ||
              "記録に失敗しました。";
          }
        }
      }
    );

  $("party-invite-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const error =
          $("party-error");

        if (error) error.textContent = "";

        try {
          await inviteToParty(
            $("party-invite-user-id")
              ?.value || ""
          );

          $("party-invite-user-id").value = "";

          showNotification(
            "パーティー招待を送信しました。"
          );

          renderParty();
        } catch (e) {
          console.error(e);

          if (error) {
            error.textContent =
              e.message ||
              "招待に失敗しました。";
          }
        }
      }
    );

  $("display-name-form")
    ?.addEventListener(
      "submit",
      saveDisplayName
    );

  $("subject-settings-form")
    ?.addEventListener(
      "submit",
      saveSubjects
    );

  $("password-form")
    ?.addEventListener(
      "submit",
      changePassword
    );

  $("delete-account-button")
    ?.addEventListener(
      "click",
      deleteAccountHandler
    );

  $("study-timer-start")
    ?.addEventListener(
      "click",
      startTimer
    );

  $("study-timer-pause")
    ?.addEventListener(
      "click",
      pauseTimer
    );

  $("study-timer-reset")
    ?.addEventListener(
      "click",
      resetTimer
    );

  $("timer-save-button")
    ?.addEventListener(
      "click",
      async () => {
        try {
          await saveTimerStudy();
        } catch (e) {
          console.error(e);
          showNotification(
            "タイマー記録に失敗しました。"
          );
        }
      }
    );

  $("boss-refresh-button")
    ?.addEventListener(
      "click",
      async () => {
        await renderBoss();

        showNotification(
          "ボス情報を更新しました。"
        );
      }
    );

  $("level-up-close-button")
    ?.addEventListener(
      "click",
      () => hide("level-up-modal")
    );

  $("reward-close-button")
    ?.addEventListener(
      "click",
      () => hide("reward-modal")
    );
}


// ============================================================
// COMMON RENDER
// ============================================================

function renderAll() {
  if (!currentPlayer) return;

  renderHeader();
  renderHome();
  renderStudy();
  renderQuest();
  renderRank();
  renderOther();

  // 非同期
  renderParty();
  renderBoss();
}


// ============================================================
// CLOCK
// ============================================================

setInterval(() => {
  if (!currentPlayer) return;

  updateTimerDisplay();

  setText(
    "current-season-time",
    getSeasonCountdown()
  );
}, 1000);


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
  auth,
  async firebaseUser => {
    currentFirebaseUser =
      firebaseUser;

    if (!firebaseUser) {
      currentPlayer = null;

      showAuth();

      return;
    }

    try {
      currentPlayer =
        await loadPlayer(firebaseUser);

      currentPlayer =
        normalizePlayer(currentPlayer);

      await handleSeasonRollover();

      // 今日の日付更新
      if (
        currentPlayer.todayDate !==
        japanDateKey()
      ) {
        currentPlayer.todayDate =
          japanDateKey();

        currentPlayer.todayStudyMinutes = 0;
        currentPlayer.todayXp = 0;
        currentPlayer.todayCoins = 0;
      }

      ensureQuestState();

      await processLogin();

      await checkTitles();
      await checkAchievements();

      await savePlayer();

      applyBackground();

      hideLegacyUi();

      showMainApp();

      renderAll();
    } catch (e) {
      console.error(
        "AUTH STATE ERROR:",
        e
      );

      showAuth();

      showNotification(
        "データの読み込みに失敗しました。"
      );
    }
  }
);


// ============================================================
// INITIALIZE
// ============================================================

function init() {
  // 起動時にアプリ画面を安全に初期化
  for (const id of APP_SCREEN_IDS) {
    const screen = $(id);

    if (screen) {
      screen.classList.toggle(
        "hidden",
        id !== "home-screen"
      );
    }
  }

  // 認証画面は最初から存在する
  show("auth-screen");
  hide("main-app");

  showLoginScreen();

  hideLegacyUi();

  bindNavigation();
  bindTabs();
  bindForms();
  bindDelegatedEvents();

  // ランタイムCSS
  injectRuntimeStyle();
}

function injectRuntimeStyle() {
  if ($("rpg-runtime-style")) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "rpg-runtime-style";

  style.textContent = `
    .rpg-generated-card {
      margin: 10px 0;
      padding: 14px;
      border-radius: 12px;
      background: var(--bg-card, rgba(255,255,255,.04));
      border: 1px solid rgba(255,255,255,.08);
    }

    .rpg-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .rpg-small {
      margin-top: 6px;
      opacity: .75;
      font-size: .9em;
    }

    .rpg-progress {
      width: 100%;
      height: 8px;
      margin: 8px 0;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255,255,255,.08);
    }

    .rpg-progress-fill {
      height: 100%;
      border-radius: inherit;
      background: currentColor;
      transition: width .25s ease;
    }

    .rpg-inline-button {
      margin-top: 10px;
    }

    .rpg-status {
      display: inline-block;
      margin-top: 8px;
      opacity: .7;
    }

    .rpg-screen-enter {
      animation: rpgScreenEnter .22s ease;
    }

    @keyframes rpgScreenEnter {
      from {
        opacity: .4;
        transform: translateY(5px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .rpg-leave-party {
      margin-top: 12px;
    }
  `;

  document.head.appendChild(style);
}


// ============================================================
// GLOBAL API
// ============================================================

window.RPG = {
  getPlayer: () => currentPlayer,

  recordStudy,

  startTimer,
  pauseTimer,
  resetTimer,

  showAppScreen,

  claimQuest,

  leaveParty,

  equipTitle,
  equipBackground,

  buyShopItem,
  buyShopTitle,
  buyBackground,

  renderAll
};


// ============================================================
// START
// ============================================================

init();
