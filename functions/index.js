const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {setGlobalOptions} = require('firebase-functions');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const {initializeApp} = require('firebase-admin/app');

initializeApp();

const db = getFirestore();

setGlobalOptions({
  maxInstances: 10,
  region: 'asia-northeast1',
});

/* ============================================================
 * 受験RPG - Cloud Functions
 *
 * 中央処理:
 *   タイマー終了
 *      ↓
 *   事後確認
 *      ↓
 *   confirmStudy
 *      ↓
 *   XP / Coins / Quest / Subject Lv / Rank / Boss
 *      ↓
 *   studyRecords
 *      ↓
 *   結果をフロントへ返却
 * ============================================================ */


/* ============================================================
 * 基本設定
 * ============================================================ */

const DAILY_MINUTES = [15, 30, 45, 60];

const DAILY_REWARDS = {
  15: {xp: 50, coins: 100},
  30: {xp: 100, coins: 200},
  45: {xp: 150, coins: 300},
  60: {xp: 200, coins: 400},
};

const WEEKLY_REWARD = {
  xp: 1000,
  coins: 2500,
};

const RARE_REWARDS = {
  120: {
    xp: 1000,
    coins: 2500,
    items: 2,
  },
  180: {
    xp: 2000,
    coins: 5000,
    items: 3,
  },
};


/* ============================================================
 * プレイヤーLv
 * ============================================================ */

const PLAYER_LEVEL_XP = [];

for (let i = 1; i <= 99; i++) {
  const tier = Math.floor((i - 1) / 10);
  PLAYER_LEVEL_XP.push(100 + tier * 50);
}

function calculatePlayerLevel(totalXp) {
  let level = 1;
  let remaining = Math.max(0, Number(totalXp) || 0);

  for (let i = 0; i < PLAYER_LEVEL_XP.length; i++) {
    const required = PLAYER_LEVEL_XP[i];

    if (remaining < required) {
      return {
        level,
        progressXp: remaining,
        nextXp: required,
      };
    }

    remaining -= required;
    level++;

    if (level >= 100) {
      return {
        level: 100,
        progressXp: remaining,
        nextXp: 0,
      };
    }
  }

  return {
    level: 100,
    progressXp: remaining,
    nextXp: 0,
  };
}


/* ============================================================
 * 教科Lv
 *
 * 45分 = +1 Lv
 * プレイヤーXPとは完全独立
 * ============================================================ */

function calculateSubjectLevel(minutes) {
  const total = Math.max(0, Number(minutes) || 0);

  return {
    level: Math.floor(total / 45) + 1,
    currentMinutes: total % 45,
    nextMinutes: 45,
  };
}


/* ============================================================
 * ランク
 * ============================================================ */

const RANKS = [
  {
    id: 'bronze_3',
    name: 'Bronze III',
    minutes: 0,
    rewardXp: 100,
    rewardCoins: 150,
  },
  {
    id: 'bronze_2',
    name: 'Bronze II',
    minutes: 120,
    rewardXp: 150,
    rewardCoins: 250,
  },
  {
    id: 'bronze_1',
    name: 'Bronze I',
    minutes: 240,
    rewardXp: 200,
    rewardCoins: 350,
  },
  {
    id: 'silver_3',
    name: 'Silver III',
    minutes: 480,
    rewardXp: 300,
    rewardCoins: 500,
  },
  {
    id: 'silver_2',
    name: 'Silver II',
    minutes: 720,
    rewardXp: 400,
    rewardCoins: 650,
  },
  {
    id: 'silver_1',
    name: 'Silver I',
    minutes: 960,
    rewardXp: 500,
    rewardCoins: 800,
  },
  {
    id: 'gold_3',
    name: 'Gold III',
    minutes: 1320,
    rewardXp: 650,
    rewardCoins: 1000,
  },
  {
    id: 'gold_2',
    name: 'Gold II',
    minutes: 1680,
    rewardXp: 800,
    rewardCoins: 1250,
  },
  {
    id: 'gold_1',
    name: 'Gold I',
    minutes: 2040,
    rewardXp: 1000,
    rewardCoins: 1500,
  },
  {
    id: 'platinum_3',
    name: 'Platinum III',
    minutes: 2520,
    rewardXp: 1250,
    rewardCoins: 1800,
  },
  {
    id: 'platinum_2',
    name: 'Platinum II',
    minutes: 3000,
    rewardXp: 1500,
    rewardCoins: 2200,
  },
  {
    id: 'platinum_1',
    name: 'Platinum I',
    minutes: 3480,
    rewardXp: 1800,
    rewardCoins: 2600,
  },
  {
    id: 'diamond_3',
    name: 'Diamond III',
    minutes: 4080,
    rewardXp: 2200,
    rewardCoins: 3200,
  },
  {
    id: 'diamond_2',
    name: 'Diamond II',
    minutes: 4680,
    rewardXp: 2600,
    rewardCoins: 3800,
  },
  {
    id: 'diamond_1',
    name: 'Diamond I',
    minutes: 5280,
    rewardXp: 3000,
    rewardCoins: 4500,
  },
  {
    id: 'master',
    name: 'Master',
    minutes: 6600,
    rewardXp: 3750,
    rewardCoins: 5500,
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    minutes: 8400,
    rewardXp: 4750,
    rewardCoins: 7000,
  },
  {
    id: 'legend',
    name: 'Legend',
    minutes: 10200,
    rewardXp: 6000,
    rewardCoins: 10000,
  },
];

function calculateRank(minutes) {
  const total = Math.max(0, Number(minutes) || 0);

  let current = RANKS[0];

  for (const rank of RANKS) {
    if (total >= rank.minutes) {
      current = rank;
    } else {
      break;
    }
  }

  return current;
}


/* ============================================================
 * ランク進捗
 * ============================================================ */

function getRankProgress(minutes) {
  const current = calculateRank(minutes);

  const index = RANKS.findIndex((r) => r.id === current.id);
  const next = RANKS[index + 1] || null;

  if (!next) {
    return {
      currentRank: current,
      nextRank: null,
      currentMinutes: minutes,
      requiredMinutes: current.minutes,
      progressMinutes: 0,
    };
  }

  return {
    currentRank: current,
    nextRank: next,
    currentMinutes: minutes,
    requiredMinutes: next.minutes,
    progressMinutes: Math.max(0, minutes - current.minutes),
  };
}


/* ============================================================
 * 日付
 * ============================================================ */

function getJapanDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getMonthId(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;

  return `${year}-${month}`;
}


/* ============================================================
 * ID
 * ============================================================ */

function makeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
}


/* ============================================================
 * バリデーション
 * ============================================================ */

function assertSignedIn(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
        'unauthenticated',
        'ログインが必要です。',
    );
  }

  return request.auth.uid;
}

function validateSubjectId(subjectId) {
  if (
    typeof subjectId !== 'string' ||
    subjectId.length < 1 ||
    subjectId.length > 80
  ) {
    throw new HttpsError(
        'invalid-argument',
        '科目が正しくありません。',
    );
  }
}

function validateSessionId(sessionId) {
  if (
    typeof sessionId !== 'string' ||
    sessionId.length < 1 ||
    sessionId.length > 150
  ) {
    throw new HttpsError(
        'invalid-argument',
        'セッションIDが正しくありません。',
    );
  }
}


/* ============================================================
 * ユーザープロフィール
 * ============================================================ */

function defaultProfile(uid) {
  return {
    globalId: uid,
    username: '冒険者',
    track: '未設定',

    selectedSubjects: [
      'math_ia',
      'math_iibc',
      'modern',
      'classical',
      'kanbun',
      'english',
      'chemistry',
      'physics',
      'geography',
      'basic_earth_science',
      'information',
    ],

    level: 1,
    xp: 0,
    stars: 0,
    coins: 0,

    totalStudyMinutes: 0,
    seasonStudyMinutes: 0,

    equippedTitleId: null,

    currentSeason: '',

    consecutiveStudyDays: 0,
    lastStudyDate: null,
    loginDays: 0,

    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    totalXpEarned: 0,

    rareQuestStreak: 0,

    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}


/* ============================================================
 * デイリークエスト生成
 * ============================================================ */

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateDailyQuest(profile) {
  const minutes = randomChoice(DAILY_MINUTES);

  const selectedSubjects =
    Array.isArray(profile.selectedSubjects) ?
      profile.selectedSubjects.filter(Boolean) :
      [];

  let subjectId = null;

  if (
    selectedSubjects.length > 0 &&
    Math.random() < 0.5
  ) {
    subjectId = randomChoice(selectedSubjects);
  }

  return {
    id: makeId('daily'),
    type: 'daily',
    minutes,
    subjectId,
    progressMinutes: 0,
    completed: false,
    date: getJapanDateString(),
    rewardXp: DAILY_REWARDS[minutes].xp,
    rewardCoins: DAILY_REWARDS[minutes].coins,
    createdAt: FieldValue.serverTimestamp(),
  };
}


/* ============================================================
 * デイリー初期化
 * ============================================================ */

exports.initializeDailyQuests = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const userRef = db.collection('users').doc(uid);
      const questRef = userRef.collection('quests');

      const today = getJapanDateString();

      const snapshot = await questRef
          .where('type', '==', 'daily')
          .where('date', '==', today)
          .get();

      if (snapshot.size >= 3) {
        return {
          success: true,
          created: false,
          date: today,
        };
      }

      const profileSnap = await userRef.get();

      const profile = profileSnap.exists ?
        profileSnap.data() :
        defaultProfile(uid);

      const batch = db.batch();

      for (let i = snapshot.size; i < 3; i++) {
        const quest = generateDailyQuest(profile);

        const ref = questRef.doc(quest.id);

        batch.set(ref, quest);
      }

      await batch.commit();

      return {
        success: true,
        created: true,
        date: today,
      };
    },
);


/* ============================================================
 * デイリークエスト取得
 * ============================================================ */

exports.getDailyQuests = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const today = getJapanDateString();

      const snapshot = await db
          .collection('users')
          .doc(uid)
          .collection('quests')
          .where('type', '==', 'daily')
          .where('date', '==', today)
          .get();

      return {
        success: true,
        quests: snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
      };
    },
);


/* ============================================================
 * デイリークエスト置換
 * ============================================================ */

exports.replaceDailyQuest = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const questId = request.data?.questId;

      if (
        typeof questId !== 'string' ||
        questId.length > 150
      ) {
        throw new HttpsError(
            'invalid-argument',
            'クエストIDが正しくありません。',
        );
      }

      const today = getJapanDateString();

      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        throw new HttpsError(
            'failed-precondition',
            'ユーザーデータがありません。',
        );
      }

      const profile = userSnap.data();

      if (profile.dailyReplacementDate === today) {
        throw new HttpsError(
            'failed-precondition',
            '本日のデイリークエスト交換は使用済みです。',
        );
      }

      const questRef = userRef
          .collection('quests')
          .doc(questId);

      const questSnap = await questRef.get();

      if (!questSnap.exists) {
        throw new HttpsError(
            'not-found',
            'クエストが見つかりません。',
        );
      }

      const oldQuest = questSnap.data();

      if (
        oldQuest.type !== 'daily' ||
        oldQuest.date !== today ||
        oldQuest.completed
      ) {
        throw new HttpsError(
            'failed-precondition',
            'このクエストは交換できません。',
        );
      }

      const newQuest = generateDailyQuest(profile);

      await db.runTransaction(async (transaction) => {
        transaction.update(userRef, {
          dailyReplacementDate: today,
          updatedAt: FieldValue.serverTimestamp(),
        });

        transaction.delete(questRef);

        transaction.set(
            userRef.collection('quests').doc(newQuest.id),
            newQuest,
        );
      });

      return {
        success: true,
        quest: {
          id: newQuest.id,
          ...newQuest,
        },
      };
    },
);


/* ============================================================
 * アクティブタイマー保存
 * ============================================================ */

exports.saveActiveTimer = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const timer = request.data?.timer;

      if (!timer || typeof timer !== 'object') {
        throw new HttpsError(
            'invalid-argument',
            'タイマーデータがありません。',
        );
      }

      validateSubjectId(timer.subjectId);

      const ref = db
          .collection('users')
          .doc(uid)
          .collection('activeTimer')
          .doc('current');

      await ref.set({
        ...timer,
        updatedAt: FieldValue.serverTimestamp(),
      }, {
        merge: true,
      });

      return {
        success: true,
      };
    },
);


/* ============================================================
 * アクティブタイマー取得
 * ============================================================ */

exports.getActiveTimer = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const ref = db
          .collection('users')
          .doc(uid)
          .collection('activeTimer')
          .doc('current');

      const snap = await ref.get();

      return {
        success: true,
        timer: snap.exists ? {
          id: snap.id,
          ...snap.data(),
        } : null,
      };
    },
);


/* ============================================================
 * ランク報酬
 *
 * 今月初めて到達したランクを記録。
 * 同じランクを何度も報酬対象にしない。
 * ============================================================ */

function getRankRewardFields(profile, newRank) {
  const rewarded =
    Array.isArray(profile.rewardedSeasonRanks) ?
      profile.rewardedSeasonRanks :
      [];

  const season = getMonthId();

  const key = `${season}:${newRank.id}`;

  if (rewarded.includes(key)) {
    return {
      xp: 0,
      coins: 0,
      key: null,
    };
  }

  return {
    xp: newRank.rewardXp,
    coins: newRank.rewardCoins,
    key,
  };
}


/* ============================================================
 * 連続勉強日数
 * ============================================================ */

function calculateStreak(profile, today) {
  const last = profile.lastStudyDate;

  if (!last) {
    return 1;
  }

  if (last === today) {
    return Number(profile.consecutiveStudyDays) || 1;
  }

  const previous = new Date(`${last}T00:00:00+09:00`);
  const current = new Date(`${today}T00:00:00+09:00`);

  const diff =
    Math.round(
        (current.getTime() - previous.getTime()) /
        86400000,
    );

  if (diff === 1) {
    return (Number(profile.consecutiveStudyDays) || 0) + 1;
  }

  return 1;
}


/* ============================================================
 * 事後記録
 * ============================================================ */

function buildStudyRecord({
  uid,
  sessionId,
  subjectId,
  minutes,
  baseXp,
  multiplier,
  earnedXp,
  earnedCoins,
  startedAt,
  endedAt,
  beforeProfile,
  afterProfile,
  beforeSubject,
  afterSubject,
  rankBefore,
  rankAfter,
  questResults,
  bossResult,
  streakBefore,
  streakAfter,
  rankReward,
  source,
}) {
  return {
    uid,

    sessionId,

    subjectId,
    minutes,

    date: getJapanDateString(),

    startedAt: startedAt || null,
    endedAt: endedAt || null,

    baseXp,
    xpMultiplier: multiplier,
    earnedXp,

    earnedCoins,

    bossDamage:
      bossResult?.damage || 0,

    bossWeakness:
      bossResult?.isWeakness || false,

    dailyQuestResults:
      questResults.daily || [],

    weeklyQuestResult:
      questResults.weekly || null,

    rareQuestResult:
      questResults.rare || null,

    rankBefore: rankBefore.id,
    rankAfter: rankAfter.id,

    playerLevelBefore: beforeProfile.level,
    playerLevelAfter: afterProfile.level,

    subjectLevelBefore:
      beforeSubject.level,

    subjectLevelAfter:
      afterSubject.level,

    levelUp:
      afterProfile.level > beforeProfile.level,

    subjectLevelUp:
      afterSubject.level > beforeSubject.level,

    streakBefore,
    streakAfter,

    rankReward: rankReward || null,

    source: source || 'timer',

    idempotencyKey: sessionId,

    createdAt: FieldValue.serverTimestamp(),
  };
}


/* ============================================================
 * デイリー進捗処理
 * ============================================================ */

function updateDailyQuestProgress(
    quest,
    minutes,
    subjectId,
) {
  if (quest.completed) {
    return {
      ...quest,
      changed: false,
      rewardXp: 0,
      rewardCoins: 0,
    };
  }

  if (
    quest.subjectId &&
    quest.subjectId !== subjectId
  ) {
    return {
      ...quest,
      changed: false,
      rewardXp: 0,
      rewardCoins: 0,
    };
  }

  const before = Number(quest.progressMinutes) || 0;

  const after = Math.min(
      quest.minutes,
      before + minutes,
  );

  const completed =
    after >= quest.minutes;

  return {
    ...quest,
    progressMinutes: after,
    completed,
    changed: true,
    rewardXp: completed ?
      DAILY_REWARDS[quest.minutes].xp :
      0,
    rewardCoins: completed ?
      DAILY_REWARDS[quest.minutes].coins :
      0,
  };
}


/* ============================================================
 * confirmStudy
 *
 * 受験RPGの中央処理
 * ============================================================ */

exports.confirmStudy = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const data = request.data || {};

      const sessionId = data.sessionId;
      const subjectId = data.subjectId;

      validateSessionId(sessionId);
      validateSubjectId(subjectId);

      const elapsedSeconds =
        Number(data.elapsedSeconds);

      if (
        !Number.isFinite(elapsedSeconds) ||
        elapsedSeconds < 60
      ) {
        throw new HttpsError(
            'invalid-argument',
            '勉強時間が1分未満です。',
        );
      }

      /*
       * クライアントから送られた秒数は
       * そのまま信用しすぎない。
       *
       * 今回はタイマー確定値として扱うが、
       * 将来的にはactiveTimerとの照合をさらに強化する。
       */
      const minutes =
        Math.floor(elapsedSeconds / 60);

      if (minutes < 1) {
        throw new HttpsError(
            'invalid-argument',
            '勉強時間が1分未満です。',
        );
      }

      const userRef =
        db.collection('users').doc(uid);

      const subjectRef =
        userRef
            .collection('subjects')
            .doc(subjectId);

      const recordRef =
        userRef
            .collection('studyRecords')
            .doc(sessionId);

      const today = getJapanDateString();
      const season = getMonthId();

      let responseData = null;

      await db.runTransaction(async (transaction) => {
        /*
         * --------------------------------------------------------
         * READS
         * --------------------------------------------------------
         */

        const userSnap =
          await transaction.get(userRef);

        if (!userSnap.exists) {
          throw new HttpsError(
              'failed-precondition',
              'ユーザープロフィールが存在しません。',
          );
        }

        const profile =
          userSnap.data();

        /*
         * 二重送信防止
         */
        const existingRecord =
          await transaction.get(recordRef);

        if (existingRecord.exists) {
          responseData = {
            success: true,
            duplicate: true,
            recordId: recordRef.id,
            record: existingRecord.data(),
          };

          return;
        }

        /*
         * 選択科目チェック
         */
        const selectedSubjects =
          Array.isArray(profile.selectedSubjects) ?
            profile.selectedSubjects :
            [];

        if (
          !selectedSubjects.includes(subjectId)
        ) {
          throw new HttpsError(
              'failed-precondition',
              '現在の選択科目に含まれていません。',
          );
        }

        /*
         * Subject
         */
        const subjectSnap =
          await transaction.get(subjectRef);

        const subjectData =
          subjectSnap.exists ?
            subjectSnap.data() :
            {
              subjectId,
              totalStudyMinutes: 0,
              level: 1,
            };

        /*
         * Daily quests
         */
        const questCollection =
          userRef.collection('quests');

        const dailySnap =
          await transaction.get(
              questCollection
                  .where('type', '==', 'daily')
                  .where('date', '==', today),
          );

        /*
         * Weekly quest
         */
        const weeklySnap =
          await transaction.get(
              questCollection
                  .where('type', '==', 'weekly')
                  .where('weekId', '==', getWeekId()),
          );

        /*
         * Rare quest
         */
        const rareSnap =
          await transaction.get(
              questCollection
                  .where('type', '==', 'rare')
                  .where('date', '==', today),
          );


        /*
         * --------------------------------------------------------
         * CALCULATIONS
         * --------------------------------------------------------
         */

        const beforeXp =
          Number(profile.xp) || 0;

        const beforeLevel =
          calculatePlayerLevel(beforeXp);

        const beforeSeasonMinutes =
          Number(profile.seasonStudyMinutes) || 0;

        const beforeRank =
          calculateRank(beforeSeasonMinutes);

        const beforeSubjectLevel =
          calculateSubjectLevel(
              Number(subjectData.totalStudyMinutes) || 0,
          );

        /*
         * 基本XP
         */
        const baseXp = minutes;

        /*
         * 現段階では倍率1倍。
         * アイテム処理実装時にここへ積算する。
         */
        const multiplier = 1;

        const studyXp =
          Math.floor(baseXp * multiplier);

        /*
         * Daily
         */
        const dailyResults = [];

        let dailyQuestXp = 0;
        let dailyQuestCoins = 0;

        for (const doc of dailySnap.docs) {
          const quest = {
            id: doc.id,
            ...doc.data(),
          };

          const updated =
            updateDailyQuestProgress(
                quest,
                minutes,
                subjectId,
            );

          if (updated.changed) {
            transaction.update(
                doc.ref,
                {
                  progressMinutes:
                    updated.progressMinutes,
                  completed:
                    updated.completed,
                  updatedAt:
                    FieldValue.serverTimestamp(),
                },
            );

            if (
              updated.completed &&
              !quest.completed
            ) {
              dailyQuestXp +=
                updated.rewardXp;

              dailyQuestCoins +=
                updated.rewardCoins;
            }

            dailyResults.push({
              questId: quest.id,
              beforeMinutes:
                quest.progressMinutes || 0,
              afterMinutes:
                updated.progressMinutes,
              completed:
                updated.completed,
              rewardXp:
                updated.completed &&
                !quest.completed ?
                  updated.rewardXp :
                  0,
              rewardCoins:
                updated.completed &&
                !quest.completed ?
                  updated.rewardCoins :
                  0,
            });
          }
        }

        /*
         * Weekly
         */
        let weeklyResult = null;
        let weeklyXp = 0;
        let weeklyCoins = 0;

        for (const doc of weeklySnap.docs) {
          const quest = doc.data();

          if (quest.completed) {
            weeklyResult = {
              questId: doc.id,
              completed: true,
              newlyCompleted: false,
            };
            continue;
          }

          const before =
            Number(quest.progressMinutes) || 0;

          const after =
            Math.min(
                600,
                before + minutes,
            );

          const completed =
            after >= 600;

          transaction.update(
              doc.ref,
              {
                progressMinutes: after,
                completed,
                updatedAt:
                  FieldValue.serverTimestamp(),
              },
          );

          if (completed && !quest.completed) {
            weeklyXp =
              WEEKLY_REWARD.xp;

            weeklyCoins =
              WEEKLY_REWARD.coins;
          }

          weeklyResult = {
            questId: doc.id,
            beforeMinutes: before,
            afterMinutes: after,
            completed,
            newlyCompleted:
              completed && !quest.completed,
            rewardXp:
              completed && !quest.completed ?
                WEEKLY_REWARD.xp :
                0,
            rewardCoins:
              completed && !quest.completed ?
                WEEKLY_REWARD.coins :
                0,
          };
        }

        /*
         * Rare quest
         */
        let rareResult = null;
        let rareXp = 0;
        let rareCoins = 0;

        for (const doc of rareSnap.docs) {
          const quest = doc.data();

          if (quest.completed) {
            rareResult = {
              questId: doc.id,
              completed: true,
              newlyCompleted: false,
            };
            continue;
          }

          const target =
            Number(quest.minutes) || 0;

          const before =
            Number(quest.progressMinutes) || 0;

          const after =
            Math.min(
                target,
                before + minutes,
            );

          const completed =
            after >= target;

          transaction.update(
              doc.ref,
              {
                progressMinutes: after,
                completed,
                updatedAt:
                  FieldValue.serverTimestamp(),
              },
          );

          if (completed && !quest.completed) {
            const reward =
              RARE_REWARDS[target];

            if (reward) {
              rareXp = reward.xp;
              rareCoins = reward.coins;
            }
          }

          rareResult = {
            questId: doc.id,
            beforeMinutes: before,
            afterMinutes: after,
            completed,
            newlyCompleted:
              completed && !quest.completed,
            rewardXp:
              completed && !quest.completed ?
                rareXp :
                0,
            rewardCoins:
              completed && !quest.completed ?
                rareCoins :
                0,
            rewardItems:
              completed && !quest.completed ?
                (RARE_REWARDS[target]?.items || 0) :
                0,
          };
        }


        /*
         * --------------------------------------------------------
         * TOTAL REWARDS
         * --------------------------------------------------------
         */

        let earnedXp =
          studyXp +
          dailyQuestXp +
          weeklyXp +
          rareXp;

        let earnedCoins =
          dailyQuestCoins +
          weeklyCoins +
          rareCoins;


        /*
         * Rank reward
         */
        const afterSeasonMinutes =
          beforeSeasonMinutes + minutes;

        const afterRank =
          calculateRank(afterSeasonMinutes);

        const rankReward =
          getRankRewardFields(
              profile,
              afterRank,
          );

        earnedXp += rankReward.xp;
        earnedCoins += rankReward.coins;


        /*
         * New player XP/level
         */
        const afterXp =
          beforeXp + earnedXp;

        const afterLevel =
          calculatePlayerLevel(afterXp);


        /*
         * Subject
         */
        const afterSubjectMinutes =
          (Number(subjectData.totalStudyMinutes) || 0) +
          minutes;

        const afterSubjectLevel =
          calculateSubjectLevel(
              afterSubjectMinutes,
          );


        /*
         * Streak
         */
        const streakBefore =
          Number(profile.consecutiveStudyDays) || 0;

        const streakAfter =
          calculateStreak(
              profile,
              today,
          );


        /*
         * Coins / totals
         */
        const beforeCoins =
          Number(profile.coins) || 0;

        const afterCoins =
          beforeCoins + earnedCoins;


        /*
         * --------------------------------------------------------
         * PROFILE UPDATE
         * --------------------------------------------------------
         */

        const profileUpdate = {
          xp: afterXp,

          level:
            afterLevel.level,

          coins:
            afterCoins,

          totalStudyMinutes:
            (Number(profile.totalStudyMinutes) || 0) +
            minutes,

          seasonStudyMinutes:
            afterSeasonMinutes,

          currentSeason:
            season,

          consecutiveStudyDays:
            streakAfter,

          lastStudyDate:
            today,

          loginDays:
            Number(profile.loginDays) || 0,

          totalXpEarned:
            (Number(profile.totalXpEarned) || 0) +
            earnedXp,

          totalCoinsEarned:
            (Number(profile.totalCoinsEarned) || 0) +
            earnedCoins,

          updatedAt:
            FieldValue.serverTimestamp(),
        };


        /*
         * ランク報酬を初めて受け取った場合
         */
        if (rankReward.key) {
          profileUpdate.rewardedSeasonRanks =
            FieldValue.arrayUnion(
                rankReward.key,
            );
        }


        /*
         * 連続日数をログイン日数として記録
         */
        if (
          profile.lastStudyDate !== today
        ) {
          profileUpdate.loginDays =
            (Number(profile.loginDays) || 0) + 1;
        }


        transaction.set(
            userRef,
            profileUpdate,
            {merge: true},
        );


        /*
         * --------------------------------------------------------
         * SUBJECT UPDATE
         * --------------------------------------------------------
         */

        transaction.set(
            subjectRef,
            {
              subjectId,

              totalStudyMinutes:
                afterSubjectMinutes,

              level:
                afterSubjectLevel.level,

              currentMinutes:
                afterSubjectLevel.currentMinutes,

              updatedAt:
                FieldValue.serverTimestamp(),
            },
            {merge: true},
        );


        /*
         * --------------------------------------------------------
         * STUDY RECORD
         * --------------------------------------------------------
         */

        const record =
          buildStudyRecord({
            uid,
            sessionId,
            subjectId,
            minutes,

            baseXp,

            multiplier,

            earnedXp,
            earnedCoins,

            startedAt:
              data.startedAt || null,

            endedAt:
              data.endedAt || null,

            beforeProfile: {
              ...profile,
              level:
                beforeLevel.level,
            },

            afterProfile: {
              ...profileUpdate,
              level:
                afterLevel.level,
              xp:
                afterXp,
            },

            beforeSubject:
              beforeSubjectLevel,

            afterSubject:
              afterSubjectLevel,

            rankBefore:
              beforeRank,

            rankAfter:
              afterRank,

            questResults: {
              daily:
                dailyResults,

              weekly:
                weeklyResult,

              rare:
                rareResult,
            },

            bossResult: {
              damage: 0,
              isWeakness: false,
            },

            streakBefore,
            streakAfter,

            rankReward:
              rankReward.xp > 0 ||
              rankReward.coins > 0 ?
                {
                  xp: rankReward.xp,
                  coins: rankReward.coins,
                  rankId: afterRank.id,
                } :
                null,

            source:
              data.source || 'timer',
          });


        transaction.create(
            recordRef,
            record,
        );


        /*
         * --------------------------------------------------------
         * ACTIVE TIMER DELETE
         * --------------------------------------------------------
         */

        const timerRef =
          userRef
              .collection('activeTimer')
              .doc('current');

        transaction.delete(timerRef);


        /*
         * --------------------------------------------------------
         * RETURN DATA
         * --------------------------------------------------------
         */

        responseData = {
          success: true,

          duplicate: false,

          recordId:
            recordRef.id,

          study: {
            minutes,

            subjectId,

            baseXp,

            xpMultiplier:
              multiplier,

            studyXp,

            earnedXp,

            earnedCoins,
          },

          player: {
            levelBefore:
              beforeLevel.level,

            levelAfter:
              afterLevel.level,

            levelUp:
              afterLevel.level >
              beforeLevel.level,

            xpBefore:
              beforeXp,

            xpAfter:
              afterXp,

            coinsBefore:
              beforeCoins,

            coinsAfter:
              afterCoins,
          },

          subject: {
            subjectId,

            levelBefore:
              beforeSubjectLevel.level,

            levelAfter:
              afterSubjectLevel.level,

            levelUp:
              afterSubjectLevel.level >
              beforeSubjectLevel.level,

            totalMinutes:
              afterSubjectMinutes,
          },

          rank: {
            before:
              beforeRank.id,

            beforeName:
              beforeRank.name,

            after:
              afterRank.id,

            afterName:
              afterRank.name,

            changed:
              beforeRank.id !==
              afterRank.id,

            seasonMinutes:
              afterSeasonMinutes,
          },

          quests: {
            daily:
              dailyResults,

            weekly:
              weeklyResult,

            rare:
              rareResult,
          },

          streak: {
            before:
              streakBefore,

            after:
              streakAfter,
          },

          rankReward:
            rankReward.xp > 0 ||
            rankReward.coins > 0 ?
              {
                xp: rankReward.xp,
                coins: rankReward.coins,
                rankId: afterRank.id,
              } :
              null,
        };
      });

      return responseData;
    },
);


/* ============================================================
 * 週ID
 * ============================================================ */

function getWeekId(date = new Date()) {
  const japanDate =
    new Date(
        new Intl.DateTimeFormat(
            'en-US',
            {
              timeZone: 'Asia/Tokyo',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            },
        ).format(date),
    );

  const day =
    japanDate.getDay();

  const diff =
    japanDate.getDate() -
    day +
    (day === 0 ? -6 : 1);

  const monday =
    new Date(japanDate);

  monday.setDate(diff);

  const year =
    monday.getFullYear();

  const month =
    String(monday.getMonth() + 1)
        .padStart(2, '0');

  const dayNumber =
    String(monday.getDate())
        .padStart(2, '0');

  return `${year}-${month}-${dayNumber}`;
}


/* ============================================================
 * ウィークリー初期化
 * ============================================================ */

exports.initializeWeeklyQuest = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const userRef =
        db.collection('users').doc(uid);

      const questRef =
        userRef
            .collection('quests')
            .doc(`weekly_${getWeekId()}`);

      const snap =
        await questRef.get();

      if (snap.exists) {
        return {
          success: true,
          created: false,
        };
      }

      await questRef.set({
        id: questRef.id,

        type: 'weekly',

        weekId:
          getWeekId(),

        targetMinutes:
          600,

        progressMinutes:
          0,

        completed:
          false,

        rewardXp:
          WEEKLY_REWARD.xp,

        rewardCoins:
          WEEKLY_REWARD.coins,

        createdAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        created: true,
      };
    },
);


/* ============================================================
 * レアクエスト生成
 *
 * 約5%。
 * 2時間 / 3時間 = 50:50
 * ============================================================ */

exports.tryGenerateRareQuest = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      if (Math.random() > 0.05) {
        return {
          success: true,
          generated: false,
        };
      }

      const today =
        getJapanDateString();

      const questRef =
        db.collection('users')
            .doc(uid)
            .collection('quests');

      const existing =
        await questRef
            .where('type', '==', 'rare')
            .where('date', '==', today)
            .limit(1)
            .get();

      if (!existing.empty) {
        return {
          success: true,
          generated: false,
        };
      }

      const minutes =
        Math.random() < 0.5 ?
          120 :
          180;

      const ref =
        questRef.doc(`rare_${today}`);

      await ref.set({
        id: ref.id,

        type: 'rare',

        date: today,

        minutes,

        progressMinutes: 0,

        completed: false,

        rewardXp:
          RARE_REWARDS[minutes].xp,

        rewardCoins:
          RARE_REWARDS[minutes].coins,

        rewardItems:
          RARE_REWARDS[minutes].items,

        createdAt:
          FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        generated: true,
        quest: {
          id: ref.id,
          minutes,
        },
      };
    },
);


/* ============================================================
 * 転生
 * ============================================================ */

exports.reincarnate = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const userRef =
        db.collection('users').doc(uid);

      let result = null;

      await db.runTransaction(async (transaction) => {
        const snap =
          await transaction.get(userRef);

        if (!snap.exists) {
          throw new HttpsError(
              'failed-precondition',
              'ユーザーデータがありません。',
          );
        }

        const profile =
          snap.data();

        const level =
          calculatePlayerLevel(
              Number(profile.xp) || 0,
          );

        if (level.level < 100) {
          throw new HttpsError(
              'failed-precondition',
              'Lv100に到達していません。',
          );
        }

        const stars =
          (Number(profile.stars) || 0) + 1;

        transaction.update(
            userRef,
            {
              level: 1,
              xp: 0,
              stars,

              updatedAt:
                FieldValue.serverTimestamp(),
            },
        );

        result = {
          success: true,
          stars,
          level: 1,
          xp: 0,
        };
      });

      return result;
    },
);


/* ============================================================
 * プレイヤー状態取得
 * ============================================================ */

exports.getPlayerState = onCall(
    async (request) => {
      const uid = assertSignedIn(request);

      const userRef =
        db.collection('users').doc(uid);

      const snap =
        await userRef.get();

      if (!snap.exists) {
        throw new HttpsError(
            'not-found',
            'プレイヤーが見つかりません。',
        );
      }

      const profile =
        snap.data();

      const xp =
        Number(profile.xp) || 0;

      const level =
        calculatePlayerLevel(xp);

      const seasonMinutes =
        Number(profile.seasonStudyMinutes) || 0;

      const rank =
        calculateRank(seasonMinutes);

      const rankProgress =
        getRankProgress(seasonMinutes);

      return {
        success: true,

        profile: {
          ...profile,

          level:
            level.level,

          xpProgress:
            level.progressXp,

          xpNext:
            level.nextXp,

          rank:
            rank.id,

          rankName:
            rank.name,

          rankProgress: {
            currentMinutes:
              rankProgress.currentMinutes,

            requiredMinutes:
              rankProgress.requiredMinutes,

            progressMinutes:
              rankProgress.progressMinutes,

            nextRank:
              rankProgress.nextRank?.id || null,

            nextRankName:
              rankProgress.nextRank?.name || null,
          },
        },
      };
    },
);
