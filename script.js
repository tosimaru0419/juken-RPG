/* =========================================================
   受験RPG - Main JavaScript
   HTML完全対応版
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

// ↓↓↓ 自分のSupabase情報に変更 ↓↓↓

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const { createClient } = supabase;

const db = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let selectedSubjects = [];

const SUBJECT_NAMES = {
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
  undecided: "未定"
};


/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function show(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}

function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

function setText(id, text) {
  const element = $(id);

  if (element) {
    element.textContent = text;
  }
}


/* =========================================================
   NOTIFICATION
   ========================================================= */

let notificationTimer = null;

function notify(message, duration = 2500) {
  const notification = $("notification");

  if (!notification) return;

  notification.textContent = message;
  show(notification);

  clearTimeout(notificationTimer);

  notificationTimer = setTimeout(() => {
    hide(notification);
  }, duration);
}


/* =========================================================
   AUTH SCREEN
   ========================================================= */

function showLoginScreen() {
  show($("login-screen"));
  hide($("register-screen"));

  clearError("login-error");
  clearError("register-error");
  clearError("subject-error");
}

function showRegisterScreen() {
  hide($("login-screen"));
  show($("register-screen"));

  clearError("login-error");
  clearError("register-error");
  clearError("subject-error");
}

function clearError(id) {
  const element = $(id);

  if (element) {
    element.textContent = "";
  }
}

function setError(id, message) {
  const element = $(id);

  if (element) {
    element.textContent = message;
  }
}


/* =========================================================
   AUTH NAVIGATION
   ========================================================= */

$("show-register-button")?.addEventListener(
  "click",
  () => {
    showRegisterScreen();
  }
);

$("show-login-button")?.addEventListener(
  "click",
  () => {
    showLoginScreen();
  }
);


/* =========================================================
   REGISTER
   ========================================================= */

$("register-form")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearError("register-error");
    clearError("subject-error");

    const userId =
      $("register-user-id")?.value.trim();

    const password =
      $("register-password")?.value;

    const passwordConfirm =
      $("register-password-confirm")?.value;

    const displayName =
      $("register-display-name")?.value.trim();

    const courseElement =
      document.querySelector(
        'input[name="course"]:checked'
      );

    const course =
      courseElement?.value || null;

    const subjectElements =
      document.querySelectorAll(
        'input[name="subjects"]:checked'
      );

    const subjects =
      Array.from(subjectElements)
        .map(input => input.value);


    /* -----------------------------
       Validation
       ----------------------------- */

    if (!userId) {
      setError(
        "register-error",
        "ユーザーIDを入力してください。"
      );
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(userId)) {
      setError(
        "register-error",
        "ユーザーIDは3〜30文字の英数字・_・-で入力してください。"
      );
      return;
    }

    if (!password || password.length < 6) {
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

    if (!course) {
      setError(
        "register-error",
        "文理を選択してください。"
      );
      return;
    }

    if (subjects.length === 0) {
      setError(
        "subject-error",
        "少なくとも1教科選択してください。"
      );
      return;
    }


    /* -----------------------------
       Disable button
       ----------------------------- */

    const button = $("register-button");

    if (button) {
      button.disabled = true;
      button.textContent = "登録中...";
    }


    try {

      /* -----------------------------
         Check duplicate user ID
         ----------------------------- */

      const { data: existingUser, error: checkError } =
        await db
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingUser) {
        throw new Error(
          "そのユーザーIDはすでに使用されています。"
        );
      }


      /* -----------------------------
         Supabase Auth
         ----------------------------- */

      const email =
        `${userId}@jukensei-rpg.local`;

      const {
        data: authData,
        error: authError
      } = await db.auth.signUp({
        email,
        password
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error(
          "ユーザー登録に失敗しました。"
        );
      }


      currentUser = authData.user;


      /* -----------------------------
         Profile
         ----------------------------- */

      const { data: profile, error: profileError } =
        await db
          .from("profiles")
          .insert({
            id: authData.user.id,
            user_id: userId,
            display_name: displayName,
            course: course,
            subjects: subjects,
            level: 1,
            xp: 0,
            stars: 0,
            title: "無名の冒険者"
          })
          .select()
          .single();

      if (profileError) {
        throw profileError;
      }

      currentProfile = profile;

      selectedSubjects = subjects;

      notify(
        "🎉 冒険者登録完了！"
      );

      await openMainApp();

    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      setError(
        "register-error",
        getErrorMessage(error)
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent = "冒険を始める";
      }
    }
  }
);


/* =========================================================
   LOGIN
   ========================================================= */

$("login-form")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearError("login-error");

    const userId =
      $("login-user-id")?.value.trim();

    const password =
      $("login-password")?.value;

    if (!userId || !password) {
      setError(
        "login-error",
        "ユーザーIDとパスワードを入力してください。"
      );
      return;
    }

    const button = $("login-button");

    if (button) {
      button.disabled = true;
      button.textContent = "ログイン中...";
    }

    try {

      const email =
        `${userId}@jukensei-rpg.local`;

      const {
        data,
        error
      } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      currentUser = data.user;

      await loadProfile();

      await openMainApp();

      notify("⚔️ 冒険を再開しました！");

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      setError(
        "login-error",
        "ユーザーIDまたはパスワードが正しくありません。"
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent = "ログイン";
      }
    }
  }
);


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadProfile() {

  if (!currentUser) {
    return;
  }

  const {
    data,
    error
  } = await db
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    throw error;
  }

  currentProfile = data;

  selectedSubjects =
    Array.isArray(data.subjects)
      ? data.subjects
      : [];
}


/* =========================================================
   OPEN MAIN APP
   ========================================================= */

async function openMainApp() {

  hide($("auth-screen"));
  show($("main-app"));

  updateAllProfileUI();

  populateStudySubjects();

  populateSettingsSubjects();

  await loadHomeData();
}


/* =========================================================
   LOGOUT
   ========================================================= */

$("logout-button")?.addEventListener(
  "click",
  async () => {

    try {

      await db.auth.signOut();

      currentUser = null;
      currentProfile = null;

      hide($("main-app"));
      show($("auth-screen"));

      showLoginScreen();

      $("login-form")?.reset();
      $("register-form")?.reset();

      notify("ログアウトしました。");

    } catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );
    }
  }
);


/* =========================================================
   NAVIGATION
   ========================================================= */

const navButtons =
  document.querySelectorAll(
    "#main-navigation .nav-button"
  );

const appScreens =
  document.querySelectorAll(
    ".app-screen"
  );

navButtons.forEach(button => {

  button.addEventListener(
    "click",
    async () => {

      const screenId =
        button.dataset.screen;

      if (!screenId) return;


      /* Hide all */

      appScreens.forEach(screen => {
        hide(screen);
      });


      /* Show selected */

      show($(screenId));


      /* Active button */

      navButtons.forEach(nav => {
        nav.classList.remove("active");
      });

      button.classList.add("active");


      /* Load screen data */

      try {

        switch (screenId) {

          case "home-screen":
            await loadHomeData();
            break;

          case "study-screen":
            await loadStudyData();
            break;

          case "quest-screen":
            await loadQuestData();
            break;

          case "boss-screen":
            await loadBossData();
            break;

          case "party-screen":
            await loadPartyData();
            break;

          case "rank-screen":
            await loadRankData();
            break;

          case "achievement-screen":
            await loadAchievementData();
            break;

          case "profile-screen":
            await loadProfileData();
            break;

          case "settings-screen":
            await loadSettingsData();
            break;
        }

      } catch (error) {

        console.error(
          "SCREEN LOAD ERROR:",
          error
        );
      }
    }
  );
});


/* =========================================================
   PROFILE UI
   ========================================================= */

function updateAllProfileUI() {

  if (!currentProfile) return;

  const profile =
    currentProfile;

  const level =
    Number(profile.level ?? 1);

  const xp =
    Number(profile.xp ?? 0);

  const stars =
    Number(profile.stars ?? 0);

  const displayName =
    profile.display_name || "冒険者";

  const title =
    profile.title || "無名の冒険者";


  /* Header */

  setText(
    "header-display-name",
    displayName
  );

  setText(
    "header-level",
    `Lv.${level}`
  );

  setText(
    "header-rank",
    calculateRank(profile)
  );


  /* Home */

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
    title
  );


  /* Profile */

  setText(
    "profile-display-name",
    displayName
  );

  setText(
    "profile-user-id",
    profile.user_id || "-"
  );

  setText(
    "profile-course",
    COURSE_NAMES[profile.course]
      || "-"
  );

  setText(
    "profile-level",
    level
  );

  setText(
    "profile-stars",
    stars
  );

  setText(
    "profile-title",
    title
  );

  updateLevelProgress();
}


/* =========================================================
   LEVEL SYSTEM
   ========================================================= */

function xpRequiredForLevel(level) {

  if (level <= 1) {
    return 100;
  }

  return 100;
}

function updateLevelProgress() {

  if (!currentProfile) return;

  const level =
    Number(currentProfile.level ?? 1);

  const xp =
    Number(currentProfile.xp ?? 0);

  const required =
    xpRequiredForLevel(level);

  const progress =
    Math.min(
      100,
      Math.max(
        0,
        (xp / required) * 100
      )
    );

  const bar =
    $("level-progress");

  if (bar) {
    bar.style.width =
      `${progress}%`;
  }

  setText(
    "home-xp-required",
    `次のレベルまで ${Math.max(
      0,
      required - xp
    )} XP`
  );
}


/* =========================================================
   RANK
   ========================================================= */

function calculateRank(profile) {

  const minutes =
    Number(
      profile?.total_study_minutes ?? 0
    );

  if (minutes >= 1500) return "Legend";
  if (minutes >= 1000) return "Grandmaster";
  if (minutes >= 750) return "Master";
  if (minutes >= 500) return "Diamond";
  if (minutes >= 300) return "Platinum";
  if (minutes >= 200) return "Gold";
  if (minutes >= 100) return "Silver";

  return "Bronze";
}


/* =========================================================
   STUDY SUBJECT SELECT
   ========================================================= */

function populateStudySubjects() {

  const select =
    $("study-subject");

  if (!select) return;

  select.innerHTML = "";

  const defaultOption =
    document.createElement("option");

  defaultOption.value = "";
  defaultOption.textContent =
    "教科を選択";

  select.appendChild(
    defaultOption
  );


  selectedSubjects.forEach(subject => {

    const option =
      document.createElement("option");

    option.value = subject;

    option.textContent =
      SUBJECT_NAMES[subject]
      || subject;

    select.appendChild(option);
  });
}


/* =========================================================
   SETTINGS SUBJECTS
   ========================================================= */

function populateSettingsSubjects() {

  const container =
    $("settings-subject-selection");

  if (!container) return;

  container.innerHTML = "";

  Object.entries(
    SUBJECT_NAMES
  ).forEach(
    ([value, name]) => {

      const label =
        document.createElement("label");

      const input =
        document.createElement("input");

      input.type = "checkbox";
      input.name = "settingsSubjects";
      input.value = value;

      if (
        selectedSubjects.includes(value)
      ) {
        input.checked = true;
      }

      const span =
        document.createElement("span");

      span.textContent = name;

      label.appendChild(input);
      label.appendChild(span);

      container.appendChild(label);
    }
  );
}


/* =========================================================
   STUDY RECORD
   ========================================================= */

$("study-record-form")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearError("study-error");

    if (!currentUser) return;

    const subject =
      $("study-subject")?.value;

    const minutes =
      Number(
        $("study-minutes")?.value
      );

    const note =
      $("study-note")?.value.trim();


    if (!subject) {

      setError(
        "study-error",
        "教科を選択してください。"
      );

      return;
    }

    if (
      !Number.isFinite(minutes) ||
      minutes < 1
    ) {

      setError(
        "study-error",
        "勉強時間を正しく入力してください。"
      );

      return;
    }


    const button =
      $("record-study-button");

    if (button) {
      button.disabled = true;
      button.textContent = "記録中...";
    }


    try {

      const xp =
        minutes;


      const {
        error
      } = await db
        .from("study_records")
        .insert({
          user_id: currentUser.id,
          subject: subject,
          minutes: minutes,
          xp: xp,
          note: note || null
        });


      if (error) {
        throw error;
      }


      /* Profile update */

      const oldXp =
        Number(currentProfile.xp ?? 0);

      const oldMinutes =
        Number(
          currentProfile.total_study_minutes ?? 0
        );

      const newXp =
        oldXp + xp;

      const newMinutes =
        oldMinutes + minutes;


      const newLevel =
        Math.floor(
          newXp / 100
        ) + 1;


      const {
        data: updatedProfile,
        error: updateError
      } = await db
        .from("profiles")
        .update({
          xp: newXp,
          level: newLevel,
          total_study_minutes: newMinutes
        })
        .eq("id", currentUser.id)
        .select()
        .single();


      if (updateError) {
        throw updateError;
      }


      const oldLevel =
        Number(
          currentProfile.level ?? 1
        );


      currentProfile =
        updatedProfile;


      updateAllProfileUI();


      if (newLevel > oldLevel) {

        showLevelUpModal(
          oldLevel,
          newLevel
        );
      }


      $("study-record-form")?.reset();

      notify(
        `📚 ${minutes}分記録！ +${xp} XP`
      );


      await loadStudyData();

    } catch (error) {

      console.error(
        "STUDY ERROR:",
        error
      );

      setError(
        "study-error",
        getErrorMessage(error)
      );

    } finally {

      if (button) {
        button.disabled = false;
        button.textContent =
          "勉強を記録する";
      }
    }
  }
);


/* =========================================================
   STUDY DATA
   ========================================================= */

async function loadStudyData() {

  if (!currentUser) return;

  const {
    data,
    error
  } = await db
    .from("study_records")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", {
      ascending: false
    });

  if (error) {
    console.error(error);
    return;
  }


  renderStudyHistory(data || []);
  renderSubjectStudy(data || []);
}


function renderStudyHistory(records) {

  const list =
    $("study-history-list");

  if (!list) return;

  if (!records.length) {

    list.innerHTML =
      `<p class="empty-message">
        まだ勉強記録がありません。
      </p>`;

    return;
  }


  list.innerHTML =
    records
      .slice(0, 30)
      .map(record => {

        const subject =
          SUBJECT_NAMES[
            record.subject
          ] || record.subject;

        const date =
          formatDate(
            record.created_at
          );

        return `
          <div class="study-history-item">
            <strong>${escapeHTML(subject)}</strong>
            <div>${record.minutes}分 / +${record.xp ?? record.minutes} XP</div>
            <small>${date}</small>
            ${
              record.note
                ? `<p>${escapeHTML(record.note)}</p>`
                : ""
            }
          </div>
        `;
      })
      .join("");
}


function renderSubjectStudy(records) {

  const list =
    $("subject-study-list");

  if (!list) return;


  const totals = {};


  records.forEach(record => {

    const subject =
      record.subject;

    totals[subject] =
      (totals[subject] || 0)
      + Number(record.minutes || 0);
  });


  if (!Object.keys(totals).length) {

    list.innerHTML =
      `<p class="empty-message">
        まだ記録がありません。
      </p>`;

    return;
  }


  list.innerHTML =
    Object.entries(totals)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .map(
        ([subject, minutes]) => `
          <div class="subject-study-item">
            <span>
              ${escapeHTML(
                SUBJECT_NAMES[subject]
                || subject
              )}
            </span>

            <strong>
              ${minutes}分
            </strong>
          </div>
        `
      )
      .join("");
}


/* =========================================================
   HOME DATA
   ========================================================= */

async function loadHomeData() {

  if (!currentUser) return;

  try {

    const {
      data: records
    } = await db
      .from("study_records")
      .select("*")
      .eq("user_id", currentUser.id);


    const today =
      new Date();

    const todayString =
      today.toISOString()
        .slice(0, 10);


    const todayRecords =
      (records || [])
        .filter(record => {

          return (
            record.created_at
              ?.slice(0, 10)
            === todayString
          );
        });


    const studyMinutes =
      todayRecords.reduce(
        (sum, record) =>
          sum +
          Number(record.minutes || 0),
        0
      );


    const xp =
      todayRecords.reduce(
        (sum, record) =>
          sum +
          Number(
            record.xp ??
            record.minutes ??
            0
          ),
        0
      );


    setText(
      "today-study-time",
      `${studyMinutes}分`
    );

    setText(
      "today-xp",
      `${xp} XP`
    );


    /* Quest */

    setText(
      "today-quests",
      "0"
    );

  } catch (error) {

    console.error(
      "HOME ERROR:",
      error
    );
  }
}


/* =========================================================
   QUEST
   ========================================================= */

async function loadQuestData() {

  if (!currentUser) return;

  const dailyList =
    $("daily-quest-list");

  const weeklyList =
    $("weekly-quest-list");

  const historyList =
    $("quest-history-list");


  if (dailyList) {

    dailyList.innerHTML = `
      <div class="quest-card">
        <h4>📚 今日の勉強</h4>
        <p>今日の勉強時間を積み上げよう。</p>
        <span class="quest-reward">
          報酬：XP
        </span>
      </div>
    `;
  }


  if (weeklyList) {

    weeklyList.innerHTML = `
      <div class="quest-card">
        <h4>🔥 今週の冒険</h4>
        <p>一週間継続して勉強しよう。</p>
        <span class="quest-reward">
          報酬：⭐
        </span>
      </div>
    `;
  }


  if (historyList) {

    historyList.innerHTML =
      `<p class="empty-message">
        クエスト履歴は準備中です。
      </p>`;
  }
}


/* =========================================================
   BOSS
   ========================================================= */

async function loadBossData() {

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
    "ランダム"
  );

  setText(
    "boss-weakness-multiplier",
    "×1.5"
  );


  const partyList =
    $("boss-party-member-list");

  if (partyList) {

    partyList.innerHTML =
      `<p class="empty-message">
        パーティー情報を読み込み中...
      </p>`;
  }
}


/* =========================================================
   PARTY
   ========================================================= */

async function loadPartyData() {

  const list =
    $("party-member-list");

  if (!list) return;

  list.innerHTML =
    `<p class="empty-message">
      現在パーティー機能を準備中です。
    </p>`;

  setText(
    "party-member-count",
    "0人"
  );
}


/* =========================================================
   RANK
   ========================================================= */

async function loadRankData() {

  if (!currentProfile) return;

  const rank =
    calculateRank(currentProfile);

  setText(
    "current-rank-name",
    rank
  );

  setText(
    "home-rank",
    rank
  );

  setText(
    "header-rank",
    rank
  );

  setText(
    "current-season-time",
    "-"
  );
}


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

async function loadAchievementData() {

  const list =
    $("achievement-list");

  if (!list) return;

  list.innerHTML = `
    <div class="achievement-card unlocked">
      <div class="achievement-icon">🌱</div>

      <div>
        <h4>冒険者誕生</h4>
        <p>
          受験RPGに登録した。
        </p>
      </div>
    </div>

    <div class="achievement-card locked">
      <div class="achievement-icon">📚</div>

      <div>
        <h4>第一歩</h4>
        <p>
          勉強時間を記録する。
        </p>
      </div>
    </div>

    <div class="achievement-card locked">
      <div class="achievement-icon">🔥</div>

      <div>
        <h4>継続の力</h4>
        <p>
          7日間勉強を続ける。
        </p>
      </div>
    </div>
  `;

  setText(
    "achievement-count",
    "1 / 3"
  );
}


/* =========================================================
   PROFILE DATA
   ========================================================= */

async function loadProfileData() {

  if (!currentProfile) {
    await loadProfile();
  }

  updateAllProfileUI();


  const subjects =
    $("profile-subject-list");

  if (!subjects) return;


  if (!selectedSubjects.length) {

    subjects.innerHTML =
      `<p class="empty-message">-</p>`;

    return;
  }


  subjects.innerHTML =
    selectedSubjects
      .map(
        subject => `
          <span class="profile-subject">
            ${escapeHTML(
              SUBJECT_NAMES[subject]
              || subject
            )}
          </span>
        `
      )
      .join("");


  setText(
    "profile-total-study-time",
    `${currentProfile.total_study_minutes ?? 0}分`
  );

  setText(
    "profile-total-xp",
    `${currentProfile.xp ?? 0} XP`
  );

  setText(
    "profile-bosses-defeated",
    currentProfile.bosses_defeated ?? 0
  );

  setText(
    "profile-quests-completed",
    currentProfile.quests_completed ?? 0
  );
}


/* =========================================================
   SETTINGS
   ========================================================= */

async function loadSettingsData() {

  if (!currentProfile) {
    await loadProfile();
  }

  const input =
    $("settings-display-name");

  if (input) {
    input.value =
      currentProfile.display_name || "";
  }

  populateSettingsSubjects();
}


/* =========================================================
   DISPLAY NAME UPDATE
   ========================================================= */

$("display-name-form")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearError("display-name-error");

    const name =
      $("settings-display-name")
        ?.value.trim();

    if (!name) {

      setError(
        "display-name-error",
        "表示名を入力してください。"
      );

      return;
    }


    try {

      const {
        data,
        error
      } = await db
        .from("profiles")
        .update({
          display_name: name
        })
        .eq("id", currentUser.id)
        .select()
        .single();


      if (error) {
        throw error;
      }

      currentProfile = data;

      updateAllProfileUI();

      notify(
        "表示名を変更しました！"
      );

    } catch (error) {

      console.error(error);

      setError(
        "display-name-error",
        getErrorMessage(error)
      );
    }
  }
);


/* =========================================================
   SUBJECT UPDATE
   ========================================================= */

$("subject-settings-form")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearError(
      "settings-subject-error"
    );


    const inputs =
      document.querySelectorAll(
        'input[name="settingsSubjects"]:checked'
      );

    const subjects =
      Array.from(inputs)
        .map(input => input.value);


    if (!subjects.length) {

      setError(
        "settings-subject-error",
        "少なくとも1教科選択してください。"
      );

      return;
    }


    try {

      const {
        data,
        error
      } = await db
        .from("profiles")
        .update({
          subjects: subjects
        })
        .eq("id", currentUser.id)
        .select()
        .single();


      if (error) {
        throw error;
      }

      currentProfile = data;

      selectedSubjects =
        subjects;

      populateStudySubjects();

      notify(
        "受験教科を更新しました！"
      );

    } catch (error) {

      console.error(error);

      setError(
        "settings-subject-error",
        getErrorMessage(error)
      );
    }
  }
);


/* =========================================================
   PASSWORD CHANGE
   ========================================================= */

$("password-form")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearError("password-error");

    const password =
      $("settings-new-password")
        ?.value;


    if (!password || password.length < 6) {

      setError(
        "password-error",
        "パスワードは6文字以上にしてください。"
      );

      return;
    }


    try {

      const {
        error
      } = await db.auth.updateUser({
        password
      });

      if (error) {
        throw error;
      }

      $("password-form")?.reset();

      notify(
        "パスワードを変更しました！"
      );

    } catch (error) {

      console.error(error);

      setError(
        "password-error",
        getErrorMessage(error)
      );
    }
  }
);


/* =========================================================
   DELETE ACCOUNT
   ========================================================= */

$("delete-account-button")?.addEventListener(
  "click",
  async () => {

    const confirmed =
      confirm(
        "本当にアカウントを削除しますか？\nこの操作は取り消せません。"
      );

    if (!confirmed) return;

    alert(
      "現在のバージョンでは安全のためアカウント削除処理を停止しています。"
    );
  }
);


/* =========================================================
   PARTY INVITE
   ========================================================= */

$("party-invite-form")?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearError("party-error");

    const userId =
      $("party-invite-user-id")
        ?.value.trim();

    if (!userId) {

      setError(
        "party-error",
        "招待するユーザーIDを入力してください。"
      );

      return;
    }

    notify(
      "パーティー招待機能は準備中です。"
    );
  }
);


/* =========================================================
   BOSS REFRESH
   ========================================================= */

$("boss-refresh-button")?.addEventListener(
  "click",
  async () => {

    await loadBossData();

    notify(
      "👹 ボス情報を更新しました！"
    );
  }
);


/* =========================================================
   LEVEL UP MODAL
   ========================================================= */

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


$("level-up-close-button")?.addEventListener(
  "click",
  () => {
    hide($("level-up-modal"));
  }
);


/* =========================================================
   STAR MODAL
   ========================================================= */

$("star-modal-close-button")?.addEventListener(
  "click",
  () => {
    hide($("star-modal"));
  }
);


/* =========================================================
   BOSS RESULT MODAL
   ========================================================= */

$("boss-result-close-button")?.addEventListener(
  "click",
  () => {
    hide($("boss-result-modal"));
  }
);


/* =========================================================
   SEASON RESULT MODAL
   ========================================================= */

$("season-result-close-button")?.addEventListener(
  "click",
  () => {
    hide($("season-result-modal"));
  }
);


/* =========================================================
   AUTO LOGIN
   ========================================================= */

async function initializeApp() {

  try {

    const {
      data: {
        session
      }
    } = await db.auth.getSession();


    if (session?.user) {

      currentUser =
        session.user;

      await loadProfile();

      await openMainApp();

    } else {

      show($("auth-screen"));
      hide($("main-app"));

      showLoginScreen();
    }


    db.auth.onAuthStateChange(
      async (_event, session) => {

        if (
          session?.user &&
          !currentUser
        ) {

          currentUser =
            session.user;

          try {

            await loadProfile();

            await openMainApp();

          } catch (error) {

            console.error(error);
          }

        }
      }
    );

  } catch (error) {

    console.error(
      "INITIALIZATION ERROR:",
      error
    );

    show($("auth-screen"));
    hide($("main-app"));
  }
}


/* =========================================================
   UTILITY
   ========================================================= */

function formatDate(dateString) {

  if (!dateString) {
    return "-";
  }

  const date =
    new Date(dateString);

  return date.toLocaleString(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function escapeHTML(value) {

  if (value === null ||
      value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getErrorMessage(error) {

  if (!error) {
    return "予期しないエラーが発生しました。";
  }

  if (
    error.message?.includes(
      "already registered"
    )
  ) {
    return "このユーザーはすでに登録されています。";
  }

  if (
    error.message?.includes(
      "duplicate"
    )
  ) {
    return "すでに使用されているIDです。";
  }

  return (
    error.message ||
    "エラーが発生しました。"
  );
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    initializeApp();
  }
);
