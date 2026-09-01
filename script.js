// ============================================================
// 受験RPG - Firebase / Main JavaScript
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAnalytics
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

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
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// CONSTANTS
// ============================================================

const INTERNAL_EMAIL_DOMAIN = "@juken-rpg.local";

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

const COURSE_NAMES = {
  science: "理系",
  humanities: "文系",
  undecided: "未定"
};


// ============================================================
// RANK SYSTEM
// 月間勉強時間
// ============================================================

const RANKS = [
  {
    name: "Bronze",
    minHours: 0
  },
  {
    name: "Silver",
    minHours: 10
  },
  {
    name: "Gold",
    minHours: 20
  },
  {
    name: "Platinum",
    minHours: 35
  },
  {
    name: "Diamond",
    minHours: 50
  },
  {
    name: "Master",
    minHours: 70
  },
  {
    name: "Grandmaster",
    minHours: 100
  },
  {
    name: "Legend",
    minHours: 150
  }
];


// ============================================================
// GLOBAL STATE
// ============================================================

let currentUser = null;
let currentPlayer = null;

let studyTimerInterval = null;
let studyTimerSeconds = 0;
let studyTimerRunning = false;

let currentScreen = "home-screen";
let currentQuestTab = "daily";
let currentPartyTab = "party";
let currentRankTab = "rank";
let currentOtherTab = "menu";


// ============================================================
// DOM HELPER
// ============================================================

function $(id) {
  return document.getElementById(id);
}

function show(element) {
  if (!element) return;
  element.classList.remove("hidden");
}

function hide(element) {
  if (!element) return;
  element.classList.add("hidden");
}

function setText(id, text) {
  const element = $(id);
  if (element) {
    element.textContent = text;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// NOTIFICATION
// ============================================================

function notify(message, type = "normal") {

  const element = $("notification");

  if (!element) return;

  element.textContent = message;
  element.className = "";

  element.dataset.type = type;

  setTimeout(() => {
    element.classList.add("hidden");
  }, 3500);
}


// ============================================================
// ERROR HANDLER
// ============================================================

function firebaseErrorMessage(error) {

  const code = error?.code || "";

  const messages = {

    "auth/invalid-credential":
      "ユーザーIDまたはパスワードが違います。",

    "auth/invalid-login-credentials":
      "ユーザーIDまたはパスワードが違います。",

    "auth/email-already-in-use":
      "そのユーザーIDはすでに使用されています。",

    "auth/weak-password":
      "パスワードが弱すぎます。6文字以上にしてください。",

    "auth/user-not-found":
      "そのユーザーIDは存在しません。",

    "auth/wrong-password":
      "パスワードが違います。",

    "auth/too-many-requests":
      "試行回数が多すぎます。少し時間を置いてください。",

    "auth/requires-recent-login":
      "安全のため、もう一度ログインしてから実行してください。",

    "permission-denied":
      "Firestoreの権限がありません。Rulesを確認してください。"
  };

  return messages[code] || error?.message || "エラーが発生しました。";
}


// ============================================================
// USER ID → INTERNAL EMAIL
// ============================================================

function normalizeUserId(userId) {

  return userId
    .trim()
    .toLowerCase();
}

function userIdToEmail(userId) {

  return `${normalizeUserId(userId)}${INTERNAL_EMAIL_DOMAIN}`;
}


// ============================================================
// VALIDATION
// ============================================================

function validateUserId(userId) {

  return /^[A-Za-z0-9_-]{3,30}$/.test(userId);
}

function validateDisplayName(name) {

  const trimmed = name.trim();

  return trimmed.length >= 1 && trimmed.length <= 30;
}


// ============================================================
// AUTH SCREEN
// ============================================================

function showLoginScreen() {

  show($("login-screen"));
  hide($("register-screen"));

  setText("login-error", "");
  setText("register-error", "");
}

function showRegisterScreen() {

  hide($("login-screen"));
  show($("register-screen"));

  setText("login-error", "");
  setText("register-error", "");
}


// ============================================================
// REGISTER
// ============================================================

async function handleRegister(event) {

  event.preventDefault();

  const userIdInput = $("register-user-id");
  const passwordInput = $("register-password");
  const confirmInput = $("register-password-confirm");
  const displayNameInput = $("register-display-name");

  const errorElement = $("register-error");
  const subjectError = $("subject-error");

  errorElement.textContent = "";
  subjectError.textContent = "";

  const userId = normalizeUserId(userIdInput.value);
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;
  const displayName = displayNameInput.value.trim();

  const courseElement = document.querySelector(
    'input[name="course"]:checked'
  );

  const course = courseElement?.value || "";

  const subjects = [
    ...document.querySelectorAll(
      'input[name="subjects"]:checked'
    )
  ].map(input => input.value);


  if (!validateUserId(userId)) {

    errorElement.textContent =
      "ユーザーIDは3〜30文字の英数字・_・-のみ使用できます。";

    return;
  }

  if (password.length < 6) {

    errorElement.textContent =
      "パスワードは6文字以上にしてください。";

    return;
  }

  if (password !== confirmPassword) {

    errorElement.textContent =
      "パスワード確認が一致していません。";

    return;
  }

  if (!validateDisplayName(displayName)) {

    errorElement.textContent =
      "表示名を入力してください。";

    return;
  }

  if (!course) {

    errorElement.textContent =
      "文理を選択してください。";

    return;
  }

  if (subjects.length === 0) {

    subjectError.textContent =
      "少なくとも1つ教科を選択してください。";

    return;
  }


  const button = $("register-button");

  button.disabled = true;
  button.textContent = "登録中...";


  try {

    const email = userIdToEmail(userId);

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const uid = credential.user.uid;


    // --------------------------------------------------------
    // PLAYER PROFILE
    // --------------------------------------------------------

    const playerData = {

      uid,

      userId,

      displayName,

      course,

      subjects,

      level: 1,

      xp: 0,

      stars: 0,

      coins: 0,

      title: "無名の冒険者",

      totalStudyMinutes: 0,

      totalXp: 0,

      totalCoins: 0,

      bossesDefeated: 0,

      questsCompleted: 0,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp()
    };


    await setDoc(
      doc(db, "users", uid),
      playerData
    );


    // --------------------------------------------------------
    // SUBJECT DATA
    // --------------------------------------------------------

    for (const subjectId of subjects) {

      await setDoc(
        doc(
          db,
          "users",
          uid,
          "subjects",
          subjectId
        ),
        {

          subjectId,

          name: SUBJECTS[subjectId] || subjectId,

          studyMinutes: 0,

          xp: 0,

          level: 1,

          createdAt: serverTimestamp(),

          updatedAt: serverTimestamp()
        }
      );
    }


    // --------------------------------------------------------
    // INITIAL SEASON
    // --------------------------------------------------------

    const seasonId = getSeasonId();

    await setDoc(
      doc(
        db,
        "users",
        uid,
        "seasonStats",
        seasonId
      ),
      {

        seasonId,

        studyMinutes: 0,

        rank: "Bronze",

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp()
      }
    );


    notify(
      "🎉 冒険者登録完了！",
      "success"
    );

  } catch (error) {

    console.error(error);

    errorElement.textContent =
      firebaseErrorMessage(error);

  } finally {

    button.disabled = false;
    button.textContent = "冒険を始める";
  }
}


// ============================================================
// LOGIN
// ============================================================

async function handleLogin(event) {

  event.preventDefault();

  const userId =
    normalizeUserId(
      $("login-user-id").value
    );

  const password =
    $("login-password").value;

  const errorElement =
    $("login-error");

  errorElement.textContent = "";


  if (!validateUserId(userId)) {

    errorElement.textContent =
      "ユーザーIDの形式が正しくありません。";

    return;
  }


  const button =
    $("login-button");

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

    errorElement.textContent =
      firebaseErrorMessage(error);

  } finally {

    button.disabled = false;
    button.textContent = "ログイン";
  }
}


// ============================================================
// LOGOUT
// ============================================================

async function handleLogout() {

  try {

    stopStudyTimer();

    await signOut(auth);

    notify("ログアウトしました。");

  } catch (error) {

    console.error(error);

    notify(
      firebaseErrorMessage(error),
      "error"
    );
  }
}


// ============================================================
// LOAD PLAYER
// ============================================================

async function loadPlayer() {

  if (!currentUser) return;

  const ref =
    doc(db, "users", currentUser.uid);

  const snapshot =
    await getDoc(ref);

  if (!snapshot.exists()) {

    console.error(
      "Player document does not exist."
    );

    await signOut(auth);

    return;
  }

  currentPlayer = {
    id: snapshot.id,
    ...snapshot.data()
  };


  await ensureSeason();

  renderPlayer();

  await Promise.all([
    loadSubjects(),
    loadTodaySummary(),
    loadQuests(),
    loadSeason(),
    loadStudyHistory(),
    loadSubjectSummary(),
    loadSubjectLevels(),
    loadAchievements(),
    loadShop(),
    loadInventory(),
    loadProfile(),
    loadBoss()
  ]);
}


// ============================================================
// PLAYER RENDER
// ============================================================

function renderPlayer() {

  if (!currentPlayer) return;

  const level =
    Number(currentPlayer.level || 1);

  const xp =
    Number(currentPlayer.xp || 0);

  const coins =
    Number(currentPlayer.coins || 0);

  const stars =
    Number(currentPlayer.stars || 0);

  const rank =
    getRankFromMinutes(
      Number(currentPlayer.seasonStudyMinutes || 0)
    );


  setText(
    "header-display-name",
    currentPlayer.displayName || "冒険者"
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
    `🪙 ${coins}`
  );


  setText(
    "home-level",
    level
  );

  setText(
    "home-xp",
    `${xp} XP`
  );

  setText(
    "star-count",
    `⭐ ${stars}`
  );

  setText(
    "star-title",
    currentPlayer.title || "無名の冒険者"
  );


  updateLevelProgress();

  renderProfileBasic();
}


// ============================================================
// LEVEL SYSTEM
// ============================================================

function xpRequiredForLevel(level) {

  if (level < 1) {
    return 100;
  }

  if (level >= 100) {
    return Infinity;
  }

  const range =
    Math.floor((level - 1) / 10);

  return 100 + range * 50;
}


function calculateLevelFromXP(totalXP) {

  let level = 1;
  let remainingXP = Math.max(
    0,
    Number(totalXP || 0)
  );


  while (level < 100) {

    const required =
      xpRequiredForLevel(level);

    if (remainingXP < required) {
      break;
    }

    remainingXP -= required;
    level++;
  }

  return level;
}


function getXPIntoLevel(totalXP) {

  let level = 1;
  let remainingXP = Math.max(
    0,
    Number(totalXP || 0)
  );


  while (level < 100) {

    const required =
      xpRequiredForLevel(level);

    if (remainingXP < required) {

      return {
        level,
        current: remainingXP,
        required
      };
    }

    remainingXP -= required;
    level++;
  }


  return {
    level: 100,
    current: 0,
    required: 0
  };
}


function updateLevelProgress() {

  if (!currentPlayer) return;

  const totalXP =
    Number(currentPlayer.xp || 0);

  const result =
    getXPIntoLevel(totalXP);


  setText(
    "home-level",
    result.level
  );

  setText(
    "home-xp",
    `${totalXP} XP`
  );


  if (result.level >= 100) {

    setText(
      "home-xp-required",
      "MAX LEVEL"
    );

  } else {

    const remaining =
      result.required - result.current;

    setText(
      "home-xp-required",
      `次のレベルまで ${remaining} XP`
    );
  }


  const progress =
    result.required > 0
      ? (result.current / result.required) * 100
      : 100;


  const bar =
    $("level-progress");

  if (bar) {

    bar.style.width =
      `${Math.min(100, progress)}%`;
  }
}


// ============================================================
// ADD XP
// ============================================================

async function addXP(amount) {

  if (!currentUser || amount <= 0) return;

  const oldLevel =
    Number(currentPlayer.level || 1);

  const oldXP =
    Number(currentPlayer.xp || 0);

  const newXP =
    oldXP + amount;

  const newLevel =
    calculateLevelFromXP(newXP);


  await updateDoc(
    doc(db, "users", currentUser.uid),
    {

      xp: increment(amount),

      totalXp: increment(amount),

      level: newLevel,

      updatedAt: serverTimestamp()
    }
  );


  currentPlayer.xp = newXP;
  currentPlayer.totalXp =
    Number(currentPlayer.totalXp || 0) + amount;

  currentPlayer.level = newLevel;


  renderPlayer();


  if (newLevel > oldLevel) {

    showLevelUpModal(
      oldLevel,
      newLevel
    );
  }
}


// ============================================================
// LEVEL UP MODAL
// ============================================================

function showLevelUpModal(
  oldLevel,
  newLevel
) {

  setText(
    "level-up-old-level",
    oldLevel
  );

  setText(
    "level-up-new-level",
    newLevel
  );

  show($("level-up-modal"));
}


// ============================================================
// REWARD MODAL
// ============================================================

function showRewardModal(content) {

  const target =
    $("reward-modal-content");

  if (target) {
    target.innerHTML = content;
  }

  show($("reward-modal"));
}


// ============================================================
// COINS
// ============================================================

async function addCoins(amount) {

  if (!currentUser || amount <= 0) return;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {

      coins: increment(amount),

      totalCoins: increment(amount),

      updatedAt: serverTimestamp()
    }
  );


  currentPlayer.coins =
    Number(currentPlayer.coins || 0) + amount;

  currentPlayer.totalCoins =
    Number(currentPlayer.totalCoins || 0) + amount;

  renderPlayer();
}


// ============================================================
// STARS
// ============================================================

async function addStars(amount) {

  if (!currentUser || amount <= 0) return;

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {

      stars: increment(amount),

      updatedAt: serverTimestamp()
    }
  );


  currentPlayer.stars =
    Number(currentPlayer.stars || 0) + amount;

  renderPlayer();
}


// ============================================================
// SEASON
// ============================================================

function getSeasonId(date = new Date()) {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  return `${year}-${month}`;
}


function getSeasonEnd(date = new Date()) {

  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
}


function getRankFromMinutes(minutes) {

  const hours =
    Number(minutes || 0) / 60;

  let rank = "Bronze";

  for (const item of RANKS) {

    if (hours >= item.minHours) {
      rank = item.name;
    }
  }

  return rank;
}


async function ensureSeason() {

  if (!currentUser) return;

  const seasonId =
    getSeasonId();

  const ref =
    doc(
      db,
      "users",
      currentUser.uid,
      "seasonStats",
      seasonId
    );

  const snapshot =
    await getDoc(ref);

  if (!snapshot.exists()) {

    await setDoc(
      ref,
      {

        seasonId,

        studyMinutes: 0,

        rank: "Bronze",

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp()
      }
    );
  }
}


async function loadSeason() {

  if (!currentUser) return;

  const seasonId =
    getSeasonId();

  const ref =
    doc(
      db,
      "users",
      currentUser.uid,
      "seasonStats",
      seasonId
    );

  const snapshot =
    await getDoc(ref);

  if (!snapshot.exists()) return;

  const data = snapshot.data();

  const minutes =
    Number(data.studyMinutes || 0);

  const rank =
    getRankFromMinutes(minutes);

  currentPlayer.seasonStudyMinutes =
    minutes;

  currentPlayer.seasonRank =
    rank;


  setText(
    "home-rank",
    rank
  );

  setText(
    "current-rank-name",
    rank
  );

  setText(
    "home-season-study-time",
    `${(minutes / 60).toFixed(1)}時間`
  );

  setText(
    "current-season-study-time",
    `${(minutes / 60).toFixed(1)}時間`
  );

  setText(
    "home-season-end",
    formatDateTime(
      getSeasonEnd()
    )
  );

  setText(
    "current-season-time",
    formatCountdown(
      getSeasonEnd()
    )
  );

  setText(
    "header-rank",
    rank
  );
}


// ============================================================
// UPDATE SEASON
// ============================================================

async function addSeasonStudyMinutes(minutes) {

  if (!currentUser || minutes <= 0) return;

  const seasonId =
    getSeasonId();

  const ref =
    doc(
      db,
      "users",
      currentUser.uid,
      "seasonStats",
      seasonId
    );

  const snapshot =
    await getDoc(ref);

  if (!snapshot.exists()) {

    await setDoc(
      ref,
      {

        seasonId,

        studyMinutes: minutes,

        rank: getRankFromMinutes(minutes),

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp()
      }
    );

  } else {

    const currentMinutes =
      Number(
        snapshot.data().studyMinutes || 0
      );

    const newMinutes =
      currentMinutes + minutes;

    await updateDoc(
      ref,
      {

        studyMinutes:
          increment(minutes),

        rank:
          getRankFromMinutes(newMinutes),

        updatedAt:
          serverTimestamp()
      }
    );
  }


  await loadSeason();
}


// ============================================================
// STUDY TIMER
// ============================================================

function formatTimer(seconds) {

  const h =
    Math.floor(seconds / 3600);

  const m =
    Math.floor(
      (seconds % 3600) / 60
    );

  const s =
    seconds % 60;


  return [
    h,
    m,
    s
  ]
    .map(value =>
      String(value).padStart(2, "0")
    )
    .join(":");
}


function updateTimerDisplay() {

  setText(
    "study-timer-display",
    formatTimer(studyTimerSeconds)
  );
}


function startStudyTimer() {

  if (studyTimerRunning) return;

  studyTimerRunning = true;

  studyTimerInterval =
    setInterval(() => {

      studyTimerSeconds++;

      updateTimerDisplay();

    }, 1000);
}


function pauseStudyTimer() {

  studyTimerRunning = false;

  if (studyTimerInterval) {

    clearInterval(
      studyTimerInterval
    );

    studyTimerInterval = null;
  }
}


function stopStudyTimer() {

  pauseStudyTimer();
}


function resetStudyTimer() {

  pauseStudyTimer();

  studyTimerSeconds = 0;

  updateTimerDisplay();
}


async function saveTimerStudy() {

  const minutes =
    Math.floor(
      studyTimerSeconds / 60
    );

  if (minutes < 1) {

    notify(
      "1分以上勉強してから記録してください。",
      "error"
    );

    return;
  }


  const subject =
    $("study-subject").value;

  if (!subject) {

    notify(
      "教科を選択してください。",
      "error"
    );

    switchScreen("study-screen");

    return;
  }


  await saveStudyRecord(
    subject,
    minutes,
    "タイマー"
  );

  resetStudyTimer();
}


// ============================================================
// STUDY RECORD
// ============================================================

async function saveStudyRecord(
  subjectId,
  minutes,
  note = ""
) {

  if (!currentUser) return;

  minutes =
    Number(minutes);


  if (
    !subjectId ||
    !Number.isFinite(minutes) ||
    minutes < 1 ||
    minutes > 1440
  ) {

    throw new Error(
      "勉強時間が不正です。"
    );
  }


  const xp = minutes;

  const coins =
    Math.max(
      1,
      Math.floor(minutes / 10)
    );


  // ----------------------------------------------------------
  // STUDY RECORD
  // ----------------------------------------------------------

  await addDoc(
    collection(
      db,
      "users",
      currentUser.uid,
      "studyRecords"
    ),
    {

      subjectId,

      subjectName:
        SUBJECTS[subjectId] || subjectId,

      minutes,

      xp,

      coins,

      note:

        String(note || "")
          .slice(0, 500),

      createdAt:
        serverTimestamp()
    }
  );


  // ----------------------------------------------------------
  // SUBJECT
  // ----------------------------------------------------------

  const subjectRef =
    doc(
      db,
      "users",
      currentUser.uid,
      "subjects",
      subjectId
    );

  const subjectSnapshot =
    await getDoc(subjectRef);


  if (subjectSnapshot.exists()) {

    const data =
      subjectSnapshot.data();

    const oldXP =
      Number(data.xp || 0);

    const newXP =
      oldXP + xp;

    await updateDoc(
      subjectRef,
      {

        studyMinutes:
          increment(minutes),

        xp:
          increment(xp),

        level:
          calculateLevelFromXP(newXP),

        updatedAt:
          serverTimestamp()
      }
    );

  } else {

    await setDoc(
      subjectRef,
      {

        subjectId,

        name:
          SUBJECTS[subjectId] || subjectId,

        studyMinutes:
          minutes,

        xp,

        level:
          calculateLevelFromXP(xp),

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      }
    );
  }


  // ----------------------------------------------------------
  // PLAYER
  // ----------------------------------------------------------

  await updateDoc(
    doc(
      db,
      "users",
      currentUser.uid
    ),
    {

      totalStudyMinutes:
        increment(minutes),

      updatedAt:
        serverTimestamp()
    }
  );


  currentPlayer.totalStudyMinutes =
    Number(
      currentPlayer.totalStudyMinutes || 0
    ) + minutes;


  // ----------------------------------------------------------
  // SEASON
  // ----------------------------------------------------------

  await addSeasonStudyMinutes(
    minutes
  );


  // ----------------------------------------------------------
  // XP / COINS
  // ----------------------------------------------------------

  await addXP(xp);

  await addCoins(coins);


  // ----------------------------------------------------------
  // DAILY ACHIEVEMENTS
  // ----------------------------------------------------------

  await checkAchievements();


  await Promise.all([
    loadTodaySummary(),
    loadStudyHistory(),
    loadSubjectSummary(),
    loadSubjectLevels(),
    loadProfile()
  ]);


  showRewardModal(`
    <div class="reward-result">
      <p>📚 ${escapeHTML(SUBJECTS[subjectId] || subjectId)}</p>
      <p>⏱️ ${minutes}分</p>
      <p>✨ +${xp} XP</p>
      <p>🪙 +${coins} コイン</p>
    </div>
  `);
}


// ============================================================
// LOAD SUBJECTS
// ============================================================

async function loadSubjects() {

  if (!currentUser) return;

  const snapshot =
    await getDocs(
      collection(
        db,
        "users",
        currentUser.uid,
        "subjects"
      )
    );


  const subjects =
    snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));


  renderSubjectSelect(
    subjects
  );

  renderSettingsSubjects(
    subjects
  );

  renderProfileSubjects(
    subjects
  );
}


function renderSubjectSelect(subjects) {

  const select =
    $("study-subject");

  if (!select) return;

  select.innerHTML = `
    <option value="">
      教科を選択
    </option>
  `;


  subjects.forEach(subject => {

    const option =
      document.createElement("option");

    option.value =
      subject.id;

    option.textContent =
      subject.name ||
      SUBJECTS[subject.id] ||
      subject.id;

    select.appendChild(option);
  });
}


function renderSettingsSubjects(subjects) {

  const selected =
    new Set(
      subjects.map(
        subject => subject.id
      )
    );


  document
    .querySelectorAll(
      'input[name="settings-subjects"]'
    )
    .forEach(input => {

      input.checked =
        selected.has(input.value);
    });
}


function renderProfileSubjects(subjects) {

  const container =
    $("profile-subject-list");

  if (!container) return;


  if (subjects.length === 0) {

    container.innerHTML =
      `<p class="empty-message">
        登録教科がありません。
      </p>`;

    return;
  }


  container.innerHTML =
    subjects.map(subject => {

      const minutes =
        Number(
          subject.studyMinutes || 0
        );

      return `
        <div class="subject-row">
          <strong>
            ${escapeHTML(
              subject.name ||
              SUBJECTS[subject.id] ||
              subject.id
            )}
          </strong>

          <span>
            Lv.${Number(subject.level || 1)}
          </span>

          <span>
            ${minutes}分
          </span>
        </div>
      `;

    }).join("");
}


// ============================================================
// TODAY SUMMARY
// ============================================================

function getDateKey(date = new Date()) {

  const y =
    date.getFullYear();

  const m =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const d =
    String(date.getDate())
      .padStart(2, "0");

  return `${y}-${m}-${d}`;
}


async function loadTodaySummary() {

  if (!currentUser) return;

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "studyRecords"
        )
      );


    const today =
      getDateKey();

    let minutes = 0;
    let xp = 0;
    let coins = 0;


    snapshot.forEach(item => {

      const data =
        item.data();

      if (!data.createdAt) return;

      const date =
        data.createdAt.toDate?.();

      if (!date) return;

      if (
        getDateKey(date) === today
      ) {

        minutes +=
          Number(data.minutes || 0);

        xp +=
          Number(data.xp || 0);

        coins +=
          Number(data.coins || 0);
      }
    });


    setText(
      "today-study-time",
      `${minutes}分`
    );

    setText(
      "today-xp",
      `${xp} XP`
    );

    setText(
      "today-coins",
      `🪙 ${coins}`
    );


  } catch (error) {

    console.error(
      "Today summary:",
      error
    );
  }
}


// ============================================================
// STUDY HISTORY
// ============================================================

async function loadStudyHistory() {

  if (!currentUser) return;

  const container =
    $("study-history-list");

  if (!container) return;


  try {

    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            "users",
            currentUser.uid,
            "studyRecords"
          ),
          orderBy(
            "createdAt",
            "desc"
          ),
          limit(100)
        )
      );


    if (snapshot.empty) {

      container.innerHTML =
        `<p class="empty-message">
          まだ勉強記録がありません。
        </p>`;

      return;
    }


    container.innerHTML =
      snapshot.docs.map(doc => {

        const data =
          doc.data();

        const date =
          data.createdAt?.toDate?.();

        return `
          <div class="study-history-item">

            <strong>
              ${escapeHTML(
                data.subjectName ||
                SUBJECTS[data.subjectId] ||
                data.subjectId
              )}
            </strong>

            <span>
              ${Number(data.minutes || 0)}分
            </span>

            <span>
              +${Number(data.xp || 0)} XP
            </span>

            <small>
              ${date
                ? formatDateTime(date)
                : "-"}
            </small>

            ${
              data.note
                ? `<p>${escapeHTML(data.note)}</p>`
                : ""
            }

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "Study history:",
      error
    );
  }
}


// ============================================================
// SUBJECT SUMMARY
// ============================================================

async function loadSubjectSummary() {

  if (!currentUser) return;

  const container =
    $("subject-study-list");

  if (!container) return;


  const snapshot =
    await getDocs(
      collection(
        db,
        "users",
        currentUser.uid,
        "subjects"
      )
    );


  const subjects =
    snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));


  if (subjects.length === 0) {

    container.innerHTML =
      `<p class="empty-message">
        教科データがありません。
      </p>`;

    return;
  }


  container.innerHTML =
    subjects.map(subject => {

      const minutes =
        Number(
          subject.studyMinutes || 0
        );

      return `
        <div class="subject-summary-card">

          <strong>
            ${escapeHTML(
              subject.name ||
              SUBJECTS[subject.id] ||
              subject.id
            )}
          </strong>

          <span>
            ${minutes}分
          </span>

        </div>
      `;

    }).join("");
}


// ============================================================
// SUBJECT LEVELS
// ============================================================

async function loadSubjectLevels() {

  if (!currentUser) return;

  const container =
    $("subject-level-list");

  if (!container) return;


  const snapshot =
    await getDocs(
      collection(
        db,
        "users",
        currentUser.uid,
        "subjects"
      )
    );


  if (snapshot.empty) {

    container.innerHTML =
      `<p class="empty-message">
        教科データがありません。
      </p>`;

    return;
  }


  container.innerHTML =
    snapshot.docs.map(doc => {

      const data =
        doc.data();

      const level =
        Number(data.level || 1);

      const xp =
        Number(data.xp || 0);

      const info =
        getXPIntoLevel(xp);


      const progress =
        info.required > 0
          ? Math.min(
              100,
              info.current /
              info.required *
              100
            )
          : 100;


      return `
        <div class="subject-level-card">

          <div class="subject-level-header">

            <strong>
              ${escapeHTML(
                data.name ||
                SUBJECTS[doc.id] ||
                doc.id
              )}
            </strong>

            <span>
              Lv.${level}
            </span>

          </div>

          <div class="level-progress-container">

            <div class="level-progress-bar">

              <div
                class="level-progress"
                style="width:${progress}%"
              ></div>

            </div>

          </div>

          <small>
            ${xp} XP
          </small>

        </div>
      `;

    }).join("");
}


// ============================================================
// QUESTS
// ============================================================

async function loadQuests() {

  if (!currentUser) return;

  await Promise.all([
    loadQuestType(
      "daily",
      "daily-quest-list"
    ),
    loadQuestType(
      "weekly",
      "weekly-quest-list"
    ),
    loadQuestHistory()
  ]);
}


async function loadQuestType(
  type,
  containerId
) {

  const container =
    $(containerId);

  if (!container) return;


  try {

    const snapshot =
      await getDocs(
        query(
          collection(db, "quests"),
          where("type", "==", type)
        )
      );


    if (snapshot.empty) {

      container.innerHTML =
        `<p class="empty-message">
          クエストはありません。
        </p>`;

      return;
    }


    const completionSnapshot =
      await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "questCompletions"
        )
      );


    const completions =
      new Map();


    completionSnapshot.forEach(doc => {

      const data =
        doc.data();

      completions.set(
        data.questId,
        data
      );
    });


    container.innerHTML =
      snapshot.docs.map(doc => {

        const quest =
          doc.data();

        const completion =
          completions.get(doc.id);

        const completed =
          isQuestCompletedToday(
            completion,
            type
          );


        return `
          <div
            class="quest-card ${
              completed
                ? "completed"
                : ""
            }"
          >

            <div>

              <h4>
                ${escapeHTML(
                  quest.name ||
                  quest.title ||
                  "クエスト"
                )}
              </h4>

              <p>
                ${escapeHTML(
                  quest.description ||
                  ""
                )}
              </p>

            </div>

            <div>

              <span>
                +${Number(quest.xp || 0)} XP
              </span>

              <span>
                🪙 +${Number(quest.coins || 0)}
              </span>

              <button
                type="button"
                class="quest-complete-button"
                data-quest-id="${doc.id}"
                ${
                  completed
                    ? "disabled"
                    : ""
                }
              >
                ${
                  completed
                    ? "達成済み"
                    : "達成する"
                }
              </button>

            </div>

          </div>
        `;

      }).join("");


    container
      .querySelectorAll(
        ".quest-complete-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => completeQuest(
            button.dataset.questId
          )
        );
      });


  } catch (error) {

    console.error(
      "Quest load:",
      error
    );
  }
}


function isQuestCompletedToday(
  completion,
  type
) {

  if (!completion) return false;

  if (type === "weekly") {

    const weekId =
      getWeekId();

    return completion.periodId === weekId;
  }


  const today =
    getDateKey();

  return completion.periodId === today;
}


// ============================================================
// QUEST COMPLETION
// ============================================================

async function completeQuest(
  questId
) {

  if (!currentUser) return;


  const questRef =
    doc(
      db,
      "quests",
      questId
    );

  const questSnapshot =
    await getDoc(questRef);


  if (!questSnapshot.exists()) {

    notify(
      "クエストが存在しません。",
      "error"
    );

    return;
  }


  const quest =
    questSnapshot.data();


  const type =
    quest.type || "daily";


  const periodId =
    type === "weekly"
      ? getWeekId()
      : getDateKey();


  const completionId =
    `${questId}_${periodId}`;


  const completionRef =
    doc(
      db,
      "users",
      currentUser.uid,
      "questCompletions",
      completionId
    );


  const existing =
    await getDoc(completionRef);


  if (existing.exists()) {

    notify(
      "このクエストは達成済みです。",
      "error"
    );

    return;
  }


  const xp =
    Number(quest.xp || 0);

  const coins =
    Number(quest.coins || 0);


  await setDoc(
    completionRef,
    {

      questId,

      userId:
        currentUser.uid,

      type,

      periodId,

      xp,

      coins,

      completedAt:
        serverTimestamp()
    }
  );


  await addXP(xp);

  await addCoins(coins);


  await updateDoc(
    doc(
      db,
      "users",
      currentUser.uid
    ),
    {

      questsCompleted:
        increment(1),

      updatedAt:
        serverTimestamp()
    }
  );


  currentPlayer.questsCompleted =
    Number(
      currentPlayer.questsCompleted || 0
    ) + 1;


  await checkAchievements();

  await loadQuests();

  await loadTodaySummary();

  await loadProfile();


  showRewardModal(`
    <div>
      <p>⚔️ ${escapeHTML(
        quest.name ||
        quest.title ||
        "クエスト"
      )}</p>

      <p>✨ +${xp} XP</p>

      <p>🪙 +${coins} コイン</p>
    </div>
  `);
}


// ============================================================
// QUEST HISTORY
// ============================================================

async function loadQuestHistory() {

  const container =
    $("quest-history-list");

  if (!container || !currentUser) return;


  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          "users",
          currentUser.uid,
          "questCompletions"
        ),
        orderBy(
          "completedAt",
          "desc"
        ),
        limit(100)
      )
    );


  if (snapshot.empty) {

    container.innerHTML =
      `<p class="empty-message">
        クエスト履歴がありません。
      </p>`;

    return;
  }


  container.innerHTML =
    snapshot.docs.map(doc => {

      const data =
        doc.data();

      return `
        <div class="quest-history-item">

          <strong>
            ${escapeHTML(
              data.questId
            )}
          </strong>

          <span>
            +${Number(data.xp || 0)} XP
          </span>

          <span>
            🪙 +${Number(data.coins || 0)}
          </span>

        </div>
      `;

    }).join("");
}


// ============================================================
// BOSS
// ============================================================

function getWeekId(date = new Date()) {

  const d =
    new Date(date);

  const day =
    d.getDay();

  const diff =
    day === 0
      ? -6
      : 1 - day;

  d.setDate(
    d.getDate() + diff
  );

  return getDateKey(d);
}


async function loadBoss() {

  if (!currentUser) return;

  const weekId =
    getWeekId();

  const bossRef =
    doc(
      db,
      "bosses",
      weekId
    );

  try {

    const snapshot =
      await getDoc(bossRef);


    if (!snapshot.exists()) {

      renderBoss(null);

      return;
    }


    const boss =
      snapshot.data();

    renderBoss(boss);

    await loadBossLogs(
      weekId
    );

  } catch (error) {

    console.error(
      "Boss:",
      error
    );
  }
}


function renderBoss(boss) {

  if (!boss) {

    setText(
      "boss-name",
      "受験の魔王"
    );

    setText(
      "boss-level",
      "Lv.1"
    );

    setText(
      "boss-current-hp",
      "100"
    );

    setText(
      "boss-max-hp",
      "100"
    );

    setText(
      "boss-weakness-subject",
      "-"
    );

    return;
  }


  const currentHP =
    Number(
      boss.currentHp ??
      boss.hp ??
      0
    );

  const maxHP =
    Number(
      boss.maxHp ??
      boss.hp ??
      100
    );


  setText(
    "boss-name",
    boss.name || "受験の魔王"
  );

  setText(
    "boss-level",
    `Lv.${Number(boss.level || 1)}`
  );

  setText(
    "boss-current-hp",
    Math.max(0, currentHP)
  );

  setText(
    "boss-max-hp",
    maxHP
  );


  const weakness =
    boss.weaknessSubject ||
    boss.weakness ||
    "-";


  setText(
    "boss-weakness-subject",
    SUBJECTS[weakness] ||
    weakness
  );


  setText(
    "boss-weakness-multiplier",
    `×${Number(
      boss.weaknessMultiplier || 1.5
    )}`
  );


  const progress =
    maxHP > 0
      ? Math.max(
          0,
          Math.min(
            100,
            currentHP /
            maxHP *
            100
          )
        )
      : 0;


  const bar =
    $("boss-hp-progress");

  if (bar) {

    bar.style.width =
      `${progress}%`;
  }


  setText(
    "boss-reset-date",
    formatDateTime(
      getNextWeekReset()
    )
  );
}


// ============================================================
// BOSS LOG
// ============================================================

async function loadBossLogs(
  weekId
) {

  const container =
    $("boss-log-list");

  if (!container) return;


  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          "bosses",
          weekId,
          "logs"
        ),
        orderBy(
          "createdAt",
          "desc"
        ),
        limit(50)
      )
    );


  if (snapshot.empty) {

    container.innerHTML =
      `<p class="empty-message">
        まだ戦闘記録はありません。
      </p>`;

    return;
  }


  container.innerHTML =
    snapshot.docs.map(doc => {

      const data =
        doc.data();

      return `
        <div class="boss-log-item">

          <strong>
            ${escapeHTML(
              data.displayName ||
              "冒険者"
            )}
          </strong>

          <span>
            ⚔️ ${Number(
              data.damage || 0
            )} ダメージ
          </span>

        </div>
      `;

    }).join("");
}


function getNextWeekReset() {

  const now =
    new Date();

  const day =
    now.getDay();

  const days =
    day === 0
      ? 1
      : 8 - day;

  const result =
    new Date(now);

  result.setDate(
    result.getDate() + days
  );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

async function loadAchievements() {

  if (!currentUser) return;


  const container =
    $("achievement-list");

  if (!container) return;


  try {

    const masterSnapshot =
      await getDocs(
        collection(
          db,
          "achievements"
        )
      );


    const ownedSnapshot =
      await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "achievements"
        )
      );


    const owned =
      new Set(
        ownedSnapshot.docs.map(
          doc => doc.id
        )
      );


    setText(
      "achievement-count",
      `${owned.size} / ${masterSnapshot.size}`
    );


    container.innerHTML =
      masterSnapshot.docs.map(doc => {

        const achievement =
          doc.data();

        const unlocked =
          owned.has(doc.id);


        return `
          <div
            class="achievement-card ${
              unlocked
                ? "unlocked"
                : "locked"
            }"
          >

            <strong>
              ${escapeHTML(
                achievement.name ||
                achievement.title ||
                doc.id
              )}
            </strong>

            <p>
              ${escapeHTML(
                achievement.description ||
                ""
              )}
            </p>

            <span>
              ${
                unlocked
                  ? "🏆 獲得済み"
                  : "🔒 未獲得"
              }
            </span>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "Achievements:",
      error
    );
  }
}


// ============================================================
// ACHIEVEMENT CHECK
// ============================================================

async function checkAchievements() {

  if (!currentUser) return;


  try {

    const masterSnapshot =
      await getDocs(
        collection(
          db,
          "achievements"
        )
      );


    const ownedSnapshot =
      await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "achievements"
        )
      );


    const owned =
      new Set(
        ownedSnapshot.docs.map(
          doc => doc.id
        )
      );


    for (const achievementDoc of masterSnapshot.docs) {

      if (owned.has(achievementDoc.id)) {
        continue;
      }


      const achievement =
        achievementDoc.data();


      if (
        await achievementConditionMet(
          achievement
        )
      ) {

        await setDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "achievements",
            achievementDoc.id
          ),
          {

            achievementId:
              achievementDoc.id,

            name:
              achievement.name ||
              achievement.title ||
              achievementDoc.id,

            unlockedAt:
              serverTimestamp()
          }
        );


        const rewardXP =
          Number(
            achievement.rewardXp || 0
          );

        const rewardCoins =
          Number(
            achievement.rewardCoins || 0
          );

        const rewardStars =
          Number(
            achievement.rewardStars || 0
          );


        if (rewardXP > 0) {
          await addXP(rewardXP);
        }

        if (rewardCoins > 0) {
          await addCoins(rewardCoins);
        }

        if (rewardStars > 0) {
          await addStars(rewardStars);
        }


        notify(
          `🏆 実績解除：${
            achievement.name ||
            achievement.title ||
            achievementDoc.id
          }`,
          "success"
        );
      }
    }


    await loadAchievements();

  } catch (error) {

    console.error(
      "Achievement check:",
      error
    );
  }
}


async function achievementConditionMet(
  achievement
) {

  if (!currentPlayer) return false;


  const type =
    achievement.conditionType;


  const value =
    Number(
      achievement.conditionValue || 0
    );


  switch (type) {

    case "totalStudyMinutes":

      return Number(
        currentPlayer.totalStudyMinutes || 0
      ) >= value;


    case "totalXP":

      return Number(
        currentPlayer.totalXp || 0
      ) >= value;


    case "totalCoins":

      return Number(
        currentPlayer.totalCoins || 0
      ) >= value;


    case "questsCompleted":

      return Number(
        currentPlayer.questsCompleted || 0
      ) >= value;


    case "bossesDefeated":

      return Number(
        currentPlayer.bossesDefeated || 0
      ) >= value;


    case "level":

      return Number(
        currentPlayer.level || 1
      ) >= value;


    default:

      return false;
  }
}


// ============================================================
// SHOP
// ============================================================

async function loadShop() {

  await Promise.all([
    loadShopTitles(),
    loadShopItems(),
    loadShopBackgrounds()
  ]);

  setText(
    "shop-coin-count",
    Number(
      currentPlayer?.coins || 0
    )
  );
}


async function loadShopTitles() {

  const container =
    $("shop-title-list");

  if (!container || !currentUser) return;


  const snapshot =
    await getDocs(
      collection(db, "titles")
    );


  container.innerHTML =
    snapshot.docs.map(doc => {

      const item =
        doc.data();

      return createShopCard(
        doc.id,
        item,
        "title"
      );

    }).join("");


  attachShopListeners(
    container
  );
}


async function loadShopItems() {

  const container =
    $("shop-item-list");

  if (!container || !currentUser) return;


  const snapshot =
    await getDocs(
      collection(db, "shopItems")
    );


  container.innerHTML =
    snapshot.docs.map(doc => {

      const item =
        doc.data();

      return createShopCard(
        doc.id,
        item,
        "item"
      );

    }).join("");


  attachShopListeners(
    container
  );
}


async function loadShopBackgrounds() {

  const container =
    $("shop-background-list");

  if (!container || !currentUser) return;


  const snapshot =
    await getDocs(
      collection(db, "shopItems")
    );


  const backgrounds =
    snapshot.docs.filter(doc => {

      const data =
        doc.data();

      return (
        data.type === "background" ||
        data.category === "background"
      );

    });


  container.innerHTML =
    backgrounds.map(doc => {

      return createShopCard(
        doc.id,
        doc.data(),
        "background"
      );

    }).join("");


  attachShopListeners(
    container
  );
}


function createShopCard(
  id,
  item,
  type
) {

  return `
    <div class="shop-card">

      <h4>
        ${escapeHTML(
          item.name ||
          item.title ||
          id
        )}
      </h4>

      <p>
        ${escapeHTML(
          item.description ||
          ""
        )}
      </p>

      <strong>
        🪙 ${Number(item.price || 0)}
      </strong>

      <button
        type="button"
        class="shop-buy-button"
        data-item-id="${id}"
        data-item-type="${type}"
      >
        購入
      </button>

    </div>
  `;
}


function attachShopListeners(
  container
) {

  container
    .querySelectorAll(
      ".shop-buy-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => buyItem(
          button.dataset.itemId,
          button.dataset.itemType
        )
      );
    });
}


// ============================================================
// BUY ITEM
// ============================================================

async function buyItem(
  itemId,
  type
) {

  if (!currentUser) return;


  const collectionName =
    type === "title"
      ? "titles"
      : "shopItems";


  const itemSnapshot =
    await getDoc(
      doc(
        db,
        collectionName,
        itemId
      )
    );


  if (!itemSnapshot.exists()) {

    notify(
      "商品が存在しません。",
      "error"
    );

    return;
  }


  const item =
    itemSnapshot.data();


  const price =
    Number(item.price || 0);

  const coins =
    Number(currentPlayer.coins || 0);


  if (coins < price) {

    notify(
      "コインが足りません。",
      "error"
    );

    return;
  }


  const inventoryRef =
    doc(
      db,
      "users",
      currentUser.uid,
      "inventory",
      itemId
    );


  const existing =
    await getDoc(inventoryRef);


  if (existing.exists()) {

    notify(
      "すでに所持しています。",
      "error"
    );

    return;
  }


  await updateDoc(
    doc(
      db,
      "users",
      currentUser.uid
    ),
    {

      coins:
        increment(-price),

      updatedAt:
        serverTimestamp()
    }
  );


  await setDoc(
    inventoryRef,
    {

      itemId,

      type,

      name:
        item.name ||
        item.title ||
        itemId,

      quantity: 1,

      purchasedAt:
        serverTimestamp()
    }
  );


  currentPlayer.coins =
    coins - price;


  renderPlayer();

  await loadShop();

  await loadInventory();


  showRewardModal(`
    <div>
      <p>🛒 購入完了！</p>
      <p>${escapeHTML(
        item.name ||
        item.title ||
        itemId
      )}</p>
      <p>🪙 -${price}</p>
    </div>
  `);
}


// ============================================================
// INVENTORY
// ============================================================

async function loadInventory() {

  if (!currentUser) return;


  const snapshot =
    await getDocs(
      collection(
        db,
        "users",
        currentUser.uid,
        "inventory"
      )
    );


  const items =
    snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));


  const titleContainer =
    $("locker-title-list");

  const itemContainer =
    $("locker-item-list");

  const outfitContainer =
    $("locker-outfit-list");


  const titles =
    items.filter(
      item => item.type === "title"
    );

  const backgrounds =
    items.filter(
      item =>
        item.type === "background" ||
        item.type === "outfit"
    );

  const normalItems =
    items.filter(
      item =>
        item.type !== "title" &&
        item.type !== "background" &&
        item.type !== "outfit"
    );


  renderInventoryContainer(
    titleContainer,
    titles,
    "title"
  );

  renderInventoryContainer(
    itemContainer,
    normalItems,
    "item"
  );

  renderInventoryContainer(
    outfitContainer,
    backgrounds,
    "background"
  );
}


function renderInventoryContainer(
  container,
  items,
  type
) {

  if (!container) return;


  if (items.length === 0) {

    container.innerHTML =
      `<p class="empty-message">
        所持しているアイテムはありません。
      </p>`;

    return;
  }


  container.innerHTML =
    items.map(item => {

      return `
        <div class="inventory-card">

          <strong>
            ${escapeHTML(
              item.name ||
              item.id
            )}
          </strong>

          <span>
            ×${Number(
              item.quantity || 1
            )}
          </span>

          ${
            type === "title"
              ? `
                <button
                  type="button"
                  class="equip-title-button"
                  data-title="${escapeHTML(
                    item.name || item.id
                  )}"
                >
                  装備
                </button>
              `
              : ""
          }

        </div>
      `;

    }).join("");


  container
    .querySelectorAll(
      ".equip-title-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => equipTitle(
          button.dataset.title
        )
      );
    });
}


// ============================================================
// EQUIP TITLE
// ============================================================

async function equipTitle(title) {

  await updateDoc(
    doc(
      db,
      "users",
      currentUser.uid
    ),
    {

      title,

      updatedAt:
        serverTimestamp()
    }
  );


  currentPlayer.title =
    title;

  renderPlayer();

  await loadProfile();

  notify(
    `🏷️ 「${title}」を装備しました。`,
    "success"
  );
}


// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {

  if (!currentPlayer) return;

  renderProfileBasic();


  setText(
    "profile-total-study-time",
    `${Number(
      currentPlayer.totalStudyMinutes || 0
    )}分`
  );

  setText(
    "profile-total-xp",
    `${Number(
      currentPlayer.totalXp || 0
    )} XP`
  );

  setText(
    "profile-total-coins",
    Number(
      currentPlayer.totalCoins || 0
    )
  );

  setText(
    "profile-bosses-defeated",
    Number(
      currentPlayer.bossesDefeated || 0
    )
  );

  setText(
    "profile-quests-completed",
    Number(
      currentPlayer.questsCompleted || 0
    )
  );
}


function renderProfileBasic() {

  if (!currentPlayer) return;


  setText(
    "profile-display-name",
    currentPlayer.displayName ||
    "冒険者"
  );

  setText(
    "profile-user-id",
    currentPlayer.userId ||
    "-"
  );

  setText(
    "profile-course",
    COURSE_NAMES[
      currentPlayer.course
    ] ||
    "-"
  );

  setText(
    "profile-level",
    Number(
      currentPlayer.level || 1
    )
  );

  setText(
    "profile-xp",
    Number(
      currentPlayer.xp || 0
    )
  );

  setText(
    "profile-stars",
    Number(
      currentPlayer.stars || 0
    )
  );

  setText(
    "profile-coins",
    Number(
      currentPlayer.coins || 0
    )
  );

  setText(
    "profile-title",
    currentPlayer.title ||
    "無名の冒険者"
  );


  const nameInput =
    $("settings-display-name");

  if (nameInput) {

    nameInput.value =
      currentPlayer.displayName || "";
  }
}


// ============================================================
// DISPLAY NAME
// ============================================================

async function handleDisplayNameChange(
  event
) {

  event.preventDefault();


  const input =
    $("settings-display-name");

  const error =
    $("display-name-error");


  const name =
    input.value.trim();


  error.textContent = "";


  if (!validateDisplayName(name)) {

    error.textContent =
      "表示名は1〜30文字で入力してください。";

    return;
  }


  try {

    await updateDoc(
      doc(
        db,
        "users",
        currentUser.uid
      ),
      {

        displayName: name,

        updatedAt:
          serverTimestamp()
      }
    );


    currentPlayer.displayName =
      name;


    renderPlayer();

    await loadProfile();


    notify(
      "表示名を変更しました。",
      "success"
    );

  } catch (error) {

    console.error(error);

    error.textContent =
      firebaseErrorMessage(error);
  }
}


// ============================================================
// SUBJECT SETTINGS
// ============================================================

async function handleSubjectSettings(
  event
) {

  event.preventDefault();


  const error =
    $("settings-subject-error");


  const selected =
    [
      ...document.querySelectorAll(
        'input[name="settings-subjects"]:checked'
      )
    ].map(
      input => input.value
    );


  error.textContent = "";


  if (selected.length === 0) {

    error.textContent =
      "少なくとも1教科選択してください。";

    return;
  }


  try {

    const existingSnapshot =
      await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "subjects"
        )
      );


    const existing =
      new Set(
        existingSnapshot.docs.map(
          doc => doc.id
        )
      );


    // --------------------------------------------------------
    // ADD
    // --------------------------------------------------------

    for (const subjectId of selected) {

      if (!existing.has(subjectId)) {

        await setDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "subjects",
            subjectId
          ),
          {

            subjectId,

            name:
              SUBJECTS[subjectId] ||
              subjectId,

            studyMinutes: 0,

            xp: 0,

            level: 1,

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          }
        );
      }
    }


    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

    for (const oldId of existing) {

      if (!selected.includes(oldId)) {

        await deleteDoc(
          doc(
            db,
            "users",
            currentUser.uid,
            "subjects",
            oldId
          )
        );
      }
    }


    await updateDoc(
      doc(
        db,
        "users",
        currentUser.uid
      ),
      {

        subjects: selected,

        updatedAt:
          serverTimestamp()
      }
    );


    currentPlayer.subjects =
      selected;


    await loadSubjects();


    notify(
      "受験教科を更新しました。",
      "success"
    );


  } catch (error) {

    console.error(error);

    error.textContent =
      firebaseErrorMessage(error);
  }
}


// ============================================================
// PASSWORD
// ============================================================

async function handlePasswordChange(
  event
) {

  event.preventDefault();


  const password =
    $("settings-new-password").value;

  const error =
    $("password-error");


  error.textContent = "";


  if (password.length < 6) {

    error.textContent =
      "パスワードは6文字以上にしてください。";

    return;
  }


  try {

    await updatePassword(
      currentUser,
      password
    );


    $("settings-new-password").value =
      "";


    notify(
      "パスワードを変更しました。",
      "success"
    );


  } catch (errorObject) {

    console.error(errorObject);

    error.textContent =
      firebaseErrorMessage(
        errorObject
      );
  }
}


// ============================================================
// DELETE ACCOUNT
// ============================================================

async function handleDeleteAccount() {

  if (!currentUser) return;


  const confirmed =
    confirm(
      "本当にアカウントを削除しますか？\n\nこの操作は取り消せません。"
    );


  if (!confirmed) return;


  const doubleConfirmed =
    confirm(
      "最終確認です。\nアカウントを削除します。"
    );


  if (!doubleConfirmed) return;


  try {

    await deleteUser(
      currentUser
    );

    notify(
      "アカウントを削除しました。"
    );

  } catch (error) {

    console.error(error);

    notify(
      firebaseErrorMessage(error),
      "error"
    );
  }
}


// ============================================================
// FRIENDS
// ============================================================

async function loadFriends() {

  if (!currentUser) return;

  const container =
    $("friend-list");

  if (!container) return;


  const snapshot =
    await getDocs(
      collection(
        db,
        "users",
        currentUser.uid,
        "friends"
      )
    );


  if (snapshot.empty) {

    container.innerHTML =
      `<p class="empty-message">
        フレンドがいません。
      </p>`;

    return;
  }


  const friends = [];


  for (const friendDoc of snapshot.docs) {

    const friendUid =
      friendDoc.id;

    const profile =
      await getDoc(
        doc(
          db,
          "users",
          friendUid
        )
      );


    // 現在のRulesでは他人のusers読取が禁止
    // そのため失敗しても落とさない
    if (profile.exists()) {

      friends.push({
        uid: friendUid,
        ...profile.data()
      });
    }
  }


  if (friends.length === 0) {

    container.innerHTML =
      `<p class="empty-message">
        フレンド情報を読み込めません。
      </p>`;

    return;
  }


  container.innerHTML =
    friends.map(friend => {

      return `
        <div class="friend-card">

          <strong>
            ${escapeHTML(
              friend.displayName ||
              "冒険者"
            )}
          </strong>

          <span>
            Lv.${Number(
              friend.level || 1
            )}
          </span>

        </div>
      `;

    }).join("");
}


// ============================================================
// PARTY
// ============================================================

async function loadParty() {

  if (!currentUser) return;

  const container =
    $("party-member-list");

  if (!container) return;


  try {

    const snapshot =
      await getDocs(
        collection(db, "parties")
      );


    let party = null;


    snapshot.forEach(doc => {

      const data =
        doc.data();

      if (
        Array.isArray(
          data.memberIds
        ) &&
        data.memberIds.includes(
          currentUser.uid
        )
      ) {

        party = {
          id: doc.id,
          ...data
        };
      }
    });


    if (!party) {

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


    const memberIds =
      party.memberIds || [];


    container.innerHTML =
      memberIds.map(uid => {

        return `
          <div class="party-member-card">
            <strong>
              ${escapeHTML(uid)}
            </strong>
          </div>
        `;

      }).join("");


    setText(
      "party-member-count",
      `${memberIds.length} / 4人`
    );


    renderBossParty(
      memberIds
    );


  } catch (error) {

    console.error(
      "Party:",
      error
    );
  }
}


function renderBossParty(
  memberIds
) {

  const container =
    $("boss-party-member-list");

  if (!container) return;


  container.innerHTML =
    memberIds.map(uid => {

      return `
        <div class="boss-party-member">
          👤 ${escapeHTML(uid)}
        </div>
      `;

    }).join("");


  setText(
    "boss-party-count",
    `${memberIds.length} / 4人`
  );
}


// ============================================================
// PARTY INVITE
// ============================================================

async function handlePartyInvite(
  event
) {

  event.preventDefault();


  const input =
    $("party-invite-user-id");

  const error =
    $("party-error");


  const targetUserId =
    normalizeUserId(
      input.value
    );


  error.textContent = "";


  if (!validateUserId(targetUserId)) {

    error.textContent =
      "ユーザーIDの形式が正しくありません。";

    return;
  }


  if (
    targetUserId ===
    currentPlayer.userId
  ) {

    error.textContent =
      "自分自身は招待できません。";

    return;
  }


  try {

    await addDoc(
      collection(
        db,
        "partyInvites"
      ),
      {

        senderId:
          currentUser.uid,

        receiverId:
          targetUserId,

        status:
          "pending",

        createdAt:
          serverTimestamp()
      }
    );


    input.value = "";


    notify(
      "招待を送信しました。",
      "success"
    );


  } catch (errorObject) {

    console.error(errorObject);

    error.textContent =
      firebaseErrorMessage(
        errorObject
      );
  }
}


// ============================================================
// REQUESTS
// ============================================================

async function loadRequests() {

  if (!currentUser) return;

  const container =
    $("friend-request-list");

  if (!container) return;


  try {

    const friendSnapshot =
      await getDocs(
        query(
          collection(
            db,
            "friendRequests"
          ),
          where(
            "receiverId",
            "==",
            currentUser.uid
          )
        )
      );


    const partySnapshot =
      await getDocs(
        query(
          collection(
            db,
            "partyInvites"
          ),
          where(
            "receiverId",
            "==",
            currentUser.uid
          )
        )
      );


    const requests = [];


    friendSnapshot.forEach(doc => {

      requests.push({
        id: doc.id,
        type: "friend",
        ...doc.data()
      });
    });


    partySnapshot.forEach(doc => {

      requests.push({
        id: doc.id,
        type: "party",
        ...doc.data()
      });
    });


    if (requests.length === 0) {

      container.innerHTML =
        `<p class="empty-message">
          申請はありません。
        </p>`;

      return;
    }


    container.innerHTML =
      requests.map(request => {

        return `
          <div class="request-card">

            <strong>
              ${
                request.type === "friend"
                  ? "🤝 フレンド申請"
                  : "👥 パーティー招待"
              }
            </strong>

            <p>
              送信者：
              ${escapeHTML(
                request.senderId ||
                "-"
              )}
            </p>

            <button
              type="button"
              class="request-accept-button"
              data-id="${request.id}"
              data-type="${request.type}"
            >
              承認
            </button>

          </div>
        `;

      }).join("");


    container
      .querySelectorAll(
        ".request-accept-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () =>
            acceptRequest(
              button.dataset.id,
              button.dataset.type
            )
        );
      });


  } catch (error) {

    console.error(
      "Requests:",
      error
    );
  }
}


// ============================================================
// ACCEPT REQUEST
// ============================================================

async function acceptRequest(
  requestId,
  type
) {

  const collectionName =
    type === "friend"
      ? "friendRequests"
      : "partyInvites";


  const ref =
    doc(
      db,
      collectionName,
      requestId
    );


  const snapshot =
    await getDoc(ref);


  if (!snapshot.exists()) return;


  const data =
    snapshot.data();


  if (
    data.receiverId !==
    currentUser.uid
  ) {

    notify(
      "この申請を操作できません。",
      "error"
    );

    return;
  }


  await updateDoc(
    ref,
    {
      status: "accepted",

      acceptedAt:
        serverTimestamp()
    }
  );


  notify(
    "申請を承認しました。",
    "success"
  );


  await loadRequests();
}


// ============================================================
// SCREEN NAVIGATION
// ============================================================

function switchScreen(
  screenId
) {

  document
    .querySelectorAll(
      ".app-screen"
    )
    .forEach(screen => {

      screen.classList.add(
        "hidden"
      );
    });


  const target =
    $(screenId);

  if (target) {

    target.classList.remove(
      "hidden"
    );
  }


  document
    .querySelectorAll(
      ".nav-button"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.screen ===
        screenId
      );
    });


  currentScreen =
    screenId;


  // ----------------------------------------------------------
  // LAZY LOAD
  // ----------------------------------------------------------

  if (screenId === "party-screen") {

    loadParty();
    loadFriends();
    loadRequests();
  }

  if (screenId === "rank-screen") {

    loadSeason();
  }

  if (screenId === "quest-screen") {

    loadQuests();
    loadBoss();
  }

  if (screenId === "other-screen") {

    loadAchievements();
    loadShop();
    loadInventory();
    loadProfile();
  }
}


// ============================================================
// TAB NAVIGATION
// ============================================================

function setupTabs() {

  document
    .querySelectorAll(
      "[data-quest-tab]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const tab =
            button.dataset.questTab;

          currentQuestTab =
            tab;


          document
            .querySelectorAll(
              "[data-quest-tab]"
            )
            .forEach(btn => {

              btn.classList.toggle(
                "active",
                btn === button
              );
            });


          document
            .querySelectorAll(
              ".quest-tab-content"
            )
            .forEach(content => {

              content.classList.add(
                "hidden"
              );
            });


          const target =
            $(
              tab === "daily"
                ? "daily-quest-tab"
                : tab === "weekly"
                  ? "weekly-quest-tab"
                  : tab === "boss"
                    ? "boss-tab"
                    : "quest-history-tab"
            );


          target?.classList.remove(
            "hidden"
          );
        }
      );
    });


  document
    .querySelectorAll(
      "[data-party-tab]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const tab =
            button.dataset.partyTab;

          currentPartyTab =
            tab;


          document
            .querySelectorAll(
              "[data-party-tab]"
            )
            .forEach(btn => {

              btn.classList.toggle(
                "active",
                btn === button
              );
            });


          document
            .querySelectorAll(
              ".party-tab-content"
            )
            .forEach(content => {

              content.classList.add(
                "hidden"
              );
            });


          const target =
            $(
              tab === "party"
                ? "party-tab"
                : tab === "friends"
                  ? "friends-tab"
                  : "friend-requests-tab"
            );


          target?.classList.remove(
            "hidden"
          );


          if (tab === "party") {
            loadParty();
          }

          if (tab === "friends") {
            loadFriends();
          }

          if (tab === "requests") {
            loadRequests();
          }
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

          const tab =
            button.dataset.rankTab;

          currentRankTab =
            tab;


          document
            .querySelectorAll(
              "[data-rank-tab]"
            )
            .forEach(btn => {

              btn.classList.toggle(
                "active",
                btn === button
              );
            });


          document
            .querySelectorAll(
              ".rank-tab-content"
            )
            .forEach(content => {

              content.classList.add(
                "hidden"
              );
            });


          const target =
            $(
              tab === "rank"
                ? "rank-info-tab"
                : tab === "ranking"
                  ? "ranking-tab"
                  : "season-history-tab"
            );


          target?.classList.remove(
            "hidden"
          );


          if (tab === "ranking") {
            loadRanking();
          }

          if (tab === "history") {
            loadSeasonHistory();
          }
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
        () => openOtherTab(
          button.dataset.otherTab
        )
      );
    });


  document
    .querySelectorAll(
      "[data-open-other-tab]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => openOtherTab(
          button.dataset.openOtherTab
        )
      );
    });


  document
    .querySelectorAll(
      "[data-ranking-type]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              "[data-ranking-type]"
            )
            .forEach(btn => {

              btn.classList.toggle(
                "active",
                btn === button
              );
            });


          const type =
            button.dataset.rankingType;


          if (type === "friends") {

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
}


function openOtherTab(
  tab
) {

  currentOtherTab =
    tab;


  document
    .querySelectorAll(
      "[data-other-tab]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.otherTab ===
        tab
      );
    });


  document
    .querySelectorAll(
      ".other-tab-content"
    )
    .forEach(content => {

      content.classList.add(
        "hidden"
      );
    });


  const target =
    $(
      tab === "menu"
        ? "other-menu-tab"
        : `${tab}-tab`
    );


  target?.classList.remove(
    "hidden"
  );


  if (tab === "achievement") {
    loadAchievements();
  }

  if (tab === "shop") {
    loadShop();
  }

  if (tab === "locker") {
    loadInventory();
  }

  if (tab === "profile") {
    loadProfile();
  }
}


// ============================================================
// RANKING
// ============================================================

async function loadRanking() {

  if (!currentUser) return;


  const container =
    $("global-ranking-list");

  if (!container) return;


  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "users"
        )
      );


    // 現在のRulesでは他ユーザーusers読み取り不可
    // 権限エラー時に画面を壊さない

    if (snapshot.empty) {

      container.innerHTML =
        `<p class="empty-message">
          ランキングデータがありません。
        </p>`;

      return;
    }


    const players =
      snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort(
          (a, b) =>
            Number(
              b.seasonStudyMinutes || 0
            ) -
            Number(
              a.seasonStudyMinutes || 0
            )
        )
        .slice(0, 100);


    container.innerHTML =
      players.map(
        (player, index) => {

          return `
            <div class="ranking-card">

              <strong>
                #${index + 1}
              </strong>

              <span>
                ${escapeHTML(
                  player.displayName ||
                  "冒険者"
                )}
              </span>

              <span>
                ${(
                  Number(
                    player.seasonStudyMinutes || 0
                  ) / 60
                ).toFixed(1)}時間
              </span>

            </div>
          `;

        }
      ).join("");


  } catch (error) {

    console.error(
      "Ranking:",
      error
    );


    container.innerHTML =
      `<p class="empty-message">
        現在ランキングを読み込めません。
      </p>`;
  }
}


// ============================================================
// SEASON HISTORY
// ============================================================

async function loadSeasonHistory() {

  if (!currentUser) return;


  const container =
    $("season-history-list");

  if (!container) return;


  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "users",
          currentUser.uid,
          "seasonStats"
        )
      );


    if (snapshot.empty) {

      container.innerHTML =
        `<p class="empty-message">
          まだ履歴がありません。
        </p>`;

      return;
    }


    const history =
      snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort(
          (a, b) =>
            String(b.id)
              .localeCompare(
                String(a.id)
              )
        );


    container.innerHTML =
      history.map(item => {

        return `
          <div class="season-history-card">

            <strong>
              ${escapeHTML(
                item.seasonId ||
                item.id
              )}
            </strong>

            <span>
              ${escapeHTML(
                item.rank ||
                "Bronze"
              )}
            </span>

            <span>
              ${(
                Number(
                  item.studyMinutes || 0
                ) / 60
              ).toFixed(1)}時間
            </span>

          </div>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "Season history:",
      error
    );
  }
}


// ============================================================
// DATE
// ============================================================

function formatDateTime(
  date
) {

  if (!date) return "-";


  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}


function formatCountdown(
  targetDate
) {

  const diff =
    targetDate.getTime() -
    Date.now();


  if (diff <= 0) {
    return "終了";
  }


  const totalMinutes =
    Math.floor(
      diff / 60000
    );

  const days =
    Math.floor(
      totalMinutes / 1440
    );

  const hours =
    Math.floor(
      (totalMinutes % 1440) / 60
    );

  const minutes =
    totalMinutes % 60;


  return `${days}日 ${hours}時間 ${minutes}分`;
}


// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {

  // AUTH

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


  $("logout-button")
    ?.addEventListener(
      "click",
      handleLogout
    );


  // NAVIGATION

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


  // TIMER

  $("study-timer-start")
    ?.addEventListener(
      "click",
      startStudyTimer
    );


  $("study-timer-pause")
    ?.addEventListener(
      "click",
      pauseStudyTimer
    );


  $("study-timer-reset")
    ?.addEventListener(
      "click",
      resetStudyTimer
    );


  $("timer-save-button")
    ?.addEventListener(
      "click",
      saveTimerStudy
    );


  // STUDY FORM

  $("study-record-form")
    ?.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const subject =
          $("study-subject").value;

        const minutes =
          Number(
            $("study-minutes").value
          );

        const note =
          $("study-note").value;


        try {

          await saveStudyRecord(
            subject,
            minutes,
            note
          );


          $("study-record-form").reset();

        } catch (error) {

          console.error(error);

          setText(
            "study-error",
            firebaseErrorMessage(error)
          );
        }
      }
    );


  // OTHER SETTINGS

  $("display-name-form")
    ?.addEventListener(
      "submit",
      handleDisplayNameChange
    );


  $("subject-settings-form")
    ?.addEventListener(
      "submit",
      handleSubjectSettings
    );


  $("password-form")
    ?.addEventListener(
      "submit",
      handlePasswordChange
    );


  $("delete-account-button")
    ?.addEventListener(
      "click",
      handleDeleteAccount
    );


  // PARTY

  $("party-invite-form")
    ?.addEventListener(
      "submit",
      handlePartyInvite
    );


  // MODALS

  $("level-up-close-button")
    ?.addEventListener(
      "click",
      () =>
        hide($("level-up-modal"))
    );


  $("reward-close-button")
    ?.addEventListener(
      "click",
      () =>
        hide($("reward-modal"))
    );


  $("boss-refresh-button")
    ?.addEventListener(
      "click",
      loadBoss
    );


  setupTabs();
}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
  auth,
  async user => {

    currentUser =
      user;


    if (!user) {

      currentPlayer = null;

      hide($("main-app"));
      show($("auth-screen"));

      return;
    }


    try {

      hide($("auth-screen"));
      show($("main-app"));


      await loadPlayer();


      switchScreen(
        "home-screen"
      );


    } catch (error) {

      console.error(
        "Initialization error:",
        error
      );


      notify(
        firebaseErrorMessage(error),
        "error"
      );
    }
  }
);


// ============================================================
// INITIALIZE
// ============================================================

function initialize() {

  updateTimerDisplay();

  setupEventListeners();

  showLoginScreen();
}


initialize();


// ============================================================
// PERIODIC REFRESH
// ============================================================

setInterval(
  () => {

    if (
      currentUser &&
      currentPlayer
    ) {

      loadSeason();
    }

  },
  60000
);


// ============================================================
// DEBUG API
// ============================================================

window.JukenRPG = {

  getUser() {
    return currentUser;
  },

  getPlayer() {
    return currentPlayer;
  },

  getRank(minutes) {
    return getRankFromMinutes(
      minutes
    );
  },

  getLevel(xp) {
    return calculateLevelFromXP(
      xp
    );
  },

  reload() {
    return loadPlayer();
  }
};
