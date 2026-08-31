/* =========================================================
   受験RPG - Full Functional Engine
   ========================================================= */

// ↓↓↓ ご自身のSupabase環境に置き換えてください ↓↓↓
const SUPABASE_URL = "Sb_publishable_0cb06S_AzQXMA1RCPMC7Kg_l2Z-7dvZ
";
const SUPABASE_ANON_KEY = "sb_publishable_0cb06S_AzQXMA1RCPMC7Kg_l2Z-7dvZ";

let db = null;
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
   DOM HELPERS & UTILS
   ========================================================= */
function $(id) {
  return document.getElementById(id);
}

function show(element) {
  if (element) element.classList.remove("hidden");
}

function hide(element) {
  if (element) element.classList.add("hidden");
}

function setText(id, text) {
  const element = $(id);
  if (element) element.textContent = text;
}

let notificationTimer = null;
function notify(message, duration = 2500) {
  const notification = $("notification");
  if (!notification) return;
  notification.textContent = message;
  show(notification);
  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => hide(notification), duration);
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("ja-JP", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function escapeHTML(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setError(id, message) {
  const el = $(id);
  if (el) el.textContent = message;
}

function clearError(id) {
  const el = $(id);
  if (el) el.textContent = "";
}

/* =========================================================
   AUTH & SCREEN NAVIGATION
   ========================================================= */
function showLoginScreen() {
  show($("login-screen"));
  hide($("register-screen"));
  clearError("login-error");
}

function showRegisterScreen() {
  hide($("login-screen"));
  show($("register-screen"));
  clearError("register-error");
  clearError("subject-error");
}

async function openMainApp() {
  hide($("auth-screen"));
  show($("main-app"));
  updateAllProfileUI();
  populateStudySubjects();
  populateSettingsSubjects();
  await loadHomeData();
}

/* =========================================================
   PROFILE & CALCULATIONS
   ========================================================= */
function calculateRank(profile) {
  const minutes = Number(profile?.total_study_minutes ?? 0);
  if (minutes >= 1500) return "Legend";
  if (minutes >= 1000) return "Grandmaster";
  if (minutes >= 750) return "Master";
  if (minutes >= 500) return "Diamond";
  if (minutes >= 300) return "Platinum";
  if (minutes >= 200) return "Gold";
  if (minutes >= 100) return "Silver";
  return "Bronze";
}

function updateAllProfileUI() {
  if (!currentProfile) return;
  const p = currentProfile;
  const level = Number(p.level ?? 1);
  const xp = Number(p.xp ?? 0);
  const stars = Number(p.stars ?? 0);
  const name = p.display_name || "冒険者";
  const title = p.title || "無名の冒険者";
  const rank = calculateRank(p);

  setText("header-display-name", name);
  setText("header-level", `Lv.${level}`);
  setText("header-rank", rank);

  setText("home-level", level);
  setText("home-xp", `${xp} XP`);
  setText("star-count", `⭐ ${stars}`);
  setText("star-title", title);

  setText("profile-display-name", name);
  setText("profile-user-id", p.user_id || "-");
  setText("profile-course", COURSE_NAMES[p.course] || "-");
  setText("profile-level", level);
  setText("profile-stars", stars);
  setText("profile-title", title);
  setText("profile-total-study-time", `${p.total_study_minutes || 0}分`);
  setText("profile-total-xp", `${xp} XP`);

  // 進捗バー (100XPで1レベル)
  const required = 100;
  const currentLevelXp = xp % required;
  const progress = Math.min(100, (currentLevelXp / required) * 100);
  const bar = $("level-progress");
  if (bar) bar.style.width = `${progress}%`;
  setText("home-xp-required", `次のレベルまで ${required - currentLevelXp} XP`);
}

async function loadProfile() {
  if (!currentUser) return;
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) throw error;
  currentProfile = data;
  selectedSubjects = Array.isArray(data.subjects) ? data.subjects : [];
}

/* =========================================================
   EVENT LISTENERS SETUP
   ========================================================= */
function setupEventListeners() {
  // 画面切替
  $("show-register-button")?.addEventListener("click", showRegisterScreen);
  $("show-login-button")?.addEventListener("click", showLoginScreen);

  // 新規登録
  $("register-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("register-error");
    clearError("subject-error");

    const userId = $("register-user-id")?.value.trim();
    const password = $("register-password")?.value;
    const passwordConfirm = $("register-password-confirm")?.value;
    const displayName = $("register-display-name")?.value.trim();
    const course = document.querySelector('input[name="course"]:checked')?.value;
    const subjects = Array.from(document.querySelectorAll('input[name="subjects"]:checked')).map(i => i.value);

    if (!userId || !/^[a-zA-Z0-9_-]{3,30}$/.test(userId)) return setError("register-error", "ユーザーIDは3〜30文字の英数字・_・-で入力してください。");
    if (!password || password.length < 6) return setError("register-error", "パスワードは6文字以上にしてください。");
    if (password !== passwordConfirm) return setError("register-error", "パスワードが一致しません。");
    if (!displayName) return setError("register-error", "表示名を入力してください。");
    if (!course) return setError("register-error", "文理を選択してください。");
    if (subjects.length === 0) return setError("subject-error", "少なくとも1教科選択してください。");

    const btn = $("register-button");
    if (btn) { btn.disabled = true; btn.textContent = "登録中..."; }

    try {
      const { data: existing } = await db.from("profiles").select("id").eq("user_id", userId).maybeSingle();
      if (existing) throw new Error("そのユーザーIDは既に使用されています。");

      const email = `${userId}@jukensei-rpg.local`;
      const { data: authData, error: authError } = await db.auth.signUp({ email, password });
      if (authError) throw authError;

      currentUser = authData.user;
      const { data: profile, error: profileError } = await db
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
          total_study_minutes: 0,
          title: "無名の冒険者"
        })
        .select().single();

      if (profileError) throw profileError;

      currentProfile = profile;
      selectedSubjects = subjects;
      notify("🎉 冒険者登録完了！");
      await openMainApp();
    } catch (err) {
      setError("register-error", err.message || "登録に失敗しました。");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "冒険を始める"; }
    }
  });

  // ログイン
  $("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("login-error");
    const userId = $("login-user-id")?.value.trim();
    const password = $("login-password")?.value;

    if (!userId || !password) return setError("login-error", "IDとパスワードを入力してください。");

    const btn = $("login-button");
    if (btn) { btn.disabled = true; btn.textContent = "ログイン中..."; }

    try {
      const email = `${userId}@jukensei-rpg.local`;
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;

      currentUser = data.user;
      await loadProfile();
      await openMainApp();
      notify("⚔️ 冒険を再開しました！");
    } catch (err) {
      setError("login-error", "ユーザーIDまたはパスワードが正しくありません。");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "ログイン"; }
    }
  });

  // ログアウト
  $("logout-button")?.addEventListener("click", async () => {
    await db.auth.signOut();
    currentUser = null;
    currentProfile = null;
    hide($("main-app"));
    show($("auth-screen"));
    showLoginScreen();
    notify("ログアウトしました。");
  });

  // ナビゲーション切り替え
  const navButtons = document.querySelectorAll("#main-navigation .nav-button");
  const appScreens = document.querySelectorAll(".app-screen");

  navButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const screenId = btn.dataset.screen;
      if (!screenId) return;

      appScreens.forEach(s => hide(s));
      show($(screenId));

      navButtons.forEach(n => n.classList.remove("active"));
      btn.classList.add("active");

      switch (screenId) {
        case "home-screen": await loadHomeData(); break;
        case "study-screen": await loadStudyData(); break;
        case "quest-screen": await loadQuestData(); break;
        case "boss-screen": await loadBossData(); break;
        case "party-screen": await loadPartyData(); break;
        case "rank-screen": await loadRankData(); break;
        case "achievement-screen": await loadAchievementData(); break;
        case "profile-screen": await loadProfileData(); break;
        case "settings-screen": await loadSettingsData(); break;
      }
    });
  });

  // 勉強記録フォーム
  $("study-record-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("study-error");

    const subject = $("study-subject")?.value;
    const minutes = Number($("study-minutes")?.value);
    const note = $("study-note")?.value.trim();

    if (!subject) return setError("study-error", "教科を選択してください。");
    if (!minutes || minutes < 1) return setError("study-error", "正しい時間を入力してください。");

    const btn = $("record-study-button");
    if (btn) { btn.disabled = true; btn.textContent = "記録中..."; }

    try {
      const xpGained = minutes; // 1分 = 1XP

      // 1. 記録追加
      const { error: recordErr } = await db.from("study_records").insert({
        user_id: currentUser.id,
        subject: subject,
        minutes: minutes,
        xp: xpGained,
        note: note || null
      });
      if (recordErr) throw recordErr;

      // 2. プロフィール更新
      const oldXp = Number(currentProfile.xp ?? 0);
      const oldMinutes = Number(currentProfile.total_study_minutes ?? 0);
      const oldLevel = Number(currentProfile.level ?? 1);

      const newXp = oldXp + xpGained;
      const newMinutes = oldMinutes + minutes;
      const newLevel = Math.floor(newXp / 100) + 1;

      const { data: updatedProfile, error: updateErr } = await db
        .from("profiles")
        .update({ xp: newXp, level: newLevel, total_study_minutes: newMinutes })
        .eq("id", currentUser.id)
        .select().single();

      if (updateErr) throw updateErr;

      currentProfile = updatedProfile;
      updateAllProfileUI();

      // レベルアップモーダル
      if (newLevel > oldLevel) {
        setText("level-up-old-level", oldLevel);
        setText("level-up-new-level", newLevel);
        show($("level-up-modal"));
      }

      // 3. ボスへダメージ攻撃
      await attackBossWithStudy(subject, minutes);

      $("study-record-form")?.reset();
      notify(`📚 ${minutes}分記録！ +${xpGained} XP`);
      await loadStudyData();

    } catch (err) {
      setError("study-error", err.message || "記録に失敗しました。");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "勉強を記録する"; }
    }
  });

  // 設定：表示名変更
  $("display-name-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("display-name-error");
    const newName = $("settings-display-name")?.value.trim();
    if (!newName) return setError("display-name-error", "名前を入力してください。");

    const { error } = await db.from("profiles").update({ display_name: newName }).eq("id", currentUser.id);
    if (!error) {
      currentProfile.display_name = newName;
      updateAllProfileUI();
      notify("表示名を更新しました！");
    }
  });

  // 設定：教科変更
  $("subject-settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const checked = Array.from(document.querySelectorAll('input[name="settingsSubjects"]:checked')).map(i => i.value);
    if (!checked.length) return setError("settings-subject-error", "少なくとも1つの教科を選んでください。");

    const { error } = await db.from("profiles").update({ subjects: checked }).eq("id", currentUser.id);
    if (!error) {
      currentProfile.subjects = checked;
      selectedSubjects = checked;
      populateStudySubjects();
      notify("教科設定を保存しました！");
    }
  });

  // 設定：パスワード変更
  $("password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("password-error");
    const newPass = $("settings-new-password")?.value;
    if (!newPass || newPass.length < 6) return setError("password-error", "6文字以上で入力してください。");

    const { error } = await db.auth.updateUser({ password: newPass });
    if (!error) {
      $("password-form").reset();
      notify("パスワードを変更しました！");
    } else {
      setError("password-error", error.message);
    }
  });

  // パーティー招待
  $("party-invite-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError("party-error");
    const targetUserId = $("party-invite-user-id")?.value.trim();
    if (!targetUserId) return;

    try {
      const { data: targetProfile } = await db.from("profiles").select("id").eq("user_id", targetUserId).maybeSingle();
      if (!targetProfile) return setError("party-error", "ユーザーが見つかりません。");

      // パーティー作成/追加
      let partyId = currentProfile.party_id;
      if (!partyId) {
        const { data: newParty } = await db.from("parties").insert({ leader_id: currentUser.id }).select().single();
        partyId = newParty.id;
        await db.from("profiles").update({ party_id: partyId }).eq("id", currentUser.id);
        currentProfile.party_id = partyId;
      }

      await db.from("profiles").update({ party_id: partyId }).eq("id", targetProfile.id);
      notify(`${targetUserId} をパーティーに招待しました！`);
      $("party-invite-form").reset();
      await loadPartyData();
    } catch (err) {
      setError("party-error", "招待に失敗しました。");
    }
  });

  // モーダル閉じる
  $("level-up-close-button")?.addEventListener("click", () => hide($("level-up-modal")));
  $("star-modal-close-button")?.addEventListener("click", () => hide($("star-modal")));
  $("boss-result-close-button")?.addEventListener("click", () => hide($("boss-result-modal")));
  $("season-result-close-button")?.addEventListener("click", () => hide($("season-result-modal")));
  $("boss-refresh-button")?.addEventListener("click", loadBossData);
}

/* =========================================================
   FEATURE LOGIC (STUDY, BOSS, QUEST, PARTY)
   ========================================================= */
function populateStudySubjects() {
  const select = $("study-subject");
  if (!select) return;
  select.innerHTML = '<option value="">教科を選択</option>';
  selectedSubjects.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub;
    opt.textContent = SUBJECT_NAMES[sub] || sub;
    select.appendChild(opt);
  });
}

function populateSettingsSubjects() {
  const container = $("settings-subject-selection");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(SUBJECT_NAMES).forEach(([val, name]) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "settingsSubjects";
    input.value = val;
    if (selectedSubjects.includes(val)) input.checked = true;

    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${name}`));
    container.appendChild(label);
  });
}

async function loadHomeData() {
  if (!currentUser) return;
  const { data: records } = await db.from("study_records").select("*").eq("user_id", currentUser.id);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = (records || []).filter(r => r.created_at?.slice(0, 10) === todayStr);

  const studyMinutes = todayRecords.reduce((sum, r) => sum + Number(r.minutes || 0), 0);
  const xp = todayRecords.reduce((sum, r) => sum + Number(r.xp ?? r.minutes ?? 0), 0);

  setText("today-study-time", `${studyMinutes}分`);
  setText("today-xp", `${xp} XP`);

  // デイリークエスト進捗概要
  const { data: quests } = await db.from("quests").select("*").eq("user_id", currentUser.id).eq("completed", true);
  setText("today-quests", quests ? quests.length : 0);
}

async function loadStudyData() {
  if (!currentUser) return;
  const { data, error } = await db
    .from("study_records")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) return;

  // 履歴表示
  const list = $("study-history-list");
  if (list) {
    if (!data.length) {
      list.innerHTML = `<p class="empty-message">まだ勉強記録がありません。</p>`;
    } else {
      list.innerHTML = data.slice(0, 20).map(r => `
        <div class="study-history-item">
          <strong>${escapeHTML(SUBJECT_NAMES[r.subject] || r.subject)}</strong>
          <div>${r.minutes}分 (+${r.xp} XP)</div>
          <small>${formatDate(r.created_at)}</small>
          ${r.note ? `<p>${escapeHTML(r.note)}</p>` : ""}
        </div>
      `).join("");
    }
  }

  // 教科別集計
  const subList = $("subject-study-list");
  if (subList) {
    const totals = {};
    data.forEach(r => totals[r.subject] = (totals[r.subject] || 0) + Number(r.minutes));
    if (!Object.keys(totals).length) {
      subList.innerHTML = `<p class="empty-message">データがありません。</p>`;
    } else {
      subList.innerHTML = Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([sub, min]) => `
        <div class="subject-study-item">
          <span>${escapeHTML(SUBJECT_NAMES[sub] || sub)}</span>
          <strong>${min}分</strong>
        </div>
      `).join("");
    }
  }
}

/* --- ボス戦エンジン --- */
async function loadBossData() {
  let { data: boss } = await db.from("bosses").select("*").eq("is_active", true).maybeSingle();

  // ボスがいなければ生成
  if (!boss) {
    const { data: newBoss } = await db.from("bosses").insert({
      name: "受験の魔王",
      level: 1,
      current_hp: 1000,
      max_hp: 1000,
      weakness_subject: "math",
      is_active: true
    }).select().single();
    boss = newBoss;
  }

  setText("boss-name", boss.name);
  setText("boss-level", `Lv.${boss.level}`);
  setText("boss-current-hp", boss.current_hp);
  setText("boss-max-hp", boss.max_hp);
  setText("boss-weakness-subject", SUBJECT_NAMES[boss.weakness_subject] || "なし");

  const progress = Math.max(0, (boss.current_hp / boss.max_hp) * 100);
  const hpBar = $("boss-hp-progress");
  if (hpBar) hpBar.style.width = `${progress}%`;

  // バトルログの読み込み
  const { data: logs } = await db.from("boss_attacks").select("*, profiles(display_name)").order("created_at", { ascending: false }).limit(10);
  const logList = $("boss-log-list");
  if (logList) {
    if (!logs || !logs.length) {
      logList.innerHTML = `<p class="empty-message">まだ戦闘記録はありません。</p>`;
    } else {
      logList.innerHTML = logs.map(l => `
        <div class="log-item">
          <span>${escapeHTML(l.profiles?.display_name || "冒険者")}</span>が
          <strong>${SUBJECT_NAMES[l.subject] || l.subject}</strong>で
          <strong style="color:red;">${l.damage}</strong> のダメージを与えた！
        </div>
      `).join("");
    }
  }
}

async function attackBossWithStudy(subject, minutes) {
  const { data: boss } = await db.from("bosses").select("*").eq("is_active", true).maybeSingle();
  if (!boss) return;

  // 弱点攻撃なら1.5倍
  const multiplier = (boss.weakness_subject === subject) ? 1.5 : 1.0;
  const damage = Math.floor(minutes * multiplier);
  const newHp = Math.max(0, boss.current_hp - damage);

  await db.from("bosses").update({ current_hp: newHp }).eq("id", boss.id);
  await db.from("boss_attacks").insert({
    boss_id: boss.id,
    user_id: currentUser.id,
    subject: subject,
    damage: damage
  });

  if (newHp === 0) {
    notify("🎉 ボス撃破！⭐スター獲得！");
    const newStars = Number(currentProfile.stars || 0) + 1;
    await db.from("profiles").update({ stars: newStars }).eq("id", currentUser.id);
    currentProfile.stars = newStars;
    updateAllProfileUI();

    // ボス再生成
    await db.from("bosses").update({ is_active: false }).eq("id", boss.id);
  }
}

/* --- クエストエンジン --- */
async function loadQuestData() {
  if (!currentUser) return;
  const list = $("daily-quest-list");
  if (!list) return;

  // ユーザーの今日の勉強総時間取得
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: records } = await db.from("study_records").select("minutes").eq("user_id", currentUser.id);
  const totalToday = (records || []).reduce((sum, r) => sum + Number(r.minutes || 0), 0);

  const questsDef = [
    { id: "q1", title: "毎日勉強の第一歩", target: 30, rewardXp: 50 },
    { id: "q2", title: "本格トレーニング", target: 60, rewardXp: 100 },
    { id: "q3", title: "限界突破", target: 120, rewardXp: 200 }
  ];

  list.innerHTML = questsDef.map(q => {
    const isCleared = totalToday >= q.target;
    return `
      <div class="quest-card ${isCleared ? 'cleared' : ''}">
        <h4>${q.title} (${Math.min(totalToday, q.target)} / ${q.target}分)</h4>
        <p>今日累計 ${q.target} 分以上の勉強を達成する。</p>
        <span class="quest-reward">報酬：+${q.rewardXp} XP</span>
        <button type="button" class="primary-button" ${isCleared ? "" : "disabled"}>
          ${isCleared ? "達成！" : "挑戦中"}
        </button>
      </div>
    `;
  }).join("");
}

/* --- パーティー機能 --- */
async function loadPartyData() {
  const list = $("party-member-list");
  if (!list) return;

  if (!currentProfile?.party_id) {
    list.innerHTML = `<p class="empty-message">パーティーに所属していません。IDを指定して仲間を招待しよう！</p>`;
    setText("party-member-count", "1人");
    return;
  }

  const { data: members } = await db.from("profiles").select("*").eq("party_id", currentProfile.party_id);
  if (members) {
    setText("party-member-count", `${members.length}人`);
    list.innerHTML = members.map(m => `
      <div class="party-member-card">
        <strong>${escapeHTML(m.display_name)}</strong> (Lv.${m.level})
        <div>総勉強時間: ${m.total_study_minutes || 0}分</div>
      </div>
    `).join("");
  }
}

async function loadRankData() {
  if (!currentProfile) return;
  const rank = calculateRank(currentProfile);
  setText("current-rank-name", rank);
}

async function loadAchievementData() {
  const list = $("achievement-list");
  if (!list) return;

  const totalMin = Number(currentProfile?.total_study_minutes || 0);
  const achievements = [
    { title: "冒険者誕生", desc: "受験RPGに登録した", unlocked: true, icon: "🌱" },
    { title: "見習い受験生", desc: "通算100分以上勉強した", unlocked: totalMin >= 100, icon: "📖" },
    { title: "ベテラン冒険者", desc: "通算1000分以上勉強した", unlocked: totalMin >= 1000, icon: "⚔️" },
    { title: "伝説のガリベン", desc: "通算5000分以上勉強した", unlocked: totalMin >= 5000, icon: "👑" }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  setText("achievement-count", `${unlockedCount} / ${achievements.length}`);

  list.innerHTML = achievements.map(a => `
    <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
      <div class="achievement-icon">${a.icon}</div>
      <div>
        <h4>${a.title}</h4>
        <p>${a.desc}</p>
      </div>
    </div>
  `).join("");
}

async function loadProfileData() {
  if (!currentProfile) await loadProfile();
  updateAllProfileUI();
}

async function loadSettingsData() {
  if (!currentProfile) await loadProfile();
  const input = $("settings-display-name");
  if (input) input.value = currentProfile.display_name || "";
  populateSettingsSubjects();
}

/* =========================================================
   INITIALIZATION
   ========================================================= */
async function initializeApp() {
  if (typeof window.supabase === "undefined") {
    console.error("Supabase SDKが読み込まれていません。");
    return;
  }

  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  setupEventListeners();

  try {
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      await loadProfile();
      await openMainApp();
    } else {
      show($("auth-screen"));
      hide($("main-app"));
      showLoginScreen();
    }

    db.auth.onAuthStateChange(async (_evt, session) => {
      if (session?.user && !currentUser) {
        currentUser = session.user;
        await loadProfile();
        await openMainApp();
      }
    });
  } catch (err) {
    console.error("INITIALIZATION ERROR:", err);
    show($("auth-screen"));
    hide($("main-app"));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});
