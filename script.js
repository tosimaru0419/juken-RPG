// ============================================================
// 受験RPG - script.js
// 完全置換版
// Firebase v12.2.1
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

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);


// ============================================================
// DOM HELPERS
// ============================================================

const $ = (id) => document.getElementById(id);

const APP_SCREEN_IDS = [
  "home-screen",
  "study-screen",
  "quest-screen",
  "party-screen",
  "rank-screen",
  "other-screen"
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uniqueArray(arr) {
  return [...new Set(Array.isArray(arr) ? arr : [])];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}


// ============================================================
// SUBJECTS
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


// ============================================================
// RANK
// ============================================================

const RANKS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 600 },
  { name: "Gold", min: 1500 },
  { name: "Platinum", min: 2700 },
  { name: "Diamond", min: 4200 },
  { name: "Master", min: 6000 },
  { name: "Grandmaster", min: 7500 },
  { name: "Legend", min: 9000 }
];

function calculateRank(minutes) {
  const value = safeNumber(minutes);

  let rank = RANKS[0].name;

  for (const item of RANKS) {
    if (value >= item.min) {
      rank = item.name;
    }
  }

  return rank;
}


// ============================================================
// LEVEL / XP
// ============================================================

function xpRequiredForLevel(level) {
  if (level >= 100) return 0;

  return 100 + Math.floor((level - 1) / 10) * 50;
}

function totalXpForLevel(level) {
  let total = 0;

  for (let l = 1; l < level; l++) {
    total += xpRequiredForLevel(l);
  }

  return total;
}

function calculateLevel(xp) {
  const value = Math.max(0, safeNumber(xp));

  let level = 1;

  while (
    level < 100 &&
    value >= totalXpForLevel(level + 1)
  ) {
    level++;
  }

  return level;
}

function getLevelProgress(xp) {
  const level = calculateLevel(xp);

  if (level >= 100) {
    return {
      level: 100,
      current: 0,
      required: 0,
      percent: 100
    };
  }

  const start = totalXpForLevel(level);
  const required = xpRequiredForLevel(level);
  const current = Math.max(0, safeNumber(xp) - start);

  return {
    level,
    current,
    required,
    percent: clamp((current / required) * 100, 0, 100)
  };
}


// ============================================================
// JAPAN DATE
// ============================================================

function japanParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const result = {};

  for (const p of parts) {
    if (p.type !== "literal") {
      result[p.type] = p.value;
    }
  }

  if (result.hour === "24") {
    result.hour = "00";
  }

  return {
    year: Number(result.year),
    month: Number(result.month),
    day: Number(result.day),
    hour: Number(result.hour),
    minute: Number(result.minute),
    second: Number(result.second)
  };
}

function getJapanDateKey(date = new Date()) {
  const p = japanParts(date);

  return [
    p.year,
    String(p.month).padStart(2, "0"),
    String(p.day).padStart(2, "0")
  ].join("-");
}

function getJapanMonthId(date = new Date()) {
  const p = japanParts(date);

  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

function getJapanWeekId(date = new Date()) {
  const p = japanParts(date);

  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const day = d.getUTCDay();

  const diff = day === 0 ? -6 : 1 - day;

  d.setUTCDate(d.getUTCDate() + diff);

  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    String(d.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getSeasonEndDate() {
  const p = japanParts();

  let year = p.year;
  let month = p.month + 1;

  if (month > 12) {
    month = 1;
    year++;
  }

  // JST 00:00 of next month
  return new Date(Date.UTC(year, month - 1, 1, -9, 0, 0));
}

function formatDateTime(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}


// ============================================================
// TIMER
// ============================================================

const timerState = {
  running: false,
  startedAt: 0,
  accumulatedSeconds: 0,
  savedMinutes: 0,
  subject: ""
};

let timerInterval = null;


// ============================================================
// SHOP DATA
// ============================================================

const SHOP_TITLES = [
  { id: "shop-title-1", name: "異端の受験者", price: 500 },
  { id: "shop-title-2", name: "覚醒者", price: 800 },
  { id: "shop-title-3", name: "深淵を覗く者", price: 1200 },
  { id: "shop-title-4", name: "魔導学徒", price: 1600 },
  { id: "shop-title-5", name: "限界突破者", price: 2200 },
  { id: "shop-title-6", name: "禁断の知識人", price: 3000 },
  { id: "shop-title-7", name: "試験場の覇者", price: 4000 },
  { id: "shop-title-8", name: "運命を喰らう者", price: 5500 },
  { id: "shop-title-9", name: "賢者の末裔", price: 7000 },
  { id: "shop-title-10", name: "受験界の災厄", price: 9000 },
  { id: "shop-title-11", name: "神域の学習者", price: 12000 },
  { id: "shop-title-12", name: "合格の向こう側", price: 15000 }
];

const SHOP_ITEMS = [
  {
    id: "xp-boost-10",
    name: "XPブースト +25%",
    description: "10分間、獲得XP +25%",
    price: 300,
    type: "xpBoost",
    multiplier: 1.25,
    duration: 10 * 60 * 1000
  },
  {
    id: "xp-boost-25",
    name: "XPブースト +50%",
    description: "30分間、獲得XP +50%",
    price: 800,
    type: "xpBoost",
    multiplier: 1.5,
    duration: 30 * 60 * 1000
  },
  {
    id: "xp-boost-50",
    name: "XPブースト +75%",
    description: "60分間、獲得XP +75%",
    price: 1800,
    type: "xpBoost",
    multiplier: 1.75,
    duration: 60 * 60 * 1000
  },
  {
    id: "xp-boost-100",
    name: "XPブースト ×2",
    description: "120分間、獲得XP ×2",
    price: 4000,
    type: "xpBoost",
    multiplier: 2,
    duration: 120 * 60 * 1000
  },
  {
    id: "boss-dmg-10",
    name: "ボスダメージ +25%",
    description: "次のボス攻撃1回のダメージ +25%",
    price: 400,
    type: "bossDamage",
    multiplier: 1.25
  },
  {
    id: "boss-dmg-25",
    name: "ボスダメージ +50%",
    description: "次のボス攻撃1回のダメージ +50%",
    price: 1000,
    type: "bossDamage",
    multiplier: 1.5
  },
  {
    id: "boss-dmg-50",
    name: "ボスダメージ +100%",
    description: "次のボス攻撃1回のダメージ ×2",
    price: 2500,
    type: "bossDamage",
    multiplier: 2
  },
  {
    id: "boss-dmg-100",
    name: "ボスダメージ +200%",
    description: "次のボス攻撃1回のダメージ ×3",
    price: 6000,
    type: "bossDamage",
    multiplier: 3
  },
  {
    id: "boss-down-1",
    name: "ボス弱体化 -10%",
    description: "次に生成されるボスのHP -10%",
    price: 500,
    type: "bossDown",
    multiplier: 0.9
  },
  {
    id: "boss-down-2",
    name: "ボス弱体化 -20%",
    description: "次に生成されるボスのHP -20%",
    price: 1200,
    type: "bossDown",
    multiplier: 0.8
  },
  {
    id: "boss-down-3",
    name: "ボス弱体化 -30%",
    description: "次に生成されるボスのHP -30%",
    price: 2500,
    type: "bossDown",
    multiplier: 0.7
  },
  {
    id: "boss-down-4",
    name: "ボス弱体化 -50%",
    description: "次に生成されるボスのHP -50%",
    price: 5000,
    type: "bossDown",
    multiplier: 0.5
  }
];


// ============================================================
// TITLES
// ============================================================

const NORMAL_TITLES = [
  { id: "title-1", name: "見習い受験生" },
  { id: "title-2", name: "第一歩" },
  { id: "title-3", name: "努力の芽" },
  { id: "title-4", name: "継続者" },
  { id: "title-5", name: "勉強家" },
  { id: "title-6", name: "努力の証" },
  { id: "title-7", name: "受験戦士" },
  { id: "title-8", name: "百時間突破" },
  { id: "title-9", name: "学問の探求者" },
  { id: "title-10", name: "勉強の鬼" },
  { id: "title-11", name: "修行僧" },
  { id: "title-12", name: "受験の猛者" },
  { id: "title-13", name: "不屈の学習者" },
  { id: "title-14", name: "受験覇者" },
  { id: "title-15", name: "レベル10到達者" },
  { id: "title-16", name: "レベル20到達者" },
  { id: "title-17", name: "レベル30到達者" },
  { id: "title-18", name: "レベル40到達者" },
  { id: "title-19", name: "レベル50到達者" },
  { id: "title-20", name: "レベル60到達者" },
  { id: "title-21", name: "レベル70到達者" },
  { id: "title-22", name: "レベル80到達者" },
  { id: "title-23", name: "レベル90到達者" },
  { id: "title-24", name: "受験RPGの覇者" },
  { id: "title-25", name: "Silverの証" },
  { id: "title-26", name: "Goldの証" },
  { id: "title-27", name: "Platinumの証" },
  { id: "title-28", name: "Diamondの証" },
  { id: "title-29", name: "Masterの証" },
  { id: "title-30", name: "Grandmasterの証" },
  { id: "title-31", name: "伝説への挑戦者" },
  { id: "title-32", name: "伝説の受験生" },
  { id: "title-33", name: "初クエスト達成" },
  { id: "title-34", name: "クエストハンター" },
  { id: "title-35", name: "クエストマスター" },
  { id: "title-36", name: "完遂者" },
  { id: "title-37", name: "一週間の努力" },
  { id: "title-38", name: "習慣の力" },
  { id: "title-39", name: "継続の達人" },
  { id: "title-40", name: "限界突破" },
  { id: "title-41", name: "ボス初参加" },
  { id: "title-42", name: "ダメージディーラー" },
  { id: "title-43", name: "MVP" },
  { id: "title-44", name: "弱点粉砕者" },
  { id: "title-45", name: "パーティープレイヤー" },
  { id: "title-46", name: "仲間との戦い" },
  { id: "title-47", name: "全教科制覇" },
  { id: "title-48", name: "一芸の達人" },
  { id: "title-49", name: "万能型受験生" },
  { id: "title-50", name: "完全制覇" }
];

const SECRET_TITLES = [
  { id: "secret-1", name: "静かなる努力家" },
  { id: "secret-2", name: "不屈の意志" },
  { id: "secret-3", name: "止まらない者" },
  { id: "secret-4", name: "修羅の道" },
  { id: "secret-5", name: "完璧主義者" },
  { id: "secret-6", name: "切り札" },
  { id: "secret-7", name: "最後の一押し" },
  { id: "secret-8", name: "隠された才能" },
  { id: "secret-9", name: "伝説を超えし者" },
  { id: "secret-10", name: "アリ得ない知能" }
];


// ============================================================
// ACHIEVEMENTS
// ============================================================

const ACHIEVEMENTS = [
  { id: "first-study", name: "初勉強", reward: 50 },
  { id: "study-10h", name: "10時間勉強", reward: 100 },
  { id: "study-50h", name: "50時間勉強", reward: 250 },
  { id: "study-100h", name: "100時間勉強", reward: 500 },
  { id: "level-10", name: "Lv.10到達", reward: 100 },
  { id: "level-50", name: "Lv.50到達", reward: 500 },
  { id: "level-100", name: "Lv.100到達", reward: 1000 },
  { id: "rank-gold", name: "Gold到達", reward: 100 },
  { id: "rank-platinum", name: "Platinum到達", reward: 200 },
  { id: "rank-diamond", name: "Diamond到達", reward: 300 },
  { id: "rank-master", name: "Master到達", reward: 500 },
  { id: "rank-legend", name: "Legend到達", reward: 1000 },
  { id: "streak-3", name: "3日連続ログイン", reward: 100 },
  { id: "streak-7", name: "7日連続ログイン", reward: 250 },
  { id: "streak-30", name: "30日連続ログイン", reward: 1000 }
];


// ============================================================
// PLAYER
// ============================================================

let currentPlayer = null;
let currentUser = null;
let currentParty = null;

let selectedRankingType = "friends";

let activeQuestTab = "daily";
let activePartyTab = "party";
let activeRankTab = "rank";
let activeOtherTab = "menu";


function createDefaultPlayer(firebaseUser, data = {}) {
  const userId =
    data.userId ||
    (firebaseUser?.email || "")
      .split("@")[0]
      .toLowerCase();

  const subjects = uniqueArray(
    data.subjects?.length
      ? data.subjects
      : ["math"]
  ).filter(id => SUBJECT_NAMES[id]);

  return {
    uid: firebaseUser?.uid || data.uid || "",
    email: firebaseUser?.email || data.email || "",
    userId,
    displayName: data.displayName || userId || "冒険者",
    course: data.course || "undecided",
    subjects,

    xp: safeNumber(data.xp),
    totalStudyMinutes: safeNumber(data.totalStudyMinutes),
    seasonStudyMinutes: safeNumber(data.seasonStudyMinutes),

    todayStudyMinutes: safeNumber(data.todayStudyMinutes),
    todayStudyDate: data.todayStudyDate || getJapanDateKey(),

    todayXp: safeNumber(data.todayXp),
    todayCoins: safeNumber(data.todayCoins),

    coins: safeNumber(data.coins),
    totalCoinsEarned: safeNumber(data.totalCoinsEarned),

    seasonId: data.seasonId || getJapanMonthId(),
    rank: data.rank || calculateRank(data.seasonStudyMinutes),

    seasonHistory: Array.isArray(data.seasonHistory)
      ? data.seasonHistory
      : [],

    permanentLegendBoost: Boolean(data.permanentLegendBoost),

    title: data.title || "title-1",

    unlockedTitles: uniqueArray(
      data.unlockedTitles?.length
        ? data.unlockedTitles
        : ["title-1"]
    ),

    achievements: uniqueArray(data.achievements),

    questClaimedCount: safeNumber(data.questClaimedCount),
    questsCompleted: safeNumber(data.questsCompleted),

    loginStreak: safeNumber(data.loginStreak),
    lastLoginDate: data.lastLoginDate || "",
    loginRewardDate: data.loginRewardDate || "",

    dailyCompleteStreak: safeNumber(data.dailyCompleteStreak),
    lastDailyCompleteDate: data.lastDailyCompleteDate || "",

    questState: data.questState || {
      dailyDate: "",
      daily: [],
      weeklyId: "",
      weekly: null,
      rareDate: "",
      rare: null,
      history: []
    },

    studyHistory: Array.isArray(data.studyHistory)
      ? data.studyHistory
      : [],

    friendIds: uniqueArray(data.friendIds),

    partyId: data.partyId || "",
    partyRole: data.partyRole || "",

    bossData: data.bossData || null,

    bossStats: {
      bossesDefeated: safeNumber(data.bossStats?.bossesDefeated),
      bossParticipation: safeNumber(data.bossStats?.bossParticipation),
      weakDamage: safeNumber(data.bossStats?.weakDamage),
      killingBlows: safeNumber(data.bossStats?.killingBlows),
      mvpCount: safeNumber(data.bossStats?.mvpCount)
    },

    inventory: data.inventory || {},
    purchasedItems: uniqueArray(data.purchasedItems),

    activeBoosts: Array.isArray(data.activeBoosts)
      ? data.activeBoosts
      : [],

    pendingBossLevelDownMultiplier:
      safeNumber(data.pendingBossLevelDownMultiplier, 1),

    background: data.background || "",

    subjectStudyMinutes:
      data.subjectStudyMinutes || {},

    subjectLevels:
      data.subjectLevels || {},

    createdAt: data.createdAt || new Date().toISOString()
  };
}


// ============================================================
// SAVE PLAYER
// ============================================================

async function savePlayer() {
  if (!currentPlayer?.uid) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  const data = {
    ...currentPlayer,

    uid: currentPlayer.uid,

    // Legacy starsは書き込まない
    subjectStudyMinutes: currentPlayer.subjectStudyMinutes || {},
    subjectLevels: currentPlayer.subjectLevels || {},

    updatedAt: new Date().toISOString()
  };

  delete data.stars;

  await setDoc(
    doc(db, "users", currentPlayer.uid),
    data,
    { merge: true }
  );
}


// ============================================================
// NOTIFICATION
// ============================================================

let notificationTimer = null;

function showNotification(message) {
  const el = $("notification");

  if (!el) return;

  el.textContent = message;
  el.classList.remove("hidden");

  clearTimeout(notificationTimer);

  notificationTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3000);
}


// ============================================================
// MODALS
// ============================================================

function showRewardModal(content) {
  const modal = $("reward-modal");
  const body = $("reward-modal-content");

  if (!modal || !body) return;

  body.innerHTML = content;
  modal.classList.remove("hidden");
}

function closeRewardModal() {
  $("reward-modal")?.classList.add("hidden");
}

function showLevelUp(oldLevel, newLevel) {
  const modal = $("level-up-modal");

  if (!modal) return;

  $("level-up-old-level").textContent = oldLevel;
  $("level-up-new-level").textContent = newLevel;

  modal.classList.remove("hidden");
}

function closeLevelUp() {
  $("level-up-modal")?.classList.add("hidden");
}


// ============================================================
// APP SCREEN
// ============================================================

function showAppScreen(id) {
  if (!APP_SCREEN_IDS.includes(id)) return;

  const current = APP_SCREEN_IDS.find(screenId => {
    const el = $(screenId);
    return el && !el.classList.contains("hidden");
  });

  if (current === id) return;

  APP_SCREEN_IDS.forEach(screenId => {
    const screen = $(screenId);
    if (!screen) return;
    screen.classList.remove("rpg-screen-active", "rpg-screen-leaving", "rpg-screen-enter");
  });

  if (current && $(current)) {
    const oldScreen = $(current);
    oldScreen.classList.add("rpg-screen-leaving");
    oldScreen.classList.add("hidden");
  }

  const target = $(id);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("rpg-screen-active", "rpg-screen-enter");
    setTimeout(() => target.classList.remove("rpg-screen-enter"), 420);
  }

  document.querySelectorAll("[data-screen]").forEach(button => {
    button.classList.toggle("active", button.dataset.screen === id);
    button.setAttribute("aria-current", button.dataset.screen === id ? "page" : "false");
  });

  if (id === "quest-screen") renderQuestScreen();
  if (id === "party-screen") renderPartyScreen();
  if (id === "rank-screen") renderRankScreen();
  if (id === "other-screen") renderOtherScreen();
}


// ============================================================
// AUTH UI
// ============================================================

function showLoginScreen() {
  $("login-screen")?.classList.remove("hidden");
  $("register-screen")?.classList.add("hidden");

  if ($("login-error")) {
    $("login-error").textContent = "";
  }
}

function showRegisterScreen() {
  $("login-screen")?.classList.add("hidden");
  $("register-screen")?.classList.remove("hidden");

  if ($("register-error")) {
    $("register-error").textContent = "";
  }
}


// ============================================================
// AUTH ERROR
// ============================================================

function firebaseErrorMessage(error) {
  const code = error?.code || "";

  const messages = {
    "auth/invalid-credential":
      "ユーザーIDまたはパスワードが違います。",
    "auth/invalid-login-credentials":
      "ユーザーIDまたはパスワードが違います。",
    "auth/email-already-in-use":
      "そのユーザーIDはすでに使われています。",
    "auth/weak-password":
      "パスワードは6文字以上にしてください。",
    "auth/too-many-requests":
      "試行回数が多すぎます。少し待ってください。",
    "auth/requires-recent-login":
      "安全のため、再ログインしてから実行してください。"
  };

  return messages[code] || "処理に失敗しました。もう一度試してください。";
}


// ============================================================
// REGISTER
// ============================================================

async function handleRegister(event) {
  event.preventDefault();

  const errorEl = $("register-error");
  const subjectError = $("subject-error");

  if (errorEl) errorEl.textContent = "";
  if (subjectError) subjectError.textContent = "";

  const userId =
    $("register-user-id")?.value.trim() || "";

  const password =
    $("register-password")?.value || "";

  const confirmPassword =
    $("register-password-confirm")?.value || "";

  const displayName =
    $("register-display-name")?.value.trim() || "";

  const course =
    document.querySelector(
      'input[name="course"]:checked'
    )?.value || "undecided";

  const subjects = [
    ...document.querySelectorAll(
      'input[name="subjects"]:checked'
    )
  ].map(input => input.value);

  if (!/^[A-Za-z0-9_-]{3,30}$/.test(userId)) {
    if (errorEl) {
      errorEl.textContent =
        "ユーザーIDは3〜30文字の英数字・_・-で入力してください。";
    }
    return;
  }

  if (password.length < 6) {
    if (errorEl) {
      errorEl.textContent =
        "パスワードは6文字以上にしてください。";
    }
    return;
  }

  if (password !== confirmPassword) {
    if (errorEl) {
      errorEl.textContent =
        "パスワードが一致していません。";
    }
    return;
  }

  if (displayName.length < 1 || displayName.length > 30) {
    if (errorEl) {
      errorEl.textContent =
        "表示名は1〜30文字で入力してください。";
    }
    return;
  }

  if (subjects.length === 0) {
    if (subjectError) {
      subjectError.textContent =
        "最低1教科選択してください。";
    }
    return;
  }

  const button = $("register-button");

  if (button) button.disabled = true;

  try {
    const email =
      `${userId.toLowerCase()}@juken-rpg.local`;

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const player = createDefaultPlayer(
      credential.user,
      {
        userId: userId.toLowerCase(),
        displayName,
        course,
        subjects
      }
    );

    await setDoc(
      doc(db, "users", credential.user.uid),
      player
    );

    showNotification("冒険者登録が完了しました！");
  } catch (error) {
    console.error(error);

    if (errorEl) {
      errorEl.textContent =
        firebaseErrorMessage(error);
    }
  } finally {
    if (button) button.disabled = false;
  }
}


// ============================================================
// LOGIN
// ============================================================

async function handleLogin(event) {
  event.preventDefault();

  const errorEl = $("login-error");

  if (errorEl) {
    errorEl.textContent = "";
  }

  const userId =
    $("login-user-id")?.value.trim() || "";

  const password =
    $("login-password")?.value || "";

  if (!userId || !password) {
    if (errorEl) {
      errorEl.textContent =
        "ユーザーIDとパスワードを入力してください。";
    }
    return;
  }

  const button = $("login-button");

  if (button) button.disabled = true;

  try {
    const email =
      `${userId.toLowerCase()}@juken-rpg.local`;

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  } catch (error) {
    console.error(error);

    if (errorEl) {
      errorEl.textContent =
        firebaseErrorMessage(error);
    }
  } finally {
    if (button) button.disabled = false;
  }
}


// ============================================================
// LOGIN STREAK
// ============================================================

function dateDiffDays(dateA, dateB) {
  const a = new Date(`${dateA}T00:00:00Z`);
  const b = new Date(`${dateB}T00:00:00Z`);

  return Math.round(
    (b.getTime() - a.getTime()) /
    86400000
  );
}

async function processLoginReward() {
  if (!currentPlayer) return;

  const today = getJapanDateKey();

  if (currentPlayer.loginRewardDate === today) {
    return;
  }

  const previous = currentPlayer.lastLoginDate;

  if (!previous) {
    currentPlayer.loginStreak = 1;
  } else {
    const diff = dateDiffDays(previous, today);

    if (diff === 1) {
      currentPlayer.loginStreak++;
    } else {
      currentPlayer.loginStreak = 1;
    }
  }

  currentPlayer.lastLoginDate = today;
  currentPlayer.loginRewardDate = today;

  let coins = 20;
  let xp = 0;

  if (currentPlayer.loginStreak === 1) {
    coins = 50;
    xp = 20;
  }

  if (currentPlayer.loginStreak === 3) {
    coins = 50;
    xp = 20;
  }

  if (currentPlayer.loginStreak === 7) {
    coins = 100;
    xp = 50;
  }

  if (currentPlayer.loginStreak === 30) {
    coins = 300;
    xp = 100;
  }

  currentPlayer.coins += coins;
  currentPlayer.totalCoinsEarned += coins;

  if (xp > 0) {
    currentPlayer.xp += xp;
    currentPlayer.todayXp += xp;
  }

  await checkAchievements();
  checkAndUnlockTitles();

  await savePlayer();

  showNotification(
    `ログイン報酬！ 🪙${coins}` +
    (xp ? ` / ${xp}XP` : "")
  );
}


// ============================================================
// DATE STATE
// ============================================================

function resetTodayIfNeeded() {
  if (!currentPlayer) return;

  const today = getJapanDateKey();

  if (currentPlayer.todayStudyDate !== today) {
    currentPlayer.todayStudyDate = today;
    currentPlayer.todayStudyMinutes = 0;
    currentPlayer.todayXp = 0;
    currentPlayer.todayCoins = 0;
  }
}


// ============================================================
// SEASON ROLLOVER
// ============================================================

function processSeasonRollover() {
  if (!currentPlayer) return;

  const currentSeason = getJapanMonthId();

  if (!currentPlayer.seasonId) {
    currentPlayer.seasonId = currentSeason;
    currentPlayer.rank =
      calculateRank(currentPlayer.seasonStudyMinutes);

    return;
  }

  if (currentPlayer.seasonId === currentSeason) {
    currentPlayer.rank =
      calculateRank(currentPlayer.seasonStudyMinutes);

    return;
  }

  const oldRank =
    calculateRank(currentPlayer.seasonStudyMinutes);

  currentPlayer.seasonHistory.unshift({
    seasonId: currentPlayer.seasonId,
    studyMinutes: currentPlayer.seasonStudyMinutes,
    rank: oldRank,
    endedAt: new Date().toISOString()
  });

  if (oldRank === "Legend") {
    currentPlayer.permanentLegendBoost = true;

    if (!currentPlayer.unlockedTitles.includes("title-32")) {
      currentPlayer.unlockedTitles.push("title-32");
    }
  }

  currentPlayer.seasonId = currentSeason;
  currentPlayer.seasonStudyMinutes = 0;
  currentPlayer.rank = "Bronze";
}


// ============================================================
// XP BOOST
// ============================================================

function cleanActiveBoosts() {
  if (!currentPlayer) return;

  const now = Date.now();

  currentPlayer.activeBoosts =
    (currentPlayer.activeBoosts || [])
      .filter(boost =>
        safeNumber(boost.expiresAt) > now
      );
}

function getXpMultiplier() {
  if (!currentPlayer) return 1;

  cleanActiveBoosts();

  let multiplier =
    currentPlayer.permanentLegendBoost
      ? 1.5
      : 1;

  for (const boost of currentPlayer.activeBoosts) {
    multiplier *= safeNumber(
      boost.multiplier,
      1
    );
  }

  return multiplier;
}


// ============================================================
// ADD XP
// ============================================================

function addXp(amount, countToday = true) {
  if (!currentPlayer) {
    return {
      oldLevel: 1,
      newLevel: 1,
      amount: 0
    };
  }

  const value = Math.max(
    0,
    Math.floor(safeNumber(amount))
  );

  const oldLevel =
    calculateLevel(currentPlayer.xp);

  currentPlayer.xp += value;

  if (countToday) {
    currentPlayer.todayXp += value;
  }

  const newLevel =
    calculateLevel(currentPlayer.xp);

  return {
    oldLevel,
    newLevel,
    amount: value
  };
}


// ============================================================
// SUBJECT LEVEL
// ============================================================

function getSubjectMinutes(subject) {
  return safeNumber(
    currentPlayer?.subjectStudyMinutes?.[subject]
  );
}

function getSubjectLevel(subject) {
  return clamp(
    Math.floor(getSubjectMinutes(subject) / 30),
    0,
    100
  );
}

function updateSubjectLevelData() {
  if (!currentPlayer) return;

  if (!currentPlayer.subjectStudyMinutes) {
    currentPlayer.subjectStudyMinutes = {};
  }

  if (!currentPlayer.subjectLevels) {
    currentPlayer.subjectLevels = {};
  }

  for (const subject of currentPlayer.subjects) {
    const level =
      getSubjectLevel(subject);

    currentPlayer.subjectLevels[subject] =
      level;
  }
}


// ============================================================
// QUEST GENERATION
// ============================================================

function leastStudiedSubjects(count = 3) {
  if (!currentPlayer) return [];

  const subjects =
    currentPlayer.subjects.length
      ? [...currentPlayer.subjects]
      : ["math"];

  subjects.sort(
    (a, b) =>
      getSubjectMinutes(a) -
      getSubjectMinutes(b)
  );

  const result = [];

  for (let i = 0; i < count; i++) {
    result.push(
      subjects[i % subjects.length]
    );
  }

  return result;
}

function generateDailyQuests() {
  const subjects = leastStudiedSubjects(3);

  return subjects.map((subject, index) => ({
    id: `daily-${index + 1}`,
    subject,
    target: 20,
    progress: 0,
    claimed: false,
    title: `${SUBJECT_NAMES[subject]}を20分勉強する`
  }));
}

function generateWeeklyQuest() {
  const subject =
    leastStudiedSubjects(1)[0] || "math";

  return {
    id: `weekly-${getJapanWeekId()}`,
    subject,
    target: 100,
    progress: 0,
    claimed: false,
    title: `${SUBJECT_NAMES[subject]}を100分勉強する`
  };
}

function generateRareQuest() {
  return {
    id: `rare-${getJapanDateKey()}`,
    target: 180,
    progress: 0,
    claimed: false,
    title: "1日に180分勉強する"
  };
}

function ensureQuestState() {
  if (!currentPlayer) return;

  if (!currentPlayer.questState) {
    currentPlayer.questState = {
      dailyDate: "",
      daily: [],
      weeklyId: "",
      weekly: null,
      rareDate: "",
      rare: null,
      history: []
    };
  }

  const today = getJapanDateKey();
  const week = getJapanWeekId();

  if (
    currentPlayer.questState.dailyDate !== today ||
    !Array.isArray(currentPlayer.questState.daily) ||
    currentPlayer.questState.daily.length !== 3
  ) {
    currentPlayer.questState.dailyDate = today;
    currentPlayer.questState.daily =
      generateDailyQuests();
  }

  if (
    currentPlayer.questState.weeklyId !== week ||
    !currentPlayer.questState.weekly
  ) {
    currentPlayer.questState.weeklyId = week;
    currentPlayer.questState.weekly =
      generateWeeklyQuest();
  }

  if (
    currentPlayer.questState.rareDate !== today ||
    !currentPlayer.questState.rare
  ) {
    currentPlayer.questState.rareDate = today;
    currentPlayer.questState.rare =
      generateRareQuest();
  }
}


// ============================================================
// QUEST PROGRESS
// ============================================================

function updateQuestProgress(subject, minutes) {
  if (!currentPlayer) return;

  ensureQuestState();

  const value = safeNumber(minutes);

  for (const quest of currentPlayer.questState.daily) {
    if (
      quest.subject === subject &&
      !quest.claimed
    ) {
      quest.progress = clamp(
        safeNumber(quest.progress) + value,
        0,
        quest.target
      );
    }
  }

  const weekly =
    currentPlayer.questState.weekly;

  if (
    weekly &&
    weekly.subject === subject &&
    !weekly.claimed
  ) {
    weekly.progress = clamp(
      safeNumber(weekly.progress) + value,
      0,
      weekly.target
    );
  }

  const rare =
    currentPlayer.questState.rare;

  if (rare && !rare.claimed) {
    rare.progress = clamp(
      safeNumber(rare.progress) + value,
      0,
      rare.target
    );
  }
}


// ============================================================
// DAILY COMPLETE STREAK
// ============================================================

function checkDailyCompleteStreak() {
  if (!currentPlayer) return;

  const daily =
    currentPlayer.questState?.daily || [];

  if (
    daily.length !== 3 ||
    !daily.every(q => q.claimed)
  ) {
    return;
  }

  const today = getJapanDateKey();

  if (
    currentPlayer.lastDailyCompleteDate === today
  ) {
    return;
  }

  const previous =
    currentPlayer.lastDailyCompleteDate;

  if (
    previous &&
    dateDiffDays(previous, today) === 1
  ) {
    currentPlayer.dailyCompleteStreak++;
  } else {
    currentPlayer.dailyCompleteStreak = 1;
  }

  currentPlayer.lastDailyCompleteDate = today;
}


// ============================================================
// QUEST CLAIM
// ============================================================

async function claimQuest(questId) {
  if (!currentPlayer) return;

  ensureQuestState();

  let quest = null;
  let type = "";

  const daily =
    currentPlayer.questState.daily || [];

  const dailyQuest =
    daily.find(q => q.id === questId);

  if (dailyQuest) {
    quest = dailyQuest;
    type = "daily";
  }

  if (!quest && currentPlayer.questState.weekly?.id === questId) {
    quest = currentPlayer.questState.weekly;
    type = "weekly";
  }

  if (!quest && currentPlayer.questState.rare?.id === questId) {
    quest = currentPlayer.questState.rare;
    type = "rare";
  }

  if (!quest) {
    showNotification("クエストが見つかりません。");
    return;
  }

  if (quest.claimed) {
    showNotification("この報酬はすでに受け取っています。");
    return;
  }

  if (
    safeNumber(quest.progress) <
    safeNumber(quest.target)
  ) {
    showNotification("まだクエストを達成していません。");
    return;
  }

  quest.claimed = true;

  let xp = 0;
  let coins = 0;

  if (type === "daily") {
    xp = 20;
    coins = 30;
  }

  if (type === "weekly") {
    xp = 70;
    coins = 70;
  }

  if (type === "rare") {
    xp = 100;
    coins = 500;
  }

  const levelResult =
    addXp(xp, true);

  currentPlayer.coins += coins;
  currentPlayer.totalCoinsEarned += coins;

  currentPlayer.questClaimedCount++;
  currentPlayer.questsCompleted++;

  if (!Array.isArray(currentPlayer.questState.history)) {
    currentPlayer.questState.history = [];
  }

  currentPlayer.questState.history.unshift({
    id: quest.id,
    type,
    title: quest.title,
    xp,
    coins,
    completedAt: new Date().toISOString()
  });

  currentPlayer.questState.history =
    currentPlayer.questState.history.slice(0, 100);

  checkDailyCompleteStreak();
  checkAndUnlockTitles();
  await checkAchievements();

  await savePlayer();

  let content = `
    <p><strong>${escapeHtml(quest.title)}</strong></p>
    <p>✨ +${xp} XP</p>
    <p>🪙 +${coins} コイン</p>
  `;

  showRewardModal(content);

  if (levelResult.newLevel > levelResult.oldLevel) {
    setTimeout(() => {
      showLevelUp(
        levelResult.oldLevel,
        levelResult.newLevel
      );
    }, 200);
  }

  renderAll();
}


// ============================================================
// BOSS CREATION
// ============================================================

function randomChoice(array) {
  if (!array.length) return null;

  return array[
    Math.floor(Math.random() * array.length)
  ];
}

function getBossSubjects() {
  if (currentParty?.memberData) {
    const subjects = [];

    for (const member of Object.values(
      currentParty.memberData
    )) {
      if (Array.isArray(member.subjects)) {
        subjects.push(...member.subjects);
      }
    }

    const unique = uniqueArray(subjects);

    if (unique.length) {
      return unique;
    }
  }

  return currentPlayer?.subjects?.length
    ? currentPlayer.subjects
    : ["math"];
}

function createBoss(levelDownMultiplier = 1) {
  const weakness =
    randomChoice(getBossSubjects()) || "math";

  const multiplier =
    clamp(
      safeNumber(levelDownMultiplier, 1),
      0.5,
      1
    );

  const maxHp =
    Math.max(
      1,
      Math.floor(10000 * multiplier)
    );

  return {
    weekId: getJapanWeekId(),
    name: "受験の魔王",
    level: 1,
    maxHp,
    currentHp: maxHp,
    weakness,
    weaknessMultiplier: 1.5,
    defeated: false,
    defeatedBy: "",
    mvpUid: "",
    createdAt: new Date().toISOString(),
    endedAt: "",
    contributions: {},
    battleLogs: []
  };
}


// ============================================================
// GET PERSONAL BOSS
// ============================================================

async function getPersonalBoss() {
  if (!currentPlayer) return null;

  const currentWeek =
    getJapanWeekId();

  if (
    !currentPlayer.bossData ||
    currentPlayer.bossData.weekId !== currentWeek
  ) {
    let multiplier =
      safeNumber(
        currentPlayer.pendingBossLevelDownMultiplier,
        1
      );

    if (multiplier <= 0) {
      multiplier = 1;
    }

    currentPlayer.bossData =
      createBoss(multiplier);

    currentPlayer.pendingBossLevelDownMultiplier = 1;

    await savePlayer();
  }

  return currentPlayer.bossData;
}


// ============================================================
// PARTY BOSS
// ============================================================

async function getPartyDoc() {
  if (!currentPlayer?.partyId) {
    return null;
  }

  const snapshot =
    await getDoc(
      doc(db, "parties", currentPlayer.partyId)
    );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

async function ensurePartyBoss(party) {
  if (!party) return null;

  const currentWeek =
    getJapanWeekId();

  if (
    party.boss &&
    party.boss.weekId === currentWeek
  ) {
    return party.boss;
  }

  let multiplier = 1;

  // リーダーが持っている次ボス弱体化を使用
  if (party.leaderUid === currentPlayer.uid) {
    multiplier =
      safeNumber(
        currentPlayer.pendingBossLevelDownMultiplier,
        1
      );

    if (multiplier <= 0) {
      multiplier = 1;
    }
  }

  const boss =
    createBoss(multiplier);

  if (party.leaderUid === currentPlayer.uid) {
    currentPlayer.pendingBossLevelDownMultiplier = 1;
    await savePlayer();
  }

  await updateDoc(
    doc(db, "parties", party.id),
    {
      boss
    }
  );

  party.boss = boss;

  return boss;
}


// ============================================================
// BOSS DAMAGE MULTIPLIER
// ============================================================

function getNextBossDamageMultiplier() {
  if (!currentPlayer) return 1;

  const inventory =
    currentPlayer.inventory || {};

  const priority = [
    "boss-dmg-100",
    "boss-dmg-50",
    "boss-dmg-25",
    "boss-dmg-10"
  ];

  for (const itemId of priority) {
    const quantity =
      safeNumber(inventory[itemId]);

    if (quantity <= 0) continue;

    const item =
      SHOP_ITEMS.find(
        item => item.id === itemId
      );

    if (item) {
      return {
        itemId,
        multiplier: item.multiplier
      };
    }
  }

  return {
    itemId: "",
    multiplier: 1
  };
}


// ============================================================
// APPLY BOSS DAMAGE - PERSONAL
// ============================================================

async function applyPersonalBossDamage(
  subject,
  minutes
) {
  const boss =
    await getPersonalBoss();

  if (!boss) {
    return {
      damage: 0,
      defeated: false
    };
  }

  if (boss.defeated || boss.currentHp <= 0) {
    return {
      damage: 0,
      defeated: true
    };
  }

  const buff =
    getNextBossDamageMultiplier();

  const weaknessMultiplier =
    subject === boss.weakness
      ? 1.5
      : 1;

  const baseDamage =
    safeNumber(minutes) * 10;

  let damage =
    Math.floor(
      baseDamage *
      weaknessMultiplier *
      buff.multiplier
    );

  damage = Math.max(1, damage);

  const oldHp =
    safeNumber(boss.currentHp);

  const newHp =
    Math.max(
      0,
      oldHp - damage
    );

  boss.currentHp = newHp;

  if (!boss.contributions) {
    boss.contributions = {};
  }

  boss.contributions[currentPlayer.uid] =
    safeNumber(
      boss.contributions[currentPlayer.uid]
    ) + damage;

  if (!Array.isArray(boss.battleLogs)) {
    boss.battleLogs = [];
  }

  boss.battleLogs.unshift({
    uid: currentPlayer.uid,
    displayName: currentPlayer.displayName,
    subject,
    minutes: safeNumber(minutes),
    damage,
    timestamp: new Date().toISOString()
  });

  boss.battleLogs =
    boss.battleLogs.slice(0, 50);

  if (subject === boss.weakness) {
    currentPlayer.bossStats.weakDamage += damage;
  }

  currentPlayer.bossStats.bossParticipation++;

  if (
    !currentPlayer.unlockedTitles.includes("title-41")
  ) {
    currentPlayer.unlockedTitles.push("title-41");
  }

  if (
    !currentPlayer.unlockedTitles.includes("title-42") &&
    safeNumber(
      boss.contributions[currentPlayer.uid]
    ) >= 1000
  ) {
    currentPlayer.unlockedTitles.push("title-42");
  }

  if (newHp <= 0) {
    boss.defeated = true;
    boss.defeatedBy = currentPlayer.uid;
    boss.endedAt = new Date().toISOString();

    currentPlayer.bossStats.killingBlows++;
    currentPlayer.bossStats.bossesDefeated++;

    const entries =
      Object.entries(boss.contributions);

    entries.sort((a, b) => b[1] - a[1]);

    const mvpUid =
      entries[0]?.[0] || currentPlayer.uid;

    boss.mvpUid = mvpUid;

    if (mvpUid === currentPlayer.uid) {
      currentPlayer.bossStats.mvpCount++;

      if (
        !currentPlayer.unlockedTitles.includes(
          "title-43"
        )
      ) {
        currentPlayer.unlockedTitles.push(
          "title-43"
        );
      }
    }

    if (
      !currentPlayer.unlockedTitles.includes(
        "title-44"
      ) &&
      currentPlayer.bossStats.weakDamage > 0
    ) {
      currentPlayer.unlockedTitles.push(
        "title-44"
      );
    }

    if (
      !currentPlayer.unlockedTitles.includes(
        "title-7"
      )
    ) {
      // no-op
    }

    showNotification("👹 ボスを撃破した！");
  }

  if (buff.itemId) {
    currentPlayer.inventory[buff.itemId] =
      Math.max(
        0,
        safeNumber(
          currentPlayer.inventory[buff.itemId]
        ) - 1
      );
  }

  currentPlayer.bossData = boss;

  await savePlayer();

  return {
    damage,
    defeated: boss.defeated,
    weaknessHit: subject === boss.weakness
  };
}


// ============================================================
// APPLY BOSS DAMAGE - PARTY
// ============================================================

async function applyPartyBossDamage(
  subject,
  minutes
) {
  if (!currentPlayer?.partyId) {
    return applyPersonalBossDamage(
      subject,
      minutes
    );
  }

  const partyRef =
    doc(db, "parties", currentPlayer.partyId);

  const buff =
    getNextBossDamageMultiplier();

  let result = {
    damage: 0,
    defeated: false,
    weaknessHit: false
  };

  await runTransaction(
    db,
    async transaction => {
      const snapshot =
        await transaction.get(partyRef);

      if (!snapshot.exists()) {
        throw new Error("PARTY_NOT_FOUND");
      }

      const party = snapshot.data();

      let boss = party.boss;

      if (
        !boss ||
        boss.weekId !== getJapanWeekId()
      ) {
        boss = createBoss(1);
      }

      if (boss.defeated || safeNumber(boss.currentHp) <= 0) {
        result.defeated = true;
        return;
      }

      const weaknessMultiplier =
        subject === boss.weakness
          ? 1.5
          : 1;

      const damage =
        Math.max(
          1,
          Math.floor(
            safeNumber(minutes) *
            10 *
            weaknessMultiplier *
            buff.multiplier
          )
        );

      const oldHp =
        safeNumber(boss.currentHp);

      const newHp =
        Math.max(
          0,
          oldHp - damage
        );

      boss.currentHp = newHp;

      if (!boss.contributions) {
        boss.contributions = {};
      }

      boss.contributions[currentPlayer.uid] =
        safeNumber(
          boss.contributions[currentPlayer.uid]
        ) + damage;

      if (!Array.isArray(boss.battleLogs)) {
        boss.battleLogs = [];
      }

      boss.battleLogs.unshift({
        uid: currentPlayer.uid,
        displayName: currentPlayer.displayName,
        subject,
        minutes: safeNumber(minutes),
        damage,
        timestamp: new Date().toISOString()
      });

      boss.battleLogs =
        boss.battleLogs.slice(0, 50);

      if (newHp <= 0) {
        boss.defeated = true;
        boss.defeatedBy =
          currentPlayer.uid;

        boss.endedAt =
          new Date().toISOString();

        const entries =
          Object.entries(
            boss.contributions
          ).sort(
            (a, b) => b[1] - a[1]
          );

        boss.mvpUid =
          entries[0]?.[0] ||
          currentPlayer.uid;
      }

      transaction.update(
        partyRef,
        { boss }
      );

      result = {
        damage,
        defeated: boss.defeated,
        weaknessHit:
          subject === boss.weakness
      };
    }
  );

  if (buff.itemId) {
    currentPlayer.inventory[buff.itemId] =
      Math.max(
        0,
        safeNumber(
          currentPlayer.inventory[buff.itemId]
        ) - 1
      );
  }

  currentPlayer.bossStats.bossParticipation++;

  if (result.weaknessHit) {
    currentPlayer.bossStats.weakDamage +=
      result.damage;
  }

  if (
    !currentPlayer.unlockedTitles.includes("title-41")
  ) {
    currentPlayer.unlockedTitles.push("title-41");
  }

  if (
    !currentPlayer.unlockedTitles.includes("title-42") &&
    result.damage >= 1000
  ) {
    currentPlayer.unlockedTitles.push("title-42");
  }

  if (result.defeated) {
    currentPlayer.bossStats.bossesDefeated++;

    const party =
      await getPartyDoc();

    const mvpUid =
      party?.boss?.mvpUid;

    if (mvpUid === currentPlayer.uid) {
      currentPlayer.bossStats.mvpCount++;

      if (
        !currentPlayer.unlockedTitles.includes(
          "title-43"
        )
      ) {
        currentPlayer.unlockedTitles.push(
          "title-43"
        );
      }
    }

    if (
      party?.memberUids?.includes(
        currentPlayer.uid
      )
    ) {
      if (
        !currentPlayer.unlockedTitles.includes(
          "title-46"
        )
      ) {
        currentPlayer.unlockedTitles.push(
          "title-46"
        );
      }
    }
  }

  await savePlayer();

  if (result.defeated) {
    showNotification("👹 パーティーでボス撃破！");
  }

  return result;
}


// ============================================================
// APPLY BOSS DAMAGE
// ============================================================

async function applyBossDamage(subject, minutes) {
  if (!currentPlayer) {
    return {
      damage: 0,
      defeated: false
    };
  }

  try {
    if (currentPlayer.partyId) {
      return await applyPartyBossDamage(
        subject,
        minutes
      );
    }

    return await applyPersonalBossDamage(
      subject,
      minutes
    );
  } catch (error) {
    console.error("Boss damage error:", error);

    showNotification(
      "ボスへの攻撃処理に失敗しました。勉強記録は保存されています。"
    );

    return {
      damage: 0,
      defeated: false
    };
  }
}


// ============================================================
// RECORD STUDY
// ============================================================

async function recordStudy(
  minutes,
  subject,
  note = "",
  source = "manual"
) {
  if (!currentPlayer) {
    throw new Error("PLAYER_NOT_FOUND");
  }

  resetTodayIfNeeded();
  processSeasonRollover();
  ensureQuestState();

  const value =
    Math.floor(
      safeNumber(minutes)
    );

  if (
    !Number.isFinite(value) ||
    value < 1 ||
    value > 1440
  ) {
    throw new Error(
      "勉強時間は1〜1440分で入力してください。"
    );
  }

  if (
    !currentPlayer.subjects.includes(subject)
  ) {
    throw new Error(
      "登録されていない教科です。"
    );
  }

  const oldLevel =
    calculateLevel(currentPlayer.xp);

  const xpMultiplier =
    getXpMultiplier();

  const xp =
    Math.max(
      1,
      Math.floor(
        value * xpMultiplier
      )
    );

  const coins =
    Math.floor(value / 10);

  currentPlayer.totalStudyMinutes += value;
  currentPlayer.seasonStudyMinutes += value;
  currentPlayer.todayStudyMinutes += value;

  if (!currentPlayer.subjectStudyMinutes) {
    currentPlayer.subjectStudyMinutes = {};
  }

  currentPlayer.subjectStudyMinutes[subject] =
    safeNumber(
      currentPlayer.subjectStudyMinutes[subject]
    ) + value;

  currentPlayer.xp += xp;
  currentPlayer.todayXp += xp;

  currentPlayer.coins += coins;
  currentPlayer.todayCoins += coins;
  currentPlayer.totalCoinsEarned += coins;

  if (!Array.isArray(currentPlayer.studyHistory)) {
    currentPlayer.studyHistory = [];
  }

  currentPlayer.studyHistory.unshift({
    subject,
    minutes: value,
    note: note || "",
    xp,
    coins,
    source,
    timestamp: new Date().toISOString()
  });

  currentPlayer.studyHistory =
    currentPlayer.studyHistory.slice(0, 500);

  updateSubjectLevelData();

  updateQuestProgress(
    subject,
    value
  );

  currentPlayer.rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes
    );

  checkAndUnlockTitles();

  const newLevel =
    calculateLevel(currentPlayer.xp);

  const bossResult =
    await applyBossDamage(
      subject,
      value
    );

  await checkAchievements();

  await savePlayer();

  if (newLevel > oldLevel) {
    showLevelUp(
      oldLevel,
      newLevel
    );
  }

  const bossText =
    bossResult.damage > 0
      ? `<p>⚔️ ボスに <strong>${bossResult.damage}</strong> ダメージ！</p>`
      : "";

  showRewardModal(`
    <p>📚 ${escapeHtml(SUBJECT_NAMES[subject])} ${value}分</p>
    <p>✨ +${xp} XP</p>
    <p>🪙 +${coins} コイン</p>
    ${bossText}
  `);

  renderAll();

  return {
    minutes: value,
    xp,
    coins,
    bossDamage: bossResult.damage
  };
}


// ============================================================
// TITLE CHECK
// ============================================================

function unlockTitle(id) {
  if (!currentPlayer) return false;

  if (
    currentPlayer.unlockedTitles.includes(id)
  ) {
    return false;
  }

  currentPlayer.unlockedTitles.push(id);
  return true;
}

function checkAndUnlockTitles() {
  if (!currentPlayer) return;

  const unlocked = [];

  const totalHours =
    currentPlayer.totalStudyMinutes / 60;

  const level =
    calculateLevel(currentPlayer.xp);

  const rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes
    );

  const hourTitles = [
    [1, "title-2"],
    [5, "title-3"],
    [10, "title-4"],
    [20, "title-5"],
    [30, "title-6"],
    [50, "title-7"],
    [100, "title-8"],
    [150, "title-9"],
    [200, "title-10"],
    [300, "title-11"],
    [500, "title-12"],
    [750, "title-13"],
    [1000, "title-14"]
  ];

  for (const [hours, id] of hourTitles) {
    if (totalHours >= hours) {
      if (unlockTitle(id)) {
        unlocked.push(id);
      }
    }
  }

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
    if (level >= lv) {
      if (unlockTitle(id)) {
        unlocked.push(id);
      }
    }
  }

  const rankTitles = {
    Silver: "title-25",
    Gold: "title-26",
    Platinum: "title-27",
    Diamond: "title-28",
    Master: "title-29",
    Grandmaster: "title-30",
    Legend: "title-31"
  };

  if (rankTitles[rank]) {
    if (unlockTitle(rankTitles[rank])) {
      unlocked.push(rankTitles[rank]);
    }
  }

  if (currentPlayer.questClaimedCount >= 1) {
    if (unlockTitle("title-33")) {
      unlocked.push("title-33");
    }
  }

  if (currentPlayer.questClaimedCount >= 10) {
    if (unlockTitle("title-34")) {
      unlocked.push("title-34");
    }
  }

  if (currentPlayer.questClaimedCount >= 50) {
    if (unlockTitle("title-35")) {
      unlocked.push("title-35");
    }
  }

  const allDailyClaimed =
    currentPlayer.questState?.daily?.every(
      q => q.claimed
    );

  if (allDailyClaimed) {
    if (unlockTitle("title-36")) {
      unlocked.push("title-36");
    }
  }

  if (currentPlayer.loginStreak >= 7) {
    if (unlockTitle("title-37")) {
      unlocked.push("title-37");
    }
  }

  if (currentPlayer.loginStreak >= 14) {
    if (unlockTitle("title-38")) {
      unlocked.push("title-38");
    }
  }

  if (currentPlayer.loginStreak >= 30) {
    if (unlockTitle("title-39")) {
      unlocked.push("title-39");
    }
  }

  const rareCompleted =
    currentPlayer.questState?.history?.some(
      q => q.type === "rare"
    );

  if (rareCompleted) {
    if (unlockTitle("title-40")) {
      unlocked.push("title-40");
    }
  }

  if (
    currentPlayer.bossStats?.bossParticipation > 0
  ) {
    if (unlockTitle("title-41")) {
      unlocked.push("title-41");
    }
  }

  if (
    currentPlayer.bossStats?.weakDamage > 0
  ) {
    if (unlockTitle("title-44")) {
      unlocked.push("title-44");
    }
  }

  if (currentPlayer.partyId) {
    if (unlockTitle("title-45")) {
      unlocked.push("title-45");
    }
  }

  const levels =
    currentPlayer.subjects.map(
      subject => getSubjectLevel(subject)
    );

  if (
    levels.length > 0 &&
    levels.every(level => level >= 10)
  ) {
    if (unlockTitle("title-47")) {
      unlocked.push("title-47");
    }
  }

  if (
    levels.some(level => level >= 50)
  ) {
    if (unlockTitle("title-48")) {
      unlocked.push("title-48");
    }
  }

  if (
    levels.filter(level => level >= 30).length >= 3
  ) {
    if (unlockTitle("title-49")) {
      unlocked.push("title-49");
    }
  }

  if (
    levels.length > 0 &&
    levels.every(level => level >= 100)
  ) {
    if (unlockTitle("title-50")) {
      unlocked.push("title-50");
    }
  }

  checkSecretTitles();

  if (unlocked.length) {
    const names = unlocked
      .map(id => getTitleName(id))
      .filter(Boolean);

    showNotification(
      `🏷️ 称号解放！ ${names.join(" / ")}`
    );
  }
}


// ============================================================
// SECRET TITLES
// ============================================================

function getSevenDaySubjectStats(subject) {
  if (!currentPlayer) {
    return {
      minutes: 0,
      first: null
    };
  }

  const now = Date.now();
  const sevenDaysAgo =
    now - 7 * 86400000;

  let minutes = 0;

  for (
    const record of
    currentPlayer.studyHistory || []
  ) {
    const timestamp =
      new Date(record.timestamp).getTime();

    if (
      timestamp >= sevenDaysAgo &&
      record.subject === subject
    ) {
      minutes += safeNumber(
        record.minutes
      );
    }
  }

  return {
    minutes
  };
}

function checkSecretTitles() {
  if (!currentPlayer) return;

  const today =
    safeNumber(
      currentPlayer.todayStudyMinutes
    );

  if (today >= 120) {
    unlockTitle("secret-1");
  }

  if (currentPlayer.loginStreak >= 7) {
    unlockTitle("secret-2");
  }

  if (today >= 240) {
    unlockTitle("secret-3");
  }

  if (today >= 300) {
    unlockTitle("secret-4");
  }

  if (
    currentPlayer.dailyCompleteStreak >= 7
  ) {
    unlockTitle("secret-5");
  }

  if (
    currentPlayer.bossStats?.weakDamage >= 3000
  ) {
    unlockTitle("secret-6");
  }

  if (
    currentPlayer.bossStats?.killingBlows >= 1
  ) {
    unlockTitle("secret-7");
  }

  for (const subject of currentPlayer.subjects) {
    const stats =
      getSevenDaySubjectStats(subject);

    if (stats.minutes >= 300) {
      unlockTitle("secret-8");
      break;
    }
  }

  if (
    currentPlayer.rank === "Legend" &&
    currentPlayer.totalStudyMinutes >= 18000
  ) {
    unlockTitle("secret-9");
  }

  const studiedSubjects =
    new Set(
      (currentPlayer.studyHistory || [])
        .filter(
          record =>
            safeNumber(record.minutes) > 0
        )
        .map(
          record => record.subject
        )
    );

  if (
    ALL_SUBJECT_IDS.every(
      subject =>
        studiedSubjects.has(subject)
    )
  ) {
    unlockTitle("secret-10");
  }
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

async function checkAchievements() {
  if (!currentPlayer) return;

  const unlocked = [];

  const total =
    currentPlayer.totalStudyMinutes;

  const level =
    calculateLevel(currentPlayer.xp);

  const rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes
    );

  const conditions = {
    "first-study": total >= 1,
    "study-10h": total >= 600,
    "study-50h": total >= 3000,
    "study-100h": total >= 6000,
    "level-10": level >= 10,
    "level-50": level >= 50,
    "level-100": level >= 100,
    "rank-gold": ["Gold", "Platinum", "Diamond", "Master", "Grandmaster", "Legend"].includes(rank),
    "rank-platinum": ["Platinum", "Diamond", "Master", "Grandmaster", "Legend"].includes(rank),
    "rank-diamond": ["Diamond", "Master", "Grandmaster", "Legend"].includes(rank),
    "rank-master": ["Master", "Grandmaster", "Legend"].includes(rank),
    "rank-legend": rank === "Legend",
    "streak-3": currentPlayer.loginStreak >= 3,
    "streak-7": currentPlayer.loginStreak >= 7,
    "streak-30": currentPlayer.loginStreak >= 30
  };

  for (const achievement of ACHIEVEMENTS) {
    if (
      conditions[achievement.id] &&
      !currentPlayer.achievements.includes(
        achievement.id
      )
    ) {
      currentPlayer.achievements.push(
        achievement.id
      );

      currentPlayer.coins +=
        achievement.reward;

      currentPlayer.totalCoinsEarned +=
        achievement.reward;

      unlocked.push(achievement);
    }
  }

  if (unlocked.length) {
    const reward =
      unlocked.reduce(
        (sum, item) =>
          sum + item.reward,
        0
      );

    showNotification(
      `🏆 実績解除！ 🪙+${reward}`
    );
  }
}


// ============================================================
// TITLE NAME
// ============================================================

function getTitleName(titleId) {
  const normal =
    NORMAL_TITLES.find(
      title => title.id === titleId
    );

  if (normal) return normal.name;

  const secret =
    SECRET_TITLES.find(
      title => title.id === titleId
    );

  if (secret) return secret.name;

  const shop =
    SHOP_TITLES.find(
      title => title.id === titleId
    );

  if (shop) return shop.name;

  return "無名の冒険者";
}


// ============================================================
// TIMER DISPLAY
// ============================================================

function getTimerSeconds() {
  if (!timerState.running) {
    return timerState.accumulatedSeconds;
  }

  return (
    timerState.accumulatedSeconds +
    Math.floor(
      (Date.now() - timerState.startedAt) /
      1000
    )
  );
}

function updateTimerDisplay() {
  const el =
    $("study-timer-display");

  if (!el) return;

  const total =
    getTimerSeconds();

  const hours =
    Math.floor(total / 3600);

  const minutes =
    Math.floor(
      (total % 3600) / 60
    );

  const seconds =
    total % 60;

  el.textContent =
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;
}

function startTimer() {
  if (timerState.running) return;

  const select =
    $("study-subject");

  const subject =
    select?.value || "";

  if (!subject) {
    showNotification(
      "先に教科を選択してください。"
    );
    return;
  }

  if (!currentPlayer.subjects.includes(subject)) {
    showNotification(
      "登録されていない教科です。"
    );
    return;
  }

  timerState.subject = subject;
  timerState.startedAt = Date.now();
  timerState.running = true;

  if (select) {
    select.disabled = true;
  }

  clearInterval(timerInterval);

  timerInterval =
    setInterval(
      updateTimerDisplay,
      500
    );

  updateTimerDisplay();
}

function pauseTimer() {
  if (!timerState.running) return;

  timerState.accumulatedSeconds =
    getTimerSeconds();

  timerState.running = false;
  timerState.startedAt = 0;

  clearInterval(timerInterval);

  const select =
    $("study-subject");

  if (select) {
    select.disabled = false;
  }

  updateTimerDisplay();
}

function resetTimer() {
  timerState.running = false;
  timerState.startedAt = 0;
  timerState.accumulatedSeconds = 0;
  timerState.savedMinutes = 0;
  timerState.subject = "";

  clearInterval(timerInterval);

  const select =
    $("study-subject");

  if (select) {
    select.disabled = false;
  }

  updateTimerDisplay();
}

async function saveTimerStudy() {
  const seconds =
    getTimerSeconds();

  const totalMinutes =
    Math.floor(seconds / 60);

  const newMinutes =
    totalMinutes -
    timerState.savedMinutes;

  if (newMinutes < 1) {
    showNotification(
      "記録できる1分以上の勉強時間がありません。"
    );
    return;
  }

  if (!timerState.subject) {
    showNotification(
      "教科が選択されていません。"
    );
    return;
  }

  timerState.savedMinutes =
    totalMinutes;

  try {
    await recordStudy(
      newMinutes,
      timerState.subject,
      "タイマー記録",
      "timer"
    );

    showNotification(
      `${newMinutes}分を記録しました！`
    );
  } catch (error) {
    console.error(error);

    timerState.savedMinutes =
      totalMinutes - newMinutes;

    showNotification(
      error.message ||
      "記録に失敗しました。"
    );
  }
}


// ============================================================
// RENDER COMMON
// ============================================================

function renderCommon() {
  if (!currentPlayer) return;

  resetTodayIfNeeded();
  cleanActiveBoosts();

  const level =
    calculateLevel(currentPlayer.xp);

  const rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes
    );

  currentPlayer.rank = rank;

  if ($("header-display-name")) {
    $("header-display-name").textContent =
      currentPlayer.displayName;
  }

  if ($("header-level")) {
    $("header-level").textContent =
      `Lv.${level}`;
  }

  if ($("header-rank")) {
    $("header-rank").textContent =
      rank;
  }

  if ($("header-coins")) {
    $("header-coins").textContent =
      `🪙 ${currentPlayer.coins}`;
  }

  // 星機能は使用しない
  $("star-status")?.classList.add("hidden");

  const profileStars =
    $("profile-stars");

  if (profileStars) {
    profileStars.closest("p")?.classList.add("hidden");
  }
}


// ============================================================
// RENDER HOME
// ============================================================

function renderHome() {
  if (!currentPlayer) return;

  const progress =
    getLevelProgress(
      currentPlayer.xp
    );

  $("home-level").textContent =
    progress.level;

  $("home-xp").textContent =
    `${currentPlayer.xp} XP`;

  $("level-progress").style.width =
    `${progress.percent}%`;

  $("home-xp-required").textContent =
    progress.level >= 100
      ? "MAX LEVEL"
      : `次のレベルまで ${progress.required - progress.current} XP`;

  $("today-study-time").textContent =
    `${currentPlayer.todayStudyMinutes}分`;

  $("today-xp").textContent =
    `${currentPlayer.todayXp} XP`;

  const claimedToday =
    currentPlayer.questState?.daily
      ?.filter(q => q.claimed)
      .length || 0;

  $("today-quests").textContent =
    claimedToday;

  $("today-coins").textContent =
    `🪙 ${currentPlayer.todayCoins}`;

  $("home-rank").textContent =
    currentPlayer.rank;

  $("home-season-study-time").textContent =
    `${(currentPlayer.seasonStudyMinutes / 60).toFixed(1)}時間`;

  const end =
    getSeasonEndDate();

  $("home-season-end").textContent =
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }).format(end);

  ensureQuestState();

  renderQuestList(
    $("home-quest-list"),
    true
  );
}


// ============================================================
// QUEST CARD HTML
// ============================================================

function questCardHtml(quest, type) {
  const progress =
    safeNumber(quest.progress);

  const target =
    safeNumber(quest.target);

  const percent =
    target > 0
      ? clamp(
          (progress / target) * 100,
          0,
          100
        )
      : 0;

  const complete =
    progress >= target;

  let rewardText =
    type === "daily"
      ? "20 XP / 30🪙"
      : type === "weekly"
        ? "70 XP / 70🪙"
        : "100 XP / 500🪙";

  let button = "";

  if (quest.claimed) {
    button =
      `<button type="button" disabled>受取済み ✓</button>`;
  } else if (complete) {
    button =
      `<button type="button" class="primary-button" data-claim-quest="${escapeHtml(quest.id)}">報酬を受け取る</button>`;
  } else {
    button =
      `<button type="button" disabled>未達成</button>`;
  }

  return `
    <article class="rpg-card quest-card">
      <h4>${escapeHtml(quest.title)}</h4>

      <p>
        進捗：
        <strong>${progress} / ${target}分</strong>
      </p>

      <div class="rpg-progress">
        <div style="width:${percent}%"></div>
      </div>

      <p>報酬：${rewardText}</p>

      ${button}
    </article>
  `;
}

function renderQuestList(container, compact = false) {
  if (!container || !currentPlayer) return;

  ensureQuestState();

  const quests =
    currentPlayer.questState.daily || [];

  const rare =
    currentPlayer.questState.rare;

  let html =
    quests
      .map(q =>
        questCardHtml(q, "daily")
      )
      .join("");

  if (!compact && rare) {
    html += `
      <div class="quest-section-label">
        ⭐ レアクエスト
      </div>
      ${questCardHtml(rare, "rare")}
    `;
  }

  container.innerHTML =
    html ||
    `<p class="empty-message">クエストがありません。</p>`;
}


// ============================================================
// RENDER QUEST
// ============================================================

function renderQuestScreen() {
  if (!currentPlayer) return;

  ensureQuestState();

  renderQuestTabs();

  if (activeQuestTab === "daily") {
    const container =
      $("daily-quest-list");

    renderQuestList(
      container,
      false
    );
  }

  if (activeQuestTab === "weekly") {
    renderWeeklyQuest();
  }

  if (activeQuestTab === "boss") {
    renderBoss();
  }

  if (activeQuestTab === "history") {
    renderQuestHistory();
  }
}

function renderQuestTabs() {
  const map = {
    daily: "daily-quest-tab",
    weekly: "weekly-quest-tab",
    boss: "boss-tab",
    history: "quest-history-tab"
  };

  Object.entries(map).forEach(
    ([key, id]) => {
      $(id)?.classList.toggle(
        "hidden",
        activeQuestTab !== key
      );
    }
  );

  document
    .querySelectorAll("[data-quest-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.questTab === activeQuestTab
      );
    });
}

function renderWeeklyQuest() {
  const container =
    $("weekly-quest-list");

  if (!container) return;

  const quest =
    currentPlayer.questState.weekly;

  container.innerHTML =
    quest
      ? questCardHtml(
          quest,
          "weekly"
        )
      : `<p class="empty-message">クエストがありません。</p>`;
}

function renderQuestHistory() {
  const container =
    $("quest-history-list");

  if (!container) return;

  const history =
    currentPlayer.questState?.history || [];

  if (!history.length) {
    container.innerHTML =
      `<p class="empty-message">まだ履歴がありません。</p>`;
    return;
  }

  container.innerHTML =
    history
      .slice(0, 50)
      .map(item => `
        <article class="rpg-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>
            ${formatDateTime(item.completedAt)}
          </p>
          <p>
            ✨ +${safeNumber(item.xp)} XP
            / 🪙 +${safeNumber(item.coins)}
          </p>
        </article>
      `)
      .join("");
}


// ============================================================
// RENDER BOSS
// ============================================================

async function renderBoss() {
  if (!currentPlayer) return;

  try {
    let boss = null;

    if (currentPlayer.partyId) {
      currentParty =
        await getPartyDoc();

      if (currentParty) {
        boss =
          await ensurePartyBoss(
            currentParty
          );
      }
    }

    if (!boss) {
      boss =
        await getPersonalBoss();
    }

    if (!boss) return;

    const currentHp =
      Math.max(
        0,
        safeNumber(boss.currentHp)
      );

    const maxHp =
      Math.max(
        1,
        safeNumber(boss.maxHp)
      );

    const percent =
      clamp(
        (currentHp / maxHp) * 100,
        0,
        100
      );

    $("boss-name").textContent =
      boss.name || "受験の魔王";

    $("boss-level").textContent =
      `Lv.${safeNumber(boss.level, 1)}`;

    $("boss-current-hp").textContent =
      currentHp.toLocaleString();

    $("boss-max-hp").textContent =
      maxHp.toLocaleString();

    $("boss-hp-progress").style.width =
      `${percent}%`;

    $("boss-weakness-subject").textContent =
      SUBJECT_NAMES[boss.weakness] ||
      boss.weakness ||
      "-";

    $("boss-weakness-multiplier").textContent =
      `×${safeNumber(
        boss.weaknessMultiplier,
        1.5
      )}`;

    $("boss-reset-date").textContent =
      formatDateTime(
        getSeasonEndDate()
      );

    if (boss.defeated) {
      $("boss-image").textContent = "🏆";
    } else {
      $("boss-image").textContent = "👹";
    }

    renderBossParty(boss);
    renderBossLogs(boss);

  } catch (error) {
    console.error("Boss render error:", error);

    showNotification(
      "ボス情報の取得に失敗しました。"
    );
  }
}


// ============================================================
// RENDER BOSS PARTY
// ============================================================

function renderBossParty(boss) {
  const list =
    $("boss-party-member-list");

  if (!list) return;

  if (!currentParty) {
    list.innerHTML = `
      <div class="rpg-card">
        <strong>個人戦</strong>
        <p>自分だけでボスに挑戦中</p>
      </div>
    `;

    $("boss-party-count").textContent =
      "1 / 1人";

    return;
  }

  const members =
    Object.values(
      currentParty.memberData || {}
    );

  $("boss-party-count").textContent =
    `${members.length} / 4人`;

  list.innerHTML =
    members
      .map(member => {
        const contribution =
          safeNumber(
            boss.contributions?.[member.uid]
          );

        return `
          <div class="rpg-card">
            <strong>
              ${escapeHtml(
                member.displayName ||
                member.userId ||
                "冒険者"
              )}
            </strong>
            <span>
              ${contribution.toLocaleString()} ダメージ
            </span>
          </div>
        `;
      })
      .join("");
}


// ============================================================
// BOSS LOG
// ============================================================

function renderBossLogs(boss) {
  const list =
    $("boss-log-list");

  if (!list) return;

  const logs =
    boss.battleLogs || [];

  if (!logs.length) {
    list.innerHTML =
      `<p class="empty-message">まだ戦闘記録はありません。</p>`;
    return;
  }

  list.innerHTML =
    logs
      .slice(0, 30)
      .map(log => `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(
              log.displayName ||
              "冒険者"
            )}
          </strong>
          <p>
            ${escapeHtml(
              SUBJECT_NAMES[log.subject] ||
              log.subject ||
              ""
            )}
            ${safeNumber(log.minutes)}分
          </p>
          <strong>
            ⚔️ ${safeNumber(log.damage).toLocaleString()} ダメージ
          </strong>
          <small>
            ${formatDateTime(log.timestamp)}
          </small>
        </div>
      `)
      .join("");
}


// ============================================================
// STUDY RENDER
// ============================================================

function renderStudy() {
  if (!currentPlayer) return;

  const select =
    $("study-subject");

  if (select) {
    const previous =
      select.value;

    select.innerHTML =
      `<option value="">教科を選択</option>` +
      currentPlayer.subjects
        .map(subject => `
          <option value="${escapeHtml(subject)}">
            ${escapeHtml(
              SUBJECT_NAMES[subject]
            )}
          </option>
        `)
        .join("");

    if (
      currentPlayer.subjects.includes(previous)
    ) {
      select.value = previous;
    }

    if (timerState.running) {
      select.disabled = true;
    }
  }

  renderSubjectLevels();
  renderSubjectStudy();
  renderStudyHistory();

  updateTimerDisplay();
}

function renderSubjectLevels() {
  const container =
    $("subject-level-list");

  if (!container) return;

  container.innerHTML =
    currentPlayer.subjects
      .map(subject => {
        const level =
          getSubjectLevel(subject);

        const minutes =
          getSubjectMinutes(subject);

        const percent =
          clamp(
            (level / 100) * 100,
            0,
            100
          );

        return `
          <div class="rpg-card">
            <div>
              <strong>
                ${escapeHtml(
                  SUBJECT_NAMES[subject]
                )}
              </strong>

              <span>
                Lv.${level}
              </span>
            </div>

            <div class="rpg-progress">
              <div style="width:${percent}%"></div>
            </div>

            <small>
              ${minutes}分
            </small>
          </div>
        `;
      })
      .join("");
}

function renderSubjectStudy() {
  const container =
    $("subject-study-list");

  if (!container) return;

  container.innerHTML =
    currentPlayer.subjects
      .map(subject => `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(
              SUBJECT_NAMES[subject]
            )}
          </strong>
          <span>
            ${getSubjectMinutes(subject)}分
          </span>
        </div>
      `)
      .join("");
}

function renderStudyHistory() {
  const container =
    $("study-history-list");

  if (!container) return;

  const history =
    currentPlayer.studyHistory || [];

  if (!history.length) {
    container.innerHTML =
      `<p class="empty-message">まだ勉強履歴がありません。</p>`;
    return;
  }

  container.innerHTML =
    history
      .slice(0, 50)
      .map(record => `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(
              SUBJECT_NAMES[record.subject] ||
              record.subject
            )}
          </strong>

          <p>
            ${safeNumber(record.minutes)}分
            / +${safeNumber(record.xp)} XP
            / +${safeNumber(record.coins)}🪙
          </p>

          ${
            record.note
              ? `<small>${escapeHtml(record.note)}</small>`
              : ""
          }

          <small>
            ${formatDateTime(record.timestamp)}
          </small>
        </div>
      `)
      .join("");
}


// ============================================================
// PARTY
// ============================================================

async function renderPartyScreen() {
  if (!currentPlayer) return;

  renderPartyTabs();

  try {
    currentParty =
      currentPlayer.partyId
        ? await getPartyDoc()
        : null;

    renderCurrentParty();

    if (activePartyTab === "friends") {
      await renderFriends();
    }

    if (activePartyTab === "requests") {
      await renderPartyRequests();
    }

    $("party-week-range").textContent =
      getWeekRangeText();

  } catch (error) {
    console.error(error);
  }
}

function renderPartyTabs() {
  const map = {
    party: "party-tab",
    friends: "friends-tab",
    requests: "friend-requests-tab"
  };

  Object.entries(map).forEach(
    ([key, id]) => {
      $(id)?.classList.toggle(
        "hidden",
        activePartyTab !== key
      );
    }
  );

  document
    .querySelectorAll("[data-party-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.partyTab === activePartyTab
      );
    });
}

function renderCurrentParty() {
  const list =
    $("party-member-list");

  if (!list) return;

  if (!currentParty) {
    list.innerHTML = `
      <div class="rpg-card">
        <p>現在パーティーに所属していません。</p>
        <small>
          仲間を招待するとパーティーを作成できます。
        </small>
      </div>
    `;

    $("party-member-count").textContent =
      "0 / 4人";

    return;
  }

  const members =
    Object.values(
      currentParty.memberData || {}
    );

  $("party-member-count").textContent =
    `${members.length} / 4人`;

  let html =
    members
      .map(member => `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(
              member.displayName ||
              member.userId ||
              "冒険者"
            )}
          </strong>

          <span>
            ${
              member.uid ===
              currentParty.leaderUid
                ? "👑 リーダー"
                : "メンバー"
            }
          </span>
        </div>
      `)
      .join("");

  html += `
    <button
      type="button"
      class="secondary-button"
      data-party-action="leave"
    >
      パーティーを抜ける
    </button>
  `;

  list.innerHTML = html;
}

function getWeekRangeText() {
  const p = japanParts();

  const d =
    new Date(
      Date.UTC(
        p.year,
        p.month - 1,
        p.day
      )
    );

  const day =
    d.getUTCDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  d.setUTCDate(
    d.getUTCDate() + diff
  );

  const start =
    new Date(d);

  const end =
    new Date(d);

  end.setUTCDate(
    end.getUTCDate() + 6
  );

  return `${start.getUTCMonth() + 1}/${start.getUTCDate()}〜${end.getUTCMonth() + 1}/${end.getUTCDate()}`;
}


// ============================================================
// PARTY INVITE
// ============================================================

async function inviteToParty(event) {
  event.preventDefault();

  const errorEl =
    $("party-error");

  if (errorEl) {
    errorEl.textContent = "";
  }

  const userId =
    $("party-invite-user-id")
      ?.value
      .trim()
      .toLowerCase();

  if (!userId) return;

  try {
    const usersQuery =
      query(
        collection(db, "users"),
        where("userId", "==", userId),
        limit(1)
      );

    const snapshot =
      await getDocs(usersQuery);

    if (snapshot.empty) {
      throw new Error(
        "そのユーザーIDの冒険者は見つかりません。"
      );
    }

    const target =
      snapshot.docs[0];

    const targetData =
      target.data();

    if (target.id === currentPlayer.uid) {
      throw new Error(
        "自分自身は招待できません。"
      );
    }

    if (
      currentPlayer.partyId &&
      currentParty?.memberUids?.includes(target.id)
    ) {
      throw new Error(
        "すでに同じパーティーです。"
      );
    }

    let partyId =
      currentPlayer.partyId;

    if (!partyId) {
      partyId =
        crypto.randomUUID();

      const party = {
        leaderUid: currentPlayer.uid,
        memberUids: [
          currentPlayer.uid
        ],
        memberData: {
          [currentPlayer.uid]: {
            uid: currentPlayer.uid,
            userId: currentPlayer.userId,
            displayName: currentPlayer.displayName,
            subjects: currentPlayer.subjects
          }
        },
        boss: null,
        createdAt: new Date().toISOString()
      };

      await setDoc(
        doc(db, "parties", partyId),
        party
      );

      currentPlayer.partyId = partyId;
      currentPlayer.partyRole = "leader";

      await savePlayer();
    }

    currentParty =
      await getPartyDoc();

    if (
      currentParty &&
      currentParty.memberUids.length >= 4
    ) {
      throw new Error(
        "パーティーは最大4人です。"
      );
    }

    const requestId =
      crypto.randomUUID();

    await setDoc(
      doc(db, "requests", requestId),
      {
        type: "party",
        fromUid: currentPlayer.uid,
        fromUserId: currentPlayer.userId,
        fromDisplayName: currentPlayer.displayName,
        toUid: target.id,
        toUserId: targetData.userId,
        status: "pending",
        partyId,
        createdAt: new Date().toISOString()
      }
    );

    $("party-invite-user-id").value = "";

    showNotification(
      `${targetData.displayName}さんを招待しました！`
    );

  } catch (error) {
    console.error(error);

    if (errorEl) {
      errorEl.textContent =
        error.message ||
        "招待に失敗しました。";
    }
  }
}


// ============================================================
// PARTY REQUESTS
// ============================================================

async function renderPartyRequests() {
  const list = $("friend-request-list");
  if (!list || !currentPlayer) return;

  try {
    const q = query(
      collection(db, "requests"),
      where("toUid", "==", currentPlayer.uid),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const requests = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.status === "pending" && (item.type === "friend" || item.type === "party"));

    if (!requests.length) {
      list.innerHTML = `
        <div class="rpg-request-empty">
          <div class="rpg-empty-icon">📨</div>
          <strong>新しい申請はありません</strong>
          <small>フレンド申請やパーティー招待が届くとここに表示されます。</small>
        </div>
      `;
      return;
    }

    list.innerHTML = requests.map(request => {
      if (request.type === "friend") {
        return `
          <div class="rpg-request-card">
            <div class="rpg-request-icon">👤</div>
            <div class="rpg-request-main">
              <strong>${escapeHtml(request.fromDisplayName || request.fromUserId || "冒険者")}</strong>
              <small>@${escapeHtml(request.fromUserId || "-")} からフレンド申請</small>
              <div class="rpg-request-actions">
                <button type="button" class="primary-button" data-friend-action="accept" data-request-id="${escapeHtml(request.id)}">承認</button>
                <button type="button" class="secondary-button" data-friend-action="decline" data-request-id="${escapeHtml(request.id)}">拒否</button>
              </div>
            </div>
          </div>
        `;
      }

      if (request.type === "party") {
        return `
          <div class="rpg-request-card">
            <div class="rpg-request-icon">⚔️</div>
            <div class="rpg-request-main">
              <strong>${escapeHtml(request.fromDisplayName || request.fromUserId || "冒険者")}</strong>
              <small>@${escapeHtml(request.fromUserId || "-")} からパーティー招待</small>
              <div class="rpg-request-actions">
                <button type="button" class="primary-button" data-party-action="accept" data-request-id="${escapeHtml(request.id)}">参加</button>
                <button type="button" class="secondary-button" data-party-action="decline" data-request-id="${escapeHtml(request.id)}">拒否</button>
              </div>
            </div>
          </div>
        `;
      }

      return "";
    }).join("");
  } catch (error) {
    console.error(error);
    list.innerHTML = `
      <div class="rpg-request-empty">
        <div class="rpg-empty-icon">⚠️</div>
        <strong>申請を読み込めませんでした</strong>
        <small>Firestoreの権限またはネットワーク接続を確認してください。</small>
      </div>
    `;
  }
}

// ============================================================
// ACCEPT PARTY REQUEST
// ============================================================

async function acceptPartyRequest(requestId) {
  if (!currentPlayer) return;

  const requestRef =
    doc(db, "requests", requestId);

  const requestSnapshot =
    await getDoc(requestRef);

  if (!requestSnapshot.exists()) {
    showNotification("申請が見つかりません。");
    return;
  }

  const request =
    requestSnapshot.data();

  if (
    request.toUid !== currentPlayer.uid ||
    request.status !== "pending"
  ) {
    showNotification("この申請は無効です。");
    return;
  }

  const partyRef =
    doc(db, "parties", request.partyId);

  const partySnapshot =
    await getDoc(partyRef);

  if (!partySnapshot.exists()) {
    showNotification("パーティーが存在しません。");
    return;
  }

  const party =
    partySnapshot.data();

  if (
    party.memberUids.length >= 4
  ) {
    showNotification(
      "パーティーが満員です。"
    );
    return;
  }

  if (
    party.memberUids.includes(
      currentPlayer.uid
    )
  ) {
    await updateDoc(
      requestRef,
      { status: "accepted" }
    );

    return;
  }

  party.memberUids.push(
    currentPlayer.uid
  );

  if (!party.memberData) {
    party.memberData = {};
  }

  party.memberData[currentPlayer.uid] = {
    uid: currentPlayer.uid,
    userId: currentPlayer.userId,
    displayName: currentPlayer.displayName,
    subjects: currentPlayer.subjects
  };

  await updateDoc(
    partyRef,
    {
      memberUids: party.memberUids,
      memberData: party.memberData
    }
  );

  currentPlayer.partyId =
    request.partyId;

  currentPlayer.partyRole =
    "member";

  await updateDoc(
    requestRef,
    {
      status: "accepted"
    }
  );

  await savePlayer();

  showNotification(
    "パーティーに参加しました！"
  );

  await renderPartyScreen();
}


// ============================================================
// DECLINE
// ============================================================

async function declinePartyRequest(requestId) {
  await updateDoc(
    doc(db, "requests", requestId),
    {
      status: "declined"
    }
  );

  showNotification("申請を拒否しました。");

  await renderPartyScreen();
}


// ============================================================
// LEAVE PARTY
// ============================================================

async function leaveParty() {
  if (!currentPlayer?.partyId) {
    return;
  }

  const partyRef =
    doc(db, "parties", currentPlayer.partyId);

  const snapshot =
    await getDoc(partyRef);

  if (!snapshot.exists()) {
    currentPlayer.partyId = "";
    currentPlayer.partyRole = "";

    await savePlayer();

    return;
  }

  const party =
    snapshot.data();

  const members =
    (party.memberUids || [])
      .filter(
        uid => uid !== currentPlayer.uid
      );

  const memberData =
    {
      ...(party.memberData || {})
    };

  delete memberData[currentPlayer.uid];

  if (!members.length) {
    await deleteDoc(partyRef);
  } else {
    const newLeader =
      party.leaderUid === currentPlayer.uid
        ? members[0]
        : party.leaderUid;

    await updateDoc(
      partyRef,
      {
        memberUids: members,
        memberData,
        leaderUid: newLeader
      }
    );
  }

  currentPlayer.partyId = "";
  currentPlayer.partyRole = "";

  await savePlayer();

  currentParty = null;

  showNotification(
    "パーティーを抜けました。"
  );

  await renderPartyScreen();
}


// ============================================================
// FRIENDS
// ============================================================

function ensureFriendRequestUI() {
  const list = $("friend-list");
  if (!list || !currentPlayer) return;

  if (!document.getElementById("friend-request-form-runtime")) {
    const form = document.createElement("form");
    form.id = "friend-request-form-runtime";
    form.className = "rpg-friend-request-panel";
    form.innerHTML = `
      <div class="rpg-section-heading">
        <div>
          <strong>フレンドを追加</strong>
          <small>相手のユーザーIDを入力してください</small>
        </div>
      </div>
      <div class="rpg-friend-request-row">
        <input
          id="friend-request-user-id"
          name="friendUserId"
          type="text"
          maxlength="30"
          autocomplete="off"
          placeholder="ユーザーID"
        >
        <button type="submit" class="primary-button">申請する</button>
      </div>
      <p id="friend-request-error-runtime" class="rpg-inline-error"></p>
    `;
    list.prepend(form);
  }
}

async function sendFriendRequest(event) {
  event.preventDefault();
  if (!currentPlayer) return;

  const input = $("friend-request-user-id");
  const errorEl = $("friend-request-error-runtime");
  const userId = (input?.value || "").trim().toLowerCase();

  if (errorEl) errorEl.textContent = "";

  if (!/^[A-Za-z0-9_-]{3,30}$/.test(userId)) {
    if (errorEl) errorEl.textContent = "ユーザーIDは3〜30文字の英数字・_・-で入力してください。";
    return;
  }

  if (userId === String(currentPlayer.userId || "").toLowerCase()) {
    if (errorEl) errorEl.textContent = "自分自身には申請できません。";
    return;
  }

  const button = event.submitter || event.currentTarget.querySelector("button[type=submit]");
  if (button) button.disabled = true;

  try {
    const targetQuery = query(
      collection(db, "users"),
      where("userId", "==", userId),
      limit(1)
    );
    const targetSnapshot = await getDocs(targetQuery);

    if (targetSnapshot.empty) {
      throw new Error("そのユーザーIDの冒険者は見つかりません。");
    }

    const targetDoc = targetSnapshot.docs[0];
    const target = targetDoc.data();
    const targetUid = targetDoc.id;

    if (targetUid === currentPlayer.uid) {
      throw new Error("自分自身には申請できません。");
    }

    if ((currentPlayer.friendIds || []).includes(targetUid)) {
      throw new Error("すでにフレンドです。");
    }

    // 逆方向から既に申請されている場合は、新規申請ではなく受信申請として扱う。
    const incomingQuery = query(
      collection(db, "requests"),
      where("toUid", "==", currentPlayer.uid),
      limit(50)
    );
    const incomingSnapshot = await getDocs(incomingQuery);
    const incomingRequest = incomingSnapshot.docs.find(docSnap => {
      const data = docSnap.data();
      return data.type === "friend" && data.status === "pending" && data.fromUid === targetUid;
    });

    if (incomingRequest) {
      await acceptFriendRequest(incomingRequest.id, true);
      if (input) input.value = "";
      showNotification(`${target.displayName || target.userId || "冒険者"}さんとのフレンド申請を承認しました！`);
      return;
    }

    const requestId = `friend-${[currentPlayer.uid, targetUid].sort().join("-")}`;
    const requestRef = doc(db, "requests", requestId);
    const existing = await getDoc(requestRef);

    if (existing.exists()) {
      const data = existing.data();
      if (data.status === "pending") {
        throw new Error("すでにフレンド申請を送っています。");
      }
      if (data.status === "accepted") {
        throw new Error("すでにフレンドです。");
      }
    }

    await setDoc(requestRef, {
      type: "friend",
      fromUid: currentPlayer.uid,
      fromUserId: currentPlayer.userId,
      fromDisplayName: currentPlayer.displayName,
      toUid: targetUid,
      toUserId: target.userId || userId,
      toDisplayName: target.displayName || target.userId || "冒険者",
      status: "pending",
      createdAt: new Date().toISOString()
    });

    if (input) input.value = "";
    showNotification(`${target.displayName || target.userId || "冒険者"}さんにフレンド申請を送りました！`);
    await renderFriends();
  } catch (error) {
    console.error("Friend request error:", error);
    if (errorEl) errorEl.textContent = error.message || "フレンド申請に失敗しました。";
  } finally {
    if (button) button.disabled = false;
  }
}

async function acceptFriendRequest(requestId, silent = false) {
  if (!currentPlayer || !requestId) return;

  const requestRef = doc(db, "requests", requestId);

  await runTransaction(db, async transaction => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error("フレンド申請が見つかりません。");
    }

    const request = requestSnapshot.data();
    if (
      request.type !== "friend" ||
      request.toUid !== currentPlayer.uid ||
      request.status !== "pending"
    ) {
      throw new Error("このフレンド申請は無効です。");
    }

    const senderRef = doc(db, "users", request.fromUid);
    const receiverRef = doc(db, "users", currentPlayer.uid);
    const senderSnapshot = await transaction.get(senderRef);
    const receiverSnapshot = await transaction.get(receiverRef);

    if (!senderSnapshot.exists() || !receiverSnapshot.exists()) {
      throw new Error("ユーザーデータを取得できませんでした。");
    }

    const sender = senderSnapshot.data();
    const receiver = receiverSnapshot.data();
    const senderFriends = uniqueArray(sender.friendIds);
    const receiverFriends = uniqueArray(receiver.friendIds);

    if (!senderFriends.includes(currentPlayer.uid)) {
      senderFriends.push(currentPlayer.uid);
    }
    if (!receiverFriends.includes(request.fromUid)) {
      receiverFriends.push(request.fromUid);
    }

    transaction.update(senderRef, { friendIds: senderFriends });
    transaction.update(receiverRef, { friendIds: receiverFriends });
    transaction.update(requestRef, {
      status: "accepted",
      acceptedAt: new Date().toISOString()
    });
  });

  currentPlayer.friendIds = uniqueArray([
    ...(currentPlayer.friendIds || []),
    await getFriendUidFromRequest(requestId)
  ].filter(Boolean));

  await savePlayer();

  if (!silent) {
    showNotification("フレンド申請を承認しました！");
    await renderPartyScreen();
  }
}

async function getFriendUidFromRequest(requestId) {
  try {
    const snapshot = await getDoc(doc(db, "requests", requestId));
    if (!snapshot.exists()) return "";
    const request = snapshot.data();
    return request.fromUid === currentPlayer?.uid ? request.toUid : request.fromUid;
  } catch (error) {
    console.error(error);
    return "";
  }
}

async function declineFriendRequest(requestId) {
  if (!currentPlayer || !requestId) return;

  const requestRef = doc(db, "requests", requestId);
  const snapshot = await getDoc(requestRef);

  if (!snapshot.exists()) {
    showNotification("フレンド申請が見つかりません。");
    return;
  }

  const request = snapshot.data();
  if (
    request.type !== "friend" ||
    request.toUid !== currentPlayer.uid ||
    request.status !== "pending"
  ) {
    showNotification("このフレンド申請は無効です。");
    return;
  }

  await updateDoc(requestRef, {
    status: "declined",
    declinedAt: new Date().toISOString()
  });

  showNotification("フレンド申請を拒否しました。");
  await renderPartyScreen();
}

async function renderFriends() {
  const list = $("friend-list");
  if (!list || !currentPlayer) return;

  ensureFriendRequestUI();

  const existingCards = list.querySelectorAll(".rpg-friend-card, .rpg-friend-empty, .rpg-friend-sent");
  existingCards.forEach(el => el.remove());

  const ids = uniqueArray(currentPlayer.friendIds || []);
  const users = [];

  for (const uid of ids.slice(0, 30)) {
    try {
      const snapshot = await getDoc(doc(db, "users", uid));
      if (snapshot.exists()) users.push({ uid, ...snapshot.data() });
    } catch (error) {
      console.error(error);
    }
  }

  const sent = [];
  try {
    const sentQuery = query(
      collection(db, "requests"),
      where("fromUid", "==", currentPlayer.uid),
      limit(50)
    );
    const sentSnapshot = await getDocs(sentQuery);
    sentSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.type === "friend" && data.status === "pending") {
        sent.push({ id: docSnap.id, ...data });
      }
    });
  } catch (error) {
    console.error("sent friend request query error:", error);
  }

  const cards = [];

  if (sent.length) {
    cards.push(`
      <div class="rpg-friend-sent">
        <div class="rpg-section-heading">
          <div>
            <strong>送信中の申請</strong>
            <small>${sent.length}件の申請を送信しています</small>
          </div>
        </div>
        <div class="rpg-friend-sent-list">
          ${sent.map(request => `
            <div class="rpg-friend-mini-card">
              <div>
                <strong>${escapeHtml(request.toDisplayName || request.toUserId || "冒険者")}</strong>
                <small>@${escapeHtml(request.toUserId || "-")}</small>
              </div>
              <span class="rpg-status-pill">申請中</span>
            </div>
          `).join("")}
        </div>
      </div>
    `);
  }

  if (!users.length) {
    cards.push(`
      <div class="rpg-friend-empty">
        <div class="rpg-empty-icon">👥</div>
        <strong>まだフレンドがいません</strong>
        <small>上のフォームからユーザーIDを入力して仲間を追加しよう。</small>
      </div>
    `);
  } else {
    cards.push(`
      <div class="rpg-friend-section">
        <div class="rpg-section-heading">
          <div>
            <strong>フレンド一覧</strong>
            <small>${users.length}人</small>
          </div>
        </div>
        <div class="rpg-friend-grid">
          ${users.map(user => {
            const rank = calculateRank(user.seasonStudyMinutes);
            const hours = (safeNumber(user.seasonStudyMinutes) / 60).toFixed(1);
            return `
              <div class="rpg-friend-card">
                <div class="rpg-friend-avatar">${escapeHtml((user.displayName || user.userId || "冒").slice(0, 1))}</div>
                <div class="rpg-friend-main">
                  <strong>${escapeHtml(user.displayName || user.userId || "冒険者")}</strong>
                  <small>@${escapeHtml(user.userId || "-")}</small>
                  <div class="rpg-friend-meta">
                    <span>${escapeHtml(rank)}</span>
                    <span>${hours}h</span>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `);
  }

  list.insertAdjacentHTML("beforeend", cards.join(""));
}


async function renderFriends() {
  const list =
    $("friend-list");

  if (!list) return;

  const ids =
    currentPlayer.friendIds || [];

  if (!ids.length) {
    list.innerHTML =
      `<p class="empty-message">フレンドがいません。</p>`;
    return;
  }

  const users = [];

  for (const uid of ids.slice(0, 20)) {
    try {
      const snapshot =
        await getDoc(
          doc(db, "users", uid)
        );

      if (snapshot.exists()) {
        users.push({
          uid,
          ...snapshot.data()
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  list.innerHTML =
    users
      .map(user => `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(
              user.displayName ||
              user.userId
            )}
          </strong>
          <span>
            ${escapeHtml(
              calculateRank(
                user.seasonStudyMinutes
              )
            )}
          </span>
        </div>
      `)
      .join("") ||
    `<p class="empty-message">フレンドがいません。</p>`;
}


// ============================================================
// RANK
// ============================================================

async function renderRankScreen() {
  if (!currentPlayer) return;

  renderRankTabs();

  $("current-rank-name").textContent =
    currentPlayer.rank;

  $("current-season-study-time").textContent =
    `${(
      currentPlayer.seasonStudyMinutes / 60
    ).toFixed(1)}時間`;

  $("current-season-time").textContent =
    formatDateTime(
      getSeasonEndDate()
    );

  if (activeRankTab === "ranking") {
    await renderRanking();
  }

  if (activeRankTab === "history") {
    renderSeasonHistory();
  }
}

function renderRankTabs() {
  const map = {
    rank: "rank-info-tab",
    ranking: "ranking-tab",
    history: "season-history-tab"
  };

  Object.entries(map).forEach(
    ([key, id]) => {
      $(id)?.classList.toggle(
        "hidden",
        activeRankTab !== key
      );
    }
  );

  document
    .querySelectorAll("[data-rank-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.rankTab === activeRankTab
      );
    });
}

async function renderRanking() {
  if (selectedRankingType === "friends") {
    await renderFriendsRanking();
  } else {
    await renderGlobalRanking();
  }

  document
    .querySelectorAll("[data-ranking-type]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.rankingType ===
        selectedRankingType
      );
    });
}

async function renderFriendsRanking() {
  const list =
    $("friends-ranking-list");

  const global =
    $("global-ranking-list");

  if (!list) return;

  list.classList.remove("hidden");
  global?.classList.add("hidden");

  const ids =
    uniqueArray([
      currentPlayer.uid,
      ...(currentPlayer.friendIds || [])
    ]);

  const users = [];

  for (const uid of ids.slice(0, 20)) {
    try {
      const snapshot =
        await getDoc(
          doc(db, "users", uid)
        );

      if (
        snapshot.exists() &&
        snapshot.data().seasonId ===
        currentPlayer.seasonId
      ) {
        users.push({
          uid,
          ...snapshot.data()
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  users.sort(
    (a, b) =>
      safeNumber(b.seasonStudyMinutes) -
      safeNumber(a.seasonStudyMinutes)
  );

  list.innerHTML =
    users.map((user, index) => `
      <div class="rpg-card">
        <strong>
          #${index + 1}
          ${escapeHtml(
            user.displayName ||
            user.userId
          )}
        </strong>

        <span>
          ${(
            safeNumber(
              user.seasonStudyMinutes
            ) / 60
          ).toFixed(1)}時間
        </span>
      </div>
    `).join("") ||
    `<p class="empty-message">ランキングデータがありません。</p>`;
}

async function renderGlobalRanking() {
  const list =
    $("global-ranking-list");

  const friends =
    $("friends-ranking-list");

  if (!list) return;

  list.classList.remove("hidden");
  friends?.classList.add("hidden");

  try {
    const q =
      query(
        collection(db, "users"),
        orderBy(
          "seasonStudyMinutes",
          "desc"
        ),
        limit(50)
      );

    const snapshot =
      await getDocs(q);

    const users =
      snapshot.docs
        .map(docSnap => ({
          uid: docSnap.id,
          ...docSnap.data()
        }))
        .filter(
          user =>
            user.seasonId ===
            currentPlayer.seasonId
        );

    let myRank = -1;

    users.forEach((user, index) => {
      if (
        user.uid === currentPlayer.uid
      ) {
        myRank = index + 1;
      }
    });

    $("global-rank-number").textContent =
      myRank > 0
        ? `#${myRank}`
        : "50位以下";

    list.innerHTML =
      users.map((user, index) => `
        <div class="rpg-card">
          <strong>
            #${index + 1}
            ${escapeHtml(
              user.displayName ||
              user.userId
            )}
          </strong>

          <span>
            ${(
              safeNumber(
                user.seasonStudyMinutes
              ) / 60
            ).toFixed(1)}時間
          </span>
        </div>
      `).join("");

  } catch (error) {
    console.error(error);

    list.innerHTML =
      `<p class="empty-message">全体ランキングを取得できませんでした。</p>`;
  }
}

function renderSeasonHistory() {
  const list =
    $("season-history-list");

  if (!list) return;

  const history =
    currentPlayer.seasonHistory || [];

  if (!history.length) {
    list.innerHTML =
      `<p class="empty-message">まだ履歴がありません。</p>`;
    return;
  }

  list.innerHTML =
    history
      .map(item => `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(item.seasonId)}
          </strong>

          <p>
            ${escapeHtml(item.rank)}
          </p>

          <p>
            ${(
              safeNumber(
                item.studyMinutes
              ) / 60
            ).toFixed(1)}時間
          </p>
        </div>
      `)
      .join("");
}


// ============================================================
// SHOP
// ============================================================

function renderShop() {
  if (!currentPlayer) return;

  $("shop-coin-count").textContent =
    currentPlayer.coins;

  renderShopTitles();
  renderShopItems();
}

function renderShopTitles() {
  const container =
    $("shop-title-list");

  if (!container) return;

  container.innerHTML =
    SHOP_TITLES.map(title => {
      const purchased =
        currentPlayer.purchasedItems
          .includes(title.id);

      return `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(title.name)}
          </strong>

          <p>
            🪙 ${title.price}
          </p>

          ${
            purchased
              ? `<button type="button" disabled>購入済み</button>`
              : `<button type="button" data-buy-title="${escapeHtml(title.id)}">購入</button>`
          }
        </div>
      `;
    }).join("");
}

function renderShopItems() {
  const container =
    $("shop-item-list");

  if (!container) return;

  container.innerHTML =
    SHOP_ITEMS.map(item => {
      const quantity =
        safeNumber(
          currentPlayer.inventory?.[item.id]
        );

      return `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(item.name)}
          </strong>

          <p>
            ${escapeHtml(item.description)}
          </p>

          <p>
            🪙 ${item.price}
            / 所持 ${quantity}
          </p>

          <button
            type="button"
            data-buy-item="${escapeHtml(item.id)}"
          >
            購入
          </button>
        </div>
      `;
    }).join("");
}


// ============================================================
// SHOP PURCHASE - ITEM
// ============================================================

async function buyShopItem(itemId) {
  if (!currentPlayer) return;

  const item =
    SHOP_ITEMS.find(
      item => item.id === itemId
    );

  if (!item) {
    showNotification("アイテムが見つかりません。");
    return;
  }

  if (
    currentPlayer.coins <
    item.price
  ) {
    showNotification(
      "コインが足りません。"
    );
    return;
  }

  if (!currentPlayer.inventory) {
    currentPlayer.inventory = {};
  }

  // XPブーストは購入後すぐ使用可能な在庫へ
  // ボスアイテムも在庫へ
  currentPlayer.coins -= item.price;

  currentPlayer.inventory[item.id] =
    safeNumber(
      currentPlayer.inventory[item.id]
    ) + 1;

  await savePlayer();

  showNotification(
    `${item.name}を購入しました！`
  );

  renderAll();
}


// ============================================================
// SHOP PURCHASE - TITLE
// ============================================================

async function buyShopTitle(titleId) {
  if (!currentPlayer) return;

  const title =
    SHOP_TITLES.find(
      item => item.id === titleId
    );

  if (!title) {
    showNotification(
      "タイトルが見つかりません。"
    );
    return;
  }

  if (
    currentPlayer.purchasedItems
      .includes(titleId)
  ) {
    showNotification(
      "すでに購入済みです。"
    );
    return;
  }

  if (
    currentPlayer.coins <
    title.price
  ) {
    showNotification(
      "コインが足りません。"
    );
    return;
  }

  currentPlayer.coins -=
    title.price;

  currentPlayer.purchasedItems.push(
    titleId
  );

  unlockTitle(titleId);

  await savePlayer();

  showNotification(
    `「${title.name}」を購入しました！`
  );

  renderAll();
}



// ============================================================
// USE ITEM
// ============================================================

async function useItem(itemId) {
  if (!currentPlayer) return;

  const item =
    SHOP_ITEMS.find(
      item => item.id === itemId
    );

  if (!item) return;

  const quantity =
    safeNumber(
      currentPlayer.inventory?.[itemId]
    );

  if (quantity <= 0) {
    showNotification(
      "そのアイテムを持っていません。"
    );
    return;
  }

  if (item.type === "xpBoost") {
    if (!Array.isArray(currentPlayer.activeBoosts)) {
      currentPlayer.activeBoosts = [];
    }

    currentPlayer.activeBoosts.push({
      id: item.id,
      multiplier: item.multiplier,
      expiresAt:
        Date.now() + item.duration
    });

    currentPlayer.inventory[itemId] =
      quantity - 1;

    await savePlayer();

    showNotification(
      `${item.name}を使用しました！`
    );

    renderAll();

    return;
  }

  if (item.type === "bossDown") {
    const old =
      safeNumber(
        currentPlayer.pendingBossLevelDownMultiplier,
        1
      );

    currentPlayer.pendingBossLevelDownMultiplier =
      clamp(
        old * item.multiplier,
        0.5,
        1
      );

    currentPlayer.inventory[itemId] =
      quantity - 1;

    await savePlayer();

    showNotification(
      "次のボスが弱体化されます！"
    );

    renderAll();
  }
}


// ============================================================
// LOCKER
// ============================================================

function renderLocker() {
  if (!currentPlayer) return;

  renderLockerTitles();
  renderLockerItems();
}

function renderLockerTitles() {
  const container =
    $("locker-title-list");

  if (!container) return;

  const ownedNormal =
    NORMAL_TITLES.filter(
      title =>
        currentPlayer.unlockedTitles
          .includes(title.id)
    );

  const ownedShop =
    SHOP_TITLES.filter(
      title =>
        currentPlayer.unlockedTitles
          .includes(title.id)
    );

  const secret =
    SECRET_TITLES.map(title => ({
      ...title,
      unlocked:
        currentPlayer.unlockedTitles
          .includes(title.id)
    }));

  let html = "";

  for (const title of [
    ...ownedNormal,
    ...ownedShop
  ]) {
    const equipped =
      currentPlayer.title ===
      title.id;

    html += `
      <div class="rpg-card">
        <strong>
          ${escapeHtml(title.name)}
        </strong>

        ${
          equipped
            ? `<button type="button" disabled>装備中</button>`
            : `<button type="button" data-equip-title="${escapeHtml(title.id)}">装備</button>`
        }
      </div>
    `;
  }

  for (const title of secret) {
    if (title.unlocked) {
      const equipped =
        currentPlayer.title ===
        title.id;

      html += `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(title.name)}
          </strong>

          ${
            equipped
              ? `<button type="button" disabled>装備中</button>`
              : `<button type="button" data-equip-title="${escapeHtml(title.id)}">装備</button>`
          }
        </div>
      `;
    } else {
      html += `
        <div class="rpg-card">
          <strong>???</strong>
          <p>秘密の称号</p>
        </div>
      `;
    }
  }

  container.innerHTML =
    html ||
    `<p class="empty-message">所持している称号はありません。</p>`;
}

function renderLockerItems() {
  const container =
    $("locker-item-list");

  if (!container) return;

  const owned =
    SHOP_ITEMS.filter(
      item =>
        safeNumber(
          currentPlayer.inventory?.[item.id]
        ) > 0
    );

  if (!owned.length) {
    container.innerHTML =
      `<p class="empty-message">所持しているアイテムはありません。</p>`;
    return;
  }

  container.innerHTML =
    owned.map(item => {
      const quantity =
        safeNumber(
          currentPlayer.inventory[item.id]
        );

      let action = "";

      if (
        item.type === "xpBoost" ||
        item.type === "bossDown"
      ) {
        action = `
          <button
            type="button"
            data-use-item="${escapeHtml(item.id)}"
          >
            使用
          </button>
        `;
      } else if (
        item.type === "bossDamage"
      ) {
        action = `
          <small>
            次回のボス攻撃で自動使用
          </small>
        `;
      }

      return `
        <div class="rpg-card">
          <strong>
            ${escapeHtml(item.name)}
          </strong>

          <p>
            所持：${quantity}
          </p>

          ${action}
        </div>
      `;
    }).join("");
}



// ============================================================
// EQUIP TITLE
// ============================================================

async function equipTitle(titleId) {
  if (!currentPlayer) return;

  if (
    !currentPlayer.unlockedTitles
      .includes(titleId)
  ) {
    showNotification(
      "その称号はまだ解放されていません。"
    );
    return;
  }

  currentPlayer.title =
    titleId;

  await savePlayer();

  showNotification(
    `「${getTitleName(titleId)}」を装備しました！`
  );

  renderAll();
}


// ============================================================
// EQUIP BACKGROUND
// ============================================================

function applyEquippedBackground() {
  const bg =
    currentPlayer?.background;

  if (!bg) {
    document.body.removeAttribute(
      "data-background"
    );
    return;
  }

  document.body.dataset.background =
    bg;
}



// ============================================================
// PROFILE
// ============================================================

function renderProfile() {
  if (!currentPlayer) return;

  const level =
    calculateLevel(currentPlayer.xp);

  $("profile-display-name").textContent =
    currentPlayer.displayName;

  $("profile-user-id").textContent =
    currentPlayer.userId;

  $("profile-course").textContent =
    currentPlayer.course === "science"
      ? "理系"
      : currentPlayer.course === "humanities"
        ? "文系"
        : "未定";

  $("profile-level").textContent =
    level;

  $("profile-xp").textContent =
    currentPlayer.xp;

  $("profile-coins").textContent =
    currentPlayer.coins;

  $("profile-title").textContent =
    getTitleName(
      currentPlayer.title
    );

  $("profile-total-study-time").textContent =
    `${currentPlayer.totalStudyMinutes}分`;

  $("profile-total-xp").textContent =
    `${currentPlayer.xp} XP`;

  $("profile-total-coins").textContent =
    currentPlayer.totalCoinsEarned;

  $("profile-bosses-defeated").textContent =
    currentPlayer.bossStats.bossesDefeated;

  $("profile-quests-completed").textContent =
    currentPlayer.questsCompleted;

  $("profile-stars")
    ?.closest("p")
    ?.classList.add("hidden");

  const subjectList =
    $("profile-subject-list");

  if (subjectList) {
    subjectList.innerHTML =
      currentPlayer.subjects
        .map(subject => `
          <div class="rpg-card">
            <strong>
              ${escapeHtml(
                SUBJECT_NAMES[subject]
              )}
            </strong>

            <span>
              Lv.${getSubjectLevel(subject)}
            </span>
          </div>
        `)
        .join("");
  }
}


// ============================================================
// ACHIEVEMENT RENDER
// ============================================================

function renderAchievements() {
  if (!currentPlayer) return;

  $("achievement-count").textContent =
    `${currentPlayer.achievements.length} / ${ACHIEVEMENTS.length}`;

  const container =
    $("achievement-list");

  if (!container) return;

  container.innerHTML =
    ACHIEVEMENTS
      .map(item => {
        const unlocked =
          currentPlayer.achievements
            .includes(item.id);

        return `
          <div class="rpg-card">
            <strong>
              ${
                unlocked
                  ? "🏆"
                  : "🔒"
              }
              ${escapeHtml(item.name)}
            </strong>

            <p>
              報酬：🪙 ${item.reward}
            </p>

            <small>
              ${
                unlocked
                  ? "達成済み"
                  : "未達成"
              }
            </small>
          </div>
        `;
      })
      .join("");
}


// ============================================================
// SETTINGS
// ============================================================

function renderSettings() {
  if (!currentPlayer) return;

  $("settings-display-name").value =
    currentPlayer.displayName;

  document
    .querySelectorAll(
      'input[name="settings-subjects"]'
    )
    .forEach(input => {
      input.checked =
        currentPlayer.subjects
          .includes(input.value);
    });
}

async function updateDisplayName(event) {
  event.preventDefault();

  const error =
    $("display-name-error");

  if (error) {
    error.textContent = "";
  }

  const name =
    $("settings-display-name")
      ?.value
      .trim() || "";

  if (
    name.length < 1 ||
    name.length > 30
  ) {
    if (error) {
      error.textContent =
        "表示名は1〜30文字です。";
    }
    return;
  }

  currentPlayer.displayName =
    name;

  try {
    await savePlayer();

    showNotification(
      "表示名を変更しました！"
    );

    renderAll();
  } catch (err) {
    console.error(err);

    if (error) {
      error.textContent =
        "保存に失敗しました。";
    }
  }
}

async function updateSubjects(event) {
  event.preventDefault();

  const error =
    $("settings-subject-error");

  if (error) {
    error.textContent = "";
  }

  const subjects = [
    ...document.querySelectorAll(
      'input[name="settings-subjects"]:checked'
    )
  ].map(input => input.value);

  if (!subjects.length) {
    if (error) {
      error.textContent =
        "最低1教科選択してください。";
    }
    return;
  }

  currentPlayer.subjects =
    uniqueArray(subjects);

  try {
    await savePlayer();

    showNotification(
      "受験教科を更新しました！"
    );

    ensureQuestState();
    renderAll();
  } catch (err) {
    console.error(err);

    if (error) {
      error.textContent =
        "保存に失敗しました。";
    }
  }
}

async function updateUserPassword(event) {
  event.preventDefault();

  const error =
    $("password-error");

  if (error) {
    error.textContent = "";
  }

  const password =
    $("settings-new-password")
      ?.value || "";

  if (password.length < 6) {
    if (error) {
      error.textContent =
        "パスワードは6文字以上です。";
    }
    return;
  }

  try {
    await updatePassword(
      currentUser,
      password
    );

    $("settings-new-password").value =
      "";

    showNotification(
      "パスワードを変更しました！"
    );
  } catch (err) {
    console.error(err);

    if (error) {
      error.textContent =
        firebaseErrorMessage(err);
    }
  }
}


// ============================================================
// DELETE ACCOUNT
// ============================================================

async function handleDeleteAccount() {
  if (!currentUser || !currentPlayer) {
    return;
  }

  const confirmed =
    window.confirm(
      "本当にアカウントを削除しますか？\nこの操作は取り消せません。"
    );

  if (!confirmed) return;

  try {
    await deleteDoc(
      doc(
        db,
        "users",
        currentPlayer.uid
      )
    );

    await deleteUser(
      currentUser
    );

  } catch (error) {
    console.error(error);

    showNotification(
      firebaseErrorMessage(error)
    );
  }
}


// ============================================================
// OTHER
// ============================================================

function renderOtherScreen() {
  if (!currentPlayer) return;

  renderOtherTabs();

  if (activeOtherTab === "achievement") {
    renderAchievements();
  }

  if (activeOtherTab === "shop") {
    renderShop();
  }

  if (activeOtherTab === "locker") {
    renderLocker();
  }

  if (activeOtherTab === "profile") {
    renderProfile();
  }

  if (activeOtherTab === "settings") {
    renderSettings();
  }
}

function renderOtherTabs() {
  const map = {
    menu: "other-menu-tab",
    achievement: "achievement-tab",
    shop: "shop-tab",
    locker: "locker-tab",
    profile: "profile-tab",
    settings: "settings-tab"
  };

  Object.entries(map).forEach(
    ([key, id]) => {
      $(id)?.classList.toggle(
        "hidden",
        activeOtherTab !== key
      );
    }
  );

  document
    .querySelectorAll("[data-other-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.otherTab === activeOtherTab
      );
    });
}


// ============================================================
// RENDER ALL
// ============================================================

function renderAll() {
  if (!currentPlayer) return;

  try {
    renderCommon();
  } catch (error) {
    console.error(
      "renderCommon error:",
      error
    );
  }

  try {
    renderHome();
  } catch (error) {
    console.error(
      "renderHome error:",
      error
    );
  }

  try {
    renderStudy();
  } catch (error) {
    console.error(
      "renderStudy error:",
      error
    );
  }

  try {
    renderQuestScreen();
  } catch (error) {
    console.error(
      "renderQuest error:",
      error
    );
  }

  try {
    renderPartyScreen();
  } catch (error) {
    console.error(
      "renderParty error:",
      error
    );
  }

  try {
    renderRankScreen();
  } catch (error) {
    console.error(
      "renderRank error:",
      error
    );
  }

  try {
    renderOtherScreen();
  } catch (error) {
    console.error(
      "renderOther error:",
      error
    );
  }

  try {
    applyEquippedBackground();
  } catch (error) {
    console.error(
      "background error:",
      error
    );
  }
}


// ============================================================
// LOAD PLAYER
// ============================================================

async function loadPlayer(firebaseUser) {
  const ref =
    doc(
      db,
      "users",
      firebaseUser.uid
    );

  const snapshot =
    await getDoc(ref);

  if (!snapshot.exists()) {
    currentPlayer =
      createDefaultPlayer(
        firebaseUser
      );

    await setDoc(
      ref,
      currentPlayer
    );
  } else {
    currentPlayer =
      createDefaultPlayer(
        firebaseUser,
        snapshot.data()
      );
  }

  resetTodayIfNeeded();

  processSeasonRollover();

  ensureQuestState();

  updateSubjectLevelData();

  checkAndUnlockTitles();

  await checkAchievements();

  await processLoginReward();

  await savePlayer();

  currentParty =
    currentPlayer.partyId
      ? await getPartyDoc()
      : null;
}


// ============================================================
// APP VISIBILITY
// ============================================================

function showApp() {
  $("auth-screen")?.classList.add("hidden");
  $("main-app")?.classList.remove("hidden");

  showAppScreen("home-screen");
}

function showAuth() {
  $("auth-screen")?.classList.remove("hidden");
  $("main-app")?.classList.add("hidden");

  showLoginScreen();
}


// ============================================================
// EVENT DELEGATION
// ============================================================

document.addEventListener(
  "click",
  async event => {

    // ------------------------------------------
    // MAIN NAV
    // ------------------------------------------

    const nav =
      event.target.closest(
        "[data-screen]"
      );

    if (nav) {
      const screen =
        nav.dataset.screen;

      if (APP_SCREEN_IDS.includes(screen)) {
        showAppScreen(screen);
      }

      return;
    }


    // ------------------------------------------
    // QUEST TAB
    // ------------------------------------------

    const questTab =
      event.target.closest(
        "[data-quest-tab]"
      );

    if (questTab) {
      activeQuestTab =
        questTab.dataset.questTab;

      renderQuestScreen();

      return;
    }


    // ------------------------------------------
    // PARTY TAB
    // ------------------------------------------

    const partyTab =
      event.target.closest(
        "[data-party-tab]"
      );

    if (partyTab) {
      activePartyTab =
        partyTab.dataset.partyTab;

      await renderPartyScreen();

      return;
    }


    // ------------------------------------------
    // RANK TAB
    // ------------------------------------------

    const rankTab =
      event.target.closest(
        "[data-rank-tab]"
      );

    if (rankTab) {
      activeRankTab =
        rankTab.dataset.rankTab;

      await renderRankScreen();

      return;
    }


    // ------------------------------------------
    // RANKING TYPE
    // ------------------------------------------

    const rankingType =
      event.target.closest(
        "[data-ranking-type]"
      );

    if (rankingType) {
      selectedRankingType =
        rankingType.dataset.rankingType;

      await renderRanking();

      return;
    }


    // ------------------------------------------
    // OTHER TAB
    // ------------------------------------------

    const otherTab =
      event.target.closest(
        "[data-other-tab]"
      );

    if (otherTab) {
      activeOtherTab =
        otherTab.dataset.otherTab;

      renderOtherScreen();

      return;
    }


    // ------------------------------------------
    // OTHER MENU
    // ------------------------------------------

    const menuButton =
      event.target.closest(
        "[data-open-other-tab]"
      );

    if (menuButton) {
      activeOtherTab =
        menuButton.dataset.openOtherTab;

      renderOtherScreen();

      return;
    }


    // ------------------------------------------
    // QUEST CLAIM
    // ★ 今回修正ポイント
    // ------------------------------------------

    const claimButton =
      event.target.closest(
        "[data-claim-quest]"
      );

    if (claimButton) {
      const questId =
        claimButton.dataset.claimQuest;

      if (!questId) return;

      claimButton.disabled = true;

      try {
        await claimQuest(
          questId
        );
      } catch (error) {
        console.error(
          "Quest claim error:",
          error
        );

        claimButton.disabled = false;

        showNotification(
          error.message ||
          "報酬の受け取りに失敗しました。"
        );
      }

      return;
    }


    // ------------------------------------------
    // SHOP ITEM
    // ★ 今回修正ポイント
    // ------------------------------------------

    const buyItemButton =
      event.target.closest(
        "[data-buy-item]"
      );

    if (buyItemButton) {
      const itemId =
        buyItemButton.dataset.buyItem;

      if (!itemId) return;

      buyItemButton.disabled = true;

      try {
        await buyShopItem(
          itemId
        );
      } catch (error) {
        console.error(
          "Buy item error:",
          error
        );

        buyItemButton.disabled = false;

        showNotification(
          error.message ||
          "購入に失敗しました。"
        );
      }

      return;
    }


    // ------------------------------------------
    // SHOP TITLE
    // ★ 今回修正ポイント
    // ------------------------------------------

    const buyTitleButton =
      event.target.closest(
        "[data-buy-title]"
      );

    if (buyTitleButton) {
      const titleId =
        buyTitleButton.dataset.buyTitle;

      if (!titleId) return;

      buyTitleButton.disabled = true;

      try {
        await buyShopTitle(
          titleId
        );
      } catch (error) {
        console.error(
          "Buy title error:",
          error
        );

        buyTitleButton.disabled = false;

        showNotification(
          error.message ||
          "タイトルの購入に失敗しました。"
        );
      }

      return;
    }


    // ------------------------------------------
    // EQUIP TITLE
    // ★ 今回修正ポイント
    // ------------------------------------------

    const equipTitleButton =
      event.target.closest(
        "[data-equip-title]"
      );

    if (equipTitleButton) {
      const titleId =
        equipTitleButton.dataset.equipTitle;

      if (!titleId) return;

      equipTitleButton.disabled = true;

      try {
        await equipTitle(
          titleId
        );
      } catch (error) {
        console.error(
          "Equip title error:",
          error
        );

        equipTitleButton.disabled = false;

        showNotification(
          error.message ||
          "タイトルの装備に失敗しました。"
        );
      }

      return;
    }


    // ------------------------------------------
    // USE ITEM
    // ------------------------------------------

    const useItemButton =
      event.target.closest(
        "[data-use-item]"
      );

    if (useItemButton) {
      const itemId =
        useItemButton.dataset.useItem;

      if (!itemId) return;

      useItemButton.disabled = true;

      try {
        await useItem(itemId);
      } catch (error) {
        console.error(
          "Use item error:",
          error
        );

        useItemButton.disabled = false;

        showNotification(
          error.message ||
          "アイテム使用に失敗しました。"
        );
      }

      return;
    }


    // ------------------------------------------
    // FRIEND ACTION
    // ------------------------------------------

    const friendActionButton = event.target.closest("[data-friend-action]");

    if (friendActionButton) {
      const action = friendActionButton.dataset.friendAction;
      const requestId = friendActionButton.dataset.requestId;
      if (!requestId) return;

      friendActionButton.disabled = true;
      try {
        if (action === "accept") {
          await acceptFriendRequest(requestId);
        } else if (action === "decline") {
          await declineFriendRequest(requestId);
        }
      } catch (error) {
        console.error("Friend action error:", error);
        friendActionButton.disabled = false;
        showNotification(error.message || "フレンド申請の処理に失敗しました。");
      }
      return;
    }

    // ------------------------------------------
    // PARTY ACTION
    // ------------------------------------------

    const partyAction =
      event.target.closest(
        "[data-party-action]"
      );

    if (partyAction) {
      const action =
        partyAction.dataset.partyAction;

      partyAction.disabled = true;

      try {
        if (action === "accept") {
          await acceptPartyRequest(
            partyAction.dataset.requestId
          );
        }

        if (action === "decline") {
          await declinePartyRequest(
            partyAction.dataset.requestId
          );
        }

        if (action === "leave") {
          await leaveParty();
        }
      } catch (error) {
        console.error(
          "Party action error:",
          error
        );

        partyAction.disabled = false;

        showNotification(
          error.message ||
          "処理に失敗しました。"
        );
      }

      return;
    }
  }
);


// ============================================================
// DYNAMIC FORM EVENTS
// ============================================================

document.addEventListener("submit", async event => {
  if (event.target?.id === "friend-request-form-runtime") {
    await sendFriendRequest(event);
  }
});


// ============================================================
// FORM EVENTS
// ============================================================

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
      try {
        await signOut(auth);
      } catch (error) {
        console.error(error);
      }
    }
  );

$("study-record-form")
  ?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const errorEl =
        $("study-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const subject =
        $("study-subject")?.value;

      const minutes =
        Number(
          $("study-minutes")?.value
        );

      const note =
        $("study-note")?.value || "";

      try {
        await recordStudy(
          minutes,
          subject,
          note,
          "manual"
        );

        $("study-minutes").value =
          "";

        $("study-note").value =
          "";

      } catch (error) {
        console.error(error);

        if (errorEl) {
          errorEl.textContent =
            error.message ||
            "勉強記録に失敗しました。";
        }
      }
    }
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
    saveTimerStudy
  );

$("party-invite-form")
  ?.addEventListener(
    "submit",
    inviteToParty
  );

$("display-name-form")
  ?.addEventListener(
    "submit",
    updateDisplayName
  );

$("subject-settings-form")
  ?.addEventListener(
    "submit",
    updateSubjects
  );

$("password-form")
  ?.addEventListener(
    "submit",
    updateUserPassword
  );

$("delete-account-button")
  ?.addEventListener(
    "click",
    handleDeleteAccount
  );

$("level-up-close-button")
  ?.addEventListener(
    "click",
    closeLevelUp
  );

$("reward-close-button")
  ?.addEventListener(
    "click",
    closeRewardModal
  );

$("boss-refresh-button")
  ?.addEventListener(
    "click",
    async () => {
      try {
        if (currentPlayer?.partyId) {
          currentParty =
            await getPartyDoc();
        }

        await renderBoss();
      } catch (error) {
        console.error(error);

        showNotification(
          "ボス情報を更新できませんでした。"
        );
      }
    }
  );


// ============================================================
// FIREBASE AUTH STATE
// ============================================================

onAuthStateChanged(
  auth,
  async firebaseUser => {

    if (!firebaseUser) {
      currentUser = null;
      currentPlayer = null;
      currentParty = null;

      showAuth();

      return;
    }

    try {
      currentUser =
        firebaseUser;

      await loadPlayer(
        firebaseUser
      );

      showApp();

      renderAll();

    } catch (error) {
      console.error(
        "Auth state load error:",
        error
      );

      showNotification(
        "プレイヤーデータの読み込みに失敗しました。"
      );

      // データ取得に失敗しても画面全体を真っ白にしない
      $("auth-screen")
        ?.classList.add("hidden");

      $("main-app")
        ?.classList.remove("hidden");

      showAppScreen(
        "home-screen"
      );
    }
  }
);


// ============================================================
// RUNTIME CSS
// ============================================================

const runtimeStyle = document.createElement("style");

runtimeStyle.textContent = `
  /* ========================================================
     受験RPG UI ENHANCEMENT
     ======================================================== */

  #main-app {
    min-height: 100vh;
  }

  #main-app > * {
    transition: opacity .2s ease;
  }

  /* ページ間移動 */
  .rpg-screen-active {
    position: relative;
    z-index: 1;
  }

  .rpg-screen-enter {
    animation: rpgPageEnter .42s cubic-bezier(.22,.8,.25,1) both;
    will-change: opacity, transform, filter;
  }

  .rpg-screen-leaving {
    animation: rpgPageLeave .18s ease both;
  }

  @keyframes rpgPageEnter {
    0% { opacity: 0; transform: translateY(14px) scale(.992); filter: blur(2px); }
    55% { opacity: 1; }
    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }

  @keyframes rpgPageLeave {
    from { opacity: 1; }
    to { opacity: .82; }
  }

  @media (prefers-reduced-motion: reduce) {
    .rpg-screen-enter, .rpg-screen-leaving { animation: none !important; }
    *, *::before, *::after { scroll-behavior: auto !important; }
  }

  /* カード */
  .rpg-card {
    margin: 10px 0;
    padding: 16px;
    border: 1px solid rgba(255,255,255,.09);
    border-radius: 16px;
    background: rgba(255,255,255,.035);
    box-shadow: 0 8px 24px rgba(0,0,0,.12);
    overflow: hidden;
    transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
  }

  .rpg-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255,255,255,.16);
    background: rgba(255,255,255,.05);
    box-shadow: 0 12px 30px rgba(0,0,0,.18);
  }

  .rpg-card > strong, .rpg-card > span { display: block; }

  /* ボタン */
  #main-app button {
    min-height: 40px;
    padding: 9px 14px;
    border-radius: 11px;
    border: 1px solid rgba(255,255,255,.11);
    transition: transform .15s ease, filter .15s ease, background .15s ease, border-color .15s ease;
  }

  #main-app button:not(:disabled):hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }

  #main-app button:not(:disabled):active {
    transform: translateY(0) scale(.98);
  }

  #main-app button:focus-visible,
  #main-app input:focus-visible,
  #main-app select:focus-visible,
  #main-app textarea:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  /* 入力欄 */
  #main-app input, #main-app select, #main-app textarea {
    border-radius: 11px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(0,0,0,.18);
    color: inherit;
    transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
  }

  #main-app input:focus, #main-app select:focus, #main-app textarea:focus {
    border-color: rgba(255,255,255,.28);
    background: rgba(0,0,0,.24);
    box-shadow: 0 0 0 3px rgba(255,255,255,.045);
  }

  /* タブ */
  [data-quest-tab], [data-party-tab], [data-rank-tab], [data-other-tab], [data-ranking-type] {
    transition: transform .16s ease, background .16s ease, border-color .16s ease, opacity .16s ease;
  }

  [data-quest-tab].active, [data-party-tab].active, [data-rank-tab].active, [data-other-tab].active, [data-ranking-type].active {
    border-color: rgba(255,255,255,.2);
    box-shadow: 0 5px 18px rgba(0,0,0,.12);
  }

  /* プログレス */
  .rpg-progress {
    width: 100%;
    height: 9px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(255,255,255,.08);
    margin: 9px 0;
  }

  .rpg-progress > div {
    height: 100%;
    border-radius: inherit;
    background: currentColor;
    transition: width .45s cubic-bezier(.22,.8,.25,1);
  }

  /* セクション */
  .rpg-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 18px 0 12px;
  }

  .rpg-section-heading strong { display: block; font-size: 1.02rem; }

  /* 通知 */
  #notification {
    position: fixed;
    left: 50%;
    bottom: 90px;
    z-index: 9999;
    transform: translateX(-50%);
    width: max-content;
    max-width: min(90vw, 520px);
    padding: 12px 18px;
    border-radius: 13px;
    box-shadow: 0 14px 35px rgba(0,0,0,.25);
    animation: rpgToastIn .25s ease both;
  }

  @keyframes rpgToastIn {
    from { opacity: 0; transform: translate(-50%, 8px) scale(.97); }
    to { opacity: 1; transform: translate(-50%, 0) scale(1); }
  }

  /* フレンド */
  .rpg-friend-request-panel, .rpg-friend-sent, .rpg-friend-section, .rpg-request-empty {
    margin: 14px 0; padding: 16px; border: 1px solid rgba(255,255,255,.10);
    border-radius: 16px; background: rgba(255,255,255,.035);
  }

  .rpg-section-heading small, .rpg-friend-main small, .rpg-request-main small, .rpg-friend-empty small, .rpg-request-empty small {
    display: block; margin-top: 4px; opacity: .68; line-height: 1.45;
  }

  .rpg-friend-request-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; }
  .rpg-friend-request-row input { width: 100%; min-height: 46px; padding: 0 14px; }
  .rpg-inline-error { min-height: 18px; margin: 8px 0 0; font-size: .86rem; }
  .rpg-friend-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 10px; }

  .rpg-friend-card, .rpg-friend-mini-card, .rpg-request-card {
    display: flex; align-items: center; gap: 12px; padding: 13px;
    border: 1px solid rgba(255,255,255,.09); border-radius: 14px; background: rgba(0,0,0,.13);
  }

  .rpg-friend-avatar, .rpg-request-icon, .rpg-empty-icon { flex: 0 0 auto; display: grid; place-items: center; }
  .rpg-friend-avatar { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,.09); font-weight: 700; font-size: 1.05rem; }
  .rpg-request-icon { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,.07); font-size: 1.2rem; }
  .rpg-friend-main, .rpg-request-main { min-width: 0; flex: 1; }
  .rpg-friend-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .rpg-friend-meta span, .rpg-status-pill { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 999px; background: rgba(255,255,255,.07); font-size: .76rem; }
  .rpg-friend-sent-list { display: grid; gap: 8px; }
  .rpg-request-empty, .rpg-friend-empty { text-align: center; padding: 28px 16px; }
  .rpg-empty-icon { font-size: 2rem; margin-bottom: 8px; }
  .rpg-request-card { align-items: flex-start; margin-bottom: 10px; }
  .rpg-request-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .rpg-request-actions button, .rpg-friend-request-row button { min-height: 42px; padding: 9px 15px; border-radius: 10px; }

  @media (max-width: 700px) {
    .rpg-friend-request-row { grid-template-columns: 1fr; }
    .rpg-friend-request-row button { width: 100%; }
    .rpg-friend-grid { grid-template-columns: 1fr; }
    .rpg-request-actions button { flex: 1 1 120px; }
    .rpg-card { padding: 14px; border-radius: 14px; }
  }
`;


document.head.appendChild(
  runtimeStyle
);


// ============================================================
// INITIAL UI
// ============================================================

// 背景ショップ／旧背景ロッカーUIは今回の仕様から削除
$("shop-background-list")?.closest("section, .shop-section, .rpg-card")?.classList.add("hidden");
$("locker-outfit-list")?.closest("section, .locker-section, .rpg-card")?.classList.add("hidden");


// 星機能の旧UIを非表示
$("star-status")
  ?.classList.add("hidden");

$("profile-stars")
  ?.closest("p")
  ?.classList.add("hidden");

// 認証画面を初期状態にする
$("main-app")
  ?.classList.add("hidden");

$("auth-screen")
  ?.classList.remove("hidden");

showLoginScreen();


// ============================================================
// DEBUG API
// ============================================================

window.JukenRPG = {
  getPlayer: () => currentPlayer,
  getParty: () => currentParty,
  calculateLevel,
  calculateRank,
  recordStudy,
  renderAll,
  renderBoss,
  claimQuest,
  buyShopItem,
  buyShopTitle,
  equipTitle,
  useItem
};
