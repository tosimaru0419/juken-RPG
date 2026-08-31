// ============================================================
// 受験RPG - Main JavaScript
// ============================================================

// ============================================================
// SUPABASE
// ============================================================

const SUPABASE_URL =
  "https://iuvahxijknuisndqcfmp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_0cb06S_AzQXMA1RCPMC7Kg_l2Z-7dvZ";

const { createClient } = window.supabase;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ============================================================
// DOM
// ============================================================

const $ = (id) => document.getElementById(id);

const authScreen = $("auth-screen");
const loginScreen = $("login-screen");
const registerScreen = $("register-screen");

const loginForm = $("login-form");
const registerForm = $("register-form");

const loginError = $("login-error");
const registerError = $("register-error");
const subjectError = $("subject-error");

const showRegisterButton = $("show-register-button");
const showLoginButton = $("show-login-button");

const mainApp = $("main-app");
const logoutButton = $("logout-button");


// ============================================================
// CONSTANTS
// ============================================================

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


// ============================================================
// UTILITY
// ============================================================

function showError(element, message) {
  if (!element) return;
  element.textContent = message || "";
}

function clearErrors() {
  showError(loginError, "");
  showError(registerError, "");
  showError(subjectError, "");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showLoginScreen() {
  loginScreen.classList.remove("hidden");
  registerScreen.classList.add("hidden");
  clearErrors();
}

function showRegisterScreen() {
  loginScreen.classList.add("hidden");
  registerScreen.classList.remove("hidden");
  clearErrors();
}

function showMainApp() {
  authScreen.classList.add("hidden");
  mainApp.classList.remove("hidden");
}

function showAuthScreen() {
  mainApp.classList.add("hidden");
  authScreen.classList.remove("hidden");
  showLoginScreen();
}

function userIdToEmail(userId) {
  return `${userId.toLowerCase()}@jukensrpg.local`;
}


// ============================================================
// VALIDATION
// ============================================================

function validateUserId(userId) {

  if (!userId) {
    return "ユーザーIDを入力してください。";
  }

  if (userId.length < 3) {
    return "ユーザーIDは3文字以上にしてください。";
  }

  if (userId.length > 30) {
    return "ユーザーIDは30文字以内にしてください。";
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return "ユーザーIDは英数字・_・-のみ使用できます。";
  }

  return null;
}


function validatePassword(password) {

  if (!password) {
    return "パスワードを入力してください。";
  }

  if (password.length < 6) {
    return "パスワードは6文字以上にしてください。";
  }

  return null;
}


function validateDisplayName(displayName) {

  if (!displayName) {
    return "表示名を入力してください。";
  }

  if (displayName.length > 30) {
    return "表示名は30文字以内にしてください。";
  }

  return null;
}


// ============================================================
// SUBJECTS
// ============================================================

function getSelectedSubjects() {

  return Array.from(
    document.querySelectorAll(
      '#subject-selection input[name="subjects"]:checked'
    )
  ).map(input => input.value);
}


async function loadSubjects(userId) {

  const {
    data,
    error
  } = await supabase
    .from("player_subjects")
    .select("subject")
    .eq("user_id", userId)
    .order("created_at");

  if (error) {
    throw error;
  }

  const subjects = data || [];

  // Study select
  const select = $("study-subject");

  if (select) {

    select.innerHTML = `
      <option value="">
        教科を選択
      </option>
    `;

    subjects.forEach(row => {

      const option =
        document.createElement("option");

      option.value = row.subject;
      option.textContent =
        SUBJECT_NAMES[row.subject] || row.subject;

      select.appendChild(option);

    });
  }


  // Profile
  const profileList =
    $("profile-subject-list");

  if (profileList) {

    profileList.innerHTML = "";

    subjects.forEach(row => {

      const div =
        document.createElement("div");

      div.className = "profile-subject";

      div.textContent =
        SUBJECT_NAMES[row.subject] || row.subject;

      profileList.appendChild(div);

    });
  }


  // Settings
  const settingsList =
    $("settings-subject-selection");

  if (settingsList) {

    settingsList.innerHTML = "";

    subjects.forEach(row => {

      const label =
        document.createElement("label");

      label.innerHTML = `
        <input
          type="checkbox"
          name="subjects"
          value="${row.subject}"
          checked
        >
        ${SUBJECT_NAMES[row.subject] || row.subject}
      `;

      settingsList.appendChild(label);

    });
  }

  return subjects;
}


// ============================================================
// COURSE
// ============================================================

function getCourseName(course) {

  const names = {
    science: "理系",
    humanities: "文系",
    undecided: "未定・その他"
  };

  return names[course] || course || "未設定";
}


// ============================================================
// LEVEL SYSTEM
// ============================================================

/*
  受験RPG

  XPは累計XPではなく現在レベル内XPとして扱う。

  Lv1 -> 60 XP
  Lv2 -> 100 XP
  ...
  
  100レベルまでの土台。
*/

function getRequiredXP(level) {

  if (level >= 100) {
    return Infinity;
  }

  // 初期は100XPを基本にする
  // Lv1だけ60XP
  if (level === 1) {
    return 60;
  }

  return 100;
}


function calculateLevelFromXP(totalXP) {

  let level = 1;
  let remainingXP = Number(totalXP || 0);

  while (level < 100) {

    const required =
      getRequiredXP(level);

    if (remainingXP < required) {
      break;
    }

    remainingXP -= required;
    level++;
  }

  return {
    level,
    currentXP: remainingXP,
    requiredXP: getRequiredXP(level)
  };
}


// ============================================================
// RANK
// ============================================================

function getRankName(profile) {

  const minutes =
    Number(profile?.total_study_minutes || 0);

  if (minutes >= 300) {
    return "Platinum";
  }

  if (minutes >= 200) {
    return "Gold";
  }

  if (minutes >= 100) {
    return "Silver";
  }

  return "Bronze";
}


function getRankByMinutes(minutes) {

  if (minutes >= 300) return "Platinum";
  if (minutes >= 200) return "Gold";
  if (minutes >= 100) return "Silver";

  return "Bronze";
}


// ============================================================
// TIME
// ============================================================

function formatStudyTime(minutes) {

  const total =
    Number(minutes || 0);

  const hours =
    Math.floor(total / 60);

  const mins =
    total % 60;

  if (hours === 0) {
    return `${mins}分`;
  }

  if (mins === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${mins}分`;
}


// ============================================================
// PROFILE UI
// ============================================================

function updateProfileUI(profile) {

  if (!profile) return;

  const level =
    Number(profile.level || 1);

  const xp =
    Number(profile.xp || 0);

  const requiredXP =
    getRequiredXP(level);

  const rank =
    getRankName(profile);


  // Header

  if ($("header-display-name")) {
    $("header-display-name").textContent =
      profile.display_name || profile.user_id;
  }

  if ($("header-level")) {
    $("header-level").textContent =
      `Lv.${level}`;
  }

  if ($("header-rank")) {
    $("header-rank").textContent =
      rank;
  }


  // Home

  if ($("home-level")) {
    $("home-level").textContent =
      level;
  }

  if ($("home-xp")) {
    $("home-xp").textContent =
      `${xp} XP`;
  }

  if ($("home-xp-required")) {

    if (level >= 100) {

      $("home-xp-required").textContent =
        "MAX LEVEL";

    } else {

      $("home-xp-required").textContent =
        `次のLvまで ${Math.max(
          0,
          requiredXP - xp
        )} XP`;

    }
  }


  if ($("level-progress")) {

    let percent = 0;

    if (level < 100 && requiredXP !== Infinity) {
      percent =
        Math.min(
          100,
          (xp / requiredXP) * 100
        );
    } else {
      percent = 100;
    }

    $("level-progress").style.width =
      `${percent}%`;
  }


  // Profile

  if ($("profile-display-name")) {
    $("profile-display-name").textContent =
      profile.display_name || "プレイヤー";
  }

  if ($("profile-user-id")) {
    $("profile-user-id").textContent =
      profile.user_id || "---";
  }

  if ($("profile-course")) {
    $("profile-course").textContent =
      getCourseName(profile.course);
  }

  if ($("profile-level")) {
    $("profile-level").textContent =
      level;
  }

  if ($("profile-stars")) {
    $("profile-stars").textContent =
      profile.stars || 0;
  }

  if ($("profile-title")) {
    $("profile-title").textContent =
      profile.title || "旅立ちし者";
  }

  if ($("profile-total-study-time")) {
    $("profile-total-study-time").textContent =
      formatStudyTime(profile.total_study_minutes);
  }

  if ($("profile-total-xp")) {
    $("profile-total-xp").textContent =
      `${profile.total_xp || 0} XP`;
  }

  if ($("profile-bosses-defeated")) {
    $("profile-bosses-defeated").textContent =
      profile.bosses_defeated || 0;
  }

  if ($("profile-quests-completed")) {
    $("profile-quests-completed").textContent =
      profile.quests_completed || 0;
  }


  // Season / rank

  if ($("home-season-rank")) {
    $("home-season-rank").textContent =
      rank;
  }

  if ($("current-rank-name")) {
    $("current-rank-name").textContent =
      rank;
  }

  if ($("current-season-time")) {
    $("current-season-time").textContent =
      formatStudyTime(profile.total_study_minutes);
  }

  if ($("home-season-study-time")) {
    $("home-season-study-time").textContent =
      formatStudyTime(profile.total_study_minutes);
  }
}


// ============================================================
// LOAD PLAYER
// ============================================================

let currentUser = null;
let currentProfile = null;


async function loadPlayer() {

  try {

    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();


    if (!user) {

      showAuthScreen();

      return;

    }


    currentUser = user;


    const {
      data: profile,
      error
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();


    if (error) {
      throw error;
    }


    currentProfile = profile;


    updateProfileUI(profile);


    await loadSubjects(user.id);

    await loadStudyHistory(user.id);

    await loadSubjectStudySummary(user.id);

    await updateTodaySummary(user.id);


    showMainApp();


  } catch (error) {

    console.error(
      "Load player error:",
      error
    );

    showError(
      loginError,
      "プレイヤーデータの読み込みに失敗しました。"
    );
  }
}


// ============================================================
// REGISTER
// ============================================================

registerForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearErrors();

    const userId =
      $("register-user-id").value.trim();

    const password =
      $("register-password").value;

    const passwordConfirm =
      $("register-password-confirm").value;

    const displayName =
      $("register-display-name").value.trim();

    const courseInput =
      document.querySelector(
        '#register-form input[name="course"]:checked'
      );

    const course =
      courseInput
        ? courseInput.value
        : null;

    const subjects =
      getSelectedSubjects();


    // Validation

    const userIdError =
      validateUserId(userId);

    if (userIdError) {
      showError(registerError, userIdError);
      return;
    }


    const passwordError =
      validatePassword(password);

    if (passwordError) {
      showError(registerError, passwordError);
      return;
    }


    if (password !== passwordConfirm) {

      showError(
        registerError,
        "パスワードが一致していません。"
      );

      return;
    }


    const displayNameError =
      validateDisplayName(displayName);

    if (displayNameError) {

      showError(
        registerError,
        displayNameError
      );

      return;
    }


    if (!course) {

      showError(
        registerError,
        "文理を選択してください。"
      );

      return;
    }


    if (subjects.length === 0) {

      showError(
        subjectError,
        "受験教科を1つ以上選択してください。"
      );

      return;
    }


    const button =
      $("register-button");

    button.disabled = true;
    button.textContent = "登録中...";


    try {

      const email =
        userIdToEmail(userId);


      const {
        data,
        error
      } = await supabase.auth.signUp({

        email,
        password,

        options: {

          data: {
            user_id: userId,
            display_name: displayName
          }

        }

      });


      if (error) {
        throw error;
      }


      if (!data.user) {
        throw new Error(
          "ユーザー登録に失敗しました。"
        );
      }


      const userUuid =
        data.user.id;


      // Triggerでprofilesが作られるまで待つ

      let profile = null;

      for (let i = 0; i < 10; i++) {

        const {
          data: profileData,
          error: profileError
        } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userUuid)
          .maybeSingle();


        if (profileError) {
          throw profileError;
        }


        if (profileData) {

          profile = profileData;

          break;
        }


        await sleep(300);
      }


      if (!profile) {

        throw new Error(
          "プロフィールの作成を確認できませんでした。"
        );
      }


      // 教科保存

      const subjectRows =
        subjects.map(subject => ({
          user_id: userUuid,
          subject
        }));


      const {
        error: subjectErrorDB
      } = await supabase
        .from("player_subjects")
        .insert(subjectRows);


      if (subjectErrorDB) {
        throw subjectErrorDB;
      }


      alert(
        "🎉 冒険者登録完了！\n\n受験RPGへようこそ！"
      );


      await loadPlayer();


    } catch (error) {

      console.error(
        "Registration error:",
        error
      );


      let message =
        "登録中にエラーが発生しました。";


      if (
        error.message &&
        (
          error.message.includes(
            "USER_ID_ALREADY_EXISTS"
          ) ||
          error.message.includes(
            "duplicate"
          ) ||
          error.message.includes(
            "already exists"
          )
        )
      ) {

        message =
          "そのユーザーIDは既に使用されています。";

      } else if (error.message) {

        message =
          error.message;

      }


      showError(
        registerError,
        message
      );


    } finally {

      button.disabled = false;
      button.textContent = "冒険を始める";

    }

  }
);


// ============================================================
// LOGIN
// ============================================================

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearErrors();

    const userId =
      $("login-user-id").value.trim();

    const password =
      $("login-password").value;


    const userIdError =
      validateUserId(userId);

    if (userIdError) {

      showError(
        loginError,
        userIdError
      );

      return;
    }


    const passwordError =
      validatePassword(password);

    if (passwordError) {

      showError(
        loginError,
        passwordError
      );

      return;
    }


    const button =
      $("login-button");

    button.disabled = true;
    button.textContent = "ログイン中...";


    try {

      const email =
        userIdToEmail(userId);


      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({

        email,
        password

      });


      if (error) {
        throw error;
      }


      if (!data.user) {
        throw new Error(
          "ログインに失敗しました。"
        );
      }


      await loadPlayer();


    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      showError(
        loginError,
        "ユーザーIDまたはパスワードが間違っています。"
      );


    } finally {

      button.disabled = false;
      button.textContent = "ログイン";

    }

  }
);


// ============================================================
// LOGOUT
// ============================================================

logoutButton.addEventListener(
  "click",
  async () => {

    try {

      const {
        error
      } = await supabase.auth.signOut();


      if (error) {
        throw error;
      }


      currentUser = null;
      currentProfile = null;

      showAuthScreen();


    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

      alert(
        "ログアウトに失敗しました。"
      );
    }

  }
);


// ============================================================
// LOGIN / REGISTER SWITCH
// ============================================================

showRegisterButton.addEventListener(
  "click",
  showRegisterScreen
);


showLoginButton.addEventListener(
  "click",
  showLoginScreen
);


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

  const buttons =
    document.querySelectorAll(
      "#main-navigation .nav-button"
    );


  const screens =
    document.querySelectorAll(
      ".app-screen"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const targetId =
          button.dataset.screen;


        screens.forEach(screen => {

          screen.classList.add("hidden");

        });


        const target =
          $(targetId);

        if (target) {
          target.classList.remove("hidden");
        }


        buttons.forEach(btn => {

          btn.classList.remove("active");

        });


        button.classList.add("active");

      }
    );

  });

}


// ============================================================
// STUDY RECORD
// ============================================================

async function recordStudy(
  userId,
  subject,
  minutes,
  note
) {

  /*
    study_records テーブルを想定。

    user_id
    subject
    minutes
    note
    created_at
  */

  const {
    error
  } = await supabase
    .from("study_records")
    .insert({

      user_id: userId,
      subject,
      minutes,
      note: note || null

    });


  if (error) {
    throw error;
  }
}


async function addXP(
  userId,
  amount
) {

  const {
    data: profile,
    error
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();


  if (error) {
    throw error;
  }


  const oldLevel =
    Number(profile.level || 1);

  const oldTotalXP =
    Number(profile.total_xp || 0);

  const newTotalXP =
    oldTotalXP + amount;


  const levelData =
    calculateLevelFromXP(newTotalXP);


  /*
    DBにtotal_xpがある場合は、
    total_xpを累計値として保存。

    xpは現在レベル内XP。
  */

  const {
    error: updateError
  } = await supabase
    .from("profiles")
    .update({

      total_xp: newTotalXP,
      xp: levelData.currentXP,
      level: levelData.level

    })
    .eq("id", userId);


  if (updateError) {
    throw updateError;
  }


  if (levelData.level > oldLevel) {

    showLevelUpModal(
      oldLevel,
      levelData.level
    );

  }


  return levelData;
}


function showLevelUpModal(
  oldLevel,
  newLevel
) {

  const modal =
    $("level-up-modal");

  if (!modal) return;


  if ($("level-up-old-level")) {

    $("level-up-old-level")
      .textContent =
      `Lv.${oldLevel}`;

  }


  if ($("level-up-new-level")) {

    $("level-up-new-level")
      .textContent =
      `Lv.${newLevel}`;

  }


  if ($("level-up-message")) {

    $("level-up-message")
      .textContent =
      `おめでとう！ Lv.${newLevel} に到達！`;

  }


  modal.classList.remove("hidden");
}


if ($("level-up-close")) {

  $("level-up-close")
    .addEventListener(
      "click",
      () => {

        $("level-up-modal")
          .classList.add("hidden");

      }
    );

}


// ============================================================
// STUDY FORM
// ============================================================

const studyForm =
  $("study-form");


if (studyForm) {

  studyForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!currentUser) {

        alert(
          "ログインしてください。"
        );

        return;
      }


      const subject =
        $("study-subject").value;

      const minutes =
        Number(
          $("study-minutes").value
        );

      const note =
        $("study-note").value.trim();


      if (!subject) {

        alert(
          "教科を選択してください。"
        );

        return;
      }


      if (
        !Number.isFinite(minutes) ||
        minutes <= 0
      ) {

        alert(
          "勉強時間を正しく入力してください。"
        );

        return;
      }


      const button =
        $("record-study-button");

      button.disabled = true;
      button.textContent =
        "記録中...";


      try {

        await recordStudy(
          currentUser.id,
          subject,
          minutes,
          note
        );


        // 1分 = 1XP

        await addXP(
          currentUser.id,
          minutes
        );


        // 累計勉強時間更新

        const {
          data: profile,
          error: profileError
        } = await supabase
          .from("profiles")
          .select("total_study_minutes")
          .eq("id", currentUser.id)
          .single();


        if (profileError) {
          throw profileError;
        }


        const newTotal =
          Number(
            profile.total_study_minutes || 0
          ) + minutes;


        const {
          error: totalError
        } = await supabase
          .from("profiles")
          .update({
            total_study_minutes: newTotal
          })
          .eq("id", currentUser.id);


        if (totalError) {
          throw totalError;
        }


        $("study-minutes").value = "";
        $("study-note").value = "";
        $("study-subject").value = "";


        alert(
          `⚔️ 勉強記録完了！\n\n+${minutes} XP`
        );


        await loadPlayer();


      } catch (error) {

        console.error(
          "Study record error:",
          error
        );


        alert(
          `勉強記録に失敗しました。\n\n${error.message || ""}`
        );


      } finally {

        button.disabled = false;
        button.textContent =
          "勉強を記録する";

      }

    }
  );

}


// ============================================================
// STUDY HISTORY
// ============================================================

async function loadStudyHistory(userId) {

  const list =
    $("study-history-list");

  if (!list) return;


  const {
    data,
    error
  } = await supabase
    .from("study_records")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false
    })
    .limit(30);


  if (error) {

    console.error(
      "Study history error:",
      error
    );

    return;
  }


  list.innerHTML = "";


  if (!data || data.length === 0) {

    list.innerHTML =
      `<p style="color:var(--text-muted);">
        まだ勉強記録がありません。
      </p>`;

    return;
  }


  data.forEach(record => {

    const item =
      document.createElement("div");

    item.className =
      "study-history-item";


    const date =
      record.created_at
        ? new Date(
            record.created_at
          ).toLocaleString(
            "ja-JP"
          )
        : "";


    item.innerHTML = `
      <strong>
        ${SUBJECT_NAMES[record.subject] || record.subject}
      </strong>

      <div>
        ${record.minutes || 0}分
      </div>

      <small style="color:var(--text-muted);">
        ${date}
      </small>

      ${
        record.note
          ? `<p style="color:var(--text-muted);margin-top:6px;">
              ${record.note}
             </p>`
          : ""
      }
    `;


    list.appendChild(item);

  });

}


// ============================================================
// SUBJECT STUDY SUMMARY
// ============================================================

async function loadSubjectStudySummary(userId) {

  const list =
    $("subject-study-list");

  if (!list) return;


  const {
    data,
    error
  } = await supabase
    .from("study_records")
    .select("subject, minutes")
    .eq("user_id", userId);


  if (error) {

    console.error(
      "Subject study error:",
      error
    );

    return;
  }


  const totals = {};


  (data || []).forEach(row => {

    const subject =
      row.subject;

    totals[subject] =
      (totals[subject] || 0) +
      Number(row.minutes || 0);

  });


  list.innerHTML = "";


  Object.keys(totals)
    .sort()
    .forEach(subject => {

      const item =
        document.createElement("div");

      item.className =
        "subject-study-item";


      item.innerHTML = `
        <strong>
          ${SUBJECT_NAMES[subject] || subject}
        </strong>

        <span>
          ${formatStudyTime(totals[subject])}
        </span>
      `;


      list.appendChild(item);

    });


  if (
    Object.keys(totals).length === 0
  ) {

    list.innerHTML =
      `<p style="color:var(--text-muted);">
        まだ記録がありません。
      </p>`;

  }

}


// ============================================================
// TODAY SUMMARY
// ============================================================

async function updateTodaySummary(userId) {

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );


  const {
    data,
    error
  } = await supabase
    .from("study_records")
    .select("minutes, created_at")
    .eq("user_id", userId)
    .gte(
      "created_at",
      today.toISOString()
    );


  if (error) {

    console.error(
      "Today summary error:",
      error
    );

    return;
  }


  const minutes =
    (data || []).reduce(
      (sum, row) =>
        sum + Number(row.minutes || 0),
      0
    );


  if ($("today-study-time")) {

    $("today-study-time")
      .textContent =
      formatStudyTime(minutes);

  }


  if ($("today-xp")) {

    $("today-xp")
      .textContent =
      `${minutes} XP`;

  }

}


// ============================================================
// SETTINGS - DISPLAY NAME
// ============================================================

const changeNameForm =
  $("change-name-form");


if (changeNameForm) {

  changeNameForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!currentUser) return;


      const name =
        $("new-display-name")
          .value
          .trim();


      const error =
        validateDisplayName(name);


      if (error) {

        alert(error);

        return;
      }


      try {

        const {
          error: authError
        } = await supabase.auth.updateUser({

          data: {
            display_name: name
          }

        });


        if (authError) {
          throw authError;
        }


        const {
          error: profileError
        } = await supabase
          .from("profiles")
          .update({
            display_name: name
          })
          .eq("id", currentUser.id);


        if (profileError) {
          throw profileError;
        }


        alert(
          "表示名を変更しました！"
        );


        $("new-display-name")
          .value = "";


        await loadPlayer();


      } catch (error) {

        console.error(error);

        alert(
          `変更に失敗しました。\n${error.message || ""}`
        );

      }

    }
  );

}


// ============================================================
// SETTINGS - PASSWORD
// ============================================================

const changePasswordForm =
  $("change-password-form");


if (changePasswordForm) {

  changePasswordForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const newPassword =
        $("new-password").value;


      const error =
        validatePassword(newPassword);


      if (error) {

        alert(error);

        return;
      }


      try {

        const {
          error: updateError
        } = await supabase.auth.updateUser({

          password: newPassword

        });


        if (updateError) {
          throw updateError;
        }


        alert(
          "パスワードを変更しました！"
        );


        $("current-password").value = "";
        $("new-password").value = "";


      } catch (error) {

        console.error(error);

        alert(
          `パスワード変更に失敗しました。\n${error.message || ""}`
        );

      }

    }
  );

}


// ============================================================
// SETTINGS - COURSE
// ============================================================

const changeCourseForm =
  $("change-course-form");


if (changeCourseForm) {

  changeCourseForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!currentUser) return;


      const course =
        $("new-course").value;


      try {

        const {
          error
        } = await supabase
          .from("profiles")
          .update({
            course
          })
          .eq("id", currentUser.id);


        if (error) {
          throw error;
        }


        alert(
          "文理を変更しました！"
        );


        await loadPlayer();


      } catch (error) {

        console.error(error);

        alert(
          `変更に失敗しました。\n${error.message || ""}`
        );

      }

    }
  );

}


// ============================================================
// SETTINGS - SUBJECT
// ============================================================

const changeSubjectForm =
  $("change-subject-form");


if (changeSubjectForm) {

  changeSubjectForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!currentUser) return;


      const selected =
        Array.from(
          document.querySelectorAll(
            '#settings-subject-selection input[name="subjects"]:checked'
          )
        ).map(input => input.value);


      if (selected.length === 0) {

        alert(
          "受験教科を1つ以上選択してください。"
        );

        return;
      }


      try {

        const {
          error: deleteError
        } = await supabase
          .from("player_subjects")
          .delete()
          .eq(
            "user_id",
            currentUser.id
          );


        if (deleteError) {
          throw deleteError;
        }


        const rows =
          selected.map(subject => ({

            user_id: currentUser.id,
            subject

          }));


        const {
          error: insertError
        } = await supabase
          .from("player_subjects")
          .insert(rows);


        if (insertError) {
          throw insertError;
        }


        alert(
          "受験教科を更新しました！"
        );


        await loadPlayer();


      } catch (error) {

        console.error(error);

        alert(
          `教科更新に失敗しました。\n${error.message || ""}`
        );

      }

    }
  );

}


// ============================================================
// ACCOUNT DELETE
// ============================================================

const deleteAccountButton =
  $("delete-account-button");


if (deleteAccountButton) {

  deleteAccountButton.addEventListener(
    "click",
    async () => {

      alert(
        "アカウント削除機能は、Supabaseの安全なサーバー側処理を設定してから有効化します。"
      );

    }
  );

}


// ============================================================
// RANK TABLE
// ============================================================

function setupRankTable() {

  const body =
    $("rank-table-body");

  if (!body) return;


  const ranks = [
    ["Bronze", 0],
    ["Silver", 100],
    ["Gold", 200],
    ["Platinum", 300]
  ];


  body.innerHTML = "";


  ranks.forEach(
    ([rank, minutes]) => {

      const tr =
        document.createElement("tr");

      tr.innerHTML = `
        <td>${rank}</td>
        <td>${minutes}分以上</td>
      `;

      body.appendChild(tr);

    }
  );

}


// ============================================================
// MODALS
// ============================================================

function setupModalClose(
  buttonId,
  modalId
) {

  const button =
    $(buttonId);

  const modal =
    $(modalId);

  if (!button || !modal) return;


  button.addEventListener(
    "click",
    () => {

      modal.classList.add("hidden");

    }
  );

}


setupModalClose(
  "boss-result-close",
  "boss-result-modal"
);

setupModalClose(
  "season-result-close",
  "season-result-modal"
);

setupModalClose(
  "star-modal-close",
  "star-modal"
);


// ============================================================
// AUTH STATE
// ============================================================

supabase.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "Auth state:",
      event
    );


    if (
      session &&
      session.user
    ) {

      await loadPlayer();

    } else {

      showAuthScreen();

    }

  }
);


// ============================================================
// INITIALIZATION
// ============================================================

async function init() {

  console.log(
    "🎮 受験RPG JavaScript loaded!"
  );


  setupNavigation();

  setupRankTable();


  try {

    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();


    if (
      session &&
      session.user
    ) {

      await loadPlayer();

    } else {

      showAuthScreen();

    }


  } catch (error) {

    console.error(
      "Initialization error:",
      error
    );

    showAuthScreen();

  }

}


// ============================================================
// START
// ============================================================

init();
