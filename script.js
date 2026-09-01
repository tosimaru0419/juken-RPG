/* =========================================================
   受験RPG
   script.js
   Firebase Authentication + Firestore
========================================================= */

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
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  increment
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   FIREBASE
========================================================= */

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


/* =========================================================
   CONSTANTS
========================================================= */

const JAPAN_TZ = "Asia/Tokyo";

const SUBJECTS = {
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

const COURSES = {
  science: "理系",
  humanities: "文系",
  undecided: "未定"
};


/* =========================================================
   RANK SYSTEM
   1 SEASON = 1 MONTH
========================================================= */

const RANKS = [
  {
    name: "Bronze",
    min: 0,
    color: "#cd7f32",
    bg: "linear-gradient(135deg,#21150d,#432817)",
    rewardCoins: 100,
    rewardXP: 50
  },
  {
    name: "Silver",
    min: 10,
    color: "#d7dce5",
    bg: "linear-gradient(135deg,#161a22,#353d4d)",
    rewardCoins: 250,
    rewardXP: 100
  },
  {
    name: "Gold",
    min: 25,
    color: "#ffd84d",
    bg: "linear-gradient(135deg,#281e06,#5c470c)",
    rewardCoins: 500,
    rewardXP: 200
  },
  {
    name: "Platinum",
    min: 45,
    color: "#7ce7ff",
    bg: "linear-gradient(135deg,#071e25,#0d4855)",
    rewardCoins: 800,
    rewardXP: 300
  },
  {
    name: "Diamond",
    min: 70,
    color: "#69aaff",
    bg: "linear-gradient(135deg,#08142e,#173d78)",
    rewardCoins: 1200,
    rewardXP: 500
  },
  {
    name: "Master",
    min: 100,
    color: "#c084ff",
    bg: "linear-gradient(135deg,#1a0b2d,#4a1874)",
    rewardCoins: 1800,
    rewardXP: 750
  },
  {
    name: "Grandmaster",
    min: 135,
    color: "#ff78d2",
    bg: "linear-gradient(135deg,#2d0822,#711654)",
    rewardCoins: 2500,
    rewardXP: 1000
  },
  {
    name: "Legend",
    min: 170,
    color: "#fff2a1",
    bg: "linear-gradient(135deg,#302000,#8a6400)",
    rewardCoins: 4000,
    rewardXP: 1500
  }
];


/* =========================================================
   RANK TITLES
========================================================= */

const RANK_TITLES = {
  Bronze: "駆け出しの冒険者",
  Silver: "研鑽する者",
  Gold: "黄金の求道者",
  Platinum: "知識の騎士",
  Diamond: "蒼天の賢者",
  Master: "極限の探究者",
  Grandmaster: "超越者",
  Legend: "合格の覇者"
};


/* =========================================================
   SHOP TITLES
========================================================= */

const SHOP_TITLES = [
  ["title_void", "虚無を統べし者", 5000],
  ["title_dark", "漆黒の受験鬼", 6000],
  ["title_fate", "運命を喰らう者", 7000],
  ["title_abyss", "深淵より来たりし者", 8000],
  ["title_soul", "魂を燃やす亡者", 9000],
  ["title_doom", "終焉を告げる者", 10000],
  ["title_crown", "万象の王", 12000],
  ["title_god", "知識神", 14000],
  ["title_reaper", "参考書の死神", 16000],
  ["title_overlord", "受験界の覇王", 18000],
  ["title_absolute", "絶対合格領域", 22000],
  ["title_beyond", "合格の向こう側", 30000]
];


/* =========================================================
   HIDDEN TITLES
========================================================= */

const HIDDEN_TITLES = [
  ["hidden_first", "始まりの一歩"],
  ["hidden_midnight", "深夜の探究者"],
  ["hidden_1000", "千時間への挑戦者"],
  ["hidden_early", "黎明を制する者"],
  ["hidden_streak", "途切れぬ意志"],
  ["hidden_boss", "魔王殺し"],
  ["hidden_all_subject", "全知への道"],
  ["hidden_legend", "伝説を超えし者"],
  ["hidden_perfect", "完全なる受験者"],
  ["hidden_iq", "アリ得ない知能"]
];


/* =========================================================
   SHOP ITEMS
========================================================= */

const SHOP_ITEMS = [

  /* XP BOOST */

  {
    id: "xp_boost_1",
    category: "xp",
    name: "集中の秘薬",
    description: "30分間、獲得XP 1.25倍",
    price: 800,
    multiplier: 1.25,
    duration: 30
  },

  {
    id: "xp_boost_2",
    category: "xp",
    name: "賢者の秘薬",
    description: "60分間、獲得XP 1.35倍",
    price: 1600,
    multiplier: 1.35,
    duration: 60
  },

  {
    id: "xp_boost_3",
    category: "xp",
    name: "覚醒の秘薬",
    description: "90分間、獲得XP 1.5倍",
    price: 2800,
    multiplier: 1.5,
    duration: 90
  },

  {
    id: "xp_boost_4",
    category: "xp",
    name: "神域の秘薬",
    description: "120分間、獲得XP 2倍",
    price: 5000,
    multiplier: 2,
    duration: 120
  },


  /* PERSONAL BOSS ATTACK */

  {
    id: "attack_1",
    category: "attack",
    name: "戦士の咆哮",
    description: "この戦闘中、自分の与ダメージ1.1倍",
    price: 1200,
    multiplier: 1.1
  },

  {
    id: "attack_2",
    category: "attack",
    name: "破壊の祝福",
    description: "この戦闘中、自分の与ダメージ1.25倍",
    price: 2500,
    multiplier: 1.25
  },

  {
    id: "attack_3",
    category: "attack",
    name: "魔王殺しの刃",
    description: "この戦闘中、自分の与ダメージ1.5倍",
    price: 5000,
    multiplier: 1.5
  },

  {
    id: "attack_4",
    category: "attack",
    name: "終焉の一撃",
    description: "この戦闘中、自分の与ダメージ2倍",
    price: 10000,
    multiplier: 2
  },


  /* BOSS LEVEL DOWN */

  {
    id: "defense_1",
    category: "defense",
    name: "弱体の呪符",
    description: "ボスレベルを1下げる",
    price: 1500,
    levelDown: 1
  },

  {
    id: "defense_2",
    category: "defense",
    name: "破魔の呪符",
    description: "ボスレベルを2下げる",
    price: 3000,
    levelDown: 2
  },

  {
    id: "defense_3",
    category: "defense",
    name: "崩壊の呪符",
    description: "ボスレベルを3下げる",
    price: 6000,
    levelDown: 3
  },

  {
    id: "defense_4",
    category: "defense",
    name: "神殺しの呪符",
    description: "ボスレベルを5下げる",
    price: 12000,
    levelDown: 5
  },


  /* PARTY BUFF */

  {
    id: "party_attack_1",
    category: "party",
    name: "戦陣の号令",
    description: "パーティー全員の与ダメージ1.1倍",
    price: 4000,
    multiplier: 1.1
  },

  {
    id: "party_attack_2",
    category: "party",
    name: "勇者の軍旗",
    description: "パーティー全員の与ダメージ1.2倍",
    price: 8000,
    multiplier: 1.2
  },

  {
    id: "party_attack_3",
    category: "party",
    name: "英雄の鼓舞",
    description: "パーティー全員の与ダメージ1.35倍",
    price: 15000,
    multiplier: 1.35
  }
];


/* =========================================================
   BOSSES
========================================================= */

const BOSSES = [
  {
    id: "japanese_1",
    name: "国語の迷宮王",
    subject: "japanese",
    description: "言葉の迷宮を支配する魔王。"
  },

  {
    id: "japanese_2",
    name: "文脈喰らい",
    subject: "japanese",
    description: "文章の意味を喰らう異形。"
  },

  {
    id: "math_1",
    name: "数式の魔神",
    subject: "math",
    description: "無限の数式を操る魔神。"
  },

  {
    id: "math_2",
    name: "微積の破壊者",
    subject: "math",
    description: "微分と積分を支配する破壊者。"
  },

  {
    id: "english_1",
    name: "Grammar Reaper",
    subject: "english",
    description: "文法を刈り取る英語の死神。"
  },

  {
    id: "english_2",
    name: "The Vocabulary Lord",
    subject: "english",
    description: "無数の単語を従える言語の王。"
  }
];


/* =========================================================
   ACHIEVEMENTS
========================================================= */

const ACHIEVEMENTS = [

  ["first_study", "最初の一歩", "初めて勉強を記録する"],
  ["study_10m", "10分の旅", "累計10分勉強する"],
  ["study_60m", "一時間突破", "累計60分勉強する"],
  ["study_100m", "百分の壁", "累計100分勉強する"],
  ["study_5h", "5時間の旅", "累計5時間勉強する"],
  ["study_10h", "10時間の旅", "累計10時間勉強する"],
  ["study_25h", "25時間の旅", "累計25時間勉強する"],
  ["study_50h", "50時間の旅", "累計50時間勉強する"],
  ["study_100h", "百時間の勇者", "累計100時間勉強する"],
  ["study_200h", "二百時間の猛者", "累計200時間勉強する"],
  ["study_500h", "五百時間の鬼", "累計500時間勉強する"],
  ["study_1000h", "千時間の伝説", "累計1000時間勉強する"],

  ["level_5", "成長の兆し", "Lv.5になる"],
  ["level_10", "冒険者", "Lv.10になる"],
  ["level_25", "熟練者", "Lv.25になる"],
  ["level_50", "達人", "Lv.50になる"],
  ["level_75", "超越者", "Lv.75になる"],
  ["level_100", "限界突破", "Lv.100になる"],

  ["rank_silver", "銀の証", "Silverに到達する"],
  ["rank_gold", "黄金の証", "Goldに到達する"],
  ["rank_platinum", "白金の証", "Platinumに到達する"],
  ["rank_diamond", "蒼玉の証", "Diamondに到達する"],
  ["rank_master", "極み", "Masterに到達する"],
  ["rank_grandmaster", "大賢者", "Grandmasterに到達する"],
  ["rank_legend", "伝説", "Legendに到達する"],

  ["boss_first", "初陣", "ボスに初めて攻撃する"],
  ["boss_defeat", "魔王殺し", "ボスを撃破する"],
  ["boss_5", "魔王狩り", "ボスを5体撃破する"],
  ["boss_10", "魔王の天敵", "ボスを10体撃破する"],
  ["boss_25", "破壊神", "ボスを25体撃破する"],

  ["quest_first", "クエスト開始", "クエストを初めて達成する"],
  ["quest_10", "クエストランナー", "10個達成する"],
  ["quest_50", "クエストマスター", "50個達成する"],
  ["quest_100", "クエスト中毒", "100個達成する"],

  ["rare_quest", "選ばれし者", "レアクエストを達成する"],

  ["all_subjects", "全科目制覇", "登録科目をすべて1回以上勉強する"],

  ["friend_first", "最初の仲間", "初めてフレンドを作る"],
  ["party_first", "パーティー結成", "初めてパーティーを作る"],

  ["coins_1000", "小金持ち", "累計1000コイン獲得"],
  ["coins_10000", "富豪", "累計10000コイン獲得"],
  ["coins_100000", "大富豪", "累計100000コイン獲得"],

  ["title_buy", "収集開始", "ショップで称号を購入する"],
  ["item_buy", "商人との出会い", "ショップでアイテムを購入する"],

  ["timer_first", "時間との戦い", "タイマーを初めて使用する"],

  ["daily_complete", "日課", "デイリークエストを3個すべて達成する"],
  ["weekly_complete", "週間制覇", "ウィークリークエストを達成する"],

  ["night_study", "夜を越えて", "日付をまたいで勉強する"],
  ["three_hours", "三時間の覚醒", "1日に3時間以上勉強する"],

  ["legend_xp", "伝説の加速", "Legend到達後にXPを獲得する"]
];


/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let player = null;

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let timerStartedAt = null;
let lastTimerSaveSeconds = 0;

let currentScreen = "home-screen";
let currentOtherTab = "menu";
let currentQuestTab = "daily";
let currentPartyTab = "party";
let currentRankTab = "rank";

let currentBoss = null;
let currentBossBattle = null;

let xpBoost = null;

let notificationTimeout = null;


/* =========================================================
   HELPERS
========================================================= */

function $(id) {
  return document.getElementById(id);
}

function show(el) {
  if (el) el.classList.remove("hidden");
}

function hide(el) {
  if (el) el.classList.add("hidden");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nowJapan() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: JAPAN_TZ
    })
  );
}

function japanDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: JAPAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(date)
    .replaceAll("/", "-");
}

function japanMonthKey(date = new Date()) {
  return japanDateKey(date).slice(0, 7);
}

function getWeekKey(date = new Date()) {
  const d = nowJapanFrom(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowJapanFrom(date) {
  return new Date(
    new Date(date).toLocaleString("en-US", {
      timeZone: JAPAN_TZ
    })
  );
}

function formatMinutes(minutes) {
  minutes = Math.max(0, Math.floor(minutes));

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0) return `${h}時間 ${m}分`;
  return `${m}分`;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0")
  ].join(":");
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}


/* =========================================================
   FIREBASE USER ID
========================================================= */

function normalizeUserId(id) {
  return id.trim().toLowerCase();
}

function userIdToEmail(id) {
  return `${normalizeUserId(id)}@juken-rpg.local`;
}


/* =========================================================
   DEFAULT PLAYER
========================================================= */

function createDefaultPlayer(userId, displayName, course, subjects) {
  const now = new Date();

  const subjectLevels = {};

  subjects.forEach(subject => {
    subjectLevels[subject] = {
      level: 1,
      minutes: 0
    };
  });

  return {
    userId,
    displayName,
    course,
    subjects,

    level: 1,
    xp: 0,

    stars: 0,
    coins: 0,

    totalStudyMinutes: 0,
    totalXP: 0,
    totalCoins: 0,

    bossesDefeated: 0,
    questsCompleted: 0,

    todayStudyMinutes: 0,
    todayXP: 0,
    todayCoins: 0,
    todayQuests: 0,
    lastStudyDate: japanDateKey(now),

    seasonStudyMinutes: 0,
    seasonKey: japanMonthKey(now),

    subjectLevels,

    ownedTitles: ["default_title"],
    equippedTitle: "default_title",

    ownedItems: {},

    ownedThemes: ["default_theme"],
    equippedTheme: "default_theme",

    achievements: [],

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}


/* =========================================================
   LEVEL SYSTEM
========================================================= */

/*
   総合レベル:
   Lv1 → Lv2 = 100XP
   以降、10レベルごとに必要XP +50
*/

function xpRequiredForNextLevel(level) {
  if (level >= 100) return Infinity;

  const block = Math.floor((level - 1) / 10);

  return 100 + block * 50;
}

function getLevelFromXP(xp) {
  let level = 1;
  let remaining = Math.max(0, xp);

  while (level < 100) {
    const required = xpRequiredForNextLevel(level);

    if (remaining < required) break;

    remaining -= required;
    level++;
  }

  return level;
}

function getXPProgress(playerData) {
  let xp = playerData.xp;
  let level = 1;

  while (level < playerData.level) {
    xp -= xpRequiredForNextLevel(level);
    level++;
  }

  return {
    current: Math.max(0, xp),
    required: xpRequiredForNextLevel(playerData.level)
  };
}


/* =========================================================
   RANK
========================================================= */

function getRankByMinutes(minutes) {
  const hours = minutes / 60;

  let result = RANKS[0];

  for (const rank of RANKS) {
    if (hours >= rank.min) {
      result = rank;
    }
  }

  return result;
}

function applyRankStyle(rankName) {
  const rank = RANKS.find(r => r.name === rankName) || RANKS[0];

  document.documentElement.style.setProperty(
    "--rank-color",
    rank.color
  );

  document.documentElement.style.setProperty(
    "--rank-bg",
    rank.bg
  );

  $("current-rank-name").style.color = rank.color;
  $("current-rank-name").style.background = rank.bg;
  $("current-rank-name").style.padding = "10px 16px";
  $("current-rank-name").style.borderRadius = "12px";

  $("home-rank").style.color = rank.color;
  $("header-rank").style.color = rank.color;
}


/* =========================================================
   DAILY RESET
========================================================= */

async function handleDateReset() {
  if (!player) return;

  const today = japanDateKey();

  if (player.lastStudyDate !== today) {
    player.todayStudyMinutes = 0;
    player.todayXP = 0;
    player.todayCoins = 0;
    player.todayQuests = 0;
    player.lastStudyDate = today;

    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        todayStudyMinutes: 0,
        todayXP: 0,
        todayCoins: 0,
        todayQuests: 0,
        lastStudyDate: today,
        updatedAt: serverTimestamp()
      }
    );
  }
}


/* =========================================================
   SEASON RESET
========================================================= */

async function handleSeasonReset() {
  if (!player) return;

  const currentSeason = japanMonthKey();

  if (player.seasonKey !== currentSeason) {

    const previousRank =
      getRankByMinutes(player.seasonStudyMinutes);

    /*
      シーズン終了報酬
    */

    const rewardXP = previousRank.rewardXP;
    const rewardCoins = previousRank.rewardCoins;

    await addSeasonHistory(
      previousRank,
      player.seasonStudyMinutes
    );

    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        seasonStudyMinutes: 0,
        seasonKey: currentSeason,
        coins: increment(rewardCoins),
        xp: increment(rewardXP),
        totalXP: increment(rewardXP),
        totalCoins: increment(rewardCoins),
        updatedAt: serverTimestamp()
      }
    );

    player.seasonStudyMinutes = 0;
    player.seasonKey = currentSeason;
    player.coins += rewardCoins;
    player.xp += rewardXP;
    player.totalXP += rewardXP;
    player.totalCoins += rewardCoins;

    showNotification(
      `${previousRank.name} シーズン報酬！ +${rewardXP}XP / +${rewardCoins}コイン`
    );

    showRewardModal(
      `${previousRank.name} シーズン終了報酬`,
      `${rewardXP} XP<br>🪙 ${rewardCoins} コイン`
    );
  }
}


/* =========================================================
   SEASON HISTORY
========================================================= */

async function addSeasonHistory(rank, minutes) {
  await addDoc(
    collection(db, "users", currentUser.uid, "seasonHistory"),
    {
      season: player?.seasonKey || japanMonthKey(),
      rank: rank.name,
      studyMinutes: minutes,
      createdAt: serverTimestamp()
    }
  );
}


/* =========================================================
   STUDY XP
========================================================= */

function getCurrentXPBoostMultiplier() {
  let multiplier = 1;

  /*
    Legend到達後の恒久1.5倍
  */

  const rank = getRankByMinutes(player.seasonStudyMinutes);

  if (rank.name === "Legend") {
    multiplier *= 1.5;
  }

  /*
    アイテムXPブースト
  */

  if (xpBoost) {
    if (Date.now() < xpBoost.expiresAt) {
      multiplier *= xpBoost.multiplier;
    } else {
      xpBoost = null;
    }
  }

  return multiplier;
}


/* =========================================================
   ADD STUDY
========================================================= */

async function addStudy(minutes, subject, note = "", source = "manual") {
  if (!player || !currentUser) return;

  minutes = Math.floor(Number(minutes));

  if (!Number.isFinite(minutes) || minutes < 1) {
    throw new Error("勉強時間は1分以上で入力してください。");
  }

  if (!SUBJECTS[subject]) {
    throw new Error("教科を選択してください。");
  }

  await handleDateReset();

  await handleSeasonReset();

  const multiplier = getCurrentXPBoostMultiplier();

  const gainedXP = Math.floor(minutes * multiplier);
  const gainedCoins = minutes;

  const today = japanDateKey();
  const month = japanMonthKey();

  /*
    総合XP
  */

  const oldLevel = player.level;

  const newXP = player.xp + gainedXP;
  const newLevel = getLevelFromXP(newXP);

  /*
    教科レベル
    30分 = +1
    最大Lv100
  */

  if (!player.subjectLevels[subject]) {
    player.subjectLevels[subject] = {
      level: 1,
      minutes: 0
    };
  }

  const oldSubjectLevel =
    player.subjectLevels[subject].level;

  const oldSubjectMinutes =
    player.subjectLevels[subject].minutes;

  const newSubjectMinutes =
    oldSubjectMinutes + minutes;

  const newSubjectLevel =
    clamp(
      1 + Math.floor(newSubjectMinutes / 30),
      1,
      100
    );

  player.subjectLevels[subject].minutes =
    newSubjectMinutes;

  player.subjectLevels[subject].level =
    newSubjectLevel;

  /*
    player memory
  */

  player.xp = newXP;
  player.level = newLevel;

  player.totalXP += gainedXP;
  player.totalStudyMinutes += minutes;
  player.totalCoins += gainedCoins;

  player.coins += gainedCoins;

  player.todayStudyMinutes += minutes;
  player.todayXP += gainedXP;
  player.todayCoins += gainedCoins;

  player.seasonStudyMinutes += minutes;

  /*
    Firestore
  */

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      xp: player.xp,
      level: player.level,

      totalXP: increment(gainedXP),
      totalStudyMinutes: increment(minutes),
      totalCoins: increment(gainedCoins),

      coins: increment(gainedCoins),

      todayStudyMinutes: increment(minutes),
      todayXP: increment(gainedXP),
      todayCoins: increment(gainedCoins),

      seasonStudyMinutes:
        increment(minutes),

      [`subjectLevels.${subject}.level`]:
        newSubjectLevel,

      [`subjectLevels.${subject}.minutes`]:
        newSubjectMinutes,

      lastStudyDate: today,
      seasonKey: month,

      updatedAt: serverTimestamp()
    }
  );

  /*
    study history
  */

  await addDoc(
    collection(
      db,
      "users",
      currentUser.uid,
      "studyHistory"
    ),
    {
      minutes,
      subject,
      note,
      source,
      xp: gainedXP,
      coins: gainedCoins,
      date: today,
      createdAt: serverTimestamp()
    }
  );

  /*
    Quest progress
  */

  await processQuestStudy(minutes, subject);

  /*
    achievements
  */

  await checkAchievements();

  /*
    level up
  */

  if (newLevel > oldLevel) {
    showLevelUpModal(oldLevel, newLevel);
  }

  /*
    subject level up
  */

  if (newSubjectLevel > oldSubjectLevel) {
    showNotification(
      `${SUBJECTS[subject]} Lv.${newSubjectLevel}！`
    );
  }

  /*
    3時間レアクエスト
  */

  if (player.todayStudyMinutes >= 180) {
    await checkRareQuest();
  }

  await refreshAll();

  showNotification(
    `📚 ${minutes}分記録！ +${gainedXP}XP / +${gainedCoins}コイン`
  );
}


/* =========================================================
   TIMER
========================================================= */

function updateTimerDisplay() {
  $("study-timer-display").textContent =
    formatTime(timerSeconds);
}

function startTimer() {
  if (timerRunning) return;

  timerRunning = true;
  timerStartedAt = Date.now() - timerSeconds * 1000;

  timerInterval = setInterval(
    handleTimerTick,
    1000
  );

  checkAchievementFlag("timer_first");

  showNotification("タイマー開始！");
}

function handleTimerTick() {
  if (!timerRunning) return;

  const elapsed =
    Math.floor(
      (Date.now() - timerStartedAt) / 1000
    );

  timerSeconds = elapsed;

  /*
    日付を超えたら日本時間00:00直前で一旦保存
  */

  const currentDate = japanDateKey();

  if (!window.__timerDate) {
    window.__timerDate = currentDate;
  }

  if (
    window.__timerDate !== currentDate
  ) {
    forceSaveTimerForDateBoundary();
    window.__timerDate = currentDate;
  }

  updateTimerDisplay();
}

async function forceSaveTimerForDateBoundary() {
  if (!timerRunning) return;

  const totalMinutes =
    Math.floor(timerSeconds / 60);

  const unsaved =
    totalMinutes -
    Math.floor(lastTimerSaveSeconds / 60);

  if (unsaved >= 1) {
    try {
      const subject = $("study-subject").value;

      if (subject) {
        await addStudy(
          unsaved,
          subject,
          "日付変更による自動記録",
          "timer"
        );

        lastTimerSaveSeconds =
          Math.floor(timerSeconds / 60) * 60;
      }
    } catch (error) {
      console.error(error);
    }
  }
}

function pauseTimer() {
  if (!timerRunning) return;

  timerRunning = false;

  clearInterval(timerInterval);
  timerInterval = null;

  showNotification("タイマー一時停止");
}

function resetTimer() {
  timerRunning = false;

  clearInterval(timerInterval);
  timerInterval = null;

  timerSeconds = 0;
  lastTimerSaveSeconds = 0;
  timerStartedAt = null;

  updateTimerDisplay();
}

async function saveTimer() {
  if (timerRunning) {
    pauseTimer();
  }

  const subject = $("study-subject").value;

  if (!subject) {
    showNotification("先に教科を選択してください。");
    return;
  }

  const totalMinutes =
    Math.floor(timerSeconds / 60);

  const unsavedMinutes =
    totalMinutes -
    Math.floor(lastTimerSaveSeconds / 60);

  if (unsavedMinutes < 1) {
    showNotification("記録できる時間がありません。");
    return;
  }

  try {
    await addStudy(
      unsavedMinutes,
      subject,
      "タイマー記録",
      "timer"
    );

    lastTimerSaveSeconds =
      totalMinutes * 60;

    /*
      記録後もタイマー自体は残す
      → リセットするまで累積可能
    */

  } catch (error) {
    console.error(error);
    showNotification(error.message);
  }
}


/* =========================================================
   QUEST SYSTEM
========================================================= */

const QUEST_TYPES = [
  {
    id: "study_total",
    name: "冒険者の鍛錬",
    description: "合計{target}分勉強する",
    target: 30
  },

  {
    id: "study_subject",
    name: "{subject}の修練",
    description: "{subject}を{target}分勉強する",
    target: 10,
    subjectSpecific: true
  },

  {
    id: "study_subject_2",
    name: "{subject}の集中訓練",
    description: "{subject}を{target}分勉強する",
    target: 20,
    subjectSpecific: true
  },

  {
    id: "two_subjects",
    name: "二刀流",
    description: "2教科以上勉強する",
    target: 2
  }
];

function questCollection(type) {
  return collection(
    db,
    "users",
    currentUser.uid,
    "quests"
  );
}

async function getCurrentQuests() {
  const snapshot =
    await getDocs(
      query(
        questCollection(),
        orderBy("createdAt", "desc")
      )
    );

  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

async function ensureQuests() {
  if (!currentUser || !player) return;

  const today = japanDateKey();
  const week = getWeekKey();

  const quests =
    await getCurrentQuests();

  const daily = quests.filter(
    q =>
      q.type === "daily" &&
      q.periodKey === today
  );

  const weekly = quests.filter(
    q =>
      q.type === "weekly" &&
      q.periodKey === week
  );

  /*
    古いクエストは自動消滅
  */

  for (const quest of quests) {
    if (
      quest.periodKey !== today &&
      quest.type === "daily"
    ) {
      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "quests",
          quest.id
        )
      );
    }

    if (
      quest.periodKey !== week &&
      quest.type === "weekly"
    ) {
      await deleteDoc(
        doc(
          db,
          "users",
          currentUser.uid,
          "quests",
          quest.id
        )
      );
    }
  }

  /*
    Daily 3
  */

  if (daily.length < 3) {
    for (
      let i = daily.length;
      i < 3;
      i++
    ) {
      await createQuest(
        "daily",
        today
      );
    }
  }

  /*
    Weekly 1
  */

  if (weekly.length < 1) {
    await createQuest(
      "weekly",
      week
    );
  }
}

async function createQuest(type, periodKey) {
  const registered =
    player.subjects || [];

  if (!registered.length) return;

  const lowSubject =
    getLeastStudiedSubject();

  let template;

  /*
    学習時間の少ない教科を優先
  */

  if (
    Math.random() < 0.65 &&
    lowSubject
  ) {
    template =
      randomItem(
        QUEST_TYPES.filter(
          q => q.subjectSpecific
        )
      );
  } else {
    template =
      randomItem(
        QUEST_TYPES.filter(
          q => !q.subjectSpecific
        )
      );
  }

  let subject =
    template.subjectSpecific
      ? lowSubject
      : null;

  let target =
    template.target;

  /*
    教科指定は最大20分
  */

  target =
    Math.min(target, 20);

  const name =
    template.name
      .replace(
        "{subject}",
        subject
          ? SUBJECTS[subject]
          : ""
      );

  const description =
    template.description
      .replace(
        "{subject}",
        subject
          ? SUBJECTS[subject]
          : ""
      )
      .replace(
        "{target}",
        target
      );

  await addDoc(
    questCollection(),
    {
      type,
      periodKey,

      questType: template.id,

      name,
      description,

      subject,
      target,

      progress: 0,
      completed: false,

      rewardXP:
        type === "weekly" ? 100 : 50,

      rewardCoins:
        type === "weekly" ? 70 : 30,

      createdAt: serverTimestamp()
    }
  );
}

function getLeastStudiedSubject() {
  if (!player?.subjects?.length) return null;

  let lowest = player.subjects[0];

  for (const subject of player.subjects) {
    const a =
      player.subjectLevels?.[subject]?.minutes || 0;

    const b =
      player.subjectLevels?.[lowest]?.minutes || 0;

    if (a < b) {
      lowest = subject;
    }
  }

  return lowest;
}

async function processQuestStudy(minutes, subject) {
  const quests =
    await getCurrentQuests();

  for (const quest of quests) {
    if (quest.completed) continue;

    if (
      quest.type === "daily" &&
      quest.periodKey !== japanDateKey()
    ) continue;

    if (
      quest.type === "weekly" &&
      quest.periodKey !== getWeekKey()
    ) continue;

    let progress = quest.progress || 0;

    if (
      quest.questType === "study_subject" ||
      quest.questType === "study_subject_2"
    ) {
      if (quest.subject === subject) {
        progress += minutes;
      }
    }

    else if (
      quest.questType === "study_total"
    ) {
      progress += minutes;
    }

    else if (
      quest.questType === "two_subjects"
    ) {
      const history =
        await getRecentStudySubjects();

      if (history.size >= 2) {
        progress = 2;
      }
    }

    if (
      progress >= quest.target
    ) {
      progress = quest.target;

      await completeQuest(quest);
    }

    await updateDoc(
      doc(
        db,
        "users",
        currentUser.uid,
        "quests",
        quest.id
      ),
      {
        progress
      }
    );
  }
}

async function getRecentStudySubjects() {
  const today =
    japanDateKey();

  const snap =
    await getDocs(
      query(
        collection(
          db,
          "users",
          currentUser.uid,
          "studyHistory"
        ),
        where("date", "==", today)
      )
    );

  return new Set(
    snap.docs.map(
      d => d.data().subject
    )
  );
}

async function completeQuest(quest) {
  if (quest.completed) return;

  await updateDoc(
    doc(
      db,
      "users",
      currentUser.uid,
      "quests",
      quest.id
    ),
    {
      completed: true,
      completedAt: serverTimestamp()
    }
  );

  const rewardXP =
    quest.rewardXP || 0;

  const rewardCoins =
    quest.rewardCoins || 0;

  player.xp += rewardXP;
  player.coins += rewardCoins;

  player.totalXP += rewardXP;
  player.totalCoins += rewardCoins;

  player.todayXP += rewardXP;
  player.todayCoins += rewardCoins;

  player.questsCompleted++;
  player.todayQuests++;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      xp: player.xp,
      coins: increment(rewardCoins),

      totalXP: increment(rewardXP),
      totalCoins: increment(rewardCoins),

      todayXP: increment(rewardXP),
      todayCoins: increment(rewardCoins),

      questsCompleted:
        increment(1),

      todayQuests:
        increment(1),

      updatedAt: serverTimestamp()
    }
  );

  showRewardModal(
    "QUEST COMPLETE!",
    `${escapeHTML(quest.name)}<br><br>+${rewardXP} XP<br>🪙 +${rewardCoins}`
  );

  await checkAchievements();
}

async function checkRareQuest() {
  const today =
    japanDateKey();

  const ref =
    doc(
      db,
      "users",
      currentUser.uid,
      "special",
      "rareQuest"
    );

  const snap =
    await getDoc(ref);

  if (
    snap.exists() &&
    snap.data().date === today
  ) {
    return;
  }

  if (
    player.todayStudyMinutes >= 180
  ) {
    await setDoc(
      ref,
      {
        date: today,
        completed: true
      }
    );

    const rewardXP = 100;
    const rewardCoins = 500;

    player.xp += rewardXP;
    player.coins += rewardCoins;

    player.totalXP += rewardXP;
    player.totalCoins += rewardCoins;

    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        xp: increment(rewardXP),
        coins: increment(rewardCoins),

        totalXP: increment(rewardXP),
        totalCoins: increment(rewardCoins),

        updatedAt: serverTimestamp()
      }
    );

    showRewardModal(
      "🌟 RARE QUEST COMPLETE!",
      "3時間の修練を達成！<br><br>+100 XP<br>🪙 +500"
    );

    await checkAchievementFlag(
      "rare_quest"
    );
  }
}


/* =========================================================
   QUEST RENDER
========================================================= */

async function renderQuests() {
  if (!player) return;

  await ensureQuests();

  const quests =
    await getCurrentQuests();

  const today =
    japanDateKey();

  const week =
    getWeekKey();

  const daily =
    quests.filter(
      q =>
        q.type === "daily" &&
        q.periodKey === today
    );

  const weekly =
    quests.filter(
      q =>
        q.type === "weekly" &&
        q.periodKey === week
    );

  renderQuestList(
    $("daily-quest-list"),
    daily
  );

  renderQuestList(
    $("weekly-quest-list"),
    weekly
  );

  renderQuestHistory();
}

function renderQuestList(container, quests) {
  if (!container) return;

  if (!quests.length) {
    container.innerHTML =
      `<p class="empty-message">クエストがありません。</p>`;
    return;
  }

  container.innerHTML =
    quests.map(q => {

      const percent =
        q.target > 0
          ? Math.min(
              100,
              Math.round(
                q.progress / q.target * 100
              )
            )
          : 100;

      return `
        <div class="quest-card ${q.completed ? "completed" : ""}">
          <div>
            <h4>${escapeHTML(q.name)}</h4>
            <p>${escapeHTML(q.description)}</p>
          </div>

          <div class="quest-progress">
            <div class="quest-progress-bar">
              <div style="width:${percent}%"></div>
            </div>

            <span>
              ${q.progress || 0} / ${q.target}
            </span>
          </div>

          <div class="quest-reward">
            🎁 +${q.rewardXP} XP
            &nbsp;
            🪙 +${q.rewardCoins}
          </div>

          ${
            q.completed
              ? `<strong>✅ COMPLETE</strong>`
              : ""
          }
        </div>
      `;
    }).join("");
}

async function renderQuestHistory() {
  const container =
    $("quest-history-list");

  if (!container) return;

  const snap =
    await getDocs(
      query(
        collection(
          db,
          "users",
          currentUser.uid,
          "quests"
        ),
        where("completed", "==", true),
        limit(30)
      )
    );

  if (snap.empty) {
    container.innerHTML =
      `<p class="empty-message">履歴がありません。</p>`;
    return;
  }

  container.innerHTML =
    snap.docs.map(d => {
      const q = d.data();

      return `
        <div class="history-card">
          <strong>${escapeHTML(q.name)}</strong>
          <span>+${q.rewardXP} XP / 🪙 ${q.rewardCoins}</span>
        </div>
      `;
    }).join("");
}


/* =========================================================
   BOSS SYSTEM
========================================================= */

function generateBoss() {
  const boss =
    randomItem(BOSSES);

  const level =
    Math.floor(
      Math.random() * 10
    ) + 1;

  const maxHP =
    1000 +
    (level - 1) * 100;

  return {
    ...boss,
    level,
    maxHP,
    currentHP: maxHP,
    createdAt: new Date().toISOString()
  };
}

function getBossWeekKey() {
  return getWeekKey();
}

async function ensureBoss() {
  const ref =
    doc(
      db,
      "global",
      "boss"
    );

  const snap =
    await getDoc(ref);

  const week =
    getBossWeekKey();

  if (
    !snap.exists() ||
    snap.data().weekKey !== week
  ) {

    const boss =
      generateBoss();

    /*
      弱点はパーティー構成からランダム
      実際の表示時に再抽選
    */

    await setDoc(
      ref,
      {
        ...boss,
        weekKey: week,
        updatedAt: serverTimestamp()
      }
    );

    return boss;
  }

  return {
    id: snap.id,
    ...snap.data()
  };
}

async function renderBoss() {
  const boss =
    await ensureBoss();

  currentBoss = boss;

  $("boss-name").textContent =
    boss.name;

  $("boss-level").textContent =
    `Lv.${boss.level}`;

  $("boss-current-hp").textContent =
    Math.max(0, Math.floor(boss.currentHP));

  $("boss-max-hp").textContent =
    boss.maxHP;

  const percentage =
    clamp(
      boss.currentHP /
        boss.maxHP *
        100,
      0,
      100
    );

  $("boss-hp-progress").style.width =
    `${percentage}%`;

  /*
    弱点
  */

  const partyMembers =
    await getPartyMembers();

  const possibleSubjects =
    new Set();

  partyMembers.forEach(member => {
    (member.subjects || []).forEach(
      subject =>
        possibleSubjects.add(subject)
    );
  });

  let weakness =
    [...possibleSubjects]
      .filter(
        s =>
          !["japanese", "math", "english"]
            .includes(s)
      );

  /*
    選択科目がない場合は登録科目から
  */

  if (!weakness.length) {
    weakness =
      [...possibleSubjects];
  }

  const weaknessSubject =
    weakness.length
      ? randomItem(weakness)
      : null;

  $("boss-weakness-subject").textContent =
    weaknessSubject
      ? SUBJECTS[weaknessSubject]
      : "-";

  $("boss-weakness-multiplier").textContent =
    "×1.5";

  /*
    reset
  */

  const nextReset =
    getNextMonday();

  $("boss-reset-date").textContent =
    nextReset;
}

function getNextMonday() {
  const d = nowJapan();

  const day =
    d.getDay();

  const days =
    day === 0
      ? 1
      : 8 - day;

  d.setDate(
    d.getDate() + days
  );

  d.setHours(0, 0, 0, 0);

  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

async function attackBoss(minutes, subject) {
  if (!currentUser || !player) return;

  if (!currentBoss) {
    await renderBoss();
  }

  const party =
    await getPartyMembers();

  /*
    現在のボス状態を再取得
  */

  currentBoss =
    await ensureBoss();

  /*
    1分 = 1 damage
    弱点 = 1.5
  */

  let damage = minutes;

  const weaknessText =
    $("boss-weakness-subject")?.textContent;

  const weaknessSubject =
    Object.keys(SUBJECTS).find(
      key =>
        SUBJECTS[key] === weaknessText
    );

  if (
    weaknessSubject === subject
  ) {
    damage *= 1.5;
  }

  /*
    自分用攻撃バフ
  */

  if (
    currentBossBattle?.personalMultiplier
  ) {
    damage *=
      currentBossBattle.personalMultiplier;
  }

  /*
    パーティー全体バフ
  */

  if (
    currentBossBattle?.partyMultiplier
  ) {
    damage *=
      currentBossBattle.partyMultiplier;
  }

  damage =
    Math.floor(damage);

  if (damage < 1) damage = 1;

  const oldHP =
    currentBoss.currentHP;

  const newHP =
    Math.max(
      0,
      oldHP - damage
    );

  const actualDamage =
    oldHP - newHP;

  /*
    ボス更新
  */

  await updateDoc(
    doc(db, "global", "boss"),
    {
      currentHP: newHP,
      updatedAt: serverTimestamp()
    }
  );

  currentBoss.currentHP =
    newHP;

  /*
    Battle log
  */

  await addDoc(
    collection(
      db,
      "global",
      "boss",
      "battleLog"
    ),
    {
      uid: currentUser.uid,
      displayName: player.displayName,
      subject,
      minutes,
      damage: actualDamage,
      createdAt: serverTimestamp(),
      weekKey: getBossWeekKey()
    }
  );

  await checkAchievementFlag(
    "boss_first"
  );

  showBossAttackEffect(
    actualDamage
  );

  /*
    撃破
  */

  if (newHP <= 0) {
    await defeatBoss();
  }

  await renderBoss();
}

async function defeatBoss() {
  const boss =
    currentBoss;

  const rewardCoins =
    1000 +
    boss.level * 500;

  const rewardXP =
    200 +
    boss.level * 100;

  player.coins += rewardCoins;
  player.xp += rewardXP;

  player.totalCoins += rewardCoins;
  player.totalXP += rewardXP;

  player.bossesDefeated++;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      coins: increment(rewardCoins),
      xp: increment(rewardXP),

      totalCoins:
        increment(rewardCoins),

      totalXP:
        increment(rewardXP),

      bossesDefeated:
        increment(1),

      updatedAt: serverTimestamp()
    }
  );

  await checkAchievementFlag(
    "boss_defeat"
  );

  await checkAchievements();

  showBossDefeatEffect();

  showRewardModal(
    "👹 BOSS DEFEATED!",
    `${escapeHTML(boss.name)} Lv.${boss.level}<br><br>+${rewardXP} XP<br>🪙 +${rewardCoins}`
  );

  /*
    即時に次のボスへ
    実際には次週まで固定なので
    同じボスを再生成しない。
    撃破済み状態として維持。
  */
}


/* =========================================================
   BOSS CONTRIBUTION REWARDS
========================================================= */

async function calculateBossContributionReward() {
  const week =
    getBossWeekKey();

  const snap =
    await getDocs(
      query(
        collection(
          db,
          "global",
          "boss",
          "battleLog"
        ),
        where(
          "weekKey",
          "==",
          week
        )
      )
    );

  let damage = 0;

  snap.docs.forEach(d => {
    const data = d.data();

    if (
      data.uid === currentUser.uid
    ) {
      damage +=
        Number(data.damage || 0);
    }
  });

  /*
    未撃破でも削った量に応じて報酬
  */

  const reward =
    Math.floor(
      damage * 0.5
    );

  if (reward > 0) {
    player.coins += reward;
    player.totalCoins += reward;

    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        coins: increment(reward),
        totalCoins: increment(reward)
      }
    );
  }

  return {
    damage,
    reward
  };
}


/* =========================================================
   PARTY
========================================================= */

async function getCurrentParty() {
  const q =
    query(
      collection(
        db,
        "parties"
      ),
      where(
        "members",
        "array-contains",
        currentUser.uid
      ),
      limit(1)
    );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    return null;
  }

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data()
  };
}

async function getPartyMembers() {
  const party =
    await getCurrentParty();

  if (!party) return [];

  const result = [];

  for (const uid of party.members) {
    const snap =
      await getDoc(
        doc(db, "users", uid)
      );

    if (snap.exists()) {
      result.push({
        uid,
        ...snap.data()
      });
    }
  }

  return result;
}

async function createParty() {
  const existing =
    await getCurrentParty();

  if (existing) {
    showNotification(
      "すでにパーティーに所属しています。"
    );
    return;
  }

  await addDoc(
    collection(db, "parties"),
    {
      leaderId: currentUser.uid,
      members: [currentUser.uid],
      weekKey: getWeekKey(),
      createdAt: serverTimestamp()
    }
  );

  await checkAchievementFlag(
    "party_first"
  );

  showNotification(
    "👥 パーティーを結成しました！"
  );

  await renderParty();
}

async function inviteToParty(userId) {
  const party =
    await getCurrentParty();

  if (!party) {
    showNotification(
      "先にパーティーを作成してください。"
    );
    return;
  }

  if (
    party.leaderId !== currentUser.uid
  ) {
    showNotification(
      "招待できるのはリーダーです。"
    );
    return;
  }

  if (
    party.members.length >= 4
  ) {
    showNotification(
      "パーティーは最大4人です。"
    );
    return;
  }

  const targetQuery =
    query(
      collection(db, "users"),
      where(
        "userId",
        "==",
        normalizeUserId(userId)
      ),
      limit(1)
    );

  const targetSnap =
    await getDocs(targetQuery);

  if (targetSnap.empty) {
    showNotification(
      "そのユーザーIDは存在しません。"
    );
    return;
  }

  const target =
    targetSnap.docs[0];

  if (
    party.members.includes(
      target.id
    )
  ) {
    showNotification(
      "すでにメンバーです。"
    );
    return;
  }

  await addDoc(
    collection(
      db,
      "partyRequests"
    ),
    {
      fromUid: currentUser.uid,
      toUid: target.id,
      partyId: party.id,
      type: "party",
      status: "pending",
      createdAt: serverTimestamp()
    }
  );

  showNotification(
    "パーティー招待を送信しました。"
  );
}

async function leaveParty() {
  const party =
    await getCurrentParty();

  if (!party) return;

  if (
    party.leaderId === currentUser.uid
  ) {
    showNotification(
      "リーダーは脱退できません。解散してください。"
    );
    return;
  }

  const members =
    party.members.filter(
      uid =>
        uid !== currentUser.uid
    );

  await updateDoc(
    doc(db, "parties", party.id),
    {
      members
    }
  );

  await renderParty();
}

async function disbandParty() {
  const party =
    await getCurrentParty();

  if (!party) return;

  if (
    party.leaderId !== currentUser.uid
  ) {
    showNotification(
      "リーダーのみ解散できます。"
    );
    return;
  }

  await deleteDoc(
    doc(db, "parties", party.id)
  );

  showNotification(
    "パーティーを解散しました。"
  );

  await renderParty();
}

async function cleanupWeeklyParties() {
  const week =
    getWeekKey();

  const snap =
    await getDocs(
      collection(
        db,
        "parties"
      )
    );

  for (const party of snap.docs) {
    const data = party.data();

    if (
      data.weekKey !== week
    ) {
      await deleteDoc(party.ref);
    }
  }
}

async function renderParty() {
  const members =
    await getPartyMembers();

  const list =
    $("party-member-list");

  const bossList =
    $("boss-party-member-list");

  if (!members.length) {
    list.innerHTML =
      `<p class="empty-message">パーティーに所属していません。</p>`;

    bossList.innerHTML =
      `<p class="empty-message">パーティー未加入</p>`;

    $("party-member-count").textContent =
      "0 / 4人";

    $("boss-party-count").textContent =
      "0 / 4人";

    return;
  }

  const html =
    members.map(member => `
      <div class="party-member-card">
        <strong>
          ${escapeHTML(member.displayName)}
        </strong>

        <span>
          Lv.${member.level}
        </span>

        <span>
          ${escapeHTML(
            RANK_TITLES[
              getRankByMinutes(
                member.seasonStudyMinutes || 0
              ).name
            ] || "冒険者"
          )}
        </span>

        <span>
          今日：
          ${formatMinutes(
            member.todayStudyMinutes || 0
          )}
        </span>
      </div>
    `).join("");

  list.innerHTML = html;
  bossList.innerHTML = html;

  $("party-member-count").textContent =
    `${members.length} / 4人`;

  $("boss-party-count").textContent =
    `${members.length} / 4人`;

  $("party-week-range").textContent =
    `今週 ${getWeekKey()}`;
}


/* =========================================================
   FRIENDS
========================================================= */

async function sendFriendRequest(userId) {
  const normalized =
    normalizeUserId(userId);

  if (
    normalized ===
    normalizeUserId(player.userId)
  ) {
    showNotification(
      "自分自身には申請できません。"
    );
    return;
  }

  const targetQuery =
    query(
      collection(db, "users"),
      where(
        "userId",
        "==",
        normalized
      ),
      limit(1)
    );

  const targetSnap =
    await getDocs(targetQuery);

  if (targetSnap.empty) {
    showNotification(
      "ユーザーが見つかりません。"
    );
    return;
  }

  const target =
    targetSnap.docs[0];

  const existing =
    query(
      collection(db, "friendRequests"),
      where("fromUid", "==", currentUser.uid),
      where("toUid", "==", target.id)
    );

  const existingSnap =
    await getDocs(existing);

  if (!existingSnap.empty) {
    showNotification(
      "すでに申請済みです。"
    );
    return;
  }

  await addDoc(
    collection(db, "friendRequests"),
    {
      fromUid: currentUser.uid,
      toUid: target.id,
      status: "pending",
      createdAt: serverTimestamp()
    }
  );

  showNotification(
    "🤝 フレンド申請を送りました！"
  );
}

async function getFriendUIDs() {
  const snap =
    await getDocs(
      collection(
        db,
        "users",
        currentUser.uid,
        "friends"
      )
    );

  return snap.docs.map(
    d => d.id
  );
}

async function acceptFriendRequest(requestId, fromUid) {
  const batch =
    writeBatch(db);

  batch.set(
    doc(
      db,
      "users",
      currentUser.uid,
      "friends",
      fromUid
    ),
    {
      createdAt: serverTimestamp()
    }
  );

  batch.set(
    doc(
      db,
      "users",
      fromUid,
      "friends",
      currentUser.uid
    ),
    {
      createdAt: serverTimestamp()
    }
  );

  batch.update(
    doc(
      db,
      "friendRequests",
      requestId
    ),
    {
      status: "accepted"
    }
  );

  await batch.commit();

  await checkAchievementFlag(
    "friend_first"
  );

  showNotification(
    "🤝 フレンドになりました！"
  );

  await renderFriends();
  await renderFriendRequests();
}

async function rejectFriendRequest(requestId) {
  await updateDoc(
    doc(
      db,
      "friendRequests",
      requestId
    ),
    {
      status: "rejected"
    }
  );

  await renderFriendRequests();
}

async function renderFriends() {
  const container =
    $("friend-list");

  const friendUIDs =
    await getFriendUIDs();

  if (!friendUIDs.length) {
    container.innerHTML =
      `<p class="empty-message">フレンドがいません。</p>`;
    return;
  }

  const friends = [];

  for (const uid of friendUIDs) {
    const snap =
      await getDoc(
        doc(db, "users", uid)
      );

    if (snap.exists()) {
      friends.push({
        uid,
        ...snap.data()
      });
    }
  }

  container.innerHTML =
    friends.map(friend => {

      const rank =
        getRankByMinutes(
          friend.seasonStudyMinutes || 0
        );

      return `
        <div class="friend-card">
          <strong>
            ${escapeHTML(friend.displayName)}
          </strong>

          <span>
            Lv.${friend.level}
          </span>

          <span style="color:${rank.color}">
            ${rank.name}
          </span>

          <span>
            ⭐ ${friend.stars || 0}
          </span>

          <button
            type="button"
            class="friend-party-invite"
            data-user-id="${escapeHTML(friend.userId)}"
          >
            パーティー招待
          </button>
        </div>
      `;
    }).join("");

  document
    .querySelectorAll(
      ".friend-party-invite"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          inviteToParty(
            button.dataset.userId
          )
      );
    });
}

async function renderFriendRequests() {
  const container =
    $("friend-request-list");

  const received =
    query(
      collection(
        db,
        "friendRequests"
      ),
      where(
        "toUid",
        "==",
        currentUser.uid
      ),
      where(
        "status",
        "==",
        "pending"
      )
    );

  const friendRequests =
    await getDocs(received);

  const partyRequests =
    await getDocs(
      query(
        collection(
          db,
          "partyRequests"
        ),
        where(
          "toUid",
          "==",
          currentUser.uid
        ),
        where(
          "status",
          "==",
          "pending"
        )
      )
    );

  if (
    friendRequests.empty &&
    partyRequests.empty
  ) {
    container.innerHTML =
      `<p class="empty-message">申請はありません。</p>`;
    return;
  }

  let html = "";

  for (
    const request of friendRequests.docs
  ) {
    const data =
      request.data();

    const sender =
      await getDoc(
        doc(
          db,
          "users",
          data.fromUid
        )
      );

    const name =
      sender.exists()
        ? sender.data().displayName
        : "冒険者";

    html += `
      <div class="request-card">
        <strong>
          ${escapeHTML(name)}
        </strong>

        <span>
          フレンド申請
        </span>

        <button
          type="button"
          data-request-id="${request.id}"
          data-from-uid="${data.fromUid}"
          class="accept-friend"
        >
          承認
        </button>

        <button
          type="button"
          data-request-id="${request.id}"
          class="reject-friend"
        >
          拒否
        </button>
      </div>
    `;
  }

  for (
    const request of partyRequests.docs
  ) {
    const data =
      request.data();

    const sender =
      await getDoc(
        doc(
          db,
          "users",
          data.fromUid
        )
      );

    const name =
      sender.exists()
        ? sender.data().displayName
        : "冒険者";

    html += `
      <div class="request-card">
        <strong>
          ${escapeHTML(name)}
        </strong>

        <span>
          パーティー招待
        </span>

        <button
          type="button"
          class="accept-party"
          data-request-id="${request.id}"
          data-party-id="${data.partyId}"
        >
          加入
        </button>
      </div>
    `;
  }

  container.innerHTML = html;

  document
    .querySelectorAll(".accept-friend")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          acceptFriendRequest(
            button.dataset.requestId,
            button.dataset.fromUid
          )
      );
    });

  document
    .querySelectorAll(".reject-friend")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          rejectFriendRequest(
            button.dataset.requestId
          )
      );
    });

  document
    .querySelectorAll(".accept-party")
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          acceptPartyRequest(
            button.dataset.requestId,
            button.dataset.partyId
          )
      );
    });
}

async function acceptPartyRequest(
  requestId,
  partyId
) {
  const partyRef =
    doc(db, "parties", partyId);

  const snap =
    await getDoc(partyRef);

  if (!snap.exists()) {
    showNotification(
      "パーティーが存在しません。"
    );
    return;
  }

  const party =
    snap.data();

  if (
    party.members.length >= 4
  ) {
    showNotification(
      "パーティーが満員です。"
    );
    return;
  }

  const existing =
    await getCurrentParty();

  if (existing) {
    showNotification(
      "すでにパーティーに所属しています。"
    );
    return;
  }

  await updateDoc(
    partyRef,
    {
      members: [
        ...party.members,
        currentUser.uid
      ]
    }
  );

  await updateDoc(
    doc(
      db,
      "partyRequests",
      requestId
    ),
    {
      status: "accepted"
    }
  );

  showNotification(
    "👥 パーティーに加入しました！"
  );

  await renderParty();
  await renderFriendRequests();
}


/* =========================================================
   SHOP
========================================================= */

function getThemeList() {
  return [
    {
      id: "default_theme",
      name: "Default",
      price: 0,
      background: "#080a10",
      ui: "#121520"
    },
    {
      id: "red_theme",
      name: "Crimson",
      price: 3000,
      background: "#16070b",
      ui: "#3b1018"
    },
    {
      id: "blue_theme",
      name: "Azure",
      price: 3000,
      background: "#07101c",
      ui: "#102b4d"
    },
    {
      id: "purple_theme",
      name: "Arcane",
      price: 4000,
      background: "#100817",
      ui: "#2c1447"
    },
    {
      id: "green_theme",
      name: "Forest",
      price: 4000,
      background: "#07150e",
      ui: "#123622"
    },
    {
      id: "gold_theme",
      name: "Royal",
      price: 7000,
      background: "#171004",
      ui: "#49360a"
    }
  ];
}

async function buyTitle(titleId) {
  const title =
    SHOP_TITLES.find(
      t => t[0] === titleId
    );

  if (!title) return;

  const [id, name, price] =
    title;

  if (
    player.ownedTitles.includes(id)
  ) {
    showNotification(
      "すでに所持しています。"
    );
    return;
  }

  if (player.coins < price) {
    showNotification(
      "コインが足りません。"
    );
    return;
  }

  player.coins -= price;
  player.ownedTitles.push(id);

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      coins: increment(-price),
      ownedTitles: player.ownedTitles
    }
  );

  await checkAchievementFlag(
    "title_buy"
  );

  showNotification(
    `🏷️ ${name}を購入しました！`
  );

  await renderShop();
  await renderLocker();
}

async function buyItem(itemId) {
  const item =
    SHOP_ITEMS.find(
      i => i.id === itemId
    );

  if (!item) return;

  if (
    (player.ownedItems[itemId] || 0) >= 999
  ) {
    showNotification(
      "これ以上所持できません。"
    );
    return;
  }

  if (player.coins < item.price) {
    showNotification(
      "コインが足りません。"
    );
    return;
  }

  player.coins -= item.price;

  player.ownedItems[itemId] =
    (player.ownedItems[itemId] || 0) + 1;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      coins: increment(-item.price),
      [`ownedItems.${itemId}`]:
        increment(1)
    }
  );

  await checkAchievementFlag(
    "item_buy"
  );

  showNotification(
    `🛒 ${item.name}を購入しました！`
  );

  await renderShop();
  await renderLocker();
}

async function buyTheme(themeId) {
  const theme =
    getThemeList().find(
      t => t.id === themeId
    );

  if (!theme) return;

  if (
    player.ownedThemes.includes(
      themeId
    )
  ) {
    showNotification(
      "すでに所持しています。"
    );
    return;
  }

  if (
    player.coins < theme.price
  ) {
    showNotification(
      "コインが足りません。"
    );
    return;
  }

  player.coins -= theme.price;
  player.ownedThemes.push(themeId);

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      coins: increment(-theme.price),
      ownedThemes:
        player.ownedThemes
    }
  );

  showNotification(
    `${theme.name}を購入しました！`
  );

  await renderShop();
  await renderLocker();
}

async function renderShop() {
  $("shop-coin-count").textContent =
    player.coins;

  /*
    titles
  */

  $("shop-title-list").innerHTML =
    SHOP_TITLES.map(
      ([id, name, price]) => {

        const owned =
          player.ownedTitles.includes(id);

        return `
          <div class="shop-card">
            <strong>${escapeHTML(name)}</strong>
            <span>🪙 ${price}</span>

            <button
              type="button"
              class="buy-title"
              data-id="${id}"
              ${owned ? "disabled" : ""}
            >
              ${owned ? "所持済み" : "購入"}
            </button>
          </div>
        `;
      }
    ).join("");

  /*
    items
  */

  $("shop-item-list").innerHTML =
    SHOP_ITEMS.map(
      item => {

        const owned =
          player.ownedItems[item.id] || 0;

        return `
          <div class="shop-card">
            <strong>${escapeHTML(item.name)}</strong>

            <p>
              ${escapeHTML(item.description)}
            </p>

            <span>
              🪙 ${item.price}
              ｜ 所持 ${owned}
            </span>

            <button
              type="button"
              class="buy-item"
              data-id="${item.id}"
            >
              購入
            </button>
          </div>
        `;
      }
    ).join("");

  /*
    themes
  */

  $("shop-background-list").innerHTML =
    getThemeList().map(
      theme => {

        const owned =
          player.ownedThemes.includes(
            theme.id
          );

        return `
          <div
            class="shop-card"
            style="
              background:${theme.background};
              border-color:${theme.ui};
            "
          >
            <strong>${escapeHTML(theme.name)}</strong>

            <span>
              🪙 ${theme.price}
            </span>

            <button
              type="button"
              class="buy-theme"
              data-id="${theme.id}"
              ${owned ? "disabled" : ""}
            >
              ${owned ? "所持済み" : "購入"}
            </button>
          </div>
        `;
      }
    ).join("");

  document
    .querySelectorAll(".buy-title")
    .forEach(btn => {
      btn.onclick = () =>
        buyTitle(btn.dataset.id);
    });

  document
    .querySelectorAll(".buy-item")
    .forEach(btn => {
      btn.onclick = () =>
        buyItem(btn.dataset.id);
    });

  document
    .querySelectorAll(".buy-theme")
    .forEach(btn => {
      btn.onclick = () =>
        buyTheme(btn.dataset.id);
    });
}


/* =========================================================
   ITEM USE
========================================================= */

async function useItem(itemId) {
  const item =
    SHOP_ITEMS.find(
      i => i.id === itemId
    );

  if (!item) return;

  const count =
    player.ownedItems[itemId] || 0;

  if (count <= 0) {
    showNotification(
      "そのアイテムを持っていません。"
    );
    return;
  }

  /*
    XP boost
    同時利用不可
  */

  if (item.category === "xp") {

    if (xpBoost) {
      if (
        Date.now() <
        xpBoost.expiresAt
      ) {
        showNotification(
          "XPブーストは同時使用できません。"
        );
        return;
      }

      xpBoost = null;
    }

    xpBoost = {
      itemId,
      multiplier: item.multiplier,
      expiresAt:
        Date.now() +
        item.duration * 60 * 1000
    };

    await consumeItem(itemId);

    showNotification(
      `${item.name}を使用！ ${item.duration}分間XP${item.multiplier}倍！`
    );
  }

  /*
    Boss items
  */

  else if (
    [
      "attack",
      "defense",
      "party"
    ].includes(item.category)
  ) {

    if (!currentBossBattle) {
      currentBossBattle = {};
    }

    if (
      item.category === "attack"
    ) {
      currentBossBattle.personalMultiplier =
        Math.max(
          currentBossBattle.personalMultiplier || 1,
          item.multiplier
        );
    }

    if (
      item.category === "party"
    ) {
      currentBossBattle.partyMultiplier =
        Math.max(
          currentBossBattle.partyMultiplier || 1,
          item.multiplier
        );
    }

    if (
      item.category === "defense"
    ) {
      if (currentBoss) {
        currentBoss.level =
          Math.max(
            1,
            currentBoss.level -
              item.levelDown
          );

        currentBoss.maxHP =
          1000 +
          (currentBoss.level - 1) * 100;

        currentBoss.currentHP =
          Math.min(
            currentBoss.currentHP,
            currentBoss.maxHP
          );

        await updateDoc(
          doc(db, "global", "boss"),
          {
            level: currentBoss.level,
            maxHP: currentBoss.maxHP,
            currentHP:
              currentBoss.currentHP
          }
        );
      }
    }

    await consumeItem(itemId);

    showNotification(
      `${item.name}を使用しました！`
    );

    await renderBoss();
  }

  await renderLocker();
}

async function consumeItem(itemId) {
  const current =
    player.ownedItems[itemId] || 0;

  if (current <= 1) {
    delete player.ownedItems[itemId];

    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        [`ownedItems.${itemId}`]:
          null
      }
    );

    /*
      Firestoreで null になっても
      表示上は0扱い
    */

  } else {
    player.ownedItems[itemId] =
      current - 1;

    await updateDoc(
      doc(db, "users", currentUser.uid),
      {
        [`ownedItems.${itemId}`]:
          increment(-1)
      }
    );
  }
}


/* =========================================================
   LOCKER
========================================================= */

async function equipTitle(titleId) {
  if (
    !player.ownedTitles.includes(
      titleId
    )
  ) return;

  player.equippedTitle =
    titleId;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      equippedTitle: titleId
    }
  );

  showNotification(
    "称号を装備しました。"
  );

  await renderLocker();
  await refreshHeader();
}

async function equipTheme(themeId) {
  if (
    !player.ownedThemes.includes(
      themeId
    )
  ) return;

  player.equippedTheme =
    themeId;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      equippedTheme: themeId
    }
  );

  applyTheme();

  showNotification(
    "背景を変更しました。"
  );

  await renderLocker();
}

function getTitleName(titleId) {
  if (titleId === "default_title") {
    return "無名の冒険者";
  }

  const shop =
    SHOP_TITLES.find(
      t => t[0] === titleId
    );

  if (shop) return shop[1];

  const hidden =
    HIDDEN_TITLES.find(
      t => t[0] === titleId
    );

  if (hidden) return hidden[1];

  const rank =
    Object.entries(
      RANK_TITLES
    ).find(
      ([rank]) =>
        `rank_${rank}` === titleId
    );

  if (rank) return rank[1];

  return "無名の冒険者";
}

async function renderLocker() {
  const titleList =
    $("locker-title-list");

  const itemList =
    $("locker-item-list");

  const outfitList =
    $("locker-outfit-list");

  /*
    titles
  */

  if (!player.ownedTitles.length) {
    titleList.innerHTML =
      `<p class="empty-message">所持している称号はありません。</p>`;
  } else {
    titleList.innerHTML =
      player.ownedTitles.map(
        id => `
          <div class="locker-card">
            <strong>
              ${escapeHTML(
                getTitleName(id)
              )}
            </strong>

            <button
              type="button"
              class="equip-title"
              data-id="${id}"
            >
              ${
                player.equippedTitle === id
                  ? "装備中"
                  : "装備"
              }
            </button>
          </div>
        `
      ).join("");
  }

  /*
    items
  */

  const ownedItems =
    Object.entries(
      player.ownedItems || {}
    ).filter(
      ([, count]) =>
        Number(count) > 0
    );

  if (!ownedItems.length) {
    itemList.innerHTML =
      `<p class="empty-message">所持しているアイテムはありません。</p>`;
  } else {
    itemList.innerHTML =
      ownedItems.map(
        ([id, count]) => {

          const item =
            SHOP_ITEMS.find(
              i => i.id === id
            );

          if (!item) return "";

          return `
            <div class="locker-card">
              <strong>
                ${escapeHTML(item.name)}
              </strong>

              <span>
                ×${count}
              </span>

              <button
                type="button"
                class="use-item"
                data-id="${id}"
              >
                使用
              </button>
            </div>
          `;
        }
      ).join("");
  }

  /*
    themes
  */

  outfitList.innerHTML =
    player.ownedThemes.map(
      id => {

        const theme =
          getThemeList().find(
            t => t.id === id
          );

        if (!theme) return "";

        return `
          <div
            class="locker-card"
            style="
              background:${theme.background};
            "
          >
            <strong>
              ${escapeHTML(theme.name)}
            </strong>

            <button
              type="button"
              class="equip-theme"
              data-id="${id}"
            >
              ${
                player.equippedTheme === id
                  ? "使用中"
                  : "使用"
              }
            </button>
          </div>
        `;
      }
    ).join("");

  document
    .querySelectorAll(".equip-title")
    .forEach(btn => {
      btn.onclick = () =>
        equipTitle(btn.dataset.id);
    });

  document
    .querySelectorAll(".use-item")
    .forEach(btn => {
      btn.onclick = () =>
        useItem(btn.dataset.id);
    });

  document
    .querySelectorAll(".equip-theme")
    .forEach(btn => {
      btn.onclick = () =>
        equipTheme(btn.dataset.id);
    });
}


/* =========================================================
   THEME
========================================================= */

function applyTheme() {
  const theme =
    getThemeList().find(
      t =>
        t.id ===
        player.equippedTheme
    ) ||
    getThemeList()[0];

  document.documentElement.style.setProperty(
    "--bg-dark",
    theme.background
  );

  document.documentElement.style.setProperty(
    "--bg-card",
    theme.ui
  );

  document.body.style.background =
    theme.background;
}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

async function checkAchievementFlag(id) {
  if (!player) return;

  if (
    player.achievements.includes(id)
  ) {
    return;
  }

  const achievement =
    ACHIEVEMENTS.find(
      a => a[0] === id
    );

  if (!achievement) return;

  player.achievements.push(id);
  player.stars++;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      achievements:
        player.achievements,
      stars:
        increment(1)
    }
  );

  showNotification(
    `⭐ 実績解除：${achievement[1]}`
  );
}

async function checkAchievements() {
  if (!player) return;

  const total =
    player.totalStudyMinutes;

  const xp =
    player.totalXP;

  const coins =
    player.totalCoins;

  const level =
    player.level;

  const bosses =
    player.bossesDefeated;

  const quests =
    player.questsCompleted;

  const checks = [];

  if (total >= 1)
    checks.push("first_study");

  if (total >= 10)
    checks.push("study_10m");

  if (total >= 60)
    checks.push("study_60m");

  if (total >= 100)
    checks.push("study_100m");

  if (total >= 300)
    checks.push("study_5h");

  if (total >= 600)
    checks.push("study_10h");

  if (total >= 1500)
    checks.push("study_25h");

  if (total >= 3000)
    checks.push("study_50h");

  if (total >= 6000)
    checks.push("study_100h");

  if (total >= 12000)
    checks.push("study_200h");

  if (total >= 30000)
    checks.push("study_500h");

  if (total >= 60000)
    checks.push("study_1000h");

  if (level >= 5)
    checks.push("level_5");

  if (level >= 10)
    checks.push("level_10");

  if (level >= 25)
    checks.push("level_25");

  if (level >= 50)
    checks.push("level_50");

  if (level >= 75)
    checks.push("level_75");

  if (level >= 100)
    checks.push("level_100");

  const rank =
    getRankByMinutes(
      player.seasonStudyMinutes
    );

  if (
    ["Silver","Gold","Platinum","Diamond","Master","Grandmaster","Legend"]
      .includes(rank.name)
  ) {
    checks.push(
      `rank_${rank.name.toLowerCase()}`
    );
  }

  if (bosses >= 1)
    checks.push("boss_defeat");

  if (bosses >= 5)
    checks.push("boss_5");

  if (bosses >= 10)
    checks.push("boss_10");

  if (bosses >= 25)
    checks.push("boss_25");

  if (quests >= 1)
    checks.push("quest_first");

  if (quests >= 10)
    checks.push("quest_10");

  if (quests >= 50)
    checks.push("quest_50");

  if (quests >= 100)
    checks.push("quest_100");

  if (coins >= 1000)
    checks.push("coins_1000");

  if (coins >= 10000)
    checks.push("coins_10000");

  if (coins >= 100000)
    checks.push("coins_100000");

  if (
    player.todayStudyMinutes >= 180
  ) {
    checks.push("three_hours");
  }

  for (const id of checks) {
    await checkAchievementFlag(id);
  }

  /*
    全科目
  */

  if (
    player.subjects.length > 0 &&
    player.subjects.every(
      subject =>
        (
          player.subjectLevels?.[subject]?.minutes ||
          0
        ) >= 1
    )
  ) {
    await checkAchievementFlag(
      "all_subjects"
    );
  }

  /*
    daily 3
  */

  const quests =
    await getCurrentQuests();

  const today =
    japanDateKey();

  const daily =
    quests.filter(
      q =>
        q.type === "daily" &&
        q.periodKey === today
    );

  if (
    daily.length >= 3 &&
    daily.every(q => q.completed)
  ) {
    await checkAchievementFlag(
      "daily_complete"
    );
  }
}


/* =========================================================
   ACHIEVEMENT RENDER
========================================================= */

async function renderAchievements() {
  const container =
    $("achievement-list");

  const unlocked =
    player.achievements || [];

  $("achievement-count").textContent =
    `${unlocked.length} / ${ACHIEVEMENTS.length}`;

  container.innerHTML =
    ACHIEVEMENTS.map(
      ([id, name, description]) => {

        const done =
          unlocked.includes(id);

        return `
          <div
            class="achievement-card ${
              done ? "unlocked" : "locked"
            }"
          >
            <div>
              <strong>
                ${done ? "⭐" : "🔒"}
                ${escapeHTML(name)}
              </strong>

              <p>
                ${escapeHTML(description)}
              </p>
            </div>

            ${
              done
                ? "<span>達成</span>"
                : "<span>未達成</span>"
            }
          </div>
        `;
      }
    ).join("");
}


/* =========================================================
   PROFILE
========================================================= */

async function renderProfile() {
  const rank =
    getRankByMinutes(
      player.seasonStudyMinutes
    );

  $("profile-display-name").textContent =
    player.displayName;

  $("profile-user-id").textContent =
    player.userId;

  $("profile-course").textContent =
    COURSES[player.course] ||
    "未定";

  $("profile-level").textContent =
    player.level;

  $("profile-xp").textContent =
    player.xp;

  $("profile-stars").textContent =
    player.stars;

  $("profile-coins").textContent =
    player.coins;

  $("profile-title").textContent =
    getTitleName(
      player.equippedTitle
    );

  $("profile-total-study-time").textContent =
    formatMinutes(
      player.totalStudyMinutes
    );

  $("profile-total-xp").textContent =
    `${player.totalXP} XP`;

  $("profile-total-coins").textContent =
    player.totalCoins;

  $("profile-bosses-defeated").textContent =
    player.bossesDefeated;

  $("profile-quests-completed").textContent =
    player.questsCompleted;

  $("profile-subject-list").innerHTML =
    player.subjects.map(
      subject => {

        const data =
          player.subjectLevels?.[subject] ||
          {
            level: 1,
            minutes: 0
          };

        return `
          <div class="subject-card">
            <strong>
              ${SUBJECTS[subject]}
            </strong>

            <span>
              Lv.${data.level}
            </span>

            <small>
              ${formatMinutes(data.minutes)}
            </small>
          </div>
        `;
      }
    ).join("");
}


/* =========================================================
   STUDY PAGE
========================================================= */

async function renderStudyPage() {
  const select =
    $("study-subject");

  const current =
    select.value;

  select.innerHTML =
    `<option value="">教科を選択</option>` +
    player.subjects.map(
      subject =>
        `<option value="${subject}">
          ${SUBJECTS[subject]}
        </option>`
    ).join("");

  select.value = current;

  /*
    Subject levels
  */

  $("subject-level-list").innerHTML =
    player.subjects.map(
      subject => {

        const data =
          player.subjectLevels?.[subject] ||
          {
            level: 1,
            minutes: 0
          };

        const progress =
          data.level >= 100
            ? 100
            : (
                data.minutes % 30
              ) / 30 * 100;

        return `
          <div class="subject-level-card">

            <div>
              <strong>
                ${SUBJECTS[subject]}
              </strong>

              <span>
                Lv.${data.level}
              </span>
            </div>

            <div class="level-progress-container">
              <div class="level-progress-bar">
                <div
                  style="width:${progress}%"
                ></div>
              </div>
            </div>

            <small>
              累計 ${formatMinutes(data.minutes)}
            </small>
          </div>
        `;
      }
    ).join("");

  /*
    Subject summary
  */

  $("subject-study-list").innerHTML =
    player.subjects.map(
      subject => {

        const data =
          player.subjectLevels?.[subject] ||
          {
            level: 1,
            minutes: 0
          };

        return `
          <div class="subject-card">
            <strong>
              ${SUBJECTS[subject]}
            </strong>

            <span>
              ${formatMinutes(data.minutes)}
            </span>
          </div>
        `;
      }
    ).join("");

  await renderStudyHistory();
}

async function renderStudyHistory() {
  const container =
    $("study-history-list");

  const snap =
    await getDocs(
      query(
        collection(
          db,
          "users",
          currentUser.uid,
          "studyHistory"
        ),
        orderBy(
          "createdAt",
          "desc"
        ),
        limit(50)
      )
    );

  if (snap.empty) {
    container.innerHTML =
      `<p class="empty-message">まだ記録がありません。</p>`;
    return;
  }

  container.innerHTML =
    snap.docs.map(
      d => {

        const data =
          d.data();

        return `
          <div class="study-history-card">
            <strong>
              ${SUBJECTS[data.subject] || data.subject}
            </strong>

            <span>
              ${data.minutes}分
            </span>

            <span>
              +${data.xp} XP
            </span>

            <span>
              ${escapeHTML(data.note || "")}
            </span>

            <small>
              ${data.date || ""}
            </small>
          </div>
        `;
      }
    ).join("");
}


/* =========================================================
   HOME
========================================================= */

async function renderHome() {
  const rank =
    getRankByMinutes(
      player.seasonStudyMinutes
    );

  $("home-level").textContent =
    player.level;

  $("home-xp").textContent =
    `${player.xp} XP`;

  const progress =
    getXPProgress(player);

  const percent =
    progress.required === Infinity
      ? 100
      : clamp(
          progress.current /
            progress.required *
            100,
          0,
          100
        );

  $("level-progress").style.width =
    `${percent}%`;

  $("home-xp-required").textContent =
    player.level >= 100
      ? "MAX LEVEL"
      : `次のレベルまで ${progress.required - progress.current} XP`;

  $("star-count").textContent =
    `⭐ ${player.stars}`;

  $("star-title").textContent =
    getTitleName(
      player.equippedTitle
    );

  $("today-study-time").textContent =
    formatMinutes(
      player.todayStudyMinutes
    );

  $("today-xp").textContent =
    `${player.todayXP} XP`;

  $("today-quests").textContent =
    player.todayQuests;

  $("today-coins").textContent =
    `🪙 ${player.todayCoins}`;

  $("home-rank").textContent =
    rank.name;

  $("home-season-study-time").textContent =
    `${(player.seasonStudyMinutes / 60).toFixed(1)}時間`;

  $("home-season-end").textContent =
    getSeasonEndDate();

  applyRankStyle(rank.name);

  await renderHomeQuests();
}

function getSeasonEndDate() {
  const d =
    nowJapan();

  const end =
    new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0
    );

  return `${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()} 23:59`;
}

async function renderHomeQuests() {
  const container =
    $("home-quest-list");

  await ensureQuests();

  const quests =
    await getCurrentQuests();

  const daily =
    quests.filter(
      q =>
        q.type === "daily" &&
        q.periodKey === japanDateKey()
    );

  if (!daily.length) {
    container.innerHTML =
      `<p class="empty-message">クエストを読み込み中...</p>`;
    return;
  }

  container.innerHTML =
    daily.map(
      q => `
        <div class="home-quest-card ${
          q.completed ? "completed" : ""
        }">
          <strong>
            ${escapeHTML(q.name)}
          </strong>

          <span>
            ${q.progress}/${q.target}
          </span>

          <span>
            ${
              q.completed
                ? "✅"
                : `🎁 +${q.rewardXP}XP`
            }
          </span>
        </div>
      `
    ).join("");
}


/* =========================================================
   HEADER
========================================================= */

async function refreshHeader() {
  if (!player) return;

  const rank =
    getRankByMinutes(
      player.seasonStudyMinutes
    );

  $("header-display-name").textContent =
    player.displayName;

  $("header-level").textContent =
    `Lv.${player.level}`;

  $("header-rank").textContent =
    rank.name;

  $("header-coins").textContent =
    `🪙 ${player.coins}`;

  applyRankStyle(rank.name);
}


/* =========================================================
   RANK PAGE
========================================================= */

async function renderRank() {
  const rank =
    getRankByMinutes(
      player.seasonStudyMinutes
    );

  $("current-rank-name").textContent =
    rank.name;

  $("current-season-study-time").textContent =
    `${(player.seasonStudyMinutes / 60).toFixed(1)}時間`;

  $("current-season-time").textContent =
    getSeasonEndDate();

  applyRankStyle(rank.name);

  await renderSeasonHistory();
}

async function renderSeasonHistory() {
  const container =
    $("season-history-list");

  const snap =
    await getDocs(
      query(
        collection(
          db,
          "users",
          currentUser.uid,
          "seasonHistory"
        ),
        orderBy(
          "createdAt",
          "desc"
        ),
        limit(20)
      )
    );

  if (snap.empty) {
    container.innerHTML =
      `<p class="empty-message">まだ履歴がありません。</p>`;
    return;
  }

  container.innerHTML =
    snap.docs.map(
      d => {

        const data =
          d.data();

        return `
          <div class="season-card">
            <strong>
              ${escapeHTML(data.rank)}
            </strong>

            <span>
              ${(data.studyMinutes / 60).toFixed(1)}時間
            </span>
          </div>
        `;
      }
    ).join("");
}


/* =========================================================
   SETTINGS
========================================================= */

function populateSettingsSubjects() {
  document
    .querySelectorAll(
      'input[name="settings-subjects"]'
    )
    .forEach(input => {
      input.checked =
        player.subjects.includes(
          input.value
        );
    });

  $("settings-display-name").value =
    player.displayName;
}

async function saveDisplayName(event) {
  event.preventDefault();

  const name =
    $("settings-display-name")
      .value.trim();

  if (!name) {
    $("display-name-error").textContent =
      "表示名を入力してください。";
    return;
  }

  if (name.length > 30) {
    $("display-name-error").textContent =
      "30文字以内にしてください。";
    return;
  }

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      displayName: name
    }
  );

  player.displayName = name;

  $("display-name-error").textContent =
    "";

  await refreshHeader();
  await renderProfile();

  showNotification(
    "表示名を変更しました。"
  );
}

async function saveSubjects(event) {
  event.preventDefault();

  const selected =
    [...document.querySelectorAll(
      'input[name="settings-subjects"]:checked'
    )].map(
      input => input.value
    );

  if (!selected.length) {
    $("settings-subject-error").textContent =
      "最低1教科選択してください。";
    return;
  }

  const oldLevels =
    player.subjectLevels || {};

  const newLevels = {};

  selected.forEach(subject => {
    newLevels[subject] =
      oldLevels[subject] || {
        level: 1,
        minutes: 0
      };
  });

  player.subjects =
    selected;

  player.subjectLevels =
    newLevels;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      subjects: selected,
      subjectLevels: newLevels
    }
  );

  $("settings-subject-error").textContent =
    "";

  await renderStudyPage();
  await renderProfile();

  showNotification(
    "受験教科を保存しました。"
  );
}

async function changePassword(event) {
  event.preventDefault();

  const password =
    $("settings-new-password").value;

  if (password.length < 6) {
    $("password-error").textContent =
      "6文字以上にしてください。";
    return;
  }

  try {
    await updatePassword(
      currentUser,
      password
    );

    $("password-error").textContent =
      "";

    $("settings-new-password").value =
      "";

    showNotification(
      "パスワードを変更しました。"
    );

  } catch (error) {
    console.error(error);

    $("password-error").textContent =
      "再ログイン後にもう一度お試しください。";
  }
}

async function deleteAccountCompletely() {
  const ok =
    confirm(
      "本当にアカウントを完全削除しますか？\nこの操作は取り消せません。"
    );

  if (!ok) return;

  try {

    /*
      Firestoreの主要データを削除
    */

    const collectionsToDelete = [
      "studyHistory",
      "quests",
      "seasonHistory"
    ];

    for (
      const collectionName
      of collectionsToDelete
    ) {
      const snap =
        await getDocs(
          collection(
            db,
            "users",
            currentUser.uid,
            collectionName
          )
        );

      for (
        const item
        of snap.docs
      ) {
        await deleteDoc(
          item.ref
        );
      }
    }

    /*
      friends
    */

    const friends =
      await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "friends"
        )
      );

    for (
      const friend
      of friends.docs
    ) {
      await deleteDoc(
        friend.ref
      );
    }

    await deleteDoc(
      doc(
        db,
        "users",
        currentUser.uid
      )
    );

    await deleteUser(
      currentUser
    );

  } catch (error) {
    console.error(error);

    showNotification(
      "削除に失敗しました。再ログイン後にお試しください。"
    );
  }
}


/* =========================================================
   AUTH
========================================================= */

function validateUserId(userId) {
  return /^[A-Za-z0-9_-]{3,30}$/.test(
    userId
  );
}

async function register(event) {
  event.preventDefault();

  $("register-error").textContent =
    "";

  const userId =
    normalizeUserId(
      $("register-user-id").value
    );

  const password =
    $("register-password").value;

  const confirmPassword =
    $("register-password-confirm")
      .value;

  const displayName =
    $("register-display-name")
      .value.trim();

  const course =
    document.querySelector(
      'input[name="course"]:checked'
    )?.value;

  const subjects =
    [...document.querySelectorAll(
      'input[name="subjects"]:checked'
    )].map(
      input => input.value
    );

  if (!validateUserId(userId)) {
    $("register-error").textContent =
      "ユーザーIDは3〜30文字の英数字・_・-で入力してください。";
    return;
  }

  if (password.length < 6) {
    $("register-error").textContent =
      "パスワードは6文字以上です。";
    return;
  }

  if (
    password !== confirmPassword
  ) {
    $("register-error").textContent =
      "パスワードが一致しません。";
    return;
  }

  if (!displayName) {
    $("register-error").textContent =
      "表示名を入力してください。";
    return;
  }

  if (!course) {
    $("register-error").textContent =
      "文理を選択してください。";
    return;
  }

  if (!subjects.length) {
    $("subject-error").textContent =
      "最低1教科選択してください。";
    return;
  }

  try {

    /*
      ユーザーID重複確認
    */

    const duplicate =
      await getDocs(
        query(
          collection(db, "users"),
          where(
            "userId",
            "==",
            userId
          ),
          limit(1)
        )
      );

    if (!duplicate.empty) {
      $("register-error").textContent =
        "そのユーザーIDはすでに使用されています。";
      return;
    }

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        userIdToEmail(userId),
        password
      );

    const newPlayer =
      createDefaultPlayer(
        userId,
        displayName,
        course,
        subjects
      );

    await setDoc(
      doc(
        db,
        "users",
        credential.user.uid
      ),
      newPlayer
    );

    player =
      {
        ...newPlayer,
        createdAt: new Date(),
        updatedAt: new Date()
      };

    showNotification(
      "🎉 冒険者登録完了！"
    );

  } catch (error) {
    console.error(error);

    $("register-error").textContent =
      firebaseAuthError(error);
  }
}

async function login(event) {
  event.preventDefault();

  $("login-error").textContent =
    "";

  const userId =
    normalizeUserId(
      $("login-user-id").value
    );

  const password =
    $("login-password").value;

  try {

    await signInWithEmailAndPassword(
      auth,
      userIdToEmail(userId),
      password
    );

  } catch (error) {
    console.error(error);

    $("login-error").textContent =
      "ユーザーIDまたはパスワードが違います。";
  }
}

function firebaseAuthError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "そのユーザーIDはすでに使用されています。";

    case "auth/invalid-credential":
      return "入力内容を確認してください。";

    case "auth/weak-password":
      return "パスワードが弱すぎます。";

    case "auth/network-request-failed":
      return "ネットワークエラーです。";

    default:
      return "登録に失敗しました。";
  }
}

async function logout() {
  await signOut(auth);
}


/* =========================================================
   LOAD PLAYER
========================================================= */

async function loadPlayer() {
  const ref =
    doc(
      db,
      "users",
      currentUser.uid
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    throw new Error(
      "ユーザーデータが見つかりません。"
    );
  }

  player =
    {
      ...snap.data(),
      subjectLevels:
        snap.data().subjectLevels || {},
      ownedTitles:
        snap.data().ownedTitles || [
          "default_title"
        ],
      ownedItems:
        snap.data().ownedItems || {},
      ownedThemes:
        snap.data().ownedThemes || [
          "default_theme"
        ],
      achievements:
        snap.data().achievements || []
    };

  await handleDateReset();
  await handleSeasonReset();
  await cleanupWeeklyParties();

  /*
    ランク到達称号
  */

  const rank =
    getRankByMinutes(
      player.seasonStudyMinutes
    );

  const rankTitle =
    RANK_TITLES[rank.name];

  const rankTitleId =
    `rank_${rank.name}`;

  if (
    rank.name !== "Bronze" &&
    !player.ownedTitles.includes(
      rankTitleId
    )
  ) {
    player.ownedTitles.push(
      rankTitleId
    );

    await updateDoc(
      ref,
      {
        ownedTitles:
          player.ownedTitles
      }
    );

    showNotification(
      `🏆 ${rank.name}到達！ 称号「${rankTitle}」獲得！`
    );
  }
}


/* =========================================================
   MAIN APP INIT
========================================================= */

async function startApp() {
  hide($("auth-screen"));
  show($("main-app"));

  await loadPlayer();

  applyTheme();

  await refreshHeader();
  await renderHome();

  switchScreen("home-screen");
}
async function refreshAll() {
  if (!player) return;

  await handleDateReset();
  await handleSeasonReset();

  await refreshHeader();
  await renderHome();
  await renderStudyPage();
  await renderQuests();
  await renderParty();
  await renderFriends();
  await renderFriendRequests();
  await renderBoss();
  await renderRank();
  await renderShop();
  await renderLocker();
  await renderAchievements();
  await renderProfile();

  populateSettingsSubjects();
}


/* =========================================================
   NAVIGATION
========================================================= */

function switchScreen(screenId) {
  document
    .querySelectorAll(".app-screen")
    .forEach(screen => {
      hide(screen);
    });

  show($(screenId));

  document
    .querySelectorAll(".nav-button")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.screen === screenId
      );
    });

  currentScreen =
    screenId;

  /*
    lazy refresh
  */

  if (screenId === "home-screen") {
    renderHome();
  }

  if (screenId === "study-screen") {
    renderStudyPage();
  }

  if (screenId === "quest-screen") {
    renderQuests();
    renderBoss();
  }

  if (screenId === "party-screen") {
    renderParty();
    renderFriends();
    renderFriendRequests();
  }

  if (screenId === "rank-screen") {
    renderRank();
  }

  if (screenId === "other-screen") {
    renderOtherTab(
      currentOtherTab
    );
  }
}

function renderOtherTab(tab) {
  document
    .querySelectorAll(
      ".other-tab-content"
    )
    .forEach(content =>
      hide(content)
    );

  const target =
    $(`${tab}-tab`);

  if (target) {
    show(target);
  }

  document
    .querySelectorAll(
      "[data-other-tab]"
    )
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
    populateSettingsSubjects();
  }
}

function renderQuestTab(tab) {
  currentQuestTab = tab;

  document
    .querySelectorAll(
      ".quest-tab-content"
    )
    .forEach(content =>
      hide(content)
    );

  const map = {
    daily: "daily-quest-tab",
    weekly: "weekly-quest-tab",
    boss: "boss-tab",
    history: "quest-history-tab"
  };

  show($(map[tab]));

  document
    .querySelectorAll(
      "[data-quest-tab]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.questTab === tab
      );
    });

  if (tab === "boss") {
    currentBossBattle = {};
    renderBoss();
  }

  if (tab === "history") {
    renderQuestHistory();
  }
}

function renderPartyTab(tab) {
  currentPartyTab = tab;

  document
    .querySelectorAll(
      ".party-tab-content"
    )
    .forEach(content =>
      hide(content)
    );

  const map = {
    party: "party-tab",
    friends: "friends-tab",
    requests: "friend-requests-tab"
  };

  show($(map[tab]));

  document
    .querySelectorAll(
      "[data-party-tab]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.partyTab === tab
      );
    });

  if (tab === "party") {
    renderParty();
  }

  if (tab === "friends") {
    renderFriends();
  }

  if (tab === "requests") {
    renderFriendRequests();
  }
}

function renderRankTab(tab) {
  currentRankTab = tab;

  document
    .querySelectorAll(
      ".rank-tab-content"
    )
    .forEach(content =>
      hide(content)
    );

  const map = {
    rank: "rank-info-tab",
    ranking: "ranking-tab",
    history: "season-history-tab"
  };

  show($(map[tab]));

  document
    .querySelectorAll(
      "[data-rank-tab]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.rankTab === tab
      );
    });

  /*
    Ranking is intentionally removed.
    Show own season information instead.
  */

  if (tab === "ranking") {
    $("friends-ranking-list").innerHTML =
      `<p class="empty-message">
        ランキング機能は廃止されています。
      </p>`;

    $("global-ranking-list").innerHTML =
      "";

    $("global-rank-number").textContent =
      "-";
  }

  if (tab === "history") {
    renderSeasonHistory();
  }
}


/* =========================================================
   MODALS
========================================================= */

function showLevelUpModal(
  oldLevel,
  newLevel
) {
  $("level-up-old-level").textContent =
    oldLevel;

  $("level-up-new-level").textContent =
    newLevel;

  show($("level-up-modal"));

  createScreenFlash(
    "level-up"
  );
}

function showRewardModal(
  title,
  content
) {
  $("reward-modal-content").innerHTML =
    content;

  $("reward-modal")
    .querySelector("h2")
    .textContent =
    title;

  show($("reward-modal"));

  createScreenFlash(
    "reward"
  );
}

function showNotification(message) {
  const notification =
    $("notification");

  notification.textContent =
    message;

  show(notification);

  clearTimeout(
    notificationTimeout
  );

  notificationTimeout =
    setTimeout(
      () =>
        hide(notification),
      3500
    );
}

function createScreenFlash(type) {
  const flash =
    document.createElement("div");

  flash.className =
    `rpg-effect ${type}`;

  document.body.appendChild(
    flash
  );

  setTimeout(
    () => flash.remove(),
    1200
  );
}

function showBossAttackEffect(
  damage
) {
  const effect =
    document.createElement("div");

  effect.className =
    "boss-hit-effect";

  effect.textContent =
    `-${damage}`;

  document.body.appendChild(
    effect
  );

  setTimeout(
    () => effect.remove(),
    1000
  );
}

function showBossDefeatEffect() {
  const effect =
    document.createElement("div");

  effect.className =
    "boss-defeat-effect";

  effect.innerHTML =
    "👹<br><strong>DEFEATED</strong>";

  document.body.appendChild(
    effect
  );

  setTimeout(
    () => effect.remove(),
    1800
  );
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEvents() {

  /*
    Auth
  */

  $("login-form")
    .addEventListener(
      "submit",
      login
    );

  $("register-form")
    .addEventListener(
      "submit",
      register
    );

  $("show-register-button")
    .addEventListener(
      "click",
      () => {
        hide($("login-screen"));
        show($("register-screen"));
      }
    );

  $("show-login-button")
    .addEventListener(
      "click",
      () => {
        hide($("register-screen"));
        show($("login-screen"));
      }
    );

  $("logout-button")
    .addEventListener(
      "click",
      logout
    );


  /*
    Navigation
  */

  document
    .querySelectorAll(
      ".nav-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          switchScreen(
            button.dataset.screen
          )
      );
    });


  /*
    Timer
  */

  $("study-timer-start")
    .addEventListener(
      "click",
      startTimer
    );

  $("study-timer-pause")
    .addEventListener(
      "click",
      pauseTimer
    );

  $("study-timer-reset")
    .addEventListener(
      "click",
      resetTimer
    );

  $("timer-save-button")
    .addEventListener(
      "click",
      saveTimer
    );


  /*
    Manual study
  */

  $("study-record-form")
    .addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        try {

          const subject =
            $("study-subject").value;

          const minutes =
            Number(
              $("study-minutes").value
            );

          const note =
            $("study-note").value;

          await addStudy(
            minutes,
            subject,
            note,
            "manual"
          );

          $("study-minutes").value =
            "";

          $("study-note").value =
            "";

          $("study-error").textContent =
            "";

        } catch (error) {

          console.error(error);

          $("study-error").textContent =
            error.message;
        }
      }
    );


  /*
    Quest tabs
  */

  document
    .querySelectorAll(
      "[data-quest-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          renderQuestTab(
            button.dataset.questTab
          )
      );
    });


  /*
    Party tabs
  */

  document
    .querySelectorAll(
      "[data-party-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          renderPartyTab(
            button.dataset.partyTab
          )
      );
    });


  /*
    Party invite
  */

  $("party-invite-form")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const id =
          $("party-invite-user-id")
            .value;

        try {
          await inviteToParty(id);

          $("party-invite-user-id")
            .value = "";

          $("party-error")
            .textContent = "";

        } catch (error) {
          console.error(error);

          $("party-error")
            .textContent =
            "招待に失敗しました。";
        }
      }
    );


  /*
    Rank tabs
  */

  document
    .querySelectorAll(
      "[data-rank-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () =>
          renderRankTab(
            button.dataset.rankTab
          )
      );
    });


  /*
    Other tabs
  */

  document
    .querySelectorAll(
      "[data-other-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          currentOtherTab =
            button.dataset.otherTab;

          renderOtherTab(
            currentOtherTab
          );
        }
      );
    });


  /*
    Other menu shortcuts
  */

  document
    .querySelectorAll(
      "[data-open-other-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {

          currentOtherTab =
            button.dataset.openOtherTab;

          renderOtherTab(
            currentOtherTab
          );
        }
      );
    });


  /*
    Settings
  */

  $("display-name-form")
    .addEventListener(
      "submit",
      saveDisplayName
    );

  $("subject-settings-form")
    .addEventListener(
      "submit",
      saveSubjects
    );

  $("password-form")
    .addEventListener(
      "submit",
      changePassword
    );

  $("delete-account-button")
    .addEventListener(
      "click",
      deleteAccountCompletely
    );


  /*
    Modals
  */

  $("level-up-close-button")
    .addEventListener(
      "click",
      () =>
        hide(
          $("level-up-modal")
        )
    );

  $("reward-close-button")
    .addEventListener(
      "click",
      () =>
        hide(
          $("reward-modal")
        )
    );


  /*
    Boss refresh
  */

  $("boss-refresh-button")
    .addEventListener(
      "click",
      async () => {
        currentBossBattle = {};
        await renderBoss();

        showNotification(
          "ボス情報を更新しました。"
        );
      }
    );
}


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      currentUser = null;
      player = null;

      show($("auth-screen"));
      hide($("main-app"));

      return;
    }

    currentUser = user;

    try {

      await startApp();

    } catch (error) {

      console.error(
        "APP INIT ERROR:",
        error
      );

      showNotification(
        "データの読み込みに失敗しました。"
      );
    }
  }
);


/* =========================================================
   BOOT
========================================================= */

setupEvents();

updateTimerDisplay();


/* =========================================================
   AUTO REFRESH
========================================================= */

setInterval(
  async () => {

    if (!currentUser || !player)
      return;

    try {

      /*
        日付変更検知
      */

      await handleDateReset();
      await handleSeasonReset();

      /*
        XP boost expiration
      */

      if (
        xpBoost &&
        Date.now() >=
        xpBoost.expiresAt
      ) {
        xpBoost = null;

        showNotification(
          "XPブーストの効果が終了しました。"
        );
      }

      /*
        現在画面だけ更新
      */

      if (
        currentScreen ===
        "home-screen"
      ) {
        await renderHome();
      }

      if (
        currentScreen ===
        "study-screen"
      ) {
        await renderStudyPage();
      }

      if (
        currentScreen ===
        "quest-screen"
      ) {
        await renderQuests();

        if (
          currentQuestTab === "boss"
        ) {
          await renderBoss();
        }
      }

      await refreshHeader();

    } catch (error) {
      console.error(
        "AUTO REFRESH ERROR",
        error
      );
    }

  },
  60000
);


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

window.addEventListener(
  "unhandledrejection",
  event => {
    console.error(
      "Unhandled Promise:",
      event.reason
    );
  }
);
