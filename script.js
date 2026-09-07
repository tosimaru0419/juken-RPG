// ============================================================
// 受験RPG - AUTH 基盤 v2
// ID / PASSWORD / 文理 / 選択科目
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

alert("FIREBASE IMPORT OK");

const firebaseConfig = {
  apiKey: "AIzaSyCggQfYsVVlngak6EJLS74OB3ADV4vFjyo",
  authDomain: "juken-rpg-b2840.firebaseapp.com",
  projectId: "juken-rpg-b2840",
  storageBucket: "juken-rpg-b2840.firebasestorage.app",
  messagingSenderId: "332135698063",
  appId: "1:332135698063:web:cea3c9be433f948bf1aafa",
  measurementId: "G-KLH9WZFNMT",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);

const SUBJECTS = [
  "数学IA",
  "数学IIBC",
  "数学III",

  "現代文",
  "古文",
  "漢文",

  "日本史",
  "世界史",
  "地理",
  "地学",
  "地学基礎",
  "政治・経済",
  "倫理",
  "公共",

  "化学",
  "化学基礎",
  "物理",
  "物理基礎",
  "生物",
  "生物基礎",

  "英語",
  "情報",
];

function normalizeId(value) {
  return String(value || "").trim().toUpperCase();
}

function validId(value) {
  return /^[A-Z0-9_-]{4,20}$/.test(value);
}

function emailFromId(id) {
  return `${id.toLowerCase()}@juken-rpg.local`;
}

function page(content) {
  document.body.innerHTML = `
    <main style="
      min-height:100vh;
      display:grid;
      place-items:center;
      background:#080b12;
      color:#fff;
      font-family:system-ui,sans-serif;
      padding:24px;
    ">
      ${content}
    </main>
  `;
}

function card(content) {
  return `
    <section style="
      width:min(460px,100%);
      background:#111722;
      border:1px solid #263247;
      border-radius:20px;
      padding:24px;
      display:grid;
      gap:16px;
    ">
      ${content}
    </section>
  `;
}

function fieldStyle() {
  return `
    padding:14px;
    border-radius:12px;
    border:1px solid #34405a;
    background:#0b1019;
    color:#fff;
    font:inherit;
  `;
}

function buttonStyle(primary = true) {
  return primary
    ? `
      padding:14px;
      border:0;
      border-radius:12px;
      font-weight:700;
      cursor:pointer;
    `
    : `
      padding:14px;
      border:1px solid #34405a;
      border-radius:12px;
      background:#161d2a;
      color:#fff;
      font-weight:700;
      cursor:pointer;
    `;
}

// ============================================================
// LOGIN
// ============================================================

function showAuth() {
  page(
    card(`
      <h1 style="margin:0">受験RPG</h1>

      <input
        id="login-id"
        placeholder="ユーザーID"
        autocomplete="username"
        style="${fieldStyle()}"
      >

      <input
        id="login-password"
        type="password"
        placeholder="パスワード"
        autocomplete="current-password"
        style="${fieldStyle()}"
      >

      <button id="login-btn" style="${buttonStyle(true)}">
        ログイン
      </button>

      <button id="show-register-btn" style="${buttonStyle(false)}">
        新規登録
      </button>

      <p
        id="auth-error"
        style="margin:0;min-height:1.4em;color:#ff8b8b"
      ></p>
    `)
  );

  $("show-register-btn").onclick = showRegister;

  $("login-btn").onclick = async () => {
    const id = normalizeId($("login-id").value);
    const password = $("login-password").value;

    try {
      $("auth-error").textContent = "";

      if (!validId(id)) {
        throw new Error(
          "IDは4〜20文字の半角英数字・_・-で入力してください。"
        );
      }

      if (password.length < 6) {
        throw new Error("パスワードは6文字以上です。");
      }

      await signInWithEmailAndPassword(
        auth,
        emailFromId(id),
        password
      );
    } catch (error) {
      $("auth-error").textContent =
        error?.code === "auth/invalid-credential"
          ? "ユーザーIDかパスワードが違います。"
          : error?.message || "ログインに失敗しました。";
    }
  };
}

// ============================================================
// REGISTER
// ============================================================

function showRegister() {
  const subjectHtml = SUBJECTS.map(
    (subject) => `
      <label style="
        display:flex;
        align-items:center;
        gap:8px;
        padding:8px 10px;
        background:#0b1019;
        border:1px solid #263247;
        border-radius:10px;
      ">
        <input
          type="checkbox"
          class="subject-checkbox"
          value="${subject}"
        >
        ${subject}
      </label>
    `
  ).join("");

  page(
    card(`
      <h1 style="margin:0">新規登録</h1>

      <input
        id="register-name"
        placeholder="ユーザー名"
        style="${fieldStyle()}"
      >

      <input
        id="register-id"
        placeholder="ユーザーID"
        style="${fieldStyle()}"
      >

      <input
        id="register-password"
        type="password"
        placeholder="パスワード"
        style="${fieldStyle()}"
      >

      <input
        id="register-password2"
        type="password"
        placeholder="パスワード確認"
        style="${fieldStyle()}"
      >

      <div style="display:grid;gap:8px">
        <strong>文理選択</strong>

        <label>
          <input
            type="radio"
            name="track"
            value="文系"
          >
          文系
        </label>

        <label>
          <input
            type="radio"
            name="track"
            value="理系"
          >
          理系
        </label>
      </div>

      <div style="display:grid;gap:8px">
        <strong>選択科目</strong>

        <div style="
          max-height:280px;
          overflow:auto;
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
        ">
          ${subjectHtml}
        </div>
      </div>

      <button id="register-btn" style="${buttonStyle(true)}">
        登録する
      </button>

      <button id="back-login-btn" style="${buttonStyle(false)}">
        戻る
      </button>

      <p
        id="register-error"
        style="margin:0;min-height:1.4em;color:#ff8b8b"
      ></p>
    `)
  );

  $("back-login-btn").onclick = showAuth;

  $("register-btn").onclick = async () => {
    const username = $("register-name").value.trim();
    const id = normalizeId($("register-id").value);
    const password = $("register-password").value;
    const password2 = $("register-password2").value;

    const track =
      document.querySelector('input[name="track"]:checked')
        ?.value || "";

    const selectedSubjects = [
      ...document.querySelectorAll(
        ".subject-checkbox:checked"
      ),
    ].map((el) => el.value);

    try {
      $("register-error").textContent = "";

      if (!username) {
        throw new Error("ユーザー名を入力してください。");
      }

      if (!validId(id)) {
        throw new Error(
          "IDは4〜20文字の半角英数字・_・-で入力してください。"
        );
      }

      if (password.length < 6) {
        throw new Error("パスワードは6文字以上です。");
      }

      if (password !== password2) {
        throw new Error("パスワードが一致していません。");
      }

      if (!track) {
        throw new Error("文系か理系を選択してください。");
      }

      if (selectedSubjects.length === 0) {
        throw new Error("科目を1つ以上選択してください。");
      }

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          emailFromId(id),
          password
        );

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          username,
          globalId: id,
          track,
          selectedSubjects,

          level: 1,
          xp: 0,
          coins: 0,

          totalStudyMinutes: 0,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    } catch (error) {
      $("register-error").textContent =
        error?.code === "auth/email-already-in-use"
          ? "このユーザーIDはすでに使われています。"
          : error?.message || "登録に失敗しました。";
    }
  };
}

// ============================================================
// HOME
// ============================================================

async function showHome(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("ユーザーデータが見つかりません。");
  }

  const data = snap.data();

  const totalXp = Number(data.xp ?? 0);
  const levelInfo = calculateLevelFromTotalXp(totalXp);

  const level = levelInfo.level;
  const xp = levelInfo.currentXp;
  const neededXp = levelInfo.neededXp;

  const coins = Number(data.coins ?? 0);
  const totalStudyMinutes = Number(data.totalStudyMinutes ?? 0);

  const hours = Math.floor(totalStudyMinutes / 60);
  const minutes = totalStudyMinutes % 60;

  page(
    card(`
      <div style="display:grid;gap:6px">
        <h1 style="margin:0">受験RPG</h1>
        <span style="color:#9aa6ba">
          ${data.username ?? "-"} / ${data.globalId ?? "-"}
        </span>
      </div>

      <div style="
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px;
      ">
        <div style="
          padding:16px;
          background:#0b1019;
          border:1px solid #263247;
          border-radius:14px;
        ">
          <div style="color:#9aa6ba;font-size:.85rem">LEVEL</div>
          <strong style="font-size:1.6rem">Lv.${level}</strong>
        </div>

        <div style="
          padding:16px;
          background:#0b1019;
          border:1px solid #263247;
          border-radius:14px;
        ">
          <div style="color:#9aa6ba;font-size:.85rem">XP</div>
          <strong style="font-size:1.6rem">
            ${level >= 100 ? "MAX" : `${xp} / ${neededXp}`}
          </strong>
        </div>

        <div style="
          padding:16px;
          background:#0b1019;
          border:1px solid #263247;
          border-radius:14px;
        ">
          <div style="color:#9aa6ba;font-size:.85rem">COINS</div>
          <strong style="font-size:1.6rem">${coins}</strong>
        </div>

        <div style="
          padding:16px;
          background:#0b1019;
          border:1px solid #263247;
          border-radius:14px;
        ">
          <div style="color:#9aa6ba;font-size:.85rem">累計勉強時間</div>
          <strong style="font-size:1.2rem">
            ${hours}時間 ${minutes}分
          </strong>
        </div>
      </div>

      <div style="
        padding:16px;
        background:#0b1019;
        border:1px solid #263247;
        border-radius:14px;
      ">
        <div style="color:#9aa6ba;font-size:.85rem">現在ランク</div>
        <strong style="font-size:1.5rem">Bronze III</strong>
      </div>

      <button
        id="logout-btn"
        style="${buttonStyle(true)}"
      >
        ログアウト
      </button>
    `)
  );

  $("logout-btn").onclick = async () => {
    await signOut(auth);
  };
}

// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showAuth();
    return;
  }

  try {
    await showHome(user);
  } catch (error) {
    page(
      card(`
        <h2>起動エラー</h2>

        <p style="color:#ff8b8b">
          ${error?.message || error}
        </p>

        <button
          id="error-logout"
          style="${buttonStyle(true)}"
        >
          ログアウト
        </button>
      `)
    );

    $("error-logout").onclick = () => signOut(auth);
  }
});
python3 - <<'PY'
from pathlib import Path

p = Path("script.js")
s = p.read_text(encoding="utf-8")

insert_after = '''function emailFromId(id) {
  return `${id.toLowerCase()}@juken-rpg.local`;
}
'''

addition = r'''

function xpNeededForLevel(level) {
  if (level >= 100) return 0;

  const band = Math.floor(level / 10);
  return 100 + band * 50;
}

function calculateLevelFromTotalXp(totalXp) {
  let level = 1;
  let remainingXp = Math.max(0, Number(totalXp || 0));

  while (level < 100) {
    const needed = xpNeededForLevel(level);

    if (remainingXp < needed) break;

    remainingXp -= needed;
    level++;
  }

  return {
    level,
    currentXp: remainingXp,
    neededXp: level >= 100 ? 0 : xpNeededForLevel(level),
  };
}
'''

if "function calculateLevelFromTotalXp" not in s:
    s = s.replace(insert_after, insert_after + addition, 1)

p.write_text(s, encoding="utf-8")
print("✅ レベル計算関数を追加しました")
PY

node --check script.js