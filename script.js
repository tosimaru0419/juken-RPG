/* =========================================================
   受験RPG - script.js
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONSTANTS
  ======================================================= */

  const STORAGE_KEY = "jukenn_rpg_users";
  const SESSION_KEY = "jukenn_rpg_session";

  const SUBJECTS = {
    japanese: "国語",
    math: "数学",
    english: "英語",
    physics: "物理",
    chemistry: "化学",
    biology: "生物",
    "earth-science": "地学",
    geography: "地理",
    "japanese-history": "日本史",
    "world-history": "世界史",
    civics: "公民"
  };

  const COURSE_NAMES = {
    science: "理系",
    humanities: "文系",
    undecided: "未定・その他"
  };

  /*
   * Lv.1 → Lv.2 : 50 XP
   * Lv.2 → Lv.3 : 100 XP
   * Lv.3 → Lv.4 : 150 XP
   *
   * つまり次レベルに必要なXPは
   * (現在Lv) × 50
   */
  const MAX_LEVEL = 100;

  /*
   * ランクは「月間勉強時間」で決定。
   */
  const RANKS = [
    {
      name: "Bronze",
      minHours: 0,
      seasonXP: 0
    },
    {
      name: "Silver",
      minHours: 20,
      seasonXP: 100
    },
    {
      name: "Gold",
      minHours: 40,
      seasonXP: 250
    },
    {
      name: "Platinum",
      minHours: 60,
      seasonXP: 400
    },
    {
      name: "Diamond",
      minHours: 80,
      seasonXP: 600
    },
    {
      name: "Master",
      minHours: 100,
      seasonXP: 800
    },
    {
      name: "Grandmaster",
      minHours: 120,
      seasonXP: 1000
    },
    {
      name: "Legend",
      minHours: 150,
      seasonXP: 1250
    }
  ];

  /*
   * 星ごとの称号
   */
  const STAR_TITLES = [
    "旅立ちし者",
    "駆け出しの冒険者",
    "努力の探求者",
    "知識の開拓者",
    "限界突破者",
    "学習の騎士",
    "研鑽の勇者",
    "知識の覇者",
    "受験戦士",
    "未来を切り拓く者",
    "不屈の冒険者",
    "超越者",
    "伝説への挑戦者",
    "学問の覇者",
    "受験界の英雄",
    "覚醒せし者",
    "究極の探求者",
    "頂点を目指す者",
    "伝説級冒険者",
    "学びを極めし者"
  ];

  /*
   * ボス
   */
  const BOSS_NAMES = [
    "模試の魔王",
    "先延ばしの悪魔",
    "スマホ中毒竜",
    "睡魔将軍",
    "未履修の巨人",
    "過去問の亡霊",
    "偏差値の暴君",
    "受験迷宮の主",
    "時間泥棒",
    "ラスボス・受験皇帝"
  ];

  /*
   * ボスの基礎HP。
   * パーティー人数によって増加。
   */
  const BOSS_BASE_HP = 300;

  /*
   * 人数補正
   */
  const PARTY_HP_MULTIPLIER = {
    1: 1,
    2: 1.8,
    3: 2.5,
    4: 3.2
  };

  /*
   * ボス弱点倍率
   */
  const BOSS_WEAKNESS_MULTIPLIER = 1.5;

  /*
   * 実績
   */
  const ACHIEVEMENTS = [
    {
      id: "first-study",
      name: "最初の一歩",
      description: "初めて勉強を記録する",
      icon: "📖",
      condition: u => u.stats.totalStudyMinutes >= 1
    },
    {
      id: "study-60",
      name: "1時間突破",
      description: "累計1時間勉強する",
      icon: "⏱️",
      condition: u => u.stats.totalStudyMinutes >= 60
    },
    {
      id: "study-300",
      name: "5時間の旅",
      description: "累計5時間勉強する",
      icon: "🔥",
      condition: u => u.stats.totalStudyMinutes >= 300
    },
    {
      id: "study-600",
      name: "10時間突破",
      description: "累計10時間勉強する",
      icon: "⚔️",
      condition: u => u.stats.totalStudyMinutes >= 600
    },
    {
      id: "study-1000",
      name: "1000分の努力",
      description: "累計1000分勉強する",
      icon: "💎",
      condition: u => u.stats.totalStudyMinutes >= 1000
    },
    {
      id: "study-3000",
      name: "30時間の猛者",
      description: "累計30時間勉強する",
      icon: "🏹",
      condition: u => u.stats.totalStudyMinutes >= 3000
    },
    {
      id: "study-6000",
      name: "100時間の勇者",
      description: "累計100時間勉強する",
      icon: "👑",
      condition: u => u.stats.totalStudyMinutes >= 6000
    },
    {
      id: "study-10000",
      name: "一万分の軌跡",
      description: "累計10000分勉強する",
      icon: "🌟",
      condition: u => u.stats.totalStudyMinutes >= 10000
    },
    {
      id: "level-5",
      name: "駆け出し冒険者",
      description: "Lv.5に到達する",
      icon: "🗡️",
      condition: u => u.level >= 5
    },
    {
      id: "level-10",
      name: "Lv.10到達",
      description: "Lv.10に到達する",
      icon: "⚔️",
      condition: u => u.level >= 10
    },
    {
      id: "level-25",
      name: "四分の一突破",
      description: "Lv.25に到達する",
      icon: "🛡️",
      condition: u => u.level >= 25
    },
    {
      id: "level-50",
      name: "折り返し地点",
      description: "Lv.50に到達する",
      icon: "🏰",
      condition: u => u.level >= 50
    },
    {
      id: "level-75",
      name: "終盤の勇者",
      description: "Lv.75に到達する",
      icon: "🐉",
      condition: u => u.level >= 75
    },
    {
      id: "level-100",
      name: "伝説への到達",
      description: "Lv.100に到達する",
      icon: "🌌",
      condition: u => u.stars >= 1
    },
    {
      id: "star-1",
      name: "星を掴む者",
      description: "初めて転生する",
      icon: "⭐",
      condition: u => u.stars >= 1
    },
    {
      id: "star-3",
      name: "三つ星冒険者",
      description: "星を3個獲得する",
      icon: "⭐⭐⭐",
      condition: u => u.stars >= 3
    },
    {
      id: "star-5",
      name: "星々の旅人",
      description: "星を5個獲得する",
      icon: "🌠",
      condition: u => u.stars >= 5
    },
    {
      id: "star-10",
      name: "十星の英雄",
      description: "星を10個獲得する",
      icon: "✨",
      condition: u => u.stars >= 10
    },
    {
      id: "quest-1",
      name: "初クエスト",
      description: "クエストを1個達成する",
      icon: "📜",
      condition: u => u.stats.questsCompleted >= 1
    },
    {
      id: "quest-10",
      name: "クエストハンター",
      description: "クエストを10個達成する",
      icon: "🎯",
      condition: u => u.stats.questsCompleted >= 10
    },
    {
      id: "quest-50",
      name: "クエストマスター",
      description: "クエストを50個達成する",
      icon: "🏆",
      condition: u => u.stats.questsCompleted >= 50
    },
    {
      id: "boss-1",
      name: "初討伐",
      description: "ボスを1体撃破する",
      icon: "🐲",
      condition: u => u.stats.bossesDefeated >= 1
    },
    {
      id: "boss-5",
      name: "討伐隊",
      description: "ボスを5体撃破する",
      icon: "⚔️",
      condition: u => u.stats.bossesDefeated >= 5
    },
    {
      id: "boss-10",
      name: "竜殺し",
      description: "ボスを10体撃破する",
      icon: "🐉",
      condition: u => u.stats.bossesDefeated >= 10
    },
    {
      id: "daily-complete",
      name: "日課の達人",
      description: "デイリークエストを1日3個すべて達成する",
      icon: "☀️",
      condition: u => u.stats.fullDailyCompletions >= 1
    },
    {
      id: "weekly-complete",
      name: "週間制覇",
      description: "ウィークリークエストを達成する",
      icon: "📅",
      condition: u => u.stats.weeklyCompletions >= 1
    },
    {
      id: "subject-all",
      name: "全教科制覇",
      description: "選択した全教科を1回以上勉強する",
      icon: "📚",
      condition: u => hasStudiedAllSubjects(u)
    },
    {
      id: "night-study",
      name: "夜の冒険者",
      description: "21時以降に勉強を記録する",
      icon: "🌙",
      condition: u => u.stats.nightStudyCount >= 1
    },
    {
      id: "early-study",
      name: "朝の冒険者",
      description: "6時以前に勉強を記録する",
      icon: "🌅",
      condition: u => u.stats.earlyStudyCount >= 1
    },
    {
      id: "long-session",
      name: "長時間戦闘",
      description: "1回で120分以上勉強する",
      icon: "🔥",
      condition: u => u.stats.longestSession >= 120
    },
    {
      id: "three-day",
      name: "三日坊主突破",
      description: "3日連続で勉強する",
      icon: "🔥",
      condition: u => u.stats.longestStudyStreak >= 3
    },
    {
      id: "seven-day",
      name: "一週間の戦士",
      description: "7日連続で勉強する",
      icon: "🗓️",
      condition: u => u.stats.longestStudyStreak >= 7
    },
    {
      id: "thirty-day",
      name: "月間冒険者",
      description: "30日連続で勉強する",
      icon: "👑",
      condition: u => u.stats.longestStudyStreak >= 30
    }
  ];


  /* =======================================================
     DOM
     ======================================================= */

  const $ = id => document.getElementById(id);

  const loginScreen = $("login-screen");
  const registerScreen = $("register-screen");
  const authScreen = $("auth-screen");
  const mainApp = $("main-app");


  /* =======================================================
     DATA
     ======================================================= */

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  function getSession() {
    return localStorage.getItem(SESSION_KEY);
  }

  function setSession(userId) {
    localStorage.setItem(SESSION_KEY, userId);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const id = getSession();

    if (!id) return null;

    const users = loadUsers();

    return users[id] || null;
  }

  function saveCurrentUser(user) {
    const users = loadUsers();
    users[user.userId] = user;
    saveUsers(users);
  }


  /* =======================================================
     DATE
     ======================================================= */

  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  function monthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function weekKey(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    /*
     * 月曜始まり
     */
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    d.setDate(d.getDate() + diff);

    return dateKey(d);
  }

  function formatMinutes(minutes) {
    minutes = Math.max(0, Number(minutes) || 0);

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h === 0) return `${m}分`;
    if (m === 0) return `${h}時間`;

    return `${h}時間${m}分`;
  }

  function formatHours(minutes) {
    return (minutes / 60).toFixed(1) + "時間";
  }


  /* =======================================================
     INITIAL USER
     ======================================================= */

  function createUser({
    userId,
    password,
    displayName,
    course,
    subjects
  }) {
    return {
      userId,
      password,
      displayName,
      course,
      subjects,

      level: 1,
      xp: 0,
      totalXP: 0,

      stars: 0,

      studyLogs: [],

      quests: {
        daily: null,
        weekly: null
      },

      questHistory: [],

      boss: null,

      party: {
        week: weekKey(),
        members: [userId]
      },

      seasons: {
        current: monthKey(),
        number: 1,
        studyMinutes: 0,
        history: []
      },

      achievements: [],

      stats: {
        totalStudyMinutes: 0,
        questsCompleted: 0,
        bossesDefeated: 0,
        fullDailyCompletions: 0,
        weeklyCompletions: 0,
        nightStudyCount: 0,
        earlyStudyCount: 0,
        longestSession: 0,
        longestStudyStreak: 0
      },

      createdAt: new Date().toISOString()
    };
  }


  /* =======================================================
     XP / LEVEL
     ======================================================= */

  function xpRequiredForLevel(level) {
    if (level >= MAX_LEVEL) return 0;

    return level * 50;
  }

  function addXP(user, amount, reason = "") {
    amount = Math.max(0, Math.floor(Number(amount) || 0));

    if (amount === 0) return;

    user.xp += amount;
    user.totalXP += amount;

    showNotification(`+${amount} XP ${reason ? "・" + reason : ""}`);

    processLevelUps(user);
  }

  function processLevelUps(user) {

    while (
      user.level < MAX_LEVEL &&
      user.xp >= xpRequiredForLevel(user.level)
    ) {

      const required = xpRequiredForLevel(user.level);

      user.xp -= required;

      const oldLevel = user.level;

      user.level++;

      saveCurrentUser(user);

      showLevelUpModal(oldLevel, user.level);
    }

    /*
     * Lv.100到達。
     */
    if (user.level >= MAX_LEVEL) {
      performRebirth(user);
    }
  }

  function performRebirth(user) {

    /*
     * レベル100を達成したら星を1個獲得。
     */
    user.stars++;

    user.level = 1;
    user.xp = 0;

    const title = getStarTitle(user.stars);

    unlockAchievementById(user, "level-100");

    saveCurrentUser(user);

    $("star-modal-count").textContent = `⭐ ${user.stars}`;
    $("star-modal-title").textContent = title;

    openModal("star-modal");
  }

  function getStarTitle(stars) {

    if (stars <= 0) {
      return STAR_TITLES[0];
    }

    if (stars <= STAR_TITLES.length) {
      return STAR_TITLES[stars - 1];
    }

    return `超越せし${stars}星の英雄`;
  }


  /* =======================================================
     RANK
     ======================================================= */

  function getRankByMinutes(minutes) {

    const hours = minutes / 60;

    let result = RANKS[0];

    for (const rank of RANKS) {

      if (hours >= rank.minHours) {
        result = rank;
      }
    }

    return result;
  }

  function getSeasonStudyMinutes(user) {

    const currentMonth = monthKey();

    return user.studyLogs
      .filter(log => log.date.startsWith(currentMonth))
      .reduce((sum, log) => sum + log.minutes, 0);
  }

  function getCurrentRank(user) {

    return getRankByMinutes(getSeasonStudyMinutes(user));
  }


  /* =======================================================
     SEASON
     ======================================================= */

  function checkSeason(user) {

    const current = monthKey();

    if (!user.seasons) {
      user.seasons = {
        current,
        number: 1,
        studyMinutes: 0,
        history: []
      };
      return;
    }

    if (user.seasons.current === current) {
      return;
    }

    /*
     * 前シーズン終了。
     */
    const oldMinutes = getSeasonStudyMinutes(user);

    const oldRank = getRankByMinutes(oldMinutes);

    const oldMonth = user.seasons.current;

    user.seasons.history.unshift({
      season: user.seasons.number,
      month: oldMonth,
      studyMinutes: oldMinutes,
      rank: oldRank.name,
      xpReward: oldRank.seasonXP
    });

    /*
     * ランクに応じたXPボーナス。
     * レベルそのものはリセットしない。
     */
    addXPWithoutNotification(user, oldRank.seasonXP);

    user.seasons.number++;
    user.seasons.current = current;
    user.seasons.studyMinutes = 0;

    saveCurrentUser(user);

    $("season-result-rank").textContent = oldRank.name;
    $("season-result-xp").textContent = `${oldRank.seasonXP} XP`;

    openModal("season-result-modal");
  }

  function addXPWithoutNotification(user, amount) {

    user.xp += amount;
    user.totalXP += amount;

    /*
     * モーダル競合を避けるため通常のlevel-up modalは出さない。
     */
    while (
      user.level < MAX_LEVEL &&
      user.xp >= xpRequiredForLevel(user.level)
    ) {

      user.xp -= xpRequiredForLevel(user.level);
      user.level++;
    }

    if (user.level >= MAX_LEVEL) {
      performRebirth(user);
    }
  }


  /* =======================================================
     STUDY
     ======================================================= */

  function recordStudy(user, subject, minutes, note = "") {

    minutes = Math.floor(Number(minutes));

    if (!SUBJECTS[subject]) {
      throw new Error("教科を選択してください。");
    }

    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new Error("勉強時間を正しく入力してください。");
    }

    const now = new Date();

    const log = {
      id: cryptoRandomId(),
      date: dateKey(now),
      timestamp: now.toISOString(),
      subject,
      minutes,
      note
    };

    user.studyLogs.unshift(log);

    user.stats.totalStudyMinutes += minutes;

    if (minutes > user.stats.longestSession) {
      user.stats.longestSession = minutes;
    }

    const hour = now.getHours();

    if (hour >= 21 || hour < 3) {
      user.stats.nightStudyCount++;
    }

    if (hour < 6) {
      user.stats.earlyStudyCount++;
    }

    updateStudyStreak(user);

    /*
     * 1分 = 1XP
     */
    addXP(user, minutes, `${SUBJECTS[subject]} ${minutes}分`);

    /*
     * ボスにダメージ。
     */
    if (user.boss) {
      damageBoss(user, subject, minutes);
    }

    /*
     * クエスト判定。
     */
    updateQuestProgressFromStudy(user, subject, minutes);

    /*
     * 実績判定。
     */
    checkAchievements(user);

    saveCurrentUser(user);

    renderAll();
  }


  function updateStudyStreak(user) {

    const dates = [
      ...new Set(user.studyLogs.map(log => log.date))
    ];

    dates.sort();

    let longest = 0;
    let current = 0;

    let previous = null;

    for (const date of dates) {

      if (!previous) {
        current = 1;
      } else {

        const a = new Date(previous);
        const b = new Date(date);

        const diff =
          Math.round((b - a) / 86400000);

        if (diff === 1) {
          current++;
        } else {
          current = 1;
        }
      }

      longest = Math.max(longest, current);

      previous = date;
    }

    user.stats.longestStudyStreak = longest;
  }


  function getSubjectMinutes(user, subject) {

    return user.studyLogs
      .filter(log => log.subject === subject)
      .reduce((sum, log) => sum + log.minutes, 0);
  }


  function hasStudiedAllSubjects(user) {

    if (!user.subjects.length) return false;

    return user.subjects.every(
      subject => getSubjectMinutes(user, subject) > 0
    );
  }


  /* =======================================================
     QUEST GENERATION
     ======================================================= */

  function getWeakSubjects(user) {

    const sorted = [...user.subjects].sort(
      (a, b) =>
        getSubjectMinutes(user, a) -
        getSubjectMinutes(user, b)
    );

    return sorted;
  }

  function randomSubject(user, prioritizeWeak = true) {

    if (!user.subjects.length) return null;

    if (prioritizeWeak) {

      const sorted = getWeakSubjects(user);

      /*
       * 勉強時間の少ない教科ほど選ばれやすくする。
       */
      const candidates = sorted.slice(
        0,
        Math.max(1, Math.ceil(sorted.length / 2))
      );

      return candidates[
        Math.floor(Math.random() * candidates.length)
      ];
    }

    return user.subjects[
      Math.floor(Math.random() * user.subjects.length)
    ];
  }


  function generateDailyQuests(user) {

    const subjects = [];

    for (let i = 0; i < 3; i++) {

      let subject = randomSubject(user, true);

      /*
       * 可能なら重複回避。
       */
      let attempts = 0;

      while (
        subjects.includes(subject) &&
        attempts < 10 &&
        user.subjects.length > 1
      ) {
        subject = randomSubject(user, true);
        attempts++;
      }

      subjects.push(subject);
    }

    const targets = [30, 45, 60];

    return subjects.map((subject, index) => ({
      id: cryptoRandomId(),
      type: "daily",
      subject,
      targetMinutes: targets[index],
      progress: 0,
      completed: false,
      createdDate: dateKey()
    }));
  }


  function generateWeeklyQuest(user) {

    const subject = randomSubject(user, true);

    return {
      id: cryptoRandomId(),
      type: "weekly",
      subject,
      targetMinutes: 300,
      progress: 0,
      completed: false,
      createdWeek: weekKey()
    };
  }


  function ensureQuests(user) {

    const today = dateKey();
    const week = weekKey();

    if (
      !user.quests.daily ||
      user.quests.daily[0]?.createdDate !== today
    ) {
      user.quests.daily = generateDailyQuests(user);
    }

    if (
      !user.quests.weekly ||
      user.quests.weekly.createdWeek !== week
    ) {
      user.quests.weekly = generateWeeklyQuest(user);
    }
  }


  function updateQuestProgressFromStudy(
    user,
    subject,
    minutes
  ) {

    ensureQuests(user);

    /*
     * Daily
     */
    for (const quest of user.quests.daily) {

      if (
        !quest.completed &&
        quest.subject === subject
      ) {

        quest.progress += minutes;

        if (quest.progress >= quest.targetMinutes) {
          completeQuest(user, quest);
        }
      }
    }

    /*
     * Weekly
     */
    const weekly = user.quests.weekly;

    if (
      weekly &&
      !weekly.completed &&
      weekly.subject === subject
    ) {

      weekly.progress += minutes;

      if (weekly.progress >= weekly.targetMinutes) {
        completeQuest(user, weekly);
      }
    }
  }


  function completeQuest(user, quest) {

    if (quest.completed) return;

    quest.completed = true;

    const xpReward =
      quest.type === "daily"
        ? 50 + quest.targetMinutes
        : 250;

    addXP(user, xpReward, "クエスト達成");

    user.stats.questsCompleted++;

    if (quest.type === "weekly") {
      user.stats.weeklyCompletions++;
    }

    user.questHistory.unshift({
      id: quest.id,
      type: quest.type,
      subject: quest.subject,
      targetMinutes: quest.targetMinutes,
      completedAt: new Date().toISOString(),
      xpReward
    });

    /*
     * Daily 3個全部達成
     */
    if (
      user.quests.daily.every(q => q.completed)
    ) {

      user.stats.fullDailyCompletions++;

      addXP(
        user,
        100,
        "デイリーコンプリートボーナス"
      );
    }

    checkAchievements(user);
    saveCurrentUser(user);
  }


  /* =======================================================
     BOSS
     ======================================================= */

  function generateBoss(user) {

    ensureParty(user);

    const partyCount =
      Math.max(1, user.party.members.length);

    const multiplier =
      PARTY_HP_MULTIPLIER[partyCount] || 1;

    const maxHP =
      Math.round(BOSS_BASE_HP * multiplier);

    const weakness = randomSubject(
      user,
      false
    );

    user.boss = {
      id: cryptoRandomId(),
      name:
        BOSS_NAMES[
          Math.floor(Math.random() * BOSS_NAMES.length)
        ],
      level:
        Math.max(1, Math.floor(user.level / 5)),
      maxHP,
      currentHP: maxHP,
      weakness,
      weaknessMultiplier:
        BOSS_WEAKNESS_MULTIPLIER,
      partyCount,
      log: [
        {
          text:
            "ボスが出現した！",
          timestamp: new Date().toISOString()
        }
      ],
      defeated: false
    };

    saveCurrentUser(user);

    renderBoss();
  }


  function damageBoss(
    user,
    subject,
    minutes
  ) {

    if (
      !user.boss ||
      user.boss.defeated ||
      user.boss.currentHP <= 0
    ) {
      return;
    }

    /*
     * 基本は1分 = 1ダメージ。
     *
     * 弱点教科なら ×1.5。
     */
    let damage = minutes;

    if (subject === user.boss.weakness) {
      damage *= user.boss.weaknessMultiplier;
    }

    damage = Math.round(damage);

    const before = user.boss.currentHP;

    user.boss.currentHP =
      Math.max(0, before - damage);

    const weaknessText =
      subject === user.boss.weakness
        ? "【弱点特攻 ×1.5】"
        : "";

    user.boss.log.unshift({
      text:
        `${SUBJECTS[subject]} ${minutes}分 → ${damage}ダメージ ${weaknessText}`,
      timestamp: new Date().toISOString()
    });

    if (user.boss.currentHP <= 0) {
      defeatBoss(user);
    }

    saveCurrentUser(user);

    renderBoss();
  }


  function defeatBoss(user) {

    if (!user.boss || user.boss.defeated) {
      return;
    }

    user.boss.defeated = true;
    user.stats.bossesDefeated++;

    const xpReward =
      300 +
      user.boss.partyCount * 100;

    addXP(
      user,
      xpReward,
      "ボス撃破"
    );

    user.boss.log.unshift({
      text:
        `🎉 ${user.boss.name}を撃破した！`,
      timestamp: new Date().toISOString()
    });

    $("boss-result-title").textContent =
      "BOSS DEFEATED!";

    $("boss-result-message").textContent =
      `${user.boss.name}を撃破しました！`;

    $("boss-result-xp").textContent =
      `${xpReward} XP`;

    openModal("boss-result-modal");

    checkAchievements(user);
  }


  /* =======================================================
     PARTY
     ======================================================= */

  function ensureParty(user) {

    if (
      !user.party ||
      !user.party.week
    ) {

      user.party = {
        week: weekKey(),
        members: [user.userId]
      };

      saveCurrentUser(user);
      return;
    }

    /*
     * 週が変わったら完全リセット。
     */
    if (user.party.week !== weekKey()) {

      user.party = {
        week: weekKey(),
        members: [user.userId]
      };

      saveCurrentUser(user);
    }

    if (!user.party.members.includes(user.userId)) {
      user.party.members.unshift(user.userId);
    }
  }


  function addPartyMember(user, targetId) {

    ensureParty(user);

    targetId = targetId.trim();

    if (!targetId) {
      throw new Error("ユーザーIDを入力してください。");
    }

    if (user.party.members.includes(targetId)) {
      throw new Error("そのユーザーはすでにパーティーにいます。");
    }

    if (user.party.members.length >= 4) {
      throw new Error("パーティーは最大4人です。");
    }

    const users = loadUsers();

    if (!users[targetId]) {
      throw new Error(
        "そのユーザーIDの冒険者は見つかりません。"
      );
    }

    user.party.members.push(targetId);

    /*
     * localStorage版では本人側のパーティー情報だけ更新。
     *
     * サーバー版にする場合はここをDB処理へ置き換える。
     */
    saveCurrentUser(user);

    showNotification(
      `${users[targetId].displayName}をパーティーに追加しました！`
    );

    renderParty();
  }


  /* =======================================================
     ACHIEVEMENTS
     ======================================================= */

  function checkAchievements(user) {

    for (const achievement of ACHIEVEMENTS) {

      if (user.achievements.includes(achievement.id)) {
        continue;
      }

      try {

        if (achievement.condition(user)) {

          unlockAchievement(
            user,
            achievement
          );
        }

      } catch (error) {
        console.warn(
          "Achievement error:",
          achievement.id,
          error
        );
      }
    }
  }


  function unlockAchievement(
    user,
    achievement
  ) {

    if (
      user.achievements.includes(
        achievement.id
      )
    ) {
      return;
    }

    user.achievements.push(
      achievement.id
    );

    /*
     * 実績報酬
     */
    addXPWithoutNotification(
      user,
      100
    );

    showNotification(
      `🏆 実績解除：「${achievement.name}」`
    );

    saveCurrentUser(user);
  }


  function unlockAchievementById(
    user,
    id
  ) {

    const achievement =
      ACHIEVEMENTS.find(
        a => a.id === id
      );

    if (achievement) {
      unlockAchievement(
        user,
        achievement
      );
    }
  }


  /* =======================================================
     RENDER - GLOBAL
     ======================================================= */

  function renderAll() {

    const user = getCurrentUser();

    if (!user) return;

    checkSeason(user);
    ensureQuests(user);
    ensureParty(user);
    checkAchievements(user);

    renderHeader(user);
    renderHome(user);
    renderStudy(user);
    renderQuests(user);
    renderBoss(user);
    renderParty(user);
    renderRank(user);
    renderAchievements(user);
    renderProfile(user);
    renderSubjectSelectors(user);

    saveCurrentUser(user);
  }


  /* =======================================================
     RENDER - HEADER
     ======================================================= */

  function renderHeader(user) {

    $("header-display-name").textContent =
      user.displayName;

    $("header-level").textContent =
      `Lv.${user.level}`;

    $("header-rank").textContent =
      getCurrentRank(user).name;
  }


  /* =======================================================
     RENDER - HOME
     ======================================================= */

  function renderHome(user) {

    $("home-level").textContent =
      user.level;

    $("home-xp").textContent =
      `${user.xp} XP`;

    if (user.level >= MAX_LEVEL) {

      $("home-xp-required").textContent =
        "MAX LEVEL";

    } else {

      $("home-xp-required").textContent =
        `次のLvまで ${xpRequiredForLevel(user.level)} XP`;
    }

    const required =
      xpRequiredForLevel(user.level);

    const progress =
      required === 0
        ? 100
        : Math.min(
            100,
            (user.xp / required) * 100
          );

    $("level-progress").style.width =
      `${progress}%`;

    $("star-count").textContent =
      `⭐ ${user.stars}`;

    $("star-title").textContent =
      getStarTitle(user.stars);

    const today =
      dateKey();

    const todayMinutes =
      user.studyLogs
        .filter(
          log => log.date === today
        )
        .reduce(
          (sum, log) =>
            sum + log.minutes,
          0
        );

    const todayXP =
      user.studyLogs
        .filter(
          log => log.date === today
        )
        .reduce(
          (sum, log) =>
            sum + log.minutes,
          0
        );

    $("today-study-time").textContent =
      formatMinutes(todayMinutes);

    $("today-xp").textContent =
      `${todayXP} XP`;

    const dailyCompleted =
      user.quests.daily
        ? user.quests.daily.filter(
            q => q.completed
          ).length
        : 0;

    $("today-quest-progress").textContent =
      `${dailyCompleted} / 3`;

    $("home-season-number").textContent =
      `Season ${user.seasons.number}`;

    $("home-season-rank").textContent =
      getCurrentRank(user).name;

    $("home-season-study-time").textContent =
      formatHours(
        getSeasonStudyMinutes(user)
      );

    renderHomeQuests(user);
  }


  function renderHomeQuests(user) {

    const container =
      $("home-daily-quests");

    container.innerHTML = "";

    if (!user.quests.daily) return;

    for (const quest of user.quests.daily) {

      const div =
        document.createElement("div");

      div.className =
        "card quest-item";

      div.innerHTML = `
        <strong>
          ${quest.completed ? "✅" : "📜"}
          ${SUBJECTS[quest.subject]}
        </strong>

        <div>
          ${quest.progress} / ${quest.targetMinutes}分
        </div>

        <div>
          ${quest.completed ? "達成済み" : "進行中"}
        </div>
      `;

      container.appendChild(div);
    }
  }


  /* =======================================================
     RENDER - STUDY
     ======================================================= */

  function renderStudy(user) {

    const list =
      $("subject-study-list");

    list.innerHTML = "";

    const sortedSubjects =
      [...user.subjects].sort(
        (a, b) =>
          getSubjectMinutes(user, a) -
          getSubjectMinutes(user, b)
      );

    for (const subject of sortedSubjects) {

      const minutes =
        getSubjectMinutes(
          user,
          subject
        );

      const div =
        document.createElement("div");

      div.className =
        "card subject-study-item";

      div.innerHTML = `
        <strong>
          ${SUBJECTS[subject]}
        </strong>

        <span>
          ${formatMinutes(minutes)}
        </span>
      `;

      list.appendChild(div);
    }


    /*
     * 履歴
     */
    const history =
      $("study-history-list");

    history.innerHTML = "";

    if (!user.studyLogs.length) {

      history.innerHTML =
        "<p>まだ勉強記録がありません。</p>";

      return;
    }

    for (
      const log of user.studyLogs.slice(0, 50)
    ) {

      const div =
        document.createElement("div");

      div.className =
        "card study-history-item";

      const date =
        new Date(log.timestamp);

      div.innerHTML = `
        <strong>
          ${SUBJECTS[log.subject]}
        </strong>

        <div>
          ${formatMinutes(log.minutes)}
        </div>

        <small>
          ${date.toLocaleString("ja-JP")}
        </small>

        ${
          log.note
            ? `<p>${escapeHTML(log.note)}</p>`
            : ""
        }
      `;

      history.appendChild(div);
    }
  }


  /* =======================================================
     RENDER - QUEST
     ======================================================= */

  function renderQuests(user) {

    const daily =
      $("daily-quest-list");

    daily.innerHTML = "";

    for (const quest of user.quests.daily) {

      const div =
        document.createElement("div");

      div.className =
        "card quest-card";

      div.innerHTML = `
        <h4>
          ${quest.completed ? "✅" : "📜"}
          ${SUBJECTS[quest.subject]}クエスト
        </h4>

        <p>
          ${SUBJECTS[quest.subject]}を
          ${quest.targetMinutes}分勉強する
        </p>

        <p>
          進捗：
          ${Math.min(
            quest.progress,
            quest.targetMinutes
          )}
          /
          ${quest.targetMinutes}分
        </p>

        <strong>
          ${quest.completed ? "達成済み" : "挑戦中"}
        </strong>
      `;

      daily.appendChild(div);
    }


    /*
     * Weekly
     */
    const weekly =
      $("weekly-quest-list");

    weekly.innerHTML = "";

    const q =
      user.quests.weekly;

    if (q) {

      const div =
        document.createElement("div");

      div.className =
        "card quest-card";

      div.innerHTML = `
        <h4>
          ${q.completed ? "✅" : "📅"}
          Weekly Quest
        </h4>

        <p>
          ${SUBJECTS[q.subject]}を
          ${q.targetMinutes}分勉強する
        </p>

        <p>
          進捗：
          ${Math.min(
            q.progress,
            q.targetMinutes
          )}
          /
          ${q.targetMinutes}分
        </p>

        <strong>
          ${q.completed ? "達成済み" : "挑戦中"}
        </strong>
      `;

      weekly.appendChild(div);
    }


    /*
     * History
     */
    const history =
      $("quest-history-list");

    history.innerHTML = "";

    if (!user.questHistory.length) {

      history.innerHTML =
        "<p>まだクエスト達成履歴がありません。</p>";

      return;
    }

    for (
      const item of user.questHistory.slice(0, 30)
    ) {

      const div =
        document.createElement("div");

      div.className =
        "card";

      div.innerHTML = `
        <strong>
          ${item.type === "daily"
            ? "Daily"
            : "Weekly"}
        </strong>

        <p>
          ${SUBJECTS[item.subject]}
          ・
          ${item.targetMinutes}分
        </p>

        <small>
          ${new Date(
            item.completedAt
          ).toLocaleString("ja-JP")}
        </small>

        <p>
          +${item.xpReward} XP
        </p>
      `;

      history.appendChild(div);
    }
  }


  /* =======================================================
     RENDER - BOSS
     ======================================================= */

  function renderBoss(user) {

    if (!user.boss) {

      $("boss-name").textContent =
        "ボス未出現";

      $("boss-level").textContent =
        "Lv.?";

      $("boss-current-hp").textContent =
        "0";

      $("boss-max-hp").textContent =
        "0";

      $("boss-hp-progress").style.width =
        "0%";

      $("boss-weakness-subject").textContent =
        "---";

      $("boss-party-count").textContent =
        `${user.party.members.length} / 4`;

      $("boss-party-member-list").innerHTML =
        "<p>ボス情報を更新してください。</p>";

      $("boss-log-list").innerHTML = "";

      return;
    }

    const boss =
      user.boss;

    $("boss-name").textContent =
      boss.name;

    $("boss-level").textContent =
      `Lv.${boss.level}`;

    $("boss-current-hp").textContent =
      boss.currentHP;

    $("boss-max-hp").textContent =
      boss.maxHP;

    const percentage =
      boss.maxHP === 0
        ? 0
        : (boss.currentHP / boss.maxHP) * 100;

    $("boss-hp-progress").style.width =
      `${percentage}%`;

    $("boss-weakness-subject").textContent =
      SUBJECTS[boss.weakness];

    $("boss-weakness-multiplier").textContent =
      `×${boss.weaknessMultiplier}`;

    $("boss-party-count").textContent =
      `${user.party.members.length} / 4`;

    renderBossParty(user);

    const log =
      $("boss-log-list");

    log.innerHTML = "";

    for (
      const item of boss.log.slice(0, 30)
    ) {

      const div =
        document.createElement("div");

      div.className =
        "card";

      div.textContent =
        item.text;

      log.appendChild(div);
    }
  }


  function renderBossParty(user) {

    const list =
      $("boss-party-member-list");

    list.innerHTML = "";

    const users =
      loadUsers();

    for (
      const id of user.party.members
    ) {

      const member =
        users[id];

      const div =
        document.createElement("div");

      div.className =
        "card";

      div.textContent =
        member
          ? `${member.displayName} ・ Lv.${member.level}`
          : id;

      list.appendChild(div);
    }
  }


  /* =======================================================
     RENDER - PARTY
     ======================================================= */

  function renderParty(user) {

    ensureParty(user);

    const start =
      new Date(user.party.week);

    const end =
      new Date(start);

    end.setDate(end.getDate() + 6);

    $("party-week-range").textContent =
      `${start.toLocaleDateString("ja-JP")} ～ ${end.toLocaleDateString("ja-JP")}`;

    $("party-member-count").textContent =
      `${user.party.members.length} / 4`;

    const list =
      $("party-member-list");

    list.innerHTML = "";

    const users =
      loadUsers();

    for (
      const id of user.party.members
    ) {

      const member =
        users[id];

      const div =
        document.createElement("div");

      div.className =
        "card";

      div.innerHTML = `
        <strong>
          ${member
            ? escapeHTML(member.displayName)
            : escapeHTML(id)}
        </strong>

        <p>
          ${member
            ? `Lv.${member.level}`
            : ""}
        </p>
      `;

      list.appendChild(div);
    }

    /*
     * 4人なら追加フォームを無効化。
     */
    const input =
      $("party-user-id");

    const button =
      $("party-invite-button");

    const full =
      user.party.members.length >= 4;

    input.disabled = full;
    button.disabled = full;

    if (full) {
      button.textContent =
        "パーティー満員";
    } else {
      button.textContent =
        "パーティーに追加";
    }
  }


  /* =======================================================
     RENDER - RANK
     ======================================================= */

  function renderRank(user) {

    const rank =
      getCurrentRank(user);

    const minutes =
      getSeasonStudyMinutes(user);

    $("rank-season-label").textContent =
      `Season ${user.seasons.number}`;

    $("current-rank-name").textContent =
      rank.name;

    $("current-season-time").textContent =
      formatHours(minutes);

    $("home-season-rank").textContent =
      rank.name;

    const tbody =
      $("rank-table-body");

    tbody.innerHTML = "";

    for (const r of RANKS) {

      const tr =
        document.createElement("tr");

      tr.innerHTML = `
        <td>${r.name}</td>
        <td>${r.minHours}時間～</td>
      `;

      tbody.appendChild(tr);
    }


    const history =
      $("season-history-list");

    history.innerHTML = "";

    if (!user.seasons.history.length) {

      history.innerHTML =
        "<p>まだシーズン履歴がありません。</p>";

      return;
    }

    for (
      const season of user.seasons.history
    ) {

      const div =
        document.createElement("div");

      div.className =
        "card";

      div.innerHTML = `
        <strong>
          Season ${season.season}
        </strong>

        <p>
          ${season.month}
        </p>

        <p>
          ${season.rank}
          ・
          ${formatHours(season.studyMinutes)}
        </p>

        <p>
          シーズン報酬：
          +${season.xpReward} XP
        </p>
      `;

      history.appendChild(div);
    }
  }


  /* =======================================================
     RENDER - ACHIEVEMENTS
     ======================================================= */

  function renderAchievements(user) {

    $("achievement-unlocked-count").textContent =
      user.achievements.length;

    $("achievement-total-count").textContent =
      ACHIEVEMENTS.length;

    const container =
      $("achievement-list");

    container.innerHTML = "";

    for (
      const achievement of ACHIEVEMENTS
    ) {

      const unlocked =
        user.achievements.includes(
          achievement.id
        );

      const div =
        document.createElement("div");

      div.className =
        "card achievement-item";

      if (!unlocked) {
        div.style.opacity = "0.45";
      }

      div.innerHTML = `
        <div style="font-size:2rem;">
          ${unlocked ? achievement.icon : "🔒"}
        </div>

        <strong>
          ${escapeHTML(achievement.name)}
        </strong>

        <p>
          ${escapeHTML(
            achievement.description
          )}
        </p>

        <small>
          ${unlocked ? "解除済み" : "未解除"}
        </small>
      `;

      container.appendChild(div);
    }
  }


  /* =======================================================
     RENDER - PROFILE
     ======================================================= */

  function renderProfile(user) {

    $("profile-display-name").textContent =
      user.displayName;

    $("profile-user-id").textContent =
      user.userId;

    $("profile-course").textContent =
      COURSE_NAMES[user.course] ||
      "未定・その他";

    $("profile-level").textContent =
      user.level;

    $("profile-stars").textContent =
      user.stars;

    $("profile-title").textContent =
      getStarTitle(user.stars);

    $("profile-total-study-time").textContent =
      formatHours(
        user.stats.totalStudyMinutes
      );

    $("profile-total-xp").textContent =
      `${user.totalXP} XP`;

    $("profile-bosses-defeated").textContent =
      user.stats.bossesDefeated;

    $("profile-quests-completed").textContent =
      user.stats.questsCompleted;

    /*
     * Subjects
     */
    const list =
      $("profile-subject-list");

    list.innerHTML = "";

    for (const subject of user.subjects) {

      const span =
        document.createElement("span");

      span.className =
        "card";

      span.style.display =
        "inline-block";

      span.textContent =
        SUBJECTS[subject];

      list.appendChild(span);
    }

    $("new-display-name").value =
      user.displayName;

    $("new-course").value =
      user.course;
  }


  /* =======================================================
     SUBJECT SELECTORS
     ======================================================= */

  function renderSubjectSelectors(user) {

    /*
     * Study select
     */
    const studySelect =
      $("study-subject");

    const oldValue =
      studySelect.value;

    studySelect.innerHTML = `
      <option value="">
        教科を選択
      </option>
    `;

    for (const subject of user.subjects) {

      const option =
        document.createElement("option");

      option.value =
        subject;

      option.textContent =
        SUBJECTS[subject];

      studySelect.appendChild(option);
    }

    if (user.subjects.includes(oldValue)) {
      studySelect.value = oldValue;
    }


    /*
     * Settings checkboxes
     */
    const container =
      $("settings-subject-selection");

    container.innerHTML = "";

    for (const subject of Object.keys(SUBJECTS)) {

      const label =
        document.createElement("label");

      label.style.display =
        "block";

      label.innerHTML = `
        <input
          type="checkbox"
          name="settings-subjects"
          value="${subject}"
          ${user.subjects.includes(subject)
            ? "checked"
            : ""}
        >
        ${SUBJECTS[subject]}
      `;

      container.appendChild(label);
    }
  }


  /* =======================================================
     AUTH
     ======================================================= */

  function showLogin() {

    loginScreen.classList.remove("hidden");
    registerScreen.classList.add("hidden");
  }

  function showRegister() {

    loginScreen.classList.add("hidden");
    registerScreen.classList.remove("hidden");
  }


  function handleRegister(event) {

    event.preventDefault();

    const userId =
      $("register-user-id").value.trim();

    const password =
      $("register-password").value;

    const confirm =
      $("register-password-confirm").value;

    const displayName =
      $("register-display-name").value.trim();

    const course =
      document.querySelector(
        'input[name="course"]:checked'
      )?.value;

    const subjects =
      [
        ...document.querySelectorAll(
          'input[name="subjects"]:checked'
        )
      ].map(
        input => input.value
      );

    $("register-error").textContent = "";
    $("subject-error").textContent = "";

    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(userId)) {

      $("register-error").textContent =
        "ユーザーIDは英数字・_・-のみ、3～30文字で設定してください。";

      return;
    }

    if (password.length < 6) {

      $("register-error").textContent =
        "パスワードは6文字以上にしてください。";

      return;
    }

    if (password !== confirm) {

      $("register-error").textContent =
        "パスワードが一致していません。";

      return;
    }

    if (!displayName) {

      $("register-error").textContent =
        "表示名を入力してください。";

      return;
    }

    if (!course) {

      $("register-error").textContent =
        "文理を選択してください。";

      return;
    }

    if (subjects.length === 0) {

      $("subject-error").textContent =
        "受験教科を1つ以上選択してください。";

      return;
    }

    const users =
      loadUsers();

    if (users[userId]) {

      $("register-error").textContent =
        "そのユーザーIDはすでに使用されています。";

      return;
    }

    const user =
      createUser({
        userId,
        password,
        displayName,
        course,
        subjects
      });

    users[userId] = user;

    saveUsers(users);
    setSession(userId);

    authScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");

    renderAll();

    showNotification(
      "冒険者登録完了！"
    );
  }


  function handleLogin(event) {

    event.preventDefault();

    const userId =
      $("login-user-id").value.trim();

    const password =
      $("login-password").value;

    const users =
      loadUsers();

    const user =
      users[userId];

    if (
      !user ||
      user.password !== password
    ) {

      $("login-error").textContent =
        "ユーザーIDまたはパスワードが違います。";

      return;
    }

    $("login-error").textContent = "";

    setSession(userId);

    authScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");

    renderAll();

    showNotification(
      `おかえりなさい、${user.displayName}！`
    );
  }


  function handleLogout() {

    clearSession();

    mainApp.classList.add("hidden");
    authScreen.classList.remove("hidden");

    showLogin();

    $("login-form").reset();

    showNotification(
      "ログアウトしました。"
    );
  }


  /* =======================================================
     PROFILE SETTINGS
     ======================================================= */

  function changeDisplayName(event) {

    event.preventDefault();

    const user =
      getCurrentUser();

    if (!user) return;

    const newName =
      $("new-display-name").value.trim();

    if (!newName) return;

    user.displayName =
      newName;

    saveCurrentUser(user);

    renderAll();

    showNotification(
      "表示名を変更しました。"
    );
  }


  function changePassword(event) {

    event.preventDefault();

    const user =
      getCurrentUser();

    if (!user) return;

    const current =
      $("current-password").value;

    const next =
      $("new-password").value;

    if (current !== user.password) {

      showNotification(
        "現在のパスワードが違います。"
      );

      return;
    }

    if (next.length < 6) {

      showNotification(
        "新しいパスワードは6文字以上にしてください。"
      );

      return;
    }

    user.password =
      next;

    saveCurrentUser(user);

    $("change-password-form").reset();

    showNotification(
      "パスワードを変更しました。"
    );
  }


  function changeCourse(event) {

    event.preventDefault();

    const user =
      getCurrentUser();

    if (!user) return;

    user.course =
      $("new-course").value;

    saveCurrentUser(user);

    renderAll();

    showNotification(
      "文理を変更しました。"
    );
  }


  function changeSubjects(event) {

    event.preventDefault();

    const user =
      getCurrentUser();

    if (!user) return;

    const subjects =
      [
        ...document.querySelectorAll(
          'input[name="settings-subjects"]:checked'
        )
      ].map(
        input => input.value
      );

    if (!subjects.length) {

      showNotification(
        "受験教科を1つ以上選択してください。"
      );

      return;
    }

    user.subjects =
      subjects;

    /*
     * 次回クエスト生成時から新教科を反映。
     */
    saveCurrentUser(user);

    renderAll();

    showNotification(
      "受験教科を更新しました。"
    );
  }


  function deleteAccount() {

    const user =
      getCurrentUser();

    if (!user) return;

    const confirmation =
      window.confirm(
        "本当にアカウントを削除しますか？\nこの操作は取り消せません。"
      );

    if (!confirmation) return;

    const users =
      loadUsers();

    delete users[user.userId];

    saveUsers(users);

    clearSession();

    mainApp.classList.add("hidden");
    authScreen.classList.remove("hidden");

    showLogin();

    showNotification(
      "アカウントを削除しました。"
    );
  }


  /* =======================================================
     NAVIGATION
     ======================================================= */

  function setupNavigation() {

    document
      .querySelectorAll(
        ".nav-button"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const target =
              button.dataset.screen;

            document
              .querySelectorAll(
                ".app-screen"
              )
              .forEach(screen => {
                screen.classList.add("hidden");
              });

            $(target)
              ?.classList.remove("hidden");

            document
              .querySelectorAll(
                ".nav-button"
              )
              .forEach(btn => {
                btn.classList.remove("active");
              });

            button.classList.add("active");
          }
        );
      });
  }


  /* =======================================================
     MODALS
     ======================================================= */

  function openModal(id) {

    $(id)?.classList.remove("hidden");
  }

  function closeModal(id) {

    $(id)?.classList.add("hidden");
  }


  function showLevelUpModal(
    oldLevel,
    newLevel
  ) {

    $("level-up-old-level").textContent =
      `Lv.${oldLevel}`;

    $("level-up-new-level").textContent =
      `Lv.${newLevel}`;

    $("level-up-message").textContent =
      `Lv.${newLevel}に到達！`;

    openModal("level-up-modal");
  }


  /* =======================================================
     NOTIFICATION
     ======================================================= */

  let notificationTimer = null;

  function showNotification(message) {

    const notification =
      $("notification");

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


  /* =======================================================
     UTILITIES
     ======================================================= */

  function cryptoRandomId() {

    if (
      window.crypto &&
      crypto.randomUUID
    ) {
      return crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      Math.random()
        .toString(36)
        .substring(2)
    );
  }


  function escapeHTML(value) {

    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /* =======================================================
     EVENT LISTENERS
     ======================================================= */

  function setupEvents() {

    /*
     * Auth
     */
    $("show-register-button")
      .addEventListener(
        "click",
        showRegister
      );

    $("show-login-button")
      .addEventListener(
        "click",
        showLogin
      );

    $("register-form")
      .addEventListener(
        "submit",
        handleRegister
      );

    $("login-form")
      .addEventListener(
        "submit",
        handleLogin
      );

    $("logout-button")
      .addEventListener(
        "click",
        handleLogout
      );


    /*
     * Study
     */
    $("study-form")
      .addEventListener(
        "submit",
        event => {

          event.preventDefault();

          const user =
            getCurrentUser();

          if (!user) return;

          const subject =
            $("study-subject").value;

          const minutes =
            Number(
              $("study-minutes").value
            );

          const note =
            $("study-note").value.trim();

          try {

            recordStudy(
              user,
              subject,
              minutes,
              note
            );

            $("study-form").reset();

          } catch (error) {

            showNotification(
              error.message
            );
          }
        }
      );


    /*
     * Party
     */
    $("party-invite-form")
      .addEventListener(
        "submit",
        event => {

          event.preventDefault();

          const user =
            getCurrentUser();

          if (!user) return;

          try {

            addPartyMember(
              user,
              $("party-user-id").value
            );

            $("party-invite-form").reset();

          } catch (error) {

            $("party-error").textContent =
              error.message;

            showNotification(
              error.message
            );
          }
        }
      );


    /*
     * Boss
     */
    $("boss-refresh-button")
      .addEventListener(
        "click",
        () => {

          const user =
            getCurrentUser();

          if (!user) return;

          generateBoss(user);

          showNotification(
            "新たなボスが出現した！"
          );
        }
      );


    /*
     * Profile
     */
    $("change-name-form")
      .addEventListener(
        "submit",
        changeDisplayName
      );

    $("change-password-form")
      .addEventListener(
        "submit",
        changePassword
      );

    $("change-course-form")
      .addEventListener(
        "submit",
        changeCourse
      );

    $("change-subject-form")
      .addEventListener(
        "submit",
        changeSubjects
      );

    $("delete-account-button")
      .addEventListener(
        "click",
        deleteAccount
      );


    /*
     * Modals
     */
    $("level-up-close")
      .addEventListener(
        "click",
        () => {
          closeModal("level-up-modal");
        }
      );

    $("star-modal-close")
      .addEventListener(
        "click",
        () => {
          closeModal("star-modal");
          renderAll();
        }
      );

    $("boss-result-close")
      .addEventListener(
        "click",
        () => {
          closeModal("boss-result-modal");
        }
      );

    $("season-result-close")
      .addEventListener(
        "click",
        () => {
          closeModal("season-result-modal");
          renderAll();
        }
      );
  }


  /* =======================================================
     MIGRATION / DATA SAFETY
     ======================================================= */

  function migrateUser(user) {

    /*
     * 古いデータがあっても可能な限り動かす。
     */

    user.level ??= 1;
    user.xp ??= 0;
    user.totalXP ??= 0;
    user.stars ??= 0;

    user.studyLogs ??= [];

    user.quests ??= {
      daily: null,
      weekly: null
    };

    user.questHistory ??= [];

    user.stats ??= {};

    const defaultStats = {
      totalStudyMinutes: 0,
      questsCompleted: 0,
      bossesDefeated: 0,
      fullDailyCompletions: 0,
      weeklyCompletions: 0,
      nightStudyCount: 0,
      earlyStudyCount: 0,
      longestSession: 0,
      longestStudyStreak: 0
    };

    for (const key of Object.keys(defaultStats)) {
      user.stats[key] ??=
        defaultStats[key];
    }

    user.party ??= {
      week: weekKey(),
      members: [user.userId]
    };

    user.seasons ??= {
      current: monthKey(),
      number: 1,
      studyMinutes: 0,
      history: []
    };

    user.seasons.history ??= [];

    user.achievements ??= [];

    return user;
  }


  function migrateAllUsers() {

    const users =
      loadUsers();

    let changed = false;

    for (const id of Object.keys(users)) {

      users[id] =
        migrateUser(users[id]);

      changed = true;
    }

    if (changed) {
      saveUsers(users);
    }
  }


  /* =======================================================
     STARTUP
     ======================================================= */

  function initialize() {

    migrateAllUsers();

    setupEvents();
    setupNavigation();

    const user =
      getCurrentUser();

    if (user) {

      migrateUser(user);

      authScreen.classList.add("hidden");
      mainApp.classList.remove("hidden");

      renderAll();

    } else {

      authScreen.classList.remove("hidden");
      mainApp.classList.add("hidden");

      showLogin();
    }
  }


  /* =======================================================
     BOOT
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

})();
