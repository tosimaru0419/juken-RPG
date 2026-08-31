// ============================================================
// 受験RPG - script.js
// STEP 1
// 画面切り替え + Supabase Auth
// ============================================================


// ============================================================
// Supabase
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

const showRegisterButton =
  $("show-register-button");

const showLoginButton =
  $("show-login-button");

const mainApp =
  $("main-app");

const logoutButton =
  $("logout-button");


// ============================================================
// 初期化
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log("受験RPG JS 起動");

    setupScreenSwitching();

    setupAuth();

    checkSession();

  }
);


// ============================================================
// 画面切り替え
// ============================================================

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


// ============================================================
// Login / Register ボタン
// ============================================================

function setupScreenSwitching() {

  if (showRegisterButton) {

    showRegisterButton.addEventListener(
      "click",
      () => {

        console.log(
          "新規登録ボタンが押されました"
        );

        showRegisterScreen();

      }
    );

  } else {

    console.error(
      "show-register-button が見つかりません"
    );

  }


  if (showLoginButton) {

    showLoginButton.addEventListener(
      "click",
      () => {

        console.log(
          "ログイン画面へ戻ります"
        );

        showLoginScreen();

      }
    );

  } else {

    console.error(
      "show-login-button が見つかりません"
    );

  }

}


// ============================================================
// エラー表示
// ============================================================

function showError(
  element,
  message
) {

  if (!element) return;

  element.textContent =
    message;

}


function clearErrors() {

  showError(
    loginError,
    ""
  );

  showError(
    registerError,
    ""
  );

  showError(
    subjectError,
    ""
  );

}


// ============================================================
// ユーザーID → 内部メールアドレス
// ============================================================

function userIdToEmail(
  userId
) {

  return (
    userId.toLowerCase() +
    "@jukensrpg.local"
  );

}


// ============================================================
// 入力チェック
// ============================================================

function validateUserId(
  userId
) {

  if (!userId) {

    return "ユーザーIDを入力してください。";

  }


  if (userId.length < 3) {

    return "ユーザーIDは3文字以上にしてください。";

  }


  if (userId.length > 30) {

    return "ユーザーIDは30文字以内にしてください。";

  }


  if (
    !/^[a-zA-Z0-9_-]+$/.test(userId)
  ) {

    return "ユーザーIDは英数字・_・-のみ使用できます。";

  }


  return null;

}


function validatePassword(
  password
) {

  if (!password) {

    return "パスワードを入力してください。";

  }


  if (password.length < 6) {

    return "パスワードは6文字以上にしてください。";

  }


  return null;

}


function validateDisplayName(
  displayName
) {

  if (!displayName) {

    return "表示名を入力してください。";

  }


  if (displayName.length > 30) {

    return "表示名は30文字以内にしてください。";

  }


  return null;

}


// ============================================================
// 受験教科取得
// ============================================================

function getSelectedSubjects() {

  return Array.from(

    document.querySelectorAll(
      '#subject-selection input[name="subjects"]:checked'
    )

  ).map(
    (input) => input.value
  );

}


// ============================================================
// 認証処理
// ============================================================

function setupAuth() {

  // ----------------------------------------------------------
  // 新規登録
  // ----------------------------------------------------------

  if (registerForm) {

    registerForm.addEventListener(
      "submit",
      registerUser
    );

  }


  // ----------------------------------------------------------
  // ログイン
  // ----------------------------------------------------------

  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      loginUser
    );

  }


  // ----------------------------------------------------------
  // ログアウト
  // ----------------------------------------------------------

  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      logoutUser
    );

  }

}


// ============================================================
// 新規登録
// ============================================================

async function registerUser(
  event
) {

  event.preventDefault();

  clearErrors();


  const userId =
    $("register-user-id")
      .value
      .trim();


  const password =
    $("register-password")
      .value;


  const passwordConfirm =
    $("register-password-confirm")
      .value;


  const displayName =
    $("register-display-name")
      .value
      .trim();


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


  // ----------------------------------------------------------
  // Validation
  // ----------------------------------------------------------

  const userIdError =
    validateUserId(userId);


  if (userIdError) {

    showError(
      registerError,
      userIdError
    );

    return;

  }


  const passwordError =
    validatePassword(password);


  if (passwordError) {

    showError(
      registerError,
      passwordError
    );

    return;

  }


  if (
    password !== passwordConfirm
  ) {

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


  // ----------------------------------------------------------
  // ボタン
  // ----------------------------------------------------------

  const button =
    $("register-button");


  if (button) {

    button.disabled = true;

    button.textContent =
      "登録中...";

  }


  try {

    console.log(
      "Supabase登録開始"
    );


    const email =
      userIdToEmail(userId);


    const {
      data,
      error
    } =
      await supabase.auth.signUp({

        email: email,

        password: password,

        options: {

          data: {

            user_id:
              userId,

            display_name:
              displayName

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


    console.log(
      "Supabase Auth 登録成功",
      data.user.id
    );


    // --------------------------------------------------------
    // プロフィール
    // --------------------------------------------------------

    const userUuid =
      data.user.id;


    let profile =
      null;


    for (
      let i = 0;
      i < 10;
      i++
    ) {

      const {
        data: profileData,
        error: profileError
      } =
        await supabase
          .from("profiles")
          .select("*")
          .eq(
            "id",
            userUuid
          )
          .maybeSingle();


      if (profileError) {

        throw profileError;

      }


      if (profileData) {

        profile =
          profileData;

        break;

      }


      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            300
          )
      );

    }


    if (!profile) {

      throw new Error(
        "プロフィールの作成を確認できませんでした。"
      );

    }


    // --------------------------------------------------------
    // 教科保存
    // --------------------------------------------------------

    const subjectRows =
      subjects.map(
        (subject) => ({

          user_id:
            userUuid,

          subject:
            subject

        })
      );


    const {
      error: subjectError
    } =
      await supabase
        .from("player_subjects")
        .insert(
          subjectRows
        );


    if (subjectError) {

      throw subjectError;

    }


    // --------------------------------------------------------
    // 完了
    // --------------------------------------------------------

    alert(
      "🎉 冒険者登録完了！\n\n受験RPGへようこそ！"
    );


    await loadPlayer();


  } catch (error) {

    console.error(
      "Registration error:",
      error
    );


    showError(
      registerError,
      error.message ||
        "登録中にエラーが発生しました。"
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
// ログイン
// ============================================================

async function loginUser(
  event
) {

  event.preventDefault();

  clearErrors();


  const userId =
    $("login-user-id")
      .value
      .trim();


  const password =
    $("login-password")
      .value;


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


  if (button) {

    button.disabled = true;

    button.textContent =
      "ログイン中...";

  }


  try {

    const email =
      userIdToEmail(userId);


    const {
      data,
      error
    } =
      await supabase.auth
        .signInWithPassword({

          email:
            email,

          password:
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

    if (button) {

      button.disabled = false;

      button.textContent =
        "ログイン";

    }

  }

}


// ============================================================
// ログアウト
// ============================================================

async function logoutUser() {

  try {

    const {
      error
    } =
      await supabase.auth.signOut();


    if (error) {

      throw error;

    }


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


// ============================================================
// セッション確認
// ============================================================

async function checkSession() {

  try {

    const {
      data: {
        session
      }
    } =
      await supabase.auth
        .getSession();


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
      "Session check error:",
      error
    );


    showAuthScreen();

  }

}


// ============================================================
// Auth State
// ============================================================

supabase.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

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
// プレイヤーデータ
// ============================================================

async function loadPlayer() {

  try {

    const {
      data: {
        user
      }
    } =
      await supabase.auth
        .getUser();


    if (!user) {

      showAuthScreen();

      return;

    }


    const {
      data: profile,
      error
    } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          user.id
        )
        .single();


    if (error) {

      throw error;

    }


    console.log(
      "プレイヤーデータ読み込み成功",
      profile
    );


    // --------------------------------------------------------
    // Header
    // --------------------------------------------------------

    if (
      $("header-display-name")
    ) {

      $("header-display-name")
        .textContent =
        profile.display_name;

    }


    if (
      $("header-level")
    ) {

      $("header-level")
        .textContent =
        `Lv.${profile.level}`;

    }


    if (
      $("header-rank")
    ) {

      $("header-rank")
        .textContent =
        getRankName(profile);

    }


    // --------------------------------------------------------
    // Home
    // --------------------------------------------------------

    if (
      $("home-level")
    ) {

      $("home-level")
        .textContent =
        profile.level;

    }


    if (
      $("home-xp")
    ) {

      $("home-xp")
        .textContent =
        `${profile.xp} XP`;

    }


    // --------------------------------------------------------
    // Profile
    // --------------------------------------------------------

    if (
      $("profile-display-name")
    ) {

      $("profile-display-name")
        .textContent =
        profile.display_name;

    }


    if (
      $("profile-user-id")
    ) {

      $("profile-user-id")
        .textContent =
        profile.user_id;

    }


    if (
      $("profile-course")
    ) {

      $("profile-course")
        .textContent =
        getCourseName(
          profile.course
        );

    }


    if (
      $("profile-level")
    ) {

      $("profile-level")
        .textContent =
        profile.level;

    }


    if (
      $("profile-stars")
    ) {

      $("profile-stars")
        .textContent =
        profile.stars;

    }


    if (
      $("profile-title")
    ) {

      $("profile-title")
        .textContent =
        profile.title;

    }


    if (
      $("profile-total-study-time")
    ) {

      $("profile-total-study-time")
        .textContent =
        formatStudyTime(
          profile.total_study_minutes
        );

    }


    if (
      $("profile-total-xp")
    ) {

      $("profile-total-xp")
        .textContent =
        `${profile.total_xp} XP`;

    }


    if (
      $("profile-bosses-defeated")
    ) {

      $("profile-bosses-defeated")
        .textContent =
        profile.bosses_defeated;

    }


    if (
      $("profile-quests-completed")
    ) {

      $("profile-quests-completed")
        .textContent =
        profile.quests_completed;

    }


    await loadSubjects(
      user.id
    );


    showMainApp();


  } catch (error) {

    console.error(
      "Load player error:",
      error
    );

    showAuthScreen();

  }

}


// ============================================================
// 教科
// ============================================================

async function loadSubjects(
  userId
) {

  const {
    data,
    error
  } =
    await supabase
      .from("player_subjects")
      .select("subject")
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at"
      );


  if (error) {

    throw error;

  }


  const subjectNames = {

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

    "earth-science":
      "地学",

    geography:
      "地理",

    "japanese-history":
      "日本史",

    "world-history":
      "世界史",

    civics:
      "公民"

  };


  const select =
    $("study-subject");


  if (select) {

    select.innerHTML = `
      <option value="">
        教科を選択
      </option>
    `;


    data.forEach(
      (row) => {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          row.subject;


        option.textContent =
          subjectNames[
            row.subject
          ] ||
          row.subject;


        select.appendChild(
          option
        );

      }
    );

  }


  const profileList =
    $("profile-subject-list");


  if (profileList) {

    profileList.innerHTML =
      "";


    data.forEach(
      (row) => {

        const div =
          document.createElement(
            "div"
          );


        div.textContent =
          subjectNames[
            row.subject
          ] ||
          row.subject;


        profileList.appendChild(
          div
        );

      }
    );

  }


  const settingsList =
    $("settings-subject-selection");


  if (settingsList) {

    settingsList.innerHTML =
      "";


    data.forEach(
      (row) => {

        const label =
          document.createElement(
            "label"
          );


        label.innerHTML = `
          <input
            type="checkbox"
            name="subjects"
            value="${row.subject}"
            checked
          >
          ${
            subjectNames[
              row.subject
            ] ||
            row.subject
          }
        `;


        settingsList.appendChild(
          label
        );

      }
    );

  }

}


// ============================================================
// 文理
// ============================================================

function getCourseName(
  course
) {

  const names = {

    science:
      "理系",

    humanities:
      "文系",

    undecided:
      "未定・その他"

  };


  return (
    names[course] ||
    course ||
    "未設定"
  );

}


// ============================================================
// ランク
// ============================================================

function getRankName(
  profile
) {

  const minutes =
    Number(
      profile.total_study_minutes ||
      0
    );


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
// 勉強時間表示
// ============================================================

function formatStudyTime(
  minutes
) {

  const total =
    Number(
      minutes || 0
    );


  const hours =
    Math.floor(
      total / 60
    );


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
// ナビゲーション
// ============================================================

document
  .querySelectorAll(
    ".nav-button"
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const targetId =
            button.dataset.screen;


          document
            .querySelectorAll(
              ".app-screen"
            )
            .forEach(
              (screen) => {

                screen.classList.add(
                  "hidden"
                );

              }
            );


          const target =
            $(targetId);


          if (target) {

            target.classList.remove(
              "hidden"
            );

          }


          document
            .querySelectorAll(
              ".nav-button"
            )
            .forEach(
              (btn) => {

                btn.classList.remove(
                  "active"
                );

              }
            );


          button.classList.add(
            "active"
          );

        }
      );

    }
  );
console.log("===== TEST START =====");

const testButton = document.getElementById("show-register-button");

console.log("ボタン:", testButton);

if (testButton) {
  testButton.addEventListener("click", function () {
    alert("クリックイベントは動いてる！！");
  });
}
