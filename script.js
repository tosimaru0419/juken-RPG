// ============================================================
// 受験RPG
// script.js
// 完全作り直し版
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
// GLOBAL
// ============================================================

let currentUser = null;
let currentProfile = null;

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;


// ============================================================
// DOM SHORTCUT
// ============================================================

function $(id) {
  return document.getElementById(id);
}


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

  console.log("================================");
  console.log("受験RPG JavaScript 起動");
  console.log("================================");

  setupNavigation();
  setupRegister();
  setupStudyTimer();
  setupManualReport();

  await checkSession();

});


// ============================================================
// SCREEN
// ============================================================

function showRegisterScreen() {

  const screen = $("register-screen");

  if (screen) {
    screen.classList.remove("hidden");
  }

  const app = $("app");

  if (app) {
    app.classList.add("hidden");
  }

}


function showMainScreen() {

  const registerScreen = $("register-screen");

  if (registerScreen) {
    registerScreen.classList.add("hidden");
  }

  const app = $("app");

  if (app) {
    app.classList.remove("hidden");
  }

  const mainScreen = $("main-screen");

  if (mainScreen) {
    mainScreen.classList.remove("hidden");
  }

}


function hideAllPages() {

  document
    .querySelectorAll("[id^='page-']")
    .forEach(page => {

      page.classList.add("hidden");

    });

}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

  const navButtons =
    document.querySelectorAll(
      "#bottom-nav [data-page], #bottom-nav button"
    );

  navButtons.forEach(button => {

    button.addEventListener("click", () => {

      const pageId =
        button.dataset.page ||
        button.dataset.target;

      if (!pageId) {
        return;
      }

      showPage(pageId);

    });

  });

}


function showPage(pageId) {

  hideAllPages();

  let target = $(pageId);

  if (!target) {
    target = $("page-" + pageId);
  }

  if (!target) {

    console.warn(
      "ページが見つかりません:",
      pageId
    );

    return;

  }

  target.classList.remove("hidden");

  document
    .querySelectorAll(
      "#bottom-nav button"
    )
    .forEach(button => {

      button.classList.remove("active");

    });

  const activeButton =
    document.querySelector(
      `#bottom-nav [data-page="${pageId}"]`
    ) ||
    document.querySelector(
      `#bottom-nav [data-target="${pageId}"]`
    );

  if (activeButton) {
    activeButton.classList.add("active");
  }

}


// ============================================================
// SESSION
// ============================================================

async function checkSession() {

  try {

    console.log("セッション確認中...");

    const {
      data,
      error
    } =
      await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (
      data.session &&
      data.session.user
    ) {

      console.log(
        "既存セッションあり"
      );

      currentUser =
        data.session.user;

      await loadPlayer();

    } else {

      console.log(
        "ログインセッションなし"
      );

      showRegisterScreen();

    }

  } catch (error) {

    console.error(
      "Session error:",
      error
    );

    showRegisterScreen();

  }

}


// ============================================================
// AUTH STATE
// ============================================================

supabase.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "Auth:",
      event
    );

    if (
      session &&
      session.user
    ) {

      currentUser =
        session.user;

      await loadPlayer();

    } else {

      currentUser = null;
      currentProfile = null;

      showRegisterScreen();

    }

  }
);


// ============================================================
// REGISTER
// ============================================================

function setupRegister() {

  const button =
    $("register-button");

  if (!button) {

    console.error(
      "register-button がありません"
    );

    return;

  }

  button.addEventListener(
    "click",
    registerUser
  );

}


// ============================================================
// REGISTER USER
// ============================================================

async function registerUser(event) {

  event.preventDefault();

  console.log(
    "新規登録開始"
  );

  const nameInput =
    $("player-name");

  const trackInput =
    $("player-track");

  const subjectInput =
    $("player-subject");

  if (!nameInput) {

    console.error(
      "player-name がありません"
    );

    return;

  }

  const name =
    nameInput.value.trim();

  const track =
    trackInput
      ? trackInput.value
      : "undecided";

  const subject =
    subjectInput
      ? subjectInput.value
      : null;


  // ----------------------------------------------------------
  // Validation
  // ----------------------------------------------------------

  if (!name) {

    alert(
      "プレイヤー名を入力してください。"
    );

    return;

  }


  // ----------------------------------------------------------
  // 仮メールアドレス
  // ----------------------------------------------------------

  const safeName =
    name
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );

  const random =
    Math.floor(
      Math.random() * 1000000
    );

  const email =
    `${safeName}${random}@jukensrpg.local`;

  const password =
    crypto.randomUUID();


  const button =
    $("register-button");

  if (button) {

    button.disabled = true;

    button.textContent =
      "冒険者登録中...";

  }


  try {

    console.log(
      "Supabase Auth signUp..."
    );

    const {
      data,
      error
    } =
      await supabase.auth.signUp({

        email,

        password,

        options: {

          data: {

            display_name:
              name,

            course:
              track

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


    currentUser =
      data.user;


    console.log(
      "Auth登録成功:",
      currentUser.id
    );


    // --------------------------------------------------------
    // Profile
    // --------------------------------------------------------

    await waitForProfile(
      currentUser.id
    );


    // --------------------------------------------------------
    // Subject
    // --------------------------------------------------------

    if (subject) {

      const {
        error: subjectError
      } =
        await supabase
          .from("player_subjects")
          .insert({

            user_id:
              currentUser.id,

            subject:
              subject

          });

      if (subjectError) {

        console.warn(
          "教科登録:",
          subjectError
        );

      }

    }


    alert(
      "🎉 冒険者登録完了！"
    );


    await loadPlayer();


  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );

    alert(
      "登録に失敗しました。\n\n" +
      error.message
    );


  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "冒険を始める";

    }

  }

}


// ============================================================
// PROFILE WAIT
// ============================================================

async function waitForProfile(userId) {

  for (
    let i = 0;
    i < 20;
    i++
  ) {

    const {
      data,
      error
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          userId
        )
        .maybeSingle();


    if (error) {

      console.warn(
        "Profile取得:",
        error
      );

    }


    if (data) {

      currentProfile =
        data;

      return data;

    }


    await sleep(500);

  }


  throw new Error(
    "プロフィールを確認できませんでした。"
  );

}


// ============================================================
// LOAD PLAYER
// ============================================================

async function loadPlayer() {

  try {

    if (!currentUser) {

      const {
        data
      } =
        await supabase.auth.getUser();

      currentUser =
        data.user;

    }


    if (!currentUser) {

      showRegisterScreen();

      return;

    }


    console.log(
      "プレイヤー読み込み:",
      currentUser.id
    );


    const {
      data: profile,
      error
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          currentUser.id
        )
        .single();


    if (error) {
      throw error;
    }


    currentProfile =
      profile;


    console.log(
      "プロフィール:",
      profile
    );


    updateUI(profile);


    await loadSubjects();


    showMainScreen();

    showPage("home");


  } catch (error) {

    console.error(
      "LOAD PLAYER ERROR:",
      error
    );

    showRegisterScreen();

  }

}


// ============================================================
// UPDATE UI
// ============================================================

function updateUI(profile) {

  const displayName =
    profile.display_name ||
    "冒険者";

  const level =
    Number(
      profile.level || 1
    );

  const xp =
    Number(
      profile.xp || 0
    );

  const coins =
    Number(
      profile.coins || 0
    );

  const totalMinutes =
    Number(
      profile.total_study_minutes || 0
    );


  // ----------------------------------------------------------
  // Name
  // ----------------------------------------------------------

  setText(
    "home-name",
    displayName
  );


  // ----------------------------------------------------------
  // Level
  // ----------------------------------------------------------

  setText(
    "home-level",
    level
  );


  // ----------------------------------------------------------
  // XP
  // ----------------------------------------------------------

  setText(
    "home-xp-text",
    `${xp} XP`
  );


  // ----------------------------------------------------------
  // Coins
  // ----------------------------------------------------------

  setText(
    "home-coins",
    coins
  );


  // ----------------------------------------------------------
  // Rank
  // ----------------------------------------------------------

  const rank =
    getRank(
      totalMinutes
    );

  setText(
    "home-rank",
    rank
  );


  // ----------------------------------------------------------
  // Monthly hours
  // ----------------------------------------------------------

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  setText(
    "home-month-hours",
    `${hours}時間${minutes}分`
  );


  // ----------------------------------------------------------
  // Today
  // ----------------------------------------------------------

  setText(
    "home-today-minutes",
    `${profile.today_study_minutes || 0}分`
  );


  // ----------------------------------------------------------
  // XP bar
  // ----------------------------------------------------------

  const fill =
    $("home-xp-fill");

  if (fill) {

    const required =
      getRequiredXP(level);

    const percent =
      Math.min(
        100,
        (xp / required) * 100
      );

    fill.style.width =
      `${percent}%`;

  }

}


// ============================================================
// TEXT
// ============================================================

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


// ============================================================
// RANK
// ============================================================

function getRank(minutes) {

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


// ============================================================
// XP
// ============================================================

function getRequiredXP(level) {

  return (
    100 +
    (level - 1) * 50
  );

}


// ============================================================
// SUBJECTS
// ============================================================

async function loadSubjects() {

  if (!currentUser) {
    return;
  }


  const {
    data,
    error
  } =
    await supabase
      .from("player_subjects")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.warn(
      "教科読み込み:",
      error
    );

    return;

  }


  const buttons =
    document.querySelectorAll(
      "[data-subject]"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const subject =
          button.dataset.subject;

        setText(
          "current-subject",
          getSubjectName(subject)
        );

      }
    );

  });


  const select =
    $("report-subject");

  if (select) {

    select.innerHTML =
      `<option value="">教科を選択</option>`;

    data.forEach(row => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        row.subject;

      option.textContent =
        getSubjectName(
          row.subject
        );

      select.appendChild(
        option
      );

    });

  }

}


// ============================================================
// SUBJECT NAME
// ============================================================

function getSubjectName(subject) {

  const names = {

    japanese:
      "国語",

    math:
      "数学",

    english:
      "英語",

    physics:
      "物理",

    chemistry:
      "化学",

    biology:
      "生物",

    geography:
      "地理",

    "japanese-history":
      "日本史",

    "world-history":
      "世界史",

    civics:
      "公民",

    "earth-science":
      "地学"

  };

  return (
    names[subject] ||
    subject ||
    "未選択"
  );

}


// ============================================================
// STUDY TIMER
// ============================================================

function setupStudyTimer() {

  const start =
    $("timer-start");

  const stop =
    $("timer-stop");


  if (start) {

    start.addEventListener(
      "click",
      startTimer
    );

  }


  if (stop) {

    stop.addEventListener(
      "click",
      stopTimer
    );

  }


  updateTimerDisplay();

}


// ============================================================
// START TIMER
// ============================================================

function startTimer() {

  if (timerRunning) {
    return;
  }


  timerRunning =
    true;


  setText(
    "timer-status",
    "勉強中"
  );


  timerInterval =
    setInterval(() => {

      timerSeconds++;

      updateTimerDisplay();

    }, 1000);


  console.log(
    "タイマースタート"
  );

}


// ============================================================
// STOP TIMER
// ============================================================

async function stopTimer() {

  if (!timerRunning) {
    return;
  }


  timerRunning =
    false;


  clearInterval(
    timerInterval
  );


  timerInterval =
    null;


  setText(
    "timer-status",
    "停止中"
  );


  const minutes =
    Math.floor(
      timerSeconds / 60
    );


  if (minutes > 0) {

    await saveStudyTime(
      minutes
    );

  }


  timerSeconds =
    0;


  updateTimerDisplay();

}


// ============================================================
// TIMER DISPLAY
// ============================================================

function updateTimerDisplay() {

  const hours =
    Math.floor(
      timerSeconds / 3600
    );

  const minutes =
    Math.floor(
      (timerSeconds % 3600) / 60
    );

  const seconds =
    timerSeconds % 60;


  setText(
    "timer-display",
    `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  );

}


function pad(number) {

  return String(
    number
  ).padStart(
    2,
    "0"
  );

}


// ============================================================
// MANUAL REPORT
// ============================================================

function setupManualReport() {

  const button =
    $("report-submit");

  if (!button) {
    return;
  }

  button.addEventListener(
    "click",
    reportStudyTime
  );

}


// ============================================================
// REPORT STUDY
// ============================================================

async function reportStudyTime(event) {

  event.preventDefault();


  if (!currentUser) {

    alert(
      "ログインしてください。"
    );

    return;

  }


  const subject =
    $("report-subject")
      ?.value;


  const hours =
    Number(
      $("report-hours")
        ?.value || 0
    );


  const minutes =
    Number(
      $("report-minutes")
        ?.value || 0
    );


  if (!subject) {

    alert(
      "教科を選択してください。"
    );

    return;

  }


  const totalMinutes =
    hours * 60 +
    minutes;


  if (
    totalMinutes <= 0
  ) {

    alert(
      "勉強時間を入力してください。"
    );

    return;

  }


  await saveStudyTime(
    totalMinutes,
    subject
  );

}


// ============================================================
// SAVE STUDY TIME
// ============================================================

async function saveStudyTime(
  minutes,
  subject = null
) {

  if (!currentUser) {
    return;
  }


  console.log(
    "勉強時間保存:",
    minutes,
    subject
  );


  try {

    const {
      data: profile,
      error: profileError
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          currentUser.id
        )
        .single();


    if (profileError) {
      throw profileError;
    }


    const oldMinutes =
      Number(
        profile.total_study_minutes || 0
      );


    const newMinutes =
      oldMinutes +
      minutes;


    const xpGain =
      minutes;


    const oldXP =
      Number(
        profile.xp || 0
      );


    const newXP =
      oldXP +
      xpGain;


    const {
      error
    } =
      await supabase
        .from("profiles")
        .update({

          total_study_minutes:
            newMinutes,

          xp:
            newXP,

          total_xp:
            Number(
              profile.total_xp || 0
            ) +
            xpGain

        })
        .eq(
          "id",
          currentUser.id
        );


    if (error) {
      throw error;
    }


    currentProfile =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          currentUser.id
        )
        .single()
        .then(
          result =>
            result.data
        );


    updateUI(
      currentProfile
    );


    alert(
      `📚 ${minutes}分の勉強を記録！\n` +
      `⭐ +${xpGain} XP`
    );


  } catch (error) {

    console.error(
      "SAVE STUDY ERROR:",
      error
    );

    alert(
      "勉強時間の保存に失敗しました。\n\n" +
      error.message
    );

  }

}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

  try {

    const {
      error
    } =
      await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    currentUser = null;
    currentProfile = null;

    showRegisterScreen();

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


// ============================================================
// LOGOUT BUTTON AUTO SETUP
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const logoutButton =
      $("logout-button");

    if (logoutButton) {

      logoutButton.addEventListener(
        "click",
        logout
      );

    }

  }
);


// ============================================================
// UTILITY
// ============================================================

function sleep(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );

}


// ============================================================
// DEBUG
// ============================================================

console.log(
  "受験RPG script.js 読み込み完了"
);
