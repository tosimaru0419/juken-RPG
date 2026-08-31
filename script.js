/* ========================================
⚔️ 受験RPG — JavaScript
COMPLETE EDITION
LocalStorage + Subject System + Boss Battle
======================================== */

const STORAGE_KEY = “juken_rpg_complete_v2”;

/* ========================================
GAME DATA
======================================== */

const RANKS = [
{ name:“BRONZE”, icon:“🥉”, min:0 },
{ name:“SILVER”, icon:“🥈”, min:10 * 60 },
{ name:“GOLD”, icon:“🥇”, min:25 * 60 },
{ name:“PLATINUM”, icon:“💎”, min:50 * 60 },
{ name:“DIAMOND”, icon:“💠”, min:80 * 60 },
{ name:“MASTER”, icon:“👑”, min:110 * 60 },
{ name:“GRANDMASTER”, icon:“⚔️”, min:140 * 60 },
{ name:“LEGEND”, icon:“🌌”, min:170 * 60 }
];

const TITLES = [
{id:“title_novice”,name:“駆け出しの冒険者”,price:0},
{id:“title_night”,name:“夜を越えし者”,price:50},
{id:“title_silent”,name:“静かなる研鑽者”,price:100},
{id:“title_knowledge”,name:“知識を喰らう者”,price:300},
{id:“title_limit”,name:“限界突破の片鱗”,price:500},
{id:“title_sleep”,name:“眠気殺し”,price:750},
{id:“title_solo”,name:“孤高の受験戦士”,price:1000},
{id:“title_twilight”,name:“黄昏の求道者”,price:1500},
{id:“title_book”,name:“禁断の参考書”,price:2000},
{id:“title_truth”,name:“万象を解き明かす者”,price:3000},
{id:“title_outside”,name:“理の外側に立つ者”,price:5000},
{id:“title_last”,name:“最後まで立っていた者”,price:7500},
{id:“title_fate”,name:“運命に抗う者”,price:10000},
{id:“title_destiny”,name:“天命を喰らう者”,price:15000},
{id:“title_unexplored”,name:“未踏の領域”,price:25000},
{id:“title_battlefield”,name:“受験という名の戦場”,price:50000},
{id:“title_beyond”,name:“合格の向こう側”,price:100000}
];

const ITEMS = [
{
id:“item_drop”,
name:“🧃 集中の雫”,
description:“30分間 XP ×1.2”,
price:100,
type:“multiplier”,
multiplier:1.2,
duration:3060
},
{
id:“item_fire”,
name:“🔥 闘志の火種”,
description:“今日の目標達成で +50 XP”,
price:150,
type:“goal”,
bonus:50
},
{
id:“item_scroll”,
name:“📜 研鑽の巻物”,
description:“60分間 XP ×1.3”,
price:300,
type:“multiplier”,
multiplier:1.3,
duration:6060
},
{
id:“item_feather”,
name:“⚡ 瞬刻の羽根”,
description:“30分間 XP ×1.5”,
price:500,
type:“multiplier”,
multiplier:1.5,
duration:30*60
},
{
id:“item_crystal”,
name:“🔮 未来視の水晶”,
description:“目標達成で +100 XP”,
price:750,
type:“goal”,
bonus:100
},
{
id:“item_experience”,
name:“💎 経験の結晶”,
description:“次のセッション終了時 +100 XP”,
price:1000,
type:“session”,
bonus:100
},
{
id:“item_crown”,
name:“👑 王者の勲章”,
description:“目標達成で +200 XP”,
price:3000,
type:“goal”,
bonus:200
}
];

const THEMES = [
{id:“theme_blue”,name:“🔵 蒼天”,price:0,color:”#2563eb”,light:”#eff6ff”,dark:”#1d4ed8”},
{id:“theme_red”,name:“🔴 紅蓮”,price:100,color:”#dc2626”,light:”#fef2f2”,dark:”#b91c1c”},
{id:“theme_green”,name:“🟢 深森”,price:100,color:”#16a34a”,light:”#f0fdf4”,dark:”#15803d”},
{id:“theme_purple”,name:“🟣 夜紫”,price:250,color:”#7c3aed”,light:”#f5f3ff”,dark:”#6d28d9”},
{id:“theme_gold”,name:“🟡 黄金”,price:500,color:”#ca8a04”,light:”#fefce8”,dark:”#a16207”},
{id:“theme_black”,name:“⚫ 漆黒”,price:1000,color:”#111827”,light:”#f3f4f6”,dark:”#030712”},
{id:“theme_silver”,name:“⚪ 白銀”,price:1500,color:”#64748b”,light:”#f1f5f9”,dark:”#475569”},
{id:“theme_void”,name:“🌌 深淵”,price:3000,color:”#312e81”,light:”#eef2ff”,dark:”#1e1b4b”}
];

const BACKGROUNDS = [
{id:“bg_default”,name:“☁️ 白紙”,price:0,value:“default”},
{id:“bg_night”,name:“🌃 夜空”,price:500,value:“night”},
{id:“bg_library”,name:“📚 古書庫”,price:1000,value:“library”},
{id:“bg_magic”,name:“🏰 魔導書庫”,price:2500,value:“magic”},
{id:“bg_moon”,name:“🌙 月下の塔”,price:5000,value:“moon”},
{id:“bg_battle”,name:“⚔️ 最終決戦”,price:10000,value:“battle”},
{id:“bg_stars”,name:“🌌 星の彼方”,price:25000,value:“stars”}
];

const AVATARS = [
{id:“avatar_sword”,name:“⚔️ 剣士”,price:0,value:“⚔️”},
{id:“avatar_magic”,name:“🧙 魔術師”,price:300,value:“🧙”},
{id:“avatar_archer”,name:“🏹 狩人”,price:300,value:“🏹”},
{id:“avatar_knight”,name:“🛡️ 騎士”,price:500,value:“🛡️”},
{id:“avatar_sage”,name:“📖 賢者”,price:1000,value:“📖”},
{id:“avatar_king”,name:“👑 王者”,price:3000,value:“👑”}
];

/* ========================================
SUBJECT SYSTEM
======================================== */

const SUBJECTS = {
common: [
{id:“数学”,name:“数学”,icon:“📐”},
{id:“英語”,name:“英語”,icon:“🔤”},
{id:“国語”,name:“国語”,icon:“📖”}
],

science: [
{id:“物理”,name:“物理”,icon:“⚡”},
{id:“化学”,name:“化学”,icon:“🧪”},
{id:“生物”,name:“生物”,icon:“🧬”}
],

humanities: [
{id:“地理”,name:“地理”,icon:“🌍”},
{id:“日本史”,name:“日本史”,icon:“🏯”},
{id:“世界史”,name:“世界史”,icon:“🌐”},
{id:“政治経済”,name:“政経”,icon:“🏛️”}
]
};

function getAvailableSubjects() {

const subjects = […SUBJECTS.common];

if (data.track === “理系”) {
subjects.push(…SUBJECTS.science);
} else {
subjects.push(…SUBJECTS.humanities);
}

return subjects;
}

function getSubjectInfo(subject) {

return getAvailableSubjects()
.find(s => s.id === subject);
}

/*
★ 重要

ボス弱点候補もここを使う。

したがって、

理系 → 数学・英語・国語・物理・化学・生物
文系 → 数学・英語・国語・地理・日本史・世界史・政治経済

となり、他コースの固有科目は絶対に出ない。
*/

function getBossWeaknessPool() {

return getAvailableSubjects()
.map(subject => subject.id);
}

/* ========================================
DAILY QUEST
======================================== */

const DAILY_QUESTS = [
{
id:“q10”,
icon:“📖”,
name:“新人冒険者の第一歩”,
description:“10分勉強する”,
minutes:10,
xp:10,
coins:20
},
{
id:“q30”,
icon:“🔥”,
name:“集中の証”,
description:“30分勉強する”,
minutes:30,
xp:30,
coins:40
},
{
id:“q60”,
icon:“⚔️”,
name:“今日も戦う者”,
description:“60分勉強する”,
minutes:60,
xp:60,
coins:80
},
{
id:“q120”,
icon:“🌙”,
name:“夜を越える者”,
description:“120分勉強する”,
minutes:120,
xp:100,
coins:150
}
];

/* ========================================
ACHIEVEMENTS
======================================== */

const ACHIEVEMENTS = [
{
id:“first”,
icon:“🌱”,
name:“冒険の始まり”,
description:“初めて勉強する”,
check:d => d.totalMinutes >= 1
},
{
id:“ten”,
icon:“📚”,
name:“最初の10分”,
description:“累計10分勉強する”,
check:d => d.totalMinutes >= 10
},
{
id:“hour”,
icon:“🔥”,
name:“一時間の壁”,
description:“累計1時間勉強する”,
check:d => d.totalMinutes >= 60
},
{
id:“ten_hours”,
icon:“⚔️”,
name:“研鑽の道”,
description:“累計10時間勉強する”,
check:d => d.totalMinutes >= 600
},
{
id:“hundred_hours”,
icon:“💎”,
name:“百時間の領域”,
description:“累計100時間勉強する”,
check:d => d.totalMinutes >= 6000
},
{
id:“level10”,
icon:“⬆️”,
name:“成長の証”,
description:“Lv.10に到達する”,
check:d => d.level >= 10
},
{
id:“level50”,
icon:“🌌”,
name:“未踏への挑戦”,
description:“Lv.50に到達する”,
check:d => d.level >= 50
},
{
id:“boss_first”,
icon:“👹”,
name:“初めての討伐”,
description:“ボスを1体撃破する”,
check:d => d.bossesDefeated >= 1
},
{
id:“boss_5”,
icon:“⚔️”,
name:“歴戦の冒険者”,
description:“ボスを5体撃破する”,
check:d => d.bossesDefeated >= 5
},
{
id:“boss_10”,
icon:“👑”,
name:“受験戦争の覇者”,
description:“ボスを10体撃破する”,
check:d => d.bossesDefeated >= 10
}
];

/* ========================================
DEFAULT DATA
======================================== */

function createDefaultData() {

return {

registered:false,
name:"",
track:"理系",
subject:"数学",
subjects:["数学","英語","国語"],
subjectMinutes:{},
level:1,
xp:0,
totalXP:0,
stars:0,
coins:0,
totalMinutes:0,
todayMinutes:0,
monthMinutes:0,
monthKey:getMonthKey(),
todayKey:getTodayKey(),
dailyGoal:60,
claimedQuests:[],
ownedTitles:["title_novice"],
equippedTitle:"title_novice",
ownedItems:[],
activeBuff:null,
equippedTheme:"theme_blue",
ownedThemes:["theme_blue"],
equippedBackground:"bg_default",
ownedBackgrounds:["bg_default"],
equippedAvatar:"avatar_sword",
ownedAvatars:["avatar_sword"],
achievements:[],
/*
  ==============================
  BOSS SYSTEM
  ==============================
*/
boss:{
  id:0,
  name:"未知なる受験の魔王",
  icon:"👹",
  description:"勉強で力を蓄え、仲間と共に挑め。",
  weakness:"",
  maxHP:1000,
  hp:1000,
  defeated:false
},
bossesDefeated:0,
bossBattleReady:false

};
}

let data = createDefaultData();

/* ========================================
TIMER
======================================== */

let timerInterval = null;
let timerStart = null;

let selectedSubject = “”;

/* ========================================
INITIALIZE
======================================== */

document.addEventListener(“DOMContentLoaded”, () => {

loadData();

migrateData();

setupNavigation();
setupRegistration();
setupTimer();
setupSubjects();
setupManualReport();
setupGoal();
setupShopTabs();
setupLevelUpModal();
setupMessageModal();
setupBattle();

checkDateReset();

applyTheme();
updateSeason();

if (data.registered) {
showMain();
} else {
showRegister();
}

updateAll();

setInterval(() => {

checkDateReset();
updateBuff();
updateSeason();

},1000);

});

/* ========================================
MIGRATION
======================================== */

function migrateData() {

if (!data.subjectMinutes) {
data.subjectMinutes = {};
}

if (!data.subjects || !Array.isArray(data.subjects)) {
data.subjects = [];
}

if (typeof data.bossesDefeated !== “number”) {
data.bossesDefeated = 0;
}

if (!data.boss) {
data.boss = createBoss();
}

if (!data.bossBattleReady) {
data.bossBattleReady = false;
}

const available =
getAvailableSubjects();

available.forEach(subject => {

if (
  typeof data.subjectMinutes[subject.id] !== "number"
) {
  data.subjectMinutes[subject.id] = 0;
}

});

if (!data.subjects.length) {

data.subjects =
  available.map(s => s.id);

}

saveData();
}

/* ========================================
STORAGE
======================================== */

function saveData() {

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(data)
);
}

function loadData() {

const saved =
localStorage.getItem(STORAGE_KEY);

if (!saved) {
return;
}

try {

data = {
  ...createDefaultData(),
  ...JSON.parse(saved)
};

} catch(error) {

console.error(
  "セーブデータ読み込み失敗:",
  error
);
data = createDefaultData();

}
}

/* ========================================
DATE
======================================== */

function getTodayKey() {

const now = new Date();

return [
now.getFullYear(),
String(now.getMonth()+1).padStart(2,“0”),
String(now.getDate()).padStart(2,“0”)
].join(”-”);
}

function getMonthKey() {

const now = new Date();

return [
now.getFullYear(),
String(now.getMonth()+1).padStart(2,“0”)
].join(”-”);
}

function checkDateReset() {

const today = getTodayKey();
const month = getMonthKey();

if (data.todayKey !== today) {

data.todayKey = today;
data.todayMinutes = 0;
data.claimedQuests = [];
saveData();

}

if (data.monthKey !== month) {

data.monthKey = month;
data.monthMinutes = 0;
/*
  月が変わったら新シーズンボスを生成
*/
createNewBoss();
saveData();

}
}

/* ========================================
SEASON
======================================== */

function updateSeason() {

const end =
new Date(“2026-12-31T23:59:59”);

const now = new Date();

const diff =
end.getTime() - now.getTime();

const days =
Math.max(
0,
Math.ceil(diff / 86400000)
);

const element =
document.getElementById(“season-days”);

if (element) {
element.textContent = days;
}
}

/* ========================================
REGISTER
======================================== */

function setupRegistration() {

const button =
document.getElementById(“register-button”);

if (!button) {
return;
}

button.addEventListener(“click”,() => {

const name =
  document
    .getElementById("player-name")
    .value
    .trim();
const track =
  document
    .getElementById("player-track")
    .value;
const mainSubject =
  document
    .getElementById("player-subject")
    .value
    .trim();
if (!name) {
  showMessage(
    "⚠️",
    "名前が必要です",
    "プレイヤー名を入力してください。"
  );
  return;
}
data.registered = true;
data.name = name;
data.track = track;
const available =
  getAvailableSubjects();
/*
  メイン科目が入力されていれば採用。
  空欄なら数学を初期値にする。
*/
const validMain =
  available.some(
    subject =>
      subject.id === mainSubject
  );
data.subject =
  validMain
    ? mainSubject
    : available[0].id;
data.subjects =
  available.map(
    subject => subject.id
  );
selectedSubject =
  data.subject;
initializeSubjectMinutes();
/*
  新規登録時はコースに合わせた
  ボスを生成。
*/
createNewBoss();
saveData();
showMain();
updateAll();
showMessage(
  "⚔️",
  "冒険開始！",
  `${name}の受験RPGが始まった！\n\n` +
  `${track}コースで冒険を開始！`
);

});
}

function initializeSubjectMinutes() {

const available =
getAvailableSubjects();

available.forEach(subject => {

if (
  typeof data.subjectMinutes[subject.id] !== "number"
) {
  data.subjectMinutes[subject.id] = 0;
}

});
}

/* ========================================
SCREEN
======================================== */

function showRegister() {

document
.getElementById(“register-screen”)
.classList.remove(“hidden”);

document
.getElementById(“main-screen”)
.classList.add(“hidden”);
}

function showMain() {

document
.getElementById(“register-screen”)
.classList.add(“hidden”);

document
.getElementById(“main-screen”)
.classList.remove(“hidden”);

showPage(“home”);
}

/* ========================================
NAVIGATION
======================================== */

function setupNavigation() {

document
.querySelectorAll(”[data-page]”)
.forEach(button => {

  button.addEventListener("click",() => {
    showPage(button.dataset.page);
  });
});

}

function showPage(page) {

document
.querySelectorAll(”.page”)
.forEach(element => {

  element.classList.toggle(
    "active",
    element.id === `page-${page}`
  );
});

document
.querySelectorAll(”.nav-button”)
.forEach(button => {

  button.classList.toggle(
    "active",
    button.dataset.page === page
  );
});

if (page === “battle”) {
renderBattle();
}

if (page === “study”) {
renderSubjectButtons();
}
}

/* ========================================
SUBJECT UI
======================================== */

function setupSubjects() {

renderSubjectButtons();

}

function renderSubjectButtons() {

const grid =
document.querySelector(”.subject-grid”);

if (!grid) {
return;
}

grid.innerHTML = “”;

const available =
getAvailableSubjects();

available.forEach(subject => {

const button =
  document.createElement("button");
button.className =
  "subject-button";
if (
  selectedSubject === subject.id
) {
  button.classList.add("selected");
}
button.dataset.subject =
  subject.id;
button.innerHTML =
  `<span>${subject.icon}</span>${subject.name}`;
button.addEventListener(
  "click",
  () => {
    selectedSubject =
      subject.id;
    data.subject =
      subject.id;
    renderSubjectButtons();
    updateStudy();
    saveData();
  }
);
grid.appendChild(button);

});

/*
選択科目情報を追加
*/

renderSubjectStats();
}

function renderSubjectStats() {

let container =
document.getElementById(
“subject-stats”
);

if (!container) {

container =
  document.createElement("div");
container.id =
  "subject-stats";
container.className =
  "card subject-stats-card";
const grid =
  document.querySelector(".subject-grid");
if (grid) {
  grid.parentNode.insertBefore(
    container,
    grid.nextSibling
  );
}

}

if (!container) {
return;
}

const available =
getAvailableSubjects();

container.innerHTML = `
SUBJECT POWER
科目別ステータス
<div class="subject-stat-list">
  ${available.map(subject => {
    const minutes =
      data.subjectMinutes[subject.id] || 0;
    return `
      <div class="subject-stat-row">
        <span>
          ${subject.icon}
          ${subject.name}
        </span>
        <strong>
          ${formatMinutes(minutes)}
        </strong>
      </div>
    `;
  }).join("")}
</div>

`;

}

/* ========================================
TIMER
======================================== */

function setupTimer() {

const start =
document.getElementById(“timer-start”);

const stop =
document.getElementById(“timer-stop”);

if (start) {
start.addEventListener(
“click”,
startTimer
);
}

if (stop) {
stop.addEventListener(
“click”,
stopTimer
);
}
}

function startTimer() {

if (timerInterval) {
return;
}

if (!selectedSubject) {

selectedSubject =
  data.subject ||
  getAvailableSubjects()[0].id;

}

timerStart =
Date.now();

timerInterval =
setInterval(
updateTimerDisplay,
1000
);

document
.getElementById(“timer-status”)
.textContent =
“🔥 勉強中”;

document
.getElementById(“timer-start”)
.textContent =
“⏳ 勉強中”;
}

function stopTimer() {

if (
!timerInterval ||
!timerStart
) {
return;
}

clearInterval(timerInterval);

timerInterval = null;

const seconds =
Math.floor(
(Date.now()-timerStart)/1000
);

const minutes =
Math.floor(seconds/60);

timerStart = null;

document
.getElementById(“timer-status”)
.textContent =
“記録完了”;

document
.getElementById(“timer-start”)
.textContent =
“▶ スタート”;

document
.getElementById(“timer-display”)
.textContent =
“00:00:00”;

if (minutes <= 0) {

showMessage(
  "⏱️",
  "記録されませんでした",
  "1分未満のセッションでした。"
);
return;

}

recordStudy(
minutes,
“timer”,
selectedSubject
);
}

function updateTimerDisplay() {

if (!timerStart) {
return;
}

const seconds =
Math.floor(
(Date.now()-timerStart)/1000
);

const hours =
Math.floor(seconds/3600);

const minutes =
Math.floor(
(seconds%3600)/60
);

const secs =
seconds%60;

document
.getElementById(“timer-display”)
.textContent =
${pad(hours)}:${pad(minutes)}:${pad(secs)};
}

function pad(number) {

return String(number)
.padStart(2,“0”);
}

/* ========================================
MANUAL REPORT
======================================== */

function setupManualReport() {

const button =
document.getElementById(
“manual-report-button”
);

if (!button) {
return;
}

button.addEventListener(
“click”,
() => {

  document
    .getElementById("report-modal")
    .classList.remove("hidden");
  populateReportSubjects();
}

);

document
.getElementById(“report-cancel”)
.addEventListener(
“click”,
closeReportModal
);

document
.getElementById(“report-submit”)
.addEventListener(
“click”,
submitManualReport
);
}

function populateReportSubjects() {

const select =
document.getElementById(
“report-subject”
);

if (!select) {
return;
}

select.innerHTML = “”;

getAvailableSubjects()
.forEach(subject => {

  const option =
    document.createElement("option");
  option.value =
    subject.id;
  option.textContent =
    `${subject.icon} ${subject.name}`;
  select.appendChild(option);
});

select.value =
selectedSubject ||
data.subject ||
getAvailableSubjects()[0].id;
}

function closeReportModal() {

document
.getElementById(“report-modal”)
.classList.add(“hidden”);
}

function submitManualReport() {

const hours =
Number(
document.getElementById(
“report-hours”
).value
);

const minutes =
Number(
document.getElementById(
“report-minutes”
).value
);

if (
!Number.isFinite(hours) ||
!Number.isFinite(minutes) ||
hours < 0 ||
minutes < 0 ||
minutes > 59
) {

showMessage(
  "⚠️",
  "入力エラー",
  "時間と分を正しく入力してください。"
);
return;

}

const totalMinutes =
Math.floor(
hours*60+minutes
);

if (totalMinutes <= 0) {

showMessage(
  "⚠️",
  "記録できません",
  "1分以上の勉強時間を入力してください。"
);
return;

}

selectedSubject =
document.getElementById(
“report-subject”
).value;

closeReportModal();

recordStudy(
totalMinutes,
“manual”,
selectedSubject
);
}

/* ========================================
RECORD STUDY
======================================== */

function recordStudy(
minutes,
source,
subject
) {

if (
!Number.isFinite(minutes) ||
minutes <= 0
) {
return;
}

minutes =
Math.floor(minutes);

subject =
subject ||
selectedSubject ||
data.subject ||
getAvailableSubjects()[0].id;

if (
!data.subjectMinutes[subject]
) {
data.subjectMinutes[subject] = 0;
}

data.subjectMinutes[subject] += minutes;

data.totalMinutes += minutes;
data.todayMinutes += minutes;
data.monthMinutes += minutes;

/* XP */

const earnedXP =
calculateBuffedXP(minutes);

data.totalXP += earnedXP;
data.xp += earnedXP;

/* Coins */

data.coins += minutes;

/* Session bonus */

const sessionBonus =
checkSessionBonus();

if (sessionBonus > 0) {

data.totalXP += sessionBonus;
data.xp += sessionBonus;

}

/* Goal bonus */

const goalResult =
handleGoalBuff();

/* Level */

let levelUps =
processLevelUps();

levelUps +=
goalResult.levelUps;

/* Achievements */

const newAchievements =
checkAchievements();

/*
★ 勉強後にボスステータス更新

実際の攻撃は「ボス戦開始」で行う。
勉強 = パーティー強化。

*/

saveData();

updateAll();

let message =
${subject}を${minutes}分勉強！\n +
+${earnedXP} XP\n +
+${minutes} 🪙;

if (sessionBonus > 0) {

message +=
  `\n💎 経験の結晶発動！ +${sessionBonus} XP`;

}

if (goalResult.bonus > 0) {

message +=
  `\n🔥 目標達成バフ！ +${goalResult.bonus} XP`;

}

if (newAchievements > 0) {

message +=
  `\n🏆 実績解除！ +${newAchievements*50} 🪙`;

}

if (source === “manual”) {

message +=
  "\n📝 事後報告として記録しました。";

}

if (levelUps > 0) {

message +=
  `\n\n⬆️ Lv.${data.level}に到達！`;
showMessage(
  "⬆️",
  "LEVEL UP!",
  message
);
setTimeout(
  showLevelUp,
  300
);
return;

}

showMessage(
“📚”,
“勉強記録完了”,
message
);
}

/* ========================================
XP
======================================== */

function xpRequired() {

return 100 +
Math.floor(data.level/10)*50;
}

function processLevelUps() {

let levelUps = 0;

while (
data.xp >= xpRequired() &&
data.level < 100
) {

data.xp -= xpRequired();
data.level++;
levelUps++;

}

if (data.level >= 100) {

data.level = 100;
data.xp =
  Math.min(
    data.xp,
    xpRequired()-1
  );

}

return levelUps;
}

/* ========================================
BUFF
======================================== */

function calculateBuffedXP(baseXP) {

const buff =
data.activeBuff;

if (!buff) {
return baseXP;
}

if (
buff.type !== “multiplier”
) {
return baseXP;
}

if (
Date.now() >= buff.expiresAt
) {

data.activeBuff = null;
return baseXP;

}

return Math.floor(
baseXP*buff.multiplier
);
}

function updateBuff() {

if (!data.activeBuff) {

updateBuffUI();
return;

}

if (
data.activeBuff.type === “multiplier” &&
Date.now() >= data.activeBuff.expiresAt
) {

data.activeBuff = null;
saveData();
updateAll();
return;

}

updateBuffUI();
}

function updateBuffUI() {

const homeBuff =
document.getElementById(
“home-buff”
);

const profileBuff =
document.getElementById(
“profile-buff”
);

if (!homeBuff || !profileBuff) {
return;
}

if (!data.activeBuff) {

homeBuff.classList.add("hidden");
profileBuff.textContent =
  "現在バフなし";
return;

}

const buff =
data.activeBuff;

let remaining = 0;

if (
buff.type === “multiplier”
) {

remaining =
  Math.max(
    0,
    Math.ceil(
      (buff.expiresAt-Date.now())/1000
    )
  );

}

const minutes =
Math.floor(remaining/60);

const seconds =
remaining%60;

const timeText =
${pad(minutes)}:${pad(seconds)};

homeBuff.classList.remove(
“hidden”
);

document
.getElementById(“buff-name”)
.textContent =
buff.name;

document
.getElementById(“buff-description”)
.textContent =
buff.description;

if (
buff.type === “multiplier”
) {

document
  .getElementById("buff-timer")
  .textContent =
  timeText;
profileBuff.textContent =
  `${buff.name} — ${buff.description} — 残り ${timeText}`;

} else {

document
  .getElementById("buff-timer")
  .textContent =
  "READY";
profileBuff.textContent =
  `${buff.name} — ${buff.description}`;

}
}

/* ========================================
GOAL BUFF
======================================== */

function handleGoalBuff() {

const result = {
bonus:0,
levelUps:0
};

if (!data.activeBuff) {
return result;
}

if (
data.activeBuff.type !== “goal”
) {
return result;
}

if (
data.todayMinutes <
data.dailyGoal
) {
return result;
}

const bonus =
data.activeBuff.bonus;

data.totalXP += bonus;
data.xp += bonus;

data.activeBuff = null;

result.bonus = bonus;

result.levelUps =
processLevelUps();

return result;
}

/* ========================================
SESSION BONUS
======================================== */

function checkSessionBonus() {

if (!data.activeBuff) {
return 0;
}

if (
data.activeBuff.type !== “session”
) {
return 0;
}

const bonus =
data.activeBuff.bonus;

data.activeBuff = null;

return bonus;
}

/* ========================================
BOSS SYSTEM
======================================== */

/*
コース内からのみ弱点を選ぶ。
*/

function randomBossWeakness() {

const pool =
getBossWeaknessPool();

if (!pool.length) {
return “数学”;
}

return pool[
Math.floor(
Math.random()*pool.length
)
];
}

function createBoss() {

const bossNumber =
data.bossesDefeated + 1;

/*
ボスが少しずつ強くなる。

初期1000HP
撃破数ごとに+250HP

*/

const maxHP =
1000 +
Math.max(
0,
bossNumber-1
)*250;

const bosses = [
{
name:“未知なる受験の魔王”,
icon:“👹”,
description:“受験の闇から現れた最初の強敵。”
},
{
name:“深淵の模試王”,
icon:“😈”,
description:“無数の問題を従える強敵。”
},
{
name:“絶望の共通テスト獣”,
icon:“🐉”,
description:“総合力が試される巨大な敵。”
},
{
name:“最終試練の魔神”,
icon:“👿”,
description:“すべての努力をぶつけろ。”
}
];

const template =
bosses[
Math.min(
Math.floor(
(bossNumber-1)/3
),
bosses.length-1
)
];

return {

id:Date.now(),
name:template.name,
icon:template.icon,
description:template.description,
weakness:
  randomBossWeakness(),
maxHP:maxHP,
hp:maxHP,
defeated:false

};
}

function createNewBoss() {

data.boss =
createBoss();

data.bossBattleReady =
true;

saveData();

renderBattle();
}

/*
★ 集団戦の攻撃力

科目の勉強時間が多いほど強くなる。

ただし、総勉強時間をそのまま攻撃力にはせず、
sqrtで緩やかに成長させる。
*/

function calculateSubjectPower(subject) {

const minutes =
data.subjectMinutes[subject] || 0;

return Math.floor(
10 +
Math.sqrt(minutes)*5
);
}

function calculatePartyPower() {

const available =
getAvailableSubjects();

return available.reduce(
(total,subject) =>
total+
calculateSubjectPower(subject.id),
0
);
}

function renderBattle() {

const boss =
data.boss ||
createBoss();

/*
Boss
*/

const icon =
document.getElementById(
“boss-icon”
);

const name =
document.getElementById(
“boss-name”
);

const description =
document.getElementById(
“boss-description”
);

const weakness =
document.getElementById(
“boss-weakness”
);

const hpText =
document.getElementById(
“boss-hp-text”
);

const hpFill =
document.getElementById(
“boss-hp-fill”
);

if (icon) {
icon.textContent =
boss.icon;
}

if (name) {
name.textContent =
boss.name;
}

if (description) {
description.textContent =
boss.description;
}

if (weakness) {

weakness.textContent =
  boss.weakness || "?";

}

if (hpText) {

hpText.textContent =
  `${boss.hp} / ${boss.maxHP}`;

}

if (hpFill) {

hpFill.style.width =
  `${Math.max(
    0,
    Math.min(
      100,
      boss.hp/boss.maxHP*100
    )
  )}%`;

}

/*
Party
*/

const party =
document.getElementById(
“party-list”
);

if (!party) {
return;
}

party.innerHTML = “”;

getAvailableSubjects()
.forEach(subject => {

  const power =
    calculateSubjectPower(
      subject.id
    );
  const minutes =
    data.subjectMinutes[
      subject.id
    ] || 0;
  const isWeak =
    boss.weakness === subject.id;
  const card =
    document.createElement("div");
  card.className =
    "party-member";
  card.innerHTML = `
    <div class="party-member-icon">
      ${subject.icon}
    </div>
    <div class="party-member-info">
      <strong>
        ${subject.name}
        ${isWeak ? " ⚡ WEAKNESS" : ""}
      </strong>
      <span>
        勉強時間：${formatMinutes(minutes)}
      </span>
      <span>
        攻撃力：${power}
      </span>
    </div>
  `;
  party.appendChild(card);
});

/*
Battle button
*/

const button =
document.getElementById(
“battle-start-button”
);

if (button) {

if (boss.defeated) {
  button.textContent =
    "✨ 新たなボスを召喚";
} else {
  button.textContent =
    "⚔️ ボス戦開始";
}

}

/*
Total power display
*/

let powerDisplay =
document.getElementById(
“party-total-power”
);

if (!powerDisplay) {

powerDisplay =
  document.createElement("div");
powerDisplay.id =
  "party-total-power";
powerDisplay.className =
  "card";
const partyList =
  document.getElementById(
    "party-list"
  );
if (partyList) {
  partyList.parentNode.insertBefore(
    powerDisplay,
    partyList
  );
}

}

if (powerDisplay) {

powerDisplay.innerHTML = `
  <strong>⚔️ パーティー総攻撃力</strong>
  <div style="font-size:1.6rem;font-weight:800;margin-top:6px">
    ${calculatePartyPower()}
  </div>
`;

}

}

/* ========================================
BATTLE ACTION
======================================== */

function setupBattle() {

const button =
document.getElementById(
“battle-start-button”
);

if (!button) {
return;
}

button.addEventListener(
“click”,
startBossBattle
);

}

function startBossBattle() {

if (!data.boss) {

createNewBoss();

}

const boss =
data.boss;

/*
すでに倒している場合
*/

if (boss.defeated) {

createNewBoss();
updateAll();
showMessage(
  "👹",
  "新たなボス出現！",
  `${data.boss.name}が現れた！\n\n` +
  `弱点：${data.boss.weakness}`
);
return;

}

const available =
getAvailableSubjects();

/*
パーティー総攻撃力
*/

let totalDamage = 0;

const attackLog = [];

available.forEach(subject => {

const basePower =
  calculateSubjectPower(
    subject.id
  );
const minutes =
  data.subjectMinutes[
    subject.id
  ] || 0;
if (minutes <= 0) {
  return;
}
/*
  通常攻撃
  勉強時間が多いほど強い。
*/
let damage =
  basePower;
/*
  ★ 弱点なら1.5倍
*/
if (
  boss.weakness === subject.id
) {
  damage =
    Math.floor(
      damage*1.5
    );
}
totalDamage +=
  damage;
attackLog.push(
  `${subject.icon} ${subject.name}：${damage}ダメージ` +
  (
    boss.weakness === subject.id
      ? " ⚡弱点"
      : ""
  )
);

});

/*
勉強ゼロの場合
*/

if (totalDamage <= 0) {

showMessage(
  "😵",
  "攻撃できない！",
  "まずは勉強してパーティーを強化しよう。"
);
return;

}

/*
HPを削る
*/

boss.hp =
Math.max(
0,
boss.hp-totalDamage
);

/*
撃破
*/

if (boss.hp <= 0) {

boss.hp = 0;
boss.defeated = true;
data.bossesDefeated++;
/*
  撃破報酬
  ボス番号が増えるほど少し増える。
*/
const xpReward =
  200 +
  data.bossesDefeated*50;
const coinReward =
  100 +
  data.bossesDefeated*25;
data.totalXP += xpReward;
data.xp += xpReward;
data.coins += coinReward;
const levelUps =
  processLevelUps();
const achievements =
  checkAchievements();
saveData();
updateAll();
let message =
  `👹 ${boss.name}を撃破した！\n\n` +
  `総ダメージ：${totalDamage}\n\n` +
  `✨ +${xpReward} XP\n` +
  `🪙 +${coinReward}`;
if (levelUps > 0) {
  message +=
    `\n\n⬆️ Lv.${data.level}に到達！`;
}
if (achievements > 0) {
  message +=
    `\n🏆 実績解除！`;
}
showMessage(
  "🏆",
  "BOSS DEFEATED!",
  message
);
if (levelUps > 0) {
  setTimeout(
    showLevelUp,
    300
  );
}
return;

}

/*
撃破できなかった場合
*/

saveData();
updateAll();

showMessage(
“⚔️”,
“パーティー攻撃！”,
${boss.name}に${totalDamage}ダメージ！\n\n +
attackLog.join(”\n”) +
\n\n残りHP：${boss.hp} / ${boss.maxHP}
);

}

/* ========================================
SHOP TABS
======================================== */

function setupShopTabs() {

document
.querySelectorAll(”.shop-tab”)
.forEach(button => {

  button.addEventListener(
    "click",
    () => {
      const tab =
        button.dataset.shopTab;
      document
        .querySelectorAll(".shop-tab")
        .forEach(btn =>
          btn.classList.remove("active")
        );
      document
        .querySelectorAll(".shop-panel")
        .forEach(panel =>
          panel.classList.remove("active")
        );
      button.classList.add("active");
      document
        .getElementById(
          `shop-${tab}`
        )
        .classList.add("active");
    }
  );
});

}

/* ========================================
SHOP RENDER
======================================== */

function renderShop() {

renderTitles();
renderItems();
renderThemes();
renderBackgrounds();
renderAvatars();

const shopCoins =
document.getElementById(
“shop-coins”
);

if (shopCoins) {

shopCoins.textContent =
  data.coins.toLocaleString();

}
}

/* ========================================
TITLE SHOP
======================================== */

function renderTitles() {

const grid =
document.getElementById(
“title-shop-grid”
);

if (!grid) {
return;
}

grid.innerHTML = “”;

TITLES.forEach(item => {

const owned =
  data.ownedTitles.includes(item.id);
const equipped =
  data.equippedTitle === item.id;
const button =
  document.createElement("button");
button.className =
  `shop-item-button ${
    owned ? "owned" : ""
  } ${
    equipped ? "equipped" : ""
  }`;
button.textContent =
  equipped
    ? "装備中"
    : owned
      ? "装備"
      : `${item.price.toLocaleString()} 🪙`;
const element =
  document.createElement("div");
element.className =
  "shop-item";
element.innerHTML = `
  <div>
    <div class="shop-item-name">
      ${item.name}
    </div>
    <div class="shop-item-description">
      称号
    </div>
  </div>
`;
element.appendChild(button);
button.addEventListener(
  "click",
  () => buyOrEquipTitle(item)
);
grid.appendChild(element);

});
}

function buyOrEquipTitle(item) {

if (
data.ownedTitles.includes(item.id)
) {

data.equippedTitle =
  item.id;
saveData();
updateAll();
showMessage(
  "🏷️",
  "称号変更",
  `「${item.name}」を装備した！`
);
return;

}

if (data.coins < item.price) {

showMessage(
  "🪙",
  "コイン不足",
  `必要：${item.price.toLocaleString()}コイン`
);
return;

}

data.coins -= item.price;

data.ownedTitles.push(item.id);
data.equippedTitle = item.id;

saveData();
updateAll();

showMessage(
“🏷️”,
“称号獲得！”,
「${item.name}」を手に入れた！
);
}

/* ========================================
ITEM SHOP
======================================== */

function renderItems() {

const grid =
document.getElementById(
“item-shop-grid”
);

if (!grid) {
return;
}

grid.innerHTML = “”;

ITEMS.forEach(item => {

const element =
  document.createElement("div");
element.className =
  "shop-item";
element.innerHTML = `
  <div>
    <div class="shop-item-name">
      ${item.name}
    </div>
    <div class="shop-item-description">
      ${item.description}
    </div>
  </div>
  <button class="shop-item-button">
    ${item.price.toLocaleString()} 🪙
  </button>
`;
element
  .querySelector("button")
  .addEventListener(
    "click",
    () => buyItem(item)
  );
grid.appendChild(element);

});
}

function buyItem(item) {

if (data.coins < item.price) {

showMessage(
  "🪙",
  "コイン不足",
  "コインが足りません。"
);
return;

}

if (
data.activeBuff &&
(
item.type === “multiplier” ||
item.type === “goal” ||
item.type === “session”
)
) {

showMessage(
  "⚡",
  "バフは1つまで",
  "現在のバフを使い切ってから使用してください。"
);
return;

}

data.coins -= item.price;

activateItem(item);

saveData();
updateAll();

showMessage(
“🎁”,
“アイテム使用！”,
${item.name}\n${item.description}
);
}

function activateItem(item) {

if (item.type === “multiplier”) {

data.activeBuff = {
  type:"multiplier",
  name:item.name,
  description:
    `XP ×${item.multiplier}`,
  multiplier:item.multiplier,
  expiresAt:
    Date.now()+
    item.duration*1000
};
return;

}

data.activeBuff = {

type:item.type,
name:item.name,
description:
  item.type === "goal"
    ? `目標達成で +${item.bonus} XP`
    : `次のセッション終了時 +${item.bonus} XP`,
bonus:item.bonus

};
}

/* ========================================
CUSTOMIZATION
======================================== */

function renderThemes() {

renderSimpleShop(
“theme-shop-grid”,
THEMES,
data.ownedThemes,
data.equippedTheme,
“使用中”,
buyOrEquipTheme
);
}

function renderBackgrounds() {

renderSimpleShop(
“background-shop-grid”,
BACKGROUNDS,
data.ownedBackgrounds,
data.equippedBackground,
“使用中”,
buyOrEquipBackground
);
}

function renderAvatars() {

renderSimpleShop(
“avatar-shop-grid”,
AVATARS,
data.ownedAvatars,
data.equippedAvatar,
“使用中”,
buyOrEquipAvatar
);
}

function renderSimpleShop(
gridId,
items,
ownedList,
equippedId,
equippedText,
handler
) {

const grid =
document.getElementById(gridId);

if (!grid) {
return;
}

grid.innerHTML = “”;

items.forEach(item => {

const owned =
  ownedList.includes(item.id);
const equipped =
  equippedId === item.id;
const element =
  document.createElement("div");
element.className =
  "shop-item";
element.innerHTML = `
  <div>
    <div class="shop-item-name">
      ${item.name}
    </div>
    <div class="shop-item-description">
      ${gridId.includes("avatar")
        ? "アバター"
        : gridId.includes("background")
          ? "背景テーマ"
          : "メインカラー"}
    </div>
  </div>
  <button
    class="shop-item-button
    ${owned ? "owned" : ""}
    ${equipped ? "equipped" : ""}">
    ${
      equipped
        ? equippedText
        : owned
          ? "使用"
          : `${item.price.toLocaleString()} 🪙`
    }
  </button>
`;
element
  .querySelector("button")
  .addEventListener(
    "click",
    () => handler(item)
  );
grid.appendChild(element);

});
}

function buyOrEquipTheme(item) {

if (data.ownedThemes.includes(item.id)) {

data.equippedTheme = item.id;
applyTheme();
saveData();
updateAll();
return;

}

if (data.coins < item.price) {

showMessage(
  "🪙",
  "コイン不足",
  "コインが足りません。"
);
return;

}

data.coins -= item.price;

data.ownedThemes.push(item.id);
data.equippedTheme = item.id;

applyTheme();
saveData();
updateAll();
}

function buyOrEquipBackground(item) {

if (
data.ownedBackgrounds.includes(item.id)
) {

data.equippedBackground =
  item.id;
applyBackground();
saveData();
updateAll();
return;

}

if (data.coins < item.price) {

showMessage(
  "🪙",
  "コイン不足",
  "コインが足りません。"
);
return;

}

data.coins -= item.price;

data.ownedBackgrounds.push(item.id);
data.equippedBackground = item.id;

applyBackground();
saveData();
updateAll();
}

function buyOrEquipAvatar(item) {

if (
data.ownedAvatars.includes(item.id)
) {

data.equippedAvatar =
  item.id;
saveData();
updateAll();
showMessage(
  "👤",
  "アバター変更",
  `${item.name}を装備した！`
);
return;

}

if (data.coins < item.price) {

showMessage(
  "🪙",
  "コイン不足",
  `必要：${item.price.toLocaleString()}コイン`
);
return;

}

data.coins -= item.price;

data.ownedAvatars.push(item.id);
data.equippedAvatar = item.id;

saveData();
updateAll();

showMessage(
“👤”,
“アバター獲得！”,
${item.name}を手に入れた！
);
}

function getAvatar() {

const avatar =
AVATARS.find(
item =>
item.id === data.equippedAvatar
);

return avatar
? avatar.value
: “⚔️”;
}

/* ========================================
THEME
======================================== */

function applyTheme() {

const theme =
THEMES.find(
item =>
item.id === data.equippedTheme
) || THEMES[0];

document.documentElement
.style.setProperty(
“–theme”,
theme.color
);

document.documentElement
.style.setProperty(
“–theme-light”,
theme.light
);

document.documentElement
.style.setProperty(
“–theme-dark”,
theme.dark
);

applyBackground();
}

function applyBackground() {

const bg =
BACKGROUNDS.find(
item =>
item.id === data.equippedBackground
) || BACKGROUNDS[0];

const app =
document.getElementById(“app”);

if (!app) {
return;
}

const dark =
[
“night”,
“moon”,
“battle”,
“stars”
].includes(bg.value);

document.documentElement
.style.setProperty(
“–text”,
dark ? “#f8fafc” : “#1f2937”
);

document.documentElement
.style.setProperty(
“–muted”,
dark ? “#cbd5e1” : “#6b7280”
);

document.documentElement
.style.setProperty(
“–card”,
dark ? “#1e293b” : “#ffffff”
);

document.documentElement
.style.setProperty(
“–border”,
dark ? “#334155” : “#e5e7eb”
);

app.style.background =
getBackgroundCSS(bg.value);
}

function getBackgroundCSS(value) {

switch(value) {

case "night":
  return `
    radial-gradient(
      circle at 20% 20%,
      rgba(255,255,255,.2) 1px,
      transparent 1px
    ),
    linear-gradient(
      180deg,
      #111827,
      #1e293b
    )
  `;
case "library":
  return `
    linear-gradient(
      135deg,
      #f5f1e8,
      #e8dfcf
    )
  `;
case "magic":
  return `
    radial-gradient(
      circle at 70% 20%,
      rgba(139,92,246,.18),
      transparent 35%
    ),
    linear-gradient(
      135deg,
      #f5f3ff,
      #e0e7ff
    )
  `;
case "moon":
  return `
    radial-gradient(
      circle at 75% 15%,
      rgba(255,255,255,.7),
      transparent 12%
    ),
    linear-gradient(
      180deg,
      #172554,
      #312e81
    )
  `;
case "battle":
  return `
    linear-gradient(
      135deg,
      #450a0a,
      #7f1d1d
    )
  `;
case "stars":
  return `
    radial-gradient(
      circle at 20% 20%,
      rgba(255,255,255,.25) 1px,
      transparent 1px
    ),
    radial-gradient(
      circle at 70% 60%,
      rgba(255,255,255,.2) 1px,
      transparent 1px
    ),
    linear-gradient(
      135deg,
      #020617,
      #312e81
    )
  `;
default:
  return "var(--bg)";

}
}

/* ========================================
QUEST
======================================== */

function renderQuests() {

const container =
document.getElementById(
“quest-list”
);

const homeContainer =
document.getElementById(
“home-quests”
);

if (!container || !homeContainer) {
return;
}

container.innerHTML = “”;
homeContainer.innerHTML = “”;

DAILY_QUESTS.forEach(quest => {

const progress =
  Math.min(
    data.todayMinutes,
    quest.minutes
  );
const percentage =
  Math.min(
    100,
    progress/quest.minutes*100
  );
const claimed =
  data.claimedQuests.includes(
    quest.id
  );
const completed =
  progress >= quest.minutes;
const card =
  document.createElement("div");
card.className =
  "quest-card" +
  (claimed ? " completed" : "");
let bottomHTML = "";
if (claimed) {
  bottomHTML =
    `<span class="quest-complete-label">✓ 完了</span>`;
} else if (completed) {
  bottomHTML = `
    <button
      class="quest-claim-button"
    >
      報酬を受け取る
    </button>
  `;
} else {
  bottomHTML =
    `<span class="quest-reward">
      ${quest.xp}XP + ${quest.coins}🪙
    </span>`;
}
card.innerHTML = `
  <div class="quest-card-icon">
    ${quest.icon}
  </div>
  <h3>${quest.name}</h3>
  <p>${quest.description}</p>
  <div class="quest-progress">
    <div
      class="quest-progress-fill"
      style="width:${percentage}%"
    ></div>
  </div>
  <div class="quest-bottom">
    <span class="quest-reward">
      ${progress}/${quest.minutes}分
    </span>
    ${bottomHTML}
  </div>
`;
const claim =
  card.querySelector(
    ".quest-claim-button"
  );
if (claim) {
  claim.addEventListener(
    "click",
    () => claimQuest(quest)
  );
}
container.appendChild(card);
const home =
  document.createElement("div");
home.className =
  "home-quest";
home.innerHTML = `
  <div class="home-quest-icon">
    ${quest.icon}
  </div>
  <div class="home-quest-info">
    <strong>${quest.name}</strong>
    <span>
      ${progress}/${quest.minutes}分
    </span>
  </div>
  <div class="home-quest-status">
    ${
      claimed
        ? "✓ 完了"
        : completed
          ? "報酬GET!"
          : `${progress}/${quest.minutes}分`
    }
  </div>
`;
homeContainer.appendChild(home);

});
}

function claimQuest(quest) {

if (
data.claimedQuests.includes(
quest.id
)
) {
return;
}

if (
data.todayMinutes <
quest.minutes
) {
return;
}

data.claimedQuests.push(
quest.id
);

data.totalXP += quest.xp;
data.xp += quest.xp;

data.coins += quest.coins;

const levelUps =
processLevelUps();

const achievements =
checkAchievements();

saveData();
updateAll();

let message =
${quest.name}\n\n +
+${quest.xp} XP\n +
+${quest.coins} 🪙;

if (achievements > 0) {
message +=
\n🏆 実績解除！;
}

if (levelUps > 0) {

message +=
  `\n\n⬆️ Lv.${data.level}に到達！`;
showMessage(
  "🎉",
  "QUEST COMPLETE!",
  message
);
setTimeout(
  showLevelUp,
  300
);
return;

}

showMessage(
“🎉”,
“QUEST COMPLETE!”,
message
);
}

/* ========================================
GOAL
======================================== */

function setupGoal() {

document
.getElementById(
“change-goal-button”
)
.addEventListener(
“click”,
() => {

    document
      .getElementById("goal-input")
      .value =
      data.dailyGoal;
    document
      .getElementById("goal-modal")
      .classList.remove(
        "hidden"
      );
  }
);

document
.getElementById(
“goal-cancel”
)
.addEventListener(
“click”,
() => {

    document
      .getElementById("goal-modal")
      .classList.add(
        "hidden"
      );
  }
);

document
.getElementById(
“goal-submit”
)
.addEventListener(
“click”,
() => {

    const goal =
      Number(
        document
          .getElementById(
            "goal-input"
          )
          .value
      );
    if (
      !Number.isFinite(goal) ||
      goal <= 0
    ) {
      return;
    }
    data.dailyGoal =
      Math.min(
        1440,
        Math.floor(goal)
      );
    saveData();
    updateAll();
    document
      .getElementById(
        "goal-modal"
      )
      .classList.add(
        "hidden"
      );
  }
);

}

/* ========================================
RANK
======================================== */

function getCurrentRank() {

let current =
RANKS[0];

RANKS.forEach(rank => {

if (
  data.monthMinutes >=
  rank.min
) {
  current = rank;
}

});

return current;
}

function formatRank() {

const rank =
getCurrentRank();

return ${rank.icon} ${rank.name};
}

function updateRankProgress() {

const currentIndex =
RANKS.findIndex(
rank =>
rank.name ===
getCurrentRank().name
);

const currentRank =
RANKS[currentIndex];

const nextRank =
RANKS[currentIndex+1];

const progressText =
document.getElementById(
“rank-progress-text”
);

const nextText =
document.getElementById(
“rank-next-text”
);

const fill =
document.getElementById(
“rank-progress-fill”
);

const icon =
document.getElementById(
“rank-current-icon”
);

const name =
document.getElementById(
“rank-current-name”
);

if (icon) {
icon.textContent =
currentRank.icon;
}

if (name) {
name.textContent =
currentRank.name;
}

if (
!progressText ||
!nextText ||
!fill
) {
return;
}

if (!nextRank) {

progressText.textContent =
  `${formatMinutes(data.monthMinutes)} / MAX`;
nextText.textContent =
  "🌌 LEGEND";
fill.style.width =
  "100%";
return;

}

const currentMinutes =
data.monthMinutes -
currentRank.min;

const requiredMinutes =
nextRank.min -
currentRank.min;

const percentage =
Math.min(
100,
Math.max(
0,
currentMinutes/
requiredMinutes*100
)
);

progressText.textContent =
${formatMinutes(currentMinutes)} / ${formatMinutes(requiredMinutes)};

nextText.textContent =
次：${nextRank.icon} ${nextRank.name};

fill.style.width =
${percentage}%;
}

/* ========================================
TIME
======================================== */

function formatMinutes(minutes) {

const hours =
Math.floor(minutes/60);

const mins =
minutes%60;

if (hours === 0) {
return ${mins}分;
}

return ${hours}h ${mins}m;
}

/* ========================================
ACHIEVEMENTS
======================================== */

function checkAchievements() {

let newAchievements = 0;

ACHIEVEMENTS.forEach(
achievement => {

  if (
    data.achievements.includes(
      achievement.id
    )
  ) {
    return;
  }
  if (
    achievement.check(data)
  ) {
    data.achievements.push(
      achievement.id
    );
    data.coins += 50;
    newAchievements++;
  }
}

);

return newAchievements;
}

function renderAchievements() {

const container =
document.getElementById(
“achievement-list”
);

if (!container) {
return;
}

container.innerHTML = “”;

ACHIEVEMENTS.forEach(item => {

const unlocked =
  data.achievements.includes(
    item.id
  );
const element =
  document.createElement("div");
element.className =
  "achievement" +
  (unlocked ? "" : " locked");
element.innerHTML = `
  <div class="achievement-icon">
    ${unlocked ? item.icon : "🔒"}
  </div>
  <div class="achievement-info">
    <strong>
      ${item.name}
    </strong>
    <span>
      ${item.description}
    </span>
  </div>
`;
container.appendChild(element);

});
}

/* ========================================
LEVEL UP
======================================== */

function setupLevelUpModal() {

document
.getElementById(
“levelup-close”
)
.addEventListener(
“click”,
() => {

    document
      .getElementById(
        "levelup-modal"
      )
      .classList.add(
        "hidden"
      );
  }
);

}

function showLevelUp() {

const number =
document.getElementById(
“levelup-number”
);

const modal =
document.getElementById(
“levelup-modal”
);

if (!number || !modal) {
return;
}

number.textContent =
data.level;

modal.classList.remove(
“hidden”
);
}

/* ========================================
MESSAGE
======================================== */

function setupMessageModal() {

document
.getElementById(
“message-close”
)
.addEventListener(
“click”,
() => {

    document
      .getElementById(
        "message-modal"
      )
      .classList.add(
        "hidden"
      );
  }
);

}

function showMessage(
icon,
title,
text
) {

document
.getElementById(
“message-icon”
)
.textContent =
icon;

document
.getElementById(
“message-title”
)
.textContent =
title;

document
.getElementById(
“message-text”
)
.textContent =
text;

document
.getElementById(
“message-modal”
)
.classList.remove(
“hidden”
);
}

/* ========================================
UPDATE ALL
======================================== */

function updateAll() {

checkDateReset();

checkAchievements();

updateHome();
updateRankProgress();
updateStudy();
updateQuestHeader();

renderQuests();
renderShop();

updateProfile();
renderAchievements();

updateBuffUI();

applyTheme();

renderBattle();

saveData();
}

/* ========================================
HOME
======================================== */

function updateHome() {

const name =
document.getElementById(
“home-name”
);

if (name) {
name.textContent =
data.name || “冒険者”;
}

const level =
document.getElementById(
“home-level”
);

if (level) {
level.textContent =
data.level;
}

const xpText =
document.getElementById(
“home-xp-text”
);

if (xpText) {

xpText.textContent =
  `${data.xp} / ${xpRequired()}`;

}

const percentage =
Math.min(
100,
data.xp/
xpRequired()*100
);

const fill =
document.getElementById(
“home-xp-fill”
);

if (fill) {
fill.style.width =
${percentage}%;
}

const coins =
document.getElementById(
“home-coins”
);

if (coins) {
coins.textContent =
data.coins.toLocaleString();
}

const month =
document.getElementById(
“home-month-hours”
);

if (month) {
month.textContent =
formatMinutes(
data.monthMinutes
);
}

const today =
document.getElementById(
“home-today-minutes”
);

if (today) {
today.textContent =
formatMinutes(
data.todayMinutes
);
}

const rank =
document.getElementById(
“home-rank”
);

if (rank) {
rank.textContent =
formatRank();
}

const avatar =
document.getElementById(
“home-avatar”
);

if (avatar) {
avatar.textContent =
getAvatar();
}
}

/* ========================================
STUDY
======================================== */

function updateStudy() {

const current =
document.getElementById(
“current-subject”
);

if (!current) {
return;
}

current.textContent =
selectedSubject ||
data.subject ||
“未選択”;

renderSubjectButtons();
}

/* ========================================
QUEST HEADER
======================================== */

function updateQuestHeader() {

const today =
document.getElementById(
“quest-today-time”
);

const goal =
document.getElementById(
“quest-goal-time”
);

if (today) {
today.textContent =
formatMinutes(
data.todayMinutes
);
}

if (goal) {
goal.textContent =
formatMinutes(
data.dailyGoal
);
}
}

/* ========================================
PROFILE
======================================== */

function updateProfile() {

const name =
document.getElementById(
“profile-name”
);

if (name) {
name.textContent =
data.name || “冒険者”;
}

const level =
document.getElementById(
“profile-level”
);

if (level) {
level.textContent =
data.level;
}

const xp =
document.getElementById(
“profile-total-xp”
);

if (xp) {
xp.textContent =
data.totalXP.toLocaleString();
}

const total =
document.getElementById(
“profile-total-time”
);

if (total) {
total.textContent =
formatMinutes(
data.totalMinutes
);
}

const month =
document.getElementById(
“profile-month-time”
);

if (month) {
month.textContent =
formatMinutes(
data.monthMinutes
);
}

const coins =
document.getElementById(
“profile-coins”
);

if (coins) {
coins.textContent =
data.coins.toLocaleString();
}

const rank =
document.getElementById(
“profile-rank”
);

if (rank) {
rank.textContent =
formatRank();
}

const title =
TITLES.find(
item =>
item.id ===
data.equippedTitle
);

const profileTitle =
document.getElementById(
“profile-title”
);

if (profileTitle) {

profileTitle.textContent =
  title
    ? title.name
    : "新米冒険者";

}

const avatar =
document.getElementById(
“profile-avatar”
);

if (avatar) {
avatar.textContent =
getAvatar();
}
}
