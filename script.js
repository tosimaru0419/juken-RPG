// ============================================================
// 受験RPG - Phase 1
// 起動・Firebase認証・ユーザーデータ基盤
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ============================================================
// Firebase
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCggQfYsVVlngak6EJLS74OB3ADV4vFjyo",
  authDomain: "juken-rpg-b2840.firebaseapp.com",
  projectId: "juken-rpg-b2840",
  storageBucket: "juken-rpg-b2840.firebasestorage.app",
  messagingSenderId: "332135698063",
  appId: "1:332135698063:web:cea3c9be433f948bf1aafa",
  measurementId: "G-KLH9WZFNMT"
};


// ============================================================
// Global state
// ============================================================

let firebaseApp = null;
let auth = null;
let db = null;

let currentUser = null;
let currentPlayer = null;

let booted = false;
let authObserverStarted = false;


// ============================================================
// DOM helpers
// ============================================================

function getElement(id) {
  return document.getElementById(id);
}

function showElement(id) {
  const element = getElement(id);

  if (element) {
    element.classList.remove("hidden");
  }
}

function hideElement(id) {
  const element = getElement(id);

  if (element) {
    element.classList.add("hidden");
  }
}

function setText(id, value) {
  const element = getElement(id);

  if (element) {
    element.textContent =
      value === undefined || value === null
        ? ""
        : String(value);
  }
}


// ============================================================
// Screen control
// ============================================================

function showLoginScreen() {

  showElement("auth-screen");
  showElement("login-screen");

  hideElement("register-screen");
  hideElement("main-app");
}


function showRegisterScreen() {

  showElement("auth-screen");

  hideElement("login-screen");
  showElement("register-screen");
  hideElement("main-app");
}


function showMainScreen() {

  hideElement("auth-screen");
  showElement("main-app");
}


// ============================================================
// User ID
// ============================================================

function normalizeUserId(value) {

  return String(value || "")
    .trim()
    .toLowerCase();
}


function userIdToEmail(userId) {

  return `${normalizeUserId(userId)}@juken-rpg.local`;
}


// ============================================================
// Firebase error handling
// ============================================================

function getFirebaseErrorMessage(error) {

  console.error(
    "[Firebase Error]",
    error
  );

  switch (error?.code) {

    case "auth/invalid-credential":
      return "ユーザーIDまたはパスワードが違います。";

    case "auth/user-not-found":
      return "ユーザーIDまたはパスワードが違います。";

    case "auth/wrong-password":
      return "ユーザーIDまたはパスワードが違います。";

    case "auth/email-already-in-use":
      return "そのユーザーIDはすでに使用されています。";

    case "auth/weak-password":
      return "パスワードは6文字以上にしてください。";

    case "auth/invalid-email":
      return "ユーザーIDの形式が正しくありません。";

    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらく待ってから再試行してください。";

    case "auth/network-request-failed":
      return "ネットワーク接続を確認してください。";

    case "auth/operation-not-allowed":
      return "Firebase Authenticationの設定を確認してください。";

    case "permission-denied":
      return "Firestoreへのアクセスが拒否されました。";

    default:
      return (
        error?.message ||
        "予期しないエラーが発生しました。"
      );
  }
}


// ============================================================
// Firebase initialization
// ============================================================

function initializeFirebase() {

  if (firebaseApp && auth && db) {
    return true;
  }

  try {

    firebaseApp =
      initializeApp(firebaseConfig);

    auth = getAuth(firebaseApp);

    db = getFirestore(firebaseApp);

    console.log(
      "[Phase 1] Firebase initialized"
    );

    return true;

  } catch (error) {

    console.error(
      "[Phase 1] Firebase initialization failed",
      error
    );

    return false;
  }
}


// ============================================================
// Default player data
// ============================================================

function createDefaultPlayerData(
  firebaseUser,
  registrationData = {}
) {

  return {

    uid: firebaseUser.uid,

    userId:
      registrationData.userId ||
      "",

    displayName:
      registrationData.displayName ||
      registrationData.userId ||
      "プレイヤー",

    course:
      registrationData.course ||
      "undecided",

    subjects:
      Array.isArray(
        registrationData.subjects
      )
        ? registrationData.subjects
        : [],

    level: 1,

    xp: 0,

    coins: 0,

    stars: 0,

    title: "新人受験生",

    totalStudyMinutes: 0,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp()
  };
}


// ============================================================
// Firestore player creation
// ============================================================

async function createPlayer(
  firebaseUser,
  registrationData = {}
) {

  const playerRef =
    doc(
      db,
      "users",
      firebaseUser.uid
    );

  const playerData =
    createDefaultPlayerData(
      firebaseUser,
      registrationData
    );

  await setDoc(
    playerRef,
    playerData
  );

  return playerData;
}


// ============================================================
// Firestore player loading
// ============================================================

async function loadPlayer(
  firebaseUser
) {

  const playerRef =
    doc(
      db,
      "users",
      firebaseUser.uid
    );

  const snapshot =
    await getDoc(playerRef);

  if (!snapshot.exists()) {

    console.warn(
      "[Phase 1] Player document does not exist."
    );

    return null;
  }

  return snapshot.data();
}


// ============================================================
// Apply player data to UI
// ============================================================

function applyPlayerData(player) {

  if (!player) {
    return;
  }

  currentPlayer = player;


  // Header

  setText(
    "header-display-name",
    player.displayName || "プレイヤー"
  );

  setText(
    "header-level",
    `Lv.${player.level ?? 1}`
  );

  setText(
    "header-rank",
    "Bronze"
  );

  setText(
    "header-coins",
    player.coins ?? 0
  );


  // Home

  setText(
    "home-level",
    player.level ?? 1
  );

  setText(
    "home-xp",
    player.xp ?? 0
  );

  setText(
    "home-xp-required",
    100
  );

  setText(
    "star-count",
    player.stars ?? 0
  );


  // Profile

  setText(
    "profile-display-name",
    player.displayName || "プレイヤー"
  );

  setText(
    "profile-user-id",
    player.userId || ""
  );

  setText(
    "profile-course",
    player.course || "未設定"
  );

  setText(
    "profile-level",
    player.level ?? 1
  );

  setText(
    "profile-xp",
    player.xp ?? 0
  );

  setText(
    "profile-stars",
    player.stars ?? 0
  );

  setText(
    "profile-coins",
    player.coins ?? 0
  );

  setText(
    "profile-title",
    player.title || "新人受験生"
  );

  setText(
    "profile-total-study-time",
    player.totalStudyMinutes ?? 0
  );

  setText(
    "profile-total-xp",
    player.xp ?? 0
  );

  setText(
    "profile-total-coins",
    player.coins ?? 0
  );
}


// ============================================================
// Login
// ============================================================

async function handleLogin(event) {

  event.preventDefault();

  const userIdInput =
    getElement("login-user-id");

  const passwordInput =
    getElement("login-password");

  const errorElement =
    getElement("login-error");

  const loginButton =
    getElement("login-button");


  const userId =
    normalizeUserId(
      userIdInput?.value
    );

  const password =
    passwordInput?.value || "";


  if (errorElement) {
    errorElement.textContent = "";
  }


  if (!userId) {

    if (errorElement) {
      errorElement.textContent =
        "ユーザーIDを入力してください。";
    }

    return;
  }


  if (!password) {

    if (errorElement) {
      errorElement.textContent =
        "パスワードを入力してください。";
    }

    return;
  }


  if (loginButton) {

    loginButton.disabled = true;

    loginButton.dataset.originalText =
      loginButton.textContent;

    loginButton.textContent =
      "ログイン中...";
  }


  try {

    console.log(
      "[Phase 1] Login attempt:",
      userId
    );


    await signInWithEmailAndPassword(
      auth,
      userIdToEmail(userId),
      password
    );


    console.log(
      "[Phase 1] Firebase login successful"
    );


    /*
     * ここでは画面遷移しない。
     *
     * onAuthStateChanged() が
     * ログイン状態を検知して、
     * Firestoreのユーザーデータを読み込み、
     * メイン画面を表示する。
     */


  } catch (error) {

    if (errorElement) {

      errorElement.textContent =
        getFirebaseErrorMessage(error);
    }

  } finally {

    if (loginButton) {

      loginButton.disabled = false;

      loginButton.textContent =
        loginButton.dataset.originalText ||
        "ログイン";
    }
  }
}


// ============================================================
// Registration
// ============================================================

async function handleRegister(event) {

  event.preventDefault();


  const userIdInput =
    getElement("register-user-id");

  const passwordInput =
    getElement("register-password");

  const confirmInput =
    getElement(
      "register-password-confirm"
    );

  const displayNameInput =
    getElement(
      "register-display-name"
    );

  const errorElement =
    getElement("register-error");

  const registerButton =
    getElement("register-button");


  const userId =
    normalizeUserId(
      userIdInput?.value
    );

  const password =
    passwordInput?.value || "";

  const confirmPassword =
    confirmInput?.value || "";

  const displayName =
    displayNameInput?.value.trim() ||
    userId;


  const course =
    document.querySelector(
      'input[name="course"]:checked'
    )?.value ||
    "undecided";


  const subjects = [
    ...document.querySelectorAll(
      'input[name="subjects"]:checked'
    )
  ].map(
    (input) => input.value
  );


  if (errorElement) {
    errorElement.textContent = "";
  }


  if (!userId) {

    if (errorElement) {
      errorElement.textContent =
        "ユーザーIDを入力してください。";
    }

    return;
  }


  if (password.length < 6) {

    if (errorElement) {
      errorElement.textContent =
        "パスワードは6文字以上にしてください。";
    }

    return;
  }


  if (password !== confirmPassword) {

    if (errorElement) {
      errorElement.textContent =
        "パスワードが一致しません。";
    }

    return;
  }


  if (registerButton) {

    registerButton.disabled = true;

    registerButton.dataset.originalText =
      registerButton.textContent;

    registerButton.textContent =
      "登録中...";
  }


  try {

    console.log(
      "[Phase 1] Registration attempt:",
      userId
    );


    const credential =
      await createUserWithEmailAndPassword(
        auth,
        userIdToEmail(userId),
        password
      );


    await createPlayer(
      credential.user,
      {
        userId,
        displayName,
        course,
        subjects
      }
    );


    console.log(
      "[Phase 1] Registration successful"
    );


  } catch (error) {

    if (errorElement) {

      errorElement.textContent =
        getFirebaseErrorMessage(error);
    }


  } finally {

    if (registerButton) {

      registerButton.disabled = false;

      registerButton.textContent =
        registerButton.dataset.originalText ||
        "アカウント作成";
    }
  }
}


// ============================================================
// Logout
// ============================================================

async function handleLogout() {

  try {

    await signOut(auth);

    currentUser = null;
    currentPlayer = null;

    console.log(
      "[Phase 1] Logout successful"
    );

  } catch (error) {

    console.error(
      "[Phase 1] Logout failed",
      error
    );
  }
}


// ============================================================
// Authentication observer
// ============================================================

function startAuthObserver() {

  if (authObserverStarted) {
    return;
  }

  authObserverStarted = true;


  onAuthStateChanged(
    auth,
    async (firebaseUser) => {

      console.log(
        "[Phase 1] Auth state changed:",
        firebaseUser
          ? firebaseUser.uid
          : "signed out"
      );


      if (!firebaseUser) {

        currentUser = null;
        currentPlayer = null;

        showLoginScreen();

        return;
      }


      currentUser =
        firebaseUser;


      try {

        const player =
          await loadPlayer(
            firebaseUser
          );


        /*
         * 既存アカウントで
         * Firestoreデータが存在しない場合。
         *
         * Phase 1ではアカウント自体は
         * 正常にログインさせる。
         *
         * 空のプレイヤーデータを生成する。
         */

        if (!player) {

          const newPlayer =
            await createPlayer(
              firebaseUser
            );

          applyPlayerData(
            newPlayer
          );

        } else {

          applyPlayerData(
            player
          );
        }


        showMainScreen();


        console.log(
          "[Phase 1] Main screen displayed"
        );


      } catch (error) {

        console.error(
          "[Phase 1] Player loading failed",
          error
        );


        /*
         * Auth自体は成功しているため、
         * Firebase/Firestoreの問題だけで
         * ログイン画面へ戻さない。
         */

        showMainScreen();


        const profileName =
          firebaseUser.displayName ||
          "プレイヤー";


        setText(
          "header-display-name",
          profileName
        );

        setText(
          "header-level",
          "Lv.1"
        );

        setText(
          "header-rank",
          "Bronze"
        );

        setText(
          "header-coins",
          "0"
        );
      }
    }
  );
}


// ============================================================
// Event initialization
// ============================================================

function initializeEvents() {

  const loginForm =
    getElement("login-form");

  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      handleLogin
    );
  }


  const registerForm =
    getElement("register-form");

  if (registerForm) {

    registerForm.addEventListener(
      "submit",
      handleRegister
    );
  }


  const logoutButton =
    getElement("logout-button");

  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      handleLogout
    );
  }


  const showRegisterButton =
    getElement(
      "show-register-button"
    );

  if (showRegisterButton) {

    showRegisterButton.addEventListener(
      "click",
      showRegisterScreen
    );
  }


  const showLoginButton =
    getElement(
      "show-login-button"
    );

  if (showLoginButton) {

    showLoginButton.addEventListener(
      "click",
      showLoginScreen
    );
  }


  console.log(
    "[Phase 1] Events initialized"
  );
}


// ============================================================
// Boot
// ============================================================

async function boot() {

  if (booted) {
    return;
  }

  booted = true;


  console.log(
    "======================================"
  );

  console.log(
    "受験RPG Phase 1 boot"
  );

  console.log(
    "======================================"
  );


  /*
   * 最初にログイン画面を表示。
   *
   * Firebase初期化中に画面が
   * 真っ白にならないようにする。
   */

  showLoginScreen();


  const firebaseReady =
    initializeFirebase();


  if (!firebaseReady) {

    const errorElement =
      getElement("login-error");

    if (errorElement) {

      errorElement.textContent =
        "Firebaseの初期化に失敗しました。ページを再読み込みしてください。";
    }

    return;
  }


  initializeEvents();


  startAuthObserver();


  console.log(
    "[Phase 1] Boot complete"
  );
}


// ============================================================
// Start
// ============================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    boot,
    {
      once: true
    }
  );

} else {

  boot();
}
