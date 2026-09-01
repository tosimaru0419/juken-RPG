// ============================================================
// 受験RPG - script.js
// COMPLETE STUDY + QUEST + RANK SYSTEM
//
// Firebase Auth
// Firestore (/users/{uid})
//
// XP
// LEVEL 1-100
// COINS
// MONTHLY SEASON RANK
// LEGEND PERMANENT XP BOOST
//
// Manual Study Record
// Study Timer
// Japan Time Midnight Split
// Subject Level
// Study History
//
// DAILY QUEST x3
// WEEKLY QUEST x1
// RARE QUEST
// QUEST AUTO PROGRESS
//
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
  updatePassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  writeBatch
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


// ============================================================
// Timer
// ============================================================

let timerInterval = null;

const timerState = {
  running: false,
  startedAt: null,
  accumulatedSeconds: 0,
  lastJapanDate: null,
  segmentStartedAt: null,
  segmentJapanDate: null,
  midnightBusy: false
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


// ============================================================
// Rank
// ============================================================

const RANKS = [
  { name: "Bronze", minMinutes: 0 },
  { name: "Silver", minMinutes: 10 * 60 },
  { name: "Gold", minMinutes: 25 * 60 },
  { name: "Platinum", minMinutes: 45 * 60 },
  { name: "Diamond", minMinutes: 70 * 60 },
  { name: "Master", minMinutes: 100 * 60 },
  { name: "Grandmaster", minMinutes: 135 * 60 },
  { name: "Legend", minMinutes: 170 * 60 }
];


// ============================================================
// Quest Settings
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
// DOM utilities
// ============================================================

function getElement(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = getElement(id);
  if (el) {
    el.textContent = value;
  }
}

function showElement(id) {
  const el = getElement(id);
  if (el) {
    el.classList.remove("hidden");
    el.style.display = "";
  }
}

function hideElement(id) {
  const el = getElement(id);
  if (el) {
    el.classList.add("hidden");
    el.style.display = "none";
  }
}

function clearError(id) {
  setText(id, "");
}

function showError(id, message) {
  setText(id, message);
}


// ============================================================
// HTML escape
// ============================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// Japan Date
// ============================================================

function getJapanDateString(date = new Date()) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(date)
    .replaceAll("/", "-");
}

function getJapanMonthString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(date);

  const year =
    parts.find(p => p.type === "year")?.value || "0000";

  const month =
    parts.find(p => p.type === "month")?.value || "00";

  return `${year}-${month}`;
}

function japanMidnightTimestamp(dateString) {
  return new Date(
    `${dateString}T00:00:00+09:00`
  ).getTime();
}

function formatMinutes(minutes) {
  const value = Math.max(
    0,
    Math.floor(Number(minutes) || 0)
  );

  const hours = Math.floor(value / 60);
  const mins = value % 60;

  if (hours > 0) {
    return `${hours}時間 ${mins}分`;
  }

  return `${mins}分`;
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  let date = null;

  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  }

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}


// ============================================================
// Week ID
// 月曜日開始
// ============================================================

function getJapanWeekId(date = new Date()) {
  const japanDate = getJapanDateString(date);
  const [y, m, d] = japanDate.split("-").map(Number);

  const utcDate = new Date(
    Date.UTC(y, m - 1, d)
  );

  const day = utcDate.getUTCDay();

  const diffToMonday =
    day === 0 ? -6 : 1 - day;

  utcDate.setUTCDate(
    utcDate.getUTCDate() + diffToMonday
  );

  const year = utcDate.getUTCFullYear();
  const month = String(
    utcDate.getUTCMonth() + 1
  ).padStart(2, "0");
  const dateValue = String(
    utcDate.getUTCDate()
  ).padStart(2, "0");

  return `${year}-${month}-${dateValue}`;
}


// ============================================================
// Firebase Error
// ============================================================

function firebaseErrorMessage(error) {
  console.error(error);

  const code = error?.code || "";

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
      "試行回数が多すぎます。少し時間を置いてください。",

    "auth/network-request-failed":
      "ネットワークエラーが発生しました。",

    "permission-denied":
      "Firestoreの権限がありません。",

    "failed-precondition":
      "Firestoreの設定を確認してください。"
  };

  return (
    messages[code] ||
    `エラーが発生しました。\n${error?.message || code}`
  );
}


// ============================================================
// Firebase initialize
// ============================================================

function initializeFirebase() {
  if (firebaseApp) {
    return true;
  }

  try {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);

    console.log("Firebase initialized.");

    return true;
  } catch (error) {
    console.error(
      "Firebase initialization error:",
      error
    );

    alert(
      "Firebaseの初期化に失敗しました。\n\n" +
      error.message
    );

    return false;
  }
}


// ============================================================
// User ID
// ============================================================

function normalizeUserId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function userIdToEmail(userId) {
  return `${normalizeUserId(userId)}@juken-rpg.local`;
}


// ============================================================
// Course
// ============================================================

function getCourseName(course) {
  const names = {
    science: "理系",
    humanities: "文系",
    undecided: "未定"
  };

  return names[course] || "未定";
}


// ============================================================
// Subject
// ============================================================

function getSubjectName(subject) {
  return SUBJECT_NAMES[subject] || subject || "その他";
}


// ============================================================
// Overall Level
// ============================================================

function xpRequiredForLevel(level) {
  if (level >= 100) {
    return 0;
  }

  const block =
    Math.floor((level - 1) / 10);

  return 100 + block * 50;
}

function totalXpForLevel(level) {
  let total = 0;

  for (let lv = 1; lv < level; lv++) {
    total += xpRequiredForLevel(lv);
  }

  return total;
}

function calculateLevel(totalXp) {
  const xp = Math.max(
    0,
    Math.floor(Number(totalXp) || 0)
  );

  let level = 1;

  while (level < 100) {
    const nextLevelXp =
      totalXpForLevel(level + 1);

    if (xp < nextLevelXp) {
      break;
    }

    level++;
  }

  return Math.min(100, level);
}

function getLevelProgress(totalXp) {
  const xp = Math.max(
    0,
    Math.floor(Number(totalXp) || 0)
  );

  const level = calculateLevel(xp);

  if (level >= 100) {
    return {
      level: 100,
      current: 0,
      required: 0,
      percent: 100
    };
  }

  const currentLevelXp =
    totalXpForLevel(level);

  const nextLevelXp =
    totalXpForLevel(level + 1);

  const current =
    xp - currentLevelXp;

  const required =
    nextLevelXp - currentLevelXp;

  const percent =
    Math.min(
      100,
      Math.max(
        0,
        (current / required) * 100
      )
    );

  return {
    level,
    current,
    required,
    percent
  };
}


// ============================================================
// Rank
// ============================================================

function calculateRank(seasonStudyMinutes) {
  const minutes = Math.max(
    0,
    Math.floor(
      Number(seasonStudyMinutes) || 0
    )
  );

  let rank = "Bronze";

  for (const data of RANKS) {
    if (minutes >= data.minMinutes) {
      rank = data.name;
    }
  }

  return rank;
}

function getRankInfo(rank) {
  return (
    RANKS.find(
      item => item.name === rank
    ) || RANKS[0]
  );
}

function getRankIndex(rank) {
  return Math.max(
    0,
    RANKS.findIndex(
      item => item.name === rank
    )
  );
}


// ============================================================
// Default Player
// ============================================================

function createDefaultPlayerData(userId = "") {
  const seasonId =
    getJapanMonthString();

  return {
    uid: "",

    userId,

    displayName:
      userId || "プレイヤー",

    course: "undecided",

    subjects: [],

    // Overall
    xp: 0,
    level: 1,

    // Currency
    coins: 0,
    stars: 0,

    // Study
    totalStudyMinutes: 0,

    todayStudyMinutes: 0,

    todayStudyDate:
      getJapanDateString(),

    todayXp: 0,

    todayCoins: 0,

    // Season
    seasonId,

    seasonStartDate:
      `${seasonId}-01`,

    seasonStudyMinutes: 0,

    rank: "Bronze",

    // Permanent Legend bonus
    permanentLegendBoost: false,

    // Subjects
    subjectLevels: {},

    subjectStudyMinutes: {},

    // Quest
    questState: null,

    // Cosmetic
    title: "見習い受験生",

    createdAt: null,

    updatedAt: null
  };
}


// ============================================================
// Daily normalization
// ============================================================

function normalizeDailyData(player) {
  const today =
    getJapanDateString();

  if (
    player.todayStudyDate !== today
  ) {
    player.todayStudyDate = today;
    player.todayStudyMinutes = 0;
    player.todayXp = 0;
    player.todayCoins = 0;
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
        Number(player.todayXp) || 0
      )
    );

  player.todayCoins =
    Math.max(
      0,
      Math.floor(
        Number(player.todayCoins) || 0
      )
    );

  return player;
}


// ============================================================
// Season normalization
// ============================================================

function normalizeSeasonData(player) {
  const currentSeason =
    getJapanMonthString();

  if (
    player.seasonId !== currentSeason
  ) {
    player.seasonId =
      currentSeason;

    player.seasonStartDate =
      `${currentSeason}-01`;

    player.seasonStudyMinutes = 0;
    player.rank = "Bronze";
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

  const calculatedRank =
    calculateRank(
      player.seasonStudyMinutes
    );

  const oldIndex =
    getRankIndex(player.rank);

  const newIndex =
    getRankIndex(calculatedRank);

  if (
    newIndex > oldIndex
  ) {
    player.rank =
      calculatedRank;
  }

  if (!player.rank) {
    player.rank =
      calculatedRank;
  }

  // Legend到達済みなら永久ブースト
  if (
    getRankIndex(player.rank) >=
    getRankIndex("Legend")
  ) {
    player.permanentLegendBoost = true;
  }

  return player;
}


// ============================================================
// Legend XP Boost
// ============================================================

function getXpMultiplier(player = currentPlayer) {
  if (
    player?.permanentLegendBoost
  ) {
    return 1.5;
  }

  return 1;
}


// ============================================================
// Firestore Player
// ============================================================

async function loadPlayer(user) {
  if (!user || !db) {
    return null;
  }

  const playerRef =
    doc(db, "users", user.uid);

  const snapshot =
    await getDoc(playerRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  const player = {
    ...createDefaultPlayerData(""),
    ...data
  };

  player.uid =
    player.uid || user.uid;

  player.userId =
    player.userId ||
    normalizeUserId(
      user.email?.split("@")[0]
    );

  player.subjects =
    Array.isArray(player.subjects)
      ? player.subjects
      : [];

  player.subjectLevels =
    player.subjectLevels || {};

  player.subjectStudyMinutes =
    player.subjectStudyMinutes || {};

  normalizeDailyData(player);
  normalizeSeasonData(player);

  player.level =
    calculateLevel(player.xp || 0);

  ensureQuestState(player);

  return player;
}


// ============================================================
// Create Player
// ============================================================

async function createPlayer(
  user,
  additionalData = {}
) {
  const userId =
    normalizeUserId(
      additionalData.userId ||
      user.email?.split("@")[0] ||
      ""
    );

  const defaultData =
    createDefaultPlayerData(userId);

  const playerData = {
    ...defaultData,

    ...additionalData,

    uid: user.uid,

    userId,

    email: user.email || "",

    level: 1,

    rank: "Bronze",

    permanentLegendBoost: false,

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp()
  };

  ensureQuestState(playerData);

  const playerRef =
    doc(db, "users", user.uid);

  await setDoc(
    playerRef,
    playerData
  );

  return playerData;
}


// ============================================================
// Save Player
// ============================================================

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
      currentPlayer.xp || 0
    );

  if (
    getRankIndex(
      currentPlayer.rank
    ) >= getRankIndex("Legend")
  ) {
    currentPlayer.permanentLegendBoost =
      true;
  }

  ensureQuestState(
    currentPlayer
  );

  const playerRef =
    doc(
      db,
      "users",
      currentUser.uid
    );

  await setDoc(
    playerRef,
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
// Quest System
// ============================================================

function createDefaultQuestState() {
  return {
    dailyDate:
      getJapanDateString(),

    daily: [],

    weeklyId:
      getJapanWeekId(),

    weekly: null,

    rareDate:
      getJapanDateString(),

    rare: {
      id: "rare-3h",
      title: "限界突破",
      description:
        "1日に合計3時間勉強する",
      target: RARE_QUEST_MINUTES,
      progress: 0,
      completed: false,
      claimed: false,
      rewardXp: QUEST_REWARDS.rareXp,
      rewardCoins: QUEST_REWARDS.rareCoins
    }
  };
}


function getQuestSubjectCandidates() {
  if (
    !currentPlayer ||
    !Array.isArray(currentPlayer.subjects)
  ) {
    return [];
  }

  return currentPlayer.subjects.filter(
    subject =>
      SUBJECT_NAMES[subject]
  );
}


function getLeastStudiedSubjects() {
  const subjects =
    getQuestSubjectCandidates();

  return [...subjects].sort(
    (a, b) => {
      const aMinutes =
        Number(
          currentPlayer
            ?.subjectStudyMinutes?.[a] || 0
        );

      const bMinutes =
        Number(
          currentPlayer
            ?.subjectStudyMinutes?.[b] || 0
        );

      return aMinutes - bMinutes;
    }
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
      `${getSubjectName(subject)}を20分勉強する`,

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


function createWeeklyQuest(subject) {
  return {
    id:
      `weekly-${getJapanWeekId()}-${subject}`,

    type: "weekly",

    title:
      `${getSubjectName(subject)}週間強化`,

    description:
      `${getSubjectName(subject)}を今週100分勉強する`,

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


function ensureQuestState(player) {
  if (!player) {
    return;
  }

  if (
    !player.questState ||
    typeof player.questState !== "object"
  ) {
    player.questState =
      createDefaultQuestState();
  }

  const today =
    getJapanDateString();

  const weekId =
    getJapanWeekId();

  const candidates =
    getLeastStudiedSubjects();

  // ----------------------------------------------------------
  // Daily
  // ----------------------------------------------------------

  if (
    player.questState.dailyDate !== today ||
    !Array.isArray(
      player.questState.daily
    ) ||
    player.questState.daily.length !==
      DAILY_QUEST_COUNT
  ) {
    const selected = [];

    for (
      const subject of candidates
    ) {
      if (
        selected.length >=
        DAILY_QUEST_COUNT
      ) {
        break;
      }

      if (!selected.includes(subject)) {
        selected.push(subject);
      }
    }

    // 教科数が3未満でも生成可能
    while (
      selected.length <
      Math.min(
        DAILY_QUEST_COUNT,
        candidates.length
      )
    ) {
      const subject =
        candidates[
          selected.length
        ];

      if (
        subject &&
        !selected.includes(subject)
      ) {
        selected.push(subject);
      } else {
        break;
      }
    }

    player.questState.daily =
      selected.map(
        (subject, index) =>
          createDailyQuest(
            subject,
            index
          )
      );

    player.questState.dailyDate =
      today;
  }

  // ----------------------------------------------------------
  // Weekly
  // ----------------------------------------------------------

  if (
    player.questState.weeklyId !==
      weekId ||
    !player.questState.weekly
  ) {
    const subject =
      candidates[0] || null;

    player.questState.weekly =
      subject
        ? createWeeklyQuest(subject)
        : null;

    player.questState.weeklyId =
      weekId;
  }

  // ----------------------------------------------------------
  // Rare
  // ----------------------------------------------------------

  if (
    player.questState.rareDate !==
    today
  ) {
    player.questState.rareDate =
      today;

    player.questState.rare = {
      id: "rare-3h",

      type: "rare",

      title: "限界突破",

      description:
        "1日に合計3時間勉強する",

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

  return player.questState;
}


// ============================================================
// Quest Progress
// ============================================================

function updateQuestProgress(
  subject,
  minutes,
  recordDate
) {
  if (!currentPlayer) {
    return [];
  }

  ensureQuestState(
    currentPlayer
  );

  const today =
    getJapanDateString();

  const currentWeek =
    getJapanWeekId();

  const completedNow = [];

  // ----------------------------------------------------------
  // Daily
  // ----------------------------------------------------------

  if (
    recordDate === today
  ) {
    for (
      const quest of
      currentPlayer.questState.daily
    ) {
      if (
        quest.completed ||
        quest.claimed
      ) {
        continue;
      }

      if (
        quest.subject !== subject
      ) {
        continue;
      }

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
        quest.completed = true;
        completedNow.push(quest);
      }
    }

    // Rare
    const rare =
      currentPlayer.questState.rare;

    if (
      rare &&
      !rare.completed &&
      !rare.claimed
    ) {
      rare.progress =
        Math.min(
          rare.target,
          Number(
            currentPlayer
              .todayStudyMinutes || 0
          )
        );

      if (
        rare.progress >=
        rare.target
      ) {
        rare.completed = true;
        completedNow.push(rare);
      }
    }
  }

  // ----------------------------------------------------------
  // Weekly
  // ----------------------------------------------------------

  if (
    recordDate === today
  ) {
    const weekly =
      currentPlayer.questState.weekly;

    if (
      weekly &&
      currentPlayer.questState.weeklyId ===
        currentWeek &&
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
        weekly.completed = true;
        completedNow.push(weekly);
      }
    }
  }

  return completedNow;
}


// ============================================================
// Quest Reward
// ============================================================

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

  quest.claimed = true;

  const multiplier =
    getXpMultiplier(
      currentPlayer
    );

  const baseXp =
    Number(
      quest.rewardXp || 0
    );

  const rewardXp =
    Math.floor(
      baseXp * multiplier
    );

  const rewardCoins =
    Number(
      quest.rewardCoins || 0
    );

  const oldLevel =
    calculateLevel(
      currentPlayer.xp || 0
    );

  currentPlayer.xp =
    Number(
      currentPlayer.xp || 0
    ) + rewardXp;

  currentPlayer.coins =
    Number(
      currentPlayer.coins || 0
    ) + rewardCoins;

  currentPlayer.level =
    calculateLevel(
      currentPlayer.xp
    );

  await savePlayer();

  updatePlayerUI();
  renderQuestUI();

  showNotification(
    `🎁 ${quest.title}達成！ +${rewardXp} XP / +${rewardCoins}🪙`
  );

  if (
    currentPlayer.level >
    oldLevel
  ) {
    showNotification(
      `🎉 LEVEL UP!! Lv.${oldLevel} → Lv.${currentPlayer.level}`
    );
  }

  return true;
}


// ============================================================
// Claim button delegation
// ============================================================

function initializeQuestRewardButtons() {
  const container =
    getElement(
      "quest-auto-container"
    );

  if (
    !container ||
    container.dataset.initialized
  ) {
    return;
  }

  container.dataset.initialized =
    "true";

  container.addEventListener(
    "click",
    async event => {
      const button =
        event.target.closest(
          "[data-claim-quest]"
        );

      if (!button) {
        return;
      }

      const questId =
        button.dataset.claimQuest;

      const quest =
        findQuestById(
          questId
        );

      if (!quest) {
        return;
      }

      button.disabled = true;

      try {
        await claimQuestReward(
          quest
        );
      } catch (error) {
        console.error(error);

        showNotification(
          firebaseErrorMessage(error)
        );

        quest.claimed = false;
      }
    }
  );
}


function findQuestById(id) {
  if (!currentPlayer?.questState) {
    return null;
  }

  const all = [
    ...(currentPlayer.questState.daily || [])
  ];

  if (
    currentPlayer.questState.weekly
  ) {
    all.push(
      currentPlayer.questState.weekly
    );
  }

  if (
    currentPlayer.questState.rare
  ) {
    all.push(
      currentPlayer.questState.rare
    );
  }

  return (
    all.find(
      quest => quest.id === id
    ) || null
  );
}


// ============================================================
// Quest UI
// HTMLに専用コンテナがなくても自動生成
// ============================================================

function getQuestContainer() {
  let container =
    getElement(
      "quest-auto-container"
    );

  if (container) {
    return container;
  }

  const screen =
    getElement(
      "quest-screen"
    );

  if (!screen) {
    return null;
  }

  container =
    document.createElement("div");

  container.id =
    "quest-auto-container";

  container.className =
    "quest-auto-container";

  screen.appendChild(
    container
  );

  return container;
}


function questProgressPercent(quest) {
  if (!quest?.target) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Number(
        quest.progress || 0
      ) /
        Number(quest.target) *
        100
    )
  );
}


function renderQuestCard(quest) {
  const percent =
    questProgressPercent(quest);

  const completed =
    quest.completed;

  const claimed =
    quest.claimed;

  return `
    <div class="rpg-quest-card ${
      completed
        ? "quest-completed"
        : ""
    }">

      <div class="quest-card-header">
        <div>
          <strong>
            ${escapeHtml(
              quest.title
            )}
          </strong>

          <div class="quest-description">
            ${escapeHtml(
              quest.description
            )}
          </div>
        </div>

        <span class="quest-reward">
          +${Number(
            quest.rewardXp || 0
          )} XP
          /
          +${Number(
            quest.rewardCoins || 0
          )}🪙
        </span>
      </div>

      <div class="quest-progress-text">
        ${Math.min(
          Number(
            quest.progress || 0
          ),
          Number(
            quest.target || 0
          )
        )} /
        ${Number(
          quest.target || 0
        )}分
      </div>

      <div class="quest-progress-bar">
        <div
          class="quest-progress-fill"
          style="width:${percent}%"
        ></div>
      </div>

      <div class="quest-card-footer">

        ${
          claimed
            ? `<span>✅ 受取済み</span>`
            : completed
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
              : `<span>進行中</span>`
        }

      </div>

    </div>
  `;
}


function renderQuestUI() {
  const container =
    getQuestContainer();

  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }

  ensureQuestState(
    currentPlayer
  );

  const state =
    currentPlayer.questState;

  const daily =
    state.daily || [];

  const weekly =
    state.weekly;

  const rare =
    state.rare;

  container.innerHTML = `
    <div class="quest-auto-header">
      <h2>⚔️ クエスト</h2>
      <p>
        勉強するだけで自動的に進行します。
      </p>
    </div>

    <section class="quest-section">
      <h3>🌅 デイリークエスト</h3>

      ${
        daily.length
          ? daily
              .map(renderQuestCard)
              .join("")
          : `
            <div class="empty-message">
              登録教科がありません。
            </div>
          `
      }
    </section>

    <section class="quest-section">
      <h3>📅 ウィークリークエスト</h3>

      ${
        weekly
          ? renderQuestCard(weekly)
          : `
            <div class="empty-message">
              登録教科がありません。
            </div>
          `
      }
    </section>

    <section class="quest-section rare-quest-section">
      <h3>💎 レアクエスト</h3>

      ${
        rare
          ? renderQuestCard(rare)
          : ""
      }

      <small>
        3時間達成で +100 XP / +500🪙
      </small>
    </section>
  `;

  initializeQuestRewardButtons();
}


// ============================================================
// Rank UI
// ============================================================

function getRankContainer() {
  let container =
    getElement(
      "rank-auto-container"
    );

  if (container) {
    return container;
  }

  const screen =
    getElement(
      "rank-screen"
    );

  if (!screen) {
    return null;
  }

  container =
    document.createElement("div");

  container.id =
    "rank-auto-container";

  container.className =
    "rank-auto-container";

  screen.appendChild(
    container
  );

  return container;
}


function renderRankProgress() {
  const container =
    getRankContainer();

  if (
    !container ||
    !currentPlayer
  ) {
    return;
  }

  const minutes =
    Number(
      currentPlayer.seasonStudyMinutes || 0
    );

  const rank =
    calculateRank(minutes);

  const index =
    getRankIndex(rank);

  const currentInfo =
    RANKS[index];

  const nextInfo =
    RANKS[index + 1];

  let percent = 100;
  let nextText = "LEGEND";

  if (nextInfo) {
    const currentMin =
      currentInfo.minMinutes;

    const nextMin =
      nextInfo.minMinutes;

    percent =
      Math.min(
        100,
        Math.max(
          0,
          (
            (minutes - currentMin) /
            (nextMin - currentMin)
          ) * 100
        )
      );

    nextText =
      `${nextInfo.name}まで ${
        formatMinutes(
          nextMin - minutes
        )
      }`;
  }

  container.innerHTML = `
    <div class="rank-auto-card">

      <div class="rank-auto-title">
        <span>🏆 CURRENT RANK</span>
        <strong>
          ${escapeHtml(rank)}
        </strong>
      </div>

      <div class="rank-auto-time">
        シーズン勉強時間：
        <strong>
          ${formatMinutes(minutes)}
        </strong>
      </div>

      <div class="rank-progress-bar">
        <div
          class="rank-progress-fill"
          style="width:${percent}%"
        ></div>
      </div>

      <div class="rank-next">
        ${escapeHtml(nextText)}
      </div>

      <div class="rank-list">
        ${RANKS.map(
          data => `
            <div class="${
              getRankIndex(data.name) <= index
                ? "rank-reached"
                : ""
            }">
              <span>
                ${escapeHtml(
                  data.name
                )}
              </span>

              <span>
                ${formatMinutes(
                  data.minMinutes
                )}
              </span>
            </div>
          `
        ).join("")}
      </div>

      ${
        currentPlayer.permanentLegendBoost
          ? `
            <div class="legend-boost">
              👑 LEGEND BONUS
              <br>
              永久XP 1.5倍
            </div>
          `
          : ""
      }

    </div>
  `;
}


function updateRankUI() {
  if (!currentPlayer) {
    return;
  }

  normalizeSeasonData(
    currentPlayer
  );

  const rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes || 0
    );

  setText(
    "current-rank",
    rank
  );

  setText(
    "rank-name",
    rank
  );

  setText(
    "rank-study-time",
    formatMinutes(
      currentPlayer.seasonStudyMinutes || 0
    )
  );

  renderRankProgress();
}


// ============================================================
// Screen control
// ============================================================

function showLoginScreen() {
  showElement("auth-screen");
  showElement("login-screen");

  hideElement("register-screen");
  hideElement("main-app");
}


function showRegisterScreen() {
  showElement("auth-screen");

  hideElement("login-screen");
  showElement("register-screen");
  hideElement("main-app");
}


function showMainScreen() {
  hideElement("auth-screen");
  showElement("main-app");

  document
    .querySelectorAll(".app-screen")
    .forEach(screen => {
      screen.classList.add("hidden");
      screen.style.display = "none";
    });

  const home =
    getElement("home-screen");

  if (home) {
    home.classList.remove("hidden");
    home.style.display = "";
  }

  activateBottomNav(
    "home-screen"
  );
}


// ============================================================
// Navigation
// ============================================================

function activateBottomNav(screenId) {
  document
    .querySelectorAll("[data-screen]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.screen ===
          screenId
      );
    });
}


function showAppScreen(screenId) {
  if (
    !currentUser ||
    !currentPlayer
  ) {
    return;
  }

  document
    .querySelectorAll(".app-screen")
    .forEach(screen => {
      screen.classList.add("hidden");
      screen.style.display = "none";
    });

  const target =
    getElement(screenId);

  if (!target) {
    return;
  }

  target.classList.remove("hidden");
  target.style.display = "";

  activateBottomNav(
    screenId
  );

  if (
    screenId ===
    "study-screen"
  ) {
    populateStudySubjectSelect();
    updateStudyUI();
    loadStudyHistory();
  }

  if (
    screenId ===
    "quest-screen"
  ) {
    initializeQuestTabs();
    renderQuestUI();
  }

  if (
    screenId ===
    "rank-screen"
  ) {
    updateRankUI();
  }

  updatePlayerUI();
}


// ============================================================
// Player UI
// ============================================================

function updatePlayerUI() {
  if (!currentPlayer) {
    return;
  }

  normalizeDailyData(
    currentPlayer
  );

  normalizeSeasonData(
    currentPlayer
  );

  ensureQuestState(
    currentPlayer
  );

  const progress =
    getLevelProgress(
      currentPlayer.xp || 0
    );

  const level =
    progress.level;

  const rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes ||
      0
    );

  currentPlayer.level =
    level;

  currentPlayer.rank =
    rank;

  if (
    getRankIndex(rank) >=
    getRankIndex("Legend")
  ) {
    currentPlayer.permanentLegendBoost =
      true;
  }

  // Header
  setText(
    "header-display-name",
    currentPlayer.displayName ||
      "冒険者"
  );

  setText(
    "header-level",
    `Lv.${level}`
  );

  setText(
    "header-rank",
    rank
  );

  setText(
    "header-coins",
    `🪙 ${currentPlayer.coins || 0}`
  );

  // Home
  setText(
    "home-level",
    level
  );

  setText(
    "home-xp",
    `${currentPlayer.xp || 0} XP`
  );

  setText(
    "today-study-time",
    formatMinutes(
      currentPlayer.todayStudyMinutes
    )
  );

  setText(
    "today-xp",
    `${currentPlayer.todayXp || 0} XP`
  );

  setText(
    "today-coins",
    `🪙 ${currentPlayer.todayCoins || 0}`
  );

  setText(
    "home-rank",
    rank
  );

  setText(
    "home-season-study-time",
    formatMinutes(
      currentPlayer.seasonStudyMinutes ||
      0
    )
  );

  setText(
    "star-count",
    `⭐ ${currentPlayer.stars || 0}`
  );

  setText(
    "star-title",
    currentPlayer.title ||
      "見習い受験生"
  );

  // XP bar
  const progressBar =
    getElement(
      "level-progress"
    );

  if (progressBar) {
    progressBar.style.width =
      `${progress.percent}%`;
  }

  if (level >= 100) {
    setText(
      "home-xp-required",
      "MAX LEVEL"
    );
  } else {
    setText(
      "home-xp-required",
      `次のレベルまで ${
        progress.required -
        progress.current
      } XP`
    );
  }

  // Profile
  setText(
    "profile-display-name",
    currentPlayer.displayName ||
      "-"
  );

  setText(
    "profile-user-id",
    currentPlayer.userId ||
      "-"
  );

  setText(
    "profile-course",
    getCourseName(
      currentPlayer.course
    )
  );

  setText(
    "profile-level",
    `Lv.${level}`
  );

  setText(
    "profile-xp",
    `${currentPlayer.xp || 0} XP`
  );

  setText(
    "profile-coins",
    currentPlayer.coins || 0
  );

  setText(
    "profile-stars",
    currentPlayer.stars || 0
  );

  setText(
    "profile-title",
    currentPlayer.title ||
      "-"
  );

  setText(
    "profile-total-study-time",
    formatMinutes(
      currentPlayer.totalStudyMinutes ||
      0
    )
  );

  setText(
    "profile-total-xp",
    `${currentPlayer.xp || 0} XP`
  );

  setText(
    "profile-total-coins",
    currentPlayer.coins || 0
  );

  updateSubjectLevelUI();

  // 現在開いている場合だけ更新
  if (
    !getElement(
      "quest-screen"
    )?.classList.contains("hidden")
  ) {
    renderQuestUI();
  }

  if (
    !getElement(
      "rank-screen"
    )?.classList.contains("hidden")
  ) {
    renderRankProgress();
  }
}


// ============================================================
// Subject UI
// ============================================================

function populateStudySubjectSelect() {
  const select =
    getElement(
      "study-subject"
    );

  if (
    !select ||
    !currentPlayer
  ) {
    return;
  }

  const previousValue =
    select.value;

  select.innerHTML =
    `<option value="">
      教科を選択
    </option>`;

  const subjects =
    Array.isArray(
      currentPlayer.subjects
    )
      ? currentPlayer.subjects
      : [];

  subjects.forEach(
    subject => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        subject;

      option.textContent =
        getSubjectName(
          subject
        );

      select.appendChild(
        option
      );
    }
  );

  if (
    subjects.includes(
      previousValue
    )
  ) {
    select.value =
      previousValue;
  }
}


function updateSubjectLevelUI() {
  if (!currentPlayer) {
    return;
  }

  const levelList =
    getElement(
      "subject-level-list"
    );

  const subjects =
    Array.isArray(
      currentPlayer.subjects
    )
      ? currentPlayer.subjects
      : [];

  if (levelList) {
    levelList.innerHTML = "";

    if (
      subjects.length === 0
    ) {
      levelList.innerHTML =
        `<p class="empty-message">
          受験教科が登録されていません。
        </p>`;
    } else {
      subjects.forEach(
        subject => {
          const level =
            Math.min(
              100,
              Number(
                currentPlayer
                  .subjectLevels?.[
                    subject
                  ] || 0
              )
            );

          const minutes =
            Number(
              currentPlayer
                .subjectStudyMinutes?.[
                  subject
                ] || 0
            );

          const remaining =
            level >= 100
              ? 0
              : 30 -
                (minutes % 30);

          const item =
            document.createElement(
              "div"
            );

          item.className =
            "subject-level-item";

          item.innerHTML = `
            <div>
              <strong>
                ${escapeHtml(
                  getSubjectName(subject)
                )}
              </strong>

              <span>
                Lv.${level}
              </span>
            </div>

            <div>
              ${formatMinutes(minutes)}
            </div>

            ${
              level >= 100
                ? `<small>MAX</small>`
                : `<small>
                    次のLvまで ${remaining}分
                  </small>`
            }
          `;

          levelList.appendChild(item);
        }
      );
    }
  }

  const studyList =
    getElement(
      "subject-study-list"
    );

  if (studyList) {
    studyList.innerHTML = "";

    subjects.forEach(
      subject => {
        const minutes =
          Number(
            currentPlayer
              .subjectStudyMinutes?.[
                subject
              ] || 0
          );

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "subject-study-item";

        item.innerHTML = `
          <span>
            ${escapeHtml(
              getSubjectName(subject)
            )}
          </span>

          <strong>
            ${formatMinutes(minutes)}
          </strong>
        `;

        studyList.appendChild(item);
      }
    );
  }
}


// ============================================================
// Study Record
// ============================================================

async function recordStudy(
  subject,
  minutes,
  note = "",
  source = "manual",
  options = {}
) {
  if (
    !currentUser ||
    !currentPlayer
  ) {
    throw new Error(
      "ログインしていません。"
    );
  }

  const safeMinutes =
    Math.floor(Number(minutes));

  if (
    !Number.isFinite(safeMinutes) ||
    safeMinutes < 1
  ) {
    throw new Error(
      "勉強時間は1分以上で入力してください。"
    );
  }

  if (!subject) {
    throw new Error(
      "教科を選択してください。"
    );
  }

  const subjects =
    Array.isArray(
      currentPlayer.subjects
    )
      ? currentPlayer.subjects
      : [];

  if (
    !subjects.includes(subject)
  ) {
    throw new Error(
      "登録している受験教科から選択してください。"
    );
  }

  normalizeDailyData(
    currentPlayer
  );

  normalizeSeasonData(
    currentPlayer
  );

  ensureQuestState(
    currentPlayer
  );

  const recordDate =
    options.recordDate ||
    getJapanDateString();

  const currentSeason =
    getJapanMonthString();

  const oldLevel =
    calculateLevel(
      currentPlayer.xp || 0
    );

  const oldRank =
    currentPlayer.rank ||
    "Bronze";

  // ----------------------------------------------------------
  // XP
  //
  // 通常:
  // 1分 = 1XP
  //
  // Legend:
  // 1分 = 1.5XP
  // ----------------------------------------------------------

  const multiplier =
    getXpMultiplier(
      currentPlayer
    );

  const gainedXp =
    Math.floor(
      safeMinutes * multiplier
    );

  const gainedCoins =
    safeMinutes;

  // Overall
  currentPlayer.xp =
    Number(
      currentPlayer.xp || 0
    ) + gainedXp;

  currentPlayer.totalStudyMinutes =
    Number(
      currentPlayer.totalStudyMinutes || 0
    ) + safeMinutes;

  currentPlayer.coins =
    Number(
      currentPlayer.coins || 0
    ) + gainedCoins;

  // Today
  const today =
    getJapanDateString();

  if (
    recordDate === today
  ) {
    currentPlayer.todayStudyMinutes =
      Number(
        currentPlayer.todayStudyMinutes || 0
      ) + safeMinutes;

    currentPlayer.todayXp =
      Number(
        currentPlayer.todayXp || 0
      ) + gainedXp;

    currentPlayer.todayCoins =
      Number(
        currentPlayer.todayCoins || 0
      ) + gainedCoins;
  }

  // Season
  if (
    currentSeason ===
    currentPlayer.seasonId
  ) {
    currentPlayer.seasonStudyMinutes =
      Number(
        currentPlayer.seasonStudyMinutes || 0
      ) + safeMinutes;
  }

  // Subject
  currentPlayer.subjectLevels =
    currentPlayer.subjectLevels || {};

  currentPlayer.subjectStudyMinutes =
    currentPlayer.subjectStudyMinutes || {};

  const oldSubjectMinutes =
    Number(
      currentPlayer
        .subjectStudyMinutes[subject] || 0
    );

  const newSubjectMinutes =
    oldSubjectMinutes + safeMinutes;

  currentPlayer
    .subjectStudyMinutes[subject] =
    newSubjectMinutes;

  currentPlayer.subjectLevels[subject] =
    Math.min(
      100,
      Math.floor(
        newSubjectMinutes / 30
      )
    );

  // Level
  currentPlayer.level =
    calculateLevel(
      currentPlayer.xp
    );

  // Rank
  currentPlayer.rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes
    );

  if (
    getRankIndex(
      currentPlayer.rank
    ) >= getRankIndex("Legend")
  ) {
    currentPlayer.permanentLegendBoost =
      true;
  }

  // Quest progression
  const completedQuests =
    updateQuestProgress(
      subject,
      safeMinutes,
      recordDate
    );

  // ----------------------------------------------------------
  // Firestore
  // ----------------------------------------------------------

  const batch =
    writeBatch(db);

  const playerRef =
    doc(
      db,
      "users",
      currentUser.uid
    );

  const recordRef =
    doc(
      collection(
        db,
        "users",
        currentUser.uid,
        "studyRecords"
      )
    );

  const playerData = {
    ...currentPlayer,

    uid:
      currentUser.uid,

    updatedAt:
      serverTimestamp()
  };

  const recordData = {
    userId:
      currentUser.uid,

    subject,

    subjectName:
      getSubjectName(subject),

    minutes:
      safeMinutes,

    note:
      String(note || "").trim(),

    source,

    date:
      recordDate,

    seasonId:
      currentSeason,

    xp:
      gainedXp,

    coins:
      gainedCoins,

    createdAt:
      serverTimestamp()
  };

  batch.set(
    playerRef,
    playerData,
    {
      merge: true
    }
  );

  batch.set(
    recordRef,
    recordData
  );

  await batch.commit();

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  updatePlayerUI();

  updateStudyUI();

  await loadStudyHistory();

  renderQuestUI();

  updateRankUI();

  // ----------------------------------------------------------
  // Notifications
  // ----------------------------------------------------------

  const newLevel =
    calculateLevel(
      currentPlayer.xp
    );

  if (
    newLevel > oldLevel
  ) {
    showNotification(
      `🎉 LEVEL UP!! Lv.${oldLevel} → Lv.${newLevel}`
    );
  }

  if (
    currentPlayer.rank !== oldRank
  ) {
    showNotification(
      `🏆 RANK UP!! ${oldRank} → ${currentPlayer.rank}`
    );
  }

  if (
    currentPlayer.rank === "Legend" &&
    oldRank !== "Legend"
  ) {
    currentPlayer.permanentLegendBoost =
      true;

    await savePlayer();

    showNotification(
      "👑 LEGEND到達！永久XP1.5倍を獲得！"
    );
  }

  for (
    const quest of completedQuests
  ) {
    if (
      quest &&
      !quest.claimed
    ) {
      showNotification(
        `🎯 クエスト達成！ ${quest.title}`
      );
    }
  }

  return {
    minutes:
      safeMinutes,

    xp:
      gainedXp,

    coins:
      gainedCoins,

    oldLevel,

    newLevel,

    oldRank,

    newRank:
      currentPlayer.rank,

    recordDate,

    completedQuests
  };
}


// ============================================================
// Manual Study Form
// ============================================================

function initializeStudyForm() {
  const form =
    getElement(
      "study-record-form"
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (studyRecordBusy) {
        return;
      }

      clearError("study-error");

      const subject =
        getElement(
          "study-subject"
        )?.value;

      const minutes =
        getElement(
          "study-minutes"
        )?.value;

      const note =
        getElement(
          "study-note"
        )?.value || "";

      studyRecordBusy = true;

      const button =
        getElement(
          "record-study-button"
        );

      if (button) {
        button.disabled = true;
        button.textContent =
          "記録中...";
      }

      try {
        const result =
          await recordStudy(
            subject,
            minutes,
            note,
            "manual"
          );

        form.reset();

        showNotification(
          `📚 ${result.minutes}分記録！ +${result.xp} XP / +${result.coins}🪙`
        );

      } catch (error) {
        console.error(
          "Manual study error:",
          error
        );

        showError(
          "study-error",
          firebaseErrorMessage(error)
        );

      } finally {
        studyRecordBusy = false;

        if (button) {
          button.disabled = false;
          button.textContent =
            "勉強を記録する";
        }
      }
    }
  );
}


// ============================================================
// Study History
// ============================================================

async function loadStudyHistory() {
  const list =
    getElement(
      "study-history-list"
    );

  if (!list) {
    return;
  }

  if (
    !currentUser ||
    !db
  ) {
    return;
  }

  list.innerHTML =
    `<p class="empty-message">
      読み込み中...
    </p>`;

  try {
    const recordsRef =
      collection(
        db,
        "users",
        currentUser.uid,
        "studyRecords"
      );

    const q =
      query(
        recordsRef,
        orderBy(
          "createdAt",
          "desc"
        ),
        limit(100)
      );

    const snapshot =
      await getDocs(q);

    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML =
        `<p class="empty-message">
          まだ勉強記録がありません。
        </p>`;

      return;
    }

    snapshot.forEach(
      record => {
        const data =
          record.data();

        const item =
          document.createElement(
            "div"
          );

        item.className =
          "study-history-item";

        item.innerHTML = `
          <div>
            <strong>
              ${escapeHtml(
                getSubjectName(
                  data.subject
                )
              )}
            </strong>

            <span>
              ${Number(
                data.minutes || 0
              )}分
            </span>
          </div>

          <div>
            +${Number(
              data.xp || 0
            )} XP
            /
            +${Number(
              data.coins || 0
            )}🪙
          </div>

          <small>
            ${escapeHtml(
              data.date || ""
            )}

            ${
              data.createdAt
                ? ` / ${escapeHtml(
                    formatDateTime(
                      data.createdAt
                    )
                  )}`
                : ""
            }

            ${
              data.note
                ? ` / ${escapeHtml(
                    data.note
                  )}`
                : ""
            }
          </small>
        `;

        list.appendChild(item);
      }
    );

  } catch (error) {
    console.error(
      "Study history error:",
      error
    );

    list.innerHTML =
      `<p class="error-message">
        勉強履歴を読み込めませんでした。
      </p>`;
  }
}


// ============================================================
// Study UI
// ============================================================

function updateStudyUI() {
  if (!currentPlayer) {
    return;
  }

  populateStudySubjectSelect();
  updateSubjectLevelUI();
  updateTimerDisplay();
}


// ============================================================
// Timer
// ============================================================

function getTimerSeconds() {
  let seconds =
    Number(
      timerState.accumulatedSeconds || 0
    );

  if (
    timerState.running &&
    timerState.startedAt
  ) {
    seconds += Math.max(
      0,
      (
        Date.now() -
        timerState.startedAt
      ) / 1000
    );
  }

  return Math.floor(seconds);
}


function getTimerSegmentSeconds() {
  if (
    !timerState.running ||
    !timerState.segmentStartedAt
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        timerState.segmentStartedAt
      ) / 1000
    )
  );
}


function formatTimer(seconds) {
  const value =
    Math.max(
      0,
      Math.floor(
        Number(seconds) || 0
      )
    );

  const hours =
    Math.floor(value / 3600);

  const minutes =
    Math.floor(
      (value % 3600) / 60
    );

  const secs =
    value % 60;

  return [
    hours,
    minutes,
    secs
  ]
    .map(
      n =>
        String(n).padStart(2, "0")
    )
    .join(":");
}


function updateTimerDisplay() {
  setText(
    "study-timer-display",
    formatTimer(
      getTimerSeconds()
    )
  );
}


// ============================================================
// Timer Start
// ============================================================

function startTimer() {
  if (timerState.running) {
    return;
  }

  const subject =
    getElement(
      "study-subject"
    )?.value;

  if (!subject) {
    showNotification(
      "⚠️ 先に教科を選択してください。"
    );

    return;
  }

  const now = Date.now();

  const today =
    getJapanDateString(
      new Date(now)
    );

  timerState.running = true;
  timerState.startedAt = now;

  timerState.lastJapanDate =
    today;

  timerState.segmentStartedAt =
    now;

  timerState.segmentJapanDate =
    today;

  clearInterval(
    timerInterval
  );

  timerInterval =
    setInterval(
      handleTimerTick,
      1000
    );

  updateTimerDisplay();

  showNotification(
    "⏱️ タイマー開始！"
  );
}


// ============================================================
// Timer Pause
// ============================================================

function pauseTimer(
  silent = false
) {
  if (!timerState.running) {
    return;
  }

  const elapsed =
    Math.floor(
      (
        Date.now() -
        timerState.startedAt
      ) / 1000
    );

  timerState.accumulatedSeconds +=
    Math.max(
      0,
      elapsed
    );

  timerState.running = false;

  timerState.startedAt = null;
  timerState.segmentStartedAt = null;
  timerState.segmentJapanDate = null;

  clearInterval(
    timerInterval
  );

  timerInterval = null;

  updateTimerDisplay();

  if (!silent) {
    showNotification(
      "⏸️ タイマー一時停止"
    );
  }
}


// ============================================================
// Timer Reset
// ============================================================

function resetTimer(
  silent = false
) {
  timerState.running = false;

  timerState.startedAt = null;

  timerState.accumulatedSeconds = 0;

  timerState.lastJapanDate =
    getJapanDateString();

  timerState.segmentStartedAt = null;
  timerState.segmentJapanDate = null;
  timerState.midnightBusy = false;

  clearInterval(
    timerInterval
  );

  timerInterval = null;

  updateTimerDisplay();

  if (!silent) {
    showNotification(
      "🔄 タイマーをリセットしました。"
    );
  }
}


// ============================================================
// Midnight
// ============================================================

async function handleMidnightTimer() {
  if (
    !timerState.running ||
    timerState.midnightBusy
  ) {
    return;
  }

  const now = Date.now();

  const currentDate =
    getJapanDateString(
      new Date(now)
    );

  const oldDate =
    timerState.segmentJapanDate ||
    timerState.lastJapanDate;

  if (
    !oldDate ||
    oldDate === currentDate
  ) {
    timerState.lastJapanDate =
      currentDate;

    return;
  }

  timerState.midnightBusy = true;

  try {
    const subject =
      getElement(
        "study-subject"
      )?.value;

    if (!subject) {
      pauseTimer(true);

      showNotification(
        "⚠️ 日付変更時に教科が見つからなかったためタイマーを停止しました。"
      );

      return;
    }

    const previousMidnight =
      japanMidnightTimestamp(
        oldDate
      );

    const currentMidnight =
      japanMidnightTimestamp(
        currentDate
      );

    const previousSegmentStart =
      timerState.segmentStartedAt ||
      previousMidnight;

    const previousSeconds =
      Math.max(
        0,
        Math.floor(
          (
            currentMidnight -
            previousSegmentStart
          ) / 1000
        )
      );

    const todaySeconds =
      Math.max(
        0,
        Math.floor(
          (
            now -
            currentMidnight
          ) / 1000
        )
      );

    const previousMinutes =
      Math.floor(
        previousSeconds / 60
      );

    if (
      previousMinutes >= 1
    ) {
      await recordStudy(
        subject,
        previousMinutes,
        "日付変更による自動記録",
        "timer-midnight",
        {
          recordDate:
            oldDate
        }
      );
    }

    timerState.accumulatedSeconds =
      todaySeconds;

    timerState.startedAt =
      now;

    timerState.segmentStartedAt =
      currentMidnight;

    timerState.segmentJapanDate =
      currentDate;

    timerState.lastJapanDate =
      currentDate;

    updateTimerDisplay();

    showNotification(
      `🌅 ${currentDate}になりました。前日分を保存してタイマーを継続します！`
    );

  } catch (error) {
    console.error(
      "Midnight timer error:",
      error
    );

    showNotification(
      "⚠️ 日付変更時の自動保存に失敗しました。"
    );

  } finally {
    timerState.midnightBusy = false;
  }
}


// ============================================================
// Timer Tick
// ============================================================

function handleTimerTick() {
  if (!timerState.running) {
    return;
  }

  const today =
    getJapanDateString();

  if (
    timerState.segmentJapanDate &&
    today !==
      timerState.segmentJapanDate
  ) {
    handleMidnightTimer();
    return;
  }

  timerState.lastJapanDate =
    today;

  updateTimerDisplay();
}


// ============================================================
// Save Timer
// ============================================================

async function saveTimerStudy() {
  if (studyRecordBusy) {
    return;
  }

  const seconds =
    getTimerSeconds();

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 1) {
    showNotification(
      "⚠️ 1分以上勉強してから記録してください。"
    );

    return;
  }

  const subject =
    getElement(
      "study-subject"
    )?.value;

  if (!subject) {
    showNotification(
      "⚠️ 先に教科を選択してください。"
    );

    return;
  }

  studyRecordBusy = true;

  const button =
    getElement(
      "timer-save-button"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "記録中...";
  }

  try {
    pauseTimer(true);

    await recordStudy(
      subject,
      minutes,
      "タイマー記録",
      "timer"
    );

    resetTimer(true);

    showNotification(
      `⏱️ ${minutes}分保存！ +${minutes} XP / +${minutes}🪙`
    );

  } catch (error) {
    console.error(
      "Timer save error:",
      error
    );

    showNotification(
      firebaseErrorMessage(error)
    );

  } finally {
    studyRecordBusy = false;

    if (button) {
      button.disabled = false;
      button.textContent =
        "タイマーの勉強時間を記録";
    }
  }
}


// ============================================================
// Timer buttons
// ============================================================

function initializeTimer() {
  const start =
    getElement(
      "study-timer-start"
    );

  const pause =
    getElement(
      "study-timer-pause"
    );

  const reset =
    getElement(
      "study-timer-reset"
    );

  const save =
    getElement(
      "timer-save-button"
    );

  if (start) {
    start.addEventListener(
      "click",
      startTimer
    );
  }

  if (pause) {
    pause.addEventListener(
      "click",
      pauseTimer
    );
  }

  if (reset) {
    reset.addEventListener(
      "click",
      resetTimer
    );
  }

  if (save) {
    save.addEventListener(
      "click",
      saveTimerStudy
    );
  }

  updateTimerDisplay();
}


// ============================================================
// Quest Tabs
// ============================================================

function initializeQuestTabs() {
  const buttons =
    document.querySelectorAll(
      "[data-quest-tab]"
    );

  buttons.forEach(
    button => {
      if (
        button.dataset
          .questInitialized
      ) {
        return;
      }

      button.dataset
        .questInitialized =
        "true";

      button.addEventListener(
        "click",
        () => {
          const tab =
            button.dataset
              .questTab;

          buttons.forEach(
            btn => {
              btn.classList.toggle(
                "active",
                btn === button
              );
            }
          );

          document
            .querySelectorAll(
              ".quest-tab-content"
            )
            .forEach(
              content => {
                content.classList.add(
                  "hidden"
                );

                content.style.display =
                  "none";
              }
            );

          const target =
            getElement(
              `${tab}-quest-tab`
            ) ||
            getElement(
              `${tab}-tab`
            );

          if (target) {
            target.classList.remove(
              "hidden"
            );

            target.style.display =
              "";
          }

          renderQuestUI();
        }
      );
    }
  );

  renderQuestUI();
}


// ============================================================
// Notification
// ============================================================

function showNotification(message) {
  const notification =
    getElement(
      "notification"
    );

  if (!notification) {
    console.log(
      "[NOTIFICATION]",
      message
    );

    return;
  }

  notification.textContent =
    message;

  notification.classList.remove(
    "hidden"
  );

  notification.style.display =
    "";

  clearTimeout(
    showNotification.timeout
  );

  showNotification.timeout =
    setTimeout(
      () => {
        notification.classList.add(
          "hidden"
        );

        notification.style.display =
          "none";
      },
      3000
    );
}


// ============================================================
// Level Up Modal
// ============================================================

function closeLevelUpModal() {
  const modal =
    getElement(
      "level-up-modal"
    );

  if (modal) {
    modal.classList.add(
      "hidden"
    );

    modal.style.display =
      "none";
  }
}


function initializeLevelUpModal() {
  const close =
    getElement(
      "level-up-close"
    );

  if (close) {
    close.addEventListener(
      "click",
      closeLevelUpModal
    );
  }
}


// ============================================================
// Login
// ============================================================

function initializeLoginForm() {
  const form =
    getElement(
      "login-form"
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      clearError(
        "login-error"
      );

      const userId =
        normalizeUserId(
          getElement(
            "login-user-id"
          )?.value
        );

      const password =
        getElement(
          "login-password"
        )?.value || "";

      if (!userId) {
        showError(
          "login-error",
          "ユーザーIDを入力してください。"
        );

        return;
      }

      if (!password) {
        showError(
          "login-error",
          "パスワードを入力してください。"
        );

        return;
      }

      const button =
        getElement(
          "login-button"
        );

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

        console.log(
          "Login successful."
        );

      } catch (error) {
        console.error(
          "Login error:",
          error
        );

        showError(
          "login-error",
          firebaseErrorMessage(error)
        );

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent =
            "ログイン";
        }
      }
    }
  );
}


// ============================================================
// Registration
// ============================================================

function initializeRegisterForm() {
  const form =
    getElement(
      "register-form"
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      clearError(
        "register-error"
      );

      clearError(
        "subject-error"
      );

      const userId =
        normalizeUserId(
          getElement(
            "register-user-id"
          )?.value
        );

      const password =
        getElement(
          "register-password"
        )?.value || "";

      const passwordConfirm =
        getElement(
          "register-password-confirm"
        )?.value || "";

      const displayName =
        String(
          getElement(
            "register-display-name"
          )?.value || ""
        ).trim();

      const course =
        document.querySelector(
          'input[name="course"]:checked'
        )?.value ||
        "undecided";

      const subjects =
        Array.from(
          document.querySelectorAll(
            'input[name="subjects"]:checked'
          )
        ).map(
          input => input.value
        );

      if (
        !/^[a-z0-9_-]{3,30}$/.test(
          userId
        )
      ) {
        showError(
          "register-error",
          "ユーザーIDは3〜30文字の英数字・_・-で入力してください。"
        );

        return;
      }

      if (
        password.length < 6
      ) {
        showError(
          "register-error",
          "パスワードは6文字以上にしてください。"
        );

        return;
      }

      if (
        password !==
        passwordConfirm
      ) {
        showError(
          "register-error",
          "パスワードが一致していません。"
        );

        return;
      }

      if (!displayName) {
        showError(
          "register-error",
          "表示名を入力してください。"
        );

        return;
      }

      if (
        subjects.length === 0
      ) {
        showError(
          "subject-error",
          "受験教科を1つ以上選択してください。"
        );

        return;
      }

      const button =
        getElement(
          "register-button"
        );

      if (button) {
        button.disabled = true;
        button.textContent =
          "冒険者登録中...";
      }

      try {
        const credential =
          await createUserWithEmailAndPassword(
            auth,
            userIdToEmail(userId),
            password
          );

        const player =
          await createPlayer(
            credential.user,
            {
              userId,
              displayName,
              course,
              subjects
            }
          );

        currentUser =
          credential.user;

        currentPlayer =
          player;

        updatePlayerUI();

        populateStudySubjectSelect();

        showMainScreen();

        showNotification(
          "🎉 冒険者登録完了！"
        );

      } catch (error) {
        console.error(
          "Register error:",
          error
        );

        showError(
          "register-error",
          firebaseErrorMessage(error)
        );

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent =
            "冒険を始める";
        }
      }
    }
  );
}


// ============================================================
// Settings
// ============================================================

function initializeSettings() {
  const displayNameInput =
    getElement(
      "settings-display-name"
    );

  const saveButton =
    getElement(
      "save-settings-button"
    );

  if (
    displayNameInput &&
    currentPlayer
  ) {
    displayNameInput.value =
      currentPlayer.displayName ||
      "";
  }

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      async () => {
        if (
          !currentPlayer ||
          !currentUser
        ) {
          return;
        }

        const value =
          String(
            displayNameInput?.value ||
              ""
          ).trim();

        if (!value) {
          showNotification(
            "表示名を入力してください。"
          );

          return;
        }

        try {
          currentPlayer.displayName =
            value;

          await savePlayer();

          updatePlayerUI();

          showNotification(
            "✅ 設定を保存しました。"
          );

        } catch (error) {
          console.error(error);

          showNotification(
            firebaseErrorMessage(error)
          );
        }
      }
    );
  }
}


// ============================================================
// Logout
// ============================================================

function initializeLogout() {
  const button =
    getElement(
      "logout-button"
    );

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    async () => {
      try {
        resetTimer(true);

        await signOut(auth);

        currentUser = null;
        currentPlayer = null;

        showLoginScreen();

        showNotification(
          "ログアウトしました。"
        );

      } catch (error) {
        console.error(error);

        alert(
          firebaseErrorMessage(error)
        );
      }
    }
  );
}


// ============================================================
// Auth Observer
// ============================================================

function initializeAuthObserver() {
  if (authObserverStarted) {
    return;
  }

  authObserverStarted = true;

  onAuthStateChanged(
    auth,
    async user => {
      console.log(
        "Auth state changed:",
        user
      );

      if (!user) {
        currentUser = null;
        currentPlayer = null;

        resetTimer(true);

        showLoginScreen();

        return;
      }

      currentUser = user;

      try {
        let player =
          await loadPlayer(user);

        if (!player) {
          const userId =
            normalizeUserId(
              user.email
                ?.split("@")[0] ||
              ""
            );

          player =
            await createPlayer(
              user,
              {
                userId,

                displayName:
                  userId ||
                  "プレイヤー"
              }
            );
        }

        currentPlayer =
          player;

        normalizeDailyData(
          currentPlayer
        );

        normalizeSeasonData(
          currentPlayer
        );

        ensureQuestState(
          currentPlayer
        );

        currentPlayer.level =
          calculateLevel(
            currentPlayer.xp || 0
          );

        await savePlayer();

        updatePlayerUI();

        populateStudySubjectSelect();

        showMainScreen();

        await loadStudyHistory();

        renderQuestUI();

        updateRankUI();

        console.log(
          "Player loaded successfully:",
          currentPlayer
        );

      } catch (error) {
        console.error(
          "Player loading error:",
          error
        );

        currentPlayer = null;

        showLoginScreen();

        showError(
          "login-error",
          firebaseErrorMessage(error)
        );
      }
    }
  );
}


// ============================================================
// Bottom Navigation
// ============================================================

function initializeBottomNavigation() {
  document
    .querySelectorAll(
      "[data-screen]"
    )
    .forEach(
      button => {
        if (
          button.dataset
            .navigationInitialized
        ) {
          return;
        }

        button.dataset
          .navigationInitialized =
          "true";

        button.addEventListener(
          "click",
          () => {
            const screenId =
              button.dataset
                .screen;

            if (!screenId) {
              return;
            }

            showAppScreen(
              screenId
            );
          }
        );
      }
    );
}


// ============================================================
// Auth screen buttons
// ============================================================

function initializeAuthButtons() {
  const showRegister =
    getElement(
      "show-register-button"
    );

  const showLogin =
    getElement(
      "show-login-button"
    );

  if (showRegister) {
    showRegister.addEventListener(
      "click",
      () => {
        clearError(
          "register-error"
        );

        clearError(
          "subject-error"
        );

        showRegisterScreen();
      }
    );
  }

  if (showLogin) {
    showLogin.addEventListener(
      "click",
      () => {
        clearError(
          "login-error"
        );

        showLoginScreen();
      }
    );
  }
}


// ============================================================
// Boot
// ============================================================

function boot() {
  if (booted) {
    return;
  }

  booted = true;

  console.log(
    "======================================"
  );

  console.log(
    "受験RPG COMPLETE SYSTEM"
  );

  console.log(
    "Study + Quest + Rank"
  );

  console.log(
    "======================================"
  );

  if (
    !initializeFirebase()
  ) {
    return;
  }

  initializeLoginForm();

  initializeRegisterForm();

  initializeTimer();

  initializeStudyForm();

  initializeBottomNavigation();

  initializeAuthButtons();

  initializeLogout();

  initializeLevelUpModal();

  initializeSettings();

  initializeAuthObserver();

  showLoginScreen();

  console.log(
    "受験RPG boot complete."
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
    boot,
    {
      once: true
    }
  );
} else {
  boot();
}
