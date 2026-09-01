// ============================================================
// 受験RPG - script.js COMPLETE EDITION
// Firebase / XP / Lv100 / Monthly Rank / Quests / Titles
// Achievements / Shop / Boss / Party / Timer / UI / Effects
// Star system: COMPLETELY REMOVED
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyCggQfYsVVlngak6EJLS74OB3ADV4vFjyo",authDomain:"juken-rpg-b2840.firebaseapp.com",projectId:"juken-rpg-b2840",storageBucket:"juken-rpg-b2840.firebasestorage.app",messagingSenderId:"332135698063",appId:"1:332135698063:web:cea3c9be433f948bf1aafa",measurementId:"G-KLH9WZFNMT"};

let firebaseApp=null,auth=null,db=null,currentUser=null,currentPlayer=null,booted=false,authObserverStarted=false,studyRecordBusy=false;

let timerInterval=null;

const timerState={
  running:false,
  startedAt:null,
  accumulatedSeconds:0,
  lastJapanDate:null,
  segmentStartedAt:null,
  segmentJapanDate:null,
  midnightBusy:false,
  subject:null
};

const SUBJECT_NAMES={
  japanese:"国語",
  math:"数学",
  english:"英語",
  physics:"物理",
  chemistry:"化学",
  biology:"生物",
  "earth-science":"地学",
  "biology-basic":"生物基礎",
  "earth-science-basic":"地学基礎",
  geography:"地理",
  "japanese-history":"日本史",
  "world-history":"世界史",
  civics:"公民"
};

const RANKS=[
  {name:"Bronze",minMinutes:0},
  {name:"Silver",minMinutes:600},
  {name:"Gold",minMinutes:1500},
  {name:"Platinum",minMinutes:2700},
  {name:"Diamond",minMinutes:4200},
  {name:"Master",minMinutes:6000},
  {name:"Grandmaster",minMinutes:7500},
  {name:"Legend",minMinutes:9000}
];

const QUEST_REWARDS={
  dailyXp:20,
  dailyCoins:30,
  weeklyXp:70,
  weeklyCoins:70,
  rareXp:100,
  rareCoins:500
};

const DAILY_QUEST_COUNT=3,
      DAILY_QUEST_MINUTES=20,
      WEEKLY_QUEST_MINUTES=100,
      RARE_QUEST_MINUTES=180;

const LOGIN_REWARDS={
  first:{coins:50,xp:20},
  normal:{coins:20,xp:0},
  streak3:{coins:50,xp:20},
  streak7:{coins:100,xp:50},
  streak30:{coins:300,xp:100}
};


// ============================================================
// Titles
// ============================================================

const TITLES=[
  {id:"beginner",name:"見習い受験生",description:"冒険を始めた者に与えられる称号。",price:0,hidden:false},
  {id:"first-study",name:"第一歩",description:"累計1時間勉強した。",price:0,hidden:false},
  {id:"effort-5h",name:"努力の芽",description:"累計5時間勉強した。",price:0,hidden:false},
  {id:"ten-hours",name:"継続者",description:"累計10時間勉強した。",price:0,hidden:false},
  {id:"twenty-hours",name:"勉強家",description:"累計20時間勉強した。",price:0,hidden:false},
  {id:"thirty-hours",name:"努力の証",description:"累計30時間勉強した。",price:0,hidden:false},
  {id:"fifty-hours",name:"受験戦士",description:"累計50時間勉強した。",price:0,hidden:false},
  {id:"hundred-hours",name:"百時間突破",description:"累計100時間勉強した。",price:0,hidden:false},
  {id:"one-fifty-hours",name:"学問の探求者",description:"累計150時間勉強した。",price:0,hidden:false},
  {id:"two-hundred-hours",name:"勉強の鬼",description:"累計200時間勉強した。",price:0,hidden:false},
  {id:"three-hundred-hours",name:"修行僧",description:"累計300時間勉強した。",price:0,hidden:false},
  {id:"five-hundred-hours",name:"受験の猛者",description:"累計500時間勉強した。",price:0,hidden:false},
  {id:"seven-fifty-hours",name:"不屈の学習者",description:"累計750時間勉強した。",price:0,hidden:false},
  {id:"thousand-hours",name:"受験覇者",description:"累計1000時間勉強した。",price:0,hidden:false},

  ...Array.from(
    {length:9},
    (_,i)=>({
      id:`level-${(i+1)*10}`,
      name:`レベル${(i+1)*10}到達者`,
      description:`Lv.${(i+1)*10}に到達した。`,
      price:0,
      hidden:false
    })
  ),

  {id:"level-100",name:"受験RPGの覇者",description:"Lv.100に到達した。",price:0,hidden:false},

  {id:"silver-proof",name:"Silverの証",description:"Silverランクに到達した。",price:0,hidden:false},
  {id:"gold-proof",name:"Goldの証",description:"Goldランクに到達した。",price:0,hidden:false},
  {id:"platinum-proof",name:"Platinumの証",description:"Platinumランクに到達した。",price:0,hidden:false},
  {id:"diamond-proof",name:"Diamondの証",description:"Diamondランクに到達した。",price:0,hidden:false},
  {id:"master-proof",name:"Masterの証",description:"Masterランクに到達した。",price:0,hidden:false},
  {id:"grandmaster-proof",name:"Grandmasterの証",description:"Grandmasterランクに到達した。",price:0,hidden:false},
  {id:"legend-proof",name:"伝説への挑戦者",description:"Legendランクに到達した。",price:0,hidden:false},
  {id:"legend-season",name:"伝説の受験生",description:"Legendをシーズン終了まで維持した。",price:0,hidden:false},

  {id:"quest-first",name:"初クエスト達成",description:"初めてクエストを達成した。",price:0,hidden:false},
  {id:"quest-10",name:"クエストハンター",description:"クエストを10個達成した。",price:0,hidden:false},
  {id:"quest-50",name:"クエストマスター",description:"クエストを50個達成した。",price:0,hidden:false},
  {id:"daily-complete",name:"完遂者",description:"デイリー3個を1日で全達成した。",price:0,hidden:false},

  {id:"streak-7-title",name:"一週間の努力",description:"7日連続ログインした。",price:0,hidden:false},
  {id:"streak-14-title",name:"習慣の力",description:"14日連続ログインした。",price:0,hidden:false},
  {id:"streak-30-title",name:"継続の達人",description:"30日連続ログインした。",price:0,hidden:false},

  {id:"rare-first",name:"限界突破",description:"レアクエストを初達成した。",price:0,hidden:false},
  {id:"boss-first",name:"ボス初討伐",description:"初めてボス討伐に参加した。",price:0,hidden:false},
  {id:"damage-dealer",name:"ダメージディーラー",description:"ボス戦で大きく貢献した。",price:0,hidden:false},
  {id:"mvp",name:"MVP",description:"ボス戦MVPを獲得した。",price:0,hidden:false},
  {id:"weakness-breaker",name:"弱点粉砕者",description:"弱点教科で大ダメージを与えた。",price:0,hidden:false},
  {id:"party-player",name:"パーティプレイヤー",description:"パーティに参加した。",price:0,hidden:false},
  {id:"party-boss",name:"仲間との戦い",description:"パーティでボスを討伐した。",price:0,hidden:false},
  {id:"all-subject-lv10",name:"全教科制覇",description:"登録教科すべてLv.10以上。",price:0,hidden:false},
  {id:"one-subject-lv50",name:"一芸の達人",description:"1教科Lv.50。",price:0,hidden:false},
  {id:"three-subject-lv30",name:"万能型受験生",description:"3教科Lv.30以上。",price:0,hidden:false},
  {id:"all-subject-lv100",name:"完全制覇",description:"全登録教科Lv.100。",price:0,hidden:false},

  {id:"hidden-midnight",name:"深夜の亡霊",description:"深夜帯に勉強記録を残した。",price:0,hidden:true},
  {id:"hidden-comeback",name:"不屈",description:"途切れた後に再び連続ログインを開始した。",price:0,hidden:true},
  {id:"hidden-speed",name:"電光石火",description:"1日に3時間勉強した。",price:0,hidden:true},
  {id:"hidden-early",name:"朝焼けの冒険者",description:"早朝に勉強記録を残した。",price:0,hidden:true},

  {id:"secret-1",name:"静かなる努力家",description:"1日に一定時間以上勉強した。",price:0,hidden:true},
  {id:"secret-2",name:"不屈の意志",description:"長期連続ログインを維持した。",price:0,hidden:true},
  {id:"secret-3",name:"止まらない者",description:"1日の勉強時間が大台を突破した。",price:0,hidden:true},
  {id:"secret-4",name:"修羅の道",description:"短期間で大量の勉強時間を積み上げた。",price:0,hidden:true},
  {id:"secret-5",name:"完璧主義者",description:"デイリークエストを長期間連続で全達成した。",price:0,hidden:true},
  {id:"secret-6",name:"切り札",description:"弱点教科でボスに最高貢献した。",price:0,hidden:true},
  {id:"secret-7",name:"最後の一押し",description:"ボスの残りHPを自分の貢献で0にした。",price:0,hidden:true},
  {id:"secret-8",name:"隠された才能",description:"1教科を短期間で大幅レベルアップした。",price:0,hidden:true},
  {id:"secret-9",name:"伝説を超えし者",description:"Legend到達後も研鑽を続けた。",price:0,hidden:true},
  {id:"secret-10",name:"アリ得ない知能",description:"全教科を選択し学習記録した。",price:0,hidden:true}
];


// ============================================================
// Achievements
// ============================================================

const ACHIEVEMENTS=[
  ["first-study","はじめの一歩","初めて勉強を記録する。",50],
  ["study-10h","10時間突破","累計10時間勉強する。",100],
  ["study-50h","50時間突破","累計50時間勉強する。",250],
  ["study-100h","100時間突破","累計100時間勉強する。",500],

  ["level-10","冒険者Lv.10","Lv.10に到達する。",100],
  ["level-50","熟練冒険者","Lv.50に到達する。",500],
  ["level-100","限界突破","Lv.100に到達する。",1000],

  ["rank-gold","GOLD到達","Goldランクに到達する。",100],
  ["rank-platinum","PLATINUM到達","Platinumランクに到達する。",200],
  ["rank-diamond","DIAMOND到達","Diamondランクに到達する。",300],
  ["rank-master","MASTER到達","Masterランクに到達する。",500],
  ["rank-legend","LEGEND到達","Legendランクに到達する。",1000],

  ["streak-3","三日坊主卒業","3日連続ログインする。",100],
  ["streak-7","一週間の戦士","7日連続ログインする。",250],
  ["streak-30","習慣の化身","30日連続ログインする。",1000]
].map(
  ([id,title,description,rewardCoins])=>({
    id,
    title,
    description,
    rewardCoins
  })
);


// ============================================================
// Shop
// ============================================================

const SHOP_ITEMS=[
  {
    id:"xp-boost-10",
    name:"禁断の経験値核・I",
    description:"次の10分間、獲得XPを+25%。",
    price:300,
    type:"xpBoost",
    value:1.25,
    durationMinutes:10
  },
  {
    id:"xp-boost-25",
    name:"魔導経験値炉・II",
    description:"次の30分間、獲得XPを+50%。",
    price:800,
    type:"xpBoost",
    value:1.5,
    durationMinutes:30
  },
  {
    id:"xp-boost-50",
    name:"覚醒の賢者石・III",
    description:"次の60分間、獲得XPを+75%。",
    price:1800,
    type:"xpBoost",
    value:1.75,
    durationMinutes:60
  },
  {
    id:"xp-boost-100",
    name:"神域の経験核・IV",
    description:"次の120分間、獲得XPを2倍。",
    price:4000,
    type:"xpBoost",
    value:2,
    durationMinutes:120
  },

  {
    id:"boss-dmg-10",
    name:"破邪の刃",
    description:"次のボス攻撃のダメージ+25%。",
    price:400,
    type:"bossDamage",
    value:1.25
  },
  {
    id:"boss-dmg-25",
    name:"竜殺しの紋章",
    description:"次のボス攻撃のダメージ+50%。",
    price:1000,
    type:"bossDamage",
    value:1.5
  },
  {
    id:"boss-dmg-50",
    name:"終焉の魔剣",
    description:"次のボス攻撃のダメージ+100%。",
    price:2500,
    type:"bossDamage",
    value:2
  },
  {
    id:"boss-dmg-100",
    name:"世界断罪の一撃",
    description:"次のボス攻撃のダメージ+200%。",
    price:6000,
    type:"bossDamage",
    value:3
  },

  {
    id:"boss-down-1",
    name:"封印解除・弱体Ⅰ",
    description:"次のボスの最大HPを10%下げる。",
    price:500,
    type:"bossLevelDown",
    value:.9
  },
  {
    id:"boss-down-2",
    name:"封印解除・弱体Ⅱ",
    description:"次のボスの最大HPを20%下げる。",
    price:1200,
    type:"bossLevelDown",
    value:.8
  },
  {
    id:"boss-down-3",
    name:"封印解除・弱体Ⅲ",
    description:"次のボスの最大HPを30%下げる。",
    price:2500,
    type:"bossLevelDown",
    value:.7
  },
  {
    id:"boss-down-4",
    name:"神殺しの禁呪",
    description:"次のボスの最大HPを50%下げる。",
    price:5000,
    type:"bossLevelDown",
    value:.5
  },

  ...[
    ["shop-title-1","異端の受験者",500],
    ["shop-title-2","覚醒者",800],
    ["shop-title-3","深淵を覗く者",1200],
    ["shop-title-4","魔導学徒",1600],
    ["shop-title-5","限界突破者",2200],
    ["shop-title-6","禁断の知識人",3000],
    ["shop-title-7","試験場の覇者",4000],
    ["shop-title-8","運命を喰らう者",5500],
    ["shop-title-9","賢者の末裔",7000],
    ["shop-title-10","受験界の災厄",9000],
    ["shop-title-11","神域の学習者",12000],
    ["shop-title-12","合格の向こう側",15000]
  ].map(
    ([id,name,price])=>({
      id,
      name,
      description:"ショップ限定称号。",
      price,
      type:"title",
      target:id
    })
  ),

  {
    id:"bg-abyss",
    name:"背景：深淵の書庫",
    description:"プロフィール背景を解放。",
    price:1500,
    type:"background",
    target:"abyss"
  },
  {
    id:"bg-royal",
    name:"背景：王城の試験場",
    description:"プロフィール背景を解放。",
    price:3000,
    type:"background",
    target:"royal"
  },
  {
    id:"bg-cosmic",
    name:"背景：星海の知識庫",
    description:"プロフィール背景を解放。",
    price:6000,
    type:"background",
    target:"cosmic"
  }
];

for(
  const item of SHOP_ITEMS.filter(
    x=>x.type==="title"
  )
){
  const id=item.target;

  if(
    !TITLES.some(
      t=>t.id===id
    )
  ){
    TITLES.push({
      id,
      name:item.name,
      description:item.description,
      price:item.price,
      hidden:false
    });
  }
}


// ============================================================
// Boss / DOM
// ============================================================

const BOSS_DEFAULTS={
  maxHp:10000,
  hp:10000,
  active:true,
  weaknessSubject:null,
  startedAt:null,
  endsAt:null,
  defeated:false,
  level:1
};

const $=id=>document.getElementById(id);

const setText=(id,v)=>{
  const e=$(id);
  if(e)e.textContent=v;
};

const showElement=id=>{
  const e=$(id);

  if(e){
    e.classList.remove("hidden");
    e.style.display="";
  }
};

const hideElement=id=>{
  const e=$(id);

  if(e){
    e.classList.add("hidden");
    e.style.display="none";
  }
};

const escapeHtml=v=>
  String(v??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

const clearError=id=>setText(id,"");

const showError=(id,m)=>
  setText(id,m);


// ============================================================
// Japan Time
// ============================================================

function getJapanDateString(
  date=new Date()
){
  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      timeZone:"Asia/Tokyo",
      year:"numeric",
      month:"2-digit",
      day:"2-digit"
    }
  )
    .format(date)
    .replaceAll("/","-");
}

function getJapanMonthString(
  date=new Date()
){
  const p=
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:"Asia/Tokyo",
        year:"numeric",
        month:"2-digit"
      }
    ).formatToParts(date);

  return `${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}`;
}

function getJapanHour(
  date=new Date()
){
  return Number(
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:"Asia/Tokyo",
        hour:"2-digit",
        hour12:false
      }
    ).format(date)
  );
}

function japanMidnightTimestamp(s){
  return new Date(
    `${s}T00:00:00+09:00`
  ).getTime();
}

function formatMinutes(m){
  m=Math.max(
    0,
    Math.floor(
      Number(m)||0
    )
  );

  const h=Math.floor(m/60);
  const x=m%60;

  return h
    ? `${h}時間 ${x}分`
    : `${x}分`;
}

function formatDateTime(ts){
  if(!ts)return"";

  const d=
    typeof ts.toDate==="function"
      ? ts.toDate()
      : ts instanceof Date
        ? ts
        : null;

  return d
    ? new Intl.DateTimeFormat(
        "ja-JP",
        {
          timeZone:"Asia/Tokyo",
          year:"numeric",
          month:"2-digit",
          day:"2-digit",
          hour:"2-digit",
          minute:"2-digit"
        }
      ).format(d)
    : "";
}

function getJapanWeekId(
  date=new Date()
){
  const [
    y,
    m,
    d
  ]=
    getJapanDateString(date)
      .split("-")
      .map(Number);

  const u=
    new Date(
      Date.UTC(
        y,
        m-1,
        d
      )
    );

  const day=u.getUTCDay();

  u.setUTCDate(
    u.getUTCDate()+
    (
      day===0
        ? -6
        : 1-day
    )
  );

  return `${u.getUTCFullYear()}-${String(u.getUTCMonth()+1).padStart(2,"0")}-${String(u.getUTCDate()).padStart(2,"0")}`;
}


// ============================================================
// Firebase Errors
// ============================================================

function firebaseErrorMessage(e){
  console.error(e);

  const m={
    "auth/invalid-credential":
      "ユーザーIDまたはパスワードが正しくありません。",
    "auth/wrong-password":
      "ユーザーIDまたはパスワードが正しくありません。",
    "auth/user-not-found":
      "ユーザーが見つかりません。",
    "auth/email-already-in-use":
      "そのユーザーIDはすでに使用されています。",
    "auth/weak-password":
      "パスワードは6文字以上にしてください。",
    "auth/invalid-email":
      "ユーザーIDの形式が正しくありません。",
    "auth/too-many-requests":
      "試行回数が多すぎます。",
    "auth/network-request-failed":
      "ネットワークエラーが発生しました。",
    "permission-denied":
      "Firestoreの権限がありません。"
  };

  return m[e?.code]||
    `エラーが発生しました。\n${e?.message||e?.code||""}`;
}


// ============================================================
// User / Course / Subject
// ============================================================

function normalizeUserId(v){
  return String(v||"")
    .trim()
    .toLowerCase();
}

function userIdToEmail(id){
  return `${normalizeUserId(id)}@juken-rpg.local`;
}

function getCourseName(c){
  return (
    {
      science:"理系",
      humanities:"文系",
      undecided:"未定"
    }[c]||"未定"
  );
}

function getSubjectName(s){
  return SUBJECT_NAMES[s]||s||"その他";
}


// ============================================================
// XP / Level
// ============================================================

function xpRequiredForLevel(level){
  if(level>=100)return 0;

  return 100+
    Math.floor(
      (level-1)/10
    )*50;
}

function totalXpForLevel(level){
  let t=0;

  for(
    let i=1;
    i<level;
    i++
  ){
    t+=xpRequiredForLevel(i);
  }

  return t;
}

function calculateLevel(xp){
  xp=Math.max(
    0,
    Math.floor(
      Number(xp)||0
    )
  );

  let l=1;

  while(
    l<100&&
    xp>=totalXpForLevel(l+1)
  ){
    l++;
  }

  return l;
}

function getLevelProgress(xp){
  const level=
    calculateLevel(xp);

  if(level>=100){
    return{
      level:100,
      current:0,
      required:0,
      percent:100
    };
  }

  const a=
    totalXpForLevel(level);

  const b=
    totalXpForLevel(level+1);

  return{
    level,
    current:xp-a,
    required:b-a,
    percent:
      Math.max(
        0,
        Math.min(
          100,
          (xp-a)/(b-a)*100
        )
      )
  };
}


// ============================================================
// Rank
// ============================================================

function calculateRank(m){
  m=Math.max(
    0,
    Math.floor(
      Number(m)||0
    )
  );

  let r="Bronze";

  for(
    const x of RANKS
  ){
    if(m>=x.minMinutes){
      r=x.name;
    }
  }

  return r;
}

function getRankInfo(r){
  return RANKS.find(
    x=>x.name===r
  )||RANKS[0];
}

function getRankIndex(r){
  return Math.max(
    0,
    RANKS.findIndex(
      x=>x.name===r
    )
  );
}


// ============================================================
// Player
// ============================================================

function createDefaultPlayerData(
  userId=""
){
  const seasonId=
    getJapanMonthString();

  return{
    uid:"",
    userId,
    displayName:
      userId||"プレイヤー",

    course:"undecided",
    subjects:[],

    xp:0,
    level:1,

    coins:0,

    totalStudyMinutes:0,

    todayStudyMinutes:0,
    todayStudyDate:
      getJapanDateString(),

    todayXp:0,
    todayCoins:0,

    seasonId,
    seasonStartDate:
      `${seasonId}-01`,

    seasonStudyMinutes:0,
    rank:"Bronze",

    permanentLegendBoost:false,

    subjectLevels:{},
    subjectStudyMinutes:{},
    subjectHistory:{},

    studyHistory:[],

    questState:null,

    loginStreak:0,
    lastLoginDate:null,
    loginRewardDate:null,

    title:"見習い受験生",
    unlockedTitles:["beginner"],

    achievements:{},

    purchasedItems:{},
    inventory:{},

    activeBoosts:{
      xp:[],
      bossDamage:[]
    },

    background:"default",

    boss:{
      contribution:0,
      damage:0,
      battles:0,
      mvpCount:0
    },

    bossData:null,

    partyId:null,
    partyRole:null,
    partyMembers:[],

    createdAt:null,
    updatedAt:null
  };
}

function normalizeDailyData(p){
  const t=
    getJapanDateString();

  if(
    p.todayStudyDate!==t
  ){
    p.todayStudyDate=t;
    p.todayStudyMinutes=0;
    p.todayXp=0;
    p.todayCoins=0;
  }

  p.todayStudyMinutes=
    Math.max(
      0,
      Math.floor(
        Number(
          p.todayStudyMinutes
        )||0
      )
    );

  return p;
}

function normalizeSeasonData(p){
  const s=
    getJapanMonthString();

  if(
    p.seasonId!==s
  ){
    p.seasonId=s;
    p.seasonStartDate=
      `${s}-01`;
    p.seasonStudyMinutes=0;
    p.rank="Bronze";
  }

  p.seasonStudyMinutes=
    Math.max(
      0,
      Math.floor(
        Number(
          p.seasonStudyMinutes
        )||0
      )
    );

  p.rank=
    calculateRank(
      p.seasonStudyMinutes
    );

  if(
    p.rank==="Legend"
  ){
    p.permanentLegendBoost=true;
  }

  return p;
}

function getXpMultiplier(
  p=currentPlayer
){
  let mult=
    p?.permanentLegendBoost
      ? 1.5
      : 1;

  const now=Date.now();

  for(
    const b of
    p?.activeBoosts?.xp||[]
  ){
    if(
      Number(b.expiresAt)>now
    ){
      mult*=Number(b.value)||1;
    }
  }

  return mult;
}


// ============================================================
// Quest
// ============================================================

function getQuestSubjectCandidates(
  p=currentPlayer
){
  return Array.isArray(
    p?.subjects
  )
    ? p.subjects.filter(
        s=>SUBJECT_NAMES[s]
      )
    : [];
}

function getLeastStudiedSubjects(
  p=currentPlayer
){
  return [
    ...getQuestSubjectCandidates(p)
  ].sort(
    (a,b)=>
      Number(
        p?.subjectStudyMinutes?.[a]||0
      )-
      Number(
        p?.subjectStudyMinutes?.[b]||0
      )
  );
}

function createDailyQuest(s,i){
  return{
    id:
      `daily-${getJapanDateString()}-${i}-${s}`,
    type:"daily",
    title:
      `${getSubjectName(s)}特訓`,
    description:
      `${getSubjectName(s)}を20分勉強する`,
    subject:s,
    target:20,
    progress:0,
    completed:false,
    claimed:false,
    rewardXp:20,
    rewardCoins:30
  };
}

function createWeeklyQuest(s){
  return{
    id:
      `weekly-${getJapanWeekId()}-${s}`,
    type:"weekly",
    title:
      `${getSubjectName(s)}週間強化`,
    description:
      `${getSubjectName(s)}を今週100分勉強する`,
    subject:s,
    target:100,
    progress:0,
    completed:false,
    claimed:false,
    rewardXp:70,
    rewardCoins:70
  };
}

function createRareQuest(){
  return{
    id:"rare-3h",
    type:"rare",
    title:"限界突破",
    description:
      "1日に合計3時間勉強する",
    target:180,
    progress:0,
    completed:false,
    claimed:false,
    rewardXp:100,
    rewardCoins:500
  };
}

function ensureQuestState(p){
  if(
    !p.questState||
    typeof p.questState!=="object"
  ){
    p.questState={};
  }

  const today=
    getJapanDateString();

  const week=
    getJapanWeekId();

  const c=
    getLeastStudiedSubjects(p);

  if(
    p.questState.dailyDate!==today||
    !Array.isArray(
      p.questState.daily
    )||
    p.questState.daily.length!==
      Math.min(
        3,
        c.length
      )
  ){
    p.questState.daily=
      c.slice(0,3)
        .map(createDailyQuest);

    p.questState.dailyDate=today;
  }

  if(
    p.questState.weeklyId!==week||
    !p.questState.weekly
  ){
    p.questState.weekly=
      c[0]
        ? createWeeklyQuest(c[0])
        : null;

    p.questState.weeklyId=week;
  }

  if(
    p.questState.rareDate!==today
  ){
    p.questState.rareDate=today;
    p.questState.rare=
      createRareQuest();
  }

  return p.questState;
}


// ============================================================
// Firebase
// ============================================================

async function initializeFirebase(){
  if(firebaseApp)return true;

  try{
    firebaseApp=
      initializeApp(
        firebaseConfig
      );

    auth=
      getAuth(
        firebaseApp
      );

    db=
      getFirestore(
        firebaseApp
      );

    return true;

  }catch(e){
    console.error(e);

    alert(
      `Firebaseの初期化に失敗しました。\n${e.message}`
    );

    return false;
  }
}

async function loadPlayer(user){
  if(!user||!db)return null;

  const s=
    await getDoc(
      doc(
        db,
        "users",
        user.uid
      )
    );

  if(!s.exists())return null;

  const p={
    ...createDefaultPlayerData(""),
    ...s.data()
  };

  p.uid=
    p.uid||user.uid;

  p.userId=
    p.userId||
    normalizeUserId(
      user.email?.split("@")[0]
    );

  p.subjects=
    Array.isArray(p.subjects)
      ? p.subjects
      : [];

  p.subjectLevels=
    p.subjectLevels||{};

  p.subjectStudyMinutes=
    p.subjectStudyMinutes||{};

  p.subjectHistory=
    p.subjectHistory||{};

  p.studyHistory=
    Array.isArray(
      p.studyHistory
    )
      ? p.studyHistory
      : [];

  p.unlockedTitles=
    Array.isArray(
      p.unlockedTitles
    )
      ? p.unlockedTitles
      : ["beginner"];

  p.achievements=
    p.achievements||{};

  p.purchasedItems=
    p.purchasedItems||{};

  p.inventory=
    p.inventory||{};

  p.activeBoosts=
    p.activeBoosts||{
      xp:[],
      bossDamage:[]
    };

  p.boss={
    contribution:0,
    damage:0,
    battles:0,
    mvpCount:0,
    ...(p.boss||{})
  };

  normalizeDailyData(p);
  normalizeSeasonData(p);

  p.level=
    calculateLevel(
      p.xp
    );

  ensureQuestState(p);

  return p;
}

async function createPlayer(
  user,
  data={}
){
  const id=
    normalizeUserId(
      data.userId||
      user.email?.split("@")[0]||
      ""
    );

  const p={
    ...createDefaultPlayerData(id),
    ...data,
    uid:user.uid,
    userId:id,
    email:user.email||"",
    createdAt:
      serverTimestamp(),
    updatedAt:
      serverTimestamp()
  };

  ensureQuestState(p);

  await setDoc(
    doc(
      db,
      "users",
      user.uid
    ),
    p
  );

  return p;
}

async function savePlayer(){
  if(
    !currentUser||
    !currentPlayer||
    !db
  ){
    return;
  }

  normalizeDailyData(
    currentPlayer
  );

  normalizeSeasonData(
    currentPlayer
  );

  currentPlayer.level=
    calculateLevel(
      currentPlayer.xp
    );

  ensureQuestState(
    currentPlayer
  );

  await setDoc(
    doc(
      db,
      "users",
      currentUser.uid
    ),
    {
      ...currentPlayer,
      uid:currentUser.uid,
      updatedAt:
        serverTimestamp()
    },
    {
      merge:true
    }
  );
}


// ============================================================
// Quest Logic
// ============================================================

function questProgressPercent(q){
  return q?.target
    ? Math.min(
        100,
        Math.max(
          0,
          Number(q.progress||0)/
          Number(q.target)*
          100
        )
      )
    : 0;
}

function updateQuestProgress(
  subject,
  minutes,
  date
){
  if(
    !currentPlayer||
    date!==getJapanDateString()
  ){
    return[];
  }

  ensureQuestState(
    currentPlayer
  );

  const done=[];

  for(
    const q of
    currentPlayer.questState.daily||[]
  ){
    if(
      !q.completed&&
      !q.claimed&&
      q.subject===subject
    ){
      q.progress=
        Math.min(
          q.target,
          Number(q.progress||0)+minutes
        );

      if(
        q.progress>=q.target
      ){
        q.completed=true;
        done.push(q);
      }
    }
  }

  const w=
    currentPlayer
      .questState
      .weekly;

  if(
    w&&
    !w.completed&&
    !w.claimed&&
    w.subject===subject
  ){
    w.progress=
      Math.min(
        w.target,
        Number(w.progress||0)+minutes
      );

    if(
      w.progress>=w.target
    ){
      w.completed=true;
      done.push(w);
    }
  }

  const r=
    currentPlayer
      .questState
      .rare;

  if(
    r&&
    !r.completed&&
    !r.claimed
  ){
    r.progress=
      Math.min(
        r.target,
        currentPlayer.todayStudyMinutes
      );

    if(
      r.progress>=r.target
    ){
      r.completed=true;
      done.push(r);
    }
  }

  return done;
}

function findQuestById(id){
  const s=
    currentPlayer?.questState;

  return[
    ...(s?.daily||[]),
    s?.weekly,
    s?.rare
  ]
    .filter(Boolean)
    .find(
      q=>q.id===id
    )||null;
}

async function claimQuestReward(q){
  if(
    !currentPlayer||
    !q||
    q.claimed||
    !q.completed
  ){
    return false;
  }

  q.claimed=true;

  const xp=
    Math.floor(
      Number(q.rewardXp||0)*
      getXpMultiplier()
    );

  currentPlayer.xp+=xp;

  currentPlayer.coins+=
    Number(
      q.rewardCoins||0
    );

  currentPlayer.level=
    calculateLevel(
      currentPlayer.xp
    );

  currentPlayer.questClaimedCount=
    Number(
      currentPlayer.questClaimedCount||0
    )+1;

  await savePlayer();

  updatePlayerUI();
  renderAllAutoUI();

  showNotification(
    `🎁 ${q.title}達成！ +${xp} XP / +${q.rewardCoins}🪙`
  );

  await checkAchievements();

  return true;
}


// ============================================================
// Titles
// ============================================================

function getTitleById(id){
  return TITLES.find(
    t=>t.id===id
  )||null;
}

function hasTitle(id){
  return!!currentPlayer
    ?.unlockedTitles
    ?.includes(id);
}

async function unlockTitle(
  id,
  silent=false
){
  if(
    !currentPlayer||
    hasTitle(id)
  ){
    return false;
  }

  const t=
    getTitleById(id);

  if(!t)return false;

  currentPlayer
    .unlockedTitles
    .push(id);

  await savePlayer();

  if(!silent){
    showTitleUnlockEffect(t);
  }

  return true;
}

async function equipTitle(id){
  if(
    !hasTitle(id)
  ){
    showNotification(
      "🔒 まだ解放されていない称号です。"
    );
    return;
  }

  const t=
    getTitleById(id);

  if(!t)return;

  currentPlayer.title=
    t.name;

  await savePlayer();

  updatePlayerUI();
  renderTitleUI();

  showNotification(
    `🏷️ 「${t.name}」を装備しました！`
  );
}


// ============================================================
// Achievements
// ============================================================

async function unlockAchievement(a){
  if(
    !currentPlayer||
    achievementUnlocked(a.id)
  ){
    return false;
  }

  currentPlayer
    .achievements[a.id]={
      unlocked:true,
      unlockedAt:
        new Date().toISOString()
    };

  currentPlayer.coins+=
    Number(
      a.rewardCoins||0
    );

  await savePlayer();

  showAchievementEffect(a);

  return true;
}

function achievementUnlocked(id){
  return!!currentPlayer
    ?.achievements
    ?.[id]
    ?.unlocked;
}

async function checkAchievements(){
  if(!currentPlayer)return;

  const m=
    Number(
      currentPlayer
        .totalStudyMinutes||0
    );

  const l=
    currentPlayer.level;

  const r=
    getRankIndex(
      currentPlayer.rank
    );

  const s=
    Number(
      currentPlayer.loginStreak||0
    );

  const c={
    "first-study":
      m>=1,

    "study-10h":
      m>=600,

    "study-50h":
      m>=3000,

    "study-100h":
      m>=6000,

    "level-10":
      l>=10,

    "level-50":
      l>=50,

    "level-100":
      l>=100,

    "rank-gold":
      r>=2,

    "rank-platinum":
      r>=3,

    "rank-diamond":
      r>=4,

    "rank-master":
      r>=5,

    "rank-legend":
      r>=7,

    "streak-3":
      s>=3,

    "streak-7":
      s>=7,

    "streak-30":
      s>=30
  };

  for(
    const a of ACHIEVEMENTS
  ){
    if(c[a.id]){
      await unlockAchievement(a);
    }
  }

  await checkHiddenTitles();
}

async function checkHiddenTitles(){
  if(!currentPlayer)return;

  const m=
    currentPlayer.todayStudyMinutes;

  const s=
    currentPlayer.loginStreak;

  const h=
    getJapanHour();

  const subs=
    getQuestSubjectCandidates();

  if(m>=180)
    await unlockTitle(
      "hidden-speed"
    );

  if(s>=7)
    await unlockTitle(
      "secret-2"
    );

  if(m>=120)
    await unlockTitle(
      "secret-1"
    );

  if(m>=240)
    await unlockTitle(
      "secret-3"
    );

  if(m>=300)
    await unlockTitle(
      "secret-4"
    );

  if(
    h<4&&
    m>=1
  )
    await unlockTitle(
      "hidden-midnight"
    );

  if(
    h>=4&&
    h<6&&
    m>=1
  )
    await unlockTitle(
      "hidden-early"
    );

  if(
    currentPlayer.questClaimedCount>=50
  )
    await unlockTitle(
      "quest-50"
    );
  else if(
    currentPlayer.questClaimedCount>=10
  )
    await unlockTitle(
      "quest-10"
    );

  if(
    currentPlayer.questClaimedCount>=1
  )
    await unlockTitle(
      "quest-first"
    );

  if(s>=7)
    await unlockTitle(
      "streak-7-title"
    );

  if(s>=14)
    await unlockTitle(
      "streak-14-title"
    );

  if(s>=30)
    await unlockTitle(
      "streak-30-title"
    );

  if(
    currentPlayer.boss?.damage>=1000
  )
    await unlockTitle(
      "damage-dealer"
    );

  if(
    currentPlayer.boss?.mvpCount>=1
  )
    await unlockTitle(
      "mvp"
    );

  if(currentPlayer.partyId)
    await unlockTitle(
      "party-player"
    );

  if(
    subs.length===
    Object.keys(SUBJECT_NAMES).length&&
    subs.length>0
  )
    await unlockTitle(
      "secret-10"
    );
}


// ============================================================
// Login Streak
// ============================================================

async function processLoginStreak(){
  if(!currentPlayer)return;

  const today=
    getJapanDateString();

  if(
    currentPlayer.loginRewardDate===
    today
  ){
    return;
  }

  const prev=
    currentPlayer.lastLoginDate;

  if(!prev){
    currentPlayer.loginStreak=1;

  }else{
    const diff=
      Math.round(
        (
          japanMidnightTimestamp(today)-
          japanMidnightTimestamp(prev)
        )/
        86400000
      );

    if(diff===1){
      currentPlayer.loginStreak=
        (
          currentPlayer.loginStreak||0
        )+1;

    }else if(diff>1){

      if(
        (currentPlayer.loginStreak||0)>1
      ){
        await unlockTitle(
          "hidden-comeback",
          true
        );
      }

      currentPlayer.loginStreak=1;
    }
  }

  currentPlayer.lastLoginDate=
    today;

  currentPlayer.loginRewardDate=
    today;

  const s=
    currentPlayer.loginStreak;

  let reward=
    LOGIN_REWARDS.normal;

  if(s===1)
    reward=LOGIN_REWARDS.first;

  if(s%3===0)
    reward=LOGIN_REWARDS.streak3;

  if(s%7===0)
    reward=LOGIN_REWARDS.streak7;

  if(s%30===0)
    reward=LOGIN_REWARDS.streak30;

  const xp=
    Math.floor(
      reward.xp*
      getXpMultiplier()
    );

  currentPlayer.coins+=
    reward.coins;

  currentPlayer.xp+=xp;

  currentPlayer.level=
    calculateLevel(
      currentPlayer.xp
    );

  await savePlayer();

  showNotification(
    `🔥 ${s}日連続ログイン！ +${reward.coins}🪙${xp?` / +${xp} XP`:""}`
  );

  await checkAchievements();
}


// ============================================================
// Boss
// ============================================================

function createBossData(){
  const c=
    getQuestSubjectCandidates();

  const weakness=
    c.length
      ? c[
          Math.floor(
            Math.random()*c.length
          )
        ]
      : null;

  return{
    ...BOSS_DEFAULTS,
    weaknessSubject:weakness,
    startedAt:
      new Date().toISOString(),
    level:1
  };
}

function getBossData(){
  if(!currentPlayer)return null;

  if(!currentPlayer.bossData){
    currentPlayer.bossData=
      createBossData();
  }

  return currentPlayer.bossData;
}

function calculateBossDamage(
  minutes,
  subject
){
  let d=
    Math.max(
      0,
      Number(minutes)||0
    )*10;

  const b=
    getBossData();

  if(
    b?.weaknessSubject===subject
  ){
    d*=2;
  }

  for(
    const x of
    currentPlayer
      ?.activeBoosts
      ?.bossDamage||[]
  ){
    if(
      Number(x.expiresAt)>Date.now()
    ){
      d*=
        Number(x.value)||1;
    }
  }

  return Math.floor(d);
}

async function applyBossDamage(
  minutes,
  subject
){
  if(!currentPlayer)return 0;

  const b=
    getBossData();

  if(
    !b||
    b.defeated||
    !b.active
  ){
    return 0;
  }

  const d=
    calculateBossDamage(
      minutes,
      subject
    );

  const before=b.hp;

  b.hp=
    Math.max(
      0,
      Number(
        b.hp||b.maxHp
      )-d
    );

  currentPlayer.boss.damage=
    (
      currentPlayer.boss.damage||0
    )+d;

  currentPlayer.boss.contribution=
    (
      currentPlayer.boss.contribution||0
    )+d;

  currentPlayer.boss.battles=
    (
      currentPlayer.boss.battles||0
    )+1;

  if(
    b.weaknessSubject===subject&&
    d>=500
  ){
    await unlockTitle(
      "weakness-breaker",
      true
    );
  }

  if(b.hp<=0){
    b.hp=0;
    b.defeated=true;
    b.active=false;
    b.endsAt=
      new Date().toISOString();

    await unlockTitle(
      "boss-first",
      true
    );

    if(currentPlayer.partyId){
      await unlockTitle(
        "party-boss",
        true
      );
    }

    if(before>0){
      await unlockTitle(
        "secret-7",
        true
      );
    }

    showBossDefeatEffect();
  }

  await savePlayer();

  renderBossUI();

  return d;
}


// ============================================================
// Shop UI
// ============================================================

function getShopContainer(){
  let c=
    $("shop-auto-container");

  if(c)return c;

  const s=
    $("shop-screen");

  if(!s)return null;

  c=
    document.createElement(
      "div"
    );

  c.id=
    "shop-auto-container";

  c.className=
    "shop-auto-container";

  s.appendChild(c);

  return c;
}

function renderShopUI(){
  const c=
    getShopContainer();

  if(
    !c||
    !currentPlayer
  ){
    return;
  }

  c.innerHTML=`
    <section class="rpg-shop-panel">

      <div class="shop-header">

        <h2>
          🛒 闇市：受験者の武装庫
        </h2>

        <strong>
          🪙 ${currentPlayer.coins}
        </strong>

      </div>

      <div class="shop-grid">

        ${SHOP_ITEMS.map(
          i=>`
            <div class="rpg-shop-card">

              <h3>
                ${escapeHtml(i.name)}
              </h3>

              <p>
                ${escapeHtml(i.description)}
              </p>

              <strong>
                🪙 ${i.price}
              </strong>

              <button
                type="button"
                data-buy-item="${escapeHtml(i.id)}"
              >
                ${
                  currentPlayer.purchasedItems?.[i.id]
                    ?"所持済み"
                    :"購入"
                }
              </button>

            </div>
          `
        ).join("")}

      </div>

    </section>
  `;

  if(!c.dataset.init){
    c.dataset.init="1";

    c.addEventListener(
      "click",
      e=>{
        const b=
          e.target.closest(
            "[data-buy-item]"
          );

        if(b){
          purchaseShopItem(
            b.dataset.buyItem
          );
        }
      }
    );
  }
}

async function purchaseShopItem(id){
  const i=
    SHOP_ITEMS.find(
      x=>x.id===id
    );

  if(
    !i||
    !currentPlayer
  ){
    return;
  }

  if(
    i.type!=="xpBoost"&&
    currentPlayer
      .purchasedItems?.[id]
  ){
    showNotification(
      "すでに所持しています。"
    );

    return;
  }

  if(
    currentPlayer.coins<i.price
  ){
    showNotification(
      "🪙 コインが足りません。"
    );

    return;
  }

  currentPlayer.coins-=i.price;

  currentPlayer.purchasedItems[id]=true;
  currentPlayer.inventory[id]=true;

  if(i.type==="title"){
    await unlockTitle(
      i.target,
      true
    );
  }

  if(i.type==="background"){
    currentPlayer.background=
      i.target;
  }

  if(i.type==="xpBoost"){
    currentPlayer
      .activeBoosts
      .xp
      .push({
        itemId:id,
        value:i.value,
        expiresAt:
          Date.now()+
          i.durationMinutes*
          60000
      });
  }

  if(i.type==="bossDamage"){
    currentPlayer
      .activeBoosts
      .bossDamage
      .push({
        itemId:id,
        value:i.value,
        expiresAt:
          Date.now()+
          3600000
      });
  }

  if(i.type==="bossLevelDown"){
    const b=
      getBossData();

    if(
      b&&
      !b.defeated
    ){
      b.maxHp=
        Math.max(
          100,
          Math.floor(
            b.maxHp*
            i.value
          )
        );

      b.hp=
        Math.min(
          b.hp,
          b.maxHp
        );
    }
  }

  await savePlayer();

  renderShopUI();
  renderTitleUI();
  renderBossUI();
  updatePlayerUI();

  showNotification(
    `🛒 ${i.name}を購入した！`
  );
}


// ============================================================
// UI
// ============================================================

function renderTitleUI(){
  let c=
    $("title-auto-container");

  if(!c){
    const s=
      $("title-screen")||
      $("profile-screen");

    if(
      !s||
      !currentPlayer
    ){
      return;
    }

    c=
      document.createElement(
        "div"
      );

    c.id=
      "title-auto-container";

    s.appendChild(c);
  }

  c.innerHTML=`
    <section class="rpg-title-panel">

      <h2>
        🏷️ 称号
      </h2>

      <p>
        現在：
        <strong>
          ${escapeHtml(
            currentPlayer.title||
            "見習い受験生"
          )}
        </strong>
      </p>

      <div class="title-grid">

        ${TITLES.map(
          t=>{
            const o=
              hasTitle(t.id);

            const n=
              t.hidden&&!o
                ?"？？？"
                :t.name;

            const d=
              t.hidden&&!o
                ?"条件を満たすと解放されます。"
                :t.description;

            return`
              <div class="rpg-title-card ${
                o
                  ?"title-owned"
                  :"title-locked"
              }">

                <strong>
                  ${escapeHtml(n)}
                </strong>

                <p>
                  ${escapeHtml(d)}
                </p>

                ${
                  o
                    ?`
                      <button
                        data-equip-title="${escapeHtml(t.id)}"
                      >
                        ${
                          currentPlayer.title===t.name
                            ?"装備中"
                            :"装備"
                        }
                      </button>
                    `
                    :"🔒 未解放"
                }

              </div>
            `;
          }
        ).join("")}

      </div>

    </section>
  `;

  if(!c.dataset.init){
    c.dataset.init="1";

    c.addEventListener(
      "click",
      e=>{
        const b=
          e.target.closest(
            "[data-equip-title]"
          );

        if(b){
          equipTitle(
            b.dataset.equipTitle
          );
        }
      }
    );
  }
}

function renderAchievementUI(){
  let c=
    $("achievement-auto-container");

  if(!c){
    const s=
      $("achievement-screen");

    if(
      !s||
      !currentPlayer
    ){
      return;
    }

    c=
      document.createElement(
        "div"
      );

    c.id=
      "achievement-auto-container";

    s.appendChild(c);
  }

  c.innerHTML=`
    <section class="rpg-achievement-panel">

      <h2>
        🏅 実績
      </h2>

      <div class="achievement-grid">

        ${ACHIEVEMENTS.map(
          a=>`
            <div class="achievement-card ${
              achievementUnlocked(a.id)
                ?"achievement-unlocked"
                :"achievement-locked"
            }">

              <strong>
                ${
                  achievementUnlocked(a.id)
                    ?"🏆"
                    :"🔒"
                }

                ${escapeHtml(a.title)}
              </strong>

              <p>
                ${escapeHtml(a.description)}
              </p>

              <small>
                ${
                  achievementUnlocked(a.id)
                    ?"達成済み"
                    :`報酬 🪙 ${a.rewardCoins}`
                }
              </small>

            </div>
          `
        ).join("")}

      </div>

    </section>
  `;
}

function renderQuestUI(){
  let c=
    $("quest-auto-container");

  if(!c){
    const s=
      $("quest-screen");

    if(
      !s||
      !currentPlayer
    ){
      return;
    }

    c=
      document.createElement(
        "div"
      );

    c.id=
      "quest-auto-container";

    s.appendChild(c);
  }

  ensureQuestState(
    currentPlayer
  );

  const qs=[
    ...(currentPlayer
      .questState
      .daily||[]),

    currentPlayer
      .questState
      .weekly,

    currentPlayer
      .questState
      .rare
  ].filter(Boolean);

  c.innerHTML=`
    <section>

      <h2>
        ⚔️ クエスト
      </h2>

      ${qs.map(
        q=>`
          <div class="rpg-quest-card ${
            q.completed
              ?"quest-completed"
              :""
          }">

            <h3>
              ${escapeHtml(q.title)}
            </h3>

            <p>
              ${escapeHtml(q.description)}
            </p>

            <div>
              ${Math.min(q.progress,q.target)}
              /
              ${q.target}分
            </div>

            <div class="quest-progress-bar">

              <div
                class="quest-progress-fill"
                style="width:${questProgressPercent(q)}%"
              ></div>

            </div>

            ${
              q.claimed
                ?"✅ 受取済み"
                :q.completed
                  ?`
                    <button
                      data-claim-quest="${escapeHtml(q.id)}"
                    >
                      報酬を受け取る
                    </button>
                  `
                  :"進行中"
            }

          </div>
        `
      ).join("")}

    </section>
  `;

  if(!c.dataset.init){
    c.dataset.init="1";

    c.addEventListener(
      "click",
      e=>{
        const b=
          e.target.closest(
            "[data-claim-quest]"
          );

        if(b){
          const q=
            findQuestById(
              b.dataset.claimQuest
            );

          if(q){
            claimQuestReward(q);
          }
        }
      }
    );
  }
}

function renderRankProgress(){
  let c=
    $("rank-auto-container");

  if(!c){
    const s=
      $("rank-screen");

    if(
      !s||
      !currentPlayer
    ){
      return;
    }

    c=
      document.createElement(
        "div"
      );

    c.id=
      "rank-auto-container";

    s.appendChild(c);
  }

  const m=
    currentPlayer.seasonStudyMinutes;

  const r=
    calculateRank(m);

  const i=
    getRankIndex(r);

  const n=
    RANKS[i+1];

  const cur=
    RANKS[i];

  const pct=
    n
      ? Math.min(
          100,
          Math.max(
            0,
            (
              (m-cur.minMinutes)/
              (n.minMinutes-cur.minMinutes)
            )*100
          )
        )
      :100;

  c.innerHTML=`
    <section class="rank-auto-card">

      <h2>
        🏆 ${escapeHtml(r)}
      </h2>

      <p>
        シーズン勉強時間：
        <strong>
          ${formatMinutes(m)}
        </strong>
      </p>

      <div class="rank-progress-bar">

        <div
          class="rank-progress-fill"
          style="width:${pct}%"
        ></div>

      </div>

      <p>
        ${
          n
            ?`${escapeHtml(n.name)}まで ${formatMinutes(n.minMinutes-m)}`
            :"👑 LEGEND到達"
        }
      </p>

      <div class="rank-list">

        ${RANKS.map(
          x=>
            `<div>${x.name} — ${formatMinutes(x.minMinutes)}</div>`
        ).join("")}

      </div>

      ${
        currentPlayer.permanentLegendBoost
          ?"<div>👑 LEGEND BONUS：永久XP 1.5倍</div>"
          :""
      }

    </section>
  `;
}

function renderBossUI(){
  let c=
    $("boss-auto-container");

  if(!c){
    const s=
      $("boss-screen");

    if(
      !s||
      !currentPlayer
    ){
      return;
    }

    c=
      document.createElement(
        "div"
      );

    c.id=
      "boss-auto-container";

    s.appendChild(c);
  }

  const b=
    getBossData();

  if(!b)return;

  c.innerHTML=`
    <section class="rpg-boss-panel">

      <h2>
        ☠️ ${
          b.defeated
            ?"討伐完了"
            :"WORLD BOSS"
        }
      </h2>

      <p>
        LEVEL ${b.level||1}
      </p>

      <div>
        HP
        ${b.hp.toLocaleString()}
        /
        ${b.maxHp.toLocaleString()}
      </div>

      <div class="boss-hp-bar">

        <div
          class="boss-hp-fill"
          style="width:${Math.max(0,b.hp/b.maxHp*100)}%"
        ></div>

      </div>

      <p>
        弱点：
        <strong>
          ${escapeHtml(
            getSubjectName(
              b.weaknessSubject||"不明"
            )
          )}
        </strong>
      </p>

      <p>
        自分の総貢献：
        ${Number(
          currentPlayer.boss?.contribution||0
        ).toLocaleString()}
      </p>

      <small>
        勉強記録時に自動でダメージを与えます。
      </small>

    </section>
  `;
}

function renderPartyUI(){
  let c=
    $("party-auto-container");

  if(!c){
    const s=
      $("party-screen");

    if(
      !s||
      !currentPlayer
    ){
      return;
    }

    c=
      document.createElement(
        "div"
      );

    c.id=
      "party-auto-container";

    s.appendChild(c);
  }

  c.innerHTML=`
    <section>

      <h2>
        👥 PARTY
      </h2>

      <p>
        最大4人の受験者で挑む。
      </p>

      <p>
        パーティID：
        ${escapeHtml(
          currentPlayer.partyId||
          "未参加"
        )}
      </p>

      <p>
        役割：
        ${escapeHtml(
          currentPlayer.partyRole||
          "なし"
        )}
      </p>

      <div class="party-members">

        ${
          (
            currentPlayer.partyMembers||
            []
          )
            .slice(0,4)
            .map(
              x=>
                `<div>${escapeHtml(x.displayName||x.userId||"プレイヤー")}</div>`
            )
            .join("")
        }

      </div>

    </section>
  `;
}

function renderAllAutoUI(){
  renderQuestUI();
  renderRankProgress();
  renderTitleUI();
  renderShopUI();
  renderAchievementUI();
  renderBossUI();
  renderPartyUI();
}


// ============================================================
// Player UI
// ============================================================

function updatePlayerUI(){
  if(!currentPlayer)return;

  const p=
    getLevelProgress(
      currentPlayer.xp
    );

  setText(
    "player-name",
    currentPlayer.displayName
  );

  setText(
    "display-name",
    currentPlayer.displayName
  );

  setText(
    "current-title",
    currentPlayer.title
  );

  setText(
    "player-level",
    `Lv.${currentPlayer.level}`
  );

  setText(
    "level",
    currentPlayer.level
  );

  setText(
    "xp",
    currentPlayer.xp
  );

  setText(
    "xp-value",
    currentPlayer.xp
  );

  setText(
    "xp-current",
    p.current
  );

  setText(
    "xp-required",
    p.required
  );

  setText(
    "coins",
    currentPlayer.coins
  );

  setText(
    "coin-count",
    currentPlayer.coins
  );

  setText(
    "total-study-time",
    formatMinutes(
      currentPlayer.totalStudyMinutes
    )
  );

  setText(
    "today-study-time",
    formatMinutes(
      currentPlayer.todayStudyMinutes
    )
  );

  setText(
    "current-rank",
    currentPlayer.rank
  );

  setText(
    "rank-name",
    currentPlayer.rank
  );

  setText(
    "rank-study-time",
    formatMinutes(
      currentPlayer.seasonStudyMinutes
    )
  );

  const bars=[
    "xp-progress-fill",
    "level-progress-fill"
  ];

  for(
    const id of bars
  ){
    const e=$(id);

    if(e){
      e.style.width=
        `${p.percent}%`;
    }
  }
}


// ============================================================
// Notifications / Effects
// ============================================================

function showNotification(msg){
  let c=
    $("notification-container");

  if(!c){
    c=
      document.createElement(
        "div"
      );

    c.id=
      "notification-container";

    document.body.appendChild(c);
  }

  const n=
    document.createElement(
      "div"
    );

  n.className=
    "rpg-notification";

  n.textContent=msg;

  c.appendChild(n);

  setTimeout(
    ()=>n.remove(),
    4000
  );
}

function effect(
  msg,
  cls="rpg-effect"
){
  let e=
    document.createElement(
      "div"
    );

  e.className=cls;

  e.textContent=msg;

  document.body.appendChild(e);

  setTimeout(
    ()=>e.remove(),
    1800
  );
}

function showLevelUpEffect(a,b){
  effect(
    `⚡ LEVEL UP! Lv.${a} → Lv.${b}`,
    "level-up-effect"
  );
}

function showTitleUnlockEffect(t){
  effect(
    `🏷️ NEW TITLE「${t.name}」`
  );
}

function showAchievementEffect(a){
  effect(
    `🏆 ACHIEVEMENT「${a.title}」`
  );
}

function showBossDefeatEffect(){
  effect(
    "☠️ WORLD BOSS DEFEATED!",
    "boss-defeat-effect"
  );
}


// ============================================================
// Study Record
// ============================================================

async function recordStudy(
  minutes,
  subject,
  date=getJapanDateString(),
  source="manual"
){
  if(
    !currentPlayer||
    studyRecordBusy
  ){
    return false;
  }

  minutes=
    Math.max(
      0,
      Math.floor(
        Number(minutes)||0
      )
    );

  if(minutes<=0)return false;

  studyRecordBusy=true;

  try{
    const oldLevel=
      currentPlayer.level;

    const oldRank=
      currentPlayer.rank;

    normalizeDailyData(
      currentPlayer
    );

    if(
      !currentPlayer.subjects.includes(
        subject
      )
    ){
      currentPlayer.subjects.push(
        subject
      );
    }

    currentPlayer.totalStudyMinutes+=
      minutes;

    if(
      date===getJapanDateString()
    ){
      currentPlayer.todayStudyMinutes+=
        minutes;
    }

    currentPlayer.seasonStudyMinutes+=
      minutes;

    currentPlayer.subjectStudyMinutes[subject]=
      (
        currentPlayer
          .subjectStudyMinutes[subject]||
        0
      )+
      minutes;

    currentPlayer.subjectLevels[subject]=
      Math.min(
        100,
        Math.floor(
          currentPlayer
            .subjectStudyMinutes[subject]/
          30
        )
      );

    const xp=
      Math.floor(
        minutes*
        getXpMultiplier()
      );

    currentPlayer.xp+=xp;

    currentPlayer.level=
      calculateLevel(
        currentPlayer.xp
      );

    currentPlayer.todayXp+=xp;

    currentPlayer.todayCoins+=
      Math.floor(
        minutes/10
      );

    currentPlayer.coins+=
      Math.floor(
        minutes/10
      );

    currentPlayer.studyHistory.unshift({
      date,
      subject,
      minutes,
      xp,
      source,
      createdAt:
        new Date().toISOString()
    });

    currentPlayer.studyHistory=
      currentPlayer.studyHistory
        .slice(0,200);

    const completed=
      updateQuestProgress(
        subject,
        minutes,
        date
      );

    for(
      const q of completed
    ){
      showNotification(
        `⚔️ ${q.title}達成！報酬を受け取ろう！`
      );
    }

    await applyBossDamage(
      minutes,
      subject
    );

    normalizeSeasonData(
      currentPlayer
    );

    await savePlayer();

    if(
      currentPlayer.level>
      oldLevel
    ){
      showLevelUpEffect(
        oldLevel,
        currentPlayer.level
      );
    }

    if(
      currentPlayer.rank!==oldRank
    ){
      effect(
        `🏆 RANK UP! ${oldRank} → ${currentPlayer.rank}`,
        "rank-up-effect"
      );
    }

    await checkAchievements();

    updatePlayerUI();
    renderAllAutoUI();

    showNotification(
      `📚 ${getSubjectName(subject)} +${minutes}分 / +${xp} XP`
    );

    return true;

  }catch(e){
    showNotification(
      firebaseErrorMessage(e)
    );

    return false;

  }finally{
    studyRecordBusy=false;
  }
}


// ============================================================
// Timer
// ============================================================

function timerElapsedSeconds(){
  if(
    !timerState.running||
    !timerState.segmentStartedAt
  ){
    return Math.floor(
      timerState.accumulatedSeconds
    );
  }

  return(
    timerState.accumulatedSeconds+
    Math.max(
      0,
      (
        Date.now()-
        timerState.segmentStartedAt
      )/1000
    )
  );
}

function updateTimerUI(){
  const sec=
    Math.floor(
      timerElapsedSeconds()
    );

  const h=
    Math.floor(
      sec/3600
    );

  const m=
    Math.floor(
      sec%3600/60
    );

  const s=
    sec%60;

  const value=
    `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

  setText(
    "study-timer",
    value
  );

  setText(
    "timer-display",
    value
  );
}

function startTimer(subject){
  if(timerState.running)return;

  if(!subject){
    showNotification(
      "教科を選択してください。"
    );

    return;
  }

  timerState.running=true;

  timerState.startedAt=
    Date.now();

  timerState.segmentStartedAt=
    Date.now();

  timerState.segmentJapanDate=
    getJapanDateString();

  timerState.lastJapanDate=
    timerState.segmentJapanDate;

  timerState.subject=
    subject;

  if(!timerInterval){
    timerInterval=
      setInterval(
        checkTimerTick,
        1000
      );
  }

  updateTimerUI();

  showNotification(
    "⏱️ 勉強タイマー開始！"
  );
}

async function stopTimer(){
  if(!timerState.running)return;

  await finalizeTimerSegment();

  timerState.running=false;
  timerState.startedAt=null;
  timerState.accumulatedSeconds=0;
  timerState.segmentStartedAt=null;
  timerState.subject=null;

  updateTimerUI();

  showNotification(
    "⏹️ タイマー停止！"
  );
}

async function finalizeTimerSegment(){
  if(
    !timerState.segmentStartedAt||
    !timerState.subject
  ){
    return;
  }

  const sec=
    Math.floor(
      (
        Date.now()-
        timerState.segmentStartedAt
      )/1000
    );

  const min=
    Math.floor(
      sec/60
    );

  if(min>0){
    const d=
      timerState.segmentJapanDate;

    await recordStudy(
      min,
      timerState.subject,
      d,
      "timer"
    );
  }

  timerState.accumulatedSeconds=0;

  timerState.segmentStartedAt=
    Date.now();

  timerState.segmentJapanDate=
    getJapanDateString();
}

async function checkTimerTick(){
  if(!timerState.running)return;

  const today=
    getJapanDateString();

  if(
    today!==timerState.segmentJapanDate&&
    !timerState.midnightBusy
  ){
    timerState.midnightBusy=true;

    try{
      await finalizeTimerSegment();
    }finally{
      timerState.midnightBusy=false;
    }
  }

  updateTimerUI();
}


// ============================================================
// Runtime Style
// ============================================================

function injectRuntimeStyle(){
  if(
    $("rpg-runtime-style")
  ){
    return;
  }

  const s=
    document.createElement(
      "style"
    );

  s.id=
    "rpg-runtime-style";

  s.textContent=`
    .rpg-notification,
    .rpg-effect{
      position:fixed;
      z-index:99999;
      left:50%;
      top:18%;
      transform:translate(-50%,-20px);
      opacity:0;
      animation:rpgPop .35s ease forwards;
    }

    .rpg-notification{
      padding:12px 18px;
      border-radius:12px;
      background:var(--bg-card,#121520);
      box-shadow:0 8px 30px #0004;
    }

    .rpg-effect{
      font-size:clamp(20px,4vw,42px);
      font-weight:900;
      pointer-events:none;
      text-align:center;
    }

    .level-up-effect,
    .rank-up-effect,
    .boss-defeat-effect{
      animation:rpgFlash 1.8s ease forwards;
    }

    @keyframes rpgPop{
      to{
        opacity:1;
        transform:translate(-50%,0);
      }
    }

    @keyframes rpgFlash{
      0%{
        opacity:0;
        transform:translate(-50%,-20px) scale(.7);
      }

      15%{
        opacity:1;
        transform:translate(-50%,0) scale(1.05);
      }

      75%{
        opacity:1;
      }

      100%{
        opacity:0;
        transform:translate(-50%,-20px) scale(1);
      }
    }

    body.rpg-page-transition{
      opacity:0;
      transform:translateY(8px);
      transition:
        opacity .18s ease,
        transform .18s ease;
    }

    body.rpg-page-ready{
      opacity:1;
      transform:none;
    }

    .quest-progress-bar,
    .rank-progress-bar,
    .boss-hp-bar{
      overflow:hidden;
    }

    .quest-progress-fill,
    .rank-progress-fill,
    .boss-hp-fill{
      transition:width .35s ease;
    }
  `;

  document.head.appendChild(s);

  document.body.classList.add(
    "rpg-page-transition"
  );

  requestAnimationFrame(
    ()=>document.body.classList.add(
      "rpg-page-ready"
    )
  );
}


// ============================================================
// Navigation
// ============================================================

function bindNavigation(){
  document.addEventListener(
    "click",
    e=>{
      const b=
        e.target.closest(
          "[data-screen]"
        );

      if(!b)return;

      const id=
        b.dataset.screen;

      document
        .querySelectorAll(
          "[id$='-screen'],.screen"
        )
        .forEach(
          x=>{
            if(x.id===id){
              x.style.display="";
            }else if(
              x.id&&
              x.id.endsWith(
                "-screen"
              )
            ){
              x.style.display="none";
            }
          }
        );

      document.body.classList.remove(
        "rpg-page-ready"
      );

      document.body.classList.add(
        "rpg-page-transition"
      );

      requestAnimationFrame(
        ()=>document.body.classList.add(
          "rpg-page-ready"
        )
      );

      renderAllAutoUI();
    }
  );
}


// ============================================================
// Auth
// ============================================================

function bindAuth(){
  const login=
    $("login-form");

  const signup=
    $("signup-form");

  if(
    login&&
    !login.dataset.init
  ){
    login.dataset.init="1";

    login.addEventListener(
      "submit",
      async e=>{
        e.preventDefault();

        try{
          const id=
            normalizeUserId(
              $("login-user-id")?.value||
              $("login-user")?.value
            );

          const pw=
            $("login-password")?.value||
            "";

          await signInWithEmailAndPassword(
            auth,
            userIdToEmail(id),
            pw
          );

        }catch(err){
          showError(
            "login-error",
            firebaseErrorMessage(err)
          );
        }
      }
    );
  }

  if(
    signup&&
    !signup.dataset.init
  ){
    signup.dataset.init="1";

    signup.addEventListener(
      "submit",
      async e=>{
        e.preventDefault();

        try{
          const id=
            normalizeUserId(
              $("signup-user-id")?.value||
              $("signup-user")?.value
            );

          const pw=
            $("signup-password")?.value||
            "";

          const user=
            (
              await createUserWithEmailAndPassword(
                auth,
                userIdToEmail(id),
                pw
              )
            ).user;

          currentPlayer=
            await createPlayer(
              user,
              {
                displayName:id
              }
            );

          updatePlayerUI();

        }catch(err){
          showError(
            "signup-error",
            firebaseErrorMessage(err)
          );
        }
      }
    );
  }

  document
    .querySelectorAll(
      "[data-logout]"
    )
    .forEach(
      b=>
        b.addEventListener(
          "click",
          ()=>signOut(auth)
        )
    );
}


// ============================================================
// Study Bindings
// ============================================================

function bindStudy(){
  document.addEventListener(
    "click",
    async e=>{
      const b=
        e.target.closest(
          "[data-record-study]"
        );

      if(b){
        const minutes=
          Number(
            b.dataset.minutes||0
          );

        const subject=
          b.dataset.subject||
          $("study-subject")?.value;

        await recordStudy(
          minutes,
          subject
        );
      }

      const st=
        e.target.closest(
          "[data-timer-start]"
        );

      if(st){
        startTimer(
          st.dataset.subject||
          $("study-subject")?.value
        );
      }

      const sp=
        e.target.closest(
          "[data-timer-stop]"
        );

      if(sp){
        await stopTimer();
      }
    }
  );

  const form=
    $("study-record-form");

  if(
    form&&
    !form.dataset.init
  ){
    form.dataset.init="1";

    form.addEventListener(
      "submit",
      async e=>{
        e.preventDefault();

        const m=
          Number(
            $("study-minutes")?.value||
            0
          );

        const s=
          $("study-subject")?.value;

        if(
          m>0&&
          s
        ){
          await recordStudy(
            m,
            s
          );
        }
      }
    );
  }
}


// ============================================================
// Boot
// ============================================================

async function boot(){
  if(booted)return;

  booted=true;

  injectRuntimeStyle();

  bindNavigation();
  bindStudy();
  bindAuth();

  if(
    !await initializeFirebase()
  ){
    return;
  }

  if(
    !authObserverStarted
  ){
    authObserverStarted=true;

    onAuthStateChanged(
      auth,
      async user=>{
        currentUser=user;

        if(!user){
          currentPlayer=null;

          hideElement(
            "app-screen"
          );

          showElement(
            "auth-screen"
          );

          return;
        }

        try{
          currentPlayer=
            await loadPlayer(
              user
            );

          if(!currentPlayer){
            currentPlayer=
              await createPlayer(
                user
              );
          }

          normalizeDailyData(
            currentPlayer
          );

          normalizeSeasonData(
            currentPlayer
          );

          ensureQuestState(
            currentPlayer
          );

          await processLoginStreak();

          await checkAchievements();

          showElement(
            "app-screen"
          );

          hideElement(
            "auth-screen"
          );

          updatePlayerUI();

          renderAllAutoUI();

        }catch(e){
          console.error(e);

          showNotification(
            firebaseErrorMessage(e)
          );
        }
      }
    );
  }
}


if(
  document.readyState==="loading"
){
  document.addEventListener(
    "DOMContentLoaded",
    boot
  );
}else{
  boot();
}


// ============================================================
// Existing HTML onclick compatibility
// ============================================================

window.RPG={
  recordStudy,
  startTimer,
  stopTimer,
  claimQuestReward,
  equipTitle,
  purchaseShopItem,
  renderAllAutoUI,

  signOut:
    ()=>auth&&signOut(auth),

  getPlayer:
    ()=>currentPlayer
};
