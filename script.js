/* =========================================================
   受験RPG
   Main JavaScript
   ========================================================= */

"use strict";

/* =========================================================
   CONSTANTS
   ========================================================= */

const STORAGE_KEY = "juken_rpg_accounts_v1";
const SESSION_KEY = "juken_rpg_session_v1";

const MAX_LEVEL = 100;

const SUBJECTS = [
  "国語",
  "数学",
  "英語",
  "物理",
  "化学",
  "生物",
  "地理",
  "日本史",
  "世界史",
  "政治経済"
];

/*
 * Lvごとの必要XP
 *
 * Lv1 → Lv2 : 50
 * Lv2 → Lv3 : 100
 * Lv3 → Lv4 : 150
 *
 * 「各段階50ずつ増える」仕様
 */
function requiredXpForLevel(level) {
  return level * 50;
}


/* =========================================================
   RANK
   月間累計勉強時間で決定
   ========================================================= */

const RANKS = [
  {
    name: "Bronze",
    minHours: 0,
    icon: "🥉"
  },
  {
    name: "Silver",
    minHours: 30,
    icon: "🥈"
  },
  {
    name: "Gold",
    minHours: 60,
    icon: "🥇"
  },
  {
    name: "Platinum",
    minHours: 100,
    icon: "💎"
  },
  {
    name: "Diamond",
    minHours: 150,
    icon: "💠"
  },
  {
    name: "Master",
    minHours: 200,
    icon: "👑"
  },
  {
    name: "Grand Master",
    minHours: 260,
    icon: "🔥"
  },
  {
    name: "Legend",
    minHours: 330,
    icon: "🌟"
  }
];

function calculateRank(monthlyMinutes) {
  const hours = monthlyMinutes / 60;

  let current = RANKS[0];

  for (const rank of RANKS) {
    if (hours >= rank.minHours) {
      current = rank;
    }
  }

  return current;
}


/* =========================================================
   STAR TITLES
   ========================================================= */

const STAR_TITLES = [
  "駆け出しの冒険者",
  "努力の旅人",
  "知識の探求者",
  "限界突破者",
  "学習の猛者",
  "受験戦士",
  "未来への挑戦者",
  "知識の騎士",
  "試練を越えし者",
  "合格への先導者",
  "受験界の覇者"
];

function getStarTitle(stars) {
  if (stars <= 0) {
    return "駆け出しの冒険者";
  }

  return STAR_TITLES[
    Math.min(stars, STAR_TITLES.length - 1)
  ];
}


/* =========================================================
   DAILY / WEEKLY
   ========================================================= */

const DAILY_QUEST_TEMPLATES = [
  {
    type: "study",
    min: 30,
    text: "30分以上勉強する",
    reward: 30
  },
  {
    type: "study",
    min: 60,
    text: "1時間以上勉強する",
    reward: 60
  },
  {
    type: "subject",
    min: 30,
    text: "指定教科を30分勉強する",
    reward: 35
  },
  {
    type: "subject",
    min: 45,
    text: "指定教科を45分勉強する",
    reward: 50
  },
  {
    type: "subject",
    min: 60,
    text: "指定教科を1時間勉強する",
    reward: 70
  }
];

const WEEKLY_QUEST_TEMPLATES = [
  {
    min: 300,
    text: "今週合計5時間勉強する",
    reward: 150
  },
  {
    min: 600,
    text: "今週合計10時間勉強する",
    reward: 300
  },
  {
    min: 900,
    text: "今週合計15時間勉強する",
    reward: 500
  },
  {
    min: 1200,
    text: "今週合計20時間勉強する",
    reward: 750
  }
];


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

const ACHIEVEMENTS = [

  {
    id: "first_study",
    icon: "📖",
    name: "冒険開始",
    description: "初めて勉強時間を記録する",
    check: p => p.totalStudyMinutes >= 1
  },

  {
    id: "study_60",
    icon: "⏱️",
    name: "第一歩",
    description: "累計1時間勉強する",
    check: p => p.totalStudyMinutes >= 60
  },

  {
    id: "study_300",
    icon: "🔥",
    name: "5時間突破",
    description: "累計5時間勉強する",
    check: p => p.totalStudyMinutes >= 300
  },

  {
    id: "study_600",
    icon: "🔥",
    name: "10時間突破",
    description: "累計10時間勉強する",
    check: p => p.totalStudyMinutes >= 600
  },

  {
    id: "study_1000",
    icon: "⚔️",
    name: "1000分の壁",
    description: "累計1000分勉強する",
    check: p => p.totalStudyMinutes >= 1000
  },

  {
    id: "study_3000",
    icon: "🏹",
    name: "3000分の猛者",
    description: "累計3000分勉強する",
    check: p => p.totalStudyMinutes >= 3000
  },

  {
    id: "study_5000",
    icon: "👑",
    name: "5000分の覇者",
    description: "累計5000分勉強する",
    check: p => p.totalStudyMinutes >= 5000
  },

  {
    id: "study_10000",
    icon: "🌟",
    name: "一万分の伝説",
    description: "累計10000分勉強する",
    check: p => p.totalStudyMinutes >= 10000
  },

  {
    id: "level_10",
    icon: "⬆️",
    name: "Lv.10",
    description: "レベル10に到達する",
    check: p => p.level >= 10
  },

  {
    id: "level_25",
    icon: "⚡",
    name: "Lv.25",
    description: "レベル25に到達する",
    check: p => p.level >= 25
  },

  {
    id: "level_50",
    icon: "💎",
    name: "Lv.50",
    description: "レベル50に到達する",
    check: p => p.level >= 50
  },

  {
    id: "level_75",
    icon: "👑",
    name: "Lv.75",
    description: "レベル75に到達する",
    check: p => p.level >= 75
  },

  {
    id: "level_100",
    icon: "🌟",
    name: "限界突破",
    description: "Lv.100に到達する",
    check: p => p.level >= 100
  },

  {
    id: "star_1",
    icon: "⭐",
    name: "転生者",
    description: "初めて転生する",
    check: p => p.stars >= 1
  },

  {
    id: "star_3",
    icon: "🌟",
    name: "三つ星冒険者",
    description: "星を3つ獲得する",
    check: p => p.stars >= 3
  },

  {
    id: "star_5",
    icon: "✨",
    name: "五つ星",
    description: "星を5つ獲得する",
    check: p => p.stars >= 5
  },

  {
    id: "star_10",
    icon: "🌌",
    name: "星空の支配者",
    description: "星を10個獲得する",
    check: p => p.stars >= 10
  },

  {
    id: "daily_7",
    icon: "📅",
    name: "一週間の戦士",
    description: "デイリークエストを7個達成",
    check: p => p.dailyCompleted >= 7
  },

  {
    id: "daily_30",
    icon: "📅",
    name: "習慣化",
    description: "デイリークエストを30個達成",
    check: p => p.dailyCompleted >= 30
  },

  {
    id: "weekly_4",
    icon: "🗓️",
    name: "週間制覇",
    description: "ウィークリークエストを4個達成",
    check: p => p.weeklyCompleted >= 4
  },

  {
    id: "boss_first",
    icon: "🐉",
    name: "初討伐",
    description: "ボスを1体討伐する",
    check: p => p.bossKills >= 1
  },

  {
    id: "boss_10",
    icon: "🐲",
    name: "竜殺し",
    description: "ボスを10体討伐する",
    check: p => p.bossKills >= 10
  },

  {
    id: "boss_50",
    icon: "☠️",
    name: "魔王討伐者",
    description: "ボスを50体討伐する",
    check: p => p.bossKills >= 50
  },

  {
    id: "party",
    icon: "🤝",
    name: "仲間との旅",
    description: "パーティに加入する",
    check: p => p.partyId !== null
  },

  {
    id: "subject_master",
    icon: "📚",
    name: "一教科完全制覇",
    description: "1教科を100時間勉強する",
    check: p =>
      Object.values(p.subjectMinutes)
        .some(v => v >= 6000)
  }

];


/* =========================================================
   UTILS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function getElement(id) {
  return document.getElementById(id);
}

function now() {
  return new Date();
}

function todayKey() {
  return now().toISOString().slice(0, 10);
}

function weekKey() {
  const date = new Date();

  const day = date.getDay();

  const diff = date.getDate() - day + (day === 0 ? -6 : 1);

  date.setDate(diff);

  return date.toISOString().slice(0, 10);
}

function monthKey() {
  return now().toISOString().slice(0, 7);
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) {
    return `${m}分`;
  }

  return `${h}時間${m}分`;
}

function escapeHTML(value) {
  const div = document.createElement("div");

  div.textContent = String(value);

  return div.innerHTML;
}


/* =========================================================
   STORAGE
   ========================================================= */

function loadAccounts() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    ) || {};
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(accounts)
  );
}

function getSession() {
  return localStorage.getItem(SESSION_KEY);
}

function setSession(userId) {
  localStorage.setItem(
    SESSION_KEY,
    userId
  );
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}


/* =========================================================
   PLAYER FACTORY
   ========================================================= */

function createPlayer(userId, password, name, category, subjects) {

  const subjectMinutes = {};

  SUBJECTS.forEach(subject => {
    subjectMinutes[subject] = 0;
  });

  return {

    userId,
    password,
    name,

    category,
    subjects,

    createdAt: Date.now(),

    level: 1,
    xp: 0,

    stars: 0,

    totalStudyMinutes: 0,

    monthlyStudyMinutes: 0,
    monthlyStudyMonth: monthKey(),

    weeklyStudyMinutes: 0,
    weeklyStudyWeek: weekKey(),

    subjectMinutes,

    studyHistory: [],

    dailyCompleted: 0,
    weeklyCompleted: 0,

    completedQuestIds: {},

    achievements: [],

    bossKills: 0,

    partyId: null,

    party: [],

    currentBoss: null,

    bossLog: [],

    seasonNumber: 1,

    seasonStart: Date.now(),

    seasonHistory: [],

    lastDailyKey: null,
    lastWeeklyKey: null,

    createdParties: 0
  };
}


/* =========================================================
   CURRENT PLAYER
   ========================================================= */

let currentPlayer = null;

function loadCurrentPlayer() {

  const userId = getSession();

  if (!userId) {
    return null;
  }

  const accounts = loadAccounts();

  if (!accounts[userId]) {
    clearSession();
    return null;
  }

  currentPlayer = accounts[userId];

  return currentPlayer;
}

function saveCurrentPlayer() {

  if (!currentPlayer) return;

  const accounts = loadAccounts();

  accounts[currentPlayer.userId] =
    currentPlayer;

  saveAccounts(accounts);
}


/* =========================================================
   AUTH
   ========================================================= */

function register() {

  const userId =
    $("register-user-id")?.value.trim();

  const password =
    $("register-password")?.value;

  const name =
    $("register-name")?.value.trim();

  const category =
    $("register-category")?.value;

  const selectedSubjects = [
    ...document.querySelectorAll(
      "#subject-selection input:checked"
    )
  ].map(input => input.value);

  if (!userId || !password || !name) {
    notify("必要事項を入力してください");
    return;
  }

  if (password.length < 4) {
    notify("パスワードは4文字以上にしてください");
    return;
  }

  if (selectedSubjects.length === 0) {
    notify("教科を1つ以上選択してください");
    return;
  }

  const accounts = loadAccounts();

  if (accounts[userId]) {
    notify("そのユーザーIDはすでに使われています");
    return;
  }

  const player = createPlayer(
    userId,
    password,
    name,
    category,
    selectedSubjects
  );

  accounts[userId] = player;

  saveAccounts(accounts);

  setSession(userId);

  currentPlayer = player;

  initializePlayer();

  notify("冒険者登録完了！");

  showMainApp();

  renderAll();
}


function login() {

  const userId =
    $("login-user-id")?.value.trim();

  const password =
    $("login-password")?.value;

  const accounts = loadAccounts();

  const player = accounts[userId];

  if (!player) {
    notify("ユーザーIDが見つかりません");
    return;
  }

  if (player.password !== password) {
    notify("パスワードが違います");
    return;
  }

  currentPlayer = player;

  setSession(userId);

  initializePlayer();

  showMainApp();

  renderAll();

  notify(`おかえりなさい、${player.name}！`);
}


function logout() {

  saveCurrentPlayer();

  clearSession();

  currentPlayer = null;

  location.reload();
}


/* =========================================================
   PLAYER INITIALIZATION
   ========================================================= */

function initializePlayer() {

  if (!currentPlayer) return;

  if (!currentPlayer.subjectMinutes) {
    currentPlayer.subjectMinutes = {};
  }

  SUBJECTS.forEach(subject => {

    if (
      typeof currentPlayer.subjectMinutes[subject]
      !== "number"
    ) {
      currentPlayer.subjectMinutes[subject] = 0;
    }

  });

  if (!currentPlayer.achievements) {
    currentPlayer.achievements = [];
  }

  if (!currentPlayer.completedQuestIds) {
    currentPlayer.completedQuestIds = {};
  }

  resetDailyIfNeeded();

  resetWeeklyIfNeeded();

  resetMonthlyIfNeeded();

  checkSeasonReset();

  if (!currentPlayer.currentBoss) {
    createBoss();
  }

  saveCurrentPlayer();
}


/* =========================================================
   TIME RESET
   ========================================================= */

function resetDailyIfNeeded() {

  const today = todayKey();

  if (currentPlayer.lastDailyKey === today) {
    return;
  }

  currentPlayer.lastDailyKey = today;

  generateDailyQuests();
}


function resetWeeklyIfNeeded() {

  const week = weekKey();

  if (currentPlayer.lastWeeklyKey === week) {
    return;
  }

  currentPlayer.lastWeeklyKey = week;

  /*
   * パーティは週単位でリセット。
   * 次週も同じメンバーで再編成可能。
   */
  currentPlayer.partyId = null;
  currentPlayer.party = [];

  generateWeeklyQuest();
}


function resetMonthlyIfNeeded() {

  const month = monthKey();

  if (currentPlayer.monthlyStudyMonth === month) {
    return;
  }

  currentPlayer.monthlyStudyMonth = month;

  currentPlayer.monthlyStudyMinutes = 0;
}


/* =========================================================
   SEASON
   ========================================================= */

function checkSeasonReset() {

  const start =
    new Date(currentPlayer.seasonStart);

  const current =
    new Date();

  const diff =
    current - start;

  const days =
    diff / (1000 * 60 * 60 * 24);

  if (days < 30) {
    return;
  }

  finishSeason();
}


function finishSeason() {

  const rank =
    calculateRank(
      currentPlayer.monthlyStudyMinutes
    );

  currentPlayer.seasonHistory.push({

    season:
      currentPlayer.seasonNumber,

    rank:
      rank.name,

    minutes:
      currentPlayer.monthlyStudyMinutes,

    endedAt:
      Date.now()

  });

  currentPlayer.seasonNumber++;

  currentPlayer.seasonStart =
    Date.now();

  /*
   * レベル・XP・星は絶対にリセットしない。
   * リセットするのはシーズン関連のみ。
   */

  currentPlayer.monthlyStudyMinutes = 0;

  notify(
    `シーズン終了！ ${rank.icon} ${rank.name}で完走！`
  );

  saveCurrentPlayer();
}


/* =========================================================
   XP SYSTEM
   ========================================================= */

function addXP(amount) {

  if (!currentPlayer || amount <= 0) {
    return;
  }

  let remaining = amount;

  while (remaining > 0) {

    if (currentPlayer.level >= MAX_LEVEL) {
      currentPlayer.xp = 0;
      break;
    }

    const required =
      requiredXpForLevel(
        currentPlayer.level
      );

    const needed =
      required - currentPlayer.xp;

    const gained =
      Math.min(remaining, needed);

    currentPlayer.xp += gained;

    remaining -= gained;

    if (currentPlayer.xp >= required) {

      currentPlayer.xp -= required;

      currentPlayer.level++;

      showLevelUp(
        currentPlayer.level
      );

      if (
        currentPlayer.level >= MAX_LEVEL
      ) {
        currentPlayer.level = MAX_LEVEL;

        currentPlayer.xp = 0;

        performStarReset();

        break;
      }
    }
  }

  checkAchievements();

  saveCurrentPlayer();

  renderAll();
}


/* =========================================================
   STAR / PRESTIGE
   ========================================================= */

function performStarReset() {

  currentPlayer.stars++;

  /*
   * Lv100到達時に
   *
   * Lv100 → ⭐獲得 → Lv1
   *
   * XPもリセット。
   *
   * 累計勉強時間・実績・称号・シーズン情報は保持。
   */

  currentPlayer.level = 1;
  currentPlayer.xp = 0;

  const title =
    getStarTitle(
      currentPlayer.stars
    );

  showStarModal(
    currentPlayer.stars,
    title
  );

  checkAchievements();

  saveCurrentPlayer();
}


/* =========================================================
   STUDY RECORD
   ========================================================= */

function recordStudy() {

  const subject =
    $("study-subject")?.value;

  const minutes =
    Number(
      $("study-minutes")?.value
    );

  if (!subject) {
    notify("教科を選択してください");
    return;
  }

  if (
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    notify("勉強時間を入力してください");
    return;
  }

  if (
    !currentPlayer.subjects.includes(subject)
  ) {
    notify("選択していない教科です");
    return;
  }

  currentPlayer.totalStudyMinutes +=
    minutes;

  currentPlayer.monthlyStudyMinutes +=
    minutes;

  currentPlayer.weeklyStudyMinutes +=
    minutes;

  currentPlayer.subjectMinutes[subject] +=
    minutes;

  currentPlayer.studyHistory.push({

    subject,

    minutes,

    timestamp:
      Date.now(),

    date:
      todayKey()

  });

  /*
   * 基本:
   * 1分 = 1XP
   */
  addXP(minutes);

  /*
   * ボスへのダメージ
   */
  dealBossDamage(
    subject,
    minutes
  );

  /*
   * クエスト判定
   */
  updateQuestProgress();

  /*
   * 実績
   */
  checkAchievements();

  saveCurrentPlayer();

  renderAll();

  notify(
    `${subject} ${minutes}分を記録！ +${minutes} XP`
  );
}


/* =========================================================
   SUBJECT DIFFICULTY
   ========================================================= */

function getWeakSubject() {

  const available =
    currentPlayer.subjects;

  if (!available.length) {
    return null;
  }

  let weakest = available[0];

  for (const subject of available) {

    if (
      currentPlayer.subjectMinutes[subject]
      <
      currentPlayer.subjectMinutes[weakest]
    ) {
      weakest = subject;
    }

  }

  return weakest;
}


/* =========================================================
   DAILY QUEST GENERATION
   ========================================================= */

function generateDailyQuests() {

  if (!currentPlayer) return;

  const quests = [];

  const weakSubject =
    getWeakSubject();

  /*
   * 強化対象は
   * 勉強時間の少ない教科を優先。
   */

  if (weakSubject) {

    quests.push({
      id: `daily_${todayKey()}_weak`,
      type: "subject",
      subject: weakSubject,
      min: 30,
      text:
        `${weakSubject}を30分勉強する`,
      reward: 40,
      completed: false
    });

  }

  while (quests.length < 3) {

    const template =
      randomItem(
        DAILY_QUEST_TEMPLATES
      );

    const quest = {

      id:
        `daily_${todayKey()}_${quests.length}`,

      type:
        template.type,

      min:
        template.min,

      text:
        template.text,

      reward:
        template.reward,

      completed:
        false

    };

    if (
      quest.type === "subject"
    ) {

      quest.subject =
        randomItem(
          currentPlayer.subjects
        );

      quest.text =
        `${quest.subject}を${quest.min}分勉強する`;

    }

    quests.push(quest);
  }

  currentPlayer.dailyQuests =
    quests;
}


/* =========================================================
   WEEKLY QUEST
   ========================================================= */

function generateWeeklyQuest() {

  const template =
    randomItem(
      WEEKLY_QUEST_TEMPLATES
    );

  currentPlayer.weeklyQuest = {

    id:
      `weekly_${weekKey()}`,

    min:
      template.min,

    text:
      template.text,

    reward:
      template.reward,

    completed:
      false

  };
}


/* =========================================================
   QUEST PROGRESS
   ========================================================= */

function updateQuestProgress() {

  const daily =
    currentPlayer.dailyQuests || [];

  for (const quest of daily) {

    if (quest.completed) {
      continue;
    }

    if (quest.type === "study") {

      const todayMinutes =
        currentPlayer.studyHistory
          .filter(
            x => x.date === todayKey()
          )
          .reduce(
            (sum, x) => sum + x.minutes,
            0
          );

      if (
        todayMinutes >= quest.min
      ) {
        completeDailyQuest(quest);
      }

    }

    if (quest.type === "subject") {

      const todaySubjectMinutes =
        currentPlayer.studyHistory
          .filter(
            x =>
              x.date === todayKey() &&
              x.subject === quest.subject
          )
          .reduce(
            (sum, x) => sum + x.minutes,
            0
          );

      if (
        todaySubjectMinutes >= quest.min
      ) {
        completeDailyQuest(quest);
      }

    }
  }


  const weekly =
    currentPlayer.weeklyQuest;

  if (
    weekly &&
    !weekly.completed &&
    currentPlayer.weeklyStudyMinutes
      >= weekly.min
  ) {

    weekly.completed = true;

    currentPlayer.weeklyCompleted++;

    addXP(weekly.reward);

    notify(
      `WEEKLY QUEST COMPLETE! +${weekly.reward} XP`
    );
  }
}


/* =========================================================
   QUEST COMPLETION
   ========================================================= */

function completeDailyQuest(quest) {

  if (quest.completed) {
    return;
  }

  quest.completed = true;

  currentPlayer.dailyCompleted++;

  currentPlayer.completedQuestIds[
    quest.id
  ] = true;

  addXP(quest.reward);

  notify(
    `DAILY QUEST COMPLETE! +${quest.reward} XP`
  );
}


/* =========================================================
   BOSS SYSTEM
   ========================================================= */

const BOSS_NAMES = [
  "模試の魔獣",
  "赤点の騎士",
  "時間泥棒",
  "偏差値の亡霊",
  "受験の巨人",
  "課題の竜",
  "ラスボス・受験"
];


function createBoss() {

  const partySize =
    Math.max(
      1,
      currentPlayer.party?.length || 1
    );

  /*
   * 人数が増えるほどHP上昇
   */
  const baseHP = 300;

  const hp =
    baseHP *
    partySize;

  const weakness =
    randomItem(
      currentPlayer.subjects
    );

  currentPlayer.currentBoss = {

    id:
      `boss_${Date.now()}`,

    name:
      randomItem(BOSS_NAMES),

    maxHp:
      hp,

    hp,

    partySize,

    weakness,

    multiplier:
      2,

    createdAt:
      Date.now(),

    defeated:
      false

  };

  currentPlayer.bossLog = [];

  saveCurrentPlayer();
}


/* =========================================================
   BOSS DAMAGE
   ========================================================= */

function dealBossDamage(
  subject,
  minutes
) {

  const boss =
    currentPlayer.currentBoss;

  if (
    !boss ||
    boss.defeated ||
    boss.hp <= 0
  ) {
    return;
  }

  let damage = minutes;

  let multiplier = 1;

  /*
   * ランダム弱点教科
   */
  if (
    subject === boss.weakness
  ) {
    multiplier =
      boss.multiplier;

    damage *= multiplier;
  }

  boss.hp =
    Math.max(
      0,
      boss.hp - damage
    );

  currentPlayer.bossLog.unshift({

    timestamp:
      Date.now(),

    subject,

    minutes,

    damage,

    multiplier

  });

  if (boss.hp <= 0) {

    boss.defeated = true;

    currentPlayer.bossKills++;

    /*
     * ボス討伐XP
     */
    addXP(100);

    notify(
      `🐉 ${boss.name}を討伐した！ +100 XP`
    );

    checkAchievements();
  }

  saveCurrentPlayer();

  renderBoss();
}


/* =========================================================
   PARTY
   ========================================================= */

/*
 * 現在はフロントエンド版なので、
 * パーティ情報はローカル保存。
 *
 * 実際に複数端末で同期する場合は
 * 後でDB/API層をここへ接続する。
 */

function createParty() {

  if (currentPlayer.partyId) {

    notify(
      "すでにパーティに所属しています"
    );

    return;
  }

  currentPlayer.partyId =
    `party_${currentPlayer.userId}_${Date.now()}`;

  currentPlayer.party = [
    {
      userId:
        currentPlayer.userId,

      name:
        currentPlayer.name,

      self:
        true
    }
  ];

  currentPlayer.createdParties++;

  saveCurrentPlayer();

  checkAchievements();

  renderParty();

  notify(
    "パーティを結成しました！"
  );
}


function joinParty(userId) {

  if (
    currentPlayer.party?.length >= 4
  ) {

    notify(
      "パーティは最大4人です"
    );

    return;
  }

  if (!userId) {
    notify("ユーザーIDを入力してください");
    return;
  }

  const accounts =
    loadAccounts();

  const target =
    accounts[userId];

  if (!target) {
    notify(
      "そのユーザーIDは見つかりません"
    );

    return;
  }

  if (target.partyId) {

    notify(
      "そのユーザーはすでにパーティに所属しています"
    );

    return;
  }

  /*
   * ローカル版では、
   * 相手側にも所属情報を書き込む。
   */
  target.partyId =
    currentPlayer.partyId ||
    `party_${currentPlayer.userId}_${Date.now()}`;

  if (!currentPlayer.partyId) {

    currentPlayer.partyId =
      target.partyId;

  }

  currentPlayer.party.push({

    userId:
      target.userId,

    name:
      target.name,

    self:
      false

  });

  target.party =
    currentPlayer.party.map(
      member => ({
        ...member,
        self:
          member.userId ===
          target.userId
      })
    );

  saveAccounts(accounts);

  saveCurrentPlayer();

  /*
   * ボスHPを人数に応じて再計算
   */
  updateBossPartySize();

  checkAchievements();

  renderAll();

  notify(
    `${target.name}をパーティに加入させました！`
  );
}


function updateBossPartySize() {

  const boss =
    currentPlayer.currentBoss;

  if (!boss || boss.defeated) {
    return;
  }

  const oldMax =
    boss.maxHp;

  const baseHP =
    300;

  const partySize =
    Math.max(
      1,
      currentPlayer.party.length
    );

  const ratio =
    boss.hp / oldMax;

  boss.partySize =
    partySize;

  boss.maxHp =
    baseHP * partySize;

  boss.hp =
    Math.round(
      boss.maxHp * ratio
    );

  saveCurrentPlayer();
}


/* =========================================================
   UI NAVIGATION
   ========================================================= */

function showPage(pageId) {

  document
    .querySelectorAll(".app-screen")
    .forEach(page => {
      page.classList.add("hidden");
    });

  const page =
    $(pageId);

  if (page) {
    page.classList.remove("hidden");
  }

  document
    .querySelectorAll(
      "#main-navigation .nav-button"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );

    });
}


function showMainApp() {

  const auth =
    $("auth-screen");

  const app =
    $("main-app");

  if (auth) {
    auth.classList.add("hidden");
  }

  if (app) {
    app.classList.remove("hidden");
  }
}


/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {

  if (!currentPlayer) {
    return;
  }

  renderHeader();

  renderHome();

  renderStudy();

  renderQuests();

  renderBoss();

  renderParty();

  renderRank();

  renderAchievements();

  renderProfile();

  updateStudySubjectOptions();

  saveCurrentPlayer();
}


/* =========================================================
   HEADER
   ========================================================= */

function renderHeader() {

  setText(
    "header-display-name",
    currentPlayer.name
  );

  setText(
    "header-level",
    `Lv.${currentPlayer.level}`
  );

  const rank =
    calculateRank(
      currentPlayer.monthlyStudyMinutes
    );

  setText(
    "header-rank",
    `${rank.icon} ${rank.name}`
  );
}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {

  setText(
    "home-level",
    `Lv.${currentPlayer.level}`
  );

  setText(
    "home-xp",
    currentPlayer.xp
  );

  const required =
    currentPlayer.level >= MAX_LEVEL
      ? 0
      : requiredXpForLevel(
          currentPlayer.level
        );

  setText(
    "home-xp-required",
    required
  );

  const percentage =
    required === 0
      ? 100
      : Math.min(
          100,
          (currentPlayer.xp / required) *
          100
        );

  const progress =
    $("level-progress");

  if (progress) {
    progress.style.width =
      `${percentage}%`;
  }

  setText(
    "star-count",
    `⭐ ${currentPlayer.stars}`
  );

  setText(
    "star-title",
    getStarTitle(
      currentPlayer.stars
    )
  );

  setText(
    "today-study-time",
    formatMinutes(
      getTodayStudyMinutes()
    )
  );

  setText(
    "total-study-time",
    formatMinutes(
      currentPlayer.totalStudyMinutes
    )
  );

  setText(
    "monthly-study-time",
    formatMinutes(
      currentPlayer.monthlyStudyMinutes
    )
  );
}


/* =========================================================
   STUDY
   ========================================================= */

function renderStudy() {

  const list =
    $("subject-study-list");

  if (!list) return;

  list.innerHTML = "";

  const sorted =
    currentPlayer.subjects
      .slice()
      .sort(
        (a, b) =>
          currentPlayer.subjectMinutes[a]
          -
          currentPlayer.subjectMinutes[b]
      );

  sorted.forEach(subject => {

    const minutes =
      currentPlayer.subjectMinutes[
        subject
      ];

    const div =
      document.createElement("div");

    div.className =
      "subject-study-item";

    div.innerHTML = `
      <span>${escapeHTML(subject)}</span>
      <strong>${formatMinutes(minutes)}</strong>
    `;

    list.appendChild(div);

  });
}


/* =========================================================
   SUBJECT OPTIONS
   ========================================================= */

function updateStudySubjectOptions() {

  const select =
    $("study-subject");

  if (!select) return;

  const current =
    select.value;

  select.innerHTML = "";

  currentPlayer.subjects.forEach(
    subject => {

      const option =
        document.createElement("option");

      option.value =
        subject;

      option.textContent =
        subject;

      select.appendChild(option);

    }
  );

  if (
    currentPlayer.subjects.includes(current)
  ) {
    select.value = current;
  }
}


/* =========================================================
   QUEST RENDER
   ========================================================= */

function renderQuests() {

  const dailyList =
    $("daily-quest-list");

  if (dailyList) {

    dailyList.innerHTML = "";

    (
      currentPlayer.dailyQuests || []
    ).forEach(quest => {

      const card =
        document.createElement("div");

      card.className =
        `quest-card ${
          quest.completed
            ? "completed"
            : ""
        }`;

      card.innerHTML = `

        <h4>
          ${escapeHTML(quest.text)}
        </h4>

        <p>
          ${quest.completed
            ? "達成済み"
            : "挑戦中"}
        </p>

        <div class="quest-reward">
          +${quest.reward} XP
        </div>

      `;

      dailyList.appendChild(card);

    });
  }


  const weeklyList =
    $("weekly-quest-list");

  if (
    weeklyList &&
    currentPlayer.weeklyQuest
  ) {

    const quest =
      currentPlayer.weeklyQuest;

    weeklyList.innerHTML = "";

    const card =
      document.createElement("div");

    card.className =
      `quest-card ${
        quest.completed
          ? "completed"
          : ""
      }`;

    card.innerHTML = `

      <h4>
        ${escapeHTML(quest.text)}
      </h4>

      <p>
        ${quest.completed
          ? "達成済み"
          : `${formatMinutes(
              currentPlayer.weeklyStudyMinutes
            )} / ${formatMinutes(quest.min)}`}
      </p>

      <div class="quest-reward">
        +${quest.reward} XP
      </div>

    `;

    weeklyList.appendChild(card);
  }
}


/* =========================================================
   BOSS RENDER
   ========================================================= */

function renderBoss() {

  const boss =
    currentPlayer.currentBoss;

  if (!boss) return;

  setText(
    "boss-name",
    boss.name
  );

  setText(
    "boss-level",
    `PARTY × ${boss.partySize}`
  );

  setText(
    "boss-current-hp",
    Math.ceil(boss.hp)
  );

  setText(
    "boss-max-hp",
    boss.maxHp
  );

  const percentage =
    boss.maxHp === 0
      ? 0
      : (boss.hp / boss.maxHp) *
        100;

  const hpBar =
    $("boss-hp-progress");

  if (hpBar) {
    hpBar.style.width =
      `${Math.max(0, percentage)}%`;
  }

  setText(
    "boss-weakness-subject",
    boss.weakness
  );

  setText(
    "boss-weakness-multiplier",
    `×${boss.multiplier}`
  );


  const log =
    $("boss-log-list");

  if (log) {

    log.innerHTML = "";

    (
      currentPlayer.bossLog || []
    )
      .slice(0, 30)
      .forEach(entry => {

        const div =
          document.createElement("div");

        div.className =
          "boss-log-entry";

        div.textContent =
          `${entry.subject} ${entry.minutes}分 → ${Math.round(entry.damage)} DMG`;

        if (
          entry.multiplier > 1
        ) {

          div.textContent +=
            " ⚡弱点特攻";

        }

        log.appendChild(div);

      });
  }

  const refresh =
    $("boss-refresh-button");

  if (refresh) {

    refresh.textContent =
      boss.defeated
        ? "新しいボスを出現させる"
        : "現在のボス";

  }
}


/* =========================================================
   PARTY RENDER
   ========================================================= */

function renderParty() {

  const list =
    $("party-member-list");

  if (!list) return;

  list.innerHTML = "";

  (
    currentPlayer.party || []
  ).forEach(member => {

    const div =
      document.createElement("div");

    div.className =
      "party-member";

    div.innerHTML = `

      <span>
        ${member.self ? "👑 " : "⚔️ "}
        ${escapeHTML(member.name)}
      </span>

      <small>
        ${member.self ? "YOU" : "MEMBER"}
      </small>

    `;

    list.appendChild(div);

  });

  setText(
    "party-member-count",
    `${currentPlayer.party?.length || 0} / 4`
  );
}


/* =========================================================
   RANK RENDER
   ========================================================= */

function renderRank() {

  const rank =
    calculateRank(
      currentPlayer.monthlyStudyMinutes
    );

  setText(
    "current-rank-name",
    `${rank.icon} ${rank.name}`
  );

  setText(
    "current-season-time",
    formatMinutes(
      currentPlayer.monthlyStudyMinutes
    )
  );

  const table =
    $("rank-requirements");

  if (!table) return;

  let body =
    table.querySelector("tbody");

  if (!body) {

    body =
      document.createElement("tbody");

    table.appendChild(body);
  }

  body.innerHTML = "";

  RANKS.forEach(r => {

    const tr =
      document.createElement("tr");

    if (
      r.name === rank.name
    ) {

      tr.classList.add(
        "rank-current"
      );

    }

    tr.innerHTML = `

      <td>
        ${r.icon} ${r.name}
      </td>

      <td>
        ${r.minHours}時間
      </td>

    `;

    body.appendChild(tr);

  });
}


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

function checkAchievements() {

  if (!currentPlayer) return;

  for (const achievement of ACHIEVEMENTS) {

    if (
      currentPlayer.achievements
        .includes(achievement.id)
    ) {
      continue;
    }

    if (
      achievement.check(currentPlayer)
    ) {

      currentPlayer.achievements.push(
        achievement.id
      );

      notify(
        `🏆 実績解除：${achievement.name}`
      );

    }
  }

  saveCurrentPlayer();
}


function renderAchievements() {

  const list =
    $("achievement-list");

  if (!list) return;

  list.innerHTML = "";

  ACHIEVEMENTS.forEach(
    achievement => {

      const unlocked =
        currentPlayer.achievements
          .includes(
            achievement.id
          );

      const card =
        document.createElement("div");

      card.className =
        `achievement-card ${
          unlocked
            ? "unlocked"
            : "locked"
        }`;

      card.innerHTML = `

        <div class="achievement-icon">
          ${achievement.icon}
        </div>

        <div>
          <h4>
            ${escapeHTML(
              achievement.name
            )}
          </h4>

          <p>
            ${escapeHTML(
              achievement.description
            )}
          </p>
        </div>

        <div class="achievement-progress">
          ${
            unlocked
              ? "COMPLETE ✓"
              : "LOCKED"
          }
        </div>

      `;

      list.appendChild(card);

    }
  );

  setText(
    "achievement-count",
    `${currentPlayer.achievements.length} / ${ACHIEVEMENTS.length}`
  );
}


/* =========================================================
   PROFILE
   ========================================================= */

function renderProfile() {

  setText(
    "profile-display-name",
    currentPlayer.name
  );

  setText(
    "profile-level",
    `Lv.${currentPlayer.level}`
  );

  setText(
    "profile-stars",
    `⭐ ${currentPlayer.stars}`
  );

  setText(
    "profile-title",
    getStarTitle(
      currentPlayer.stars
    )
  );

  setText(
    "profile-total-study",
    formatMinutes(
      currentPlayer.totalStudyMinutes
    )
  );

  setText(
    "profile-boss-kills",
    currentPlayer.bossKills
  );

  setText(
    "profile-daily-completed",
    currentPlayer.dailyCompleted
  );

  setText(
    "profile-weekly-completed",
    currentPlayer.weeklyCompleted
  );

  const list =
    $("profile-subject-list");

  if (!list) return;

  list.innerHTML = "";

  currentPlayer.subjects.forEach(
    subject => {

      const span =
        document.createElement("span");

      span.className =
        "profile-subject";

      span.textContent =
        subject;

      list.appendChild(span);

    }
  );
}


/* =========================================================
   STUDY HISTORY
   ========================================================= */

function renderStudyHistory() {

  const list =
    $("study-history-list");

  if (!list) return;

  list.innerHTML = "";

  currentPlayer.studyHistory
    .slice()
    .reverse()
    .slice(0, 30)
    .forEach(entry => {

      const div =
        document.createElement("div");

      div.className =
        "study-history-item";

      div.innerHTML = `

        <div>
          <strong>
            ${escapeHTML(entry.subject)}
          </strong>
        </div>

        <div>
          ${entry.minutes}分
        </div>

        <small>
          ${escapeHTML(entry.date)}
        </small>

      `;

      list.appendChild(div);

    });
}


/* =========================================================
   SEASON HISTORY
   ========================================================= */

function renderSeasonHistory() {

  const list =
    $("season-history-list");

  if (!list) return;

  list.innerHTML = "";

  currentPlayer.seasonHistory
    .slice()
    .reverse()
    .forEach(season => {

      const div =
        document.createElement("div");

      div.className =
        "season-history-item";

      div.innerHTML = `

        <strong>
          Season ${season.season}
        </strong>

        <span>
          ${season.rank}
        </span>

        <span>
          ${formatMinutes(season.minutes)}
        </span>

      `;

      list.appendChild(div);

    });
}


/* =========================================================
   HELPERS
   ========================================================= */

function setText(id, value) {

  const element =
    getElement(id);

  if (element) {
    element.textContent =
      value;
  }
}

function getTodayStudyMinutes() {

  if (!currentPlayer) {
    return 0;
  }

  return currentPlayer.studyHistory
    .filter(
      x => x.date === todayKey()
    )
    .reduce(
      (sum, x) =>
        sum + x.minutes,
      0
    );
}


/* =========================================================
   NOTIFICATION
   ========================================================= */

let notificationTimer = null;

function notify(message) {

  let notification =
    $("notification");

  if (!notification) {

    notification =
      document.createElement("div");

    notification.id =
      "notification";

    document.body.appendChild(
      notification
    );
  }

  notification.textContent =
    message;

  notification.classList.remove(
    "hidden"
  );

  clearTimeout(
    notificationTimer
  );

  notificationTimer =
    setTimeout(() => {

      notification.classList.add(
        "hidden"
      );

    }, 3000);
}


/* =========================================================
   MODALS
   ========================================================= */

function showModal(id) {

  const modal =
    $(id);

  if (modal) {
    modal.classList.remove("hidden");
  }
}

function hideModal(id) {

  const modal =
    $(id);

  if (modal) {
    modal.classList.add("hidden");
  }
}


function showLevelUp(level) {

  setText(
    "level-up-new-level",
    `Lv.${level}`
  );

  setText(
    "level-up-old-level",
    `Lv.${level - 1}`
  );

  showModal(
    "level-up-modal"
  );
}


function showStarModal(
  stars,
  title
) {

  setText(
    "star-modal-count",
    `⭐ ${stars}`
  );

  setText(
    "star-modal-title",
    title
  );

  showModal(
    "star-modal"
  );
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEvents() {

  /*
   * AUTH
   */

  $("register-button")
    ?.addEventListener(
      "click",
      register
    );

  $("login-button")
    ?.addEventListener(
      "click",
      login
    );

  $("logout-button")
    ?.addEventListener(
      "click",
      logout
    );


  /*
   * STUDY
   */

  $("record-study-button")
    ?.addEventListener(
      "click",
      recordStudy
    );


  /*
   * NAVIGATION
   */

  document
    .querySelectorAll(
      "#main-navigation .nav-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const page =
            button.dataset.page;

          if (page) {
            showPage(page);
          }

        }
      );

    });


  /*
   * PAGE BUTTONS
   */

  $("create-party-button")
    ?.addEventListener(
      "click",
      createParty
    );

  $("party-join-button")
    ?.addEventListener(
      "click",
      () => {

        const userId =
          $("party-user-id")
            ?.value.trim();

        joinParty(userId);

      }
    );


  /*
   * BOSS
   */

  $("boss-refresh-button")
    ?.addEventListener(
      "click",
      () => {

        if (
          currentPlayer.currentBoss &&
          !currentPlayer.currentBoss.defeated
        ) {

          notify(
            "現在のボスはまだ健在です"
          );

          return;
        }

        createBoss();

        renderBoss();

        notify(
          "新たなボスが出現した！"
        );

      }
    );


  /*
   * MODALS
   */

  document
    .querySelectorAll(
      "[data-close-modal]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          hideModal(
            button.dataset.closeModal
          );

        }
      );

    });


  /*
   * ENTER KEY
   */

  document
    .querySelectorAll(
      "#login-user-id, #login-password"
    )
    .forEach(input => {

      input.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter"
          ) {
            login();
          }

        }
      );

    });

}


/* =========================================================
   AUTH SCREEN SWITCH
   ========================================================= */

function setupAuthSwitch() {

  $("show-register-button")
    ?.addEventListener(
      "click",
      () => {

        $("login-form")
          ?.classList.add("hidden");

        $("register-form")
          ?.classList.remove("hidden");

      }
    );


  $("show-login-button")
    ?.addEventListener(
      "click",
      () => {

        $("register-form")
          ?.classList.add("hidden");

        $("login-form")
          ?.classList.remove("hidden");

      }
    );
}


/* =========================================================
   DEMO DATA MIGRATION
   ========================================================= */

function migratePlayer() {

  if (!currentPlayer) {
    return;
  }

  if (
    typeof currentPlayer.level !==
    "number"
  ) {
    currentPlayer.level = 1;
  }

  if (
    typeof currentPlayer.xp !==
    "number"
  ) {
    currentPlayer.xp = 0;
  }

  if (
    typeof currentPlayer.stars !==
    "number"
  ) {
    currentPlayer.stars = 0;
  }

  if (
    typeof currentPlayer.totalStudyMinutes !==
    "number"
  ) {
    currentPlayer.totalStudyMinutes = 0;
  }

  if (
    typeof currentPlayer.monthlyStudyMinutes !==
    "number"
  ) {
    currentPlayer.monthlyStudyMinutes = 0;
  }

  if (
    typeof currentPlayer.weeklyStudyMinutes !==
    "number"
  ) {
    currentPlayer.weeklyStudyMinutes = 0;
  }

  if (!Array.isArray(
    currentPlayer.studyHistory
  )) {
    currentPlayer.studyHistory = [];
  }

  if (!Array.isArray(
    currentPlayer.seasonHistory
  )) {
    currentPlayer.seasonHistory = [];
  }
}


/* =========================================================
   STARTUP
   ========================================================= */

function startApp() {

  currentPlayer =
    loadCurrentPlayer();

  if (!currentPlayer) {

    $("auth-screen")
      ?.classList.remove(
        "hidden"
      );

    $("main-app")
      ?.classList.add(
        "hidden"
      );

    setupEvents();
    setupAuthSwitch();

    return;
  }

  migratePlayer();

  initializePlayer();

  showMainApp();

  setupEvents();

  setupAuthSwitch();

  renderAll();

  /*
   * 初期ページ
   */
  showPage("home-screen");
}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  startApp
);
