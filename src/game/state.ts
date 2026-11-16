// ゲーム状態・時間経過ロジック（純粋関数 + localStorage）

export const MAX_LEVEL = 4;
export const STORAGE_KEY = 'untaneko-save-v2';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const MAX_ELAPSED = 3 * DAY;

export type GrowthStage = 'baby' | 'adult';
export type AdultVariant = 'adult_a' | 'adult_b' | 'adult_c';
export type CharacterId = 'baby' | AdultVariant;
export type ShellColor = 'pink' | 'mint' | 'lavender' | 'yellow' | 'blue';

export const ADULT_VARIANTS: {
  id: AdultVariant;
  name: string;
  badge: string;
  hint: string;
}[] = [
  {
    id: 'adult_a',
    name: 'うんたねこ',
    badge: '🐱 うんたねこ',
    hint: 'バランスよく育てると出会える王道うんたねこ',
  },
  {
    id: 'adult_b',
    name: 'ふくよかうんた',
    badge: '🍙 ふくよか',
    hint: 'ごはんやおやつをいっぱい食べてモチモチに育った姿',
  },
  {
    id: 'adult_c',
    name: 'ふと眉うんた',
    badge: '🤨 ふと眉',
    hint: 'しつけやミニゲームでキリッと立派な太眉に育った姿',
  },
];

export function getAdultVariantInfo(variant: AdultVariant = 'adult_a') {
  return ADULT_VARIANTS.find((v) => v.id === variant) ?? ADULT_VARIANTS[0];
}

export interface GameState {
  startedAt: number;
  lastTick: number;
  hunger: number; // 0-4
  happy: number; // 0-4
  poop: number; // 0-3
  sleeping: boolean;
  hungerAcc: number;
  happyAcc: number;
  poopAcc: number;
  partnerName: string;
  birthday: string; // "MM-DD"
  birthdayShownYear: number;
  soundOn: boolean;
  hapticOn: boolean; // ★ 触覚振動 ON/OFF
  stage: GrowthStage;
  adultType: AdultVariant; // ★ おとな期の進化分岐 (3種類)
  careCount: number; // お世話累積ポイント
  shellColor: ShellColor;
  // ★ 本物のたまごっち育成システム追加
  sick: boolean; // びょうき（しょんぼり・頭上ぐるぐる/ドクロ）
  calling: boolean; // わがまま呼び出し（かまってベル）
  discipline: number; // しつけ・おりこう度 (0-4)
  // ★ 世代交代（何代目）＆ 歴代コレクション記録
  generation: number; // 1代目, 2代目...
  evolvedAtCare: number; // おとな進化時の careCount
  unlockedAdults: AdultVariant[]; // 出会ったことのあるおとな形態一覧
}

export function createInitial(now: number): GameState {
  return {
    startedAt: now,
    lastTick: now,
    hunger: 3,
    happy: 3,
    poop: 0,
    sleeping: false,
    hungerAcc: 0,
    happyAcc: 0,
    poopAcc: 0,
    partnerName: 'きみ',
    birthday: '',
    birthdayShownYear: 0,
    soundOn: true,
    hapticOn: true,
    stage: 'baby',
    adultType: 'adult_a',
    careCount: 0,
    shellColor: 'pink',
    sick: false,
    calling: false,
    discipline: 1,
    generation: 1,
    evolvedAtCare: 0,
    unlockedAdults: [],
  };
}

/**
 * べび期からおとな期へ進化する際、完全ランダム（1/3ずつ）で3種類のうちどのうんたねこに育つか決定
 */
export function chooseEvolutionType(_s?: GameState): AdultVariant {
  const variants: AdultVariant[] = ['adult_a', 'adult_b', 'adult_c'];
  return variants[Math.floor(Math.random() * variants.length)];
}

export function loadState(now: number): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...createInitial(now), ...(JSON.parse(raw) as Partial<GameState>) };
    }
  } catch (e) {
    console.error('load failed', e);
  }
  return createInitial(now);
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('save failed', e);
  }
}

export function isNight(date: Date): boolean {
  const h = date.getHours();
  return h >= 22 || h < 5;
}

/** 経過時間ぶん、おなか・ごきげん・うんち・びょうきを進める */
export function advance(s: GameState, now: number): GameState {
  let dt = now - s.lastTick;
  if (dt === 0) return s;
  if (dt < 0) return { ...s, lastTick: now };
  dt = Math.min(dt, MAX_ELAPSED);

  const night = isNight(new Date(now));
  const hungerInt = s.sleeping ? 120 * MIN : s.stage === 'baby' ? 35 * MIN : 45 * MIN;
  let happyInt = s.sleeping ? 180 * MIN : night ? 25 * MIN : 50 * MIN;
  if (s.poop > 0 && !s.sleeping) happyInt *= 0.7;
  const poopRate = s.sleeping ? 1 / 300 : 1 / 100;

  let { hunger, happy, poop, hungerAcc, happyAcc, poopAcc, sick, calling } = s;

  // うんちが3個たまったまま15分以上放置されていたら「びょうき」になる
  if (poop >= 3 && dt >= 15 * MIN) {
    sick = true;
  }

  hungerAcc += dt;
  while (hungerAcc >= hungerInt) {
     hunger = Math.max(0, hunger - 1);
    hungerAcc -= hungerInt;
  }
  if (hunger === 0) hungerAcc = 0;

  happyAcc += dt;
  while (happyAcc >= happyInt) {
    happy = Math.max(0, happy - 1);
    happyAcc -= happyInt;
  }
  if (happy === 0) happyAcc = 0;

  poopAcc += dt;
  while (poopAcc >= MIN) {
    poopAcc -= MIN;
    if (poop < 3 && Math.random() < poopRate) {
      poop += 1;
    } else if (poop >= 3 && !s.sleeping && Math.random() < 0.08) {
      // うんち3個放置中は確率でびょうき発症
      sick = true;
    }
    // おなかもごきげんも満たされている時、低確率で「わがまま（かまって）呼び出し」発生
    if (!s.sleeping && !sick && hunger >= 2 && happy >= 2 && !calling && Math.random() < 0.015) {
      calling = true;
    }
  }

  // おなかもごきげんも0のまま放置された場合もびょうきに
  if (hunger === 0 && happy === 0 && dt >= 30 * MIN) {
    sick = true;
  }

  return {
    ...s,
    hunger,
    happy,
    poop,
    hungerAcc,
    happyAcc,
    poopAcc,
    sick,
    calling,
    lastTick: now,
  };
}

/** ねんれい（1日目から数える） */
export function getAge(s: GameState, now: number): number {
  return Math.floor((now - s.startedAt) / DAY) + 1;
}

export function todayMMDD(date: Date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

/** 進化条件判定（お世話回数10回以上、または2日目以降でお世話6回以上） */
export function canEvolve(s: GameState, age: number): boolean {
  if (s.stage === 'adult') return false;
  return s.careCount >= 10 || (age >= 2 && s.careCount >= 6);
}

/** おとな進化後、新しいタマゴ（次世代のべびうんた）を迎えられるようになる追加お世話pt */
export const NEXT_EGG_CARE_NEEDED = 10;

export function remainingCareForNextEgg(s: GameState): number {
  if (s.stage !== 'adult') return NEXT_EGG_CARE_NEEDED;
  const base = s.evolvedAtCare > 0 ? s.evolvedAtCare : 10;
  const doneAfterAdult = Math.max(0, s.careCount - base);
  return Math.max(0, NEXT_EGG_CARE_NEEDED - doneAfterAdult);
}

/** おとな期で一定のお世話（+10pt）または3日目以降に達したら「新しいタマゴを迎える」ボタン解禁 */
export function canWelcomeNextEgg(s: GameState, age: number): boolean {
  if (s.stage !== 'adult') return false;
  return remainingCareForNextEgg(s) <= 0 || age >= 3;
}
