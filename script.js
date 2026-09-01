// ============================================================
// 受験RPG - script.js
// PHASE 2 FIXED
// Firebase Auth
// Firestore (/users/{uid})
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
  onAuthStateChanged,
  updatePassword
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

let studyRecordBusy = false;


// ============================================================
// Timer
// ============================================================

let timerInterval = null;

let timerState = {
  running: false,
  startedAt: null,
  accumulatedSeconds: 0,
  lastJapanDate: null
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
// Date / time
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
// Firebase error
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
  const hours =
    Math.floor(
      Number(seasonStudyMinutes || 0) / 60
    );

  if (hours >= 170) {
    return "Legend";
  }

  if (hours >= 135) {
    return "Grandmaster";
  }

  if (hours >= 100) {
    return "Master";
  }

  if (hours >= 70) {
    return "Diamond";
  }

  if (hours >= 45) {
    return "Platinum";
  }

  if (hours >= 25) {
    return "Gold";
  }

  if (hours >= 10) {
    return "Silver";
  }

  return "Bronze";
}


// ============================================================
// Default player
// ============================================================

function createDefaultPlayerData(userId = "") {
  return {
    uid: "",
    userId: userId,

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

    rank: "Bronze",

    title: "見習い受験生",

    createdAt: null,
    updatedAt: null
  };
}


// ============================================================
// Daily reset
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

  return player;
}


// ============================================================
// Firestore
// IMPORTANT:
// users/{uid}
// ============================================================

async function loadPlayer(user) {
  if (!user || !db) {
    return null;
  }

  const playerRef =
    doc(
      db,
      "users",
      user.uid
    );

  const snapshot =
    await getDoc(playerRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data =
    snapshot.data();

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

  player.level =
    calculateLevel(player.xp || 0);

  player.rank =
    calculateRank(
      player.seasonStudyMinutes || 0
    );

  return player;
}


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
    createDefaultPlayerData(
      userId
    );

  const playerData = {
    ...defaultData,
    ...additionalData,

    uid: user.uid,

    userId,

    email:
      user.email || "",

    level: 1,

    rank: "Bronze",

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp()
  };

  const playerRef =
    doc(
      db,
      "users",
      user.uid
    );

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

  currentPlayer.rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes || 0
    );

  const playerRef =
    doc(
      db,
      "users",
      currentUser.uid
    );

  await updateDoc(
    playerRef,
    {
      ...currentPlayer,
      uid: currentUser.uid,
      updatedAt:
        serverTimestamp()
    }
  );
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

  const screens =
    document.querySelectorAll(
      ".app-screen"
    );

  screens.forEach(
    screen => {
      screen.classList.add("hidden");
      screen.style.display = "none";
    }
  );

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
// App navigation
// ============================================================

function activateBottomNav(
  screenId
) {
  document
    .querySelectorAll(
      "[data-screen]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.screen ===
          screenId
      );
    });
}

function showAppScreen(
  screenId
) {
  if (
    !currentUser ||
    !currentPlayer
  ) {
    return;
  }

  document
    .querySelectorAll(
      ".app-screen"
    )
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

  const progress =
    getLevelProgress(
      currentPlayer.xp || 0
    );

  const level =
    progress.level;

  const rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes || 0
    );

  currentPlayer.level =
    level;

  currentPlayer.rank =
    rank;


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
      currentPlayer.seasonStudyMinutes || 0
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


// ============================================================
// Subject UI
// ============================================================

function getSubjectName(subject) {
  return (
    SUBJECT_NAMES[subject] ||
    subject ||
    "その他"
  );
}

function populateStudySubjectSelect() {
  const select =
    getElement(
      "study-subject"
    );

  if (!select || !currentPlayer) {
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

  if (levelList) {
    levelList.innerHTML = "";

    const subjects =
      Array.isArray(
        currentPlayer.subjects
      )
        ? currentPlayer.subjects
        : [];

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

          const item =
            document.createElement(
              "div"
            );

          item.className =
            "subject-level-item";

          item.innerHTML = `
            <div>
              <strong>
                ${getSubjectName(subject)}
              </strong>
              <span>
                Lv.${level}
              </span>
            </div>
            <div>
              ${formatMinutes(minutes)}
            </div>
          `;

          levelList.appendChild(
            item
          );
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

    const subjects =
      Array.isArray(
        currentPlayer.subjects
      )
        ? currentPlayer.subjects
        : [];

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
            ${getSubjectName(subject)}
          </span>
          <strong>
            ${formatMinutes(minutes)}
          </strong>
        `;

        studyList.appendChild(
          item
        );
      }
    );
  }
}


// ============================================================
// Study recording
// ============================================================

async function recordStudy(
  subject,
  minutes,
  note = "",
  source = "manual"
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

  const oldLevel =
    calculateLevel(
      currentPlayer.xp || 0
    );

  const gainedXp =
    safeMinutes;

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

  currentPlayer.todayStudyMinutes =
    Number(
      currentPlayer.todayStudyMinutes || 0
    ) + safeMinutes;

  currentPlayer.todayXp =
    Number(
      currentPlayer.todayXp || 0
    ) + gainedXp;

  currentPlayer.coins =
    Number(
      currentPlayer.coins || 0
    ) + gainedCoins;

  currentPlayer.todayCoins =
    Number(
      currentPlayer.todayCoins || 0
    ) + gainedCoins;

  currentPlayer.seasonStudyMinutes =
    Number(
      currentPlayer.seasonStudyMinutes || 0
    ) + safeMinutes;

  // Subject

  currentPlayer.subjectLevels =
    currentPlayer.subjectLevels || {};

  currentPlayer.subjectStudyMinutes =
    currentPlayer.subjectStudyMinutes || {};

  const oldSubjectMinutes =
    Number(
      currentPlayer
        .subjectStudyMinutes[
          subject
        ] || 0
    );

  const newSubjectMinutes =
    oldSubjectMinutes +
    safeMinutes;

  currentPlayer
    .subjectStudyMinutes[
      subject
    ] =
      newSubjectMinutes;

  currentPlayer.subjectLevels[
    subject
  ] =
    Math.min(
      100,
      Math.floor(
        newSubjectMinutes / 30
      )
    );

  currentPlayer.level =
    calculateLevel(
      currentPlayer.xp
    );

  currentPlayer.rank =
    calculateRank(
      currentPlayer.seasonStudyMinutes
    );


  // Firestore player

  await savePlayer();


  // Firestore study record

  const recordsRef =
    collection(
      db,
      "users",
      currentUser.uid,
      "studyRecords"
    );

  await addDoc(
    recordsRef,
    {
      userId:
        currentUser.uid,

      subject,

      minutes:
        safeMinutes,

      note:
        String(note || "").trim(),

      source,

      date:
        getJapanDateString(),

      xp:
        gainedXp,

      coins:
        gainedCoins,

      createdAt:
        serverTimestamp()
    }
  );


  updatePlayerUI();
  updateStudyUI();

  await loadStudyHistory();


  // Level up

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

  showNotification(
    `📚 ${getSubjectName(subject)} +${safeMinutes}分 / +${gainedXp} XP / +${gainedCoins}🪙`
  );

  return {
    minutes: safeMinutes,
    xp: gainedXp,
    coins: gainedCoins
  };
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

      if (studyRecordBusy) {
        return;
      }

      clearError(
        "study-error"
      );

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
        await recordStudy(
          subject,
          minutes,
          note,
          "manual"
        );

        form.reset();
      } catch (error) {
        console.error(error);

        showError(
          "study-error",
          firebaseErrorMessage(
            error
          )
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
// Study history
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
        limit(50)
      );

    const snapshot =
      await getDocs(q);

    list.innerHTML = "";

    if (
      snapshot.empty
    ) {
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
              ${getSubjectName(data.subject)}
            </strong>
            <span>
              ${Number(data.minutes || 0)}分
            </span>
          </div>

          <div>
            +${Number(data.xp || 0)} XP
            /
            +${Number(data.coins || 0)}🪙
          </div>

          <small>
            ${data.date || ""}
            ${data.note ? ` / ${escapeHtml(data.note)}` : ""}
          </small>
        `;

        list.appendChild(
          item
        );
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
// HTML escape
// ============================================================

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// Study UI
// ============================================================

function updateStudyUI() {
  if (!currentPlayer) {
    return;
  }

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
    seconds +=
      Math.max(
        0,
        (Date.now() -
          timerState.startedAt) /
          1000
      );
  }

  return Math.floor(
    seconds
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
    Math.floor(
      value / 3600
    );

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
        String(n)
          .padStart(2, "0")
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

function startTimer() {
  if (
    timerState.running
  ) {
    return;
  }

  timerState.running =
    true;

  timerState.startedAt =
    Date.now();

  timerState.lastJapanDate =
    getJapanDateString();

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

function pauseTimer() {
  if (
    !timerState.running
  ) {
    return;
  }

  const elapsed =
    Math.floor(
      (Date.now() -
        timerState.startedAt) /
        1000
    );

  timerState.accumulatedSeconds +=
    Math.max(
      0,
      elapsed
    );

  timerState.running =
    false;

  timerState.startedAt =
    null;

  clearInterval(
    timerInterval
  );

  timerInterval =
    null;

  updateTimerDisplay();

  showNotification(
    "⏸️ タイマー一時停止"
  );
}

function resetTimer() {
  timerState.running =
    false;

  timerState.startedAt =
    null;

  timerState.accumulatedSeconds =
    0;

  timerState.lastJapanDate =
    getJapanDateString();

  clearInterval(
    timerInterval
  );

  timerInterval =
    null;

  updateTimerDisplay();

  showNotification(
    "🔄 タイマーをリセットしました。"
  );
}

async function saveTimerStudy() {
  if (studyRecordBusy) {
    return;
  }

  const seconds =
    getTimerSeconds();

  const minutes =
    Math.floor(
      seconds / 60
    );

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
    pauseTimer();

    await recordStudy(
      subject,
      minutes,
      "タイマー記録",
      "timer"
    );

    resetTimer();
  } catch (error) {
    console.error(error);

    showNotification(
      firebaseErrorMessage(
        error
      )
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

function handleTimerTick() {
  const today =
    getJapanDateString();

  // 日本時間の日付が変わったら
  // それまでの時間を自動保存
  if (
    timerState.running &&
    timerState.lastJapanDate &&
    today !==
      timerState.lastJapanDate
  ) {
    handleMidnightTimer();
    return;
  }

  timerState.lastJapanDate =
    today;

  updateTimerDisplay();
}

async function handleMidnightTimer() {
  if (
    !timerState.running
  ) {
    return;
  }

  const seconds =
    getTimerSeconds();

  const minutes =
    Math.floor(
      seconds / 60
    );

  // 日付変更前の時間を
  // 現在選択中の教科で保存
  if (
    minutes >= 1 &&
    !studyRecordBusy
  ) {
    const subject =
      getElement(
        "study-subject"
      )?.value;

    if (subject) {
      studyRecordBusy =
        true;

      try {
        pauseTimer();

        await recordStudy(
          subject,
          minutes,
          "日付変更による自動記録",
          "timer-midnight"
        );

        resetTimer();

        // 新しい日のタイマーを自動再開
        startTimer();
      } catch (error) {
        console.error(
          "Midnight timer save error:",
          error
        );
      } finally {
        studyRecordBusy =
          false;
      }
    }
  }

  timerState.lastJapanDate =
    getJapanDateString();
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
// Quest tabs
// ============================================================

function initializeQuestTabs() {
  const buttons =
    document.querySelectorAll(
      "[data-quest-tab]"
    );

  buttons.forEach(
    button => {
      if (
        button.dataset.questInitialized
      ) {
        return;
      }

      button.dataset.questInitialized =
        "true";

      button.addEventListener(
        "click",
        () => {
          const tab =
            button.dataset.questTab;

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
            .forEach(content => {
              content.classList.add(
                "hidden"
              );

              content.style.display =
                "none";
            });

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
        }
      );
    }
  );
}


// ============================================================
// Rank UI
// ============================================================

function updateRankUI() {
  if (!currentPlayer) {
    return;
  }

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
}


// ============================================================
// Notification
// ============================================================

function showNotification(
  message
) {
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
// Level up modal
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
        button.disabled =
          true;

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
          firebaseErrorMessage(
            error
          )
        );
      } finally {
        if (button) {
          button.disabled =
            false;

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
          input =>
            input.value
        );

      // User ID

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

      // Password

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
        button.disabled =
          true;

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
          firebaseErrorMessage(
            error
          )
        );
      } finally {
        if (button) {
          button.disabled =
            false;

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
          console.error(
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
        resetTimer();

        await signOut(
          auth
        );

        currentUser =
          null;

        currentPlayer =
          null;

        showLoginScreen();

        showNotification(
          "ログアウトしました。"
        );
      } catch (error) {
        console.error(
          error
        );

        alert(
          firebaseErrorMessage(
            error
          )
        );
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
        "Auth state changed:",
        user
      );

      if (!user) {
        currentUser =
          null;

        currentPlayer =
          null;

        showLoginScreen();

        return;
      }

      currentUser =
        user;

      try {
        let player =
          await loadPlayer(
            user
          );

        // 既存Authユーザーに
        // Firestoreプロフィールがない場合
        // 自動で /users/{uid} を作る
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

        await savePlayer();

        updatePlayerUI();

        populateStudySubjectSelect();

        showMainScreen();

        console.log(
          "Player loaded successfully:",
          currentPlayer
        );
      } catch (error) {
        console.error(
          "Player loading error:",
          error
        );

        currentPlayer =
          null;

        // Auth自体は成功しているので
        // Firestoreエラーを明確に表示
        showLoginScreen();

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


// ============================================================
// Bottom navigation
// ============================================================

function initializeBottomNavigation() {
  document
    .querySelectorAll(
      "[data-screen]"
    )
    .forEach(button => {
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
            button.dataset.screen;

          if (!screenId) {
            return;
          }

          showAppScreen(
            screenId
          );
        }
      );
    });
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
    "受験RPG booting..."
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
    boot
  );
} else {
  boot();
}
