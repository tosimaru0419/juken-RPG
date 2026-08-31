alert("JS TEST");
// ============================================================
// 受験RPG - Supabase 接続
// ============================================================
alert("script.js 読み込まれた！");
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


// Auth
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


// Main
const mainApp = $("main-app");
const logoutButton = $("logout-button");


// ============================================================
// Utility
// ============================================================

function showError(element, message) {
  if (!element) return;

  element.textContent = message;
}


function clearErrors() {
  showError(loginError, "");
  showError(registerError, "");
  showError(subjectError, "");
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


// ============================================================
// ユーザーID → 内部メールアドレス
// ============================================================
//
// Supabase Authは通常 email + password を使用するため、
// ユーザーにはユーザーIDだけ入力してもらい、
// 内部的に専用のメール形式へ変換する。
//
// 例:
// taro
// ↓
// taro@jukensrpg.local
//
// このメールアドレスはログイン用の内部値。
// ============================================================

function userIdToEmail(userId) {
  return `${userId.toLowerCase()}@jukensrpg.local`;
}


// ============================================================
// 入力値チェック
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

  // 英数字・_・-のみ
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
// 受験教科取得
// ============================================================

function getSelectedSubjects() {

  return Array.from(
    document.querySelectorAll(
      '#subject-selection input[name="subjects"]:checked'
    )
  ).map((input) => input.value);
}


// ============================================================
// 新規登録
// ============================================================

registerForm.addEventListener("submit", async (event) => {

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
    courseInput ? courseInput.value : null;

  const subjects =
    getSelectedSubjects();


  // ------------------------------
  // Validation
  // ------------------------------

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
    showError(registerError, displayNameError);
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


  // ------------------------------
  // Button
  // ------------------------------

  const button =
    $("register-button");

  button.disabled = true;
  button.textContent = "登録中...";


  try {

    const email =
      userIdToEmail(userId);


    // ----------------------------
    // Supabase Auth 登録
    // ----------------------------

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


    // ----------------------------
    // Profile取得
    // ----------------------------

    //
    // DB側のtriggerによって
    // profilesが自動作成される。
    //

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


      await new Promise(
        resolve => setTimeout(resolve, 300)
      );
    }


    if (!profile) {

      throw new Error(
        "プロフィールの作成を確認できませんでした。"
      );

    }


    // ----------------------------
    // 受験教科保存
    // ----------------------------

    const subjectRows =
      subjects.map((subject) => ({

        user_id: userUuid,

        subject: subject

      }));


    const {
      error: subjectInsertError
    } = await supabase
      .from("player_subjects")
      .insert(subjectRows);


    if (subjectInsertError) {
      throw subjectInsertError;
    }


    // ----------------------------
    // 完了
    // ----------------------------

    showError(
      registerError,
      ""
    );


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
      error.message.includes(
        "USER_ID_ALREADY_EXISTS"
      )
    ) {

      message =
        "そのユーザーIDは既に使用されています。";

    } else if (
      error.message
    ) {

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

});


// ============================================================
// ログイン
// ============================================================

loginForm.addEventListener("submit", async (event) => {

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

});


// ============================================================
// プレイヤーデータ読み込み
// ============================================================

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


    // ----------------------------
    // Header
    // ----------------------------

    if ($("header-display-name")) {

      $("header-display-name")
        .textContent =
        profile.display_name;

   
