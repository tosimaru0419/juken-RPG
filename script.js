// ============================================================
// 受験RPG - script.js
// PHASE 2
// Firebase Auth
// Firestore
// XP / LEVEL / COINS
// Study Timer
// Manual Study Record
// Subject Level
// Study History
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
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
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


// ============================================================
// タイマー状態
// ============================================================

let timerInterval = null;

let timerState = {
  running: false,
  startedAt: null,
  accumulatedSeconds: 0
};


// ============================================================
// DOM
// ============================================================

function getElement(id) {
  return document.getElementById(id);
}

function showElement(id) {
  const el = getElement(id);
  if (el) {
    el.style.display = "";
  }
}

function hideElement(id) {
  const el = getElement(id);
  if (el) {
    el.style.display = "none";
  }
}

function setText(id, value) {
  const el = getElement(id);
  if (el) {
    el.textContent = value;
  }
}


// ============================================================
// 画面切り替え
// ============================================================

function showLoginScreen() {
  const authScreen = getElement("auth-screen");
  const loginScreen = getElement("login-screen");
  const registerScreen = getElement("register-screen");
  const mainApp = getElement("main-app");

  if (authScreen) {
    authScreen.classList.remove("hidden");
    authScreen.style.display = "";
  }

  if (loginScreen) {
    loginScreen.classList.remove("hidden");
    loginScreen.style.display = "";
  }

  if (registerScreen) {
    registerScreen.classList.add("hidden");
    registerScreen.style.display = "none";
  }

  if (mainApp) {
    mainApp.classList.add("hidden");
    mainApp.style.display = "none";
  }
}


function showRegisterScreen() {
  const authScreen = getElement("auth-screen");
  const loginScreen = getElement("login-screen");
  const registerScreen = getElement("register-screen");
  const mainApp = getElement("main-app");

  if (authScreen) {
    authScreen.classList.remove("hidden");
    authScreen.style.display = "";
  }

  if (loginScreen) {
    loginScreen.classList.add("hidden");
    loginScreen.style.display = "none";
  }

  if (registerScreen) {
    registerScreen.classList.remove("hidden");
    registerScreen.style.display = "";
  }

  if (mainApp) {
    mainApp.classList.add("hidden");
    mainApp.style.display = "none";
  }
}


function showMainScreen() {
  const authScreen = getElement("auth-screen");
  const loginScreen = getElement("login-screen");
  const registerScreen = getElement("register-screen");
  const mainApp = getElement("main-app");

  // 認証画面を完全に隠す
  if (authScreen) {
    authScreen.classList.add("hidden");
    authScreen.style.display = "none";
  }

  if (loginScreen) {
    loginScreen.classList.add("hidden");
    loginScreen.style.display = "none";
  }

  if (registerScreen) {
    registerScreen.classList.add("hidden");
    registerScreen.style.display = "none";
  }

  // メインアプリを確実に表示
  if (mainApp) {
    mainApp.classList.remove("hidden");
    mainApp.style.display = "";
  }

  // ホームだけ表示
  document.querySelectorAll(".app-screen").forEach(screen => {
    screen.classList.add("hidden");
    screen.style.display = "none";
  });

  const homeScreen = getElement("home-screen");

  if (homeScreen) {
    homeScreen.classList.remove("hidden");
    homeScreen.style.display = "";
  }
}

// ============================================================
// ユーティリティ
// ============================================================

function normalizeUserId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function userIdToEmail(userId) {
  return `${normalizeUserId(userId)}@juken-rpg.local`;
}

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

function formatMinutes(minutes) {
  const value = Math.max(0, Math.floor(Number(minutes) || 0));

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

  if (timestamp.toDate) {
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
// Firebaseエラー
// ============================================================

function firebaseErrorMessage(error) {
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
      "パスワードが弱すぎます。",

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

  return messages[code] || `エラーが発生しました。\n${error?.message || code}`;
}


// ============================================================
// Firebase初期化
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
    console.error("Firebase initialization error:", error);

    alert("Firebaseの初期化に失敗しました。\n\n" + error.message);

    return false;
  }
}


// ============================================================
// レベルシステム
// ============================================================

/*
  Lv.1 → Lv.2 : 100 XP

  Lv.1〜9
    1レベル = 100 XP

  Lv.10〜19
    1レベル = 150 XP

  Lv.20〜29
    1レベル = 200 XP

  ...

  Lv.90〜99
    1レベル = 550 XP

  Lv.100が最大。
*/

function xpRequiredForLevel(level) {
  if (level >= 100) {
    return 0;
  }

  const block = Math.floor((level - 1) / 10);

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
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));

  let level = 1;

  while (level < 100) {
    const required = xpRequiredForLevel(level);

    if (xp < totalXpForLevel(level + 1)) {
      break;
    }

    level++;
  }

  return Math.min(100, level);
}

function getLevelProgress(totalXp) {
  const xp = Math.max(0, Math.floor(Number(totalXp) || 0));

  const level = calculateLevel(xp);

  if (level >= 100) {
    return {
      level: 100,
      current: 0,
      required: 0,
      percent: 100
    };
  }

  const currentLevelXp = totalXpForLevel(level);
  const nextLevelXp = totalXpForLevel(level + 1);

  const current = xp - currentLevelXp;
  const required = nextLevelXp - currentLevelXp;

  const percent = Math.min(
    100,
    Math.max(0, (current / required) * 100)
  );

  return {
    level,
    current,
    required,
    percent
  };
}


// ============================================================
// 科目
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

function getSubjectName(subject) {
  return SUBJECT_NAMES[subject] || subject || "その他";
}


// ============================================================
// デフォルトプレイヤーデータ
// ============================================================

function createDefaultPlayerData(userId = "") {
  return {
    userId,

    displayName: userId || "プレイヤー",

    course: "undecided",

    subjects: [],

    // 全体進行
    xp: 0,
    level: 1,

    coins: 0,

    stars: 0,

    // 勉強時間
    totalStudyMinutes: 0,
    todayStudyMinutes: 0,
    todayStudyDate: getJapanDateString(),

    // 今日のXP / コイン
    todayXp: 0,
    todayCoins: 0,

    // 科目別
    subjectLevels: {},

    subjectStudyMinutes: {},

    // 統計
    totalXp: 0,
    totalCoins: 0,

    // その他
    title: "見習い受験生",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}


// ============================================================
// 日付リセット
// ============================================================

function normalizeDailyData(player) {
  const today = getJapanDateString();

  if (player.todayStudyDate !== today) {
    player.todayStudyDate = today;
    player.todayStudyMinutes = 0;
    player.todayXp = 0;
    player.todayCoins = 0;
  }

  return player;
}


// ============================================================
// Firestoreプレイヤーデータ
// ============================================================

async function loadPlayer(user) {
  if (!user || !db) {
    return null;
  }

  const playerRef = doc(db, "players", user.uid);

  const snapshot = await getDoc(playerRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  const player = {
    ...createDefaultPlayerData(""),
    ...data
  };

  player.subjectLevels =
    player.subjectLevels || {};

  player.subjectStudyMinutes =
    player.subjectStudyMinutes || {};

  normalizeDailyData(player);

  return player;
}


async function createPlayer(user, additionalData = {}) {
  const defaultData = createDefaultPlayerData(
    additionalData.userId || ""
  );

  const playerData = {
    ...defaultData,
    ...additionalData,
    uid: user.uid,
    email: user.email || "",
    updatedAt: serverTimestamp()
  };

  const playerRef = doc(db, "players", user.uid);

  await setDoc(playerRef, playerData);

  return playerData;
}


// ============================================================
// プレイヤーデータ保存
// ============================================================

async function savePlayer() {
  if (!currentUser || !currentPlayer || !db) {
    return;
  }

  currentPlayer = normalizeDailyData(currentPlayer);

  currentPlayer.updatedAt = serverTimestamp();

  const playerRef = doc(
    db,
    "players",
    currentUser.uid
  );

  await setDoc(
    playerRef,
    currentPlayer,
    { merge: true }
  );
}


// ============================================================
// UI反映
// ============================================================

function applyPlayerData() {
  if (!currentPlayer) {
    return;
  }

  currentPlayer = normalizeDailyData(currentPlayer);

  const level = calculateLevel(currentPlayer.xp || 0);

  currentPlayer.level = level;

  const progress = getLevelProgress(
    currentPlayer.xp || 0
  );


  // ----------------------------------------
  // ヘッダー
  // ----------------------------------------

  setText(
    "header-display-name",
    currentPlayer.displayName || "プレイヤー"
  );

  setText(
    "header-level",
    `Lv.${level}`
  );

  setText(
    "header-rank",
    currentPlayer.rank || "Bronze"
  );

  setText(
    "header-coins",
    `🪙 ${currentPlayer.coins || 0}`
  );


  // ----------------------------------------
  // ホーム
  // ----------------------------------------

  setText(
    "home-level",
    `Lv.${level}`
  );

  setText(
    "home-xp",
    `${currentPlayer.xp || 0} XP`
  );

  setText(
    "home-xp-required",
    level >= 100
      ? "MAX"
      : `${progress.current} / ${progress.required} XP`
  );

  const progressBar = getElement("level-progress");

  if (progressBar) {
    if (
      progressBar.tagName === "PROGRESS"
    ) {
      progressBar.max = 100;
      progressBar.value = progress.percent;
    } else {
      progressBar.style.width =
        `${progress.percent}%`;
    }
  }

  setText(
    "today-study-time",
    formatMinutes(
      currentPlayer.todayStudyMinutes || 0
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
    currentPlayer.rank || "Bronze"
  );

  setText(
    "home-season-study-time",
    formatMinutes(
      currentPlayer.seasonStudyMinutes || 0
    )
  );

  setText(
    "star-count",
    currentPlayer.stars || 0
  );

  setText(
    "star-title",
    currentPlayer.title || "見習い受験生"
  );


  // ----------------------------------------
  // プロフィール
  // ----------------------------------------

  setText(
    "profile-display-name",
    currentPlayer.displayName || "-"
  );

  setText(
    "profile-user-id",
    currentPlayer.userId || "-"
  );

  setText(
    "profile-course",
    getCourseName(currentPlayer.course)
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
    "profile-stars",
    currentPlayer.stars || 0
  );

  setText(
    "profile-coins",
    currentPlayer.coins || 0
  );

  setText(
    "profile-title",
    currentPlayer.title || "-"
  );

  setText(
    "profile-total-study-time",
    formatMinutes(
      currentPlayer.totalStudyMinutes || 0
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
}


function getCourseName(course) {
  const names = {
    science: "理系",
    humanities: "文系",
    undecided: "未定"
  };

  return names[course] || course || "未定";
}


// ============================================================
// レベルアップ演出
// ============================================================

function showLevelUp(oldLevel, newLevel) {
  if (newLevel <= oldLevel) {
    return;
  }

  setText(
    "level-up-old-level",
    oldLevel
  );

  setText(
    "level-up-new-level",
    newLevel
  );

  const modal = getElement("level-up-modal");

  if (modal) {
    modal.style.display = "";
  } else {
    showNotification(
      `🎉 LEVEL UP!!  Lv.${oldLevel} → Lv.${newLevel}`
    );
  }
}


function closeLevelUpModal() {
  const modal = getElement("level-up-modal");

  if (modal) {
    modal.style.display = "none";
  }
}


// ============================================================
// 通知
// ============================================================

function showNotification(message) {
  const notification = getElement("notification");

  if (!notification) {
    console.log("[NOTIFICATION]", message);
    return;
  }

  notification.textContent = message;
  notification.style.display = "";

  clearTimeout(
    showNotification.timeout
  );

  showNotification.timeout = setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}


// ============================================================
// 勉強記録
// ============================================================

async function recordStudy(
  subject,
  minutes,
  note = "",
  source = "manual"
) {
  if (!currentUser || !currentPlayer) {
    throw new Error(
      "ログインしていません。"
    );
  }

  const safeMinutes = Math.floor(
    Number(minutes)
  );

  if (!Number.isFinite(safeMinutes) || safeMinutes < 1) {
    throw new Error(
      "勉強時間は1分以上で入力してください。"
    );
  }

  if (!subject) {
    throw new Error(
      "科目を選択してください。"
    );
  }


  // ----------------------------------------
  // 日付更新
  // ----------------------------------------

  normalizeDailyData(currentPlayer);


  // ----------------------------------------
  // 旧レベル
  // ----------------------------------------

  const oldLevel = calculateLevel(
    currentPlayer.xp || 0
  );


  // ----------------------------------------
  // XP
  // ----------------------------------------

  const gainedXp = safeMinutes;


  // ----------------------------------------
  // コイン
  // ----------------------------------------

  const gainedCoins = safeMinutes;


  // ----------------------------------------
  // 全体
  // ----------------------------------------

  currentPlayer.xp =
    (currentPlayer.xp || 0) +
    gainedXp;

  currentPlayer.totalXp =
    (currentPlayer.totalXp || 0) +
    gainedXp;

  currentPlayer.coins =
    (currentPlayer.coins || 0) +
    gainedCoins;

  currentPlayer.totalCoins =
    (currentPlayer.totalCoins || 0) +
    gainedCoins;


  // ----------------------------------------
  // 今日
  // ----------------------------------------

  currentPlayer.todayStudyMinutes =
    (currentPlayer.todayStudyMinutes || 0) +
    safeMinutes;

  currentPlayer.todayXp =
    (currentPlayer.todayXp || 0) +
    gainedXp;

  currentPlayer.todayCoins =
    (currentPlayer.todayCoins || 0) +
    gainedCoins;


  // ----------------------------------------
  // 総勉強時間
  // ----------------------------------------

  currentPlayer.totalStudyMinutes =
    (currentPlayer.totalStudyMinutes || 0) +
    safeMinutes;


  // ----------------------------------------
  // シーズン
  // ----------------------------------------

  currentPlayer.seasonStudyMinutes =
    (currentPlayer.seasonStudyMinutes || 0) +
    safeMinutes;


  // ----------------------------------------
  // 科目
  // ----------------------------------------

  if (!currentPlayer.subjectStudyMinutes[subject]) {
    currentPlayer.subjectStudyMinutes[subject] = 0;
  }

  currentPlayer.subjectStudyMinutes[subject] +=
    safeMinutes;


  // 30分 = 科目Lv +1
  currentPlayer.subjectLevels[subject] =
    Math.floor(
      currentPlayer.subjectStudyMinutes[subject] / 30
    );


  // 科目Lv上限100
  currentPlayer.subjectLevels[subject] =
    Math.min(
      100,
      currentPlayer.subjectLevels[subject]
    );


  // ----------------------------------------
  // 新レベル
  // ----------------------------------------

  const newLevel = calculateLevel(
    currentPlayer.xp
  );

  currentPlayer.level = newLevel;


  // ----------------------------------------
  // Firestoreへ勉強記録
  // ----------------------------------------

  const recordRef = collection(
    db,
    "players",
    currentUser.uid,
    "studyRecords"
  );

  await addDoc(recordRef, {
    subject,
    subjectName: getSubjectName(subject),

    minutes: safeMinutes,

    xp: gainedXp,
    coins: gainedCoins,

    note: String(note || ""),

    source,

    date: getJapanDateString(),

    createdAt: serverTimestamp()
  });


  // ----------------------------------------
  // プレイヤー保存
  // ----------------------------------------

  await savePlayer();


  // ----------------------------------------
  // UI更新
  // ----------------------------------------

  applyPlayerData();

  await loadStudyHistory();


  // ----------------------------------------
  // レベルアップ
  // ----------------------------------------

  if (newLevel > oldLevel) {
    showLevelUp(
      oldLevel,
      newLevel
    );
  }


  // ----------------------------------------
  // 通知
  // ----------------------------------------

  showNotification(
    `📚 ${safeMinutes}分記録！ +${gainedXp} XP / +${gainedCoins} 🪙`
  );

  return {
    minutes: safeMinutes,
    xp: gainedXp,
    coins: gainedCoins,
    oldLevel,
    newLevel
  };
}


// ============================================================
// 手動勉強記録フォーム
// ============================================================

async function handleStudyRecord(event) {
  event.preventDefault();

  const errorElement =
    getElement("study-error");

  if (errorElement) {
    errorElement.textContent = "";
  }

  const subject =
    getElement("study-subject")?.value;

  const minutes =
    getElement("study-minutes")?.value;

  const note =
    getElement("study-note")?.value || "";

  try {
    const result = await recordStudy(
      subject,
      minutes,
      note,
      "manual"
    );

    const form =
      getElement("study-record-form");

    if (form) {
      form.reset();
    }

    showNotification(
      `勉強記録完了！ +${result.xp} XP`
    );

  } catch (error) {
    console.error(error);

    if (errorElement) {
      errorElement.textContent =
        error.message;
    } else {
      alert(error.message);
    }
  }
}


// ============================================================
// タイマー
// ============================================================

function getTimerElapsedSeconds() {
  if (!timerState.running) {
    return timerState.accumulatedSeconds;
  }

  return (
    timerState.accumulatedSeconds +
    Math.floor(
      (Date.now() - timerState.startedAt) / 1000
    )
  );
}


function updateTimerDisplay() {
  const seconds =
    getTimerElapsedSeconds();

  const totalMinutes =
    Math.floor(seconds / 60);

  const displaySeconds =
    seconds % 60;

  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  const display =
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(displaySeconds).padStart(2, "0")}`;

  setText(
    "study-timer-display",
    display
  );
}


function startTimer() {
  if (timerState.running) {
    return;
  }

  timerState.running = true;
  timerState.startedAt = Date.now();

  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    updateTimerDisplay();

    // 日付変更を検知
    handleTimerDateChange();

  }, 1000);

  updateTimerButtons();
  updateTimerDisplay();
}


function pauseTimer() {
  if (!timerState.running) {
    return;
  }

  timerState.accumulatedSeconds =
    getTimerElapsedSeconds();

  timerState.running = false;
  timerState.startedAt = null;

  clearInterval(timerInterval);
  timerInterval = null;

  updateTimerButtons();
  updateTimerDisplay();
}


function resetTimer() {
  pauseTimer();

  timerState.accumulatedSeconds = 0;

  updateTimerDisplay();
  updateTimerButtons();
}


function updateTimerButtons() {
  const startButton =
    getElement("study-timer-start");

  const pauseButton =
    getElement("study-timer-pause");

  if (startButton) {
    startButton.disabled =
      timerState.running;
  }

  if (pauseButton) {
    pauseButton.disabled =
      !timerState.running;
  }
}


// ============================================================
// タイマー日付変更
// ============================================================

let lastTimerDate =
  getJapanDateString();

async function handleTimerDateChange() {
  const currentDate =
    getJapanDateString();

  if (currentDate === lastTimerDate) {
    return;
  }

  lastTimerDate = currentDate;

  /*
    00:00になったら、
    前日分を自動保存する。

    タイマーはそのまま継続する。
  */

  const elapsedSeconds =
    getTimerElapsedSeconds();

  const elapsedMinutes =
    Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes >= 1) {
    await saveTimerMinutes(
      elapsedMinutes,
      "timer-midnight"
    );
  }

  timerState.accumulatedSeconds =
    Math.max(
      0,
      elapsedSeconds -
      elapsedMinutes * 60
    );

  if (timerState.running) {
    timerState.startedAt =
      Date.now();
  }

  updateTimerDisplay();
}


async function saveTimerMinutes(
  minutes,
  source = "timer"
) {
  const subject =
    getElement("study-subject")?.value;

  if (!subject) {
    showNotification(
      "タイマー記録には科目を選択してください。"
    );
    return;
  }

  try {
    await recordStudy(
      subject,
      minutes,
      "",
      source
    );
  } catch (error) {
    console.error(
      "Timer save error:",
      error
    );

    showNotification(
      "タイマー記録に失敗しました。"
    );
  }
}


// ============================================================
// タイマー保存ボタン
// ============================================================

async function saveTimer() {
  const seconds =
    getTimerElapsedSeconds();

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 1) {
    showNotification(
      "1分以上勉強してから保存してください。"
    );
    return;
  }

  await pauseTimer();

  await saveTimerMinutes(
    minutes,
    "timer"
  );

  timerState.accumulatedSeconds =
    0;

  updateTimerDisplay();
}


// ============================================================
// 勉強履歴
// ============================================================

async function loadStudyHistory() {
  const list =
    getElement("study-history-list");

  if (!list || !currentUser || !db) {
    return;
  }

  list.innerHTML =
    `<div class="empty-message">読み込み中...</div>`;

  try {
    const recordsRef = collection(
      db,
      "players",
      currentUser.uid,
      "studyRecords"
    );

    const recordsQuery = query(
      recordsRef,
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const snapshot =
      await getDocs(recordsQuery);

    if (snapshot.empty) {
      list.innerHTML =
        `<div class="empty-message">まだ勉強記録がありません。</div>`;
      return;
    }

    list.innerHTML = "";

    snapshot.forEach(record => {
      const data = record.data();

      const item =
        document.createElement("div");

      item.className =
        "study-history-item";

      item.innerHTML = `
        <div class="study-history-main">
          <strong>
            ${escapeHtml(
              getSubjectName(data.subject)
            )}
          </strong>

          <span>
            ${Number(data.minutes || 0)}分
          </span>
        </div>

        <div class="study-history-sub">
          +${Number(data.xp || 0)} XP
          ・
          +${Number(data.coins || 0)} 🪙
          ${data.createdAt
            ? `・ ${escapeHtml(
                formatDateTime(data.createdAt)
              )}`
            : ""}
        </div>

        ${
          data.note
            ? `<div class="study-history-note">
                ${escapeHtml(data.note)}
              </div>`
            : ""
        }
      `;

      list.appendChild(item);
    });

  } catch (error) {
    console.error(
      "Study history error:",
      error
    );

    list.innerHTML =
      `<div class="empty-message">
        履歴を読み込めませんでした。
      </div>`;
  }
}


// ============================================================
// HTMLエスケープ
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
// 科目レベルUI
// ============================================================

function updateSubjectLevelUI() {
  const list =
    getElement("subject-level-list");

  if (!list || !currentPlayer) {
    return;
  }

  const subjects =
    currentPlayer.subjects || [];

  if (subjects.length === 0) {
    list.innerHTML =
      `<div class="empty-message">選択科目がありません。</div>`;
    return;
  }

  list.innerHTML = "";

  subjects.forEach(subject => {
    const minutes =
      currentPlayer.subjectStudyMinutes?.[subject] || 0;

    const level =
      Math.min(
        100,
        Math.floor(minutes / 30)
      );

    const item =
      document.createElement("div");

    item.className =
      "subject-level-item";

    item.innerHTML = `
      <div>
        <strong>
          ${escapeHtml(
            getSubjectName(subject)
          )}
        </strong>
      </div>

      <div>
        Lv.${level}
      </div>

      <div>
        ${minutes}分
      </div>
    `;

    list.appendChild(item);
  });


  // ----------------------------------------
  // 科目勉強時間一覧
  // ----------------------------------------

  const studyList =
    getElement("subject-study-list");

  if (!studyList) {
    return;
  }

  studyList.innerHTML = "";

  subjects.forEach(subject => {
    const minutes =
      currentPlayer.subjectStudyMinutes?.[subject] || 0;

    const item =
      document.createElement("div");

    item.className =
      "subject-study-item";

    item.innerHTML = `
      <span>
        ${escapeHtml(
          getSubjectName(subject)
        )}
      </span>

      <span>
        ${formatMinutes(minutes)}
      </span>
    `;

    studyList.appendChild(item);
  });
}


// ============================================================
// ログイン
// ============================================================

async function handleLogin(event) {
  event.preventDefault();

  const userId =
    normalizeUserId(
      getElement("login-user-id")?.value
    );

  const password =
    getElement("login-password")?.value || "";

  const errorElement =
    getElement("login-error");

  if (errorElement) {
    errorElement.textContent = "";
  }

  if (!userId) {
    if (errorElement) {
      errorElement.textContent =
        "ユーザーIDを入力してください。";
    }
    return;
  }

  if (!password) {
    if (errorElement) {
      errorElement.textContent =
        "パスワードを入力してください。";
    }
    return;
  }

  const button =
    getElement("login-button");

  if (button) {
    button.disabled = true;
  }

  try {
    await signInWithEmailAndPassword(
      auth,
      userIdToEmail(userId),
      password
    );

    console.log("Login successful.");

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    if (errorElement) {
      errorElement.textContent =
        firebaseErrorMessage(error);
    }
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}


// ============================================================
// 登録
// ============================================================

async function handleRegister(event) {
  event.preventDefault();

  const errorElement =
    getElement("register-error");

  const subjectError =
    getElement("subject-error");

  if (errorElement) {
    errorElement.textContent = "";
  }

  if (subjectError) {
    subjectError.textContent = "";
  }


  const userId =
    normalizeUserId(
      getElement("register-user-id")?.value
    );

  const password =
    getElement("register-password")?.value || "";

  const passwordConfirm =
    getElement("register-password-confirm")?.value || "";

  const displayName =
    getElement("register-display-name")?.value.trim() || "";

  const course =
    document.querySelector(
      'input[name="course"]:checked'
    )?.value || "undecided";

  const subjects =
    Array.from(
      document.querySelectorAll(
        'input[name="subjects"]:checked'
      )
    ).map(
      checkbox => checkbox.value
    );


  if (!userId) {
    if (errorElement) {
      errorElement.textContent =
        "ユーザーIDを入力してください。";
    }
    return;
  }

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(userId)) {
    if (errorElement) {
      errorElement.textContent =
        "ユーザーIDは3〜30文字の英数字・_・-で入力してください。";
    }
    return;
  }

  if (password.length < 6) {
    if (errorElement) {
      errorElement.textContent =
        "パスワードは6文字以上にしてください。";
    }
    return;
  }

  if (password !== passwordConfirm) {
    if (errorElement) {
      errorElement.textContent =
        "パスワードが一致していません。";
    }
    return;
  }

  if (!displayName) {
    if (errorElement) {
      errorElement.textContent =
        "表示名を入力してください。";
    }
    return;
  }

  if (subjects.length === 0) {
    if (subjectError) {
      subjectError.textContent =
        "少なくとも1科目選択してください。";
    }
    return;
  }


  const button =
    getElement("register-button");

  if (button) {
    button.disabled = true;
  }


  try {
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        userIdToEmail(userId),
        password
      );

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
      await loadPlayer(currentUser);

    showMainScreen();
    applyPlayerData();

    showNotification(
      "🎉 アカウント作成完了！"
    );

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    if (errorElement) {
      errorElement.textContent =
        firebaseErrorMessage(error);
    }
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}


// ============================================================
// ログアウト
// ============================================================

async function handleLogout() {
  try {
    resetTimer();

    await signOut(auth);

  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    alert(
      firebaseErrorMessage(error)
    );
  }
}


// ============================================================
// 認証状態
// ============================================================

function startAuthObserver() {
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
          ? user.email
          : "signed out"
      );

      if (!user) {
        currentUser = null;
        currentPlayer = null;

        resetTimer();

        showLoginScreen();

        return;
      }

      currentUser = user;

      try {
        let player =
          await loadPlayer(user);

        if (!player) {
          /*
            Firebase Authにはユーザーがいるが、
            Firestoreのプレイヤーデータがない場合。
          */

          player =
            await createPlayer(
              user,
              {
                userId:
                  user.email
                    ?.replace(
                      "@juken-rpg.local",
                      ""
                    ) || "",
                displayName:
                  user.email
                    ?.replace(
                      "@juken-rpg.local",
                      ""
                    ) || "プレイヤー"
              }
            );

          player =
            await loadPlayer(user);
        }

        currentPlayer =
          normalizeDailyData(player);

        currentPlayer.level =
          calculateLevel(
            currentPlayer.xp || 0
          );

        await savePlayer();

        showMainScreen();

        applyPlayerData();

        await loadStudyHistory();

        console.log(
          "Player loaded:",
          currentPlayer
        );

      } catch (error) {
        console.error(
          "Player loading error:",
          error
        );

        /*
          Firestoreエラーでもログイン状態自体は
          維持しておく。
        */

        showMainScreen();

        setText(
          "header-display-name",
          user.email || "プレイヤー"
        );

        showNotification(
          "プレイヤーデータの読み込みに失敗しました。"
        );
      }
    }
  );
}


// ============================================================
// 画面ナビゲーション
// ============================================================

function initializeNavigation() {
  document
    .querySelectorAll("[data-screen]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.screen;

          if (!target) {
            return;
          }

          document
            .querySelectorAll("[id$='-screen']")
            .forEach(screen => {

              if (
                screen.id === "auth-screen" ||
                screen.id === "login-screen" ||
                screen.id === "register-screen"
              ) {
                return;
              }

              screen.style.display =
                screen.id === target
                  ? ""
                  : "none";
            });

          if (
            target === "study-screen"
          ) {
            updateTimerDisplay();
            updateTimerButtons();
            updateSubjectLevelUI();
            loadStudyHistory();
          }
        }
      );
    });
}


// ============================================================
// クエストタブ・その他タブなど
// Phase 2では画面だけ切り替える
// ============================================================

function initializeTabs() {

  // クエスト
  document
    .querySelectorAll("[data-quest-tab]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.questTab;

          document
            .querySelectorAll(
              "[id$='-quest-tab']"
            )
            .forEach(tab => {
              tab.style.display = "none";
            });

          const targetTab =
            getElement(
              `${target}-quest-tab`
            );

          if (targetTab) {
            targetTab.style.display = "";
          }
        }
      );
    });


  // パーティー
  document
    .querySelectorAll("[data-party-tab]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.partyTab;

          document
            .querySelectorAll(
              "[id$='-tab']"
            )
            .forEach(tab => {

              if (
                tab.id.includes("party") ||
                tab.id.includes("friends") ||
                tab.id.includes("request")
              ) {
                tab.style.display = "none";
              }
            });

          const targetTab =
            getElement(
              `${target}-tab`
            );

          if (targetTab) {
            targetTab.style.display = "";
          }
        }
      );
    });


  // ランク
  document
    .querySelectorAll("[data-rank-tab]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.rankTab;

          document
            .querySelectorAll(
              "[id$='-tab']"
            )
            .forEach(tab => {

              if (
                tab.id.includes("rank") ||
                tab.id.includes("ranking") ||
                tab.id.includes("season")
              ) {
                tab.style.display = "none";
              }
            });

          const targetTab =
            getElement(
              `${target}-tab`
            );

          if (targetTab) {
            targetTab.style.display = "";
          }
        }
      );
    });


  // Other
  document
    .querySelectorAll("[data-other-tab]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.otherTab;

          document
            .querySelectorAll(
              "[id$='-tab']"
            )
            .forEach(tab => {

              if (
                tab.id.includes("other") ||
                tab.id.includes("achievement") ||
                tab.id.includes("shop") ||
                tab.id.includes("locker") ||
                tab.id.includes("profile") ||
                tab.id.includes("settings")
              ) {
                tab.style.display = "none";
              }
            });

          const targetTab =
            getElement(
              `${target}-tab`
            );

          if (targetTab) {
            targetTab.style.display = "";
          }
        }
      );
    });
}


// ============================================================
// イベント初期化
// ============================================================

function initializeEvents() {

  // ----------------------------------------
  // ログイン
  // ----------------------------------------

  const loginForm =
    getElement("login-form");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      handleLogin
    );
  }


  // ----------------------------------------
  // 登録
  // ----------------------------------------

  const registerForm =
    getElement("register-form");

  if (registerForm) {
    registerForm.addEventListener(
      "submit",
      handleRegister
    );
  }


  // ----------------------------------------
  // ログイン ↔ 登録
  // ----------------------------------------

  const showRegisterButton =
    getElement("show-register-button");

  if (showRegisterButton) {
    showRegisterButton.addEventListener(
      "click",
      showRegisterScreen
    );
  }

  const showLoginButton =
    getElement("show-login-button");

  if (showLoginButton) {
    showLoginButton.addEventListener(
      "click",
      showLoginScreen
    );
  }


  // ----------------------------------------
  // ログアウト
  // ----------------------------------------

  const logoutButton =
    getElement("logout-button");

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      handleLogout
    );
  }


  // ----------------------------------------
  // 手動記録
  // ----------------------------------------

  const studyForm =
    getElement("study-record-form");

  if (studyForm) {
    studyForm.addEventListener(
      "submit",
      handleStudyRecord
    );
  }


  // ----------------------------------------
  // タイマー
  // ----------------------------------------

  const startButton =
    getElement("study-timer-start");

  if (startButton) {
    startButton.addEventListener(
      "click",
      startTimer
    );
  }


  const pauseButton =
    getElement("study-timer-pause");

  if (pauseButton) {
    pauseButton.addEventListener(
      "click",
      pauseTimer
    );
  }


  const resetButton =
    getElement("study-timer-reset");

  if (resetButton) {
    resetButton.addEventListener(
      "click",
      resetTimer
    );
  }


  const timerSaveButton =
    getElement("timer-save-button");

  if (timerSaveButton) {
    timerSaveButton.addEventListener(
      "click",
      saveTimer
    );
  }


  // ----------------------------------------
  // Lvアップモーダル
  // ----------------------------------------

  const levelUpClose =
    getElement(
      "level-up-close-button"
    );

  if (levelUpClose) {
    levelUpClose.addEventListener(
      "click",
      closeLevelUpModal
    );
  }


  // ----------------------------------------
  // 報酬モーダル
  // ----------------------------------------

  const rewardClose =
    getElement(
      "reward-close-button"
    );

  if (rewardClose) {
    rewardClose.addEventListener(
      "click",
      () => {
        const modal =
          getElement("reward-modal");

        if (modal) {
          modal.style.display =
            "none";
        }
      }
    );
  }


  // ----------------------------------------
  // ナビゲーション
  // ----------------------------------------

  initializeNavigation();

  initializeTabs();

  updateTimerDisplay();
  updateTimerButtons();
}


// ============================================================
// Boot
// ============================================================

async function boot() {

  if (booted) {
    return;
  }

  booted = true;

  console.log(
    "===================================="
  );

  console.log(
    "受験RPG PHASE 2 START"
  );

  console.log(
    "===================================="
  );


  showLoginScreen();


  if (!initializeFirebase()) {
    return;
  }


  initializeEvents();

  startAuthObserver();
}


// ============================================================
// 起動
// ============================================================

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    boot,
    { once: true }
  );
} else {
  boot();
}
