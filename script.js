// ============================================================
// 受験RPG - script.js
// Firebase + Firestore 完全版
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
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
const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// 定数
// ============================================================

const APP_NAME = "受験RPG";

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


// ------------------------------------------------------------
// ランク
// ------------------------------------------------------------

const RANKS = [
  {
    id: "bronze",
    name: "Bronze",
    minHours: 0,
    color: "#a97142",
    textColor: "#fff"
  },
  {
    id: "silver",
    name: "Silver",
    minHours: 10,
    color: "#9aa3ad",
    textColor: "#111"
  },
  {
    id: "gold",
    name: "Gold",
    minHours: 20,
    color: "#d7a928",
    textColor: "#111"
  },
  {
    id: "platinum",
    name: "Platinum",
    minHours: 40,
    color: "#6ec5d8",
    textColor: "#071116"
  },
  {
    id: "diamond",
    name: "Diamond",
    minHours: 70,
    color: "#4e8cff",
    textColor: "#fff"
  },
  {
    id: "master",
    name: "Master",
    minHours: 100,
    color: "#9b59ff",
    textColor: "#fff"
  },
  {
    id: "grandmaster",
    name: "Grandmaster",
    minHours: 125,
    color: "#e34cff",
    textColor: "#fff"
  },
  {
    id: "legend",
    name: "Legend",
    minHours: 150,
    color: "#ffb300",
    textColor: "#171000"
  }
];


// ------------------------------------------------------------
// ランク終了報酬
// ------------------------------------------------------------

const RANK_REWARDS = {
  bronze: 50,
  silver: 100,
  gold: 175,
  platinum: 275,
  diamond: 400,
  master: 550,
  grandmaster: 725,
  legend: 1000
};


// ------------------------------------------------------------
// XP
// ------------------------------------------------------------

const LEVEL_MAX = 101;

function xpRequiredForLevel(level) {
  if (level >= 100) {
    return 550;
  }

  return 100 + Math.floor((level - 1) / 10) * 50;
}

function calculateLevel(totalXp) {
  let level = 1;
  let remaining = Math.max(0, totalXp);

  while (level < 101) {
    const requirement = xpRequiredForLevel(level);

    if (remaining < requirement) {
      break;
    }

    remaining -= requirement;
    level++;
  }

  return {
    level,
    currentXp: remaining,
    requiredXp: level >= 101 ? 0 : xpRequiredForLevel(level)
  };
}


// ============================================================
// 日付
// ============================================================

function pad(num) {
  return String(num).padStart(2, "0");
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function weekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  return dateKey(d);
}

function getSeasonInfo(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    id: monthKey(date),
    start,
    end
  };
}

function getWeekInfo(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    id: weekKey(date),
    start,
    end
  };
}

function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

function formatMinutes(minutes) {
  minutes = Math.max(0, Number(minutes) || 0);

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) {
    return `${m}分`;
  }

  return `${h}時間${m}分`;
}


// ============================================================
// ランク計算
// ============================================================

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

function getNextRank(rankId) {
  const index = RANKS.findIndex(r => r.id === rankId);

  if (index < 0 || index >= RANKS.length - 1) {
    return null;
  }

  return RANKS[index + 1];
}


// ============================================================
// STATE
// ============================================================

const state = {
  user: null,
  profile: null,
  subjects: [],
  studyRecords: [],
  questCompletions: [],
  party: null,
  friends: [],
  invitations: [],
  boss: null,
  seasonStats: null,

  timer: {
    running: false,
    seconds: 0,
    startedAt: null,
    interval: null
  },

  selectedPurchase: null
};


// ============================================================
// DOM
// ============================================================

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

  if (el) {
    el.textContent = value;
  }
}

function html(id, value) {
  const el = $(id);

  if (el) {
    el.innerHTML = value;
  }
}

function error(id, message) {
  text(id, message || "");
}


// ============================================================
// 通知
// ============================================================

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


// ============================================================
// 画面切り替え
// ============================================================

function navigateTo(screenId) {
  const screens = document.querySelectorAll(".app-screen");

  screens.forEach(screen => {
    if (screen.id === screenId) {
      screen.classList.remove("hidden");
      screen.classList.remove("screen-enter");
      void screen.offsetWidth;
      screen.classList.add("screen-enter");
    } else {
      screen.classList.add("hidden");
    }
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.screen === screenId
    );
  });

  if (screenId === "home-screen") {
    refreshHome();
  }

  if (screenId === "study-screen") {
    refreshStudy();
  }

  if (screenId === "quest-screen") {
    refreshQuest();
  }

  if (screenId === "party-screen") {
    refreshParty();
  }

  if (screenId === "rank-screen") {
    refreshRank();
  }

  if (screenId === "achievement-screen") {
    refreshAchievements();
  }

  if (screenId === "shop-screen") {
    refreshShop();
  }

  if (screenId === "profile-screen") {
    refreshProfile();
  }

  if (screenId === "locker-screen") {
    refreshLocker();
  }

  if (screenId === "settings-screen") {
    refreshSettings();
  }
}


// ============================================================
// USER PATH
// ============================================================

function userRef() {
  return doc(db, "users", state.user.uid);
}

function subjectRef(subjectId) {
  return doc(
    db,
    "users",
    state.user.uid,
    "subjects",
    subjectId
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

function questCompletionCollection() {
  return collection(
    db,
    "users",
    state.user.uid,
    "questCompletions"
  );
}

function seasonStatsRef(seasonId) {
  return doc(
    db,
    "users",
    state.user.uid,
    "seasonStats",
    seasonId
  );
}


// ============================================================
// PROFILE
// ============================================================

async function loadProfile() {
  if (!state.user) return;

  const snap = await getDoc(userRef());

  if (snap.exists()) {
    state.profile = snap.data();
  }
}


// ============================================================
// SUBJECTS
// ============================================================

async function loadSubjects() {
  if (!state.user) return;

  const snap = await getDocs(
    collection(
      db,
      "users",
      state.user.uid,
      "subjects"
    )
  );

  state.subjects = snap.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

function getSelectedSubjects() {
  return state.subjects.map(s => s.id);
}

function subjectName(id) {
  return SUBJECTS[id] || id;
}

async function initializeSubjects(subjectIds) {
  for (const id of subjectIds) {
    const ref = subjectRef(id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        subjectId: id,
        name: subjectName(id),
        xp: 0,
        level: 1,
        totalMinutes: 0,
        createdAt: serverTimestamp()
      });
    }
  }

  await loadSubjects();
}


// ============================================================
// STUDY RECORDS
// ============================================================

async function loadStudyRecords() {
  if (!state.user) return;

  const q = query(
    studyCollection(),
    orderBy("createdAt", "desc"),
    limit(200)
  );

  const snap = await getDocs(q);

  state.studyRecords = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

function getTodayStudyMinutes() {
  const today = dateKey();

  return state.studyRecords
    .filter(record => record.date === today)
    .reduce(
      (sum, record) => sum + Number(record.minutes || 0),
      0
    );
}

function getSeasonStudyMinutes() {
  const season = getSeasonInfo();

  return state.studyRecords
    .filter(record => {
      const date = new Date(
        `${record.date}T00:00:00`
      );

      return (
        date >= season.start &&
        date <= season.end
      );
    })
    .reduce(
      (sum, record) => sum + Number(record.minutes || 0),
      0
    );
}

function getTotalStudyMinutes() {
  return state.studyRecords.reduce(
    (sum, record) => sum + Number(record.minutes || 0),
    0
  );
}


// ============================================================
// LEVEL / XP
// ============================================================

async function awardXp(amount, reason = "") {
  if (!state.user || amount <= 0) return;

  const before = calculateLevel(
    Number(state.profile.xp || 0)
  );

  let totalXp =
    Number(state.profile.xp || 0) + amount;

  let stars =
    Number(state.profile.stars || 0);

  let levelResult = calculateLevel(totalXp);

  if (
    before.level < 101 &&
    levelResult.level >= 101
  ) {
    stars += 1;

    totalXp = 0;
    levelResult = calculateLevel(0);

    await showLevelUp(
      before.level,
      101
    );

    notify("⭐ 星を獲得！Lv.1から再スタート！");
  } else if (levelResult.level > before.level) {
    await showLevelUp(
      before.level,
      levelResult.level
    );
  }

  await updateDoc(userRef(), {
    xp: totalXp,
    level: levelResult.level,
    stars,
    updatedAt: serverTimestamp()
  });

  state.profile.xp = totalXp;
  state.profile.level = levelResult.level;
  state.profile.stars = stars;

  await checkAchievements();
}

async function showLevelUp(oldLevel, newLevel) {
  text("level-up-old-level", oldLevel);
  text("level-up-new-level", newLevel);

  show("level-up-modal");
}

function refreshLevelUI() {
  if (!state.profile) return;

  const result = calculateLevel(
    Number(state.profile.xp || 0)
  );

  text("home-level", result.level);
  text("header-level", `Lv.${result.level}`);

  text(
    "home-xp",
    `${result.currentXp} XP`
  );

  if (result.level >= 101) {
    text(
      "home-xp-required",
      "MAX"
    );
  } else {
    text(
      "home-xp-required",
      `次のレベルまで ${result.requiredXp - result.currentXp} XP`
    );
  }

  const progress =
    result.requiredXp > 0
      ? Math.min(
          100,
          result.currentXp /
            result.requiredXp *
            100
        )
      : 100;

  const bar = $("level-progress");

  if (bar) {
    bar.style.width = `${progress}%`;
  }

  text(
    "star-count",
    `⭐ ${state.profile.stars || 0}`
  );

  text(
    "home-coins",
    state.profile.coins || 0
  );

  text(
    "header-coins",
    `🪙 ${state.profile.coins || 0} コイン`
  );
}


// ============================================================
// STUDY → XP
// ============================================================

async function recordStudy(
  subjectId,
  minutes,
  note = "",
  source = "manual"
) {
  minutes = Number(minutes);

  if (!subjectId || !Number.isFinite(minutes)) {
    throw new Error("教科または時間が不正です。");
  }

  if (minutes <= 0 || minutes > 1440) {
    throw new Error("勉強時間は1〜1440分で入力してください。");
  }

  const record = {
    userId: state.user.uid,
    subjectId,
    minutes,
    note,
    date: dateKey(),
    source,
    createdAt: serverTimestamp()
  };

  await addDoc(
    studyCollection(),
    record
  );

  const subject = await getDoc(
    subjectRef(subjectId)
  );

  if (subject.exists()) {
    const data = subject.data();

    const newXp =
      Number(data.xp || 0) + minutes;

    const result =
      calculateSubjectLevel(newXp);

    await updateDoc(
      subjectRef(subjectId),
      {
        xp: newXp,
        level: result.level,
        totalMinutes:
          Number(data.totalMinutes || 0) +
          minutes,
        updatedAt: serverTimestamp()
      }
    );
  }

  await awardXp(
    minutes,
    `${subjectName(subjectId)} ${minutes}分`
  );

  await updateSeasonStats(minutes);

  await loadStudyRecords();
  await loadSubjects();

  await checkAchievements();

  notify(
    `${minutes}分記録！ +${minutes} XP`
  );

  refreshAll();
}


// ============================================================
// 教科別レベル
// ============================================================

function calculateSubjectLevel(xp) {
  let level = 1;
  let remaining = Number(xp || 0);

  while (level < 100) {
    const requirement =
      100 + Math.floor((level - 1) / 10) * 50;

    if (remaining < requirement) {
      break;
    }

    remaining -= requirement;
    level++;
  }

  return {
    level,
    currentXp: remaining,
    requiredXp:
      100 + Math.floor((level - 1) / 10) * 50
  };
}

function renderSubjectLevels(containerId) {
  const container = $(containerId);

  if (!container) return;

  if (state.subjects.length === 0) {
    container.innerHTML =
      `<p class="empty-message">教科データがありません。</p>`;
    return;
  }

  container.innerHTML =
    state.subjects
      .map(subject => {
        const result =
          calculateSubjectLevel(
            Number(subject.xp || 0)
          );

        const percent =
          result.requiredXp > 0
            ? result.currentXp /
              result.requiredXp *
              100
            : 100;

        return `
          <div class="subject-level-card">
            <div class="subject-level-header">
              <strong>${escapeHtml(subject.name)}</strong>
              <span>Lv.${result.level}</span>
            </div>

            <div class="subject-level-bar">
              <div
                class="subject-level-progress"
                style="width:${Math.min(100, percent)}%"
              ></div>
            </div>

            <small>
              ${result.currentXp} /
              ${result.requiredXp} XP
            </small>
          </div>
        `;
      })
      .join("");
}


// ============================================================
// SEASON
// ============================================================

async function loadSeasonStats() {
  const season = getSeasonInfo();

  const snap = await getDoc(
    seasonStatsRef(season.id)
  );

  if (snap.exists()) {
    state.seasonStats = {
      id: snap.id,
      ...snap.data()
    };
  } else {
    const initial = {
      seasonId: season.id,
      studyMinutes: 0,
      rank: "bronze",
      rewardClaimed: false,
      createdAt: serverTimestamp()
    };

    await setDoc(
      seasonStatsRef(season.id),
      initial
    );

    state.seasonStats = {
      id: season.id,
      ...initial
    };
  }
}

async function updateSeasonStats(minutes) {
  const season = getSeasonInfo();

  if (!state.seasonStats) {
    await loadSeasonStats();
  }

  const total =
    getSeasonStudyMinutes();

  const rank =
    calculateRank(total);

  await setDoc(
    seasonStatsRef(season.id),
    {
      seasonId: season.id,
      studyMinutes: total,
      rank: rank.id,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  state.seasonStats.studyMinutes = total;
  state.seasonStats.rank = rank.id;
}

async function finalizePreviousSeasonIfNeeded() {
  // クライアント側では現在シーズンのみ管理。
  // 前シーズン履歴が存在する場合は履歴表示へ利用する。
}


// ============================================================
// QUEST
// ============================================================

const DAILY_QUESTS = [
  {
    id: "daily-study-30",
    title: "30分の冒険",
    description: "30分勉強する",
    type: "study",
    target: 30,
    rewardXp: 30,
    rewardCoins: 15
  },
  {
    id: "daily-study-60",
    title: "一時間の鍛錬",
    description: "合計60分勉強する",
    type: "study",
    target: 60,
    rewardXp: 60,
    rewardCoins: 30
  },
  {
    id: "daily-subject",
    title: "知識の一撃",
    description: "1教科を30分勉強する",
    type: "subject",
    target: 30,
    rewardXp: 45,
    rewardCoins: 20
  }
];

const WEEKLY_QUESTS = [
  {
    id: "weekly-300",
    title: "週300分の修行",
    description: "今週300分勉強する",
    type: "weeklyStudy",
    target: 300,
    rewardXp: 200,
    rewardCoins: 100
  },
  {
    id: "weekly-600",
    title: "週10時間の修行",
    description: "今週600分勉強する",
    type: "weeklyStudy",
    target: 600,
    rewardXp: 400,
    rewardCoins: 200
  }
];

function questIsCompleted(id, period) {
  return state.questCompletions.some(
    q =>
      q.questId === id &&
      q.period === period
  );
}

async function loadQuestCompletions() {
  if (!state.user) return;

  const snap = await getDocs(
    questCompletionCollection()
  );

  state.questCompletions =
    snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
}

function questProgress(quest) {
  if (quest.type === "study") {
    return Math.min(
      quest.target,
      getTodayStudyMinutes()
    );
  }

  if (quest.type === "subject") {
    const today = dateKey();

    const grouped = {};

    state.studyRecords
      .filter(r => r.date === today)
      .forEach(r => {
        grouped[r.subjectId] =
          (grouped[r.subjectId] || 0) +
          Number(r.minutes || 0);
      });

    return Math.min(
      quest.target,
      Math.max(
        0,
        ...Object.values(grouped)
      )
    );
  }

  if (quest.type === "weeklyStudy") {
    const info = getWeekInfo();
    const start = info.start;
    const end = info.end;

    return Math.min(
      quest.target,
      state.studyRecords
        .filter(record => {
          const date = new Date(
            `${record.date}T00:00:00`
          );

          return (
            date >= start &&
            date <= end
          );
        })
        .reduce(
          (sum, r) =>
            sum + Number(r.minutes || 0),
          0
        )
    );
  }

  return 0;
}

async function completeQuest(quest, period) {
  if (
    questIsCompleted(
      quest.id,
      period
    )
  ) {
    return;
  }

  const progress =
    questProgress(quest);

  if (progress < quest.target) {
    return;
  }

  await addDoc(
    questCompletionCollection(),
    {
      questId: quest.id,
      period,
      rewardXp: quest.rewardXp,
      rewardCoins: quest.rewardCoins,
      completedAt: serverTimestamp()
    }
  );

  await awardXp(
    quest.rewardXp,
    quest.title
  );

  await addCoins(
    quest.rewardCoins
  );

  await loadQuestCompletions();

  notify(
    `クエスト達成！ ${quest.title}`
  );
}

async function autoCompleteQuests() {
  const today = dateKey();
  const week = weekKey();

  for (const quest of DAILY_QUESTS) {
    await completeQuest(
      quest,
      today
    );
  }

  for (const quest of WEEKLY_QUESTS) {
    await completeQuest(
      quest,
      week
    );
  }
}

function renderQuests() {
  renderQuestList(
    "daily-quest-list",
    DAILY_QUESTS,
    dateKey()
  );

  renderQuestList(
    "weekly-quest-list",
    WEEKLY_QUESTS,
    weekKey()
  );

  renderSubjectQuests();
}

function renderQuestList(
  containerId,
  quests,
  period
) {
  const container = $(containerId);

  if (!container) return;

  container.innerHTML =
    quests.map(quest => {
      const progress =
        questProgress(quest);

      const completed =
        questIsCompleted(
          quest.id,
          period
        );

      const percent =
        Math.min(
          100,
          progress /
            quest.target *
            100
        );

      return `
        <div class="quest-card ${completed ? "completed" : ""}">
          <div>
            <strong>${escapeHtml(quest.title)}</strong>
            <p>${escapeHtml(quest.description)}</p>
          </div>

          <div class="quest-progress">
            <div
              class="quest-progress-bar"
              style="width:${percent}%"
            ></div>
          </div>

          <div class="quest-footer">
            <span>
              ${progress} / ${quest.target}
            </span>
            <span>
              +${quest.rewardXp} XP
              🪙 +${quest.rewardCoins}
            </span>
          </div>

          ${
            completed
              ? `<strong>✅ 達成済み</strong>`
              : ""
          }
        </div>
      `;
    }).join("");
}

function renderSubjectQuests() {
  const container =
    $("subject-quest-list");

  if (!container) return;

  container.innerHTML =
    state.subjects.map(subject => `
      <div class="quest-card">
        <strong>
          ${escapeHtml(subject.name)}の鍛錬
        </strong>
        <p>
          ${escapeHtml(subject.name)}を30分勉強する
        </p>
        <span>
          +45 XP / 🪙20
        </span>
      </div>
    `).join("");
}


// ============================================================
// COINS
// ============================================================

async function addCoins(amount) {
  if (!amount) return;

  await updateDoc(
    userRef(),
    {
      coins: increment(amount),
      updatedAt: serverTimestamp()
    }
  );

  state.profile.coins =
    Number(state.profile.coins || 0) +
    amount;

  refreshLevelUI();
}


// ============================================================
// BOSS
// ============================================================

const BOSS_NAMES = [
  "受験の魔王",
  "模試喰らい",
  "時間喰らい",
  "知識の暴君",
  "忘却の王",
  "参考書の巨人"
];

function seededNumber(seed) {
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash =
      (hash << 5) -
      hash +
      seed.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(hash);
}

async function loadBoss() {
  const info = getWeekInfo();

  const ref = doc(
    db,
    "bosses",
    info.id
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const seed =
      seededNumber(info.id);

    const weaknessIds =
      getSelectedSubjects();

    const weakness =
      weaknessIds.length > 0
        ? weaknessIds[
            seed % weaknessIds.length
          ]
        : "math";

    const baseHp = 500;

    const boss = {
      weekId: info.id,
      name:
        BOSS_NAMES[
          seed % BOSS_NAMES.length
        ],
      level:
        1 + (seed % 10),
      baseHp,
      maxHp: baseHp,
      currentHp: baseHp,
      weakness,
      weaknessMultiplier: 1.5,
      defeated: false,
      createdAt: serverTimestamp()
    };

    // 現行ルールでは signed-in user が
    // 作成可能なので、最初のアクセス時に生成する。
    await setDoc(
      ref,
      boss
    );

    state.boss = {
      id: info.id,
      ...boss
    };
  } else {
    state.boss = {
      id: snap.id,
      ...snap.data()
    };
  }

  renderBoss();
}

async function refreshBossHpForParty() {
  if (!state.boss) return;

  const memberCount =
    state.party?.memberIds?.length || 1;

  const base =
    Number(state.boss.baseHp || 500);

  const multiplier =
    1 +
    (memberCount - 1) * 0.75;

  const newMax =
    Math.round(base * multiplier);

  if (
    Number(state.boss.maxHp) !== newMax
  ) {
    const damageTaken =
      Math.max(
        0,
        Number(state.boss.maxHp || newMax) -
        Number(state.boss.currentHp || newMax)
      );

    const newCurrent =
      Math.max(
        0,
        newMax - damageTaken
      );

    await updateDoc(
      doc(
        db,
        "bosses",
        state.boss.id
      ),
      {
        maxHp: newMax,
        currentHp: newCurrent
      }
    );

    state.boss.maxHp = newMax;
    state.boss.currentHp = newCurrent;
  }
}

function calculateBossDamage(minutes, subjectId) {
  let damage = Number(minutes || 0);

  if (
    subjectId ===
    state.boss?.weakness
  ) {
    damage =
      Math.floor(
        damage *
        Number(
          state.boss.weaknessMultiplier ||
          1.5
        )
      );
  }

  return damage;
}

async function applyStudyToBoss(
  subjectId,
  minutes
) {
  if (!state.boss) {
    await loadBoss();
  }

  const damage =
    calculateBossDamage(
      minutes,
      subjectId
    );

  const newHp =
    Math.max(
      0,
      Number(state.boss.currentHp) -
      damage
    );

  const defeated =
    newHp <= 0;

  await updateDoc(
    doc(
      db,
      "bosses",
      state.boss.id
    ),
    {
      currentHp: newHp,
      defeated
    }
  );

  await addDoc(
    collection(
      db,
      "bosses",
      state.boss.id,
      "logs"
    ),
    {
      userId: state.user.uid,
      userName:
        state.profile.displayName,
      subjectId,
      minutes,
      damage,
      createdAt: serverTimestamp()
    }
  );

  state.boss.currentHp = newHp;
  state.boss.defeated = defeated;

  if (defeated) {
    await updateDoc(
      userRef(),
      {
        bossesDefeated:
          increment(1)
      }
    );

    state.profile.bossesDefeated =
      Number(
        state.profile.bossesDefeated || 0
      ) + 1;

    await awardXp(
      300,
      "ボス撃破"
    );

    await addCoins(150);

    notify("👹 ボス撃破！");
  }

  renderBoss();
}

function renderBoss() {
  const boss = state.boss;

  if (!boss) return;

  text("boss-name", boss.name);
  text(
    "boss-level",
    `Lv.${boss.level}`
  );

  text(
    "boss-current-hp",
    Math.max(
      0,
      Math.round(boss.currentHp)
    )
  );

  text(
    "boss-max-hp",
    Math.round(boss.maxHp)
  );

  text(
    "boss-weakness-subject",
    subjectName(boss.weakness)
  );

  text(
    "boss-weakness-multiplier",
    `×${boss.weaknessMultiplier || 1.5}`
  );

  const percent =
    boss.maxHp > 0
      ? boss.currentHp /
        boss.maxHp *
        100
      : 0;

  const bar =
    $("boss-hp-progress");

  if (bar) {
    bar.style.width =
      `${Math.max(0, percent)}%`;
  }

  const memberCount =
    state.party?.memberIds?.length || 1;

  text(
    "boss-party-count",
    `${memberCount}人`
  );
}


// ============================================================
// PARTY
// ============================================================

async function loadParty() {
  if (!state.user) return;

  const q = query(
    collection(db, "parties"),
    where(
      "memberIds",
      "array-contains",
      state.user.uid
    ),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    state.party = null;
    return;
  }

  state.party = {
    id: snap.docs[0].id,
    ...snap.docs[0].data()
  };
}

async function createParty() {
  if (state.party) {
    notify("すでにパーティーに所属しています。");
    return;
  }

  const ref = await addDoc(
    collection(db, "parties"),
    {
      leaderId: state.user.uid,
      memberIds: [state.user.uid],
      createdAt: serverTimestamp()
    }
  );

  state.party = {
    id: ref.id,
    leaderId: state.user.uid,
    memberIds: [state.user.uid]
  };

  await refreshBossHpForParty();

  notify("パーティーを結成した！");
  refreshParty();
}

async function inviteToParty(userId) {
  if (!state.party) {
    await createParty();
  }

  if (!state.party) return;

  if (
    state.party.memberIds.length >= 4
  ) {
    throw new Error(
      "パーティーは最大4人です。"
    );
  }

  if (
    state.party.memberIds.includes(userId)
  ) {
    throw new Error(
      "そのユーザーは既にメンバーです。"
    );
  }

  const q = query(
    collection(db, "users"),
    where("userId", "==", userId),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(
      "そのユーザーIDは見つかりません。"
    );
  }

  const receiver =
    snap.docs[0].data();

  await addDoc(
    collection(db, "partyInvites"),
    {
      partyId: state.party.id,
      senderId: state.user.uid,
      receiverId: snap.docs[0].id,
      receiverUserId: userId,
      status: "pending",
      createdAt: serverTimestamp()
    }
  );

  notify("招待を送信しました！");
}

async function loadInvitations() {
  if (!state.user) return;

  const q = query(
    collection(db, "partyInvites"),
    where(
      "receiverId",
      "==",
      state.user.uid
    ),
    where(
      "status",
      "==",
      "pending"
    )
  );

  const snap = await getDocs(q);

  state.invitations =
    snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
}

async function acceptPartyInvite(
  invitation
) {
  const partyRef =
    doc(
      db,
      "parties",
      invitation.partyId
    );

  const snap =
    await getDoc(partyRef);

  if (!snap.exists()) {
    throw new Error(
      "パーティーが存在しません。"
    );
  }

  const party = snap.data();

  if (party.memberIds.length >= 4) {
    throw new Error(
      "パーティーが満員です。"
    );
  }

  if (state.party) {
    throw new Error(
      "既に別のパーティーに所属しています。"
    );
  }

  const newMembers = [
    ...party.memberIds,
    state.user.uid
  ];

  await updateDoc(
    partyRef,
    {
      memberIds: newMembers
    }
  );

  await updateDoc(
    doc(
      db,
      "partyInvites",
      invitation.id
    ),
    {
      status: "accepted"
    }
  );

  await loadParty();
  await refreshBossHpForParty();

  notify("パーティーに加入した！");
  refreshParty();
}

function renderParty() {
  const list =
    $("party-member-list");

  if (!list) return;

  if (!state.party) {
    list.innerHTML = `
      <p class="empty-message">
        パーティーに所属していません。
      </p>
      <button
        type="button"
        class="primary-button"
        id="create-party-button"
      >
        パーティーを作る
      </button>
    `;

    $("create-party-button")
      ?.addEventListener(
        "click",
        createParty
      );

    text(
      "party-member-count",
      "0 / 4人"
    );

    return;
  }

  list.innerHTML =
    state.party.memberIds
      .map((uid, index) => `
        <div class="party-member">
          <strong>
            ${
              index === 0
                ? "👑 "
                : "⚔️ "
            }
            ${
              uid === state.user.uid
                ? escapeHtml(
                    state.profile.displayName
                  )
                : "冒険者"
            }
          </strong>
        </div>
      `)
      .join("");

  text(
    "party-member-count",
    `${state.party.memberIds.length} / 4人`
  );

  const invites =
    $("party-invitation-list");

  if (invites) {
    invites.innerHTML =
      state.invitations.length
        ? state.invitations.map(invite => `
            <div class="invitation-card">
              <p>
                パーティーへの招待が届いています。
              </p>
              <button
                class="primary-button accept-party-invite"
                data-id="${invite.id}"
              >
                参加する
              </button>
            </div>
          `).join("")
        : `
          <p class="empty-message">
            招待はありません。
          </p>
        `;

    invites
      .querySelectorAll(
        ".accept-party-invite"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          async () => {
            const invite =
              state.invitations.find(
                x =>
                  x.id ===
                  button.dataset.id
              );

            if (!invite) return;

            try {
              await acceptPartyInvite(
                invite
              );
            } catch (e) {
              notify(e.message);
            }
          }
        );
      });
  }
}


// ============================================================
// FRIENDS
// ============================================================

async function addFriend(userId) {
  if (!userId) {
    throw new Error("ユーザーIDを入力してください。");
  }

  if (
    userId === state.profile.userId
  ) {
    throw new Error(
      "自分自身は追加できません。"
    );
  }

  const q = query(
    collection(db, "users"),
    where(
      "userId",
      "==",
      userId
    ),
    limit(1)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(
      "ユーザーが見つかりません。"
    );
  }

  const targetUid =
    snap.docs[0].id;

  await addDoc(
    collection(db, "friendRequests"),
    {
      senderId: state.user.uid,
      receiverId: targetUid,
      status: "pending",
      createdAt: serverTimestamp()
    }
  );

  notify("フレンド申請を送信しました！");
}

async function loadFriends() {
  if (!state.user) return;

  const snap = await getDocs(
    collection(
      db,
      "users",
      state.user.uid,
      "friends"
    )
  );

  state.friends =
    snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
}

function renderFriends() {
  const list =
    $("friend-list");

  if (!list) return;

  list.innerHTML =
    state.friends.length
      ? state.friends.map(friend => `
          <div class="friend-card">
            <strong>
              ${escapeHtml(
                friend.displayName ||
                friend.userId ||
                "冒険者"
              )}
            </strong>
          </div>
        `).join("")
      : `
        <p class="empty-message">
          フレンドはいません。
        </p>
      `;
}


// ============================================================
// ACHIEVEMENTS
// ============================================================

const ACHIEVEMENTS = [
  {
    id: "first-study",
    name: "最初の一歩",
    description: "初めて勉強を記録する",
    rewardXp: 20,
    rewardCoins: 10,
    hidden: false
  },
  {
    id: "study-100",
    name: "100分の冒険",
    description: "累計100分勉強する",
    rewardXp: 50,
    rewardCoins: 25,
    hidden: false
  },
  {
    id: "study-1000",
    name: "千分の修行者",
    description: "累計1000分勉強する",
    rewardXp: 100,
    rewardCoins: 50,
    hidden: false
  },
  {
    id: "level-10",
    name: "駆け出しの英雄",
    description: "Lv.10に到達する",
    rewardXp: 100,
    rewardCoins: 50,
    hidden: false
  },
  {
    id: "gold-rank",
    name: "黄金の冒険者",
    description: "Goldに到達する",
    rewardXp: 150,
    rewardCoins: 75,
    hidden: false
  },
  {
    id: "first-boss",
    name: "魔王討伐",
    description: "初めてボスを撃破する",
    rewardXp: 200,
    rewardCoins: 100,
    hidden: false
  },

  // ----------------------------------------------------------
  // 隠し実績 10個
  // ----------------------------------------------------------

  {
    id: "hidden-midnight",
    name: "深夜の冒険者",
    description: "日付が変わる直前の時間帯に勉強を記録する",
    rewardXp: 100,
    rewardCoins: 50,
    hidden: true
  },
  {
    id: "hidden-speed",
    name: "時の支配者",
    description: "同日に複数回の勉強記録を残す",
    rewardXp: 100,
    rewardCoins: 50,
    hidden: true
  },
  {
    id: "hidden-one-subject",
    name: "一途な探究者",
    description: "1日に同じ教科を長時間鍛える",
    rewardXp: 125,
    rewardCoins: 60,
    hidden: true
  },
  {
    id: "hidden-many-subjects",
    name: "全方位型",
    description: "複数教科を1日に記録する",
    rewardXp: 125,
    rewardCoins: 60,
    hidden: true
  },
  {
    id: "hidden-streak",
    name: "途切れぬ旅路",
    description: "7日連続で勉強する",
    rewardXp: 200,
    rewardCoins: 100,
    hidden: true
  },
  {
    id: "hidden-300",
    name: "一日の限界突破",
    description: "1日に300分以上勉強する",
    rewardXp: 200,
    rewardCoins: 100,
    hidden: true
  },
  {
    id: "hidden-all-subjects",
    name: "全知への道",
    description: "登録している全教科を記録する",
    rewardXp: 250,
    rewardCoins: 125,
    hidden: true
  },
  {
    id: "hidden-boss-weakness",
    name: "弱点看破",
    description: "ボスの弱点教科で攻撃する",
    rewardXp: 150,
    rewardCoins: 75,
    hidden: true
  },
  {
    id: "hidden-party",
    name: "仲間と共に",
    description: "4人パーティーを完成させる",
    rewardXp: 200,
    rewardCoins: 100,
    hidden: true
  },
  {
    id: "hidden-all-report",
    name: "あり得ない知能",
    description: "自己申告で登録している全教科を一度に報告する",
    rewardXp: 300,
    rewardCoins: 150,
    hidden: true
  }
];

async function getUnlockedAchievements() {
  const snap =
    await getDocs(
      collection(
        db,
        "users",
        state.user.uid,
        "achievements"
      )
    );

  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

async function unlockAchievement(
  achievement
) {
  const ref =
    doc(
      db,
      "users",
      state.user.uid,
      "achievements",
      achievement.id
    );

  const snap =
    await getDoc(ref);

  if (snap.exists()) {
    return;
  }

  await setDoc(ref, {
    achievementId:
      achievement.id,
    name:
      achievement.name,
    unlockedAt:
      serverTimestamp()
  });

  await awardXp(
    achievement.rewardXp,
    achievement.name
  );

  await addCoins(
    achievement.rewardCoins
  );

  text(
    "achievement-unlock-name",
    achievement.name
  );

  text(
    "achievement-unlock-description",
    achievement.description
  );

  show(
    "achievement-unlock-modal"
  );
}

async function checkAchievements() {
  if (!state.user) return;

  const unlocked =
    await getUnlockedAchievements();

  const has = id =>
    unlocked.some(
      a => a.id === id
    );

  const totalMinutes =
    getTotalStudyMinutes();

  if (
    totalMinutes > 0 &&
    !has("first-study")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "first-study"
      )
    );
  }

  if (
    totalMinutes >= 100 &&
    !has("study-100")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "study-100"
      )
    );
  }

  if (
    totalMinutes >= 1000 &&
    !has("study-1000")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "study-1000"
      )
    );
  }

  if (
    Number(state.profile.level || 1) >= 10 &&
    !has("level-10")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "level-10"
      )
    );
  }

  const rank =
    calculateRank(
      getSeasonStudyMinutes()
    );

  if (
    ["gold", "platinum", "diamond", "master", "grandmaster", "legend"]
      .includes(rank.id) &&
    !has("gold-rank")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "gold-rank"
      )
    );
  }

  // 隠し 300分
  if (
    getTodayStudyMinutes() >= 300 &&
    !has("hidden-300")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "hidden-300"
      )
    );
  }

  // 複数教科
  const today =
    state.studyRecords
      .filter(
        r => r.date === dateKey()
      )
      .map(r => r.subjectId);

  if (
    new Set(today).size >= 2 &&
    !has("hidden-many-subjects")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "hidden-many-subjects"
      )
    );
  }

  // 全教科
  if (
    state.subjects.length > 0 &&
    state.subjects.every(
      s => today.includes(s.id)
    ) &&
    !has("hidden-all-subjects")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "hidden-all-subjects"
      )
    );
  }

  // 深夜
  const hour =
    new Date().getHours();

  if (
    hour === 23 &&
    !has("hidden-midnight")
  ) {
    await unlockAchievement(
      ACHIEVEMENTS.find(
        a => a.id === "hidden-midnight"
      )
    );
  }
}

async function refreshAchievements() {
  const unlocked =
    await getUnlockedAchievements();

  const list =
    $("achievement-list");

  if (list) {
    list.innerHTML =
      ACHIEVEMENTS
        .filter(a => !a.hidden)
        .map(a => {
          const isUnlocked =
            unlocked.some(
              x => x.id === a.id
            );

          return `
            <div class="achievement-card ${
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
                ${escapeHtml(a.name)}
              </strong>
              <p>
                ${escapeHtml(a.description)}
              </p>
            </div>
          `;
        })
        .join("");
  }

  const titleList =
    $("title-list");

  if (titleList) {
    titleList.innerHTML =
      `<p class="empty-message">
        獲得した称号をここで確認できます。
      </p>`;
  }

  text(
    "achievement-count",
    `${unlocked.length} / ${ACHIEVEMENTS.length}`
  );
}


// ============================================================
// TITLES
// ============================================================

const TITLES = [
  {
    id: "unknown-adventurer",
    name: "無名の冒険者",
    description: "最初から所持"
  },
  {
    id: "study-adventurer",
    name: "勉強冒険者",
    description: "100分勉強"
  },
  {
    id: "golden-adventurer",
    name: "黄金の冒険者",
    description: "Gold到達"
  },
  {
    id: "boss-slayer",
    name: "魔王討伐者",
    description: "ボス撃破"
  },
  {
    id: "impossible-intelligence",
    name: "あり得ない知能",
    description: "隠し実績「あり得ない知能」"
  }
];


// ============================================================
// SHOP
// ============================================================

const SHOP_ITEMS = [
  {
    id: "small-potion",
    name: "集中ポーション",
    description: "ゲーム内アイテム",
    price: 100,
    type: "item"
  },
  {
    id: "boss-power",
    name: "勇者の証",
    description: "ボス戦で使用できるアイテム",
    price: 250,
    type: "item"
  }
];

const SHOP_TITLES = [
  {
    id: "hard-worker",
    name: "努力家",
    price: 300,
    type: "title"
  },
  {
    id: "study-hero",
    name: "勉強の勇者",
    price: 750,
    type: "title"
  }
];

const SHOP_OUTFITS = [
  {
    id: "default-outfit",
    name: "冒険者の服",
    price: 100,
    type: "outfit"
  },
  {
    id: "knight-outfit",
    name: "受験騎士装備",
    price: 500,
    type: "outfit"
  }
];

async function purchaseItem(
  item
) {
  const coins =
    Number(state.profile.coins || 0);

  if (coins < item.price) {
    notify("コインが足りません。");
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

  const snap =
    await getDoc(inventoryRef);

  if (snap.exists()) {
    notify("すでに所持しています。");
    return;
  }

  await updateDoc(
    userRef(),
    {
      coins:
        increment(-item.price)
    }
  );

  await setDoc(
    inventoryRef,
    {
      itemId: item.id,
      name: item.name,
      type: item.type,
      purchasedAt:
        serverTimestamp()
    }
  );

  state.profile.coins -= item.price;

  notify(
    `${item.name}を購入しました！`
  );

  refreshLevelUI();
  refreshShop();
}

function renderShopList(
  containerId,
  items
) {
  const container =
    $(containerId);

  if (!container) return;

  container.innerHTML =
    items.map(item => `
      <div class="shop-item-card">
        <strong>
          ${escapeHtml(item.name)}
        </strong>
        <p>
          ${escapeHtml(
            item.description || ""
          )}
        </p>
        <div>
          🪙 ${item.price}
        </div>
        <button
          class="primary-button shop-buy-button"
          data-item-id="${item.id}"
        >
          購入
        </button>
      </div>
    `).join("");

  container
    .querySelectorAll(
      ".shop-buy-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const item =
            [...SHOP_ITEMS, ...SHOP_TITLES, ...SHOP_OUTFITS]
              .find(
                x =>
                  x.id ===
                  button.dataset.itemId
              );

          if (item) {
            purchaseItem(item);
          }
        }
      );
    });
}

async function refreshShop() {
  text(
    "shop-coins",
    `🪙 ${state.profile.coins || 0}`
  );

  renderShopList(
    "shop-item-list",
    SHOP_ITEMS
  );

  renderShopList(
    "shop-title-list",
    SHOP_TITLES
  );

  renderShopList(
    "shop-outfit-list",
    SHOP_OUTFITS
  );
}


// ============================================================
// LOCKER
// ============================================================

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

  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

async function refreshLocker() {
  const inventory =
    await getInventory();

  const titles =
    inventory.filter(
      i => i.type === "title"
    );

  const items =
    inventory.filter(
      i => i.type === "item"
    );

  const outfits =
    inventory.filter(
      i => i.type === "outfit"
    );

  html(
    "locker-title-list",
    titles.length
      ? titles.map(
          x =>
            `<div class="locker-item">
              🏷️ ${escapeHtml(x.name)}
            </div>`
        ).join("")
      : `<p class="empty-message">
          所持称号はありません。
        </p>`
  );

  html(
    "locker-item-list",
    items.length
      ? items.map(
          x =>
            `<div class="locker-item">
              🎁 ${escapeHtml(x.name)}
            </div>`
        ).join("")
      : `<p class="empty-message">
          所持アイテムはありません。
        </p>`
  );

  html(
    "locker-outfit-list",
    outfits.length
      ? outfits.map(
          x =>
            `<div class="locker-item">
              👕 ${escapeHtml(x.name)}
            </div>`
        ).join("")
      : `<p class="empty-message">
          着せ替えはありません。
        </p>`
  );
}


// ============================================================
// RANK UI
// ============================================================

function applyRankTheme(rank) {
  document.documentElement.style.setProperty(
    "--rank-color",
    rank.color
  );

  document.documentElement.style.setProperty(
    "--rank-text-color",
    rank.textColor
  );

  [
    "current-rank",
    "home-rank",
    "season-rank",
    "profile-rank",
    "header-rank"
  ].forEach(id => {
    const el = $(id);

    if (!el) return;

    el.dataset.rank =
      rank.id;

    el.style.setProperty(
      "--current-rank-color",
      rank.color
    );

    el.style.setProperty(
      "--current-rank-text",
      rank.textColor
    );
  });
}

function refreshRank() {
  const minutes =
    getSeasonStudyMinutes();

  const rank =
    calculateRank(minutes);

  const next =
    getNextRank(rank.id);

  applyRankTheme(rank);

  text(
    "current-rank-name",
    rank.name
  );

  text(
    "season-rank",
    rank.name
  );

  text(
    "home-rank",
    rank.name
  );

  text(
    "header-rank",
    rank.name
  );

  text(
    "profile-rank",
    rank.name
  );

  text(
    "season-study-time",
    formatMinutes(minutes)
  );

  if (next) {
    const needed =
      Math.max(
        0,
        next.minHours * 60 -
        minutes
      );

    text(
      "next-rank-requirement",
      `${formatMinutes(needed)}`
    );
  } else {
    text(
      "next-rank-requirement",
      "最高ランク"
    );
  }

  const season =
    getSeasonInfo();

  text(
    "current-season-range",
    `${formatDate(season.start)} ～ ${formatDate(season.end)}`
  );

  text(
    "home-season-range",
    `${formatDate(season.start)} ～ ${formatDate(season.end)}`
  );

  text(
    "home-season-end",
    formatDate(season.end)
  );

  renderRankTable();
}

function renderRankTable() {
  const tbody =
    document.querySelector(
      "#rank-requirements tbody"
    );

  if (!tbody) return;

  tbody.innerHTML =
    RANKS.map(rank => `
      <tr data-rank="${rank.id}">
        <td>${rank.name}</td>
        <td>${rank.minHours}時間〜</td>
      </tr>
    `).join("");
}


// ============================================================
// PROFILE
// ============================================================

function refreshProfile() {
  if (!state.profile) return;

  text(
    "profile-display-name",
    state.profile.displayName
  );

  text(
    "profile-user-id",
    state.profile.userId
  );

  text(
    "profile-course",
    courseName(
      state.profile.course
    )
  );

  text(
    "profile-level",
    state.profile.level || 1
  );

  text(
    "profile-stars",
    state.profile.stars || 0
  );

  text(
    "profile-coins",
    state.profile.coins || 0
  );

  text(
    "profile-title",
    state.profile.equippedTitle ||
    "無名の冒険者"
  );

  text(
    "profile-total-study-time",
    formatMinutes(
      getTotalStudyMinutes()
    )
  );

  text(
    "profile-total-xp",
    `${state.profile.xp || 0} XP`
  );

  text(
    "profile-bosses-defeated",
    state.profile.bossesDefeated || 0
  );

  text(
    "profile-quests-completed",
    state.profile.questsCompleted || 0
  );

  renderSubjectLevels(
    "profile-subject-list"
  );
}

function courseName(course) {
  const map = {
    science: "理系",
    humanities: "文系",
    undecided: "未定"
  };

  return map[course] || "-";
}


// ============================================================
// HOME
// ============================================================

function refreshHome() {
  if (!state.profile) return;

  refreshLevelUI();
  refreshRank();

  text(
    "header-display-name",
    state.profile.displayName
  );

  text(
    "today-study-time",
    formatMinutes(
      getTodayStudyMinutes()
    )
  );

  text(
    "today-xp",
    `${getTodayStudyMinutes()} XP`
  );

  const today =
    dateKey();

  const quests =
    state.questCompletions
      .filter(
        q => q.period === today
      ).length;

  text(
    "today-quests",
    quests
  );

  renderQuests();
}


// ============================================================
// STUDY
// ============================================================

function populateSubjectSelects() {
  const ids = [
    "study-subject",
    "timer-study-subject"
  ];

  ids.forEach(id => {
    const select = $(id);

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
          subject.id;

        option.textContent =
          subject.name;

        select.appendChild(option);
      }
    );
  });
}

function refreshStudy() {
  populateSubjectSelects();

  renderSubjectLevels(
    "subject-level-list"
  );

  renderSubjectSummary();
  renderStudyHistory();
}

function renderSubjectSummary() {
  const container =
    $("subject-study-list");

  if (!container) return;

  container.innerHTML =
    state.subjects.map(subject => {
      const minutes =
        state.studyRecords
          .filter(
            r =>
              r.subjectId ===
              subject.id
          )
          .reduce(
            (sum, r) =>
              sum +
              Number(
                r.minutes || 0
              ),
            0
          );

      return `
        <div class="summary-card">
          <span>
            ${escapeHtml(subject.name)}
          </span>
          <strong>
            ${formatMinutes(minutes)}
          </strong>
        </div>
      `;
    }).join("");
}

function renderStudyHistory() {
  const container =
    $("study-history-list");

  if (!container) return;

  const records =
    state.studyRecords
      .slice(0, 50);

  container.innerHTML =
    records.length
      ? records.map(record => `
          <div class="study-history-card">
            <strong>
              ${escapeHtml(
                subjectName(
                  record.subjectId
                )
              )}
            </strong>
            <span>
              ${record.minutes}分
            </span>
            <small>
              ${escapeHtml(
                record.date || ""
              )}
            </small>
            ${
              record.note
                ? `<p>${escapeHtml(record.note)}</p>`
                : ""
            }
          </div>
        `).join("")
      : `
        <p class="empty-message">
          まだ勉強記録がありません。
        </p>
      `;
}


// ============================================================
// TIMER
// ============================================================

function updateTimerDisplay() {
  const total =
    state.timer.seconds;

  const h =
    Math.floor(
      total / 3600
    );

  const m =
    Math.floor(
      (total % 3600) / 60
    );

  const s =
    total % 60;

  text(
    "study-timer-display",
    `${pad(h)}:${pad(m)}:${pad(s)}`
  );
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

  state.timer.running = false;

  clearInterval(
    state.timer.interval
  );

  state.timer.interval = null;
}

function resetTimer() {
  pauseTimer();

  state.timer.seconds = 0;
  state.timer.startedAt = null;

  updateTimerDisplay();
}

async function saveTimer() {
  const minutes =
    Math.floor(
      state.timer.seconds / 60
    );

  const subject =
    $("timer-study-subject")
      ?.value;

  if (!subject) {
    error(
      "timer-error",
      "教科を選択してください。"
    );
    return;
  }

  if (minutes <= 0) {
    error(
      "timer-error",
      "1分以上勉強してください。"
    );
    return;
  }

  try {
    await recordStudy(
      subject,
      minutes,
      "タイマー記録",
      "timer"
    );

    resetTimer();
    error(
      "timer-error",
      ""
    );
  } catch (e) {
    error(
      "timer-error",
      e.message
    );
  }
}


// ============================================================
// SETTINGS
// ============================================================

function refreshSettings() {
  if (!state.profile) return;

  const nameInput =
    $("settings-display-name");

  if (nameInput) {
    nameInput.value =
      state.profile.displayName || "";
  }

  renderSettingsSubjects();
}

function renderSettingsSubjects() {
  const container =
    $("settings-subject-selection");

  if (!container) return;

  container.innerHTML =
    Object.entries(
      SUBJECTS
    ).map(
      ([id, name]) => `
        <label>
          <input
            type="checkbox"
            name="settings-subjects"
            value="${id}"
            ${
              state.subjects.some(
                s => s.id === id
              )
                ? "checked"
                : ""
            }
          >
          ${name}
        </label>
      `
    ).join("");
}

async function changeDisplayName(
  name
) {
  name = name.trim();

  if (!name) {
    throw new Error(
      "表示名を入力してください。"
    );
  }

  await updateDoc(
    userRef(),
    {
      displayName: name,
      updatedAt: serverTimestamp()
    }
  );

  state.profile.displayName =
    name;

  refreshAll();

  notify("表示名を変更しました！");
}

async function changeSubjects(
  subjects
) {
  if (!subjects.length) {
    throw new Error(
      "最低1教科は選択してください。"
    );
  }

  await initializeSubjects(
    subjects
  );

  const old =
    state.subjects.map(
      s => s.id
    );

  for (const id of old) {
    if (!subjects.includes(id)) {
      await deleteDoc(
        subjectRef(id)
      );
    }
  }

  await loadSubjects();

  populateSubjectSelects();

  notify("受験教科を更新しました！");
}


// ============================================================
// AUTH
// ============================================================

function usernameEmail(userId) {
  return `${userId.toLowerCase()}@jukenrpg.example.com`;
}

function validateUserId(userId) {
  return /^[A-Za-z0-9_-]{3,30}$/.test(
    userId
  );
}

async function register(formData) {
  const userId =
    formData.userId.trim();

  const password =
    formData.password;

  const passwordConfirm =
    formData.passwordConfirm;

  const displayName =
    formData.displayName.trim();

  const course =
    formData.course;

  const subjects =
    formData.subjects;

  if (!validateUserId(userId)) {
    throw new Error(
      "ユーザーIDは3〜30文字の英数字・_・-で入力してください。"
    );
  }

  if (password.length < 6) {
    throw new Error(
      "パスワードは6文字以上にしてください。"
    );
  }

  if (
    password !==
    passwordConfirm
  ) {
    throw new Error(
      "パスワードが一致しません。"
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

  if (!subjects.length) {
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

  const uid =
    credential.user.uid;

  const profile = {
    userId,
    displayName,
    course,
    xp: 0,
    level: 1,
    stars: 0,
    coins: 0,
    equippedTitle:
      "無名の冒険者",
    bossesDefeated: 0,
    questsCompleted: 0,
    totalStudyMinutes: 0,
    createdAt:
      serverTimestamp(),
    updatedAt:
      serverTimestamp()
  };

  await setDoc(
    doc(db, "users", uid),
    profile
  );

  await initializeSubjectsForUid(
    uid,
    subjects
  );

  state.profile = {
    ...profile,
    xp: 0,
    level: 1,
    stars: 0,
    coins: 0
  };
}

async function initializeSubjectsForUid(
  uid,
  subjectIds
) {
  for (const id of subjectIds) {
    await setDoc(
      doc(
        db,
        "users",
        uid,
        "subjects",
        id
      ),
      {
        subjectId: id,
        name: subjectName(id),
        xp: 0,
        level: 1,
        totalMinutes: 0,
        createdAt:
          serverTimestamp()
      }
    );
  }
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
// AUTH UI
// ============================================================

function setupAuth() {
  $("show-register-button")
    ?.addEventListener(
      "click",
      () => {
        hide("login-screen");
        show("register-screen");
      }
    );

  $("show-login-button")
    ?.addEventListener(
      "click",
      () => {
        hide("register-screen");
        show("login-screen");
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

        const userId =
          $("login-user-id")
            .value;

        const password =
          $("login-password")
            .value;

        try {
          await login(
            userId,
            password
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
            input => input.value
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
        await signOut(auth);
      }
    );
}


// ============================================================
// EVENT SETUP
// ============================================================

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
            button.dataset.screen
          );
        }
      );
    });

  document
    .querySelectorAll(
      ".menu-card"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          navigateTo(
            button.dataset.menuScreen
          );
        }
      );
    });
}

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
              .value.trim()
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
              .value.trim()
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
}

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
            x => x.value
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

function setupModal() {
  $("level-up-close-button")
    ?.addEventListener(
      "click",
      () => {
        hide("level-up-modal");
      }
    );

  $("achievement-unlock-close-button")
    ?.addEventListener(
      "click",
      () => {
        hide(
          "achievement-unlock-modal"
        );
      }
    );

  $("purchase-cancel-button")
    ?.addEventListener(
      "click",
      () => {
        hide("purchase-modal");
      }
    );
}


// ============================================================
// REFRESH
// ============================================================

function refreshAll() {
  refreshLevelUI();
  refreshHome();
  refreshStudy();
  refreshQuest();
  refreshParty();
  refreshRank();
  refreshProfile();
  refreshShop();
  refreshLocker();
  refreshSettings();
}

async function refreshQuest() {
  await autoCompleteQuests();

  renderQuests();

  if (state.boss) {
    renderBoss();
  }
}

async function refreshParty() {
  await loadParty();
  await loadInvitations();

  if (state.party) {
    await refreshBossHpForParty();
  }

  renderParty();

  if (state.boss) {
    renderBoss();
  }
}


// ============================================================
// APP INITIALIZATION
// ============================================================

async function initializeUserApp() {
  show("main-app");
  hide("auth-screen");

  await loadProfile();
  await loadSubjects();
  await loadStudyRecords();
  await loadQuestCompletions();
  await loadSeasonStats();
  await loadParty();
  await loadInvitations();
  await loadFriends();
  await loadBoss();

  populateSubjectSelects();

  refreshAll();

  navigateTo(
    "home-screen"
  );
}

function resetState() {
  state.user = null;
  state.profile = null;
  state.subjects = [];
  state.studyRecords = [];
  state.questCompletions = [];
  state.party = null;
  state.friends = [];
  state.invitations = [];
  state.boss = null;
  state.seasonStats = null;

  resetTimer();

  hide("main-app");
  show("auth-screen");
}


// ============================================================
// ERROR HANDLING
// ============================================================

function authErrorMessage(error) {
  const code =
    error?.code || "";

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
    "auth/requires-recent-login":
      "安全のため、一度ログインし直してください。"
  };

  return (
    messages[code] ||
    error?.message ||
    "エラーが発生しました。"
  );
}


// ============================================================
// XSS対策
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
// START
// ============================================================

setupAuth();
setupNavigation();
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
        "データの読み込みに失敗しました。"
      );
    }
  }
);
