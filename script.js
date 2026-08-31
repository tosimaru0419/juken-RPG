/* =========================================================
   受験RPG
   Firebase Edition
   ========================================================= */


/* =========================================================
   FIREBASE
   ========================================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

const firebaseConfig = {

  apiKey:
    "AIzaSyCggQfYsVVlngak6EJLS74OB3ADV4vFjyo",

  authDomain:
    "juken-rpg-b2840.firebaseapp.com",

  projectId:
    "juken-rpg-b2840",

  storageBucket:
    "juken-rpg-b2840.firebasestorage.app",

  messagingSenderId:
    "332135698063",

  appId:
    "1:332135698063:web:cea3c9be433f948bf1aafa",

  measurementId:
    "G-KLH9WZFNMT"
};


const firebaseApp =
  initializeApp(firebaseConfig);

const auth =
  getAuth(firebaseApp);

const db =
  getFirestore(firebaseApp);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let selectedSubjects = [];


/* =========================================================
   CONSTANTS
   ========================================================= */

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
   DOM
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


function setError(id, message) {

  const element = $(id);

  if (element) {
    element.textContent = message;
  }
}


function clearError(id) {

  setError(id, "");
}


/* =========================================================
   NOTIFICATION
   ========================================================= */

let notificationTimer = null;


function notify(message, duration = 2500) {

  const element =
    $("notification");

  if (!element) return;

  element.textContent =
    message;

  show(element);

  clearTimeout(
    notificationTimer
  );

  notificationTimer =
    setTimeout(() => {

      hide(element);

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


/* =========================================================
   USER ID → FIREBASE EMAIL
   ========================================================= */

function userIdToEmail(userId) {

  return `${userId.toLowerCase()}@jukensei-rpg.local`;
}


/* =========================================================
   REGISTER
   ========================================================= */

$("show-register-button")
  ?.addEventListener(
    "click",
    showRegisterScreen
  );


$("show-login-button")
  ?.addEventListener(
    "click",
    showLoginScreen
  );


$("register-form")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      clearError("register-error");
      clearError("subject-error");


      const userId =
        $("register-user-id")
          ?.value
          .trim();


      const password =
        $("register-password")
          ?.value;


      const passwordConfirm =
        $("register-password-confirm")
          ?.value;


      const displayName =
        $("register-display-name")
          ?.value
          .trim();


      const courseElement =
        document.querySelector(
          'input[name="course"]:checked'
        );


      const course =
        courseElement?.value;


      const subjectElements =
        document.querySelectorAll(
          'input[name="subjects"]:checked'
        );


      const subjects =
        Array.from(subjectElements)
          .map(input => input.value);


      /* -------------------------
         VALIDATION
         ------------------------- */

      if (
        !userId ||
        !/^[a-zA-Z0-9_-]{3,30}$/
          .test(userId)
      ) {

        setError(
          "register-error",
          "ユーザーIDは3〜30文字の英数字・_・-で入力してください。"
        );

        return;
      }


      if (
        !password ||
        password.length < 6
      ) {

        setError(
          "register-error",
          "パスワードは6文字以上にしてください。"
        );

        return;
      }


      if (
        password !==
        passwordConfirm
      ) {

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


      if (!subjects.length) {

        setError(
          "subject-error",
          "少なくとも1教科選択してください。"
        );

        return;
      }


      const button =
        $("register-button");


      if (button) {

        button.disabled = true;

        button.textContent =
          "登録中...";
      }


      try {

        /* -------------------------
           Firebase Auth
           ------------------------- */

        const email =
          userIdToEmail(userId);


        const credential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );


        currentUser =
          credential.user;


        /* -------------------------
           Firestore Profile
           ------------------------- */

        const profile = {

          user_id:
            userId,

          display_name:
            displayName,

          course:
            course,

          subjects:
            subjects,

          level:
            1,

          xp:
            0,

          stars:
            0,

          title:
            "無名の冒険者",

          total_study_minutes:
            0,

          bosses_defeated:
            0,

          quests_completed:
            0,

          created_at:
            new Date().toISOString()
        };


        await setDoc(
          doc(
            db,
            "profiles",
            currentUser.uid
          ),
          profile
        );


        currentProfile =
          profile;

        selectedSubjects =
          subjects;


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
          firebaseErrorMessage(error)
        );


      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "冒険を始める";
        }
      }
    }
  );


/* =========================================================
   LOGIN
   ========================================================= */

$("login-form")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      clearError("login-error");


      const userId =
        $("login-user-id")
          ?.value
          .trim();


      const password =
        $("login-password")
          ?.value;


      if (!userId || !password) {

        setError(
          "login-error",
          "ユーザーIDとパスワードを入力してください。"
        );

        return;
      }


      const button =
        $("login-button");


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "ログイン中...";
      }


      try {

        const email =
          userIdToEmail(userId);


        const credential =
          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );


        currentUser =
          credential.user;


        await loadProfile();

        await openMainApp();


        notify(
          "⚔️ 冒険を再開しました！"
        );


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

          button.disabled =
            false;

          button.textContent =
            "ログイン";
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


  const snapshot =
    await getDoc(
      doc(
        db,
        "profiles",
        currentUser.uid
      )
    );


  if (!snapshot.exists()) {

    throw new Error(
      "プロフィールが見つかりません。"
    );
  }


  currentProfile =
    snapshot.data();


  selectedSubjects =
    Array.isArray(
      currentProfile.subjects
    )
      ? currentProfile.subjects
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

$("logout-button")
  ?.addEventListener(
    "click",
    async () => {

      try {

        await signOut(auth);

        currentUser = null;
        currentProfile = null;
        selectedSubjects = [];


        hide($("main-app"));

        show($("auth-screen"));

        showLoginScreen();


        $("login-form")
          ?.reset();

        $("register-form")
          ?.reset();


        notify(
          "ログアウトしました。"
        );


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


      appScreens.forEach(
        screen => hide(screen)
      );


      show($(screenId));


      navButtons.forEach(
        nav =>
          nav.classList.remove(
            "active"
          )
      );


      button.classList.add(
        "active"
      );


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
          "SCREEN ERROR:",
          error
        );

        notify(
          "データの読み込みに失敗しました。"
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


  const level =
    Number(
      currentProfile.level ?? 1
    );


  const xp =
    Number(
      currentProfile.xp ?? 0
    );


  const stars =
    Number(
      currentProfile.stars ?? 0
    );


  const displayName =
    currentProfile.display_name
    || "冒険者";


  const title =
    currentProfile.title
    || "無名の冒険者";


  const rank =
    calculateRank(
      currentProfile
    );


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
    rank
  );


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


  setText(
    "profile-display-name",
    displayName
  );


  setText(
    "profile-user-id",
    currentProfile.user_id || "-"
  );


  setText(
    "profile-course",
    COURSE_NAMES[
      currentProfile.course
    ] || "-"
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


  updateLevelProgress();
}


/* =========================================================
   LEVEL
   ========================================================= */

function updateLevelProgress() {

  if (!currentProfile) return;


  const level =
    Number(
      currentProfile.level ?? 1
    );


  const xp =
    Number(
      currentProfile.xp ?? 0
    );


  const required = 100;


  const progress =
    Math.min(
      100,
      xp % required
    );


  const bar =
    $("level-progress");


  if (bar) {

    bar.style.width =
      `${progress}%`;
  }


  const remaining =
    required -
    (xp % required);


  setText(
    "home-xp-required",
    `次のレベルまで ${remaining} XP`
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


  if (minutes >= 1500)
    return "Legend";

  if (minutes >= 1000)
    return "Grandmaster";

  if (minutes >= 750)
    return "Master";

  if (minutes >= 500)
    return "Diamond";

  if (minutes >= 300)
    return "Platinum";

  if (minutes >= 200)
    return "Gold";

  if (minutes >= 100)
    return "Silver";


  return "Bronze";
}


/* =========================================================
   SUBJECTS
   ========================================================= */

function populateStudySubjects() {

  const select =
    $("study-subject");


  if (!select) return;


  select.innerHTML =
    `<option value="">
      教科を選択
    </option>`;


  selectedSubjects.forEach(
    subject => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        subject;


      option.textContent =
        SUBJECT_NAMES[subject]
        || subject;


      select.appendChild(
        option
      );
    }
  );
}


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
        document.createElement(
          "label"
        );


      const input =
        document.createElement(
          "input"
        );


      input.type =
        "checkbox";


      input.name =
        "settingsSubjects";


      input.value =
        value;


      input.checked =
        selectedSubjects.includes(
          value
        );


      label.appendChild(
        input
      );


      label.append(
        document.createTextNode(
          name
        )
      );


      container.appendChild(
        label
      );
    }
  );
}


/* =========================================================
   STUDY RECORD
   ========================================================= */

$("study-record-form")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      clearError("study-error");


      if (!currentUser) {

        setError(
          "study-error",
          "ログインしてください。"
        );

        return;
      }


      const subject =
        $("study-subject")
          ?.value;


      const minutes =
        Number(
          $("study-minutes")
            ?.value
        );


      const note =
        $("study-note")
          ?.value
          .trim();


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

        button.textContent =
          "記録中...";
      }


      try {

        const xp =
          minutes;


        await addDoc(
          collection(
            db,
            "study_records"
          ),
          {

            user_id:
              currentUser.uid,

            subject:
              subject,

            minutes:
              minutes,

            xp:
              xp,

            note:
              note || "",

            created_at:
              new Date().toISOString()
          }
        );


        const oldXp =
          Number(
            currentProfile.xp ?? 0
          );


        const oldMinutes =
          Number(
            currentProfile
              .total_study_minutes
              ?? 0
          );


        const newXp =
          oldXp + xp;


        const newMinutes =
          oldMinutes + minutes;


        const oldLevel =
          Number(
            currentProfile.level ?? 1
          );


        const newLevel =
          Math.floor(
            newXp / 100
          ) + 1;


        await updateDoc(
          doc(
            db,
            "profiles",
            currentUser.uid
          ),
          {

            xp:
              newXp,

            level:
              newLevel,

            total_study_minutes:
              newMinutes
          }
        );


        currentProfile.xp =
          newXp;


        currentProfile.level =
          newLevel;


        currentProfile
          .total_study_minutes =
            newMinutes;


        updateAllProfileUI();


        if (newLevel > oldLevel) {

          showLevelUpModal(
            oldLevel,
            newLevel
          );
        }


        $("study-record-form")
          ?.reset();


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
          firebaseErrorMessage(error)
        );


      } finally {

        if (button) {

          button.disabled =
            false;

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


  const recordsQuery =
    query(
      collection(
        db,
        "study_records"
      ),
      where(
        "user_id",
        "==",
        currentUser.uid
      )
    );


  const snapshot =
    await getDocs(
      recordsQuery
    );


  const records =
    snapshot.docs
      .map(
        document => ({
          id: document.id,
          ...document.data()
        })
      )
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ) -
          new Date(
            a.created_at
          )
      );


  renderStudyHistory(
    records
  );


  renderSubjectStudy(
    records
  );
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
      .map(
        record => {

          const subject =
            SUBJECT_NAMES[
              record.subject
            ]
            || record.subject;


          return `
            <div class="study-history-item">

              <strong>
                ${escapeHTML(subject)}
              </strong>

              <div>
                ${record.minutes}分 /
                +${record.xp ?? record.minutes} XP
              </div>

              <small>
                ${formatDate(
                  record.created_at
                )}
              </small>

              ${
                record.note
                  ? `<p>
                      ${escapeHTML(
                        record.note
                      )}
                    </p>`
                  : ""
              }

            </div>
          `;
        }
      )
      .join("");
}


function renderSubjectStudy(records) {

  const list =
    $("subject-study-list");


  if (!list) return;


  const totals = {};


  records.forEach(
    record => {

      totals[
        record.subject
      ] =
        (
          totals[
            record.subject
          ] || 0
        ) +
        Number(
          record.minutes || 0
        );
    }
  );


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
        (a, b) =>
          b[1] - a[1]
      )
      .map(
        ([subject, minutes]) =>
          `
            <div class="subject-study-item">

              <span>
                ${escapeHTML(
                  SUBJECT_NAMES[
                    subject
                  ] || subject
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
   HOME
   ========================================================= */

async function loadHomeData() {

  if (!currentUser) return;


  const recordsQuery =
    query(
      collection(
        db,
        "study_records"
      ),
      where(
        "user_id",
        "==",
        currentUser.uid
      )
    );


  const snapshot =
    await getDocs(
      recordsQuery
    );


  const records =
    snapshot.docs.map(
      document =>
        document.data()
    );


  const today =
    new Date();


  const todayString =
    today.toISOString()
      .slice(0, 10);


  const todayRecords =
    records.filter(
      record =>
        record.created_at
          ?.slice(0, 10)
        === todayString
    );


  const minutes =
    todayRecords.reduce(
      (sum, record) =>
        sum +
        Number(
          record.minutes || 0
        ),
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
    `${minutes}分`
  );


  setText(
    "today-xp",
    `${xp} XP`
  );


  setText(
    "today-quests",
    "0"
  );


  setText(
    "home-rank",
    calculateRank(
      currentProfile
    )
  );


  if ($("home-quest-list")) {

    $("home-quest-list").innerHTML =
      `
        <div class="quest-card">

          <h4>
            📚 今日の勉強
          </h4>

          <p>
            今日の勉強時間を積み上げよう。
          </p>

          <span class="quest-reward">
            報酬：1分 = 1 XP
          </span>

        </div>
      `;
  }
}


/* =========================================================
   QUEST
   ========================================================= */

async function loadQuestData() {

  const daily =
    $("daily-quest-list");

  const weekly =
    $("weekly-quest-list");

  const history =
    $("quest-history-list");


  if (daily) {

    daily.innerHTML =
      `
        <div class="quest-card">

          <h4>
            📚 今日の勉強
          </h4>

          <p>
            勉強時間を記録してXPを獲得しよう。
          </p>

          <span class="quest-reward">
            報酬：XP
          </span>

        </div>
      `;
  }


  if (weekly) {

    weekly.innerHTML =
      `
        <div class="quest-card">

          <h4>
            🔥 今週の冒険
          </h4>

          <p>
            継続して勉強しよう。
          </p>

          <span class="quest-reward">
            報酬：⭐
          </span>

        </div>
      `;
  }


  if (history) {

    history.innerHTML =
      `
        <p class="empty-message">
          クエスト履歴は準備中です。
        </p>
      `;
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


  const subjects =
    selectedSubjects.length
      ? selectedSubjects
      : Object.keys(
          SUBJECT_NAMES
        );


  const weakness =
    subjects[
      Math.floor(
        Math.random() *
        subjects.length
      )
    ];


  setText(
    "boss-weakness-subject",
    SUBJECT_NAMES[
      weakness
    ] || weakness
  );


  setText(
    "boss-weakness-multiplier",
    "×1.5"
  );


  const list =
    $("boss-party-member-list");


  if (list) {

    list.innerHTML =
      `
        <p class="empty-message">
          パーティーメンバー情報は準備中です。
        </p>
      `;
  }


  setText(
    "boss-party-count",
    "0人"
  );
}


$("boss-refresh-button")
  ?.addEventListener(
    "click",
    async () => {

      await loadBossData();

      notify(
        "👹 ボス情報を更新しました！"
      );
    }
  );


/* =========================================================
   PARTY
   ========================================================= */

async function loadPartyData() {

  setText(
    "party-member-count",
    "0人"
  );


  setText(
    "party-week-range",
    getWeekRange()
  );


  const list =
    $("party-member-list");


  if (list) {

    list.innerHTML =
      `
        <p class="empty-message">
          パーティー機能は準備中です。
        </p>
      `;
  }
}


$("party-invite-form")
  ?.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      clearError(
        "party-error"
      );


      setError(
        "party-error",
        "パーティー招待機能は準備中です。"
      );
    }
  );


/* =========================================================
   RANK
   ========================================================= */

async function loadRankData() {

  if (!currentProfile) return;


  const rank =
    calculateRank(
      currentProfile
    );


  setText(
    "current-rank-name",
    rank
  );


  setText(
    "current-season-time",
    "-"
  );


  setText(
    "home-rank",
    rank
  );


  setText(
    "header-rank",
    rank
  );
}


/* =========================================================
   ACHIEVEMENT
   ========================================================= */

async function loadAchievementData() {

  const list =
    $("achievement-list");


  if (!list) return;


  list.innerHTML =
    `
      <div class="achievement-card">

        <div>
          <h4>
            🌱 冒険者誕生
          </h4>

          <p>
            受験RPGに登録した。
          </p>
        </div>

      </div>


      <div class="achievement-card">

        <div>
          <h4>
            📚 第一歩
          </h4>

          <p>
            勉強時間を記録する。
          </p>
        </div>

      </div>


      <div class="achievement-card">

        <div>
          <h4>
            🔥 継続の力
          </h4>

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
   PROFILE
   ========================================================= */

async function loadProfileData() {

  if (!currentProfile) {

    await loadProfile();
  }


  updateAllProfileUI();


  const list =
    $("profile-subject-list");


  if (!list) return;


  if (!selectedSubjects.length) {

    list.innerHTML =
      `<p>-</p>`;

    return;
  }


  list.innerHTML =
    selectedSubjects
      .map(
        subject =>
          `
            <span class="profile-subject">
              ${escapeHTML(
                SUBJECT_NAMES[
                  subject
                ] || subject
              )}
            </span>
          `
      )
      .join("");
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
      currentProfile.display_name
      || "";
  }


  populateSettingsSubjects();
}


/* =========================================================
   DISPLAY NAME
   ========================================================= */

$("display-name-form")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      clearError(
        "display-name-error"
      );


      const name =
        $("settings-display-name")
          ?.value
          .trim();


      if (!name) {

        setError(
          "display-name-error",
          "表示名を入力してください。"
        );

        return;
      }


      try {

        await updateDoc(
          doc(
            db,
            "profiles",
            currentUser.uid
          ),
          {
            display_name:
              name
          }
        );


        currentProfile.display_name =
          name;


        updateAllProfileUI();


        notify(
          "表示名を変更しました！"
        );


      } catch (error) {

        console.error(error);


        setError(
          "display-name-error",
          firebaseErrorMessage(error)
        );
      }
    }
  );


/* =========================================================
   SUBJECT SETTINGS
   ========================================================= */

$("subject-settings-form")
  ?.addEventListener(
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
          .map(
            input => input.value
          );


      if (!subjects.length) {

        setError(
          "settings-subject-error",
          "少なくとも1教科選択してください。"
        );

        return;
      }


      try {

        await updateDoc(
          doc(
            db,
            "profiles",
            currentUser.uid
          ),
          {
            subjects:
              subjects
          }
        );


        currentProfile.subjects =
          subjects;


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
          firebaseErrorMessage(error)
        );
      }
    }
  );


/* =========================================================
   PASSWORD
   ========================================================= */

$("password-form")
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      clearError(
        "password-error"
      );


      const password =
        $("settings-new-password")
          ?.value;


      if (
        !password ||
        password.length < 6
      ) {

        setError(
          "password-error",
          "パスワードは6文字以上にしてください。"
        );

        return;
      }


      try {

        if (!currentUser) {

          throw new Error(
            "ログインしてください。"
          );
        }


        await updatePassword(
          currentUser,
          password
        );


        $("password-form")
          ?.reset();


        notify(
          "パスワードを変更しました！"
        );


      } catch (error) {

        console.error(error);


        setError(
          "password-error",
          firebaseErrorMessage(error)
        );
      }
    }
  );


/* =========================================================
   DELETE
   ========================================================= */

$("delete-account-button")
  ?.addEventListener(
    "click",
    () => {

      alert(
        "アカウント削除機能は次のバージョンで実装します。"
      );
    }
  );


/* =========================================================
   LEVEL MODAL
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


  show(
    $("level-up-modal")
  );
}


$("level-up-close-button")
  ?.addEventListener(
    "click",
    () => {

      hide(
        $("level-up-modal")
      );
    }
  );


/* =========================================================
   AUTO LOGIN
   ========================================================= */

onAuthStateChanged(
  auth,
  async user => {

    try {

      if (user) {

        currentUser =
          user;


        await loadProfile();


        await openMainApp();


      } else {

        currentUser =
          null;


        currentProfile =
          null;


        hide(
          $("main-app")
        );


        show(
          $("auth-screen")
        );


        showLoginScreen();
      }


    } catch (error) {

      console.error(
        "AUTH STATE ERROR:",
        error
      );


      hide(
        $("main-app")
      );


      show(
        $("auth-screen")
      );


      showLoginScreen();


      setError(
        "login-error",
        "アカウント情報の読み込みに失敗しました。"
      );
    }
  }
);


/* =========================================================
   UTILITIES
   ========================================================= */

function formatDate(dateString) {

  if (!dateString) {
    return "-";
  }


  const date =
    new Date(
      dateString
    );


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

  if (
    value === null ||
    value === undefined
  ) {

    return "";
  }


  return String(value)
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


function firebaseErrorMessage(
  error
) {

  console.error(error);


  const code =
    error?.code || "";


  switch (code) {

    case "auth/email-already-in-use":

      return "そのユーザーIDはすでに使用されています。";


    case "auth/invalid-email":

      return "ユーザーIDが正しくありません。";


    case "auth/weak-password":

      return "パスワードは6文字以上にしてください。";


    case "auth/invalid-credential":

    case "auth/wrong-password":

    case "auth/user-not-found":

      return "ユーザーIDまたはパスワードが正しくありません。";


    case "auth/too-many-requests":

      return "試行回数が多すぎます。少し時間を置いてください。";


    case "permission-denied":

      return "Firestoreの権限設定を確認してください。";


    default:

      return (
        error?.message ||
        "エラーが発生しました。"
      );
  }
}


function getWeekRange() {

  const now =
    new Date();


  const day =
    now.getDay();


  const diff =
    day === 0
      ? -6
      : 1 - day;


  const monday =
    new Date(now);


  monday.setDate(
    now.getDate() + diff
  );


  const sunday =
    new Date(monday);


  sunday.setDate(
    monday.getDate() + 6
  );


  return (
    `${monday.toLocaleDateString("ja-JP")} ～ ` +
    `${sunday.toLocaleDateString("ja-JP")}`
  );
}
console.log("🔥 受験RPG JS 起動確認");
