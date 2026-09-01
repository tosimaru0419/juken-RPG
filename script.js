/* =========================================================
   受験RPG - COMPLETE REBUILD
   PART 1 / 3
   Firebase / Auth / Core / Player / XP / Rank / Date
========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

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
  limit,
  serverTimestamp,
  writeBatch,
  increment
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCggQfYsVVlng6EJLS74OB3ADV4vFjyo",
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


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let player = null;

let booted = false;
let appStarted = false;
let authListenerStarted = false;

let timerInterval = null;
let timerState = {
  running: false,
  startedAt: null,
  elapsedSeconds: 0,
  lastPersistedSeconds: 0,
  lastDateKey: null
};

let currentQuestTab = "daily";
let currentPartyTab = "party";
let currentRankTab = "rank";
let currentOtherTab = "menu";

let refreshInProgress = false;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = id => document.getElementById(id);

const show = el => {
  if (el) el.classList.remove("hidden");
};

const hide = el => {
  if (el) el.classList.add("hidden");
};

const setText = (id, value) => {
  const el = $(id);
  if (el) el.textContent = value ?? "";
};

const setHTML = (id, value) => {
  const el = $(id);
  if (el) el.innerHTML = value ?? "";
};

const safeOn = (el, event, handler) => {
  if (!el) return;
  el.addEventListener(event, handler);
};

const safeQueryAll = selector => {
  try {
    return [...document.querySelectorAll(selector)];
  } catch {
    return [];
  }
};

const escapeHTML = value => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};


/* =========================================================
   NOTIFICATION
========================================================= */

let notificationTimer = null;

function showNotification(message, duration = 3000) {
  const el = $("notification");

  if (!el) {
    console.log("[受験RPG]", message);
    return;
  }

  el.textContent = message;
  show(el);

  clearTimeout(notificationTimer);

  notificationTimer = setTimeout(() => {
    hide(el);
  }, duration);
}


/* =========================================================
   ERROR HANDLING
========================================================= */

function friendlyFirebaseError(error) {
  const code = error?.code || "";

  const messages = {
    "auth/invalid-credential":
      "ユーザーIDまたはパスワードが違います。",
    "auth/invalid-login-credentials":
      "ユーザーIDまたはパスワードが違います。",
    "auth/user-not-found":
      "ユーザーIDまたはパスワードが違います。",
    "auth/wrong-password":
      "ユーザーIDまたはパスワードが違います。",
    "auth/email-already-in-use":
      "そのユーザーIDはすでに使われています。",
    "auth/weak-password":
      "パスワードは6文字以上にしてください。",
    "auth/invalid-email":
      "ユーザーIDの形式が正しくありません。",
    "auth/network-request-failed":
      "ネットワーク接続を確認してください。",
    "auth/too-many-requests":
      "試行回数が多すぎます。少し待ってから再試行してください。",
    "auth/requires-recent-login":
      "安全のため、もう一度ログインしてから実行してください。"
  };

  return messages[code] || "処理に失敗しました。もう一度試してください。";
}


/* =========================================================
   USER ID
========================================================= */

function normalizeUserId(id) {
  return String(id ?? "")
    .trim()
    .toLowerCase();
}

function userIdToEmail(id) {
  return `${normalizeUserId(id)}@juken-rpg.local`;
}

function isValidUserId(id) {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(String(id ?? ""));
}


/* =========================================================
   SUBJECTS
========================================================= */

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

const SUBJECT_ICONS = {
  japanese: "📖",
  math: "📐",
  english: "🔤",
  physics: "⚡",
  chemistry: "🧪",
  biology: "🧬",
  "earth-science": "🌎",
  "biology-basic": "🧫",
  "earth-science-basic": "🌋",
  geography: "🗺️",
  "japanese-history": "🏯",
  "world-history": "🌍",
  civics: "🏛️"
};

function getSubjectName(subject) {
  return SUBJECTS[subject] || subject || "不明";
}

function getSubjectIcon(subject) {
  return SUBJECT_ICONS[subject] || "📚";
}


/* =========================================================
   RANK
   月間シーズン
========================================================= */

const RANKS = [
  {
    name: "Bronze",
    label: "Bronze",
    minHours: 0
  },
  {
    name: "Silver",
    label: "Silver",
    minHours: 10
  },
  {
    name: "Gold",
    label: "Gold",
    minHours: 25
  },
  {
    name: "Platinum",
    label: "Platinum",
    minHours: 45
  },
  {
    name: "Diamond",
    label: "Diamond",
    minHours: 70
  },
  {
    name: "Master",
    label: "Master",
    minHours: 100
  },
  {
    name: "Grandmaster",
    label: "Grandmaster",
    minHours: 135
  },
  {
    name: "Legend",
    label: "Legend",
    minHours: 170
  }
];

const RANK_TITLES = {
  Bronze: "駆け出しの冒険者",
  Silver: "努力する者",
  Gold: "黄金の探求者",
  Platinum: "白金の猛者",
  Diamond: "ダイヤモンド級",
  Master: "受験マスター",
  Grandmaster: "グランドマスター",
  Legend: "伝説の受験生"
};

function getRankByMinutes(minutes = 0) {
  const hours = Math.max(0, Number(minutes) || 0) / 60;

  let current = RANKS[0];

  for (const rank of RANKS) {
    if (hours >= rank.minHours) {
      current = rank;
    }
  }

  return current;
}


/* =========================================================
   XP / LEVEL
========================================================= */

const MAX_LEVEL = 100;

function getXPRequiredForNextLevel(level) {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Number(level) || 1));

  if (lv >= MAX_LEVEL) {
    return 0;
  }

  const block = Math.floor((lv - 1) / 10);

  return 100 + block * 50;
}

function getTotalXPRequiredForLevel(level) {
  const target = Math.max(1, Math.min(MAX_LEVEL, Number(level) || 1));

  if (target <= 1) {
    return 0;
  }

  let total = 0;

  for (let lv = 1; lv < target; lv++) {
    total += getXPRequiredForNextLevel(lv);
  }

  return total;
}

function calculateLevelFromXP(totalXP = 0) {
  let xp = Math.max(0, Number(totalXP) || 0);
  let level = 1;

  while (level < MAX_LEVEL) {
    const required = getXPRequiredForNextLevel(level);

    if (xp < required) {
      break;
    }

    xp -= required;
    level++;
  }

  return {
    level,
    currentXP: xp,
    requiredXP:
      level >= MAX_LEVEL
        ? 0
        : getXPRequiredForNextLevel(level)
  };
}

function getPlayerLevelInfo() {
  return calculateLevelFromXP(player?.xp || 0);
}


/* =========================================================
   XP MULTIPLIERS
========================================================= */

function getPermanentXPMultiplier() {
  if (!player) return 1;

  return player.legendXPBoostUnlocked ? 1.5 : 1;
}

function getActiveXPMultiplier() {
  const permanent = getPermanentXPMultiplier();

  const temporary = Number(player?.activeXPBoostMultiplier || 1);

  return permanent * Math.max(1, temporary);
}


/* =========================================================
   JAPAN TIME
========================================================= */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getJSTDate(date = new Date()) {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

function getJSTParts(date = new Date()) {
  const jst = getJSTDate(date);

  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
    hour: jst.getUTCHours(),
    minute: jst.getUTCMinutes(),
    second: jst.getUTCSeconds()
  };
}

function getDateKey(date = new Date()) {
  const p = getJSTParts(date);

  return [
    p.year,
    String(p.month).padStart(2, "0"),
    String(p.day).padStart(2, "0")
  ].join("-");
}

function getMonthKey(date = new Date()) {
  const p = getJSTParts(date);

  return [
    p.year,
    String(p.month).padStart(2, "0")
  ].join("-");
}

function getWeekKey(date = new Date()) {
  const jst = getJSTDate(date);

  const day = jst.getUTCDay();

  const mondayOffset = day === 0 ? -6 : 1 - day;

  jst.setUTCDate(jst.getUTCDate() + mondayOffset);

  return [
    jst.getUTCFullYear(),
    String(jst.getUTCMonth() + 1).padStart(2, "0"),
    String(jst.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getNextMonthStartJST() {
  const p = getJSTParts();

  let year = p.year;
  let month = p.month + 1;

  if (month > 12) {
    month = 1;
    year++;
  }

  return `${year}/${String(month).padStart(2, "0")}/01`;
}

function getNextMondayJST() {
  const now = getJSTDate();
  const day = now.getUTCDay();

  let diff = day === 0 ? 1 : 8 - day;

  if (day === 1) {
    diff = 7;
  }

  now.setUTCDate(now.getUTCDate() + diff);

  return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")} 00:00`;
}


/* =========================================================
   DEFAULT PLAYER
========================================================= */

function createDefaultPlayer(data = {}) {
  const now = new Date();
  const dateKey = getDateKey(now);
  const monthKey = getMonthKey(now);

  return {
    userId: normalizeUserId(data.userId || ""),
    displayName: data.displayName || "冒険者",
    course: data.course || "undecided",
    subjects: Array.isArray(data.subjects)
      ? data.subjects
      : [],

    xp: Number(data.xp || 0),
    coins: Number(data.coins || 0),

    level: Number(data.level || 1),

    stars: Number(data.stars || 0),

    totalStudyMinutes: Number(data.totalStudyMinutes || 0),
    todayStudyMinutes: Number(data.todayStudyMinutes || 0),
    todayXP: Number(data.todayXP || 0),
    todayCoins: Number(data.todayCoins || 0),

    seasonStudyMinutes: Number(data.seasonStudyMinutes || 0),
    seasonKey: data.seasonKey || monthKey,

    currentDateKey: data.currentDateKey || dateKey,

    subjectLevels: data.subjectLevels || {},
    subjectStudyMinutes: data.subjectStudyMinutes || {},

    ownedTitles: Array.isArray(data.ownedTitles)
      ? data.ownedTitles
      : ["default_title"],

    equippedTitle: data.equippedTitle || "default_title",

    ownedItems: data.ownedItems || {},

    ownedThemes: Array.isArray(data.ownedThemes)
      ? data.ownedThemes
      : ["default_theme"],

    equippedTheme: data.equippedTheme || "default_theme",

    achievements: Array.isArray(data.achievements)
      ? data.achievements
      : [],

    completedQuestIds: Array.isArray(data.completedQuestIds)
      ? data.completedQuestIds
      : [],

    totalQuestsCompleted: Number(data.totalQuestsCompleted || 0),

    bossesDefeated: Number(data.bossesDefeated || 0),

    legendXPBoostUnlocked:
      Boolean(data.legendXPBoostUnlocked),

    activeXPBoostMultiplier:
      Number(data.activeXPBoostMultiplier || 1),

    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null
  };
}


/* =========================================================
   PLAYER SAVE
========================================================= */

async function savePlayer(extra = {}) {
  if (!currentUser || !player) return;

  const ref = doc(db, "users", currentUser.uid);

  player.updatedAt = new Date().toISOString();

  await setDoc(
    ref,
    {
      ...player,
      ...extra,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );
}


/* =========================================================
   LOAD PLAYER
========================================================= */

async function loadPlayer() {
  if (!currentUser) {
    throw new Error("認証ユーザーが存在しません。");
  }

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    /*
      Firebase Authには存在するがFirestoreに
      データがない場合の安全回復。
    */

    const recovered = createDefaultPlayer({
      userId:
        currentUser.email?.replace(
          /@juken-rpg\.local$/i,
          ""
        ) || "",
      displayName: "冒険者"
    });

    await setDoc(
      ref,
      {
        ...recovered,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    player = recovered;

    showNotification(
      "冒険者データを安全に復旧しました。"
    );

    return;
  }

  player = createDefaultPlayer(snap.data());

  await normalizePlayerData();
}


/* =========================================================
   PLAYER DATA NORMALIZATION
========================================================= */

async function normalizePlayerData() {
  if (!player || !currentUser) return;

  let changed = false;

  const nowDateKey = getDateKey();
  const nowMonthKey = getMonthKey();

  if (player.currentDateKey !== nowDateKey) {
    player.todayStudyMinutes = 0;
    player.todayXP = 0;
    player.todayCoins = 0;
    player.currentDateKey = nowDateKey;

    changed = true;
  }

  if (player.seasonKey !== nowMonthKey) {
    await handleSeasonReset();

    changed = true;
  }

  /*
    レベルをXPから再計算。
  */

  const levelInfo = calculateLevelFromXP(player.xp);

  if (player.level !== levelInfo.level) {
    const oldLevel = player.level || 1;

    player.level = levelInfo.level;
    changed = true;

    if (levelInfo.level > oldLevel) {
      await handleLevelUp(oldLevel, levelInfo.level);
    }
  }

  /*
    Legend到達で永久1.5倍。
  */

  const rank = getRankByMinutes(player.seasonStudyMinutes);

  if (
    rank.name === "Legend" &&
    !player.legendXPBoostUnlocked
  ) {
    player.legendXPBoostUnlocked = true;
    changed = true;

    if (!player.ownedTitles.includes("rank_Legend")) {
      player.ownedTitles.push("rank_Legend");
    }

    showNotification(
      "👑 LEGEND到達！ 永久XP 1.5倍を獲得！",
      5000
    );
  }

  if (changed) {
    await savePlayer();
  }
}


/* =========================================================
   DATE RESET
========================================================= */

async function handleDateReset() {
  if (!player) return;

  const today = getDateKey();

  if (player.currentDateKey === today) {
    return;
  }

  player.currentDateKey = today;
  player.todayStudyMinutes = 0;
  player.todayXP = 0;
  player.todayCoins = 0;

  await savePlayer();
}


/* =========================================================
   SEASON RESET
========================================================= */

async function handleSeasonReset() {
  if (!player) return;

  const currentSeason = getMonthKey();

  if (!player.seasonKey) {
    player.seasonKey = currentSeason;
    player.seasonStudyMinutes = 0;
    return;
  }

  if (player.seasonKey === currentSeason) {
    return;
  }

  const oldRank = getRankByMinutes(
    player.seasonStudyMinutes
  );

  await giveSeasonEndReward(oldRank);

  player.seasonKey = currentSeason;
  player.seasonStudyMinutes = 0;

  /*
    シーズン終了時にランクをリセット。
    XP / 総勉強時間 / レベルは維持。
  */

  await savePlayer();

  showNotification(
    `🏆 ${oldRank.label}シーズン終了！ 新シーズン開始！`,
    5000
  );
}


/* =========================================================
   SEASON END REWARD
========================================================= */

function getSeasonReward(rankName) {
  const rewards = {
    Bronze: {
      xp: 50,
      coins: 100
    },
    Silver: {
      xp: 100,
      coins: 200
    },
    Gold: {
      xp: 200,
      coins: 400
    },
    Platinum: {
      xp: 350,
      coins: 700
    },
    Diamond: {
      xp: 550,
      coins: 1000
    },
    Master: {
      xp: 800,
      coins: 1500
    },
    Grandmaster: {
      xp: 1100,
      coins: 2200
    },
    Legend: {
      xp: 1600,
      coins: 3000
    }
  };

  return rewards[rankName] || rewards.Bronze;
}

async function giveSeasonEndReward(rank) {
  if (!player) return;

  const reward = getSeasonReward(rank.name);

  const xpGain = Math.floor(
    reward.xp * getActiveXPMultiplier()
  );

  player.xp += xpGain;
  player.coins += reward.coins;

  const newLevelInfo = calculateLevelFromXP(player.xp);

  const oldLevel = player.level;

  player.level = newLevelInfo.level;

  if (newLevelInfo.level > oldLevel) {
    await handleLevelUp(
      oldLevel,
      newLevelInfo.level
    );
  }

  showNotification(
    `🎁 シーズン報酬！ ${rank.label}：+${xpGain} XP / +${reward.coins} 🪙`,
    5000
  );
}


/* =========================================================
   LEVEL UP
========================================================= */

async function handleLevelUp(oldLevel, newLevel) {
  if (!player) return;

  if (newLevel <= oldLevel) return;

  setText("level-up-old-level", oldLevel);
  setText("level-up-new-level", newLevel);

  /*
    モーダルが存在する場合のみ表示。
    存在しなくてもゲームは停止しない。
  */

  const modal = $("level-up-modal");

  if (modal) {
    show(modal);
  }

  showNotification(
    `✨ LEVEL UP! Lv.${oldLevel} → Lv.${newLevel}！`,
    4000
  );

  /*
    10レベルごとのスター報酬。
  */

  if (
    newLevel % 10 === 0 &&
    newLevel > oldLevel
  ) {
    player.stars =
      Number(player.stars || 0) + 1;

    showNotification(
      "⭐ スターを1個獲得！",
      3000
    );
  }
}


/* =========================================================
   STUDY REWARD CALCULATION
========================================================= */

function calculateStudyReward(minutes) {
  const baseMinutes = Math.max(
    0,
    Math.floor(Number(minutes) || 0)
  );

  const multiplier = getActiveXPMultiplier();

  const xp = Math.floor(
    baseMinutes * multiplier
  );

  const coins = baseMinutes;

  return {
    minutes: baseMinutes,
    xp,
    coins,
    multiplier
  };
}


/* =========================================================
   SUBJECT LEVEL
   30分 = +1
========================================================= */

function getSubjectLevel(subject) {
  if (!player) return 1;

  const value = Number(
    player.subjectLevels?.[subject] || 1
  );

  return Math.max(
    1,
    Math.min(100, value)
  );
}

function calculateSubjectLevelFromMinutes(minutes) {
  return Math.max(
    1,
    Math.min(
      100,
      1 + Math.floor(
        Math.max(0, Number(minutes) || 0) / 30
      )
    )
  );
}


/* =========================================================
   ADD STUDY REWARD
========================================================= */

async function applyStudyReward(
  subject,
  minutes,
  options = {}
) {
  if (!player) {
    throw new Error("プレイヤーデータがありません。");
  }

  const amount = Math.floor(
    Number(minutes) || 0
  );

  if (amount < 1) {
    throw new Error(
      "勉強時間は1分以上にしてください。"
    );
  }

  const reward = calculateStudyReward(amount);

  const oldLevel = player.level;

  /*
    全体
  */

  player.xp += reward.xp;
  player.coins += reward.coins;

  player.totalStudyMinutes += amount;
  player.todayStudyMinutes += amount;

  player.todayXP += reward.xp;
  player.todayCoins += reward.coins;

  player.seasonStudyMinutes += amount;

  /*
    教科
  */

  if (!player.subjectStudyMinutes) {
    player.subjectStudyMinutes = {};
  }

  if (!player.subjectLevels) {
    player.subjectLevels = {};
  }

  player.subjectStudyMinutes[subject] =
    Number(
      player.subjectStudyMinutes[subject] || 0
    ) + amount;

  player.subjectLevels[subject] =
    calculateSubjectLevelFromMinutes(
      player.subjectStudyMinutes[subject]
    );

  /*
    レベル再計算
  */

  const levelInfo =
    calculateLevelFromXP(player.xp);

  player.level = levelInfo.level;

  /*
    Legend永久ブースト
  */

  if (
    getRankByMinutes(player.seasonStudyMinutes).name ===
      "Legend" &&
    !player.legendXPBoostUnlocked
  ) {
    player.legendXPBoostUnlocked = true;
  }

  await savePlayer();

  /*
    レベルアップ処理
  */

  if (player.level > oldLevel) {
    await handleLevelUp(
      oldLevel,
      player.level
    );
  }

  /*
    クエスト進行
  */

  await updateQuestProgressFromStudy(
    subject,
    amount
  );

  /*
    ボスダメージ
  */

  await applyBossDamage(
    subject,
    amount
  );

  /*
    レアクエスト判定
  */

  await checkRareQuest();

  return reward;
}


/* =========================================================
   STUDY RECORD
========================================================= */

async function createStudyRecord(
  subject,
  minutes,
  note = "",
  source = "manual"
) {
  if (!currentUser || !player) {
    throw new Error(
      "ログイン情報がありません。"
    );
  }

  const amount = Math.floor(
    Number(minutes) || 0
  );

  if (amount < 1) {
    throw new Error(
      "勉強時間は1分以上にしてください。"
    );
  }

  const recordRef = collection(
    db,
    "users",
    currentUser.uid,
    "studyRecords"
  );

  const record = {
    subject,
    minutes: amount,
    note: String(note || "").slice(0, 500),
    source,
    dateKey: getDateKey(),
    monthKey: getMonthKey(),
    weekKey: getWeekKey(),
    createdAt: serverTimestamp()
  };

  await addDoc(recordRef, record);

  return record;
}


/* =========================================================
   COMPLETE STUDY RECORD
========================================================= */

async function recordStudy(
  subject,
  minutes,
  note = "",
  source = "manual"
) {
  if (!player) {
    throw new Error(
      "プレイヤーデータがありません。"
    );
  }

  if (!SUBJECTS[subject]) {
    throw new Error(
      "正しい教科を選択してください。"
    );
  }

  const amount = Math.floor(
    Number(minutes) || 0
  );

  if (amount < 1) {
    throw new Error(
      "勉強時間は1分以上にしてください。"
    );
  }

  await createStudyRecord(
    subject,
    amount,
    note,
    source
  );

  const reward =
    await applyStudyReward(
      subject,
      amount
    );

  return reward;
}


/* =========================================================
   TIMER - LOCAL STORAGE
========================================================= */

const TIMER_STORAGE_KEY =
  "juken_rpg_timer_v2";

function saveTimerLocal() {
  try {
    localStorage.setItem(
      TIMER_STORAGE_KEY,
      JSON.stringify(timerState)
    );
  } catch (error) {
    console.warn(
      "タイマー保存失敗:",
      error
    );
  }
}

function loadTimerLocal() {
  try {
    const raw =
      localStorage.getItem(
        TIMER_STORAGE_KEY
      );

    if (!raw) return;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    timerState = {
      ...timerState,
      ...parsed
    };
  } catch (error) {
    console.warn(
      "タイマー復元失敗:",
      error
    );

    timerState = {
      running: false,
      startedAt: null,
      elapsedSeconds: 0,
      lastPersistedSeconds: 0,
      lastDateKey: getDateKey()
    };
  }
}


/* =========================================================
   TIMER DISPLAY
========================================================= */

function formatDuration(totalSeconds) {
  const seconds = Math.max(
    0,
    Math.floor(Number(totalSeconds) || 0)
  );

  const hours =
    Math.floor(seconds / 3600);

  const minutes =
    Math.floor((seconds % 3600) / 60);

  const secs =
    seconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0")
  ].join(":");
}

function getTimerElapsedSeconds() {
  if (!timerState.running) {
    return Math.max(
      0,
      Number(timerState.elapsedSeconds) || 0
    );
  }

  if (!timerState.startedAt) {
    return Math.max(
      0,
      Number(timerState.elapsedSeconds) || 0
    );
  }

  const current =
    Date.now();

  const started =
    Number(timerState.startedAt);

  const extra =
    Math.max(
      0,
      Math.floor(
        (current - started) / 1000
      )
    );

  return (
    Number(timerState.elapsedSeconds || 0) +
    extra
  );
}

function updateTimerDisplay() {
  setText(
    "study-timer-display",
    formatDuration(
      getTimerElapsedSeconds()
    )
  );
}


/* =========================================================
   TIMER DATE BOUNDARY
========================================================= */

async function handleTimerDateBoundary() {
  if (!timerState.running) return;

  const currentDate =
    getDateKey();

  const timerDate =
    timerState.lastDateKey;

  if (!timerDate) {
    timerState.lastDateKey =
      currentDate;

    saveTimerLocal();

    return;
  }

  if (timerDate === currentDate) {
    return;
  }

  /*
    日付をまたいだ場合、
    前日の分をその時点で確定する。

    「何時まで勉強したか」は
    現在のタイマー値から計算する。
  */

  const totalSeconds =
    getTimerElapsedSeconds();

  const totalMinutes =
    Math.floor(
      totalSeconds / 60
    );

  const alreadySaved =
    Number(
      timerState.lastPersistedSeconds || 0
    );

  const unsavedSeconds =
    Math.max(
      0,
      totalSeconds - alreadySaved
    );

  const minutesToSave =
    Math.floor(
      unsavedSeconds / 60
    );

  if (
    minutesToSave >= 1 &&
    player
  ) {
    const subject =
      timerState.subject ||
      getSelectedStudySubject();

    if (subject) {
      try {
        await recordStudy(
          subject,
          minutesToSave,
          "タイマー日付跨ぎ自動保存",
          "timer-midnight"
        );

        timerState.lastPersistedSeconds =
          alreadySaved +
          minutesToSave * 60;
      } catch (error) {
        console.error(
          "タイマー日付跨ぎ保存失敗:",
          error
        );
      }
    }
  }

  timerState.elapsedSeconds =
    totalSeconds;

  timerState.startedAt =
    Date.now();

  timerState.lastPersistedSeconds = 0;

  timerState.lastDateKey =
    currentDate;

  saveTimerLocal();

  showNotification(
    "🌅 日付が変わったため、昨日の勉強時間を自動保存しました。",
    5000
  );
}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {
  if (timerState.running) return;

  timerState.running = true;
  timerState.startedAt = Date.now();

  timerState.lastDateKey =
    getDateKey();

  saveTimerLocal();

  stopTimerInterval();

  timerInterval =
    setInterval(
      async () => {
        updateTimerDisplay();

        await handleTimerDateBoundary();
      },
      1000
    );

  updateTimerDisplay();

  showNotification(
    "⏱️ タイマースタート！"
  );
}

function pauseTimer() {
  if (!timerState.running) {
    return;
  }

  timerState.elapsedSeconds =
    getTimerElapsedSeconds();

  timerState.running = false;
  timerState.startedAt = null;

  saveTimerLocal();

  stopTimerInterval();
  updateTimerDisplay();

  showNotification(
    "⏸️ タイマーを一時停止しました。"
  );
}

function resetTimer() {
  stopTimerInterval();

  timerState = {
    running: false,
    startedAt: null,
    elapsedSeconds: 0,
    lastPersistedSeconds: 0,
    lastDateKey: getDateKey(),
    subject: null
  };

  saveTimerLocal();
  updateTimerDisplay();

  showNotification(
    "🔄 タイマーをリセットしました。"
  );
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(
      timerInterval
    );

    timerInterval = null;
  }
}

function getSelectedStudySubject() {
  return $("study-subject")?.value || null;
}


/* =========================================================
   TIMER SAVE
========================================================= */

async function saveTimerStudy() {
  if (!player) {
    showNotification(
      "ログインしてください。"
    );
    return;
  }

  const subject =
    getSelectedStudySubject();

  if (!subject) {
    showNotification(
      "先に教科を選択してください。"
    );
    return;
  }

  const totalSeconds =
    getTimerElapsedSeconds();

  const totalMinutes =
    Math.floor(
      totalSeconds / 60
    );

  const alreadySavedSeconds =
    Number(
      timerState.lastPersistedSeconds || 0
    );

  const unsavedSeconds =
    Math.max(
      0,
      totalSeconds -
      alreadySavedSeconds
    );

  const minutes =
    Math.floor(
      unsavedSeconds / 60
    );

  if (minutes < 1) {
    showNotification(
      "記録できる未保存時間が1分未満です。"
    );
    return;
  }

  const reward =
    await recordStudy(
      subject,
      minutes,
      "タイマー記録",
      "timer"
    );

  timerState.lastPersistedSeconds =
    alreadySavedSeconds +
    minutes * 60;

  /*
    記録後もタイマーは継続可能。
  */

  saveTimerLocal();

  showNotification(
    `⏱️ ${minutes}分記録！ +${reward.xp} XP / +${reward.coins} 🪙`,
    4000
  );

  await refreshAll();
}


/* =========================================================
   QUEST PLACEHOLDER
   PART 2で完全実装
========================================================= */

async function updateQuestProgressFromStudy(
  subject,
  minutes
) {
  /*
    PART 2で完全実装。
    ここではゲーム全体を止めないため
    安全な空関数として保持。
  */
  return {
    subject,
    minutes
  };
}


/* =========================================================
   BOSS PLACEHOLDER
   PART 2で完全実装
========================================================= */

async function applyBossDamage(
  subject,
  minutes
) {
  /*
    PART 2で完全実装。
  */
  return {
    subject,
    minutes,
    damage: minutes
  };
}

async function checkRareQuest() {
  /*
    PART 2で完全実装。
  */
}


/* =========================================================
   SEASON / RANK DISPLAY
========================================================= */

function updateRankDisplay() {
  if (!player) return;

  const rank =
    getRankByMinutes(
      player.seasonStudyMinutes
    );

  setText(
    "header-rank",
    rank.label
  );

  setText(
    "home-rank",
    rank.label
  );

  setText(
    "current-rank-name",
    rank.label
  );

  setText(
    "current-season-study-time",
    formatStudyHours(
      player.seasonStudyMinutes
    )
  );

  setText(
    "home-season-study-time",
    formatStudyHours(
      player.seasonStudyMinutes
    )
  );

  setText(
    "home-season-end",
    getNextMonthStartJST()
  );
}

function formatStudyHours(minutes) {
  const value =
    Math.max(
      0,
      Number(minutes) || 0
    );

  const hours =
    Math.floor(value / 60);

  const mins =
    value % 60;

  if (hours === 0) {
    return `${mins}分`;
  }

  if (mins === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${mins}分`;
}


/* =========================================================
   HEADER
========================================================= */

function refreshHeader() {
  if (!player) return;

  const levelInfo =
    calculateLevelFromXP(
      player.xp
    );

  const rank =
    getRankByMinutes(
      player.seasonStudyMinutes
    );

  setText(
    "header-display-name",
    player.displayName || "冒険者"
  );

  setText(
    "header-level",
    `Lv.${levelInfo.level}`
  );

  setText(
    "header-rank",
    rank.label
  );

  setText(
    "header-coins",
    `🪙 ${Number(player.coins || 0).toLocaleString()}`
  );

  updateRankDisplay();
}


/* =========================================================
   HOME STATUS
========================================================= */

function refreshHomeStatus() {
  if (!player) return;

  const info =
    calculateLevelFromXP(
      player.xp
    );

  setText(
    "home-level",
    info.level
  );

  setText(
    "home-xp",
    `${info.currentXP} XP`
  );

  if (info.level >= MAX_LEVEL) {
    setText(
      "home-xp-required",
      "MAX LEVEL"
    );
  } else {
    setText(
      "home-xp-required",
      `次のレベルまで ${info.requiredXP - info.currentXP} XP`
    );
  }

  const percentage =
    info.level >= MAX_LEVEL
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            (
              info.currentXP /
              info.requiredXP
            ) * 100
          )
        );

  const progress =
    $("level-progress");

  if (progress) {
    progress.style.width =
      `${percentage}%`;
  }

  setText(
    "star-count",
    `⭐ ${Number(player.stars || 0)}`
  );

  setText(
    "star-title",
    player.equippedTitle === "default_title"
      ? "無名の冒険者"
      : getTitleName(
          player.equippedTitle
        )
  );

  setText(
    "today-study-time",
    formatStudyHours(
      player.todayStudyMinutes
    )
  );

  setText(
    "today-xp",
    `${Number(player.todayXP || 0)} XP`
  );

  setText(
    "today-coins",
    `🪙 ${Number(player.todayCoins || 0)}`
  );
}


/* =========================================================
   TITLES
========================================================= */

const RANK_TITLE_MAP = {
  rank_Bronze: "駆け出しの冒険者",
  rank_Silver: "努力する者",
  rank_Gold: "黄金の探求者",
  rank_Platinum: "白金の猛者",
  rank_Diamond: "ダイヤモンド級",
  rank_Master: "受験マスター",
  rank_Grandmaster: "グランドマスター",
  rank_Legend: "伝説の受験生"
};

const SPECIAL_TITLES = {
  default_title: "無名の冒険者",
  hidden_intelligence: "あり得ない知能",
  beyond_success: "合格の向こう側"
};

function getTitleName(id) {
  return (
    RANK_TITLE_MAP[id] ||
    SPECIAL_TITLES[id] ||
    String(id || "無名の冒険者")
  );
}


/* =========================================================
   THEME
========================================================= */

function applyTheme() {
  if (!player) return;

  const theme =
    player.equippedTheme ||
    "default_theme";

  document.documentElement.dataset.theme =
    theme;
}


/* =========================================================
   SCREEN NAVIGATION
========================================================= */

function switchScreen(screenId) {
  const screens =
    safeQueryAll(
      ".app-screen"
    );

  for (const screen of screens) {
    if (screen.id === screenId) {
      show(screen);
    } else {
      hide(screen);
    }
  }

  safeQueryAll(
    "[data-screen]"
  ).forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.screen === screenId
    );
  });

  /*
    画面を切り替えたときに
    必要な描画だけ安全に更新。
  */

  if (screenId === "home-screen") {
    safeRefresh(
      "home",
      renderHome
    );
  }

  if (screenId === "study-screen") {
    safeRefresh(
      "study",
      renderStudyPage
    );
  }

  if (screenId === "quest-screen") {
    safeRefresh(
      "quest",
      renderQuests
    );
  }

  if (screenId === "party-screen") {
    safeRefresh(
      "party",
      renderParty
    );
  }

  if (screenId === "rank-screen") {
    safeRefresh(
      "rank",
      renderRank
    );
  }

  if (screenId === "other-screen") {
    safeRefresh(
      "other",
      renderOther
    );
  }
}


/* =========================================================
   SAFE REFRESH
========================================================= */

async function safeRefresh(
  name,
  fn
) {
  try {
    await fn();
  } catch (error) {
    console.error(
      `[${name}] render error:`,
      error
    );

    showNotification(
      `${name}の読み込み中に一部エラーが発生しました。`
    );
  }
}


/* =========================================================
   PLACEHOLDER RENDER FUNCTIONS
   PART 2 / PART 3で完全実装
========================================================= */

async function renderHome() {
  if (!player) return;

  refreshHomeStatus();
  refreshHeader();

  setText(
    "today-quests",
    "0"
  );
}

async function renderStudyPage() {
  if (!player) return;

  populateStudySubjects();
  renderSubjectLevels();
  renderSubjectStudySummary();
  await renderStudyHistory();

  loadTimerLocal();
  updateTimerDisplay();

  if (
    timerState.running &&
    !timerInterval
  ) {
    timerInterval =
      setInterval(
        async () => {
          updateTimerDisplay();
          await handleTimerDateBoundary();
        },
        1000
      );
  }
}

async function renderQuests() {
  if (!player) return;

  setText(
    "daily-quest-list",
    "クエストを読み込み中..."
  );

  setText(
    "weekly-quest-list",
    "クエストを読み込み中..."
  );
}

async function renderParty() {
  if (!player) return;

  setText(
    "party-member-list",
    "パーティーを読み込み中..."
  );

  setText(
    "party-member-count",
    "0"
  );
}

async function renderFriends() {
  if (!player) return;

  setText(
    "friend-list",
    "フレンドを読み込み中..."
  );
}

async function renderFriendRequests() {
  if (!player) return;

  setText(
    "friend-request-list",
    "申請を読み込み中..."
  );
}

async function renderBoss() {
  if (!player) return;

  setText(
    "boss-current-hp",
    "1000"
  );

  setText(
    "boss-max-hp",
    "1000"
  );
}

async function renderRank() {
  if (!player) return;

  updateRankDisplay();

  /*
    ランキングは最終仕様で廃止。
    既存HTMLを壊さず、表示だけ無効化。
  */

  setText(
    "friends-ranking-list",
    "ランキング機能は廃止されました。"
  );

  setText(
    "global-ranking-list",
    "ランキング機能は廃止されました。"
  );

  setText(
    "global-rank-number",
    "-"
  );
}

async function renderShop() {
  if (!player) return;

  setText(
    "shop-coin-count",
    `🪙 ${Number(player.coins || 0).toLocaleString()}`
  );
}

async function renderLocker() {
  if (!player) return;
}

async function renderAchievements() {
  if (!player) return;

  setText(
    "achievement-count",
    `${player.achievements?.length || 0}`
  );
}

async function renderProfile() {
  if (!player) return;

  setText(
    "profile-display-name",
    player.displayName
  );

  setText(
    "profile-user-id",
    player.userId
  );

  setText(
    "profile-course",
    getCourseName(player.course)
  );

  setText(
    "profile-level",
    `Lv.${player.level}`
  );

  setText(
    "profile-xp",
    `${player.xp} XP`
  );

  setText(
    "profile-stars",
    `⭐ ${player.stars}`
  );

  setText(
    "profile-coins",
    `🪙 ${player.coins}`
  );

  setText(
    "profile-title",
    getTitleName(
      player.equippedTitle
    )
  );

  setText(
    "profile-total-study-time",
    formatStudyHours(
      player.totalStudyMinutes
    )
  );

  setText(
    "profile-total-xp",
    `${player.xp} XP`
  );

  setText(
    "profile-total-coins",
    `🪙 ${player.coins}`
  );

  setText(
    "profile-bosses-defeated",
    player.bossesDefeated
  );

  setText(
    "profile-quests-completed",
    player.totalQuestsCompleted
  );

  renderProfileSubjects();
}

async function renderOther() {
  if (!player) return;

  await renderAchievements();
  await renderShop();
  await renderLocker();
  await renderProfile();
}


/* =========================================================
   COURSE
========================================================= */

function getCourseName(course) {
  const names = {
    science: "理系",
    humanities: "文系",
    undecided: "未定"
  };

  return names[course] || "未定";
}


/* =========================================================
   SUBJECT UI
========================================================= */

function populateStudySubjects() {
  const select =
    $("study-subject");

  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    `<option value="">教科を選択</option>`;

  const subjects =
    Array.isArray(player?.subjects)
      ? player.subjects
      : [];

  for (const subject of subjects) {
    const option =
      document.createElement("option");

    option.value = subject;
    option.textContent =
      `${getSubjectIcon(subject)} ${getSubjectName(subject)}`;

    select.appendChild(option);
  }

  if (
    current &&
    subjects.includes(current)
  ) {
    select.value = current;
  }
}

function renderSubjectLevels() {
  const container =
    $("subject-level-list");

  if (!container || !player) {
    return;
  }

  const subjects =
    Array.isArray(player.subjects)
      ? player.subjects
      : [];

  if (subjects.length === 0) {
    container.innerHTML =
      `<p class="empty-message">受験教科が登録されていません。</p>`;
    return;
  }

  container.innerHTML =
    subjects.map(subject => {
      const level =
        getSubjectLevel(subject);

      return `
        <div class="subject-level-row">
          <span>
            ${getSubjectIcon(subject)}
            ${escapeHTML(getSubjectName(subject))}
          </span>
          <strong>Lv.${level}</strong>
        </div>
      `;
    }).join("");
}

function renderSubjectStudySummary() {
  const container =
    $("subject-study-list");

  if (!container || !player) {
    return;
  }

  const subjects =
    Array.isArray(player.subjects)
      ? player.subjects
      : [];

  if (subjects.length === 0) {
    container.innerHTML =
      `<p class="empty-message">記録なし</p>`;
    return;
  }

  container.innerHTML =
    subjects.map(subject => {
      const minutes =
        Number(
          player.subjectStudyMinutes?.[subject] || 0
        );

      return `
        <div class="subject-study-row">
          <span>
            ${getSubjectIcon(subject)}
            ${escapeHTML(getSubjectName(subject))}
          </span>
          <strong>
            ${formatStudyHours(minutes)}
          </strong>
        </div>
      `;
    }).join("");
}

function renderProfileSubjects() {
  const container =
    $("profile-subject-list");

  if (!container || !player) {
    return;
  }

  const subjects =
    Array.isArray(player.subjects)
      ? player.subjects
      : [];

  container.innerHTML =
    subjects.length
      ? subjects.map(subject => `
          <span class="subject-tag">
            ${getSubjectIcon(subject)}
            ${escapeHTML(getSubjectName(subject))}
          </span>
        `).join("")
      : "未登録";
}


/* =========================================================
   STUDY HISTORY
========================================================= */

async function renderStudyHistory() {
  const container =
    $("study-history-list");

  if (!container || !currentUser) {
    return;
  }

  try {
    const ref =
      collection(
        db,
        "users",
        currentUser.uid,
        "studyRecords"
      );

    const snap =
      await getDocs(ref);

    const records =
      snap.docs
        .map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        .sort(
          (a, b) =>
            getTimestampMillis(b.createdAt) -
            getTimestampMillis(a.createdAt)
        )
        .slice(0, 50);

    if (records.length === 0) {
      container.innerHTML =
        `<p class="empty-message">まだ勉強履歴がありません。</p>`;
      return;
    }

    container.innerHTML =
      records.map(record => `
        <div class="history-item">
          <div>
            <strong>
              ${getSubjectIcon(record.subject)}
              ${escapeHTML(getSubjectName(record.subject))}
            </strong>
            <small>
              ${escapeHTML(record.dateKey || "")}
            </small>
          </div>

          <strong>
            ${Number(record.minutes || 0)}分
          </strong>

          ${
            record.note
              ? `<p>${escapeHTML(record.note)}</p>`
              : ""
          }
        </div>
      `).join("");

  } catch (error) {
    console.error(
      "study history error:",
      error
    );

    container.innerHTML =
      `<p class="empty-message">履歴を読み込めませんでした。</p>`;
  }
}

function getTimestampMillis(timestamp) {
  if (!timestamp) return 0;

  if (
    typeof timestamp.toMillis === "function"
  ) {
    return timestamp.toMillis();
  }

  if (
    timestamp instanceof Date
  ) {
    return timestamp.getTime();
  }

  if (
    typeof timestamp === "string"
  ) {
    return Date.parse(timestamp) || 0;
  }

  if (
    typeof timestamp === "number"
  ) {
    return timestamp;
  }

  return 0;
}


/* =========================================================
   SETTINGS SUBJECTS
========================================================= */

function populateSettingsSubjects() {
  const container =
    $("settings-subject-selection");

  if (!container || !player) {
    return;
  }

  const boxes =
    container.querySelectorAll(
      'input[name="settings-subjects"]'
    );

  boxes.forEach(box => {
    box.checked =
      player.subjects.includes(
        box.value
      );
  });
}


/* =========================================================
   AUTH SCREEN
========================================================= */

function showAuthScreen() {
  show($("auth-screen"));
  hide($("main-app"));

  show($("login-screen"));
  hide($("register-screen"));
}

function showMainApp() {
  hide($("auth-screen"));
  show($("main-app"));
}


/* =========================================================
   LOGIN
========================================================= */

async function login(event) {
  event?.preventDefault();

  const errorEl =
    $("login-error");

  if (errorEl) {
    errorEl.textContent = "";
  }

  const userId =
    normalizeUserId(
      $("login-user-id")?.value
    );

  const password =
    $("login-password")?.value || "";

  if (!userId || !password) {
    if (errorEl) {
      errorEl.textContent =
        "ユーザーIDとパスワードを入力してください。";
    }

    return;
  }

  const button =
    $("login-button");

  if (button) {
    button.disabled = true;
    button.textContent =
      "ログイン中...";
  }

  try {
    await signInWithEmailAndPassword(
      auth,
      userIdToEmail(userId),
      password
    );

  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    if (errorEl) {
      errorEl.textContent =
        friendlyFirebaseError(error);
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "ログイン";
    }
  }
}


/* =========================================================
   REGISTER
========================================================= */

async function register(event) {
  event?.preventDefault();

  const errorEl =
    $("register-error");

  const subjectError =
    $("subject-error");

  if (errorEl) {
    errorEl.textContent = "";
  }

  if (subjectError) {
    subjectError.textContent = "";
  }

  const userId =
    normalizeUserId(
      $("register-user-id")?.value
    );

  const password =
    $("register-password")?.value || "";

  const confirm =
    $("register-password-confirm")?.value || "";

  const displayName =
    String(
      $("register-display-name")?.value || ""
    ).trim();

  const course =
    document.querySelector(
      'input[name="course"]:checked'
    )?.value || "undecided";

  const subjects =
    safeQueryAll(
      'input[name="subjects"]:checked'
    ).map(
      input => input.value
    );

  if (!isValidUserId(userId)) {
    if (errorEl) {
      errorEl.textContent =
        "ユーザーIDは英数字・_・-のみ、3〜30文字で入力してください。";
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

  if (password !== confirm) {
    if (errorEl) {
      errorEl.textContent =
        "パスワード確認が一致しません。";
    }

    return;
  }

  if (!displayName) {
    if (errorEl) {
      errorEl.textContent =
        "表示名を入力してください。";
    }

    return;
  }

  if (subjects.length === 0) {
    if (subjectError) {
      subjectError.textContent =
        "少なくとも1教科選択してください。";
    }

    return;
  }

  const button =
    $("register-button");

  if (button) {
    button.disabled = true;
    button.textContent =
      "登録中...";
  }

  try {
    /*
      Auth作成
    */

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        userIdToEmail(userId),
        password
      );

    /*
      Firestoreユーザーデータ作成
    */

    const initialPlayer =
      createDefaultPlayer({
        userId,
        displayName,
        course,
        subjects
      });

    const userRef =
      doc(
        db,
        "users",
        credential.user.uid
      );

    await setDoc(
      userRef,
      {
        ...initialPlayer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    player = initialPlayer;

    showNotification(
      "🎉 冒険者登録完了！"
    );

  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    if (errorEl) {
      errorEl.textContent =
        friendlyFirebaseError(error);
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "冒険を始める";
    }
  }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  try {
    stopTimerInterval();

    await signOut(auth);

  } catch (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    );

    showNotification(
      "ログアウトに失敗しました。"
    );
  }
}


/* =========================================================
   EVENT SETUP
========================================================= */

function setupAuthEvents() {
  safeOn(
    $("login-form"),
    "submit",
    login
  );

  safeOn(
    $("register-form"),
    "submit",
    register
  );

  safeOn(
    $("show-register-button"),
    "click",
    () => {
      hide($("login-screen"));
      show($("register-screen"));
    }
  );

  safeOn(
    $("show-login-button"),
    "click",
    () => {
      hide($("register-screen"));
      show($("login-screen"));
    }
  );

  safeOn(
    $("logout-button"),
    "click",
    logout
  );
}


/* =========================================================
   NAV EVENTS
========================================================= */

function setupNavigationEvents() {
  safeQueryAll(
    "[data-screen]"
  ).forEach(button => {
    safeOn(
      button,
      "click",
      () => {
        const screen =
          button.dataset.screen;

        if (screen) {
          switchScreen(screen);
        }
      }
    );
  });
}


/* =========================================================
   TIMER EVENTS
========================================================= */

function setupTimerEvents() {
  safeOn(
    $("study-timer-start"),
    "click",
    startTimer
  );

  safeOn(
    $("study-timer-pause"),
    "click",
    pauseTimer
  );

  safeOn(
    $("study-timer-reset"),
    "click",
    resetTimer
  );

  safeOn(
    $("timer-save-button"),
    "click",
    async () => {
      try {
        await saveTimerStudy();
      } catch (error) {
        console.error(
          "TIMER SAVE ERROR:",
          error
        );

        showNotification(
          "タイマー記録に失敗しました。"
        );
      }
    }
  );
}


/* =========================================================
   STUDY FORM EVENTS
========================================================= */

function setupStudyEvents() {
  safeOn(
    $("study-record-form"),
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

      if (!subject) {
        if (errorEl) {
          errorEl.textContent =
            "教科を選択してください。";
        }

        return;
      }

      if (
        !Number.isFinite(minutes) ||
        minutes < 1
      ) {
        if (errorEl) {
          errorEl.textContent =
            "勉強時間は1分以上で入力してください。";
        }

        return;
      }

      const button =
        $("record-study-button");

      if (button) {
        button.disabled = true;
        button.textContent =
          "記録中...";
      }

      try {
        const reward =
          await recordStudy(
            subject,
            minutes,
            note,
            "manual"
          );

        if ($("study-minutes")) {
          $("study-minutes").value = "";
        }

        if ($("study-note")) {
          $("study-note").value = "";
        }

        showNotification(
          `📚 ${minutes}分記録！ +${reward.xp} XP / +${reward.coins} 🪙`,
          4000
        );

        await refreshAll();

      } catch (error) {
        console.error(
          "STUDY RECORD ERROR:",
          error
        );

        if (errorEl) {
          errorEl.textContent =
            error.message ||
            "勉強記録に失敗しました。";
        }

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent =
            "勉強を記録する";
        }
      }
    }
  );

  /*
    HTML側のmax=1440を解除。
    最終仕様では実質的な上限なし。
  */

  const minutesInput =
    $("study-minutes");

  if (minutesInput) {
    minutesInput.removeAttribute("max");
  }
}


/* =========================================================
   QUEST TAB EVENTS
========================================================= */

function setupQuestTabEvents() {
  safeQueryAll(
    "[data-quest-tab]"
  ).forEach(button => {
    safeOn(
      button,
      "click",
      () => {
        currentQuestTab =
          button.dataset.questTab ||
          "daily";

        safeQueryAll(
          "[data-quest-tab]"
        ).forEach(btn => {
          btn.classList.toggle(
            "active",
            btn === button
          );
        });

        const map = {
          daily: "daily-quest-tab",
          weekly: "weekly-quest-tab",
          boss: "boss-tab",
          history: "quest-history-tab"
        };

        Object.values(map)
          .forEach(id => hide($(id)));

        show(
          $(map[currentQuestTab])
        );

        if (
          currentQuestTab === "boss"
        ) {
          safeRefresh(
            "boss",
            renderBoss
          );
        }
      }
    );
  });
}


/* =========================================================
   PARTY TAB EVENTS
========================================================= */

function setupPartyTabEvents() {
  safeQueryAll(
    "[data-party-tab]"
  ).forEach(button => {
    safeOn(
      button,
      "click",
      () => {
        currentPartyTab =
          button.dataset.partyTab ||
          "party";

        safeQueryAll(
          "[data-party-tab]"
        ).forEach(btn => {
          btn.classList.toggle(
            "active",
            btn === button
          );
        });

        const map = {
          party: "party-tab",
          friends: "friends-tab",
          requests: "friend-requests-tab"
        };

        Object.values(map)
          .forEach(id => hide($(id)));

        show(
          $(map[currentPartyTab])
        );

        if (
          currentPartyTab === "friends"
        ) {
          safeRefresh(
            "friends",
            renderFriends
          );
        }

        if (
          currentPartyTab === "requests"
        ) {
          safeRefresh(
            "friend requests",
            renderFriendRequests
          );
        }
      }
    );
  });
}


/* =========================================================
   RANK TAB EVENTS
========================================================= */

function setupRankTabEvents() {
  safeQueryAll(
    "[data-rank-tab]"
  ).forEach(button => {
    safeOn(
      button,
      "click",
      () => {
        currentRankTab =
          button.dataset.rankTab ||
          "rank";

        safeQueryAll(
          "[data-rank-tab]"
        ).forEach(btn => {
          btn.classList.toggle(
            "active",
            btn === button
          );
        });

        const map = {
          rank: "rank-info-tab",
          ranking: "ranking-tab",
          history: "season-history-tab"
        };

        Object.values(map)
          .forEach(id => hide($(id)));

        show(
          $(map[currentRankTab])
        );

        /*
          ランキング廃止。
        */

        if (
          currentRankTab === "ranking"
        ) {
          const ranking =
            $("ranking-tab");

          if (ranking) {
            ranking.innerHTML =
              `<p class="empty-message">ランキング機能は廃止されました。</p>`;
          }
        }
      }
    );
  });
}


/* =========================================================
   OTHER TAB EVENTS
========================================================= */

function setupOtherTabEvents() {
  safeQueryAll(
    "[data-other-tab]"
  ).forEach(button => {
    safeOn(
      button,
      "click",
      () => {
        currentOtherTab =
          button.dataset.otherTab ||
          "menu";

        safeQueryAll(
          "[data-other-tab]"
        ).forEach(btn => {
          btn.classList.toggle(
            "active",
            btn === button
          );
        });

        const map = {
          menu: "other-menu-tab",
          achievement: "achievement-tab",
          shop: "shop-tab",
          locker: "locker-tab",
          profile: "profile-tab",
          settings: "settings-tab"
        };

        Object.values(map)
          .forEach(id => hide($(id)));

        show(
          $(map[currentOtherTab])
        );

        safeRefresh(
          "other",
          renderOther
        );
      }
    );
  });

  safeQueryAll(
    "[data-open-other-tab]"
  ).forEach(button => {
    safeOn(
      button,
      "click",
      () => {
        const tab =
          button.dataset.openOtherTab;

        if (!tab) return;

        currentOtherTab = tab;

        safeQueryAll(
          "[data-other-tab]"
        ).forEach(btn => {
          btn.classList.toggle(
            "active",
            btn.dataset.otherTab === tab
          );
        });

        const map = {
          menu: "other-menu-tab",
          achievement: "achievement-tab",
          shop: "shop-tab",
          locker: "locker-tab",
          profile: "profile-tab",
          settings: "settings-tab"
        };

        Object.values(map)
          .forEach(id => hide($(id)));

        show($(map[tab]));

        safeRefresh(
          "other",
          renderOther
        );
      }
    );
  });
}


/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModalEvents() {
  safeOn(
    $("level-up-close-button"),
    "click",
    () => {
      hide(
        $("level-up-modal")
      );
    }
  );

  safeOn(
    $("reward-close-button"),
    "click",
    () => {
      hide(
        $("reward-modal")
      );
    }
  );
}


/* =========================================================
   SETTINGS EVENTS
========================================================= */

function setupSettingsEvents() {
  /*
    表示名
  */

  safeOn(
    $("display-name-form"),
    "submit",
    async event => {
      event.preventDefault();

      if (!player) return;

      const errorEl =
        $("display-name-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const name =
        String(
          $("settings-display-name")?.value ||
          ""
        ).trim();

      if (!name) {
        if (errorEl) {
          errorEl.textContent =
            "表示名を入力してください。";
        }

        return;
      }

      player.displayName =
        name.slice(0, 30);

      try {
        await savePlayer();

        showNotification(
          "表示名を変更しました。"
        );

        await refreshAll();

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            "表示名の変更に失敗しました。";
        }
      }
    }
  );


  /*
    教科
  */

  safeOn(
    $("subject-settings-form"),
    "submit",
    async event => {
      event.preventDefault();

      if (!player) return;

      const errorEl =
        $("settings-subject-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const subjects =
        safeQueryAll(
          'input[name="settings-subjects"]:checked'
        ).map(
          input => input.value
        );

      if (subjects.length === 0) {
        if (errorEl) {
          errorEl.textContent =
            "少なくとも1教科選択してください。";
        }

        return;
      }

      player.subjects =
        subjects;

      try {
        await savePlayer();

        populateStudySubjects();
        renderSubjectLevels();
        renderSubjectStudySummary();
        renderProfileSubjects();

        showNotification(
          "受験教科を更新しました。"
        );

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            "教科設定の更新に失敗しました。";
        }
      }
    }
  );


  /*
    パスワード
  */

  safeOn(
    $("password-form"),
    "submit",
    async event => {
      event.preventDefault();

      if (!currentUser) return;

      const errorEl =
        $("password-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const password =
        $("settings-new-password")?.value ||
        "";

      if (password.length < 6) {
        if (errorEl) {
          errorEl.textContent =
            "パスワードは6文字以上にしてください。";
        }

        return;
      }

      try {
        await updatePassword(
          currentUser,
          password
        );

        if ($("settings-new-password")) {
          $("settings-new-password").value = "";
        }

        showNotification(
          "🔐 パスワードを変更しました。"
        );

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            friendlyFirebaseError(error);
        }
      }
    }
  );


  /*
    アカウント削除
  */

  safeOn(
    $("delete-account-button"),
    "click",
    async () => {
      if (!currentUser) return;

      const confirmed =
        window.confirm(
          "本当にアカウントを削除しますか？\n\nこの操作は取り消せません。"
        );

      if (!confirmed) return;

      try {
        const uid =
          currentUser.uid;

        await deleteDoc(
          doc(
            db,
            "users",
            uid
          )
        );

        await deleteUser(
          currentUser
        );

        player = null;
        currentUser = null;

        showAuthScreen();

      } catch (error) {
        console.error(
          "DELETE ACCOUNT ERROR:",
          error
        );

        showNotification(
          friendlyFirebaseError(error),
          5000
        );
      }
    }
  );
}


/* =========================================================
   ALL EVENTS
========================================================= */

function setupEvents() {
  setupAuthEvents();
  setupNavigationEvents();
  setupTimerEvents();
  setupStudyEvents();
  setupQuestTabEvents();
  setupPartyTabEvents();
  setupRankTabEvents();
  setupOtherTabEvents();
  setupModalEvents();
  setupSettingsEvents();
}


/* =========================================================
   REFRESH ALL
========================================================= */

async function refreshAll() {
  if (!player) return;

  if (refreshInProgress) {
    return;
  }

  refreshInProgress = true;

  try {
    await handleDateReset();
    await handleSeasonReset();

    await safeRefresh(
      "header",
      async () => {
        refreshHeader();
      }
    );

    await safeRefresh(
      "home",
      renderHome
    );

    await safeRefresh(
      "study",
      renderStudyPage
    );

    await safeRefresh(
      "quests",
      renderQuests
    );

    await safeRefresh(
      "party",
      renderParty
    );

    await safeRefresh(
      "friends",
      renderFriends
    );

    await safeRefresh(
      "friend requests",
      renderFriendRequests
    );

    await safeRefresh(
      "boss",
      renderBoss
    );

    await safeRefresh(
      "rank",
      renderRank
    );

    await safeRefresh(
      "shop",
      renderShop
    );

    await safeRefresh(
      "locker",
      renderLocker
    );

    await safeRefresh(
      "achievements",
      renderAchievements
    );

    await safeRefresh(
      "profile",
      renderProfile
    );

    populateSettingsSubjects();

  } finally {
    refreshInProgress = false;
  }
}


/* =========================================================
   START APP
========================================================= */

async function startApp() {
  if (!currentUser) return;

  /*
    重要：
    Firestore読み込み成功後にのみ
    main-appを表示する。
  */

  await loadPlayer();

  if (!player) {
    throw new Error(
      "プレイヤーデータを読み込めませんでした。"
    );
  }

  applyTheme();

  await refreshAll();

  showMainApp();

  switchScreen(
    "home-screen"
  );

  appStarted = true;
}


/* =========================================================
   AUTH STATE
========================================================= */

function setupAuthListener() {
  if (authListenerStarted) {
    return;
  }

  authListenerStarted = true;

  onAuthStateChanged(
    auth,
    async user => {
      if (!user) {
        currentUser = null;
        player = null;
        appStarted = false;

        stopTimerInterval();

        showAuthScreen();

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

        /*
          アプリ初期化に失敗しても
          真っ白にしない。
        */

        hide($("main-app"));
        show($("auth-screen"));

        const loginError =
          $("login-error");

        if (loginError) {
          loginError.textContent =
            "ゲームデータの読み込みに失敗しました。ページを再読み込みしてください。";
        }

        showNotification(
          "ゲームデータの読み込みに失敗しました。",
          5000
        );
      }
    }
  );
}


/* =========================================================
   BOOT
========================================================= */

async function boot() {
  if (booted) return;

  booted = true;

  try {
    /*
      初期画面は必ず認証画面。
    */

    showAuthScreen();

    /*
      ローカルタイマー復元。
    */

    loadTimerLocal();
    updateTimerDisplay();

    /*
      イベントを安全に登録。
    */

    setupEvents();

    /*
      Firebase Auth監視開始。
    */

    setupAuthListener();

    console.log(
      "受験RPG initialized successfully."
    );

  } catch (error) {
    console.error(
      "FATAL BOOT ERROR:",
      error
    );

    /*
      ここでも画面を消さない。
    */

    showAuthScreen();

    const loginError =
      $("login-error");

    if (loginError) {
      loginError.textContent =
        "アプリの初期化に失敗しました。ページを再読み込みしてください。";
    }
  }
}


/* =========================================================
   DOM READY
========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    boot,
    {
      once: true
    }
  );
} else {
  boot();
}


/* =========================================================
   DEBUG EXPORT
   開発時のみwindowから確認可能。
========================================================= */

window.JukenRPG = {
  getPlayer: () => player,

  getCurrentUser: () =>
    currentUser,

  getRank: () =>
    player
      ? getRankByMinutes(
          player.seasonStudyMinutes
        )
      : null,

  getLevel: () =>
    player
      ? calculateLevelFromXP(
          player.xp
        )
      : null,

  getDateKey,

  getMonthKey,

  getWeekKey
};
/* =========================================================
   受験RPG - COMPLETE REBUILD
   PART 2 / 3
   Quest / Boss / Party / Friends / Shop / Achievements
========================================================= */


/* =========================================================
   QUEST SYSTEM
========================================================= */

const QUEST_TYPES = {
  SUBJECT: "subject",
  TOTAL_TIME: "total_time",
  DAILY_TIME: "daily_time",
  WEEKLY_TIME: "weekly_time",
  RARE: "rare"
};

const QUEST_REWARDS = {
  daily: {
    xp: 30,
    coins: 30
  },
  weekly: {
    xp: 100,
    coins: 70
  },
  rare: {
    xp: 100,
    coins: 500
  }
};

const QUEST_TEMPLATES = [
  {
    id: "subject_focus",
    type: QUEST_TYPES.SUBJECT,
    title: "弱点科目攻略",
    description: "指定された教科を20分勉強する。",
    target: 20
  },
  {
    id: "subject_focus_2",
    type: QUEST_TYPES.SUBJECT,
    title: "苦手克服作戦",
    description: "指定された教科を15分勉強する。",
    target: 15
  },
  {
    id: "daily_30",
    type: QUEST_TYPES.DAILY_TIME,
    title: "今日の30分",
    description: "今日30分以上勉強する。",
    target: 30
  },
  {
    id: "daily_60",
    type: QUEST_TYPES.DAILY_TIME,
    title: "集中モード",
    description: "今日60分以上勉強する。",
    target: 60
  },
  {
    id: "daily_90",
    type: QUEST_TYPES.DAILY_TIME,
    title: "受験戦士",
    description: "今日90分以上勉強する。",
    target: 90
  },
  {
    id: "weekly_300",
    type: QUEST_TYPES.WEEKLY_TIME,
    title: "週間300分チャレンジ",
    description: "今週300分以上勉強する。",
    target: 300
  },
  {
    id: "weekly_600",
    type: QUEST_TYPES.WEEKLY_TIME,
    title: "週間600分チャレンジ",
    description: "今週600分以上勉強する。",
    target: 600
  }
];


/* =========================================================
   QUEST COLLECTION
========================================================= */

function getQuestCollection() {
  if (!currentUser) return null;

  return collection(
    db,
    "users",
    currentUser.uid,
    "quests"
  );
}

function getQuestDocRef(id) {
  if (!currentUser) return null;

  return doc(
    db,
    "users",
    currentUser.uid,
    "quests",
    id
  );
}


/* =========================================================
   QUEST ID
========================================================= */

function makeQuestId(type, key, index = 0) {
  return `${type}_${key}_${index}`;
}


/* =========================================================
   LESS-STUDIED SUBJECT
========================================================= */

function getLessStudiedSubjects() {
  if (!player) return [];

  const subjects =
    Array.isArray(player.subjects)
      ? [...player.subjects]
      : [];

  return subjects.sort(
    (a, b) => {
      const am =
        Number(
          player.subjectStudyMinutes?.[a] || 0
        );

      const bm =
        Number(
          player.subjectStudyMinutes?.[b] || 0
        );

      return am - bm;
    }
  );
}


/* =========================================================
   RANDOM SUBJECT
========================================================= */

function chooseQuestSubject() {
  const subjects =
    getLessStudiedSubjects();

  if (!subjects.length) {
    return null;
  }

  /*
    低勉強時間の教科を優先。
    完全固定ではなく、上位3教科から
   ランダムに選ぶことで偏りを防ぐ。
  */

  const candidates =
    subjects.slice(
      0,
      Math.min(3, subjects.length)
    );

  return candidates[
    Math.floor(
      Math.random() * candidates.length
    )
  ];
}


/* =========================================================
   CREATE DAILY QUESTS
========================================================= */

async function ensureDailyQuests() {
  if (!player || !currentUser) return [];

  const dateKey =
    getDateKey();

  const collectionRef =
    getQuestCollection();

  if (!collectionRef) return [];

  const snap =
    await getDocs(
      collectionRef
    );

  const existing =
    snap.docs
      .map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .filter(
        quest =>
          quest.scope === "daily" &&
          quest.dateKey === dateKey
      );

  if (existing.length >= 3) {
    return existing
      .slice(0, 3);
  }

  const quests = [];

  /*
    1. 教科クエスト
  */

  const subject =
    chooseQuestSubject();

  if (subject) {
    quests.push({
      id: makeQuestId(
        "daily",
        dateKey,
        0
      ),
      scope: "daily",
      dateKey,
      type: QUEST_TYPES.SUBJECT,
      title: "弱点科目攻略",
      description:
        `${getSubjectName(subject)}を20分勉強する。`,
      subject,
      target: 20,
      progress: 0,
      completed: false,
      rewardXP:
        QUEST_REWARDS.daily.xp,
      rewardCoins:
        QUEST_REWARDS.daily.coins
    });
  }

  /*
    2. 今日の勉強時間
  */

  quests.push({
    id: makeQuestId(
      "daily",
      dateKey,
      1
    ),
    scope: "daily",
    dateKey,
    type: QUEST_TYPES.DAILY_TIME,
    title: "今日の30分",
    description:
      "今日30分以上勉強する。",
    target: 30,
    progress: 0,
    completed: false,
    rewardXP:
      QUEST_REWARDS.daily.xp,
    rewardCoins:
      QUEST_REWARDS.daily.coins
  });

  /*
    3. 追加チャレンジ
  */

  quests.push({
    id: makeQuestId(
      "daily",
      dateKey,
      2
    ),
    scope: "daily",
    dateKey,
    type: QUEST_TYPES.DAILY_TIME,
    title: "集中モード",
    description:
      "今日60分以上勉強する。",
    target: 60,
    progress: 0,
    completed: false,
    rewardXP:
      QUEST_REWARDS.daily.xp,
    rewardCoins:
      QUEST_REWARDS.daily.coins
  });

  /*
    書き込み
  */

  const batch =
    writeBatch(db);

  for (const quest of quests) {
    const ref =
      getQuestDocRef(quest.id);

    if (ref) {
      batch.set(
        ref,
        {
          ...quest,
          createdAt:
            serverTimestamp(),
          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );
    }
  }

  await batch.commit();

  return quests;
}


/* =========================================================
   CREATE WEEKLY QUEST
========================================================= */

async function ensureWeeklyQuest() {
  if (!player || !currentUser) {
    return null;
  }

  const weekKey =
    getWeekKey();

  const id =
    makeQuestId(
      "weekly",
      weekKey,
      0
    );

  const ref =
    getQuestDocRef(id);

  if (!ref) return null;

  const snap =
    await getDoc(ref);

  if (snap.exists()) {
    return {
      id: snap.id,
      ...snap.data()
    };
  }

  const quest = {
    id,
    scope: "weekly",
    weekKey,
    type: QUEST_TYPES.WEEKLY_TIME,
    title: "週間チャレンジ",
    description:
      "今週300分以上勉強する。",
    target: 300,
    progress: 0,
    completed: false,
    rewardXP:
      QUEST_REWARDS.weekly.xp,
    rewardCoins:
      QUEST_REWARDS.weekly.coins,
    createdAt:
      serverTimestamp(),
    updatedAt:
      serverTimestamp()
  };

  await setDoc(
    ref,
    quest
  );

  return quest;
}


/* =========================================================
   QUEST PROGRESS
========================================================= */

async function updateQuestProgressFromStudy(
  subject,
  minutes
) {
  if (!player || !currentUser) {
    return;
  }

  try {
    await ensureDailyQuests();
    await ensureWeeklyQuest();

    const collectionRef =
      getQuestCollection();

    if (!collectionRef) return;

    const snap =
      await getDocs(
        collectionRef
      );

    const dateKey =
      getDateKey();

    const weekKey =
      getWeekKey();

    const quests =
      snap.docs
        .map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        .filter(
          quest =>
            (
              quest.scope === "daily" &&
              quest.dateKey === dateKey
            ) ||
            (
              quest.scope === "weekly" &&
              quest.weekKey === weekKey
            )
        );

    for (const quest of quests) {
      if (quest.completed) continue;

      let newProgress =
        Number(
          quest.progress || 0
        );

      if (
        quest.type ===
        QUEST_TYPES.SUBJECT
      ) {
        if (
          quest.subject === subject
        ) {
          newProgress += minutes;
        }
      }

      if (
        quest.type ===
        QUEST_TYPES.DAILY_TIME
      ) {
        newProgress =
          Number(
            player.todayStudyMinutes || 0
          );
      }

      if (
        quest.type ===
        QUEST_TYPES.WEEKLY_TIME
      ) {
        /*
          履歴から今週の合計を取得。
        */

        newProgress =
          await getWeeklyStudyMinutes();
      }

      newProgress =
        Math.min(
          newProgress,
          Number(
            quest.target || newProgress
          )
        );

      const complete =
        newProgress >=
        Number(quest.target || 0);

      await updateDoc(
        getQuestDocRef(quest.id),
        {
          progress: newProgress,
          completed: complete,
          updatedAt:
            serverTimestamp()
        }
      );

      if (complete) {
        await completeQuest(
          quest
        );
      }
    }

  } catch (error) {
    console.error(
      "QUEST PROGRESS ERROR:",
      error
    );
  }
}


/* =========================================================
   WEEKLY STUDY MINUTES
========================================================= */

async function getWeeklyStudyMinutes() {
  if (!currentUser) return 0;

  try {
    const ref =
      collection(
        db,
        "users",
        currentUser.uid,
        "studyRecords"
      );

    const snap =
      await getDocs(ref);

    const weekKey =
      getWeekKey();

    return snap.docs.reduce(
      (total, docSnap) => {
        const data =
          docSnap.data();

        if (
          data.weekKey === weekKey
        ) {
          return (
            total +
            Number(data.minutes || 0)
          );
        }

        return total;
      },
      0
    );

  } catch (error) {
    console.error(
      "WEEKLY STUDY ERROR:",
      error
    );

    return 0;
  }
}


/* =========================================================
   COMPLETE QUEST
========================================================= */

async function completeQuest(
  quest
) {
  if (!player || quest.completedRewardGiven) {
    return;
  }

  const xp =
    Math.floor(
      Number(quest.rewardXP || 0) *
      getActiveXPMultiplier()
    );

  const coins =
    Number(
      quest.rewardCoins || 0
    );

  player.xp += xp;
  player.coins += coins;
  player.totalQuestsCompleted =
    Number(
      player.totalQuestsCompleted || 0
    ) + 1;

  player.todayXP += xp;
  player.todayCoins += coins;

  const info =
    calculateLevelFromXP(
      player.xp
    );

  const oldLevel =
    player.level;

  player.level =
    info.level;

  const ref =
    getQuestDocRef(
      quest.id
    );

  await updateDoc(
    ref,
    {
      completedRewardGiven: true,
      completedAt:
        serverTimestamp()
    }
  );

  await savePlayer();

  if (player.level > oldLevel) {
    await handleLevelUp(
      oldLevel,
      player.level
    );
  }

  showNotification(
    `🎯 クエスト達成！ +${xp} XP / +${coins} 🪙`,
    4000
  );
}


/* =========================================================
   RARE QUEST
========================================================= */

async function checkRareQuest() {
  if (!player || !currentUser) {
    return;
  }

  if (
    player.todayStudyMinutes < 180
  ) {
    return;
  }

  const dateKey =
    getDateKey();

  const id =
    `rare_${dateKey}`;

  const ref =
    getQuestDocRef(id);

  if (!ref) return;

  const snap =
    await getDoc(ref);

  if (snap.exists()) {
    return;
  }

  const quest = {
    id,
    scope: "rare",
    type: QUEST_TYPES.RARE,
    dateKey,
    title: "限界突破",
    description:
      "1日に合計3時間勉強する。",
    target: 180,
    progress: 180,
    completed: true,
    rewardXP: 100,
    rewardCoins: 500,
    completedRewardGiven: true,
    createdAt:
      serverTimestamp(),
    completedAt:
      serverTimestamp()
  };

  await setDoc(
    ref,
    quest
  );

  const xp =
    Math.floor(
      100 *
      getActiveXPMultiplier()
    );

  player.xp += xp;
  player.coins += 500;
  player.todayXP += xp;
  player.todayCoins += 500;

  const oldLevel =
    player.level;

  player.level =
    calculateLevelFromXP(
      player.xp
    ).level;

  await savePlayer();

  if (player.level > oldLevel) {
    await handleLevelUp(
      oldLevel,
      player.level
    );
  }

  showNotification(
    `🌟 レアクエスト達成！ +${xp} XP / +500 🪙`,
    5000
  );
}


/* =========================================================
   QUEST RENDER
========================================================= */

async function renderQuests() {
  if (!player || !currentUser) {
    return;
  }

  try {
    const daily =
      await ensureDailyQuests();

    const weekly =
      await ensureWeeklyQuest();

    const collectionRef =
      getQuestCollection();

    const snap =
      await getDocs(
        collectionRef
      );

    const all =
      snap.docs.map(
        docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })
      );

    const dateKey =
      getDateKey();

    const weekKey =
      getWeekKey();

    const dailyQuests =
      all.filter(
        q =>
          q.scope === "daily" &&
          q.dateKey === dateKey
      );

    const weeklyQuests =
      all.filter(
        q =>
          q.scope === "weekly" &&
          q.weekKey === weekKey
      );

    const rareQuests =
      all.filter(
        q =>
          q.scope === "rare" &&
          q.dateKey === dateKey
      );

    renderQuestList(
      "daily-quest-list",
      dailyQuests
    );

    renderQuestList(
      "weekly-quest-list",
      weeklyQuests
    );

    renderQuestHistory(
      all
    );

  } catch (error) {
    console.error(
      "QUEST RENDER ERROR:",
      error
    );

    setHTML(
      "daily-quest-list",
      `<p class="empty-message">クエストを読み込めませんでした。</p>`
    );
  }
}

function renderQuestList(
  containerId,
  quests
) {
  const container =
    $(containerId);

  if (!container) return;

  if (!quests.length) {
    container.innerHTML =
      `<p class="empty-message">現在のクエストはありません。</p>`;
    return;
  }

  container.innerHTML =
    quests.map(
      quest => {
        const target =
          Number(
            quest.target || 0
          );

        const progress =
          Math.min(
            target,
            Number(
              quest.progress || 0
            )
          );

        const percent =
          target > 0
            ? Math.min(
                100,
                (progress / target) *
                  100
              )
            : 0;

        return `
          <div class="quest-card ${
            quest.completed
              ? "completed"
              : ""
          }">

            <div class="quest-card-header">
              <h3>
                ${
                  quest.completed
                    ? "✅ "
                    : "⚔️ "
                }
                ${escapeHTML(
                  quest.title
                )}
              </h3>
            </div>

            <p>
              ${escapeHTML(
                quest.description || ""
              )}
            </p>

            <div class="quest-progress">
              <div
                class="quest-progress-bar"
                style="width:${percent}%"
              ></div>
            </div>

            <div class="quest-progress-text">
              ${progress} / ${target}
            </div>

            <div class="quest-reward">
              🎁 +${Number(
                quest.rewardXP || 0
              )} XP
              &nbsp;
              🪙 +${Number(
                quest.rewardCoins || 0
              )}
            </div>

          </div>
        `;
      }
    ).join("");
}

function renderQuestHistory(
  quests
) {
  const container =
    $("quest-history-list");

  if (!container) return;

  const completed =
    quests
      .filter(
        q =>
          q.completedRewardGiven
      )
      .sort(
        (a, b) =>
          getTimestampMillis(
            b.completedAt
          ) -
          getTimestampMillis(
            a.completedAt
          )
      )
      .slice(0, 50);

  if (!completed.length) {
    container.innerHTML =
      `<p class="empty-message">達成履歴はありません。</p>`;
    return;
  }

  container.innerHTML =
    completed.map(
      q => `
        <div class="quest-history-item">
          <strong>
            ✅ ${escapeHTML(
              q.title || "クエスト"
            )}
          </strong>
          <span>
            +${Number(q.rewardXP || 0)} XP /
            +${Number(q.rewardCoins || 0)} 🪙
          </span>
        </div>
      `
    ).join("");
}


/* =========================================================
   BOSS SYSTEM
========================================================= */

const BOSSES = [
  {
    id: "japanese_01",
    name: "漢字の魔王",
    subject: "japanese",
    image: "📖"
  },
  {
    id: "japanese_02",
    name: "古文覇王",
    subject: "japanese",
    image: "🏯"
  },
  {
    id: "math_01",
    name: "数式の破壊神",
    subject: "math",
    image: "📐"
  },
  {
    id: "math_02",
    name: "微積の巨人",
    subject: "math",
    image: "♾️"
  },
  {
    id: "english_01",
    name: "英文読解獣",
    subject: "english",
    image: "🔤"
  },
  {
    id: "english_02",
    name: "英単語皇帝",
    subject: "english",
    image: "👑"
  }
];

const BOSS_ITEMS = [
  {
    id: "xp_boost_1",
    name: "経験値ブースターⅠ",
    type: "xp",
    multiplier: 1.25,
    price: 500,
    description: "XP獲得量1.25倍"
  },
  {
    id: "xp_boost_2",
    name: "経験値ブースターⅡ",
    type: "xp",
    multiplier: 1.5,
    price: 1000,
    description: "XP獲得量1.5倍"
  },
  {
    id: "xp_boost_3",
    name: "経験値ブースターⅢ",
    type: "xp",
    multiplier: 1.75,
    price: 1800,
    description: "XP獲得量1.75倍"
  },
  {
    id: "xp_boost_4",
    name: "経験値ブースターⅣ",
    type: "xp",
    multiplier: 2,
    price: 3000,
    description: "XP獲得量2倍"
  },

  {
    id: "boss_attack_1",
    name: "戦闘ブースターⅠ",
    type: "boss_attack",
    multiplier: 1.15,
    price: 500,
    description: "ボスへのダメージ1.15倍"
  },
  {
    id: "boss_attack_2",
    name: "戦闘ブースターⅡ",
    type: "boss_attack",
    multiplier: 1.25,
    price: 1000,
    description: "ボスへのダメージ1.25倍"
  },
  {
    id: "boss_attack_3",
    name: "戦闘ブースターⅢ",
    type: "boss_attack",
    multiplier: 1.5,
    price: 1800,
    description: "ボスへのダメージ1.5倍"
  },
  {
    id: "boss_attack_4",
    name: "戦闘ブースターⅣ",
    type: "boss_attack",
    multiplier: 2,
    price: 3000,
    description: "ボスへのダメージ2倍"
  },

  {
    id: "defense_debuff_1",
    name: "防御崩しⅠ",
    type: "boss_defense",
    reduction: 1,
    price: 700,
    description: "ボスレベルを1下げて計算"
  },
  {
    id: "defense_debuff_2",
    name: "防御崩しⅡ",
    type: "boss_defense",
    reduction: 2,
    price: 1200,
    description: "ボスレベルを2下げて計算"
  },
  {
    id: "defense_debuff_3",
    name: "防御崩しⅢ",
    type: "boss_defense",
    reduction: 3,
    price: 2000,
    description: "ボスレベルを3下げて計算"
  },
  {
    id: "defense_debuff_4",
    name: "防御崩しⅣ",
    type: "boss_defense",
    reduction: 4,
    price: 3500,
    description: "ボスレベルを4下げて計算"
  }
];


/* =========================================================
   BOSS WEEK
========================================================= */

function seededRandom(seed) {
  let value = 0;

  for (let i = 0; i < seed.length; i++) {
    value =
      (
        value * 31 +
        seed.charCodeAt(i)
      ) >>> 0;
  }

  return (
    value % 1000000
  ) / 1000000;
}

function getWeeklyBossDefinition() {
  const weekKey =
    getWeekKey();

  const random =
    seededRandom(
      `boss:${weekKey}`
    );

  const bossIndex =
    Math.floor(
      random * BOSSES.length
    );

  const boss =
    BOSSES[bossIndex];

  const levelRandom =
    seededRandom(
      `level:${weekKey}`
    );

  const level =
    1 +
    Math.floor(
      levelRandom * 10
    );

  return {
    boss,
    level
  };
}


/* =========================================================
   BOSS PARTY MEMBERS
========================================================= */

async function getCurrentParty() {
  if (!player || !currentUser) {
    return null;
  }

  const partyId =
    player.partyId;

  if (!partyId) {
    return null;
  }

  const ref =
    doc(
      db,
      "parties",
      partyId
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    player.partyId = null;
    await savePlayer();

    return null;
  }

  return {
    id: snap.id,
    ...snap.data()
  };
}


/* =========================================================
   BOSS WEAKNESS
========================================================= */

function chooseBossWeakness(
  members
) {
  const subjects = [];

  for (
    const member of members
  ) {
    const list =
      Array.isArray(
        member.subjects
      )
        ? member.subjects
        : [];

    for (
      const subject of list
    ) {
      if (
        !subjects.includes(subject)
      ) {
        subjects.push(subject);
      }
    }
  }

  if (!subjects.length) {
    return "math";
  }

  const weekKey =
    getWeekKey();

  const random =
    seededRandom(
      `weakness:${weekKey}`
    );

  return subjects[
    Math.floor(
      random * subjects.length
    )
  ];
}


/* =========================================================
   BOSS MAX HP
========================================================= */

function calculateBossMaxHP(
  partySize,
  level
) {
  const size =
    Math.max(
      1,
      Math.min(
        4,
        Number(partySize) || 1
      )
    );

  const lv =
    Math.max(
      1,
      Math.min(
        10,
        Number(level) || 1
      )
    );

  const hpPerPerson =
    1000 +
    (lv - 1) * 100;

  return (
    size *
    hpPerPerson
  );
}


/* =========================================================
   ENSURE BOSS
========================================================= */

async function ensureWeeklyBoss(
  party
) {
  if (!party) {
    return null;
  }

  const weekKey =
    getWeekKey();

  const bossRef =
    doc(
      db,
      "bosses",
      weekKey
    );

  const snap =
    await getDoc(
      bossRef
    );

  const definition =
    getWeeklyBossDefinition();

  if (snap.exists()) {
    return {
      id: snap.id,
      ...snap.data()
    };
  }

  const members =
    Array.isArray(
      party.members
    )
      ? party.members
      : [];

  const partySize =
    Math.max(
      1,
      Math.min(
        4,
        members.length || 1
      )
    );

  const weakness =
    chooseBossWeakness(
      members
    );

  const maxHP =
    calculateBossMaxHP(
      partySize,
      definition.level
    );

  const boss = {
    weekKey,
    bossId:
      definition.boss.id,
    bossName:
      definition.boss.name,
    bossImage:
      definition.boss.image,
    level:
      definition.level,
    weaknessSubject:
      weakness,
    weaknessMultiplier:
      1.5,
    maxHP,
    currentHP:
      maxHP,
    defeated: false,
    partyId:
      party.id,
    createdAt:
      serverTimestamp(),
    updatedAt:
      serverTimestamp()
  };

  await setDoc(
    bossRef,
    boss
  );

  return {
    id: weekKey,
    ...boss
  };
}


/* =========================================================
   BOSS DAMAGE MULTIPLIER
========================================================= */

function getBossAttackMultiplier() {
  if (!player) return 1;

  return Math.max(
    1,
    Number(
      player.activeBossAttackMultiplier || 1
    )
  );
}


/* =========================================================
   BOSS DAMAGE
========================================================= */

async function applyBossDamage(
  subject,
  minutes
) {
  if (
    !player ||
    !currentUser ||
    !player.partyId
  ) {
    return null;
  }

  try {
    const party =
      await getCurrentParty();

    if (!party) {
      return null;
    }

    const boss =
      await ensureWeeklyBoss(
        party
      );

    if (!boss) {
      return null;
    }

    if (boss.defeated) {
      return boss;
    }

    let damage =
      Number(minutes) || 0;

    if (
      subject ===
      boss.weaknessSubject
    ) {
      damage *=
        Number(
          boss.weaknessMultiplier || 1.5
        );
    }

    damage *=
      getBossAttackMultiplier();

    damage =
      Math.max(
        0,
        Math.floor(damage)
      );

    if (damage <= 0) {
      return boss;
    }

    const bossRef =
      doc(
        db,
        "bosses",
        boss.weekKey
      );

    const oldHP =
      Number(
        boss.currentHP || 0
      );

    const newHP =
      Math.max(
        0,
        oldHP - damage
      );

    const defeated =
      newHP <= 0;

    await updateDoc(
      bossRef,
      {
        currentHP: newHP,
        defeated,
        updatedAt:
          serverTimestamp()
      }
    );

    await recordBossContribution(
      boss.weekKey,
      damage
    );

    if (defeated && !boss.defeated) {
      await handleBossDefeat(
        boss,
        damage
      );
    }

    return {
      ...boss,
      currentHP: newHP,
      defeated
    };

  } catch (error) {
    console.error(
      "BOSS DAMAGE ERROR:",
      error
    );

    return null;
  }
}


/* =========================================================
   BOSS CONTRIBUTION
========================================================= */

async function recordBossContribution(
  weekKey,
  damage
) {
  if (!currentUser) return;

  const ref =
    doc(
      db,
      "bosses",
      weekKey,
      "contributions",
      currentUser.uid
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        uid:
          currentUser.uid,
        userId:
          player.userId,
        displayName:
          player.displayName,
        damage,
        updatedAt:
          serverTimestamp()
      }
    );

    return;
  }

  await updateDoc(
    ref,
    {
      damage:
        increment(damage),
      updatedAt:
        serverTimestamp()
    }
  );
}


/* =========================================================
   BOSS DEFEAT
========================================================= */

async function handleBossDefeat(
  boss
) {
  if (!player) return;

  const rewardCoins =
    1000 +
    Number(boss.level || 1) *
    100;

  const rewardXP =
    Math.floor(
      (
        200 +
        Number(boss.level || 1) *
        50
      ) *
      getActiveXPMultiplier()
    );

  const oldLevel =
    player.level;

  player.coins +=
    rewardCoins;

  player.xp +=
    rewardXP;

  player.bossesDefeated =
    Number(
      player.bossesDefeated || 0
    ) + 1;

  player.todayCoins +=
    rewardCoins;

  player.todayXP +=
    rewardXP;

  player.level =
    calculateLevelFromXP(
      player.xp
    ).level;

  await savePlayer();

  if (
    player.level > oldLevel
  ) {
    await handleLevelUp(
      oldLevel,
      player.level
    );
  }

  await unlockAchievement(
    "boss_first",
    "初討伐"
  );

  showNotification(
    `👑 BOSS DEFEATED！ +${rewardXP} XP / +${rewardCoins} 🪙`,
    6000
  );
}


/* =========================================================
   BOSS RENDER
========================================================= */

async function renderBoss() {
  if (!player) return;

  const party =
    await getCurrentParty();

  if (!party) {
    setText(
      "boss-name",
      "パーティー未加入"
    );

    setText(
      "boss-level",
      "-"
    );

    setText(
      "boss-current-hp",
      "-"
    );

    setText(
      "boss-max-hp",
      "-"
    );

    setText(
      "boss-weakness-subject",
      "パーティー加入後に解放"
    );

    setText(
      "boss-party-count",
      "0"
    );

    return;
  }

  const boss =
    await ensureWeeklyBoss(
      party
    );

  if (!boss) return;

  setText(
    "boss-image",
    boss.bossImage || "👹"
  );

  setText(
    "boss-name",
    boss.bossName
  );

  setText(
    "boss-level",
    `Lv.${boss.level}`
  );

  setText(
    "boss-current-hp",
    Number(
      boss.currentHP || 0
    ).toLocaleString()
  );

  setText(
    "boss-max-hp",
    Number(
      boss.maxHP || 0
    ).toLocaleString()
  );

  setText(
    "boss-weakness-subject",
    `${getSubjectIcon(
      boss.weaknessSubject
    )} ${getSubjectName(
      boss.weaknessSubject
    )}`
  );

  setText(
    "boss-weakness-multiplier",
    `×${boss.weaknessMultiplier || 1.5}`
  );

  setText(
    "boss-reset-date",
    getNextMondayJST()
  );

  const hp =
    Number(
      boss.currentHP || 0
    );

  const max =
    Number(
      boss.maxHP || 1
    );

  const percent =
    Math.max(
      0,
      Math.min(
        100,
        (hp / max) * 100
      )
    );

  const bar =
    $("boss-hp-progress");

  if (bar) {
    bar.style.width =
      `${percent}%`;
  }

  setText(
    "boss-party-count",
    String(
      Array.isArray(
        party.members
      )
        ? party.members.length
        : 0
    )
  );

  renderBossPartyMembers(
    party
  );

  await renderBossLog(
    boss
  );
}


/* =========================================================
   BOSS PARTY DISPLAY
========================================================= */

function renderBossPartyMembers(
  party
) {
  const container =
    $("boss-party-member-list");

  if (!container) return;

  const members =
    Array.isArray(
      party.members
    )
      ? party.members
      : [];

  if (!members.length) {
    container.innerHTML =
      `<p class="empty-message">メンバーなし</p>`;
    return;
  }

  container.innerHTML =
    members.map(
      member => `
        <div class="boss-party-member">
          <strong>
            ${escapeHTML(
              member.displayName ||
              member.userId ||
              "冒険者"
            )}
          </strong>

          <span>
            ${getRankByMinutes(
              Number(
                member.seasonStudyMinutes || 0
              )
            ).label}
          </span>
        </div>
      `
    ).join("");
}


/* =========================================================
   BOSS LOG
========================================================= */

async function renderBossLog(
  boss
) {
  const container =
    $("boss-log-list");

  if (!container || !currentUser) {
    return;
  }

  try {
    const ref =
      collection(
        db,
        "bosses",
        boss.weekKey,
        "contributions"
      );

    const snap =
      await getDocs(ref);

    const entries =
      snap.docs
        .map(
          docSnap => ({
            id:
              docSnap.id,
            ...docSnap.data()
          })
        )
        .sort(
          (a, b) =>
            Number(
              b.damage || 0
            ) -
            Number(
              a.damage || 0
            )
        );

    if (!entries.length) {
      container.innerHTML =
        `<p class="empty-message">まだダメージ記録はありません。</p>`;
      return;
    }

    container.innerHTML =
      entries.map(
        entry => `
          <div class="boss-log-item">
            <span>
              ${escapeHTML(
                entry.displayName ||
                entry.userId ||
                "冒険者"
              )}
            </span>

            <strong>
              ${Number(
                entry.damage || 0
              ).toLocaleString()} DMG
            </strong>
          </div>
        `
      ).join("");

  } catch (error) {
    console.error(
      "BOSS LOG ERROR:",
      error
    );
  }
}


/* =========================================================
   PARTY SYSTEM
========================================================= */

const MAX_PARTY_SIZE = 4;
const PARTY_LIFETIME_DAYS = 7;


/* =========================================================
   CREATE PARTY
========================================================= */

async function createParty() {
  if (!player || !currentUser) {
    throw new Error(
      "ログインしてください。"
    );
  }

  if (player.partyId) {
    throw new Error(
      "すでにパーティーに所属しています。"
    );
  }

  const partyRef =
    await addDoc(
      collection(
        db,
        "parties"
      ),
      {
        leaderUid:
          currentUser.uid,
        memberUids: [
          currentUser.uid
        ],
        members: [
          getPartyMemberSnapshot(
            player,
            currentUser.uid
          )
        ],
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp()
      }
    );

  player.partyId =
    partyRef.id;

  await savePlayer();

  showNotification(
    "⚔️ パーティーを結成しました！"
  );

  return partyRef.id;
}


/* =========================================================
   PARTY MEMBER SNAPSHOT
========================================================= */

function getPartyMemberSnapshot(
  member,
  uid
) {
  return {
    uid,
    userId:
      member.userId || "",
    displayName:
      member.displayName || "冒険者",

    /*
      パーティーで公開する情報は
      タイトル・今日の勉強時間・ランク・レベル。
    */

    title:
      getTitleName(
        member.equippedTitle
      ),

    todayStudyMinutes:
      Number(
        member.todayStudyMinutes || 0
      ),

    seasonStudyMinutes:
      Number(
        member.seasonStudyMinutes || 0
      ),

    level:
      Number(
        member.level || 1
      )
  };
}


/* =========================================================
   FRIEND CHECK
========================================================= */

async function areFriends(
  uidA,
  uidB
) {
  if (!uidA || !uidB) {
    return false;
  }

  const a =
    await getDoc(
      doc(
        db,
        "users",
        uidA
      )
    );

  const b =
    await getDoc(
      doc(
        db,
        "users",
        uidB
      )
    );

  if (
    !a.exists() ||
    !b.exists()
  ) {
    return false;
  }

  const ad =
    a.data();

  const bd =
    b.data();

  const aFriends =
    Array.isArray(
      ad.friendUids
    )
      ? ad.friendUids
      : [];

  const bFriends =
    Array.isArray(
      bd.friendUids
    )
      ? bd.friendUids
      : [];

  return (
    aFriends.includes(uidB) &&
    bFriends.includes(uidA)
  );
}


/* =========================================================
   PARTY INVITE
========================================================= */

async function inviteToParty(
  targetUserId
) {
  if (!player || !currentUser) {
    throw new Error(
      "ログインしてください。"
    );
  }

  const normalized =
    normalizeUserId(
      targetUserId
    );

  if (!normalized) {
    throw new Error(
      "ユーザーIDを入力してください。"
    );
  }

  /*
    パーティーが無ければ作成。
  */

  if (!player.partyId) {
    await createParty();
  }

  const party =
    await getCurrentParty();

  if (!party) {
    throw new Error(
      "パーティーを取得できませんでした。"
    );
  }

  const memberUids =
    Array.isArray(
      party.memberUids
    )
      ? party.memberUids
      : [];

  if (
    memberUids.length >=
    MAX_PARTY_SIZE
  ) {
    throw new Error(
      "パーティーは最大4人です。"
    );
  }

  /*
    自分自身
  */

  if (
    normalizeUserId(
      player.userId
    ) === normalized
  ) {
    throw new Error(
      "自分自身は招待できません。"
    );
  }

  /*
    対象ユーザー検索
  */

  const userQuery =
    query(
      collection(
        db,
        "users"
      ),
      where(
        "userId",
        "==",
        normalized
      ),
      limit(1)
    );

  const snap =
    await getDocs(
      userQuery
    );

  if (snap.empty) {
    throw new Error(
      "そのユーザーIDの冒険者は見つかりません。"
    );
  }

  const targetDoc =
    snap.docs[0];

  const targetUid =
    targetDoc.id;

  /*
    フレンド限定
  */

  const friends =
    await areFriends(
      currentUser.uid,
      targetUid
    );

  if (!friends) {
    throw new Error(
      "パーティー招待はフレンド限定です。"
    );
  }

  if (
    memberUids.includes(
      targetUid
    )
  ) {
    throw new Error(
      "その人はすでにパーティーにいます。"
    );
  }

  const inviteRef =
    collection(
      db,
      "partyInvites"
    );

  await addDoc(
    inviteRef,
    {
      partyId:
        party.id,
      fromUid:
        currentUser.uid,
      fromUserId:
        player.userId,
      fromDisplayName:
        player.displayName,
      toUid:
        targetUid,
      status:
        "pending",
      createdAt:
        serverTimestamp()
    }
  );

  showNotification(
    `📨 ${normalized} にパーティー招待を送りました。`
  );
}


/* =========================================================
   ACCEPT PARTY INVITE
========================================================= */

async function acceptPartyInvite(
  invite
) {
  if (!player || !currentUser) {
    return;
  }

  if (player.partyId) {
    throw new Error(
      "すでにパーティーに所属しています。"
    );
  }

  const partyRef =
    doc(
      db,
      "parties",
      invite.partyId
    );

  const partySnap =
    await getDoc(
      partyRef
    );

  if (!partySnap.exists()) {
    throw new Error(
      "パーティーが存在しません。"
    );
  }

  const party =
    partySnap.data();

  const memberUids =
    Array.isArray(
      party.memberUids
    )
      ? [...party.memberUids]
      : [];

  if (
    memberUids.length >=
    MAX_PARTY_SIZE
  ) {
    throw new Error(
      "パーティーが満員です。"
    );
  }

  if (
    memberUids.includes(
      currentUser.uid
    )
  ) {
    throw new Error(
      "すでに加入しています。"
    );
  }

  const members =
    Array.isArray(
      party.members
    )
      ? [...party.members]
      : [];

  memberUids.push(
    currentUser.uid
  );

  members.push(
    getPartyMemberSnapshot(
      player,
      currentUser.uid
    )
  );

  const batch =
    writeBatch(db);

  batch.update(
    partyRef,
    {
      memberUids,
      members,
      updatedAt:
        serverTimestamp()
    }
  );

  batch.update(
    doc(
      db,
      "partyInvites",
      invite.id
    ),
    {
      status:
        "accepted",
      acceptedAt:
        serverTimestamp()
    }
  );

  await batch.commit();

  player.partyId =
    invite.partyId;

  await savePlayer();

  showNotification(
    "⚔️ パーティーに加入しました！"
  );
}


/* =========================================================
   LEAVE PARTY
========================================================= */

async function leaveParty() {
  if (!player || !currentUser) {
    return;
  }

  if (!player.partyId) {
    throw new Error(
      "パーティーに所属していません。"
    );
  }

  const party =
    await getCurrentParty();

  if (!party) {
    player.partyId = null;
    await savePlayer();
    return;
  }

  if (
    party.leaderUid ===
    currentUser.uid
  ) {
    throw new Error(
      "リーダーは自分から脱退できません。解散してください。"
    );
  }

  const memberUids =
    (
      Array.isArray(
        party.memberUids
      )
        ? party.memberUids
        : []
    ).filter(
      uid =>
        uid !==
        currentUser.uid
    );

  const members =
    (
      Array.isArray(
        party.members
      )
        ? party.members
        : []
    ).filter(
      member =>
        member.uid !==
        currentUser.uid
    );

  await updateDoc(
    doc(
      db,
      "parties",
      party.id
    ),
    {
      memberUids,
      members,
      updatedAt:
        serverTimestamp()
    }
  );

  player.partyId =
    null;

  await savePlayer();

  showNotification(
    "パーティーから脱退しました。"
  );
}


/* =========================================================
   DISBAND PARTY
========================================================= */

async function disbandParty() {
  if (!player || !currentUser) {
    return;
  }

  if (!player.partyId) {
    return;
  }

  const party =
    await getCurrentParty();

  if (!party) {
    player.partyId = null;
    await savePlayer();
    return;
  }

  if (
    party.leaderUid !==
    currentUser.uid
  ) {
    throw new Error(
      "リーダーのみパーティーを解散できます。"
    );
  }

  const members =
    Array.isArray(
      party.memberUids
    )
      ? party.memberUids
      : [];

  const batch =
    writeBatch(db);

  batch.delete(
    doc(
      db,
      "parties",
      party.id
    )
  );

  /*
    自分のpartyIdを削除。
    他メンバーは次回アクセス時に
    無効partyとして自動解除。
  */

  batch.update(
    doc(
      db,
      "users",
      currentUser.uid
    ),
    {
      partyId:
        null,
      updatedAt:
        serverTimestamp()
    }
  );

  await batch.commit();

  player.partyId =
    null;

  showNotification(
    "⚔️ パーティーを解散しました。"
  );
}


/* =========================================================
   CLEANUP OLD PARTIES
========================================================= */

async function cleanupWeeklyParties() {
  /*
    全パーティーを毎回走査すると重いため、
    自分の所属パーティーだけ確認する。
  */

  if (!player?.partyId) {
    return;
  }

  try {
    const partyRef =
      doc(
        db,
        "parties",
        player.partyId
      );

    const snap =
      await getDoc(
        partyRef
      );

    if (!snap.exists()) {
      player.partyId = null;
      await savePlayer();
      return;
    }

    const data =
      snap.data();

    const created =
      getTimestampMillis(
        data.createdAt
      );

    if (!created) return;

    const age =
      Date.now() -
      created;

    const maxAge =
      PARTY_LIFETIME_DAYS *
      24 *
      60 *
      60 *
      1000;

    if (age >= maxAge) {
      player.partyId = null;

      await savePlayer();

      if (
        data.leaderUid ===
        currentUser.uid
      ) {
        try {
          await deleteDoc(
            partyRef
          );
        } catch {}
      }

      showNotification(
        "⏰ パーティーの活動期間が終了しました。"
      );
    }

  } catch (error) {
    console.error(
      "PARTY CLEANUP ERROR:",
      error
    );
  }
}


/* =========================================================
   PARTY RENDER
========================================================= */

async function renderParty() {
  if (!player) return;

  const container =
    $("party-member-list");

  if (!container) return;

  const party =
    await getCurrentParty();

  if (!party) {
    container.innerHTML = `
      <div class="empty-message">
        <p>現在パーティーに所属していません。</p>
        <p>フレンドを招待してパーティーを結成できます。</p>
      </div>
    `;

    setText(
      "party-member-count",
      "0"
    );

    return;
  }

  const members =
    Array.isArray(
      party.members
    )
      ? party.members
      : [];

  setText(
    "party-member-count",
    String(members.length)
  );

  container.innerHTML =
    members.map(
      member => `
        <div class="party-member-card">

          <div class="party-member-main">
            <strong>
              ${escapeHTML(
                member.displayName ||
                member.userId ||
                "冒険者"
              )}
            </strong>

            <small>
              @${escapeHTML(
                member.userId || ""
              )}
            </small>
          </div>

          <div class="party-member-info">
            <span>
              ${escapeHTML(
                member.title ||
                "無名の冒険者"
              )}
            </span>

            <span>
              Lv.${Number(
                member.level || 1
              )}
            </span>

            <span>
              ${getRankByMinutes(
                Number(
                  member.seasonStudyMinutes || 0
                )
              ).label}
            </span>

            <span>
              今日 ${formatStudyHours(
                Number(
                  member.todayStudyMinutes || 0
                )
              )}
            </span>
          </div>

        </div>
      `
    ).join("");
}


/* =========================================================
   FRIEND SYSTEM
========================================================= */


/* =========================================================
   SEND FRIEND REQUEST
========================================================= */

async function sendFriendRequest(
  targetUserId
) {
  if (!player || !currentUser) {
    throw new Error(
      "ログインしてください。"
    );
  }

  const normalized =
    normalizeUserId(
      targetUserId
    );

  if (!normalized) {
    throw new Error(
      "ユーザーIDを入力してください。"
    );
  }

  if (
    normalized ===
    normalizeUserId(
      player.userId
    )
  ) {
    throw new Error(
      "自分自身には申請できません。"
    );
  }

  const targetQuery =
    query(
      collection(
        db,
        "users"
      ),
      where(
        "userId",
        "==",
        normalized
      ),
      limit(1)
    );

  const snap =
    await getDocs(
      targetQuery
    );

  if (snap.empty) {
    throw new Error(
      "そのユーザーIDは見つかりません。"
    );
  }

  const target =
    snap.docs[0];

  const targetUid =
    target.id;

  if (
    await areFriends(
      currentUser.uid,
      targetUid
    )
  ) {
    throw new Error(
      "すでにフレンドです。"
    );
  }

  /*
    重複申請確認
  */

  const existingQuery =
    query(
      collection(
        db,
        "friendRequests"
      ),
      where(
        "fromUid",
        "==",
        currentUser.uid
      ),
      where(
        "toUid",
        "==",
        targetUid
      ),
      where(
        "status",
        "==",
        "pending"
      ),
      limit(1)
    );

  const existing =
    await getDocs(
      existingQuery
    );

  if (!existing.empty) {
    throw new Error(
      "すでにフレンド申請を送っています。"
    );
  }

  await addDoc(
    collection(
      db,
      "friendRequests"
    ),
    {
      fromUid:
        currentUser.uid,
      fromUserId:
        player.userId,
      fromDisplayName:
        player.displayName,

      toUid:
        targetUid,
      toUserId:
        normalized,

      status:
        "pending",

      createdAt:
        serverTimestamp()
    }
  );

  showNotification(
    `🤝 ${normalized} にフレンド申請を送りました。`
  );
}


/* =========================================================
   ACCEPT FRIEND REQUEST
========================================================= */

async function acceptFriendRequest(
  request
) {
  if (!currentUser || !player) {
    return;
  }

  const fromUid =
    request.fromUid;

  const toUid =
    currentUser.uid;

  const myRef =
    doc(
      db,
      "users",
      toUid
    );

  const friendRef =
    doc(
      db,
      "users",
      fromUid
    );

  const [
    mySnap,
    friendSnap
  ] =
    await Promise.all([
      getDoc(myRef),
      getDoc(friendRef)
    ]);

  if (
    !friendSnap.exists()
  ) {
    throw new Error(
      "相手のアカウントが存在しません。"
    );
  }

  const myData =
    mySnap.data() || {};

  const friendData =
    friendSnap.data() || {};

  const myFriends =
    Array.isArray(
      myData.friendUids
    )
      ? [...myData.friendUids]
      : [];

  const friendFriends =
    Array.isArray(
      friendData.friendUids
    )
      ? [...friendData.friendUids]
      : [];

  if (
    !myFriends.includes(
      fromUid
    )
  ) {
    myFriends.push(
      fromUid
    );
  }

  if (
    !friendFriends.includes(
      toUid
    )
  ) {
    friendFriends.push(
      toUid
    );
  }

  const batch =
    writeBatch(db);

  batch.update(
    myRef,
    {
      friendUids:
        myFriends,
      updatedAt:
        serverTimestamp()
    }
  );

  batch.update(
    friendRef,
    {
      friendUids:
        friendFriends,
      updatedAt:
        serverTimestamp()
    }
  );

  batch.update(
    doc(
      db,
      "friendRequests",
      request.id
    ),
    {
      status:
        "accepted",
      acceptedAt:
        serverTimestamp()
    }
  );

  await batch.commit();

  player.friendUids =
    myFriends;

  showNotification(
    "🤝 フレンドになりました！"
  );
}


/* =========================================================
   REJECT FRIEND REQUEST
========================================================= */

async function rejectFriendRequest(
  request
) {
  await updateDoc(
    doc(
      db,
      "friendRequests",
      request.id
    ),
    {
      status:
        "rejected",
      rejectedAt:
        serverTimestamp()
    }
  );

  showNotification(
    "フレンド申請を拒否しました。"
  );
}


/* =========================================================
   FRIEND RENDER
========================================================= */

async function renderFriends() {
  const container =
    $("friend-list");

  if (!container || !player) {
    return;
  }

  const friendUids =
    Array.isArray(
      player.friendUids
    )
      ? player.friendUids
      : [];

  if (!friendUids.length) {
    container.innerHTML =
      `<p class="empty-message">まだフレンドがいません。</p>`;
    return;
  }

  const friends = [];

  for (
    const uid of friendUids
  ) {
    try {
      const snap =
        await getDoc(
          doc(
            db,
            "users",
            uid
          )
        );

      if (
        snap.exists()
      ) {
        friends.push({
          uid,
          ...snap.data()
        });
      }
    } catch (error) {
      console.error(
        "FRIEND LOAD ERROR:",
        error
      );
    }
  }

  container.innerHTML =
    friends.map(
      friend => `
        <div class="friend-card">

          <div>
            <strong>
              ${escapeHTML(
                friend.displayName ||
                friend.userId ||
                "冒険者"
              )}
            </strong>

            <small>
              @${escapeHTML(
                friend.userId || ""
              )}
            </small>
          </div>

          <div class="friend-stats">
            Lv.${Number(
              friend.level || 1
            )}
            /
            ${getRankByMinutes(
              Number(
                friend.seasonStudyMinutes || 0
              )
            ).label}
          </div>

        </div>
      `
    ).join("");
}


/* =========================================================
   FRIEND REQUEST RENDER
========================================================= */

async function renderFriendRequests() {
  const container =
    $("friend-request-list");

  if (
    !container ||
    !currentUser
  ) {
    return;
  }

  try {
    const q =
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

    const snap =
      await getDocs(q);

    const requests =
      snap.docs.map(
        docSnap => ({
          id:
            docSnap.id,
          ...docSnap.data()
        })
      );

    if (!requests.length) {
      container.innerHTML =
        `<p class="empty-message">新しいフレンド申請はありません。</p>`;
      return;
    }

    container.innerHTML =
      requests.map(
        request => `
          <div class="request-card">

            <div>
              <strong>
                ${escapeHTML(
                  request.fromDisplayName ||
                  request.fromUserId ||
                  "冒険者"
                )}
              </strong>

              <small>
                @${escapeHTML(
                  request.fromUserId ||
                  ""
                )}
              </small>
            </div>

            <div class="request-actions">

              <button
                type="button"
                data-accept-friend="${escapeHTML(
                  request.id
                )}"
              >
                承認
              </button>

              <button
                type="button"
                data-reject-friend="${escapeHTML(
                  request.id
                )}"
              >
                拒否
              </button>

            </div>

          </div>
        `
      ).join("");

    requests.forEach(
      request => {
        safeOn(
          document.querySelector(
            `[data-accept-friend="${request.id}"]`
          ),
          "click",
          async () => {
            try {
              await acceptFriendRequest(
                request
              );

              await renderFriendRequests();
              await renderFriends();

            } catch (error) {
              console.error(
                error
              );

              showNotification(
                error.message ||
                "承認に失敗しました。"
              );
            }
          }
        );

        safeOn(
          document.querySelector(
            `[data-reject-friend="${request.id}"]`
          ),
          "click",
          async () => {
            try {
              await rejectFriendRequest(
                request
              );

              await renderFriendRequests();

            } catch (error) {
              console.error(
                error
              );

              showNotification(
                "拒否に失敗しました。"
              );
            }
          }
        );
      }
    );

  } catch (error) {
    console.error(
      "FRIEND REQUEST ERROR:",
      error
    );

    container.innerHTML =
      `<p class="empty-message">申請を読み込めませんでした。</p>`;
  }
}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

const ACHIEVEMENTS = [
  {
    id: "first_study",
    title: "冒険の始まり",
    description: "初めて勉強を記録する。",
    condition: () =>
      Number(
        player?.totalStudyMinutes || 0
      ) >= 1
  },
  {
    id: "study_60",
    title: "1時間突破",
    description: "累計1時間勉強する。",
    condition: () =>
      Number(
        player?.totalStudyMinutes || 0
      ) >= 60
  },
  {
    id: "study_300",
    title: "5時間突破",
    description: "累計5時間勉強する。",
    condition: () =>
      Number(
        player?.totalStudyMinutes || 0
      ) >= 300
  },
  {
    id: "study_600",
    title: "10時間突破",
    description: "累計10時間勉強する。",
    condition: () =>
      Number(
        player?.totalStudyMinutes || 0
      ) >= 600
  },
  {
    id: "study_1000",
    title: "1000分の軌跡",
    description: "累計1000分勉強する。",
    condition: () =>
      Number(
        player?.totalStudyMinutes || 0
      ) >= 1000
  },
  {
    id: "study_3000",
    title: "受験戦士",
    description: "累計3000分勉強する。",
    condition: () =>
      Number(
        player?.totalStudyMinutes || 0
      ) >= 3000
  },
  {
    id: "level_10",
    title: "二桁到達",
    description: "Lv.10に到達する。",
    condition: () =>
      Number(
        player?.level || 1
      ) >= 10
  },
  {
    id: "level_25",
    title: "成長中",
    description: "Lv.25に到達する。",
    condition: () =>
      Number(
        player?.level || 1
      ) >= 25
  },
  {
    id: "level_50",
    title: "熟練冒険者",
    description: "Lv.50に到達する。",
    condition: () =>
      Number(
        player?.level || 1
      ) >= 50
  },
  {
    id: "level_100",
    title: "限界突破",
    description: "Lv.100に到達する。",
    condition: () =>
      Number(
        player?.level || 1
      ) >= 100
  },
  {
    id: "quest_10",
    title: "クエストハンター",
    description: "クエストを10個達成する。",
    condition: () =>
      Number(
        player?.totalQuestsCompleted || 0
      ) >= 10
  },
  {
    id: "quest_50",
    title: "クエストマスター",
    description: "クエストを50個達成する。",
    condition: () =>
      Number(
        player?.totalQuestsCompleted || 0
      ) >= 50
  },
  {
    id: "boss_first",
    title: "初討伐",
    description: "ボスを初めて撃破する。",
    condition: () =>
      Number(
        player?.bossesDefeated || 0
      ) >= 1
  },
  {
    id: "boss_5",
    title: "ボスハンター",
    description: "ボスを5体撃破する。",
    condition: () =>
      Number(
        player?.bossesDefeated || 0
      ) >= 5
  }
];


/* =========================================================
   HIDDEN TITLES
========================================================= */

const HIDDEN_TITLE_DEFINITIONS = [
  {
    id: "hidden_intelligence",
    name: "あり得ない知能",
    condition: () =>
      Number(
        player?.level || 1
      ) >= 100
  },
  {
    id: "hidden_grinder",
    name: "努力の化身",
    condition: () =>
      Number(
        player?.totalStudyMinutes || 0
      ) >= 10000
  },
  {
    id: "hidden_legend",
    name: "伝説を見た者",
    condition: () =>
      getRankByMinutes(
        Number(
          player?.seasonStudyMinutes || 0
        )
      ).name === "Legend"
  },
  {
    id: "hidden_quest",
    name: "クエストの亡者",
    condition: () =>
      Number(
        player?.totalQuestsCompleted || 0
      ) >= 100
  },
  {
    id: "hidden_boss",
    name: "魔王狩り",
    condition: () =>
      Number(
        player?.bossesDefeated || 0
      ) >= 10
  },
  {
    id: "hidden_300",
    name: "三時間の壁",
    condition: () =>
      Number(
        player?.todayStudyMinutes || 0
      ) >= 180
  },
  {
    id: "hidden_level50",
    name: "半分の頂",
    condition: () =>
      Number(
        player?.level || 1
      ) >= 50
  },
  {
    id: "hidden_level75",
    name: "終盤戦",
    condition: () =>
      Number(
        player?.level || 1
      ) >= 75
  },
  {
    id: "hidden_subject",
    name: "全方位型",
    condition: () =>
      Object.keys(
        player?.subjectLevels || {}
      ).filter(
        subject =>
          Number(
            player.subjectLevels[subject]
          ) >= 10
      ).length >= 5
  },
  {
    id: "hidden_consistent",
    name: "継続の証",
    condition: () =>
      Number(
        player?.totalStudyMinutes || 0
      ) >= 5000
  }
];


/* =========================================================
   UNLOCK ACHIEVEMENT
========================================================= */

async function unlockAchievement(
  id,
  customTitle = null
) {
  if (!player || !currentUser) {
    return;
  }

  if (
    !Array.isArray(
      player.achievements
    )
  ) {
    player.achievements = [];
  }

  if (
    player.achievements.includes(id)
  ) {
    return;
  }

  player.achievements.push(id);

  await savePlayer();

  const achievement =
    ACHIEVEMENTS.find(
      a => a.id === id
    );

  const title =
    customTitle ||
    achievement?.title ||
    id;

  showNotification(
    `🏅 実績解除！「${title}」`,
    4500
  );
}


/* =========================================================
   CHECK ACHIEVEMENTS
========================================================= */

async function checkAchievements() {
  if (!player) return;

  for (
    const achievement
    of ACHIEVEMENTS
  ) {
    if (
      player.achievements.includes(
        achievement.id
      )
    ) {
      continue;
    }

    let unlocked =
      false;

    try {
      unlocked =
        Boolean(
          achievement.condition()
        );
    } catch {
      unlocked = false;
    }

    if (unlocked) {
      await unlockAchievement(
        achievement.id
      );
    }
  }

  /*
    Hidden titles
  */

  for (
    const hidden
    of HIDDEN_TITLE_DEFINITIONS
  ) {
    if (
      hidden.condition()
    ) {
      await unlockHiddenTitle(
        hidden
      );
    }
  }
}


/* =========================================================
   HIDDEN TITLE UNLOCK
========================================================= */

async function unlockHiddenTitle(
  definition
) {
  if (!player) return;

  if (
    !Array.isArray(
      player.ownedTitles
    )
  ) {
    player.ownedTitles = [
      "default_title"
    ];
  }

  if (
    player.ownedTitles.includes(
      definition.id
    )
  ) {
    return;
  }

  player.ownedTitles.push(
    definition.id
  );

  await savePlayer();

  showNotification(
    `🔮 隠し称号獲得！「${definition.name}」`,
    5000
  );
}


/* =========================================================
   ACHIEVEMENT RENDER
========================================================= */

async function renderAchievements() {
  if (!player) return;

  const container =
    $("achievement-list");

  if (!container) return;

  await checkAchievements();

  const unlocked =
    player.achievements || [];

  setText(
    "achievement-count",
    `${unlocked.length} / ${ACHIEVEMENTS.length}`
  );

  container.innerHTML =
    ACHIEVEMENTS.map(
      achievement => {
        const done =
          unlocked.includes(
            achievement.id
          );

        return `
          <div class="achievement-card ${
            done
              ? "unlocked"
              : "locked"
          }">

            <div class="achievement-icon">
              ${
                done
                  ? "🏆"
                  : "🔒"
              }
            </div>

            <div>
              <strong>
                ${escapeHTML(
                  achievement.title
                )}
              </strong>

              <p>
                ${escapeHTML(
                  achievement.description
                )}
              </p>
            </div>

          </div>
        `;
      }
    ).join("");
}


/* =========================================================
   SHOP
========================================================= */

const SHOP_TITLES = [
  {
    id: "title_01",
    name: "未来の合格者",
    price: 300
  },
  {
    id: "title_02",
    name: "努力家",
    price: 350
  },
  {
    id: "title_03",
    name: "集中の鬼",
    price: 500
  },
  {
    id: "title_04",
    name: "問題集の住人",
    price: 550
  },
  {
    id: "title_05",
    name: "参考書マスター",
    price: 600
  },
  {
    id: "title_06",
    name: "机の番人",
    price: 650
  },
  {
    id: "title_07",
    name: "演習狂",
    price: 700
  },
  {
    id: "title_08",
    name: "努力型天才",
    price: 800
  },
  {
    id: "title_09",
    name: "合格一直線",
    price: 850
  },
  {
    id: "title_10",
    name: "受験モンスター",
    price: 900
  },
  {
    id: "title_11",
    name: "偏差値ブレイカー",
    price: 1000
  },
  {
    id: "title_12",
    name: "合格の向こう側",
    price: 1200
  },
  {
    id: "title_13",
    name: "努力の天井知らず",
    price: 1300
  },
  {
    id: "title_14",
    name: "最後まで諦めない者",
    price: 1400
  },
  {
    id: "title_15",
    name: "逆転の切り札",
    price: 1500
  },
  {
    id: "title_16",
    name: "静かなる猛者",
    price: 1600
  },
  {
    id: "title_17",
    name: "知識の探求者",
    price: 1700
  },
  {
    id: "title_18",
    name: "問題を喰らう者",
    price: 1800
  },
  {
    id: "title_19",
    name: "受験魔術師",
    price: 1900
  },
  {
    id: "title_20",
    name: "合格請負人",
    price: 2000
  }
];


/* =========================================================
   THEMES
========================================================= */

const SHOP_THEMES = [
  {
    id: "theme_01",
    name: "深海",
    price: 500
  },
  {
    id: "theme_02",
    name: "魔導書",
    price: 700
  },
  {
    id: "theme_03",
    name: "王城",
    price: 900
  },
  {
    id: "theme_04",
    name: "星空",
    price: 1200
  },
  {
    id: "theme_05",
    name: "夜明け",
    price: 1500
  }
];


/* =========================================================
   BUY SHOP ITEM
========================================================= */

async function buyShopItem(
  item
) {
  if (!player) {
    throw new Error(
      "ログインしてください。"
    );
  }

  const price =
    Number(item.price || 0);

  if (
    Number(player.coins || 0) <
    price
  ) {
    throw new Error(
      "コインが足りません。"
    );
  }

  const owned =
    player.ownedItems || {};

  /*
    同じアイテムを何個でも買える
    設計にするものは数量管理。
  */

  const current =
    Number(
      owned[item.id] || 0
    );

  /*
    称号・テーマは一度だけ。
  */

  if (
    item.type === "title" ||
    item.type === "theme"
  ) {
    const list =
      item.type === "title"
        ? player.ownedTitles
        : player.ownedThemes;

    if (
      list.includes(
        item.id
      )
    ) {
      throw new Error(
        "すでに所持しています。"
      );
    }
  }

  player.coins -=
    price;

  if (
    item.type === "title"
  ) {
    player.ownedTitles.push(
      item.id
    );
  } else if (
    item.type === "theme"
  ) {
    player.ownedThemes.push(
      item.id
    );
  } else {
    owned[item.id] =
      current + 1;

    player.ownedItems =
      owned;
  }

  await savePlayer();

  showNotification(
    `🛒 「${item.name}」を購入しました！`
  );
}


/* =========================================================
   SHOP RENDER
========================================================= */

async function renderShop() {
  if (!player) return;

  setText(
    "shop-coin-count",
    `🪙 ${Number(
      player.coins || 0
    ).toLocaleString()}`
  );

  const titleContainer =
    $("shop-title-list");

  if (titleContainer) {
    titleContainer.innerHTML =
      SHOP_TITLES.map(
        title => {
          const owned =
            player.ownedTitles?.includes(
              title.id
            );

          return `
            <div class="shop-item">

              <div>
                <strong>
                  ${escapeHTML(
                    title.name
                  )}
                </strong>

                <small>
                  ${title.price} 🪙
                </small>
              </div>

              <button
                type="button"
                ${
                  owned
                    ? "disabled"
                    : ""
                }
                data-buy-title="${title.id}"
              >
                ${
                  owned
                    ? "所持済み"
                    : "購入"
                }
              </button>

            </div>
          `;
        }
      ).join("");

    SHOP_TITLES.forEach(
      title => {
        safeOn(
          document.querySelector(
            `[data-buy-title="${title.id}"]`
          ),
          "click",
          async () => {
            try {
              await buyShopItem({
                ...title,
                type:
                  "title"
              });

              await renderShop();

            } catch (error) {
              showNotification(
                error.message ||
                "購入できませんでした。"
              );
            }
          }
        );
      }
    );
  }

  const itemContainer =
    $("shop-item-list");

  if (itemContainer) {
    itemContainer.innerHTML =
      BOSS_ITEMS.map(
        item => {
          const count =
            Number(
              player.ownedItems?.[
                item.id
              ] || 0
            );

          return `
            <div class="shop-item">

              <div>
                <strong>
                  ${escapeHTML(
                    item.name
                  )}
                </strong>

                <small>
                  ${escapeHTML(
                    item.description
                  )}
                </small>

                <small>
                  所持: ${count}
                </small>

                <small>
                  ${item.price} 🪙
                </small>
              </div>

              <button
                type="button"
                data-buy-item="${item.id}"
              >
                購入
              </button>

            </div>
          `;
        }
      ).join("");

    BOSS_ITEMS.forEach(
      item => {
        safeOn(
          document.querySelector(
            `[data-buy-item="${item.id}"]`
          ),
          "click",
          async () => {
            try {
              await buyShopItem(
                item
              );

              await renderShop();

            } catch (error) {
              showNotification(
                error.message ||
                "購入できませんでした。"
              );
            }
          }
        );
      }
    );
  }

  const themeContainer =
    $("shop-background-list");

  if (themeContainer) {
    themeContainer.innerHTML =
      SHOP_THEMES.map(
        theme => {
          const owned =
            player.ownedThemes?.includes(
              theme.id
            );

          return `
            <div class="shop-item">

              <div>
                <strong>
                  ${escapeHTML(
                    theme.name
                  )}
                </strong>

                <small>
                  ${theme.price} 🪙
                </small>
              </div>

              <button
                type="button"
                ${
                  owned
                    ? "disabled"
                    : ""
                }
                data-buy-theme="${theme.id}"
              >
                ${
                  owned
                    ? "所持済み"
                    : "購入"
                }
              </button>

            </div>
          `;
        }
      ).join("");

    SHOP_THEMES.forEach(
      theme => {
        safeOn(
          document.querySelector(
            `[data-buy-theme="${theme.id}"]`
          ),
          "click",
          async () => {
            try {
              await buyShopItem({
                ...theme,
                type:
                  "theme"
              });

              await renderShop();

            } catch (error) {
              showNotification(
                error.message ||
                "購入できませんでした。"
              );
            }
          }
        );
      }
    );
  }
}


/* =========================================================
   LOCKER
========================================================= */

async function renderLocker() {
  if (!player) return;

  const titleContainer =
    $("locker-title-list");

  if (titleContainer) {
    const titles =
      player.ownedTitles || [];

    titleContainer.innerHTML =
      titles.map(
        titleId => {
          const equipped =
            player.equippedTitle ===
            titleId;

          return `
            <div class="locker-item">

              <span>
                ${escapeHTML(
                  getTitleName(
                    titleId
                  )
                )}
              </span>

              <button
                type="button"
                data-equip-title="${escapeHTML(
                  titleId
                )}"
                ${
                  equipped
                    ? "disabled"
                    : ""
                }
              >
                ${
                  equipped
                    ? "装備中"
                    : "装備"
                }
              </button>

            </div>
          `;
        }
      ).join("");

    titles.forEach(
      titleId => {
        safeOn(
          document.querySelector(
            `[data-equip-title="${titleId}"]`
          ),
          "click",
          async () => {
            try {
              player.equippedTitle =
                titleId;

              await savePlayer();

              await renderLocker();
              await refreshHeader();

              showNotification(
                `🏷️ 「${getTitleName(
                  titleId
                )}」を装備しました。`
              );

            } catch (error) {
              console.error(
                error
              );
            }
          }
        );
      }
    );
  }

  const themeContainer =
    $("locker-outfit-list");

  if (themeContainer) {
    const themes =
      player.ownedThemes || [];

    themeContainer.innerHTML =
      themes.map(
        themeId => {
          const equipped =
            player.equippedTheme ===
            themeId;

          const name =
            themeId ===
            "default_theme"
              ? "デフォルト"
              : (
                  SHOP_THEMES.find(
                    t =>
                      t.id ===
                      themeId
                  )?.name ||
                  themeId
                );

          return `
            <div class="locker-item">

              <span>
                ${escapeHTML(
                  name
                )}
              </span>

              <button
                type="button"
                data-equip-theme="${escapeHTML(
                  themeId
                )}"
                ${
                  equipped
                    ? "disabled"
                    : ""
                }
              >
                ${
                  equipped
                    ? "使用中"
                    : "使用"
                }
              </button>

            </div>
          `;
        }
      ).join("");

    themes.forEach(
      themeId => {
        safeOn(
          document.querySelector(
            `[data-equip-theme="${themeId}"]`
          ),
          "click",
          async () => {
            player.equippedTheme =
              themeId;

            await savePlayer();

            applyTheme();

            await renderLocker();

            showNotification(
              "🎨 テーマを変更しました。"
            );
          }
        );
      }
    );
  }
}


/* =========================================================
   USE ITEM
========================================================= */

async function useItem(
  itemId
) {
  if (!player) {
    throw new Error(
      "ログインしてください。"
    );
  }

  const item =
    BOSS_ITEMS.find(
      x =>
        x.id === itemId
    );

  if (!item) {
    throw new Error(
      "アイテムが見つかりません。"
    );
  }

  const count =
    Number(
      player.ownedItems?.[
        itemId
      ] || 0
    );

  if (count <= 0) {
    throw new Error(
      "そのアイテムを所持していません。"
    );
  }

  /*
    XPブーストは4種類の重複禁止。
  */

  if (
    item.type === "xp"
  ) {
    if (
      Number(
        player.activeXPBoostMultiplier ||
        1
      ) > 1
    ) {
      throw new Error(
        "XPブーストは同時に複数使用できません。"
      );
    }

    player.activeXPBoostMultiplier =
      item.multiplier;
  }

  if (
    item.type === "boss_attack"
  ) {
    player.activeBossAttackMultiplier =
      item.multiplier;
  }

  if (
    item.type === "boss_defense"
  ) {
    /*
      ボス防御デバフは
      次のボス戦で一度だけ使用。
    */

    player.activeBossDefenseReduction =
      Number(
        item.reduction || 0
      );
  }

  player.ownedItems[itemId] =
    count - 1;

  await savePlayer();

  showNotification(
    `✨ 「${item.name}」を使用しました！`
  );
}


/* =========================================================
   BOSS REFRESH BUTTON
========================================================= */

function setupBossEvents() {
  safeOn(
    $("boss-refresh-button"),
    "click",
    async () => {
      await safeRefresh(
        "boss",
        renderBoss
      );
    }
  );
}


/* =========================================================
   PARTY EVENTS
========================================================= */

function setupPartyEvents() {
  safeOn(
    $("party-invite-form"),
    "submit",
    async event => {
      event.preventDefault();

      const errorEl =
        $("party-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const userId =
        $("party-invite-user-id")?.value ||
        "";

      try {
        await inviteToParty(
          userId
        );

        if (
          $("party-invite-user-id")
        ) {
          $("party-invite-user-id").value = "";
        }

        if (errorEl) {
          errorEl.textContent =
            "";
        }

        await renderParty();

      } catch (error) {
        console.error(
          "PARTY INVITE ERROR:",
          error
        );

        if (errorEl) {
          errorEl.textContent =
            error.message ||
            "招待に失敗しました。";
        }
      }
    }
  );
}


/* =========================================================
   FRIEND EVENTS
========================================================= */

function setupFriendEvents() {
  /*
    HTMLに専用フォームがある場合に対応。
  */

  const possibleForms =
    safeQueryAll(
      "form[data-friend-request-form]"
    );

  possibleForms.forEach(
    form => {
      safeOn(
        form,
        "submit",
        async event => {
          event.preventDefault();

          const input =
            form.querySelector(
              "input"
            );

          try {
            await sendFriendRequest(
              input?.value || ""
            );

            if (input) {
              input.value = "";
            }

            await renderFriends();

          } catch (error) {
            showNotification(
              error.message ||
              "フレンド申請に失敗しました。"
            );
          }
        }
      );
    }
  );
}


/* =========================================================
   EXTEND EVENT SETUP
========================================================= */

const originalSetupEvents =
  setupEvents;

setupEvents = function () {
  originalSetupEvents();

  setupBossEvents();
  setupPartyEvents();
  setupFriendEvents();
};


/* =========================================================
   EXTEND REFRESH ALL
========================================================= */

const originalRefreshAll =
  refreshAll;

refreshAll = async function () {
  await originalRefreshAll();

  if (player) {
    await safeRefresh(
      "achievements",
      checkAchievements
    );
  }
};


/* =========================================================
   PARTY SNAPSHOT UPDATE
========================================================= */

async function updateMyPartySnapshot() {
  if (
    !player ||
    !currentUser ||
    !player.partyId
  ) {
    return;
  }

  try {
    const party =
      await getCurrentParty();

    if (!party) return;

    const members =
      Array.isArray(
        party.members
      )
        ? [...party.members]
        : [];

    const index =
      members.findIndex(
        member =>
          member.uid ===
          currentUser.uid
      );

    const snapshot =
      getPartyMemberSnapshot(
        player,
        currentUser.uid
      );

    if (index >= 0) {
      members[index] =
        snapshot;
    } else {
      members.push(
        snapshot
      );
    }

    await updateDoc(
      doc(
        db,
        "parties",
        party.id
      ),
      {
        members,
        updatedAt:
          serverTimestamp()
      }
    );

  } catch (error) {
    console.error(
      "PARTY SNAPSHOT ERROR:",
      error
    );
  }
}


/* =========================================================
   DAILY AUTO MAINTENANCE
========================================================= */

async function runDailyMaintenance() {
  if (!player) return;

  try {
    await handleDateReset();
    await handleSeasonReset();

    await ensureDailyQuests();
    await ensureWeeklyQuest();

    await updateMyPartySnapshot();

    await checkRareQuest();
    await checkAchievements();

  } catch (error) {
    console.error(
      "MAINTENANCE ERROR:",
      error
    );
  }
}


/* =========================================================
   PERIODIC MAINTENANCE
========================================================= */

let maintenanceInterval =
  null;

function startMaintenance() {
  if (
    maintenanceInterval
  ) {
    clearInterval(
      maintenanceInterval
    );
  }

  maintenanceInterval =
    setInterval(
      async () => {
        if (!player) return;

        await runDailyMaintenance();
      },
      60 * 1000
    );
}


/* =========================================================
   EXTEND START APP
========================================================= */

const originalStartApp =
  startApp;

startApp = async function () {
  await originalStartApp();

  await runDailyMaintenance();

  startMaintenance();

  await safeRefresh(
    "party",
    renderParty
  );

  await safeRefresh(
    "quest",
    renderQuests
  );

  await safeRefresh(
    "boss",
    renderBoss
  );
};


/* =========================================================
   BOSS ITEM EXPIRATION
========================================================= */

function clearTemporaryBoostsIfNeeded() {
  /*
    現仕様ではアイテムは
    「次回使用まで有効」ではなく
    通常の一時効果として扱う。

    具体的な持続時間管理は
    PART 3のアイテム処理で補完。
  */
}


/* =========================================================
   PARTY INVITE DISPLAY
========================================================= */

async function getPartyInvites() {
  if (!currentUser) {
    return [];
  }

  try {
    const q =
      query(
        collection(
          db,
          "partyInvites"
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

    const snap =
      await getDocs(q);

    return snap.docs.map(
      docSnap => ({
        id:
          docSnap.id,
        ...docSnap.data()
      })
    );

  } catch (error) {
    console.error(
      "PARTY INVITES ERROR:",
      error
    );

    return [];
  }
}


/* =========================================================
   FRIEND / PARTY PROFILE HELPERS
========================================================= */

async function findUserByUserId(
  userId
) {
  const normalized =
    normalizeUserId(
      userId
    );

  if (!normalized) {
    return null;
  }

  const q =
    query(
      collection(
        db,
        "users"
      ),
      where(
        "userId",
        "==",
        normalized
      ),
      limit(1)
    );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    return null;
  }

  return {
    uid:
      snap.docs[0].id,
    ...snap.docs[0].data()
  };
}


/* =========================================================
   SAFE PARTY MEMBER DISCLOSURE
========================================================= */

function getPublicPartyProfile(
  member
) {
  return {
    uid:
      member.uid,
    userId:
      member.userId,
    displayName:
      member.displayName,
    title:
      getTitleName(
        member.equippedTitle
      ),
    todayStudyMinutes:
      Number(
        member.todayStudyMinutes || 0
      ),
    level:
      Number(
        member.level || 1
      ),
    rank:
      getRankByMinutes(
        Number(
          member.seasonStudyMinutes || 0
        )
      ).label
  };
}


/* =========================================================
   GLOBAL DEBUG HELPERS
========================================================= */

window.JukenRPG = {
  ...(window.JukenRPG || {}),

  createParty,
  inviteToParty,
  leaveParty,
  disbandParty,

  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,

  useItem,
  buyShopItem,

  ensureDailyQuests,
  ensureWeeklyQuest,

  getWeeklyBossDefinition,
  calculateBossMaxHP,

  checkAchievements
};


/* =========================================================
   END OF PART 2
========================================================= */
/* =========================================================
   受験RPG - COMPLETE REBUILD
   PART 3 / 3
   Profile / Settings / Rank / Locker / Final Boot
========================================================= */


/* =========================================================
   PROFILE
========================================================= */

async function renderProfile() {
  if (!player) return;

  setText(
    "profile-display-name",
    player.displayName || "冒険者"
  );

  setText(
    "profile-user-id",
    `@${player.userId || ""}`
  );

  const courseNames = {
    science: "理系",
    humanities: "文系",
    undecided: "未定"
  };

  setText(
    "profile-course",
    courseNames[player.course] ||
      "未設定"
  );

  setText(
    "profile-level",
    `Lv.${player.level || 1}`
  );

  setText(
    "profile-xp",
    `${Number(
      player.xp || 0
    ).toLocaleString()} XP`
  );

  setText(
    "profile-stars",
    `${Number(
      player.stars || 0
    ).toLocaleString()} ⭐`
  );

  setText(
    "profile-coins",
    `${Number(
      player.coins || 0
    ).toLocaleString()} 🪙`
  );

  setText(
    "profile-title",
    getTitleName(
      player.equippedTitle
    )
  );

  setText(
    "profile-total-study-time",
    formatStudyHours(
      Number(
        player.totalStudyMinutes || 0
      )
    )
  );

  setText(
    "profile-total-xp",
    `${Number(
      player.xp || 0
    ).toLocaleString()} XP`
  );

  setText(
    "profile-total-coins",
    `${Number(
      player.totalCoinsEarned || 0
    ).toLocaleString()} 🪙`
  );

  setText(
    "profile-bosses-defeated",
    String(
      Number(
        player.bossesDefeated || 0
      )
    )
  );

  setText(
    "profile-quests-completed",
    String(
      Number(
        player.totalQuestsCompleted || 0
      )
    )
  );

  const subjectContainer =
    $("profile-subject-list");

  if (subjectContainer) {
    const subjects =
      Array.isArray(
        player.subjects
      )
        ? player.subjects
        : [];

    subjectContainer.innerHTML =
      subjects.map(
        subject => `
          <div class="profile-subject-item">

            <span>
              ${getSubjectIcon(
                subject
              )}
              ${escapeHTML(
                getSubjectName(
                  subject
                )
              )}
            </span>

            <strong>
              Lv.${Number(
                player.subjectLevels?.[
                  subject
                ] || 1
              )}
            </strong>

          </div>
        `
      ).join("");
  }
}


/* =========================================================
   OTHER SCREEN
========================================================= */

async function renderOther() {
  if (!player) return;

  /*
    Otherのトップ画面は
    HTML側のカードをそのまま利用。
  */

  await renderAchievements();
}


/* =========================================================
   RANK SYSTEM
========================================================= */

async function renderRank() {
  if (!player) return;

  const rank =
    getRankByMinutes(
      Number(
        player.seasonStudyMinutes || 0
      )
    );

  setText(
    "current-rank-name",
    rank.label
  );

  setText(
    "current-season-study-time",
    formatStudyHours(
      Number(
        player.seasonStudyMinutes || 0
      )
    )
  );

  setText(
    "current-season-time",
    `${rank.label}`
  );

  /*
    ランキング制度は廃止。
    既存HTMLにランキング欄が残っていても、
    JS側では明確に無効化する。
  */

  const rankingTab =
    $("ranking-tab");

  if (rankingTab) {
    rankingTab.innerHTML = `
      <div class="empty-message">
        <p>🏆 ランキング制度は廃止されました。</p>
        <p>自分自身の成長を目指そう。</p>
      </div>
    `;
  }

  const friendsRanking =
    $("friends-ranking-list");

  if (friendsRanking) {
    friendsRanking.innerHTML = "";
  }

  const globalRanking =
    $("global-ranking-list");

  if (globalRanking) {
    globalRanking.innerHTML = "";
  }

  const rankNumber =
    $("global-rank-number");

  if (rankNumber) {
    rankNumber.textContent = "—";
  }

  /*
    シーズン履歴
  */

  await renderSeasonHistory();
}


/* =========================================================
   SEASON HISTORY
========================================================= */

async function renderSeasonHistory() {
  const container =
    $("season-history-list");

  if (!container || !player) {
    return;
  }

  const history =
    Array.isArray(
      player.seasonHistory
    )
      ? player.seasonHistory
      : [];

  if (!history.length) {
    container.innerHTML =
      `<p class="empty-message">まだシーズン履歴はありません。</p>`;
    return;
  }

  container.innerHTML =
    history
      .slice()
      .reverse()
      .slice(0, 12)
      .map(
        season => `
          <div class="season-history-item">

            <div>
              <strong>
                ${escapeHTML(
                  season.seasonKey ||
                  ""
                )}
              </strong>

              <span>
                ${escapeHTML(
                  season.rankLabel ||
                  "Bronze"
                )}
              </span>
            </div>

            <div>
              ${formatStudyHours(
                Number(
                  season.studyMinutes ||
                  0
                )
              )}
            </div>

          </div>
        `
      )
      .join("");
}


/* =========================================================
   RANK TAB SETUP
========================================================= */

function setupRankTabs() {
  safeQueryAll(
    "[data-rank-tab]"
  ).forEach(
    button => {
      safeOn(
        button,
        "click",
        async () => {
          const tab =
            button.dataset.rankTab;

          safeQueryAll(
            "[data-rank-tab]"
          ).forEach(
            b =>
              b.classList.toggle(
                "active",
                b === button
              )
          );

          safeQueryAll(
            "#rank-screen .rank-tab-content"
          ).forEach(
            content =>
              content.classList.add(
                "hidden"
              )
          );

          if (
            tab === "rank"
          ) {
            $("rank-info-tab")
              ?.classList.remove(
                "hidden"
              );
          }

          if (
            tab === "ranking"
          ) {
            $("ranking-tab")
              ?.classList.remove(
                "hidden"
              );
          }

          if (
            tab === "history"
          ) {
            $("season-history-tab")
              ?.classList.remove(
                "hidden"
              );
          }

          await renderRank();
        }
      );
    }
  );
}


/* =========================================================
   OTHER TABS
========================================================= */

function setupOtherTabs() {
  safeQueryAll(
    "[data-other-tab]"
  ).forEach(
    button => {
      safeOn(
        button,
        "click",
        async () => {
          const tab =
            button.dataset.otherTab;

          safeQueryAll(
            "[data-other-tab]"
          ).forEach(
            b =>
              b.classList.toggle(
                "active",
                b === button
              )
          );

          safeQueryAll(
            "#other-screen .other-tab-content"
          ).forEach(
            content =>
              content.classList.add(
                "hidden"
              )
          );

          const target =
            $(
              `${tab}-tab`
            );

          if (target) {
            target.classList.remove(
              "hidden"
            );
          }

          if (
            tab === "achievement"
          ) {
            await renderAchievements();
          }

          if (
            tab === "shop"
          ) {
            await renderShop();
          }

          if (
            tab === "locker"
          ) {
            await renderLocker();
          }

          if (
            tab === "profile"
          ) {
            await renderProfile();
          }
        }
      );
    }
  );

  safeQueryAll(
    "[data-open-other-tab]"
  ).forEach(
    card => {
      safeOn(
        card,
        "click",
        async () => {
          const tab =
            card.dataset.openOtherTab;

          const button =
            document.querySelector(
              `[data-other-tab="${tab}"]`
            );

          if (button) {
            button.click();
          }
        }
      );
    }
  );
}


/* =========================================================
   QUEST TABS
========================================================= */

function setupQuestTabs() {
  safeQueryAll(
    "[data-quest-tab]"
  ).forEach(
    button => {
      safeOn(
        button,
        "click",
        async () => {
          const tab =
            button.dataset.questTab;

          safeQueryAll(
            "[data-quest-tab]"
          ).forEach(
            b =>
              b.classList.toggle(
                "active",
                b === button
              )
          );

          safeQueryAll(
            "#quest-screen .quest-tab-content"
          ).forEach(
            content =>
              content.classList.add(
                "hidden"
              )
          );

          if (
            tab === "daily"
          ) {
            $("daily-quest-tab")
              ?.classList.remove(
                "hidden"
              );

            await renderQuests();
          }

          if (
            tab === "weekly"
          ) {
            $("weekly-quest-tab")
              ?.classList.remove(
                "hidden"
              );

            await renderQuests();
          }

          if (
            tab === "boss"
          ) {
            $("boss-tab")
              ?.classList.remove(
                "hidden"
              );

            await renderBoss();
          }

          if (
            tab === "history"
          ) {
            $("quest-history-tab")
              ?.classList.remove(
                "hidden"
              );

            await renderQuests();
          }
        }
      );
    }
  );
}


/* =========================================================
   PARTY TABS
========================================================= */

function setupPartyTabs() {
  safeQueryAll(
    "[data-party-tab]"
  ).forEach(
    button => {
      safeOn(
        button,
        "click",
        async () => {
          const tab =
            button.dataset.partyTab;

          safeQueryAll(
            "[data-party-tab]"
          ).forEach(
            b =>
              b.classList.toggle(
                "active",
                b === button
              )
          );

          safeQueryAll(
            "#party-screen .party-tab-content"
          ).forEach(
            content =>
              content.classList.add(
                "hidden"
              )
          );

          if (
            tab === "party"
          ) {
            $("party-tab")
              ?.classList.remove(
                "hidden"
              );

            await renderParty();
          }

          if (
            tab === "friends"
          ) {
            $("friends-tab")
              ?.classList.remove(
                "hidden"
              );

            await renderFriends();
          }

          if (
            tab === "requests"
          ) {
            $("friend-requests-tab")
              ?.classList.remove(
                "hidden"
              );

            await renderFriendRequests();
          }
        }
      );
    }
  );
}


/* =========================================================
   SETTINGS
========================================================= */

function setupSettings() {
  safeOn(
    $("display-name-form"),
    "submit",
    async event => {
      event.preventDefault();

      const errorEl =
        $("display-name-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const value =
        $("settings-display-name")
          ?.value
          ?.trim() || "";

      if (
        value.length < 1 ||
        value.length > 30
      ) {
        if (errorEl) {
          errorEl.textContent =
            "表示名は1〜30文字で入力してください。";
        }

        return;
      }

      try {
        player.displayName =
          value;

        await savePlayer();

        await updateMyPartySnapshot();

        setText(
          "header-display-name",
          value
        );

        showNotification(
          "表示名を変更しました。"
        );

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            "表示名の変更に失敗しました。";
        }
      }
    }
  );


  /* =====================================================
     SUBJECT SETTINGS
  ===================================================== */

  safeOn(
    $("subject-settings-form"),
    "submit",
    async event => {
      event.preventDefault();

      const errorEl =
        $("settings-subject-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const selected =
        safeQueryAll(
          'input[name="settings-subjects"]:checked'
        ).map(
          input =>
            input.value
        );

      if (!selected.length) {
        if (errorEl) {
          errorEl.textContent =
            "最低1教科選択してください。";
        }

        return;
      }

      try {
        player.subjects =
          selected;

        for (
          const subject of selected
        ) {
          if (
            player.subjectLevels?.[
              subject
            ] == null
          ) {
            player.subjectLevels[
              subject
            ] = 1;
          }

          if (
            player.subjectStudyMinutes?.[
              subject
            ] == null
          ) {
            player.subjectStudyMinutes[
              subject
            ] = 0;
          }
        }

        await savePlayer();

        await updateMyPartySnapshot();

        showNotification(
          "📚 選択教科を更新しました。"
        );

        await renderProfile();

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            "教科設定の変更に失敗しました。";
        }
      }
    }
  );


  /* =====================================================
     PASSWORD
  ===================================================== */

  safeOn(
    $("password-form"),
    "submit",
    async event => {
      event.preventDefault();

      const errorEl =
        $("password-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const password =
        $("settings-new-password")
          ?.value || "";

      if (
        password.length < 6
      ) {
        if (errorEl) {
          errorEl.textContent =
            "パスワードは6文字以上にしてください。";
        }

        return;
      }

      try {
        if (!currentUser) {
          throw new Error(
            "ログインしてください。"
          );
        }

        await updatePassword(
          currentUser,
          password
        );

        if (
          $("settings-new-password")
        ) {
          $("settings-new-password")
            .value = "";
        }

        showNotification(
          "🔐 パスワードを変更しました。"
        );

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            getAuthErrorMessage(
              error
            );
        }
      }
    }
  );


  /* =====================================================
     DELETE ACCOUNT
  ===================================================== */

  safeOn(
    $("delete-account-button"),
    "click",
    async () => {
      const confirmed =
        window.confirm(
          "本当にアカウントを削除しますか？\n\nこの操作は元に戻せません。"
        );

      if (!confirmed) {
        return;
      }

      try {
        await completelyDeleteAccount();

      } catch (error) {
        console.error(
          "DELETE ACCOUNT ERROR:",
          error
        );

        showNotification(
          getAuthErrorMessage(
            error
          ),
          6000
        );
      }
    }
  );
}


/* =========================================================
   COMPLETE ACCOUNT DELETE
========================================================= */

async function completelyDeleteAccount() {
  if (!currentUser) {
    throw new Error(
      "ログインしていません。"
    );
  }

  const uid =
    currentUser.uid;

  /*
    自分のサブコレクションを削除。
  */

  const subCollections = [
    "studyRecords",
    "quests",
    "achievements"
  ];

  for (
    const subCollection
    of subCollections
  ) {
    try {
      const ref =
        collection(
          db,
          "users",
          uid,
          subCollection
        );

      const snap =
        await getDocs(ref);

      if (!snap.empty) {
        const batch =
          writeBatch(db);

        snap.docs.forEach(
          docSnap =>
            batch.delete(
              docSnap.ref
            )
        );

        await batch.commit();
      }
    } catch (error) {
      console.warn(
        `DELETE ${subCollection} FAILED`,
        error
      );
    }
  }

  /*
    ユーザードキュメント
  */

  try {
    await deleteDoc(
      doc(
        db,
        "users",
        uid
      )
    );
  } catch (error) {
    console.warn(
      "USER DOC DELETE FAILED",
      error
    );
  }

  /*
    Firebase Authentication
  */

  await deleteUser(
    currentUser
  );

  player = null;
  currentUser = null;

  if (
    maintenanceInterval
  ) {
    clearInterval(
      maintenanceInterval
    );

    maintenanceInterval =
      null;
  }

  $("main-app")
    ?.classList.add(
      "hidden"
    );

  $("auth-screen")
    ?.classList.remove(
      "hidden"
    );

  $("login-screen")
    ?.classList.remove(
      "hidden"
    );

  showNotification(
    "アカウントを削除しました。"
  );
}


/* =========================================================
   SETTINGS INITIALIZATION
========================================================= */

function loadSettingsIntoUI() {
  if (!player) return;

  const nameInput =
    $("settings-display-name");

  if (nameInput) {
    nameInput.value =
      player.displayName || "";
  }

  safeQueryAll(
    'input[name="settings-subjects"]'
  ).forEach(
    input => {
      input.checked =
        (
          player.subjects || []
        ).includes(
          input.value
        );
    }
  );
}


/* =========================================================
   AUTH ERROR MESSAGE
========================================================= */

function getAuthErrorMessage(
  error
) {
  const code =
    error?.code || "";

  const messages = {
    "auth/invalid-credential":
      "ユーザーIDまたはパスワードが違います。",
    "auth/invalid-login-credentials":
      "ユーザーIDまたはパスワードが違います。",
    "auth/user-not-found":
      "ユーザーIDまたはパスワードが違います。",
    "auth/wrong-password":
      "ユーザーIDまたはパスワードが違います。",
    "auth/email-already-in-use":
      "そのユーザーIDはすでに使用されています。",
    "auth/weak-password":
      "パスワードが弱すぎます。",
    "auth/too-many-requests":
      "試行回数が多すぎます。少し時間を置いてください。",
    "auth/requires-recent-login":
      "安全のため、もう一度ログインしてから実行してください。"
  };

  return (
    messages[code] ||
    error?.message ||
    "認証処理に失敗しました。"
  );
}


/* =========================================================
   AUTH ERROR OVERRIDE
========================================================= */

function setupAuthErrorHandling() {
  safeOn(
    $("login-form"),
    "submit",
    () => {
      const errorEl =
        $("login-error");

      if (errorEl) {
        errorEl.textContent = "";
      }
    }
  );

  safeOn(
    $("register-form"),
    "submit",
    () => {
      const errorEl =
        $("register-error");

      if (errorEl) {
        errorEl.textContent = "";
      }

      const subjectError =
        $("subject-error");

      if (subjectError) {
        subjectError.textContent =
          "";
      }
    }
  );
}


/* =========================================================
   DISPLAY NAME / SUBJECT UI SYNC
========================================================= */

function syncSettingsUI() {
  loadSettingsIntoUI();
}


/* =========================================================
   LEVEL / RANK VISUAL EFFECT
========================================================= */

function applyProgressEffects() {
  if (!player) return;

  const rank =
    getRankByMinutes(
      Number(
        player.seasonStudyMinutes || 0
      )
    );

  document.body.dataset.rank =
    rank.name
      .toLowerCase();

  document.body.dataset.level =
    String(
      player.level || 1
    );
}


/* =========================================================
   FINAL HEADER REFRESH
========================================================= */

const baseRefreshHeader =
  refreshHeader;

refreshHeader = async function () {
  await baseRefreshHeader();

  applyProgressEffects();
  syncSettingsUI();
};


/* =========================================================
   FINAL STUDY RECORD HOOK
========================================================= */

const baseRecordStudy =
  recordStudy;

recordStudy = async function (
  minutes,
  subject,
  note = ""
) {
  const result =
    await baseRecordStudy(
      minutes,
      subject,
      note
    );

  try {
    await updateMyPartySnapshot();
    await checkAchievements();
    await refreshHome();
  } catch (error) {
    console.error(
      "POST STUDY HOOK ERROR:",
      error
    );
  }

  return result;
};


/* =========================================================
   TIMER SUBJECT SYNC
========================================================= */

const baseTimerStart =
  startTimer;

startTimer = function () {
  const subject =
    $("study-subject")
      ?.value;

  if (subject) {
    timerState.subject =
      subject;
  }

  return baseTimerStart();
};


/* =========================================================
   STUDY SUBJECT CHANGE
========================================================= */

safeQueryAll(
  "#study-subject"
).forEach(
  select => {
    safeOn(
      select,
      "change",
      () => {
        timerState.subject =
          select.value;
      }
    );
  }
);


/* =========================================================
   MANUAL STUDY MINUTE INPUT
   HTMLのmax属性に依存しない
========================================================= */

const manualMinutesInput =
  $("study-minutes");

if (manualMinutesInput) {
  manualMinutesInput.removeAttribute(
    "max"
  );

  manualMinutesInput.setAttribute(
    "min",
    "1"
  );
}


/* =========================================================
   RANK THRESHOLD DISPLAY FIX
========================================================= */

function patchRankTable() {
  /*
    HTML側に旧ランク表が残っている場合、
    JSで内容を書き換える。
  */

  const rankTables =
    safeQueryAll(
      "#rank-screen table"
    );

  if (!rankTables.length) {
    return;
  }

  rankTables.forEach(
    table => {
      const rows =
        table.querySelectorAll(
          "tbody tr"
        );

      const definitions = [
        ["Bronze", "0時間"],
        ["Silver", "10時間"],
        ["Gold", "25時間"],
        ["Platinum", "45時間"],
        ["Diamond", "70時間"],
        ["Master", "100時間"],
        ["Grandmaster", "135時間"],
        ["Legend", "170時間"]
      ];

      rows.forEach(
        (row, index) => {
          if (
            !definitions[index]
          ) {
            return;
          }

          const cells =
            row.querySelectorAll(
              "td"
            );

          if (
            cells.length >= 2
          ) {
            cells[0].textContent =
              definitions[index][0];

            cells[1].textContent =
              definitions[index][1];
          }
        }
      );
    }
  );
}


/* =========================================================
   LEGEND PERMANENT XP BOOST
========================================================= */

function syncLegendBoost() {
  if (!player) return;

  const rank =
    getRankByMinutes(
      Number(
        player.seasonStudyMinutes || 0
      )
    );

  /*
    Legend到達経験ありなら
    永久1.5倍。
  */

  if (
    rank.name === "Legend" ||
    player.legendUnlocked
  ) {
    player.legendUnlocked =
      true;

    player.permanentXPMultiplier =
      1.5;
  } else {
    if (
      player.permanentXPMultiplier ==
      null
    ) {
      player.permanentXPMultiplier =
        1;
    }
  }
}


/* =========================================================
   LEGEND BOOST HOOK
========================================================= */

const baseSavePlayer =
  savePlayer;

savePlayer = async function () {
  syncLegendBoost();

  await baseSavePlayer();
};


/* =========================================================
   TEMPORARY ITEM BOOSTS
========================================================= */

function getEffectiveItemMultiplier(
  type
) {
  if (!player) return 1;

  if (
    type === "xp"
  ) {
    return Math.max(
      1,
      Number(
        player.activeXPBoostMultiplier ||
        1
      )
    );
  }

  if (
    type === "boss_attack"
  ) {
    return Math.max(
      1,
      Number(
        player.activeBossAttackMultiplier ||
        1
      )
    );
  }

  return 1;
}


/* =========================================================
   SAFE XP MULTIPLIER OVERRIDE
========================================================= */

const baseGetActiveXPMultiplier =
  getActiveXPMultiplier;

getActiveXPMultiplier =
  function () {
    if (!player) {
      return 1;
    }

    const permanent =
      Math.max(
        1,
        Number(
          player.permanentXPMultiplier ||
          1
        )
      );

    const item =
      Math.max(
        1,
        Number(
          player.activeXPBoostMultiplier ||
          1
        )
      );

    return (
      permanent *
      item
    );
  };


/* =========================================================
   USE ITEM OVERRIDE
========================================================= */

const baseUseItem =
  useItem;

useItem = async function (
  itemId
) {
  const item =
    BOSS_ITEMS.find(
      x =>
        x.id === itemId
    );

  if (!item) {
    throw new Error(
      "アイテムが見つかりません。"
    );
  }

  /*
    XPブーストは4種重複不可。
  */

  if (
    item.type === "xp" &&
    Number(
      player?.activeXPBoostMultiplier ||
      1
    ) > 1
  ) {
    throw new Error(
      "XPブーストは重ねて使用できません。"
    );
  }

  return baseUseItem(
    itemId
  );
};


/* =========================================================
   BOSS DEFENSE EFFECT
========================================================= */

function getEffectiveBossLevel(
  level
) {
  const reduction =
    Number(
      player?.activeBossDefenseReduction ||
      0
    );

  return Math.max(
    1,
    Number(level || 1) -
      reduction
  );
}


/* =========================================================
   BOSS HP WITH DEFENSE DEBUFF
========================================================= */

const baseCalculateBossMaxHP =
  calculateBossMaxHP;

calculateBossMaxHP =
  function (
    partySize,
    level
  ) {
    const effectiveLevel =
      getEffectiveBossLevel(
        level
      );

    return baseCalculateBossMaxHP(
      partySize,
      effectiveLevel
    );
  };


/* =========================================================
   BOSS DEBUFF CONSUMPTION
========================================================= */

const baseEnsureWeeklyBoss =
  ensureWeeklyBoss;

ensureWeeklyBoss =
  async function (
    party
  ) {
    const boss =
      await baseEnsureWeeklyBoss(
        party
      );

    /*
      重要:
      防御デバフはボスに入った時点で使用。
      過去のダメージには影響しない。
    */

    return boss;
  };


/* =========================================================
   USE ITEM - PARTY/BOSS EFFECT LOG
========================================================= */

async function consumeBossTemporaryEffects() {
  if (!player) return;

  /*
    攻撃バフ・防御デバフは
    1回のボス戦で使用可能。

    実際の消費は useItem() 時点。
  */

  if (
    Number(
      player.activeBossAttackMultiplier ||
      1
    ) > 1
  ) {
    player.activeBossAttackMultiplier =
      1;
  }

  player.activeBossDefenseReduction =
    0;

  await savePlayer();
}


/* =========================================================
   SHOP ITEM HELPERS
========================================================= */

function getItemById(
  itemId
) {
  return BOSS_ITEMS.find(
    item =>
      item.id === itemId
  ) || null;
}


/* =========================================================
   ACHIEVEMENT COUNT
========================================================= */

function getAchievementCount() {
  return Array.isArray(
    player?.achievements
  )
    ? player.achievements.length
    : 0;
}


/* =========================================================
   SEASON REWARD DISPLAY
========================================================= */

function getSeasonRewardPreview(
  rankName
) {
  const rewards = {
    Bronze: {
      xp: 50,
      coins: 100
    },
    Silver: {
      xp: 100,
      coins: 200
    },
    Gold: {
      xp: 200,
      coins: 350
    },
    Platinum: {
      xp: 350,
      coins: 550
    },
    Diamond: {
      xp: 550,
      coins: 800
    },
    Master: {
      xp: 800,
      coins: 1200
    },
    Grandmaster: {
      xp: 1200,
      coins: 1700
    },
    Legend: {
      xp: 1800,
      coins: 2500
    }
  };

  return (
    rewards[rankName] ||
    rewards.Bronze
  );
}


/* =========================================================
   FORCE CURRENT SEASON RANK
========================================================= */

function syncCurrentRank() {
  if (!player) return;

  player.rank =
    getRankByMinutes(
      Number(
        player.seasonStudyMinutes || 0
      )
    ).name;
}


/* =========================================================
   DATE / SEASON UI REFRESH
========================================================= */

async function refreshSeasonUI() {
  if (!player) return;

  syncCurrentRank();

  const rank =
    getRankByMinutes(
      Number(
        player.seasonStudyMinutes || 0
      )
    );

  setText(
    "home-rank",
    rank.label
  );

  setText(
    "home-season-study-time",
    formatStudyHours(
      Number(
        player.seasonStudyMinutes || 0
      )
    )
  );

  setText(
    "home-season-end",
    getMonthEndDate()
  );

  setText(
    "current-rank-name",
    rank.label
  );

  setText(
    "current-season-study-time",
    formatStudyHours(
      Number(
        player.seasonStudyMinutes || 0
      )
    )
  );
}


/* =========================================================
   MONTH END DATE
========================================================= */

function getMonthEndDate() {
  const now =
    getJSTDate();

  const year =
    now.getUTCFullYear();

  const month =
    now.getUTCMonth();

  const lastDay =
    new Date(
      Date.UTC(
        year,
        month + 1,
        0
      )
    ).getUTCDate();

  return `${year}/${String(
    month + 1
  ).padStart(2, "0")}/${String(
    lastDay
  ).padStart(2, "0")}`;
}


/* =========================================================
   HOME REFRESH OVERRIDE
========================================================= */

const baseRefreshHome =
  refreshHome;

refreshHome = async function () {
  await baseRefreshHome();

  await refreshSeasonUI();

  applyProgressEffects();
};


/* =========================================================
   FULL UI REFRESH
========================================================= */

async function refreshAllScreens() {
  if (!player) return;

  const tasks = [
    ["header", refreshHeader],
    ["home", refreshHome],
    ["quest", renderQuests],
    ["party", renderParty],
    ["boss", renderBoss],
    ["rank", renderRank],
    ["shop", renderShop],
    ["locker", renderLocker],
    ["profile", renderProfile],
    ["achievements", renderAchievements]
  ];

  for (
    const [name, task] of tasks
  ) {
    try {
      await task();
    } catch (error) {
      console.error(
        `REFRESH ${name} ERROR:`,
        error
      );
    }
  }
}


/* =========================================================
   APP VISIBILITY RECOVERY
========================================================= */

function setupVisibilityRecovery() {
  document.addEventListener(
    "visibilitychange",
    async () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        try {
          if (player) {
            await runDailyMaintenance();
            await refreshHome();
          }
        } catch (error) {
          console.error(
            "VISIBILITY RECOVERY ERROR:",
            error
          );
        }
      }
    }
  );
}


/* =========================================================
   BEFORE UNLOAD
========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    try {
      if (
        timerState.running
      ) {
        saveTimerLocal();
      }
    } catch {}
  }
);


/* =========================================================
   FINAL TAB INITIALIZATION
========================================================= */

function initializeAllTabs() {
  try {
    setupQuestTabs();
  } catch (error) {
    console.error(
      "QUEST TABS INIT ERROR",
      error
    );
  }

  try {
    setupPartyTabs();
  } catch (error) {
    console.error(
      "PARTY TABS INIT ERROR",
      error
    );
  }

  try {
    setupRankTabs();
  } catch (error) {
    console.error(
      "RANK TABS INIT ERROR",
      error
    );
  }

  try {
    setupOtherTabs();
  } catch (error) {
    console.error(
      "OTHER TABS INIT ERROR",
      error
    );
  }

  try {
    setupSettings();
  } catch (error) {
    console.error(
      "SETTINGS INIT ERROR",
      error
    );
  }

  try {
    setupAuthErrorHandling();
  } catch (error) {
    console.error(
      "AUTH ERROR INIT ERROR",
      error
    );
  }

  try {
    patchRankTable();
  } catch (error) {
    console.error(
      "RANK TABLE PATCH ERROR",
      error
    );
  }
}


/* =========================================================
   FINAL BOOT SAFETY
========================================================= */

let finalBootCompleted =
  false;

async function finalBoot() {
  if (
    finalBootCompleted
  ) {
    return;
  }

  finalBootCompleted =
    true;

  try {
    initializeAllTabs();
  } catch (error) {
    console.error(
      "TAB INITIALIZATION FAILED:",
      error
    );
  }

  try {
    setupVisibilityRecovery();
  } catch (error) {
    console.error(
      "VISIBILITY INIT FAILED:",
      error
    );
  }

  try {
    applyProgressEffects();
  } catch (error) {
    console.error(
      "VISUAL INIT FAILED:",
      error
    );
  }

  /*
    認証画面だけは、
    他機能のエラーで絶対に巻き込まない。
  */

  try {
    if (
      currentUser &&
      player
    ) {
      await refreshAllScreens();
    }
  } catch (error) {
    console.error(
      "FINAL REFRESH ERROR:",
      error
    );
  }
}


/* =========================================================
   START FINAL BOOT
========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      finalBoot().catch(
        error =>
          console.error(
            "FINAL BOOT ERROR:",
            error
          )
      );
    },
    {
      once: true
    }
  );
} else {
  finalBoot().catch(
    error =>
      console.error(
        "FINAL BOOT ERROR:",
        error
      )
  );
}


/* =========================================================
   FINAL GLOBAL API
========================================================= */

window.JukenRPG = {
  ...(window.JukenRPG || {}),

  player: () => player,
  currentUser: () => currentUser,

  refreshAllScreens,

  renderProfile,
  renderRank,
  renderShop,
  renderLocker,
  renderAchievements,

  runDailyMaintenance,

  getSeasonRewardPreview,
  getEffectiveBossLevel,
  getItemById
};


/* =========================================================
   END OF COMPLETE REBUILD
========================================================= */
