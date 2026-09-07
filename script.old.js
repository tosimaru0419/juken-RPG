alert("最新script.js読み込み成功");
// ============================================================
// 受験RPG - script.js
// Complete replacement / Spark-plan client engine
// Firebase Web SDK 12.2.1
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
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
  measurementId: "G-KLH9WZFNMT",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// ============================================================
// DOM / utilities
// ============================================================

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const n = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const uniq = (arr) => [...new Set(Array.isArray(arr) ? arr : [])];
const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

function text(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value ?? "");
}

function setWidth(id, percent) {
  const el = $(id);
  if (el) el.style.width = `${clamp(n(percent), 0, 100)}%`;
}

function show(id) {
  $(id)?.classList.remove("hidden");
}

function hide(id) {
  $(id)?.classList.add("hidden");
}

function randomId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatStudyMinutes(value) {
  const m = Math.max(0, Math.floor(n(value)));
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}時間${rest}分` : `${h}時間`;
}

function formatTimerSeconds(value) {
  const sec = Math.max(0, Math.floor(n(value)));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

function toast(message, type = "info") {
  const root = $("toast-container");
  if (!root) {
    console.log(`[${type}] ${message}`);
    return;
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  window.setTimeout(() => {
    el.classList.remove("show");
    window.setTimeout(() => el.remove(), 250);
  }, 2800);
}

function openModal(html) {
  const overlay = $("modal-overlay");
  const content = $("modal-content");
  if (!overlay || !content) return;
  content.innerHTML = html;
  overlay.classList.remove("hidden");
}

function closeModal() {
  $("modal-overlay")?.classList.add("hidden");
  const content = $("modal-content");
  if (content) content.innerHTML = "";
}

function setLoading(message = "受験RPGを起動しています...", visible = true) {
  text("loading-text", message);
  $("loading-overlay")?.classList.toggle("hidden", !visible);
}

// ============================================================
// Japan date/time
// ============================================================

function jstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const out = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour === "24" ? "0" : out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
  };
}

function jstDateKey(date = new Date()) {
  const p = jstParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function jstMonthKey(date = new Date()) {
  const p = jstParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

function jstDateFromKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 15, 0, 0));
}

function addJstDays(key, days) {
  const d = jstDateFromKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return jstDateKey(d);
}

function mondayKey(date = new Date()) {
  const p = jstParts(date);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return jstDateKey(d);
}

function daysBetween(aKey, bKey) {
  const a = jstDateFromKey(aKey);
  const b = jstDateFromKey(bKey);
  return Math.round((b - a) / 86400000);
}

function currentPartyCycle() {
  const anchor = "2026-08-31";
  const mon = mondayKey();
  const diffWeeks = Math.floor(daysBetween(anchor, mon) / 7);
  const cycleIndex = Math.floor(diffWeeks / 2);
  const inCycleWeek = ((diffWeeks % 2) + 2) % 2;
  return {
    cycleId: `cycle-${cycleIndex}`,
    week: inCycleWeek === 0 ? 1 : 2,
    phase: inCycleWeek === 0 ? "formation" : "boss",
    monday: mon,
  };
}

// ============================================================
// Game data
// ============================================================

const SUBJECTS = [
  { id: "math-ia", name: "数学IA", system: "math", track: "common" },
  { id: "math-iibc", name: "数学IIBC", system: "math", track: "common" },
  { id: "math-iii", name: "数学III", system: "math", track: "science" },
  { id: "modern-japanese", name: "現代文", system: "japanese", track: "common" },
  { id: "classical-japanese", name: "古文", system: "japanese", track: "common" },
  { id: "classical-chinese", name: "漢文", system: "japanese", track: "common" },
  { id: "japanese-history", name: "日本史", system: "history", track: "humanities" },
  { id: "world-history", name: "世界史", system: "history", track: "humanities" },
  { id: "geography", name: "地理", system: "history", track: "common" },
  { id: "earth-science", name: "地学", system: "history", track: "science" },
  { id: "earth-science-basic", name: "地学基礎", system: "history", track: "common" },
  { id: "politics-economics", name: "政治・経済", system: "history", track: "humanities" },
  { id: "ethics", name: "倫理", system: "history", track: "humanities" },
  { id: "public-affairs", name: "公共", system: "history", track: "common" },
  { id: "chemistry", name: "化学", system: "science", track: "science" },
  { id: "chemistry-basic", name: "化学基礎", system: "science", track: "common" },
  { id: "physics", name: "物理", system: "science", track: "science" },
  { id: "physics-basic", name: "物理基礎", system: "science", track: "common" },
  { id: "biology", name: "生物", system: "science", track: "science" },
  { id: "biology-basic", name: "生物基礎", system: "science", track: "common" },
  { id: "english", name: "英語", system: "english", track: "common" },
  { id: "information", name: "情報", system: "common", track: "common" },
];

const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));
const SYSTEM_LABELS = {
  math: "数学",
  japanese: "国語",
  history: "地歴・公民",
  science: "理科",
  english: "英語",
};
const BOSS_SYSTEMS = ["math", "japanese", "history", "science", "english"];

const RANKS = [
  { id: "bronze-3", name: "Bronze III", min: 0, xp: 100, coins: 150 },
  { id: "bronze-2", name: "Bronze II", min: 120, xp: 150, coins: 250 },
  { id: "bronze-1", name: "Bronze I", min: 240, xp: 200, coins: 350, titleId: "rank-bronze" },
  { id: "silver-3", name: "Silver III", min: 480, xp: 300, coins: 500 },
  { id: "silver-2", name: "Silver II", min: 720, xp: 400, coins: 650 },
  { id: "silver-1", name: "Silver I", min: 960, xp: 500, coins: 800, titleId: "rank-silver" },
  { id: "gold-3", name: "Gold III", min: 1320, xp: 650, coins: 1000 },
  { id: "gold-2", name: "Gold II", min: 1680, xp: 800, coins: 1250 },
  { id: "gold-1", name: "Gold I", min: 2040, xp: 1000, coins: 1500, titleId: "rank-gold" },
  { id: "platinum-3", name: "Platinum III", min: 2520, xp: 1250, coins: 1800 },
  { id: "platinum-2", name: "Platinum II", min: 3000, xp: 1500, coins: 2200 },
  { id: "platinum-1", name: "Platinum I", min: 3480, xp: 1800, coins: 2600, titleId: "rank-platinum" },
  { id: "diamond-3", name: "Diamond III", min: 4080, xp: 2200, coins: 3200 },
  { id: "diamond-2", name: "Diamond II", min: 4680, xp: 2600, coins: 3800 },
  { id: "diamond-1", name: "Diamond I", min: 5280, xp: 3000, coins: 4500, titleId: "rank-diamond" },
  { id: "master", name: "Master", min: 6600, xp: 3750, coins: 5500, titleId: "rank-master" },
  { id: "grandmaster", name: "Grandmaster", min: 8400, xp: 4750, coins: 7000, titleId: "rank-grandmaster" },
  { id: "legend", name: "Legend", min: 10200, xp: 6000, coins: 10000, titleId: "rank-legend" },
];

const RANK_TITLE_NAMES = {
  "rank-bronze": "駆け出し冒険者",
  "rank-silver": "銀の学徒",
  "rank-gold": "黄金の探究者",
  "rank-platinum": "白金の研鑽者",
  "rank-diamond": "ダイヤモンドの覇者",
  "rank-master": "王道を征く者",
  "rank-grandmaster": "頂点への挑戦者",
  "rank-legend": "伝説に至りし者",
};

const DAILY_REWARDS = {
  15: { xp: 50, coins: 100 },
  30: { xp: 100, coins: 200 },
  45: { xp: 150, coins: 300 },
  60: { xp: 200, coins: 400 },
};

const XP_ITEMS = [
  { id: "exp-book", name: "経験の書", multiplier: 1.5, duration: 60, price: 1000, description: "次のタイマーで最大60分、XP×1.5" },
  { id: "advanced-exp-book", name: "上級経験の書", multiplier: 2, duration: 30, price: 2500, description: "次のタイマーで最大30分、XP×2" },
  { id: "ultimate-exp-book", name: "極・経験の書", multiplier: 3, duration: 15, price: 4000, description: "次のタイマーで最大15分、XP×3" },
  { id: "long-exp-book", name: "長時間経験の書", multiplier: 1.5, duration: 90, price: 1500, description: "次のタイマーで最大90分、XP×1.5" },
  { id: "super-long-exp-book", name: "超長時間経験の書", multiplier: 1.5, duration: 120, price: 2000, description: "次のタイマーで最大120分、XP×1.5" },
  { id: "continuous-mind", name: "連続の心得", multiplier: 1.2, duration: Infinity, price: 1500, description: "次のタイマー全体のXP×1.2" },
];

const BOSS_ITEMS = [
  { id: "boss-level-up", name: "Boss Lv up", price: 5000, description: "今周期のボスLvを1上げる" },
  { id: "boss-level-down", name: "Boss Lv down", price: 5000, description: "今周期のボスLvを1下げる" },
  { id: "boss-weak-random", name: "ランダム弱点追加", price: 7500, description: "ランダムな教科を弱点に追加" },
  { id: "boss-weak-select", name: "選択弱点追加", price: 15000, description: "選んだ教科を弱点に追加" },
];

const SHOP_TITLES = [
  { id: "shop-common-1", name: "見習い", rarity: "Common", price: 500 },
  { id: "shop-common-2", name: "新米冒険者", rarity: "Common", price: 500 },
  { id: "shop-uncommon-1", name: "探究者", rarity: "Uncommon", price: 1500 },
  { id: "shop-uncommon-2", name: "求道者", rarity: "Uncommon", price: 1500 },
  { id: "shop-rare-1", name: "覚醒", rarity: "Rare", price: 3000 },
  { id: "shop-rare-2", name: "異端の道", rarity: "Rare", price: 3000 },
  { id: "shop-rare-3", name: "運命への反逆", rarity: "Rare", price: 3000 },
  { id: "shop-epic-1", name: "深淵の先へ", rarity: "Epic", price: 7500 },
  { id: "shop-epic-2", name: "天命を超えて", rarity: "Epic", price: 7500 },
  { id: "shop-epic-3", name: "神域への到達", rarity: "Epic", price: 7500 },
  { id: "shop-legendary-1", name: "万象統べる王", rarity: "Legendary", price: 15000 },
  { id: "shop-legendary-2", name: "世界の理、その彼方", rarity: "Legendary", price: 15000 },
  { id: "shop-legendary-3", name: "合格の向こう側", rarity: "Legendary", price: 15000 },
];

const NORMAL_TITLES = [
  ["normal-01", "駆け出しの冒険者", "Lv.5に到達"],
  ["normal-02", "一人前の冒険者", "Lv.10に到達"],
  ["normal-03", "熟練の冒険者", "Lv.25に到達"],
  ["normal-04", "歴戦の冒険者", "Lv.50に到達"],
  ["normal-05", "限界突破", "Lv.75に到達"],
  ["normal-06", "頂への到達者", "Lv.100に到達"],
  ["normal-07", "学びの第一歩", "累計10時間勉強"],
  ["normal-08", "努力の積み重ね", "累計50時間勉強"],
  ["normal-09", "努力の結晶", "累計100時間勉強"],
  ["normal-10", "研鑽の求道者", "累計250時間勉強"],
  ["normal-11", "学問の探究者", "累計500時間勉強"],
  ["normal-12", "勉学の鬼", "累計1000時間勉強"],
  ["normal-13", "三日坊主卒業", "3日連続勉強"],
  ["normal-14", "習慣の芽", "7日連続勉強"],
  ["normal-15", "継続は力なり", "14日連続勉強"],
  ["normal-16", "揺るがぬ意志", "30日連続勉強"],
  ["normal-17", "鉄の意志", "60日連続勉強"],
  ["normal-18", "不屈の学徒", "100日連続勉強"],
  ["normal-19", "全方位学習者", "5系統すべてを勉強"],
  ["normal-20", "文理両道", "文系・理系教科の両方を勉強"],
  ["normal-21", "苦手克服", "最も低Lvの教科を10時間勉強"],
  ["normal-22", "得意の研鑽", "最も高Lvの教科を10時間勉強"],
  ["normal-23", "知識の収集家", "5教科以上を各10時間勉強"],
  ["normal-24", "初陣", "初めてボスにダメージ"],
  ["normal-25", "討伐者", "初めてボスを討伐"],
  ["normal-26", "弱点看破", "初めて弱点で攻撃"],
  ["normal-27", "一騎当千", "1人パーティーでボス討伐"],
  ["normal-28", "MVP", "パーティー内最高貢献"],
  ["normal-29", "ジャイアントキリング", "Boss Lv.10を討伐"],
  ["normal-30", "五系統制覇", "5系統すべてのボスを討伐"],
  ["normal-31", "小さな富豪", "累計10,000コイン獲得"],
  ["normal-32", "財宝の守り人", "累計50,000コイン獲得"],
  ["normal-33", "大富豪", "累計100,000コイン獲得"],
  ["normal-34", "コレクター", "5種類のアイテムを所持"],
  ["normal-35", "収集家", "10種類のアイテムを所持"],
  ["normal-36", "買い物上手", "初めてショップで購入"],
  ["normal-37", "称号ハンター", "通常称号を10個獲得"],
  ["normal-38", "称号コレクター", "通常称号を20個獲得"],
  ["normal-39", "受験冒険者", "30日ログイン"],
  ["normal-40", "伝説への一歩", "通常称号を30個獲得"],
].map(([id, name, condition]) => ({ id, name, condition, rarity: "Achievement", category: "normal" }));

const BOSS_TITLES = [
  { id: "boss-title-math", name: "二律背反", system: "math" },
  { id: "boss-title-japanese", name: "古今之文悉皆通暁", system: "japanese" },
  { id: "boss-title-history", name: "天地ノ軌跡", system: "history" },
  { id: "boss-title-science", name: "右手に宿りし雷光", system: "science" },
  { id: "boss-title-english", name: "BEYOND THE LOGIC", system: "english" },
].map((x) => ({ ...x, rarity: "Boss", category: "boss", condition: "条件非公開" }));

const HIDDEN_TITLES = [
  ["hidden-01", "アリ得ない知識"],
  ["hidden-02", "廃人予備軍"],
  ["hidden-03", "限界突破者"],
  ["hidden-04", "一点突破"],
  ["hidden-05", "全知全能"],
  ["hidden-06", "クエストブレイカー"],
  ["hidden-07", "強欲なる者"],
  ["hidden-08", "逆張り勇者"],
  ["hidden-09", "錬金術師"],
  ["hidden-10", "幸運を掴みし者"],
].map(([id, name]) => ({ id, name, condition: "条件非公開", rarity: "Hidden", category: "hidden" }));

const RANK_TITLES = Object.entries(RANK_TITLE_NAMES).map(([id, name]) => ({
  id,
  name,
  condition: "対応するランクに到達",
  rarity: "Rank",
  category: "rank",
}));

const SHOP_TITLE_OBJECTS = SHOP_TITLES.map((x) => ({
  ...x,
  condition: `ショップで${x.price.toLocaleString()}コイン`,
  category: "shop",
}));

const ALL_TITLES = [
  ...NORMAL_TITLES,
  ...RANK_TITLES,
  ...BOSS_TITLES,
  ...HIDDEN_TITLES,
  ...SHOP_TITLE_OBJECTS,
];
const TITLE_BY_ID = Object.fromEntries(ALL_TITLES.map((t) => [t.id, t]));

const BOSS_HP = [0, 300000, 350000, 410000, 490000, 590000, 720000, 900000, 1150000, 1550000, 2520000];
const PARTY_HP_MULT = [0, 0.119, 0.229, 0.329, 0.429, 0.524, 0.621, 0.717, 0.810, 0.906, 1.0];

// ============================================================
// State
// ============================================================

let currentUser = null;
let profile = null;
let subjectState = {};
let questState = null;
let activeTimer = null;
let currentParty = null;
let currentFriends = [];
let pendingFriendRequests = [];
let partyInvites = [];
let todayRecords = [];
let timerTicker = null;
let currentPage = "home";
let pendingRegistration = null;

// ============================================================
// Level / rank
// ============================================================

function xpRequiredForLevel(level) {
  if (level >= 100) return 0;
  return 100 + Math.floor((level - 1) / 10) * 50;
}

function totalXpBeforeLevel(level) {
  let sum = 0;
  for (let lv = 1; lv < level; lv += 1) sum += xpRequiredForLevel(lv);
  return sum;
}

function levelFromXp(xp) {
  const value = Math.max(0, n(xp));
  let level = 1;
  while (level < 100 && value >= totalXpBeforeLevel(level + 1)) level += 1;
  return level;
}

function playerLevelProgress(xp) {
  const level = levelFromXp(xp);
  if (level >= 100) return { level: 100, current: 0, required: 0, percent: 100 };
  const start = totalXpBeforeLevel(level);
  const required = xpRequiredForLevel(level);
  const current = Math.max(0, n(xp) - start);
  return { level, current, required, percent: clamp((current / required) * 100, 0, 100) };
}

function subjectLevel(minutes) {
  return Math.floor(Math.max(0, n(minutes)) / 45) + 1;
}

function rankFromMinutes(minutes) {
  const value = Math.max(0, n(minutes));
  let rank = RANKS[0];
  for (const r of RANKS) if (value >= r.min) rank = r;
  return rank;
}

function bossLevelForPlayer(p = profile) {
  if (!p) return 1;
  if (n(p.stars) >= 1 || n(p.level) >= 100) return 10;
  return clamp(Math.ceil(Math.max(1, n(p.level, 1)) / 10), 1, 10);
}

function bossBaseReward(level) {
  const factor = Math.pow(1.5, Math.max(0, level - 1));
  return {
    xp: Math.round(500 * factor),
    coins: Math.round(750 * factor),
  };
}

// ============================================================
// Defaults / migration
// ============================================================

function makeGlobalId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function defaultSelectedSubjects(track = "humanities") {
  if (track === "science") {
    return ["math-ia", "math-iibc", "math-iii", "modern-japanese", "english", "physics", "chemistry", "information"];
  }
  return ["math-ia", "math-iibc", "modern-japanese", "classical-japanese", "classical-chinese", "english", "geography", "earth-science-basic", "information"];
}

function defaultProfile(user) {
  const registration = pendingRegistration;
  const track = registration?.track || "humanities";
  return {
    uid: user.uid,
    globalId: registration?.globalId || makeGlobalId(),
    username: registration?.username || (user.email || "冒険者").split("@")[0] || "冒険者",
    track,
    selectedSubjects: registration?.selectedSubjects || defaultSelectedSubjects(track),
    level: 1,
    xp: 0,
    stars: 0,
    coins: 0,
    totalStudyMinutes: 0,
    currentSeason: jstMonthKey(),
    seasonStudyMinutes: 0,
    seasonClaimedRankIds: [],
    consecutiveStudyDays: 0,
    lastStudyDate: "",
    loginDays: 0,
    loginDates: [],
    lastLoginDate: "",
    equippedTitleId: "",
    ownedTitles: [],
    inventory: {},
    preparedXpBoosts: [],
    lifetimeCoinsEarned: 0,
    lifetimeCoinsSpent: 0,
    purchasedItemTypes: [],
    shopPurchaseCount: 0,
    bossStats: {
      participation: 0,
      defeats: 0,
      weakHits: 0,
      soloDefeats: 0,
      mvp: 0,
      defeatedSystems: [],
      defeatedLv10Systems: [],
    },
    rareHistory: [],
    createdAt: Date.now(),
  };
}

function normalizeProfile(raw, user) {
  const base = defaultProfile(user);
  const p = { ...base, ...(raw || {}) };
  p.uid = user.uid;
  p.username = p.username || p.displayName || base.username;
  p.globalId = p.globalId || p.userId || makeGlobalId();
  p.track = ["humanities", "science"].includes(p.track) ? p.track : (p.course === "science" ? "science" : "humanities");
  p.selectedSubjects = uniq(
    (Array.isArray(p.selectedSubjects) ? p.selectedSubjects : Array.isArray(p.subjects) ? p.subjects : base.selectedSubjects)
      .filter((id) => SUBJECT_BY_ID[id]),
  );
  if (!p.selectedSubjects.length) p.selectedSubjects = base.selectedSubjects;
  p.xp = Math.max(0, n(p.xp));
  p.level = levelFromXp(p.xp);
  p.stars = Math.max(0, Math.floor(n(p.stars)));
  p.coins = Math.max(0, Math.floor(n(p.coins)));
  p.totalStudyMinutes = Math.max(0, Math.floor(n(p.totalStudyMinutes)));
  p.seasonStudyMinutes = Math.max(0, Math.floor(n(p.seasonStudyMinutes)));
  p.currentSeason = p.currentSeason || p.seasonId || jstMonthKey();
  p.seasonClaimedRankIds = uniq(p.seasonClaimedRankIds);
  p.loginDates = uniq(p.loginDates);
  p.ownedTitles = uniq(p.ownedTitles || p.unlockedTitles);
  p.inventory = p.inventory && typeof p.inventory === "object" ? p.inventory : {};
  p.preparedXpBoosts = uniq(p.preparedXpBoosts);
  p.purchasedItemTypes = uniq(p.purchasedItemTypes);
  p.bossStats = { ...base.bossStats, ...(p.bossStats || {}) };
  p.bossStats.defeatedSystems = uniq(p.bossStats.defeatedSystems);
  p.bossStats.defeatedLv10Systems = uniq(p.bossStats.defeatedLv10Systems);
  p.rareHistory = Array.isArray(p.rareHistory) ? p.rareHistory : [];
  return p;
}

// ============================================================
// Firestore refs / persistence
// ============================================================

const userRef = () => doc(db, "users", currentUser.uid);
const subjectRef = (id) => doc(db, "users", currentUser.uid, "subjects", id);
const questRef = () => doc(db, "users", currentUser.uid, "quests", "state");
const timerRef = () => doc(db, "users", currentUser.uid, "activeTimer", "current");
const recordRef = (id) => doc(db, "users", currentUser.uid, "studyRecords", id);

async function saveProfile(extra = {}) {
  if (!currentUser || !profile) return;
  profile.level = levelFromXp(profile.xp);
  await setDoc(userRef(), {
    ...profile,
    ...extra,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function saveQuestState() {
  if (!currentUser || !questState) return;
  await setDoc(questRef(), { ...questState, updatedAt: serverTimestamp() }, { merge: true });
}

async function saveTimerState() {
  if (!currentUser) return;
  if (!activeTimer) {
    await deleteDoc(timerRef()).catch(() => {});
    return;
  }
  await setDoc(timerRef(), { ...activeTimer, updatedAt: serverTimestamp() }, { merge: true });
}

// ============================================================
// Auth UI
// ============================================================

function normalizeLoginId(value) {
  return String(value || "").trim().toUpperCase();
}

function validLoginId(value) {
  return /^[A-Z0-9_-]{4,20}$/.test(value);
}

function loginEmailFromId(value) {
  return `${normalizeLoginId(value).toLowerCase()}@juken-rpg.local`;
}

function authFieldStyle() {
  return "width:100%;box-sizing:border-box;padding:13px 14px;border-radius:11px;border:1px solid #334155;background:#0b1220;color:#fff;outline:none";
}

function authButtonStyle(primary = false) {
  return primary
    ? "width:100%;padding:13px;border:0;border-radius:11px;background:#38bdf8;color:#07111f;font-weight:800;cursor:pointer"
    : "width:100%;padding:13px;border:1px solid #334155;border-radius:11px;background:#182235;color:#fff;font-weight:700;cursor:pointer";
}

function authSubjectOptions(selectedSubjects = []) {
  return SUBJECTS.map((subject) => `
    <label style="display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid #263247;border-radius:10px">
      <input
        type="checkbox"
        data-auth-subject
        value="${subject.id}"
        ${selectedSubjects.includes(subject.id) ? "checked" : ""}
      >
      <span>${escapeHtml(subject.name)}</span>
    </label>
  `).join("");
}

function renderLoginAuth(root) {
  root.innerHTML = `
    <div style="width:min(430px,100%);max-height:92vh;overflow:auto;background:#111827;border:1px solid #263247;border-radius:20px;padding:24px;display:grid;gap:14px">
      <div>
        <h1 style="margin:0 0 5px">受験RPG</h1>
        <p style="margin:0;color:#aab3c5">冒険の続きを始めよう</p>
      </div>

      <div style="display:grid;gap:8px">
        <label style="font-size:.86rem;color:#aab3c5">ユーザーID</label>
        <input
          id="juken-auth-user-id"
          type="text"
          maxlength="20"
          autocomplete="username"
          placeholder="例：TOSIMARU0419"
          style="${authFieldStyle()}"
        >
      </div>

      <div style="display:grid;gap:8px">
        <label style="font-size:.86rem;color:#aab3c5">パスワード</label>
        <input
          id="juken-auth-password"
          type="password"
          autocomplete="current-password"
          placeholder="6文字以上"
          style="${authFieldStyle()}"
        >
      </div>

      <button id="juken-auth-login" type="button" style="${authButtonStyle(true)}">
        ログイン
      </button>

      <button id="juken-show-register" type="button" style="${authButtonStyle(false)}">
        新規登録
      </button>

      <p id="juken-auth-error" style="min-height:1.4em;color:#ff8b8b;margin:0"></p>
    </div>
  `;

  $("juken-auth-login").onclick = async () => {
    alert("ログインボタン処理に入りました");
    try {
      text("juken-auth-error", "");

      const userId = normalizeLoginId($("juken-auth-user-id")?.value);
      const password = $("juken-auth-password")?.value || "";

      if (!validLoginId(userId)) {
        throw new Error("ユーザーIDは4〜20文字の半角英数字・_・-で入力してください。");
      }

      if (password.length < 6) {
        throw new Error("パスワードは6文字以上です。");
      }

      const result = await signInWithEmailAndPassword(
        auth,
        loginEmailFromId(userId),
        password,
      );

      alert(`ログイン認証成功：${result.user.uid}`);
    } catch (error) {
      text("juken-auth-error", authError(error));
    }
  };

  $("juken-show-register").onclick = () => renderRegisterAuth(root);

  $("juken-auth-password")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") $("juken-auth-login")?.click();
  });
}

function renderRegisterAuth(root) {
  const initialTrack = "humanities";
  const initialSubjects = defaultSelectedSubjects(initialTrack);

  root.innerHTML = `
    <div style="width:min(500px,100%);max-height:92vh;overflow:auto;background:#111827;border:1px solid #263247;border-radius:20px;padding:24px;display:grid;gap:15px">
      <div>
        <h1 style="margin:0 0 5px">冒険者登録</h1>
        <p style="margin:0;color:#aab3c5">受験RPGのプロフィールを作成</p>
      </div>

      <div style="display:grid;gap:7px">
        <label style="font-size:.86rem;color:#aab3c5">ユーザー名</label>
        <input
          id="juken-register-name"
          type="text"
          maxlength="20"
          placeholder="ゲーム内で表示する名前"
          style="${authFieldStyle()}"
        >
      </div>

      <div style="display:grid;gap:7px">
        <label style="font-size:.86rem;color:#aab3c5">ユーザーID</label>
        <input
          id="juken-register-id"
          type="text"
          maxlength="20"
          autocomplete="username"
          placeholder="4〜20文字 / 半角英数字・_・-"
          style="${authFieldStyle()}"
        >
        <small style="color:#7f8ba3">
          ログインとフレンド検索に使います。登録後は変更できません。
        </small>
      </div>

      <div style="display:grid;gap:7px">
        <label style="font-size:.86rem;color:#aab3c5">パスワード</label>
        <input
          id="juken-register-password"
          type="password"
          autocomplete="new-password"
          placeholder="6文字以上"
          style="${authFieldStyle()}"
        >
      </div>

      <div style="display:grid;gap:7px">
        <label style="font-size:.86rem;color:#aab3c5">パスワード確認</label>
        <input
          id="juken-register-password-confirm"
          type="password"
          autocomplete="new-password"
          placeholder="もう一度入力"
          style="${authFieldStyle()}"
        >
      </div>

      <div style="display:grid;gap:8px">
        <label style="font-size:.86rem;color:#aab3c5">文理選択</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button
            type="button"
            data-auth-track="humanities"
            style="${authButtonStyle(true)}"
          >
            文系
          </button>

          <button
            type="button"
            data-auth-track="science"
            style="${authButtonStyle(false)}"
          >
            理系
          </button>
        </div>
        <input id="juken-register-track" type="hidden" value="humanities">
      </div>

      <div style="display:grid;gap:8px">
        <div>
          <b>選択教科</b>
          <p style="font-size:.8rem;color:#8f9aae;margin:4px 0 0">
            あとから設定画面でも変更できます。
          </p>
        </div>

        <div
          id="juken-register-subjects"
          style="display:grid;grid-template-columns:1fr 1fr;gap:7px"
        >
          ${authSubjectOptions(initialSubjects)}
        </div>
      </div>

      <button
        id="juken-auth-register"
        type="button"
        style="${authButtonStyle(true)}"
      >
        登録して始める
      </button>

      <button
        id="juken-back-login"
        type="button"
        style="${authButtonStyle(false)}"
      >
        ログインへ戻る
      </button>

      <p id="juken-auth-error" style="min-height:1.4em;color:#ff8b8b;margin:0"></p>
    </div>
  `;

  function setTrack(track) {
    $("juken-register-track").value = track;

    $$("[data-auth-track]").forEach((button) => {
      button.style.cssText = authButtonStyle(button.dataset.authTrack === track);
    });

    const recommended = defaultSelectedSubjects(track);

    $$("[data-auth-subject]").forEach((checkbox) => {
      checkbox.checked = recommended.includes(checkbox.value);
    });
  }

  $$("[data-auth-track]").forEach((button) => {
    button.onclick = () => setTrack(button.dataset.authTrack);
  });

  $("juken-back-login").onclick = () => renderLoginAuth(root);

  $("juken-auth-register").onclick = async () => {
    try {
      text("juken-auth-error", "");

      const username = $("juken-register-name")?.value.trim() || "";
      const globalId = normalizeLoginId($("juken-register-id")?.value);
      const password = $("juken-register-password")?.value || "";
      const confirmPassword = $("juken-register-password-confirm")?.value || "";
      const track = $("juken-register-track")?.value || "humanities";
      const selectedSubjects = $$("[data-auth-subject]:checked")
        .map((checkbox) => checkbox.value)
        .filter((id) => SUBJECT_BY_ID[id]);

      if (!username || username.length > 20) {
        throw new Error("ユーザー名は1〜20文字で入力してください。");
      }

      if (!validLoginId(globalId)) {
        throw new Error("ユーザーIDは4〜20文字の半角英数字・_・-で入力してください。");
      }

      if (password.length < 6) {
        throw new Error("パスワードは6文字以上です。");
      }

      if (password !== confirmPassword) {
        throw new Error("確認用パスワードが一致しません。");
      }

      if (!selectedSubjects.length) {
        throw new Error("教科を最低1つ選択してください。");
      }

      pendingRegistration = {
        username,
        globalId,
        track,
        selectedSubjects: uniq(selectedSubjects),
      };

      const credential = await createUserWithEmailAndPassword(
        auth,
        loginEmailFromId(globalId),
        password,
      );

      const initial = normalizeProfile(
        {
          ...defaultProfile(credential.user),
          username,
          globalId,
          track,
          selectedSubjects: uniq(selectedSubjects),
        },
        credential.user,
      );

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          ...initial,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      pendingRegistration = null;
    } catch (error) {
      pendingRegistration = null;
      console.error("REGISTER ERROR", error);
      text("juken-auth-error", authError(error));
    }
  };
}

function ensureAuthOverlay() {
  let root = $("juken-auth-overlay");
  if (root) return root;

  root = document.createElement("div");
  root.id = "juken-auth-overlay";
  root.style.cssText = `
    position:fixed;
    inset:0;
    z-index:99999;
    background:#080b12;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:24px;
    color:#fff;
  `;

  document.body.appendChild(root);
  renderLoginAuth(root);
  return root;
}

function authError(error) {
  if (error instanceof Error && !String(error.message).includes("Firebase")) {
    return error.message;
  }

  const code = error?.code || "";

  const map = {
    "auth/invalid-credential": "ユーザーIDかパスワードが違います。",
    "auth/user-not-found": "ユーザーIDかパスワードが違います。",
    "auth/wrong-password": "ユーザーIDかパスワードが違います。",
    "auth/email-already-in-use": "このユーザーIDはすでに使用されています。",
    "auth/weak-password": "パスワードは6文字以上にしてください。",
    "auth/invalid-email": "ユーザーIDの形式を確認してください。",
    "auth/too-many-requests": "試行回数が多すぎます。少し時間を置いてください。",
    "auth/network-request-failed": "通信に失敗しました。ネット接続を確認してください。",
    "auth/operation-not-allowed": "Firebase Authenticationでメール/パスワード認証が有効になっていません。",
  };

  return map[code] || `認証に失敗しました：${error?.message || code}`;
}

// ============================================================
// Boot / period resets
// ============================================================

async function loadProfile() {
  const snap = await getDoc(userRef());
  profile = normalizeProfile(snap.exists() ? snap.data() : null, currentUser);
  if (!snap.exists()) await saveProfile({ createdAt: serverTimestamp() });
}

async function handleLoginDay() {
  const today = jstDateKey();
  if (profile.lastLoginDate === today) return;
  profile.lastLoginDate = today;
  profile.loginDates = uniq([...(profile.loginDates || []), today]);
  profile.loginDays = profile.loginDates.length;
  await saveProfile();
}

async function handleSeasonReset() {
  const nowSeason = jstMonthKey();
  if (profile.currentSeason === nowSeason) return;

  if (profile.currentSeason) {
    await setDoc(doc(db, "users", currentUser.uid, "seasonRecords", profile.currentSeason), {
      seasonId: profile.currentSeason,
      studyMinutes: n(profile.seasonStudyMinutes),
      finalRank: rankFromMinutes(profile.seasonStudyMinutes).name,
      claimedRankIds: profile.seasonClaimedRankIds || [],
      closedAt: serverTimestamp(),
    }, { merge: true });
  }

  profile.currentSeason = nowSeason;
  profile.seasonStudyMinutes = 0;
  profile.seasonClaimedRankIds = [];
  await saveProfile();
}

async function loadSubjects() {
  subjectState = {};
  const snap = await getDocs(collection(db, "users", currentUser.uid, "subjects"));
  snap.forEach((d) => {
    const raw = d.data();
    subjectState[d.id] = {
      subjectId: d.id,
      totalMinutes: Math.max(0, Math.floor(n(raw.totalMinutes))),
      level: subjectLevel(raw.totalMinutes),
    };
  });
  for (const id of profile.selectedSubjects) {
    if (!subjectState[id]) subjectState[id] = { subjectId: id, totalMinutes: 0, level: 1 };
  }
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seedText) {
  let seed = hashString(seedText) || 1;
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedSubject(rng) {
  const ids = profile.selectedSubjects.filter((id) => SUBJECT_BY_ID[id]);
  if (!ids.length) return null;
  const weights = ids.map((id) => 1 / Math.max(1, n(subjectState[id]?.level, 1)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < ids.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return ids[i];
  }
  return ids.at(-1);
}

function createDailyQuest(rng, slot) {
  const durations = [15, 30, 45, 60];
  const target = durations[Math.floor(rng() * durations.length)];
  const hasSubject = rng() < 0.55;
  return {
    id: `daily-${jstDateKey()}-${slot}`,
    type: "daily",
    targetMinutes: target,
    subjectId: hasSubject ? weightedSubject(rng) : null,
    progress: 0,
    claimed: false,
    rewardXp: DAILY_REWARDS[target].xp,
    rewardCoins: DAILY_REWARDS[target].coins,
  };
}

function rareForDay(dateKey) {
  const rng = seededRandom(`rare-${dateKey}`);
  if (rng() >= 0.05) return null;
  const target = rng() < 0.5 ? 120 : 180;
  return {
    id: `rare-${dateKey}`,
    type: "rare",
    targetMinutes: target,
    subjectId: null,
    progress: 0,
    claimed: false,
    rewardXp: target === 120 ? 1000 : 2000,
    rewardCoins: target === 120 ? 2500 : 5000,
    rewardItemCount: target === 120 ? 2 : 3,
    dayXpBonus: target === 180 ? 0.5 : 0,
  };
}

function freshQuestState() {
  const date = jstDateKey();
  const rng = seededRandom(`${currentUser.uid}-${date}`);
  const daily = [0, 1, 2].map((slot) => createDailyQuest(rng, slot));
  const rare = rareForDay(date);
  let rareSlot = -1;
  if (rare) {
    rareSlot = Math.floor(rng() * 3);
    daily[rareSlot] = rare;
  }
  return {
    date,
    weekId: mondayKey(),
    daily,
    rareSlot,
    replaceUsed: false,
    weekly: {
      id: `weekly-${mondayKey()}`,
      type: "weekly",
      targetMinutes: 600,
      progress: 0,
      claimed: false,
      rewardXp: 1000,
      rewardCoins: 2500,
      rewardItemCount: 1,
    },
  };
}

async function loadQuestState() {
  const snap = await getDoc(questRef());
  if (!snap.exists()) {
    questState = freshQuestState();
    await saveQuestState();
    return;
  }
  questState = snap.data();
  const today = jstDateKey();
  if (questState.date !== today) {
    const oldWeekly = questState.weekId === mondayKey() ? questState.weekly : null;
    questState = freshQuestState();
    if (oldWeekly) questState.weekly = oldWeekly;
    await saveQuestState();
  } else if (questState.weekId !== mondayKey()) {
    questState.weekId = mondayKey();
    questState.weekly = freshQuestState().weekly;
    await saveQuestState();
  }
}

async function loadActiveTimer() {
  const snap = await getDoc(timerRef());
  activeTimer = snap.exists() ? snap.data() : null;
  if (activeTimer && !["running", "paused", "confirming"].includes(activeTimer.status)) activeTimer = null;
  startTimerTickerIfNeeded();
}

async function loadTodayRecords() {
  todayRecords = [];
  const snap = await getDocs(query(
    collection(db, "users", currentUser.uid, "studyRecords"),
    where("date", "==", jstDateKey()),
  ));
  snap.forEach((d) => todayRecords.push({ id: d.id, ...d.data() }));
}

function friendPairId(a, b) {
  return [a, b].sort().join("__");
}

async function loadFriends() {
  currentFriends = [];
  pendingFriendRequests = [];

  const friendDocs = await getDocs(query(collection(db, "friends"), where("participants", "array-contains", currentUser.uid)));
  for (const d of friendDocs.docs) {
    const data = d.data();
    if (data.status !== "accepted") continue;
    const otherUid = data.participants.find((id) => id !== currentUser.uid);
    if (!otherUid) continue;
    const userSnap = await getDoc(doc(db, "users", otherUid));
    if (userSnap.exists()) currentFriends.push({ uid: otherUid, relationId: d.id, ...normalizePublicUser(userSnap.data()) });
  }

  const incoming = await getDocs(query(collection(db, "friendRequests"), where("to", "==", currentUser.uid), where("status", "==", "pending")));
  for (const d of incoming.docs) {
    const data = d.data();
    const userSnap = await getDoc(doc(db, "users", data.from));
    pendingFriendRequests.push({ id: d.id, from: data.from, user: userSnap.exists() ? normalizePublicUser(userSnap.data()) : null });
  }
}

function normalizePublicUser(raw) {
  return {
    globalId: raw.globalId || raw.userId || "-",
    username: raw.username || raw.displayName || "冒険者",
    level: n(raw.level, levelFromXp(raw.xp)),
    xp: n(raw.xp),
    stars: n(raw.stars),
    track: raw.track || raw.course || "-",
    seasonStudyMinutes: n(raw.seasonStudyMinutes),
    equippedTitleId: raw.equippedTitleId || raw.title || "",
  };
}

async function loadParty() {
  currentParty = null;
  partyInvites = [];

  const parties = await getDocs(query(collection(db, "parties"), where("memberIds", "array-contains", currentUser.uid)));
  if (!parties.empty) currentParty = { id: parties.docs[0].id, ...parties.docs[0].data() };

  const invites = await getDocs(query(collection(db, "partyInvites"), where("to", "==", currentUser.uid), where("status", "==", "pending")));
  for (const d of invites.docs) partyInvites.push({ id: d.id, ...d.data() });

  if (currentParty) await ensurePartyCycleState();
}

async function ensurePartyCycleState() {
  if (!currentParty) return;
  const cycle = currentPartyCycle();
  if (currentParty.cycleId !== cycle.cycleId) {
    await deleteDoc(doc(db, "parties", currentParty.id)).catch(() => {});
    currentParty = null;
    return;
  }
  if (currentParty.phase !== cycle.phase) {
    currentParty.phase = cycle.phase;
    if (cycle.phase === "boss" && !currentParty.boss) {
      currentParty.boss = await createBossForParty(currentParty);
    }
    await setDoc(doc(db, "parties", currentParty.id), currentParty, { merge: true });
  }
}

async function createBossForParty(party) {
  const memberLevels = [];
  for (const memberId of party.memberIds || []) {
    const snap = await getDoc(doc(db, "users", memberId));
    if (snap.exists()) memberLevels.push(bossLevelForPlayer(normalizeProfile(snap.data(), { uid: memberId, email: "" })));
  }
  const avg = memberLevels.length ? memberLevels.reduce((a, b) => a + b, 0) / memberLevels.length : bossLevelForPlayer();
  const level = clamp(Math.round(avg) + n(party.bossLevelAdjustment), 1, 10);
  const members = clamp((party.memberIds || []).length, 1, 10);
  const maxHp = Math.round(BOSS_HP[level] * PARTY_HP_MULT[members]);
  const rng = seededRandom(`${party.id}-${party.cycleId}`);
  const system = BOSS_SYSTEMS[Math.floor(rng() * BOSS_SYSTEMS.length)];
  return {
    name: `${SYSTEM_LABELS[system]}の試練`,
    system,
    level,
    maxHp,
    hp: maxHp,
    damageByUser: {},
    weaknessSubjects: [],
    defeated: false,
    defeatedAt: null,
    rewardClaimedBy: [],
  };
}

async function boot(user) {
  currentUser = user;
  $("juken-auth-overlay")?.remove();
  setLoading("データを読み込んでいます...", true);
  await loadProfile();
  await handleSeasonReset();
  await handleLoginDay();
  await loadSubjects();
  await loadQuestState();
  await loadActiveTimer();
  await loadTodayRecords();
  await loadFriends().catch((e) => console.warn("friends:", e));
  await loadParty().catch((e) => console.warn("party:", e));
  await evaluateTitles(false);
  renderAll();
  navigate(currentPage, false);
  setLoading("", false);
}

// ============================================================
// Timer / boosts
// ============================================================

function timerElapsedSeconds() {
  if (!activeTimer) return 0;
  let sec = Math.max(0, n(activeTimer.elapsedSeconds));
  if (activeTimer.status === "running") {
    sec += Math.max(0, Math.floor((Date.now() - n(activeTimer.lastStartedAt, Date.now())) / 1000));
  }
  return sec;
}

function timerBoostMultiplierAtMinute(minuteIndex, boosts = activeTimer?.boosts || []) {
  return boosts.reduce((mult, boost) => {
    const duration = boost.duration === null ? Infinity : n(boost.duration, Infinity);
    return minuteIndex < duration ? mult * n(boost.multiplier, 1) : mult;
  }, 1);
}

function calculateTimerXp(studyMinutes, boosts = activeTimer?.boosts || []) {
  let xp = 0;
  for (let i = 0; i < studyMinutes; i += 1) xp += timerBoostMultiplierAtMinute(i, boosts);
  return Math.floor(xp);
}

function displayedTimerMultiplier() {
  const minute = Math.floor(timerElapsedSeconds() / 60);
  return timerBoostMultiplierAtMinute(minute);
}

async function startTimer() {
  if (activeTimer) {
    toast("進行中のタイマーがあります。", "error");
    return;
  }
  const subjectId = $("timer-subject")?.value;
  if (!subjectId || !profile.selectedSubjects.includes(subjectId)) {
    toast("教科を選択してください。", "error");
    return;
  }

  const prepared = uniq(profile.preparedXpBoosts).filter((id) => XP_ITEMS.some((x) => x.id === id));
  const boosts = prepared.map((id) => {
    const item = XP_ITEMS.find((x) => x.id === id);
    return { id: item.id, name: item.name, multiplier: item.multiplier, duration: Number.isFinite(item.duration) ? item.duration : null };
  });

  activeTimer = {
    sessionId: randomId("session"),
    status: "running",
    subjectId,
    startedAt: Date.now(),
    lastStartedAt: Date.now(),
    elapsedSeconds: 0,
    boosts,
  };
  profile.preparedXpBoosts = [];
  await Promise.all([saveTimerState(), saveProfile()]);
  startTimerTickerIfNeeded();
  renderTimer();
}

async function pauseTimer() {
  if (!activeTimer || activeTimer.status !== "running") return;
  activeTimer.elapsedSeconds = timerElapsedSeconds();
  activeTimer.status = "paused";
  delete activeTimer.lastStartedAt;
  stopTimerTicker();
  await saveTimerState();
  renderTimer();
}

async function resumeTimer() {
  if (!activeTimer || activeTimer.status !== "paused") return;
  activeTimer.status = "running";
  activeTimer.lastStartedAt = Date.now();
  await saveTimerState();
  startTimerTickerIfNeeded();
  renderTimer();
}

async function endTimer() {
  if (!activeTimer) return;
  activeTimer.elapsedSeconds = timerElapsedSeconds();
  activeTimer.status = "confirming";
  delete activeTimer.lastStartedAt;
  stopTimerTicker();
  await saveTimerState();
  renderTimer();
}

async function cancelStudy() {
  if (!activeTimer) return;
  if (!window.confirm("この勉強記録を破棄しますか？ 報酬は入りません。")) return;
  activeTimer = null;
  stopTimerTicker();
  await saveTimerState();
  renderTimer();
}

function startTimerTickerIfNeeded() {
  stopTimerTicker();
  if (activeTimer?.status === "running") {
    timerTicker = window.setInterval(renderTimer, 1000);
  }
}

function stopTimerTicker() {
  if (timerTicker) window.clearInterval(timerTicker);
  timerTicker = null;
}

function renderTimer() {
  const setup = $("timer-setup");
  const main = $("timer-main");
  const confirm = $("timer-confirmation");
  if (!setup || !main || !confirm) return;

  setup.classList.add("hidden");
  main.classList.add("hidden");
  confirm.classList.add("hidden");

  if (!activeTimer) {
    setup.classList.remove("hidden");
    text("timer-status", "待機中");
    return;
  }

  const sec = timerElapsedSeconds();
  const min = Math.floor(sec / 60);
  const expected = calculateTimerXp(min);
  text("timer-display", formatTimerSeconds(sec));
  text("timer-current-subject", SUBJECT_BY_ID[activeTimer.subjectId]?.name || "-");
  text("timer-expected-xp", `${expected} XP`);
  text("timer-xp-multiplier", `×${displayedTimerMultiplier().toFixed(2)}`);

  const boosts = $("timer-boost-list");
  if (boosts) {
    boosts.innerHTML = activeTimer.boosts?.length
      ? activeTimer.boosts.map((b) => `<span class="boost-chip">${escapeHtml(b.name)} ×${b.multiplier}</span>`).join("")
      : `<span class="muted-text">ブーストなし</span>`;
  }

  if (activeTimer.status === "confirming") {
    confirm.classList.remove("hidden");
    text("confirm-study-time", formatTimerSeconds(sec));
    text("confirm-subject", SUBJECT_BY_ID[activeTimer.subjectId]?.name || "-");
    text("confirm-base-xp", `${min} XP`);
    const averageMultiplier = min > 0 ? calculateTimerXp(min) / min : 1;
    text("confirm-xp-multiplier", `×${averageMultiplier.toFixed(2)}`);
    text("confirm-earned-xp", `${calculateTimerXp(min)} XP`);
    text("confirm-boss-damage", currentBossDamage(activeTimer.subjectId, min).damage.toLocaleString());
    return;
  }

  main.classList.remove("hidden");
  const paused = activeTimer.status === "paused";
  text("timer-status", paused ? "一時停止中" : "勉強中");
  const pauseButton = $("timer-pause");
  if (pauseButton) {
    pauseButton.textContent = paused ? "再開" : "一時停止";
    pauseButton.dataset.action = paused ? "resume-timer" : "pause-timer";
  }
}

// ============================================================
// Central study confirmation engine
// ============================================================

function currentBossDamage(subjectId, studyMinutes) {
  const boss = currentParty?.boss;
  if (!currentParty || currentParty.phase !== "boss" || !boss || boss.defeated) return { damage: 0, weakness: false };
  const subject = SUBJECT_BY_ID[subjectId];
  const systemWeakness = subject?.system === boss.system;
  const extraWeakness = (boss.weaknessSubjects || []).includes(subjectId);
  const weakness = systemWeakness || extraWeakness;
  return { damage: Math.floor(studyMinutes * (weakness ? 150 : 100)), weakness };
}

function updateStreakForStudy() {
  const today = jstDateKey();
  if (profile.lastStudyDate === today) return;
  if (profile.lastStudyDate && addJstDays(profile.lastStudyDate, 1) === today) profile.consecutiveStudyDays = n(profile.consecutiveStudyDays) + 1;
  else profile.consecutiveStudyDays = 1;
  profile.lastStudyDate = today;
}

function todayStudyMinutes() {
  return todayRecords.reduce((sum, r) => sum + n(r.minutes), 0);
}

function todayEarnedXp() {
  return todayRecords.reduce((sum, r) => sum + n(r.totalEarnedXp, r.earnedXp), 0);
}

function todaySubjectMinutes(subjectId) {
  return todayRecords.filter((r) => r.subjectId === subjectId).reduce((sum, r) => sum + n(r.minutes), 0);
}

function addInventory(id, count = 1) {
  profile.inventory[id] = Math.max(0, Math.floor(n(profile.inventory[id])) + count);
  if (profile.inventory[id] <= 0) delete profile.inventory[id];
}

function grantRandomItems(count, seedText) {
  const pool = [...XP_ITEMS, ...BOSS_ITEMS];
  const rng = seededRandom(seedText);
  const results = [];
  for (let i = 0; i < count; i += 1) {
    const item = pool[Math.floor(rng() * pool.length)];
    addInventory(item.id, 1);
    results.push(item.id);
  }
  return results;
}

function applyQuestProgress(studyMinutes, subjectId, preRecordDayXp) {
  const results = [];
  let bonusXp = 0;
  let bonusCoins = 0;
  const itemRewards = [];

  for (const q of questState.daily || []) {
    if (q.claimed) continue;
    if (q.subjectId && q.subjectId !== subjectId) continue;
    q.progress = Math.min(q.targetMinutes, n(q.progress) + studyMinutes);
    if (q.progress < q.targetMinutes) continue;

    q.claimed = true;
    bonusXp += n(q.rewardXp);
    bonusCoins += n(q.rewardCoins);
    const result = { id: q.id, type: q.type, cleared: true, xp: n(q.rewardXp), coins: n(q.rewardCoins), items: [] };

    if (q.type === "rare") {
      const items = grantRandomItems(n(q.rewardItemCount), `${currentUser.uid}-${q.id}`);
      itemRewards.push(...items);
      result.items = items;
      if (n(q.dayXpBonus) > 0) {
        const dayBonus = Math.floor(preRecordDayXp * n(q.dayXpBonus));
        bonusXp += dayBonus;
        result.dayXpBonus = dayBonus;
      }
      profile.rareHistory.push({ date: jstDateKey(), targetMinutes: q.targetMinutes });
      profile.rareHistory = profile.rareHistory.slice(-20);
    }
    results.push(result);
  }

  const weekly = questState.weekly;
  let weeklyResult = null;
  if (weekly && !weekly.claimed) {
    weekly.progress = Math.min(weekly.targetMinutes, n(weekly.progress) + studyMinutes);
    if (weekly.progress >= weekly.targetMinutes) {
      weekly.claimed = true;
      bonusXp += n(weekly.rewardXp);
      bonusCoins += n(weekly.rewardCoins);
      const items = grantRandomItems(n(weekly.rewardItemCount), `${currentUser.uid}-${weekly.id}`);
      itemRewards.push(...items);
      weeklyResult = { cleared: true, xp: weekly.rewardXp, coins: weekly.rewardCoins, items };
    }
  }

  return { results, weeklyResult, bonusXp, bonusCoins, itemRewards };
}

function applyRankRewards(beforeMinutes, afterMinutes) {
  let xp = 0;
  let coins = 0;
  const reached = [];
  profile.seasonClaimedRankIds = uniq(profile.seasonClaimedRankIds);
  for (const rank of RANKS) {
    if (afterMinutes < rank.min || profile.seasonClaimedRankIds.includes(rank.id)) continue;
    if (rank.min === 0 && afterMinutes <= 0) continue;
    profile.seasonClaimedRankIds.push(rank.id);
    xp += rank.xp;
    coins += rank.coins;
    reached.push(rank.name);
    if (rank.titleId) unlockTitle(rank.titleId);
  }
  return { xp, coins, reached };
}

async function applyBossDamageToParty(subjectId, studyMinutes) {
  const preview = currentBossDamage(subjectId, studyMinutes);
  if (!currentParty || preview.damage <= 0) return { damage: 0, weakness: false, defeated: false };

  const boss = currentParty.boss;
  const beforeHp = n(boss.hp, boss.maxHp);
  boss.hp = Math.max(0, beforeHp - preview.damage);
  boss.damageByUser = boss.damageByUser || {};
  boss.damageByUser[currentUser.uid] = n(boss.damageByUser[currentUser.uid]) + preview.damage;
  if (preview.weakness) profile.bossStats.weakHits = n(profile.bossStats.weakHits) + 1;
  if (n(profile.bossStats.participation) === 0 || n(boss.damageByUser[currentUser.uid]) === preview.damage) profile.bossStats.participation = n(profile.bossStats.participation) + 1;

  let defeatedNow = false;
  if (boss.hp <= 0 && !boss.defeated) {
    boss.defeated = true;
    boss.defeatedAt = Date.now();
    defeatedNow = true;
    await resolveBossDefeatRewards();
  }

  await setDoc(doc(db, "parties", currentParty.id), { boss, updatedAt: serverTimestamp() }, { merge: true });
  return { damage: preview.damage, weakness: preview.weakness, defeated: defeatedNow };
}

async function resolveBossDefeatRewards() {
  const boss = currentParty?.boss;
  if (!boss || !boss.defeated) return;
  const damageMap = boss.damageByUser || {};
  const entries = Object.entries(damageMap).sort((a, b) => b[1] - a[1]);
  const maxDamageUid = entries[0]?.[0] || null;
  const members = currentParty.memberIds || [];

  for (const memberId of members) {
    const damage = n(damageMap[memberId]);
    if (damage <= 0) continue;
    const snap = await getDoc(doc(db, "users", memberId));
    if (!snap.exists()) continue;
    const raw = snap.data();
    const base = bossBaseReward(boss.level);
    const contribution = clamp(damage / boss.maxHp, 0, 1);
    const rewardXp = Math.round(base.xp * (1 + 0.6 * contribution));
    const rewardCoins = Math.round(base.coins * (1 + 0.6 * contribution));
    const owned = uniq(raw.ownedTitles || []);
    const stats = { participation: 0, defeats: 0, weakHits: 0, soloDefeats: 0, mvp: 0, defeatedSystems: [], defeatedLv10Systems: [], ...(raw.bossStats || {}) };
    stats.defeats = n(stats.defeats) + 1;
    stats.defeatedSystems = uniq([...(stats.defeatedSystems || []), boss.system]);
    if (boss.level === 10) stats.defeatedLv10Systems = uniq([...(stats.defeatedLv10Systems || []), boss.system]);
    if (members.length === 1) stats.soloDefeats = n(stats.soloDefeats) + 1;
    if (memberId === maxDamageUid) stats.mvp = n(stats.mvp) + 1;
    if (boss.level === 10) {
      const title = BOSS_TITLES.find((x) => x.system === boss.system);
      if (title) owned.push(title.id);
    }
    await setDoc(doc(db, "users", memberId), {
      xp: n(raw.xp) + rewardXp,
      level: levelFromXp(n(raw.xp) + rewardXp),
      coins: n(raw.coins) + rewardCoins,
      lifetimeCoinsEarned: n(raw.lifetimeCoinsEarned) + rewardCoins,
      ownedTitles: uniq(owned),
      bossStats: stats,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  const ownSnap = await getDoc(userRef());
  if (ownSnap.exists()) profile = normalizeProfile(ownSnap.data(), currentUser);
}

async function confirmStudy() {
  if (!activeTimer || activeTimer.status !== "confirming") return;
  const snapshot = { ...activeTimer, boosts: [...(activeTimer.boosts || [])] };
  const sec = Math.floor(n(snapshot.elapsedSeconds));
  const studyMinutes = Math.floor(sec / 60);
  if (studyMinutes < 1) {
    toast("1分以上勉強してから確定してください。", "error");
    return;
  }
  if (!profile.selectedSubjects.includes(snapshot.subjectId)) {
    toast("選択教科が無効です。設定を確認してください。", "error");
    return;
  }

  setLoading("勉強記録を保存しています...", true);
  try {
    const recordId = snapshot.sessionId || randomId("study");
    const existing = await getDoc(recordRef(recordId));
    if (existing.exists()) {
      activeTimer = null;
      await saveTimerState();
      toast("この勉強はすでに保存済みです。", "info");
      await loadTodayRecords();
      renderAll();
      return;
    }

    const beforeXp = profile.xp;
    const beforeLevel = profile.level;
    const beforeSeason = profile.seasonStudyMinutes;
    const beforeRank = rankFromMinutes(beforeSeason).name;
    const beforeSubjectLevel = subjectLevel(subjectState[snapshot.subjectId]?.totalMinutes || 0);
    const timerXp = calculateTimerXp(studyMinutes, snapshot.boosts);
    const dayXpBefore = todayEarnedXp() + timerXp;

    profile.xp += timerXp;
    profile.totalStudyMinutes += studyMinutes;
    profile.seasonStudyMinutes += studyMinutes;
    updateStreakForStudy();

    const sub = subjectState[snapshot.subjectId] || { subjectId: snapshot.subjectId, totalMinutes: 0, level: 1 };
    sub.totalMinutes += studyMinutes;
    sub.level = subjectLevel(sub.totalMinutes);
    subjectState[snapshot.subjectId] = sub;

    const questRewards = applyQuestProgress(studyMinutes, snapshot.subjectId, dayXpBefore);
    profile.xp += questRewards.bonusXp;
    profile.coins += questRewards.bonusCoins;
    profile.lifetimeCoinsEarned += questRewards.bonusCoins;

    const rankRewards = applyRankRewards(beforeSeason, profile.seasonStudyMinutes);
    profile.xp += rankRewards.xp;
    profile.coins += rankRewards.coins;
    profile.lifetimeCoinsEarned += rankRewards.coins;
    profile.level = levelFromXp(profile.xp);

    const bossResult = await applyBossDamageToParty(snapshot.subjectId, studyMinutes);
    await evaluateTitles(false);

    const totalEarnedXp = timerXp + questRewards.bonusXp + rankRewards.xp;
    const totalEarnedCoins = questRewards.bonusCoins + rankRewards.coins;
    const record = {
      id: recordId,
      subjectId: snapshot.subjectId,
      minutes: studyMinutes,
      seconds: sec,
      date: jstDateKey(),
      startedAt: snapshot.startedAt,
      endedAt: Date.now(),
      baseXp: studyMinutes,
      xpBoosts: snapshot.boosts,
      earnedXp: timerXp,
      questXp: questRewards.bonusXp,
      rankXp: rankRewards.xp,
      totalEarnedXp,
      earnedCoins: totalEarnedCoins,
      bossDamage: bossResult.damage,
      bossWeakness: bossResult.weakness,
      bossDefeated: bossResult.defeated,
      dailyQuestResults: questRewards.results,
      weeklyQuestResult: questRewards.weeklyResult,
      rankBefore: beforeRank,
      rankAfter: rankFromMinutes(profile.seasonStudyMinutes).name,
      rankRewards,
      playerLevelBefore: beforeLevel,
      playerLevelAfter: profile.level,
      subjectLevelBefore: beforeSubjectLevel,
      subjectLevelAfter: sub.level,
      levelUp: profile.level > beforeLevel,
      source: "timer",
      idempotencyKey: recordId,
      createdAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(recordRef(recordId), record);
    batch.set(subjectRef(snapshot.subjectId), { ...sub, updatedAt: serverTimestamp() }, { merge: true });
    batch.set(questRef(), { ...questState, updatedAt: serverTimestamp() }, { merge: true });
    batch.set(userRef(), { ...profile, updatedAt: serverTimestamp() }, { merge: true });
    batch.delete(timerRef());
    await batch.commit();

    activeTimer = null;
    todayRecords.push({ ...record, createdAt: Date.now() });
    await evaluateTitles(true);
    renderAll();

    const parts = [`${studyMinutes}分記録`, `+${totalEarnedXp}XP`];
    if (totalEarnedCoins) parts.push(`+${totalEarnedCoins}コイン`);
    if (profile.level > beforeLevel) parts.push(`Lv.${profile.level}到達！`);
    if (bossResult.damage) parts.push(`${bossResult.damage.toLocaleString()}DMG`);
    toast(parts.join(" / "), "success");
  } catch (error) {
    console.error(error);
    toast(`保存に失敗しました：${error.message}`, "error");
  } finally {
    setLoading("", false);
  }
}

// ============================================================
// Titles / achievements
// ============================================================

function unlockTitle(id) {
  if (!TITLE_BY_ID[id]) return false;
  if (profile.ownedTitles.includes(id)) return false;
  profile.ownedTitles.push(id);
  profile.ownedTitles = uniq(profile.ownedTitles);
  return true;
}

function normalTitleCount() {
  return profile.ownedTitles.filter((id) => id.startsWith("normal-")).length;
}

function selectedSubjectStats() {
  return profile.selectedSubjects.map((id) => ({ id, minutes: n(subjectState[id]?.totalMinutes), level: subjectLevel(subjectState[id]?.totalMinutes || 0) }));
}

function hasStudiedAllBossSystems() {
  const systems = new Set();
  for (const s of profile.selectedSubjects) if (n(subjectState[s]?.totalMinutes) > 0 && BOSS_SYSTEMS.includes(SUBJECT_BY_ID[s]?.system)) systems.add(SUBJECT_BY_ID[s].system);
  return BOSS_SYSTEMS.every((x) => systems.has(x));
}

function isHumanitiesScienceBothStudied() {
  let humanities = false;
  let science = false;
  for (const id of profile.selectedSubjects) {
    if (n(subjectState[id]?.totalMinutes) <= 0) continue;
    if (SUBJECT_BY_ID[id]?.track === "humanities") humanities = true;
    if (SUBJECT_BY_ID[id]?.track === "science") science = true;
  }
  return humanities && science;
}

function consecutiveRare3Count() {
  const list = profile.rareHistory || [];
  if (list.length < 3) return 0;
  const last3 = list.slice(-3);
  return last3.every((x) => x.targetMinutes === 180) ? 3 : 0;
}

async function evaluateTitles(save = true) {
  if (!profile) return;
  const before = new Set(profile.ownedTitles);
  const stats = selectedSubjectStats();
  const level = profile.level;
  const hours = profile.totalStudyMinutes / 60;
  const streak = n(profile.consecutiveStudyDays);
  const coinEarned = n(profile.lifetimeCoinsEarned);
  const itemTypes = Object.keys(profile.inventory || {}).filter((id) => n(profile.inventory[id]) > 0).length;

  const checks = [
    ["normal-01", level >= 5], ["normal-02", level >= 10], ["normal-03", level >= 25], ["normal-04", level >= 50], ["normal-05", level >= 75], ["normal-06", level >= 100 || profile.stars >= 1],
    ["normal-07", hours >= 10], ["normal-08", hours >= 50], ["normal-09", hours >= 100], ["normal-10", hours >= 250], ["normal-11", hours >= 500], ["normal-12", hours >= 1000],
    ["normal-13", streak >= 3], ["normal-14", streak >= 7], ["normal-15", streak >= 14], ["normal-16", streak >= 30], ["normal-17", streak >= 60], ["normal-18", streak >= 100],
    ["normal-19", hasStudiedAllBossSystems()], ["normal-20", isHumanitiesScienceBothStudied()],
    ["normal-23", stats.filter((s) => s.minutes >= 600).length >= 5],
    ["normal-24", n(profile.bossStats.participation) >= 1], ["normal-25", n(profile.bossStats.defeats) >= 1], ["normal-26", n(profile.bossStats.weakHits) >= 1], ["normal-27", n(profile.bossStats.soloDefeats) >= 1], ["normal-28", n(profile.bossStats.mvp) >= 1], ["normal-29", (profile.bossStats.defeatedLv10Systems || []).length >= 1], ["normal-30", (profile.bossStats.defeatedSystems || []).length >= 5],
    ["normal-31", coinEarned >= 10000], ["normal-32", coinEarned >= 50000], ["normal-33", coinEarned >= 100000],
    ["normal-34", itemTypes >= 5], ["normal-35", itemTypes >= 10], ["normal-36", n(profile.shopPurchaseCount) >= 1], ["normal-39", n(profile.loginDays) >= 30],
  ];

  if (stats.length) {
    const levels = stats.map((s) => s.level);
    const minLv = Math.min(...levels);
    const maxLv = Math.max(...levels);
    checks.push(["normal-21", stats.some((s) => s.level === minLv && s.minutes >= 600)]);
    checks.push(["normal-22", stats.some((s) => s.level === maxLv && s.minutes >= 600)]);
  }

  for (const [id, condition] of checks) if (condition) unlockTitle(id);
  if (normalTitleCount() >= 10) unlockTitle("normal-37");
  if (normalTitleCount() >= 20) unlockTitle("normal-38");
  if (normalTitleCount() >= 30) unlockTitle("normal-40");

  const todayMinutes = todayStudyMinutes();
  const todayXp = todayEarnedXp();
  const allSelectedLv50 = stats.length > 0 && stats.every((s) => s.level >= 50);
  const dailyAll = (questState?.daily || []).every((q) => q.claimed);
  const lowestLevel = stats.length ? Math.min(...stats.map((s) => s.level)) : 1;
  const lowIds = stats.filter((s) => s.level === lowestLevel).map((s) => s.id);
  const lowToday = lowIds.reduce((sum, id) => sum + todaySubjectMinutes(id), 0);
  const threeKindsToday = todayRecords.some((r) => n(r.totalEarnedXp) > 0) && todayRecords.some((r) => n(r.earnedCoins) > 0) && Object.keys(profile.inventory || {}).length > 0;

  if ((profile.stars >= 1 || level >= 100) && rankFromMinutes(profile.seasonStudyMinutes).name === "Legend" && (profile.bossStats.defeatedLv10Systems || []).length >= 5) unlockTitle("hidden-01");
  if (todayMinutes >= 600) unlockTitle("hidden-02");
  if (todayXp >= 1000) unlockTitle("hidden-03");
  if (stats.some((s) => todaySubjectMinutes(s.id) >= 300)) unlockTitle("hidden-04");
  if (allSelectedLv50) unlockTitle("hidden-05");
  if (dailyAll) unlockTitle("hidden-06");
  if (threeKindsToday) unlockTitle("hidden-07");
  if (todayMinutes > 0 && lowToday / todayMinutes >= 0.5) unlockTitle("hidden-08");
  if (n(profile.lifetimeCoinsSpent) >= 100000) unlockTitle("hidden-09");
  if (consecutiveRare3Count() >= 3) unlockTitle("hidden-10");

  const newly = profile.ownedTitles.filter((id) => !before.has(id));
  if (save && newly.length) {
    await saveProfile();
    newly.forEach((id) => toast(`称号獲得：${TITLE_BY_ID[id]?.name}`, "success"));
  }
}

// ============================================================
// Quest replacement
// ============================================================

function showQuestReplacementModal() {
  if (questState.replaceUsed) {
    toast("今日の入れ替えは使用済みです。", "error");
    return;
  }
  const buttons = (questState.daily || []).map((q, i) => `
    <button class="modal-action-button" data-replace-slot="${i}" ${q.claimed || q.type === "rare" ? "disabled" : ""}>
      ${q.type === "rare" ? "🌟 " : ""}${q.subjectId ? `${escapeHtml(SUBJECT_BY_ID[q.subjectId]?.name)} / ` : ""}${q.targetMinutes}分
      ${q.claimed ? "（達成済）" : q.type === "rare" ? "（レアは交換不可）" : ""}
    </button>`).join("");
  openModal(`<h2>デイリーを入れ替える</h2><p>今日1回だけ使えます。</p><div class="modal-action-list">${buttons}</div>`);
}

async function replaceQuestSlot(index) {
  if (questState.replaceUsed) return;
  const old = questState.daily[index];
  if (!old || old.claimed || old.type === "rare") return;
  const rng = seededRandom(`${currentUser.uid}-${jstDateKey()}-replace-${index}-${Date.now()}`);
  questState.daily[index] = createDailyQuest(rng, index);
  questState.daily[index].id = `daily-${jstDateKey()}-${index}-replacement`;
  questState.replaceUsed = true;
  await saveQuestState();
  closeModal();
  renderQuests();
  renderHome();
  toast("クエストを入れ替えました。", "success");
}

// ============================================================
// Shop / locker items
// ============================================================

function shopItemById(id) {
  return XP_ITEMS.find((x) => x.id === id) || BOSS_ITEMS.find((x) => x.id === id);
}

async function purchaseItem(id) {
  const item = shopItemById(id);
  if (!item) return;
  if (profile.coins < item.price) {
    toast("コインが足りません。", "error");
    return;
  }
  if (!window.confirm(`${item.name}を${item.price.toLocaleString()}コインで購入しますか？`)) return;
  profile.coins -= item.price;
  profile.lifetimeCoinsSpent += item.price;
  profile.shopPurchaseCount += 1;
  profile.purchasedItemTypes = uniq([...profile.purchasedItemTypes, id]);
  addInventory(id, 1);
  await saveProfile();
  await evaluateTitles(true);
  renderAll();
  toast(`${item.name}を購入しました。`, "success");
}

async function purchaseTitle(id) {
  const title = SHOP_TITLES.find((x) => x.id === id);
  if (!title) return;
  if (profile.ownedTitles.includes(id)) {
    toast("この称号は購入済みです。", "error");
    return;
  }
  if (profile.coins < title.price) {
    toast("コインが足りません。", "error");
    return;
  }
  if (!window.confirm(`${title.name}を${title.price.toLocaleString()}コインで購入しますか？`)) return;
  profile.coins -= title.price;
  profile.lifetimeCoinsSpent += title.price;
  profile.shopPurchaseCount += 1;
  unlockTitle(id);
  await saveProfile();
  await evaluateTitles(true);
  renderAll();
  toast(`称号「${title.name}」を購入しました。`, "success");
}

async function prepareXpItem(id) {
  const item = XP_ITEMS.find((x) => x.id === id);
  if (!item || n(profile.inventory[id]) <= 0) return;
  if (activeTimer) {
    toast("タイマー中はブーストを追加できません。次回開始前に使ってください。", "error");
    return;
  }
  if (profile.preparedXpBoosts.includes(id)) {
    toast("同じブーストはすでにセット済みです。", "error");
    return;
  }
  addInventory(id, -1);
  profile.preparedXpBoosts.push(id);
  await saveProfile();
  renderLocker();
  renderTimer();
  toast(`${item.name}を次のタイマーにセットしました。`, "success");
}

async function useBossItem(id) {
  const item = BOSS_ITEMS.find((x) => x.id === id);
  if (!item || n(profile.inventory[id]) <= 0) return;
  if (!currentParty) {
    toast("パーティーに所属していません。", "error");
    return;
  }
  if (currentParty.phase !== "formation") {
    toast("ボスアイテムは準備期間中のみ使えます。", "error");
    return;
  }
  if (currentParty.leaderId !== currentUser.uid) {
    toast("ボスアイテムを使えるのはリーダーです。", "error");
    return;
  }

  currentParty.bossItemUses = currentParty.bossItemUses || { levelAdjust: 0, weakness: 0 };
  if (["boss-level-up", "boss-level-down"].includes(id)) {
    if (n(currentParty.bossItemUses.levelAdjust) >= 2) {
      toast("Lv調整アイテムはパーティー合計2回までです。", "error");
      return;
    }
    currentParty.bossLevelAdjustment = n(currentParty.bossLevelAdjustment) + (id === "boss-level-up" ? 1 : -1);
    currentParty.bossItemUses.levelAdjust = n(currentParty.bossItemUses.levelAdjust) + 1;
  } else {
    if (n(currentParty.bossItemUses.weakness) >= 1) {
      toast("弱点追加はパーティーで1回までです。", "error");
      return;
    }
    if (id === "boss-weak-select") {
      showWeaknessSelectModal(id);
      return;
    }
    const rng = seededRandom(`${currentParty.id}-weak-item-${Date.now()}`);
    const pool = profile.selectedSubjects;
    currentParty.pendingWeaknessSubject = pool[Math.floor(rng() * pool.length)];
    currentParty.bossItemUses.weakness = 1;
  }

  addInventory(id, -1);
  await Promise.all([
    saveProfile(),
    setDoc(doc(db, "parties", currentParty.id), currentParty, { merge: true }),
  ]);
  renderAll();
  toast(`${item.name}を使用しました。`, "success");
}

function showWeaknessSelectModal(itemId) {
  openModal(`<h2>追加する弱点教科</h2><div class="modal-action-list">${profile.selectedSubjects.map((id) => `<button data-select-weakness="${id}" data-item-id="${itemId}">${escapeHtml(SUBJECT_BY_ID[id]?.name)}</button>`).join("")}</div>`);
}

async function commitSelectedWeakness(subjectId, itemId) {
  if (!currentParty || n(profile.inventory[itemId]) <= 0) return;
  currentParty.bossItemUses = currentParty.bossItemUses || { levelAdjust: 0, weakness: 0 };
  if (n(currentParty.bossItemUses.weakness) >= 1) return;
  currentParty.pendingWeaknessSubject = subjectId;
  currentParty.bossItemUses.weakness = 1;
  addInventory(itemId, -1);
  await Promise.all([saveProfile(), setDoc(doc(db, "parties", currentParty.id), currentParty, { merge: true })]);
  closeModal();
  renderAll();
  toast(`${SUBJECT_BY_ID[subjectId]?.name}を追加弱点に設定しました。`, "success");
}

async function equipTitle(id) {
  if (!profile.ownedTitles.includes(id)) return;
  profile.equippedTitleId = id;
  await saveProfile();
  renderHome();
  renderLocker();
  toast(`「${TITLE_BY_ID[id]?.name}」を装備しました。`, "success");
}

async function reincarnate() {
  if (profile.level < 100) {
    toast("Lv.100に到達すると転生できます。", "error");
    return;
  }
  if (!window.confirm("転生しますか？ Lv.1・XP 0に戻り、⭐を1つ獲得します。ほかの進行は維持されます。")) return;
  profile.stars += 1;
  profile.xp = 0;
  profile.level = 1;
  await saveProfile();
  renderAll();
  toast(`転生完了！ ⭐${profile.stars}`, "success");
}

// ============================================================
// Friends
// ============================================================

async function searchFriendByGlobalId() {
  const input = $("friend-id-input");
  const globalId = input?.value.trim().toUpperCase();
  if (!globalId) {
    toast("ユーザーIDを入力してください。", "error");
    return;
  }
  const snap = await getDocs(query(collection(db, "users"), where("globalId", "==", globalId)));
  if (snap.empty) {
    openModal(`<h2>検索結果</h2><p>ユーザーが見つかりませんでした。</p>`);
    return;
  }
  const d = snap.docs[0];
  if (d.id === currentUser.uid) {
    openModal(`<h2>検索結果</h2><p>これはあなた自身のIDです。</p>`);
    return;
  }
  const u = normalizePublicUser(d.data());
  const already = currentFriends.some((f) => f.uid === d.id);
  openModal(`
    <h2>${escapeHtml(u.username)}</h2>
    <p>${escapeHtml(u.globalId)} / Lv.${u.level} / ${rankFromMinutes(u.seasonStudyMinutes).name}</p>
    <button data-send-friend="${d.id}" ${already ? "disabled" : ""}>${already ? "フレンド済み" : "フレンド申請"}</button>
  `);
}

async function sendFriendRequest(targetUid) {
  if (currentFriends.some((f) => f.uid === targetUid)) return;
  const existing = await getDocs(query(collection(db, "friendRequests"), where("from", "==", currentUser.uid), where("to", "==", targetUid), where("status", "==", "pending")));
  if (!existing.empty) {
    toast("すでに申請中です。", "error");
    return;
  }
  await setDoc(doc(collection(db, "friendRequests")), {
    from: currentUser.uid,
    to: targetUid,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  closeModal();
  toast("フレンド申請を送りました。", "success");
}

async function respondFriendRequest(requestId, accept) {
  const reqRef = doc(db, "friendRequests", requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) return;
  const req = snap.data();
  if (req.to !== currentUser.uid) return;
  if (accept) {
    const pair = friendPairId(req.from, req.to);
    await setDoc(doc(db, "friends", pair), {
      participants: [req.from, req.to],
      status: "accepted",
      createdAt: serverTimestamp(),
    }, { merge: true });
  }
  await deleteDoc(reqRef);
  await loadFriends();
  renderFriends();
  toast(accept ? "フレンドになりました！" : "申請を拒否しました。", accept ? "success" : "info");
}

async function deleteFriend(relationId) {
  if (!window.confirm("このフレンドを削除しますか？")) return;
  await deleteDoc(doc(db, "friends", relationId));
  await loadFriends();
  renderFriends();
  toast("フレンドを削除しました。", "info");
}

function showFriendProfile(uid) {
  const f = currentFriends.find((x) => x.uid === uid);
  if (!f) return;
  const title = TITLE_BY_ID[f.equippedTitleId]?.name || "称号未装備";
  openModal(`
    <h2>${escapeHtml(f.username)}</h2>
    <p>${escapeHtml(title)}</p>
    <div class="profile-detail-grid">
      <div>Lv.<b>${f.level}</b></div>
      <div>XP <b>${f.xp}</b></div>
      <div>⭐ <b>${f.stars}</b></div>
      <div>Rank <b>${rankFromMinutes(f.seasonStudyMinutes).name}</b></div>
      <div>進路 <b>${f.track === "science" ? "理系" : "文系"}</b></div>
    </div>
  `);
}

// ============================================================
// Party
// ============================================================

async function createParty() {
  if (currentParty) {
    toast("すでにパーティーに所属しています。", "error");
    return;
  }
  const cycle = currentPartyCycle();
  if (cycle.phase !== "formation") {
    toast("現在はボス戦期間です。次の準備期間まで新規パーティーは作れません。", "error");
    return;
  }
  const ref = doc(collection(db, "parties"));
  const party = {
    leaderId: currentUser.uid,
    memberIds: [currentUser.uid],
    cycleId: cycle.cycleId,
    phase: "formation",
    boss: null,
    bossLevelAdjustment: 0,
    bossItemUses: { levelAdjust: 0, weakness: 0 },
    pendingWeaknessSubject: null,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, party);
  currentParty = { id: ref.id, ...party };
  renderParty();
  toast("パーティーを作成しました。", "success");
}

async function inviteToParty(friendUid) {
  if (!currentParty || currentParty.leaderId !== currentUser.uid || currentParty.phase !== "formation") return;
  if ((currentParty.memberIds || []).length >= 10) {
    toast("パーティーは最大10人です。", "error");
    return;
  }
  const existing = await getDocs(query(collection(db, "partyInvites"), where("partyId", "==", currentParty.id), where("to", "==", friendUid), where("status", "==", "pending")));
  if (!existing.empty) {
    toast("このフレンドには招待済みです。", "error");
    return;
  }
  await setDoc(doc(collection(db, "partyInvites")), {
    partyId: currentParty.id,
    from: currentUser.uid,
    to: friendUid,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  toast("パーティー招待を送りました。", "success");
}

async function respondPartyInvite(inviteId, accept) {
  const ref = doc(db, "partyInvites", inviteId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const inv = snap.data();
  if (inv.to !== currentUser.uid) return;
  if (!accept) {
    await deleteDoc(ref);
    await loadParty();
    renderParty();
    return;
  }
  if (currentParty) {
    toast("すでにパーティーに所属しています。", "error");
    return;
  }
  const pRef = doc(db, "parties", inv.partyId);
  const pSnap = await getDoc(pRef);
  if (!pSnap.exists()) {
    await deleteDoc(ref);
    toast("パーティーが存在しません。", "error");
    return;
  }
  const p = pSnap.data();
  if (p.phase !== "formation" || (p.memberIds || []).length >= 10) {
    toast("現在このパーティーには参加できません。", "error");
    return;
  }
  p.memberIds = uniq([...(p.memberIds || []), currentUser.uid]);
  await Promise.all([setDoc(pRef, { memberIds: p.memberIds, updatedAt: serverTimestamp() }, { merge: true }), deleteDoc(ref)]);
  await loadParty();
  renderParty();
  toast("パーティーに参加しました！", "success");
}

async function leaveParty() {
  if (!currentParty) return;
  if (currentParty.phase !== "formation") {
    toast("ボス戦期間中は脱退できません。", "error");
    return;
  }
  if (currentParty.leaderId === currentUser.uid) {
    toast("リーダーは脱退できません。解散してください。", "error");
    return;
  }
  const memberIds = (currentParty.memberIds || []).filter((id) => id !== currentUser.uid);
  await setDoc(doc(db, "parties", currentParty.id), { memberIds, updatedAt: serverTimestamp() }, { merge: true });
  currentParty = null;
  renderAll();
  toast("パーティーを脱退しました。", "info");
}

async function disbandParty() {
  if (!currentParty || currentParty.leaderId !== currentUser.uid) return;
  if (currentParty.phase !== "formation") {
    toast("ボス戦期間中は解散できません。", "error");
    return;
  }
  if (!window.confirm("パーティーを解散しますか？")) return;
  await deleteDoc(doc(db, "parties", currentParty.id));
  currentParty = null;
  renderAll();
  toast("パーティーを解散しました。", "info");
}

async function removePartyMember(uid) {
  if (!currentParty || currentParty.leaderId !== currentUser.uid || currentParty.phase !== "formation" || uid === currentUser.uid) return;
  currentParty.memberIds = currentParty.memberIds.filter((id) => id !== uid);
  await setDoc(doc(db, "parties", currentParty.id), { memberIds: currentParty.memberIds, updatedAt: serverTimestamp() }, { merge: true });
  renderParty();
}

// ============================================================
// Settings
// ============================================================

async function updateUsername() {
  openModal(`
    <h2>ユーザー名変更</h2>
    <input id="modal-username" maxlength="20" value="${escapeHtml(profile.username)}">
    <button id="modal-save-username">保存</button>
  `);
}

async function saveUsernameFromModal() {
  const value = $("modal-username")?.value.trim();
  if (!value || value.length > 20) {
    toast("1〜20文字で入力してください。", "error");
    return;
  }
  profile.username = value;
  await saveProfile();
  closeModal();
  renderAll();
  toast("ユーザー名を変更しました。", "success");
}

function openTrackSettings() {
  openModal(`
    <h2>文理選択</h2>
    <div class="modal-action-list">
      <button data-set-track="humanities">文系</button>
      <button data-set-track="science">理系</button>
    </div>
  `);
}

async function setTrack(track) {
  profile.track = track;
  await saveProfile();
  closeModal();
  renderSettings();
  toast(`${track === "science" ? "理系" : "文系"}に変更しました。`, "success");
}

function openSubjectSettings() {
  openModal(`
    <h2>選択教科</h2>
    <p>勉強する教科を選択してください。</p>
    <div class="subject-check-list">
      ${SUBJECTS.map((s) => `<label><input type="checkbox" data-subject-check value="${s.id}" ${profile.selectedSubjects.includes(s.id) ? "checked" : ""}> ${escapeHtml(s.name)}</label>`).join("")}
    </div>
    <button id="modal-save-subjects">保存</button>
  `);
}

async function saveSubjectsFromModal() {
  const ids = $$('[data-subject-check]:checked').map((el) => el.value).filter((id) => SUBJECT_BY_ID[id]);
  if (!ids.length) {
    toast("最低1教科は選択してください。", "error");
    return;
  }
  profile.selectedSubjects = uniq(ids);
  for (const id of ids) if (!subjectState[id]) subjectState[id] = { subjectId: id, totalMinutes: 0, level: 1 };
  await saveProfile();
  closeModal();
  populateSubjectSelect();
  renderAll();
  toast("選択教科を保存しました。", "success");
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || localStorage.getItem("juken-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("juken-theme", next);
  renderSettings();
}

function showDataManagement() {
  openModal(`
    <h2>データ管理</h2>
    <p>累計勉強：${escapeHtml(formatStudyMinutes(profile.totalStudyMinutes))}</p>
    <p>記録数：${todayRecords.length}（本日）</p>
    <p>称号：${profile.ownedTitles.length} / 76</p>
    <p>現在のシーズン：${escapeHtml(profile.currentSeason)}</p>
    <p class="muted-text">ゲームデータはFirestoreに保存されています。</p>
  `);
}

async function deleteAccountAndData() {
  if (!window.confirm("本当にアカウントを削除しますか？ この操作は取り消せません。")) return;
  if (!window.confirm("最終確認：受験RPGのアカウントを削除します。よろしいですか？")) return;
  try {
    await deleteDoc(userRef());
    await deleteUser(auth.currentUser);
  } catch (error) {
    console.error(error);
    toast(error?.code === "auth/requires-recent-login" ? "安全のため、一度ログアウト→ログインしてから削除してください。" : `削除に失敗しました：${error.message}`, "error");
  }
}

// ============================================================
// Rendering
// ============================================================

function navigate(page, scroll = true) {
  const target = $(`page-${page}`);
  if (!target) return;
  currentPage = page;
  $$('[id^="page-"]').forEach((el) => el.classList.add("hidden"));
  target.classList.remove("hidden");
  $$(".nav-item[data-page]").forEach((el) => el.classList.toggle("active", el.dataset.page === page));
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  if (page === "friend") renderFriends();
  if (page === "shop") renderShop();
  if (page === "locker") renderLocker();
  if (page === "titles") renderTitles();
  if (page === "settings") renderSettings();
}

function titleName(id) {
  return TITLE_BY_ID[id]?.name || "称号未装備";
}

function renderHeader() {
  text("header-username", profile.username);
  text("header-level", `Lv.${profile.level}`);
}

function renderHome() {
  if (!profile) return;
  const progress = playerLevelProgress(profile.xp);
  const rank = rankFromMinutes(profile.seasonStudyMinutes);
  text("home-player-name", profile.username);
  text("home-player-title", titleName(profile.equippedTitleId));
  text("home-player-level", `Lv.${progress.level}`);
  text("home-xp-text", progress.level >= 100 ? "MAX LEVEL" : `${Math.floor(progress.current)} / ${progress.required} XP`);
  setWidth("home-xp-bar", progress.percent);
  text("home-rank", rank.name);
  text("home-season-time", formatStudyMinutes(profile.seasonStudyMinutes));
  text("home-coins", profile.coins.toLocaleString());
  text("home-stars", `⭐${profile.stars}`);
  text("today-study-time", formatStudyMinutes(todayStudyMinutes()));

  const questRoot = $("home-quest-preview-list");
  if (questRoot) {
    questRoot.innerHTML = (questState?.daily || []).map((q) => `
      <div class="quest-preview-item ${q.claimed ? "completed" : ""}">
        <span>${q.type === "rare" ? "🌟 " : ""}${q.subjectId ? `${escapeHtml(SUBJECT_BY_ID[q.subjectId]?.name)} / ` : ""}${q.targetMinutes}分</span>
        <b>${q.claimed ? "CLEAR" : `${Math.floor(n(q.progress))}/${q.targetMinutes}`}</b>
      </div>`).join("");
  }
  renderHomeBoss();
  renderSubjectSummaryIntoHome();
}

function renderSubjectSummaryIntoHome() {
  let root = $("js-subject-level-section");
  if (!root) {
    root = document.createElement("section");
    root.id = "js-subject-level-section";
    root.className = "home-section js-generated-section";
    const anchor = $("home-boss-section");
    if (anchor?.parentElement) anchor.parentElement.insertBefore(root, anchor.nextSibling);
    else $("page-home")?.appendChild(root);
  }
  root.innerHTML = `
    <div class="section-header"><h2>教科別レベル</h2><span>45分 = Lv.+1</span></div>
    <div class="subject-summary-list">
      ${profile.selectedSubjects.map((id) => {
        const state = subjectState[id] || { totalMinutes: 0, level: 1 };
        return `<div class="subject-summary-row"><span>${escapeHtml(SUBJECT_BY_ID[id]?.name)}</span><b>Lv.${subjectLevel(state.totalMinutes)}</b><small>${formatStudyMinutes(state.totalMinutes)}</small></div>`;
      }).join("")}
    </div>`;
}

function renderHomeBoss() {
  const section = $("home-boss-section");
  if (!section) return;
  const cycle = currentPartyCycle();
  if (!currentParty) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  if (cycle.phase === "formation" || !currentParty.boss) {
    text("home-boss-status", "準備期間");
    text("home-boss-name", "次週のボス戦に備えよう");
    text("home-boss-level", `メンバー ${currentParty.memberIds?.length || 1}/10`);
    text("home-boss-hp-text", "ボスは次週出現");
    setWidth("home-boss-hp-bar", 100);
    return;
  }
  const boss = currentParty.boss;
  text("home-boss-status", boss.defeated ? "討伐済み！" : "ボス戦期間");
  text("home-boss-name", boss.name);
  text("home-boss-level", `Lv.${boss.level}`);
  text("home-boss-hp-text", `${Math.max(0, boss.hp).toLocaleString()} / ${boss.maxHp.toLocaleString()}`);
  setWidth("home-boss-hp-bar", boss.maxHp ? (boss.hp / boss.maxHp) * 100 : 0);
}

function questCard(q) {
  return `
    <article class="quest-card ${q.claimed ? "completed" : ""}">
      <div class="quest-card-head"><b>${q.type === "rare" ? "🌟 レアクエスト" : q.type === "weekly" ? "ウィークリー" : "デイリー"}</b><span>${q.claimed ? "CLEAR" : ""}</span></div>
      <p>${q.subjectId ? `${escapeHtml(SUBJECT_BY_ID[q.subjectId]?.name)}を ` : ""}${q.targetMinutes}分勉強</p>
      <div class="quest-progress"><span>${Math.floor(n(q.progress))} / ${q.targetMinutes}分</span></div>
      <small>報酬：${n(q.rewardXp).toLocaleString()}XP / ${n(q.rewardCoins).toLocaleString()}🪙${q.rewardItemCount ? ` / アイテム×${q.rewardItemCount}` : ""}</small>
    </article>`;
}

function renderQuests() {
  if (!questState) return;
  const daily = $("daily-quest-list");
  if (daily) daily.innerHTML = questState.daily.filter((q) => q.type !== "rare").map(questCard).join("") || `<p class="empty-state">通常デイリーなし</p>`;
  const rare = $("rare-quest-list");
  const rareQuest = questState.daily.find((q) => q.type === "rare");
  if (rare) rare.innerHTML = rareQuest ? questCard(rareQuest) : `<p class="empty-state">今日はレアクエストなし</p>`;
  const weekly = $("weekly-quest-list");
  if (weekly) weekly.innerHTML = questCard(questState.weekly);
  renderBossPage();
}

function renderBossPage() {
  const root = $("boss-page-content");
  if (!root) return;
  const cycle = currentPartyCycle();
  if (!currentParty) {
    root.innerHTML = `<div class="empty-state"><h3>パーティー未所属</h3><p>フレンド → パーティーから作成・参加できます。</p></div>`;
    return;
  }
  if (cycle.phase === "formation" || !currentParty.boss) {
    root.innerHTML = `
      <div class="boss-card preparation">
        <h2>準備期間</h2>
        <p>今週はパーティー結成・招待・ボスアイテム使用期間です。</p>
        <p>メンバー：${currentParty.memberIds?.length || 1}/10</p>
        <p>ボス戦は次週開始します。</p>
      </div>`;
    return;
  }
  const boss = currentParty.boss;
  const ownDamage = n(boss.damageByUser?.[currentUser.uid]);
  const systemSubjects = SUBJECTS.filter((s) => s.system === boss.system).map((s) => s.name).join("・");
  root.innerHTML = `
    <div class="boss-card ${boss.defeated ? "defeated" : ""}">
      <h2>${boss.defeated ? "討伐済み！" : escapeHtml(boss.name)}</h2>
      <p>Boss Lv.${boss.level}</p>
      <div class="boss-hp-text">HP ${Math.max(0, boss.hp).toLocaleString()} / ${boss.maxHp.toLocaleString()}</div>
      <div class="progress-bar"><div style="width:${boss.maxHp ? clamp((boss.hp / boss.maxHp) * 100, 0, 100) : 0}%"></div></div>
      <p>系統弱点：${escapeHtml(SYSTEM_LABELS[boss.system])}（${escapeHtml(systemSubjects)}）</p>
      ${boss.weaknessSubjects?.length ? `<p>追加弱点：${boss.weaknessSubjects.map((id) => escapeHtml(SUBJECT_BY_ID[id]?.name)).join("・")}</p>` : ""}
      <p>自分のダメージ：${ownDamage.toLocaleString()}</p>
      <div class="boss-damage-ranking">
        ${Object.entries(boss.damageByUser || {}).sort((a, b) => b[1] - a[1]).map(([uid, dmg], i) => `<div><span>${i + 1}. ${uid === currentUser.uid ? escapeHtml(profile.username) : escapeHtml(uid.slice(0, 8))}</span><b>${n(dmg).toLocaleString()} DMG</b></div>`).join("") || "<p>まだダメージ記録はありません。</p>"}
      </div>
    </div>`;
}

function populateSubjectSelect() {
  const select = $("timer-subject");
  if (!select || !profile) return;
  const current = select.value;
  select.innerHTML = `<option value="">教科を選択</option>${profile.selectedSubjects.map((id) => `<option value="${id}">${escapeHtml(SUBJECT_BY_ID[id]?.name)}</option>`).join("")}`;
  if (profile.selectedSubjects.includes(current)) select.value = current;
}

function renderFriends() {
  const requests = $("friend-request-list");
  if (requests) requests.innerHTML = pendingFriendRequests.length ? pendingFriendRequests.map((r) => `
    <div class="friend-card">
      <div><b>${escapeHtml(r.user?.username || "ユーザー")}</b><small>${escapeHtml(r.user?.globalId || "")}</small></div>
      <div class="button-row"><button data-friend-accept="${r.id}">承認</button><button data-friend-reject="${r.id}">拒否</button></div>
    </div>`).join("") : `<p class="empty-state">フレンド申請はありません。</p>`;
  const list = $("friend-list");
  if (list) list.innerHTML = currentFriends.length ? currentFriends.map((f) => `
    <div class="friend-card">
      <button class="friend-profile-button" data-friend-profile="${f.uid}"><b>${escapeHtml(f.username)}</b><span>Lv.${f.level} / ${rankFromMinutes(f.seasonStudyMinutes).name}</span></button>
      <button data-delete-friend="${f.relationId}" class="danger-text">削除</button>
    </div>`).join("") : `<p class="empty-state">まだフレンドはいません。</p>`;
  renderParty();
}

async function partyMemberName(uid) {
  if (uid === currentUser.uid) return profile.username;
  const friend = currentFriends.find((f) => f.uid === uid);
  if (friend) return friend.username;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? normalizePublicUser(snap.data()).username : uid.slice(0, 8);
}

function renderParty() {
  const root = $("party-page-content");
  if (!root) return;
  const cycle = currentPartyCycle();
  if (!currentParty) {
    root.innerHTML = `
      <div class="party-empty">
        <h2>${cycle.phase === "formation" ? "パーティーを作ろう" : "現在はボス戦期間"}</h2>
        <p>${cycle.phase === "formation" ? "最大10人。フレンドを招待して次週のボスに挑もう。" : "新規パーティー作成は次の準備期間から。"}</p>
        ${cycle.phase === "formation" ? `<button id="js-create-party">パーティー作成</button>` : ""}
        ${partyInvites.length ? `<h3>招待</h3>${partyInvites.map((inv) => `<div class="party-invite"><span>${escapeHtml(inv.partyId)}</span><button data-party-invite-accept="${inv.id}">参加</button><button data-party-invite-reject="${inv.id}">拒否</button></div>`).join("")}` : ""}
      </div>`;
    return;
  }

  const leader = currentParty.leaderId === currentUser.uid;
  root.innerHTML = `
    <div class="party-card">
      <div class="party-phase-badge">${currentParty.phase === "formation" ? "準備期間" : "ボス戦期間"}</div>
      <h2>パーティー</h2>
      <p>${currentParty.memberIds?.length || 1}/10人</p>
      <div id="js-party-member-list"></div>
      ${currentParty.phase === "formation" && leader ? `<h3>フレンドを招待</h3><div>${currentFriends.filter((f) => !currentParty.memberIds.includes(f.uid)).map((f) => `<button data-party-invite="${f.uid}">${escapeHtml(f.username)}</button>`).join("") || "<p>招待できるフレンドがいません。</p>"}</div>` : ""}
      <div class="button-row">
        ${currentParty.phase === "formation" && !leader ? `<button id="js-leave-party">脱退</button>` : ""}
        ${currentParty.phase === "formation" && leader ? `<button id="js-disband-party" class="danger-text">解散</button>` : ""}
      </div>
      ${currentParty.phase === "boss" ? `<p>ボス戦参加後は周期終了までメンバー固定です。</p>` : `<p>次週にメンバーが固定され、ボス戦が始まります。</p>`}
    </div>`;

  Promise.all((currentParty.memberIds || []).map(async (uid) => ({ uid, name: await partyMemberName(uid) }))).then((members) => {
    const list = $("js-party-member-list");
    if (!list) return;
    list.innerHTML = members.map((m) => `<div class="party-member-row"><span>${m.uid === currentParty.leaderId ? "👑 " : ""}${escapeHtml(m.name)}</span>${leader && currentParty.phase === "formation" && m.uid !== currentUser.uid ? `<button data-remove-party-member="${m.uid}">外す</button>` : ""}</div>`).join("");
  });
}

function renderShop() {
  text("shop-coins", profile.coins.toLocaleString());
  const xp = $("shop-xp-list");
  if (xp) xp.innerHTML = XP_ITEMS.map((item) => `
    <article class="shop-item-card"><div><b>${escapeHtml(item.name)}</b><p>${escapeHtml(item.description)}</p></div><div><span>${item.price.toLocaleString()} 🪙</span><button data-buy-item="${item.id}">購入</button></div></article>`).join("");
  const boss = $("shop-boss-list");
  if (boss) boss.innerHTML = BOSS_ITEMS.map((item) => `
    <article class="shop-item-card"><div><b>${escapeHtml(item.name)}</b><p>${escapeHtml(item.description)}</p></div><div><span>${item.price.toLocaleString()} 🪙</span><button data-buy-item="${item.id}">購入</button></div></article>`).join("");
  const titles = $("shop-title-list");
  if (titles) titles.innerHTML = SHOP_TITLES.map((item) => `
    <article class="shop-item-card"><div><b>${escapeHtml(item.name)}</b><p>${escapeHtml(item.rarity)}</p></div><div><span>${item.price.toLocaleString()} 🪙</span><button data-buy-title="${item.id}" ${profile.ownedTitles.includes(item.id) ? "disabled" : ""}>${profile.ownedTitles.includes(item.id) ? "購入済" : "購入"}</button></div></article>`).join("");
}

function renderLocker() {
  text("locker-player-name", profile.username);
  text("locker-player-title", titleName(profile.equippedTitleId));
  text("locker-level", `Lv.${profile.level}`);
  text("locker-rank", rankFromMinutes(profile.seasonStudyMinutes).name);
  text("locker-stars", `⭐${profile.stars}`);
  text("locker-xp", `${profile.xp.toLocaleString()} XP`);

  let reincarnateButton = $("js-reincarnate");
  if (!reincarnateButton && $("locker-tab-player")) {
    reincarnateButton = document.createElement("button");
    reincarnateButton.id = "js-reincarnate";
    reincarnateButton.type = "button";
    reincarnateButton.textContent = "転生する";
    $("locker-tab-player").appendChild(reincarnateButton);
  }
  if (reincarnateButton) reincarnateButton.classList.toggle("hidden", profile.level < 100);

  const titleList = $("locker-owned-title-list");
  if (titleList) titleList.innerHTML = profile.ownedTitles.length ? profile.ownedTitles.map((id) => {
    const title = TITLE_BY_ID[id];
    if (!title) return "";
    return `<div class="locker-title-row"><div><b>${escapeHtml(title.name)}</b><small>${escapeHtml(title.rarity)}</small></div><button data-equip-title="${id}" ${profile.equippedTitleId === id ? "disabled" : ""}>${profile.equippedTitleId === id ? "装備中" : "装備"}</button></div>`;
  }).join("") : `<p class="empty-state">所持称号はありません。</p>`;

  const xpItems = $("locker-xp-item-list");
  if (xpItems) xpItems.innerHTML = XP_ITEMS.map((item) => {
    const count = n(profile.inventory[item.id]);
    const prepared = profile.preparedXpBoosts.includes(item.id);
    return `<div class="locker-item-row"><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description)}</small></div><span>×${count}</span><button data-use-xp-item="${item.id}" ${count <= 0 || prepared || activeTimer ? "disabled" : ""}>${prepared ? "セット済" : "使う"}</button></div>`;
  }).join("");

  const bossItems = $("locker-boss-item-list");
  if (bossItems) bossItems.innerHTML = BOSS_ITEMS.map((item) => {
    const count = n(profile.inventory[item.id]);
    const usable = count > 0 && currentParty && currentParty.phase === "formation" && currentParty.leaderId === currentUser.uid;
    return `<div class="locker-item-row"><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description)}</small></div><span>×${count}</span><button data-use-boss-item="${item.id}" ${usable ? "" : "disabled"}>使う</button></div>`;
  }).join("");
}

function renderTitles() {
  text("title-obtained-count", profile.ownedTitles.length);
  text("title-total-count", 76);
  const root = $("all-title-list");
  if (!root) return;
  root.innerHTML = ALL_TITLES.map((title) => {
    const owned = profile.ownedTitles.includes(title.id);
    const condition = title.category === "hidden" || (title.category === "boss" && !owned) ? "条件非公開" : title.condition;
    return `<article class="title-card ${owned ? "owned" : "locked"}"><div><b>${owned ? "🏆" : "🔒"} ${escapeHtml(title.name)}</b><small>${escapeHtml(title.rarity)}</small></div><p>${escapeHtml(condition)}</p><span>${owned ? "獲得済み" : "未獲得"}</span></article>`;
  }).join("");
}

function renderSettings() {
  text("setting-username-value", profile.username);
  text("setting-global-id", profile.globalId);
  text("setting-track-value", profile.track === "science" ? "理系" : "文系");
  text("setting-theme-value", (document.documentElement.dataset.theme || "dark") === "light" ? "ライト" : "ダーク");
}

function showRankModal() {
  const current = rankFromMinutes(profile.seasonStudyMinutes);
  const index = RANKS.findIndex((r) => r.id === current.id);
  const next = RANKS[index + 1];
  openModal(`
    <h2>${escapeHtml(current.name)}</h2>
    <p>今月：${escapeHtml(formatStudyMinutes(profile.seasonStudyMinutes))}</p>
    <p>${next ? `次の${escapeHtml(next.name)}まであと${escapeHtml(formatStudyMinutes(Math.max(0, next.min - profile.seasonStudyMinutes)))}` : "最高ランク到達！"}</p>
    <div class="rank-list">
      ${RANKS.map((r) => `<div class="rank-row ${profile.seasonStudyMinutes >= r.min ? "reached" : ""}"><b>${escapeHtml(r.name)}</b><span>${r.min / 60}h</span><small>${r.xp.toLocaleString()}XP / ${r.coins.toLocaleString()}🪙</small></div>`).join("")}
    </div>`);
}

function renderAll() {
  if (!profile) return;
  renderHeader();
  renderHome();
  renderQuests();
  renderTimer();
  renderFriends();
  renderShop();
  renderLocker();
  renderTitles();
  renderSettings();
  populateSubjectSelect();
}

// ============================================================
// Tabs / event delegation
// ============================================================

function setTopTab(selector, value, prefix) {
  $$(selector).forEach((button) => button.classList.toggle("active", button.dataset[Object.keys(button.dataset)[0]] === value));
  const map = {
    quest: ["quest", "boss"],
    friend: ["friend", "party"],
    shop: ["xp", "boss", "titles"],
    locker: ["player", "titles", "items"],
    lockerItems: ["xp", "boss"],
  };
  for (const key of map[prefix] || []) $(`${prefix === "lockerItems" ? "locker-items" : `${prefix}-tab`}-${key}`)?.classList.toggle("hidden", key !== value);
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const nav = event.target.closest(".nav-item[data-page]");
    if (nav) return navigate(nav.dataset.page);

    const back = event.target.closest("[data-back-page]");
    if (back) return navigate(back.dataset.backPage);

    const other = event.target.closest("[data-other-page]");
    if (other) return navigate(other.dataset.otherPage);

    const questTab = event.target.closest("[data-quest-tab]");
    if (questTab) {
      $$("[data-quest-tab]").forEach((x) => x.classList.toggle("active", x === questTab));
      $("quest-tab-quest")?.classList.toggle("hidden", questTab.dataset.questTab !== "quest");
      $("quest-tab-boss")?.classList.toggle("hidden", questTab.dataset.questTab !== "boss");
      return;
    }

    const friendTab = event.target.closest("[data-friend-tab]");
    if (friendTab) {
      $$("[data-friend-tab]").forEach((x) => x.classList.toggle("active", x === friendTab));
      $("friend-tab-friend")?.classList.toggle("hidden", friendTab.dataset.friendTab !== "friend");
      $("friend-tab-party")?.classList.toggle("hidden", friendTab.dataset.friendTab !== "party");
      return;
    }

    const shopTab = event.target.closest("[data-shop-tab]");
    if (shopTab) {
      $$("[data-shop-tab]").forEach((x) => x.classList.toggle("active", x === shopTab));
      ["xp", "boss", "titles"].forEach((key) => $(`shop-tab-${key}`)?.classList.toggle("hidden", shopTab.dataset.shopTab !== key));
      return;
    }

    const lockerTab = event.target.closest("[data-locker-tab]");
    if (lockerTab) {
      $$("[data-locker-tab]").forEach((x) => x.classList.toggle("active", x === lockerTab));
      ["player", "titles", "items"].forEach((key) => $(`locker-tab-${key}`)?.classList.toggle("hidden", lockerTab.dataset.lockerTab !== key));
      return;
    }

    const lockerItemsTab = event.target.closest("[data-locker-items-tab]");
    if (lockerItemsTab) {
      $$("[data-locker-items-tab]").forEach((x) => x.classList.toggle("active", x === lockerItemsTab));
      ["xp", "boss"].forEach((key) => $(`locker-items-${key}`)?.classList.toggle("hidden", lockerItemsTab.dataset.lockerItemsTab !== key));
      return;
    }

    if (event.target.closest("#home-start-study")) return navigate("timer");
    if (event.target.closest("#home-view-quests")) return navigate("quest");
    if (event.target.closest("#home-view-boss")) {
      navigate("quest");
      $("quest-tab-boss")?.classList.remove("hidden");
      $("quest-tab-quest")?.classList.add("hidden");
      return;
    }
    if (event.target.closest("#home-rank")) return showRankModal();
    if (event.target.closest("#modal-close")) return closeModal();

    if (event.target.closest("#timer-start")) return startTimer();
    if (event.target.closest('[data-action="pause-timer"]') || event.target.closest("#timer-pause")?.dataset.action === "pause-timer") return pauseTimer();
    if (event.target.closest('[data-action="resume-timer"]') || event.target.closest("#timer-pause")?.dataset.action === "resume-timer") return resumeTimer();
    if (event.target.closest("#timer-end")) return endTimer();
    if (event.target.closest("#confirm-study")) return confirmStudy();
    if (event.target.closest("#cancel-study")) return cancelStudy();

    if (event.target.closest("#replace-daily-quest")) return showQuestReplacementModal();
    const replace = event.target.closest("[data-replace-slot]");
    if (replace) return replaceQuestSlot(Number(replace.dataset.replaceSlot));

    if (event.target.closest("#friend-search-button")) return searchFriendByGlobalId();
    const sendFriend = event.target.closest("[data-send-friend]");
    if (sendFriend) return sendFriendRequest(sendFriend.dataset.sendFriend);
    const acceptFriend = event.target.closest("[data-friend-accept]");
    if (acceptFriend) return respondFriendRequest(acceptFriend.dataset.friendAccept, true);
    const rejectFriend = event.target.closest("[data-friend-reject]");
    if (rejectFriend) return respondFriendRequest(rejectFriend.dataset.friendReject, false);
    const delFriend = event.target.closest("[data-delete-friend]");
    if (delFriend) return deleteFriend(delFriend.dataset.deleteFriend);
    const friendProfile = event.target.closest("[data-friend-profile]");
    if (friendProfile) return showFriendProfile(friendProfile.dataset.friendProfile);

    if (event.target.closest("#js-create-party")) return createParty();
    const partyInvite = event.target.closest("[data-party-invite]");
    if (partyInvite) return inviteToParty(partyInvite.dataset.partyInvite);
    const partyAccept = event.target.closest("[data-party-invite-accept]");
    if (partyAccept) return respondPartyInvite(partyAccept.dataset.partyInviteAccept, true);
    const partyReject = event.target.closest("[data-party-invite-reject]");
    if (partyReject) return respondPartyInvite(partyReject.dataset.partyInviteReject, false);
    if (event.target.closest("#js-leave-party")) return leaveParty();
    if (event.target.closest("#js-disband-party")) return disbandParty();
    const removeMember = event.target.closest("[data-remove-party-member]");
    if (removeMember) return removePartyMember(removeMember.dataset.removePartyMember);

    const buyItem = event.target.closest("[data-buy-item]");
    if (buyItem) return purchaseItem(buyItem.dataset.buyItem);
    const buyTitle = event.target.closest("[data-buy-title]");
    if (buyTitle) return purchaseTitle(buyTitle.dataset.buyTitle);
    const xpItem = event.target.closest("[data-use-xp-item]");
    if (xpItem) return prepareXpItem(xpItem.dataset.useXpItem);
    const bossItem = event.target.closest("[data-use-boss-item]");
    if (bossItem) return useBossItem(bossItem.dataset.useBossItem);
    const weak = event.target.closest("[data-select-weakness]");
    if (weak) return commitSelectedWeakness(weak.dataset.selectWeakness, weak.dataset.itemId);
    const equip = event.target.closest("[data-equip-title]");
    if (equip) return equipTitle(equip.dataset.equipTitle);
    if (event.target.closest("#js-reincarnate")) return reincarnate();

    if (event.target.closest("#edit-player-card") || event.target.closest("#setting-username")) return updateUsername();
    if (event.target.closest("#modal-save-username")) return saveUsernameFromModal();
    if (event.target.closest("#setting-track")) return openTrackSettings();
    const setTrackButton = event.target.closest("[data-set-track]");
    if (setTrackButton) return setTrack(setTrackButton.dataset.setTrack);
    if (event.target.closest("#setting-subjects")) return openSubjectSettings();
    if (event.target.closest("#modal-save-subjects")) return saveSubjectsFromModal();
    if (event.target.closest("#setting-theme")) return toggleTheme();
    if (event.target.closest("#setting-data")) return showDataManagement();
    if (event.target.closest("#copy-global-id")) {
      await navigator.clipboard.writeText(profile.globalId).catch(() => {});
      toast("Global IDをコピーしました。", "success");
      return;
    }
    if (event.target.closest("#setting-logout")) return signOut(auth);
    if (event.target.closest("#setting-delete-account")) return deleteAccountAndData();
  });

  $("modal-overlay")?.addEventListener("click", (event) => {
    if (event.target === $("modal-overlay")) closeModal();
  });
}

// ============================================================
// Runtime style helpers
// ============================================================

function injectRuntimeStyles() {
  if ($("juken-runtime-style")) return;
  const style = document.createElement("style");
  style.id = "juken-runtime-style";
  style.textContent = `
    #juken-auth-overlay input,#juken-auth-overlay button{font:inherit}
    .toast{opacity:0;transform:translateY(8px);transition:.2s;padding:11px 14px;border-radius:12px;background:#182235;color:#fff;margin-top:8px;box-shadow:0 8px 28px #0005}
    .toast.show{opacity:1;transform:none}
    .toast-success{border:1px solid #39d98a}
    .toast-error{border:1px solid #ff6b6b}
    .modal-action-list,.subject-check-list{display:grid;gap:10px;margin:14px 0}
    .subject-check-list{max-height:55vh;overflow:auto}
    .subject-check-list label{padding:10px;border:1px solid #ffffff18;border-radius:10px}
    .subject-summary-list,.rank-list,.boss-damage-ranking{display:grid;gap:8px}
    .subject-summary-row,.rank-row,.party-member-row,.locker-item-row,.locker-title-row,.friend-card{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:10px;
      border:1px solid #ffffff14;
      border-radius:10px
    }
    .subject-summary-row small{opacity:.65}
    .rank-row.reached{border-color:#57d4ff88}
    .shop-item-card,.quest-card,.title-card,.boss-card,.party-card,.party-empty{
      padding:14px;
      border:1px solid #ffffff16;
      border-radius:14px;
      margin-bottom:10px
    }
    .shop-item-card{
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:center
    }
    .shop-item-card p,.quest-card p{margin:6px 0}
    .title-card.locked{opacity:.62}
    .button-row{display:flex;gap:8px;flex-wrap:wrap}
    .boost-chip{
      display:inline-block;
      padding:5px 8px;
      border-radius:999px;
      background:#ffffff10;
      margin:3px
    }
    .empty-state,.muted-text{opacity:.65}
    .danger-text{color:#ff8585}
    .profile-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .js-generated-section{margin-top:14px}
  `;
  document.head.appendChild(style);
}

// ============================================================
// Start
// ============================================================

bindEvents();
injectRuntimeStyles();

const storedTheme = localStorage.getItem("juken-theme") || "dark";
document.documentElement.dataset.theme = storedTheme;

onAuthStateChanged(auth, async (user) => {
  stopTimerTicker();

  if (!user) {
    currentUser = null;
    profile = null;
    setLoading("", false);
    ensureAuthOverlay();
    return;
  }

  try {
    await boot(user);
  } catch (error) {
    console.error("BOOT ERROR", error);
    setLoading("", false);

    ensureAuthOverlay();
    const root = $("juken-auth-overlay");
    if (root) {
      renderLoginAuth(root);
      const errorEl = $("juken-auth-error");
      if (errorEl) {
        errorEl.textContent = `起動エラー：${error?.message || error}`;
      }
    }
  }
});

// ============================================================
// Debug / maintenance API
// ============================================================

window.JukenRPG = {
  getProfile: () => profile,
  getSubjects: () => subjectState,
  getQuests: () => questState,
  getTimer: () => activeTimer,
  getParty: () => currentParty,
  renderAll,
  navigate,
  evaluateTitles,
  levelFromXp,
  rankFromMinutes,
  subjectLevel,
}