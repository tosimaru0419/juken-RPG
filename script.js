/* ========================================
   ⚔️ 受験RPG — JavaScript
   完成版 / LocalStorage
======================================== */

const STORAGE_KEY = "juken_rpg_complete_v1";


/* ========================================
   GAME DATA
======================================== */

const RANKS = [
  {
    name: "BRONZE",
    icon: "🥉",
    min: 0
  },
  {
    name: "SILVER",
    icon: "🥈",
    min: 10 * 60
  },
  {
    name: "GOLD",
    icon: "🥇",
    min: 25 * 60
  },
  {
    name: "PLATINUM",
    icon: "💎",
    min: 50 * 60
  },
  {
    name: "DIAMOND",
    icon: "💠",
    min: 80 * 60
  },
  {
    name: "MASTER",
    icon: "👑",
    min: 110 * 60
  },
  {
    name: "GRANDMASTER",
    icon: "⚔️",
    min: 140 * 60
  },
  {
    name: "LEGEND",
    icon: "🌌",
    min: 170 * 60
  }
];


const TITLES = [
  {
    id: "title_novice",
    name: "駆け出しの冒険者",
    price: 0
  },
  {
    id: "title_night",
    name: "夜を越えし者",
    price: 50
  },
  {
    id: "title_silent",
    name: "静かなる研鑽者",
    price: 100
  },
  {
    id: "title_knowledge",
    name: "知識を喰らう者",
    price: 300
  },
  {
    id: "title_limit",
    name: "限界突破の片鱗",
    price: 500
  },
  {
    id: "title_sleep",
    name: "眠気殺し",
    price: 750
  },
  {
    id: "title_solo",
    name: "孤高の受験戦士",
    price: 1000
  },
  {
    id: "title_twilight",
    name: "黄昏の求道者",
    price: 1500
  },
  {
    id: "title_book",
    name: "禁断の参考書",
    price: 2000
  },
  {
    id: "title_truth",
    name: "万象を解き明かす者",
    price: 3000
  },
  {
    id: "title_outside",
    name: "理の外側に立つ者",
    price: 5000
  },
  {
    id: "title_last",
    name: "最後まで立っていた者",
    price: 7500
  },
  {
    id: "title_fate",
    name: "運命に抗う者",
    price: 10000
  },
  {
    id: "title_destiny",
    name: "天命を喰らう者",
    price: 15000
  },
  {
    id: "title_unexplored",
    name: "未踏の領域",
    price: 25000
  },
  {
    id: "title_battlefield",
    name: "受験という名の戦場",
    price: 50000
  },
  {
    id: "title_beyond",
    name: "合格の向こう側",
    price: 100000
  }
];


const ITEMS = [
  {
    id: "item_drop",
    name: "🧃 集中の雫",
    description: "30分間 XP ×1.2",
    price: 100,
    type: "multiplier",
    multiplier: 1.2,
    duration: 30 * 60
  },
  {
    id: "item_fire",
    name: "🔥 闘志の火種",
    description: "今日の目標達成で +50 XP",
    price: 150,
    type: "goal",
    bonus: 50
  },
  {
    id: "item_scroll",
    name: "📜 研鑽の巻物",
    description: "60分間 XP ×1.3",
    price: 300,
    type: "multiplier",
    multiplier: 1.3,
    duration: 60 * 60
  },
  {
    id: "item_feather",
    name: "⚡ 瞬刻の羽根",
    description: "30分間 XP ×1.5",
    price: 500,
    type: "multiplier",
    multiplier: 1.5,
    duration: 30 * 60
  },
  {
    id: "item_crystal",
    name: "🔮 未来視の水晶",
    description: "目標達成で +100 XP",
    price: 750,
    type: "goal",
    bonus: 100
  },
  {
    id: "item_experience",
    name: "💎 経験の結晶",
    description: "次のセッション終了時 +100 XP",
    price: 1000,
    type: "session",
    bonus: 100
  },
  {
    id: "item_crown",
    name: "👑 王者の勲章",
    description: "目標達成で +200 XP",
    price: 3000,
    type: "goal",
    bonus: 200
  }
];


const THEMES = [
  {
    id: "theme_blue",
    name: "🔵 蒼天",
    price: 0,
    color: "#2563eb",
    light: "#eff6ff",
    dark: "#1d4ed8"
  },
  {
    id: "theme_red",
    name: "🔴 紅蓮",
    price: 100,
    color: "#dc2626",
    light: "#fef2f2",
    dark: "#b91c1c"
  },
  {
    id: "theme_green",
    name: "🟢 深森",
    price: 100,
    color: "#16a34a",
    light: "#f0fdf4",
    dark: "#15803d"
  },
  {
    id: "theme_purple",
    name: "🟣 夜紫",
    price: 250,
    color: "#7c3aed",
    light: "#f5f3ff",
    dark: "#6d28d9"
  },
  {
    id: "theme_gold",
    name: "🟡 黄金",
    price: 500,
    color: "#ca8a04",
    light: "#fefce8",
    dark: "#a16207"
  },
  {
    id: "theme_black",
    name: "⚫ 漆黒",
    price: 1000,
    color: "#111827",
    light: "#f3f4f6",
    dark: "#030712"
  },
  {
    id: "theme_silver",
    name: "⚪ 白銀",
    price: 1500,
    color: "#64748b",
    light: "#f1f5f9",
    dark: "#475569"
  },
  {
    id: "theme_void",
    name: "🌌 深淵",
    price: 3000,
    color: "#312e81",
    light: "#eef2ff",
    dark: "#1e1b4b"
  }
];


const BACKGROUNDS = [
  {
    id: "bg_default",
    name: "☁️ 白紙",
    price: 0,
    value: "default"
  },
  {
    id: "bg_night",
    name: "🌃 夜空",
    price: 500,
    value: "night"
  },
  {
    id: "bg_library",
    name: "📚 古書庫",
    price: 1000,
    value: "library"
  },
  {
    id: "bg_magic",
    name: "🏰 魔導書庫",
    price: 2500,
    value: "magic"
  },
  {
    id: "bg_moon",
    name: "🌙 月下の塔",
    price: 5000,
    value: "moon"
  },
  {
    id: "bg_battle",
    name: "⚔️ 最終決戦",
    price: 10000,
    value: "battle"
  },
  {
    id: "bg_stars",
    name: "🌌 星の彼方",
    price: 25000,
    value: "stars"
  }
];


const AVATARS = [
  {
    id: "avatar_sword",
    name: "⚔️ 剣士",
    price: 0,
    value: "⚔️"
  },
  {
    id: "avatar_magic",
    name: "🧙 魔術師",
    price: 300,
    value: "🧙"
  },
  {
    id: "avatar_archer",
    name: "🏹 狩人",
    price: 300,
    value: "🏹"
  },
  {
    id: "avatar_knight",
    name: "🛡️ 騎士",
    price: 500,
    value: "🛡️"
  },
  {
    id: "avatar_sage",
    name: "📖 賢者",
    price: 1000,
    value: "📖"
  },
  {
    id: "avatar_king",
    name: "👑 王者",
    price: 3000,
    value: "👑"
  }
];


const ACHIEVEMENTS = [
  {
    id: "first",
    icon: "🌱",
    name: "冒険の始まり",
    description: "初めて勉強する",
    check: data => data.totalMinutes >= 1
  },
  {
    id: "ten",
    icon: "📚",
    name: "最初の10分",
    description: "累計10分勉強する",
    check: data => data.totalMinutes >= 10
  },
  {
    id: "hour",
    icon: "🔥",
    name: "一時間の壁",
    description: "累計1時間勉強する",
    check: data => data.totalMinutes >= 60
  },
  {
    id: "ten_hours",
    icon: "⚔️",
    name: "研鑽の道",
    description: "累計10時間勉強する",
    check: data => data.totalMinutes >= 600
  },
  {
    id: "hundred_hours",
    icon: "💎",
    name: "百時間の領域",
    description: "累計100時間勉強する",
    check: data => data.totalMinutes >= 6000
  },
  {
    id: "level10",
    icon: "⬆️",
    name: "成長の証",
    description: "Lv.10に到達する",
    check: data => data.level >= 10
  },
  {
    id: "level50",
    icon: "🌌",
    name: "未踏への挑戦",
    description: "Lv.50に到達する",
    check: data => data.level >= 50
  }
];


const DAILY_QUESTS = [
  {
    id: "q10",
    icon: "📖",
    name: "新人冒険者の第一歩",
    description: "10分勉強する",
    minutes: 10,
    xp: 10,
    coins: 20
  },
  {
    id: "q30",
    icon: "🔥",
    name: "集中の証",
    description: "30分勉強する",
    minutes: 30,
    xp: 30,
    coins: 40
  },
  {
    id: "q60",
    icon: "⚔️",
    name: "今日も戦う者",
    description: "60分勉強する",
    minutes: 60,
    xp: 60,
    coins: 80
  },
  {
    id: "q120",
    icon: "🌙",
    name: "夜を越える者",
    description: "120分勉強する",
    minutes: 120,
    xp: 100,
    coins: 150
  }
];


/* ========================================
   DEFAULT DATA
======================================== */

function createDefaultData() {

  return {
    registered: false,

    name: "",
    track: "理系",
    subject: "",

    level: 1,
    xp: 0,
    totalXP: 0,

    coins: 0,

    totalMinutes: 0,
    todayMinutes: 0,

    monthMinutes: 0,
    monthKey: getMonthKey(),

    todayKey: getTodayKey(),

    dailyGoal: 60,

    claimedQuests: [],

    ownedTitles: ["title_novice"],
    equippedTitle: "title_novice",

    ownedItems: [],

    activeBuff: null,

    equippedTheme: "theme_blue",
    ownedThemes: ["theme_blue"],

    equippedBackground: "bg_default",
    ownedBackgrounds: ["bg_default"],

    equippedAvatar: "avatar_sword",
    ownedAvatars: ["avatar_sword"],

    achievements: [],

    hiddenEndingSeen: false,
    clearEndingSeen: false
  };
}


let data = createDefaultData();


/* ========================================
   TIMER STATE
======================================== */

let timerInterval = null;
let timerStart = null;

let selectedSubject = "";


/* ========================================
   INITIALIZE
======================================== */

document.addEventListener("DOMContentLoaded", () => {

  loadData();

  setupNavigation();
  setupRegistration();
  setupTimer();
  setupSubjects();
  setupManualReport();
  setupGoal();
  setupShopTabs();
  setupLevelUpModal();
  setupMessageModal();

  checkDateReset();
  applyTheme();
  updateSeason();

  if (data.registered) {
    showMain();
  } else {
    showRegister();
  }

  updateAll();

  setInterval(() => {

    checkDateReset();
    updateBuff();
    updateSeason();

  }, 1000);
});


/* ========================================
   STORAGE
======================================== */

function saveData() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
}


function loadData() {

  const saved =
    localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return;
  }

  try {

    const parsed =
      JSON.parse(saved);

    data = {
      ...createDefaultData(),
      ...parsed
    };

  } catch (error) {

    console.error(
      "セーブデータ読み込み失敗:",
      error
    );

  }
}


/* ========================================
   DATE
======================================== */

function getTodayKey() {

  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}


function getMonthKey() {

  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0")
  ].join("-");
}


function checkDateReset() {

  const today = getTodayKey();
  const month = getMonthKey();

  if (data.todayKey !== today) {

    data.todayKey = today;
    data.todayMinutes = 0;
    data.claimedQuests = [];

    saveData();
  }

  if (data.monthKey !== month) {

    data.monthKey = month;
    data.monthMinutes = 0;

    saveData();
  }
}


/* ========================================
   SEASON
======================================== */

function updateSeason() {

  const end =
    new Date("2026-12-31T23:59:59");

  const now = new Date();

  const diff =
    end.getTime() - now.getTime();

  const days =
    Math.max(
      0,
      Math.ceil(diff / 86400000)
    );

  const element =
    document.getElementById("season-days");

  if (element) {
    element.textContent = days;
  }
}


/* ========================================
   REGISTER
======================================== */

function setupRegistration() {

  document
    .getElementById("register-button")
    .addEventListener("click", () => {

      const name =
        document
          .getElementById("player-name")
          .value
          .trim();

      const track =
        document
          .getElementById("player-track")
          .value;

      const subject =
        document
          .getElementById("player-subject")
          .value
          .trim();

      if (!name) {

        showMessage(
          "⚠️",
          "名前が必要です",
          "プレイヤー名を入力してください。"
        );

        return;
      }

      data.registered = true;
      data.name = name;
      data.track = track;
      data.subject =
        subject || "未設定";

      selectedSubject =
        subject || "";

      saveData();

      showMain();

      updateAll();

      showMessage(
        "⚔️",
        "冒険開始！",
        `${name}の受験RPGが始まった！`
      );

    });
}


/* ========================================
   SCREEN
======================================== */

function showRegister() {

  document
    .getElementById("register-screen")
    .classList.remove("hidden");

  document
    .getElementById("main-screen")
    .classList.add("hidden");
}


function showMain() {

  document
    .getElementById("register-screen")
    .classList.add("hidden");

  document
    .getElementById("main-screen")
    .classList.remove("hidden");

  showPage("home");
}


/* ========================================
   NAVIGATION
======================================== */

function setupNavigation() {

  document
    .querySelectorAll("[data-page]")
    .forEach(button => {

      button.addEventListener("click", () => {

        const page =
          button.dataset.page;

        showPage(page);

      });

    });
}


function showPage(page) {

  document
    .querySelectorAll(".page")
    .forEach(element => {

      element.classList.toggle(
        "active",
        element.id === `page-${page}`
      );

    });


  document
    .querySelectorAll(".nav-button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });
}


/* ========================================
   SUBJECT
======================================== */

function setupSubjects() {

  document
    .querySelectorAll(".subject-button")
    .forEach(button => {

      button.addEventListener("click", () => {

        document
          .querySelectorAll(".subject-button")
          .forEach(btn =>
            btn.classList.remove("selected")
          );

        button.classList.add("selected");

        selectedSubject =
          button.dataset.subject;

        document
          .getElementById("current-subject")
          .textContent =
          selectedSubject;

      });

    });
}


/* ========================================
   TIMER
======================================== */

function setupTimer() {

  document
    .getElementById("timer-start")
    .addEventListener(
      "click",
      startTimer
    );

  document
    .getElementById("timer-stop")
    .addEventListener(
      "click",
      stopTimer
    );
}


function startTimer() {

  if (timerInterval) {
    return;
  }

  if (!selectedSubject) {

    selectedSubject =
      data.subject || "未設定";

    document
      .getElementById("current-subject")
      .textContent =
      selectedSubject;
  }

  timerStart = Date.now();

  timerInterval =
    setInterval(
      updateTimerDisplay,
      1000
    );

  document
    .getElementById("timer-status")
    .textContent =
    "🔥 勉強中";

  document
    .getElementById("timer-start")
    .textContent =
    "⏳ 勉強中";
}


function stopTimer() {

  if (!timerInterval || !timerStart) {
    return;
  }

  clearInterval(timerInterval);

  timerInterval = null;

  const seconds =
    Math.floor(
      (Date.now() - timerStart) / 1000
    );

  const minutes =
    Math.floor(seconds / 60);

  timerStart = null;

  document
    .getElementById("timer-status")
    .textContent =
    "記録完了";

  document
    .getElementById("timer-start")
    .textContent =
    "▶ スタート";

  document
    .getElementById("timer-display")
    .textContent =
    "00:00:00";

  if (minutes <= 0) {

    showMessage(
      "⏱️",
      "記録されませんでした",
      "1分未満のセッションでした。"
    );

    return;
  }

  recordStudy(
    minutes,
    "timer"
  );
}


function updateTimerDisplay() {

  if (!timerStart) {
    return;
  }

  const seconds =
    Math.floor(
      (Date.now() - timerStart) / 1000
    );

  const hours =
    Math.floor(seconds / 3600);

  const minutes =
    Math.floor(
      (seconds % 3600) / 60
    );

  const secs =
    seconds % 60;

  document
    .getElementById("timer-display")
    .textContent =
    `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}


function pad(number) {

  return String(number)
    .padStart(2, "0");
}


/* ========================================
   MANUAL REPORT
======================================== */

function setupManualReport() {

  document
    .getElementById("manual-report-button")
    .addEventListener(
      "click",
      () => {

        document
          .getElementById("report-modal")
          .classList.remove("hidden");

      }
    );


  document
    .getElementById("report-cancel")
    .addEventListener(
      "click",
      closeReportModal
    );


  document
    .getElementById("report-submit")
    .addEventListener(
      "click",
      submitManualReport
    );
}


function closeReportModal() {

  document
    .getElementById("report-modal")
    .classList.add("hidden");
}


function submitManualReport() {

  const hours =
    Number(
      document
        .getElementById("report-hours")
        .value
    );

  const minutes =
    Number(
      document
        .getElementById("report-minutes")
        .value
    );

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {

    showMessage(
      "⚠️",
      "記録できません",
      "正しい勉強時間を入力してください。"
    );

    return;
  }

  if (
    hours < 0 ||
    minutes < 0 ||
    minutes > 59
  ) {

    showMessage(
      "⚠️",
      "入力エラー",
      "時間と分を正しく入力してください。"
    );

    return;
  }

  const totalMinutes =
    Math.floor(hours * 60 + minutes);

  if (totalMinutes <= 0) {

    showMessage(
      "⚠️",
      "記録できません",
      "1分以上の勉強時間を入力してください。"
    );

    return;
  }

  selectedSubject =
    document
      .getElementById("report-subject")
      .value;

  closeReportModal();

  recordStudy(
    totalMinutes,
    "manual"
  );
}


/* ========================================
   RECORD STUDY
======================================== */

function recordStudy(minutes, source) {

  if (
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    return;
  }

  minutes =
    Math.floor(minutes);

  data.totalMinutes += minutes;
  data.todayMinutes += minutes;
  data.monthMinutes += minutes;


  /* --------------------------------
     XP
  -------------------------------- */

  const baseXP =
    minutes;

  const earnedXP =
    calculateBuffedXP(baseXP);

  data.totalXP += earnedXP;
  data.xp += earnedXP;


  /* --------------------------------
     🪙 コイン
     1分 = 1コイン
  -------------------------------- */

  data.coins += minutes;


  /* --------------------------------
     💎 セッション終了ボーナス
  -------------------------------- */

  const sessionBonus =
    checkSessionBonus();

  if (sessionBonus > 0) {

    data.totalXP += sessionBonus;
    data.xp += sessionBonus;
  }


  /* --------------------------------
     🔥 目標達成バフ
  -------------------------------- */

  const goalResult =
    handleGoalBuff();


  /* --------------------------------
     ⬆️ LEVEL UP
  -------------------------------- */

  let levelUps =
    processLevelUps();


  if (goalResult.levelUps > 0) {
    levelUps += goalResult.levelUps;
  }


  /* --------------------------------
     🏆 実績
  -------------------------------- */

  const newAchievements =
    checkAchievements();


  saveData();

  updateAll();


  /* --------------------------------
     メッセージ
  -------------------------------- */

  let message =
    `${minutes}分の勉強を記録！\n` +
    `+${earnedXP} XP\n` +
    `+${minutes} 🪙`;


  if (sessionBonus > 0) {

    message +=
      `\n💎 経験の結晶発動！ +${sessionBonus} XP`;
  }


  if (goalResult.bonus > 0) {

    message +=
      `\n🔥 目標達成バフ！ +${goalResult.bonus} XP`;
  }


  if (source === "manual") {

    message +=
      "\n📝 事後報告として記録しました。";
  }


  if (newAchievements > 0) {

    message +=
      `\n🏆 実績解除！ +${newAchievements * 50} 🪙`;
  }


  if (levelUps > 0) {

    message +=
      `\n\n⬆️ Lv.${data.level}に到達！`;

    showMessage(
      "⬆️",
      "LEVEL UP!",
      message
    );

    setTimeout(() => {
      showLevelUp();
    }, 300);

    return;
  }


  showMessage(
    "📚",
    "勉強記録完了",
    message
  );
}


/* ========================================
   XP
======================================== */

function xpRequired() {

  /*
    1レベル100XP
  */

  return 100;
}


function processLevelUps() {

  let levelUps = 0;

  while (
    data.xp >= xpRequired() &&
    data.level < 100
  ) {

    data.xp -= xpRequired();

    data.level++;

    levelUps++;
  }

  /*
    Lv.100ではXPを100以上
    貯め続けないようにする
  */

  if (data.level >= 100) {

    data.level = 100;

    data.xp =
      Math.min(
        data.xp,
        xpRequired() - 1
      );
  }

  return levelUps;
}


/* ========================================
   BUFF
======================================== */

function calculateBuffedXP(baseXP) {

  const buff =
    data.activeBuff;

  if (!buff) {
    return baseXP;
  }

  if (
    buff.type !== "multiplier"
  ) {
    return baseXP;
  }

  if (
    Date.now() >= buff.expiresAt
  ) {

    data.activeBuff = null;

    return baseXP;
  }

  return Math.floor(
    baseXP * buff.multiplier
  );
}


function updateBuff() {

  if (!data.activeBuff) {

    updateBuffUI();

    return;
  }

  if (
    data.activeBuff.type === "multiplier" &&
    Date.now() >= data.activeBuff.expiresAt
  ) {

    data.activeBuff = null;

    saveData();

    updateAll();

    return;
  }

  updateBuffUI();
}


function updateBuffUI() {

  const homeBuff =
    document.getElementById(
      "home-buff"
    );

  const profileBuff =
    document.getElementById(
      "profile-buff"
    );

  if (!homeBuff || !profileBuff) {
    return;
  }

  if (!data.activeBuff) {

    homeBuff.classList.add("hidden");

    profileBuff.textContent =
      "現在バフなし";

    return;
  }

  const buff =
    data.activeBuff;

  let remaining = 0;

  if (
    buff.type === "multiplier"
  ) {

    remaining =
      Math.max(
        0,
        Math.ceil(
          (buff.expiresAt - Date.now()) / 1000
        )
      );

  }

  const minutes =
    Math.floor(
      remaining / 60
    );

  const seconds =
    remaining % 60;

  const timeText =
    `${pad(minutes)}:${pad(seconds)}`;


  homeBuff.classList.remove(
    "hidden"
  );


  document
    .getElementById("buff-name")
    .textContent =
    buff.name;


  document
    .getElementById("buff-description")
    .textContent =
    buff.description;


  if (
    buff.type === "multiplier"
  ) {

    document
      .getElementById("buff-timer")
      .textContent =
      timeText;

    profileBuff.textContent =
      `${buff.name} — ${buff.description} — 残り ${timeText}`;

  } else {

    document
      .getElementById("buff-timer")
      .textContent =
      "READY";

    profileBuff.textContent =
      `${buff.name} — ${buff.description}`;
  }
}


/* ========================================
   GOAL BUFF
======================================== */

function handleGoalBuff() {

  const result = {
    bonus: 0,
    levelUps: 0
  };

  if (!data.activeBuff) {
    return result;
  }

  if (
    data.activeBuff.type !== "goal"
  ) {
    return result;
  }

  if (
    data.todayMinutes <
    data.dailyGoal
  ) {
    return result;
  }

  const bonus =
    data.activeBuff.bonus;

  data.totalXP += bonus;
  data.xp += bonus;

  data.activeBuff = null;

  result.bonus = bonus;

  result.levelUps =
    processLevelUps();

  return result;
}


/* ========================================
   SESSION BONUS
======================================== */

function checkSessionBonus() {

  if (!data.activeBuff) {
    return 0;
  }

  if (
    data.activeBuff.type !== "session"
  ) {
    return 0;
  }

  const bonus =
    data.activeBuff.bonus;

  data.activeBuff = null;

  return bonus;
}


/* ========================================
   SHOP TABS
======================================== */

function setupShopTabs() {

  document
    .querySelectorAll(".shop-tab")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const tab =
            button.dataset.shopTab;

          document
            .querySelectorAll(".shop-tab")
            .forEach(btn =>
              btn.classList.remove("active")
            );

          document
            .querySelectorAll(".shop-panel")
            .forEach(panel =>
              panel.classList.remove("active")
            );

          button.classList.add("active");

          document
            .getElementById(
              `shop-${tab}`
            )
            .classList.add("active");

        }
      );

    });
}


/* ========================================
   SHOP RENDER
======================================== */

function renderShop() {

  renderTitles();
  renderItems();
  renderThemes();
  renderBackgrounds();
  renderAvatars();

  const shopCoins =
    document.getElementById(
      "shop-coins"
    );

  if (shopCoins) {

    shopCoins.textContent =
      data.coins.toLocaleString();
  }
}


/* ========================================
   TITLE SHOP
======================================== */

function renderTitles() {

  const grid =
    document.getElementById(
      "title-shop-grid"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  TITLES.forEach(item => {

    const owned =
      data.ownedTitles.includes(
        item.id
      );

    const equipped =
      data.equippedTitle === item.id;

    let buttonText =
      `${item.price.toLocaleString()} 🪙`;

    if (equipped) {

      buttonText =
        "装備中";

    } else if (owned) {

      buttonText =
        "装備";
    }


    const element =
      document.createElement("div");

    element.className =
      "shop-item";

    element.innerHTML = `
      <div>
        <div class="shop-item-name">
          ${item.name}
        </div>

        <div class="shop-item-description">
          称号
        </div>
      </div>

      <button
        class="shop-item-button
          ${owned ? "owned" : ""}
          ${equipped ? "equipped" : ""}"
        data-title-id="${item.id}"
      >
        ${buttonText}
      </button>
    `;


    element
      .querySelector("button")
      .addEventListener(
        "click",
        () => buyOrEquipTitle(item)
      );


    grid.appendChild(element);

  });
}


function buyOrEquipTitle(item) {

  const owned =
    data.ownedTitles.includes(
      item.id
    );


  if (owned) {

    data.equippedTitle =
      item.id;

    saveData();

    updateAll();

    showMessage(
      "🏷️",
      "称号変更",
      `「${item.name}」を装備した！`
    );

    return;
  }


  if (
    data.coins < item.price
  ) {

    showMessage(
      "🪙",
      "コイン不足",
      `必要：${item.price.toLocaleString()}コイン\n` +
      `所持：${data.coins.toLocaleString()}コイン`
    );

    return;
  }


  data.coins -= item.price;

  data.ownedTitles.push(
    item.id
  );

  data.equippedTitle =
    item.id;


  saveData();

  updateAll();


  showMessage(
    "🏷️",
    "称号獲得！",
    `「${item.name}」を手に入れた！`
  );
}


/* ========================================
   ITEM SHOP
======================================== */

function renderItems() {

  const grid =
    document.getElementById(
      "item-shop-grid"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = "";


  ITEMS.forEach(item => {

    const element =
      document.createElement("div");

    element.className =
      "shop-item";

    element.innerHTML = `
      <div>
        <div class="shop-item-name">
          ${item.name}
        </div>

        <div class="shop-item-description">
          ${item.description}
        </div>
      </div>

      <button
        class="shop-item-button"
        data-item-id="${item.id}"
      >
        ${item.price.toLocaleString()} 🪙
      </button>
    `;


    element
      .querySelector("button")
      .addEventListener(
        "click",
        () => buyItem(item)
      );


    grid.appendChild(element);

  });
}


function buyItem(item) {

  if (
    data.coins < item.price
  ) {

    showMessage(
      "🪙",
      "コイン不足",
      `必要：${item.price.toLocaleString()}コイン\n` +
      `所持：${data.coins.toLocaleString()}コイン`
    );

    return;
  }


  if (
    item.type === "multiplier" &&
    data.activeBuff &&
    data.activeBuff.type === "multiplier"
  ) {

    showMessage(
      "⚡",
      "バフは重複できません",
      "現在のXP倍率バフが終了してから使用してください。"
    );

    return;
  }


  if (
    item.type === "goal" &&
    data.activeBuff
  ) {

    showMessage(
      "🔥",
      "バフは1つまで",
      "現在のバフを使い切ってから使用してください。"
    );

    return;
  }


  if (
    item.type === "session" &&
    data.activeBuff
  ) {

    showMessage(
      "💎",
      "バフは1つまで",
      "現在のバフを使い切ってから使用してください。"
    );

    return;
  }


  data.coins -= item.price;

  activateItem(item);

  saveData();

  updateAll();


  showMessage(
    "🎁",
    "アイテム使用！",
    `${item.name}\n${item.description}`
  );
}


function activateItem(item) {

  if (
    item.type === "multiplier"
  ) {

    data.activeBuff = {

      type: "multiplier",

      name:
        item.name,

      description:
        `XP ×${item.multiplier}`,

      multiplier:
        item.multiplier,

      expiresAt:
        Date.now() +
        item.duration * 1000
    };

    return;
  }


  if (
    item.type === "goal"
  ) {

    data.activeBuff = {

      type: "goal",

      name:
        item.name,

      description:
        `目標達成で +${item.bonus} XP`,

      bonus:
        item.bonus
    };

    return;
  }


  if (
    item.type === "session"
  ) {

    data.activeBuff = {

      type: "session",

      name:
        item.name,

      description:
        `次のセッション終了時 +${item.bonus} XP`,

      bonus:
        item.bonus
    };

    return;
  }
}


/* ========================================
   CUSTOM SHOP
======================================== */

function renderThemes() {

  const grid =
    document.getElementById(
      "theme-shop-grid"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = "";


  THEMES.forEach(item => {

    const owned =
      data.ownedThemes.includes(
        item.id
      );

    const equipped =
      data.equippedTheme === item.id;


    const buttonText =
      equipped
        ? "使用中"
        : owned
          ? "使用"
          : `${item.price.toLocaleString()} 🪙`;


    const element =
      document.createElement("div");

    element.className =
      "shop-item";


    element.innerHTML = `
      <div>
        <div class="shop-item-name">
          ${item.name}
        </div>

        <div class="shop-item-description">
          メインカラー
        </div>
      </div>

      <button
        class="shop-item-button
          ${owned ? "owned" : ""}
          ${equipped ? "equipped" : ""}"
      >
        ${buttonText}
      </button>
    `;


    element
      .querySelector("button")
      .addEventListener(
        "click",
        () => buyOrEquipTheme(item)
      );


    grid.appendChild(element);

  });
}


function buyOrEquipTheme(item) {

  const owned =
    data.ownedThemes.includes(
      item.id
    );


  if (owned) {

    data.equippedTheme =
      item.id;

    applyTheme();

    saveData();

    updateAll();

    return;
  }


  if (
    data.coins < item.price
  ) {

    showMessage(
      "🪙",
      "コイン不足",
      "コインが足りません。"
    );

    return;
  }


  data.coins -= item.price;

  data.ownedThemes.push(
    item.id
  );

  data.equippedTheme =
    item.id;


  applyTheme();

  saveData();

  updateAll();
}


/* ========================================
   BACKGROUND SHOP
======================================== */

function renderBackgrounds() {

  const grid =
    document.getElementById(
      "background-shop-grid"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = "";


  BACKGROUNDS.forEach(item => {

    const owned =
      data.ownedBackgrounds.includes(
        item.id
      );

    const equipped =
      data.equippedBackground === item.id;


    const buttonText =
      equipped
        ? "使用中"
        : owned
          ? "使用"
          : `${item.price.toLocaleString()} 🪙`;


    const element =
      document.createElement("div");

    element.className =
      "shop-item";


    element.innerHTML = `
      <div>
        <div class="shop-item-name">
          ${item.name}
        </div>

        <div class="shop-item-description">
          背景テーマ
        </div>
      </div>

      <button
        class="shop-item-button
          ${owned ? "owned" : ""}
          ${equipped ? "equipped" : ""}"
      >
        ${buttonText}
      </button>
    `;


    element
      .querySelector("button")
      .addEventListener(
        "click",
        () => buyOrEquipBackground(item)
      );


    grid.appendChild(element);

  });
}


function buyOrEquipBackground(item) {

  const owned =
    data.ownedBackgrounds.includes(
      item.id
    );


  if (owned) {

    data.equippedBackground =
      item.id;

    applyBackground();

    saveData();

    updateAll();

    return;
  }


  if (
    data.coins < item.price
  ) {

    showMessage(
      "🪙",
      "コイン不足",
      "コインが足りません。"
    );

    return;
  }


  data.coins -= item.price;

  data.ownedBackgrounds.push(
    item.id
  );

  data.equippedBackground =
    item.id;


  applyBackground();

  saveData();

  updateAll();
}


/* ========================================
   AVATAR SHOP
======================================== */

function renderAvatars() {

  const grid =
    document.getElementById(
      "avatar-shop-grid"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = "";


  AVATARS.forEach(item => {

    const owned =
      data.ownedAvatars.includes(
        item.id
      );

    const equipped =
      data.equippedAvatar === item.id;


    const buttonText =
      equipped
        ? "使用中"
        : owned
          ? "使用"
          : `${item.price.toLocaleString()} 🪙`;


    const element =
      document.createElement("div");

    element.className =
      "shop-item";


    element.innerHTML = `
      <div>
        <div class="shop-item-name">
          ${item.name}
        </div>

        <div class="shop-item-description">
          アバター
        </div>
      </div>

      <button
        class="shop-item-button
          ${owned ? "owned" : ""}
          ${equipped ? "equipped" : ""}"
      >
        ${buttonText}
      </button>
    `;


    element
      .querySelector("button")
      .addEventListener(
        "click",
        () => buyOrEquipAvatar(item)
      );


    grid.appendChild(element);

  });
}


function buyOrEquipAvatar(item) {

  const owned =
    data.ownedAvatars.includes(
      item.id
    );


  if (owned) {

    data.equippedAvatar =
      item.id;

    saveData();

    updateAll();

    showMessage(
      "👤",
      "アバター変更",
      `${item.name}を装備した！`
    );

    return;
  }


  if (
    data.coins < item.price
  ) {

    showMessage(
      "🪙",
      "コイン不足",
      `必要：${item.price.toLocaleString()}コイン\n` +
      `所持：${data.coins.toLocaleString()}コイン`
    );

    return;
  }


  data.coins -= item.price;

  data.ownedAvatars.push(
    item.id
  );

  data.equippedAvatar =
    item.id;


  saveData();

  updateAll();


  showMessage(
    "👤",
    "アバター獲得！",
    `${item.name}を手に入れた！`
  );
}


function getAvatar() {

  const avatar =
    AVATARS.find(
      item =>
        item.id === data.equippedAvatar
    );

  return avatar
    ? avatar.value
    : "⚔️";
}


/* ========================================
   THEME
======================================== */

function applyTheme() {

  const theme =
    THEMES.find(
      item =>
        item.id === data.equippedTheme
    ) || THEMES[0];


  document.documentElement
    .style.setProperty(
      "--theme",
      theme.color
    );


  document.documentElement
    .style.setProperty(
      "--theme-light",
      theme.light
    );


  document.documentElement
    .style.setProperty(
      "--theme-dark",
      theme.dark
    );


  applyBackground();
}


function applyBackground() {

  const bg =
    BACKGROUNDS.find(
      item =>
        item.id === data.equippedBackground
    ) || BACKGROUNDS[0];


  const app =
    document.getElementById("app");


  if (!app) {
    return;
  }
   if (
  bg.value === "night" ||
  bg.value === "moon" ||
  bg.value === "battle" ||
  bg.value === "stars"
) {
  document.documentElement.style.setProperty(
    "--text",
    "#f8fafc"
  );

  document.documentElement.style.setProperty(
    "--muted",
    "#cbd5e1"
  );

  document.documentElement.style.setProperty(
    "--card",
    "#1e293b"
  );

  document.documentElement.style.setProperty(
    "--border",
    "#334155"
  );

} else {
  document.documentElement.style.setProperty(
    "--text",
    "#1f2937"
  );

  document.documentElement.style.setProperty(
    "--muted",
    "#6b7280"
  );

  document.documentElement.style.setProperty(
    "--card",
    "#ffffff"
  );

  document.documentElement.style.setProperty(
    "--border",
    "#e5e7eb"
  );
}


  app.style.background =
    getBackgroundCSS(
      bg.value
    );
}


function getBackgroundCSS(value) {

  switch (value) {

    case "night":

      return `
        radial-gradient(
          circle at 20% 20%,
          rgba(255,255,255,0.2) 1px,
          transparent 1px
        ),
        linear-gradient(
          180deg,
          #111827,
          #1e293b
        )
      `;


    case "library":

      return `
        linear-gradient(
          135deg,
          #f5f1e8,
          #e8dfcf
        )
      `;


    case "magic":

      return `
        radial-gradient(
          circle at 70% 20%,
          rgba(139,92,246,0.18),
          transparent 35%
        ),
        linear-gradient(
          135deg,
          #f5f3ff,
          #e0e7ff
        )
      `;


    case "moon":

      return `
        radial-gradient(
          circle at 75% 15%,
          rgba(255,255,255,0.7),
          transparent 12%
        ),
        linear-gradient(
          180deg,
          #172554,
          #312e81
        )
      `;


    case "battle":

      return `
        linear-gradient(
          135deg,
          #450a0a,
          #7f1d1d
        )
      `;


    case "stars":

      return `
        radial-gradient(
          circle at 20% 20%,
          rgba(255,255,255,0.25) 1px,
          transparent 1px
        ),
        radial-gradient(
          circle at 70% 60%,
          rgba(255,255,255,0.2) 1px,
          transparent 1px
        ),
        linear-gradient(
          135deg,
          #020617,
          #312e81
        )
      `;


    default:

      return "var(--bg)";
  }
}


/* ========================================
   DAILY QUEST
======================================== */

function renderQuests() {

  const container =
    document.getElementById(
      "quest-list"
    );

  const homeContainer =
    document.getElementById(
      "home-quests"
    );


  if (!container || !homeContainer) {
    return;
  }


  container.innerHTML = "";
  homeContainer.innerHTML = "";


  DAILY_QUESTS.forEach(quest => {

    const progress =
      Math.min(
        data.todayMinutes,
        quest.minutes
      );


    const percentage =
      Math.min(
        100,
        (progress / quest.minutes) * 100
      );


    const claimed =
      data.claimedQuests
        .includes(quest.id);


    const completed =
      progress >= quest.minutes;


    /* -------------------------
       Quest page
    ------------------------- */

    const card =
      document.createElement("div");


    card.className =
      "quest-card" +
      (claimed
        ? " completed"
        : "");


    let bottomHTML = "";


    if (claimed) {

      bottomHTML = `
        <span class="quest-complete-label">
          ✓ 完了
        </span>
      `;

    } else if (completed) {

      bottomHTML = `
        <button
          class="quest-claim-button"
          data-quest-id="${quest.id}"
        >
          報酬を受け取る
        </button>
      `;

    } else {

      bottomHTML = `
        <span class="quest-reward">
          ${quest.xp}XP + ${quest.coins}🪙
        </span>
      `;
    }


    card.innerHTML = `
      <div class="quest-card-icon">
        ${quest.icon}
      </div>

      <h3>
        ${quest.name}
      </h3>

      <p>
        ${quest.description}
      </p>

      <div class="quest-progress">
        <div
          class="quest-progress-fill"
          style="width:${percentage}%"
        ></div>
      </div>

      <div class="quest-bottom">

        <span class="quest-reward">
          ${progress}/${quest.minutes}分
        </span>

        ${bottomHTML}

      </div>
    `;


    const claimButton =
      card.querySelector(
        ".quest-claim-button"
      );


    if (claimButton) {

      claimButton.addEventListener(
        "click",
        () => claimQuest(quest)
      );
    }


    container.appendChild(card);


    /* -------------------------
       Home quest
    ------------------------- */

    const home =
      document.createElement("div");


    home.className =
      "home-quest";


    let statusText =
      `${progress}/${quest.minutes}分`;


    if (claimed) {

      statusText =
        "✓ 完了";

    } else if (completed) {

      statusText =
        "報酬GET!";
    }


    home.innerHTML = `
      <div class="home-quest-icon">
        ${quest.icon}
      </div>

      <div class="home-quest-info">
        <strong>${quest.name}</strong>
        <span>
          ${progress}/${quest.minutes}分
        </span>
      </div>

      <div class="home-quest-status">
        ${statusText}
      </div>
    `;


    homeContainer.appendChild(home);

  });
}


function claimQuest(quest) {

  if (
    data.claimedQuests
      .includes(quest.id)
  ) {
    return;
  }


  if (
    data.todayMinutes <
    quest.minutes
  ) {
    return;
  }


  data.claimedQuests.push(
    quest.id
  );


  /* --------------------------------
     XP
  -------------------------------- */

  data.totalXP += quest.xp;
  data.xp += quest.xp;


  /* --------------------------------
     🪙 コイン
  -------------------------------- */

  data.coins += quest.coins;


  /* --------------------------------
     Level
  -------------------------------- */

  const levelUps =
    processLevelUps();


  /* --------------------------------
     Achievement
  -------------------------------- */

  const newAchievements =
    checkAchievements();


  saveData();

  updateAll();


  let message =
    `${quest.name}\n\n` +
    `+${quest.xp} XP\n` +
    `+${quest.coins} 🪙`;


  if (newAchievements > 0) {

    message +=
      `\n🏆 実績解除！ +${newAchievements * 50} 🪙`;
  }


  if (levelUps > 0) {

    message +=
      `\n\n⬆️ Lv.${data.level}に到達！`;

    showMessage(
      "🎉",
      "QUEST COMPLETE!",
      message
    );

    setTimeout(() => {
      showLevelUp();
    }, 300);

    return;
  }


  showMessage(
    "🎉",
    "QUEST COMPLETE!",
    message
  );
}


/* ========================================
   GOAL
======================================== */

function setupGoal() {

  document
    .getElementById("change-goal-button")
    .addEventListener(
      "click",
      () => {

        document
          .getElementById("goal-input")
          .value =
          data.dailyGoal;


        document
          .getElementById("goal-modal")
          .classList.remove(
            "hidden"
          );

      }
    );


  document
    .getElementById("goal-cancel")
    .addEventListener(
      "click",
      () => {

        document
          .getElementById("goal-modal")
          .classList.add(
            "hidden"
          );

      }
    );


  document
    .getElementById("goal-submit")
    .addEventListener(
      "click",
      () => {

        const goal =
          Number(
            document
              .getElementById("goal-input")
              .value
          );


        if (
          !Number.isFinite(goal) ||
          goal <= 0
        ) {
          return;
        }


        data.dailyGoal =
          Math.min(
            1440,
            Math.floor(goal)
          );


        saveData();

        updateAll();


        document
          .getElementById("goal-modal")
          .classList.add(
            "hidden"
          );

      }
    );
}


/* ========================================
   RANK
======================================== */

function getCurrentRank() {

  let current =
    RANKS[0];


  RANKS.forEach(rank => {

    if (
      data.monthMinutes >=
      rank.min
    ) {

      current = rank;
    }

  });


  return current;
}


function formatRank() {

  const rank =
    getCurrentRank();

  return `${rank.icon} ${rank.name}`;
}


/* ========================================
   TIME FORMAT
======================================== */

function formatMinutes(minutes) {

  const hours =
    Math.floor(
      minutes / 60
    );

  const mins =
    minutes % 60;


  if (hours === 0) {

    return `${mins}分`;
  }


  return `${hours}h ${mins}m`;
}


/* ========================================
   ACHIEVEMENTS
======================================== */

function checkAchievements() {

  let newAchievements = 0;


  ACHIEVEMENTS.forEach(
    achievement => {

      if (
        data.achievements
          .includes(
            achievement.id
          )
      ) {
        return;
      }


      if (
        achievement.check(data)
      ) {

        data.achievements.push(
          achievement.id
        );


        /*
          🪙 実績1個につき50コイン
        */

        data.coins += 50;

        newAchievements++;
      }

    }
  );


  return newAchievements;
}


function renderAchievements() {

  const container =
    document.getElementById(
      "achievement-list"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  ACHIEVEMENTS.forEach(item => {

    const unlocked =
      data.achievements
        .includes(
          item.id
        );


    const element =
      document.createElement("div");


    element.className =
      "achievement" +
      (
        unlocked
          ? ""
          : " locked"
      );


    element.innerHTML = `
      <div class="achievement-icon">
        ${unlocked ? item.icon : "🔒"}
      </div>

      <div class="achievement-info">
        <strong>
          ${item.name}
        </strong>

        <span>
          ${item.description}
        </span>
      </div>
    `;


    container.appendChild(
      element
    );

  });
}


/* ========================================
   ENDINGS
======================================== */

function checkEndings() {

  /*
    ゲーム内のジョーク/演出としての
    隠しエンド。

    現在は自動発生なし。
  */

  if (
    !data.hiddenEndingSeen &&
    data.monthMinutes === 0 &&
    data.totalMinutes > 0
  ) {

    /*
      将来条件を追加可能。
    */
  }
}


/* ========================================
   LEVEL UP MODAL
======================================== */

function setupLevelUpModal() {

  document
    .getElementById("levelup-close")
    .addEventListener(
      "click",
      () => {

        document
          .getElementById("levelup-modal")
          .classList.add(
            "hidden"
          );

      }
    );
}


function showLevelUp() {

  const number =
    document.getElementById(
      "levelup-number"
    );

  const modal =
    document.getElementById(
      "levelup-modal"
    );


  if (!number || !modal) {
    return;
  }


  number.textContent =
    data.level;


  modal.classList.remove(
    "hidden"
  );
}


/* ========================================
   MESSAGE MODAL
======================================== */

function setupMessageModal() {

  document
    .getElementById("message-close")
    .addEventListener(
      "click",
      () => {

        document
          .getElementById("message-modal")
          .classList.add(
            "hidden"
          );

      }
    );
}


function showMessage(
  icon,
  title,
  text
) {

  document
    .getElementById("message-icon")
    .textContent =
    icon;


  document
    .getElementById("message-title")
    .textContent =
    title;


  document
    .getElementById("message-text")
    .textContent =
    text;


  document
    .getElementById("message-modal")
    .classList.remove(
      "hidden"
    );
}


/* ========================================
   UPDATE ALL
======================================== */

function updateAll() {

  checkDateReset();


  /*
    実績を先に判定。
    その後UIを描画することで、
    新しく解除された実績も即反映。
  */

  checkAchievements();


  updateHome();

  updateStudy();

  updateQuestHeader();

  renderQuests();

  renderShop();

  updateProfile();

  renderAchievements();

  updateBuffUI();

  applyTheme();


  saveData();
}


/* ========================================
   HOME UPDATE
======================================== */

function updateHome() {

  const homeName =
    document.getElementById(
      "home-name"
    );

  if (homeName) {

    homeName.textContent =
      data.name || "冒険者";
  }


  const homeLevel =
    document.getElementById(
      "home-level"
    );

  if (homeLevel) {

    homeLevel.textContent =
      data.level;
  }


  const homeXPText =
    document.getElementById(
      "home-xp-text"
    );

  if (homeXPText) {

    homeXPText.textContent =
      `${data.xp} / ${xpRequired()}`;
  }


  const percentage =
    Math.min(
      100,
      (data.xp / xpRequired()) * 100
    );


  const homeXPFill =
    document.getElementById(
      "home-xp-fill"
    );

  if (homeXPFill) {

    homeXPFill.style.width =
      `${percentage}%`;
  }


  const homeCoins =
    document.getElementById(
      "home-coins"
    );

  if (homeCoins) {

    homeCoins.textContent =
      data.coins.toLocaleString();
  }


  const homeMonth =
    document.getElementById(
      "home-month-hours"
    );

  if (homeMonth) {

    homeMonth.textContent =
      formatMinutes(
        data.monthMinutes
      );
  }


  const homeToday =
    document.getElementById(
      "home-today-minutes"
    );

  if (homeToday) {

    homeToday.textContent =
      formatMinutes(
        data.todayMinutes
      );
  }


  const homeRank =
    document.getElementById(
      "home-rank"
    );

  if (homeRank) {

    homeRank.textContent =
      formatRank();
  }


  /* --------------------------------
     👤 アバター
  -------------------------------- */

  const homeAvatar =
    document.getElementById(
      "home-avatar"
    );

  if (homeAvatar) {

    homeAvatar.textContent =
      getAvatar();
  }
}


/* ========================================
   STUDY UPDATE
======================================== */

function updateStudy() {

  const currentSubject =
    document.getElementById(
      "current-subject"
    );


  if (!currentSubject) {
    return;
  }


  currentSubject.textContent =
    selectedSubject ||
    data.subject ||
    "未選択";
}


/* ========================================
   QUEST HEADER
======================================== */

function updateQuestHeader() {

  const todayTime =
    document.getElementById(
      "quest-today-time"
    );

  const goalTime =
    document.getElementById(
      "quest-goal-time"
    );


  if (todayTime) {

    todayTime.textContent =
      formatMinutes(
        data.todayMinutes
      );
  }


  if (goalTime) {

    goalTime.textContent =
      formatMinutes(
        data.dailyGoal
      );
  }
}


/* ========================================
   PROFILE
======================================== */

function updateProfile() {

  const profileName =
    document.getElementById(
      "profile-name"
    );


  if (profileName) {

    profileName.textContent =
      data.name || "冒険者";
  }


  const profileLevel =
    document.getElementById(
      "profile-level"
    );


  if (profileLevel) {

    profileLevel.textContent =
      data.level;
  }


  const profileXP =
    document.getElementById(
      "profile-total-xp"
    );


  if (profileXP) {

    profileXP.textContent =
      data.totalXP.toLocaleString();
  }


  const profileTotalTime =
    document.getElementById(
      "profile-total-time"
    );


  if (profileTotalTime) {

    profileTotalTime.textContent =
      formatMinutes(
        data.totalMinutes
      );
  }


  const profileMonthTime =
    document.getElementById(
      "profile-month-time"
    );


  if (profileMonthTime) {

    profileMonthTime.textContent =
      formatMinutes(
        data.monthMinutes
      );
  }


  const profileCoins =
    document.getElementById(
      "profile-coins"
    );


  if (profileCoins) {

    profileCoins.textContent =
      data.coins.toLocaleString();
  }


  const profileRank =
    document.getElementById(
      "profile-rank"
    );


  if (profileRank) {

    profileRank.textContent =
      formatRank();
  }


  const title =
    TITLES.find(
      item =>
        item.id ===
        data.equippedTitle
    );


  const profileTitle =
    document.getElementById(
      "profile-title"
    );


  if (profileTitle) {

    profileTitle.textContent =
      title
        ? title.name
        : "新米冒険者";
  }


  /* --------------------------------
     👤 プロフィールアバター
  -------------------------------- */

  const profileAvatar =
    document.getElementById(
      "profile-avatar"
    );


  if (profileAvatar) {

    profileAvatar.textContent =
      getAvatar();
  }
}
