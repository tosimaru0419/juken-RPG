/* =========================================================
   受験RPG - Supabase Edition
   =========================================================
   必須:
   - window.supabaseClient
     または
   - window.supabase.createClient(...) で作成済みのclient

   Supabase側に必要なテーブル:
   profiles
   study_logs
   quests
   quest_history
   achievements
   seasons
   season_history
   parties
   party_members
   bosses
   boss_logs

   ※ passwordは絶対にDBへ保存しない。
      Supabase Authに任せる。
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     SUPABASE
     ======================================================= */

  const supabase =
    window.supabaseClient ||
    window.supabase?.client ||
    null;

  if (!supabase) {
    console.error(
      "Supabase client が見つかりません。"
    );
  }


  /* =======================================================
     CONSTANTS
     ======================================================= */

  const MAX_LEVEL = 100;

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
    world-history: "世界史",
    civics: "公民"
  };

  const COURSE_NAMES = {
    science: "理系",
    humanities: "文系",
    undecided: "未定・その他"
  };

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

  const BOSS_BASE_HP = 300;

  const PARTY_HP_MULTIPLIER = {
    1: 1,
    2: 1.8,
    3: 2.5,
    4: 3.2
  };

  const BOSS_WEAKNESS_MULTIPLIER = 1.5;

  const DAILY_TARGETS = [30, 45, 60];

  const MAX_PARTY_SIZE = 4;


  /* =======================================================
     ACHIEVEMENTS
     ======================================================= */

  const ACHIEVEMENTS = [
    {
      id: "first-study",
      name: "最初の一歩",
      description: "初めて勉強を記録する",
      icon: "📖",
      condition: u =>
        u.stats.totalStudyMinutes >= 1
    },
    {
      id: "study-60",
      name: "1時間突破",
      description: "累計1時間勉強する",
      icon: "⏱️",
      condition: u =>
        u.stats.totalStudyMinutes >= 60
    },
    {
      id: "study-300",
      name: "5時間の旅",
      description: "累計5時間勉強する",
      icon: "🔥",
      condition: u =>
        u.stats.totalStudyMinutes >= 300
    },
    {
      id: "study-600",
      name: "10時間突破",
      description: "累計10時間勉強する",
      icon: "⚔️",
      condition: u =>
        u.stats.totalStudyMinutes >= 600
    },
    {
      id: "study-1000",
      name: "1000分の努力",
      description: "累計1000分勉強する",
      icon: "💎",
      condition: u =>
        u.stats.totalStudyMinutes >= 1000
    },
    {
      id: "study-3000",
      name: "30時間の猛者",
      description: "累計30時間勉強する",
      icon: "🏹",
      condition: u =>
        u.stats.totalStudyMinutes >= 3000
    },
    {
      id: "study-6000",
      name: "100時間の勇者",
      description: "累計100時間勉強する",
      icon: "👑",
      condition: u =>
        u.stats.totalStudyMinutes >= 6000
    },
    {
      id: "study-10000",
      name: "一万分の軌跡",
      description: "累計10000分勉強する",
      icon: "🌟",
      condition: u =>
        u.stats.totalStudyMinutes >= 10000
    },
    {
      id: "level-5",
      name: "駆け出し冒険者",
      description: "Lv.5に到達する",
      icon: "🗡️",
      condition: u =>
        u.level >= 5
    },
    {
      id: "level-10",
      name: "Lv.10到達",
      description: "Lv.10に到達する",
      icon: "⚔️",
      condition: u =>
        u.level >= 10
    },
    {
      id: "level-25",
      name: "四分の一突破",
      description: "Lv.25に到達する",
      icon: "🛡️",
      condition: u =>
        u.level >= 25
    },
    {
      id: "level-50",
      name: "折り返し地点",
      description: "Lv.50に到達する",
      icon: "🏰",
      condition: u =>
        u.level >= 50
    },
    {
      id: "level-75",
      name: "終盤の勇者",
      description: "Lv.75に到達する",
      icon: "🐉",
      condition: u =>
        u.level >= 75
    },
    {
      id: "level-100",
      name: "伝説への到達",
      description: "Lv.100に到達する",
      icon: "🌌",
      condition: u =>
        u.stars >= 1
    },
    {
      id: "star-1",
      name: "星を掴む者",
      description: "初めて転生する",
      icon: "⭐",
      condition: u =>
        u.stars >= 1
    },
    {
      id: "star-3",
      name: "三つ星冒険者",
      description: "星を3個獲得する",
      icon: "⭐⭐⭐",
      condition: u =>
        u.stars >= 3
    },
    {
      id: "star-5",
      name: "星々の旅人",
      description: "星を5個獲得する",
      icon: "🌠",
      condition: u =>
        u.stars >= 5
    },
    {
      id: "star-10",
      name: "十星の英雄",
      description: "星を10個獲得する",
      icon: "✨",
      condition: u =>
        u.stars >= 10
    },
    {
      id: "quest-1",
      name: "初クエスト",
      description: "クエストを1個達成する",
      icon: "📜",
      condition: u =>
        u.stats.questsCompleted >= 1
    },
    {
      id: "quest-10",
      name: "クエストハンター",
      description: "クエストを10個達成する",
      icon: "🎯",
      condition: u =>
        u.stats.questsCompleted >= 10
    },
    {
      id: "quest-50",
      name: "クエストマスター",
      description: "クエストを50個達成する",
      icon: "🏆",
      condition: u =>
        u.stats.questsCompleted >= 50
    },
    {
      id: "boss-1",
      name: "初討伐",
      description: "ボスを1体撃破する",
      icon: "🐲",
      condition: u =>
        u.stats.bossesDefeated >= 1
    },
    {
      id: "boss-5",
      name: "討伐隊",
      description: "ボスを5体撃破する",
      icon: "⚔️",
      condition: u =>
        u.stats.bossesDefeated >= 5
    },
    {
      id: "boss-10",
      name: "竜殺し",
      description: "ボスを10体撃破する",
      icon: "🐉",
      condition: u =>
        u.stats.bossesDefeated >= 10
    },
    {
      id: "daily-complete",
      name: "日課の達人",
      description: "デイリークエストを1日3個すべて達成する",
      icon: "☀️",
      condition: u =>
        u.stats.fullDailyCompletions >= 1
    },
    {
      id: "weekly-complete",
      name: "週間制覇",
      description: "ウィークリークエストを達成する",
      icon: "📅",
      condition: u =>
        u.stats.weeklyCompletions >= 1
    },
    {
      id: "subject-all",
      name: "全教科制覇",
      description: "選択した全教科を1回以上勉強する",
      icon: "📚",
      condition: u =>
        hasStudiedAllSubjects(u)
    },
    {
      id: "night-study",
      name: "夜の冒険者",
      description: "21時以降に勉強を記録する",
      icon: "🌙",
      condition: u =>
        u.stats.nightStudyCount >= 1
    },
    {
      id: "early-study",
      name: "朝の冒険者",
      description: "6時以前に勉強を記録する",
      icon: "🌅",
      condition: u =>
        u.stats.earlyStudyCount >= 1
    },
    {
      id: "long-session",
      name: "長時間戦闘",
      description: "1回で120分以上勉強する",
      icon: "🔥",
      condition: u =>
        u.stats.longestSession >= 120
    },
    {
      id: "three-day",
      name: "三日坊主突破",
      description: "3日連続で勉強する",
      icon: "🔥",
      condition: u =>
        u.stats.longestStudyStreak >= 3
    },
    {
      id: "seven-day",
      name: "一週間の戦士",
      description: "7日連続で勉強する",
      icon: "🗓️",
      condition: u =>
        u.stats.longestStudyStreak >= 7
    },
    {
      id: "thirty-day",
      name: "月間冒険者",
      description: "30日連続で勉強する",
      icon: "👑",
      condition: u =>
        u.stats.longestStudyStreak >= 30
    }
  ];


  /* =======================================================
     DOM
     ======================================================= */

  const $ = id =>
    document.getElementById(id);

  const loginScreen =
    $("login-screen");

  const registerScreen =
    $("register-screen");

  const authScreen =
    $("auth-screen");

  const mainApp =
    $("main-app");


  /* =======================================================
     STATE
     ======================================================= */

  let currentUser = null;

  let realtimeChannels = [];

  let isSubmittingStudy = false;

  let isRendering = false;

  let notificationTimer = null;


  /* =======================================================
     DEFAULT DATA
     ======================================================= */

  function defaultStats() {
    return {
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
  }


  function createEmptyLocalModel(profile) {

    return {
      userId:
        profile.user_id_text,

      authId:
        profile.user_id,

      displayName:
        profile.display_name,

      course:
        profile.course,

      subjects:
        Array.isArray(profile.subjects)
          ? profile.subjects
          : [],

      level:
        Number(profile.level ?? 1),

      xp:
        Number(profile.xp ?? 0),

      totalXP:
        Number(profile.total_xp ?? 0),

      stars:
        Number(profile.stars ?? 0),

      studyLogs: [],

      quests: {
        daily: null,
        weekly: null
      },

      questHistory: [],

      boss: null,

      party: {
        week: weekKey(),
        id: null,
        members: []
      },

      seasons: {
        current:
          profile.season_current ||
          monthKey(),

        number:
          Number(profile.season_number ?? 1),

        studyMinutes: 0,

        history: []
      },

      achievements: [],

      stats: defaultStats(),

      createdAt:
        profile.created_at
    };
  }


  /* =======================================================
     DATE
     ======================================================= */

  function dateKey(date = new Date()) {

    const y =
      date.getFullYear();

    const m =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const d =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }


  function monthKey(date = new Date()) {

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
  }


  function weekKey(date = new Date()) {

    const d =
      new Date(date);

    d.setHours(
      0,
      0,
      0,
      0
    );

    const day =
      d.getDay();

    const diff =
      day === 0
        ? -6
        : 1 - day;

    d.setDate(
      d.getDate() + diff
    );

    return dateKey(d);
  }


  function formatMinutes(minutes) {

    minutes =
      Math.max(
        0,
        Number(minutes) || 0
      );

    const h =
      Math.floor(minutes / 60);

    const m =
      minutes % 60;

    if (h === 0) {
      return `${m}分`;
    }

    if (m === 0) {
      return `${h}時間`;
    }

    return `${h}時間${m}分`;
  }


  function formatHours(minutes) {

    return (
      Number(minutes || 0) / 60
    ).toFixed(1) + "時間";
  }


  /* =======================================================
     XP / LEVEL
     ======================================================= */

  function xpRequiredForLevel(level) {

    if (level >= MAX_LEVEL) {
      return 0;
    }

    return level * 50;
  }


  async function addXP(
    user,
    amount,
    reason = ""
  ) {

    amount =
      Math.max(
        0,
        Math.floor(
          Number(amount) || 0
        )
      );

    if (!amount) {
      return;
    }

    user.xp += amount;
    user.totalXP += amount;

    showNotification(
      `+${amount} XP${
        reason
          ? " ・ " + reason
          : ""
      }`
    );

    await processLevelUps(user);
  }


  async function processLevelUps(user) {

    let levelUps = 0;

    while (
      user.level < MAX_LEVEL &&
      user.xp >=
        xpRequiredForLevel(
          user.level
        )
    ) {

      user.xp -=
        xpRequiredForLevel(
          user.level
        );

      const oldLevel =
        user.level;

      user.level++;

      levelUps++;

      await saveProfile(user);

      showLevelUpModal(
        oldLevel,
        user.level
      );
    }

    if (
      user.level >= MAX_LEVEL
    ) {

      await performRebirth(user);
    }

    return levelUps;
  }


  async function performRebirth(user) {

    if (
      user.level !== MAX_LEVEL
    ) {
      return;
    }

    user.stars++;

    user.level = 1;
    user.xp = 0;

    const title =
      getStarTitle(
        user.stars
      );

    await saveProfile(user);

    await unlockAchievementById(
      user,
      "level-100"
    );

    const count =
      $("star-modal-count");

    const titleElement =
      $("star-modal-title");

    if (count) {
      count.textContent =
        `⭐ ${user.stars}`;
    }

    if (titleElement) {
      titleElement.textContent =
        title;
    }

    openModal(
      "star-modal"
    );
  }


  function getStarTitle(stars) {

    if (stars <= 0) {
      return STAR_TITLES[0];
    }

    if (
      stars <=
      STAR_TITLES.length
    ) {

      return STAR_TITLES[
        stars - 1
      ];
    }

    return `超越せし${stars}星の英雄`;
  }


  /* =======================================================
     PROFILE DATABASE
     ======================================================= */

  async function loadProfile() {

    const {
      data: {
        user: authUser
      },
      error: authError
    } = await supabase.auth.getUser();

    if (
      authError ||
      !authUser
    ) {
      return null;
    }

    const {
      data,
      error
    } = await supabase
      .from("profiles")
      .select("*")
      .eq(
        "auth_user_id",
        authUser.id
      )
      .single();

    if (error) {
      console.error(
        "Profile load error:",
        error
      );

      return null;
    }

    return data;
  }


  async function saveProfile(user) {

    if (!user?.authId) {
      return;
    }

    const payload = {
      display_name:
        user.displayName,

      course:
        user.course,

      subjects:
        user.subjects,

      level:
        user.level,

      xp:
        user.xp,

      total_xp:
        user.totalXP,

      stars:
        user.stars
    };

    const {
      error
    } = await supabase
      .from("profiles")
      .update(payload)
      .eq(
        "auth_user_id",
        user.authId
      );

    if (error) {
      console.error(
        "Profile save error:",
        error
      );

      throw error;
    }
  }


  /* =======================================================
     LOAD ALL USER DATA
     ======================================================= */

  async function loadUserData() {

    const profile =
      await loadProfile();

    if (!profile) {
      return null;
    }

    const user =
      createEmptyLocalModel(
        profile
      );

    await Promise.all([
      loadStudyLogs(user),
      loadQuests(user),
      loadQuestHistory(user),
      loadAchievements(user),
      loadSeasons(user),
      loadParty(user)
    ]);

    calculateStats(user);

    return user;
  }


  /* =======================================================
     STUDY LOGS
     ======================================================= */

  async function loadStudyLogs(user) {

    const {
      data,
      error
    } = await supabase
      .from("study_logs")
      .select("*")
      .eq(
        "user_id",
        user.authId
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

    if (error) {
      console.error(
        "Study logs load error:",
        error
      );

      return;
    }

    user.studyLogs =
      (data || []).map(
        row => ({
          id: row.id,

          date:
            dateKey(
              new Date(
                row.created_at
              )
            ),

          timestamp:
            row.created_at,

          subject:
            row.subject,

          minutes:
            Number(row.minutes),

          note:
            row.note || ""
        })
      );
  }


  async function insertStudyLog(
    user,
    subject,
    minutes,
    note
  ) {

    const {
      data,
      error
    } = await supabase
      .from("study_logs")
      .insert({
        user_id:
          user.authId,

        subject,

        minutes,

        note:
          note || ""
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }


  /* =======================================================
     QUESTS
     ======================================================= */

  async function loadQuests(user) {

    const today =
      dateKey();

    const week =
      weekKey();

    const {
      data,
      error
    } = await supabase
      .from("quests")
      .select("*")
      .eq(
        "user_id",
        user.authId
      )
      .or(
        `created_date.eq.${today},created_week.eq.${week}`
      );

    if (error) {
      console.error(
        "Quest load error:",
        error
      );

      return;
    }

    const rows =
      data || [];

    user.quests.daily =
      rows.filter(
        q =>
          q.type === "daily" &&
          q.created_date === today
      );

    user.quests.weekly =
      rows.find(
        q =>
          q.type === "weekly" &&
          q.created_week === week
      ) || null;

    if (
      user.quests.daily.length !== 3
    ) {
      await regenerateDailyQuests(
        user
      );
    }

    if (!user.quests.weekly) {
      await regenerateWeeklyQuest(
        user
      );
    }
  }


  async function regenerateDailyQuests(
    user
  ) {

    const today =
      dateKey();

    const {
      error: deleteError
    } = await supabase
      .from("quests")
      .delete()
      .eq(
        "user_id",
        user.authId
      )
      .eq(
        "type",
        "daily"
      )
      .eq(
        "created_date",
        today
      );

    if (deleteError) {
      console.error(
        deleteError
      );
    }

    const subjects =
      [];

    for (
      let i = 0;
      i < 3;
      i++
    ) {

      let subject =
        randomSubject(
          user,
          true
        );

      let attempts = 0;

      while (
        subjects.includes(subject) &&
        attempts < 20 &&
        user.subjects.length > 1
      ) {

        subject =
          randomSubject(
            user,
            true
          );

        attempts++;
      }

      subjects.push(subject);
    }

    const payload =
      subjects.map(
        (subject, index) => ({
          user_id:
            user.authId,

          type:
            "daily",

          subject,

          target_minutes:
            DAILY_TARGETS[index],

          progress:
            0,

          completed:
            false,

          created_date:
            today
        })
      );

    const {
      data,
      error
    } = await supabase
      .from("quests")
      .insert(payload)
      .select();

    if (error) {
      throw error;
    }

    user.quests.daily =
      data || [];
  }


  async function regenerateWeeklyQuest(
    user
  ) {

    const week =
      weekKey();

    const subject =
      randomSubject(
        user,
        true
      );

    const {
      data,
      error
    } = await supabase
      .from("quests")
      .insert({
        user_id:
          user.authId,

        type:
          "weekly",

        subject,

        target_minutes:
          300,

        progress:
          0,

        completed:
          false,

        created_week:
          week
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    user.quests.weekly =
      data;
  }


  async function updateQuest(
    quest
  ) {

    const {
      error
    } = await supabase
      .from("quests")
      .update({
        progress:
          quest.progress,

        completed:
          quest.completed
      })
      .eq(
        "id",
        quest.id
      );

    if (error) {
      console.error(
        "Quest update error:",
        error
      );
    }
  }


  /* =======================================================
     QUEST HISTORY
     ======================================================= */

  async function loadQuestHistory(
    user
  ) {

    const {
      data,
      error
    } = await supabase
      .from("quest_history")
      .select("*")
      .eq(
        "user_id",
        user.authId
      )
      .order(
        "completed_at",
        {
          ascending: false
        }
      );

    if (error) {
      console.error(
        error
      );

      return;
    }

    user.questHistory =
      data || [];
  }


  async function saveQuestHistory(
    user,
    quest,
    xpReward
  ) {

    const {
      error
    } = await supabase
      .from("quest_history")
      .insert({
        user_id:
          user.authId,

        quest_id:
          quest.id,

        type:
          quest.type,

        subject:
          quest.subject,

        target_minutes:
          quest.target_minutes ??
          quest.targetMinutes,

        xp_reward:
          xpReward
      });

    if (error) {
      console.error(
        "Quest history error:",
        error
      );
    }
  }


  /* =======================================================
     ACHIEVEMENTS
     ======================================================= */

  async function loadAchievements(
    user
  ) {

    const {
      data,
      error
    } = await supabase
      .from("achievements")
      .select("achievement_id")
      .eq(
        "user_id",
        user.authId
      );

    if (error) {
      console.error(
        error
      );

      return;
    }

    user.achievements =
      (data || []).map(
        row =>
          row.achievement_id
      );
  }


  async function unlockAchievement(
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

    await supabase
      .from("achievements")
      .upsert(
        {
          user_id:
            user.authId,

          achievement_id:
            achievement.id
        },
        {
          onConflict:
            "user_id,achievement_id"
        }
      );

    await addXPWithoutNotification(
      user,
      100
    );

    showNotification(
      `🏆 実績解除：「${achievement.name}」`
    );
  }


  async function unlockAchievementById(
    user,
    id
  ) {

    const achievement =
      ACHIEVEMENTS.find(
        a =>
          a.id === id
      );

    if (achievement) {
      await unlockAchievement(
        user,
        achievement
      );
    }
  }


  async function checkAchievements(
    user
  ) {

    for (
      const achievement
      of ACHIEVEMENTS
    ) {

      if (
        user.achievements.includes(
          achievement.id
        )
      ) {
        continue;
      }

      try {

        if (
          achievement.condition(
            user
          )
        ) {

          await unlockAchievement(
            user,
            achievement
          );
        }

      } catch (error) {

        console.warn(
          "Achievement error:",
          error
        );
      }
    }
  }


  /* =======================================================
     XP WITHOUT NOTIFICATION
     ======================================================= */

  async function addXPWithoutNotification(
    user,
    amount
  ) {

    amount =
      Math.max(
        0,
        Math.floor(
          Number(amount) || 0
        )
      );

    if (!amount) {
      return;
    }

    user.xp += amount;
    user.totalXP += amount;

    while (
      user.level < MAX_LEVEL &&
      user.xp >=
        xpRequiredForLevel(
          user.level
        )
    ) {

      user.xp -=
        xpRequiredForLevel(
          user.level
        );

      user.level++;
    }

    await saveProfile(user);

    if (
      user.level >= MAX_LEVEL
    ) {
      await performRebirth(user);
    }
  }


  /* =======================================================
     STUDY
     ======================================================= */

  async function recordStudy(
    user,
    subject,
    minutes,
    note = ""
  ) {

    if (
      !SUBJECTS[subject]
    ) {
      throw new Error(
        "教科を選択してください。"
      );
    }

    minutes =
      Math.floor(
        Number(minutes)
      );

    if (
      !Number.isFinite(minutes) ||
      minutes <= 0 ||
      minutes > 1440
    ) {
      throw new Error(
        "勉強時間は1〜1440分で入力してください。"
      );
    }

    if (
      isSubmittingStudy
    ) {
      return;
    }

    isSubmittingStudy =
      true;

    try {

      const now =
        new Date();

      /*
       * DBに保存。
       */
      const inserted =
        await insertStudyLog(
          user,
          subject,
          minutes,
          note
        );

      /*
       * ローカルモデル更新。
       */
      user.studyLogs.unshift({
        id:
          inserted.id,

        date:
          dateKey(now),

        timestamp:
          inserted.created_at,

        subject,

        minutes,

        note
      });

      calculateStats(user);

      /*
       * XP
       */
      await addXP(
        user,
        minutes,
        `${SUBJECTS[subject]} ${minutes}分`
      );

      /*
       * クエスト
       */
      await updateQuestProgressFromStudy(
        user,
        subject,
        minutes
      );

      /*
       * パーティーボス
       */
      await damagePartyBoss(
        user,
        subject,
        minutes
      );

      /*
       * 実績
       */
      await checkAchievements(
        user
      );

      /*
       * プロフィール
       */
      await saveProfile(user);

      renderAll();

    } finally {

      isSubmittingStudy =
        false;
    }
  }


  /* =======================================================
     STATS
     ======================================================= */

  function calculateStats(user) {

    user.stats =
      defaultStats();

    user.stats.totalStudyMinutes =
      user.studyLogs.reduce(
        (sum, log) =>
          sum +
          Number(log.minutes || 0),
        0
      );

    user.stats.longestSession =
      user.studyLogs.reduce(
        (max, log) =>
          Math.max(
            max,
            Number(log.minutes || 0)
          ),
        0
      );

    for (
      const log
      of user.studyLogs
    ) {

      const date =
        new Date(
          log.timestamp
        );

      const hour =
        date.getHours();

      if (
        hour >= 21 ||
        hour < 3
      ) {
        user.stats.nightStudyCount++;
      }

      if (hour < 6) {
        user.stats.earlyStudyCount++;
      }
    }

    user.stats.questsCompleted =
      user.questHistory.length;

    user.stats.weeklyCompletions =
      user.questHistory.filter(
        q =>
          q.type === "weekly"
      ).length;

    user.stats.bossesDefeated =
      user.stats.bossesDefeated ||
      0;

    user.stats.longestStudyStreak =
      calculateLongestStudyStreak(
        user
      );
  }


  function calculateLongestStudyStreak(
    user
  ) {

    const dates =
      [
        ...new Set(
          user.studyLogs.map(
            log => log.date
          )
        )
      ].sort();

    if (!dates.length) {
      return 0;
    }

    let longest = 1;
    let current = 1;

    for (
      let i = 1;
      i < dates.length;
      i++
    ) {

      const a =
        new Date(
          dates[i - 1]
        );

      const b =
        new Date(
          dates[i]
        );

      const diff =
        Math.round(
          (
            b - a
          ) / 86400000
        );

      if (diff === 1) {
        current++;
      } else {
        current = 1;
      }

      longest =
        Math.max(
          longest,
          current
        );
    }

    return longest;
  }


  /* =======================================================
     SUBJECTS
     ======================================================= */

  function getSubjectMinutes(
    user,
    subject
  ) {

    return user.studyLogs
      .filter(
        log =>
          log.subject === subject
      )
      .reduce(
        (sum, log) =>
          sum +
          Number(log.minutes || 0),
        0
      );
  }


  function hasStudiedAllSubjects(
    user
  ) {

    if (
      !user.subjects.length
    ) {
      return false;
    }

    return user.subjects.every(
      subject =>
        getSubjectMinutes(
          user,
          subject
        ) > 0
    );
  }


  function getWeakSubjects(
    user
  ) {

    return [...user.subjects].sort(
      (a, b) =>
        getSubjectMinutes(
          user,
          a
        ) -
        getSubjectMinutes(
          user,
          b
        )
    );
  }


  function randomSubject(
    user,
    prioritizeWeak = true
  ) {

    if (
      !user.subjects.length
    ) {
      return null;
    }

    if (
      prioritizeWeak
    ) {

      const sorted =
        getWeakSubjects(
          user
        );

      const candidates =
        sorted.slice(
          0,
          Math.max(
            1,
            Math.ceil(
              sorted.length / 2
            )
          )
        );

      return candidates[
        Math.floor(
          Math.random() *
          candidates.length
        )
      ];
    }

    return user.subjects[
      Math.floor(
        Math.random() *
        user.subjects.length
      )
    ];
  }


  /* =======================================================
     QUEST PROGRESS
     ======================================================= */

  async function updateQuestProgressFromStudy(
    user,
    subject,
    minutes
  ) {

    if (
      !user.quests.daily
    ) {
      await regenerateDailyQuests(
        user
      );
    }

    if (
      !user.quests.weekly
    ) {
      await regenerateWeeklyQuest(
        user
      );
    }

    for (
      const quest
      of user.quests.daily
    ) {

      if (
        quest.completed ||
        quest.subject !== subject
      ) {
        continue;
      }

      quest.progress =
        Number(
          quest.progress || 0
        ) + minutes;

      if (
        quest.progress >=
        quest.target_minutes
      ) {

        await completeQuest(
          user,
          quest
        );

      } else {

        await updateQuest(
          quest
        );
      }
    }

    const weekly =
      user.quests.weekly;

    if (
      weekly &&
      !weekly.completed &&
      weekly.subject === subject
    ) {

      weekly.progress =
        Number(
          weekly.progress || 0
        ) + minutes;

      if (
        weekly.progress >=
        weekly.target_minutes
      ) {

        await completeQuest(
          user,
          weekly
        );

      } else {

        await updateQuest(
          weekly
        );
      }
    }
  }


  async function completeQuest(
    user,
    quest
  ) {

    if (
      quest.completed
    ) {
      return;
    }

    quest.completed =
      true;

    const target =
      Number(
        quest.target_minutes ||
        quest.targetMinutes ||
        0
      );

    const xpReward =
      quest.type === "daily"
        ? 50 + target
        : 250;

    await updateQuest(
      quest
    );

    await addXP(
      user,
      xpReward,
      "クエスト達成"
    );

    await saveQuestHistory(
      user,
      quest,
      xpReward
    );

    user.questHistory.unshift({
      id:
        quest.id,

      type:
        quest.type,

      subject:
        quest.subject,

      targetMinutes:
        target,

      completedAt:
        new Date().toISOString(),

      xpReward
    });

    /*
     * Daily全部達成。
     */
    if (
      user.quests.daily.length === 3 &&
      user.quests.daily.every(
        q => q.completed
      )
    ) {

      user.stats.fullDailyCompletions++;

      await addXP(
        user,
        100,
        "デイリーコンプリート"
      );
    }

    await checkAchievements(
      user
    );
  }


  /* =======================================================
     SEASON
     ======================================================= */

  async function loadSeasons(user) {

    const {
      data,
      error
    } = await supabase
      .from("seasons")
      .select("*")
      .eq(
        "user_id",
        user.authId
      )
      .single();

    if (
      error &&
      error.code !== "PGRST116"
    ) {

      console.error(
        error
      );

      return;
    }

    if (data) {

      user.seasons = {
        current:
          data.current_month,

        number:
          Number(
            data.season_number
          ),

        studyMinutes:
          Number(
            data.study_minutes || 0
          ),

        history: []
      };
    }

    const {
      data: history
    } = await supabase
      .from("season_history")
      .select("*")
      .eq(
        "user_id",
        user.authId
      )
      .order(
        "season_number",
        {
          ascending: false
        }
      );

    user.seasons.history =
      history || [];
  }


  function getSeasonStudyMinutes(
    user
  ) {

    const current =
      monthKey();

    return user.studyLogs
      .filter(
        log =>
          log.date.startsWith(
            current
          )
      )
      .reduce(
        (sum, log) =>
          sum +
          Number(
            log.minutes || 0
          ),
        0
      );
  }


  function getRankByMinutes(
    minutes
  ) {

    const hours =
      minutes / 60;

    let result =
      RANKS[0];

    for (
      const rank of RANKS
    ) {

      if (
        hours >=
        rank.minHours
      ) {
        result = rank;
      }
    }

    return result;
  }


  function getCurrentRank(
    user
  ) {

    return getRankByMinutes(
      getSeasonStudyMinutes(
        user
      )
    );
  }


  /* =======================================================
     PARTY
     ======================================================= */

  async function loadParty(user) {

    const {
      data: member,
      error: memberError
    } = await supabase
      .from("party_members")
      .select(
        "party_id"
      )
      .eq(
        "user_id",
        user.authId
      )
      .limit(1)
      .maybeSingle();

    if (
      memberError
    ) {

      console.error(
        memberError
      );

      return;
    }

    if (!member) {

      await createPartyForUser(
        user
      );

      return;
    }

    const {
      data: party,
      error: partyError
    } = await supabase
      .from("parties")
      .select("*")
      .eq(
        "id",
        member.party_id
      )
      .single();

    if (
      partyError
    ) {

      console.error(
        partyError
      );

      return;
    }

    user.party.id =
      party.id;

    user.party.week =
      party.week;

    await loadPartyMembers(
      user
    );

    await loadPartyBoss(
      user
    );
  }


  async function createPartyForUser(
    user
  ) {

    const {
      data: party,
      error
    } = await supabase
      .from("parties")
      .insert({
        week:
          weekKey()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await supabase
      .from("party_members")
      .insert({
        party_id:
          party.id,

        user_id:
          user.authId
      });

    user.party.id =
      party.id;

    user.party.week =
      party.week;

    await loadPartyMembers(
      user
    );
  }


  async function loadPartyMembers(
    user
  ) {

    if (
      !user.party.id
    ) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from("party_members")
      .select(`
        user_id,
        profiles (
          user_id,
          user_id_text,
          display_name,
          level,
          xp,
          stars,
          course,
          subjects
        )
      `)
      .eq(
        "party_id",
        user.party.id
      );

    if (error) {
      console.error(
        error
      );

      return;
    }

    user.party.members =
      data || [];
  }


  async function findPlayerById(
    targetId
  ) {

    targetId =
      String(
        targetId || ""
      ).trim();

    if (!targetId) {
      throw new Error(
        "ユーザーIDを入力してください。"
      );
    }

    const {
      data,
      error
    } = await supabase
      .from("profiles")
      .select(`
        auth_user_id,
        user_id_text,
        display_name,
        level,
        stars,
        course
      `)
      .eq(
        "user_id_text",
        targetId
      )
      .single();

    if (
      error ||
      !data
    ) {

      throw new Error(
        "その冒険者は見つかりません。"
      );
    }

    return data;
  }


  async function addPartyMember(
    user,
    targetId
  ) {

    const target =
      await findPlayerById(
        targetId
      );

    if (
      target.auth_user_id ===
      user.authId
    ) {

      throw new Error(
        "自分自身は追加できません。"
      );
    }

    if (
      user.party.members.length >=
      MAX_PARTY_SIZE
    ) {

      throw new Error(
        "パーティーは最大4人です。"
      );
    }

    const already =
      user.party.members.some(
        member =>
          member.user_id ===
          target.auth_user_id
      );

    if (already) {

      throw new Error(
        "そのプレイヤーはすでにパーティーにいます。"
      );
    }

    const {
      error
    } = await supabase
      .from("party_members")
      .insert({
        party_id:
          user.party.id,

        user_id:
          target.auth_user_id
      });

    if (error) {

      if (
        error.code ===
        "23505"
      ) {

        throw new Error(
          "そのプレイヤーはすでにパーティーにいます。"
        );
      }

      throw error;
    }

    await loadPartyMembers(
      user
    );

    showNotification(
      `${target.display_name}をパーティーに追加しました！`
    );

    renderParty(
      user
    );

    renderBoss(
      user
    );
  }


  /* =======================================================
     BOSS
     ======================================================= */

  async function loadPartyBoss(
    user
  ) {

    if (
      !user.party.id
    ) {
      return;
    }

    const {
      data,
      error
    } = await supabase
      .from("bosses")
      .select("*")
      .eq(
        "party_id",
        user.party.id
      )
      .eq(
        "defeated",
        false
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        error
      );

      return;
    }

    user.boss =
      data
        ? convertBoss(data)
        : null;
  }


  function convertBoss(
    row
  ) {

    return {
      id:
        row.id,

      name:
        row.name,

      level:
        Number(row.level),

      maxHP:
        Number(row.max_hp),

      currentHP:
        Number(row.current_hp),

      weakness:
        row.weakness,

      weaknessMultiplier:
        Number(
          row.weakness_multiplier ||
          BOSS_WEAKNESS_MULTIPLIER
        ),

      partyCount:
        Number(
          row.party_count || 1
        ),

      defeated:
        Boolean(
          row.defeated
        ),

      log: []
    };
  }


  async function generateBoss(
    user
  ) {

    await loadPartyMembers(
      user
    );

    const partyCount =
      Math.max(
        1,
        user.party.members.length
      );

    const multiplier =
      PARTY_HP_MULTIPLIER[
        partyCount
      ] || 1;

    const maxHP =
      Math.round(
        BOSS_BASE_HP *
        multiplier
      );

    const weakness =
      randomSubject(
        user,
        false
      );

    const name =
      BOSS_NAMES[
        Math.floor(
          Math.random() *
          BOSS_NAMES.length
        )
      ];

    const {
      data,
      error
    } = await supabase
      .from("bosses")
      .insert({
        party_id:
          user.party.id,

        name,

        level:
          Math.max(
            1,
            Math.floor(
              user.level / 5
            )
          ),

        max_hp:
          maxHP,

        current_hp:
          maxHP,

        weakness,

        weakness_multiplier:
          BOSS_WEAKNESS_MULTIPLIER,

        party_count:
          partyCount,

        defeated:
          false
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    user.boss =
      convertBoss(data);

    await insertBossLog(
      user,
      "ボスが出現した！"
    );

    renderBoss(
      user
    );
  }


  async function insertBossLog(
    user,
    text,
    extra = {}
  ) {

    if (
      !user.boss
    ) {
      return;
    }

    const {
      error
    } = await supabase
      .from("boss_logs")
      .insert({
        boss_id:
          user.boss.id,

        user_id:
          user.authId,

        text,

        subject:
          extra.subject ||
          null,

        minutes:
          extra.minutes ||
          null,

        damage:
          extra.damage ||
          null
      });

    if (error) {
      console.error(
        "Boss log error:",
        error
      );
    }
  }


  async function loadBossLogs(
    user
  ) {

    if (
      !user.boss
    ) {
      return [];
    }

    const {
      data,
      error
    } = await supabase
      .from("boss_logs")
      .select(`
        *,
        profiles (
          display_name
        )
      `)
      .eq(
        "boss_id",
        user.boss.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(30);

    if (error) {
      console.error(
        error
      );

      return [];
    }

    return data || [];
  }


  async function damagePartyBoss(
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

    let damage =
      minutes;

    if (
      subject ===
      user.boss.weakness
    ) {

      damage *=
        user.boss
          .weaknessMultiplier;
    }

    damage =
      Math.round(
        damage
      );

    /*
     * 重要:
     * 現在HPをJSで直接計算してUPDATEすると、
     * AとBが同時に勉強した場合に
     * 片方のダメージが消える競合が起こる。
     *
     * そのためSupabase側RPCで
     * atomic updateする。
     */
    const {
      data,
      error
    } = await supabase.rpc(
      "damage_party_boss",
      {
        p_boss_id:
          user.boss.id,

        p_user_id:
          user.authId,

        p_subject:
          subject,

        p_minutes:
          minutes,

        p_damage:
          damage
      }
    );

    if (error) {

      console.error(
        "Boss damage error:",
        error
      );

      return;
    }

    /*
     * RPC結果を再取得。
     */
    await loadPartyBoss(
      user
    );

    if (
      data?.defeated
    ) {

      user.boss.defeated =
        true;

      await handleBossDefeated(
        user,
        data
      );
    }
  }


  async function handleBossDefeated(
    user,
    result
  ) {

    const boss =
      user.boss;

    if (!boss) {
      return;
    }

    const xpReward =
      300 +
      Number(
        boss.partyCount
      ) * 100;

    /*
     * 自分にも報酬。
     */
    await addXP(
      user,
      xpReward,
      "ボス撃破"
    );

    user.stats.bossesDefeated++;

    await insertBossLog(
      user,
      `🎉 ${boss.name}を撃破した！`
    );

    await saveProfile(
      user
    );

    await checkAchievements(
      user
    );

    const title =
      $("boss-result-title");

    const message =
      $("boss-result-message");

    const xp =
      $("boss-result-xp");

    if (title) {
      title.textContent =
        "BOSS DEFEATED!";
    }

    if (message) {
      message.textContent =
        `${boss.name}を撃破しました！`;
    }

    if (xp) {
      xp.textContent =
        `${xpReward} XP`;
    }

    openModal(
      "boss-result-modal"
    );
  }


  /* =======================================================
     REALTIME
     ======================================================= */

  function unsubscribeRealtime() {

    for (
      const channel
      of realtimeChannels
    ) {

      try {
        supabase.removeChannel(
          channel
        );
      } catch (error) {
        console.warn(
          error
        );
      }
    }

    realtimeChannels =
      [];
  }


  function subscribeRealtime(
    user
  ) {

    unsubscribeRealtime();

    if (
      !user?.authId
    ) {
      return;
    }

    /*
     * 自分のプロフィール。
     */
    const profileChannel =
      supabase
        .channel(
          `profile-${user.authId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter:
              `auth_user_id=eq.${user.authId}`
          },
          async () => {

            await refreshCurrentUser();
          }
        )
        .subscribe();

    /*
     * 自分の勉強ログ。
     */
    const studyChannel =
      supabase
        .channel(
          `study-${user.authId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "study_logs",
            filter:
              `user_id=eq.${user.authId}`
          },
          async () => {

            await refreshCurrentUser();
          }
        )
        .subscribe();

    realtimeChannels.push(
      profileChannel,
      studyChannel
    );

    /*
     * パーティー。
     */
    if (
      user.party?.id
    ) {

      const partyChannel =
        supabase
          .channel(
            `party-${user.party.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "party_members",
              filter:
                `party_id=eq.${user.party.id}`
            },
            async () => {

              await refreshCurrentUser();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bosses",
              filter:
                `party_id=eq.${user.party.id}`
            },
            async () => {

              await refreshCurrentUser();
            }
          )
          .subscribe();

      realtimeChannels.push(
        partyChannel
      );
    }

    /*
     * Boss logs。
     */
    if (
      user.boss?.id
    ) {

      const bossChannel =
        supabase
          .channel(
            `boss-${user.boss.id}`
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "boss_logs",
              filter:
                `boss_id=eq.${user.boss.id}`
            },
            async () => {

              await refreshCurrentUser();
            }
          )
          .subscribe();

      realtimeChannels.push(
        bossChannel
      );
    }
  }


  async function refreshCurrentUser() {

    if (
      isRendering
    ) {
      return;
    }

    try {

      const user =
        await loadUserData();

      if (!user) {
        return;
      }

      currentUser =
        user;

      renderAll();

    } catch (error) {

      console.error(
        "Refresh error:",
        error
      );
    }
  }


  /* =======================================================
     AUTH
     ======================================================= */

  async function handleRegister(
    event
  ) {

    event.preventDefault();

    const errorElement =
      $("register-error");

    const subjectError =
      $("subject-error");

    if (errorElement) {
      errorElement.textContent =
        "";
    }

    if (subjectError) {
      subjectError.textContent =
        "";
    }

    try {

      const userId =
        $("register-user-id")
          .value
          .trim();

      const emailElement =
        $("register-email");

      if (!emailElement) {

        throw new Error(
          "登録フォームにメールアドレス欄（register-email）が必要です。"
        );
      }

      const email =
        emailElement
          .value
          .trim();

      const password =
        $("register-password")
          .value;

      const confirm =
        $("register-password-confirm")
          .value;

      const displayName =
        $("register-display-name")
          .value
          .trim();

      const course =
        document
          .querySelector(
            'input[name="course"]:checked'
          )
          ?.value;

      const subjects =
        [
          ...document.querySelectorAll(
            'input[name="subjects"]:checked'
          )
        ]
        .map(
          input =>
            input.value
        );

      if (
        !/^[a-zA-Z0-9_-]{3,30}$/.test(
          userId
        )
      ) {

        throw new Error(
          "ユーザーIDは英数字・_・-のみ、3～30文字で設定してください。"
        );
      }

      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          email
        )
      ) {

        throw new Error(
          "有効なメールアドレスを入力してください。"
        );
      }

      if (
        password.length < 6
      ) {

        throw new Error(
          "パスワードは6文字以上にしてください。"
        );
      }

      if (
        password !== confirm
      ) {

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

      if (
        !subjects.length
      ) {

        if (subjectError) {
          subjectError.textContent =
            "受験教科を1つ以上選択してください。";
        }

        return;
      }

      /*
       * user_id_text重複確認。
       */
      const {
        data: existing
      } = await supabase
        .from("profiles")
        .select(
          "user_id_text"
        )
        .eq(
          "user_id_text",
          userId
        )
        .maybeSingle();

      if (existing) {

        throw new Error(
          "そのユーザーIDはすでに使用されています。"
        );
      }

      /*
       * Supabase Auth。
       */
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          "アカウント作成に失敗しました。"
        );
      }

      /*
       * Profile。
       */
      const {
        error: profileError
      } = await supabase
        .from("profiles")
        .insert({
          auth_user_id:
            data.user.id,

          user_id_text:
            userId,

          display_name:
            displayName,

          course,

          subjects,

          level:
            1,

          xp:
            0,

          total_xp:
            0,

          stars:
            0
        });

      if (profileError) {
        throw profileError;
      }

      /*
       * 自動パーティー作成。
       */
      await createInitialParty(
        data.user.id
      );

      /*
       * メール確認がONなら、
       * Supabaseから確認メールが来る。
       */
      if (
        !data.session
      ) {

        showNotification(
          "登録完了！メールアドレスを確認してください。"
        );

        showLogin();

        return;
      }

      await enterApplication();

      showNotification(
        "冒険者登録完了！"
      );

    } catch (error) {

      console.error(
        "Register error:",
        error
      );

      if (errorElement) {
        errorElement.textContent =
          getFriendlySupabaseError(
            error
          );
      }
    }
  }


  async function createInitialParty(
    authUserId
  ) {

    const {
      data: party,
      error
    } = await supabase
      .from("parties")
      .insert({
        week:
          weekKey()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const {
      error: memberError
    } = await supabase
      .from("party_members")
      .insert({
        party_id:
          party.id,

        user_id:
          authUserId
      });

    if (memberError) {
      throw memberError;
    }
  }


  async function handleLogin(
    event
  ) {

    event.preventDefault();

    const errorElement =
      $("login-error");

    if (errorElement) {
      errorElement.textContent =
        "";
    }

    try {

      const email =
        $("login-email")
          ? $("login-email")
              .value
              .trim()
          : "";

      const userId =
        $("login-user-id")
          ? $("login-user-id")
              .value
              .trim()
          : "";

      const password =
        $("login-password")
          .value;

      /*
       * login-emailが存在するなら
       * メールログイン。
       *
       * 無い場合はユーザーIDから
       * profiles→メールを引く設計にはしない。
       * AuthのメールをDBから公開するのは避ける。
       */
      if (!email) {

        throw new Error(
          "ログインにはメールアドレスを使用してください。"
        );
      }

      if (!password) {

        throw new Error(
          "パスワードを入力してください。"
        );
      }

      const {
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      await enterApplication();

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      if (errorElement) {
        errorElement.textContent =
          getFriendlySupabaseError(
            error
          );
      }
    }
  }


  async function enterApplication() {

    const user =
      await loadUserData();

    if (!user) {

      throw new Error(
        "プロフィール情報を取得できませんでした。"
      );
    }

    currentUser =
      user;

    authScreen.classList.add(
      "hidden"
    );

    mainApp.classList.remove(
      "hidden"
    );

    renderAll();

    subscribeRealtime(
      user
    );

    showNotification(
      `おかえりなさい、${user.displayName}！`
    );
  }


  async function handleLogout() {

    unsubscribeRealtime();

    currentUser =
      null;

    const {
      error
    } = await supabase.auth.signOut();

    if (error) {

      console.error(
        error
      );

      return;
    }

    mainApp.classList.add(
      "hidden"
    );

    authScreen.classList.remove(
      "hidden"
    );

    showLogin();

    showNotification(
      "ログアウトしました。"
    );
  }


  /* =======================================================
     PROFILE SETTINGS
     ======================================================= */

  async function changeDisplayName(
    event
  ) {

    event.preventDefault();

    if (!currentUser) {
      return;
    }

    const newName =
      $("new-display-name")
        .value
        .trim();

    if (!newName) {
      return;
    }

    currentUser.displayName =
      newName;

    await saveProfile(
      currentUser
    );

    renderAll();

    showNotification(
      "表示名を変更しました。"
    );
  }


  async function changePassword(
    event
  ) {

    event.preventDefault();

    const next =
      $("new-password")
        .value;

    if (
      next.length < 6
    ) {

      showNotification(
        "新しいパスワードは6文字以上にしてください。"
      );

      return;
    }

    const {
      error
    } = await supabase.auth.updateUser({
      password:
        next
    });

    if (error) {

      showNotification(
        getFriendlySupabaseError(
          error
        )
      );

      return;
    }

    $("change-password-form")
      .reset();

    showNotification(
      "パスワードを変更しました。"
    );
  }


  async function changeCourse(
    event
  ) {

    event.preventDefault();

    if (!currentUser) {
      return;
    }

    currentUser.course =
      $("new-course")
        .value;

    await saveProfile(
      currentUser
    );

    renderAll();

    showNotification(
      "文理を変更しました。"
    );
  }


  async function changeSubjects(
    event
  ) {

    event.preventDefault();

    if (!currentUser) {
      return;
    }

    const subjects =
      [
        ...document.querySelectorAll(
          'input[name="settings-subjects"]:checked'
        )
      ]
      .map(
        input =>
          input.value
      );

    if (!subjects.length) {

      showNotification(
        "受験教科を1つ以上選択してください。"
      );

      return;
    }

    currentUser.subjects =
      subjects;

    await saveProfile(
      currentUser
    );

    renderAll();

    showNotification(
      "受験教科を更新しました。"
    );
  }


  async function deleteAccount() {

    /*
     * Authユーザー削除は
     * ブラウザから直接admin APIを呼べない。
     *
     * Edge Function等で行う必要がある。
     */
    showNotification(
      "アカウント削除は管理用Edge Function経由で実装します。"
    );
  }


  /* =======================================================
     RENDER
     ======================================================= */

  function renderAll() {

    if (
      !currentUser ||
      isRendering
    ) {
      return;
    }

    isRendering =
      true;

    try {

      renderHeader(
        currentUser
      );

      renderHome(
        currentUser
      );

      renderStudy(
        currentUser
      );

      renderQuests(
        currentUser
      );

      renderBoss(
        currentUser
      );

      renderParty(
        currentUser
      );

      renderRank(
        currentUser
      );

      renderAchievements(
        currentUser
      );

      renderProfile(
        currentUser
      );

      renderSubjectSelectors(
        currentUser
      );

    } finally {

      isRendering =
        false;
    }
  }


  /* =======================================================
     HEADER
     ======================================================= */

  function renderHeader(
    user
  ) {

    setText(
      "header-display-name",
      user.displayName
    );

    setText(
      "header-level",
      `Lv.${user.level}`
    );

    setText(
      "header-rank",
      getCurrentRank(user).name
    );
  }


  /* =======================================================
     HOME
     ======================================================= */

  function renderHome(
    user
  ) {

    setText(
      "home-level",
      user.level
    );

    setText(
      "home-xp",
      `${user.xp} XP`
    );

    if (
      user.level >= MAX_LEVEL
    ) {

      setText(
        "home-xp-required",
        "MAX LEVEL"
      );

    } else {

      setText(
        "home-xp-required",
        `次のLvまで ${xpRequiredForLevel(
          user.level
        )} XP`
      );
    }

    const required =
      xpRequiredForLevel(
        user.level
      );

    const progress =
      required === 0
        ? 100
        : Math.min(
            100,
            (
              user.xp /
              required
            ) * 100
          );

    const progressElement =
      $("level-progress");

    if (progressElement) {
      progressElement.style.width =
        `${progress}%`;
    }

    setText(
      "star-count",
      `⭐ ${user.stars}`
    );

    setText(
      "star-title",
      getStarTitle(
        user.stars
      )
    );

    const today =
      dateKey();

    const todayMinutes =
      user.studyLogs
        .filter(
          log =>
            log.date === today
        )
        .reduce(
          (sum, log) =>
            sum +
            log.minutes,
          0
        );

    setText(
      "today-study-time",
      formatMinutes(
        todayMinutes
      )
    );

    setText(
      "today-xp",
      `${todayMinutes} XP`
    );

    const dailyCompleted =
      user.quests.daily
        ? user.quests.daily
            .filter(
              q => q.completed
            )
            .length
        : 0;

    setText(
      "today-quest-progress",
      `${dailyCompleted} / 3`
    );

    setText(
      "home-season-number",
      `Season ${user.seasons.number}`
    );

    setText(
      "home-season-rank",
      getCurrentRank(user).name
    );

    setText(
      "home-season-study-time",
      formatHours(
        getSeasonStudyMinutes(
          user
        )
      )
    );

    renderHomeQuests(
      user
    );
  }


  function renderHomeQuests(
    user
  ) {

    const container =
      $("home-daily-quests");

    if (!container) {
      return;
    }

    container.innerHTML =
      "";

    for (
      const quest
      of user.quests.daily
    ) {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card quest-item";

      div.innerHTML = `
        <strong>
          ${quest.completed ? "✅" : "📜"}
          ${escapeHTML(
            SUBJECTS[
              quest.subject
            ] || "不明"
          )}
        </strong>

        <div>
          ${Math.min(
            Number(
              quest.progress || 0
            ),
            Number(
              quest.target_minutes
            )
          )} /
          ${quest.target_minutes}分
        </div>

        <div>
          ${
            quest.completed
              ? "達成済み"
              : "進行中"
          }
        </div>
      `;

      container.appendChild(
        div
      );
    }
  }


  /* =======================================================
     STUDY RENDER
     ======================================================= */

  function renderStudy(
    user
  ) {

    const list =
      $("subject-study-list");

    if (!list) {
      return;
    }

    list.innerHTML =
      "";

    const sorted =
      [...user.subjects].sort(
        (a, b) =>
          getSubjectMinutes(
            user,
            a
          ) -
          getSubjectMinutes(
            user,
            b
          )
      );

    for (
      const subject
      of sorted
    ) {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card subject-study-item";

      div.innerHTML = `
        <strong>
          ${escapeHTML(
            SUBJECTS[subject]
          )}
        </strong>

        <span>
          ${formatMinutes(
            getSubjectMinutes(
              user,
              subject
            )
          )}
        </span>
      `;

      list.appendChild(
        div
      );
    }

    const history =
      $("study-history-list");

    if (!history) {
      return;
    }

    history.innerHTML =
      "";

    if (
      !user.studyLogs.length
    ) {

      history.innerHTML =
        "<p>まだ勉強記録がありません。</p>";

      return;
    }

    for (
      const log
      of user.studyLogs.slice(
        0,
        50
      )
    ) {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card study-history-item";

      div.innerHTML = `
        <strong>
          ${escapeHTML(
            SUBJECTS[
              log.subject
            ] || "不明"
          )}
        </strong>

        <div>
          ${formatMinutes(
            log.minutes
          )}
        </div>

        <small>
          ${new Date(
            log.timestamp
          ).toLocaleString(
            "ja-JP"
          )}
        </small>

        ${
          log.note
            ? `<p>${escapeHTML(
                log.note
              )}</p>`
            : ""
        }
      `;

      history.appendChild(
        div
      );
    }
  }


  /* =======================================================
     QUEST RENDER
     ======================================================= */

  function renderQuests(
    user
  ) {

    const daily =
      $("daily-quest-list");

    if (daily) {

      daily.innerHTML =
        "";

      for (
        const quest
        of user.quests.daily
      ) {

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "card quest-card";

        div.innerHTML = `
          <h4>
            ${
              quest.completed
                ? "✅"
                : "📜"
            }
            ${escapeHTML(
              SUBJECTS[
                quest.subject
              ]
            )}クエスト
          </h4>

          <p>
            ${escapeHTML(
              SUBJECTS[
                quest.subject
              ]
            )}を
            ${quest.target_minutes}分勉強する
          </p>

          <p>
            進捗：
            ${Math.min(
              quest.progress || 0,
              quest.target_minutes
            )}
            /
            ${quest.target_minutes}分
          </p>

          <strong>
            ${
              quest.completed
                ? "達成済み"
                : "挑戦中"
            }
          </strong>
        `;

        daily.appendChild(
          div
        );
      }
    }

    const weekly =
      $("weekly-quest-list");

    if (weekly) {

      weekly.innerHTML =
        "";

      const q =
        user.quests.weekly;

      if (q) {

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "card quest-card";

        div.innerHTML = `
          <h4>
            ${
              q.completed
                ? "✅"
                : "📅"
            }
            Weekly Quest
          </h4>

          <p>
            ${escapeHTML(
              SUBJECTS[
                q.subject
              ]
            )}を
            ${q.target_minutes}分勉強する
          </p>

          <p>
            進捗：
            ${Math.min(
              q.progress || 0,
              q.target_minutes
            )}
            /
            ${q.target_minutes}分
          </p>

          <strong>
            ${
              q.completed
                ? "達成済み"
                : "挑戦中"
            }
          </strong>
        `;

        weekly.appendChild(
          div
        );
      }
    }

    const history =
      $("quest-history-list");

    if (!history) {
      return;
    }

    history.innerHTML =
      "";

    if (
      !user.questHistory.length
    ) {

      history.innerHTML =
        "<p>まだクエスト達成履歴がありません。</p>";

      return;
    }

    for (
      const item
      of user.questHistory.slice(
        0,
        30
      )
    ) {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card";

      div.innerHTML = `
        <strong>
          ${
            item.type === "daily"
              ? "Daily"
              : "Weekly"
          }
        </strong>

        <p>
          ${escapeHTML(
            SUBJECTS[
              item.subject
            ] || "不明"
          )}
          ・
          ${
            item.target_minutes ||
            item.targetMinutes
          }分
        </p>

        <small>
          ${new Date(
            item.completed_at ||
            item.completedAt
          ).toLocaleString(
            "ja-JP"
          )}
        </small>

        <p>
          +${
            item.xp_reward ||
            item.xpReward ||
            0
          } XP
        </p>
      `;

      history.appendChild(
        div
      );
    }
  }


  /* =======================================================
     BOSS RENDER
     ======================================================= */

  async function renderBoss(
    user
  ) {

    if (!user.boss) {

      setText(
        "boss-name",
        "ボス未出現"
      );

      setText(
        "boss-level",
        "Lv.?"
      );

      setText(
        "boss-current-hp",
        "0"
      );

      setText(
        "boss-max-hp",
        "0"
      );

      const progress =
        $("boss-hp-progress");

      if (progress) {
        progress.style.width =
          "0%";
      }

      setText(
        "boss-weakness-subject",
        "---"
      );

      setText(
        "boss-party-count",
        `${user.party.members.length} / 4`
      );

      return;
    }

    const boss =
      user.boss;

    setText(
      "boss-name",
      boss.name
    );

    setText(
      "boss-level",
      `Lv.${boss.level}`
    );

    setText(
      "boss-current-hp",
      boss.currentHP
    );

    setText(
      "boss-max-hp",
      boss.maxHP
    );

    const percentage =
      boss.maxHP === 0
        ? 0
        : (
            boss.currentHP /
            boss.maxHP
          ) * 100;

    const progress =
      $("boss-hp-progress");

    if (progress) {
      progress.style.width =
        `${percentage}%`;
    }

    setText(
      "boss-weakness-subject",
      SUBJECTS[
        boss.weakness
      ] || "---"
    );

    setText(
      "boss-weakness-multiplier",
      `×${boss.weaknessMultiplier}`
    );

    setText(
      "boss-party-count",
      `${user.party.members.length} / 4`
    );

    renderBossParty(
      user
    );

    const logList =
      $("boss-log-list");

    if (!logList) {
      return;
    }

    const logs =
      await loadBossLogs(
        user
      );

    logList.innerHTML =
      "";

    for (
      const item
      of logs
    ) {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card";

      div.innerHTML = `
        <strong>
          ${
            item.profiles
              ?.display_name
              ? escapeHTML(
                  item.profiles
                    .display_name
                )
              : ""
          }
        </strong>

        <div>
          ${escapeHTML(
            item.text || ""
          )}
        </div>

        ${
          item.created_at
            ? `<small>${new Date(
                item.created_at
              ).toLocaleString(
                "ja-JP"
              )}</small>`
            : ""
        }
      `;

      logList.appendChild(
        div
      );
    }
  }


  function renderBossParty(
    user
  ) {

    const list =
      $("boss-party-member-list");

    if (!list) {
      return;
    }

    list.innerHTML =
      "";

    for (
      const member
      of user.party.members
    ) {

      const profile =
        member.profiles;

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card";

      div.innerHTML = `
        <strong>
          ${escapeHTML(
            profile
              ?.display_name ||
            member.user_id
          )}
        </strong>

        <p>
          ${
            profile
              ? `Lv.${profile.level}`
              : ""
          }
        </p>
      `;

      list.appendChild(
        div
      );
    }
  }


  /* =======================================================
     PARTY RENDER
     ======================================================= */

  function renderParty(
    user
  ) {

    const count =
      user.party.members.length;

    setText(
      "party-member-count",
      `${count} / 4`
    );

    const start =
      new Date(
        user.party.week
      );

    const end =
      new Date(start);

    end.setDate(
      end.getDate() + 6
    );

    setText(
      "party-week-range",
      `${start.toLocaleDateString(
        "ja-JP"
      )} ～ ${end.toLocaleDateString(
        "ja-JP"
      )}`
    );

    const list =
      $("party-member-list");

    if (!list) {
      return;
    }

    list.innerHTML =
      "";

    for (
      const member
      of user.party.members
    ) {

      const profile =
        member.profiles;

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card";

      div.innerHTML = `
        <strong>
          ${escapeHTML(
            profile
              ?.display_name ||
            member.user_id
          )}
        </strong>

        <p>
          ${
            profile
              ? `Lv.${profile.level}`
              : ""
          }
        </p>
      `;

      list.appendChild(
        div
      );
    }

    const input =
      $("party-user-id");

    const button =
      $("party-invite-button");

    const full =
      count >=
      MAX_PARTY_SIZE;

    if (input) {
      input.disabled =
        full;
    }

    if (button) {

      button.disabled =
        full;

      button.textContent =
        full
          ? "パーティー満員"
          : "パーティーに追加";
    }
  }


  /* =======================================================
     RANK
     ======================================================= */

  function renderRank(
    user
  ) {

    const rank =
      getCurrentRank(
        user
      );

    const minutes =
      getSeasonStudyMinutes(
        user
      );

    setText(
      "rank-season-label",
      `Season ${user.seasons.number}`
    );

    setText(
      "current-rank-name",
      rank.name
    );

    setText(
      "current-season-time",
      formatHours(
        minutes
      )
    );

    const tbody =
      $("rank-table-body");

    if (tbody) {

      tbody.innerHTML =
        "";

      for (
        const r
        of RANKS
      ) {

        const tr =
          document.createElement(
            "tr"
          );

        tr.innerHTML = `
          <td>
            ${escapeHTML(
              r.name
            )}
          </td>

          <td>
            ${r.minHours}時間～
          </td>
        `;

        tbody.appendChild(
          tr
        );
      }
    }

    const history =
      $("season-history-list");

    if (!history) {
      return;
    }

    history.innerHTML =
      "";

    if (
      !user.seasons.history.length
    ) {

      history.innerHTML =
        "<p>まだシーズン履歴がありません。</p>";

      return;
    }

    for (
      const season
      of user.seasons.history
    ) {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card";

      div.innerHTML = `
        <strong>
          Season ${season.season_number}
        </strong>

        <p>
          ${escapeHTML(
            season.month
          )}
        </p>

        <p>
          ${escapeHTML(
            season.rank
          )}
          ・
          ${formatHours(
            season.study_minutes
          )}
        </p>

        <p>
          シーズン報酬：
          +${season.xp_reward} XP
        </p>
      `;

      history.appendChild(
        div
      );
    }
  }


  /* =======================================================
     ACHIEVEMENTS RENDER
     ======================================================= */

  function renderAchievements(
    user
  ) {

    setText(
      "achievement-unlocked-count",
      user.achievements.length
    );

    setText(
      "achievement-total-count",
      ACHIEVEMENTS.length
    );

    const container =
      $("achievement-list");

    if (!container) {
      return;
    }

    container.innerHTML =
      "";

    for (
      const achievement
      of ACHIEVEMENTS
    ) {

      const unlocked =
        user.achievements.includes(
          achievement.id
        );

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "card achievement-item";

      if (!unlocked) {
        div.style.opacity =
          "0.45";
      }

      div.innerHTML = `
        <div style="font-size:2rem;">
          ${
            unlocked
              ? achievement.icon
              : "🔒"
          }
        </div>

        <strong>
          ${escapeHTML(
            achievement.name
          )}
        </strong>

        <p>
          ${escapeHTML(
            achievement.description
          )}
        </p>

        <small>
          ${
            unlocked
              ? "解除済み"
              : "未解除"
          }
        </small>
      `;

      container.appendChild(
        div
      );
    }
  }


  /* =======================================================
     PROFILE RENDER
     ======================================================= */

  function renderProfile(
    user
  ) {

    setText(
      "profile-display-name",
      user.displayName
    );

    setText(
      "profile-user-id",
      user.userId
    );

    setText(
      "profile-course",
      COURSE_NAMES[
        user.course
      ] ||
      "未定・その他"
    );

    setText(
      "profile-level",
      user.level
    );

    setText(
      "profile-stars",
      user.stars
    );

    setText(
      "profile-title",
      getStarTitle(
        user.stars
      )
    );

    setText(
      "profile-total-study-time",
      formatHours(
        user.stats.totalStudyMinutes
      )
    );

    setText(
      "profile-total-xp",
      `${user.totalXP} XP`
    );

    setText(
      "profile-bosses-defeated",
      user.stats.bossesDefeated
    );

    setText(
      "profile-quests-completed",
      user.stats.questsCompleted
    );

    const list =
      $("profile-subject-list");

    if (list) {

      list.innerHTML =
        "";

      for (
        const subject
        of user.subjects
      ) {

        const span =
          document.createElement(
            "span"
          );

        span.className =
          "card";

        span.style.display =
          "inline-block";

        span.textContent =
          SUBJECTS[subject];

        list.appendChild(
          span
        );
      }
    }

    const nameInput =
      $("new-display-name");

    if (nameInput) {
      nameInput.value =
        user.displayName;
    }

    const courseInput =
      $("new-course");

    if (courseInput) {
      courseInput.value =
        user.course;
    }
  }


  /* =======================================================
     SUBJECT SELECTORS
     ======================================================= */

  function renderSubjectSelectors(
    user
  ) {

    const studySelect =
      $("study-subject");

    if (studySelect) {

      const oldValue =
        studySelect.value;

      studySelect.innerHTML = `
        <option value="">
          教科を選択
        </option>
      `;

      for (
        const subject
        of user.subjects
      ) {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          subject;

        option.textContent =
          SUBJECTS[subject];

        studySelect.appendChild(
          option
        );
      }

      if (
        user.subjects.includes(
          oldValue
        )
      ) {

        studySelect.value =
          oldValue;
      }
    }

    const container =
      $("settings-subject-selection");

    if (!container) {
      return;
    }

    container.innerHTML =
      "";

    for (
      const subject
      of Object.keys(
        SUBJECTS
      )
    ) {

      const label =
        document.createElement(
          "label"
        );

      label.style.display =
        "block";

      const checkbox =
        document.createElement(
          "input"
        );

      checkbox.type =
        "checkbox";

      checkbox.name =
        "settings-subjects";

      checkbox.value =
        subject;

      checkbox.checked =
        user.subjects.includes(
          subject
        );

      label.appendChild(
        checkbox
      );

      label.appendChild(
        document.createTextNode(
          ` ${SUBJECTS[subject]}`
        )
      );

      container.appendChild(
        label
      );
    }
  }


  /* =======================================================
     NAVIGATION
     ======================================================= */

  function setupNavigation() {

    document
      .querySelectorAll(
        ".nav-button"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const target =
                button.dataset
                  .screen;

              document
                .querySelectorAll(
                  ".app-screen"
                )
                .forEach(
                  screen =>
                    screen.classList.add(
                      "hidden"
                    )
                );

              $(target)
                ?.classList.remove(
                  "hidden"
                );

              document
                .querySelectorAll(
                  ".nav-button"
                )
                .forEach(
                  btn =>
                    btn.classList.remove(
                      "active"
                    )
                );

              button.classList.add(
                "active"
              );
            }
          );
        }
      );
  }


  /* =======================================================
     MODALS
     ======================================================= */

  function openModal(
    id
  ) {

    $(id)
      ?.classList.remove(
        "hidden"
      );
  }


  function closeModal(
    id
  ) {

    $(id)
      ?.classList.add(
        "hidden"
      );
  }


  function showLevelUpModal(
    oldLevel,
    newLevel
  ) {

    setText(
      "level-up-old-level",
      `Lv.${oldLevel}`
    );

    setText(
      "level-up-new-level",
      `Lv.${newLevel}`
    );

    setText(
      "level-up-message",
      `Lv.${newLevel}に到達！`
    );

    openModal(
      "level-up-modal"
    );
  }


  /* =======================================================
     NOTIFICATION
     ======================================================= */

  function showNotification(
    message
  ) {

    const notification =
      $("notification");

    if (!notification) {
      return;
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
      setTimeout(
        () => {

          notification.classList.add(
            "hidden"
          );

        },
        3000
      );
  }


  /* =======================================================
     AUTH SCREEN
     ======================================================= */

  function showLogin() {

    loginScreen
      ?.classList.remove(
        "hidden"
      );

    registerScreen
      ?.classList.add(
        "hidden"
      );
  }


  function showRegister() {

    loginScreen
      ?.classList.add(
        "hidden"
      );

    registerScreen
      ?.classList.remove(
        "hidden"
      );
  }


  /* =======================================================
     EVENTS
     ======================================================= */

  function setupEvents() {

    $("show-register-button")
      ?.addEventListener(
        "click",
        showRegister
      );

    $("show-login-button")
      ?.addEventListener(
        "click",
        showLogin
      );

    $("register-form")
      ?.addEventListener(
        "submit",
        handleRegister
      );

    $("login-form")
      ?.addEventListener(
        "submit",
        handleLogin
      );

    $("logout-button")
      ?.addEventListener(
        "click",
        handleLogout
      );


    /*
     * Study
     */
    $("study-form")
      ?.addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          if (!currentUser) {
            return;
          }

          try {

            await recordStudy(
              currentUser,

              $("study-subject")
                .value,

              $("study-minutes")
                .value,

              $("study-note")
                .value
                .trim()
            );

            $("study-form")
              .reset();

          } catch (error) {

            console.error(
              error
            );

            showNotification(
              getFriendlySupabaseError(
                error
              )
            );
          }
        }
      );


    /*
     * Party
     */
    $("party-invite-form")
      ?.addEventListener(
        "submit",
        async event => {

          event.preventDefault();

          if (!currentUser) {
            return;
          }

          const errorElement =
            $("party-error");

          if (errorElement) {
            errorElement.textContent =
              "";
          }

          try {

            await addPartyMember(
              currentUser,

              $("party-user-id")
                .value
            );

            $("party-invite-form")
              .reset();

          } catch (error) {

            console.error(
              error
            );

            if (errorElement) {
              errorElement.textContent =
                getFriendlySupabaseError(
                  error
                );
            }

            showNotification(
              getFriendlySupabaseError(
                error
              )
            );
          }
        }
      );


    /*
     * Boss
     */
    $("boss-refresh-button")
      ?.addEventListener(
        "click",
        async () => {

          if (!currentUser) {
            return;
          }

          try {

            await generateBoss(
              currentUser
            );

            showNotification(
              "新たなボスが出現した！"
            );

          } catch (error) {

            console.error(
              error
            );

            showNotification(
              getFriendlySupabaseError(
                error
              )
            );
          }
        }
      );


    /*
     * Profile
     */
    $("change-name-form")
      ?.addEventListener(
        "submit",
        changeDisplayName
      );

    $("change-password-form")
      ?.addEventListener(
        "submit",
        changePassword
      );

    $("change-course-form")
      ?.addEventListener(
        "submit",
        changeCourse
      );

    $("change-subject-form")
      ?.addEventListener(
        "submit",
        changeSubjects
      );

    $("delete-account-button")
      ?.addEventListener(
        "click",
        deleteAccount
      );


    /*
     * Modals
     */
    $("level-up-close")
      ?.addEventListener(
        "click",
        () =>
          closeModal(
            "level-up-modal"
          )
      );

    $("star-modal-close")
      ?.addEventListener(
        "click",
        () => {

          closeModal(
            "star-modal"
          );

          renderAll();
        }
      );

    $("boss-result-close")
      ?.addEventListener(
        "click",
        () =>
          closeModal(
            "boss-result-modal"
          )
      );

    $("season-result-close")
      ?.addEventListener(
        "click",
        () => {

          closeModal(
            "season-result-modal"
          );

          renderAll();
        }
      );
  }


  /* =======================================================
     STARTUP
     ======================================================= */

  async function initialize() {

    if (!supabase) {

      showFatalError(
        "Supabaseが初期化されていません。"
      );

      return;
    }

    setupEvents();
    setupNavigation();

    try {

      const {
        data: {
          session
        }
      } =
        await supabase.auth.getSession();

      if (
        session
      ) {

        await enterApplication();

      } else {

        authScreen
          ?.classList.remove(
            "hidden"
          );

        mainApp
          ?.classList.add(
            "hidden"
          );

        showLogin();
      }

    } catch (error) {

      console.error(
        "Initialization error:",
        error
      );

      showFatalError(
        "アプリの読み込みに失敗しました。"
      );
    }


    /*
     * Auth状態変化。
     */
    supabase.auth.onAuthStateChange(
      async (
        event,
        session
      ) => {

        if (
          event === "SIGNED_OUT"
        ) {

          unsubscribeRealtime();

          currentUser =
            null;

          mainApp
            ?.classList.add(
              "hidden"
            );

          authScreen
            ?.classList.remove(
              "hidden"
            );

          showLogin();

          return;
        }

        if (
          event === "SIGNED_IN" &&
          session
        ) {

          /*
           * enterApplicationと競合しないよう
           * microtaskに逃がす。
           */
          setTimeout(
            async () => {

              if (
                !currentUser
              ) {

                try {
                  await enterApplication();
                } catch (error) {
                  console.error(
                    error
                  );
                }
              }

            },
            0
          );
        }
      }
    );
  }


  /* =======================================================
     HELPERS
     ======================================================= */

  function setText(
    id,
    value
  ) {

    const element =
      $(id);

    if (element) {
      element.textContent =
        value;
    }
  }


  function escapeHTML(
    value
  ) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }


  function getFriendlySupabaseError(
    error
  ) {

    const message =
      error?.message ||
      String(error);

    const lower =
      message.toLowerCase();

    if (
      lower.includes(
        "invalid login credentials"
      )
    ) {

      return "メールアドレスまたはパスワードが違います。";
    }

    if (
      lower.includes(
        "user already registered"
      )
    ) {

      return "このメールアドレスはすでに登録されています。";
    }

    if (
      lower.includes(
        "password"
      ) &&
      lower.includes(
        "6"
      )
    ) {

      return "パスワードは6文字以上にしてください。";
    }

    return message;
  }


  function showFatalError(
    message
  ) {

    console.error(
      message
    );

    if (
      authScreen
    ) {

      authScreen.classList.remove(
        "hidden"
      );
    }

    if (
      mainApp
    ) {

      mainApp.classList.add(
        "hidden"
      );
    }

    showNotification(
      message
    );
  }


  /* =======================================================
     BOOT
     ======================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    initialize
  );

})();
