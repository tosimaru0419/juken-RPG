/* =========================================================
   受験RPG - script.js
   Firebase Authentication + Firestore
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


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
   月初〜月末
========================================================= */

const RANKS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 10 },
  { name: "Gold", min: 20 },
  { name: "Platinum", min: 35 },
  { name: "Diamond", min: 50 },
  { name: "Master", min: 70 },
  { name: "Grandmaster", min: 100 },
  { name: "Legend", min: 150 }
];

function getRank(hours) {
  let result = RANKS[0];

  for (const rank of RANKS) {
    if (hours >= rank.min) {
      result = rank;
    }
  }

  return result.name;
}


/* =========================================================
   XP / LEVEL
   Lv1→2 = 100 XP
   10レベルごとに必要XP +50
========================================================= */

function xpRequiredForLevel(level) {
  if (level >= 100) return Infinity;

  const range = Math.floor((level - 1) / 10);
  return 100 + range * 50;
}

function calculateLevel(totalXP) {
  let level = 1;
  let remaining = Math.max(0, totalXP);

  while (level < 100) {
    const required = xpRequiredForLevel(level);

    if (remaining < required) {
      break;
    }

    remaining -= required;
    level++;
  }

  return {
    level,
    currentXP: remaining,
    requiredXP: level >= 100 ? 0 : xpRequiredForLevel(level)
  };
}


/* =========================================================
   SUBJECT LEVEL
   60分 = 1教科XP
   100レベル上限
========================================================= */

function calculateSubjectLevel(minutes) {
  return Math.min(100, Math.floor(Math.max(0, minutes) / 60) + 1);
}


/* =========================================================
   QUEST DATA
========================================================= */

const DAILY_QUESTS = [
  {
    id: "daily-study-30",
    title: "小さな一歩",
    description: "30分勉強する",
    target: 30,
    type: "study",
    rewardXP: 30,
    rewardCoins: 20
  },
  {
    id: "daily-study-60",
    title: "今日の鍛錬",
    description: "60分勉強する",
    target: 60,
    type: "study",
    rewardXP: 60,
    rewardCoins: 40
  },
  {
    id: "daily-study-120",
    title: "本気の冒険",
    description: "120分勉強する",
    target: 120,
    type: "study",
    rewardXP: 100,
    rewardCoins: 80
  }
];

const WEEKLY_QUESTS = [
  {
    id: "weekly-study-300",
    title: "週間修行",
    description: "今週300分勉強する",
    target: 300,
    type: "study",
    rewardXP: 150,
    rewardCoins: 100
  },
  {
    id: "weekly-study-600",
    title: "努力の証",
    description: "今週600分勉強する",
    target: 600,
    type: "study",
    rewardXP: 300,
    rewardCoins: 200
  },
  {
    id: "weekly-study-1000",
    title: "限界突破",
    description: "今週1000分勉強する",
    target: 1000,
    type: "study",
    rewardXP: 500,
    rewardCoins: 350
  }
];


/* =========================================================
   SHOP
========================================================= */

const SHOP_ITEMS = [
  {
    id: "title-first-step",
    type: "title",
    name: "最初の一歩",
    description: "冒険を始めた者の証",
    price: 100
  },
  {
    id: "title-study-warrior",
    type: "title",
    name: "勉強戦士",
    description: "努力を積み重ねる者",
    price: 300
  },
  {
    id: "title-scholar",
    type: "title",
    name: "知識の探究者",
    description: "学び続ける者",
    price: 500
  },
  {
    id: "title-grinder",
    type: "title",
    name: "努力の亡者",
    description: "ひたすら勉強する者",
    price: 800
  },

  {
    id: "item-xp-small",
    type: "item",
    name: "XPポーション",
    description: "使用すると50XP獲得",
    price: 150,
    effect: {
      xp: 50
    }
  },
  {
    id: "item-xp-large",
    type: "item",
    name: "大XPポーション",
    description: "使用すると200XP獲得",
    price: 450,
    effect: {
      xp: 200
    }
  },

  {
    id: "background-night",
    type: "background",
    name: "星空",
    description: "星空の冒険背景",
    price: 500
  },
  {
    id: "background-dungeon",
    type: "background",
    name: "ダンジョン",
    description: "暗黒のダンジョン背景",
    price: 700
  },
  {
    id: "background-castle",
    type: "background",
    name: "王城",
    description: "冒険者の王城背景",
    price: 1000
  }
];


/* =========================================================
   ACHIEVEMENTS
========================================================= */

const ACHIEVEMENTS = [
  {
    id: "first-study",
    name: "冒険開始",
    description: "初めて勉強を記録する",
    condition: p => p.totalStudyMinutes >= 1,
    rewardXP: 50,
    rewardCoins: 50
  },
  {
    id: "study-60",
    name: "1時間の壁",
    description: "累計1時間勉強する",
    condition: p => p.totalStudyMinutes >= 60,
    rewardXP: 50,
    rewardCoins: 50
  },
  {
    id: "study-300",
    name: "5時間突破",
    description: "累計5時間勉強する",
    condition: p => p.totalStudyMinutes >= 300,
    rewardXP: 100,
    rewardCoins: 100
  },
  {
    id: "study-600",
    name: "10時間突破",
    description: "累計10時間勉強する",
    condition: p => p.totalStudyMinutes >= 600,
    rewardXP: 150,
    rewardCoins: 150
  },
  {
    id: "study-1800",
    name: "30時間突破",
    description: "累計30時間勉強する",
    condition: p => p.totalStudyMinutes >= 1800,
    rewardXP: 300,
    rewardCoins: 250
  },
  {
    id: "study-3000",
    name: "50時間突破",
    description: "累計50時間勉強する",
    condition: p => p.totalStudyMinutes >= 3000,
    rewardXP: 500,
    rewardCoins: 400
  },
  {
    id: "study-6000",
    name: "100時間突破",
    description: "累計100時間勉強する",
    condition: p => p.totalStudyMinutes >= 6000,
    rewardXP: 1000,
    rewardCoins: 800
  },
  {
    id: "level-10",
    name: "Lv.10到達",
    description: "プレイヤーレベル10になる",
    condition: p => p.level >= 10,
    rewardXP: 200,
    rewardCoins: 200
  },
  {
    id: "level-50",
    name: "熟練冒険者",
    description: "プレイヤーレベル50になる",
    condition: p => p.level >= 50,
    rewardXP: 500,
    rewardCoins: 500
  },
  {
    id: "level-100",
    name: "伝説",
    description: "プレイヤーレベル100になる",
    condition: p => p.level >= 100,
    rewardXP: 1000,
    rewardCoins: 1000
  }
];


/* =========================================================
   BOSS
========================================================= */

const BOSS_NAMES = [
  "受験の魔王",
  "赤点の覇者",
  "時間泥棒",
  "誘惑の魔獣",
  "先延ばしの王",
  "模試の巨人"
];

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  return d.toISOString().slice(0, 10);
}

function getBossWeakness(subjects) {
  if (!subjects || subjects.length === 0) {
    return "math";
  }

  const seed = getWeekKey()
    .split("-")
    .join("")
    .split("")
    .reduce((a, b) => a + Number(b), 0);

  return subjects[seed % subjects.length];
}

function getBossMaxHP() {
  return 10000;
}


/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let player = null;

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

let currentOtherTab = "menu";
let currentQuestTab = "daily";
let currentPartyTab = "party";
let currentRankTab = "rank";
let currentRankingType = "friends";

let currentBoss = null;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = id => document.getElementById(id);

function show(el) {
  if (el) el.classList.remove("hidden");
}

function hide(el) {
  if (el) el.classList.add("hidden");
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function notify(message) {
  const el = $("notification");

  if (!el) return;

  el.textContent = message;
  show(el);

  clearTimeout(notify.timeout);

  notify.timeout = setTimeout(() => {
    hide(el);
  }, 3000);
}


/* =========================================================
   DATE
========================================================= */

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthEnd(date = new Date()) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59
  );
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

function getWeekEnd(date = new Date()) {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0) {
    return `${h}時間${m}分`;
  }

  return `${m}分`;
}

function formatDate(timestamp) {
  if (!timestamp) return "-";

  let date;

  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleString("ja-JP");
}

function formatRemaining(ms) {
  if (ms <= 0) return "終了";

  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}日${hours}時間`;
  if (hours > 0) return `${hours}時間${minutes}分`;

  return `${minutes}分`;
}


/* =========================================================
   USER ID
========================================================= */

function normalizeUserId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function userIdToEmail(userId) {
  return `${normalizeUserId(userId)}@juken-rpg.local`;
}

function validateUserId(userId) {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(userId);
}


/* =========================================================
   DEFAULT PLAYER
========================================================= */

function createDefaultPlayer({
  uid,
  userId,
  displayName,
  course,
  subjects
}) {
  const now = new Date();

  return {
    uid,
    userId,
    displayName,
    course,
    subjects,

    xp: 0,
    level: 1,

    coins: 0,
    stars: 0,

    title: "無名の冒険者",
    equippedTitle: "無名の冒険者",

    totalStudyMinutes: 0,
    totalCoins: 0,
    totalXP: 0,

    seasonStudyMinutes: 0,
    seasonKey: getMonthKey(now),
    rank: "Bronze",

    dailyStudyMinutes: 0,
    dailyXP: 0,
    dailyQuestCount: 0,
    dailyCoins: 0,
    dailyKey: dateKey(now),

    weeklyStudyMinutes: 0,
    weeklyKey: getWeekKey(now),

    subjectStudyMinutes: {},

    achievements: [],
    inventoryTitles: [],
    inventoryItems: [],
    inventoryBackgrounds: [],

    friends: [],
    incomingRequests: [],
    outgoingRequests: [],

    partyId: null,

    bossesDefeated: 0,
    questsCompleted: 0,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}


/* =========================================================
   PLAYER FETCH
========================================================= */

async function loadPlayer() {
  if (!currentUser) return null;

  const ref = doc(db, "players", currentUser.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("プレイヤーデータが存在しません。");
  }

  player = {
    ...snap.data(),
    uid: currentUser.uid
  };

  await checkSeasonReset();
  await checkDailyReset();
  await checkWeeklyReset();

  return player;
}


/* =========================================================
   DAILY RESET
========================================================= */

async function checkDailyReset() {
  if (!player) return;

  const today = dateKey();

  if (player.dailyKey === today) return;

  await updateDoc(doc(db, "players", currentUser.uid), {
    dailyStudyMinutes: 0,
    dailyXP: 0,
    dailyQuestCount: 0,
    dailyCoins: 0,
    dailyKey: today,
    updatedAt: serverTimestamp()
  });

  player.dailyStudyMinutes = 0;
  player.dailyXP = 0;
  player.dailyQuestCount = 0;
  player.dailyCoins = 0;
  player.dailyKey = today;
}


/* =========================================================
   WEEKLY RESET
========================================================= */

async function checkWeeklyReset() {
  if (!player) return;

  const week = getWeekKey();

  if (player.weeklyKey === week) return;

  await updateDoc(doc(db, "players", currentUser.uid), {
    weeklyStudyMinutes: 0,
    weeklyKey: week,
    updatedAt: serverTimestamp()
  });

  player.weeklyStudyMinutes = 0;
  player.weeklyKey = week;
}


/* =========================================================
   MONTHLY SEASON RESET
========================================================= */

async function checkSeasonReset() {
  if (!player) return;

  const currentMonth = getMonthKey();

  if (player.seasonKey === currentMonth) return;

  const previousSeason = {
    seasonKey: player.seasonKey,
    studyMinutes: player.seasonStudyMinutes || 0,
    studyHours: ((player.seasonStudyMinutes || 0) / 60).toFixed(1),
    rank: player.rank || getRank((player.seasonStudyMinutes || 0) / 60),
    endedAt: serverTimestamp()
  };

  await addDoc(
    collection(db, "players", currentUser.uid, "seasonHistory"),
    previousSeason
  );

  await updateDoc(doc(db, "players", currentUser.uid), {
    seasonKey: currentMonth,
    seasonStudyMinutes: 0,
    rank: "Bronze",
    updatedAt: serverTimestamp()
  });

  player.seasonKey = currentMonth;
  player.seasonStudyMinutes = 0;
  player.rank = "Bronze";

  notify("🏆 新しいシーズンが始まりました！");
}


/* =========================================================
   AUTH SCREEN
========================================================= */

function showMainApp() {
  hide($("auth-screen"));
  show($("main-app"));
}

function showAuth() {
  show($("auth-screen"));
  hide($("main-app"));
  show($("login-screen"));
  hide($("register-screen"));
}

function switchAuth(mode) {
  if (mode === "register") {
    hide($("login-screen"));
    show($("register-screen"));
  } else {
    hide($("register-screen"));
    show($("login-screen"));
  }
}


/* =========================================================
   REGISTER
========================================================= */

async function register(event) {
  event.preventDefault();

  const errorEl = $("register-error");
  const subjectErrorEl = $("subject-error");

  errorEl.textContent = "";
  subjectErrorEl.textContent = "";

  const userId = normalizeUserId($("register-user-id").value);
  const password = $("register-password").value;
  const passwordConfirm = $("register-password-confirm").value;
  const displayName = $("register-display-name").value.trim();

  const courseInput =
    document.querySelector('input[name="course"]:checked');

  const subjects = [
    ...document.querySelectorAll(
      'input[name="subjects"]:checked'
    )
  ].map(el => el.value);

  if (!validateUserId(userId)) {
    errorEl.textContent =
      "ユーザーIDは3〜30文字の英数字・_・-で入力してください。";
    return;
  }

  if (password.length < 6) {
    errorEl.textContent =
      "パスワードは6文字以上にしてください。";
    return;
  }

  if (password !== passwordConfirm) {
    errorEl.textContent =
      "パスワード確認が一致していません。";
    return;
  }

  if (!displayName) {
    errorEl.textContent =
      "表示名を入力してください。";
    return;
  }

  if (!courseInput) {
    errorEl.textContent =
      "文理を選択してください。";
    return;
  }

  if (subjects.length === 0) {
    subjectErrorEl.textContent =
      "少なくとも1教科選択してください。";
    return;
  }

  const button = $("register-button");

  button.disabled = true;
  button.textContent = "登録中...";

  try {
    const usernameRef = doc(db, "usernames", userId);
    const usernameSnap = await getDoc(usernameRef);

    if (usernameSnap.exists()) {
      throw new Error("このユーザーIDはすでに使用されています。");
    }

    const credential = await createUserWithEmailAndPassword(
      auth,
      userIdToEmail(userId),
      password
    );

    const uid = credential.user.uid;

    const newPlayer = createDefaultPlayer({
      uid,
      userId,
      displayName,
      course: courseInput.value,
      subjects
    });

    await runTransaction(db, async transaction => {
      const usernameDoc = await transaction.get(usernameRef);

      if (usernameDoc.exists()) {
        throw new Error("このユーザーIDはすでに使用されています。");
      }

      transaction.set(usernameRef, {
        uid,
        userId,
        createdAt: serverTimestamp()
      });

      transaction.set(
        doc(db, "players", uid),
        newPlayer
      );
    });

    notify("⚔️ 冒険者登録完了！");

  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      errorEl.textContent =
        "このユーザーIDはすでに使用されています。";
    } else {
      errorEl.textContent =
        error.message || "登録に失敗しました。";
    }
  } finally {
    button.disabled = false;
    button.textContent = "冒険を始める";
  }
}


/* =========================================================
   LOGIN
========================================================= */

async function login(event) {
  event.preventDefault();

  const errorEl = $("login-error");
  errorEl.textContent = "";

  const userId = normalizeUserId($("login-user-id").value);
  const password = $("login-password").value;

  if (!userId || !password) {
    errorEl.textContent =
      "ユーザーIDとパスワードを入力してください。";
    return;
  }

  const button = $("login-button");

  button.disabled = true;
  button.textContent = "ログイン中...";

  try {
    await signInWithEmailAndPassword(
      auth,
      userIdToEmail(userId),
      password
    );

  } catch (error) {
    console.error(error);

    errorEl.textContent =
      "ユーザーIDまたはパスワードが正しくありません。";
  } finally {
    button.disabled = false;
    button.textContent = "ログイン";
  }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  stopTimer();

  await signOut(auth);

  currentUser = null;
  player = null;
  currentBoss = null;

  showAuth();

  notify("ログアウトしました。");
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {
  document
    .querySelectorAll(".nav-button")
    .forEach(button => {

      button.addEventListener("click", async () => {

        const target = button.dataset.screen;

        document
          .querySelectorAll(".nav-button")
          .forEach(b => b.classList.remove("active"));

        button.classList.add("active");

        document
          .querySelectorAll(".app-screen")
          .forEach(screen => hide(screen));

        show($(target));

        await refreshCurrentScreen(target);
      });
    });
}

async function refreshCurrentScreen(screen) {
  if (screen === "home-screen") {
    await renderHome();
  }

  if (screen === "study-screen") {
    await renderStudy();
  }

  if (screen === "quest-screen") {
    await renderQuest();
  }

  if (screen === "party-screen") {
    await renderParty();
  }

  if (screen === "rank-screen") {
    await renderRank();
  }

  if (screen === "other-screen") {
    await renderOther();
  }
}


/* =========================================================
   HEADER
========================================================= */

function renderHeader() {
  if (!player) return;

  setText(
    "header-display-name",
    player.displayName
  );

  setText(
    "header-level",
    `Lv.${player.level}`
  );

  setText(
    "header-rank",
    player.rank
  );

  setText(
    "header-coins",
    `🪙 ${player.coins || 0}`
  );
}


/* =========================================================
   HOME
========================================================= */

async function renderHome() {
  if (!player) return;

  renderHeader();

  const levelData = calculateLevel(player.xp || 0);

  setText("home-level", player.level);
  setText("home-xp", `${levelData.currentXP} XP`);

  if (player.level >= 100) {
    setText(
      "home-xp-required",
      "MAX LEVEL"
    );
  } else {
    setText(
      "home-xp-required",
      `次のレベルまで ${levelData.requiredXP - levelData.currentXP} XP`
    );
  }

  const progress =
    player.level >= 100
      ? 100
      : (levelData.currentXP / levelData.requiredXP) * 100;

  const progressEl = $("level-progress");

  if (progressEl) {
    progressEl.style.width = `${Math.min(100, progress)}%`;
  }

  setText(
    "star-count",
    `⭐ ${player.stars || 0}`
  );

  setText(
    "star-title",
    player.equippedTitle || "無名の冒険者"
  );

  setText(
    "today-study-time",
    `${player.dailyStudyMinutes || 0}分`
  );

  setText(
    "today-xp",
    `${player.dailyXP || 0} XP`
  );

  setText(
    "today-quests",
    `${player.dailyQuestCount || 0}`
  );

  setText(
    "today-coins",
    `🪙 ${player.dailyCoins || 0}`
  );

  setText(
    "home-rank",
    player.rank
  );

  setText(
    "home-season-study-time",
    `${((player.seasonStudyMinutes || 0) / 60).toFixed(1)}時間`
  );

  setText(
    "home-season-end",
    getMonthEnd().toLocaleDateString("ja-JP")
  );

  renderHomeQuests();
}


/* =========================================================
   HOME QUESTS
========================================================= */

function renderHomeQuests() {
  const container = $("home-quest-list");

  if (!container) return;

  const quests = DAILY_QUESTS;

  container.innerHTML = quests.map(quest => {

    const progress = Math.min(
      quest.target,
      player.dailyStudyMinutes || 0
    );

    const complete = progress >= quest.target;

    return `
      <div class="quest-card ${complete ? "completed" : ""}">
        <div>
          <strong>${escapeHTML(quest.title)}</strong>
          <p>${escapeHTML(quest.description)}</p>
        </div>

        <div>
          <span>${progress} / ${quest.target}分</span>
          <br>
          <small>
            +${quest.rewardXP} XP
            / 🪙 ${quest.rewardCoins}
          </small>
        </div>
      </div>
    `;
  }).join("");
}


/* =========================================================
   TIMER
========================================================= */

function updateTimerDisplay() {
  const h = Math.floor(timerSeconds / 3600);
  const m = Math.floor((timerSeconds % 3600) / 60);
  const s = timerSeconds % 60;

  setText(
    "study-timer-display",
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  );
}

function startTimer() {
  if (timerRunning) return;

  timerRunning = true;

  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);

  notify("⏱️ タイマー開始！");
}

function stopTimer() {
  timerRunning = false;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function pauseTimer() {
  stopTimer();
}

function resetTimer() {
  stopTimer();
  timerSeconds = 0;
  updateTimerDisplay();
}

async function saveTimerStudy() {
  const minutes = Math.floor(timerSeconds / 60);

  if (minutes < 1) {
    notify("1分以上勉強してから記録してください。");
    return;
  }

  const subject = $("study-subject").value;

  if (!subject) {
    notify("教科を選択してください。");
    return;
  }

  await recordStudy(minutes, subject, "タイマー記録");

  resetTimer();
}


/* =========================================================
   STUDY SCREEN
========================================================= */

async function renderStudy() {
  if (!player) return;

  renderHeader();

  const select = $("study-subject");

  if (select) {
    const current = select.value;

    select.innerHTML = `
      <option value="">教科を選択</option>
      ${(player.subjects || []).map(subject => `
        <option value="${escapeHTML(subject)}">
          ${escapeHTML(SUBJECTS[subject] || subject)}
        </option>
      `).join("")}
    `;

    if (
      current &&
      player.subjects.includes(current)
    ) {
      select.value = current;
    }
  }

  renderSubjectLevels();
  renderSubjectSummary();
  await renderStudyHistory();
}


/* =========================================================
   RECORD STUDY
========================================================= */

async function handleStudyForm(event) {
  event.preventDefault();

  const subject = $("study-subject").value;
  const minutes = Number($("study-minutes").value);
  const note = $("study-note").value.trim();

  const errorEl = $("study-error");
  errorEl.textContent = "";

  if (!subject) {
    errorEl.textContent = "教科を選択してください。";
    return;
  }

  if (!Number.isFinite(minutes) || minutes < 1) {
    errorEl.textContent =
      "1分以上の勉強時間を入力してください。";
    return;
  }

  if (minutes > 1440) {
    errorEl.textContent =
      "勉強時間は1440分以下にしてください。";
    return;
  }

  try {
    await recordStudy(minutes, subject, note);

    $("study-minutes").value = "";
    $("study-note").value = "";

  } catch (error) {
    console.error(error);
    errorEl.textContent =
      error.message || "記録に失敗しました。";
  }
}


/* =========================================================
   STUDY CORE
========================================================= */

async function recordStudy(minutes, subject, note = "") {
  if (!currentUser || !player) return;

  const oldLevel = player.level;

  const oldSeasonMinutes =
    player.seasonStudyMinutes || 0;

  const newXP =
    (player.xp || 0) + minutes;

  const levelData =
    calculateLevel(newXP);

  const newDailyMinutes =
    (player.dailyStudyMinutes || 0) + minutes;

  const newWeeklyMinutes =
    (player.weeklyStudyMinutes || 0) + minutes;

  const newSeasonMinutes =
    oldSeasonMinutes + minutes;

  const newTotalMinutes =
    (player.totalStudyMinutes || 0) + minutes;

  const newRank =
    getRank(newSeasonMinutes / 60);

  const subjectMinutes = {
    ...(player.subjectStudyMinutes || {})
  };

  subjectMinutes[subject] =
    (subjectMinutes[subject] || 0) + minutes;

  const updateData = {
    xp: newXP,
    level: levelData.level,

    totalXP: (player.totalXP || 0) + minutes,

    totalStudyMinutes: newTotalMinutes,

    dailyStudyMinutes: newDailyMinutes,
    dailyXP: (player.dailyXP || 0) + minutes,

    weeklyStudyMinutes: newWeeklyMinutes,

    seasonStudyMinutes: newSeasonMinutes,
    rank: newRank,

    subjectStudyMinutes: subjectMinutes,

    updatedAt: serverTimestamp()
  };

  await updateDoc(
    doc(db, "players", currentUser.uid),
    updateData
  );

  await addDoc(
    collection(db, "studyRecords"),
    {
      uid: currentUser.uid,
      userId: player.userId,
      displayName: player.displayName,

      subject,
      subjectName: SUBJECTS[subject] || subject,

      minutes,
      note,

      xp: minutes,

      createdAt: serverTimestamp(),

      dateKey: dateKey(),
      monthKey: getMonthKey(),
      weekKey: getWeekKey()
    }
  );

  player = {
    ...player,
    ...updateData,
    subjectStudyMinutes: subjectMinutes
  };

  await updateDailyQuests();
  await updateWeeklyQuests();
  await dealBossDamage(minutes, subject);

  await checkAchievements();

  renderHeader();
  await renderHome();
  await renderStudy();

  if (levelData.level > oldLevel) {
    showLevelUp(oldLevel, levelData.level);
  }

  if (newRank !== player.rank) {
    notify(`🏆 ランクアップ！ ${newRank}`);
  }

  notify(
    `📚 ${minutes}分記録！ +${minutes} XP`
  );
}


/* =========================================================
   SUBJECT LEVELS
========================================================= */

function renderSubjectLevels() {
  const container = $("subject-level-list");

  if (!container) return;

  const subjects = player.subjects || [];

  if (subjects.length === 0) {
    container.innerHTML =
      `<p class="empty-message">教科が登録されていません。</p>`;
    return;
  }

  container.innerHTML = subjects.map(subject => {

    const minutes =
      player.subjectStudyMinutes?.[subject] || 0;

    const level =
      calculateSubjectLevel(minutes);

    const currentProgress =
      minutes % 60;

    const percent =
      level >= 100
        ? 100
        : (currentProgress / 60) * 100;

    return `
      <div class="subject-level-card">

        <div class="info-row">
          <strong>
            ${escapeHTML(SUBJECTS[subject] || subject)}
          </strong>

          <span>
            Lv.${level}
          </span>
        </div>

        <div class="level-progress-container">
          <div
            class="level-progress-bar"
            style="width:${percent}%"
          ></div>
        </div>

        <small>
          累計 ${formatMinutes(minutes)}
        </small>

      </div>
    `;
  }).join("");
}


/* =========================================================
   SUBJECT SUMMARY
========================================================= */

function renderSubjectSummary() {
  const container = $("subject-study-list");

  if (!container) return;

  container.innerHTML =
    (player.subjects || []).map(subject => {

      const minutes =
        player.subjectStudyMinutes?.[subject] || 0;

      return `
        <div class="info-row">
          <span>
            ${escapeHTML(SUBJECTS[subject] || subject)}
          </span>

          <strong>
            ${formatMinutes(minutes)}
          </strong>
        </div>
      `;
    }).join("");
}


/* =========================================================
   STUDY HISTORY
========================================================= */

async function renderStudyHistory() {
  const container = $("study-history-list");

  if (!container || !currentUser) return;

  container.innerHTML =
    `<p class="empty-message">読み込み中...</p>`;

  try {
    const q = query(
      collection(db, "studyRecords"),
      where("uid", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML =
        `<p class="empty-message">勉強履歴はありません。</p>`;
      return;
    }

    container.innerHTML =
      snap.docs.map(docSnap => {

        const data = docSnap.data();

        return `
          <div class="history-card">

            <strong>
              ${escapeHTML(data.subjectName || data.subject)}
            </strong>

            <span>
              ${data.minutes}分
            </span>

            <small>
              ${escapeHTML(data.note || "")}
            </small>

            <small>
              ${formatDate(data.createdAt)}
            </small>

          </div>
        `;
      }).join("");

  } catch (error) {
    console.error(error);

    container.innerHTML =
      `<p class="error-message">
        履歴の読み込みに失敗しました。
      </p>`;
  }
}


/* =========================================================
   QUEST SYSTEM
========================================================= */

async function updateDailyQuests() {
  if (!player) return;

  const completedBefore =
    player.dailyQuestCount || 0;

  let completedNow = completedBefore;

  const rewardXP = {};
  const rewardCoins = {};

  for (const quest of DAILY_QUESTS) {

    const key =
      `daily_${quest.id}_${player.dailyKey}`;

    const already =
      localStorage.getItem(key) === "true";

    const progress =
      player.dailyStudyMinutes || 0;

    if (
      !already &&
      progress >= quest.target
    ) {
      localStorage.setItem(key, "true");

      completedNow++;

      rewardXP.value =
        (rewardXP.value || 0) + quest.rewardXP;

      rewardCoins.value =
        (rewardCoins.value || 0) + quest.rewardCoins;

      notify(
        `⚔️ クエスト達成！ ${quest.title}`
      );
    }
  }

  if (completedNow > completedBefore) {

    const xpReward =
      rewardXP.value || 0;

    const coinReward =
      rewardCoins.value || 0;

    await giveReward(
      xpReward,
      coinReward
    );

    player.dailyQuestCount = completedNow;
  }
}

async function updateWeeklyQuests() {
  if (!player) return;

  const rewardXP = {};
  const rewardCoins = {};

  for (const quest of WEEKLY_QUESTS) {

    const key =
      `weekly_${quest.id}_${player.weeklyKey}`;

    const already =
      localStorage.getItem(key) === "true";

    const progress =
      player.weeklyStudyMinutes || 0;

    if (
      !already &&
      progress >= quest.target
    ) {
      localStorage.setItem(key, "true");

      rewardXP.value =
        (rewardXP.value || 0) + quest.rewardXP;

      rewardCoins.value =
        (rewardCoins.value || 0) + quest.rewardCoins;

      await addQuestHistory(quest);
    }
  }

  if (
    (rewardXP.value || 0) > 0 ||
    (rewardCoins.value || 0) > 0
  ) {
    await giveReward(
      rewardXP.value || 0,
      rewardCoins.value || 0
    );
  }
}

async function addQuestHistory(quest) {
  await addDoc(
    collection(
      db,
      "players",
      currentUser.uid,
      "questHistory"
    ),
    {
      questId: quest.id,
      title: quest.title,
      type: "weekly",
      rewardXP: quest.rewardXP,
      rewardCoins: quest.rewardCoins,
      completedAt: serverTimestamp()
    }
  );

  await updateDoc(
    doc(db, "players", currentUser.uid),
    {
      questsCompleted: increment(1)
    }
  );

  player.questsCompleted =
    (player.questsCompleted || 0) + 1;
}


/* =========================================================
   QUEST RENDER
========================================================= */

async function renderQuest() {
  if (!player) return;

  renderDailyQuests();
  renderWeeklyQuests();
  await renderBoss();
  await renderQuestHistory();
}

function renderDailyQuests() {
  const container = $("daily-quest-list");

  if (!container) return;

  container.innerHTML =
    DAILY_QUESTS.map(quest => {

      const progress =
        Math.min(
          quest.target,
          player.dailyStudyMinutes || 0
        );

      const complete =
        progress >= quest.target;

      return `
        <div class="quest-card ${complete ? "completed" : ""}">

          <h4>
            ${complete ? "✅" : "⚔️"}
            ${escapeHTML(quest.title)}
          </h4>

          <p>
            ${escapeHTML(quest.description)}
          </p>

          <div class="info-row">
            <span>
              ${progress} / ${quest.target}分
            </span>

            <strong>
              +${quest.rewardXP} XP
              / 🪙 ${quest.rewardCoins}
            </strong>
          </div>

        </div>
      `;
    }).join("");
}

function renderWeeklyQuests() {
  const container = $("weekly-quest-list");

  if (!container) return;

  container.innerHTML =
    WEEKLY_QUESTS.map(quest => {

      const progress =
        Math.min(
          quest.target,
          player.weeklyStudyMinutes || 0
        );

      const complete =
        progress >= quest.target;

      return `
        <div class="quest-card ${complete ? "completed" : ""}">

          <h4>
            ${complete ? "✅" : "🗓️"}
            ${escapeHTML(quest.title)}
          </h4>

          <p>
            ${escapeHTML(quest.description)}
          </p>

          <div class="info-row">
            <span>
              ${progress} / ${quest.target}分
            </span>

            <strong>
              +${quest.rewardXP} XP
              / 🪙 ${quest.rewardCoins}
            </strong>
          </div>

        </div>
      `;
    }).join("");
}


/* =========================================================
   QUEST HISTORY
========================================================= */

async function renderQuestHistory() {
  const container = $("quest-history-list");

  if (!container || !currentUser) return;

  try {
    const q = query(
      collection(
        db,
        "players",
        currentUser.uid,
        "questHistory"
      ),
      orderBy("completedAt", "desc"),
      limit(50)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML =
        `<p class="empty-message">
          まだ達成履歴がありません。
        </p>`;
      return;
    }

    container.innerHTML =
      snap.docs.map(d => {

        const data = d.data();

        return `
          <div class="history-card">

            <strong>
              ✅ ${escapeHTML(data.title)}
            </strong>

            <span>
              +${data.rewardXP} XP
              / 🪙 ${data.rewardCoins}
            </span>

            <small>
              ${formatDate(data.completedAt)}
            </small>

          </div>
        `;
      }).join("");

  } catch (error) {
    console.error(error);

    container.innerHTML =
      `<p class="error-message">
        履歴を読み込めませんでした。
      </p>`;
  }
}


/* =========================================================
   REWARD
========================================================= */

async function giveReward(xp, coins) {
  if (!player) return;

  const oldLevel = player.level;

  const newTotalXP =
    (player.xp || 0) + xp;

  const levelData =
    calculateLevel(newTotalXP);

  await updateDoc(
    doc(db, "players", currentUser.uid),
    {
      xp: newTotalXP,
      level: levelData.level,

      totalXP:
        (player.totalXP || 0) + xp,

      coins:
        (player.coins || 0) + coins,

      totalCoins:
        (player.totalCoins || 0) + coins,

      dailyCoins:
        (player.dailyCoins || 0) + coins,

      updatedAt: serverTimestamp()
    }
  );

  player.xp = newTotalXP;
  player.level = levelData.level;
  player.totalXP =
    (player.totalXP || 0) + xp;
  player.coins =
    (player.coins || 0) + coins;
  player.totalCoins =
    (player.totalCoins || 0) + coins;
  player.dailyCoins =
    (player.dailyCoins || 0) + coins;

  showReward(xp, coins);

  if (levelData.level > oldLevel) {
    showLevelUp(oldLevel, levelData.level);
  }
}


/* =========================================================
   BOSS
========================================================= */

async function getCurrentBoss() {
  const weekKey = getWeekKey();

  const bossRef =
    doc(db, "bosses", weekKey);

  const snap = await getDoc(bossRef);

  if (snap.exists()) {
    return {
      id: weekKey,
      ...snap.data()
    };
  }

  const subjects =
    player.subjects || [];

  const weakness =
    getBossWeakness(subjects);

  const boss = {
    weekKey,
    name:
      BOSS_NAMES[
        Math.abs(
          weekKey
            .split("")
            .reduce(
              (a, b) => a + b.charCodeAt(0),
              0
            )
        ) % BOSS_NAMES.length
      ],

    level:
      Math.max(
        1,
        Math.floor(
          (player.level || 1) / 10
        ) + 1
      ),

    maxHP: getBossMaxHP(),
    currentHP: getBossMaxHP(),

    weakness,
    weaknessMultiplier: 1.5,

    defeated: false,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(bossRef, boss);

  return {
    id: weekKey,
    ...boss
  };
}

async function dealBossDamage(minutes, subject) {
  if (!currentUser || !player) return;

  const boss = await getCurrentBoss();

  if (!boss || boss.defeated) return;

  const multiplier =
    subject === boss.weakness
      ? 1.5
      : 1;

  const damage =
    Math.floor(minutes * multiplier);

  const bossRef =
    doc(db, "bosses", boss.weekKey);

  let defeated = false;
  let newHP = boss.currentHP;

  await runTransaction(db, async transaction => {

    const snap =
      await transaction.get(bossRef);

    if (!snap.exists()) return;

    const data = snap.data();

    if (data.defeated) return;

    newHP =
      Math.max(
        0,
        (data.currentHP || data.maxHP) - damage
      );

    defeated = newHP <= 0;

    transaction.update(
      bossRef,
      {
        currentHP: newHP,
        defeated,
        updatedAt: serverTimestamp()
      }
    );
  });

  if (defeated) {

    await updateDoc(
      doc(db, "players", currentUser.uid),
      {
        bossesDefeated:
          increment(1),

        coins:
          increment(300),

        totalCoins:
          increment(300)
      }
    );

    player.bossesDefeated =
      (player.bossesDefeated || 0) + 1;

    player.coins =
      (player.coins || 0) + 300;

    player.totalCoins =
      (player.totalCoins || 0) + 300;

    notify(
      "👹 ボス撃破！ +🪙300"
    );
  }

  currentBoss = {
    ...boss,
    currentHP: newHP,
    defeated
  };
}


/* =========================================================
   BOSS RENDER
========================================================= */

async function renderBoss() {
  const boss = await getCurrentBoss();

  currentBoss = boss;

  setText(
    "boss-name",
    boss.name
  );

  setText(
    "boss-level",
    `Lv.${boss.level}`
  );

  setText(
    "boss-current-hp",
    boss.currentHP
  );

  setText(
    "boss-max-hp",
    boss.maxHP
  );

  const hpPercent =
    boss.maxHP > 0
      ? (boss.currentHP / boss.maxHP) * 100
      : 0;

  const hpBar =
    $("boss-hp-progress");

  if (hpBar) {
    hpBar.style.width =
      `${Math.max(0, hpPercent)}%`;
  }

  setText(
    "boss-weakness-subject",
    SUBJECTS[boss.weakness] ||
    boss.weakness
  );

  setText(
    "boss-weakness-multiplier",
    `×${boss.weaknessMultiplier}`
  );

  setText(
    "boss-reset-date",
    getWeekEnd().toLocaleString("ja-JP")
  );

  await renderBossParty();
  await renderBossBattleLog();
}


/* =========================================================
   BOSS PARTY
========================================================= */

async function renderBossParty() {
  const container =
    $("boss-party-member-list");

  if (!container) return;

  if (!player.partyId) {
    container.innerHTML =
      `<p class="empty-message">
        パーティーに参加すると集団戦に参加できます。
      </p>`;

    setText(
      "boss-party-count",
      "0 / 4人"
    );

    return;
  }

  const partySnap =
    await getDoc(
      doc(db, "parties", player.partyId)
    );

  if (!partySnap.exists()) {
    container.innerHTML =
      `<p class="empty-message">
        パーティーが見つかりません。
      </p>`;
    return;
  }

  const party = partySnap.data();
  const memberIds = party.members || [];

  const members = [];

  for (const uid of memberIds) {

    const snap =
      await getDoc(
        doc(db, "players", uid)
      );

    if (snap.exists()) {
      members.push({
        uid,
        ...snap.data()
      });
    }
  }

  container.innerHTML =
    members.map(member => {

      return `
        <div class="party-member-card">

          <strong>
            ${escapeHTML(member.displayName)}
          </strong>

          <span>
            Lv.${member.level || 1}
          </span>

          <small>
            ${escapeHTML(member.rank || "Bronze")}
          </small>

        </div>
      `;
    }).join("");

  setText(
    "boss-party-count",
    `${members.length} / 4人`
  );
}


/* =========================================================
   BOSS BATTLE LOG
========================================================= */

async function renderBossBattleLog() {
  const container =
    $("boss-log-list");

  if (!container || !currentBoss) return;

  try {
    const q = query(
      collection(
        db,
        "bosses",
        currentBoss.weekKey,
        "battleLog"
      ),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      container.innerHTML =
        `<p class="empty-message">
          まだ戦闘記録はありません。
        </p>`;
      return;
    }

    container.innerHTML =
      snap.docs.map(d => {

        const data = d.data();

        return `
          <div class="battle-log-entry">

            <strong>
              ${escapeHTML(data.displayName)}
            </strong>

            <span>
              ${escapeHTML(data.subjectName)}
            </span>

            <span>
              -${data.damage} DMG
            </span>

            <small>
              ${formatDate(data.createdAt)}
            </small>

          </div>
        `;
      }).join("");

  } catch (error) {
    console.error(error);
  }
}


/* =========================================================
   PARTY
========================================================= */

async function renderParty() {
  if (!player) return;

  await renderCurrentParty();
  await renderFriends();
  await renderRequests();
}

async function renderCurrentParty() {
  const container =
    $("party-member-list");

  if (!container) return;

  if (!player.partyId) {

    container.innerHTML =
      `<p class="empty-message">
        現在パーティーに所属していません。
      </p>`;

    setText(
      "party-member-count",
      "0 / 4人"
    );

    return;
  }

  const partySnap =
    await getDoc(
      doc(db, "parties", player.partyId)
    );

  if (!partySnap.exists()) {

    container.innerHTML =
      `<p class="empty-message">
        パーティー情報がありません。
      </p>`;

    return;
  }

  const party =
    partySnap.data();

  const members =
    party.members || [];

  const memberData = [];

  for (const uid of members) {

    const snap =
      await getDoc(
        doc(db, "players", uid)
      );

    if (snap.exists()) {
      memberData.push({
        uid,
        ...snap.data()
      });
    }
  }

  container.innerHTML =
    memberData.map(member => {

      const isMe =
        member.uid === currentUser.uid;

      return `
        <div class="party-member-card">

          <strong>
            ${escapeHTML(member.displayName)}
            ${isMe ? "（自分）" : ""}
          </strong>

          <span>
            Lv.${member.level || 1}
          </span>

          <span>
            ${escapeHTML(member.rank || "Bronze")}
          </span>

        </div>
      `;
    }).join("");

  setText(
    "party-member-count",
    `${members.length} / 4人`
  );

  setText(
    "party-week-range",
    `${getWeekStart().toLocaleDateString("ja-JP")} ～ ${getWeekEnd().toLocaleDateString("ja-JP")}`
  );
}


/* =========================================================
   CREATE PARTY
========================================================= */

async function createParty() {
  if (player.partyId) {
    notify("すでにパーティーに所属しています。");
    return;
  }

  const partyRef =
    doc(collection(db, "parties"));

  await setDoc(partyRef, {
    ownerUid: currentUser.uid,
    members: [currentUser.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await updateDoc(
    doc(db, "players", currentUser.uid),
    {
      partyId: partyRef.id,
      updatedAt: serverTimestamp()
    }
  );

  player.partyId = partyRef.id;

  notify("👥 パーティーを作成しました！");

  await renderParty();
}


/* =========================================================
   PARTY INVITE
========================================================= */

async function inviteToParty(event) {
  event.preventDefault();

  const errorEl =
    $("party-error");

  errorEl.textContent = "";

  const targetUserId =
    normalizeUserId(
      $("party-invite-user-id").value
    );

  if (!targetUserId) {
    errorEl.textContent =
      "ユーザーIDを入力してください。";
    return;
  }

  try {

    if (!player.partyId) {
      await createParty();
    }

    const usernameSnap =
      await getDoc(
        doc(db, "usernames", targetUserId)
      );

    if (!usernameSnap.exists()) {
      throw new Error(
        "そのユーザーIDは存在しません。"
      );
    }

    const targetUid =
      usernameSnap.data().uid;

    if (targetUid === currentUser.uid) {
      throw new Error(
        "自分自身は招待できません。"
      );
    }

    const partySnap =
      await getDoc(
        doc(db, "parties", player.partyId)
      );

    const party =
      partySnap.data();

    if ((party.members || []).length >= 4) {
      throw new Error(
        "パーティーは最大4人です。"
      );
    }

    if (
      (party.members || []).includes(targetUid)
    ) {
      throw new Error(
        "そのユーザーはすでにパーティーにいます。"
      );
    }

    const requestRef =
      doc(
        db,
        "partyRequests",
        `${player.partyId}_${targetUid}`
      );

    await setDoc(
      requestRef,
      {
        partyId: player.partyId,
        fromUid: currentUser.uid,
        fromUserId: player.userId,
        fromDisplayName: player.displayName,
        toUid: targetUid,
        type: "party",
        status: "pending",
        createdAt: serverTimestamp()
      }
    );

    $("party-invite-user-id").value = "";

    notify("📩 パーティー招待を送りました。");

  } catch (error) {
    console.error(error);
    errorEl.textContent =
      error.message || "招待に失敗しました。";
  }
}


/* =========================================================
   FRIENDS
========================================================= */

async function renderFriends() {
  const container =
    $("friend-list");

  if (!container) return;

  const friendIds =
    player.friends || [];

  if (friendIds.length === 0) {
    container.innerHTML =
      `<p class="empty-message">
        フレンドがいません。
      </p>`;
    return;
  }

  const friends = [];

  for (const uid of friendIds) {

    const snap =
      await getDoc(
        doc(db, "players", uid)
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

      return `
        <div class="friend-card">

          <strong>
            ${escapeHTML(friend.displayName)}
          </strong>

          <span>
            Lv.${friend.level || 1}
          </span>

          <span>
            ${escapeHTML(friend.rank || "Bronze")}
          </span>

          <small>
            今月 ${((friend.seasonStudyMinutes || 0) / 60).toFixed(1)}時間
          </small>

        </div>
      `;
    }).join("");
}


/* =========================================================
   FRIEND REQUESTS
========================================================= */

async function renderRequests() {
  const container =
    $("friend-request-list");

  if (!container) return;

  const requests = [];

  try {

    const q1 = query(
      collection(db, "friendRequests"),
      where("toUid", "==", currentUser.uid),
      where("status", "==", "pending"),
      limit(50)
    );

    const snap1 =
      await getDocs(q1);

    snap1.docs.forEach(d => {
      requests.push({
        id: d.id,
        collectionName: "friendRequests",
        ...d.data()
      });
    });


    const q2 = query(
      collection(db, "partyRequests"),
      where("toUid", "==", currentUser.uid),
      where("status", "==", "pending"),
      limit(50)
    );

    const snap2 =
      await getDocs(q2);

    snap2.docs.forEach(d => {
      requests.push({
        id: d.id,
        collectionName: "partyRequests",
        ...d.data()
      });
    });

  } catch (error) {
    console.error(error);
  }

  if (requests.length === 0) {

    container.innerHTML =
      `<p class="empty-message">
        申請はありません。
      </p>`;

    return;
  }

  container.innerHTML =
    requests.map(request => {

      if (request.type === "party") {

        return `
          <div class="request-card">

            <strong>
              👥 パーティー招待
            </strong>

            <p>
              ${escapeHTML(request.fromDisplayName)}
              からパーティー招待
            </p>

            <button
              type="button"
              onclick="window.acceptPartyRequest('${request.id}')"
            >
              参加する
            </button>

          </div>
        `;
      }

      return `
        <div class="request-card">

          <strong>
            🤝 フレンド申請
          </strong>

          <p>
            ${escapeHTML(request.fromDisplayName)}
          </p>

          <button
            type="button"
            onclick="window.acceptFriendRequest('${request.id}')"
          >
            承認
          </button>

          <button
            type="button"
            onclick="window.rejectFriendRequest('${request.id}')"
          >
            拒否
          </button>

        </div>
      `;
    }).join("");
}


/* =========================================================
   SEND FRIEND REQUEST
========================================================= */

async function sendFriendRequest(targetUserId) {

  targetUserId =
    normalizeUserId(targetUserId);

  const usernameSnap =
    await getDoc(
      doc(db, "usernames", targetUserId)
    );

  if (!usernameSnap.exists()) {
    throw new Error(
      "そのユーザーIDは存在しません。"
    );
  }

  const targetUid =
    usernameSnap.data().uid;

  if (targetUid === currentUser.uid) {
    throw new Error(
      "自分自身には申請できません。"
    );
  }

  if (
    (player.friends || []).includes(targetUid)
  ) {
    throw new Error(
      "すでにフレンドです。"
    );
  }

  const requestId =
    `${currentUser.uid}_${targetUid}`;

  await setDoc(
    doc(db, "friendRequests", requestId),
    {
      fromUid: currentUser.uid,
      fromUserId: player.userId,
      fromDisplayName: player.displayName,

      toUid: targetUid,
      toUserId: targetUserId,

      type: "friend",
      status: "pending",

      createdAt: serverTimestamp()
    }
  );

  notify("🤝 フレンド申請を送りました。");
}


/* =========================================================
   ACCEPT FRIEND
========================================================= */

async function acceptFriendRequest(requestId) {

  const requestRef =
    doc(db, "friendRequests", requestId);

  const requestSnap =
    await getDoc(requestRef);

  if (!requestSnap.exists()) return;

  const request =
    requestSnap.data();

  const fromUid =
    request.fromUid;

  const targetRef =
    doc(db, "players", fromUid);

  await runTransaction(
    db,
    async transaction => {

      const meSnap =
        await transaction.get(
          doc(db, "players", currentUser.uid)
        );

      const otherSnap =
        await transaction.get(targetRef);

      if (!meSnap.exists() || !otherSnap.exists()) {
        throw new Error("ユーザー情報がありません。");
      }

      const me =
        meSnap.data();

      const other =
        otherSnap.data();

      const myFriends =
        Array.from(
          new Set([
            ...(me.friends || []),
            fromUid
          ])
        );

      const otherFriends =
        Array.from(
          new Set([
            ...(other.friends || []),
            currentUser.uid
          ])
        );

      transaction.update(
        doc(db, "players", currentUser.uid),
        {
          friends: myFriends,
          updatedAt: serverTimestamp()
        }
      );

      transaction.update(
        targetRef,
        {
          friends: otherFriends,
          updatedAt: serverTimestamp()
        }
      );

      transaction.delete(requestRef);
    }
  );

  player.friends =
    Array.from(
      new Set([
        ...(player.friends || []),
        fromUid
      ])
    );

  notify("🤝 フレンドになりました！");

  await renderParty();
}


/* =========================================================
   REJECT FRIEND
========================================================= */

async function rejectFriendRequest(requestId) {

  await deleteDoc(
    doc(db, "friendRequests", requestId)
  );

  notify("申請を拒否しました。");

  await renderRequests();
}


/* =========================================================
   ACCEPT PARTY
========================================================= */

async function acceptPartyRequest(requestId) {

  const requestRef =
    doc(db, "partyRequests", requestId);

  const requestSnap =
    await getDoc(requestRef);

  if (!requestSnap.exists()) return;

  const request =
    requestSnap.data();

  const partyRef =
    doc(db, "parties", request.partyId);

  await runTransaction(
    db,
    async transaction => {

      const partySnap =
        await transaction.get(partyRef);

      if (!partySnap.exists()) {
        throw new Error(
          "パーティーが存在しません。"
        );
      }

      const party =
        partySnap.data();

      const members =
        party.members || [];

      if (members.length >= 4) {
        throw new Error(
          "パーティーが満員です。"
        );
      }

      if (!members.includes(currentUser.uid)) {
        members.push(currentUser.uid);
      }

      transaction.update(
        partyRef,
        {
          members,
          updatedAt: serverTimestamp()
        }
      );

      transaction.update(
        doc(db, "players", currentUser.uid),
        {
          partyId: request.partyId,
          updatedAt: serverTimestamp()
        }
      );

      transaction.delete(requestRef);
    }
  );

  player.partyId =
    request.partyId;

  notify("👥 パーティーに参加しました！");

  await renderParty();
}


/* =========================================================
   RANK
========================================================= */

async function renderRank() {
  if (!player) return;

  renderHeader();

  setText(
    "current-rank-name",
    player.rank
  );

  setText(
    "current-season-study-time",
    `${((player.seasonStudyMinutes || 0) / 60).toFixed(1)}時間`
  );

  setText(
    "current-season-time",
    formatRemaining(
      getMonthEnd().getTime() - Date.now()
    )
  );

  await renderRanking();
  await renderSeasonHistory();
}


/* =========================================================
   RANKING
========================================================= */

async function renderRanking() {

  const friendsContainer =
    $("friends-ranking-list");

  const globalContainer =
    $("global-ranking-list");

  if (!friendsContainer || !globalContainer) return;

  const friendIds =
    player.friends || [];

  const friendPlayers = [];

  for (const uid of friendIds) {

    const snap =
      await getDoc(
        doc(db, "players", uid)
      );

    if (snap.exists()) {
      friendPlayers.push({
        uid,
        ...snap.data()
      });
    }
  }

  friendPlayers.push({
    uid: currentUser.uid,
    ...player
  });

  friendPlayers.sort(
    (a, b) =>
      (b.seasonStudyMinutes || 0) -
      (a.seasonStudyMinutes || 0)
  );

  friendsContainer.innerHTML =
    friendPlayers.map((p, index) => {

      return `
        <div class="ranking-row">

          <strong>
            #${index + 1}
          </strong>

          <span>
            ${escapeHTML(p.displayName)}
          </span>

          <span>
            ${escapeHTML(p.rank)}
          </span>

          <strong>
            ${((p.seasonStudyMinutes || 0) / 60).toFixed(1)}h
          </strong>

        </div>
      `;
    }).join("");


  try {

    const q = query(
      collection(db, "players"),
      orderBy("seasonStudyMinutes", "desc"),
      limit(100)
    );

    const snap =
      await getDocs(q);

    const players =
      snap.docs.map(d => ({
        uid: d.id,
        ...d.data()
      }));

    const myIndex =
      players.findIndex(
        p => p.uid === currentUser.uid
      );

    setText(
      "global-rank-number",
      myIndex >= 0
        ? `#${myIndex + 1}`
        : "100位以下"
    );

    globalContainer.innerHTML =
      players.map((p, index) => {

        return `
          <div class="ranking-row">

            <strong>
              #${index + 1}
            </strong>

            <span>
              ${escapeHTML(p.displayName || p.userId)}
            </span>

            <span>
              ${escapeHTML(p.rank || "Bronze")}
            </span>

            <strong>
              ${((p.seasonStudyMinutes || 0) / 60).toFixed(1)}h
            </strong>

          </div>
        `;
      }).join("");

  } catch (error) {
    console.error(error);

    globalContainer.innerHTML =
      `<p class="error-message">
        全体ランキングを読み込めませんでした。
      </p>`;
  }
}


/* =========================================================
   SEASON HISTORY
========================================================= */

async function renderSeasonHistory() {

  const container =
    $("season-history-list");

  if (!container) return;

  try {

    const q = query(
      collection(
        db,
        "players",
        currentUser.uid,
        "seasonHistory"
      ),
      orderBy("endedAt", "desc"),
      limit(20)
    );

    const snap =
      await getDocs(q);

    if (snap.empty) {

      container.innerHTML =
        `<p class="empty-message">
          まだ履歴がありません。
        </p>`;

      return;
    }

    container.innerHTML =
      snap.docs.map(d => {

        const data = d.data();

        return `
          <div class="season-history-card">

            <strong>
              ${escapeHTML(data.seasonKey)}
            </strong>

            <span>
              ${escapeHTML(data.rank)}
            </span>

            <span>
              ${escapeHTML(data.studyHours)}時間
            </span>

          </div>
        `;
      }).join("");

  } catch (error) {
    console.error(error);
  }
}


/* =========================================================
   OTHER
========================================================= */

async function renderOther() {
  if (!player) return;

  renderHeader();

  await renderAchievements();
  await renderShop();
  await renderLocker();
  await renderProfile();
  renderSettings();
}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

async function checkAchievements() {

  if (!player) return;

  const unlocked =
    new Set(player.achievements || []);

  let changed = false;

  for (const achievement of ACHIEVEMENTS) {

    if (
      unlocked.has(achievement.id)
    ) {
      continue;
    }

    if (
      achievement.condition(player)
    ) {

      unlocked.add(achievement.id);
      changed = true;

      await updateDoc(
        doc(db, "players", currentUser.uid),
        {
          achievements: Array.from(unlocked),
          stars: increment(1)
        }
      );

      player.achievements =
        Array.from(unlocked);

      player.stars =
        (player.stars || 0) + 1;

      await giveReward(
        achievement.rewardXP,
        achievement.rewardCoins
      );

      notify(
        `⭐ 実績解除！ ${achievement.name}`
      );
    }
  }

  if (changed) {
    await renderAchievements();
  }
}

async function renderAchievements() {

  const container =
    $("achievement-list");

  if (!container || !player) return;

  const unlocked =
    new Set(player.achievements || []);

  setText(
    "achievement-count",
    `${unlocked.size} / ${ACHIEVEMENTS.length}`
  );

  container.innerHTML =
    ACHIEVEMENTS.map(achievement => {

      const isUnlocked =
        unlocked.has(achievement.id);

      return `
        <div class="achievement-card ${isUnlocked ? "unlocked" : "locked"}">

          <div>
            ${isUnlocked ? "⭐" : "🔒"}
          </div>

          <div>

            <strong>
              ${escapeHTML(achievement.name)}
            </strong>

            <p>
              ${escapeHTML(achievement.description)}
            </p>

            <small>
              報酬:
              +${achievement.rewardXP} XP
              / 🪙 ${achievement.rewardCoins}
            </small>

          </div>

        </div>
      `;
    }).join("");
}


/* =========================================================
   SHOP
========================================================= */

async function renderShop() {

  setText(
    "shop-coin-count",
    player?.coins || 0
  );

  renderShopCategory(
    "shop-title-list",
    SHOP_ITEMS.filter(
      item => item.type === "title"
    )
  );

  renderShopCategory(
    "shop-item-list",
    SHOP_ITEMS.filter(
      item => item.type === "item"
    )
  );

  renderShopCategory(
    "shop-background-list",
    SHOP_ITEMS.filter(
      item => item.type === "background"
    )
  );
}

function renderShopCategory(containerId, items) {

  const container =
    $(containerId);

  if (!container) return;

  container.innerHTML =
    items.map(item => {

      const owned =
        isItemOwned(item);

      return `
        <div class="shop-card">

          <div>

            <strong>
              ${escapeHTML(item.name)}
            </strong>

            <p>
              ${escapeHTML(item.description)}
            </p>

          </div>

          <div>

            <span>
              🪙 ${item.price}
            </span>

            <button
              type="button"
              ${owned ? "disabled" : ""}
              onclick="window.buyShopItem('${item.id}')"
            >
              ${owned ? "所持済み" : "購入"}
            </button>

          </div>

        </div>
      `;
    }).join("");
}

function isItemOwned(item) {

  if (!player) return false;

  if (item.type === "title") {
    return (
      player.inventoryTitles || []
    ).includes(item.id);
  }

  if (item.type === "background") {
    return (
      player.inventoryBackgrounds || []
    ).includes(item.id);
  }

  if (item.type === "item") {
    return false;
  }

  return false;
}


/* =========================================================
   BUY SHOP ITEM
========================================================= */

async function buyShopItem(itemId) {

  const item =
    SHOP_ITEMS.find(
      x => x.id === itemId
    );

  if (!item) return;

  if (
    player.coins < item.price
  ) {
    notify("🪙 コインが足りません。");
    return;
  }

  if (
    item.type !== "item" &&
    isItemOwned(item)
  ) {
    notify("すでに所持しています。");
    return;
  }

  const updates = {
    coins:
      player.coins - item.price,

    updatedAt:
      serverTimestamp()
  };

  if (item.type === "title") {

    updates.inventoryTitles = [
      ...(player.inventoryTitles || []),
      item.id
    ];
  }

  if (item.type === "background") {

    updates.inventoryBackgrounds = [
      ...(player.inventoryBackgrounds || []),
      item.id
    ];
  }

  if (item.type === "item") {

    updates.inventoryItems = [
      ...(player.inventoryItems || []),
      {
        id: item.id,
        purchasedAt: Date.now()
      }
    ];
  }

  await updateDoc(
    doc(db, "players", currentUser.uid),
    updates
  );

  player = {
    ...player,
    ...updates
  };

  notify(
    `🛒 ${item.name}を購入しました！`
  );

  await renderShop();
  await renderLocker();
}


/* =========================================================
   LOCKER
========================================================= */

async function renderLocker() {

  const titleContainer =
    $("locker-title-list");

  const itemContainer =
    $("locker-item-list");

  const backgroundContainer =
    $("locker-outfit-list");


  if (titleContainer) {

    const titles =
      player.inventoryTitles || [];

    if (titles.length === 0) {

      titleContainer.innerHTML =
        `<p class="empty-message">
          所持している称号はありません。
        </p>`;

    } else {

      titleContainer.innerHTML =
        titles.map(id => {

          const item =
            SHOP_ITEMS.find(
              x => x.id === id
            );

          if (!item) return "";

          const equipped =
            player.equippedTitle === item.name;

          return `
            <div class="locker-card">

              <strong>
                ${escapeHTML(item.name)}
              </strong>

              <button
                type="button"
                onclick="window.equipTitle('${item.id}')"
              >
                ${equipped ? "装備中" : "装備"}
              </button>

            </div>
          `;

        }).join("");
    }
  }


  if (itemContainer) {

    const items =
      player.inventoryItems || [];

    if (items.length === 0) {

      itemContainer.innerHTML =
        `<p class="empty-message">
          所持しているアイテムはありません。
        </p>`;

    } else {

      itemContainer.innerHTML =
        items.map((item, index) => {

          const catalog =
            SHOP_ITEMS.find(
              x => x.id === item.id
            );

          if (!catalog) return "";

          return `
            <div class="locker-card">

              <strong>
                ${escapeHTML(catalog.name)}
              </strong>

              <button
                type="button"
                onclick="window.useItem(${index})"
              >
                使用
              </button>

            </div>
          `;

        }).join("");
    }
  }


  if (backgroundContainer) {

    const backgrounds =
      player.inventoryBackgrounds || [];

    if (backgrounds.length === 0) {

      backgroundContainer.innerHTML =
        `<p class="empty-message">
          所持している背景はありません。
        </p>`;

    } else {

      backgroundContainer.innerHTML =
        backgrounds.map(id => {

          const item =
            SHOP_ITEMS.find(
              x => x.id === id
            );

          if (!item) return "";

          return `
            <div class="locker-card">

              <strong>
                ${escapeHTML(item.name)}
              </strong>

              <button
                type="button"
                onclick="window.equipBackground('${item.id}')"
              >
                装備
              </button>

            </div>
          `;

        }).join("");
    }
  }
}


/* =========================================================
   EQUIP TITLE
========================================================= */

async function equipTitle(itemId) {

  const item =
    SHOP_ITEMS.find(
      x => x.id === itemId
    );

  if (!item) return;

  await updateDoc(
    doc(db, "players", currentUser.uid),
    {
      equippedTitle: item.name,
      title: item.name,
      updatedAt: serverTimestamp()
    }
  );

  player.equippedTitle =
    item.name;

  player.title =
    item.name;

  notify(
    `🏷️ ${item.name}を装備しました！`
  );

  await renderLocker();
  await renderHome();
}


/* =========================================================
   USE ITEM
========================================================= */

async function useItem(index) {

  const items =
    [...(player.inventoryItems || [])];

  const item =
    items[index];

  if (!item) return;

  const catalog =
    SHOP_ITEMS.find(
      x => x.id === item.id
    );

  if (!catalog) return;

  if (catalog.effect?.xp) {

    items.splice(index, 1);

    await updateDoc(
      doc(db, "players", currentUser.uid),
      {
        inventoryItems: items,
        updatedAt: serverTimestamp()
      }
    );

    player.inventoryItems =
      items;

    await giveReward(
      catalog.effect.xp,
      0
    );

    notify(
      `🧪 ${catalog.name}を使用！ +${catalog.effect.xp} XP`
    );

    await renderLocker();
  }
}


/* =========================================================
   BACKGROUND
========================================================= */

async function equipBackground(itemId) {

  const item =
    SHOP_ITEMS.find(
      x => x.id === itemId
    );

  if (!item) return;

  document.body.dataset.background =
    item.id;

  localStorage.setItem(
    "jukenRPGBackground",
    item.id
  );

  notify(
    `🖼️ ${item.name}を装備しました！`
  );
}


/* =========================================================
   PROFILE
========================================================= */

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
    COURSES[player.course] || player.course
  );

  setText(
    "profile-level",
    player.level
  );

  setText(
    "profile-xp",
    player.xp || 0
  );

  setText(
    "profile-stars",
    player.stars || 0
  );

  setText(
    "profile-coins",
    player.coins || 0
  );

  setText(
    "profile-title",
    player.equippedTitle || "無名の冒険者"
  );

  setText(
    "profile-total-study-time",
    formatMinutes(
      player.totalStudyMinutes || 0
    )
  );

  setText(
    "profile-total-xp",
    `${player.totalXP || 0} XP`
  );

  setText(
    "profile-total-coins",
    player.totalCoins || 0
  );

  setText(
    "profile-bosses-defeated",
    player.bossesDefeated || 0
  );

  setText(
    "profile-quests-completed",
    player.questsCompleted || 0
  );


  const subjectContainer =
    $("profile-subject-list");

  if (subjectContainer) {

    subjectContainer.innerHTML =
      (player.subjects || []).map(subject => {

        const minutes =
          player.subjectStudyMinutes?.[subject] || 0;

        const level =
          calculateSubjectLevel(minutes);

        return `
          <div class="info-row">

            <span>
              ${escapeHTML(SUBJECTS[subject] || subject)}
            </span>

            <strong>
              Lv.${level}
              /
              ${formatMinutes(minutes)}
            </strong>

          </div>
        `;

      }).join("");
  }
}


/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {

  if (!player) return;

  const nameInput =
    $("settings-display-name");

  if (nameInput) {
    nameInput.value =
      player.displayName || "";
  }

  document
    .querySelectorAll(
      'input[name="settings-subjects"]'
    )
    .forEach(input => {

      input.checked =
        (player.subjects || [])
          .includes(input.value);
    });
}


/* =========================================================
   CHANGE DISPLAY NAME
========================================================= */

async function changeDisplayName(event) {

  event.preventDefault();

  const errorEl =
    $("display-name-error");

  errorEl.textContent = "";

  const name =
    $("settings-display-name")
      .value
      .trim();

  if (!name) {
    errorEl.textContent =
      "表示名を入力してください。";
    return;
  }

  await updateDoc(
    doc(db, "players", currentUser.uid),
    {
      displayName: name,
      updatedAt: serverTimestamp()
    }
  );

  player.displayName = name;

  notify("👤 表示名を変更しました。");

  renderHeader();
  await renderProfile();
}


/* =========================================================
   CHANGE SUBJECTS
========================================================= */

async function changeSubjects(event) {

  event.preventDefault();

  const errorEl =
    $("settings-subject-error");

  errorEl.textContent = "";

  const subjects =
    [
      ...document.querySelectorAll(
        'input[name="settings-subjects"]:checked'
      )
    ].map(el => el.value);

  if (subjects.length === 0) {
    errorEl.textContent =
      "少なくとも1教科選択してください。";
    return;
  }

  await updateDoc(
    doc(db, "players", currentUser.uid),
    {
      subjects,
      updatedAt: serverTimestamp()
    }
  );

  player.subjects =
    subjects;

  notify("📚 受験教科を更新しました。");

  await renderStudy();
  await renderProfile();
}


/* =========================================================
   CHANGE PASSWORD
========================================================= */

async function changePassword(event) {

  event.preventDefault();

  const errorEl =
    $("password-error");

  errorEl.textContent = "";

  const password =
    $("settings-new-password").value;

  if (password.length < 6) {
    errorEl.textContent =
      "パスワードは6文字以上にしてください。";
    return;
  }

  try {

    await updatePassword(
      currentUser,
      password
    );

    $("settings-new-password").value = "";

    notify(
      "🔐 パスワードを変更しました。"
    );

  } catch (error) {

    console.error(error);

    errorEl.textContent =
      "再ログイン後にもう一度お試しください。";
  }
}


/* =========================================================
   DELETE ACCOUNT
========================================================= */

async function deleteAccount() {

  const confirmed =
    confirm(
      "本当にアカウントを削除しますか？\nこの操作は取り消せません。"
    );

  if (!confirmed) return;

  try {

    await deleteUser(currentUser);

    notify(
      "アカウントを削除しました。"
    );

  } catch (error) {

    console.error(error);

    alert(
      "削除できませんでした。再ログイン後にお試しください。"
    );
  }
}


/* =========================================================
   TABS
========================================================= */

function setupTabs() {

  /* QUEST */

  document
    .querySelectorAll(
      "#quest-navigation button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          currentQuestTab =
            button.dataset.questTab;

          document
            .querySelectorAll(
              "#quest-navigation button"
            )
            .forEach(b =>
              b.classList.remove("active")
            );

          button.classList.add("active");

          document
            .querySelectorAll(
              ".quest-tab-content"
            )
            .forEach(tab =>
              hide(tab)
            );

          const map = {
            daily: "daily-quest-tab",
            weekly: "weekly-quest-tab",
            boss: "boss-tab",
            history: "quest-history-tab"
          };

          show($(map[currentQuestTab]));

          if (currentQuestTab === "boss") {
            await renderBoss();
          }

          if (currentQuestTab === "history") {
            await renderQuestHistory();
          }
        }
      );
    });


  /* PARTY */

  document
    .querySelectorAll(
      "#party-navigation button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          currentPartyTab =
            button.dataset.partyTab;

          document
            .querySelectorAll(
              "#party-navigation button"
            )
            .forEach(b =>
              b.classList.remove("active")
            );

          button.classList.add("active");

          document
            .querySelectorAll(
              ".party-tab-content"
            )
            .forEach(tab =>
              hide(tab)
            );

          const map = {
            party: "party-tab",
            friends: "friends-tab",
            requests: "friend-requests-tab"
          };

          show($(map[currentPartyTab]));

          if (currentPartyTab === "friends") {
            await renderFriends();
          }

          if (currentPartyTab === "requests") {
            await renderRequests();
          }
        }
      );
    });


  /* RANK */

  document
    .querySelectorAll(
      "#rank-navigation > button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          currentRankTab =
            button.dataset.rankTab;

          document
            .querySelectorAll(
              "#rank-navigation > button"
            )
            .forEach(b =>
              b.classList.remove("active")
            );

          button.classList.add("active");

          document
            .querySelectorAll(
              ".rank-tab-content"
            )
            .forEach(tab =>
              hide(tab)
            );

          const map = {
            rank: "rank-info-tab",
            ranking: "ranking-tab",
            history: "season-history-tab"
          };

          show($(map[currentRankTab]));

          if (currentRankTab === "ranking") {
            await renderRanking();
          }

          if (currentRankTab === "history") {
            await renderSeasonHistory();
          }
        }
      );
    });


  /* RANKING TYPE */

  document
    .querySelectorAll(
      "#ranking-type-tabs button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          currentRankingType =
            button.dataset.rankingType;

          document
            .querySelectorAll(
              "#ranking-type-tabs button"
            )
            .forEach(b =>
              b.classList.remove("active")
            );

          button.classList.add("active");

          if (
            currentRankingType === "friends"
          ) {

            show(
              $("friends-ranking-list")
            );

            hide(
              $("global-ranking-list")
            );

          } else {

            hide(
              $("friends-ranking-list")
            );

            show(
              $("global-ranking-list")
            );
          }
        }
      );
    });


  /* OTHER */

  document
    .querySelectorAll(
      "#other-navigation button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          currentOtherTab =
            button.dataset.otherTab;

          openOtherTab(
            currentOtherTab
          );
        }
      );
    });


  /* MENU CARDS */

  document
    .querySelectorAll(
      "[data-open-other-tab]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openOtherTab(
            button.dataset.openOtherTab
          );
        }
      );
    });
}


async function openOtherTab(tab) {

  currentOtherTab = tab;

  document
    .querySelectorAll(
      "#other-navigation button"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.otherTab === tab
      );
    });

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

  if (tab === "menu") {
    show($("other-menu-tab"));
  }

  if (tab === "achievement") {
    show($("achievement-tab"));
    await renderAchievements();
  }

  if (tab === "shop") {
    show($("shop-tab"));
    await renderShop();
  }

  if (tab === "locker") {
    show($("locker-tab"));
    await renderLocker();
  }

  if (tab === "profile") {
    show($("profile-tab"));
    await renderProfile();
  }

  if (tab === "settings") {
    show($("settings-tab"));
    renderSettings();
  }
}


/* =========================================================
   MODALS
========================================================= */

function showLevelUp(oldLevel, newLevel) {

  setText(
    "level-up-old-level",
    oldLevel
  );

  setText(
    "level-up-new-level",
    newLevel
  );

  show(
    $("level-up-modal")
  );
}

function closeLevelUp() {
  hide(
    $("level-up-modal")
  );
}

function showReward(xp, coins) {

  const container =
    $("reward-modal-content");

  if (!container) return;

  container.innerHTML = `
    <div class="reward-result">

      ${xp > 0 ? `
        <p>✨ +${xp} XP</p>
      ` : ""}

      ${coins > 0 ? `
        <p>🪙 +${coins} コイン</p>
      ` : ""}

    </div>
  `;

  show(
    $("reward-modal")
  );
}

function closeReward() {
  hide(
    $("reward-modal")
  );
}


/* =========================================================
   BOSS REFRESH
========================================================= */

async function refreshBoss() {

  currentBoss =
    await getCurrentBoss();

  await renderBoss();

  notify(
    "👹 ボス情報を更新しました。"
  );
}


/* =========================================================
   FRIEND SEARCH / SIMPLE GLOBAL API
========================================================= */

window.sendFriendRequest = async function(userId) {

  try {
    await sendFriendRequest(userId);
    await renderRequests();

  } catch (error) {
    notify(
      error.message ||
      "フレンド申請に失敗しました。"
    );
  }
};

window.acceptFriendRequest =
  acceptFriendRequest;

window.rejectFriendRequest =
  rejectFriendRequest;

window.acceptPartyRequest =
  acceptPartyRequest;

window.buyShopItem =
  buyShopItem;

window.equipTitle =
  equipTitle;

window.useItem =
  useItem;

window.equipBackground =
  equipBackground;


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEvents() {

  $("show-register-button")
    ?.addEventListener(
      "click",
      () => switchAuth("register")
    );

  $("show-login-button")
    ?.addEventListener(
      "click",
      () => switchAuth("login")
    );

  $("login-form")
    ?.addEventListener(
      "submit",
      login
    );

  $("register-form")
    ?.addEventListener(
      "submit",
      register
    );

  $("logout-button")
    ?.addEventListener(
      "click",
      logout
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

  $("study-record-form")
    ?.addEventListener(
      "submit",
      handleStudyForm
    );


  $("party-invite-form")
    ?.addEventListener(
      "submit",
      inviteToParty
    );


  $("boss-refresh-button")
    ?.addEventListener(
      "click",
      refreshBoss
    );


  $("display-name-form")
    ?.addEventListener(
      "submit",
      changeDisplayName
    );

  $("subject-settings-form")
    ?.addEventListener(
      "submit",
      changeSubjects
    );

  $("password-form")
    ?.addEventListener(
      "submit",
      changePassword
    );

  $("delete-account-button")
    ?.addEventListener(
      "click",
      deleteAccount
    );


  $("level-up-close-button")
    ?.addEventListener(
      "click",
      closeLevelUp
    );

  $("reward-close-button")
    ?.addEventListener(
      "click",
      closeReward
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

      showAuth();

      return;
    }

    try {

      currentUser = user;

      await loadPlayer();

      showMainApp();

      renderHeader();

      await renderHome();

    } catch (error) {

      console.error(
        "PLAYER LOAD ERROR:",
        error
      );

      notify(
        "プレイヤーデータの読み込みに失敗しました。"
      );
    }
  }
);


/* =========================================================
   CLOCK REFRESH
========================================================= */

setInterval(
  async () => {

    if (!player) return;

    if (
      $("main-app")?.classList.contains("hidden")
    ) {
      return;
    }

    setText(
      "current-season-time",
      formatRemaining(
        getMonthEnd().getTime() - Date.now()
      )
    );

  },
  30000
);


/* =========================================================
   INITIALIZATION
========================================================= */

function initialize() {

  setupNavigation();
  setupTabs();
  setupEvents();

  updateTimerDisplay();

  const savedBackground =
    localStorage.getItem(
      "jukenRPGBackground"
    );

  if (savedBackground) {
    document.body.dataset.background =
      savedBackground;
  }

  showAuth();
}

initialize();


/* =========================================================
   DEBUG
========================================================= */

window.JukenRPG = {
  get player() {
    return player;
  },

  get user() {
    return currentUser;
  },

  calculateLevel,
  calculateSubjectLevel,
  getRank,
  getCurrentBoss,

  async refresh() {
    if (!currentUser) return;

    await loadPlayer();
    await renderHome();
  }
};
