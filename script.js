// ============================================================
// 受験RPG - script.js COMPLETE EDITION
// Firebase / XP / Lv100 / Monthly Rank / Quests
// Titles / Achievements / Shop / Boss / Party / Timer / UI
//
// IMPORTANT:
// - Star system: COMPLETELY REMOVED
// - Party maximum: 4
// - Monthly season
// - Legend: 150h
// - Legend permanent XP multiplier: 1.5x
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ============================================================
// Firebase
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

let firebaseApp = null;
let auth = null;
let db = null;

let currentUser = null;
let currentPlayer = null;

let booted = false;
let authObserverStarted = false;
let studyRecordBusy = false;

let timerInterval = null;


// ============================================================
// Timer State
// ============================================================

const timerState = {
  running: false,
  startedAt: null,
  accumulatedSeconds: 0,

  lastJapanDate: null,

  segmentStartedAt: null,
  segmentJapanDate: null,

  midnightBusy: false,

  subject: null
};


// ============================================================
// Subjects
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

const ALL_SUBJECT_IDS = Object.keys(
  SUBJECT_NAMES
);


// ============================================================
// Rank
// ============================================================

const RANKS = [
  {
    name: "Bronze",
    minMinutes: 0
  },
  {
    name: "Silver",
    minMinutes: 600
  },
  {
    name: "Gold",
    minMinutes: 1500
  },
  {
    name: "Platinum",
    minMinutes: 2700
  },
  {
    name: "Diamond",
    minMinutes: 4200
  },
  {
    name: "Master",
    minMinutes: 6000
  },
  {
    name: "Grandmaster",
    minMinutes: 7500
  },
  {
    name: "Legend",
    minMinutes: 9000
  }
];


// ============================================================
// Quest Rewards
// ============================================================

const QUEST_REWARDS = {
  dailyXp: 20,
  dailyCoins: 30,

  weeklyXp: 70,
  weeklyCoins: 70,

  rareXp: 100,
  rareCoins: 500
};

const DAILY_QUEST_COUNT = 3;
const DAILY_QUEST_MINUTES = 20;
const WEEKLY_QUEST_MINUTES = 100;
const RARE_QUEST_MINUTES = 180;


// ============================================================
// Login Rewards
// ============================================================

const LOGIN_REWARDS = {
  first: {
    coins: 50,
    xp: 20
  },

  normal: {
    coins: 20,
    xp: 0
  },

  streak3: {
    coins: 50,
    xp: 20
  },

  streak7: {
    coins: 100,
    xp: 50
  },

  streak30: {
    coins: 300,
    xp: 100
  }
};


// ============================================================
// Titles
// ============================================================

const TITLES = [
  {
    id: "beginner",
    name: "見習い受験生",
    description: "冒険を始めた者に与えられる称号。",
    price: 0,
    hidden: false
  },

  {
    id: "first-study",
    name: "第一歩",
    description: "累計1時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "effort-5h",
    name: "努力の芽",
    description: "累計5時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "ten-hours",
    name: "継続者",
    description: "累計10時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "twenty-hours",
    name: "勉強家",
    description: "累計20時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "thirty-hours",
    name: "努力の証",
    description: "累計30時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "fifty-hours",
    name: "受験戦士",
    description: "累計50時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "hundred-hours",
    name: "百時間突破",
    description: "累計100時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "one-fifty-hours",
    name: "学問の探求者",
    description: "累計150時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "two-hundred-hours",
    name: "勉強の鬼",
    description: "累計200時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "three-hundred-hours",
    name: "修行僧",
    description: "累計300時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "five-hundred-hours",
    name: "受験の猛者",
    description: "累計500時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "seven-fifty-hours",
    name: "不屈の学習者",
    description: "累計750時間勉強した。",
    price: 0,
    hidden: false
  },

  {
    id: "thousand-hours",
    name: "受験覇者",
    description: "累計1000時間勉強した。",
    price: 0,
    hidden: false
  },

  // ----------------------------------------------------------
  // Level Titles
  // ----------------------------------------------------------

  {
    id: "level-10",
    name: "レベル10到達者",
    description: "Lv.10に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-20",
    name: "レベル20到達者",
    description: "Lv.20に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-30",
    name: "レベル30到達者",
    description: "Lv.30に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-40",
    name: "レベル40到達者",
    description: "Lv.40に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-50",
    name: "レベル50到達者",
    description: "Lv.50に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-60",
    name: "レベル60到達者",
    description: "Lv.60に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-70",
    name: "レベル70到達者",
    description: "Lv.70に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-80",
    name: "レベル80到達者",
    description: "Lv.80に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-90",
    name: "レベル90到達者",
    description: "Lv.90に到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "level-100",
    name: "受験RPGの覇者",
    description: "Lv.100に到達した。",
    price: 0,
    hidden: false
  },

  // ----------------------------------------------------------
  // Rank Titles
  // ----------------------------------------------------------

  {
    id: "silver-proof",
    name: "Silverの証",
    description: "Silverランクに到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "gold-proof",
    name: "Goldの証",
    description: "Goldランクに到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "platinum-proof",
    name: "Platinumの証",
    description: "Platinumランクに到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "diamond-proof",
    name: "Diamondの証",
    description: "Diamondランクに到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "master-proof",
    name: "Masterの証",
    description: "Masterランクに到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "grandmaster-proof",
    name: "Grandmasterの証",
    description: "Grandmasterランクに到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "legend-proof",
    name: "伝説への挑戦者",
    description: "Legendランクに到達した。",
    price: 0,
    hidden: false
  },

  {
    id: "legend-season",
    name: "伝説の受験生",
    description: "Legendをシーズン終了まで維持した。",
    price: 0,
    hidden: false
  },

  // ----------------------------------------------------------
  // Quest Titles
  // ----------------------------------------------------------

  {
    id: "quest-first",
    name: "初クエスト達成",
    description: "初めてクエストを達成した。",
    price: 0,
    hidden: false
  },

  {
    id: "quest-10",
    name: "クエストハンター",
    description: "クエストを10個達成した。",
    price: 0,
    hidden: false
  },

  {
    id: "quest-50",
    name: "クエストマスター",
    description: "クエストを50個達成した。",
    price: 0,
    hidden: false
  },

  {
    id: "daily-complete",
    name: "完遂者",
    description: "デイリー3個を1日で全達成した。",
    price: 0,
    hidden: false
  },

  // ----------------------------------------------------------
  // Streak Titles
  // ----------------------------------------------------------

  {
    id: "streak-7-title",
    name: "一週間の努力",
    description: "7日連続ログインした。",
    price: 0,
    hidden: false
  },

  {
    id: "streak-14-title",
    name: "習慣の力",
    description: "14日連続ログインした。",
    price: 0,
    hidden: false
  },

  {
    id: "streak-30-title",
    name: "継続の達人",
    description: "30日連続ログインした。",
    price: 0,
    hidden: false
  },

  // ----------------------------------------------------------
  // Boss / Party Titles
  // ----------------------------------------------------------

  {
    id: "rare-first",
    name: "限界突破",
    description: "レアクエストを初達成した。",
    price: 0,
    hidden: false
  },

  {
    id: "boss-first",
    name: "ボス初討伐",
    description: "初めてボス討伐に参加した。",
    price: 0,
    hidden: false
  },

  {
    id: "damage-dealer",
    name: "ダメージディーラー",
    description: "ボス戦で大きく貢献した。",
    price: 0,
    hidden: false
  },

  {
    id: "mvp",
    name: "MVP",
    description: "ボス戦MVPを獲得した。",
    price: 0,
    hidden: false
  },

  {
    id: "weakness-breaker",
    name: "弱点粉砕者",
    description: "弱点教科で大ダメージを与えた。",
    price: 0,
    hidden: false
  },

  {
    id: "party-player",
    name: "パーティプレイヤー",
    description: "パーティに参加した。",
    price: 0,
    hidden: false
  },

  {
    id: "party-boss",
    name: "仲間との戦い",
    description: "パーティでボスを討伐した。",
    price: 0,
    hidden: false
  },

  // ----------------------------------------------------------
  // Subject Titles
  // ----------------------------------------------------------

  {
    id: "all-subject-lv10",
    name: "全教科制覇",
    description: "登録教科すべてLv.10以上。",
    price: 0,
    hidden: false
  },

  {
    id: "one-subject-lv50",
    name: "一芸の達人",
    description: "1教科Lv.50。",
    price: 0,
    hidden: false
  },

  {
    id: "three-subject-lv30",
    name: "万能型受験生",
    description: "3教科Lv.30以上。",
    price: 0,
    hidden: false
  },

  {
    id: "all-subject-lv100",
    name: "完全制覇",
    description: "全登録教科Lv.100。",
    price: 0,
    hidden: false
  },

  // ----------------------------------------------------------
  // Hidden Titles
  // ----------------------------------------------------------

  {
    id: "hidden-midnight",
    name: "深夜の亡霊",
    description: "深夜帯に勉強記録を残した。",
    price: 0,
    hidden: true
  },

  {
    id: "hidden-comeback",
    name: "不屈",
    description: "途切れた後に再び連続ログインを開始した。",
    price: 0,
    hidden: true
  },

  {
    id: "hidden-speed",
    name: "電光石火",
    description: "1日に3時間勉強した。",
    price: 0,
    hidden: true
  },

  {
    id: "hidden-early",
    name: "朝焼けの冒険者",
    description: "早朝に勉強記録を残した。",
    price: 0,
    hidden: true
  },

  // ----------------------------------------------------------
  // Secret Titles
  // ----------------------------------------------------------

  {
    id: "secret-1",
    name: "静かなる努力家",
    description: "1日に120分以上勉強した。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-2",
    name: "不屈の意志",
    description: "7日以上の連続ログインを維持した。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-3",
    name: "止まらない者",
    description: "1日の勉強時間が4時間を突破した。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-4",
    name: "修羅の道",
    description: "1日に5時間勉強した。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-5",
    name: "完璧主義者",
    description: "デイリークエストを14日連続で全達成した。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-6",
    name: "切り札",
    description: "弱点教科で大きなボス貢献を達成した。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-7",
    name: "最後の一押し",
    description: "ボスの残りHPを自分の貢献で0にした。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-8",
    name: "隠された才能",
    description: "1教科を短期間で10Lv以上成長させた。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-9",
    name: "伝説を超えし者",
    description: "Legend到達後も300時間以上研鑽を続けた。",
    price: 0,
    hidden: true
  },

  {
    id: "secret-10",
    name: "アリ得ない知能",
    description: "全教科を選択し学習記録した。",
    price: 0,
    hidden: true
  }
];


// ============================================================
// Achievements
// ============================================================

const ACHIEVEMENTS = [
  ["first-study", "はじめの一歩", "初めて勉強を記録する。", 50],
  ["study-10h", "10時間突破", "累計10時間勉強する。", 100],
  ["study-50h", "50時間突破", "累計50時間勉強する。", 250],
  ["study-100h", "100時間突破", "累計100時間勉強する。", 500],

  ["level-10", "冒険者Lv.10", "Lv.10に到達する。", 100],
  ["level-50", "熟練冒険者", "Lv.50に到達する。", 500],
  ["level-100", "限界突破", "Lv.100に到達する。", 1000],

  ["rank-gold", "GOLD到達", "Goldランクに到達する。", 100],
  ["rank-platinum", "PLATINUM到達", "Platinumランクに到達する。", 200],
  ["rank-diamond", "DIAMOND到達", "Diamondランクに到達する。", 300],
  ["rank-master", "MASTER到達", "Masterランクに到達する。", 500],
  ["rank-legend", "LEGEND到達", "Legendランクに到達する。", 1000],

  ["streak-3", "三日坊主卒業", "3日連続ログインする。", 100],
  ["streak-7", "一週間の戦士", "7日連続ログインする。", 250],
  ["streak-30", "習慣の化身", "30日連続ログインする。", 1000]
].map(
  ([id, title, description, rewardCoins]) => ({
    id,
    title,
    description,
    rewardCoins
  })
);


// ============================================================
// Shop
// ============================================================

const SHOP_ITEMS = [

  // ----------------------------------------------------------
  // XP Buffs
  // ----------------------------------------------------------

  {
    id: "xp-boost-10",
    name: "禁断の経験値核・I",
    description: "次の10分間、獲得XPが1.25倍。",
    price: 300,
    type: "xpBoost",
    value: 1.25,
    durationMinutes: 10
  },

  {
    id: "xp-boost-30",
    name: "魔導経験値炉・II",
    description: "次の30分間、獲得XPが1.5倍。",
    price: 800,
    type: "xpBoost",
    value: 1.5,
    durationMinutes: 30
  },

  {
    id: "xp-boost-60",
    name: "覚醒の賢者石・III",
    description: "次の60分間、獲得XPが1.75倍。",
    price: 1800,
    type: "xpBoost",
    value: 1.75,
    durationMinutes: 60
  },

  {
    id: "xp-boost-120",
    name: "神域の経験核・IV",
    description: "次の120分間、獲得XPが2倍。",
    price: 4000,
    type: "xpBoost",
    value: 2,
    durationMinutes: 120
  },


  // ----------------------------------------------------------
  // Boss Damage Buffs
  // ----------------------------------------------------------

  {
    id: "boss-dmg-25",
    name: "破邪の刃",
    description: "次のボス攻撃のダメージが1.25倍。",
    price: 400,
    type: "bossDamage",
    value: 1.25
  },

  {
    id: "boss-dmg-50",
    name: "竜殺しの紋章",
    description: "次のボス攻撃のダメージが1.5倍。",
    price: 1000,
    type: "bossDamage",
    value: 1.5
  },

  {
    id: "boss-dmg-100",
    name: "終焉の魔剣",
    description: "次のボス攻撃のダメージが2倍。",
    price: 2500,
    type: "bossDamage",
    value: 2
  },

  {
    id: "boss-dmg-200",
    name: "世界断罪の一撃",
    description: "次のボス攻撃のダメージが3倍。",
    price: 6000,
    type: "bossDamage",
    value: 3
  },


  // ----------------------------------------------------------
  // Boss HP Down
  // ----------------------------------------------------------

  {
    id: "boss-down-10",
    name: "封印解除・弱体Ⅰ",
    description: "現在のボス最大HPを10%減少させる。",
    price: 500,
    type: "bossLevelDown",
    value: 0.9
  },

  {
    id: "boss-down-20",
    name: "封印解除・弱体Ⅱ",
    description: "現在のボス最大HPを20%減少させる。",
    price: 1200,
    type: "bossLevelDown",
    value: 0.8
  },

  {
    id: "boss-down-30",
    name: "封印解除・弱体Ⅲ",
    description: "現在のボス最大HPを30%減少させる。",
    price: 2500,
    type: "bossLevelDown",
    value: 0.7
  },

  {
    id: "boss-down-50",
    name: "神殺しの禁呪",
    description: "現在のボス最大HPを50%減少させる。",
    price: 5000,
    type: "bossLevelDown",
    value: 0.5
  },


  // ----------------------------------------------------------
  // Shop Titles
  // ----------------------------------------------------------

  {
    id: "shop-title-1",
    name: "異端の受験者",
    description: "ショップ限定称号。",
    price: 500,
    type: "title",
    target: "shop-title-1"
  },

  {
    id: "shop-title-2",
    name: "覚醒者",
    description: "ショップ限定称号。",
    price: 800,
    type: "title",
    target: "shop-title-2"
  },

  {
    id: "shop-title-3",
    name: "深淵を覗く者",
    description: "ショップ限定称号。",
    price: 1200,
    type: "title",
    target: "shop-title-3"
  },

  {
    id: "shop-title-4",
    name: "魔導学徒",
    description: "ショップ限定称号。",
    price: 1600,
    type: "title",
    target: "shop-title-4"
  },

  {
    id: "shop-title-5",
    name: "限界突破者",
    description: "ショップ限定称号。",
    price: 2200,
    type: "title",
    target: "shop-title-5"
  },

  {
    id: "shop-title-6",
    name: "禁断の知識人",
    description: "ショップ限定称号。",
    price: 3000,
    type: "title",
    target: "shop-title-6"
  },

  {
    id: "shop-title-7",
    name: "試験場の覇者",
    description: "ショップ限定称号。",
    price: 4000,
    type: "title",
    target: "shop-title-7"
  },

  {
    id: "shop-title-8",
    name: "運命を喰らう者",
    description: "ショップ限定称号。",
    price: 5500,
    type: "title",
    target: "shop-title-8"
  },

  {
    id: "shop-title-9",
    name: "賢者の末裔",
    description: "ショップ限定称号。",
    price: 7000,
    type: "title",
    target: "shop-title-9"
  },

  {
    id: "shop-title-10",
    name: "受験界の災厄",
    description: "ショップ限定称号。",
    price: 9000,
    type: "title",
    target: "shop-title-10"
  },

  {
    id: "shop-title-11",
    name: "神域の学習者",
    description: "ショップ限定称号。",
    price: 12000,
    type: "title",
    target: "shop-title-11"
  },

  {
    id: "shop-title-12",
    name: "合格の向こう側",
    description: "ショップ限定称号。",
    price: 15000,
    type: "title",
    target: "shop-title-12"
  },


  // ----------------------------------------------------------
  // Backgrounds
  // ----------------------------------------------------------

  {
    id: "bg-abyss",
    name: "背景：深淵の書庫",
    description: "プロフィール背景を解放。",
    price: 1500,
    type: "background",
    target: "abyss"
  },

  {
    id: "bg-royal",
    name: "背景：王城の試験場",
    description: "プロフィール背景を解放。",
    price: 3000,
    type: "background",
    target: "royal"
  },

  {
    id: "bg-cosmic",
    name: "背景：星海の知識庫",
    description: "プロフィール背景を解放。",
    price: 6000,
    type: "background",
    target: "cosmic"
  }
];


// Add shop titles to title database.

for (const item of SHOP_ITEMS) {

  if (item.type !== "title") {
    continue;
  }

  if (
    !TITLES.some(
      title => title.id === item.target
    )
  ) {
    TITLES.push({
      id: item.target,
      name: item.name,
      description: item.description,
      price: item.price,
      hidden: false
    });
  }
}


// ============================================================
// Boss
// ============================================================

const BOSS_DEFAULTS = {
  maxHp: 10000,
  hp: 10000,

  active: true,
  weaknessSubject: null,

  startedAt: null,
  endsAt: null,

  defeated: false,

  level: 1
};


// ============================================================
// DOM Helpers
// ============================================================

const $ = id =>
  document.getElementById(id);

const setText = (
  id,
  value
) => {

  const element = $(id);

  if (element) {
    element.textContent = value;
  }
};

const showElement = id => {

  const element = $(id);

  if (!element) {
    return;
  }

  element.classList.remove("hidden");

  element.style.display = "";
};

const hideElement = id => {

  const element = $(id);

  if (!element) {
    return;
  }

  element.classList.add("hidden");

  element.style.display = "none";
};

const escapeHtml = value =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const showError = (
  id,
  message
) => {
  setText(id, message);
};

const clearError = id =>
  setText(id, "");


// ============================================================
// Japan Time
// ============================================================

function getJapanDateString(
  date = new Date()
) {

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  )
    .format(date)
    .replaceAll("/", "-");
}


function getJapanMonthString(
  date = new Date()
) {

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit"
      }
    ).formatToParts(date);

  const year =
    parts.find(
      x => x.type === "year"
    )?.value;

  const month =
    parts.find(
      x => x.type === "month"
    )?.value;

  return `${year}-${month}`;
}


function getJapanHour(
  date = new Date()
) {

  return Number(
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        hour12: false
      }
    ).format(date)
  );
}


function japanMidnightTimestamp(
  dateString
) {

  return new Date(
    `${dateString}T00:00:00+09:00`
  ).getTime();
}


function formatMinutes(
  minutes
) {

  const value =
    Math.max(
      0,
      Math.floor(
        Number(minutes) || 0
      )
    );

  const hours =
    Math.floor(
      value / 60
    );

  const mins =
    value % 60;

  if (hours) {
    return `${hours}時間 ${mins}分`;
  }

  return `${mins}分`;
}


function formatDateTime(
  timestamp
) {

  if (!timestamp) {
    return "";
  }

  let date = null;

  if (
    typeof timestamp.toDate ===
    "function"
  ) {
    date = timestamp.toDate();
  }
  else if (
    timestamp instanceof Date
  ) {
    date = timestamp;
  }
  else if (
    typeof timestamp === "string"
  ) {
    date = new Date(timestamp);
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}


function getJapanWeekId(
  date = new Date()
) {

  const [
    year,
    month,
    day
  ] =
    getJapanDateString(date)
      .split("-")
      .map(Number);

  const utc =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  const weekday =
    utc.getUTCDay();

  utc.setUTCDate(
    utc.getUTCDate() +
    (
      weekday === 0
        ? -6
        : 1 - weekday
    )
  );

  return (
    `${utc.getUTCFullYear()}-` +
    `${String(
      utc.getUTCMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      utc.getUTCDate()
    ).padStart(2, "0")}`
  );
}


function getDaysBetweenJapanDates(
  a,
  b
) {

  const diff =
    japanMidnightTimestamp(b) -
    japanMidnightTimestamp(a);

  return Math.round(
    diff / 86400000
  );
}


// ============================================================
// Firebase Error
// ============================================================

function firebaseErrorMessage(error) {

  console.error(error);

  const messages = {

    "auth/invalid-credential":
      "ユーザーIDまたはパスワードが正しくありません。",

    "auth/wrong-password":
      "ユーザーIDまたはパスワードが正しくありません。",

    "auth/user-not-found":
      "ユーザーが見つかりません。",

    "auth/email-already-in-use":
      "そのユーザーIDはすでに使用されています。",

    "auth/weak-password":
      "パスワードは6文字以上にしてください。",

    "auth/invalid-email":
      "ユーザーIDの形式が正しくありません。",

    "auth/too-many-requests":
      "試行回数が多すぎます。",

    "auth/network-request-failed":
      "ネットワークエラーが発生しました。",

    "permission-denied":
      "Firestoreの権限がありません。"
  };

  return (
    messages[error?.code] ||
    `エラーが発生しました。\n${
      error?.message ||
      error?.code ||
      ""
    }`
  );
}


// ============================================================
// User / Course
// ============================================================

function normalizeUserId(
  value
) {

  return String(value || "")
    .trim()
    .toLowerCase();
}


function userIdToEmail(
  userId
) {

  return (
    `${normalizeUserId(userId)}` +
    `@juken-rpg.local`
  );
}


function getCourseName(
  course
) {

  return {
    science: "理系",
    humanities: "文系",
    undecided: "未定"
  }[course] || "未定";
}


function getSubjectName(
  subject
) {

  return (
    SUBJECT_NAMES[subject] ||
    subject ||
    "その他"
  );
}


// ============================================================
// XP / Level
// ============================================================

function xpRequiredForLevel(
  level
) {

  if (level >= 100) {
    return 0;
  }

  return (
    100 +
    Math.floor(
      (level - 1) / 10
    ) * 50
  );
}


function totalXpForLevel(
  level
) {

  let total = 0;

  for (
    let i = 1;
    i < level;
    i++
  ) {
    total +=
      xpRequiredForLevel(i);
  }

  return total;
}


function calculateLevel(
  xp
) {

  const value =
    Math.max(
      0,
      Math.floor(
        Number(xp) || 0
      )
    );

  let level = 1;

  while (
    level < 100 &&
    value >=
      totalXpForLevel(
        level + 1
      )
  ) {
    level++;
  }

  return level;
}


function getLevelProgress(
  xp
) {

  const level =
    calculateLevel(xp);

  if (level >= 100) {

    return {
      level: 100,
      current: 0,
      required: 0,
      percent: 100
    };
  }

  const start =
    totalXpForLevel(level);

  const next =
    totalXpForLevel(
      level + 1
    );

  const required =
    next - start;

  return {
    level,

    current:
      Math.max(
        0,
        xp - start
      ),

    required,

    percent:
      Math.max(
        0,
        Math.min(
          100,
          (
            (xp - start) /
            required
          ) * 100
        )
      )
  };
}


// ============================================================
// Rank
// ============================================================

function calculateRank(
  minutes
) {

  const value =
    Math.max(
      0,
      Math.floor(
        Number(minutes) || 0
      )
    );

  let rank = "Bronze";

  for (
    const item of RANKS
  ) {

    if (
      value >= item.minMinutes
    ) {
      rank = item.name;
    }
  }

  return rank;
}


function getRankInfo(
  rank
) {

  return (
    RANKS.find(
      item =>
        item.name === rank
    ) ||
    RANKS[0]
  );
}


function getRankIndex(
  rank
) {

  const index =
    RANKS.findIndex(
      item =>
        item.name === rank
    );

  return Math.max(
    0,
    index
  );
}


// ============================================================
// Default Player
// ============================================================

function createDefaultPlayerData(
  userId = ""
) {

  const seasonId =
    getJapanMonthString();

  return {

    uid: "",

    userId,

    displayName:
      userId ||
      "プレイヤー",

    course: "undecided",

    subjects: [],


    // -----------------------------
    // XP
    // -----------------------------

    xp: 0,

    level: 1,


    // -----------------------------
    // Currency
    // -----------------------------

    coins: 0,


    // -----------------------------
    // Study
    // -----------------------------

    totalStudyMinutes: 0,

    todayStudyMinutes: 0,

    todayStudyDate:
      getJapanDateString(),

    todayXp: 0,

    todayCoins: 0,


    // -----------------------------
    // Season
    // -----------------------------

    seasonId,

    seasonStartDate:
      `${seasonId}-01`,

    seasonStudyMinutes: 0,

    rank: "Bronze",

    lastSeasonRank: null,

    lastSeasonStudyMinutes: 0,

    seasonHistory: [],


    // -----------------------------
    // Legend
    // -----------------------------

    permanentLegendBoost: false,


    // -----------------------------
    // Subject
    // -----------------------------

    subjectLevels: {},

    subjectStudyMinutes: {},

    subjectHistory: {},


    // -----------------------------
    // History
    // -----------------------------

    studyHistory: [],


    // -----------------------------
    // Quests
    // -----------------------------

    questState: null,

    questClaimedCount: 0,

    dailyFullClearStreak: 0,

    lastDailyFullClearDate: null,


    // -----------------------------
    // Login
    // -----------------------------

    loginStreak: 0,

    lastLoginDate: null,

    loginRewardDate: null,


    // -----------------------------
    // Titles
    // -----------------------------

    title: "見習い受験生",

    unlockedTitles: [
      "beginner"
    ],


    // -----------------------------
    // Achievements
    // -----------------------------

    achievements: {},


    // -----------------------------
    // Shop
    // -----------------------------

    purchasedItems: {},

    inventory: {},

    activeBoosts: {

      xp: [],

      bossDamage: []
    },


    // -----------------------------
    // Background
    // -----------------------------

    background: "default",


    // -----------------------------
    // Boss
    // -----------------------------

    boss: {

      contribution: 0,

      damage: 0,

      battles: 0,

      mvpCount: 0,

      weaknessDamage: 0
    },

    bossData: null,


    // -----------------------------
    // Party
    // -----------------------------

    partyId: null,

    partyRole: null,

    partyMembers: [],


    // -----------------------------
    // Meta
    // -----------------------------

    createdAt: null,

    updatedAt: null
  };
}


// ============================================================
// Player Normalization
// ============================================================

function normalizePlayer(
  player,
  user
) {

  const base =
    createDefaultPlayerData(
      normalizeUserId(
        player?.userId ||
        user?.email?.split("@")[0] ||
        ""
      )
    );

  const p = {
    ...base,
    ...(player || {})
  };

  p.uid =
    p.uid ||
    user?.uid ||
    "";

  p.userId =
    p.userId ||
    normalizeUserId(
      user?.email?.split("@")[0]
    );

  p.displayName =
    p.displayName ||
    p.userId ||
    "プレイヤー";


  if (
    !Array.isArray(p.subjects)
  ) {
    p.subjects = [];
  }


  if (
    !p.subjectLevels ||
    typeof p.subjectLevels !== "object"
  ) {
    p.subjectLevels = {};
  }


  if (
    !p.subjectStudyMinutes ||
    typeof p.subjectStudyMinutes !== "object"
  ) {
    p.subjectStudyMinutes = {};
  }


  if (
    !p.subjectHistory ||
    typeof p.subjectHistory !== "object"
  ) {
    p.subjectHistory = {};
  }


  if (
    !Array.isArray(
      p.studyHistory
    )
  ) {
    p.studyHistory = [];
  }


  if (
    !Array.isArray(
      p.unlockedTitles
    )
  ) {
    p.unlockedTitles = [
      "beginner"
    ];
  }


  if (
    !p.unlockedTitles.includes(
      "beginner"
    )
  ) {
    p.unlockedTitles.unshift(
      "beginner"
    );
  }


  if (
    !p.achievements ||
    typeof p.achievements !== "object"
  ) {
    p.achievements = {};
  }


  if (
    !p.purchasedItems ||
    typeof p.purchasedItems !== "object"
  ) {
    p.purchasedItems = {};
  }


  if (
    !p.inventory ||
    typeof p.inventory !== "object"
  ) {
    p.inventory = {};
  }


  if (
    !p.activeBoosts ||
    typeof p.activeBoosts !== "object"
  ) {
    p.activeBoosts = {};
  }


  if (
    !Array.isArray(
      p.activeBoosts.xp
    )
  ) {
    p.activeBoosts.xp = [];
  }


  if (
    !Array.isArray(
      p.activeBoosts.bossDamage
    )
  ) {
    p.activeBoosts.bossDamage = [];
  }


  p.boss = {
    contribution: 0,
    damage: 0,
    battles: 0,
    mvpCount: 0,
    weaknessDamage: 0,
    ...(p.boss || {})
  };


  if (
    !Array.isArray(
      p.partyMembers
    )
  ) {
    p.partyMembers = [];
  }


  if (
    !Array.isArray(
      p.seasonHistory
    )
  ) {
    p.seasonHistory = [];
  }


  normalizeDailyData(p);

  normalizeSeasonData(p);

  p.level =
    calculateLevel(p.xp);

  cleanExpiredBoosts(p);

  ensureQuestState(p);

  return p;
}


// ============================================================
// Daily / Season
// ============================================================

function normalizeDailyData(
  player
) {

  const today =
    getJapanDateString();

  if (
    player.todayStudyDate !==
    today
  ) {

    player.todayStudyDate =
      today;

    player.todayStudyMinutes =
      0;

    player.todayXp =
      0;

    player.todayCoins =
      0;
  }

  player.todayStudyMinutes =
    Math.max(
      0,
      Math.floor(
        Number(
          player.todayStudyMinutes
        ) || 0
      )
    );

  player.todayXp =
    Math.max(
      0,
      Math.floor(
        Number(
          player.todayXp
        ) || 0
      )
    );

  player.todayCoins =
    Math.max(
      0,
      Math.floor(
        Number(
          player.todayCoins
        ) || 0
      )
    );

  return player;
}


function normalizeSeasonData(
  player
) {

  const currentSeason =
    getJapanMonthString();

  if (
    player.seasonId !==
    currentSeason
  ) {

    const previousRank =
      player.rank ||
      calculateRank(
        player.seasonStudyMinutes
      );

    const previousMinutes =
      Number(
        player.seasonStudyMinutes
      ) || 0;


    // Preserve previous season.
    player.lastSeasonRank =
      previousRank;

    player.lastSeasonStudyMinutes =
      previousMinutes;


    if (
      Array.isArray(
        player.seasonHistory
      )
    ) {

      player.seasonHistory.unshift({
        seasonId:
          player.seasonId ||
          null,

        rank:
          previousRank,

        studyMinutes:
          previousMinutes
      });

      player.seasonHistory =
        player.seasonHistory
          .slice(0, 24);
    }


    // Legend maintenance.
    if (
      previousRank ===
      "Legend"
    ) {

      player.permanentLegendBoost =
        true;

      if (
        !player.unlockedTitles.includes(
          "legend-season"
        )
      ) {

        player.unlockedTitles.push(
          "legend-season"
        );
      }
    }


    // New season.
    player.seasonId =
      currentSeason;

    player.seasonStartDate =
      `${currentSeason}-01`;

    player.seasonStudyMinutes =
      0;

    player.rank =
      "Bronze";
  }


  player.seasonStudyMinutes =
    Math.max(
      0,
      Math.floor(
        Number(
          player.seasonStudyMinutes
        ) || 0
      )
    );


  player.rank =
    calculateRank(
      player.seasonStudyMinutes
    );


  // Reaching Legend activates
  // permanent 1.5x XP.
  if (
    player.rank ===
    "Legend"
  ) {

    player.permanentLegendBoost =
      true;
  }

  return player;
}


// ============================================================
// Boost Cleanup
// ============================================================

function cleanExpiredBoosts(
  player = currentPlayer
) {

  if (!player) {
    return;
  }

  const now =
    Date.now();

  player.activeBoosts.xp =
    (
      player.activeBoosts.xp ||
      []
    ).filter(
      boost =>
        Number(
          boost.expiresAt
        ) > now
    );


  player.activeBoosts.bossDamage =
    (
      player.activeBoosts.bossDamage ||
      []
    ).filter(
      boost =>
        Number(
          boost.expiresAt
        ) > now &&
        Number(
          boost.charges
        ) > 0
    );
}


// ============================================================
// XP Multiplier
// ============================================================

function getXpMultiplier(
  player = currentPlayer
) {

  if (!player) {
    return 1;
  }

  cleanExpiredBoosts(
    player
  );

  let multiplier =
    player.permanentLegendBoost
      ? 1.5
      : 1;


  for (
    const boost of
    player.activeBoosts.xp
  ) {

    if (
      Number(
        boost.expiresAt
      ) > Date.now()
    ) {

      multiplier *=
        Number(
          boost.value
        ) || 1;
    }
  }

  return multiplier;
}


// ============================================================
// Quest
// ============================================================

function getQuestSubjectCandidates(
  player = currentPlayer
) {

  if (
    !player ||
    !Array.isArray(
      player.subjects
    )
  ) {
    return [];
  }

  return player.subjects.filter(
    subject =>
      !!SUBJECT_NAMES[subject]
  );
}


function getLeastStudiedSubjects(
  player = currentPlayer
) {

  return [
    ...getQuestSubjectCandidates(
      player
    )
  ].sort(
    (a, b) =>
      Number(
        player?.subjectStudyMinutes?.[a] ||
        0
      ) -
      Number(
        player?.subjectStudyMinutes?.[b] ||
        0
      )
  );
}


function createDailyQuest(
  subject,
  index
) {

  return {

    id:
      `daily-${getJapanDateString()}-${index}-${subject}`,

    type: "daily",

    title:
      `${getSubjectName(subject)}特訓`,

    description:
      `${getSubjectName(subject)}を${DAILY_QUEST_MINUTES}分勉強する`,

    subject,

    target:
      DAILY_QUEST_MINUTES,

    progress: 0,

    completed: false,

    claimed: false,

    rewardXp:
      QUEST_REWARDS.dailyXp,

    rewardCoins:
      QUEST_REWARDS.dailyCoins
  };
}


function createWeeklyQuest(
  subject
) {

  return {

    id:
      `weekly-${getJapanWeekId()}-${subject}`,

    type: "weekly",

    title:
      `${getSubjectName(subject)}週間強化`,

    description:
      `${getSubjectName(subject)}を今週${WEEKLY_QUEST_MINUTES}分勉強する`,

    subject,

    target:
      WEEKLY_QUEST_MINUTES,

    progress: 0,

    completed: false,

    claimed: false,

    rewardXp:
      QUEST_REWARDS.weeklyXp,

    rewardCoins:
      QUEST_REWARDS.weeklyCoins
  };
}


function createRareQuest() {

  return {

    id:
      `rare-${getJapanDateString()}`,

    type: "rare",

    title:
      "限界突破",

    description:
      `1日に合計${RARE_QUEST_MINUTES}分勉強する`,

    target:
      RARE_QUEST_MINUTES,

    progress: 0,

    completed: false,

    claimed: false,

    rewardXp:
      QUEST_REWARDS.rareXp,

    rewardCoins:
      QUEST_REWARDS.rareCoins
  };
}


function ensureQuestState(
  player
) {

  if (
    !player.questState ||
    typeof player.questState !==
      "object"
  ) {
    player.questState = {};
  }

  const today =
    getJapanDateString();

  const week =
    getJapanWeekId();

  const candidates =
    getLeastStudiedSubjects(
      player
    );


  // Daily
  if (
    player.questState.dailyDate !==
      today ||
    !Array.isArray(
      player.questState.daily
    )
  ) {

    player.questState.daily =
      candidates
        .slice(
          0,
          DAILY_QUEST_COUNT
        )
        .map(
          createDailyQuest
        );

    player.questState.dailyDate =
      today;
  }


  // Weekly
  if (
    player.questState.weeklyId !==
      week ||
    !player.questState.weekly
  ) {

    const subject =
      candidates[0] ||
      player.subjects[0] ||
      null;

    player.questState.weekly =
      subject
        ? createWeeklyQuest(
            subject
          )
        : null;

    player.questState.weeklyId =
      week;
  }


  // Rare
  if (
    player.questState.rareDate !==
      today ||
    !player.questState.rare
  ) {

    player.questState.rareDate =
      today;

    player.questState.rare =
      createRareQuest();
  }


  return player.questState;
}


// ============================================================
// Firebase Player
// ============================================================

async function initializeFirebase() {

  if (firebaseApp) {
    return true;
  }

  try {

    firebaseApp =
      initializeApp(
        firebaseConfig
      );

    auth =
      getAuth(
        firebaseApp
      );

    db =
      getFirestore(
        firebaseApp
      );

    return true;

  }
  catch (error) {

    console.error(error);

    alert(
      `Firebaseの初期化に失敗しました。\n${
        error?.message || ""
      }`
    );

    return false;
  }
}


async function loadPlayer(
  user
) {

  if (
    !user ||
    !db
  ) {
    return null;
  }

  const snapshot =
    await getDoc(
      doc(
        db,
        "users",
        user.uid
      )
    );

  if (
    !snapshot.exists()
  ) {
    return null;
  }

  return normalizePlayer(
    snapshot.data(),
    user
  );
}


async function createPlayer(
  user,
  data = {}
) {

  const userId =
    normalizeUserId(
      data.userId ||
      user?.email?.split("@")[0] ||
      ""
    );

  const player = {
    ...createDefaultPlayerData(
      userId
    ),

    ...data,

    uid:
      user.uid,

    userId,

    email:
      user.email || "",

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp()
  };

  ensureQuestState(
    player
  );

  await setDoc(
    doc(
      db,
      "users",
      user.uid
    ),
    player
  );

  return normalizePlayer(
    player,
    user
  );
}


async function savePlayer() {

  if (
    !currentUser ||
    !currentPlayer ||
    !db
  ) {
    return;
  }

  normalizeDailyData(
    currentPlayer
  );

  normalizeSeasonData(
    currentPlayer
  );

  currentPlayer.level =
    calculateLevel(
      currentPlayer.xp
    );

  cleanExpiredBoosts(
    currentPlayer
  );

  ensureQuestState(
    currentPlayer
  );

  await setDoc(
    doc(
      db,
      "users",
      currentUser.uid
    ),
    {
      ...currentPlayer,

      uid:
        currentUser.uid,

      updatedAt:
        serverTimestamp()
    },
    {
      merge: true
    }
  );
}


// ============================================================
// Quest Logic
// ============================================================

function questProgressPercent(
  quest
) {

  if (
    !quest ||
    !quest.target
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (
        Number(
          quest.progress || 0
        ) /
        Number(
          quest.target
        )
      ) * 100
    )
  );
}


function updateQuestProgress(
  subject,
  minutes,
  date
) {

  if (
    !currentPlayer ||
    date !==
      getJapanDateString()
  ) {
    return [];
  }

  ensureQuestState(
    currentPlayer
  );

  const completed = [];


  // Daily
  for (
    const quest of
    currentPlayer
      .questState
      .daily || []
  ) {

    if (
      !quest.completed &&
      !quest.claimed &&
      quest.subject === subject
    ) {

      quest.progress =
        Math.min(
          quest.target,

          Number(
            quest.progress || 0
          ) + minutes
        );

      if (
        quest.progress >=
        quest.target
      ) {

        quest.completed =
          true;

        completed.push(
          quest
        );
      }
    }
  }


  // Weekly
  const weekly =
    currentPlayer
      .questState
      .weekly;

  if (
    weekly &&
    !weekly.completed &&
    !weekly.claimed &&
    weekly.subject === subject
  ) {

    weekly.progress =
      Math.min(
        weekly.target,

        Number(
          weekly.progress || 0
        ) + minutes
      );

    if (
      weekly.progress >=
      weekly.target
    ) {

      weekly.completed =
        true;

      completed.push(
        weekly
      );
    }
  }


  // Rare
  const rare =
    currentPlayer
      .questState
      .rare;

  if (
    rare &&
    !rare.completed &&
    !rare.claimed
  ) {

    rare.progress =
      Math.min(
        rare.target,

        currentPlayer
          .todayStudyMinutes
      );

    if (
      rare.progress >=
      rare.target
    ) {

      rare.completed =
        true;

      completed.push(
        rare
      );
    }
  }


  return completed;
}


function findQuestById(
  id
) {

  const state =
    currentPlayer?.questState;

  return [
    ...(state?.daily || []),
    state?.weekly,
    state?.rare
  ]
    .filter(Boolean)
    .find(
      quest =>
        quest.id === id
    ) || null;
}


function isDailyFullyCompleted() {

  const daily =
    currentPlayer
      ?.questState
      ?.daily || [];

  return (
    daily.length ===
      DAILY_QUEST_COUNT &&
    daily.every(
      quest =>
        quest.completed ||
        quest.claimed
    )
  );
}


async function claimQuestReward(
  quest
) {

  if (
    !currentPlayer ||
    !quest ||
    quest.claimed ||
    !quest.completed
  ) {
    return false;
  }

  quest.claimed =
    true;

  const xp =
    Math.floor(
      Number(
        quest.rewardXp || 0
      ) *
      getXpMultiplier()
    );

  const coins =
    Number(
      quest.rewardCoins || 0
    );


  currentPlayer.xp +=
    xp;

  currentPlayer.coins +=
    coins;

  currentPlayer.questClaimedCount =
    Number(
      currentPlayer.questClaimedCount ||
      0
    ) + 1;


  // First daily clear
  if (
    quest.type === "daily" &&
    isDailyFullyCompleted()
  ) {

    const today =
      getJapanDateString();

    if (
      currentPlayer
        .lastDailyFullClearDate !==
      today
    ) {

      const yesterday =
        new Date(
          Date.now() -
          86400000
        );

      const yesterdayString =
        getJapanDateString(
          yesterday
        );

      if (
        currentPlayer
          .lastDailyFullClearDate ===
        yesterdayString
      ) {

        currentPlayer
          .dailyFullClearStreak =
          Number(
            currentPlayer
              .dailyFullClearStreak ||
            0
          ) + 1;

      }
      else {

        currentPlayer
          .dailyFullClearStreak =
          1;
      }

      currentPlayer
        .lastDailyFullClearDate =
        today;
    }
  }


  currentPlayer.level =
    calculateLevel(
      currentPlayer.xp
    );

  await savePlayer();

  updatePlayerUI();

  renderAllAutoUI();

  showNotification(
    `🎁 ${quest.title}達成！ +${xp} XP / +${coins}🪙`
  );

  await checkAchievements();

  return true;
}


// ============================================================
// Titles
// ============================================================

function getTitleById(
  id
) {

  return (
    TITLES.find(
      title =>
        title.id === id
    ) || null
  );
}


function hasTitle(
  id
) {

  return !!currentPlayer
    ?.unlockedTitles
    ?.includes(id);
}


async function unlockTitle(
  id,
  silent = false
) {

  if (
    !currentPlayer ||
    hasTitle(id)
  ) {
    return false;
  }

  const title =
    getTitleById(id);

  if (!title) {
    return false;
  }

  currentPlayer
    .unlockedTitles
    .push(id);

  if (!silent) {
    showTitleUnlockEffect(
      title
    );
  }

  return true;
}


async function equipTitle(
  id
) {

  if (
    !hasTitle(id)
  ) {

    showNotification(
      "🔒 まだ解放されていない称号です。"
    );

    return;
  }

  const title =
    getTitleById(id);

  if (!title) {
    return;
  }

  currentPlayer.title =
    title.name;

  await savePlayer();

  updatePlayerUI();

  renderTitleUI();

  showNotification(
    `🏷️ 「${title.name}」を装備しました！`
  );
}


// ============================================================
// Achievements
// ============================================================

function achievementUnlocked(
  id
) {

  return !!currentPlayer
    ?.achievements
    ?.[id]
    ?.unlocked;
}


async function unlockAchievement(
  achievement
) {

  if (
    !currentPlayer ||
    achievementUnlocked(
      achievement.id
    )
  ) {
    return false;
  }

  currentPlayer
    .achievements[
      achievement.id
    ] = {

      unlocked: true,

      unlockedAt:
        new Date().toISOString()
    };


  currentPlayer.coins +=
    Number(
      achievement.rewardCoins ||
      0
    );


  showAchievementEffect(
    achievement
  );

  return true;
}


async function checkAchievements() {

  if (!currentPlayer) {
    return;
  }

  const studyMinutes =
    Number(
      currentPlayer
        .totalStudyMinutes ||
      0
    );

  const level =
    Number(
      currentPlayer.level ||
      1
    );

  const rankIndex =
    getRankIndex(
      currentPlayer.rank
    );

  const streak =
    Number(
      currentPlayer.loginStreak ||
      0
    );


  const conditions = {

    "first-study":
      studyMinutes >= 1,

    "study-10h":
      studyMinutes >= 600,

    "study-50h":
      studyMinutes >= 3000,

    "study-100h":
      studyMinutes >= 6000,


    "level-10":
      level >= 10,

    "level-50":
      level >= 50,

    "level-100":
      level >= 100,


    "rank-gold":
      rankIndex >= 2,

    "rank-platinum":
      rankIndex >= 3,

    "rank-diamond":
      rankIndex >= 4,

    "rank-master":
      rankIndex >= 5,

    "rank-legend":
      rankIndex >= 7,


    "streak-3":
      streak >= 3,

    "streak-7":
      streak >= 7,

    "streak-30":
      streak >= 30
  };


  for (
    const achievement of
    ACHIEVEMENTS
  ) {

    if (
      conditions[
        achievement.id
      ]
    ) {

      await unlockAchievement(
        achievement
      );
    }
  }


  await checkTitles();
}


// ============================================================
// Subject Title Conditions
// ============================================================

function getRegisteredSubjectLevels() {

  if (
    !currentPlayer
  ) {
    return [];
  }

  return (
    currentPlayer.subjects || []
  ).map(
    subject => ({
      subject,

      level:
        Number(
          currentPlayer
            .subjectLevels
            ?.[subject] ||
          0
        )
    })
  );
}


async function checkSubjectTitles() {

  const registered =
    getRegisteredSubjectLevels();


  if (
    registered.length > 0 &&
    registered.every(
      item =>
        item.level >= 10
    )
  ) {

    await unlockTitle(
      "all-subject-lv10",
      true
    );
  }


  if (
    registered.some(
      item =>
        item.level >= 50
    )
  ) {

    await unlockTitle(
      "one-subject-lv50",
      true
    );
  }


  if (
    registered.filter(
      item =>
        item.level >= 30
    ).length >= 3
  ) {

    await unlockTitle(
      "three-subject-lv30",
      true
    );
  }


  if (
    registered.length > 0 &&
    registered.every(
      item =>
        item.level >= 100
    )
  ) {

    await unlockTitle(
      "all-subject-lv100",
      true
    );
  }
}


// ============================================================
// Title Conditions
// ============================================================

async function checkTitles() {

  if (!currentPlayer) {
    return;
  }

  const totalMinutes =
    Number(
      currentPlayer
        .totalStudyMinutes ||
      0
    );

  const todayMinutes =
    Number(
      currentPlayer
        .todayStudyMinutes ||
      0
    );

  const level =
    Number(
      currentPlayer.level ||
      1
    );

  const streak =
    Number(
      currentPlayer.loginStreak ||
      0
    );

  const questCount =
    Number(
      currentPlayer.questClaimedCount ||
      0
    );

  const hour =
    getJapanHour();


  // ----------------------------------------------------------
  // Study Titles
  // ----------------------------------------------------------

  const studyConditions = [
    ["first-study", 60],
    ["effort-5h", 300],
    ["ten-hours", 600],
    ["twenty-hours", 1200],
    ["thirty-hours", 1800],
    ["fifty-hours", 3000],
    ["hundred-hours", 6000],
    ["one-fifty-hours", 9000],
    ["two-hundred-hours", 12000],
    ["three-hundred-hours", 18000],
    ["five-hundred-hours", 30000],
    ["seven-fifty-hours", 45000],
    ["thousand-hours", 60000]
  ];


  for (
    const [
      id,
      requirement
    ] of studyConditions
  ) {

    if (
      totalMinutes >=
      requirement
    ) {

      await unlockTitle(
        id,
        true
      );
    }
  }


  // ----------------------------------------------------------
  // Level Titles
  // ----------------------------------------------------------

  for (
    let i = 10;
    i <= 90;
    i += 10
  ) {

    if (
      level >= i
    ) {

      await unlockTitle(
        `level-${i}`,
        true
      );
    }
  }


  if (
    level >= 100
  ) {

    await unlockTitle(
      "level-100",
      true
    );
  }


  // ----------------------------------------------------------
  // Rank Titles
  // ----------------------------------------------------------

  const rank =
    currentPlayer.rank;

  const rankMap = {
    Silver: "silver-proof",
    Gold: "gold-proof",
    Platinum: "platinum-proof",
    Diamond: "diamond-proof",
    Master: "master-proof",
    Grandmaster: "grandmaster-proof",
    Legend: "legend-proof"
  };


  for (
    const [
      rankName,
      titleId
    ] of Object.entries(
      rankMap
    )
  ) {

    if (
      getRankIndex(rank) >=
      getRankIndex(rankName)
    ) {

      await unlockTitle(
        titleId,
        true
      );
    }
  }


  // ----------------------------------------------------------
  // Quest
  // ----------------------------------------------------------

  if (
    questCount >= 1
  ) {

    await unlockTitle(
      "quest-first",
      true
    );
  }

  if (
    questCount >= 10
  ) {

    await unlockTitle(
      "quest-10",
      true
    );
  }

  if (
    questCount >= 50
  ) {

    await unlockTitle(
      "quest-50",
      true
    );
  }


  if (
    isDailyFullyCompleted()
  ) {

    await unlockTitle(
      "daily-complete",
      true
    );
  }


  // ----------------------------------------------------------
  // Streak
  // ----------------------------------------------------------

  if (
    streak >= 7
  ) {

    await unlockTitle(
      "streak-7-title",
      true
    );
  }

  if (
    streak >= 14
  ) {

    await unlockTitle(
      "streak-14-title",
      true
    );
  }

  if (
    streak >= 30
  ) {

    await unlockTitle(
      "streak-30-title",
      true
    );
  }


  // ----------------------------------------------------------
  // Hidden
  // ----------------------------------------------------------

  if (
    todayMinutes >= 180
  ) {

    await unlockTitle(
      "hidden-speed",
      true
    );
  }


  if (
    hour >= 0 &&
    hour < 4 &&
    todayMinutes >= 1
  ) {

    await unlockTitle(
      "hidden-midnight",
      true
    );
  }


  if (
    hour >= 4 &&
    hour < 6 &&
    todayMinutes >= 1
  ) {

    await unlockTitle(
      "hidden-early",
      true
    );
  }


  // ----------------------------------------------------------
  // Secret 1
  // ----------------------------------------------------------

  if (
    todayMinutes >= 120
  ) {

    await unlockTitle(
      "secret-1",
      true
    );
  }


  // ----------------------------------------------------------
  // Secret 2
  // ----------------------------------------------------------

  if (
    streak >= 7
  ) {

    await unlockTitle(
      "secret-2",
      true
    );
  }


  // ----------------------------------------------------------
  // Secret 3
  // ----------------------------------------------------------

  if (
    todayMinutes >= 240
  ) {

    await unlockTitle(
      "secret-3",
      true
    );
  }


  // ----------------------------------------------------------
  // Secret 4
  // ----------------------------------------------------------

  if (
    todayMinutes >= 300
  ) {

    await unlockTitle(
      "secret-4",
      true
    );
  }


  // ----------------------------------------------------------
  // Secret 5
  // ----------------------------------------------------------

  if (
    Number(
      currentPlayer
        .dailyFullClearStreak ||
      0
    ) >= 14
  ) {

    await unlockTitle(
      "secret-5",
      true
    );
  }


  // ----------------------------------------------------------
  // Boss
  // ----------------------------------------------------------

  if (
    Number(
      currentPlayer
        .boss
        ?.damage ||
      0
    ) >= 1000
  ) {

    await unlockTitle(
      "damage-dealer",
      true
    );
  }


  if (
    Number(
      currentPlayer
        .boss
        ?.mvpCount ||
      0
    ) >= 1
  ) {

    await unlockTitle(
      "mvp",
      true
    );
  }


  if (
    currentPlayer.partyId
  ) {

    await unlockTitle(
      "party-player",
      true
    );
  }


  // ----------------------------------------------------------
  // Subject Titles
  // ----------------------------------------------------------

  await checkSubjectTitles();


  // ----------------------------------------------------------
  // Secret 9
  // ----------------------------------------------------------

  if (
    currentPlayer
      .permanentLegendBoost &&
    totalMinutes >= 18000
  ) {

    await unlockTitle(
      "secret-9",
      true
    );
  }


  // ----------------------------------------------------------
  // Secret 10
  //
  // "全教科を選択し学習記録する"
  //
  // Here "全教科" means all registered
  // selectable subjects have at least
  // one study record.
  // ----------------------------------------------------------

  const registered =
    getQuestSubjectCandidates(
      currentPlayer
    );

  if (
    registered.length > 0 &&
    registered.every(
      subject =>
        Number(
          currentPlayer
            .subjectStudyMinutes
            ?.[subject] ||
          0
        ) > 0
    )
  ) {

    await unlockTitle(
      "secret-10",
      true
    );
  }


  // Save title changes.
  await savePlayer();
}


// ============================================================
// Login Streak
// ============================================================

async function processLoginStreak() {

  if (!currentPlayer) {
    return;
  }

  const today =
    getJapanDateString();


  if (
    currentPlayer.loginRewardDate ===
    today
  ) {
    return;
  }


  const previous =
    currentPlayer.lastLoginDate;


  if (!previous) {

    currentPlayer.loginStreak =
      1;
  }
  else {

    const diff =
      getDaysBetweenJapanDates(
        previous,
        today
      );


    if (
      diff === 1
    ) {

      currentPlayer.loginStreak =
        Number(
          currentPlayer.loginStreak ||
          0
        ) + 1;
    }
    else if (
      diff > 1
    ) {

      if (
        Number(
          currentPlayer.loginStreak ||
          0
        ) >= 2
      ) {

        await unlockTitle(
          "hidden-comeback",
          true
        );
      }

      currentPlayer.loginStreak =
        1;
    }
  }


  currentPlayer.lastLoginDate =
    today;

  currentPlayer.loginRewardDate =
    today;


  const streak =
    currentPlayer.loginStreak;


  let reward =
    LOGIN_REWARDS.normal;


  if (
    streak === 1
  ) {

    reward =
      LOGIN_REWARDS.first;
  }


  if (
    streak % 3 === 0
  ) {

    reward =
      LOGIN_REWARDS.streak3;
  }


  if (
    streak % 7 === 0
  ) {

    reward =
      LOGIN_REWARDS.streak7;
  }


  if (
    streak % 30 === 0
  ) {

    reward =
      LOGIN_REWARDS.streak30;
  }


  const xp =
    Math.floor(
      reward.xp *
      getXpMultiplier()
    );


  currentPlayer.coins +=
    reward.coins;

  currentPlayer.xp +=
    xp;

  currentPlayer.level =
    calculateLevel(
      currentPlayer.xp
    );


  await savePlayer();


  showNotification(
    `🔥 ${streak}日連続ログイン！ +${
      reward.coins
    }🪙${
      xp
        ? ` / +${xp} XP`
        : ""
    }`
  );


  await checkAchievements();
}


// ============================================================
// Boss Helpers
// ============================================================

function createBossData() {

  const subjects =
    getQuestSubjectCandidates(
      currentPlayer
    );

  const weakness =
    subjects.length
      ? subjects[
          Math.floor(
            Math.random() *
            subjects.length
          )
        ]
      : null;


  return {

    ...BOSS_DEFAULTS,

    weaknessSubject:
      weakness,

    startedAt:
      new Date().toISOString(),

    level: 1
  };
}


function getBossData() {

  if (!currentPlayer) {
    return null;
  }

  if (
    !currentPlayer.bossData ||
    typeof currentPlayer.bossData !==
      "object"
  ) {

    currentPlayer.bossData =
      createBossData();
  }

  return currentPlayer.bossData;
}


function getBossWeakness() {

  return getBossData()
    ?.weaknessSubject || null;
}


// ============================================================
// Boss Damage Buff
// ============================================================

function getBossDamageMultiplier() {

  if (!currentPlayer) {
    return 1;
  }

  cleanExpiredBoosts(
    currentPlayer
  );

  const boosts =
    currentPlayer
      .activeBoosts
      .bossDamage || [];


  if (!boosts.length) {
    return 1;
  }


  // Use the strongest currently
  // available attack buff.
  return Math.max(
    1,
    ...boosts.map(
      boost =>
        Number(
          boost.value
        ) || 1
    )
  );
}


function consumeBossDamageBuff() {

  if (!currentPlayer) {
    return null;
  }

  cleanExpiredBoosts(
    currentPlayer
  );

  const boosts =
    currentPlayer
      .activeBoosts
      .bossDamage || [];


  if (!boosts.length) {
    return null;
  }


  // Strongest buff wins.
  boosts.sort(
    (a, b) =>
      Number(b.value || 1) -
      Number(a.value || 1)
  );


  const boost =
    boosts[0];


  boost.charges =
    Number(
      boost.charges || 1
    ) - 1;


  if (
    boost.charges <= 0
  ) {

    const index =
      currentPlayer
        .activeBoosts
        .bossDamage
        .indexOf(
          boost
        );

    if (
      index >= 0
    ) {

      currentPlayer
        .activeBoosts
        .bossDamage
        .splice(
          index,
          1
        );
    }
  }


  return boost;
}


// ============================================================
// Boss Damage Calculation
// ============================================================

function calculateBossDamage(
  minutes,
  subject
) {

  let damage =
    Math.max(
      0,
      Number(minutes) || 0
    ) * 10;


  const boss =
    getBossData();


  if (
    boss?.weaknessSubject ===
    subject
  ) {

    damage *= 2;
  }


  const multiplier =
    getBossDamageMultiplier();


  damage *=
    multiplier;


  return Math.floor(
    damage
  );
}


// ============================================================
// Personal Boss
// ============================================================

async function applyPersonalBossDamage(
  minutes,
  subject
) {

  const boss =
    getBossData();

  if (
    !boss ||
    boss.defeated ||
    !boss.active
  ) {

    return {
      damage: 0,
      defeated: false
    };
  }


  const beforeHp =
    Number(
      boss.hp ||
      boss.maxHp
    );


  const weakness =
    boss.weaknessSubject ===
    subject;


  const damage =
    calculateBossDamage(
      minutes,
      subject
    );


  boss.hp =
    Math.max(
      0,
      beforeHp -
      damage
    );


  currentPlayer.boss.damage =
    Number(
      currentPlayer.boss.damage ||
      0
    ) + damage;


  currentPlayer.boss.contribution =
    Number(
      currentPlayer.boss.contribution ||
      0
    ) + damage;


  currentPlayer.boss.battles =
    Number(
      currentPlayer.boss.battles ||
      0
    ) + 1;


  if (weakness) {

    currentPlayer.boss
      .weaknessDamage =
      Number(
        currentPlayer.boss
          .weaknessDamage ||
        0
      ) + damage;
  }


  // Consume the attack buff
  // exactly once.
  consumeBossDamageBuff();


  if (
    weakness &&
    damage >= 500
  ) {

    await unlockTitle(
      "weakness-breaker",
      true
    );

    await unlockTitle(
      "secret-6",
      true
    );
  }


  let defeated = false;


  if (
    boss.hp <= 0
  ) {

    boss.hp = 0;

    boss.defeated =
      true;

    boss.active =
      false;

    boss.endsAt =
      new Date().toISOString();

    defeated =
      true;


    await unlockTitle(
      "boss-first",
      true
    );


    if (
      currentPlayer.partyId
    ) {

      await unlockTitle(
        "party-boss",
        true
      );
    }


    await unlockTitle(
      "secret-7",
      true
    );


    showBossDefeatEffect();
  }


  return {
    damage,
    defeated
  };
}


// ============================================================
// Party Helpers
// ============================================================

const MAX_PARTY_MEMBERS = 4;


function generatePartyId() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (
    let i = 0;
    i < 6;
    i++
  ) {

    result +=
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];
  }

  return result;
}


function createEmptyParty(
  partyId,
  owner
) {

  const now =
    new Date().toISOString();

  return {

    partyId,

    name:
      "受験RPGパーティ",

    ownerUid:
      owner.uid,

    memberUids: [
      owner.uid
    ],

    members: [
      {
        uid: owner.uid,

        userId:
          owner.userId,

        displayName:
          owner.displayName,

        role: "Leader",

        contribution: 0,

        joinedAt: now
      }
    ],


    boss: {
      ...createBossData(),

      totalDamage: 0,

      contributions: {
        [owner.uid]: 0
      }
    },

    createdAt: now,

    updatedAt: now
  };
}


// ============================================================
// Create Party
// ============================================================

async function createParty() {

  if (
    !currentUser ||
    !currentPlayer ||
    !db
  ) {
    return null;
  }


  if (
    currentPlayer.partyId
  ) {

    showNotification(
      "すでにパーティに参加しています。"
    );

    return null;
  }


  let partyId =
    generatePartyId();


  for (
    let attempt = 0;
    attempt < 5;
    attempt++
  ) {

    const partyRef =
      doc(
        db,
        "parties",
        partyId
      );

    const existing =
      await getDoc(
        partyRef
      );

    if (
      !existing.exists()
    ) {

      const party =
        createEmptyParty(
          partyId,
          currentPlayer
        );

      await setDoc(
        partyRef,
        party
      );

      currentPlayer.partyId =
        partyId;

      currentPlayer.partyRole =
        "Leader";

      currentPlayer.partyMembers =
        party.members;

      await savePlayer();

      await unlockTitle(
        "party-player",
        true
      );

      renderPartyUI();

      showNotification(
        `👥 パーティ作成！ ID：${partyId}`
      );

      return party;
    }


    partyId =
      generatePartyId();
  }


  showNotification(
    "パーティIDの生成に失敗しました。もう一度お試しください。"
  );

  return null;
}


// ============================================================
// Join Party
// ============================================================

async function joinParty(
  partyId
) {

  if (
    !currentUser ||
    !currentPlayer ||
    !db
  ) {
    return false;
  }


  if (
    currentPlayer.partyId
  ) {

    showNotification(
      "すでにパーティに参加しています。"
    );

    return false;
  }


  partyId =
    String(
      partyId || ""
    )
      .trim()
      .toUpperCase();


  if (!partyId) {

    showNotification(
      "パーティIDを入力してください。"
    );

    return false;
  }


  const partyRef =
    doc(
      db,
      "parties",
      partyId
    );


  try {

    await runTransaction(
      db,
      async transaction => {

        const snapshot =
          await transaction.get(
            partyRef
          );


        if (
          !snapshot.exists()
        ) {

          throw new Error(
            "PARTY_NOT_FOUND"
          );
        }


        const party =
          snapshot.data();


        const members =
          Array.isArray(
            party.members
          )
            ? [
                ...party.members
              ]
            : [];


        if (
          members.some(
            member =>
              member.uid ===
              currentUser.uid
          )
        ) {

          return;
        }


        if (
          members.length >=
          MAX_PARTY_MEMBERS
        ) {

          throw new Error(
            "PARTY_FULL"
          );
        }


        members.push({
          uid:
            currentUser.uid,

          userId:
            currentPlayer.userId,

          displayName:
            currentPlayer.displayName,

          role: "Member",

          contribution: 0,

          joinedAt:
            new Date()
              .toISOString()
        });


        const memberUids =
          members.map(
            member =>
              member.uid
          );


        const contributions = {
          ...(
            party.boss
              ?.contributions ||
            {}
          )
        };


        contributions[
          currentUser.uid
        ] =
          Number(
            contributions[
              currentUser.uid
            ] || 0
          );


        transaction.update(
          partyRef,
          {
            members,

            memberUids,

            "boss.contributions":
              contributions,

            updatedAt:
              new Date()
                .toISOString()
          }
        );
      }
    );


    currentPlayer.partyId =
      partyId;

    currentPlayer.partyRole =
      "Member";


    await syncPartyToPlayer();

    await unlockTitle(
      "party-player",
      true
    );


    showNotification(
      `👥 パーティ「${partyId}」に参加しました！`
    );


    renderPartyUI();

    return true;

  }
  catch (error) {

    if (
      error.message ===
      "PARTY_NOT_FOUND"
    ) {

      showNotification(
        "そのパーティは存在しません。"
      );

      return false;
    }


    if (
      error.message ===
      "PARTY_FULL"
    ) {

      showNotification(
        "そのパーティは満員です。"
      );

      return false;
    }


    console.error(error);

    showNotification(
      firebaseErrorMessage(
        error
      )
    );

    return false;
  }
}


// ============================================================
// Sync Party
// ============================================================

async function syncPartyToPlayer() {

  if (
    !currentPlayer?.partyId ||
    !db
  ) {
    return null;
  }


  const snapshot =
    await getDoc(
      doc(
        db,
        "parties",
        currentPlayer.partyId
      )
    );


  if (
    !snapshot.exists()
  ) {

    currentPlayer.partyId =
      null;

    currentPlayer.partyRole =
      null;

    currentPlayer.partyMembers =
      [];

    await savePlayer();

    return null;
  }


  const party =
    snapshot.data();


  currentPlayer.partyMembers =
    Array.isArray(
      party.members
    )
      ? party.members
      : [];


  return party;
}


// ============================================================
// Leave Party
// ============================================================

async function leaveParty() {

  if (
    !currentPlayer?.partyId ||
    !currentUser ||
    !db
  ) {
    return false;
  }


  const partyId =
    currentPlayer.partyId;


  const partyRef =
    doc(
      db,
      "parties",
      partyId
    );


  try {

    await runTransaction(
      db,
      async transaction => {

        const snapshot =
          await transaction.get(
            partyRef
          );


        if (
          !snapshot.exists()
        ) {
          return;
        }


        const party =
          snapshot.data();


        const members =
          (
            party.members ||
            []
          ).filter(
            member =>
              member.uid !==
              currentUser.uid
          );


        const uids =
          members.map(
            member =>
              member.uid
          );


        if (
          currentPlayer.partyRole ===
            "Leader" &&
          members.length > 0
        ) {

          members[0].role =
            "Leader";

          transaction.update(
            doc(
              db,
              "users",
              members[0].uid
            ),
            {
              partyRole:
                "Leader"
            }
          );
        }


        if (
          members.length === 0
        ) {

          transaction.delete(
            partyRef
          );

          return;
        }


        transaction.update(
          partyRef,
          {
            members,

            memberUids:
              uids,

            updatedAt:
              new Date()
                .toISOString()
          }
        );
      }
    );


    currentPlayer.partyId =
      null;

    currentPlayer.partyRole =
      null;

    currentPlayer.partyMembers =
      [];


    await savePlayer();

    renderPartyUI();

    showNotification(
      "👋 パーティから離脱しました。"
    );

    return true;

  }
  catch (error) {

    console.error(error);

    showNotification(
      firebaseErrorMessage(
        error
      )
    );

    return false;
  }
}


// ============================================================
// Party Boss
// ============================================================

function getPartyBoss(
  party
) {

  return (
    party?.boss ||
    null
  );
}


async function applyPartyBossDamage(
  minutes,
  subject
) {

  if (
    !currentUser ||
    !currentPlayer?.partyId ||
    !db
  ) {
    return null;
  }


  const partyRef =
    doc(
      db,
      "parties",
      currentPlayer.partyId
    );


  let result = {
    damage: 0,
    defeated: false
  };


  try {

    await runTransaction(
      db,
      async transaction => {

        const snapshot =
          await transaction.get(
            partyRef
          );


        if (
          !snapshot.exists()
        ) {
          throw new Error(
            "PARTY_NOT_FOUND"
          );
        }


        const party =
          snapshot.data();


        const boss =
          party.boss;


        if (
          !boss ||
          boss.defeated ||
          !boss.active
        ) {

          return;
        }


        let damage =
          Math.max(
            0,
            Number(minutes) || 0
          ) * 10;


        if (
          boss.weaknessSubject ===
          subject
        ) {

          damage *= 2;
        }


        const boost =
          getBossDamageMultiplier();


        damage =
          Math.floor(
            damage * boost
          );


        const before =
          Number(
            boss.hp ||
            boss.maxHp
          );


        boss.hp =
          Math.max(
            0,
            before -
            damage
          );


        boss.totalDamage =
          Number(
            boss.totalDamage ||
            0
          ) + damage;


        boss.contributions = {
          ...(
            boss.contributions ||
            {}
          )
        };


        boss.contributions[
          currentUser.uid
        ] =
          Number(
            boss.contributions[
              currentUser.uid
            ] || 0
          ) +
          damage;


        let defeated =
          false;


        if (
          boss.hp <= 0
        ) {

          boss.hp = 0;

          boss.active =
            false;

          boss.defeated =
            true;

          boss.endsAt =
            new Date()
              .toISOString();

          defeated =
            true;
        }


        transaction.update(
          partyRef,
          {
            boss,

            updatedAt:
              new Date()
                .toISOString()
          }
        );


        result = {
          damage,

          defeated,

          weakness:
            boss.weaknessSubject ===
            subject
        };
      }
    );


    consumeBossDamageBuff();


    currentPlayer.boss.damage =
      Number(
        currentPlayer.boss.damage ||
        0
      ) +
      Number(
        result.damage ||
        0
      );


    currentPlayer.boss.contribution =
      Number(
        currentPlayer.boss.contribution ||
        0
      ) +
      Number(
        result.damage ||
        0
      );


    currentPlayer.boss.battles =
      Number(
        currentPlayer.boss.battles ||
        0
      ) + 1;


    if (
      result.weakness
    ) {

      currentPlayer.boss
        .weaknessDamage =
        Number(
          currentPlayer.boss
            .weaknessDamage ||
          0
        ) +
        Number(
          result.damage ||
          0
        );
    }


    if (
      result.damage >=
      500 &&
      result.weakness
    ) {

      await unlockTitle(
        "weakness-breaker",
        true
      );

      await unlockTitle(
        "secret-6",
        true
      );
    }


    if (
      result.defeated
    ) {

      await unlockTitle(
        "boss-first",
        true
      );

      await unlockTitle(
        "party-boss",
        true
      );

      await unlockTitle(
        "secret-7",
        true
      );

      showBossDefeatEffect();
    }


    await savePlayer();

    return result;

  }
  catch (error) {

    if (
      error.message ===
      "PARTY_NOT_FOUND"
    ) {

      currentPlayer.partyId =
        null;

      currentPlayer.partyRole =
        null;

      currentPlayer.partyMembers =
        [];

      await savePlayer();

      return null;
    }


    console.error(error);

    return null;
  }
}


// ============================================================
// Unified Boss Damage
// ============================================================

async function applyBossDamage(
  minutes,
  subject
) {

  if (
    !currentPlayer
  ) {
    return 0;
  }


  if (
    currentPlayer.partyId
  ) {

    const result =
      await applyPartyBossDamage(
        minutes,
        subject
      );

    renderBossUI();

    return Number(
      result?.damage || 0
    );
  }


  const result =
    await applyPersonalBossDamage(
      minutes,
      subject
    );


  await savePlayer();

  renderBossUI();

  return Number(
    result?.damage || 0
  );
}


// ============================================================
// Shop
// ============================================================

function getShopContainer() {

  let container =
    $("shop-auto-container");


  if (container) {
    return container;
  }


  const screen =
    $("shop-screen");


  if (!screen) {
    return null;
  }


  container =
    document.createElement(
      "div"
    );


  container.id =
    "shop-auto-container";

  container.className =
    "shop-auto-container";


  screen.appendChild(
    container
  );


  return container;
}


function renderShopUI() {

  const container =
    getShopContainer();


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  cleanExpiredBoosts(
    currentPlayer
  );


  container.innerHTML = `

    <section class="rpg-shop-panel">

      <div class="shop-header">

        <h2>
          🛒 闇市：受験者の武装庫
        </h2>

        <strong>
          🪙 ${currentPlayer.coins}
        </strong>

      </div>


      <div class="shop-grid">

        ${SHOP_ITEMS.map(
          item => {

            const purchased =
              !!currentPlayer
                .purchasedItems
                ?.[item.id];


            const inventory =
              Number(
                currentPlayer
                  .inventory
                  ?.[item.id] ||
                0
              );


            let buttonText =
              "購入";


            if (
              item.type ===
              "title" ||
              item.type ===
              "background"
            ) {

              buttonText =
                purchased
                  ? "所持済み"
                  : "購入";
            }
            else {

              buttonText =
                `購入 ${
                  inventory
                    ? `(${inventory}個)`
                    : ""
                }`;
            }


            return `

              <article
                class="rpg-shop-card"
              >

                <h3>
                  ${escapeHtml(
                    item.name
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    item.description
                  )}
                </p>

                <strong>
                  🪙 ${item.price}
                </strong>

                <button
                  type="button"
                  data-buy-item="${escapeHtml(
                    item.id
                  )}"
                  ${
                    (
                      (
                        item.type ===
                          "title" ||
                        item.type ===
                          "background"
                      ) &&
                      purchased
                    )
                      ? "disabled"
                      : ""
                  }
                >
                  ${buttonText}
                </button>

              </article>
            `;
          }
        ).join("")}

      </div>

    </section>
  `;


  if (
    !container.dataset.init
  ) {

    container.dataset.init =
      "1";


    container.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-buy-item]"
          );


        if (!button) {
          return;
        }


        purchaseShopItem(
          button.dataset.buyItem
        );
      }
    );
  }
}


// ============================================================
// Purchase Shop Item
// ============================================================

async function purchaseShopItem(
  id
) {

  const item =
    SHOP_ITEMS.find(
      value =>
        value.id === id
    );


  if (
    !item ||
    !currentPlayer
  ) {
    return false;
  }


  if (
    (
      item.type ===
        "title" ||
      item.type ===
        "background"
    ) &&
    currentPlayer
      .purchasedItems
      ?.[id]
  ) {

    showNotification(
      "すでに所持しています。"
    );

    return false;
  }


  if (
    currentPlayer.coins <
    item.price
  ) {

    showNotification(
      "🪙 コインが足りません。"
    );

    return false;
  }


  currentPlayer.coins -=
    item.price;


  currentPlayer
    .purchasedItems[id] =
    true;


  currentPlayer
    .inventory[id] =
    Number(
      currentPlayer
        .inventory[id] ||
      0
    ) + 1;


  // ----------------------------------------------------------
  // Title
  // ----------------------------------------------------------

  if (
    item.type ===
    "title"
  ) {

    await unlockTitle(
      item.target,
      true
    );
  }


  // ----------------------------------------------------------
  // Background
  // ----------------------------------------------------------

  if (
    item.type ===
    "background"
  ) {

    currentPlayer.background =
      item.target;

    applyBackground();
  }


  // ----------------------------------------------------------
  // XP Buff
  // ----------------------------------------------------------

  if (
    item.type ===
    "xpBoost"
  ) {

    currentPlayer
      .activeBoosts
      .xp
      .push({

        itemId:
          item.id,

        value:
          item.value,

        expiresAt:
          Date.now() +
          item.durationMinutes *
          60000
      });
  }


  // ----------------------------------------------------------
  // Boss Damage Buff
  // ----------------------------------------------------------

  if (
    item.type ===
    "bossDamage"
  ) {

    currentPlayer
      .activeBoosts
      .bossDamage
      .push({

        itemId:
          item.id,

        value:
          item.value,

        charges: 1,

        expiresAt:
          Date.now() +
          24 *
          60 *
          60000
      });
  }


  // ----------------------------------------------------------
  // Boss HP Down
  // ----------------------------------------------------------

  if (
    item.type ===
    "bossLevelDown"
  ) {

    const boss =
      getBossData();


    if (
      boss &&
      !boss.defeated &&
      boss.active
    ) {

      boss.maxHp =
        Math.max(
          100,
          Math.floor(
            Number(
              boss.maxHp
            ) *
            item.value
          )
        );


      boss.hp =
        Math.min(
          Number(
            boss.hp
          ),
          boss.maxHp
        );
    }
  }


  await savePlayer();


  renderShopUI();

  renderTitleUI();

  renderBossUI();

  updatePlayerUI();


  showNotification(
    `🛒 ${item.name}を購入した！`
  );


  return true;
}


// ============================================================
// UI Auto Container
// ============================================================

function ensureAutoContainer(
  screenId,
  containerId
) {

  let container =
    $(containerId);


  if (
    container
  ) {
    return container;
  }


  const screen =
    $(screenId);


  if (
    !screen
  ) {
    return null;
  }


  container =
    document.createElement(
      "div"
    );


  container.id =
    containerId;


  screen.appendChild(
    container
  );


  return container;
}


// ============================================================
// Title UI
// ============================================================

function renderTitleUI() {

  const container =
    ensureAutoContainer(
      "title-screen",
      "title-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  container.innerHTML = `

    <section
      class="rpg-title-panel"
    >

      <h2>
        🏷️ 称号
      </h2>

      <p>
        現在：
        <strong>
          ${escapeHtml(
            currentPlayer.title ||
            "見習い受験生"
          )}
        </strong>
      </p>


      <div
        class="title-grid"
      >

        ${TITLES.map(
          title => {

            const owned =
              hasTitle(
                title.id
              );


            const name =
              title.hidden &&
              !owned
                ? "？？？"
                : title.name;


            const description =
              title.hidden &&
              !owned
                ? "条件を満たすと解放されます。"
                : title.description;


            return `

              <article
                class="
                  rpg-title-card
                  ${
                    owned
                      ? "title-owned"
                      : "title-locked"
                  }
                "
              >

                <strong>
                  ${escapeHtml(
                    name
                  )}
                </strong>

                <p>
                  ${escapeHtml(
                    description
                  )}
                </p>


                ${
                  owned
                    ? `
                      <button
                        type="button"
                        data-equip-title="${escapeHtml(
                          title.id
                        )}"
                        ${
                          currentPlayer.title ===
                          title.name
                            ? "disabled"
                            : ""
                        }
                      >
                        ${
                          currentPlayer.title ===
                          title.name
                            ? "装備中"
                            : "装備"
                        }
                      </button>
                    `
                    : `
                      <span>
                        🔒 未解放
                      </span>
                    `
                }

              </article>
            `;
          }
        ).join("")}

      </div>

    </section>
  `;


  if (
    !container.dataset.init
  ) {

    container.dataset.init =
      "1";


    container.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-equip-title]"
          );


        if (!button) {
          return;
        }


        equipTitle(
          button.dataset.equipTitle
        );
      }
    );
  }
}


// ============================================================
// Achievement UI
// ============================================================

function renderAchievementUI() {

  const container =
    ensureAutoContainer(
      "achievement-screen",
      "achievement-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  container.innerHTML = `

    <section
      class="rpg-achievement-panel"
    >

      <h2>
        🏅 実績
      </h2>


      <div
        class="achievement-grid"
      >

        ${ACHIEVEMENTS.map(
          achievement => {

            const unlocked =
              achievementUnlocked(
                achievement.id
              );


            return `

              <article
                class="
                  achievement-card
                  ${
                    unlocked
                      ? "achievement-unlocked"
                      : "achievement-locked"
                  }
                "
              >

                <strong>

                  ${
                    unlocked
                      ? "🏆"
                      : "🔒"
                  }

                  ${escapeHtml(
                    achievement.title
                  )}

                </strong>


                <p>
                  ${escapeHtml(
                    achievement.description
                  )}
                </p>


                <small>

                  ${
                    unlocked
                      ? "達成済み"
                      : `報酬 🪙 ${
                          achievement.rewardCoins
                        }`
                  }

                </small>

              </article>
            `;
          }
        ).join("")}

      </div>

    </section>
  `;
}


// ============================================================
// Quest UI
// ============================================================

function renderQuestUI() {

  const container =
    ensureAutoContainer(
      "quest-screen",
      "quest-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  ensureQuestState(
    currentPlayer
  );


  const quests = [
    ...(
      currentPlayer
        .questState
        .daily || []
    ),

    currentPlayer
      .questState
      .weekly,

    currentPlayer
      .questState
      .rare
  ].filter(Boolean);


  container.innerHTML = `

    <section>

      <h2>
        ⚔️ クエスト
      </h2>


      <div
        class="rpg-quest-grid"
      >

        ${quests.map(
          quest => `

            <article
              class="
                rpg-quest-card
                ${
                  quest.completed
                    ? "quest-completed"
                    : ""
                }
              "
            >

              <h3>
                ${escapeHtml(
                  quest.title
                )}
              </h3>


              <p>
                ${escapeHtml(
                  quest.description
                )}
              </p>


              <div>

                ${
                  Math.min(
                    Number(
                      quest.progress ||
                      0
                    ),
                    Number(
                      quest.target ||
                      0
                    )
                  )
                }

                /

                ${quest.target}分

              </div>


              <div
                class="quest-progress-bar"
              >

                <div
                  class="quest-progress-fill"
                  style="
                    width:${
                      questProgressPercent(
                        quest
                      )
                    }%;
                  "
                ></div>

              </div>


              ${
                quest.claimed
                  ? `
                    <span>
                      ✅ 受取済み
                    </span>
                  `
                  : quest.completed
                    ? `
                      <button
                        type="button"
                        data-claim-quest="${escapeHtml(
                          quest.id
                        )}"
                      >
                        報酬を受け取る
                      </button>
                    `
                    : `
                      <span>
                        進行中
                      </span>
                    `
              }

            </article>

          `
        ).join("")}

      </div>

    </section>
  `;


  if (
    !container.dataset.init
  ) {

    container.dataset.init =
      "1";


    container.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-claim-quest]"
          );


        if (!button) {
          return;
        }


        const quest =
          findQuestById(
            button.dataset.claimQuest
          );


        if (quest) {
          claimQuestReward(
            quest
          );
        }
      }
    );
  }
}


// ============================================================
// Rank UI
// ============================================================

function renderRankProgress() {

  const container =
    ensureAutoContainer(
      "rank-screen",
      "rank-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  const minutes =
    Number(
      currentPlayer
        .seasonStudyMinutes ||
      0
    );


  const rank =
    calculateRank(
      minutes
    );


  const index =
    getRankIndex(
      rank
    );


  const current =
    RANKS[index];


  const next =
    RANKS[index + 1];


  const percent =
    next
      ? Math.min(
          100,
          Math.max(
            0,

            (
              (
                minutes -
                current.minMinutes
              ) /
              (
                next.minMinutes -
                current.minMinutes
              )
            ) *
            100
          )
        )
      : 100;


  container.innerHTML = `

    <section
      class="rank-auto-card"
    >

      <h2>
        🏆 ${escapeHtml(
          rank
        )}
      </h2>


      <p>
        シーズン勉強時間：
        <strong>
          ${formatMinutes(
            minutes
          )}
        </strong>
      </p>


      <div
        class="rank-progress-bar"
      >

        <div
          class="rank-progress-fill"
          style="
            width:${percent}%;
          "
        ></div>

      </div>


      <p>

        ${
          next
            ? `
              ${escapeHtml(
                next.name
              )}
              まで
              ${formatMinutes(
                next.minMinutes -
                minutes
              )}
            `
            : `
              👑 LEGEND到達
            `
        }

      </p>


      <div
        class="rank-list"
      >

        ${RANKS.map(
          item => `
            <div>

              ${escapeHtml(
                item.name
              )}

              —

              ${formatMinutes(
                item.minMinutes
              )}

            </div>
          `
        ).join("")}

      </div>


      ${
        currentPlayer
          .permanentLegendBoost
          ? `
            <div>
              👑 LEGEND BONUS：
              永久XP 1.5倍
            </div>
          `
          : ""
      }

    </section>
  `;
}


// ============================================================
// Boss UI
// ============================================================

async function renderBossUI() {

  const container =
    ensureAutoContainer(
      "boss-screen",
      "boss-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  let boss =
    getBossData();


  let party = null;


  if (
    currentPlayer.partyId
  ) {

    party =
      await syncPartyToPlayer();


    if (
      party?.boss
    ) {
      boss =
        party.boss;
    }
  }


  if (!boss) {
    return;
  }


  const maxHp =
    Math.max(
      1,
      Number(
        boss.maxHp
      ) || 1
    );


  const hp =
    Math.max(
      0,
      Number(
        boss.hp
      ) || 0
    );


  const percent =
    Math.max(
      0,
      Math.min(
        100,
        (
          hp /
          maxHp
        ) *
        100
      )
    );


  const contribution =
    currentPlayer.partyId &&
    party?.boss
      ? Number(
          party.boss
            .contributions
            ?.[
              currentUser.uid
            ] ||
          0
        )
      : Number(
          currentPlayer
            .boss
            ?.contribution ||
          0
        );


  container.innerHTML = `

    <section
      class="rpg-boss-panel"
    >

      <h2>
        ☠️ ${
          boss.defeated
            ? "討伐完了"
            : "WORLD BOSS"
        }
      </h2>


      <p>
        LEVEL ${
          Number(
            boss.level || 1
          )
        }
      </p>


      <div>

        HP

        ${hp.toLocaleString()}

        /

        ${maxHp.toLocaleString()}

      </div>


      <div
        class="boss-hp-bar"
      >

        <div
          class="boss-hp-fill"
          style="
            width:${percent}%;
          "
        ></div>

      </div>


      <p>

        弱点：

        <strong>
          ${escapeHtml(
            getSubjectName(
              boss.weaknessSubject ||
              "不明"
            )
          )}
        </strong>

      </p>


      <p>

        ${
          currentPlayer.partyId
            ? "パーティ"
            : "自分の"
        }

        総貢献：

        ${contribution.toLocaleString()}

      </p>


      ${
        currentPlayer.partyId
          ? `
            <p>
              👥 パーティ：
              ${escapeHtml(
                currentPlayer.partyId
              )}
            </p>

            <p>
              総ダメージ：
              ${Number(
                boss.totalDamage ||
                0
              ).toLocaleString()}
            </p>
          `
          : ""
      }


      <small>
        勉強記録時に自動でダメージを与えます。
      </small>

    </section>
  `;
}


// ============================================================
// Party UI
// ============================================================

function renderPartyUI() {

  const container =
    ensureAutoContainer(
      "party-screen",
      "party-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  const members =
    (
      currentPlayer
        .partyMembers ||
      []
    ).slice(
      0,
      MAX_PARTY_MEMBERS
    );


  container.innerHTML = `

    <section
      class="rpg-party-panel"
    >

      <h2>
        👥 PARTY
      </h2>


      <p>
        最大${MAX_PARTY_MEMBERS}人の受験者で挑む。
      </p>


      <p>
        パーティID：

        <strong>
          ${
            escapeHtml(
              currentPlayer.partyId ||
              "未参加"
            )
          }
        </strong>

      </p>


      <p>
        役割：

        ${
          escapeHtml(
            currentPlayer.partyRole ||
            "なし"
          )
        }

      </p>


      ${
        !currentPlayer.partyId
          ? `
            <div
              class="party-actions"
            >

              <button
                type="button"
                data-party-create
              >
                ⚔️ パーティを作成
              </button>

              <button
                type="button"
                data-party-join
              >
                🔑 パーティに参加
              </button>

            </div>
          `
          : `
            <button
              type="button"
              data-party-leave
            >
              👋 パーティから離脱
            </button>
          `
      }


      <div
        class="party-members"
      >

        ${
          members.length
            ? members.map(
                member => `
                  <div
                    class="party-member-card"
                  >

                    <strong>
                      ${escapeHtml(
                        member.displayName ||
                        member.userId ||
                        "プレイヤー"
                      )}
                    </strong>

                    <small>
                      ${escapeHtml(
                        member.role ||
                        "Member"
                      )}
                    </small>

                  </div>
                `
              ).join("")
            : `
              <div>
                パーティメンバーはいません。
              </div>
            `
        }

      </div>

    </section>
  `;


  if (
    !container.dataset.init
  ) {

    container.dataset.init =
      "1";


    container.addEventListener(
      "click",
      async event => {

        const createButton =
          event.target.closest(
            "[data-party-create]"
          );


        if (
          createButton
        ) {

          await createParty();

          return;
        }


        const joinButton =
          event.target.closest(
            "[data-party-join]"
          );


        if (
          joinButton
        ) {

          const id =
            window.prompt(
              "パーティIDを入力してください"
            );


          if (id) {

            await joinParty(
              id
            );
          }

          return;
        }


        const leaveButton =
          event.target.closest(
            "[data-party-leave]"
          );


        if (
          leaveButton
        ) {

          await leaveParty();
        }
      }
    );
  }
}


// ============================================================
// Login Bonus UI
// ============================================================

function renderLoginBonusUI() {

  const container =
    ensureAutoContainer(
      "login-bonus-screen",
      "login-bonus-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  container.innerHTML = `

    <section
      class="rpg-login-bonus-panel"
    >

      <h2>
        🔥 ログインボーナス
      </h2>


      <div>
        現在の連続ログイン：
        <strong>
          ${currentPlayer.loginStreak}日
        </strong>
      </div>


      <div
        class="login-reward-grid"
      >

        <div>
          <strong>
            3日
          </strong>
          <span>
            🪙50 / XP20
          </span>
        </div>


        <div>
          <strong>
            7日
          </strong>
          <span>
            🪙100 / XP50
          </span>
        </div>


        <div>
          <strong>
            30日
          </strong>
          <span>
            🪙300 / XP100
          </span>
        </div>

      </div>

    </section>
  `;
}


// ============================================================
// History UI
// ============================================================

function renderHistoryUI() {

  const container =
    ensureAutoContainer(
      "history-screen",
      "history-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  const history =
    (
      currentPlayer
        .studyHistory ||
      []
    ).slice(
      0,
      50
    );


  container.innerHTML = `

    <section
      class="rpg-history-panel"
    >

      <h2>
        📜 学習履歴
      </h2>


      ${
        history.length
          ? `
            <div
              class="study-history-list"
            >

              ${history.map(
                record => `
                  <div
                    class="study-history-item"
                  >

                    <strong>
                      ${escapeHtml(
                        getSubjectName(
                          record.subject
                        )
                      )}
                    </strong>

                    <span>
                      ${record.minutes}分
                    </span>

                    <span>
                      +${record.xp} XP
                    </span>

                    <small>
                      ${escapeHtml(
                        record.date || ""
                      )}
                    </small>

                  </div>
                `
              ).join("")}

            </div>
          `
          : `
            <p>
              まだ学習記録がありません。
            </p>
          `
      }

    </section>
  `;
}


// ============================================================
// Subject UI
// ============================================================

function renderSubjectUI() {

  const container =
    ensureAutoContainer(
      "subject-screen",
      "subject-auto-container"
    );


  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }


  const subjects =
    getQuestSubjectCandidates(
      currentPlayer
    );


  container.innerHTML = `

    <section
      class="rpg-subject-panel"
    >

      <h2>
        📚 教科ステータス
      </h2>


      <div
        class="subject-grid"
      >

        ${
          subjects.length
            ? subjects.map(
                subject => {

                  const minutes =
                    Number(
                      currentPlayer
                        .subjectStudyMinutes
                        ?.[subject] ||
                      0
                    );


                  const level =
                    Math.min(
                      100,
                      Math.floor(
                        minutes /
                        30
                      )
                    );


                  const progress =
                    level >= 100
                      ? 100
                      : (
                          minutes %
                          30
                        ) /
                        30 *
                        100;


                  return `

                    <article
                      class="subject-card"
                    >

                      <h3>
                        ${escapeHtml(
                          getSubjectName(
                            subject
                          )
                        )}
                      </h3>


                      <strong>
                        Lv.${level}
                      </strong>


                      <p>
                        ${formatMinutes(
                          minutes
                        )}
                      </p>


                      <div
                        class="subject-progress-bar"
                      >

                        <div
                          class="subject-progress-fill"
                          style="
                            width:${progress}%;
                          "
                        ></div>

                      </div>

                    </article>
                  `;
                }
              ).join("")
            : `
              <p>
                登録教科がありません。
              </p>
            `
        }

      </div>

    </section>
  `;
}


// ============================================================
// Leaderboard UI
// ============================================================

async function renderLeaderboardUI() {

  const container =
    ensureAutoContainer(
      "leaderboard-screen",
      "leaderboard-auto-container"
    );


  if (
    !container ||
    !db
  ) {
    return;
  }


  try {

    const q =
      query(
        collection(
          db,
          "users"
        ),
        orderBy(
          "seasonStudyMinutes",
          "desc"
        ),
        limit(20)
      );


    const snapshot =
      await getDocs(q);


    const players =
      snapshot.docs.map(
        document => ({
          uid:
            document.id,

          ...document.data()
        })
      );


    container.innerHTML = `

      <section
        class="rpg-leaderboard-panel"
      >

        <h2>
          🏆 SEASON LEADERBOARD
        </h2>


        <p>
          今月の勉強時間ランキング
        </p>


        <div
          class="leaderboard-list"
        >

          ${
            players.length
              ? players.map(
                  (player, index) => `

                    <div
                      class="leaderboard-item"
                    >

                      <strong>
                        #${index + 1}
                      </strong>

                      <span>
                        ${escapeHtml(
                          player.displayName ||
                          player.userId ||
                          "プレイヤー"
                        )}
                      </span>

                      <span>
                        ${formatMinutes(
                          player.seasonStudyMinutes ||
                          0
                        )}
                      </span>

                    </div>
                  `
                ).join("")
              : `
                <p>
                  ランキングデータがありません。
                </p>
              `
          }

        </div>

      </section>
    `;

  }
  catch (error) {

    console.error(error);

    container.innerHTML = `
      <section>
        <h2>
          🏆 SEASON LEADERBOARD
        </h2>
        <p>
          ランキングを取得できませんでした。
        </p>
      </section>
    `;
  }
}


// ============================================================
// Player UI
// ============================================================

function updatePlayerUI() {

  if (!currentPlayer) {
    return;
  }


  const progress =
    getLevelProgress(
      currentPlayer.xp
    );


  setText(
    "player-name",
    currentPlayer.displayName
  );

  setText(
    "display-name",
    currentPlayer.displayName
  );

  setText(
    "current-title",
    currentPlayer.title
  );


  setText(
    "player-level",
    `Lv.${currentPlayer.level}`
  );

  setText(
    "level",
    currentPlayer.level
  );


  setText(
    "xp",
    currentPlayer.xp
  );

  setText(
    "xp-value",
    currentPlayer.xp
  );


  setText(
    "xp-current",
    progress.current
  );

  setText(
    "xp-required",
    progress.required
  );


  setText(
    "coins",
    currentPlayer.coins
  );

  setText(
    "coin-count",
    currentPlayer.coins
  );


  setText(
    "total-study-time",
    formatMinutes(
      currentPlayer.totalStudyMinutes
    )
  );


  setText(
    "today-study-time",
    formatMinutes(
      currentPlayer.todayStudyMinutes
    )
  );


  setText(
    "current-rank",
    currentPlayer.rank
  );

  setText(
    "rank-name",
    currentPlayer.rank
  );


  setText(
    "rank-study-time",
    formatMinutes(
      currentPlayer.seasonStudyMinutes
    )
  );


  setText(
    "login-streak",
    currentPlayer.loginStreak
  );


  setText(
    "course",
    getCourseName(
      currentPlayer.course
    )
  );


  const progressBars = [
    "xp-progress-fill",
    "level-progress-fill"
  ];


  for (
    const id of progressBars
  ) {

    const element =
      $(id);

    if (!element) {
      continue;
    }

    element.style.width =
      `${progress.percent}%`;
  }


  applyBackground();
}


// ============================================================
// Background
// ============================================================

function applyBackground() {

  if (
    !currentPlayer ||
    !document.body
  ) {
    return;
  }


  document.body.dataset.rpgBackground =
    currentPlayer.background ||
    "default";
}


// ============================================================
// Notifications
// ============================================================

function showNotification(
  message
) {

  let container =
    $("notification-container");


  if (!container) {

    container =
      document.createElement(
        "div"
      );

    container.id =
      "notification-container";

    document.body.appendChild(
      container
    );
  }


  const notification =
    document.createElement(
      "div"
    );


  notification.className =
    "rpg-notification";


  notification.textContent =
    message;


  container.appendChild(
    notification
  );


  setTimeout(
    () => {

      notification.remove();

    },
    4000
  );
}


// ============================================================
// Effects
// ============================================================

function effect(
  message,
  className = "rpg-effect"
) {

  const element =
    document.createElement(
      "div"
    );


  element.className =
    className;


  element.textContent =
    message;


  document.body.appendChild(
    element
  );


  setTimeout(
    () => {
      element.remove();
    },
    1800
  );
}


function showLevelUpEffect(
  before,
  after
) {

  effect(
    `⚡ LEVEL UP! Lv.${before} → Lv.${after}`,
    "level-up-effect"
  );
}


function showTitleUnlockEffect(
  title
) {

  effect(
    `🏷️ NEW TITLE「${title.name}」`
  );
}


function showAchievementEffect(
  achievement
) {

  effect(
    `🏆 ACHIEVEMENT「${achievement.title}」`
  );
}


function showBossDefeatEffect() {

  effect(
    "☠️ WORLD BOSS DEFEATED!",
    "boss-defeat-effect"
  );
}


// ============================================================
// Study Record
// ============================================================

async function recordStudy(
  minutes,
  subject,
  date = getJapanDateString(),
  source = "manual"
) {

  if (
    !currentPlayer ||
    studyRecordBusy
  ) {
    return false;
  }


  minutes =
    Math.max(
      0,
      Math.floor(
        Number(minutes) || 0
      )
    );


  if (
    minutes <= 0
  ) {
    return false;
  }


  subject =
    String(
      subject || ""
    ).trim();


  if (
    !subject
  ) {

    showNotification(
      "教科を選択してください。"
    );

    return false;
  }


  studyRecordBusy =
    true;


  try {

    const oldLevel =
      currentPlayer.level;


    const oldRank =
      currentPlayer.rank;


    normalizeDailyData(
      currentPlayer
    );


    if (
      !currentPlayer
        .subjects
        .includes(subject)
    ) {

      currentPlayer
        .subjects
        .push(subject);
    }


    // ----------------------------------------------------------
    // Study Time
    // ----------------------------------------------------------

    currentPlayer
      .totalStudyMinutes +=
      minutes;


    if (
      date ===
      getJapanDateString()
    ) {

      currentPlayer
        .todayStudyMinutes +=
        minutes;
    }


    currentPlayer
      .seasonStudyMinutes +=
      minutes;


    // ----------------------------------------------------------
    // Subject
    // ----------------------------------------------------------

    currentPlayer
      .subjectStudyMinutes[
        subject
      ] =
      Number(
        currentPlayer
          .subjectStudyMinutes[
            subject
          ] ||
        0
      ) +
      minutes;


    currentPlayer
      .subjectLevels[
        subject
      ] =
      Math.min(
        100,
        Math.floor(
          currentPlayer
            .subjectStudyMinutes[
              subject
            ] /
          30
        )
      );


    // ----------------------------------------------------------
    // Subject history
    // ----------------------------------------------------------

    if (
      !Array.isArray(
        currentPlayer
          .subjectHistory[
            subject
          ]
      )
    ) {

      currentPlayer
        .subjectHistory[
          subject
        ] = [];
    }


    currentPlayer
      .subjectHistory[
        subject
      ]
      .unshift({

        date,

        minutes,

        createdAt:
          new Date()
            .toISOString()
      });


    currentPlayer
      .subjectHistory[
        subject
      ] =
      currentPlayer
        .subjectHistory[
          subject
        ]
        .slice(0, 100);


    // ----------------------------------------------------------
    // XP
    // ----------------------------------------------------------

    const multiplier =
      getXpMultiplier();


    const xp =
      Math.floor(
        minutes *
        multiplier
      );


    currentPlayer.xp +=
      xp;


    currentPlayer.level =
      calculateLevel(
        currentPlayer.xp
      );


    if (
      date ===
      getJapanDateString()
    ) {

      currentPlayer.todayXp +=
        xp;
    }


    // ----------------------------------------------------------
    // Coins
    // ----------------------------------------------------------

    const coins =
      Math.floor(
        minutes / 10
      );


    currentPlayer.coins +=
      coins;


    if (
      date ===
      getJapanDateString()
    ) {

      currentPlayer.todayCoins +=
        coins;
    }


    // ----------------------------------------------------------
    // History
    // ----------------------------------------------------------

    currentPlayer
      .studyHistory
      .unshift({

        date,

        subject,

        minutes,

        xp,

        source,

        createdAt:
          new Date()
            .toISOString()
      });


    currentPlayer
      .studyHistory =
      currentPlayer
        .studyHistory
        .slice(
          0,
          200
        );


    // ----------------------------------------------------------
    // Quest
    // ----------------------------------------------------------

    const completed =
      updateQuestProgress(
        subject,
        minutes,
        date
      );


    for (
      const quest of
      completed
    ) {

      showNotification(
        `⚔️ ${quest.title}達成！報酬を受け取ろう！`
      );
    }


    // ----------------------------------------------------------
    // Boss
    // ----------------------------------------------------------

    const bossDamage =
      await applyBossDamage(
        minutes,
        subject
      );


    // ----------------------------------------------------------
    // Rank
    // ----------------------------------------------------------

    normalizeSeasonData(
      currentPlayer
    );


    await savePlayer();


    // ----------------------------------------------------------
    // Effects
    // ----------------------------------------------------------

    if (
      currentPlayer.level >
      oldLevel
    ) {

      showLevelUpEffect(
        oldLevel,
        currentPlayer.level
      );
    }


    if (
      currentPlayer.rank !==
      oldRank
    ) {

      effect(
        `🏆 RANK UP! ${oldRank} → ${currentPlayer.rank}`,
        "rank-up-effect"
      );
    }


    await checkAchievements();


    updatePlayerUI();

    renderAllAutoUI();


    showNotification(
      `📚 ${
        getSubjectName(subject)
      } +${minutes}分 / +${xp} XP${
        bossDamage
          ? ` / ⚔️-${bossDamage} HP`
          : ""
      }`
    );


    return true;

  }
  catch (error) {

    console.error(error);

    showNotification(
      firebaseErrorMessage(
        error
      )
    );

    return false;

  }
  finally {

    studyRecordBusy =
      false;
  }
}


// ============================================================
// Timer
// ============================================================

function timerElapsedSeconds() {

  if (
    !timerState.running ||
    !timerState.segmentStartedAt
  ) {

    return Math.floor(
      timerState.accumulatedSeconds
    );
  }


  return (
    timerState.accumulatedSeconds +
    Math.max(
      0,
      (
        Date.now() -
        timerState.segmentStartedAt
      ) / 1000
    )
  );
}


function updateTimerUI() {

  const seconds =
    Math.floor(
      timerElapsedSeconds()
    );


  const hours =
    Math.floor(
      seconds / 3600
    );


  const minutes =
    Math.floor(
      (
        seconds % 3600
      ) / 60
    );


  const secs =
    seconds % 60;


  const value =
    `${String(
      hours
    ).padStart(2, "0")}:` +
    `${String(
      minutes
    ).padStart(2, "0")}:` +
    `${String(
      secs
    ).padStart(2, "0")}`;


  setText(
    "study-timer",
    value
  );

  setText(
    "timer-display",
    value
  );
}


function startTimer(
  subject
) {

  if (
    timerState.running
  ) {

    showNotification(
      "すでにタイマーが動いています。"
    );

    return;
  }


  if (!subject) {

    showNotification(
      "教科を選択してください。"
    );

    return;
  }


  timerState.running =
    true;


  timerState.startedAt =
    Date.now();


  timerState.accumulatedSeconds =
    0;


  timerState.segmentStartedAt =
    Date.now();


  timerState.segmentJapanDate =
    getJapanDateString();


  timerState.lastJapanDate =
    timerState.segmentJapanDate;


  timerState.subject =
    subject;


  if (!timerInterval) {

    timerInterval =
      setInterval(
        checkTimerTick,
        1000
      );
  }


  updateTimerUI();


  showNotification(
    "⏱️ 勉強タイマー開始！"
  );
}


async function stopTimer() {

  if (
    !timerState.running
  ) {
    return;
  }


  await finalizeTimerSegment();


  timerState.running =
    false;


  timerState.startedAt =
    null;


  timerState.accumulatedSeconds =
    0;


  timerState.segmentStartedAt =
    null;


  timerState.segmentJapanDate =
    null;


  timerState.subject =
    null;


  updateTimerUI();


  showNotification(
    "⏹️ タイマー停止！"
  );
}


async function finalizeTimerSegment() {

  if (
    !timerState.segmentStartedAt ||
    !timerState.subject
  ) {
    return;
  }


  const seconds =
    Math.floor(
      (
        Date.now() -
        timerState.segmentStartedAt
      ) / 1000
    );


  const minutes =
    Math.floor(
      seconds / 60
    );


  if (
    minutes > 0
  ) {

    const date =
      timerState.segmentJapanDate;


    await recordStudy(
      minutes,
      timerState.subject,
      date,
      "timer"
    );
  }


  timerState.accumulatedSeconds =
    0;


  timerState.segmentStartedAt =
    Date.now();


  timerState.segmentJapanDate =
    getJapanDateString();
}


async function checkTimerTick() {

  if (
    !timerState.running
  ) {
    return;
  }


  const today =
    getJapanDateString();


  if (
    today !==
      timerState.segmentJapanDate &&
    !timerState.midnightBusy
  ) {

    timerState.midnightBusy =
      true;


    try {

      await finalizeTimerSegment();

    }
    finally {

      timerState.midnightBusy =
        false;
    }
  }


  updateTimerUI();
}


// ============================================================
// Runtime Style
// ============================================================

function injectRuntimeStyle() {

  if (
    $("rpg-runtime-style")
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "rpg-runtime-style";


  style.textContent = `

    /* --------------------------------------------------------
       Notifications
    -------------------------------------------------------- */

    .rpg-notification,
    .rpg-effect {

      position: fixed;

      z-index: 99999;

      left: 50%;

      top: 18%;

      transform:
        translate(-50%, -20px);

      opacity: 0;

      pointer-events: none;

      animation:
        rpgPop .35s ease forwards;
    }


    .rpg-notification {

      padding:
        12px 18px;

      border-radius:
        12px;

      background:
        var(--bg-card);

      box-shadow:
        var(--rpg-shadow);
    }


    .rpg-effect {

      font-size:
        clamp(
          20px,
          4vw,
          42px
        );

      font-weight:
        900;

      text-align:
        center;
    }


    .level-up-effect,
    .rank-up-effect,
    .boss-defeat-effect {

      animation:
        rpgFlash 1.8s ease forwards;
    }


    /* --------------------------------------------------------
       Page Transition
    -------------------------------------------------------- */

    body.rpg-page-transition {

      opacity:
        0;

      transform:
        translateY(8px);

      transition:
        opacity .18s ease,
        transform .18s ease;
    }


    body.rpg-page-ready {

      opacity:
        1;

      transform:
        none;
    }


    /* --------------------------------------------------------
       Bars
    -------------------------------------------------------- */

    .quest-progress-bar,
    .rank-progress-bar,
    .boss-hp-bar,
    .subject-progress-bar {

      overflow:
        hidden;
    }


    .quest-progress-fill,
    .rank-progress-fill,
    .boss-hp-fill,
    .subject-progress-fill {

      transition:
        width .35s ease;
    }


    /* --------------------------------------------------------
       Background Hooks
    -------------------------------------------------------- */

    body[data-rpg-background="abyss"] {

      background-image:
        var(--rpg-bg-abyss);
    }


    body[data-rpg-background="royal"] {

      background-image:
        var(--rpg-bg-royal);
    }


    body[data-rpg-background="cosmic"] {

      background-image:
        var(--rpg-bg-cosmic);
    }


    /* --------------------------------------------------------
       Animations
    -------------------------------------------------------- */

    @keyframes rpgPop {

      to {

        opacity:
          1;

        transform:
          translate(-50%, 0);
      }
    }


    @keyframes rpgFlash {

      0% {

        opacity:
          0;

        transform:
          translate(
            -50%,
            -20px
          )
          scale(.7);
      }


      15% {

        opacity:
          1;

        transform:
          translate(
            -50%,
            0
          )
          scale(1.05);
      }


      75% {

        opacity:
          1;
      }


      100% {

        opacity:
          0;

        transform:
          translate(
            -50%,
            -20px
          )
          scale(1);
      }
    }

  `;


  document.head.appendChild(
    style
  );


  document.body.classList.add(
    "rpg-page-transition"
  );


  requestAnimationFrame(
    () => {

      document.body.classList.add(
        "rpg-page-ready"
      );
    }
  );
}


// ============================================================
// Auto Create Screens
// ============================================================

function ensureScreen(
  id,
  title
) {

  let screen =
    $(id);


  if (
    screen
  ) {
    return screen;
  }


  const app =
    $("app-screen") ||
    document.body;


  screen =
    document.createElement(
      "section"
    );


  screen.id =
    id;

  screen.className =
    "screen";


  screen.innerHTML = `

    <div
      class="rpg-generated-screen-header"
    >

      <h1>
        ${escapeHtml(title)}
      </h1>

    </div>

  `;


  app.appendChild(
    screen
  );


  return screen;
}


function ensureRequiredScreens() {

  ensureScreen(
    "shop-screen",
    "ショップ"
  );

  ensureScreen(
    "title-screen",
    "称号"
  );

  ensureScreen(
    "achievement-screen",
    "実績"
  );

  ensureScreen(
    "boss-screen",
    "ボス"
  );

  ensureScreen(
    "party-screen",
    "パーティ"
  );

  ensureScreen(
    "login-bonus-screen",
    "ログインボーナス"
  );

  ensureScreen(
    "quest-screen",
    "クエスト"
  );

  ensureScreen(
    "rank-screen",
    "ランク"
  );

  ensureScreen(
    "history-screen",
    "学習履歴"
  );

  ensureScreen(
    "subject-screen",
    "教科"
  );

  ensureScreen(
    "leaderboard-screen",
    "ランキング"
  );
}


// ============================================================
// Navigation
// ============================================================

function transitionPage(
  targetId
) {

  document.body.classList.remove(
    "rpg-page-ready"
  );

  document.body.classList.add(
    "rpg-page-transition"
  );


  setTimeout(
    () => {

      document
        .querySelectorAll(
          "[id$='-screen'], .screen"
        )
        .forEach(
          screen => {

            if (
              screen.id ===
              targetId
            ) {

              screen.style.display =
                "";

              screen.classList.remove(
                "hidden"
              );

            }
            else {

              screen.style.display =
                "none";
            }
          }
        );


      requestAnimationFrame(
        () => {

          document.body.classList.add(
            "rpg-page-ready"
          );
        }
      );


      renderScreenById(
        targetId
      );

    },
    120
  );
}


function renderScreenById(
  id
) {

  switch (id) {

    case "shop-screen":
      renderShopUI();
      break;

    case "title-screen":
      renderTitleUI();
      break;

    case "achievement-screen":
      renderAchievementUI();
      break;

    case "boss-screen":
      renderBossUI();
      break;

    case "party-screen":
      renderPartyUI();
      break;

    case "login-bonus-screen":
      renderLoginBonusUI();
      break;

    case "quest-screen":
      renderQuestUI();
      break;

    case "rank-screen":
      renderRankProgress();
      break;

    case "history-screen":
      renderHistoryUI();
      break;

    case "subject-screen":
      renderSubjectUI();
      break;

    case "leaderboard-screen":
      renderLeaderboardUI();
      break;
  }
}


function bindNavigation() {

  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-screen]"
        );


      if (!button) {
        return;
      }


      event.preventDefault();


      const id =
        button.dataset.screen;


      if (!id) {
        return;
      }


      transitionPage(
        id
      );
    }
  );
}


// ============================================================
// Auth
// ============================================================

function bindAuth() {

  const loginForm =
    $("login-form");


  const signupForm =
    $("signup-form");


  if (
    loginForm &&
    !loginForm.dataset.init
  ) {

    loginForm.dataset.init =
      "1";


    loginForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        clearError(
          "login-error"
        );


        try {

          const userId =
            normalizeUserId(
              $("login-user-id")
                ?.value ||
              $("login-user")
                ?.value
            );


          const password =
            $("login-password")
              ?.value ||
            "";


          if (!userId) {

            showError(
              "login-error",
              "ユーザーIDを入力してください。"
            );

            return;
          }


          await signInWithEmailAndPassword(
            auth,
            userIdToEmail(
              userId
            ),
            password
          );

        }
        catch (error) {

          showError(
            "login-error",
            firebaseErrorMessage(
              error
            )
          );
        }
      }
    );
  }


  if (
    signupForm &&
    !signupForm.dataset.init
  ) {

    signupForm.dataset.init =
      "1";


    signupForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        clearError(
          "signup-error"
        );


        try {

          const userId =
            normalizeUserId(
              $("signup-user-id")
                ?.value ||
              $("signup-user")
                ?.value
            );


          const password =
            $("signup-password")
              ?.value ||
            "";


          if (!userId) {

            showError(
              "signup-error",
              "ユーザーIDを入力してください。"
            );

            return;
          }


          const userCredential =
            await createUserWithEmailAndPassword(
              auth,
              userIdToEmail(
                userId
              ),
              password
            );


          const user =
            userCredential.user;


          currentPlayer =
            await createPlayer(
              user,
              {
                displayName:
                  userId,

                userId
              }
            );


          await processLoginStreak();

          await checkAchievements();


          showElement(
            "app-screen"
          );

          hideElement(
            "auth-screen"
          );


          updatePlayerUI();

          renderAllAutoUI();

        }
        catch (error) {

          showError(
            "signup-error",
            firebaseErrorMessage(
              error
            )
          );
        }
      }
    );
  }


  document
    .querySelectorAll(
      "[data-logout]"
    )
    .forEach(
      button => {

        if (
          button.dataset.init
        ) {
          return;
        }


        button.dataset.init =
          "1";


        button.addEventListener(
          "click",
          async () => {

            if (
              auth
            ) {

              await signOut(
                auth
              );
            }
          }
        );
      }
    );
}


// ============================================================
// Study Bindings
// ============================================================

function bindStudy() {

  document.addEventListener(
    "click",
    async event => {

      const recordButton =
        event.target.closest(
          "[data-record-study]"
        );


      if (
        recordButton
      ) {

        const minutes =
          Number(
            recordButton
              .dataset
              .minutes ||
            0
          );


        const subject =
          recordButton
            .dataset
            .subject ||
          $("study-subject")
            ?.value;


        await recordStudy(
          minutes,
          subject
        );

        return;
      }


      const startButton =
        event.target.closest(
          "[data-timer-start]"
        );


      if (
        startButton
      ) {

        startTimer(
          startButton
            .dataset
            .subject ||
          $("study-subject")
            ?.value
        );

        return;
      }


      const stopButton =
        event.target.closest(
          "[data-timer-stop]"
        );


      if (
        stopButton
      ) {

        await stopTimer();

        return;
      }
    }
  );


  const form =
    $("study-record-form");


  if (
    form &&
    !form.dataset.init
  ) {

    form.dataset.init =
      "1";


    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const minutes =
          Number(
            $("study-minutes")
              ?.value ||
            0
          );


        const subject =
          $("study-subject")
            ?.value;


        if (
          minutes > 0 &&
          subject
        ) {

          await recordStudy(
            minutes,
            subject
          );
        }
      }
    );
  }
}


// ============================================================
// Signup Subject Helpers
// ============================================================

function getSelectedSubjectsFromSignup() {

  const result = [];


  document
    .querySelectorAll(
      "[data-subject]:checked"
    )
    .forEach(
      element => {

        const subject =
          element.dataset.subject;

        if (
          SUBJECT_NAMES[
            subject
          ] &&
          !result.includes(
            subject
          )
        ) {

          result.push(
            subject
          );
        }
      }
    );


  const select =
    $("signup-subjects");


  if (
    select?.value
  ) {

    const values =
      Array.isArray(
        select.value
      )
        ? select.value
        : [select.value];


    for (
      const value of
      values
    ) {

      if (
        SUBJECT_NAMES[
          value
        ] &&
        !result.includes(
          value
        )
      ) {

        result.push(
          value
        );
      }
    }
  }


  return result;
}


function bindSubjectRegistration() {

  document.addEventListener(
    "change",
    event => {

      const element =
        event.target;


      if (
        !element.matches(
          "[data-subject]"
        )
      ) {
        return;
      }


      if (
        !currentPlayer
      ) {
        return;
      }


      const subject =
        element.dataset.subject;


      if (
        !SUBJECT_NAMES[
          subject
        ]
      ) {
        return;
      }


      if (
        element.checked
      ) {

        if (
          !currentPlayer
            .subjects
            .includes(
              subject
            )
        ) {

          currentPlayer
            .subjects
            .push(
              subject
            );
        }

      }
      else {

        currentPlayer.subjects =
          currentPlayer
            .subjects
            .filter(
              value =>
                value !==
                subject
            );
      }


      ensureQuestState(
        currentPlayer
      );


      savePlayer()
        .then(
          () => {

            renderAllAutoUI();
          }
        );
    }
  );
}


// ============================================================
// Account / Profile
// ============================================================

function bindProfile() {

  const form =
    $("profile-form");


  if (
    form &&
    !form.dataset.init
  ) {

    form.dataset.init =
      "1";


    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        if (
          !currentPlayer
        ) {
          return;
        }


        const displayName =
          $("display-name-input")
            ?.value
            ?.trim();


        if (
          displayName
        ) {

          currentPlayer
            .displayName =
            displayName;

          await savePlayer();

          updatePlayerUI();

          showNotification(
            "プロフィールを更新しました。"
          );
        }
      }
    );
  }
}


// ============================================================
// Render All
// ============================================================

function renderAllAutoUI() {

  if (
    !currentPlayer
  ) {
    return;
  }


  renderQuestUI();

  renderRankProgress();

  renderTitleUI();

  renderShopUI();

  renderAchievementUI();

  renderBossUI();

  renderPartyUI();

  renderLoginBonusUI();

  renderHistoryUI();

  renderSubjectUI();


  // Leaderboard is intentionally
  // asynchronous and independent.
  renderLeaderboardUI();
}


// ============================================================
// Boot
// ============================================================

async function boot() {

  if (
    booted
  ) {
    return;
  }


  booted =
    true;


  injectRuntimeStyle();

  ensureRequiredScreens();

  bindNavigation();

  bindStudy();

  bindAuth();

  bindSubjectRegistration();

  bindProfile();


  if (
    !await initializeFirebase()
  ) {
    return;
  }


  if (
    authObserverStarted
  ) {
    return;
  }


  authObserverStarted =
    true;


  onAuthStateChanged(
    auth,
    async user => {

      currentUser =
        user;


      if (!user) {

        currentPlayer =
          null;


        hideElement(
          "app-screen"
        );


        showElement(
          "auth-screen"
        );


        return;
      }


      try {

        currentPlayer =
          await loadPlayer(
            user
          );


        if (
          !currentPlayer
        ) {

          currentPlayer =
            await createPlayer(
              user
            );
        }


        // Preserve previous season
        // information before current
        // season normalization.
        normalizeDailyData(
          currentPlayer
        );


        normalizeSeasonData(
          currentPlayer
        );


        ensureQuestState(
          currentPlayer
        );


        await processLoginStreak();


        await checkAchievements();


        await checkTitles();


        await savePlayer();


        ensureRequiredScreens();


        showElement(
          "app-screen"
        );


        hideElement(
          "auth-screen"
        );


        updatePlayerUI();


        renderAllAutoUI();


        // Keep timer display alive.
        updateTimerUI();

      }
      catch (error) {

        console.error(error);


        showNotification(
          firebaseErrorMessage(
            error
          )
        );
      }
    }
  );
}


// ============================================================
// Start
// ============================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    boot
  );

}
else {

  boot();
}


// ============================================================
// Existing HTML onclick compatibility
// ============================================================

window.RPG = {

  // Study
  recordStudy,

  // Timer
  startTimer,
  stopTimer,

  // Quest
  claimQuestReward,

  // Titles
  equipTitle,

  // Shop
  purchaseShopItem,

  // Party
  createParty,
  joinParty,
  leaveParty,

  // UI
  renderAllAutoUI,

  // Player
  getPlayer:
    () =>
      currentPlayer,

  // Auth
  signOut:
    () =>
      auth &&
      signOut(auth),

  // Utility
  getRank:
    () =>
      currentPlayer
        ? currentPlayer.rank
        : "Bronze",

  getLevel:
    () =>
      currentPlayer
        ? currentPlayer.level
        : 1,

  getXp:
    () =>
      currentPlayer
        ? currentPlayer.xp
        : 0
};
