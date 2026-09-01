// ============================================================
// 受験RPG - COMPLETE SCRIPT
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

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
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction
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
const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// CONSTANTS
// ============================================================

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
// ★ 1か月シーズン
// ============================================================

const RANKS = [
  {
    name: "Bronze",
    minMinutes: 0
  },
  {
    name: "Silver",
    minMinutes: 10 * 60
  },
  {
    name: "Gold",
    minMinutes: 20 * 60
  },
  {
    name: "Platinum",
    minMinutes: 35 * 60
  },
  {
    name: "Diamond",
    minMinutes: 50 * 60
  },
  {
    name: "Master",
    minMinutes: 70 * 60
  },
  {
    name: "Grandmaster",
    minMinutes: 100 * 60
  },
  {
    name: "Legend",
    minMinutes: 150 * 60
  }
];


// ============================================================
// LEVEL SYSTEM
//
// 1〜100を1周。
// 100到達で ★ +1、Lv.1へ。
// ★は「100を超えた数」ではなく周回数。
// ============================================================

const MAX_LEVEL = 100;

// 各10Lv帯で1Lvに必要なXP
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


// 1周に必要なXP
function xpForFullCycle() {
  let total = 0;

  for (let level = 1; level <= 99; level++) {
    total += xpPerLevel(level);
  }

  return total;
}

const FULL_CYCLE_XP = xpForFullCycle();


// 累積XP → 周回数 / Lv / 現在XP
function calculateLevel(totalXP) {
  totalXP = Math.max(0, Math.floor(Number(totalXP) || 0));

  let stars = Math.floor(totalXP / FULL_CYCLE_XP);
  let remainingXP = totalXP % FULL_CYCLE_XP;

  let level = 1;

  for (let lv = 1; lv <= 99; lv++) {
    const required = xpPerLevel(lv);

    if (remainingXP < required) {
      level = lv;
      break;
    }

    remainingXP -= required;
    level = lv + 1;
  }

  // 1周ちょうど到達した場合
  if (remainingXP === 0 && totalXP > 0) {
    const exactCycle =
      totalXP % FULL_CYCLE_XP === 0;

    if (exactCycle) {
      stars = Math.max(1, stars);
      level = 1;
      remainingXP = 0;
    }
  }

  const required =
    level >= MAX_LEVEL
      ? xpPerLevel(99)
      : xpPerLevel(level);

  return {
    level,
    stars,
    xpInLevel: remainingXP,
    xpRequired: required,
    totalXP
  };
}


// ============================================================
// SEASON
// ============================================================

function getSeasonId(date = new Date()) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
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
    1,
    0,
    0,
    0,
    0
  );
}

function getSeasonRemainingText() {
  const now = new Date();
  const end = getSeasonEnd(now);
  const ms = Math.max(0, end - now);

  const days = Math.floor(
    ms / 86400000
  );

  const hours = Math.floor(
    (ms % 86400000) / 3600000
  );

  return `${days}日 ${hours}時間`;
}


// ============================================================
// BOSS
// ============================================================

const BOSS_POOL = [
  {
    name: "受験の魔王",
    level: 1,
    baseHP: 500
  },
  {
    name: "赤点の巨人",
    level: 2,
    baseHP: 700
  },
  {
    name: "偏差値の亡霊",
    level: 3,
    baseHP: 900
  },
  {
    name: "模試の破壊神",
    level: 4,
    baseHP: 1200
  },
  {
    name: "共通テストの覇者",
    level: 5,
    baseHP: 1600
  },
  {
    name: "二次試験の魔神",
    level: 6,
    baseHP: 2200
  }
];

const WEAKNESS_MULTIPLIER = 1.5;


// ============================================================
// QUESTS
// ============================================================

const DAILY_QUESTS = [
  {
    id: "daily-study-30",
    name: "30分の修行",
    description: "30分以上勉強する",
    type: "study",
    target: 30,
    rewardXP: 30,
    rewardCoins: 15
  },
  {
    id: "daily-memory-15",
    name: "記憶の鍛錬",
    description: "暗記系の勉強を15分以上行う",
    type: "memory",
    target: 15,
    rewardXP: 20,
    rewardCoins: 10
  },
  {
    id: "daily-study-60",
    name: "一時間の冒険",
    description: "合計60分以上勉強する",
    type: "study",
    target: 60,
    rewardXP: 60,
    rewardCoins: 30
  }
];

const WEEKLY_QUESTS = [
  {
    id: "weekly-study-300",
    name: "週間修行",
    description: "1週間で300分勉強する",
    type: "study",
    target: 300,
    rewardXP: 150,
    rewardCoins: 100
  },
  {
    id: "weekly-study-600",
    name: "週間猛者",
    description: "1週間で600分勉強する",
    type: "study",
    target: 600,
    rewardXP: 300,
    rewardCoins: 200
  }
];

const RARE_QUEST = {
  id: "rare-three-hours",
  name: "限界突破",
  description: "1日に180分以上勉強する",
  type: "study",
  target: 180,
  rewardXP: 150,
  rewardCoins: 100
};


// ============================================================
// ACHIEVEMENTS
// ============================================================

const ACHIEVEMENTS = [
  {
    id: "first-study",
    name: "最初の一歩",
    description: "初めて勉強を記録する",
    check: stats => stats.totalMinutes >= 1
  },
  {
    id: "study-60",
    name: "一時間突破",
    description: "累計1時間勉強する",
    check: stats => stats.totalMinutes >= 60
  },
  {
    id: "study-600",
    name: "十時間突破",
    description: "累計10時間勉強する",
    check: stats => stats.totalMinutes >= 600
  },
  {
    id: "study-3000",
    name: "五十時間突破",
    description: "累計50時間勉強する",
    check: stats => stats.totalMinutes >= 3000
  },
  {
    id: "study-6000",
    name: "百時間突破",
    description: "累計100時間勉強する",
    check: stats => stats.totalMinutes >= 6000
  },
  {
    id: "level-10",
    name: "駆け出し冒険者",
    description: "Lv.10に到達する",
    check: stats => stats.level >= 10
  },
  {
    id: "level-50",
    name: "熟練冒険者",
    description: "Lv.50に到達する",
    check: stats => stats.level >= 50
  },
  {
    id: "level-100",
    name: "一周目クリア",
    description: "Lv.100に到達する",
    check: stats => stats.stars >= 1
  },
  {
    id: "legend",
    name: "伝説",
    description: "Legendランクに到達する",
    check: stats.rank === "Legend"
  },
  {
    id: "boss-first",
    name: "初討伐",
    description: "ボスを1体撃破する",
    check: stats.bossesDefeated >= 1
  }
];


// ============================================================
// STATE
// ============================================================

const state = {
  user: null,
  profile: null,
  subjects: [],
  studyRecords: [],
  questCompletions: [],
  seasonStats: null,
  party: null,
  invitations: [],
  friends: [],
  boss: null,

  timer: {
    seconds: 0,
    interval: null,
    running: false,
    startedAt: null
  }
};


// ============================================================
// UTILITIES
// ============================================================

const $ = id =>
  document.getElementById(id);

function show(id) {
  const el = $(id);
  if (el) {
    el.classList.remove("hidden");
  }
}

function hide(id) {
  const el = $(id);
  if (el) {
    el.classList.add("hidden");
  }
}

function error(id, message) {
  const el = $(id);

  if (el) {
    el.textContent = message || "";
  }
}

function notify(message) {
  const el = $("notification");

  if (!el) return;

  el.textContent = message;
  el.classList.remove("hidden");

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMinutes(minutes) {
  minutes = Math.max(
    0,
    Math.floor(Number(minutes) || 0)
  );

  const hours = Math.floor(
    minutes / 60
  );

  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}時間 ${mins}分`;
  }

  return `${mins}分`;
}

function formatDate(date) {
  if (!date) return "-";

  const d =
    date instanceof Date
      ? date
      : new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "-";
  }

  return d.toLocaleDateString(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }
  );
}

function formatDateTime(date) {
  if (!date) return "-";

  const d =
    date instanceof Date
      ? date
      : new Date(date);

  return d.toLocaleString(
    "ja-JP"
  );
}

function startOfDay(date = new Date()) {
  const d = new Date(date);

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;
}

function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();

  const diff =
    day === 0
      ? 6
      : day - 1;

  d.setDate(
    d.getDate() - diff
  );

  return d;
}

function getTimestampDate(value) {
  if (!value) return null;

  if (
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  return new Date(value);
}


// ============================================================
// FIRESTORE REFERENCES
// ============================================================

function userRef() {
  return doc(
    db,
    "users",
    state.user.uid
  );
}

function studyCollection() {
  return collection(
    db,
    "users",
    state.user.uid,
    "studyRecords"
  );
}

function questCollection() {
  return collection(
    db,
    "users",
    state.user.uid,
    "questCompletions"
  );
}

function achievementCollection() {
  return collection(
    db,
    "users",
    state.user.uid,
    "achievements"
  );
}


// ============================================================
// AUTH
// ============================================================

function usernameEmail(userId) {
  return `${userId
    .trim()
    .toLowerCase()}@juken-rpg.local`;
}

async function register({
  userId,
  password,
  passwordConfirm,
  displayName,
  course,
  subjects
}) {
  userId = userId.trim();
  displayName = displayName.trim();

  if (!/^[A-Za-z0-9_-]{3,30}$/.test(userId)) {
    throw new Error(
      "ユーザーIDは3〜30文字の英数字・_・-のみ使用できます。"
    );
  }

  if (password.length < 6) {
    throw new Error(
      "パスワードは6文字以上です。"
    );
  }

  if (password !== passwordConfirm) {
    throw new Error(
      "パスワードが一致していません。"
    );
  }

  if (!displayName) {
    throw new Error(
      "表示名を入力してください。"
    );
  }

  if (!course) {
    throw new Error(
      "文理を選択してください。"
    );
  }

  if (!subjects || subjects.length === 0) {
    throw new Error(
      "受験教科を1つ以上選択してください。"
    );
  }

  const email =
    usernameEmail(userId);

  const credential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  await setDoc(
    doc(
      db,
      "users",
      credential.user.uid
    ),
    {
      uid: credential.user.uid,
      userId,
      displayName,
      course,
      subjects,

      totalXP: 0,
      stars: 0,
      coins: 0,

      totalStudyMinutes: 0,
      totalQuestsCompleted: 0,
      totalBossesDefeated: 0,

      currentTitle: "無名の冒険者",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  );
}

async function login(
  userId,
  password
) {
  const email =
    usernameEmail(
      userId.trim()
    );

  await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
}


// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {
  const snap =
    await getDoc(userRef());

  if (!snap.exists()) {
    throw new Error(
      "プロフィールが見つかりません。"
    );
  }

  state.profile = {
    id: snap.id,
    ...snap.data()
  };
}

async function loadSubjects() {
  state.subjects =
    state.profile?.subjects || [];
}

async function saveProfile(data) {
  await updateDoc(
    userRef(),
    {
      ...data,
      updatedAt: serverTimestamp()
    }
  );

  Object.assign(
    state.profile,
    data
  );
}

async function changeDisplayName(name) {
  name = name.trim();

  if (!name) {
    throw new Error(
      "表示名を入力してください。"
    );
  }

  if (name.length > 30) {
    throw new Error(
      "表示名は30文字以内です。"
    );
  }

  await saveProfile({
    displayName: name
  });

  refreshProfile();
  refreshHome();

  notify(
    "表示名を変更しました！"
  );
}

async function changeSubjects(subjects) {
  if (!subjects.length) {
    throw new Error(
      "教科を1つ以上選択してください。"
    );
  }

  await saveProfile({
    subjects
  });

  state.subjects = subjects;

  populateSubjectSelects();
  refreshProfile();

  notify(
    "受験教科を変更しました！"
  );
}


// ============================================================
// STUDY
// ============================================================

async function loadStudyRecords() {
  const q = query(
    studyCollection(),
    orderBy(
      "createdAt",
      "desc"
    ),
    limit(300)
  );

  const snap =
    await getDocs(q);

  state.studyRecords =
    snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
}

function getStudyMinutesForDay(
  date = new Date()
) {
  const start =
    startOfDay(date);

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 1
  );

  return state.studyRecords
    .filter(record => {
      const d =
        getTimestampDate(
          record.createdAt
        );

      return (
        d &&
        d >= start &&
        d < end
      );
    })
    .reduce(
      (sum, record) =>
        sum +
        Number(record.minutes || 0),
      0
    );
}

function getStudyMinutesForWeek() {
  const start =
    startOfWeek();

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 7
  );

  return state.studyRecords
    .filter(record => {
      const d =
        getTimestampDate(
          record.createdAt
        );

      return (
        d &&
        d >= start &&
        d < end
      );
    })
    .reduce(
      (sum, record) =>
        sum +
        Number(record.minutes || 0),
      0
    );
}

function getSeasonStudyMinutes() {
  const start =
    getSeasonStart();

  const end =
    getSeasonEnd();

  return state.studyRecords
    .filter(record => {
      const d =
        getTimestampDate(
          record.createdAt
        );

      return (
        d &&
        d >= start &&
        d < end
      );
    })
    .reduce(
      (sum, record) =>
        sum +
        Number(record.minutes || 0),
      0
    );
}

function getTotalStudyMinutes() {
  return state.studyRecords.reduce(
    (sum, record) =>
      sum +
      Number(record.minutes || 0),
    0
  );
}

function getRankFromMinutes(minutes) {
  let current =
    RANKS[0].name;

  for (const rank of RANKS) {
    if (minutes >= rank.minMinutes) {
      current = rank.name;
    }
  }

  return current;
}

async function recordStudy(
  subject,
  minutes,
  note = "",
  source = "manual"
) {
  minutes =
    Math.floor(
      Number(minutes)
    );

  if (!subject) {
    throw new Error(
      "教科を選択してください。"
    );
  }

  if (
    !state.subjects.includes(subject)
  ) {
    throw new Error(
      "登録されていない教科です。"
    );
  }

  if (
    !Number.isFinite(minutes) ||
    minutes < 1 ||
    minutes > 1440
  ) {
    throw new Error(
      "勉強時間は1〜1440分で入力してください。"
    );
  }

  const oldXP =
    Number(
      state.profile.totalXP || 0
    );

  const oldLevel =
    calculateLevel(oldXP);

  const newXP =
    oldXP + minutes;

  const newLevel =
    calculateLevel(newXP);

  const starGained =
    newLevel.stars -
    oldLevel.stars;

  await addDoc(
    studyCollection(),
    {
      subject,
      minutes,
      note: String(note || "").slice(
        0,
        500
      ),
      source,
      createdAt:
        serverTimestamp()
    }
  );

  await saveProfile({
    totalXP: newXP,
    totalStudyMinutes:
      Number(
        state.profile.totalStudyMinutes || 0
      ) + minutes
  });

  await loadStudyRecords();

  if (newLevel.level !== oldLevel.level) {
    showLevelUp(
      oldLevel,
      newLevel
    );
  }

  if (starGained > 0) {
    notify(
      `⭐ 周回達成！ 星が${starGained}個増えました！`
    );
  }

  await checkAchievements();

  refreshAll();
}

async function saveTimer() {
  if (state.timer.seconds < 60) {
    notify(
      "記録するには1分以上必要です。"
    );
    return;
  }

  const minutes =
    Math.floor(
      state.timer.seconds / 60
    );

  const subject =
    $("study-subject")?.value;

  if (!subject) {
    notify(
      "教科を選択してください。"
    );
    return;
  }

  await recordStudy(
    subject,
    minutes,
    "タイマー記録",
    "timer"
  );

  resetTimer();

  notify(
    `${minutes}分の勉強を記録しました！`
  );
}


// ============================================================
// TIMER
// ============================================================

function updateTimerDisplay() {
  const el =
    $("study-timer-display");

  if (!el) return;

  const total =
    state.timer.seconds;

  const hours =
    Math.floor(
      total / 3600
    );

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
  if (state.timer.running) return;

  state.timer.running = true;
  state.timer.startedAt =
    Date.now();

  state.timer.interval =
    setInterval(() => {
      state.timer.seconds++;
      updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
  if (!state.timer.running) return;

  clearInterval(
    state.timer.interval
  );

  state.timer.interval = null;
  state.timer.running = false;
}

function resetTimer() {
  clearInterval(
    state.timer.interval
  );

  state.timer.interval = null;
  state.timer.running = false;
  state.timer.seconds = 0;
  state.timer.startedAt = null;

  updateTimerDisplay();
}


// ============================================================
// QUEST
// ============================================================

async function loadQuestCompletions() {
  const q = query(
    questCollection(),
    orderBy(
      "completedAt",
      "desc"
    ),
    limit(300)
  );

  const snap =
    await getDocs(q);

  state.questCompletions =
    snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
}

function questCompletedToday(id) {
  const today =
    startOfDay();

  return state.questCompletions.some(
    completion => {
      if (
        completion.questId !== id
      ) {
        return false;
      }

      const d =
        getTimestampDate(
          completion.completedAt
        );

      return (
        d &&
        d >= today
      );
    }
  );
}

function questCompletedThisWeek(id) {
  const start =
    startOfWeek();

  return state.questCompletions.some(
    completion => {
      if (
        completion.questId !== id
      ) {
        return false;
      }

      const d =
        getTimestampDate(
          completion.completedAt
        );

      return (
        d &&
        d >= start
      );
    }
  );
}

function getQuestProgress(quest) {
  if (quest.type === "study") {
    if (
      quest.id.startsWith("weekly")
    ) {
      return getStudyMinutesForWeek();
    }

    return getStudyMinutesForDay();
  }

  if (quest.type === "memory") {
    return state.studyRecords
      .filter(record => {
        const d =
          getTimestampDate(
            record.createdAt
          );

        return (
          d &&
          d >= startOfDay() &&
          record.subject === "english"
        );
      })
      .reduce(
        (sum, r) =>
          sum +
          Number(r.minutes || 0),
        0
      );
  }

  return 0;
}

async function completeQuest(
  quest
) {
  const isWeekly =
    quest.id.startsWith(
      "weekly"
    );

  const already =
    isWeekly
      ? questCompletedThisWeek(
          quest.id
        )
      : questCompletedToday(
          quest.id
        );

  if (already) return;

  const progress =
    getQuestProgress(quest);

  if (
    progress < quest.target
  ) {
    return;
  }

  await addDoc(
    questCollection(),
    {
      questId: quest.id,
      questName: quest.name,
      rewardXP: quest.rewardXP,
      rewardCoins:
        quest.rewardCoins,
      completedAt:
        serverTimestamp()
    }
  );

  await saveProfile({
    totalXP:
      Number(
        state.profile.totalXP || 0
      ) + quest.rewardXP,

    coins:
      Number(
        state.profile.coins || 0
      ) + quest.rewardCoins,

    totalQuestsCompleted:
      Number(
        state.profile
          .totalQuestsCompleted || 0
      ) + 1
  });

  notify(
    `クエスト達成！ +${quest.rewardXP} XP / 🪙${quest.rewardCoins}`
  );
}

async function autoCompleteQuests() {
  for (const quest of DAILY_QUESTS) {
    await completeQuest(
      quest
    );
  }

  for (const quest of WEEKLY_QUESTS) {
    await completeQuest(
      quest
    );
  }

  await completeQuest(
    RARE_QUEST
  );

  await loadQuestCompletions();
}


// ============================================================
// QUEST RENDER
// ============================================================

function renderQuestList(
  elementId,
  quests,
  weekly = false
) {
  const container =
    $(elementId);

  if (!container) return;

  container.innerHTML =
    quests.map(quest => {
      const progress =
        getQuestProgress(
          quest
        );

      const completed =
        weekly
          ? questCompletedThisWeek(
              quest.id
            )
          : questCompletedToday(
              quest.id
            );

      const percent =
        Math.min(
          100,
          Math.round(
            progress /
              quest.target *
              100
          )
        );

      return `
        <article class="quest-card ${
          completed
            ? "completed"
            : ""
        }">

          <div>
            <h4>
              ${escapeHtml(
                quest.name
              )}
            </h4>

            <p>
              ${escapeHtml(
                quest.description
              )}
            </p>
          </div>

          <div>
            <strong>
              ${Math.min(
                progress,
                quest.target
              )} / ${quest.target}
            </strong>

            <div class="quest-progress">
              <div
                class="quest-progress-bar"
                style="width:${percent}%"
              ></div>
            </div>
          </div>

          <small>
            🎁 +${quest.rewardXP} XP
            / 🪙 +${quest.rewardCoins}
          </small>

          ${
            completed
              ? `<span>✅ 達成済み</span>`
              : ""
          }

        </article>
      `;
    })
    .join("");
}

function renderQuests() {
  renderQuestList(
    "daily-quest-list",
    [
      ...DAILY_QUESTS,
      RARE_QUEST
    ]
  );

  renderQuestList(
    "weekly-quest-list",
    WEEKLY_QUESTS,
    true
  );

  const home =
    $("home-quest-list");

  if (home) {
    const quests = [
      ...DAILY_QUESTS,
      RARE_QUEST
    ];

    home.innerHTML =
      quests.map(quest => {
        const progress =
          getQuestProgress(
            quest
          );

        const done =
          questCompletedToday(
            quest.id
          );

        return `
          <div class="quest-card ${
            done
              ? "completed"
              : ""
          }">
            <strong>
              ${escapeHtml(
                quest.name
              )}
            </strong>

            <span>
              ${Math.min(
                progress,
                quest.target
              )}/${quest.target}
            </span>
          </div>
        `;
      }).join("");
  }
}


// ============================================================
// BOSS
// ============================================================

function getBossWeekId() {
  const start =
    startOfWeek();

  return [
    start.getFullYear(),
    String(
      start.getMonth() + 1
    ).padStart(2, "0"),
    String(
      start.getDate()
    ).padStart(2, "0")
  ].join("-");
}

function selectWeeklyBoss() {
  const week =
    getBossWeekId();

  let hash = 0;

  for (const char of week) {
    hash =
      (hash * 31 +
        char.charCodeAt(0)) |
      0;
  }

  hash =
    Math.abs(hash);

  const boss =
    BOSS_POOL[
      hash % BOSS_POOL.length
    ];

  const subjectList =
    state.subjects.length
      ? state.subjects
      : Object.keys(SUBJECTS);

  const weakness =
    subjectList[
      hash % subjectList.length
    ];

  return {
    weekId: week,
    name: boss.name,
    level: boss.level,
    baseHP: boss.baseHP,
    maxHP: boss.baseHP,
    currentHP: boss.baseHP,
    weakness,
    weaknessMultiplier:
      WEAKNESS_MULTIPLIER
  };
}

async function loadBoss() {
  const ref =
    doc(
      db,
      "bosses",
      getBossWeekId()
    );

  const snap =
    await getDoc(ref);

  if (!snap.exists()) {
    const boss =
      selectWeeklyBoss();

    await setDoc(
      ref,
      {
        ...boss,
        createdAt:
          serverTimestamp()
      }
    );

    state.boss = boss;
    return;
  }

  state.boss = {
    id: snap.id,
    ...snap.data()
  };
}

async function saveBoss() {
  if (!state.boss) return;

  await setDoc(
    doc(
      db,
      "bosses",
      state.boss.weekId
    ),
    state.boss,
    {
      merge: true
    }
  );
}

function calculateBossDamage(
  minutes,
  subject
) {
  let damage =
    Math.max(
      1,
      Math.floor(minutes)
    );

  if (
    subject ===
    state.boss.weakness
  ) {
    damage =
      Math.floor(
        damage *
          state.boss
            .weaknessMultiplier
      );
  }

  return damage;
}

async function attackBoss(
  minutes,
  subject
) {
  if (!state.boss) {
    throw new Error(
      "ボス情報がありません。"
    );
  }

  const damage =
    calculateBossDamage(
      minutes,
      subject
    );

  const oldHP =
    Number(
      state.boss.currentHP
    );

  state.boss.currentHP =
    Math.max(
      0,
      oldHP - damage
    );

  await saveBoss();

  await addDoc(
    collection(
      db,
      "bosses",
      state.boss.weekId,
      "battleLogs"
    ),
    {
      uid: state.user.uid,
      displayName:
        state.profile.displayName,
      subject,
      studyMinutes: minutes,
      damage,
      createdAt:
        serverTimestamp()
    }
  );

  if (
    state.boss.currentHP <= 0 &&
    oldHP > 0
  ) {
    await saveProfile({
      totalBossesDefeated:
        Number(
          state.profile
            .totalBossesDefeated || 0
        ) + 1,

      coins:
        Number(
          state.profile.coins || 0
        ) + 100,

      totalXP:
        Number(
          state.profile.totalXP || 0
        ) + 100
    });

    notify(
      "👹 ボス討伐成功！ +100 XP / 🪙100"
    );
  } else {
    notify(
      `⚔️ ${damage}ダメージ！`
    );
  }

  await loadBoss();
  refreshAll();
}

function renderBoss() {
  if (!state.boss) return;

  const boss =
    state.boss;

  $("boss-name").textContent =
    boss.name;

  $("boss-level").textContent =
    `Lv.${boss.level}`;

  $("boss-current-hp").textContent =
    Math.max(
      0,
      boss.currentHP
    );

  $("boss-max-hp").textContent =
    boss.maxHP;

  const percent =
    boss.maxHP > 0
      ? Math.max(
          0,
          boss.currentHP /
            boss.maxHP *
            100
        )
      : 0;

  if (
    $("boss-hp-progress")
  ) {
    $("boss-hp-progress")
      .style.width =
      `${percent}%`;
  }

  $("boss-weakness-subject")
    .textContent =
    SUBJECTS[
      boss.weakness
    ] || boss.weakness;

  $("boss-weakness-multiplier")
    .textContent =
    `×${boss.weaknessMultiplier}`;

  $("boss-reset-date")
    .textContent =
    formatDate(
      getSeasonEnd()
    );
}


// ============================================================
// PARTY
// ============================================================

async function loadParty() {
  if (!state.user) return;

  const q = query(
    collection(
      db,
      "parties"
    ),
    where(
      "memberIds",
      "array-contains",
      state.user.uid
    ),
    limit(1)
  );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    state.party = null;
    return;
  }

  const partyDoc =
    snap.docs[0];

  state.party = {
    id: partyDoc.id,
    ...partyDoc.data()
  };
}

async function inviteToParty(
  targetUserId
) {
  if (!targetUserId) {
    throw new Error(
      "ユーザーIDを入力してください。"
    );
  }

  if (
    targetUserId ===
    state.profile.userId
  ) {
    throw new Error(
      "自分自身は招待できません。"
    );
  }

  const q = query(
    collection(
      db,
      "users"
    ),
    where(
      "userId",
      "==",
      targetUserId
    ),
    limit(1)
  );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    throw new Error(
      "そのユーザーは見つかりません。"
    );
  }

  const target =
    snap.docs[0];

  await addDoc(
    collection(
      db,
      "partyInvitations"
    ),
    {
      fromUid:
        state.user.uid,

      fromUserId:
        state.profile.userId,

      fromDisplayName:
        state.profile.displayName,

      toUid:
        target.id,

      type: "party",

      status: "pending",

      createdAt:
        serverTimestamp()
    }
  );

  notify(
    "パーティー招待を送りました！"
  );
}

async function loadInvitations() {
  const q = query(
    collection(
      db,
      "partyInvitations"
    ),
    where(
      "toUid",
      "==",
      state.user.uid
    ),
    where(
      "status",
      "==",
      "pending"
    ),
    limit(50)
  );

  const snap =
    await getDocs(q);

  state.invitations =
    snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
}

async function loadFriends() {
  state.friends = [];

  const q = query(
    collection(
      db,
      "friendships"
    ),
    where(
      "memberIds",
      "array-contains",
      state.user.uid
    ),
    limit(100)
  );

  const snap =
    await getDocs(q);

  for (
    const friendship
    of snap.docs
  ) {
    const data =
      friendship.data();

    const otherUid =
      data.memberIds.find(
        uid =>
          uid !==
          state.user.uid
      );

    if (!otherUid) continue;

    const userSnap =
      await getDoc(
        doc(
          db,
          "users",
          otherUid
        )
      );

    if (userSnap.exists()) {
      state.friends.push({
        uid: otherUid,
        ...userSnap.data()
      });
    }
  }
}

function renderParty() {
  const list =
    $("party-member-list");

  const count =
    $("party-member-count");

  const bossList =
    $("boss-party-member-list");

  if (!state.party) {
    if (list) {
      list.innerHTML = `
        <p class="empty-message">
          現在パーティーに所属していません。
        </p>
      `;
    }

    if (count) {
      count.textContent =
        "0 / 4人";
    }

    if (bossList) {
      bossList.innerHTML = `
        <p class="empty-message">
          パーティー未加入
        </p>
      `;
    }

    return;
  }

  const memberIds =
    state.party.memberIds || [];

  const html =
    memberIds
      .map(
        uid => `
          <div class="party-member">
            <strong>
              ${escapeHtml(
                uid ===
                  state.user.uid
                  ? state.profile
                      .displayName
                  : uid
              )}
            </strong>
          </div>
        `
      )
      .join("");

  if (list) {
    list.innerHTML = html;
  }

  if (bossList) {
    bossList.innerHTML = html;
  }

  if (count) {
    count.textContent =
      `${memberIds.length} / 4人`;
  }

  const bossCount =
    $("boss-party-count");

  if (bossCount) {
    bossCount.textContent =
      `${memberIds.length} / 4人`;
  }
}

async function refreshBossHpForParty() {
  if (!state.party || !state.boss) {
    return;
  }

  const members =
    state.party.memberIds?.length ||
    1;

  const multiplier =
    1 +
    (members - 1) *
      0.5;

  const expected =
    Math.floor(
      state.boss.baseHP *
        multiplier
    );

  if (
    state.boss.maxHP !==
    expected
  ) {
    state.boss.maxHP =
      expected;

    state.boss.currentHP =
      Math.min(
        state.boss.currentHP,
        expected
      );

    await saveBoss();
  }
}


// ============================================================
// FRIENDS
// ============================================================

async function addFriend(
  targetUserId
) {
  if (!targetUserId) {
    throw new Error(
      "ユーザーIDを入力してください。"
    );
  }

  const q = query(
    collection(
      db,
      "users"
    ),
    where(
      "userId",
      "==",
      targetUserId
    ),
    limit(1)
  );

  const snap =
    await getDocs(q);

  if (snap.empty) {
    throw new Error(
      "そのユーザーは見つかりません。"
    );
  }

  const target =
    snap.docs[0];

  if (
    target.id ===
    state.user.uid
  ) {
    throw new Error(
      "自分自身には申請できません。"
    );
  }

  await addDoc(
    collection(
      db,
      "friendRequests"
    ),
    {
      fromUid:
        state.user.uid,

      fromUserId:
        state.profile.userId,

      fromDisplayName:
        state.profile.displayName,

      toUid:
        target.id,

      status: "pending",

      createdAt:
        serverTimestamp()
    }
  );

  notify(
    "フレンド申請を送りました！"
  );
}


// ============================================================
// RANK UI
// ============================================================

function refreshRank() {
  const minutes =
    getSeasonStudyMinutes();

  const rank =
    getRankFromMinutes(
      minutes
    );

  const formatted =
    formatMinutes(
      minutes
    );

  if ($("current-rank-name")) {
    $("current-rank-name")
      .textContent =
      rank;
  }

  if ($("current-season-study-time")) {
    $("current-season-study-time")
      .textContent =
      formatted;
  }

  if ($("current-season-time")) {
    $("current-season-time")
      .textContent =
      getSeasonRemainingText();
  }

  if ($("home-rank")) {
    $("home-rank")
      .textContent =
      rank;
  }

  if ($("home-season-study-time")) {
    $("home-season-study-time")
      .textContent =
      formatted;
  }

  if ($("home-season-end")) {
    $("home-season-end")
      .textContent =
      formatDate(
        getSeasonEnd()
      );
  }

  if ($("header-rank")) {
    $("header-rank")
      .textContent =
      rank;
  }
}


// ============================================================
// LEVEL UI
// ============================================================

function refreshLevelUI() {
  if (!state.profile) return;

  const info =
    calculateLevel(
      state.profile.totalXP
    );

  if ($("header-level")) {
    $("header-level")
      .textContent =
      `Lv.${info.level}`;
  }

  if ($("home-level")) {
    $("home-level")
      .textContent =
      info.level;
  }

  if ($("home-xp")) {
    $("home-xp")
      .textContent =
      `${info.xpInLevel} XP`;
  }

  if ($("home-xp-required")) {
    $("home-xp-required")
      .textContent =
      `次のレベルまで ${
        info.xpRequired -
        info.xpInLevel
      } XP`;
  }

  if ($("level-progress")) {
    const percent =
      info.xpRequired > 0
        ? info.xpInLevel /
          info.xpRequired *
          100
        : 0;

    $("level-progress")
      .style.width =
      `${percent}%`;
  }

  if ($("star-count")) {
    $("star-count")
      .textContent =
      `⭐ ${info.stars}`;
  }

  if ($("profile-level")) {
    $("profile-level")
      .textContent =
      info.level;
  }

  if ($("profile-xp")) {
    $("profile-xp")
      .textContent =
      state.profile.totalXP;
  }

  if ($("profile-stars")) {
    $("profile-stars")
      .textContent =
      info.stars;
  }
}

function showLevelUp(
  oldInfo,
  newInfo
) {
  const oldEl =
    $("level-up-old-level");

  const newEl =
    $("level-up-new-level");

  if (oldEl) {
    oldEl.textContent =
      oldInfo.level;
  }

  if (newEl) {
    newEl.textContent =
      newInfo.level;
  }

  show(
    "level-up-modal"
  );
}


// ============================================================
// HOME
// ============================================================

function refreshHome() {
  const today =
    getStudyMinutesForDay();

  const totalXP =
    Number(
      state.profile?.totalXP || 0
    );

  const todayRecords =
    state.studyRecords.filter(
      record => {
        const d =
          getTimestampDate(
            record.createdAt
          );

        return (
          d &&
          d >= startOfDay()
        );
      }
    );

  const todayXP =
    todayRecords.reduce(
      (sum, record) =>
        sum +
        Number(
          record.minutes || 0
        ),
      0
    );

  const todayCoins =
    todayRecords.reduce(
      (sum, record) =>
        sum +
        Math.floor(
          Number(
            record.minutes || 0
          ) / 10
        ),
      0
    );

  if ($("today-study-time")) {
    $("today-study-time")
      .textContent =
      formatMinutes(
        today
      );
  }

  if ($("today-xp")) {
    $("today-xp")
      .textContent =
      `${todayXP} XP`;
  }

  if ($("today-quests")) {
    $("today-quests")
      .textContent =
      state.questCompletions.filter(
        q => {
          const d =
            getTimestampDate(
              q.completedAt
            );

          return (
            d &&
            d >= startOfDay()
          );
        }
      ).length;
  }

  if ($("today-coins")) {
    $("today-coins")
      .textContent =
      `🪙 ${todayCoins}`;
  }

  if ($("header-coins")) {
    $("header-coins")
      .textContent =
      `🪙 ${
        state.profile?.coins || 0
      }`;
  }

  if ($("home-xp")) {
    $("home-xp")
      .textContent =
      `${calculateLevel(totalXP).xpInLevel} XP`;
  }
}


// ============================================================
// STUDY UI
// ============================================================

function populateSubjectSelects() {
  const select =
    $("study-subject");

  if (!select) return;

  select.innerHTML = `
    <option value="">
      教科を選択
    </option>
  `;

  state.subjects.forEach(
    subject => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        subject;

      option.textContent =
        SUBJECTS[subject] ||
        subject;

      select.appendChild(
        option
      );
    }
  );
}

function refreshStudy() {
  populateSubjectSelects();

  const subjectTotals = {};

  state.studyRecords.forEach(
    record => {
      subjectTotals[
        record.subject
      ] =
        (
          subjectTotals[
            record.subject
          ] || 0
        ) +
        Number(
          record.minutes || 0
        );
    }
  );

  const levelList =
    $("subject-level-list");

  if (levelList) {
    levelList.innerHTML =
      state.subjects.map(
        subject => {
          const minutes =
            subjectTotals[
              subject
            ] || 0;

          const level =
            Math.floor(
              minutes / 60
            ) + 1;

          return `
            <div class="subject-level-card">
              <strong>
                ${escapeHtml(
                  SUBJECTS[
                    subject
                  ] || subject
                )}
              </strong>

              <span>
                Lv.${level}
              </span>

              <small>
                ${formatMinutes(
                  minutes
                )}
              </small>
            </div>
          `;
        }
      ).join("");
  }

  const summary =
    $("subject-study-list");

  if (summary) {
    summary.innerHTML =
      state.subjects.map(
        subject => `
          <div class="info-row">
            <span>
              ${escapeHtml(
                SUBJECTS[
                  subject
                ] || subject
              )}
            </span>

            <strong>
              ${formatMinutes(
                subjectTotals[
                  subject
                ] || 0
              )}
            </strong>
          </div>
        `
      ).join("");
  }

  const history =
    $("study-history-list");

  if (history) {
    history.innerHTML =
      state.studyRecords
        .slice(0, 100)
        .map(
          record => `
            <div class="history-card">
              <strong>
                ${escapeHtml(
                  SUBJECTS[
                    record.subject
                  ] ||
                    record.subject
                )}
              </strong>

              <span>
                ${record.minutes}分
              </span>

              <small>
                ${escapeHtml(
                  record.note || ""
                )}
              </small>

              <time>
                ${formatDateTime(
                  getTimestampDate(
                    record.createdAt
                  )
                )}
              </time>
            </div>
          `
        )
        .join("");
  }
}


// ============================================================
// PROFILE UI
// ============================================================

function refreshProfile() {
  if (!state.profile) return;

  const p =
    state.profile;

  if ($("header-display-name")) {
    $("header-display-name")
      .textContent =
      p.displayName;
  }

  if ($("profile-display-name")) {
    $("profile-display-name")
      .textContent =
      p.displayName;
  }

  if ($("profile-user-id")) {
    $("profile-user-id")
      .textContent =
      p.userId;
  }

  if ($("profile-course")) {
    $("profile-course")
      .textContent =
      COURSE_NAMES[
        p.course
      ] || p.course;
  }

  if ($("profile-coins")) {
    $("profile-coins")
      .textContent =
      p.coins || 0;
  }

  if ($("profile-total-study-time")) {
    $("profile-total-study-time")
      .textContent =
      formatMinutes(
        getTotalStudyMinutes()
      );
  }

  if ($("profile-total-xp")) {
    $("profile-total-xp")
      .textContent =
      `${p.totalXP || 0} XP`;
  }

  if ($("profile-total-coins")) {
    $("profile-total-coins")
      .textContent =
      p.coins || 0;
  }

  if ($("profile-bosses-defeated")) {
    $("profile-bosses-defeated")
      .textContent =
      p.totalBossesDefeated ||
      0;
  }

  if ($("profile-quests-completed")) {
    $("profile-quests-completed")
      .textContent =
      p.totalQuestsCompleted ||
      0;
  }

  if ($("settings-display-name")) {
    $("settings-display-name")
      .value =
      p.displayName;
  }

  const subjectList =
    $("profile-subject-list");

  if (subjectList) {
    subjectList.innerHTML =
      state.subjects.map(
        subject => `
          <span class="subject-tag">
            ${escapeHtml(
              SUBJECTS[
                subject
              ] || subject
            )}
          </span>
        `
      ).join("");
  }

  document
    .querySelectorAll(
      'input[name="settings-subjects"]'
    )
    .forEach(input => {
      input.checked =
        state.subjects.includes(
          input.value
        );
    });
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

async function loadUnlockedAchievements() {
  const snap =
    await getDocs(
      achievementCollection()
    );

  return snap.docs.map(
    doc => doc.id
  );
}

async function checkAchievements() {
  const stats = {
    totalMinutes:
      getTotalStudyMinutes(),

    level:
      calculateLevel(
        state.profile.totalXP
      ).level,

    stars:
      calculateLevel(
        state.profile.totalXP
      ).stars,

    rank:
      getRankFromMinutes(
        getSeasonStudyMinutes()
      ),

    bossesDefeated:
      state.profile
        .totalBossesDefeated || 0
  };

  const unlocked =
    await loadUnlockedAchievements();

  for (
    const achievement
    of ACHIEVEMENTS
  ) {
    if (
      unlocked.includes(
        achievement.id
      )
    ) {
      continue;
    }

    if (
      achievement.check(
        stats
      )
    ) {
      await setDoc(
        doc(
          db,
          "users",
          state.user.uid,
          "achievements",
          achievement.id
        ),
        {
          achievementId:
            achievement.id,

          unlockedAt:
            serverTimestamp()
        }
      );

      notify(
        `⭐ 実績解除！ ${achievement.name}`
      );
    }
  }
}

async function refreshAchievements() {
  const list =
    $("achievement-list");

  if (!list) return;

  const unlocked =
    await loadUnlockedAchievements();

  const count =
    $("achievement-count");

  if (count) {
    count.textContent =
      `${unlocked.length} / ${ACHIEVEMENTS.length}`;
  }

  list.innerHTML =
    ACHIEVEMENTS.map(
      achievement => {
        const isUnlocked =
          unlocked.includes(
            achievement.id
          );

        return `
          <article class="achievement-card ${
            isUnlocked
              ? "unlocked"
              : "locked"
          }">

            <strong>
              ${
                isUnlocked
                  ? "⭐"
                  : "🔒"
              }
              ${escapeHtml(
                achievement.name
              )}
            </strong>

            <p>
              ${escapeHtml(
                achievement.description
              )}
            </p>

            <small>
              ${
                isUnlocked
                  ? "達成済み"
                  : "未達成"
              }
            </small>

          </article>
        `;
      }
    ).join("");
}


// ============================================================
// SHOP
// ============================================================

const SHOP_ITEMS = [
  {
    id: "title-hardworker",
    category: "title",
    name: "努力家",
    price: 100,
    description:
      "勉強を続ける者の証"
  },
  {
    id: "title-scholar",
    category: "title",
    name: "学究の徒",
    price: 300,
    description:
      "知識を追い求める者"
  },
  {
    id: "title-warrior",
    category: "title",
    name: "受験戦士",
    price: 500,
    description:
      "受験を戦い抜く者"
  },
  {
    id: "item-focus",
    category: "item",
    name: "集中の護符",
    price: 150,
    description:
      "持っているだけで強そう"
  },
  {
    id: "item-luck",
    category: "item",
    name: "合格祈願のお守り",
    price: 300,
    description:
      "最後まで諦めないためのお守り"
  },
  {
    id: "bg-night",
    category: "background",
    name: "夜空",
    price: 500,
    description:
      "夜の冒険者向け背景"
  }
];

async function buyItem(item) {
  const coins =
    Number(
      state.profile.coins || 0
    );

  if (coins < item.price) {
    notify(
      "コインが足りません。"
    );
    return;
  }

  const inventoryRef =
    doc(
      db,
      "users",
      state.user.uid,
      "inventory",
      item.id
    );

  const existing =
    await getDoc(
      inventoryRef
    );

  if (existing.exists()) {
    notify(
      "すでに所持しています。"
    );
    return;
  }

  await setDoc(
    inventoryRef,
    {
      itemId: item.id,
      name: item.name,
      category:
        item.category,
      purchasedAt:
        serverTimestamp()
    }
  );

  await saveProfile({
    coins:
      coins - item.price
  });

  notify(
    `${item.name}を購入しました！`
  );

  refreshShop();
  refreshLocker();
  refreshHome();
}

async function getInventory() {
  const snap =
    await getDocs(
      collection(
        db,
        "users",
        state.user.uid,
        "inventory"
      )
    );

  return snap.docs.map(
    doc => ({
      id: doc.id,
      ...doc.data()
    })
  );
}

async function refreshShop() {
  const coinEl =
    $("shop-coin-count");

  if (coinEl) {
    coinEl.textContent =
      state.profile?.coins ||
      0;
  }

  const inventory =
    await getInventory();

  function render(
    id,
    category
  ) {
    const container =
      $(id);

    if (!container) return;

    container.innerHTML =
      SHOP_ITEMS
        .filter(
          item =>
            item.category ===
            category
        )
        .map(item => {
          const owned =
            inventory.some(
              x =>
                x.id ===
                item.id
            );

          return `
            <article class="shop-card">

              <h4>
                ${escapeHtml(
                  item.name
                )}
              </h4>

              <p>
                ${escapeHtml(
                  item.description
                )}
              </p>

              <strong>
                🪙 ${item.price}
              </strong>

              <button
                type="button"
                data-buy-item="${escapeHtml(
                  item.id
                )}"
                ${
                  owned
                    ? "disabled"
                    : ""
                }
              >
                ${
                  owned
                    ? "所持済み"
                    : "購入"
                }
              </button>

            </article>
          `;
        })
        .join("");
  }

  render(
    "shop-title-list",
    "title"
  );

  render(
    "shop-item-list",
    "item"
  );

  render(
    "shop-background-list",
    "background"
  );

  document
    .querySelectorAll(
      "[data-buy-item]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const item =
            SHOP_ITEMS.find(
              x =>
                x.id ===
                button.dataset
                  .buyItem
            );

          if (item) {
            await buyItem(item);
          }
        }
      );
    });
}


// ============================================================
// LOCKER
// ============================================================

async function refreshLocker() {
  const inventory =
    await getInventory();

  const categories = {
    title:
      "locker-title-list",

    item:
      "locker-item-list",

    background:
      "locker-outfit-list"
  };

  Object.entries(
    categories
  ).forEach(
    ([category, id]) => {
      const container =
        $(id);

      if (!container) return;

      const items =
        inventory.filter(
          item =>
            item.category ===
            category
        );

      if (!items.length) {
        container.innerHTML = `
          <p class="empty-message">
            所持しているアイテムはありません。
          </p>
        `;
        return;
      }

      container.innerHTML =
        items.map(
          item => `
            <div class="locker-item">
              <strong>
                ${escapeHtml(
                  item.name
                )}
              </strong>
            </div>
          `
        ).join("");
    }
  );
}


// ============================================================
// NAVIGATION
// ============================================================

function navigateTo(
  screenId
) {
  const screens =
    document.querySelectorAll(
      ".app-screen"
    );

  screens.forEach(
    screen => {
      screen.classList.add(
        "hidden"
      );
      screen.classList.remove(
        "screen-enter"
      );
    }
  );

  const target =
    $(screenId);

  if (!target) return;

  target.classList.remove(
    "hidden"
  );

  requestAnimationFrame(
    () => {
      target.classList.add(
        "screen-enter"
      );
    }
  );

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

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function setupNavigation() {
  document
    .querySelectorAll(
      ".nav-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          navigateTo(
            button.dataset
              .screen
          );
        }
      );
    });
}


// ============================================================
// TABS
// ============================================================

function setupTabs() {
  // QUEST
  document
    .querySelectorAll(
      "[data-quest-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const tab =
            button.dataset
              .questTab;

          document
            .querySelectorAll(
              ".quest-tab-content"
            )
            .forEach(el =>
              el.classList.add(
                "hidden"
              )
            );

          const targetMap = {
            daily:
              "daily-quest-tab",

            weekly:
              "weekly-quest-tab",

            boss:
              "boss-tab",

            history:
              "quest-history-tab"
          };

          show(
            targetMap[tab]
          );

          document
            .querySelectorAll(
              "[data-quest-tab]"
            )
            .forEach(
              x =>
                x.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          if (
            tab === "boss"
          ) {
            renderBoss();
          }
        }
      );
    });


  // PARTY
  document
    .querySelectorAll(
      "[data-party-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const tab =
            button.dataset
              .partyTab;

          document
            .querySelectorAll(
              ".party-tab-content"
            )
            .forEach(el =>
              el.classList.add(
                "hidden"
              )
            );

          const targetMap = {
            party:
              "party-tab",

            friends:
              "friends-tab",

            requests:
              "friend-requests-tab"
          };

          show(
            targetMap[tab]
          );

          document
            .querySelectorAll(
              "[data-party-tab]"
            )
            .forEach(
              x =>
                x.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );
        }
      );
    });


  // RANK
  document
    .querySelectorAll(
      "[data-rank-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const tab =
            button.dataset
              .rankTab;

          document
            .querySelectorAll(
              ".rank-tab-content"
            )
            .forEach(el =>
              el.classList.add(
                "hidden"
              )
            );

          const targetMap = {
            rank:
              "rank-info-tab",

            ranking:
              "ranking-tab",

            history:
              "season-history-tab"
          };

          show(
            targetMap[tab]
          );

          document
            .querySelectorAll(
              "[data-rank-tab]"
            )
            .forEach(
              x =>
                x.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );
        }
      );
    });


  // OTHER
  document
    .querySelectorAll(
      "[data-other-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openOtherTab(
            button.dataset
              .otherTab
          );
        }
      );
    });

  // HTMLのmenu-cardは
  // data-open-other-tabを使用
  document
    .querySelectorAll(
      "[data-open-other-tab]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openOtherTab(
            button.dataset
              .openOtherTab
          );
        }
      );
    });


  // ranking type
  document
    .querySelectorAll(
      "[data-ranking-type]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const type =
            button.dataset
              .rankingType;

          const friends =
            $("friends-ranking-list");

          const global =
            $("global-ranking-list");

          if (type === "friends") {
            friends?.classList.remove(
              "hidden"
            );

            global?.classList.add(
              "hidden"
            );
          } else {
            friends?.classList.add(
              "hidden"
            );

            global?.classList.remove(
              "hidden"
            );
          }

          document
            .querySelectorAll(
              "[data-ranking-type]"
            )
            .forEach(
              x =>
                x.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );
        }
      );
    });
}

function openOtherTab(
  tab
) {
  document
    .querySelectorAll(
      ".other-tab-content"
    )
    .forEach(el =>
      el.classList.add(
        "hidden"
      )
    );

  const map = {
    menu:
      "other-menu-tab",

    achievement:
      "achievement-tab",

    shop:
      "shop-tab",

    locker:
      "locker-tab",

    profile:
      "profile-tab",

    settings:
      "settings-tab"
  };

  if (map[tab]) {
    show(
      map[tab]
    );
  }

  document
    .querySelectorAll(
      "[data-other-tab]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset
          .otherTab ===
          tab
      );
    });

  if (
    tab ===
    "achievement"
  ) {
    refreshAchievements();
  }

  if (
    tab === "shop"
  ) {
    refreshShop();
  }

  if (
    tab === "locker"
  ) {
    refreshLocker();
  }

  if (
    tab === "profile"
  ) {
    refreshProfile();
  }
}


// ============================================================
// RANKING
// ============================================================

async function refreshRanking() {
  const globalList =
    $("global-ranking-list");

  const friendList =
    $("friends-ranking-list");

  const q =
    query(
      collection(
        db,
        "users"
      ),
      orderBy(
        "totalStudyMinutes",
        "desc"
      ),
      limit(100)
    );

  const snap =
    await getDocs(q);

  const users =
    snap.docs.map(
      doc => ({
        uid: doc.id,
        ...doc.data()
      })
    );

  const render =
    list => {
      if (!list) return;

      list.innerHTML =
        users.map(
          (user, index) => `
            <div class="ranking-card">

              <strong>
                #${index + 1}
              </strong>

              <span>
                ${escapeHtml(
                  user.displayName ||
                    "冒険者"
                )}
              </span>

              <small>
                ${formatMinutes(
                  user.totalStudyMinutes ||
                    0
                )}
              </small>

            </div>
          `
        ).join("");
    };

  render(globalList);

  const friendIds =
    new Set(
      state.friends.map(
        f => f.uid
      )
    );

  friendIds.add(
    state.user.uid
  );

  const friends =
    users.filter(
      user =>
        friendIds.has(
          user.uid
        )
    );

  if (friendList) {
    friendList.innerHTML =
      friends.map(
        user => `
          <div class="ranking-card">
            <span>
              ${escapeHtml(
                user.displayName ||
                  "冒険者"
              )}
            </span>

            <strong>
              ${formatMinutes(
                user.totalStudyMinutes ||
                  0
              )}
            </strong>
          </div>
        `
      ).join("");
  }

  const myIndex =
    users.findIndex(
      user =>
        user.uid ===
        state.user.uid
    );

  if ($("global-rank-number")) {
    $("global-rank-number")
      .textContent =
      myIndex >= 0
        ? `#${myIndex + 1}`
        : "-";
  }
}


// ============================================================
// ALL REFRESH
// ============================================================

function refreshAll() {
  refreshLevelUI();
  refreshHome();
  refreshStudy();
  renderQuests();
  renderParty();
  renderBoss();
  refreshRank();
  refreshProfile();
  refreshShop();
  refreshLocker();
  refreshRanking();
}


// ============================================================
// SETTINGS
// ============================================================

function setupSettings() {
  $("display-name-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        try {
          await changeDisplayName(
            $("settings-display-name")
              .value
          );
        } catch (e) {
          error(
            "display-name-error",
            e.message
          );
        }
      }
    );

  $("subject-settings-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const subjects =
          [
            ...document.querySelectorAll(
              'input[name="settings-subjects"]:checked'
            )
          ].map(
            input =>
              input.value
          );

        try {
          await changeSubjects(
            subjects
          );
        } catch (e) {
          error(
            "settings-subject-error",
            e.message
          );
        }
      }
    );

  $("password-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        try {
          const password =
            $("settings-new-password")
              .value;

          if (
            password.length < 6
          ) {
            throw new Error(
              "パスワードは6文字以上です。"
            );
          }

          await updatePassword(
            auth.currentUser,
            password
          );

          event.target.reset();

          notify(
            "パスワードを変更しました！"
          );
        } catch (e) {
          error(
            "password-error",
            authErrorMessage(e)
          );
        }
      }
    );

  $("delete-account-button")
    ?.addEventListener(
      "click",
      async () => {
        const ok =
          confirm(
            "本当にアカウントを削除しますか？"
          );

        if (!ok) return;

        try {
          await deleteDoc(
            userRef()
          );

          await deleteUser(
            auth.currentUser
          );

          notify(
            "アカウントを削除しました。"
          );
        } catch (e) {
          notify(
            authErrorMessage(e)
          );
        }
      }
    );
}


// ============================================================
// AUTH UI
// ============================================================

function authErrorMessage(
  errorObject
) {
  const code =
    errorObject?.code ||
    "";

  const messages = {
    "auth/email-already-in-use":
      "そのユーザーIDは既に使用されています。",

    "auth/invalid-credential":
      "ユーザーIDまたはパスワードが違います。",

    "auth/wrong-password":
      "パスワードが違います。",

    "auth/user-not-found":
      "ユーザーが見つかりません。",

    "auth/weak-password":
      "パスワードが弱すぎます。",

    "auth/invalid-email":
      "ユーザーIDが正しくありません。",

    "auth/requires-recent-login":
      "安全のため、一度ログインし直してください。"
  };

  return (
    messages[code] ||
    errorObject?.message ||
    "エラーが発生しました。"
  );
}

function setupAuth() {
  $("show-register-button")
    ?.addEventListener(
      "click",
      () => {
        hide(
          "login-screen"
        );

        show(
          "register-screen"
        );
      }
    );

  $("show-login-button")
    ?.addEventListener(
      "click",
      () => {
        hide(
          "register-screen"
        );

        show(
          "login-screen"
        );
      }
    );

  $("login-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        error(
          "login-error",
          ""
        );

        try {
          await login(
            $("login-user-id")
              .value,
            $("login-password")
              .value
          );
        } catch (e) {
          error(
            "login-error",
            authErrorMessage(e)
          );
        }
      }
    );

  $("register-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        error(
          "register-error",
          ""
        );

        const subjects =
          [
            ...document.querySelectorAll(
              'input[name="subjects"]:checked'
            )
          ].map(
            input =>
              input.value
          );

        const course =
          document.querySelector(
            'input[name="course"]:checked'
          )?.value;

        try {
          await register({
            userId:
              $("register-user-id")
                .value,

            password:
              $("register-password")
                .value,

            passwordConfirm:
              $("register-password-confirm")
                .value,

            displayName:
              $("register-display-name")
                .value,

            course,
            subjects
          });

          notify(
            "冒険者登録完了！"
          );
        } catch (e) {
          error(
            "register-error",
            authErrorMessage(e)
          );
        }
      }
    );

  $("logout-button")
    ?.addEventListener(
      "click",
      async () => {
        resetTimer();

        await signOut(
          auth
        );
      }
    );
}


// ============================================================
// STUDY EVENTS
// ============================================================

function setupStudy() {
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
      saveTimer
    );

  $("study-record-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        error(
          "study-error",
          ""
        );

        try {
          await recordStudy(
            $("study-subject")
              .value,

            $("study-minutes")
              .value,

            $("study-note")
              .value,

            "manual"
          );

          event.target.reset();

        } catch (e) {
          error(
            "study-error",
            e.message
          );
        }
      }
    );
}


// ============================================================
// PARTY EVENTS
// ============================================================

function setupParty() {
  $("party-invite-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        error(
          "party-error",
          ""
        );

        try {
          await inviteToParty(
            $("party-invite-user-id")
              .value
              .trim()
          );

          event.target.reset();

        } catch (e) {
          error(
            "party-error",
            e.message
          );
        }
      }
    );

  $("friend-add-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        error(
          "friend-error",
          ""
        );

        try {
          await addFriend(
            $("friend-user-id")
              .value
              .trim()
          );

          event.target.reset();

        } catch (e) {
          error(
            "friend-error",
            e.message
          );
        }
      }
    );

  $("boss-refresh-button")
    ?.addEventListener(
      "click",
      async () => {
        await loadBoss();

        if (state.party) {
          await refreshBossHpForParty();
        }

        renderBoss();

        notify(
          "ボス情報を更新しました。"
        );
      }
    );
}


// ============================================================
// MODALS
// ============================================================

function setupModal() {
  $("level-up-close-button")
    ?.addEventListener(
      "click",
      () => {
        hide(
          "level-up-modal"
        );
      }
    );

  $("reward-close-button")
    ?.addEventListener(
      "click",
      () => {
        hide(
          "reward-modal"
        );
      }
    );
}


// ============================================================
// RESET
// ============================================================

function resetState() {
  state.user = null;
  state.profile = null;
  state.subjects = [];
  state.studyRecords = [];
  state.questCompletions = [];
  state.seasonStats = null;
  state.party = null;
  state.invitations = [];
  state.friends = [];
  state.boss = null;

  resetTimer();

  hide(
    "main-app"
  );

  show(
    "auth-screen"
  );
}


// ============================================================
// INITIALIZE
// ============================================================

async function initializeUserApp() {
  show(
    "main-app"
  );

  hide(
    "auth-screen"
  );

  await loadProfile();
  await loadSubjects();
  await loadStudyRecords();
  await loadQuestCompletions();
  await loadParty();
  await loadInvitations();
  await loadFriends();
  await loadBoss();

  if (state.party) {
    await refreshBossHpForParty();
  }

  populateSubjectSelects();

  await autoCompleteQuests();

  await checkAchievements();

  refreshAll();

  navigateTo(
    "home-screen"
  );
}


// ============================================================
// STARTUP
// ============================================================

setupAuth();
setupNavigation();
setupTabs();
setupStudy();
setupParty();
setupSettings();
setupModal();

updateTimerDisplay();


onAuthStateChanged(
  auth,
  async user => {
    if (!user) {
      resetState();
      return;
    }

    state.user = user;

    try {
      await initializeUserApp();
    } catch (e) {
      console.error(
        "Initialization error:",
        e
      );

      notify(
        "データの読み込みに失敗しました。Firebaseの設定・Firestoreルールを確認してください。"
      );
    }
  }
);


// ============================================================
// PERIODIC REFRESH
// ============================================================

setInterval(
  async () => {
    if (!state.user) return;

    try {
      await loadStudyRecords();
      await loadQuestCompletions();
      await loadProfile();

      refreshLevelUI();
      refreshHome();
      refreshStudy();
      refreshRank();
    } catch (e) {
      console.warn(
        "Periodic refresh failed:",
        e
      );
    }
  },
  60000
);
