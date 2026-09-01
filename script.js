// ============================================================
// 受験RPG - script.js
// PHASE 3 COMPLETE
// Firebase Auth / Firestore
// XP / LEVEL / COINS
// Study Timer
// Manual Study Record
// Subject Level
// Study History
// Japan Time
// Level Up
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
  updateDoc,
  deleteDoc,
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


// ============================================================
// Timer
// ============================================================

let timerInterval = null;

let timerState = {
  running: false,
  startedAt: null,
  accumulatedSeconds: 0,
  lastTickAt: null,
  lastSavedDate: null
};


// ============================================================
// DOM helpers
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

  if (!el) return;

  el.classList.remove("hidden");
  el.style.display = "";
}

function hideElement(id) {
  const el = getElement(id);

  if (!el) return;

  el.classList.add("hidden");
  el.style.display = "none";
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
  hideElement("login-screen");
  hideElement("register-screen");

  const mainApp = getElement("main-app");

  if (mainApp) {
    mainApp.classList.remove("hidden");
    mainApp.style.display = "";
  }

  document.querySelectorAll(".app-screen").forEach(screen => {
    screen.classList.add("hidden");
    screen.style.display = "none";
  });

  const home = getElement("home-screen");

  if (home) {
    home.classList.remove("hidden");
    home.style.display = "";
  }

  document.querySelectorAll("[data-screen]").forEach(button => {
    button.classList.remove("active");
  });

  const homeButton = document.querySelector(
    '[data-screen="home-screen"]'
  );

  if (homeButton) {
    homeButton.classList.add("active");
  }
}


// ============================================================
// Utility
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

function formatSeconds(totalSeconds) {
  const seconds = Math.max(
    0,
    Math.floor(Number(totalSeconds) || 0)
  );

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(
    (seconds % 3600) / 60
  );
  const secs = seconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0")
  ].join(":");
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  let date = null;

  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "string") {
    date = new Date(timestamp);
  }

  if (!date || Number.isNaN(date.getTime())) {
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

function getCourseName(course) {
  const names = {
    science: "理系",
    humanities: "文系",
    undecided: "未定"
  };

  return names[course] || course || "未定";
}


// ============================================================
// Firebase errors
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

  return (
    messages[code] ||
    `エラーが発生しました。\n${error?.message || code}`
  );
}


// ============================================================
// Firebase initialization
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
// Level system
// ============================================================

function xpRequiredForLevel(level) {
  if (level >= 100) {
    return 0;
  }

  const block = Math.floor(
    (level - 1) / 10
  );

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
    const nextRequired =
      totalXpForLevel(level + 1);

    if (xp < nextRequired) {
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

  const percent = Math.min(
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

function getSubjectName(subject) {
  return SUBJECT_NAMES[subject]
    || subject
    || "その他";
}


// ============================================================
// Default player
// ============================================================

function createDefaultPlayerData(userId = "") {
  return {
    userId,

    displayName:
      userId || "プレイヤー",

    course: "undecided",

    subjects: [],

    xp: 0,
    level: 1,

    coins: 0,
    stars: 0,

    totalStudyMinutes: 0,

    todayStudyMinutes: 0,
    todayStudyDate:
      getJapanDateString(),

    todayXp: 0,
    todayCoins: 0,

    seasonStudyMinutes: 0,

    subjectLevels: {},
    subjectStudyMinutes: {},

    totalXp: 0,
    totalCoins: 0,

    rank: "Bronze",

    title: "見習い受験生",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}


// ============================================================
// Daily data
// ============================================================

function normalizeDailyData(player) {
  if (!player) {
    return player;
  }

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

  return player;
}


// ============================================================
// Firestore player
// ============================================================

async function loadPlayer(user) {
  if (!user || !db) {
    return null;
  }

  const playerRef =
    doc(db, "players", user.uid);

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

  player.subjectLevels =
    player.subjectLevels || {};

  player.subjectStudyMinutes =
    player.subjectStudyMinutes || {};

  player.subjects =
    Array.isArray(player.subjects)
      ? player.subjects
      : [];

  normalizeDailyData(player);

  player.level =
    calculateLevel(player.xp || 0);

  return player;
}

async function createPlayer(
  user,
  additionalData = {}
) {
  const defaultData =
    createDefaultPlayerData(
      additionalData.userId || ""
    );

  const playerData = {
    ...defaultData,
    ...additionalData,

    uid: user.uid,
    email: user.email || "",

    updatedAt:
      serverTimestamp()
  };

  const playerRef =
    doc(db, "players", user.uid);

  await setDoc(
    playerRef,
    playerData
  );

  return playerData;
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

  currentPlayer.level =
    calculateLevel(
      currentPlayer.xp || 0
    );

  currentPlayer.updatedAt =
    serverTimestamp();

  const playerRef =
    doc(
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
// Subject select
// ============================================================

function populateStudySubjectSelect() {
  const select =
    getElement("study-subject");

  if (!select || !currentPlayer) {
    return;
  }

  const subjects =
    Array.isArray(currentPlayer.subjects)
      ? currentPlayer.subjects
      : [];

  const previousValue =
    select.value;

  select.innerHTML = "";

  const placeholder =
    document.createElement("option");

  placeholder.value = "";
  placeholder.textContent =
    "科目を選択";
  placeholder.disabled = true;

  select.appendChild(
    placeholder
  );

  subjects.forEach(subject => {
    const option =
      document.createElement("option");

    option.value = subject;
    option.textContent =
      getSubjectName(subject);

    select.appendChild(option);
  });

  if (
    subjects.includes(
      previousValue
    )
  ) {
    select.value =
      previousValue;
  } else if (
    subjects.length === 1
  ) {
    select.value =
      subjects[0];
  } else {
    select.selectedIndex = 0;
  }
}


// ============================================================
// Subject UI
// ============================================================

function updateSubjectLevelUI() {
  if (!currentPlayer) {
    return;
  }

  const levelList =
    getElement(
      "subject-level-list"
    );

  if (levelList) {
    levelList.innerHTML = "";

    const subjects =
      Array.isArray(currentPlayer.subjects)
        ? currentPlayer.subjects
        : [];

    if (subjects.length === 0) {
      levelList.textContent =
        "登録科目がありません。";
    } else {
      subjects.forEach(subject => {
        const level =
          Math.min(
            100,
            Math.floor(
              Number(
                currentPlayer
                  .subjectLevels?.[subject]
              ) || 0
            )
          );

        const minutes =
          Math.max(
            0,
            Math.floor(
              Number(
                currentPlayer
                  .subjectStudyMinutes?.[
                    subject
                  ]
              ) || 0
            )
          );

        const row =
          document.createElement("div");

        row.className =
          "subject-level-row";

        row.innerHTML = `
          <span>
            ${getSubjectName(subject)}
          </span>
          <span>
            Lv.${level}
          </span>
          <span>
            ${formatMinutes(minutes)}
          </span>
        `;

        levelList.appendChild(row);
      });
    }
  }

  const studyList =
    getElement(
      "subject-study-list"
    );

  if (studyList) {
    studyList.innerHTML = "";

    const subjects =
      Array.isArray(currentPlayer.subjects)
        ? currentPlayer.subjects
        : [];

    subjects.forEach(subject => {
      const minutes =
        Number(
          currentPlayer
            .subjectStudyMinutes?.[
              subject
            ]
        ) || 0;

      const row =
        document.createElement("div");

      row.className =
        "subject-study-row";

      row.textContent =
        `${getSubjectName(subject)}：${formatMinutes(minutes)}`;

      studyList.appendChild(row);
    });
  }
}


// ============================================================
// Player UI
// ============================================================

function applyPlayerData() {
  if (!currentPlayer) {
    return;
  }

  normalizeDailyData(
    currentPlayer
  );

  const level =
    calculateLevel(
      currentPlayer.xp || 0
    );

  currentPlayer.level =
    level;

  const progress =
    getLevelProgress(
      currentPlayer.xp || 0
    );


  // Header

  setText(
    "header-display-name",
    currentPlayer.displayName
      || "プレイヤー"
  );

  setText(
    "header-level",
    `Lv.${level}`
  );

  setText(
    "header-rank",
    currentPlayer.rank
      || "Bronze"
  );

  setText(
    "header-coins",
    `🪙 ${currentPlayer.coins || 0}`
  );


  // Home

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

  const progressBar =
    getElement(
      "level-progress"
    );

  if (progressBar) {
    if (
      progressBar.tagName ===
      "PROGRESS"
    ) {
      progressBar.max = 100;
      progressBar.value =
        progress.percent;
    } else {
      progressBar.style.width =
        `${progress.percent}%`;
    }
  }

  setText(
    "today-study-time",
    formatMinutes(
      currentPlayer
        .todayStudyMinutes || 0
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
    currentPlayer.rank
      || "Bronze"
  );

  setText(
    "home-season-study-time",
    formatMinutes(
      currentPlayer
        .seasonStudyMinutes || 0
    )
  );

  setText(
    "star-count",
    currentPlayer.stars || 0
  );

  setText(
    "star-title",
    currentPlayer.title
      || "見習い受験生"
  );


  // Profile

  setText(
    "profile-display-name",
    currentPlayer.displayName
      || "-"
  );

  setText(
    "profile-user-id",
    currentPlayer.userId
      || "-"
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
      currentPlayer
        .totalStudyMinutes || 0
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

  setText(
    "profile-bosses-defeated",
    currentPlayer
      .bossesDefeated || 0
  );

  setText(
    "profile-quests-completed",
    currentPlayer
      .questsCompleted || 0
  );


  populateStudySubjectSelect();
  updateSubjectLevelUI();
}


// ============================================================
// Notification
// ============================================================

function showNotification(message) {
  const notification =
    getElement("notification");

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
    setTimeout(() => {
      notification.style.display =
        "none";

      notification.classList.add(
        "hidden"
      );
    }, 3500);
}


// ============================================================
// Level up
// ============================================================

function showLevelUp(
  oldLevel,
  newLevel
) {
  if (
    newLevel <= oldLevel
  ) {
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

  const modal =
    getElement(
      "level-up-modal"
    );

  if (modal) {
    modal.classList.remove(
      "hidden"
    );

    modal.style.display =
      "";
  }

  showNotification(
    `🎉 LEVEL UP!! Lv.${oldLevel} → Lv.${newLevel}`
  );
}

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


// ============================================================
// Study recording
// ============================================================

let studyRecordBusy = false;

async function recordStudy(
  subject,
  minutes,
  note = "",
  source = "manual",
  recordDate = null
) {
  if (
    !currentUser ||
    !currentPlayer
  ) {
    throw new Error(
      "ログインしていません。"
    );
  }

  if (studyRecordBusy) {
    throw new Error(
      "現在、別の勉強記録を保存中です。"
    );
  }

  const safeMinutes =
    Math.floor(
      Number(minutes)
    );

  if (
    !Number.isFinite(
      safeMinutes
    ) ||
    safeMinutes < 1
  ) {
    throw new Error(
      "勉強時間は1分以上で入力してください。"
    );
  }

  if (!subject) {
    throw new Error(
      "科目を選択してください。"
    );
  }

  if (
    !Array.isArray(
      currentPlayer.subjects
    ) ||
    !currentPlayer.subjects.includes(
      subject
    )
  ) {
    throw new Error(
      "登録されていない科目です。"
    );
  }

  studyRecordBusy = true;

  try {
    normalizeDailyData(
      currentPlayer
    );

    const oldLevel =
      calculateLevel(
        currentPlayer.xp || 0
      );

    const gainedXp =
      safeMinutes;

    const gainedCoins =
      safeMinutes;


    // Total XP

    currentPlayer.xp =
      Math.min(
        Number.MAX_SAFE_INTEGER,
        (currentPlayer.xp || 0)
          + gainedXp
      );

    currentPlayer.totalXp =
      (currentPlayer.totalXp || 0)
      + gainedXp;


    // Coins

    currentPlayer.coins =
      Math.min(
        Number.MAX_SAFE_INTEGER,
        (currentPlayer.coins || 0)
          + gainedCoins
      );

    currentPlayer.totalCoins =
      (currentPlayer.totalCoins || 0)
      + gainedCoins;


    // Today

    currentPlayer.todayStudyMinutes =
      (currentPlayer.todayStudyMinutes || 0)
      + safeMinutes;

    currentPlayer.todayXp =
      (currentPlayer.todayXp || 0)
      + gainedXp;

    currentPlayer.todayCoins =
      (currentPlayer.todayCoins || 0)
      + gainedCoins;


    // Total study

    currentPlayer.totalStudyMinutes =
      (currentPlayer.totalStudyMinutes || 0)
      + safeMinutes;


    // Season

    currentPlayer.seasonStudyMinutes =
      (currentPlayer.seasonStudyMinutes || 0)
      + safeMinutes;


    // Subject

    if (
      !currentPlayer
        .subjectStudyMinutes
    ) {
      currentPlayer
        .subjectStudyMinutes = {};
    }

    if (
      !currentPlayer
        .subjectLevels
    ) {
      currentPlayer
        .subjectLevels = {};
    }

    currentPlayer
      .subjectStudyMinutes[subject] =
      (currentPlayer
        .subjectStudyMinutes[subject] || 0)
      + safeMinutes;


    // 30min = Subject Lv +1

    currentPlayer
      .subjectLevels[subject] =
      Math.min(
        100,
        Math.floor(
          currentPlayer
            .subjectStudyMinutes[subject]
          / 30
        )
      );


    // New level

    const newLevel =
      calculateLevel(
        currentPlayer.xp
      );

    currentPlayer.level =
      newLevel;


    // Firestore study record

    const recordRef =
      collection(
        db,
        "players",
        currentUser.uid,
        "studyRecords"
      );

    await addDoc(
      recordRef,
      {
        subject,
        subjectName:
          getSubjectName(
            subject
          ),

        minutes:
          safeMinutes,

        xp:
          gainedXp,

        coins:
          gainedCoins,

        note:
          String(note || ""),

        source,

        date:
          recordDate ||
          getJapanDateString(),

        createdAt:
          serverTimestamp()
      }
    );


    // Save player

    await savePlayer();


    // UI

    applyPlayerData();

    await loadStudyHistory();


    // Level up

    if (
      newLevel > oldLevel
    ) {
      showLevelUp(
        oldLevel,
        newLevel
      );
    }


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

  } finally {
    studyRecordBusy = false;
  }
}


// ============================================================
// Manual study form
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

      const errorEl =
        getElement(
          "study-error"
        );

      if (errorEl) {
        errorEl.textContent =
          "";
      }

      try {
        await recordStudy(
          subject,
          minutes,
          note,
          "manual"
        );

        form.reset();

        populateStudySubjectSelect();

      } catch (error) {
        console.error(
          "Manual study error:",
          error
        );

        if (errorEl) {
          errorEl.textContent =
            firebaseErrorMessage(
              error
            );
        } else {
          showNotification(
            error.message
          );
        }
      }
    }
  );
}


// ============================================================
// Study history
// ============================================================

async function loadStudyHistory() {
  const historyList =
    getElement(
      "study-history-list"
    );

  if (!historyList) {
    return;
  }

  if (
    !currentUser ||
    !db
  ) {
    historyList.innerHTML =
      "";

    return;
  }

  historyList.innerHTML =
    "<div>読み込み中...</div>";

  try {
    const recordsRef =
      collection(
        db,
        "players",
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
        limit(50)
      );

    const snapshot =
      await getDocs(q);

    historyList.innerHTML =
      "";

    if (snapshot.empty) {
      historyList.innerHTML =
        "<div>まだ勉強記録がありません。</div>";

      return;
    }

    snapshot.forEach(docSnap => {
      const data =
        docSnap.data();

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "study-history-item";

      const sourceText =
        data.source === "timer"
          ? "タイマー"
          : "手動";

      row.innerHTML = `
        <div>
          <strong>
            ${escapeHtml(
              data.subjectName ||
              getSubjectName(
                data.subject
              )
            )}
          </strong>
          <span>
            ${formatMinutes(
              data.minutes || 0
            )}
          </span>
        </div>

        <div>
          +${Number(data.xp || 0)} XP
          ・
          +${Number(data.coins || 0)} 🪙
        </div>

        <div>
          ${sourceText}
          ${data.date
            ? `・${escapeHtml(data.date)}`
            : ""}
        </div>

        ${
          data.note
            ? `<div>${escapeHtml(
                data.note
              )}</div>`
            : ""
        }
      `;

      historyList.appendChild(
        row
      );
    });

  } catch (error) {
    console.error(
      "Study history error:",
      error
    );

    historyList.innerHTML =
      "<div>履歴の読み込みに失敗しました。</div>";
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// Timer
// ============================================================

function getTimerElapsedSeconds() {
  let seconds =
    timerState.accumulatedSeconds || 0;

  if (
    timerState.running &&
    timerState.startedAt
  ) {
    const elapsed =
      Math.floor(
        (Date.now() -
          timerState.startedAt)
        / 1000
      );

    seconds += Math.max(
      0,
      elapsed
    );
  }

  return seconds;
}

function updateTimerDisplay() {
  setText(
    "study-timer-display",
    formatSeconds(
      getTimerElapsedSeconds()
    )
  );
}

function updateTimerButtons() {
  const startButton =
    getElement(
      "study-timer-start"
    );

  const pauseButton =
    getElement(
      "study-timer-pause"
    );

  const resetButton =
    getElement(
      "study-timer-reset"
    );

  if (startButton) {
    startButton.disabled =
      timerState.running;
  }

  if (pauseButton) {
    pauseButton.disabled =
      !timerState.running;
  }

  if (resetButton) {
    resetButton.disabled =
      getTimerElapsedSeconds() <= 0;
  }
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(
      timerInterval
    );

    timerInterval = null;
  }
}

function startTimerInterval() {
  stopTimerInterval();

  timerInterval =
    setInterval(
      handleTimerTick,
      1000
    );
}

function startTimer() {
  if (timerState.running) {
    return;
  }

  timerState.running = true;

  timerState.startedAt =
    Date.now();

  timerState.lastTickAt =
    Date.now();

  timerState.lastSavedDate =
    getJapanDateString();

  startTimerInterval();

  updateTimerDisplay();
  updateTimerButtons();

  showNotification(
    "⏱️ タイマー開始！"
  );
}

function pauseTimer() {
  if (!timerState.running) {
    return;
  }

  timerState.accumulatedSeconds =
    getTimerElapsedSeconds();

  timerState.running = false;

  timerState.startedAt = null;

  timerState.lastTickAt = null;

  stopTimerInterval();

  updateTimerDisplay();
  updateTimerButtons();

  showNotification(
    "⏸️ タイマー一時停止"
  );
}

function resetTimer() {
  stopTimerInterval();

  timerState = {
    running: false,
    startedAt: null,
    accumulatedSeconds: 0,
    lastTickAt: null,
    lastSavedDate: null
  };

  updateTimerDisplay();
  updateTimerButtons();

  showNotification(
    "🔄 タイマーをリセットしました。"
  );
}


// ============================================================
// Timer midnight handling
// ============================================================

async function handleTimerDateChange() {
  if (!timerState.running) {
    return;
  }

  const currentDate =
    getJapanDateString();

  if (
    !timerState.lastSavedDate
  ) {
    timerState.lastSavedDate =
      currentDate;

    return;
  }

  if (
    currentDate ===
    timerState.lastSavedDate
  ) {
    return;
  }

  /*
    00:00を跨いだ場合、
    その瞬間までの経過分を
    前日の記録として保存する。

    その後、タイマーの秒数を
    新しい日の計測へ移す。
  */

  const elapsedSeconds =
    getTimerElapsedSeconds();

  const minutes =
    Math.floor(
      elapsedSeconds / 60
    );

  const subject =
    getElement(
      "study-subject"
    )?.value;

  if (
    minutes >= 1 &&
    subject
  ) {
    const previousDate =
      getPreviousJapanDate(
        currentDate
      );

    try {
      await recordStudy(
        subject,
        minutes,
        "日付跨ぎ自動保存",
        "timer-midnight",
        previousDate
      );

      timerState.accumulatedSeconds =
        0;

      timerState.startedAt =
        Date.now();

      timerState.lastSavedDate =
        currentDate;

      updateTimerDisplay();

      showNotification(
        `🌙 ${previousDate}分を自動保存しました。`
      );

    } catch (error) {
      console.error(
        "Midnight timer save error:",
        error
      );
    }
  } else {
    /*
      1分未満なら記録せず、
      新しい日のタイマーとして継続。
    */

    timerState.accumulatedSeconds =
      0;

    timerState.startedAt =
      Date.now();

    timerState.lastSavedDate =
      currentDate;

    updateTimerDisplay();
  }
}

function getPreviousJapanDate(
  japanDate
) {
  const [year, month, day] =
    japanDate
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day - 1
      )
    );

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getUTCDate()
    ).padStart(2, "0")
  ].join("-");
}

async function handleTimerTick() {
  updateTimerDisplay();

  updateTimerButtons();

  if (
    timerState.running
  ) {
    await handleTimerDateChange();
  }
}


// ============================================================
// Timer save
// ============================================================

async function saveTimerMinutes() {
  if (!currentUser) {
    showNotification(
      "ログインしてください。"
    );

    return;
  }

  const seconds =
    getTimerElapsedSeconds();

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 1) {
    showNotification(
      "1分以上勉強してから保存してください。"
    );

    return;
  }

  const subject =
    getElement(
      "study-subject"
    )?.value;

  if (!subject) {
    showNotification(
      "タイマー記録には科目を選択してください。"
    );

    return;
  }

  pauseTimer();

  try {
    await recordStudy(
      subject,
      minutes,
      "",
      "timer"
    );

    timerState =
      {
        running: false,
        startedAt: null,
        accumulatedSeconds: 0,
        lastTickAt: null,
        lastSavedDate: null
      };

    updateTimerDisplay();
    updateTimerButtons();

  } catch (error) {
    console.error(
      "Timer save error:",
      error
    );

    showNotification(
      error.message ||
      "タイマー記録に失敗しました。"
    );
  }
}


// ============================================================
// Timer initialization
// ============================================================

function initializeTimer() {
  const startButton =
    getElement(
      "study-timer-start"
    );

  const pauseButton =
    getElement(
      "study-timer-pause"
    );

  const resetButton =
    getElement(
      "study-timer-reset"
    );

  const saveButton =
    getElement(
      "timer-save-button"
    );

  if (startButton) {
    startButton.addEventListener(
      "click",
      startTimer
    );
  }

  if (pauseButton) {
    pauseButton.addEventListener(
      "click",
      pauseTimer
    );
  }

  if (resetButton) {
    resetButton.addEventListener(
      "click",
      resetTimer
    );
  }

  if (saveButton) {
    saveButton.addEventListener(
      "click",
      saveTimerMinutes
    );
  }

  updateTimerDisplay();
  updateTimerButtons();
}


// ============================================================
// Navigation
// ============================================================

function showAppScreen(screenId) {
  if (!currentUser) {
    return;
  }

  document
    .querySelectorAll(".app-screen")
    .forEach(screen => {
      screen.classList.add(
        "hidden"
      );

      screen.style.display =
        "none";
    });

  const target =
    getElement(screenId);

  if (!target) {
    return;
  }

  target.classList.remove(
    "hidden"
  );

  target.style.display =
    "";

  document
    .querySelectorAll(
      "[data-screen]"
    )
    .forEach(button => {
      button.classList.remove(
        "active"
      );
    });

  const activeButton =
    document.querySelector(
      `[data-screen="${screenId}"]`
    );

  if (activeButton) {
    activeButton.classList.add(
      "active"
    );
  }

  if (
    screenId ===
    "study-screen"
  ) {
    populateStudySubjectSelect();
    updateSubjectLevelUI();
    updateTimerDisplay();
    updateTimerButtons();
    loadStudyHistory();
  }

  if (
    screenId ===
    "home-screen"
  ) {
    applyPlayerData();
  }
}

function initializeNavigation() {
  document
    .querySelectorAll(
      "[data-screen]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const target =
            button.dataset.screen;

          if (!target) {
            return;
          }

          showAppScreen(
            target
          );
        }
      );
    });
}


// ============================================================
// Quest placeholders
// ============================================================

function initializeQuestTabs() {
  document
    .querySelectorAll(
      "[data-quest-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const target =
            button.dataset.questTab;

          document
            .querySelectorAll(
              "[data-quest-tab]"
            )
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          button.classList.add(
            "active"
          );

          document
            .querySelectorAll(
              "[id$='-quest-tab'], [id$='-tab']"
            )
            .forEach(tab => {
              if (
                tab.id ===
                `${target}-quest-tab`
              ) {
                tab.classList.remove(
                  "hidden"
                );

                tab.style.display =
                  "";
              }
            });
        }
      );
    });
}


// ============================================================
// Party / Rank / Other tabs
// ============================================================

function initializeGenericTabs() {
  document
    .querySelectorAll(
      "[data-party-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              "[data-party-tab]"
            )
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          button.classList.add(
            "active"
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-rank-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              "[data-rank-tab]"
            )
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          button.classList.add(
            "active"
          );
        }
      );
    });

  document
    .querySelectorAll(
      "[data-other-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              "[data-other-tab]"
            )
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          button.classList.add(
            "active"
          );
        }
      );
    });
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

      const errorEl =
        getElement(
          "login-error"
        );

      if (errorEl) {
        errorEl.textContent =
          "";
      }

      if (!userId || !password) {
        if (errorEl) {
          errorEl.textContent =
            "ユーザーIDとパスワードを入力してください。";
        }

        return;
      }

      try {
        await signInWithEmailAndPassword(
          auth,
          userIdToEmail(userId),
          password
        );

      } catch (error) {
        console.error(
          "Login error:",
          error
        );

        if (errorEl) {
          errorEl.textContent =
            firebaseErrorMessage(
              error
            );
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

      const errorEl =
        getElement(
          "register-error"
        );

      const subjectError =
        getElement(
          "subject-error"
        );

      if (errorEl) {
        errorEl.textContent =
          "";
      }

      if (subjectError) {
        subjectError.textContent =
          "";
      }

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

      const confirmPassword =
        getElement(
          "register-password-confirm"
        )?.value || "";

      const displayName =
        getElement(
          "register-display-name"
        )?.value.trim()
        || userId;

      const course =
        document.querySelector(
          'input[name="course"]:checked'
        )?.value
        || "undecided";

      const subjects =
        Array.from(
          document.querySelectorAll(
            'input[name="subjects"]:checked'
          )
        ).map(
          checkbox =>
            checkbox.value
        );

      if (!userId) {
        if (errorEl) {
          errorEl.textContent =
            "ユーザーIDを入力してください。";
        }

        return;
      }

      if (
        !password ||
        password.length < 6
      ) {
        if (errorEl) {
          errorEl.textContent =
            "パスワードは6文字以上にしてください。";
        }

        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        if (errorEl) {
          errorEl.textContent =
            "パスワードが一致していません。";
        }

        return;
      }

      if (
        subjects.length === 0
      ) {
        if (subjectError) {
          subjectError.textContent =
            "少なくとも1科目選択してください。";
        }

        return;
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

        showNotification(
          "🎉 登録完了！"
        );

      } catch (error) {
        console.error(
          "Registration error:",
          error
        );

        if (errorEl) {
          errorEl.textContent =
            firebaseErrorMessage(
              error
            );
        }
      }
    }
  );
}


// ============================================================
// Login / register screen buttons
// ============================================================

function initializeAuthNavigation() {
  const registerButton =
    getElement(
      "show-register-button"
    );

  const loginButton =
    getElement(
      "show-login-button"
    );

  if (registerButton) {
    registerButton.addEventListener(
      "click",
      showRegisterScreen
    );
  }

  if (loginButton) {
    loginButton.addEventListener(
      "click",
      showLoginScreen
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
        pauseTimer();

        await signOut(auth);

      } catch (error) {
        console.error(
          "Logout error:",
          error
        );

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
// Display name settings
// ============================================================

function initializeDisplayNameForm() {
  const form =
    getElement(
      "display-name-form"
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (
        !currentPlayer ||
        !currentUser
      ) {
        return;
      }

      const input =
        getElement(
          "settings-display-name"
        );

      const errorEl =
        getElement(
          "display-name-error"
        );

      const value =
        input?.value.trim()
        || "";

      if (!value) {
        if (errorEl) {
          errorEl.textContent =
            "表示名を入力してください。";
        }

        return;
      }

      try {
        currentPlayer.displayName =
          value;

        await savePlayer();

        applyPlayerData();

        if (errorEl) {
          errorEl.textContent =
            "";
        }

        showNotification(
          "表示名を更新しました。"
        );

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            firebaseErrorMessage(
              error
            );
        }
      }
    }
  );
}


// ============================================================
// Subject settings
// ============================================================

function initializeSubjectSettings() {
  const form =
    getElement(
      "subject-settings-form"
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (!currentPlayer) {
        return;
      }

      const errorEl =
        getElement(
          "settings-subject-error"
        );

      const subjects =
        Array.from(
          document.querySelectorAll(
            'input[name="settings-subjects"]:checked'
          )
        ).map(
          checkbox =>
            checkbox.value
        );

      if (
        subjects.length === 0
      ) {
        if (errorEl) {
          errorEl.textContent =
            "少なくとも1科目選択してください。";
        }

        return;
      }

      try {
        currentPlayer.subjects =
          subjects;

        await savePlayer();

        applyPlayerData();

        if (errorEl) {
          errorEl.textContent =
            "";
        }

        showNotification(
          "科目設定を更新しました。"
        );

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            firebaseErrorMessage(
              error
            );
        }
      }
    }
  );
}


// ============================================================
// Password settings
// ============================================================

function initializePasswordForm() {
  const form =
    getElement(
      "password-form"
    );

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const input =
        getElement(
          "settings-new-password"
        );

      const errorEl =
        getElement(
          "password-error"
        );

      const password =
        input?.value || "";

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
        await updatePassword(
          currentUser,
          password
        );

        if (input) {
          input.value = "";
        }

        if (errorEl) {
          errorEl.textContent =
            "";
        }

        showNotification(
          "パスワードを変更しました。"
        );

      } catch (error) {
        console.error(
          error
        );

        if (errorEl) {
          errorEl.textContent =
            firebaseErrorMessage(
              error
            );
        }
      }
    }
  );
}


// ============================================================
// Auth observer
// ============================================================

function initializeAuthObserver() {
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
      console.log(
        "Auth state:",
        user
          ? user.uid
          : "signed out"
      );

      currentUser =
        user;

      if (!user) {
        currentPlayer =
          null;

        resetTimer();

        showLoginScreen();

        return;
      }

      try {
        let player =
          await loadPlayer(
            user
          );

        if (!player) {
          /*
            既存Firebaseユーザーだが
            Firestoreプレイヤーデータが
            無い場合の救済。
          */

          const fallbackUserId =
            (
              user.email || ""
            )
              .split("@")[0];

          player =
            await createPlayer(
              user,
              {
                userId:
                  fallbackUserId
              }
            );
        }

        currentPlayer =
          player;

        applyPlayerData();

        showMainScreen();

        /*
          画面表示後にもう一度
          UIを同期。
        */

        applyPlayerData();

      } catch (error) {
        console.error(
          "Auth player load error:",
          error
        );

        alert(
          "プレイヤーデータの読み込みに失敗しました。\n\n" +
          firebaseErrorMessage(
            error
          )
        );
      }
    }
  );
}


// ============================================================
// Initial UI
// ============================================================

function initializeUI() {
  initializeLoginForm();
  initializeRegisterForm();
  initializeAuthNavigation();

  initializeLogout();

  initializeNavigation();

  initializeStudyForm();
  initializeTimer();

  initializeQuestTabs();
  initializeGenericTabs();

  initializeDisplayNameForm();
  initializeSubjectSettings();
  initializePasswordForm();

  const closeButton =
    getElement(
      "level-up-close-button"
    );

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      closeLevelUpModal
    );
  }

  showLoginScreen();
}


// ============================================================
// Boot
// ============================================================

function boot() {
  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );

    return;
  }

  console.log(
    "受験RPG Phase 3 booting..."
  );

  if (
    !initializeFirebase()
  ) {
    return;
  }

  initializeUI();

  initializeAuthObserver();

  console.log(
    "受験RPG Phase 3 ready!"
  );
}

boot();
