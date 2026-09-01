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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ============================================================
// DOM
// ============================================================

const $ = (id) => document.getElementById(id);

function show(id) {
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

function hide(id) {
  const el = $(id);
  if (el) el.classList.add("hidden");
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "";
}


// ============================================================
// User ID → Firebase email
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
// Error messages
// ============================================================

function firebaseErrorMessage(error) {

  console.error(error);

  switch (error?.code) {

    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "ユーザーIDまたはパスワードが違います。";

    case "auth/email-already-in-use":
      return "そのユーザーIDはすでに使用されています。";

    case "auth/weak-password":
      return "パスワードが弱すぎます。";

    case "auth/too-many-requests":
      return "試行回数が多すぎます。少し待ってから再試行してください。";

    case "auth/network-request-failed":
      return "ネットワークエラーが発生しました。";

    case "auth/operation-not-allowed":
      return "Firebase側でログイン方式が有効になっていません。";

    default:
      return error?.message || "エラーが発生しました。";
  }
}


// ============================================================
// Screen control
// ============================================================

function showLoginScreen() {

  show("auth-screen");
  show("login-screen");

  hide("register-screen");
  hide("main-app");
}

function showRegisterScreen() {

  show("auth-screen");

  hide("login-screen");
  show("register-screen");

  hide("main-app");
}

function showMainApp() {

  hide("auth-screen");
  show("main-app");
}


// ============================================================
// Firestore user
// ============================================================

async function createUserDocument(firebaseUser, data = {}) {

  const userRef = doc(db, "users", firebaseUser.uid);

  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data();
  }

  const userData = {

    uid: firebaseUser.uid,

    userId: data.userId || "",

    displayName:
      data.displayName ||
      data.userId ||
      "プレイヤー",

    course:
      data.course ||
      "undecided",

    subjects:
      Array.isArray(data.subjects)
        ? data.subjects
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

  await setDoc(userRef, userData);

  return userData;
}


async function loadUser(firebaseUser) {

  const userRef = doc(db, "users", firebaseUser.uid);

  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {

    console.warn(
      "Firestoreにユーザーデータがありません。"
    );

    return createUserDocument(firebaseUser);
  }

  return snapshot.data();
}


// ============================================================
// Main UI
// ============================================================

function applyUserToHeader(userData) {

  setText(
    "header-display-name",
    userData.displayName || "プレイヤー"
  );

  setText(
    "header-level",
    `Lv.${userData.level ?? 1}`
  );

  setText(
    "header-rank",
    "Bronze"
  );

  setText(
    "header-coins",
    `${userData.coins ?? 0}`
  );

  setText(
    "home-level",
    userData.level ?? 1
  );

  setText(
    "home-xp",
    userData.xp ?? 0
  );

  setText(
    "home-xp-required",
    100
  );

  setText(
    "profile-display-name",
    userData.displayName || "プレイヤー"
  );

  setText(
    "profile-user-id",
    userData.userId || ""
  );

  setText(
    "profile-course",
    userData.course || "未設定"
  );

  setText(
    "profile-level",
    userData.level ?? 1
  );

  setText(
    "profile-xp",
    userData.xp ?? 0
  );

  setText(
    "profile-coins",
    userData.coins ?? 0
  );

  setText(
    "profile-stars",
    userData.stars ?? 0
  );
}


// ============================================================
// Login
// ============================================================

async function handleLogin(event) {

  event.preventDefault();

  const userIdInput = $("login-user-id");
  const passwordInput = $("login-password");
  const errorElement = $("login-error");
  const button = $("login-button");

  const userId =
    normalizeUserId(userIdInput?.value);

  const password =
    passwordInput?.value || "";

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

  if (errorElement) {
    errorElement.textContent = "";
  }

  if (button) {
    button.disabled = true;
    button.dataset.originalText =
      button.textContent;

    button.textContent = "ログイン中...";
  }

  try {

    const credential =
      await signInWithEmailAndPassword(
        auth,
        userIdToEmail(userId),
        password
      );

    console.log(
      "Firebaseログイン成功:",
      credential.user.uid
    );

    // onAuthStateChanged側で画面遷移する

  } catch (error) {

    if (errorElement) {
      errorElement.textContent =
        firebaseErrorMessage(error);
    }

    if (passwordInput) {
      passwordInput.value = "";
    }

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        button.dataset.originalText ||
        "ログイン";
    }
  }
}


// ============================================================
// Register
// ============================================================

async function handleRegister(event) {

  event.preventDefault();

  const userIdInput = $("register-user-id");
  const passwordInput = $("register-password");
  const confirmInput = $("register-password-confirm");
  const displayNameInput = $("register-display-name");

  const errorElement = $("register-error");

  const userId =
    normalizeUserId(userIdInput?.value);

  const password =
    passwordInput?.value || "";

  const confirm =
    confirmInput?.value || "";

  const displayName =
    displayNameInput?.value.trim() ||
    userId;

  const course =
    document.querySelector(
      'input[name="course"]:checked'
    )?.value || "undecided";

  const subjects = [
    ...document.querySelectorAll(
      'input[name="subjects"]:checked'
    )
  ].map((input) => input.value);

  if (errorElement) {
    errorElement.textContent = "";
  }

  if (!userId) {

    if (errorElement)
      errorElement.textContent =
        "ユーザーIDを入力してください。";

    return;
  }

  if (password.length < 6) {

    if (errorElement)
      errorElement.textContent =
        "パスワードは6文字以上にしてください。";

    return;
  }

  if (password !== confirm) {

    if (errorElement)
      errorElement.textContent =
        "パスワードが一致しません。";

    return;
  }

  try {

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        userIdToEmail(userId),
        password
      );

    await createUserDocument(
      credential.user,
      {
        userId,
        displayName,
        course,
        subjects
      }
    );

    console.log("アカウント作成成功");

  } catch (error) {

    if (errorElement) {
      errorElement.textContent =
        firebaseErrorMessage(error);
    }
  }
}


// ============================================================
// Logout
// ============================================================

async function handleLogout() {

  try {

    await signOut(auth);

  } catch (error) {

    console.error(
      "ログアウトエラー:",
      error
    );
  }
}


// ============================================================
// Auth state
// ============================================================

let authProcessing = false;

onAuthStateChanged(auth, async (firebaseUser) => {

  if (authProcessing) {
    return;
  }

  authProcessing = true;

  try {

    if (!firebaseUser) {

      console.log("未ログイン");

      showLoginScreen();

      return;
    }

    console.log(
      "ログイン済み:",
      firebaseUser.uid
    );

    // Firestoreからユーザーデータ取得
    const userData =
      await loadUser(firebaseUser);

    console.log(
      "ユーザーデータ取得成功:",
      userData
    );

    applyUserToHeader(userData);

    showMainApp();

  } catch (error) {

    console.error(
      "ログイン後の初期化エラー:",
      error
    );

    // 認証そのものは成功している可能性があるので、
    // 画面を完全に殺さない
    showMainApp();

  } finally {

    authProcessing = false;
  }
});


// ============================================================
// Event listeners
// ============================================================

function initializeEvents() {

  const loginForm = $("login-form");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      handleLogin
    );
  }

  const registerForm = $("register-form");

  if (registerForm) {
    registerForm.addEventListener(
      "submit",
      handleRegister
    );
  }

  const logoutButton = $("logout-button");

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      handleLogout
    );
  }

  const showRegisterButton =
    $("show-register-button");

  if (showRegisterButton) {

    showRegisterButton.addEventListener(
      "click",
      showRegisterScreen
    );
  }

  const showLoginButton =
    $("show-login-button");

  if (showLoginButton) {

    showLoginButton.addEventListener(
      "click",
      showLoginScreen
    );
  }
}


// ============================================================
// Boot
// ============================================================

function boot() {

  try {

    console.log(
      "================================"
    );

    console.log(
      "受験RPG Phase 1 起動"
    );

    console.log(
      "Firebase:",
      "OK"
    );

    initializeEvents();

    console.log(
      "イベント:",
      "OK"
    );

    console.log(
      "Auth監視:",
      "開始"
    );

    console.log(
      "================================"
    );

  } catch (error) {

    console.error(
      "Boot error:",
      error
    );

    // 起動処理で問題があっても
    // ログイン画面だけは表示する
    showLoginScreen();
  }
}


if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    boot,
    { once: true }
  );

} else {

  boot();
}
