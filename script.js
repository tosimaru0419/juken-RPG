// ==========================================
// 受験RPG - アプリケーションメインロジック (完全修復版)
// ==========================================

// 初期ユーザーデータテンプレート
const DEFAULT_USER = {
  user_id: "hero_001",
  player_name: "勇者タロウ",
  track: "science",
  level: 1,
  star_count: 0,   // ⭐の数（レベル100周回数）
  xp: 0,
  xp_to_next: 100,
  coins: 200,      // 初期所持コイン
  title: "新米受験生",
  rank: "Bronze",
  avatar: "🧙‍♂️",
  total_minutes: 0,
  streak_days: 1
};

// アプリ全体の状態
let currentUser = null;
let timerInterval = null;
let timerSeconds = 25 * 60;
let isTimerRunning = false;
let selectedSubject = 'english';

// デイリークエスト初期データ
let dailyQuests = [
  { id: 1, text: "いずれかの教科を30分勉強する", reward_coins: 50, reward_xp: 50, completed: false },
  { id: 2, text: "ボスに合計1,000ダメージを与える", reward_coins: 80, reward_xp: 80, completed: false },
  { id: 3, text: "手動またはタイマーで学習記録をつける", reward_coins: 30, reward_xp: 30, completed: false }
];

// 教科一覧定義
const SUBJECTS = {
  english: { name: "英語", icon: "🔤" },
  math: { name: "数学", icon: "📐" },
  japanese: { name: "国語", icon: "📖" },
  science: { name: "理科", icon: "🧪" },
  social: { name: "社会", icon: "🗺️" }
};

// 画面読み込み完了時の処理
document.addEventListener('DOMContentLoaded', () => {
  setupAuthEvents();
  setupNavigation();
  setupStudyEvents();
  setupProfileModal();

  // すでにログイン情報があれば自動ログイン
  const saved = localStorage.getItem('user_session');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      document.getElementById('screen-auth')?.classList.add('hidden');
      document.getElementById('screen-main')?.classList.remove('hidden');
      initApp();
    } catch (e) {
      console.error("セッション読み込みエラー", e);
    }
  }
});

// ==========================================
// 1. 新規登録 ＆ ログイン処理（確実化）
// ==========================================
function setupAuthEvents() {
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const authPlayerName = document.getElementById('auth-player-name');
  const authTrack = document.getElementById('auth-track');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authForm = document.getElementById('auth-form');

  let isSignUpMode = false;

  // ログインタブ切り替え
  tabLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = false;
    tabLogin.classList.add('active');
    tabSignup?.classList.remove('active');
    authPlayerName?.classList.add('hidden');
    authTrack?.classList.add('hidden');
    if (authSubmitBtn) authSubmitBtn.textContent = 'ログインして開始';
  });

  // 新規登録タブ切り替え
  tabSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = true;
    tabSignup.classList.add('active');
    tabLogin?.classList.remove('active');
    authPlayerName?.classList.remove('hidden');
    authTrack?.classList.remove('hidden');
    if (authSubmitBtn) authSubmitBtn.textContent = 'アカウント作成（新規登録）';
  });

  // フォーム送信（ログイン・新規登録実行）
  authForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const userId = document.getElementById('auth-user-id')?.value.trim();
    const password = document.getElementById('auth-password')?.value.trim();
    const playerName = document.getElementById('auth-player-name')?.value.trim();
    const track = document.getElementById('auth-track')?.value || "science";

    if (!userId || !password) {
      alert("ユーザーIDとパスワードを入力してください！");
      return;
    }

    if (isSignUpMode) {
      if (!playerName) {
        alert("プレイヤー名を入力してください！");
        return;
      }

      // 新規ユーザーデータ作成
      currentUser = {
        ...DEFAULT_USER,
        user_id: userId,
        player_name: playerName,
        track: track
      };
      localStorage.setItem('user_session', JSON.stringify(currentUser));
      alert(`アカウントを作成しました！ようこそ、${playerName}さん！`);
    } else {
      // ログイン処理（既存保存データを使うか新規作成）
      const saved = localStorage.getItem('user_session');
      if (saved) {
        currentUser = JSON.parse(saved);
      } else {
        currentUser = {
          ...DEFAULT_USER,
          user_id: userId,
          player_name: userId
        };
        localStorage.setItem('user_session', JSON.stringify(currentUser));
      }
    }

    // 画面切り替え ＆ 初期化
    document.getElementById('screen-auth')?.classList.add('hidden');
    document.getElementById('screen-main')?.classList.remove('hidden');
    initApp();
  });
}

// アプリデータの初期化・描画
function initApp() {
  if (!currentUser) return;
  updateUI();
  renderSubjectSelector();
  renderQuests();
  renderShop();
}

// ==========================================
// 2. ⭐ スプラ風 レベル100周回（プレステージ）計算
// ==========================================
function addXP(amount) {
  if (!currentUser) return;

  currentUser.xp += amount;

  // レベルアップ判定
  while (currentUser.xp >= currentUser.xp_to_next) {
    currentUser.xp -= currentUser.xp_to_next;
    currentUser.level += 1;

    // ★★★ スプラ方式: レベル100を超えたら⭐をつけてレベル1に戻る！ ★★★
    if (currentUser.level > 100) {
      currentUser.level = 1;
      currentUser.star_count = (currentUser.star_count || 0) + 1;
      alert(`🎉 限界突破！！⭐マークがつきました！（⭐${currentUser.star_count} Lv.1）`);
    }

    currentUser.xp_to_next = 100 + (currentUser.level * 10);
  }

  localStorage.setItem('user_session', JSON.stringify(currentUser));
  updateUI();
}

function addCoins(amount) {
  if (!currentUser) return;
  currentUser.coins = (currentUser.coins || 0) + amount;
  localStorage.setItem('user_session', JSON.stringify(currentUser));
  updateUI();
}

// ==========================================
// 3. 全画面の表示更新（星表示 ＆ 自分の名前表示）
// ==========================================
function updateUI() {
  if (!currentUser) return;

  // レベル表記（⭐がついている場合は ⭐1 Lv.50 のように表示）
  let starPrefix = currentUser.star_count > 0 ? `⭐${currentUser.star_count > 1 ? currentUser.star_count : ''} ` : '';
  let levelStr = `${starPrefix}Lv.${currentUser.level}`;

  // ヘッダーUI
  const elHeaderName = document.getElementById('header-player-name');
  const elHeaderLevel = document.getElementById('header-level');
  const elHeaderCoins = document.getElementById('header-coins');
  const elHeaderRank = document.getElementById('header-rank');
  const elHeaderStar = document.getElementById('header-star');

  if (elHeaderName) elHeaderName.textContent = currentUser.player_name;
  if (elHeaderLevel) elHeaderLevel.textContent = levelStr;
  if (elHeaderCoins) elHeaderCoins.textContent = `🪙 ${currentUser.coins}`;
  if (elHeaderRank) elHeaderRank.textContent = currentUser.rank;

  if (elHeaderStar) {
    if (currentUser.star_count > 0) {
      elHeaderStar.classList.remove('hidden');
      elHeaderStar.textContent = `⭐${currentUser.star_count > 1 ? currentUser.star_count : ''}`;
    } else {
      elHeaderStar.classList.add('hidden');
    }
  }

  // ホーム画面ヒーローカード
  const elHeroName = document.getElementById('hero-player-name');
  const elHeroId = document.getElementById('hero-user-id');
  const elHeroTitle = document.getElementById('hero-title');
  const elHeroRank = document.getElementById('hero-rank-display');
  const elHeroLevelLabel = document.getElementById('hero-level-label');
  const elHeroXpText = document.getElementById('hero-xp-text');
  const elHeroXpBar = document.getElementById('hero-xp-bar');

  if (elHeroName) elHeroName.textContent = currentUser.player_name;
  if (elHeroId) elHeroId.textContent = `ID: @${currentUser.user_id}`;
  if (elHeroTitle) elHeroTitle.textContent = currentUser.title;
  if (elHeroRank) elHeroRank.textContent = `RANK: ${currentUser.rank}`;
  if (elHeroLevelLabel) elHeroLevelLabel.textContent = `総合レベル (${levelStr})`;
  if (elHeroXpText) elHeroXpText.textContent = `${currentUser.xp} / ${currentUser.xp_to_next} XP`;
  
  if (elHeroXpBar) {
    const xpPct = Math.min(100, Math.floor((currentUser.xp / currentUser.xp_to_next) * 100));
    elHeroXpBar.style.width = `${xpPct}%`;
  }

  // スタッツ
  const elStatTime = document.getElementById('stat-total-time');
  const elStatStreak = document.getElementById('stat-streak');
  if (elStatTime) elStatTime.textContent = `${currentUser.total_minutes}分`;
  if (elStatStreak) elStatStreak.textContent = `${currentUser.streak_days}日`;
}

// ==========================================
// 4. ナビゲーション（タブ切替）
// ==========================================
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-button');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (!target) return;

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(target)?.classList.add('active');
    });
  });

  // クイックボタン
  document.getElementById('btn-quick-study')?.addEventListener('click', () => switchToPage('page-study'));
  document.getElementById('btn-quick-manual')?.addEventListener('click', () => {
    switchToPage('page-study');
    document.getElementById('tab-manual-mode')?.click();
  });
}

function switchToPage(pageId) {
  document.querySelectorAll('.nav-button').forEach(b => {
    if (b.getAttribute('data-target') === pageId) b.classList.add('active');
    else b.classList.remove('active');
  });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
}

// ==========================================
// 5. 勉強タイマー ＆ 手動記録
// ==========================================
function setupStudyEvents() {
  const tabTimer = document.getElementById('tab-timer-mode');
  const tabManual = document.getElementById('tab-manual-mode');
  const timerContainer = document.getElementById('mode-timer-container');
  const manualContainer = document.getElementById('mode-manual-container');

  tabTimer?.addEventListener('click', () => {
    tabTimer.classList.add('active');
    tabManual?.classList.remove('active');
    timerContainer?.classList.remove('hidden');
    manualContainer?.classList.add('hidden');
  });

  tabManual?.addEventListener('click', () => {
    tabManual.classList.add('active');
    tabTimer?.classList.remove('active');
    manualContainer?.classList.remove('hidden');
    timerContainer?.classList.add('hidden');
  });

  // タイマーボタン
  const btnToggle = document.getElementById('btn-timer-toggle');
  const btnReset = document.getElementById('btn-timer-reset');

  btnToggle?.addEventListener('click', () => {
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      btnToggle.textContent = 'スタート';
    } else {
      isTimerRunning = true;
      btnToggle.textContent = '一時停止';
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds--;
          renderTimerDisplay();
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
          btnToggle.textContent = 'スタート';
          alert('⏰ 25分セッション完了！ XP +50 ＆ 50コイン獲得！');
          addXP(50);
          addCoins(50);
          currentUser.total_minutes += 25;
          localStorage.setItem('user_session', JSON.stringify(currentUser));
          updateUI();
        }
      }, 1000);
    }
  });

  btnReset?.addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerSeconds = 25 * 60;
    renderTimerDisplay();
    if (btnToggle) btnToggle.textContent = 'スタート';
  });

  // 手動記録フォーム
  const manualForm = document.getElementById('manual-study-form');
  manualForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const minutesInput = document.getElementById('manual-minutes');
    const minutes = parseInt(minutesInput?.value) || 0;
    if (minutes <= 0) return;

    const gainedXP = minutes * 2;
    const gainedCoins = Math.floor(minutes / 2);

    addXP(gainedXP);
    addCoins(gainedCoins);
    currentUser.total_minutes += minutes;
    localStorage.setItem('user_session', JSON.stringify(currentUser));
    updateUI();

    alert(`📝 学習完了！ XP +${gainedXP} / コイン +${gainedCoins} を獲得しました！`);
    if (minutesInput) minutesInput.value = '';
  });
}

function renderTimerDisplay() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const s = String(timerSeconds % 60).padStart(2, '0');
  const display = document.getElementById('timer-display');
  if (display) display.textContent = `${m}:${s}`;
}

function renderSubjectSelector() {
  const selector = document.getElementById('subject-selector');
  const manualSelect = document.getElementById('manual-subject-select');
  if (!selector) return;

  selector.innerHTML = '';
  if (manualSelect) manualSelect.innerHTML = '';

  Object.keys(SUBJECTS).forEach(key => {
    const sub = SUBJECTS[key];
    
    // タイマー用教科ボタン
    const btn = document.createElement('button');
    btn.className = `subject-card ${key === selectedSubject ? 'selected' : ''}`;
    btn.type = 'button';
    btn.innerHTML = `<span style="font-size:1.5rem;">${sub.icon}</span><span style="font-size:0.8rem; font-weight:bold;">${sub.name}</span>`;
    btn.onclick = () => {
      selectedSubject = key;
      renderSubjectSelector();
      const label = document.getElementById('current-subject-label');
      if (label) label.textContent = `選択中: ${sub.name}`;
    };
    selector.appendChild(btn);

    // 手動入力用セレクトボックス
    if (manualSelect) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${sub.icon} ${sub.name}`;
      manualSelect.appendChild(opt);
    }
  });
}

// ==========================================
// 6. クエスト ＆ モーダル演出
// ==========================================
function renderQuests() {
  const questList = document.getElementById('quest-list');
  if (!questList) return;

  questList.innerHTML = '';
  dailyQuests.forEach(q => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';

    card.innerHTML = `
      <div>
        <div style="font-weight: bold; font-size: 0.95rem;">${q.text}</div>
        <div style="font-size: 0.75rem; color: var(--primary-color); margin-top: 4px;">報酬: 🪙 ${q.reward_coins} / ⚡ ${q.reward_xp} XP</div>
      </div>
      <button class="primary-button small-button ${q.completed ? 'disabled' : ''}" ${q.completed ? 'disabled' : ''}>
        ${q.completed ? '達成済み' : 'クリア'}
      </button>
    `;

    const btn = card.querySelector('button');
    btn.onclick = () => {
      if (q.completed) return;
      q.completed = true;
      addCoins(q.reward_coins);
      addXP(q.reward_xp);
      showQuestCompleteModal(q);
      renderQuests();
    };

    questList.appendChild(card);
  });
}

function showQuestCompleteModal(quest) {
  const modal = document.getElementById('modal-quest-complete');
  const rewardsContainer = document.getElementById('quest-complete-rewards');
  if (!modal) return;

  if (rewardsContainer) {
    rewardsContainer.innerHTML = `
      <div class="reward-item">🪙 +${quest.reward_coins} コイン</div>
      <div class="reward-item">⚡ +${quest.reward_xp} XP</div>
    `;
  }

  modal.classList.remove('hidden');

  const btnClose = document.getElementById('btn-close-quest-complete');
  if (btnClose) {
    btnClose.onclick = () => modal.classList.add('hidden');
  }
}

// ==========================================
// 7. ショップ機能
// ==========================================
const SHOP_ITEMS = [
  { id: 'av1', name: '大魔導士アバター', icon: '🧙‍♀️', cost: 100 },
  { id: 'av2', name: '騎士アバター', icon: '⚔️', cost: 200 },
  { id: 'av3', name: '学者アバター', icon: '🎓', cost: 300 },
  { id: 'title1', name: '称号: 努力の天才', titleText: '努力の天才', cost: 150 }
];

function renderShop() {
  const container = document.getElementById('shop-items-container');
  if (!container) return;

  container.innerHTML = '';
  SHOP_ITEMS.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.textAlign = 'center';
    card.innerHTML = `
      <div style="font-size: 2.5rem;">${item.icon || '📜'}</div>
      <div style="font-weight: bold; font-size: 0.9rem; margin-top: 6px;">${item.name}</div>
      <div style="font-size: 0.8rem; color: var(--primary-color); margin: 6px 0;">🪙 ${item.cost}</div>
      <button class="primary-button small-button" style="width: 100%;">購入する</button>
    `;

    card.querySelector('button').onclick = () => {
      if (currentUser.coins < item.cost) {
        alert('コインが不足しています！');
        return;
      }
      currentUser.coins -= item.cost;
      if (item.icon) currentUser.avatar = item.icon;
      if (item.titleText) currentUser.title = item.titleText;

      localStorage.setItem('user_session', JSON.stringify(currentUser));
      updateUI();
      alert(`「${item.name}」を購入・装備しました！`);
    };

    container.appendChild(card);
  });
}

// ==========================================
// 8. プロフィールモーダル
// ==========================================
function setupProfileModal() {
  const btnOpen = document.getElementById('btn-open-profile');
  const btnClose = document.getElementById('btn-close-profile');
  const modal = document.getElementById('modal-profile');

  btnOpen?.addEventListener('click', () => {
    if (!currentUser || !modal) return;
    
    let starPrefix = currentUser.star_count > 0 ? `⭐${currentUser.star_count > 1 ? currentUser.star_count : ''} ` : '';
    
    const profAvatar = document.getElementById('prof-avatar');
    const profName = document.getElementById('prof-player-name');
    const profId = document.getElementById('prof-user-id');
    const profTitle = document.getElementById('prof-title');
    const starBadge = document.getElementById('prof-star-badge');

    if (profAvatar) profAvatar.textContent = currentUser.avatar || '🧙‍♂️';
    if (profName) profName.textContent = currentUser.player_name;
    if (profId) profId.textContent = `ID: @${currentUser.user_id}`;
    if (profTitle) profTitle.textContent = currentUser.title;

    if (starBadge) {
      if (currentUser.star_count > 0) {
        starBadge.classList.remove('hidden');
        starBadge.textContent = `${starPrefix}プレステージ完了`;
      } else {
        starBadge.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
  });

  btnClose?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });
}
