// ==========================================
// 受験RPG - アプリケーションメインロジック (完全修正版)
// ==========================================

// 初期ユーザーデータ（Storageにない場合の初期値）
const DEFAULT_USER = {
  user_id: "eita_001",
  player_name: "えいた",
  track: "science", // science, humanities, general
  level: 1,
  star_count: 0,   // ⭐の数（レベル100を超えて周回した回数）
  xp: 0,
  xp_to_next: 100,
  coins: 200,      // 初期所持コイン
  title: "新米受験生",
  rank: "Bronze",
  avatar: "🧙‍♂️",
  total_minutes: 0,
  streak_days: 1
};

// 状態管理
let currentUser = null;
let activeTab = 'page-home';
let timerInterval = null;
let timerSeconds = 25 * 60;
let isTimerRunning = false;
let selectedSubject = 'english';

// デイリークエスト初期状態
let dailyQuests = [
  { id: 1, text: "いずれかの教科を30分勉強する", reward_coins: 50, reward_xp: 50, completed: false },
  { id: 2, text: "ボスに合計1,000ダメージを与える", reward_coins: 80, reward_xp: 80, completed: false },
  { id: 3, text: "手動またはタイマーで学習記録をつける", reward_coins: 30, reward_xp: 30, completed: false }
];

// 教科定義
const SUBJECTS = {
  english: { name: "英語", icon: "🔤" },
  math: { name: "数学", icon: "📐" },
  japanese: { name: "国語", icon: "📖" },
  science: { name: "理科", icon: "🧪" },
  social: { name: "社会", icon: "🗺️" }
};

// DOMロード時
document.addEventListener('DOMContentLoaded', () => {
  setupAuthEvents();
  setupNavigation();
  setupStudyEvents();
  setupProfileModal();
});

// ==========================================
// 1. 新規登録 ＆ ログイン処理（完全修正）
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
  if (tabLogin) {
    tabLogin.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = false;
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      authPlayerName.classList.add('hidden');
      authTrack.classList.add('hidden');
      authPlayerName.removeAttribute('required');
      authSubmitBtn.textContent = 'ログインして開始';
    });
  }

  // 新規登録タブ切り替え
  if (tabSignup) {
    tabSignup.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = true;
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      authPlayerName.classList.remove('hidden');
      authTrack.classList.remove('hidden');
      authPlayerName.setAttribute('required', 'true');
      authSubmitBtn.textContent = 'アカウント作成（新規登録）';
    });
  }

  // フォーム送信
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const userId = document.getElementById('auth-user-id').value.trim();
      const password = document.getElementById('auth-password').value.trim();
      const playerName = document.getElementById('auth-player-name').value.trim();
      const track = document.getElementById('auth-track').value;

      if (!userId || !password) {
        alert("ユーザーIDとパスワードを入力してください！");
        return;
      }

      if (isSignUpMode) {
        if (!playerName) {
          alert("プレイヤー名を入力してください！");
          return;
        }

        // 新規登録作成
        currentUser = {
          ...DEFAULT_USER,
          user_id: userId,
          player_name: playerName,
          track: track
        };
        localStorage.setItem('user_session', JSON.stringify(currentUser));
        alert(`アカウントを作成しました！ようこそ、${playerName}さん！`);
      } else {
        // ログイン（既存セッションの確認または新規ログイン）
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

      // 画面切り替え ＆ アプリ初期化
      document.getElementById('screen-auth').classList.add('hidden');
      document.getElementById('screen-main').classList.remove('hidden');
      initApp();
    });
  }
}

// アプリ初期化
function initApp() {
  if (!currentUser) {
    const saved = localStorage.getItem('user_session');
    currentUser = saved ? JSON.parse(saved) : { ...DEFAULT_USER };
  }
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

  // XPが次のレベルに届いた時の昇級判定
  while (currentUser.xp >= currentUser.xp_to_next) {
    currentUser.xp -= currentUser.xp_to_next;
    currentUser.level += 1;

    // ★★★ スプラ方式: レベル100を超えたら⭐をつけてレベル1に戻る！ ★★★
    if (currentUser.level > 100) {
      currentUser.level = 1;
      currentUser.star_count = (currentUser.star_count || 0) + 1;
      alert(`🎉 限界突破！！⭐マークがつきました！（星${currentUser.star_count}つ Lv.1）`);
    }

    // 次レベルに必要なXP増加（ベース100 + レベルに応じた補正）
    currentUser.xp_to_next = 100 + (currentUser.level * 10);
  }

  // データ保存 ＆ UI更新
  localStorage.setItem('user_session', JSON.stringify(currentUser));
  updateUI();
}

// コイン獲得関数
function addCoins(amount) {
  if (!currentUser) return;
  currentUser.coins = (currentUser.coins || 0) + amount;
  localStorage.setItem('user_session', JSON.stringify(currentUser));
  updateUI();
}

// ==========================================
// 3. 全画面の表示更新（星表示 ＆ UI反映）
// ==========================================
function updateUI() {
  if (!currentUser) return;

  // 1. レベル表記の整形（⭐がついている場合は ⭐1 Lv.50 のように表示）
  let starPrefix = currentUser.star_count > 0 ? `⭐${currentUser.star_count > 1 ? currentUser.star_count : ''} ` : '';
  let levelStr = `${starPrefix}Lv.${currentUser.level}`;

  // ヘッダー情報
  document.getElementById('header-player-name').textContent = currentUser.player_name;
  document.getElementById('header-level').textContent = levelStr;
  document.getElementById('header-coins').textContent = `🪙 ${currentUser.coins}`;
  document.getElementById('header-rank').textContent = currentUser.rank;

  // ⭐バッジの表示制御
  const headerStar = document.getElementById('header-star');
  if (currentUser.star_count > 0) {
    headerStar.classList.remove('hidden');
    headerStar.textContent = `⭐${currentUser.star_count > 1 ? currentUser.star_count : ''}`;
  } else {
    headerStar.classList.add('hidden');
  }

  // ホームヒーローカード情報（冒険者ではなく自分の名前とIDを表示）
  document.getElementById('hero-player-name').textContent = currentUser.player_name;
  document.getElementById('hero-user-id').textContent = `ID: @${currentUser.user_id}`;
  document.getElementById('hero-title').textContent = currentUser.title;
  document.getElementById('hero-rank-display').textContent = `RANK: ${currentUser.rank}`;
  document.getElementById('hero-level-label').textContent = `総合レベル (${levelStr})`;
  document.getElementById('hero-xp-text').textContent = `${currentUser.xp} / ${currentUser.xp_to_next} XP`;
  
  // ゲージパーセント
  const xpPct = Math.min(100, Math.floor((currentUser.xp / currentUser.xp_to_next) * 100));
  document.getElementById('hero-xp-bar').style.width = `${xpPct}%`;

  // スタッツ
  document.getElementById('stat-total-time').textContent = `${currentUser.total_minutes}分`;
  document.getElementById('stat-streak').textContent = `${currentUser.streak_days}日`;
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
      document.getElementById(target).classList.add('active');
    });
  });

  // クイックアクション
  document.getElementById('btn-quick-study')?.addEventListener('click', () => {
    switchToPage('page-study');
  });
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
  document.getElementById(pageId).classList.add('active');
}

// ==========================================
// 5. 勉強タイマー ＆ 手動記録
// ==========================================
function setupStudyEvents() {
  // モード切り替え
  const tabTimer = document.getElementById('tab-timer-mode');
  const tabManual = document.getElementById('tab-manual-mode');
  const timerContainer = document.getElementById('mode-timer-container');
  const manualContainer = document.getElementById('mode-manual-container');

  tabTimer?.addEventListener('click', () => {
    tabTimer.classList.add('active');
    tabManual.classList.remove('active');
    timerContainer.classList.remove('hidden');
    manualContainer.classList.add('hidden');
  });

  tabManual?.addEventListener('click', () => {
    tabManual.classList.add('active');
    tabTimer.classList.remove('active');
    manualContainer.classList.remove('hidden');
    timerContainer.classList.add('hidden');
  });

  // タイマーコントロール
  const btnToggle = document.getElementById('btn-timer-toggle');
  const btnReset = document.getElementById('btn-timer-reset');

  btnToggle?.addEventListener('click', () => {
    if (isTimerRunning) {
      // 一時停止
      clearInterval(timerInterval);
      isTimerRunning = false;
      btnToggle.textContent = 'スタート';
    } else {
      // スタート
      isTimerRunning = true;
      btnToggle.textContent = '一時停止';
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds--;
          renderTimerDisplay();
        } else {
          // タイマー完了
          clearInterval(timerInterval);
          isTimerRunning = false;
          btnToggle.textContent = 'スタート';
          alert('⏰ 25分セッション完了！XP +50 ＆ 50コイン獲得！');
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
    btnToggle.textContent = 'スタート';
  });

  // 手動記録フォーム
  const manualForm = document.getElementById('manual-study-form');
  manualForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const minutes = parseInt(document.getElementById('manual-minutes').value) || 0;
    if (minutes <= 0) return;

    const gainedXP = minutes * 2;
    const gainedCoins = Math.floor(minutes / 2);

    addXP(gainedXP);
    addCoins(gainedCoins);
    currentUser.total_minutes += minutes;
    localStorage.setItem('user_session', JSON.stringify(currentUser));
    updateUI();

    alert(`📝 学習完了！ XP +${gainedXP} / コイン +${gainedCoins} を獲得しました！`);
    document.getElementById('manual-minutes').value = '';
    document.getElementById('manual-memo').value = '';
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
    
    // タイマー用ボタン
    const btn = document.createElement('button');
    btn.className = `subject-card ${key === selectedSubject ? 'selected' : ''}`;
    btn.innerHTML = `<span style="font-size:1.5rem;">${sub.icon}</span><span style="font-size:0.8rem; font-weight:bold;">${sub.name}</span>`;
    btn.onclick = () => {
      selectedSubject = key;
      renderSubjectSelector();
      const label = document.getElementById('current-subject-label');
      if (label) label.textContent = `選択中: ${sub.name}`;
    };
    selector.appendChild(btn);

    // 手動セレクト
    if (manualSelect) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${sub.icon} ${sub.name}`;
      manualSelect.appendChild(opt);
    }
  });
}

// ==========================================
// 6. クエスト ＆ 大満足クリアポップアップ
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

  rewardsContainer.innerHTML = `
    <div class="reward-item">🪙 +${quest.reward_coins} コイン</div>
    <div class="reward-item">⚡ +${quest.reward_xp} XP</div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('btn-close-quest-complete').onclick = () => {
    modal.classList.add('hidden');
  };
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
    if (!currentUser) return;
    
    let starPrefix = currentUser.star_count > 0 ? `⭐${currentUser.star_count > 1 ? currentUser.star_count : ''} ` : '';
    document.getElementById('prof-avatar').textContent = currentUser.avatar || '🧙‍♂️';
    document.getElementById('prof-player-name').textContent = currentUser.player_name;
    document.getElementById('prof-user-id').textContent = `ID: @${currentUser.user_id}`;
    document.getElementById('prof-title').textContent = currentUser.title;

    const starBadge = document.getElementById('prof-star-badge');
    if (currentUser.star_count > 0) {
      starBadge.classList.remove('hidden');
      starBadge.textContent = `${starPrefix}プレステージ完了`;
    } else {
      starBadge.classList.add('hidden');
    }

    modal.classList.remove('hidden');
  });

  btnClose?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}
