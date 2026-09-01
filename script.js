// =====================================================
// 受験RPG
// script.js - COMPLETE VERSION
// =====================================================

import { auth, db } from "./config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  serverTimestamp,
  increment,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// =====================================================
// CONSTANTS
// =====================================================

const SUBJECTS = {
  japanese: "国語",
  english: "英語",
  information: "情報",
  math: "数学",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  "earth-science": "地学",
  geography: "地理",
  "japanese-history": "日本史",
  "world-history": "世界史",
  ethics: "倫理",
  "politics-economics": "政治・経済",
  civics: "公共"
};

const RANKS = [
  {
    key: "bronze",
    name: "Bronze",
    minHours: 0,
    color: "#cd7f32",
    textColor: "#fff"
  },
  {
    key: "silver",
    name: "Silver",
    minHours: 8,
    color: "#9ca3af",
    textColor: "#111"
  },
  {
    key: "gold",
    name: "Gold",
    minHours: 18,
    color: "#eab308",
    textColor: "#111"
  },
  {
    key: "platinum",
    name: "Platinum",
    minHours: 31,
    color: "#67e8f9",
    textColor: "#06202a"
  },
  {
    key: "diamond",
    name: "Diamond",
    minHours: 47,
    color: "#60a5fa",
    textColor: "#071426"
  },
  {
    key: "master",
    name: "Master",
    minHours: 66,
    color: "#a78bfa",
    textColor: "#fff"
  },
  {
    key: "grandmaster",
    name: "Grandmaster",
    minHours: 90,
    color: "#f472b6",
    textColor: "#fff"
  },
  {
    key: "legend",
    name: "Legend",
    minHours: 150,
    color: "#f59e0b",
    textColor: "#111"
  }
];

const RANK_REWARDS = {
  bronze: 50,
  silver: 100,
  gold: 200,
  platinum: 350,
  diamond: 550,
  master: 800,
  grandmaster: 1100,
  legend: 1500
};

const QUEST_XP = {
  daily: 30,
  subject: 40,
  weekly: 100,
  rare: 150
};

const QUEST_COINS = {
  daily: 10,
  subject: 15,
  weekly: 40,
  rare: 75
};

const BOSS_BASE_HP = 1000;
const BOSS_MEMBER_HP = 500;

const WEAKNESS_MULTIPLIER = 1.5;

const INTERNAL_EMAIL_DOMAIN = "@juken-rpg.local";


// =====================================================
// HIDDEN ACHIEVEMENTS
// =====================================================

const HIDDEN_ACHIEVEMENTS = [
  {
    id: "hidden_01",
    name: "深夜の冒険者",
    description: "日付が変わった後に勉強記録を残す。",
    condition: "lateNight",
    rewardXP: 100,
    rewardCoins: 50
  },
  {
    id: "hidden_02",
    name: "静寂の支配者",
    description: "1日に3時間以上勉強する。",
    condition: "threeHoursDay",
    rewardXP: 150,
    rewardCoins: 75
  },
  {
    id: "hidden_03",
    name: "限界突破",
    description: "1日に5時間以上勉強する。",
    condition: "fiveHoursDay",
    rewardXP: 300,
    rewardCoins: 150
  },
  {
    id: "hidden_04",
    name: "連続撃破",
    description: "7日連続で勉強記録を残す。",
    condition: "sevenDayStreak",
    rewardXP: 250,
    rewardCoins: 100
  },
  {
    id: "hidden_05",
    name: "亡者の執念",
    description: "同じ日に5回以上勉強記録を残す。",
    condition: "fiveRecordsDay",
    rewardXP: 150,
    rewardCoins: 75
  },
  {
    id: "hidden_06",
    name: "ボスハンター",
    description: "ボスを10体撃破する。",
    condition: "boss10",
    rewardXP: 300,
    rewardCoins: 150
  },
  {
    id: "hidden_07",
    name: "全方位攻撃",
    description: "1日に5教科以上を記録する。",
    condition: "fiveSubjectsDay",
    rewardXP: 200,
    rewardCoins: 100
  },
  {
    id: "hidden_08",
    name: "あり得ない知能",
    description: "全教科を選択した状態で、全選択教科を同日に自己申告する。",
    condition: "allSubjectsReport",
    rewardXP: 500,
    rewardCoins: 250
  },
  {
    id: "hidden_09",
    name: "終わらない冒険",
    description: "累計100時間の勉強を達成する。",
    condition: "total100Hours",
    rewardXP: 500,
    rewardCoins: 250
  },
  {
    id: "hidden_10",
    name: "転生者",
    description: "Lv.101に到達して転生する。",
    condition: "rebirth",
    rewardXP: 500,
    rewardCoins: 300
  }
];


// =====================================================
// NORMAL ACHIEVEMENTS
// =====================================================

const ACHIEVEMENTS = [
  {
    id: "first_study",
    name: "最初の一歩",
    description: "初めて勉強を記録する。",
    rewardXP: 50,
    rewardCoins: 20
  },
  {
    id: "study_10h",
    name: "見習い冒険者",
    description: "累計10時間勉強する。",
    rewardXP: 100,
    rewardCoins: 50
  },
  {
    id: "study_50h",
    name: "熟練冒険者",
    description: "累計50時間勉強する。",
    rewardXP: 300,
    rewardCoins: 150
  },
  {
    id: "study_100h",
    name: "百時間の戦士",
    description: "累計100時間勉強する。",
    rewardXP: 500,
    rewardCoins: 250
  },
  {
    id: "level10",
    name: "Lv.10到達",
    description: "レベル10に到達する。",
    rewardXP: 100,
    rewardCoins: 50
  },
  {
    id: "level50",
    name: "Lv.50到達",
    description: "レベル50に到達する。",
    rewardXP: 500,
    rewardCoins: 200
  },
  {
    id: "level100",
    name: "限界到達",
    description: "Lv.100に到達する。",
    rewardXP: 1000,
    rewardCoins: 500
  },
  {
    id: "silver_rank",
    name: "Silver冒険者",
    description: "Silverランクに到達する。",
    rewardXP: 100,
    rewardCoins: 50
  },
  {
    id: "gold_rank",
    name: "Gold冒険者",
    description: "Goldランクに到達する。",
    rewardXP: 200,
    rewardCoins: 100
  },
  {
    id: "legend_rank",
    name: "伝説",
    description: "Legendランクに到達する。",
    rewardXP: 1000,
    rewardCoins: 500
  }
];


// =====================================================
// SHOP DATA
// =====================================================

const SHOP_ITEMS = [
  {
    id: "xp_boost",
    name: "経験値の書",
    description: "使用すると100XP獲得。",
    price: 100,
    type: "xp"
  },
  {
    id: "coin_box",
    name: "コイン箱",
    description: "使用すると100コイン獲得。",
    price: 150,
    type: "coins"
  },
  {
    id: "boss_damage",
    name: "勇者の一撃",
    description: "次回ボス戦で追加ダメージ。",
    price: 200,
    type: "boss"
  }
];

const SHOP_TITLES = [
  {
    id: "hard_worker",
    name: "努力の戦士",
    price: 300
  },
  {
    id: "scholar",
    name: "知識の探求者",
    price: 500
  },
  {
    id: "legendary",
    name: "伝説の冒険者",
    price: 1000
  }
];

const SHOP_OUTFITS = [
  {
    id: "default",
    name: "冒険者の服",
    price: 0
  },
  {
    id: "knight",
    name: "騎士装備",
    price: 500
  },
  {
    id: "mage",
    name: "魔導士装備",
    price: 700
  }
];


// =====================================================
// STATE
// =====================================================

let currentUser = null;
let currentProfile = null;

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

let selectedPurchase = null;

let currentScreen = "home-screen";


// =====================================================
// DOM HELPERS
// =====================================================

const $ = id => document.getElementById(id);

function show(id) {
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

function hide(id) {
  const el = $(id);
  if (el) el.classList.add("hidden");
}

function text(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function html(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value;
}

function notify(message) {
  const el = $("notification");
  if (!el) return;

  el.textContent = message;
  el.classList.remove("hidden");

  setTimeout(() => {
    el.classList.add("hidden");
  }, 2500);
}

function setError(id, message) {
  text(id, message || "");
}


// =====================================================
// DATE UTILITIES
// =====================================================

function pad(n) {
  return String(n).padStart(2, "0");
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function getSeasonStart(date = new Date()) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
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

function formatDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatRange(start, end) {
  return `${formatDate(start)} ～ ${formatDate(end)}`;
}


// =====================================================
// LEVEL SYSTEM
// =====================================================

function xpPerLevel(level) {
  if (level <= 9) return 100;
  if (level <= 19) return 150;
  if (level <= 29) return 200;
  if (level <= 39) return 250;
  if (level <= 49) return 300;
  if (level <= 59) return 350;
  if (level <= 69) return 400;
  if (level <= 79) return 450;
  if (level <= 89) return 500;
  return 550;
}

function calculateLevel(totalXP) {
  let level = 1;
  let remainingXP = Math.max(0, totalXP);

  while (level <= 100) {
    const required = xpPerLevel(level);

    if (remainingXP < required) {
      return {
        level,
        currentXP: remainingXP,
        requiredXP: required,
        progress: required === 0
          ? 100
          : (remainingXP / required) * 100
      };
    }

    remainingXP -= required;
    level++;
  }

  return {
    level: 101,
    currentXP: 0,
    requiredXP: 0,
    progress: 100
  };
}


// =====================================================
// RANK SYSTEM
// =====================================================

function calculateRank(minutes) {
  const hours = minutes / 60;

  let result = RANKS[0];

  for (const rank of RANKS) {
    if (hours >= rank.minHours) {
      result = rank;
    }
  }

  return result;
}

function nextRank(minutes) {
  const hours = minutes / 60;

  for (const rank of RANKS) {
    if (hours < rank.minHours) {
      return rank;
    }
  }

  return null;
}

function applyRankTheme(rank) {
  const root = document.documentElement;

  root.style.setProperty("--rank-color", rank.color);
  root.style.setProperty("--rank-text-color", rank.textColor);

  const rankElements = [
    $("header-rank"),
    $("home-rank"),
    $("season-rank"),
    $("profile-rank"),
    $("current-rank-name")
  ];

  rankElements.forEach(el => {
    if (!el) return;

    el.dataset.rank = rank.key;
    el.style.backgroundColor = rank.color;
    el.style.color = rank.textColor;
  });
}


// =====================================================
// DEFAULT PROFILE
// =====================================================

function defaultSubjectLevels(subjects) {
  const result = {};

  for (const subject of subjects) {
    result[subject] = {
      xp: 0,
      level: 1
    };
  }

  return result;
}

function createDefaultProfile({
  uid,
  userId,
  displayName,
  course,
  subjects
}) {
  return {
    uid,
    userId,
    displayName,
    course,
    subjects,

    totalXP: 0,
    totalStudyMinutes: 0,

    seasonStudyMinutes: 0,
    seasonKey: monthKey(),

    coins: 0,
    stars: 0,

    title: "無名の冒険者",

    subjectLevels: defaultSubjectLevels(subjects),

    achievements: [],
    titles: ["無名の冒険者"],
    items: [],

    equippedOutfit: "default",

    questsCompleted: 0,
    bossesDefeated: 0,

    currentPartyId: null,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}


// =====================================================
// AUTH EMAIL
// =====================================================

function internalEmail(userId) {
  return `${userId.toLowerCase()}${INTERNAL_EMAIL_DOMAIN}`;
}


// =====================================================
// AUTH SCREEN
// =====================================================

function initAuthUI() {

  $("show-register-button")?.addEventListener("click", () => {
    hide("login-screen");
    show("register-screen");
  });

  $("show-login-button")?.addEventListener("click", () => {
    hide("register-screen");
    show("login-screen");
  });

  $("login-form")?.addEventListener("submit", login);

  $("register-form")?.addEventListener("submit", register);

  $("logout-button")?.addEventListener("click", async () => {
    await signOut(auth);
  });
}


// =====================================================
// REGISTER
// =====================================================

async function register(event) {
  event.preventDefault();

  setError("register-error", "");
  setError("subject-error", "");

  const userId = $("register-user-id").value.trim();
  const password = $("register-password").value;
  const passwordConfirm = $("register-password-confirm").value;
  const displayName = $("register-display-name").value.trim();

  const course =
    document.querySelector('input[name="course"]:checked')?.value ||
    "undecided";

  const subjects = [
    ...document.querySelectorAll('input[name="subjects"]:checked')
  ].map(input => input.value);

  if (!/^[A-Za-z0-9_-]{3,30}$/.test(userId)) {
    setError(
      "register-error",
      "ユーザーIDは3〜30文字の英数字・_・-で入力してください。"
    );
    return;
  }

  if (password.length < 6) {
    setError(
      "register-error",
      "パスワードは6文字以上にしてください。"
    );
    return;
  }

  if (password !== passwordConfirm) {
    setError(
      "register-error",
      "パスワードが一致していません。"
    );
    return;
  }

  if (!displayName) {
    setError(
      "register-error",
      "表示名を入力してください。"
    );
    return;
  }

  if (subjects.length === 0) {
    setError(
      "subject-error",
      "最低1教科は選択してください。"
    );
    return;
  }

  const button = $("register-button");

  if (button) button.disabled = true;

  try {

    const usernameRef = doc(
      db,
      "usernames",
      userId.toLowerCase()
    );

    const usernameSnap = await getDoc(usernameRef);

    if (usernameSnap.exists()) {
      throw new Error("USERNAME_EXISTS");
    }

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        internalEmail(userId),
        password
      );

    const uid = credential.user.uid;

    const profile = createDefaultProfile({
      uid,
      userId,
      displayName,
      course,
      subjects
    });

    await setDoc(
      doc(db, "users", uid),
      profile
    );

    await setDoc(
      usernameRef,
      {
        uid,
        userId,
        createdAt: serverTimestamp()
      }
    );

    await initializeUserCollections(uid, profile);

    notify("冒険者登録完了！");

  } catch (error) {

    console.error(error);

    if (error.message === "USERNAME_EXISTS") {
      setError(
        "register-error",
        "そのユーザーIDはすでに使われています。"
      );
    } else if (error.code === "auth/email-already-in-use") {
      setError(
        "register-error",
        "そのユーザーIDはすでに使われています。"
      );
    } else {
      setError(
        "register-error",
        "登録に失敗しました。"
      );
    }

  } finally {

    if (button) button.disabled = false;

  }
}


// =====================================================
// LOGIN
// =====================================================

async function login(event) {
  event.preventDefault();

  setError("login-error", "");

  const userId = $("login-user-id").value.trim();
  const password = $("login-password").value;

  if (!userId || !password) {
    setError(
      "login-error",
      "ユーザーIDとパスワードを入力してください。"
    );
    return;
  }

  const button = $("login-button");

  if (button) button.disabled = true;

  try {

    await signInWithEmailAndPassword(
      auth,
      internalEmail(userId),
      password
    );

  } catch (error) {

    console.error(error);

    setError(
      "login-error",
      "ユーザーIDまたはパスワードが違います。"
    );

  } finally {

    if (button) button.disabled = false;

  }
}


// =====================================================
// INITIALIZE USER DATA
// =====================================================

async function initializeUserCollections(uid, profile) {

  const now = new Date();

  const seasonRef = doc(
    db,
    "users",
    uid,
    "seasons",
    profile.seasonKey
  );

  const seasonSnap = await getDoc(seasonRef);

  if (!seasonSnap.exists()) {
    await setDoc(seasonRef, {
      seasonKey: profile.seasonKey,
      studyMinutes: 0,
      rank: "bronze",
      rewardClaimed: false,
      startedAt: serverTimestamp()
    });
  }

  const bossKey = getBossWeekKey(now);

  const bossRef = doc(
    db,
    "users",
    uid,
    "bosses",
    bossKey
  );

  const bossSnap = await getDoc(bossRef);

  if (!bossSnap.exists()) {
    await setDoc(
      bossRef,
      createBossData(profile)
    );
  }
}


// =====================================================
// PROFILE LOAD
// =====================================================

async function loadProfile() {

  if (!currentUser) return;

  const ref = doc(
    db,
    "users",
    currentUser.uid
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.error("Profile not found.");
    return;
  }

  currentProfile = {
    ...snap.data(),
    uid: currentUser.uid
  };

  await ensureSeason();

  await ensureWeeklyBoss();

  await renderAll();
}


// =====================================================
// SEASON
// =====================================================

async function ensureSeason() {

  if (!currentProfile) return;

  const currentSeason = monthKey();

  if (currentProfile.seasonKey === currentSeason) {
    return;
  }

  const previousRank =
    calculateRank(currentProfile.seasonStudyMinutes || 0);

  const previousSeasonKey =
    currentProfile.seasonKey;

  const reward =
    RANK_REWARDS[previousRank.key] || 0;

  if (previousSeasonKey) {

    await setDoc(
      doc(
        db,
        "users",
        currentUser.uid,
        "seasons",
        previousSeasonKey
      ),
      {
        seasonKey: previousSeasonKey,
        studyMinutes:
          currentProfile.seasonStudyMinutes || 0,
        rank: previousRank.key,
        rewardXP: reward,
        endedAt: serverTimestamp()
      },
      { merge: true }
    );

  }

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      seasonKey: currentSeason,
      seasonStudyMinutes: 0,
      totalXP: increment(reward),
      updatedAt: serverTimestamp()
    }
  );

  currentProfile.seasonKey = currentSeason;
  currentProfile.seasonStudyMinutes = 0;
  currentProfile.totalXP =
    (currentProfile.totalXP || 0) + reward;

  if (reward > 0) {
    notify(
      `${previousRank.name}シーズン報酬！ +${reward} XP`
    );
  }
}


// =====================================================
// STUDY RECORD
// =====================================================

async function recordStudy({
  subject,
  minutes,
  note = ""
}) {

  if (!currentUser || !currentProfile) {
    return;
  }

  minutes = Number(minutes);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("INVALID_MINUTES");
  }

  const now = new Date();

  const xp = minutes;

  const profileRef = doc(
    db,
    "users",
    currentUser.uid
  );

  const studyRef = doc(
    collection(
      db,
      "users",
      currentUser.uid,
      "studyRecords"
    )
  );

  const today = localDateKey(now);

  await runTransaction(db, async transaction => {

    const profileSnap =
      await transaction.get(profileRef);

    if (!profileSnap.exists()) {
      throw new Error("PROFILE_NOT_FOUND");
    }

    const profile = profileSnap.data();

    const currentSubject =
      profile.subjectLevels?.[subject] || {
        xp: 0,
        level: 1
      };

    const subjectXP =
      (currentSubject.xp || 0) + xp;

    const subjectLevel =
      calculateSubjectLevel(subjectXP);

    const totalXP =
      (profile.totalXP || 0) + xp;

    const totalStudyMinutes =
      (profile.totalStudyMinutes || 0) + minutes;

    const seasonStudyMinutes =
      (profile.seasonStudyMinutes || 0) + minutes;

    const newSubjectLevels =
      profile.subjectLevels || {};

    newSubjectLevels[subject] = {
      xp: subjectXP,
      level: subjectLevel.level
    };

    transaction.update(
      profileRef,
      {
        totalXP,
        totalStudyMinutes,
        seasonStudyMinutes,
        subjectLevels: newSubjectLevels,
        updatedAt: serverTimestamp()
      }
    );

    transaction.set(
      studyRef,
      {
        subject,
        minutes,
        xp,
        note,
        dateKey: today,
        createdAt: serverTimestamp()
      }
    );
  });

  await reloadAndCheckProgress();

  await checkHiddenAchievements({
    type: "study",
    subject,
    minutes
  });

  notify(
    `📚 ${minutes}分記録！ +${xp} XP`
  );
}


// =====================================================
// SUBJECT LEVEL
// =====================================================

function calculateSubjectLevel(xp) {

  let level = 1;
  let remaining = xp;

  while (remaining >= 100 && level < 100) {
    remaining -= 100;
    level++;
  }

  return {
    level,
    xp: xp
  };
}


// =====================================================
// STUDY FORM
// =====================================================

function initStudyForm() {

  $("study-record-form")?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      setError("study-error", "");

      try {

        const subject =
          $("study-subject").value;

        const minutes =
          Number($("study-minutes").value);

        const note =
          $("study-note").value.trim();

        if (!subject) {
          throw new Error("SUBJECT_REQUIRED");
        }

        await recordStudy({
          subject,
          minutes,
          note
        });

        $("study-record-form").reset();

      } catch (error) {

        console.error(error);

        setError(
          "study-error",
          "勉強記録に失敗しました。"
        );

      }
    }
  );

  $("timer-save-button")?.addEventListener(
    "click",
    saveTimer
  );

  $("study-timer-start")?.addEventListener(
    "click",
    startTimer
  );

  $("study-timer-pause")?.addEventListener(
    "click",
    pauseTimer
  );

  $("study-timer-reset")?.addEventListener(
    "click",
    resetTimer
  );
}


// =====================================================
// TIMER
// =====================================================

function updateTimerDisplay() {

  const h =
    Math.floor(timerSeconds / 3600);

  const m =
    Math.floor((timerSeconds % 3600) / 60);

  const s =
    timerSeconds % 60;

  text(
    "study-timer-display",
    `${pad(h)}:${pad(m)}:${pad(s)}`
  );
}

function startTimer() {

  if (timerRunning) return;

  timerRunning = true;

  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {

  timerRunning = false;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {

  pauseTimer();

  timerSeconds = 0;

  updateTimerDisplay();
}

async function saveTimer() {

  setError("timer-error", "");

  const subject =
    $("timer-study-subject").value;

  const minutes =
    Math.floor(timerSeconds / 60);

  if (!subject) {
    setError(
      "timer-error",
      "教科を選択してください。"
    );
    return;
  }

  if (minutes < 1) {
    setError(
      "timer-error",
      "1分以上勉強してから記録してください。"
    );
    return;
  }

  try {

    await recordStudy({
      subject,
      minutes,
      note: "タイマー記録"
    });

    resetTimer();

  } catch (error) {

    console.error(error);

    setError(
      "timer-error",
      "タイマー記録に失敗しました。"
    );

  }
}


// =====================================================
// SUBJECT SELECTS
// =====================================================

function populateSubjectSelects() {

  const subjects =
    currentProfile?.subjects || [];

  const selects = [
    $("study-subject"),
    $("timer-study-subject")
  ];

  selects.forEach(select => {

    if (!select) return;

    select.innerHTML =
      `<option value="">教科を選択</option>`;

    subjects.forEach(subject => {

      const option =
        document.createElement("option");

      option.value = subject;
      option.textContent =
        SUBJECTS[subject] || subject;

      select.appendChild(option);

    });
  });
}


// =====================================================
// RENDER ALL
// =====================================================

async function renderAll() {

  if (!currentProfile) return;

  populateSubjectSelects();

  renderHeader();

  renderHome();

  renderRank();

  renderProfile();

  renderSubjectLevels();

  renderSettings();

  await renderStudyHistory();

  await renderQuest();

  await renderParty();

  await renderAchievements();

  renderShop();

  renderLocker();
}


// =====================================================
// HEADER
// =====================================================

function renderHeader() {

  const level =
    calculateLevel(currentProfile.totalXP || 0);

  const rank =
    calculateRank(
      currentProfile.seasonStudyMinutes || 0
    );

  text(
    "header-display-name",
    currentProfile.displayName
  );

  text(
    "header-level",
    `Lv.${Math.min(level.level, 100)}`
  );

  text(
    "header-rank",
    rank.name
  );

  text(
    "header-coins",
    `🪙 ${currentProfile.coins || 0} コイン`
  );

  applyRankTheme(rank);
}


// =====================================================
// HOME
// =====================================================

function renderHome() {

  const level =
    calculateLevel(currentProfile.totalXP || 0);

  const rank =
    calculateRank(
      currentProfile.seasonStudyMinutes || 0
    );

  text(
    "home-level",
    Math.min(level.level, 100)
  );

  text(
    "home-xp",
    `${currentProfile.totalXP || 0} XP`
  );

  const progress =
    level.level >= 101
      ? 100
      : level.progress;

  const progressEl =
    $("level-progress");

  if (progressEl) {
    progressEl.style.width =
      `${progress}%`;
  }

  text(
    "home-xp-required",
    level.level >= 101
      ? "転生可能！"
      : `次のレベルまで ${level.requiredXP - level.currentXP} XP`
  );

  text(
    "star-count",
    `⭐ ${currentProfile.stars || 0}`
  );

  text(
    "star-title",
    currentProfile.title || "無名の冒険者"
  );

  text(
    "home-coins",
    currentProfile.coins || 0
  );

  text(
    "today-study-time",
    `${currentProfile._todayMinutes || 0}分`
  );

  text(
    "today-xp",
    `${currentProfile._todayXP || 0} XP`
  );

  text(
    "today-quests",
    currentProfile._todayQuestCount || 0
  );

  text(
    "home-rank",
    rank.name
  );

  text(
    "home-season-range",
    formatRange(
      getSeasonStart(),
      getSeasonEnd()
    )
  );

  text(
    "home-season-end",
    formatDate(getSeasonEnd())
  );
}


// =====================================================
// RANK PAGE
// =====================================================

function renderRank() {

  const minutes =
    currentProfile.seasonStudyMinutes || 0;

  const rank =
    calculateRank(minutes);

  const next =
    nextRank(minutes);

  text(
    "current-rank-name",
    rank.name
  );

  text(
    "current-season-range",
    formatRange(
      getSeasonStart(),
      getSeasonEnd()
    )
  );

  text(
    "season-study-time",
    `${(minutes / 60).toFixed(1)}時間`
  );

  text(
    "season-rank",
    rank.name
  );

  if (next) {

    const remaining =
      next.minHours - minutes / 60;

    text(
      "next-rank-requirement",
      `${remaining.toFixed(1)}時間`
    );

  } else {

    text(
      "next-rank-requirement",
      "最高ランク到達！"
    );

  }

  const timeRemaining =
    getRemainingTime(getSeasonEnd());

  text(
    "current-season-time",
    timeRemaining
  );

  const currentRank =
    $("current-rank");

  if (currentRank) {
    currentRank.dataset.rank =
      rank.key;

    currentRank.style.backgroundColor =
      rank.color;

    currentRank.style.color =
      rank.textColor;
  }
}

function getRemainingTime(endDate) {

  const diff =
    Math.max(0, endDate.getTime() - Date.now());

  const totalMinutes =
    Math.floor(diff / 60000);

  const days =
    Math.floor(totalMinutes / 1440);

  const hours =
    Math.floor(
      (totalMinutes % 1440) / 60
    );

  return `${days}日 ${hours}時間`;
}


// =====================================================
// PROFILE
// =====================================================

function renderProfile() {

  const level =
    calculateLevel(currentProfile.totalXP || 0);

  const rank =
    calculateRank(
      currentProfile.seasonStudyMinutes || 0
    );

  text(
    "profile-display-name",
    currentProfile.displayName
  );

  text(
    "profile-user-id",
    currentProfile.userId
  );

  text(
    "profile-course",
    courseName(currentProfile.course)
  );

  text(
    "profile-level",
    Math.min(level.level, 100)
  );

  text(
    "profile-stars",
    currentProfile.stars || 0
  );

  text(
    "profile-coins",
    currentProfile.coins || 0
  );

  text(
    "profile-title",
    currentProfile.title || "無名の冒険者"
  );

  text(
    "profile-rank",
    rank.name
  );

  text(
    "profile-total-study-time",
    `${currentProfile.totalStudyMinutes || 0}分`
  );

  text(
    "profile-total-xp",
    `${currentProfile.totalXP || 0} XP`
  );

  text(
    "profile-bosses-defeated",
    currentProfile.bossesDefeated || 0
  );

  text(
    "profile-quests-completed",
    currentProfile.questsCompleted || 0
  );

  text(
    "profile-achievements",
    currentProfile.achievements?.length || 0
  );

  text(
    "profile-item-count",
    currentProfile.items?.length || 0
  );
}

function courseName(course) {

  return {
    science: "理系",
    humanities: "文系",
    undecided: "未定"
  }[course] || "未定";

}


// =====================================================
// SUBJECT LEVELS
// =====================================================

function renderSubjectLevels() {

  const list =
    $("subject-level-list");

  const profileList =
    $("profile-subject-list");

  if (!list) return;

  const subjects =
    currentProfile.subjects || [];

  const content =
    subjects.map(subject => {

      const data =
        currentProfile.subjectLevels?.[subject] || {
          level: 1,
          xp: 0
        };

      return `
        <div class="subject-level-card">
          <strong>${escapeHTML(SUBJECTS[subject])}</strong>
          <span>Lv.${data.level}</span>
          <small>${data.xp} XP</small>
        </div>
      `;

    }).join("");

  list.innerHTML =
    content ||
    `<p class="empty-message">教科がありません。</p>`;

  if (profileList) {
    profileList.innerHTML = content;
  }
}


// =====================================================
// STUDY HISTORY
// =====================================================

async function renderStudyHistory() {

  if (!currentUser) return;

  const list =
    $("study-history-list");

  if (!list) return;

  try {

    const q = query(
      collection(
        db,
        "users",
        currentUser.uid,
        "studyRecords"
      ),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const snap =
      await getDocs(q);

    if (snap.empty) {
      list.innerHTML =
        `<p class="empty-message">まだ履歴がありません。</p>`;
      return;
    }

    let todayMinutes = 0;
    let todayXP = 0;

    const today =
      localDateKey();

    const records = [];

    snap.forEach(docSnap => {

      const data = docSnap.data();

      if (data.dateKey === today) {
        todayMinutes += Number(data.minutes || 0);
        todayXP += Number(data.xp || 0);
      }

      records.push(data);

    });

    currentProfile._todayMinutes =
      todayMinutes;

    currentProfile._todayXP =
      todayXP;

    list.innerHTML =
      records.map(record => `
        <div class="history-card">
          <strong>
            ${escapeHTML(
              SUBJECTS[record.subject] ||
              record.subject
            )}
          </strong>
          <span>${record.minutes}分</span>
          <small>+${record.xp} XP</small>
          ${
            record.note
              ? `<p>${escapeHTML(record.note)}</p>`
              : ""
          }
        </div>
      `).join("");

  } catch (error) {

    console.error(error);

    list.innerHTML =
      `<p class="empty-message">履歴を読み込めませんでした。</p>`;
  }
}


// =====================================================
// QUEST SYSTEM
// =====================================================

function getDailyQuestSeed() {

  const date =
    localDateKey();

  let hash = 0;

  for (let i = 0; i < date.length; i++) {
    hash =
      ((hash << 5) - hash) +
      date.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(hash);
}

function generateDailyQuests() {

  const seed =
    getDailyQuestSeed();

  const subjects =
    currentProfile?.subjects || [];

  const subject =
    subjects.length
      ? subjects[seed % subjects.length]
      : "english";

  return [
    {
      id: `daily_${localDateKey()}_1`,
      type: "daily",
      name: "今日の30分",
      description: "30分以上勉強する。",
      target: 30,
      progressType: "minutes",
      xp: QUEST_XP.daily,
      coins: QUEST_COINS.daily
    },
    {
      id: `daily_${localDateKey()}_2`,
      type: "daily",
      name: "知識を深める",
      description: "15分以上暗記・復習する。",
      target: 15,
      progressType: "minutes",
      xp: QUEST_XP.daily,
      coins: QUEST_COINS.daily
    },
    {
      id: `daily_${localDateKey()}_3`,
      type: "daily",
      name: `${SUBJECTS[subject] || subject}クエスト`,
      description: `${SUBJECTS[subject] || subject}を30分以上勉強する。`,
      target: 30,
      progressType: "subjectMinutes",
      subject,
      xp: QUEST_XP.daily,
      coins: QUEST_COINS.daily
    }
  ];
}

function generateSubjectQuests() {

  return (currentProfile?.subjects || [])
    .map(subject => ({
      id: `subject_${localDateKey()}_${subject}`,
      type: "subject",
      subject,
      name: `${SUBJECTS[subject]}の鍛錬`,
      description: `${SUBJECTS[subject]}を30分勉強する。`,
      target: 30,
      xp: QUEST_XP.subject,
      coins: QUEST_COINS.subject
    }));
}

function generateWeeklyQuests() {

  const week =
    localDateKey(getWeekStart());

  return [
    {
      id: `weekly_${week}_1`,
      type: "weekly",
      name: "週間30時間",
      description: "今週30時間勉強する。",
      target: 1800,
      progressType: "weeklyMinutes",
      xp: QUEST_XP.weekly,
      coins: QUEST_COINS.weekly
    },
    {
      id: `weekly_${week}_2`,
      type: "weekly",
      name: "週間5教科",
      description: "今週5教科以上勉強する。",
      target: 5,
      progressType: "weeklySubjects",
      xp: QUEST_XP.weekly,
      coins: QUEST_COINS.weekly
    }
  ];
}


// =====================================================
// QUEST RENDER
// =====================================================

async function renderQuest() {

  const daily =
    generateDailyQuests();

  const subject =
    generateSubjectQuests();

  const weekly =
    generateWeeklyQuests();

  await renderQuestList(
    "home-quest-list",
    daily
  );

  await renderQuestList(
    "daily-quest-list",
    daily
  );

  await renderQuestList(
    "subject-quest-list",
    subject
  );

  await renderQuestList(
    "weekly-quest-list",
    weekly
  );

  await renderBoss();

}


// =====================================================
// QUEST PROGRESS
// =====================================================

async function getTodayMinutes(subject = null) {

  if (!currentUser) return 0;

  const q = query(
    collection(
      db,
      "users",
      currentUser.uid,
      "studyRecords"
    ),
    where(
      "dateKey",
      "==",
      localDateKey()
    )
  );

  const snap =
    await getDocs(q);

  let total = 0;

  snap.forEach(docSnap => {

    const data =
      docSnap.data();

    if (!subject || data.subject === subject) {
      total += Number(data.minutes || 0);
    }

  });

  return total;
}

async function getWeeklyStats() {

  if (!currentUser) {
    return {
      minutes: 0,
      subjects: new Set()
    };
  }

  const start =
    getWeekStart();

  const q = query(
    collection(
      db,
      "users",
      currentUser.uid,
      "studyRecords"
    ),
    where(
      "createdAt",
      ">=",
      start
    )
  );

  const snap =
    await getDocs(q);

  let minutes = 0;
  const subjects = new Set();

  snap.forEach(docSnap => {

    const data =
      docSnap.data();

    minutes += Number(data.minutes || 0);

    if (data.subject) {
      subjects.add(data.subject);
    }

  });

  return {
    minutes,
    subjects
  };
}

async function questProgress(quest) {

  if (quest.progressType === "minutes") {
    return getTodayMinutes();
  }

  if (quest.progressType === "subjectMinutes") {
    return getTodayMinutes(quest.subject);
  }

  if (quest.progressType === "weeklyMinutes") {

    const stats =
      await getWeeklyStats();

    return stats.minutes;
  }

  if (quest.progressType === "weeklySubjects") {

    const stats =
      await getWeeklyStats();

    return stats.subjects.size;
  }

  return 0;
}


// =====================================================
// QUEST COMPLETION
// =====================================================

async function isQuestCompleted(questId) {

  if (!currentUser) return false;

  const ref =
    doc(
      db,
      "users",
      currentUser.uid,
      "completedQuests",
      questId
    );

  const snap =
    await getDoc(ref);

  return snap.exists();
}

async function completeQuest(quest) {

  if (!currentUser) return;

  const completed =
    await isQuestCompleted(quest.id);

  if (completed) {
    notify("このクエストは達成済み！");
    return;
  }

  const progress =
    await questProgress(quest);

  if (progress < quest.target) {
    notify(
      `まだ ${quest.target - progress} 必要！`
    );
    return;
  }

  const profileRef =
    doc(
      db,
      "users",
      currentUser.uid
    );

  await runTransaction(
    db,
    async transaction => {

      const snap =
        await transaction.get(profileRef);

      const profile =
        snap.data();

      transaction.update(
        profileRef,
        {
          totalXP:
            (profile.totalXP || 0) +
            quest.xp,

          coins:
            (profile.coins || 0) +
            quest.coins,

          questsCompleted:
            (profile.questsCompleted || 0) +
            1,

          updatedAt:
            serverTimestamp()
        }
      );

      transaction.set(
        doc(
          db,
          "users",
          currentUser.uid,
          "completedQuests",
          quest.id
        ),
        {
          ...quest,
          completedAt:
            serverTimestamp()
        }
      );

    }
  );

  await reloadAndCheckProgress();

  notify(
    `⚔️ クエスト達成！ +${quest.xp} XP / +${quest.coins}コイン`
  );
}


// =====================================================
// QUEST UI
// =====================================================

async function renderQuestList(
  elementId,
  quests
) {

  const list =
    $(elementId);

  if (!list) return;

  const cards = [];

  for (const quest of quests) {

    const completed =
      await isQuestCompleted(quest.id);

    const progress =
      Math.min(
        quest.target,
        await questProgress(quest)
      );

    cards.push(`
      <div class="quest-card ${
        completed ? "completed" : ""
      }">

        <h4>${escapeHTML(quest.name)}</h4>

        <p>
          ${escapeHTML(quest.description)}
        </p>

        <div class="quest-progress">
          ${progress} / ${quest.target}
        </div>

        <div>
          +${quest.xp} XP
          &nbsp;
          🪙 +${quest.coins}
        </div>

        ${
          completed
            ? `<strong>✅ 達成済み</strong>`
            : `
              <button
                type="button"
                class="quest-complete-button"
                data-quest-id="${quest.id}"
              >
                達成判定
              </button>
            `
        }

      </div>
    `);
  }

  list.innerHTML =
    cards.join("");

  list
    .querySelectorAll(".quest-complete-button")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const quest =
            [
              ...generateDailyQuests(),
              ...generateSubjectQuests(),
              ...generateWeeklyQuests()
            ]
              .find(q =>
                q.id === button.dataset.questId
              );

          if (quest) {
            await completeQuest(quest);
          }

        }
      );

    });
}


// =====================================================
// BOSS
// =====================================================

function getBossWeekKey(date = new Date()) {

  const start =
    getWeekStart(date);

  return localDateKey(start);
}

function createBossData(profile) {

  const subjects =
    profile.subjects || [];

  const weakness =
    subjects.length
      ? subjects[
          Math.floor(
            Math.random() *
            subjects.length
          )
        ]
      : "english";

  return {
    weekKey: getBossWeekKey(),
    name: "受験の魔王",
    level: 1,

    weakness,

    maxHP:
      BOSS_BASE_HP +
      Math.max(
        0,
        (profile.currentPartyMemberCount || 1) - 1
      ) *
      BOSS_MEMBER_HP,

    currentHP:
      BOSS_BASE_HP,

    defeated: false,

    totalDamage: 0,

    battleLog: [],

    createdAt:
      serverTimestamp()
  };
}

async function ensureWeeklyBoss() {

  if (!currentUser || !currentProfile) {
    return;
  }

  const weekKey =
    getBossWeekKey();

  const ref =
    doc(
      db,
      "users",
      currentUser.uid,
      "bosses",
      weekKey
    );

  const snap =
    await getDoc(ref);

  if (snap.exists()) return;

  const partyCount =
    await getPartyMemberCount();

  const boss =
    createBossData({
      ...currentProfile,
      currentPartyMemberCount:
        partyCount
    });

  await setDoc(ref, boss);
}

async function getCurrentBoss() {

  const weekKey =
    getBossWeekKey();

  const ref =
    doc(
      db,
      "users",
      currentUser.uid,
      "bosses",
      weekKey
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    await ensureWeeklyBoss();
    return getCurrentBoss();
  }

  return {
    ref,
    data: snap.data()
  };
}

async function renderBoss() {

  const result =
    await getCurrentBoss();

  if (!result) return;

  const boss =
    result.data;

  text(
    "boss-name",
    boss.name
  );

  text(
    "boss-level",
    `Lv.${boss.level || 1}`
  );

  text(
    "boss-current-hp",
    Math.max(0, boss.currentHP)
  );

  text(
    "boss-max-hp",
    boss.maxHP
  );

  const percentage =
    boss.maxHP
      ? Math.max(
          0,
          Math.min(
            100,
            boss.currentHP /
            boss.maxHP *
            100
          )
        )
      : 0;

  const hpBar =
    $("boss-hp-progress");

  if (hpBar) {
    hpBar.style.width =
      `${percentage}%`;
  }

  text(
    "boss-weakness-subject",
    SUBJECTS[boss.weakness] ||
    boss.weakness
  );

  text(
    "boss-weakness-multiplier",
    `×${WEAKNESS_MULTIPLIER}`
  );

  const partyCount =
    await getPartyMemberCount();

  text(
    "boss-party-count",
    `${partyCount}人`
  );

  renderBossLog(
    boss.battleLog || []
  );
}

function renderBossLog(logs) {

  const list =
    $("boss-log-list");

  if (!list) return;

  if (!logs.length) {
    list.innerHTML =
      `<p class="empty-message">まだ戦闘記録はありません。</p>`;
    return;
  }

  list.innerHTML =
    logs
      .slice()
      .reverse()
      .map(log => `
        <div class="boss-log">
          ${escapeHTML(log.message || "")}
        </div>
      `)
      .join("");
}


// =====================================================
// BOSS DAMAGE
// =====================================================

async function dealBossDamage(
  minutes,
  subject
) {

  const result =
    await getCurrentBoss();

  const boss =
    result.data;

  if (boss.defeated) {
    notify("この週のボスは撃破済み！");
    return;
  }

  let damage =
    Number(minutes);

  if (subject === boss.weakness) {
    damage *= WEAKNESS_MULTIPLIER;
  }

  const newHP =
    Math.max(
      0,
      boss.currentHP - damage
    );

  const defeated =
    newHP <= 0;

  const log = {
    message:
      `${currentProfile.displayName}が` +
      `${SUBJECTS[subject] || subject}を${minutes}分勉強！ ` +
      `${Math.floor(damage)}ダメージ！` +
      (
        subject === boss.weakness
          ? " 弱点攻撃！"
          : ""
      ),
    createdAt:
      Date.now()
  };

  const updates = {
    currentHP: newHP,
    totalDamage:
      (boss.totalDamage || 0) +
      damage,
    battleLog: [
      ...(boss.battleLog || []),
      log
    ]
  };

  if (defeated) {
    updates.defeated = true;
  }

  await updateDoc(
    result.ref,
    updates
  );

  if (defeated) {

    await updateDoc(
      doc(
        db,
        "users",
        currentUser.uid
      ),
      {
        bossesDefeated:
          (currentProfile.bossesDefeated || 0) +
          1,

        totalXP:
          (currentProfile.totalXP || 0) +
          300,

        coins:
          (currentProfile.coins || 0) +
          150
      }
    );

    notify(
      "👹 ボス撃破！！ +300 XP / +150コイン"
    );

    await reloadAndCheckProgress();

    await checkHiddenAchievements({
      type: "boss"
    });

  } else {

    notify(
      `⚔️ ${Math.floor(damage)}ダメージ！`
    );

    await renderBoss();
  }
}


// =====================================================
// PARTY
// =====================================================

async function getPartyMemberCount() {

  if (!currentProfile?.currentPartyId) {
    return 1;
  }

  const ref =
    doc(
      db,
      "parties",
      currentProfile.currentPartyId
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    return 1;
  }

  return Math.min(
    4,
    snap.data().memberIds?.length || 1
  );
}

async function renderParty() {

  const list =
    $("party-member-list");

  if (!list) return;

  if (!currentProfile.currentPartyId) {

    list.innerHTML =
      `<p class="empty-message">現在パーティーに所属していません。</p>`;

    text(
      "party-member-count",
      "0 / 4人"
    );

    return;
  }

  const ref =
    doc(
      db,
      "parties",
      currentProfile.currentPartyId
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    return;
  }

  const party =
    snap.data();

  const members =
    party.memberIds || [];

  text(
    "party-member-count",
    `${members.length} / 4人`
  );

  const cards = [];

  for (const uid of members) {

    const userSnap =
      await getDoc(
        doc(db, "users", uid)
      );

    if (!userSnap.exists()) continue;

    const user =
      userSnap.data();

    cards.push(`
      <div class="party-member-card">
        <strong>
          ${escapeHTML(user.displayName)}
        </strong>
        <span>
          Lv.${calculateLevel(user.totalXP || 0).level}
        </span>
      </div>
    `);
  }

  list.innerHTML =
    cards.join("");
}


// =====================================================
// PARTY INVITE
// =====================================================

async function inviteToParty(event) {

  event.preventDefault();

  setError("party-error", "");

  const targetUserId =
    $("party-invite-user-id").value.trim();

  if (!targetUserId) return;

  try {

    const usernameSnap =
      await getDoc(
        doc(
          db,
          "usernames",
          targetUserId.toLowerCase()
        )
      );

    if (!usernameSnap.exists()) {
      throw new Error("USER_NOT_FOUND");
    }

    const target =
      usernameSnap.data();

    if (target.uid === currentUser.uid) {
      throw new Error("SELF");
    }

    let partyId =
      currentProfile.currentPartyId;

    if (!partyId) {

      const partyRef =
        await addDoc(
          collection(db, "parties"),
          {
            leaderId:
              currentUser.uid,

            memberIds:
              [currentUser.uid],

            createdAt:
              serverTimestamp()
          }
        );

      partyId =
        partyRef.id;

      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          currentPartyId: partyId
        }
      );

      currentProfile.currentPartyId =
        partyId;
    }

    const partySnap =
      await getDoc(
        doc(db, "parties", partyId)
      );

    const party =
      partySnap.data();

    if ((party.memberIds || []).length >= 4) {
      throw new Error("FULL");
    }

    await addDoc(
      collection(
        db,
        "partyInvites"
      ),
      {
        partyId,
        fromUid:
          currentUser.uid,
        toUid:
          target.uid,
        status: "pending",
        createdAt:
          serverTimestamp()
      }
    );

    $("party-invite-form").reset();

    notify("パーティー招待を送信した！");

  } catch (error) {

    console.error(error);

    const messages = {
      USER_NOT_FOUND:
        "そのユーザーIDは存在しません。",
      SELF:
        "自分自身は招待できません。",
      FULL:
        "パーティーは最大4人です。"
    };

    setError(
      "party-error",
      messages[error.message] ||
      "招待に失敗しました。"
    );
  }
}


// =====================================================
// FRIENDS
// =====================================================

async function addFriend(event) {

  event.preventDefault();

  setError("friend-error", "");

  const targetUserId =
    $("friend-user-id").value.trim();

  if (!targetUserId) return;

  try {

    const usernameSnap =
      await getDoc(
        doc(
          db,
          "usernames",
          targetUserId.toLowerCase()
        )
      );

    if (!usernameSnap.exists()) {
      throw new Error("USER_NOT_FOUND");
    }

    const target =
      usernameSnap.data();

    if (target.uid === currentUser.uid) {
      throw new Error("SELF");
    }

    const requestId =
      `${currentUser.uid}_${target.uid}`;

    await setDoc(
      doc(
        db,
        "friendRequests",
        requestId
      ),
      {
        fromUid:
          currentUser.uid,
        toUid:
          target.uid,
        status: "pending",
        createdAt:
          serverTimestamp()
      }
    );

    $("friend-add-form").reset();

    notify("フレンド申請を送信した！");

  } catch (error) {

    console.error(error);

    setError(
      "friend-error",
      error.message === "SELF"
        ? "自分自身には申請できません。"
        : "フレンド申請に失敗しました。"
    );
  }
}


// =====================================================
// FRIEND LIST
// =====================================================

async function renderFriends() {

  const list =
    $("friend-list");

  if (!list || !currentUser) return;

  const snap =
    await getDocs(
      collection(
        db,
        "users",
        currentUser.uid,
        "friends"
      )
    );

  if (snap.empty) {
    list.innerHTML =
      `<p class="empty-message">フレンドはいません。</p>`;
    return;
  }

  const cards = [];

  for (const friend of snap.docs) {

    const uid =
      friend.id;

    const userSnap =
      await getDoc(
        doc(db, "users", uid)
      );

    if (!userSnap.exists()) continue;

    const user =
      userSnap.data();

    cards.push(`
      <div class="friend-card">
        <strong>
          ${escapeHTML(user.displayName)}
        </strong>
        <span>
          Lv.${calculateLevel(user.totalXP || 0).level}
        </span>
      </div>
    `);
  }

  list.innerHTML =
    cards.join("");
}


// =====================================================
// ACHIEVEMENTS
// =====================================================

async function renderAchievements() {

  const list =
    $("achievement-list");

  const titleList =
    $("title-list");

  if (!currentProfile) return;

  const unlocked =
    new Set(
      currentProfile.achievements || []
    );

  if (list) {

    const all =
      ACHIEVEMENTS.map(a => ({
        ...a,
        hidden: false
      }));

    const hidden =
      HIDDEN_ACHIEVEMENTS.map(a => ({
        ...a,
        hidden: true
      }));

    const achievements =
      [...all, ...hidden];

    list.innerHTML =
      achievements.map(a => {

        const isUnlocked =
          unlocked.has(a.id);

        const hidden =
          a.hidden && !isUnlocked;

        return `
          <div class="achievement-card ${
            isUnlocked ? "unlocked" : ""
          }">

            <strong>
              ${
                hidden
                  ? "？？？"
                  : escapeHTML(a.name)
              }
            </strong>

            <p>
              ${
                hidden
                  ? "隠された実績"
                  : escapeHTML(a.description)
              }
            </p>

            <small>
              ${
                isUnlocked
                  ? "⭐ 達成済み"
                  : "🔒 未達成"
              }
            </small>

          </div>
        `;

      }).join("");

    text(
      "achievement-count",
      `${unlocked.size} / ${
        ACHIEVEMENTS.length +
        HIDDEN_ACHIEVEMENTS.length
      }`
    );
  }

  if (titleList) {

    titleList.innerHTML =
      (currentProfile.titles || [])
        .map(title => `
          <div class="title-card">
            <strong>${escapeHTML(title)}</strong>
            ${
              currentProfile.title === title
                ? "<span>装備中</span>"
                : ""
            }
          </div>
        `)
        .join("");

  }
}


// =====================================================
// ACHIEVEMENT CHECK
// =====================================================

async function unlockAchievement(achievement) {

  if (
    currentProfile.achievements?.includes(
      achievement.id
    )
  ) {
    return;
  }

  const ref =
    doc(
      db,
      "users",
      currentUser.uid
    );

  const achievements =
    [
      ...(currentProfile.achievements || []),
      achievement.id
    ];

  const titles =
    [
      ...(currentProfile.titles || [])
    ];

  await updateDoc(
    ref,
    {
      achievements,
      titles,
      totalXP:
        (currentProfile.totalXP || 0) +
        achievement.rewardXP,

      coins:
        (currentProfile.coins || 0) +
        achievement.rewardCoins,

      updatedAt:
        serverTimestamp()
    }
  );

  currentProfile.achievements =
    achievements;

  currentProfile.totalXP +=
    achievement.rewardXP;

  currentProfile.coins +=
    achievement.rewardCoins;

  text(
    "achievement-unlock-name",
    achievement.name
  );

  text(
    "achievement-unlock-description",
    `${achievement.description}\n+${achievement.rewardXP} XP / +${achievement.rewardCoins}コイン`
  );

  show("achievement-unlock-modal");

  await renderAchievements();
}


// =====================================================
// HIDDEN ACHIEVEMENT CHECK
// =====================================================

async function checkHiddenAchievements(context) {

  if (!currentProfile) return;

  const unlocked =
    new Set(
      currentProfile.achievements || []
    );

  if (
    context.type === "study"
  ) {

    const now =
      new Date();

    if (
      now.getHours() >= 0 &&
      now.getHours() < 5
    ) {
      await tryHidden("hidden_01");
    }

    const todayMinutes =
      await getTodayMinutes();

    if (todayMinutes >= 180) {
      await tryHidden("hidden_02");
    }

    if (todayMinutes >= 300) {
      await tryHidden("hidden_03");
    }

    const records =
      await getTodayRecordCount();

    if (records >= 5) {
      await tryHidden("hidden_05");
    }

    const subjects =
      await getTodaySubjects();

    if (subjects.size >= 5) {
      await tryHidden("hidden_07");
    }

    if (
      subjects.size ===
      (currentProfile.subjects || []).length &&
      currentProfile.subjects.length > 0
    ) {
      await tryHidden("hidden_08");
    }

    if (
      currentProfile.totalStudyMinutes >=
      100 * 60
    ) {
      await tryHidden("hidden_09");
    }
  }

  if (context.type === "boss") {

    if (
      (currentProfile.bossesDefeated || 0) >= 10
    ) {
      await tryHidden("hidden_06");
    }
  }

  if (context.type === "rebirth") {
    await tryHidden("hidden_10");
  }
}

async function tryHidden(id) {

  const achievement =
    HIDDEN_ACHIEVEMENTS.find(
      a => a.id === id
    );

  if (!achievement) return;

  if (
    currentProfile.achievements?.includes(id)
  ) return;

  await unlockAchievement(
    achievement
  );
}

async function getTodayRecordCount() {

  const q =
    query(
      collection(
        db,
        "users",
        currentUser.uid,
        "studyRecords"
      ),
      where(
        "dateKey",
        "==",
        localDateKey()
      )
    );

  const snap =
    await getDocs(q);

  return snap.size;
}

async function getTodaySubjects() {

  const q =
    query(
      collection(
        db,
        "users",
        currentUser.uid,
        "studyRecords"
      ),
      where(
        "dateKey",
        "==",
        localDateKey()
      )
    );

  const snap =
    await getDocs(q);

  const set =
    new Set();

  snap.forEach(docSnap => {
    const data =
      docSnap.data();

    if (data.subject) {
      set.add(data.subject);
    }
  });

  return set;
}


// =====================================================
// REBIRTH
// =====================================================

async function checkLevelAndRebirth() {

  const level =
    calculateLevel(
      currentProfile.totalXP || 0
    );

  if (level.level < 101) return;

  const newStars =
    (currentProfile.stars || 0) + 1;

  await updateDoc(
    doc(
      db,
      "users",
      currentUser.uid
    ),
    {
      totalXP: 0,
      stars: newStars,
      updatedAt:
        serverTimestamp()
    }
  );

  currentProfile.totalXP = 0;
  currentProfile.stars = newStars;

  await checkHiddenAchievements({
    type: "rebirth"
  });

  notify(
    `🌟 転生！ ⭐${newStars} に到達！`
  );
}


// =====================================================
// RELOAD / PROGRESS
// =====================================================

async function reloadAndCheckProgress() {

  const oldLevel =
    calculateLevel(
      currentProfile.totalXP || 0
    ).level;

  const oldRank =
    calculateRank(
      currentProfile.seasonStudyMinutes || 0
    );

  await loadProfile();

  const newLevel =
    calculateLevel(
      currentProfile.totalXP || 0
    ).level;

  if (
    newLevel > oldLevel &&
    newLevel <= 100
  ) {

    text(
      "level-up-old-level",
      oldLevel
    );

    text(
      "level-up-new-level",
      newLevel
    );

    show("level-up-modal");
  }

  await checkLevelAndRebirth();

  const newRank =
    calculateRank(
      currentProfile.seasonStudyMinutes || 0
    );

  if (
    newRank.key !== oldRank.key
  ) {

    notify(
      `🏆 ランクアップ！ ${newRank.name}`
    );
  }
}


// =====================================================
// SHOP
// =====================================================

function renderShop() {

  renderShopList(
    "shop-item-list",
    SHOP_ITEMS,
    "item"
  );

  renderShopList(
    "shop-title-list",
    SHOP_TITLES,
    "title"
  );

  renderShopList(
    "shop-outfit-list",
    SHOP_OUTFITS,
    "outfit"
  );

  text(
    "shop-coins",
    `🪙 ${currentProfile?.coins || 0}`
  );
}

function renderShopList(
  elementId,
  items,
  type
) {

  const list =
    $(elementId);

  if (!list) return;

  list.innerHTML =
    items.map(item => `
      <div class="shop-card">

        <h4>
          ${escapeHTML(item.name)}
        </h4>

        ${
          item.description
            ? `<p>${escapeHTML(item.description)}</p>`
            : ""
        }

        <strong>
          🪙 ${item.price}
        </strong>

        <button
          type="button"
          class="shop-buy-button"
          data-type="${type}"
          data-id="${item.id}"
        >
          購入
        </button>

      </div>
    `).join("");

  list
    .querySelectorAll(".shop-buy-button")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const item =
            items.find(
              x =>
                x.id ===
                button.dataset.id
            );

          if (!item) return;

          selectedPurchase = {
            ...item,
            type
          };

          text(
            "purchase-item-name",
            item.name
          );

          text(
            "purchase-price",
            item.price
          );

          show("purchase-modal");
        }
      );
    });
}

async function purchaseSelected() {

  if (!selectedPurchase) return;

  const item =
    selectedPurchase;

  if (
    (currentProfile.coins || 0) <
    item.price
  ) {
    notify("コインが足りません。");
    return;
  }

  const ref =
    doc(
      db,
      "users",
      currentUser.uid
    );

  if (item.type === "title") {

    const titles =
      [
        ...(currentProfile.titles || [])
      ];

    if (!titles.includes(item.name)) {
      titles.push(item.name);
    }

    await updateDoc(
      ref,
      {
        coins:
          currentProfile.coins -
          item.price,
        titles
      }
    );

    currentProfile.coins -=
      item.price;

    currentProfile.titles =
      titles;

  } else if (item.type === "outfit") {

    const items =
      [
        ...(currentProfile.items || [])
      ];

    if (!items.includes(item.id)) {
      items.push(item.id);
    }

    await updateDoc(
      ref,
      {
        coins:
          currentProfile.coins -
          item.price,
        items
      }
    );

    currentProfile.coins -=
      item.price;

    currentProfile.items =
      items;

  } else {

    const items =
      [
        ...(currentProfile.items || [])
      ];

    items.push(item.id);

    await updateDoc(
      ref,
      {
        coins:
          currentProfile.coins -
          item.price,
        items
      }
    );

    currentProfile.coins -=
      item.price;

    currentProfile.items =
      items;
  }

  hide("purchase-modal");

  selectedPurchase = null;

  notify("購入しました！");

  renderShop();
  renderLocker();
}


// =====================================================
// LOCKER
// =====================================================

function renderLocker() {

  const titleList =
    $("locker-title-list");

  const itemList =
    $("locker-item-list");

  const outfitList =
    $("locker-outfit-list");

  if (titleList) {

    titleList.innerHTML =
      (currentProfile.titles || [])
        .map(title => `
          <div class="locker-card">
            <strong>${escapeHTML(title)}</strong>
            <button
              type="button"
              data-title="${escapeHTML(title)}"
              class="equip-title-button"
            >
              ${
                currentProfile.title === title
                  ? "装備中"
                  : "装備"
              }
            </button>
          </div>
        `)
        .join("");

    titleList
      .querySelectorAll(
        ".equip-title-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () =>
            equipTitle(
              button.dataset.title
            )
        );

      });
  }

  if (itemList) {

    const owned =
      currentProfile.items || [];

    itemList.innerHTML =
      owned.length
        ? owned.map(id => {

            const item =
              SHOP_ITEMS.find(
                x => x.id === id
              );

            return `
              <div class="locker-card">
                <strong>
                  ${escapeHTML(
                    item?.name || id
                  )}
                </strong>
              </div>
            `;
          }).join("")
        : `<p class="empty-message">アイテムがありません。</p>`;
  }

  if (outfitList) {

    const owned =
      currentProfile.items || [];

    const outfits =
      SHOP_OUTFITS.filter(
        outfit =>
          outfit.price === 0 ||
          owned.includes(outfit.id)
      );

    outfitList.innerHTML =
      outfits.map(outfit => `
        <div class="locker-card">
          <strong>
            ${escapeHTML(outfit.name)}
          </strong>

          <button
            type="button"
            class="equip-outfit-button"
            data-outfit="${outfit.id}"
          >
            ${
              currentProfile.equippedOutfit ===
              outfit.id
                ? "装備中"
                : "装備"
            }
          </button>
        </div>
      `).join("");

    outfitList
      .querySelectorAll(
        ".equip-outfit-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () =>
            equipOutfit(
              button.dataset.outfit
            )
        );

      });
  }
}

async function equipTitle(title) {

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      title
    }
  );

  currentProfile.title =
    title;

  notify(
    `称号「${title}」を装備！`
  );

  renderProfile();
  renderHome();
  renderLocker();
}

async function equipOutfit(outfit) {

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      equippedOutfit: outfit
    }
  );

  currentProfile.equippedOutfit =
    outfit;

  notify("着せ替えを変更しました！");

  renderLocker();
}


// =====================================================
// SETTINGS
// =====================================================

function renderSettings() {

  const input =
    $("settings-display-name");

  if (input) {
    input.value =
      currentProfile.displayName || "";
  }

  const container =
    $("settings-subject-selection");

  if (!container) return;

  container.innerHTML =
    Object.entries(SUBJECTS)
      .map(([key, name]) => `
        <label>
          <input
            type="checkbox"
            name="settings-subject"
            value="${key}"
            ${
              currentProfile.subjects?.includes(key)
                ? "checked"
                : ""
            }
          >
          ${name}
        </label>
      `)
      .join("");
}

async function changeDisplayName(event) {

  event.preventDefault();

  setError(
    "display-name-error",
    ""
  );

  const name =
    $("settings-display-name")
      .value.trim();

  if (!name) {
    setError(
      "display-name-error",
      "表示名を入力してください。"
    );
    return;
  }

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      displayName: name
    }
  );

  currentProfile.displayName =
    name;

  notify("表示名を変更しました。");

  renderHeader();
  renderProfile();
}

async function changeSubjects(event) {

  event.preventDefault();

  setError(
    "settings-subject-error",
    ""
  );

  const subjects =
    [
      ...document.querySelectorAll(
        'input[name="settings-subject"]:checked'
      )
    ].map(
      input => input.value
    );

  if (!subjects.length) {
    setError(
      "settings-subject-error",
      "最低1教科は選択してください。"
    );
    return;
  }

  await updateDoc(
    doc(db, "users", currentUser.uid),
    {
      subjects
    }
  );

  currentProfile.subjects =
    subjects;

  notify("受験教科を更新しました。");

  populateSubjectSelects();
  renderSubjectLevels();
}

async function changePassword(event) {

  event.preventDefault();

  setError(
    "password-error",
    ""
  );

  const password =
    $("settings-new-password")
      .value;

  if (password.length < 6) {
    setError(
      "password-error",
      "6文字以上にしてください。"
    );
    return;
  }

  try {

    await updatePassword(
      currentUser,
      password
    );

    $("password-form").reset();

    notify("パスワードを変更しました。");

  } catch (error) {

    console.error(error);

    setError(
      "password-error",
      "再ログイン後にもう一度お試しください。"
    );
  }
}


// =====================================================
// ACCOUNT DELETE
// =====================================================

async function deleteAccount() {

  if (!currentUser) return;

  const confirmed =
    confirm(
      "本当にアカウントを削除しますか？"
    );

  if (!confirmed) return;

  try {

    await deleteUser(
      currentUser
    );

  } catch (error) {

    console.error(error);

    notify(
      "削除には再ログインが必要な場合があります。"
    );
  }
}


// =====================================================
// NAVIGATION
// =====================================================

function initNavigation() {

  document
    .querySelectorAll(".nav-button")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const screen =
            button.dataset.screen;

          switchScreen(screen);

        }
      );
    });

  document
    .querySelectorAll(".menu-card")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const screen =
            button.dataset.menuScreen;

          switchScreen(screen);

        }
      );
    });
}

function switchScreen(screenId) {

  if (currentScreen === screenId) {
    return;
  }

  const previous =
    $(currentScreen);

  const next =
    $(screenId);

  if (!next) return;

  currentScreen =
    screenId;

  document
    .querySelectorAll(".app-screen")
    .forEach(screen => {
      screen.classList.add("hidden");
    });

  next.classList.remove("hidden");

  next.classList.remove(
    "screen-enter"
  );

  void next.offsetWidth;

  next.classList.add(
    "screen-enter"
  );

  document
    .querySelectorAll(".nav-button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.screen ===
        screenId
      );

    });

  if (
    screenId === "party-screen"
  ) {
    renderParty();
    renderFriends();
  }

  if (
    screenId === "quest-screen"
  ) {
    renderQuest();
  }

  if (
    screenId === "rank-screen"
  ) {
    renderRank();
  }

  if (
    screenId === "achievement-screen"
  ) {
    renderAchievements();
  }
}


// =====================================================
// TAB SYSTEM
// =====================================================

function initTabs() {

  initGenericTabs(
    ".party-tab",
    ".party-tab-content",
    "data-party-tab"
  );

  initGenericTabs(
    ".rank-tab",
    ".rank-tab-content",
    "data-rank-tab"
  );

  initGenericTabs(
    ".achievement-tab",
    ".achievement-tab-content",
    "data-achievement-tab"
  );

  initGenericTabs(
    ".shop-tab",
    ".shop-tab-content",
    "data-shop-tab"
  );

  initGenericTabs(
    ".locker-tab",
    ".locker-tab-content",
    "data-locker-tab"
  );

  initGenericTabs(
    ".ranking-type-tab",
    ".ranking-content",
    "data-ranking-type",
    true
  );
}

function initGenericTabs(
  buttonsSelector,
  contentSelector,
  dataAttribute,
  special = false
) {

  document
    .querySelectorAll(buttonsSelector)
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(buttonsSelector)
            .forEach(b =>
              b.classList.remove("active")
            );

          button.classList.add("active");

          const target =
            button.getAttribute(
              dataAttribute
            );

          if (
            special &&
            dataAttribute ===
            "data-ranking-type"
          ) {

            document
              .querySelectorAll(
                ".ranking-content"
              )
              .forEach(content =>
                content.classList.add("hidden")
              );

            if (target === "friends") {
              show("friends-ranking");
            } else {
              show("global-ranking");
              renderGlobalRanking();
            }

            return;
          }

          document
            .querySelectorAll(contentSelector)
            .forEach(content => {

              content.classList.toggle(
                "hidden",
                content.id !== target
              );

            });

        }
      );
    });
}


// =====================================================
// RANKING
// =====================================================

async function renderGlobalRanking() {

  const list =
    $("global-ranking-list");

  if (!list) return;

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

    const snap =
      await getDocs(q);

    let index = 0;

    list.innerHTML =
      snap.docs.map(docSnap => {

        index++;

        const user =
          docSnap.data();

        return `
          <div class="ranking-card">
            <span>#${index}</span>
            <strong>
              ${escapeHTML(
                user.displayName
              )}
            </strong>
            <span>
              ${
                (
                  user.seasonStudyMinutes ||
                  0
                ) / 60
              .toFixed(1)
              }時間
            </span>
          </div>
        `;

      }).join("");

  } catch (error) {

    console.error(error);

    list.innerHTML =
      `<p class="empty-message">ランキングを読み込めませんでした。</p>`;
  }
}


// =====================================================
// MODALS
// =====================================================

function initModals() {

  $("level-up-close-button")
    ?.addEventListener(
      "click",
      () =>
        hide("level-up-modal")
    );

  $("achievement-unlock-close-button")
    ?.addEventListener(
      "click",
      () =>
        hide("achievement-unlock-modal")
    );

  $("purchase-cancel-button")
    ?.addEventListener(
      "click",
      () => {
        selectedPurchase = null;
        hide("purchase-modal");
      }
    );

  $("purchase-confirm-button")
    ?.addEventListener(
      "click",
      purchaseSelected
    );

  $("boss-refresh-button")
    ?.addEventListener(
      "click",
      renderBoss
    );
}


// =====================================================
// SETTINGS EVENTS
// =====================================================

function initSettings() {

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
}


// =====================================================
// PARTY / FRIEND EVENTS
// =====================================================

function initPartyAndFriends() {

  $("party-invite-form")
    ?.addEventListener(
      "submit",
      inviteToParty
    );

  $("friend-add-form")
    ?.addEventListener(
      "submit",
      addFriend
    );
}


// =====================================================
// ESCAPE
// =====================================================

function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =====================================================
// FIREBASE AUTH STATE
// =====================================================

onAuthStateChanged(
  auth,
  async user => {

    if (user) {

      currentUser =
        user;

      hide("auth-screen");
      show("main-app");

      try {

        await loadProfile();

      } catch (error) {

        console.error(
          "Initialization error:",
          error
        );

        notify(
          "データの読み込みに失敗しました。"
        );
      }

    } else {

      currentUser = null;
      currentProfile = null;

      hide("main-app");
      show("auth-screen");

      hide("register-screen");
      show("login-screen");
    }

  }
);


// =====================================================
// INITIALIZATION
// =====================================================

function init() {

  initAuthUI();

  initNavigation();

  initTabs();

  initStudyForm();

  initSettings();

  initPartyAndFriends();

  initModals();

  updateTimerDisplay();

}

init();
