// ドット絵データ。'#' = 線の色、'e' = 画面色（くり抜き）、'.' = 透明。
import type { GrowthStage, AdultVariant } from '../game/state';

export type Pose =
  | 'idle'
  | 'happy'
  | 'love'
  | 'wink'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'sleep'
  | 'eat'
  | 'lookL'
  | 'lookR'
  | 'play'
  | 'yawn';

export type ExpressionId = 'normal' | 'happy' | 'love' | 'eat' | 'sad' | 'angry' | 'sleep';

export const EXPRESSION_SLOTS: {
  id: ExpressionId;
  label: string;
  desc: string;
}[] = [
  { id: 'normal', label: '😊 ふつう(基本)', desc: '普段の立ち姿（これ1枚だけでも全場面で動きます）' },
  { id: 'happy', label: '😆 よろこび笑顔', desc: 'ごきげん・ミニゲーム勝利・ウインク時' },
  { id: 'love', label: '😍 大好き・メロメロ', desc: '好物をあげた時・なでた時・お誕生日' },
  { id: 'eat', label: '😋 もぐもぐ食事', desc: 'ごはん・おやつを食べている時' },
  { id: 'sad', label: '😢 しょんぼり・泣き', desc: 'おなかペコペコ・びょうき・負けた時' },
  { id: 'angry', label: '😣 ぷんぷん・呼び出し', desc: 'わがまま呼び出し中・うんち放置時' },
  { id: 'sleep', label: '😴 すやすや・寝顔', desc: 'でんきOFFで寝ている時・あくび時' },
];

/** ゲーム内の細かいPoseを、カスタム画像用の7つの表情スロットへ対応付ける */
export function poseToExpression(pose: Pose): ExpressionId {
  switch (pose) {
    case 'happy':
    case 'play':
    case 'wink':
      return 'happy';
    case 'love':
      return 'love';
    case 'eat':
      return 'eat';
    case 'sad':
      return 'sad';
    case 'angry':
      return 'angry';
    case 'sleep':
    case 'yawn':
      return 'sleep';
    case 'idle':
    case 'lookL':
    case 'lookR':
    case 'surprised':
    default:
      return 'normal';
  }
}

// ==========================================
// 1A. おとなうんたねこ A (🐱 ノーマル: 16x12)
// ==========================================
const ADULT_A_BASE = [
  '................',
  '..##........##..',
  '..###......###..',
  '..############..',
  '.##############.',
  '.##ee######ee##.',
  '.##ee######ee##.',
  '.##############.',
  '.######ee######.',
  '..############..',
  '..############..',
  '...###....###...',
];

function variantFrom(base: string[], over: Record<number, string>): string[] {
  return base.map((row, i) => over[i] ?? row);
}

function buildAdultPoses(base: string[]): Record<Pose, string[]> {
  return {
    idle: base,
    happy: variantFrom(base, {
      5: '.###e######e###.',
      6: '.##e.e####e.e##.',
      8: '.#####eeee#####.',
    }),
    love: variantFrom(base, {
      5: '.#e.e######e.e#.',
      6: '.##e########e##.',
      7: '.e############e.',
      8: '.#####eeee#####.',
    }),
    wink: variantFrom(base, {
      5: '.###e######ee##.',
      6: '.##e.e#####ee##.',
      8: '.#####eeee#####.',
    }),
    sad: variantFrom(base, {
      5: '.##e.e####e.e##.',
      6: '.###e######e###.',
      8: '.#######e#######',
    }),
    angry: variantFrom(base, {
      4: '.##e########e##.',
      5: '.###ee####ee###.',
      6: '.##ee######ee##.',
      8: '.#####e##e#####.',
    }),
    surprised: variantFrom(base, {
      5: '.#eee######eee#.',
      6: '.#eee######eee#.',
      8: '.######ee######.',
      9: '..#####ee#####..',
    }),
    sleep: variantFrom(base, {
      5: '.##############.',
      6: '.##eee####eee##.',
    }),
    eat: variantFrom(base, {
      5: '.###e######e###.',
      6: '.##e.e####e.e##.',
      8: '.#####eeee#####.',
      9: '..####eeee####..',
    }),
    lookL: variantFrom(base, {
      5: '.#ee#####ee####.',
      6: '.#ee#####ee####.',
    }),
    lookR: variantFrom(base, {
      5: '.####ee#####ee#.',
      6: '.####ee#####ee#.',
    }),
    play: variantFrom(base, {
      5: '.###e######e###.',
      8: '.#####eeee#####.',
      11: '..###......###..',
    }),
    yawn: variantFrom(base, {
      5: '.##############.',
      6: '.##eee####eee##.',
      7: '.#####eeee#####.',
      8: '.####eeeeee####.',
      9: '..####eeee####..',
    }),
  };
}

export const ADULT_A_CAT: Record<Pose, string[]> = buildAdultPoses(ADULT_A_BASE);

// ==========================================
// 1B. おとなうんたねこ B (🍙 ふくよかうんた: 16x12)
// ほっぺもおなかもモチモチぷっくりワイド体型！
// ==========================================
const ADULT_B_BASE = [
  '................',
  '..##........##..',
  '.####......####.',
  '.##############.',
  '################',
  '###ee######ee###',
  '###ee######ee###',
  '################',
  '#######ee#######',
  '################',
  '.##############.',
  '..####....####..',
];

export const ADULT_B_CAT: Record<Pose, string[]> = buildAdultPoses(ADULT_B_BASE);

// ==========================================
// 1C. おとなうんたねこ C (🤨 ふと眉うんた: 16x12)
// 目の上にキリッと太い眉毛（白抜きライン＋黒太眉）が入った姿！
// ==========================================
const ADULT_C_BASE = [
  '................',
  '..##........##..',
  '..###......###..',
  '..############..',
  '.#eeee####eeee#.',
  '.#####e##e#####.',
  '.##ee######ee##.',
  '.##############.',
  '.######ee######.',
  '..############..',
  '..############..',
  '...###....###...',
];

export const ADULT_C_CAT: Record<Pose, string[]> = {
  ...buildAdultPoses(ADULT_C_BASE),
  // ふと眉うんたは各表情でも太眉（4〜5行目）をキープ！
  happy: variantFrom(ADULT_C_BASE, {
    4: '.#eeee####eeee#.',
    5: '.#####e##e#####.',
    6: '.###e######e###.',
    8: '.#####eeee#####.',
  }),
  love: variantFrom(ADULT_C_BASE, {
    4: '.#eeee####eeee#.',
    5: '.#####e##e#####.',
    6: '.#e.e######e.e#.',
    8: '.#####eeee#####.',
  }),
  wink: variantFrom(ADULT_C_BASE, {
    4: '.#eeee####eeee#.',
    5: '.#####e##e#####.',
    6: '.###e######ee##.',
    8: '.#####eeee#####.',
  }),
  sad: variantFrom(ADULT_C_BASE, {
    4: '.##eee####eee##.',
    5: '.#eee######eee#.',
    6: '.##e.e####e.e##.',
    8: '.#######e#######',
  }),
  angry: variantFrom(ADULT_C_BASE, {
    4: '.#eee######eee#.',
    5: '.####ee##ee####.',
    6: '.##ee######ee##.',
    8: '.#####e##e#####.',
  }),
};

export const ADULT_CAT = ADULT_A_CAT;
export const ADULT_LEGS_B = '..###......###..';

// ==========================================
// 2. べびうんたねこ (Baby: 12x10) - どの子に育つかまだ秘密の赤ちゃん
// ==========================================
const BABY_BASE = [
  '..#......#..',
  '.###....###.',
  '.##########.',
  '############',
  '##ee####ee##',
  '##ee####ee##',
  '############',
  '.####ee####.',
  '..########..',
  '...##..##...',
];

function babyVariant(over: Record<number, string>): string[] {
  return BABY_BASE.map((row, i) => over[i] ?? row);
}

export const BABY_CAT: Record<Pose, string[]> = {
  idle: BABY_BASE,
  happy: babyVariant({
    4: '.##e####e##.',
    5: '.#ee####ee#.',
    7: '.###eeee###.',
  }),
  love: babyVariant({
    4: '.#e.e##e.e#.',
    5: '.##e####e##.',
    7: '.###eeee###.',
  }),
  wink: babyVariant({
    4: '.##e####ee##',
    5: '.#ee####ee##',
    7: '.###eeee###.',
  }),
  sad: babyVariant({
    4: '.#ee####ee#.',
    5: '.##e####e##.',
    7: '.#####e#####',
  }),
  angry: babyVariant({
    3: '.#e######e#.',
    4: '##ee####ee##',
    7: '.###e##e###.',
  }),
  surprised: babyVariant({
    4: '#eee####eee#',
    5: '#eee####eee#',
    7: '.####ee####.',
    8: '..###ee###..',
  }),
  sleep: babyVariant({
    4: '.##########.',
    5: '.#eee##eee#.',
  }),
  eat: babyVariant({
    4: '.##e####e##.',
    7: '.###eeee###.',
    8: '..##eeee##..',
  }),
  lookL: babyVariant({
    4: '#ee####ee###',
    5: '#ee####ee###',
  }),
  lookR: babyVariant({
    4: '###ee####ee#',
    5: '###ee####ee#',
  }),
  play: babyVariant({
    4: '.##e####e##.',
    7: '.###eeee###.',
    9: '..##....##..',
  }),
  yawn: babyVariant({
    4: '.##########.',
    5: '.#eee##eee#.',
    6: '.####ee####.',
    7: '.###eeee###.',
  }),
};

export const BABY_LEGS_B = '..##....##..';

// ステージ＆おとなタイプごとのスプライト取得
export function getCatSprite(stage: GrowthStage, pose: Pose, adultType: AdultVariant = 'adult_a'): string[] {
  if (stage === 'baby') {
    return BABY_CAT[pose] || BABY_CAT.idle;
  }
  const map =
    adultType === 'adult_b' ? ADULT_B_CAT : adultType === 'adult_c' ? ADULT_C_CAT : ADULT_A_CAT;
  return map[pose] || map.idle;
}

// ==========================================
// 3. アイテム・ゲーム・演出用スプライト
// ==========================================
export const CAKE = [
  '......##......',
  '......##......',
  '##############',
  '#.#.#.#.#.#.#.',
  '##############',
  '#e#e#e#e#e#e#e',
  '##############',
];

export const POOP = [
  '...#...',
  '..###..',
  '..###..',
  '.#####.',
  '.#####.',
  '#######',
  '#######',
];

// おやつキャッチ用: お魚
export const FISH_ITEM = [
  '..#...#.',
  '.###.##.',
  '########',
  '.###.##.',
  '..#...#.',
];

// おやつキャッチ / 好物ハート演出用: ハート
export const HEART_ITEM = [
  '.##..##.',
  '########',
  '########',
  '.######.',
  '..####..',
  '...##...',
];

// おやつキャッチ用: たいやき
export const TAIYAKI_ITEM = [
  '..####..',
  '.######.',
  '########',
  '###ee###',
  '.######.',
  '..####..',
];

// ごはんメニュー用: おにぎり
export const ONIGIRI_ITEM = [
  '...##...',
  '..####..',
  '.######.',
  '########',
  '##e##e##',
  '########',
];

// ごはんメニュー用: お寿司（まぐろ握り）
export const SUSHI_ITEM = [
  '.######.',
  '########',
  '########',
  '.######.',
  '.#e##e#.',
];

// おやつメニュー用: プリン
export const PUDDING_ITEM = [
  '..####..',
  '.######.',
  '.#e##e#.',
  '.######.',
  '########',
];

// びょうき時（ごきげん斜め）のドクロ・ぐるぐるマーク
export const SKULL_MARK = [
  '..####..',
  '.######.',
  '##e##e##',
  '########',
  '.######.',
  '..#.#.#.',
];

// 待機小ネタ演出: ちょうちょ（2コマ羽ばたき）
export const BUTTERFLY_A = [
  '##...##',
  '###.###',
  '.#####.',
  '###.###',
  '##...##',
];

export const BUTTERFLY_B = [
  '.#...#.',
  '.##.##.',
  '..###..',
  '.##.##.',
  '.#...#.',
];

// プレゼント箱
export const BOX_CLOSED = [
  '..####..',
  '########',
  '##.##.##',
  '########',
  '###..###',
  '########',
  '########',
];

export const BOX_OPEN = [
  '.#....#.',
  '########',
  '##....##',
  '##.##.##',
  '########',
  '########',
];
